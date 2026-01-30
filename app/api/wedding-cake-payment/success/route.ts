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

    console.log('WEDDING CAKE PAYMENT SUCCESS');
    console.log('Session ID:', sessionId);

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('Session retrieved:', {
      id: session.id,
      paymentStatus: session.payment_status,
      metadata: session.metadata,
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Verify this is a wedding cake payment
    if (session.metadata?.type !== 'wedding_cake') {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    const weddingRequestId = session.metadata.weddingRequestId;
    const isDeposit = session.metadata.isDeposit === 'true';
    const remainingBalance = parseFloat(session.metadata.remainingBalance || '0');

    // Check if already processed (idempotency)
    const bookingsCollection = await getCollection('bookings');
    const existingBooking = await bookingsCollection.findOne({
      'paymentInfo.stripeSessionId': sessionId
    });

    if (existingBooking) {
      console.log('Already processed, returning cached data');
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        bookingId: existingBooking._id?.toString(),
        orderNumber: existingBooking.orderNumber,
        customerName: existingBooking.customerInfo.name,
      });
    }

    // Get the wedding request
    const weddingRequestsCollection = await getCollection('weddingCakeRequests');
    const weddingRequest = await weddingRequestsCollection.findOne({
      _id: new ObjectId(weddingRequestId)
    });

    if (!weddingRequest) {
      return NextResponse.json({ error: 'Wedding request not found' }, { status: 404 });
    }

    // Check if this is a remaining balance payment (deposit was already paid)
    const isRemainingBalancePayment = weddingRequest.status === 'deposit_paid' && weddingRequest.bookingId;

    if (isRemainingBalancePayment) {
      console.log('Processing remaining balance payment...');

      // Update the existing booking with additional payment
      await bookingsCollection.updateOne(
        { _id: new ObjectId(weddingRequest.bookingId) },
        {
          $set: {
            'paymentInfo.finalPaymentSessionId': sessionId,
            'paymentInfo.totalAmountPaid': (weddingRequest.paymentHistory?.[0]?.amount || 0) + (session.amount_total ? session.amount_total / 100 : 0),
          },
          $push: {
            'paymentInfo.payments': {
              type: 'final_balance',
              amount: session.amount_total ? session.amount_total / 100 : 0,
              stripeSessionId: sessionId,
              paidAt: new Date(),
            }
          } as any
        }
      );

      // Update wedding request to converted
      await weddingRequestsCollection.updateOne(
        { _id: new ObjectId(weddingRequestId) },
        {
          $set: {
            status: 'converted',
            convertedAt: new Date(),
            remainingBalance: 0,
          },
          $push: {
            paymentHistory: {
              type: 'final_balance',
              amount: session.amount_total ? session.amount_total / 100 : 0,
              stripeSessionId: sessionId,
              paidAt: new Date(),
            }
          } as any
        }
      );

      console.log('Wedding request marked as fully paid (converted)');

      return NextResponse.json({
        success: true,
        bookingId: weddingRequest.bookingId,
        orderNumber: weddingRequest.orderNumber,
        customerName: weddingRequest.customerInfo.name,
        isRemainingBalance: true,
      });
    }

    console.log('Creating booking from wedding request...');

    // Create the booking
    const orderDate = new Date(weddingRequest.eventDetails.eventDate);
    const finalPrice = parseFloat(session.metadata.finalPrice || '0');

    // Check if admin enabled capacity override for this request
    const overrideCapacity = weddingRequest.overrideCapacity === true;
    if (overrideCapacity) {
      console.log('⚠️ Admin override enabled - will skip all availability checks');
    }

    // Skip buffer check - this is a pre-approved wedding request where the date
    // was already validated when the quote was sent. Wedding dates are typically far in
    // advance, but we should still skip the check for consistency with custom cakes.
    // If overrideCapacity is true, skip ALL availability checks (admin approved).
    const result = await createBooking({
      orderDate,
      status: 'pending',
      customerInfo: {
        name: weddingRequest.customerInfo.name,
        email: weddingRequest.customerInfo.email,
        phone: weddingRequest.customerInfo.phone,
      },
      cakeDetails: {
        productId: null,
        productName: `Wedding Cake - ${weddingRequest.cakeDetails.tiers} Tier${weddingRequest.cakeDetails.tiers > 1 ? 's' : ''}`,
        size: weddingRequest.cakeDetails.servings ? `${weddingRequest.cakeDetails.servings} servings` : `${weddingRequest.cakeDetails.tiers} tier${weddingRequest.cakeDetails.tiers > 1 ? 's' : ''}`,
        flavor: weddingRequest.cakeDetails.flavor,
        designNotes: weddingRequest.cakeDetails.designNotes,
        price: finalPrice,
        addOns: weddingRequest.cakeDetails.addOns || [],
        referenceImageUrl: weddingRequest.cakeDetails.referenceImageUrl,
        fulfillmentType: weddingRequest.cakeDetails.fulfillmentType,
        pickupDate: orderDate,
        deliveryTime: weddingRequest.eventDetails.eventTime,
      },
      paymentInfo: {
        stripeSessionId: sessionId,
        stripePaymentIntentId: session.payment_intent as string,
        amountPaid: session.amount_total ? session.amount_total / 100 : 0,
        paymentStatus: 'paid',
      },
    }, { skipBufferCheck: true, overrideCapacity });

    if (!result.success) {
      console.error('Failed to create booking:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log('Booking created:', result.bookingId);

    // Update wedding request status based on whether this was a deposit or full payment
    if (isDeposit && remainingBalance > 0) {
      // Deposit payment - mark as deposit_paid, allow sending remaining balance later
      await weddingRequestsCollection.updateOne(
        { _id: new ObjectId(weddingRequestId) },
        {
          $set: {
            status: 'deposit_paid',
            depositPaidAt: new Date(),
            bookingId: result.bookingId,
            orderNumber: result.orderNumber,
            paymentHistory: [{
              type: 'deposit',
              amount: session.amount_total ? session.amount_total / 100 : 0,
              stripeSessionId: sessionId,
              paidAt: new Date(),
            }],
            remainingBalance: remainingBalance,
          },
        }
      );
      console.log('Wedding request marked as deposit_paid, remaining balance:', remainingBalance);
    } else {
      // Full payment - mark as converted
      await weddingRequestsCollection.updateOne(
        { _id: new ObjectId(weddingRequestId) },
        {
          $set: {
            status: 'converted',
            convertedAt: new Date(),
            bookingId: result.bookingId,
            orderNumber: result.orderNumber,
          },
        }
      );
      console.log('Wedding request marked as converted');
    }

    // Prepare booking data for emails
    const bookingForEmail = {
      _id: result.bookingId as any,
      orderNumber: result.orderNumber,
      orderDate,
      createdAt: new Date(),
      status: 'pending' as const,
      customerInfo: {
        name: weddingRequest.customerInfo.name,
        email: weddingRequest.customerInfo.email,
        phone: weddingRequest.customerInfo.phone,
      },
      cakeDetails: {
        productId: null,
        productName: `Wedding Cake - ${weddingRequest.cakeDetails.tiers} Tier${weddingRequest.cakeDetails.tiers > 1 ? 's' : ''}`,
        size: weddingRequest.cakeDetails.servings ? `${weddingRequest.cakeDetails.servings} servings` : `${weddingRequest.cakeDetails.tiers} tier${weddingRequest.cakeDetails.tiers > 1 ? 's' : ''}`,
        flavor: weddingRequest.cakeDetails.flavor,
        designNotes: weddingRequest.cakeDetails.designNotes,
        price: finalPrice,
        addOns: weddingRequest.cakeDetails.addOns || [],
        fulfillmentType: weddingRequest.cakeDetails.fulfillmentType,
        pickupDate: orderDate,
        deliveryTime: weddingRequest.eventDetails.eventTime,
        referenceImageUrl: weddingRequest.cakeDetails.referenceImageUrl,
      },
    };

    // Trigger real-time notification via Pusher
    try {
      console.log('Triggering Pusher notification...');
      await pusherServer.trigger('orders', 'new-order', {
        bookingId: result.bookingId,
        customerName: weddingRequest.customerInfo.name,
        productName: `Wedding Cake - ${weddingRequest.cakeDetails.tiers} Tier${weddingRequest.cakeDetails.tiers > 1 ? 's' : ''}`,
        timestamp: new Date().toISOString(),
        isWeddingOrder: true,
      });
      console.log('Pusher notification sent!');
    } catch (pusherError) {
      console.error('Pusher error:', pusherError);
    }

    // Send emails
    try {
      console.log('Sending order notification to Kassy...');
      await sendOrderNotificationEmail(bookingForEmail);
      console.log('Kassy notification sent!');

      console.log('Sending confirmation to customer...');
      await sendCustomerConfirmationEmail(bookingForEmail);
      console.log('Customer confirmation sent!');
    } catch (emailError) {
      console.error('Email error (order still created):', emailError);
    }

    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      orderNumber: result.orderNumber,
      customerName: weddingRequest.customerInfo.name,
      productName: `Wedding Cake - ${weddingRequest.cakeDetails.tiers} Tier${weddingRequest.cakeDetails.tiers > 1 ? 's' : ''}`,
    });

  } catch (error) {
    console.error('Wedding cake payment success error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process payment' },
      { status: 500 }
    );
  }
}
