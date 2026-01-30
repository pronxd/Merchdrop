import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@kassycakes.com';

// POST: Create a payment link for a custom cake request
export async function POST(request: NextRequest) {
  try {
    const { customRequestId, finalPrice, message, updatedDate, dateWasChanged, overrideCapacity } = await request.json();

    if (!customRequestId) {
      return NextResponse.json({ error: 'Custom request ID required' }, { status: 400 });
    }

    if (!finalPrice || finalPrice <= 0) {
      return NextResponse.json({ error: 'Valid price required' }, { status: 400 });
    }

    // Get the custom request from database
    const collection = await getCollection('customCakeRequests');
    const customRequest = await collection.findOne({ _id: new ObjectId(customRequestId) });

    if (!customRequest) {
      return NextResponse.json({ error: 'Custom request not found' }, { status: 404 });
    }

    // Track original date for email notification
    // Handle both Date objects and ISO strings
    const originalDateRaw = customRequest.cakeDetails.requestedDate;
    const originalDate = originalDateRaw instanceof Date
      ? originalDateRaw.toISOString()
      : (typeof originalDateRaw === 'string' ? originalDateRaw : new Date(originalDateRaw).toISOString());
    const originalDateStr = originalDate.split('T')[0];
    let actualDateChanged = false;

    // If date was updated by admin, update the custom request
    if (updatedDate && updatedDate !== originalDateStr) {
      await collection.updateOne(
        { _id: new ObjectId(customRequestId) },
        {
          $set: {
            'cakeDetails.requestedDate': new Date(updatedDate).toISOString(),
            'cakeDetails.originalRequestedDate': originalDate, // Keep track of original
          },
        }
      );
      // Refresh the custom request data
      customRequest.cakeDetails.requestedDate = new Date(updatedDate).toISOString();
      actualDateChanged = true;
      console.log('📅 Updated custom request date:', { from: originalDate, to: updatedDate });
    }

    // Store override flag for when payment is processed
    if (overrideCapacity) {
      await collection.updateOne(
        { _id: new ObjectId(customRequestId) },
        { $set: { overrideCapacity: true } }
      );
      console.log('⚠️ Capacity override enabled for this request');
    }

    // Calculate tax
    const tax = Math.round(finalPrice * 0.0825 * 100) / 100; // 8.25% tax
    const total = finalPrice + tax;

    // Create line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: customRequest.cakeDetails.productName,
            description: `${customRequest.cakeDetails.size} - ${customRequest.cakeDetails.flavor} - Custom Order #${customRequest.requestNumber}`,
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
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/custom-order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/custom-order-canceled`,
      customer_email: customRequest.customerInfo.email,
      metadata: {
        type: 'custom_cake',
        customRequestId: customRequestId,
        requestNumber: customRequest.requestNumber,
        customerName: customRequest.customerInfo.name,
        customerEmail: customRequest.customerInfo.email,
        customerPhone: customRequest.customerInfo.phone || '',
        finalPrice: finalPrice.toString(),
      },
      payment_intent_data: {
        receipt_email: customRequest.customerInfo.email,
      },
      custom_text: {
        submit: {
          message: 'Thank you for ordering from Kassy Cakes! 🎂',
        },
      },
    });

    console.log('✅ Custom cake payment session created:', session.id);

    // Update custom request status and store payment link info
    await collection.updateOne(
      { _id: new ObjectId(customRequestId) },
      {
        $set: {
          status: 'quoted',
          quoteInfo: {
            finalPrice,
            stripeSessionId: session.id,
            paymentUrl: session.url,
            quotedAt: new Date(),
            message: message || null,
          },
        },
      }
    );

    // Send payment link email to customer
    if (MAILTRAP_API_TOKEN) {
      try {
        await sendPaymentLinkEmail(customRequest, session.url!, finalPrice, message, {
          dateChanged: actualDateChanged,
          originalDate: originalDate,
        });
        console.log('✅ Payment link email sent to customer');
      } catch (emailError) {
        console.error('⚠️ Failed to send payment link email:', emailError);
        // Don't fail the request if email fails
      }

      // Send confirmation to Kassy so she has a record
      try {
        await sendAdminPaymentLinkNotification(customRequest, session.url!, finalPrice, message, {
          dateChanged: actualDateChanged,
          originalDate: originalDate,
        });
        console.log('✅ Admin notification sent to Kassy');
      } catch (emailError) {
        console.error('⚠️ Failed to send admin notification:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      paymentUrl: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Error creating custom cake payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment link' },
      { status: 500 }
    );
  }
}

async function sendPaymentLinkEmail(
  customRequest: any,
  paymentUrl: string,
  finalPrice: number,
  message?: string,
  dateChangeInfo?: { dateChanged: boolean; originalDate: string }
) {
  const tax = Math.round(finalPrice * 0.0825 * 100) / 100;
  const total = finalPrice + tax;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Custom Cake Quote</title>
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
      background: linear-gradient(135deg, #ff94b3 0%, #c97a8f 100%);
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
      border-left: 4px solid #ff94b3;
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
      color: #ff94b3;
      padding-top: 15px;
      margin-top: 10px;
      border-top: 2px solid #ff94b3;
    }
    .pay-button {
      display: inline-block;
      background: #ff94b3;
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
      <h1>🎂 Your Custom Cake Quote</h1>
      <p>Request #${customRequest.requestNumber}</p>
    </div>

    <div class="content">
      <div class="greeting">
        Hi ${customRequest.customerInfo.name}! 👋
      </div>

      <p>Great news! I've reviewed your custom cake request and prepared your quote.</p>

      ${dateChangeInfo?.dateChanged ? `
      <div class="message-box" style="background: #fff3cd; border-left-color: #ffc107;">
        <strong>📅 Important: Date Updated</strong><br>
        Your originally requested date (${new Date(dateChangeInfo.originalDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}) was no longer available, so I've updated it to ${new Date(customRequest.cakeDetails.requestedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. If this doesn't work for you, please email me at <a href="mailto:kassybakes@gmail.com" style="color: #ff94b3;">kassybakes@gmail.com</a> and we'll find a better date together!
      </div>
      ` : ''}

      ${message ? `
      <div class="message-box">
        <strong>Message from Kassy:</strong><br>
        ${message}
      </div>
      ` : ''}

      <div class="cake-details">
        <h3 style="margin-top: 0; color: #ff94b3;">Your Cake Details</h3>
        <div class="detail-row">
          <span>Cake:</span>
          <span>${customRequest.cakeDetails.productName}</span>
        </div>
        <div class="detail-row">
          <span>Size:</span>
          <span>${customRequest.cakeDetails.size}</span>
        </div>
        <div class="detail-row">
          <span>Flavor:</span>
          <span>${customRequest.cakeDetails.flavor}</span>
        </div>
        <div class="detail-row">
          <span>Filling:</span>
          <span>${customRequest.cakeDetails.filling}</span>
        </div>
        ${customRequest.cakeDetails.addOns && customRequest.cakeDetails.addOns.length > 0 ? `
        <div class="detail-row" style="flex-direction: column; align-items: flex-start;">
          <span style="margin-bottom: 8px;">Add-ons:</span>
          <div style="width: 100%;">
            ${customRequest.cakeDetails.addOns.map((addon: any) => `
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
          <span>${customRequest.cakeDetails.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}</span>
        </div>
        <div class="detail-row">
          <span>Date:</span>
          <span>${new Date(customRequest.cakeDetails.requestedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</span>
        </div>
        ${customRequest.cakeDetails.deliveryTime ? `
        <div class="detail-row">
          <span>Time:</span>
          <span>${customRequest.cakeDetails.deliveryTime}</span>
        </div>
        ` : ''}
        ${customRequest.cakeDetails.pickupTime ? `
        <div class="detail-row">
          <span>Pickup Time:</span>
          <span>${customRequest.cakeDetails.pickupTime}</span>
        </div>
        ` : ''}
        ${customRequest.cakeDetails.deliveryAddress ? `
        <div class="detail-row" style="flex-direction: column; align-items: flex-start;">
          <span style="margin-bottom: 5px;">Delivery Address:</span>
          <span>${customRequest.cakeDetails.deliveryAddress.fullAddress}</span>
        </div>
        ` : ''}
      </div>

      <div class="price-box">
        <div class="price-row">
          <span>Custom Cake</span>
          <span>$${finalPrice.toFixed(2)}</span>
        </div>
        <div class="price-row">
          <span>Tax (8.25%)</span>
          <span>$${tax.toFixed(2)}</span>
        </div>
        <div class="price-row total-row">
          <span>Total</span>
          <span>$${total.toFixed(2)}</span>
        </div>
      </div>

      <div style="text-align: center;">
        <p>Click below to complete your order:</p>
        <a href="${paymentUrl}" class="pay-button" style="display: inline-block; background: #ff94b3; color: #ffffff !important; padding: 16px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 18px; margin-top: 20px;">
          Pay $${total.toFixed(2)} Now
        </a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #6b4c4a;">
        This payment link will expire in 24 hours. If you have any questions, email me at <a href="mailto:kassybakes@gmail.com" style="color: #ff94b3;">kassybakes@gmail.com</a>
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
      to: [{ email: customRequest.customerInfo.email }],
      reply_to: { email: 'kassybakes@gmail.com', name: 'Kassy Cakes' },
      subject: `🎂 Your Custom Cake Quote is Ready! - $${(finalPrice + tax).toFixed(2)}`,
      html: html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Send notification to Kassy when a payment link is created
async function sendAdminPaymentLinkNotification(
  customRequest: any,
  paymentUrl: string,
  finalPrice: number,
  message?: string,
  dateChangeInfo?: { dateChanged: boolean; originalDate: string }
) {
  const tax = Math.round(finalPrice * 0.0825 * 100) / 100;
  const total = finalPrice + tax;
  const sentAt = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const addOnsHtml = customRequest.cakeDetails.addOns?.length > 0
    ? customRequest.cakeDetails.addOns.map((addon: any) =>
        `<tr><td style="padding: 4px 8px; color: #666;">+ ${addon.name}</td><td style="padding: 4px 8px; text-align: right;">$${addon.price.toFixed(2)}</td></tr>`
      ).join('')
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Link Sent</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: #ff94b3; padding: 20px; color: white;">
      <h1 style="margin: 0; font-size: 20px;">Payment Link Sent!</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Request #${customRequest.requestNumber}</p>
    </div>

    <div style="padding: 20px;">
      <p style="color: #666; margin: 0 0 15px 0;">Sent: ${sentAt}</p>

      <h3 style="color: #333; margin: 0 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">Customer</h3>
      <table style="width: 100%; margin-bottom: 20px;">
        <tr><td style="padding: 4px 0; color: #666;">Name:</td><td style="padding: 4px 0;"><strong>${customRequest.customerInfo.name}</strong></td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Email:</td><td style="padding: 4px 0;">${customRequest.customerInfo.email}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Phone:</td><td style="padding: 4px 0;">${customRequest.customerInfo.phone || 'N/A'}</td></tr>
      </table>

      <h3 style="color: #333; margin: 0 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">Cake Details</h3>
      <table style="width: 100%; margin-bottom: 20px;">
        <tr><td style="padding: 4px 0; color: #666;">Cake:</td><td style="padding: 4px 0;">${customRequest.cakeDetails.productName}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Size:</td><td style="padding: 4px 0;">${customRequest.cakeDetails.size}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Flavor:</td><td style="padding: 4px 0;">${customRequest.cakeDetails.flavor}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Filling:</td><td style="padding: 4px 0;">${customRequest.cakeDetails.filling || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Fulfillment:</td><td style="padding: 4px 0;">${customRequest.cakeDetails.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Date:</td><td style="padding: 4px 0;"><strong>${new Date(customRequest.cakeDetails.requestedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong></td></tr>
        ${customRequest.cakeDetails.deliveryTime ? `<tr><td style="padding: 4px 0; color: #666;">Time:</td><td style="padding: 4px 0;">${customRequest.cakeDetails.deliveryTime}</td></tr>` : ''}
        ${customRequest.cakeDetails.pickupTime ? `<tr><td style="padding: 4px 0; color: #666;">Pickup Time:</td><td style="padding: 4px 0;">${customRequest.cakeDetails.pickupTime}</td></tr>` : ''}
      </table>

      ${customRequest.cakeDetails.deliveryAddress ? `
      <h3 style="color: #333; margin: 0 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">Delivery Address</h3>
      <p style="margin: 0 0 20px 0;">${customRequest.cakeDetails.deliveryAddress.fullAddress}</p>
      ` : ''}

      ${customRequest.cakeDetails.designNotes ? `
      <h3 style="color: #333; margin: 0 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">Design Notes</h3>
      <p style="margin: 0 0 20px 0; background: #f9f9f9; padding: 10px; border-radius: 4px; white-space: pre-wrap;">${customRequest.cakeDetails.designNotes}</p>
      ` : ''}

      ${dateChangeInfo?.dateChanged ? `
      <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin-bottom: 20px;">
        <strong>Date Changed:</strong> Original date was ${new Date(dateChangeInfo.originalDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
      ` : ''}

      ${message ? `
      <h3 style="color: #333; margin: 0 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">Your Message to Customer</h3>
      <p style="margin: 0 0 20px 0; background: #e8f4fd; padding: 10px; border-radius: 4px;">${message}</p>
      ` : ''}

      <h3 style="color: #333; margin: 0 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 8px;">Price Breakdown</h3>
      <table style="width: 100%; margin-bottom: 20px; background: #f9f9f9; border-radius: 4px;">
        <tr><td style="padding: 8px;">Base Price</td><td style="padding: 8px; text-align: right;"><strong>$${finalPrice.toFixed(2)}</strong></td></tr>
        ${addOnsHtml}
        <tr><td style="padding: 8px; color: #666;">Tax (8.25%)</td><td style="padding: 8px; text-align: right;">$${tax.toFixed(2)}</td></tr>
        <tr style="border-top: 2px solid #ff94b3;"><td style="padding: 8px;"><strong>Total Charged</strong></td><td style="padding: 8px; text-align: right; color: #ff94b3;"><strong>$${total.toFixed(2)}</strong></td></tr>
      </table>

      <div style="background: #f0f0f0; padding: 15px; border-radius: 4px; margin-top: 20px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Payment Link (same as sent to customer):</p>
        <a href="${paymentUrl}" style="color: #ff94b3; word-break: break-all; font-size: 12px;">${paymentUrl}</a>
      </div>
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
      from: { email: FROM_EMAIL, name: 'Kassy Cakes System' },
      to: [{ email: 'kassybakes@gmail.com' }],
      subject: `Payment Link Sent: ${customRequest.customerInfo.name} - $${total.toFixed(2)}`,
      html: html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Admin email error: ${response.status} - ${error}`);
  }

  return response.json();
}
