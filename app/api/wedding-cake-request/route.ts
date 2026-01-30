import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@kassycakes.com';
const KASSY_EMAIL = 'kassybakes@gmail.com';

export interface WeddingCakeRequest {
  _id?: ObjectId;
  requestNumber: string;
  createdAt: Date;
  status: 'pending' | 'quoted' | 'approved' | 'declined' | 'converted';
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  eventDetails: {
    eventDate: Date;
    eventTime?: string;
    venue?: string;
    guestCount?: number;
    eventType: 'wedding' | 'engagement' | 'anniversary' | 'other';
  };
  cakeDetails: {
    tiers: number;
    servings?: number;
    flavor: string;
    filling: string;
    designNotes: string;
    estimatedPrice: number;
    addOns: Array<{
      id: string;
      name: string;
      price: number;
    }>;
    referenceImageUrl?: string;
    fulfillmentType: 'delivery' | 'pickup';
    deliveryAddress?: string;
  };
  quoteInfo?: {
    finalPrice: number;
    stripeSessionId: string;
    paymentUrl: string;
    quotedAt: Date;
    message?: string;
  };
}

function generateRequestNumber(): string {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `WR-${timestamp}-${random}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function generateEmailHTML(request: WeddingCakeRequest): string {
  const addOnsList = request.cakeDetails.addOns.length > 0
    ? request.cakeDetails.addOns.map(a => `<li>${a.name} (+$${a.price})</li>`).join('')
    : '<li>None selected</li>';

  const eventTypeLabels: Record<string, string> = {
    wedding: 'Wedding',
    engagement: 'Engagement Party',
    anniversary: 'Anniversary',
    other: 'Special Event'
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wedding Cake Request</title>
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
    .header p {
      margin: 10px 0 0;
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 30px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #d4a574;
      margin-bottom: 12px;
      border-bottom: 2px solid #d4a574;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f0e6dc;
    }
    .info-label {
      font-weight: 600;
      color: #6b4c4a;
    }
    .info-value {
      color: #4a2c2a;
    }
    .description-box {
      background: #fff8f0;
      border-left: 4px solid #d4a574;
      padding: 15px;
      margin-top: 10px;
      border-radius: 4px;
      white-space: pre-wrap;
      font-family: 'Georgia', serif;
      color: #6b4c4a;
    }
    .addons-list {
      list-style: none;
      padding: 0;
      margin: 10px 0;
    }
    .addons-list li {
      padding: 8px 12px;
      background: #fff8f0;
      margin-bottom: 5px;
      border-radius: 4px;
    }
    .reference-image {
      margin-top: 15px;
      text-align: center;
    }
    .reference-image img {
      max-width: 100%;
      max-height: 300px;
      border-radius: 8px;
      border: 2px solid #d4a574;
    }
    .price-box {
      background: #fff8f0;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      margin-top: 15px;
    }
    .price-label {
      font-size: 14px;
      color: #6b4c4a;
    }
    .price-value {
      font-size: 28px;
      font-weight: bold;
      color: #d4a574;
    }
    .footer {
      background: #fef8f4;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #6b4c4a;
    }
    .reply-button {
      display: inline-block;
      background: #d4a574;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 25px;
      font-weight: bold;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💒 New Wedding Cake Request</h1>
      <p>Request #${request.requestNumber}</p>
      <p style="font-size: 14px; margin-top: 15px; opacity: 0.9;">
        Received on ${new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })}
      </p>
    </div>

    <div class="content">
      <!-- Customer Info -->
      <div class="section">
        <div class="section-title">Customer Information</div>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${request.customerInfo.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value"><a href="mailto:${request.customerInfo.email}" style="color: #d4a574;">${request.customerInfo.email}</a></span>
        </div>
        ${request.customerInfo.phone ? `
        <div class="info-row">
          <span class="info-label">Phone:</span>
          <span class="info-value"><a href="tel:${request.customerInfo.phone}" style="color: #d4a574;">${request.customerInfo.phone}</a></span>
        </div>
        ` : ''}
      </div>

      <!-- Event Details -->
      <div class="section">
        <div class="section-title">Event Details</div>
        <div class="info-row">
          <span class="info-label">Event Type:</span>
          <span class="info-value">${eventTypeLabels[request.eventDetails.eventType] || 'Special Event'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Event Date:</span>
          <span class="info-value">${formatDate(request.eventDetails.eventDate)}</span>
        </div>
        ${request.eventDetails.eventTime ? `
        <div class="info-row">
          <span class="info-label">Event Time:</span>
          <span class="info-value">${request.eventDetails.eventTime}</span>
        </div>
        ` : ''}
        ${request.eventDetails.venue ? `
        <div class="info-row">
          <span class="info-label">Venue:</span>
          <span class="info-value">${request.eventDetails.venue}</span>
        </div>
        ` : ''}
        ${request.eventDetails.guestCount ? `
        <div class="info-row">
          <span class="info-label">Guest Count:</span>
          <span class="info-value">${request.eventDetails.guestCount} guests</span>
        </div>
        ` : ''}
      </div>

      <!-- Cake Details -->
      <div class="section">
        <div class="section-title">Cake Details</div>
        <div class="info-row">
          <span class="info-label">Tiers:</span>
          <span class="info-value">${request.cakeDetails.tiers} tier${request.cakeDetails.tiers > 1 ? 's' : ''}</span>
        </div>
        ${request.cakeDetails.servings ? `
        <div class="info-row">
          <span class="info-label">Servings:</span>
          <span class="info-value">${request.cakeDetails.servings}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Flavor:</span>
          <span class="info-value">${request.cakeDetails.flavor}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Filling:</span>
          <span class="info-value">${request.cakeDetails.filling}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fulfillment:</span>
          <span class="info-value">${request.cakeDetails.fulfillmentType === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'}</span>
        </div>
        ${request.cakeDetails.deliveryAddress ? `
        <div class="info-row">
          <span class="info-label">Delivery Address:</span>
          <span class="info-value">${request.cakeDetails.deliveryAddress}</span>
        </div>
        ` : ''}
      </div>

      <!-- Add-ons -->
      <div class="section">
        <div class="section-title">Selected Add-ons</div>
        <ul class="addons-list">
          ${addOnsList}
        </ul>
      </div>

      <!-- Design Notes -->
      <div class="section">
        <div class="section-title">Design Notes</div>
        <div class="description-box">${request.cakeDetails.designNotes || 'No design notes provided'}</div>
      </div>

      <!-- Reference Image -->
      ${request.cakeDetails.referenceImageUrl ? `
      <div class="section">
        <div class="section-title">Reference Image</div>
        <div class="reference-image">
          <img src="${request.cakeDetails.referenceImageUrl}" alt="Customer's reference image">
        </div>
      </div>
      ` : ''}

      <!-- Estimated Price -->
      <div class="price-box">
        <div class="price-label">Customer's Estimated Total (before your review)</div>
        <div class="price-value">$${request.cakeDetails.estimatedPrice.toFixed(2)}</div>
      </div>
    </div>

    <div class="footer">
      <p>Review this request and create a payment link from your dashboard</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://kassycakes.com'}/kassycakes/dashboard?tab=orders" class="reply-button" style="display: inline-block; background: #d4a574; color: #ffffff !important; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 15px;">
        Open Dashboard
      </a>
      <p style="margin-top: 15px;">Or reply directly to the customer:</p>
      <a href="mailto:${request.customerInfo.email}?subject=Re: Wedding Cake Request ${request.requestNumber} - Kassy Cakes" style="color: #d4a574; text-decoration: underline;">
        ${request.customerInfo.email}
      </a>
    </div>
  </div>
</body>
</html>
  `.trim();
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!MAILTRAP_API_TOKEN) {
    console.warn('MAILTRAP_API_TOKEN not configured, skipping email');
    return;
  }

  const response = await fetch('https://send.api.mailtrap.io/api/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MAILTRAP_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: { email: FROM_EMAIL, name: 'Kassy Cakes' },
      to: [{ email: to }],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.customerInfo?.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!data.customerInfo?.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerInfo.email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (!data.eventDetails?.eventDate) {
      return NextResponse.json({ error: 'Event date is required' }, { status: 400 });
    }

    // Generate request number
    const requestNumber = generateRequestNumber();

    // Create the request object
    const weddingRequest: WeddingCakeRequest = {
      requestNumber,
      createdAt: new Date(),
      status: 'pending',
      customerInfo: {
        name: data.customerInfo.name.trim(),
        email: data.customerInfo.email.trim(),
        phone: data.customerInfo.phone?.trim() || undefined,
      },
      eventDetails: {
        eventDate: new Date(data.eventDetails.eventDate),
        eventTime: data.eventDetails.eventTime || undefined,
        venue: data.eventDetails.venue?.trim() || undefined,
        guestCount: data.eventDetails.guestCount ? parseInt(data.eventDetails.guestCount) : undefined,
        eventType: data.eventDetails.eventType || 'wedding',
      },
      cakeDetails: {
        tiers: data.cakeDetails.tiers || 1,
        servings: data.cakeDetails.servings ? parseInt(data.cakeDetails.servings) : undefined,
        flavor: data.cakeDetails.flavor || 'Vanilla',
        filling: data.cakeDetails.filling || 'Buttercream',
        designNotes: data.cakeDetails.designNotes?.trim() || '',
        estimatedPrice: data.cakeDetails.estimatedPrice || 0,
        addOns: data.cakeDetails.addOns || [],
        referenceImageUrl: data.cakeDetails.referenceImageUrl || undefined,
        fulfillmentType: data.cakeDetails.fulfillmentType || 'pickup',
        deliveryAddress: data.cakeDetails.deliveryAddress?.trim() || undefined,
      },
    };

    // Save to MongoDB
    const collection = await getCollection('weddingCakeRequests');
    const result = await collection.insertOne(weddingRequest);

    console.log('Wedding cake request saved:', {
      requestNumber,
      id: result.insertedId.toString(),
      customer: weddingRequest.customerInfo.name,
    });

    // Send email to Kassy
    try {
      const subject = `💒 New Wedding Cake Request from ${weddingRequest.customerInfo.name}`;
      const html = generateEmailHTML(weddingRequest);
      await sendEmail(KASSY_EMAIL, subject, html);
      console.log('Email notification sent to Kassy');
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      requestNumber,
      message: 'Wedding cake request submitted successfully',
    });

  } catch (error) {
    console.error('Error processing wedding cake request:', error);
    return NextResponse.json(
      { error: 'Failed to submit request. Please try again.' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch all wedding cake requests (for dashboard)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const collection = await getCollection('weddingCakeRequests');

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const requests = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ requests });

  } catch (error) {
    console.error('Error fetching wedding cake requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}
