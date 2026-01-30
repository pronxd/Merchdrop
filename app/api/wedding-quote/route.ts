import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@kassycakes.com';
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
// Email to receive wedding cake quote requests
const QUOTE_EMAIL = 'kassybakes@gmail.com';

interface QuoteRequest {
  name: string;
  email: string;
  phone?: string;
  eventDate?: string;
  guestCount?: string;
  description: string;
  referenceImageUrl?: string;
  recaptchaToken?: string;
}

function generateRequestNumber(): string {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `WR-${timestamp}-${random}`;
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  if (!RECAPTCHA_SECRET_KEY) {
    console.warn('RECAPTCHA_SECRET_KEY not configured, skipping verification');
    return true; // Skip verification if not configured
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Not specified';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function generateQuoteEmailHTML(data: QuoteRequest): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wedding Cake Quote Request</title>
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
      color: #ff94b3;
      margin-bottom: 12px;
      border-bottom: 2px solid #ff94b3;
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
    .reference-image {
      margin-top: 15px;
      text-align: center;
    }
    .reference-image img {
      max-width: 100%;
      max-height: 400px;
      border-radius: 8px;
      border: 2px solid #ff94b3;
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
      background: #ff94b3;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 25px;
      font-weight: bold;
      margin-top: 15px;
    }
    .emoji {
      font-size: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1><span class="emoji">💒</span> Wedding Cake Quote Request</h1>
      <p>A new quote request has been submitted</p>
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

    <!-- Content -->
    <div class="content">
      <!-- Customer Info -->
      <div class="section">
        <div class="section-title">Customer Information</div>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${data.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value"><a href="mailto:${data.email}" style="color: #ff94b3;">${data.email}</a></span>
        </div>
        ${data.phone ? `
        <div class="info-row">
          <span class="info-label">Phone:</span>
          <span class="info-value"><a href="tel:${data.phone}" style="color: #ff94b3;">${data.phone}</a></span>
        </div>
        ` : ''}
      </div>

      <!-- Event Details -->
      <div class="section">
        <div class="section-title">Event Details</div>
        <div class="info-row">
          <span class="info-label">Event Date:</span>
          <span class="info-value">${formatDate(data.eventDate)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Guest Count:</span>
          <span class="info-value">${data.guestCount || 'Not specified'}</span>
        </div>
      </div>

      <!-- Cake Description -->
      <div class="section">
        <div class="section-title">Cake Vision</div>
        <div class="description-box">${data.description}</div>
      </div>

      <!-- Reference Image -->
      ${data.referenceImageUrl ? `
      <div class="section">
        <div class="section-title">Reference Image</div>
        <div class="reference-image">
          <img src="${data.referenceImageUrl}" alt="Customer's reference image">
          <p style="margin-top: 10px; font-size: 14px; color: #6b4c4a;">
            Customer uploaded this as inspiration for their cake
          </p>
        </div>
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Reply directly to this email or click below to respond</p>
      <a href="mailto:${data.email}?subject=Re: Wedding Cake Quote - Kassy Cakes" class="reply-button">
        Reply to Customer
      </a>
    </div>
  </div>
</body>
</html>
  `.trim();
}

async function sendMailtrapEmail(to: string, subject: string, html: string) {
  if (!MAILTRAP_API_TOKEN) {
    throw new Error('MAILTRAP_API_TOKEN not configured');
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
    throw new Error(`Mailtrap API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const data: QuoteRequest = await request.json();

    // Validate required fields
    if (!data.name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!data.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (!data.description?.trim()) {
      return NextResponse.json(
        { error: 'Cake description is required' },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA token
    if (data.recaptchaToken) {
      const isValidRecaptcha = await verifyRecaptcha(data.recaptchaToken);
      if (!isValidRecaptcha) {
        return NextResponse.json(
          { error: 'reCAPTCHA verification failed. Please try again.' },
          { status: 400 }
        );
      }
    } else if (RECAPTCHA_SECRET_KEY) {
      // If secret key is configured but no token provided
      return NextResponse.json(
        { error: 'reCAPTCHA verification required' },
        { status: 400 }
      );
    }

    // Generate request number
    const requestNumber = generateRequestNumber();

    // Save to MongoDB
    try {
      const collection = await getCollection('weddingCakeRequests');
      const weddingRequest = {
        requestNumber,
        createdAt: new Date(),
        status: 'pending',
        customerInfo: {
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone?.trim() || undefined,
        },
        eventDetails: {
          eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
          guestCount: data.guestCount ? parseInt(data.guestCount) : undefined,
          eventType: 'wedding',
        },
        cakeDetails: {
          tiers: 1,
          designNotes: data.description.trim(),
          estimatedPrice: 0,
          addOns: [],
          referenceImageUrl: data.referenceImageUrl || undefined,
          fulfillmentType: 'pickup',
        },
      };

      await collection.insertOne(weddingRequest);
      console.log(`✅ Wedding cake request saved to MongoDB: ${requestNumber}`);
    } catch (dbError) {
      console.error('Failed to save wedding request to MongoDB:', dbError);
      // Continue to send email even if DB save fails
    }

    // Check if Mailtrap is configured
    if (!MAILTRAP_API_TOKEN) {
      console.error('MAILTRAP_API_TOKEN not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Send email notification
    const subject = `💒 Wedding Cake Quote Request from ${data.name}`;
    const html = generateQuoteEmailHTML(data);

    await sendMailtrapEmail(QUOTE_EMAIL, subject, html);

    console.log(`✅ Wedding cake quote email sent to ${QUOTE_EMAIL}`);
    console.log(`   Customer: ${data.name} (${data.email})`);
    console.log(`   Event Date: ${data.eventDate || 'Not specified'}`);

    return NextResponse.json({
      success: true,
      requestNumber,
      message: 'Quote request submitted successfully',
    });

  } catch (error) {
    console.error('Error processing wedding quote request:', error);
    return NextResponse.json(
      { error: 'Failed to submit quote request' },
      { status: 500 }
    );
  }
}
