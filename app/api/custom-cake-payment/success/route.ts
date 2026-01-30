import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { createBooking } from '@/lib/bookings';
import { sendOrderNotificationEmail, sendCustomerConfirmationEmail } from '@/lib/email';
import { pusherServer } from '@/lib/pusher';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    console.log('🔔 CUSTOM CAKE PAYMENT SUCCESS');
    console.log('📋 Session ID:', sessionId);

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('✅ Session retrieved:', {
      id: session.id,
      paymentStatus: session.payment_status,
      metadata: session.metadata,
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Verify this is a custom cake payment
    if (session.metadata?.type !== 'custom_cake') {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    const customRequestId = session.metadata.customRequestId;

    // Check if already processed (idempotency)
    const bookingsCollection = await getCollection('bookings');
    const existingBooking = await bookingsCollection.findOne({
      'paymentInfo.stripeSessionId': sessionId
    });

    if (existingBooking) {
      console.log('✅ Already processed, returning cached data');
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        bookingId: existingBooking._id?.toString(),
        orderNumber: existingBooking.orderNumber,
        customerName: existingBooking.customerInfo.name,
      });
    }

    // Get the custom request
    const customRequestsCollection = await getCollection('customCakeRequests');
    const customRequest = await customRequestsCollection.findOne({
      _id: new ObjectId(customRequestId)
    });

    if (!customRequest) {
      return NextResponse.json({ error: 'Custom request not found' }, { status: 404 });
    }

    console.log('📦 Creating booking from custom request...');

    // Create the booking
    const orderDate = new Date(customRequest.cakeDetails.requestedDate);
    const finalPrice = parseFloat(session.metadata.finalPrice || '0');

    // Check if admin enabled capacity override for this request
    const overrideCapacity = customRequest.overrideCapacity === true;
    if (overrideCapacity) {
      console.log('⚠️ Admin override enabled - will skip all availability checks');
    }

    // Skip buffer check - this is a pre-approved custom request where the date
    // was already validated when the quote was sent. The date may now be < 10 days away
    // or even in the past, but we should still create the booking since payment was received.
    // If overrideCapacity is true, skip ALL availability checks (admin approved).
    const result = await createBooking({
      orderDate,
      status: 'pending',
      customerInfo: {
        name: customRequest.customerInfo.name,
        email: customRequest.customerInfo.email,
        phone: customRequest.customerInfo.phone,
      },
      cakeDetails: {
        productId: customRequest.cakeDetails.productId,
        productName: customRequest.cakeDetails.productName,
        size: customRequest.cakeDetails.size,
        flavor: customRequest.cakeDetails.flavor,
        filling: customRequest.cakeDetails.filling,
        designNotes: customRequest.cakeDetails.designNotes,
        price: finalPrice,
        addOns: customRequest.cakeDetails.addOns || [],
        edibleImageUrl: customRequest.cakeDetails.edibleImageUrl,
        referenceImageUrl: customRequest.cakeDetails.referenceImageUrl,
        fulfillmentType: customRequest.cakeDetails.fulfillmentType,
        pickupDate: orderDate,
        deliveryTime: customRequest.cakeDetails.deliveryTime,
        pickupTime: customRequest.cakeDetails.pickupTime,
        deliveryAddress: customRequest.cakeDetails.deliveryAddress,
      },
      paymentInfo: {
        stripeSessionId: sessionId,
        stripePaymentIntentId: session.payment_intent as string,
        amountPaid: session.amount_total ? session.amount_total / 100 : 0,
        paymentStatus: 'paid',
      },
    }, { skipBufferCheck: true, overrideCapacity });

    if (!result.success) {
      console.error('❌ Failed to create booking:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log('✅ Booking created:', result.bookingId);

    // Update custom request status to converted
    await customRequestsCollection.updateOne(
      { _id: new ObjectId(customRequestId) },
      {
        $set: {
          status: 'converted',
          convertedAt: new Date(),
          bookingId: result.bookingId,
          orderNumber: result.orderNumber,
        },
      }
    );

    console.log('✅ Custom request marked as converted');

    // Prepare booking data for emails
    const bookingForEmail = {
      _id: result.bookingId as any,
      orderNumber: result.orderNumber,
      orderDate,
      createdAt: new Date(),
      status: 'pending' as const,
      customerInfo: {
        name: customRequest.customerInfo.name,
        email: customRequest.customerInfo.email,
        phone: customRequest.customerInfo.phone,
      },
      cakeDetails: {
        productId: customRequest.cakeDetails.productId,
        productName: customRequest.cakeDetails.productName,
        size: customRequest.cakeDetails.size,
        flavor: customRequest.cakeDetails.flavor,
        filling: customRequest.cakeDetails.filling,
        designNotes: customRequest.cakeDetails.designNotes,
        price: finalPrice,
        addOns: customRequest.cakeDetails.addOns || [],
        fulfillmentType: customRequest.cakeDetails.fulfillmentType,
        pickupDate: orderDate,
        deliveryTime: customRequest.cakeDetails.deliveryTime,
        pickupTime: customRequest.cakeDetails.pickupTime,
        deliveryAddress: customRequest.cakeDetails.deliveryAddress,
        edibleImageUrl: customRequest.cakeDetails.edibleImageUrl,
        referenceImageUrl: customRequest.cakeDetails.referenceImageUrl,
      },
    };

    // Trigger real-time notification via Pusher
    try {
      console.log('🔔 Triggering Pusher notification...');
      await pusherServer.trigger('orders', 'new-order', {
        bookingId: result.bookingId,
        customerName: customRequest.customerInfo.name,
        productName: customRequest.cakeDetails.productName,
        timestamp: new Date().toISOString(),
        isCustomOrder: true,
      });
      console.log('✅ Pusher notification sent!');
    } catch (pusherError) {
      console.error('❌ Pusher error:', pusherError);
    }

    // Send emails
    try {
      console.log('📧 Sending order notification to Kassy...');
      await sendOrderNotificationEmail(bookingForEmail);
      console.log('✅ Kassy notification sent!');

      console.log('📧 Sending confirmation to customer...');
      await sendCustomerConfirmationEmail(bookingForEmail);
      console.log('✅ Customer confirmation sent!');
    } catch (emailError) {
      console.error('❌ Email error (order still created):', emailError);
    }

    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      orderNumber: result.orderNumber,
      customerName: customRequest.customerInfo.name,
      productName: customRequest.cakeDetails.productName,
    });

  } catch (error) {
    console.error('❌ Custom cake payment success error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process payment' },
      { status: 500 }
    );
  }
}
