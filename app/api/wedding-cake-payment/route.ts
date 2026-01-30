import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@kassycakes.com';

// POST: Create a payment link for a wedding cake request
export async function POST(request: NextRequest) {
  try {
    const { weddingRequestId, finalPrice, message, updatedDate, dateWasChanged, overrideCapacity, isDeposit, totalPrice } = await request.json();

    if (!weddingRequestId) {
      return NextResponse.json({ error: 'Wedding request ID required' }, { status: 400 });
    }

    if (!finalPrice || finalPrice <= 0) {
      return NextResponse.json({ error: 'Valid price required' }, { status: 400 });
    }

    // Get the wedding request from database
    const collection = await getCollection('weddingCakeRequests');
    const weddingRequest = await collection.findOne({ _id: new ObjectId(weddingRequestId) });

    if (!weddingRequest) {
      return NextResponse.json({ error: 'Wedding request not found' }, { status: 404 });
    }

    // Check if this is a remaining balance payment (deposit was already paid)
    const isRemainingBalancePayment = weddingRequest.status === 'deposit_paid';

    // Track original date for email notification
    const originalDate = weddingRequest.eventDetails.eventDate;
    let actualDateChanged = false;

    // If date was updated by admin, update the wedding request
    if (updatedDate && updatedDate !== originalDate?.split('T')[0]) {
      await collection.updateOne(
        { _id: new ObjectId(weddingRequestId) },
        {
          $set: {
            'eventDetails.eventDate': new Date(updatedDate).toISOString(),
            'eventDetails.originalEventDate': originalDate, // Keep track of original
          },
        }
      );
      // Refresh the wedding request data
      weddingRequest.eventDetails.eventDate = new Date(updatedDate).toISOString();
      actualDateChanged = true;
      console.log('📅 Updated wedding request date:', { from: originalDate, to: updatedDate });
    }

    // Store override flag for when payment is processed
    if (overrideCapacity) {
      await collection.updateOne(
        { _id: new ObjectId(weddingRequestId) },
        { $set: { overrideCapacity: true } }
      );
      console.log('⚠️ Capacity override enabled for this wedding request');
    }

    // Calculate tax
    const tax = Math.round(finalPrice * 0.0825 * 100) / 100; // 8.25% tax
    const total = finalPrice + tax;

    // Calculate remaining balance if deposit
    const remainingBalance = isDeposit && totalPrice ? totalPrice - finalPrice : 0;

    // Create line items for Stripe
    let productName: string;
    let productDescription: string;

    if (isRemainingBalancePayment) {
      productName = `Wedding Cake Final Balance - ${weddingRequest.cakeDetails.tiers} Tier${weddingRequest.cakeDetails.tiers > 1 ? 's' : ''}`;
      productDescription = `${weddingRequest.cakeDetails.flavor} - ${weddingRequest.cakeDetails.filling} - Order #${weddingRequest.requestNumber} (Final payment)`;
    } else if (isDeposit) {
      productName = `Wedding Cake Deposit (50%) - ${weddingRequest.cakeDetails.tiers} Tier${weddingRequest.cakeDetails.tiers > 1 ? 's' : ''}`;
      productDescription = `${weddingRequest.cakeDetails.flavor} - ${weddingRequest.cakeDetails.filling} - Order #${weddingRequest.requestNumber} (Remaining balance: $${remainingBalance.toFixed(2)} due before event)`;
    } else {
      productName = `Wedding Cake - ${weddingRequest.cakeDetails.tiers} Tier${weddingRequest.cakeDetails.tiers > 1 ? 's' : ''}`;
      productDescription = `${weddingRequest.cakeDetails.flavor} - ${weddingRequest.cakeDetails.filling} - Order #${weddingRequest.requestNumber}`;
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
            description: productDescription,
            images: ['https://kassy.b-cdn.net/logo.png'],
          },
          unit_amount: Math.round(finalPrice * 100), // Convert to cents
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tax (8.25%)',
          },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      },
    ];

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/wedding-order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/wedding-order-canceled`,
      customer_email: weddingRequest.customerInfo.email,
      metadata: {
        type: 'wedding_cake',
        weddingRequestId: weddingRequestId,
        requestNumber: weddingRequest.requestNumber,
        customerName: weddingRequest.customerInfo.name,
        customerEmail: weddingRequest.customerInfo.email,
        customerPhone: weddingRequest.customerInfo.phone || '',
        finalPrice: finalPrice.toString(),
        isDeposit: isDeposit ? 'true' : 'false',
        totalPrice: totalPrice ? totalPrice.toString() : finalPrice.toString(),
        remainingBalance: remainingBalance.toString(),
      },
      payment_intent_data: {
        receipt_email: weddingRequest.customerInfo.email,
      },
      custom_text: {
        submit: {
          message: 'Thank you for choosing Kassy Cakes for your special day! 💒',
        },
      },
    });

    console.log('Wedding cake payment session created:', session.id);

    // Update wedding request status and store payment link info
    await collection.updateOne(
      { _id: new ObjectId(weddingRequestId) },
      {
        $set: {
          status: 'quoted',
          quoteInfo: {
            finalPrice,
            stripeSessionId: session.id,
            paymentUrl: session.url,
            quotedAt: new Date(),
            message: message || null,
            isDeposit: isDeposit || false,
            totalPrice: totalPrice || finalPrice,
            remainingBalance: remainingBalance,
          },
        },
      }
    );

    // Send payment link email to customer
    if (MAILTRAP_API_TOKEN) {
      try {
        await sendPaymentLinkEmail(weddingRequest, session.url!, finalPrice, message, {
          dateChanged: actualDateChanged,
          originalDate: originalDate,
          isDeposit: isDeposit || false,
          totalPrice: totalPrice || finalPrice,
          remainingBalance: remainingBalance,
          isRemainingBalancePayment,
          depositPaid: weddingRequest.paymentHistory?.[0]?.amount || 0,
        });
        console.log('Payment link email sent to customer');
      } catch (emailError) {
        console.error('Failed to send payment link email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      paymentUrl: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Error creating wedding cake payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment link' },
      { status: 500 }
    );
  }
}

async function sendPaymentLinkEmail(
  weddingRequest: any,
  paymentUrl: string,
  finalPrice: number,
  message?: string,
  options?: { dateChanged: boolean; originalDate: string; isDeposit?: boolean; totalPrice?: number; remainingBalance?: number; isRemainingBalancePayment?: boolean; depositPaid?: number }
) {
  const dateChangeInfo = options;
  const isDeposit = options?.isDeposit || false;
  const totalPrice = options?.totalPrice || finalPrice;
  const remainingBalance = options?.remainingBalance || 0;
  const isRemainingBalancePayment = options?.isRemainingBalancePayment || false;
  const depositPaid = options?.depositPaid || 0;
  const tax = Math.round(finalPrice * 0.0825 * 100) / 100;
  const total = finalPrice + tax;

  const eventTypeLabels: Record<string, string> = {
    wedding: 'Wedding',
    engagement: 'Engagement Party',
    anniversary: 'Anniversary',
    other: 'Special Event'
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Wedding Cake Quote</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #4a2c2a;
      background-color: #fef8f4;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #d4a574 0%, #c97a8f 100%);
      padding: 30px 20px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .message-box {
      background: #fff8f0;
      border-left: 4px solid #d4a574;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .price-box {
      background: #fef8f4;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0e6dc;
    }
    .price-row:last-child {
      border-bottom: none;
    }
    .total-row {
      font-size: 20px;
      font-weight: bold;
      color: #d4a574;
      padding-top: 15px;
      margin-top: 10px;
      border-top: 2px solid #d4a574;
    }
    .pay-button {
      display: inline-block;
      background: #d4a574;
      color: white;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 25px;
      font-weight: bold;
      font-size: 18px;
      margin-top: 20px;
    }
    .cake-details {
      margin: 20px 0;
      padding: 15px;
      background: #fafafa;
      border-radius: 8px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0e6dc;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .footer {
      background: #fef8f4;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #6b4c4a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💒 ${isRemainingBalancePayment ? 'Final Balance Payment' : isDeposit ? 'Wedding Cake Deposit' : 'Your Wedding Cake Quote'}</h1>
      <p>Request #${weddingRequest.requestNumber}</p>
    </div>

    <div class="content">
      <div class="greeting">
        Hi ${weddingRequest.customerInfo.name}! 👋
      </div>

      <p>${isRemainingBalancePayment
        ? 'Here\'s your final balance payment for your wedding cake. Thank you for your deposit!'
        : isDeposit
        ? 'Great news! I\'ve prepared your 50% deposit payment for your wedding cake.'
        : 'Great news! I\'ve reviewed your wedding cake request and prepared your quote.'}</p>

      ${dateChangeInfo?.dateChanged ? `
      <div class="message-box" style="background: #fff3cd; border-left-color: #ffc107;">
        <strong>📅 Important: Date Updated</strong><br>
        Your originally requested date (${new Date(dateChangeInfo.originalDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}) was no longer available, so I've updated it to ${new Date(weddingRequest.eventDetails.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. If this doesn't work for you, please reply to this email and we'll find a better date together!
      </div>
      ` : ''}

      ${message ? `
      <div class="message-box">
        <strong>Message from Kassy:</strong><br>
        ${message}
      </div>
      ` : ''}

      <div class="cake-details">
        <h3 style="margin-top: 0; color: #d4a574;">Your Cake Details</h3>
        <div class="detail-row">
          <span>Event:</span>
          <span>${eventTypeLabels[weddingRequest.eventDetails.eventType] || 'Special Event'}</span>
        </div>
        <div class="detail-row">
          <span>Event Date:</span>
          <span>${new Date(weddingRequest.eventDetails.eventDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</span>
        </div>
        ${weddingRequest.eventDetails.venue ? `
        <div class="detail-row">
          <span>Venue:</span>
          <span>${weddingRequest.eventDetails.venue}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span>Tiers:</span>
          <span>${weddingRequest.cakeDetails.tiers} tier${weddingRequest.cakeDetails.tiers > 1 ? 's' : ''}</span>
        </div>
        ${weddingRequest.cakeDetails.servings ? `
        <div class="detail-row">
          <span>Servings:</span>
          <span>${weddingRequest.cakeDetails.servings}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span>Flavor:</span>
          <span>${weddingRequest.cakeDetails.flavor}</span>
        </div>
        <div class="detail-row">
          <span>Filling:</span>
          <span>${weddingRequest.cakeDetails.filling}</span>
        </div>
        ${weddingRequest.cakeDetails.addOns && weddingRequest.cakeDetails.addOns.length > 0 ? `
        <div class="detail-row" style="flex-direction: column; align-items: flex-start;">
          <span style="margin-bottom: 8px;">Add-ons:</span>
          <div style="width: 100%;">
            ${weddingRequest.cakeDetails.addOns.map((addon: any) => `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; padding-left: 10px; font-size: 14px;">
                <span>${addon.name}</span>
                <span>+$${addon.price.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        <div class="detail-row">
          <span>Fulfillment:</span>
          <span>${weddingRequest.cakeDetails.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}</span>
        </div>
      </div>

      <div class="price-box">
        <table style="width: 100%; border-collapse: collapse;">
        ${isRemainingBalancePayment ? `
          <tr style="color: #6b4c4a;">
            <td style="padding: 8px 0; border-bottom: 1px solid #f0e6dc;">Deposit Paid</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0e6dc; text-align: right; color: #2e7d32;">-$${depositPaid.toFixed(2)}</td>
          </tr>
          <tr style="background: #fff3e0;">
            <td style="padding: 8px 10px; color: #e65100; font-weight: 600;">Remaining Balance</td>
            <td style="padding: 8px 10px; text-align: right; color: #e65100; font-weight: 600;">$${finalPrice.toFixed(2)}</td>
          </tr>
        ` : isDeposit ? `
          <tr style="color: #6b4c4a;">
            <td style="padding: 8px 0; border-bottom: 1px solid #f0e6dc;">Full Cake Price</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0e6dc; text-align: right;">$${totalPrice.toFixed(2)}</td>
          </tr>
          <tr style="background: #e8f5e9;">
            <td style="padding: 8px 10px; color: #2e7d32; font-weight: 600;">50% Deposit (Due Now)</td>
            <td style="padding: 8px 10px; text-align: right; color: #2e7d32; font-weight: 600;">$${finalPrice.toFixed(2)}</td>
          </tr>
        ` : `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0e6dc;">Wedding Cake</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0e6dc; text-align: right;">$${finalPrice.toFixed(2)}</td>
          </tr>
        `}
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0e6dc;">Tax (8.25%)</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0e6dc; text-align: right;">$${tax.toFixed(2)}</td>
          </tr>
          <tr style="font-size: 20px; font-weight: bold; color: #d4a574;">
            <td style="padding: 15px 0 8px 0; border-top: 2px solid #d4a574;">${isRemainingBalancePayment ? 'Amount Due' : isDeposit ? 'Deposit Total' : 'Total'}</td>
            <td style="padding: 15px 0 8px 0; border-top: 2px solid #d4a574; text-align: right;">$${total.toFixed(2)}</td>
          </tr>
        </table>
        ${isDeposit ? `
        <div style="margin-top: 15px; padding: 12px; background: #fff3e0; border-radius: 6px; font-size: 14px;">
          <strong style="color: #e65100;">Remaining Balance:</strong>
          <span style="color: #e65100;"> $${(remainingBalance + (remainingBalance * 0.0825)).toFixed(2)}</span>
          <br><span style="color: #6b4c4a; font-size: 12px;">Due before your event date</span>
        </div>
        ` : ''}
      </div>

      <div style="text-align: center;">
        <p>${isRemainingBalancePayment ? 'Click below to pay your remaining balance:' : isDeposit ? 'Click below to pay your 50% deposit:' : 'Click below to complete your order:'}</p>
        <a href="${paymentUrl}" class="pay-button" style="display: inline-block; background: ${isRemainingBalancePayment ? '#e65100' : isDeposit ? '#2e7d32' : '#d4a574'}; color: #ffffff !important; padding: 16px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 18px; margin-top: 20px;">
          Pay ${isRemainingBalancePayment ? 'Balance ' : isDeposit ? 'Deposit ' : ''}$${total.toFixed(2)} Now
        </a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #6b4c4a;">
        This payment link will expire in 24 hours. If you have any questions, reply to this email or contact me at <a href="mailto:kassybakes@gmail.com" style="color: #d4a574;">kassybakes@gmail.com</a>
      </p>
    </div>

    <div class="footer">
      <p>Made with 💕 by Kassy Cakes</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const response = await fetch('https://send.api.mailtrap.io/api/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MAILTRAP_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: { email: FROM_EMAIL, name: 'Kassy Cakes' },
      to: [{ email: weddingRequest.customerInfo.email }],
      reply_to: { email: 'kassybakes@gmail.com', name: 'Kassy Cakes' },
      subject: isRemainingBalancePayment
        ? `💒 Your Wedding Cake Final Balance - $${(finalPrice + tax).toFixed(2)}`
        : isDeposit
        ? `💒 Your Wedding Cake Deposit Payment - $${(finalPrice + tax).toFixed(2)} (50%)`
        : `💒 Your Wedding Cake Quote is Ready! - $${(finalPrice + tax).toFixed(2)}`,
      html: html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email API error: ${response.status} - ${error}`);
  }

  return response.json();
}
