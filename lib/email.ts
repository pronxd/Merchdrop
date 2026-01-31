import { Booking } from './bookings';

const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const ADMIN_EMAIL_RAW = process.env.ADMIN_EMAIL || '';
// Support comma-separated list of emails (filter out empty strings)
const ADMIN_EMAILS = ADMIN_EMAIL_RAW.split(',').map(email => email.trim()).filter(email => email.length > 0);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@popdrp.com';

// Check if Mailtrap is configured
if (MAILTRAP_API_TOKEN) {
  console.log('Mailtrap API configured');
} else {
  console.warn('Email not configured - missing MAILTRAP_API_TOKEN');
}

// Send email via Mailtrap API v2
async function sendMailtrapEmail(to: string | string[], subject: string, html: string, from: string = FROM_EMAIL) {
  if (!MAILTRAP_API_TOKEN) {
    console.error('MAILTRAP_API_TOKEN not configured');
    return;
  }

  // Convert to array if single email provided
  const recipients = Array.isArray(to) ? to : [to];
  const toArray = recipients.map(email => ({ email }));

  try {
    const response = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAILTRAP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: from, name: 'POPDRP' },
        to: toArray,
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailtrap API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('Email sent successfully via Mailtrap API:', result);
    return result;
  } catch (error) {
    console.error('Error sending email via Mailtrap API:', error);
    throw error;
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago'
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago'
  });
}

function generateOrderEmailHTML(booking: Booking): string {
  const totalPrice = booking.paymentInfo?.amountPaid || (booking.orderDetails.price * booking.orderDetails.quantity);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #e5e5e5;
      background-color: #111;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
      padding: 30px 20px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
    }
    .header p {
      margin: 10px 0 0;
      font-size: 18px;
      opacity: 0.95;
    }
    .product-image {
      width: 100%;
      max-height: 400px;
      object-fit: cover;
      display: block;
    }
    .content {
      padding: 30px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #ef4444;
      margin-bottom: 12px;
      border-bottom: 2px solid #ef4444;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #333;
    }
    .info-label {
      font-weight: 600;
      color: #a3a3a3;
    }
    .info-value {
      color: #e5e5e5;
    }
    .total-price {
      background: #ef4444;
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 28px;
      font-weight: bold;
      margin-top: 20px;
      border-radius: 8px;
    }
    .footer {
      background: #111;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #a3a3a3;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>New Order</h1>
      <p style="font-size: 20px; font-weight: bold; background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 25px; display: inline-block; margin-top: 10px;">
        Order #${typeof booking.orderNumber === 'string' ? booking.orderNumber : String(booking.orderNumber || 0).padStart(5, '0')}
      </p>
      <p>Order received on ${formatDate(booking.createdAt)} at ${formatTime(booking.createdAt)}</p>
    </div>

    <!-- Product Image -->
    ${booking.orderDetails.image ? `<img src="${booking.orderDetails.image}" alt="${booking.orderDetails.productName}" class="product-image">` : ''}

    <!-- Content -->
    <div class="content">
      <!-- Customer Info -->
      <div class="section">
        <div class="section-title">Customer Information</div>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${booking.customerInfo.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${booking.customerInfo.email}</span>
        </div>
        ${booking.customerInfo.phone ? `
        <div class="info-row">
          <span class="info-label">Phone:</span>
          <span class="info-value">${booking.customerInfo.phone}</span>
        </div>
        ` : ''}
      </div>

      <!-- Order Details -->
      <div class="section">
        <div class="section-title">Order Details</div>
        <div class="info-row">
          <span class="info-label">Product:</span>
          <span class="info-value">${booking.orderDetails.productName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Size:</span>
          <span class="info-value">${booking.orderDetails.size}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Quantity:</span>
          <span class="info-value">${booking.orderDetails.quantity}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Unit Price:</span>
          <span class="info-value">$${booking.orderDetails.price.toFixed(2)}</span>
        </div>
      </div>

      <!-- Total Price -->
      <div class="total-price">
        Total: $${totalPrice.toFixed(2)}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This order has been saved to your dashboard.</p>
      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || ''}/admin/dashboard?tab=orders" style="color: #ef4444; text-decoration: none;">View All Orders &rarr;</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendOrderNotificationEmail(booking: Booking): Promise<{ success: boolean; error?: string }> {
  console.log('Attempting to send order notification email via Mailtrap API...');
  console.log('Admin Email(s):', ADMIN_EMAILS.join(', '));

  if (!MAILTRAP_API_TOKEN) {
    console.error('Email not configured, skipping notification');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const totalPrice = booking.paymentInfo?.amountPaid || (booking.orderDetails.price * booking.orderDetails.quantity);

    console.log('Sending email with Mailtrap API...');
    const orderNumber = typeof booking.orderNumber === 'string' ? booking.orderNumber : String(booking.orderNumber || 0).padStart(5, '0');
    await sendMailtrapEmail(
      ADMIN_EMAILS,
      `Order #${orderNumber}: ${booking.orderDetails.productName} – $${totalPrice.toFixed(2)}`,
      generateOrderEmailHTML(booking)
    );

    console.log('Order notification email sent!');
    console.log(`Email sent to: ${ADMIN_EMAILS.join(', ')}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending email:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

// Send confirmation email to customer
export async function sendCustomerConfirmationEmail(booking: Booking): Promise<{ success: boolean; error?: string }> {
  if (!MAILTRAP_API_TOKEN) {
    return { success: false, error: 'Email not configured' };
  }

  try {
    const totalPrice = booking.paymentInfo?.amountPaid || (booking.orderDetails.price * booking.orderDetails.quantity);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #e5e5e5;
      background-color: #111;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .content {
      padding: 30px;
      background: #1a1a1a;
    }
    .order-summary {
      background: #222;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .order-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #333;
    }
    .order-row:last-child {
      border-bottom: none;
    }
    .order-label {
      color: #a3a3a3;
      font-weight: 600;
    }
    .order-value {
      color: #e5e5e5;
    }
    .product-image {
      width: 100%;
      max-width: 400px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background: #ef4444;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 25px;
      margin: 20px 0;
      font-weight: bold;
    }
    .note-box {
      background: #222;
      border: 1px solid #333;
      padding: 12px;
      border-radius: 6px;
      font-size: 14px;
      color: #a3a3a3;
      margin-top: 20px;
    }
    .footer {
      padding: 20px 30px;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You for Your Order!</h1>
      <p style="font-size: 18px; font-weight: bold; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px;">
        Order #${String(booking.orderNumber || 0).padStart(5, '0')}
      </p>
    </div>
    <div class="content">
      <p>Hi ${booking.customerInfo.name},</p>

      <p>Your order has been confirmed! Here is a summary of what you ordered:</p>

      ${booking.orderDetails.image ? `<img src="${booking.orderDetails.image}" alt="${booking.orderDetails.productName}" class="product-image">` : ''}

      <div class="order-summary">
        <div class="order-row">
          <span class="order-label">Product:</span>
          <span class="order-value">${booking.orderDetails.productName}</span>
        </div>
        <div class="order-row">
          <span class="order-label">Size:</span>
          <span class="order-value">${booking.orderDetails.size}</span>
        </div>
        <div class="order-row">
          <span class="order-label">Quantity:</span>
          <span class="order-value">${booking.orderDetails.quantity}</span>
        </div>
        <div class="order-row">
          <span class="order-label">Total Paid:</span>
          <span class="order-value" style="font-weight: bold; color: #ef4444;">$${totalPrice.toFixed(2)}</span>
        </div>
      </div>

      <p>We will process your order and ship it out as soon as possible. You will receive a shipping confirmation once your order is on its way.</p>

      <div class="note-box">
        <strong>Note:</strong> If you have any questions about your order, please reference your Order Number: <strong>#${String(booking.orderNumber || 0).padStart(5, '0')}</strong>
      </div>

      <p style="text-align: center;">
        <a href="mailto:${ADMIN_EMAILS[0] || 'support@popdrp.com'}" class="button">Contact Us</a>
      </p>

      <div class="footer">
        <p>
          POPDRP<br>
          ${ADMIN_EMAILS[0] || 'support@popdrp.com'}
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const orderNumber = String(booking.orderNumber || 0).padStart(5, '0');
    await sendMailtrapEmail(
      booking.customerInfo.email,
      `Order #${orderNumber} Confirmed - ${booking.orderDetails.productName}`,
      htmlContent
    );

    console.log(`Confirmation email sent to customer: ${booking.customerInfo.email}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending customer email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}
