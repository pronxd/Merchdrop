import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCollection } from '@/lib/mongodb';
import { checkDateAvailability } from '@/lib/bookings';
import { validateDiscountCode } from '@/lib/discount-codes-db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: NextRequest) {
  try {
    const { cartItems, customerInfo, deliveryFee = 0, fulfillmentType = 'pickup', discountCode = null } = await request.json();

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!customerInfo?.name || !customerInfo?.email) {
      return NextResponse.json({ error: 'Customer info required' }, { status: 400 });
    }

    // Validate date availability for all cart items BEFORE payment
    for (const item of cartItems) {
      const orderDate = item.pickupDate || item.orderDate;

      if (!orderDate) {
        return NextResponse.json({
          error: `Please select a date for "${item.name}" before checkout.`
        }, { status: 400 });
      }

      const availability = await checkDateAvailability(new Date(orderDate).toISOString());

      if (!availability.available) {
        return NextResponse.json({
          error: `Date unavailable for "${item.name}": ${availability.message}`
        }, { status: 400 });
      }
    }

    // Validate discount code if provided (double-check on server)
    let validatedDiscount: { code: string; percentage: number; amount: number } | null = null;
    if (discountCode && discountCode.code) {
      const validation = await validateDiscountCode(discountCode.code);
      if (validation.valid && validation.discountCode) {
        validatedDiscount = {
          code: validation.discountCode.code,
          percentage: validation.discountCode.percentage,
          amount: discountCode.amount // Use the pre-calculated amount from client
        };
      } else {
        console.log('⚠️ Discount code validation failed:', validation.error);
        // Don't fail the checkout, just proceed without the discount
      }
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum: number, item: any) => {
      const addOnsTotal = item.addOns?.reduce((aSum: number, a: any) => aSum + a.price, 0) || 0;
      return sum + ((item.price + addOnsTotal) * item.quantity);
    }, 0);

    // Apply discount if valid
    const discountAmount = validatedDiscount ? (subtotal * validatedDiscount.percentage) / 100 : 0;
    const subtotalAfterDiscount = subtotal - discountAmount;

    const subtotalWithDelivery = subtotalAfterDiscount + deliveryFee;
    const tax = Math.round(subtotalWithDelivery * 0.0825 * 100) / 100; // 8.25% tax
    const total = subtotalWithDelivery + tax;

    // Create line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cartItems.map((item: any) => {
      const addOnsTotal = item.addOns?.reduce((sum: number, a: any) => sum + a.price, 0) || 0;
      const itemTotal = item.price + addOnsTotal;

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: `${item.size || ''} ${item.flavor ? `- ${item.flavor}` : ''}`.trim(),
            images: [item.image],
          },
          unit_amount: Math.round(itemTotal * 100), // Convert to cents
        },
        quantity: item.quantity,
      };
    });

    // Create a Stripe coupon for the discount (if applicable)
    // Use fixed amount (not percentage) so it only discounts the subtotal, not tax/delivery
    let stripeCouponId: string | null = null;
    if (validatedDiscount && discountAmount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discountAmount * 100), // Amount in cents
        currency: 'usd',
        duration: 'once',
        name: `${validatedDiscount.code} - ${validatedDiscount.percentage}% off`,
      });
      stripeCouponId = coupon.id;
    }

    // Add delivery fee as a line item (if applicable)
    if (deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Delivery Fee',
            description: 'Austin area delivery after 5PM',
            images: ['https://kassy.b-cdn.net/logo.png'],
          },
          unit_amount: Math.round(deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    // Add tax as a line item
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Tax (8.25%)',
        },
        unit_amount: Math.round(tax * 100),
      },
      quantity: 1,
    });

    // Try to include cart items in Stripe metadata (for smaller orders as fallback)
    const cartItemsJson = JSON.stringify(cartItems);
    const metadata: any = {
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone || '',
      fulfillmentType: fulfillmentType,
      deliveryFee: deliveryFee.toString(),
    };

    // Add discount code to metadata if present
    if (validatedDiscount) {
      metadata.discountCode = validatedDiscount.code;
      metadata.discountPercentage = validatedDiscount.percentage.toString();
      metadata.discountAmount = discountAmount.toFixed(2);
    }

    // Only add cartItems to metadata if it fits within Stripe's 500 char limit
    if (cartItemsJson.length <= 500) {
      metadata.cartItems = cartItemsJson;
      console.log('✅ Cart items fit in Stripe metadata (fallback available)');
    } else {
      console.log('⚠️ Cart items too large for Stripe metadata, will use database only');
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      // Let Stripe automatically show payment methods enabled in Dashboard
      // (card, klarna, affirm, afterpay, etc.)
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cart?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cart?canceled=true`,
      customer_email: customerInfo.email,
      metadata,
      payment_intent_data: {
        receipt_email: customerInfo.email, // Stripe will auto-send receipt
      },
      // Apply discount coupon if available
      ...(stripeCouponId && {
        discounts: [{ coupon: stripeCouponId }],
      }),
      // Branding
      custom_text: {
        submit: {
          message: 'Thank you for ordering from Kassy Cakes! 🎂',
        },
      },
    });

    console.log('✅ Stripe session created:', session.id);

    // Store cart items in database (to avoid Stripe 500 char metadata limit)
    try {
      const tempCheckoutsCollection = await getCollection('tempCheckouts');
      const checkoutData = {
        sessionId: session.id, // Store as regular field too for easier querying
        cartItems,
        customerInfo,
        fulfillmentType,
        deliveryFee,
        discountCode: validatedDiscount ? {
          code: validatedDiscount.code,
          percentage: validatedDiscount.percentage,
          amount: discountAmount
        } : null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire after 24 hours
      };

      await tempCheckoutsCollection.insertOne({
        _id: session.id as any, // Use Stripe session ID as document ID
        ...checkoutData,
      });

      console.log('✅ Stored cart data in database for session:', session.id);
      console.log('📦 Cart items count:', cartItems.length);
      if (validatedDiscount) {
        console.log('🏷️ Discount applied:', validatedDiscount.code, `(${validatedDiscount.percentage}% off = -$${discountAmount.toFixed(2)})`);
      }
    } catch (dbError) {
      console.error('❌ Failed to store checkout data in database:', dbError);
      // Don't fail the checkout - we can fall back to Stripe metadata for simple orders
      console.log('⚠️ Continuing without database storage (may fail for large orders)');
    }

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
