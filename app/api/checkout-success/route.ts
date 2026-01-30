import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createBooking } from '@/lib/bookings';
import { sendOrderNotificationEmail, sendCustomerConfirmationEmail } from '@/lib/email';
import { pusherServer } from '@/lib/pusher';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    console.log('🔔 CHECKOUT SUCCESS ENDPOINT CALLED');
    console.log('📋 Session ID from query:', sessionId);

    if (!sessionId) {
      console.error('❌ No session ID provided');
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    console.log('🔍 Retrieving Stripe session:', sessionId);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('✅ Session retrieved successfully:', {
      id: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
      amountTotal: session.amount_total,
      metadata: session.metadata,
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Check if bookings already exist for this session (idempotency check)
    const { getCollection } = await import('@/lib/mongodb');
    const bookingsCollection = await getCollection('bookings');

    console.log('🔍 Checking for existing bookings for this session...');
    const existingBookings = await bookingsCollection.find({
      'paymentInfo.stripeSessionId': sessionId
    }).toArray();

    if (existingBookings.length > 0) {
      console.log('✅ Found existing bookings, returning cached data (idempotent)');
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        customerName: existingBookings[0].customerInfo.name,
        customerEmail: existingBookings[0].customerInfo.email,
        customerPhone: existingBookings[0].customerInfo.phone,
        bookings: existingBookings.map(b => ({
          bookingId: b._id?.toString(),
          cakeName: b.cakeDetails.productName,
          date: b.orderDate.toISOString(),
        })),
      });
    }

    // Retrieve cart items from database (preferred) or fall back to Stripe metadata
    const tempCheckoutsCollection = await getCollection('tempCheckouts');

    let cartItems: any[] = [];
    let customerInfo: any = {};

    console.log('🔍 Looking up checkout data in database...');
    const checkoutData = await tempCheckoutsCollection.findOne({ _id: sessionId as any });

    if (checkoutData) {
      console.log('✅ Found checkout data in database');
      cartItems = checkoutData.cartItems || [];
      customerInfo = {
        name: checkoutData.customerInfo?.name || session.metadata?.customerName || '',
        email: checkoutData.customerInfo?.email || session.metadata?.customerEmail || session.customer_email || '',
        phone: checkoutData.customerInfo?.phone || session.metadata?.customerPhone || '',
      };
    } else {
      console.log('⚠️ No checkout data in database, trying Stripe metadata fallback...');

      // Fallback to Stripe metadata (may fail if cart items too large)
      try {
        cartItems = JSON.parse(session.metadata?.cartItems || '[]');
        customerInfo = {
          name: session.metadata?.customerName || '',
          email: session.metadata?.customerEmail || session.customer_email || '',
          phone: session.metadata?.customerPhone || '',
        };

        if (cartItems.length === 0) {
          console.error('❌ No cart items found in database or Stripe metadata');
          return NextResponse.json({ error: 'Order data not found' }, { status: 404 });
        }

        console.log('✅ Retrieved cart items from Stripe metadata (fallback)');
      } catch (parseError) {
        console.error('❌ Failed to parse cart items from Stripe metadata:', parseError);
        return NextResponse.json({ error: 'Failed to retrieve order data' }, { status: 500 });
      }
    }

    console.log('📦 Creating bookings for paid order...');
    console.log('🛒 Cart items:', cartItems.length);
    console.log('👤 Customer:', customerInfo);

    const bookings = [];
    const errors = [];

    // Create a booking for each cart item (same logic as checkout route)
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

        console.log(`✅ Valid date for ${item.name}:`, orderDate.toISOString());

        // Create booking first with temp URLs to get the real booking ID
        const result = await createBooking({
          orderDate,
          status: 'pending',
          customerInfo: {
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
          },
          cakeDetails: {
            productId: item.id,
            productName: item.name,
            size: item.size || '6"',
            flavor: item.flavor || 'vanilla',
            designNotes: item.designNotes || '',
            price: item.price,
            addOns: item.addOns || [],
            edibleImageUrl: item.edibleImageUrl,
            referenceImageUrl: item.referenceImageUrl,
            isEditablePhoto: item.isEditablePhoto,
            fulfillmentType: item.fulfillmentType,
            pickupDate: item.pickupDate ? new Date(item.pickupDate) : undefined,
            deliveryTime: item.deliveryTime,
            pickupTime: item.pickupTime,
            deliveryAddress: item.deliveryAddress,
          },
          paymentInfo: {
            stripeSessionId: sessionId,
            stripePaymentIntentId: session.payment_intent as string,
            amountPaid: session.amount_total ? session.amount_total / 100 : 0,
            paymentStatus: 'paid',
          },
        });

        if (result.success) {
          console.log('✅ Booking created with ID:', result.bookingId);

          // Now move temp images to permanent storage using the real booking ID
          let permanentEdibleImageUrl = item.edibleImageUrl;
          let permanentReferenceImageUrl = item.referenceImageUrl;
          let needsUpdate = false;

          // Move edible image if it exists and is in temp folder
          if (item.edibleImageUrl && item.edibleImageUrl.includes('/temp/')) {
            console.log('📸 Moving edible image to permanent storage...');
            try {
              // Import the move function directly instead of making HTTP request
              const { moveImageFromTempToPermanent } = await import('@/lib/bunny-storage');
              const permanentUrl = await moveImageFromTempToPermanent(item.edibleImageUrl, result.bookingId as string);
              if (permanentUrl) {
                permanentEdibleImageUrl = permanentUrl;
                needsUpdate = true;
                console.log('✅ Edible image moved to:', permanentEdibleImageUrl);
              } else {
                console.error('⚠️ Failed to move edible image (using temp URL)');
              }
            } catch (moveError) {
              console.error('⚠️ Error moving edible image:', moveError);
            }
          }

          // Move reference image if it exists and is in temp folder
          if (item.referenceImageUrl && item.referenceImageUrl.includes('/temp/')) {
            console.log('📸 Moving reference image to permanent storage...');
            try {
              // Import the move function directly instead of making HTTP request
              const { moveImageFromTempToPermanent } = await import('@/lib/bunny-storage');
              const permanentUrl = await moveImageFromTempToPermanent(item.referenceImageUrl, result.bookingId as string);
              if (permanentUrl) {
                permanentReferenceImageUrl = permanentUrl;
                needsUpdate = true;
                console.log('✅ Reference image moved to:', permanentReferenceImageUrl);
              } else {
                console.error('⚠️ Failed to move reference image (using temp URL)');
              }
            } catch (moveError) {
              console.error('⚠️ Error moving reference image:', moveError);
            }
          }

          // Update booking with permanent image URLs if any were moved
          if (needsUpdate) {
            console.log('🔄 Updating booking with permanent image URLs...');
            try {
              const { getCollection } = await import('@/lib/mongodb');
              const { ObjectId } = await import('mongodb');
              const bookingsCollection = await getCollection('bookings');

              await bookingsCollection.updateOne(
                { _id: new ObjectId(result.bookingId as string) },
                {
                  $set: {
                    'cakeDetails.edibleImageUrl': permanentEdibleImageUrl,
                    'cakeDetails.referenceImageUrl': permanentReferenceImageUrl,
                  }
                }
              );
              console.log('✅ Booking updated with permanent URLs');
            } catch (updateError) {
              console.error('⚠️ Failed to update booking with permanent URLs:', updateError);
            }
          }

          bookings.push({
            bookingId: result.bookingId,
            cakeName: item.name,
            date: orderDate.toISOString(),
          });

          const bookingForEmail = {
            _id: result.bookingId as any,
            orderNumber: result.orderNumber,
            orderDate,
            createdAt: new Date(),
            status: 'pending' as const,
            customerInfo: {
              name: customerInfo.name,
              email: customerInfo.email,
              phone: customerInfo.phone,
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
              deliveryAddress: item.deliveryAddress,
              edibleImageUrl: permanentEdibleImageUrl,
              referenceImageUrl: permanentReferenceImageUrl,
              isEditablePhoto: item.isEditablePhoto,
            },
            paymentInfo: {
              stripeSessionId: sessionId,
              stripePaymentIntentId: session.payment_intent as string,
              amountPaid: session.amount_total ? session.amount_total / 100 : 0,
              paymentStatus: 'paid' as const,
            },
          };

          // Trigger real-time notification via Pusher
          try {
            console.log('🔔 Triggering Pusher notification...');
            await pusherServer.trigger('orders', 'new-order', {
              bookingId: result.bookingId,
              customerName: customerInfo.name,
              productName: item.name,
              timestamp: new Date().toISOString(),
            });
            console.log('✅ Pusher notification sent!');
          } catch (pusherError) {
            console.error('❌ Pusher error:', pusherError);
          }

          // Send emails
          try {
            console.log('📧 Sending order notification to Kassy...');
            await sendOrderNotificationEmail(bookingForEmail, item.image);
            console.log('✅ Kassy notification sent!');

            console.log('📧 Sending confirmation to customer...');
            await sendCustomerConfirmationEmail(bookingForEmail, item.image);
            console.log('✅ Customer confirmation sent!');
          } catch (emailError) {
            console.error('❌ Email error (order still created):', emailError);
            errors.push(`Email failed for ${item.name}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
          }
        } else {
          errors.push(`${item.name}: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error processing ${item.name}:`, error);
        errors.push(`${item.name}: Processing error`);
      }
    }

    console.log('✅ Order processing complete:', {
      bookingsCreated: bookings.length,
      errors: errors.length,
    });

    // Increment discount code usage if one was used
    if (checkoutData?.discountCode?.code) {
      try {
        const { validateDiscountCode, incrementDiscountCodeUsage } = await import('@/lib/discount-codes-db');
        // Validate the code to get its ID
        const validation = await validateDiscountCode(checkoutData.discountCode.code);
        if (validation.valid && validation.discountCode?._id) {
          await incrementDiscountCodeUsage(validation.discountCode._id.toString());
          console.log('🏷️ Incremented usage for discount code:', checkoutData.discountCode.code);
        }
      } catch (discountError) {
        console.error('⚠️ Failed to increment discount code usage (not critical):', discountError);
      }
    }

    // Clean up temporary checkout data
    try {
      await tempCheckoutsCollection.deleteOne({ _id: sessionId as any });
      console.log('🗑️ Cleaned up temporary checkout data');
    } catch (cleanupError) {
      console.error('⚠️ Failed to clean up temp data (not critical):', cleanupError);
    }

    return NextResponse.json({
      success: true,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      bookings,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('❌ Checkout success error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process order' },
      { status: 500 }
    );
  }
}
