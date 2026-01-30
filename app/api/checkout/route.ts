import { NextRequest, NextResponse } from 'next/server';
import { createBooking } from '@/lib/bookings';
import { sendOrderNotificationEmail, sendCustomerConfirmationEmail } from '@/lib/email';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: NextRequest) {
  try {
    const { customerInfo, cartItems } = await req.json();

    console.log('🔔 CHECKOUT REQUEST:', {
      customer: customerInfo?.name,
      itemCount: cartItems?.length,
      items: cartItems?.map((item: any) => ({ name: item.name, size: item.size, flavor: item.flavor }))
    });

    if (!customerInfo || !cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing customer info or cart items' },
        { status: 400 }
      );
    }

    const bookings = [];
    const errors = [];

    console.log('🛒 Processing cart items:', cartItems.length);

    // Create a booking for each cart item
    for (const item of cartItems) {
      try {
        console.log('📦 Processing item:', item.name);
        console.log('📝 Item data:', {
          pickupDate: item.pickupDate,
          orderDate: item.orderDate,
          fulfillmentType: item.fulfillmentType,
          deliveryTime: item.deliveryTime,
          pickupTime: item.pickupTime
        });

        // Use the date from cart item fields (pickupDate is the actual pickup/delivery date)
        let orderDate: Date | null = null;

        if (item.pickupDate) {
          orderDate = new Date(item.pickupDate);
          console.log('📅 Using pickupDate:', orderDate);
        } else if (item.orderDate) {
          orderDate = new Date(item.orderDate);
          console.log('📅 Using orderDate:', orderDate);
        }

        if (!orderDate || isNaN(orderDate.getTime())) {
          console.error(`❌ No valid date found for ${item.name}`);
          errors.push(`No date found for ${item.name}. Please add the item to cart from the product page.`);
          continue;
        }

        console.log(`✅ Valid date for ${item.name}:`, orderDate);

        // Create booking
        const result = await createBooking({
          orderDate,
          status: 'pending',
          customerInfo: {
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone
          },
          cakeDetails: {
            productId: item.id,
            productName: item.name,
            size: item.size || '6"',
            flavor: item.flavor || 'vanilla',
            designNotes: item.designNotes || '',
            price: item.price,
            addOns: item.addOns || [],
            fulfillmentType: item.fulfillmentType,
            pickupDate: item.pickupDate ? new Date(item.pickupDate) : undefined,
            deliveryTime: item.deliveryTime,
            pickupTime: item.pickupTime,
            edibleImageUrl: item.edibleImageUrl,
            referenceImageUrl: item.referenceImageUrl,
            isEditablePhoto: item.isEditablePhoto,
            image: item.image // Save cart item's image (includes color variant if selected)
          }
        });

        if (result.success) {
          bookings.push({
            bookingId: result.bookingId,
            cakeName: item.name,
            date: orderDate.toLocaleDateString()
          });

          const bookingForEmail = {
            _id: result.bookingId as any,
            orderDate,
            createdAt: new Date(),
            status: 'pending' as const,
            customerInfo: {
              name: customerInfo.name,
              email: customerInfo.email,
              phone: customerInfo.phone
            },
            cakeDetails: {
              productId: item.id,
              productName: item.name,
              size: item.size || '6"',
              flavor: item.flavor || 'vanilla',
              designNotes: item.designNotes || '',
              price: item.price,
              addOns: item.addOns || [],
              fulfillmentType: item.fulfillmentType,
              pickupDate: item.pickupDate ? new Date(item.pickupDate) : undefined,
              deliveryTime: item.deliveryTime,
              pickupTime: item.pickupTime,
              edibleImageUrl: item.edibleImageUrl,
              referenceImageUrl: item.referenceImageUrl,
              isEditablePhoto: item.isEditablePhoto,
              image: item.image // Save cart item's image (includes color variant if selected)
            }
          };

          // Trigger real-time notification via Pusher (do this BEFORE emails so it always works)
          try {
            console.log('🔔 Triggering Pusher notification...');
            await pusherServer.trigger('orders', 'new-order', {
              bookingId: result.bookingId,
              customerName: customerInfo.name,
              productName: item.name,
              timestamp: new Date().toISOString()
            });
            console.log('✅ Pusher notification sent!');
          } catch (pusherError) {
            console.error('❌ Pusher error:', pusherError);
          }

          // Send emails (wrapped in try-catch so they don't block the order if they fail)
          try {
            // Send email notification to Kassy (with cake image)
            await sendOrderNotificationEmail(bookingForEmail, item.image);

            // Send confirmation email to customer (with cake image)
            await sendCustomerConfirmationEmail(bookingForEmail, item.image);
          } catch (emailError) {
            console.error('❌ Email error (order still created):', emailError);
          }
        } else {
          errors.push(`${item.name}: ${result.error}`);
        }

      } catch (error) {
        console.error(`Error processing ${item.name}:`, error);
        errors.push(`${item.name}: Processing error`);
      }
    }

    return NextResponse.json({
      success: true,
      bookings,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
