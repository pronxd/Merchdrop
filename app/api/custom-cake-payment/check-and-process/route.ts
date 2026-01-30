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

export async function POST(request: NextRequest) {
  try {
    const { customRequestId } = await request.json();

    if (!customRequestId) {
      return NextResponse.json({ error: 'Missing customRequestId' }, { status: 400 });
    }

    console.log('🔍 Checking payment status for custom request:', customRequestId);

    // Get the custom request
    const customRequestsCollection = await getCollection('customCakeRequests');
    const customRequest = await customRequestsCollection.findOne({
      _id: new ObjectId(customRequestId)
    });

    if (!customRequest) {
      return NextResponse.json({ error: 'Custom request not found' }, { status: 404 });
    }

    // Check if already converted
    if (customRequest.status === 'converted') {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        message: 'This request has already been converted to an order',
        orderNumber: customRequest.orderNumber,
      });
    }

    // Check if there's a Stripe session ID
    const sessionId = customRequest.quoteInfo?.stripeSessionId;
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        paid: false,
        message: 'No payment link has been created for this request yet',
      });
    }

    // Check if already processed (idempotency) - check first before hitting Stripe
    const bookingsCollection = await getCollection('bookings');
    const existingBooking = await bookingsCollection.findOne({
      'paymentInfo.stripeSessionId': sessionId
    });

    if (existingBooking) {
      // Update the custom request status if it wasn't updated
      if (customRequest.status !== 'converted') {
        await customRequestsCollection.updateOne(
          { _id: new ObjectId(customRequestId) },
          {
            $set: {
              status: 'converted',
              convertedAt: new Date(),
              bookingId: existingBooking._id?.toString(),
              orderNumber: existingBooking.orderNumber,
            },
          }
        );
      }

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        paid: true,
        message: 'Payment was found! Order already exists.',
        bookingId: existingBooking._id?.toString(),
        orderNumber: existingBooking.orderNumber,
        customerName: existingBooking.customerInfo.name,
      });
    }

    // Retrieve the checkout session from Stripe
    let session;
    let sessionExpired = false;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent']
      });
    } catch (stripeError: any) {
      // Handle expired/missing sessions - we'll try to find the payment another way
      if (stripeError.code === 'resource_missing') {
        sessionExpired = true;
        console.log('⚠️ Session expired, searching for payment by customer email...');
      } else {
        throw stripeError;
      }
    }

    // If session expired, try to find the payment by searching recent payments
    let paymentIntent = null;
    let amountPaid = 0;

    if (sessionExpired) {
      // Search for recent successful payments matching this customer's email
      const customerEmail = customRequest.customerInfo.email?.toLowerCase();
      const customerName = customRequest.customerInfo.name?.toLowerCase();
      const finalPrice = customRequest.quoteInfo?.finalPrice;

      // Calculate expected amount with tax (8.25%)
      const expectedAmountCents = finalPrice ? Math.round(finalPrice * 1.0825 * 100) : 0;

      console.log(`🔍 Searching for payment: email=${customerEmail}, name=${customerName}, expected amount=$${(expectedAmountCents/100).toFixed(2)} (${expectedAmountCents} cents)`);

      // Search checkout sessions first (they retain more info even after expiry sometimes)
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

      // Try listing checkout sessions
      try {
        const sessions = await stripe.checkout.sessions.list({
          limit: 100,
          created: { gte: thirtyDaysAgo },
        });

        for (const sess of sessions.data) {
          if (sess.payment_status === 'paid') {
            const sessEmail = sess.customer_details?.email?.toLowerCase() || sess.customer_email?.toLowerCase();
            const sessAmount = sess.amount_total;

            console.log(`  Checking session ${sess.id}: email=${sessEmail}, amount=${sessAmount}`);

            // Check metadata match
            if (sess.metadata?.customRequestId === customRequestId) {
              paymentIntent = sess.payment_intent;
              amountPaid = sess.amount_total ? sess.amount_total / 100 : 0;
              console.log('✅ Found session by customRequestId metadata:', sess.id);
              break;
            }

            // Check email + amount match
            if (sessEmail === customerEmail && sessAmount && Math.abs(sessAmount - expectedAmountCents) < 100) {
              paymentIntent = sess.payment_intent;
              amountPaid = sess.amount_total ? sess.amount_total / 100 : 0;
              console.log('✅ Found session by email + amount match:', sess.id);
              break;
            }

            // Check just amount match (for when email doesn't match exactly)
            if (sessAmount && Math.abs(sessAmount - expectedAmountCents) < 5) { // within 5 cents
              console.log(`  ⚠️ Potential match by amount: session ${sess.id}, email=${sessEmail}`);
              // Store as potential match but keep looking for exact match
              if (!paymentIntent) {
                paymentIntent = sess.payment_intent;
                amountPaid = sess.amount_total ? sess.amount_total / 100 : 0;
              }
            }
          }
        }
      } catch (sessError) {
        console.log('⚠️ Could not search sessions:', sessError);
      }

      // If no match from sessions, search payment intents
      if (!paymentIntent) {
        const paymentIntents = await stripe.paymentIntents.list({
          limit: 100,
          created: { gte: thirtyDaysAgo },
        });

        for (const pi of paymentIntents.data) {
          if (pi.status === 'succeeded') {
            console.log(`  Checking PI ${pi.id}: amount=${pi.amount}, receipt_email=${pi.receipt_email}`);

            // Check if metadata matches this custom request
            if (pi.metadata?.customRequestId === customRequestId) {
              paymentIntent = pi;
              amountPaid = pi.amount / 100;
              console.log('✅ Found payment by customRequestId metadata:', pi.id);
              break;
            }

            // Check by receipt email and amount
            if (pi.receipt_email?.toLowerCase() === customerEmail &&
                Math.abs(pi.amount - expectedAmountCents) < 100) {
              paymentIntent = pi;
              amountPaid = pi.amount / 100;
              console.log('✅ Found payment by email + amount match:', pi.id);
              break;
            }

            // Check just amount (exact match)
            if (Math.abs(pi.amount - expectedAmountCents) < 5) {
              console.log(`  ⚠️ Potential PI match by amount: ${pi.id}`);
              if (!paymentIntent) {
                paymentIntent = pi;
                amountPaid = pi.amount / 100;
              }
            }
          }
        }
      }

      // Also check charges if still no payment intent found
      if (!paymentIntent) {
        const charges = await stripe.charges.list({
          limit: 100,
          created: { gte: thirtyDaysAgo },
        });

        for (const charge of charges.data) {
          if (charge.status === 'succeeded' && charge.paid) {
            const chargeEmail = charge.billing_details?.email?.toLowerCase() || charge.receipt_email?.toLowerCase();
            console.log(`  Checking charge ${charge.id}: amount=${charge.amount}, email=${chargeEmail}`);

            if (charge.metadata?.customRequestId === customRequestId) {
              amountPaid = charge.amount / 100;
              paymentIntent = { id: charge.payment_intent as string } as any;
              console.log('✅ Found charge by customRequestId metadata:', charge.id);
              break;
            }

            if (chargeEmail === customerEmail && Math.abs(charge.amount - expectedAmountCents) < 100) {
              amountPaid = charge.amount / 100;
              paymentIntent = { id: charge.payment_intent as string } as any;
              console.log('✅ Found charge by email + amount match:', charge.id);
              break;
            }

            // Check just amount
            if (Math.abs(charge.amount - expectedAmountCents) < 5) {
              console.log(`  ⚠️ Potential charge match by amount: ${charge.id}, email=${chargeEmail}`);
              if (!paymentIntent) {
                amountPaid = charge.amount / 100;
                paymentIntent = { id: charge.payment_intent as string } as any;
              }
            }
          }
        }
      }

      if (!paymentIntent) {
        return NextResponse.json({
          success: false,
          paid: false,
          message: 'Payment link has expired and no matching payment was found. If the customer paid, check your Stripe dashboard manually.',
          sessionExpired: true,
          searchedFor: {
            email: customerEmail,
            expectedAmount: expectedAmountCents / 100,
          }
        });
      }
    } else {
      // Session still valid
      console.log('✅ Stripe session status:', {
        id: session!.id,
        paymentStatus: session!.payment_status,
        status: session!.status,
      });

      // Check if payment was completed
      if (session!.payment_status !== 'paid') {
        // Session is unpaid - but customer might have paid using a DIFFERENT payment link
        // Search for any paid session matching this customer's email/amount
        console.log('⚠️ Stored session is unpaid, searching for alternate paid session...');

        const customerEmail = customRequest.customerInfo.email?.toLowerCase();
        const finalPrice = customRequest.quoteInfo?.finalPrice;
        const expectedAmountCents = finalPrice ? Math.round(finalPrice * 1.0825 * 100) : 0;

        const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
        const sessions = await stripe.checkout.sessions.list({
          limit: 100,
          created: { gte: thirtyDaysAgo },
        });

        let foundPaidSession = null;
        for (const sess of sessions.data) {
          if (sess.payment_status === 'paid') {
            const sessEmail = sess.customer_details?.email?.toLowerCase() || sess.customer_email?.toLowerCase();
            const sessAmount = sess.amount_total;

            console.log(`  Checking paid session ${sess.id}: email=${sessEmail}, amount=${sessAmount}`);

            // Check if this paid session matches our customer
            if (sessEmail === customerEmail && sessAmount && Math.abs(sessAmount - expectedAmountCents) < 100) {
              foundPaidSession = sess;
              console.log('✅ Found alternate PAID session:', sess.id);
              break;
            }
          }
        }

        if (foundPaidSession) {
          // Use this session instead
          session = foundPaidSession;
          paymentIntent = foundPaidSession.payment_intent;
          amountPaid = foundPaidSession.amount_total ? foundPaidSession.amount_total / 100 : 0;
          console.log('✅ Using alternate paid session for processing');
        } else {
          return NextResponse.json({
            success: false,
            paid: false,
            message: `Payment not completed on stored link. Status: ${session!.payment_status}. No alternate paid session found for this customer.`,
            stripeStatus: session!.payment_status,
            storedSessionId: sessionId,
            hint: 'Customer may have paid with a different payment link. Check Stripe dashboard manually.',
          });
        }
      } else {
        paymentIntent = session!.payment_intent;
        amountPaid = session!.amount_total ? session!.amount_total / 100 : 0;
      }
    }

    // Payment was made! Now process it like the success endpoint would have

    console.log('📦 Creating booking from paid custom request...');

    // Create the booking
    const orderDate = new Date(customRequest.cakeDetails.requestedDate);
    const finalPrice = parseFloat(customRequest.quoteInfo?.finalPrice || '0');

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
        stripePaymentIntentId: typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id || '',
        amountPaid: amountPaid,
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
      paid: true,
      message: 'Payment found and order created successfully!',
      bookingId: result.bookingId,
      orderNumber: result.orderNumber,
      customerName: customRequest.customerInfo.name,
      productName: customRequest.cakeDetails.productName,
      amountPaid: amountPaid,
    });

  } catch (error) {
    console.error('❌ Check and process payment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check payment' },
      { status: 500 }
    );
  }
}
