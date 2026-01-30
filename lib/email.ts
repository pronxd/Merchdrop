import { Booking } from './bookings';

const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const KASSY_EMAIL_RAW = process.env.KASSY_EMAIL || 'hello@kassycakes.com';
// Support comma-separated list of emails (filter out empty strings)
const KASSY_EMAILS = KASSY_EMAIL_RAW.split(',').map(email => email.trim()).filter(email => email.length > 0);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@kassycakes.com';

// Check if Mailtrap is configured
if (MAILTRAP_API_TOKEN) {
  console.log('✅ Mailtrap API configured');
} else {
  console.warn('⚠️ Email not configured - missing MAILTRAP_API_TOKEN');
}

// Send email via Mailtrap API v2
async function sendMailtrapEmail(to: string | string[], subject: string, html: string, from: string = FROM_EMAIL) {
  if (!MAILTRAP_API_TOKEN) {
    console.error('❌ MAILTRAP_API_TOKEN not configured');
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
        from: { email: from, name: 'Kassy Cakes' },
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
    console.log('✅ Email sent successfully via Mailtrap API:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending email via Mailtrap API:', error);
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

function generateOrderEmailHTML(booking: Booking, cakeImageUrl?: string): string {
  const addOnsTotal = booking.cakeDetails.addOns.reduce((sum, a) => sum + a.price, 0);
  const calculatedTotal = booking.cakeDetails.price + addOnsTotal;
  // Use actual amount paid from Stripe if available, otherwise fall back to calculated price
  const totalPrice = booking.paymentInfo?.amountPaid || calculatedTotal;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Cake Order</title>
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
      font-size: 32px;
      font-weight: bold;
    }
    .header p {
      margin: 10px 0 0;
      font-size: 18px;
      opacity: 0.95;
    }
    .cake-image {
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
      color: #ff94b3;
      margin-bottom: 12px;
      border-bottom: 2px solid #ff94b3;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0e6dc;
    }
    .info-label {
      font-weight: 600;
      color: #6b4c4a;
    }
    .info-value {
      color: #4a2c2a;
    }
    .add-ons {
      background: #fef8f4;
      padding: 15px;
      border-radius: 8px;
      margin-top: 10px;
    }
    .add-on-item {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
    }
    .design-notes {
      background: #fff8f0;
      border-left: 4px solid #d4a574;
      padding: 15px;
      margin-top: 10px;
      border-radius: 4px;
      white-space: pre-wrap;
      font-family: 'Georgia', serif;
      font-style: italic;
      color: #6b4c4a;
    }
    .total-price {
      background: #4a2c2a;
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 28px;
      font-weight: bold;
      margin-top: 20px;
      border-radius: 8px;
    }
    .date-alert {
      background: #d4a574;
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      margin: 20px 0;
      border-radius: 8px;
    }
    .footer {
      background: #fef8f4;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #6b4c4a;
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
      <h1><span class="emoji">🎂</span> New Cake Order!</h1>
      <p style="font-size: 20px; font-weight: bold; background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 25px; display: inline-block; margin-top: 10px;">
        Order #${typeof booking.orderNumber === 'string' ? booking.orderNumber : String(booking.orderNumber || 0).padStart(5, '0')}
      </p>
      <p>Order received on ${formatDate(booking.createdAt)} at ${formatTime(booking.createdAt)}</p>
    </div>

    <!-- Cake Image -->
    ${cakeImageUrl ? `<img src="${cakeImageUrl}" alt="${booking.cakeDetails.productName}" class="cake-image">` : ''}

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

      <!-- Cake Details -->
      <div class="section">
        <div class="section-title">Cake Details</div>
        <div class="info-row">
          <span class="info-label">Cake:</span>
          <span class="info-value">${booking.cakeDetails.productName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Size:</span>
          <span class="info-value">${booking.cakeDetails.size}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Flavor:</span>
          <span class="info-value">${booking.cakeDetails.flavor}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Base Price:</span>
          <span class="info-value">$${booking.cakeDetails.price.toFixed(2)}</span>
        </div>

        ${booking.cakeDetails.addOns.length > 0 ? `
        <div class="add-ons">
          <strong>Add-ons:</strong>
          ${booking.cakeDetails.addOns.map(addon => `
            <div class="add-on-item">
              <span>${addon.name}</span>
              <span>+$${addon.price.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>

      <!-- Design Notes -->
      ${booking.cakeDetails.designNotes ? `
      <div class="section">
        <div class="section-title">Design Notes</div>
        <div class="design-notes">${booking.cakeDetails.designNotes}</div>
      </div>
      ` : ''}

      <!-- Edible Printed Image -->
      ${booking.cakeDetails.edibleImageUrl ? `
      <div class="section">
        <div class="section-title">Edible Printed Image</div>
        <img src="${booking.cakeDetails.edibleImageUrl}" alt="Customer's edible image" style="width: 100%; max-width: 400px; border-radius: 8px; border: 2px solid #ff94b3; margin-top: 10px;">
        <p style="margin-top: 10px; font-size: 14px; color: #6b4c4a;">Customer uploaded an image to be printed on the cake.</p>
      </div>
      ` : ''}

      <!-- Reference Image / Editable Photo -->
      ${booking.cakeDetails.referenceImageUrl ? `
      <div class="section">
        <div class="section-title">${booking.cakeDetails.isEditablePhoto ? '📷 Customer Photo for Cake' : '📷 Reference Photo'}</div>
        <img src="${booking.cakeDetails.referenceImageUrl}" alt="${booking.cakeDetails.isEditablePhoto ? 'Customer photo for cake' : 'Reference photo'}" style="width: 100%; max-width: 400px; border-radius: 8px; border: 2px solid ${booking.cakeDetails.isEditablePhoto ? '#ff94b3' : '#d4af37'}; margin-top: 10px;">
        <p style="margin-top: 10px; font-size: 14px; color: #6b4c4a;">${booking.cakeDetails.isEditablePhoto ? 'Customer uploaded their photo to use on this cake.' : 'Customer provided this reference image for cake design.'}</p>
      </div>
      ` : ''}

      <!-- Fulfillment Details -->
      ${booking.cakeDetails.fulfillmentType ? `
      <div class="section">
        <div class="section-title">${booking.cakeDetails.fulfillmentType === 'delivery' ? '📦 Delivery Details' : '🎂 Pickup Details'}</div>
        <div class="info-row">
          <span class="info-label">Type:</span>
          <span class="info-value" style="font-weight: bold; text-transform: uppercase;">${booking.cakeDetails.fulfillmentType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${formatDate(booking.cakeDetails.pickupDate || booking.orderDate)}</span>
        </div>
        ${(booking.cakeDetails.deliveryTime || booking.cakeDetails.pickupTime) ? `
        <div class="info-row">
          <span class="info-label">Time:</span>
          <span class="info-value" style="font-weight: bold;">${booking.cakeDetails.deliveryTime || booking.cakeDetails.pickupTime}</span>
        </div>
        ` : ''}
        ${booking.cakeDetails.fulfillmentType === 'delivery' && booking.cakeDetails.deliveryAddress ? `
        <div class="info-row">
          <span class="info-label">Deliver To:</span>
          <span class="info-value">${booking.cakeDetails.deliveryAddress.fullAddress || booking.cakeDetails.deliveryAddress.street}</span>
        </div>
        ` : ''}
        ${booking.cakeDetails.fulfillmentType === 'pickup' ? `
        <div class="info-row">
          <span class="info-label">Pickup At:</span>
          <span class="info-value">Your home address</span>
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- Needed By Date -->
      <div class="date-alert">
        <span class="emoji">📅</span> NEEDED BY: ${formatDate(booking.orderDate)}
      </div>

      <!-- Total Price -->
      <div class="total-price">
        Total: $${totalPrice.toFixed(2)}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This order has been saved to your dashboard.</p>
      <p><a href="https://kassycakes.com/kassycakes/dashboard?tab=orders" style="color: #ff94b3; text-decoration: none;">View All Orders →</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendOrderNotificationEmail(booking: Booking, cakeImageUrl?: string): Promise<{ success: boolean; error?: string }> {
  console.log('📧 Attempting to send order notification email via Mailtrap API...');
  console.log('Kassy Email(s):', KASSY_EMAILS.join(', '));
  console.log('Cake Image URL:', cakeImageUrl);

  if (!MAILTRAP_API_TOKEN) {
    console.error('❌ Email not configured, skipping notification');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const addOnsTotal = booking.cakeDetails.addOns.reduce((sum, a) => sum + a.price, 0);
    const calculatedTotal = booking.cakeDetails.price + addOnsTotal;
    // Use actual amount paid from Stripe if available, otherwise fall back to calculated price
    const totalPrice = booking.paymentInfo?.amountPaid || calculatedTotal;

    console.log('📤 Sending email with Mailtrap API...');
    const orderNumber = typeof booking.orderNumber === 'string' ? booking.orderNumber : String(booking.orderNumber || 0).padStart(5, '0');
    await sendMailtrapEmail(
      KASSY_EMAILS,
      `🎂 Order #${orderNumber}: ${booking.cakeDetails.productName} – $${totalPrice.toFixed(2)} – ${formatDate(booking.orderDate)}`,
      generateOrderEmailHTML(booking, cakeImageUrl)
    );

    console.log(`✅ Order notification email sent!`);
    console.log(`📬 Email sent to: ${KASSY_EMAILS.join(', ')}`);
    return { success: true };

  } catch (error) {
    console.error('❌ Error sending email:', error);
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

// Send reminder email for cakes due tomorrow
export async function sendTomorrowReminderEmail(bookings: Booking[]): Promise<{ success: boolean; error?: string; sentCount?: number }> {
  if (!MAILTRAP_API_TOKEN) {
    return { success: false, error: 'Email not configured' };
  }

  if (bookings.length === 0) {
    return { success: true, sentCount: 0 };
  }

  try {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cake Reminder - Due Tomorrow!</title>
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
      max-width: 700px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
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
      font-size: 18px;
      opacity: 0.95;
    }
    .content {
      padding: 30px;
    }
    .order-card {
      background: #fef8f4;
      border: 2px solid #ff94b3;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ffccd5;
    }
    .order-number {
      font-size: 14px;
      color: #ff94b3;
      font-weight: bold;
    }
    .fulfillment-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .delivery {
      background: #3b82f6;
      color: white;
    }
    .pickup {
      background: #10b981;
      color: white;
    }
    .cake-name {
      font-size: 22px;
      font-weight: bold;
      color: #4a2c2a;
      margin-bottom: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .info-item {
      padding: 8px 0;
    }
    .info-label {
      font-size: 12px;
      color: #6b4c4a;
      text-transform: uppercase;
      font-weight: 600;
    }
    .info-value {
      font-size: 16px;
      color: #4a2c2a;
      font-weight: 500;
    }
    .address-box {
      background: #e0f2fe;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin-top: 15px;
      border-radius: 4px;
    }
    .design-notes {
      background: #fff8f0;
      border-left: 4px solid #d4a574;
      padding: 15px;
      margin-top: 15px;
      border-radius: 4px;
      white-space: pre-wrap;
      font-family: 'Georgia', serif;
      font-style: italic;
    }
    .add-ons-list {
      margin-top: 10px;
      padding: 10px;
      background: #f0f9ff;
      border-radius: 6px;
    }
    .add-on {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 14px;
    }
    .total-price {
      font-size: 24px;
      font-weight: bold;
      color: #ff94b3;
      margin-top: 15px;
      text-align: right;
    }
    .summary {
      background: #4a2c2a;
      color: white;
      padding: 20px;
      text-align: center;
      margin-top: 20px;
      border-radius: 8px;
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
      <h1>🎂 Cake${bookings.length > 1 ? 's' : ''} Due Tomorrow!</h1>
      <p>You have ${bookings.length} order${bookings.length > 1 ? 's' : ''} to prepare</p>
    </div>

    <div class="content">
      ${bookings.map(booking => {
        const addOnsTotal = booking.cakeDetails.addOns.reduce((sum, a) => sum + a.price, 0);
        const calculatedTotal = booking.cakeDetails.price + addOnsTotal;
        // Use actual amount paid from Stripe if available
        const totalPrice = booking.paymentInfo?.amountPaid || calculatedTotal;
        const isDelivery = booking.cakeDetails.fulfillmentType === 'delivery';
        const time = booking.cakeDetails.deliveryTime || booking.cakeDetails.pickupTime || 'Not specified';

        return `
        <div class="order-card">
          <div class="order-header">
            <span class="order-number">Order #${booking.orderNumber || 'N/A'}</span>
            <span class="fulfillment-badge ${isDelivery ? 'delivery' : 'pickup'}">
              ${isDelivery ? '📦 DELIVERY' : '🏠 PICKUP'}
            </span>
          </div>

          <div class="cake-name">${booking.cakeDetails.productName}</div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Customer</div>
              <div class="info-value">${booking.customerInfo.name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Phone</div>
              <div class="info-value">${booking.customerInfo.phone || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Size</div>
              <div class="info-value">${booking.cakeDetails.size}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Flavor</div>
              <div class="info-value">${booking.cakeDetails.flavor}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Time</div>
              <div class="info-value">${time}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value" style="font-size: 14px;">${booking.customerInfo.email}</div>
            </div>
          </div>

          ${isDelivery && booking.cakeDetails.deliveryAddress ? `
          <div class="address-box">
            <div class="info-label">📍 Delivery Address</div>
            <div class="info-value" style="margin-top: 5px;">
              ${booking.cakeDetails.deliveryAddress.fullAddress ||
                `${booking.cakeDetails.deliveryAddress.street}, ${booking.cakeDetails.deliveryAddress.city}, ${booking.cakeDetails.deliveryAddress.state} ${booking.cakeDetails.deliveryAddress.zipCode}`}
            </div>
          </div>
          ` : ''}

          ${booking.cakeDetails.addOns.length > 0 ? `
          <div class="add-ons-list">
            <div class="info-label">Add-ons</div>
            ${booking.cakeDetails.addOns.map(addon => `
              <div class="add-on">
                <span>${addon.name}</span>
                <span>+$${addon.price.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${booking.cakeDetails.designNotes ? `
          <div class="design-notes">
            <div class="info-label" style="font-style: normal; margin-bottom: 8px;">📝 Design Notes</div>
            ${booking.cakeDetails.designNotes}
          </div>
          ` : ''}

          ${booking.cakeDetails.edibleImageUrl ? `
          <div style="margin-top: 15px;">
            <div class="info-label">🖼️ Edible Image</div>
            <img src="${booking.cakeDetails.edibleImageUrl}" alt="Edible image" style="max-width: 200px; border-radius: 8px; margin-top: 8px; border: 2px solid #ff94b3;">
          </div>
          ` : ''}

          ${booking.cakeDetails.referenceImageUrl ? `
          <div style="margin-top: 15px;">
            <div class="info-label">📷 Reference Image</div>
            <img src="${booking.cakeDetails.referenceImageUrl}" alt="Reference image" style="max-width: 200px; border-radius: 8px; margin-top: 8px; border: 2px solid #d4a574;">
          </div>
          ` : ''}

          <div class="total-price">Total: $${totalPrice.toFixed(2)}</div>
        </div>
        `;
      }).join('')}

      <div class="summary">
        <div style="font-size: 18px;">Tomorrow's Orders: ${bookings.length}</div>
        <div style="font-size: 14px; margin-top: 5px; opacity: 0.8;">
          ${bookings.filter(b => b.cakeDetails.fulfillmentType === 'delivery').length} Delivery |
          ${bookings.filter(b => b.cakeDetails.fulfillmentType === 'pickup').length} Pickup
        </div>
      </div>
    </div>

    <div class="footer">
      <p><a href="https://kassycakes.com/kassycakes/dashboard" style="color: #ff94b3; text-decoration: none;">View Dashboard →</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    await sendMailtrapEmail(
      KASSY_EMAILS,
      `🚨 ${bookings.length} Cake${bookings.length > 1 ? 's' : ''} Due Tomorrow! - ${formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000))}`,
      htmlContent
    );

    console.log(`✅ Tomorrow reminder email sent for ${bookings.length} order(s)!`);
    return { success: true, sentCount: bookings.length };

  } catch (error) {
    console.error('❌ Error sending reminder email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

// Optional: Send confirmation email to customer
export async function sendCustomerConfirmationEmail(booking: Booking, cakeImageUrl?: string): Promise<{ success: boolean; error?: string }> {
  if (!MAILTRAP_API_TOKEN) {
    return { success: false, error: 'Email not configured' };
  }

  try {
    const calculatedTotal = booking.cakeDetails.price + booking.cakeDetails.addOns.reduce((sum, a) => sum + a.price, 0);
    // Use actual amount paid from Stripe if available, otherwise fall back to calculated price
    const totalPrice = booking.paymentInfo?.amountPaid || calculatedTotal;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #4a2c2a; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ff94b3; color: white; padding: 30px; text-align: center; border-radius: 8px; }
    .content { padding: 20px; background: white; }
    .cake-image { width: 100%; max-width: 400px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: #ff94b3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You for Your Order! 🎂</h1>
      <p style="font-size: 18px; font-weight: bold; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px;">
        Order #${String(booking.orderNumber || 0).padStart(5, '0')}
      </p>
    </div>
    <div class="content">
      <p>Hi ${booking.customerInfo.name}!</p>

      <p>Your order is confirmed! I'll have your <strong>${booking.cakeDetails.size} ${booking.cakeDetails.productName}</strong> (${booking.cakeDetails.flavor}) ready ${booking.cakeDetails.fulfillmentType === 'delivery' ? 'for delivery' : 'for pickup'} on <strong>${formatDate(booking.cakeDetails.pickupDate || booking.orderDate)}</strong>${(booking.cakeDetails.deliveryTime || booking.cakeDetails.pickupTime) ? ` at <strong>${booking.cakeDetails.deliveryTime || booking.cakeDetails.pickupTime}</strong>` : ''}.</p>

      ${booking.cakeDetails.fulfillmentType ? `
      <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #1e40af;">
          ${booking.cakeDetails.fulfillmentType === 'delivery' ? '📦 Delivery' : '🎂 Pickup'}
        </p>
        <p style="margin: 5px 0 0 0; color: #1e3a8a;">
          ${formatDate(booking.cakeDetails.pickupDate || booking.orderDate)}
          ${(booking.cakeDetails.deliveryTime || booking.cakeDetails.pickupTime) ? `<br><strong>${booking.cakeDetails.deliveryTime || booking.cakeDetails.pickupTime}</strong>` : ''}
          ${booking.cakeDetails.fulfillmentType === 'delivery' && booking.cakeDetails.deliveryAddress ? `<br>${booking.cakeDetails.deliveryAddress.fullAddress || booking.cakeDetails.deliveryAddress.street}` : ''}
          ${booking.cakeDetails.fulfillmentType === 'pickup' && process.env.PICKUP_ADDRESS ? `<br>📍 ${process.env.PICKUP_ADDRESS}` : ''}
        </p>
      </div>
      ` : ''}

      ${cakeImageUrl ? `<img src="${cakeImageUrl}" alt="${booking.cakeDetails.productName}" class="cake-image">` : ''}

      ${booking.cakeDetails.edibleImageUrl ? `
      <div style="margin: 20px 0;">
        <h3 style="color: #ff94b3;">Your Edible Image:</h3>
        <img src="${booking.cakeDetails.edibleImageUrl}" alt="Your edible image" style="width: 100%; max-width: 300px; border-radius: 8px; border: 2px solid #ff94b3;">
      </div>
      ` : ''}

      <p><strong>Order Total: $${totalPrice.toFixed(2)}</strong> (Paid)</p>

      <p>Thanks for your order!</p>

      <p style="background: #fff8f0; border: 1px solid #d4a574; padding: 12px; border-radius: 6px; font-size: 14px; color: #6b4c4a;">
        <strong>📝 Important:</strong> If you have any questions about your order, please reference your Order Number: <strong>#${String(booking.orderNumber || 0).padStart(5, '0')}</strong>
      </p>

      <a href="mailto:kassybakes@gmail.com" class="button">Contact Us</a>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Kassy Cakes<br>
        Kyle, Texas<br>
        kassybakes@gmail.com
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const orderNumber = String(booking.orderNumber || 0).padStart(5, '0');
    await sendMailtrapEmail(
      booking.customerInfo.email,
      `Order #${orderNumber} Confirmed - ${booking.cakeDetails.productName}`,
      htmlContent
    );

    console.log(`✅ Confirmation email sent to customer: ${booking.customerInfo.email}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending customer email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}
