import twilio from 'twilio';
import { Booking } from './bookings';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const kassyPhoneNumber = process.env.KASSY_PHONE_NUMBER;

let client: ReturnType<typeof twilio> | null = null;

// Initialize Twilio client only if credentials are available
if (accountSid && authToken && accountSid !== 'your_account_sid_here') {
  client = twilio(accountSid, authToken);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export async function sendOrderNotification(booking: Booking): Promise<{ success: boolean; error?: string }> {
  // Skip if Twilio not configured
  if (!client || !twilioPhoneNumber || !kassyPhoneNumber) {
    console.log('Twilio not configured, skipping SMS notification');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const addOnsText = booking.cakeDetails.addOns.length > 0
      ? `\n\nAdd-ons: ${booking.cakeDetails.addOns.map(a => `${a.name} (+$${a.price})`).join(', ')}`
      : '';

    const totalPrice = booking.cakeDetails.price + booking.cakeDetails.addOns.reduce((sum, a) => sum + a.price, 0);

    const message = `
🎂 NEW CAKE ORDER!

Customer: ${booking.customerInfo.name}
Phone: ${booking.customerInfo.phone || 'Not provided'}
Email: ${booking.customerInfo.email}

Cake: ${booking.cakeDetails.size} ${booking.cakeDetails.productName}
Flavor: ${booking.cakeDetails.flavor}${addOnsText}

💰 Total: $${totalPrice.toFixed(2)}

📅 NEEDED BY: ${formatDate(booking.orderDate)}

Design Notes:
${booking.cakeDetails.designNotes || 'No special customizations'}

View order: kassycakes.com/kassyadmin/orders
    `.trim();

    await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: kassyPhoneNumber
    });

    console.log(`✅ SMS sent to Kassy for order: ${booking._id}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS'
    };
  }
}

// Optional: Send confirmation to customer
export async function sendCustomerConfirmation(booking: Booking): Promise<{ success: boolean; error?: string }> {
  if (!client || !twilioPhoneNumber || !booking.customerInfo.phone) {
    return { success: false, error: 'SMS not configured or no phone number' };
  }

  try {
    const message = `
Hi ${booking.customerInfo.name}! 🎂

Thank you for ordering from Kassy Cakes!

Your ${booking.cakeDetails.size} ${booking.cakeDetails.productName} is scheduled for ${formatDate(booking.orderDate)}.

We'll send you a confirmation email with all the details. If you have any questions, reply to this message or email hello@kassycakes.com.

- Kassy 💕
    `.trim();

    await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: booking.customerInfo.phone
    });

    console.log(`✅ Confirmation SMS sent to customer: ${booking.customerInfo.phone}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending customer SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS'
    };
  }
}
