import twilio from 'twilio';
import { Booking } from './bookings';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const adminPhoneNumber = process.env.ADMIN_PHONE_NUMBER;

let client: ReturnType<typeof twilio> | null = null;

// Initialize Twilio client only if credentials are available
if (accountSid && authToken && accountSid !== 'your_account_sid_here') {
  client = twilio(accountSid, authToken);
}

export async function sendOrderNotification(booking: Booking): Promise<{ success: boolean; error?: string }> {
  // Skip if Twilio not configured
  if (!client || !twilioPhoneNumber || !adminPhoneNumber) {
    console.log('Twilio not configured, skipping SMS notification');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const message = `
\u{1F4E6} NEW ORDER!

Customer: ${booking.customerInfo.name}
Phone: ${booking.customerInfo.phone || 'Not provided'}
Email: ${booking.customerInfo.email}

Product: ${booking.orderDetails.productName}
Size: ${booking.orderDetails.size}
Quantity: ${booking.orderDetails.quantity}

\u{1F4B0} Price: $${booking.orderDetails.price.toFixed(2)}

View order: ${process.env.NEXT_PUBLIC_BASE_URL || ''}/admin/orders
    `.trim();

    await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: adminPhoneNumber
    });

    console.log(`SMS sent to admin for order: ${booking._id}`);
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
Hi ${booking.customerInfo.name}!

Thank you for ordering from POPDRP!

Your order has been confirmed and will ship soon.

Item: ${booking.orderDetails.productName} (${booking.orderDetails.size}) x${booking.orderDetails.quantity}

If you have any questions, reply to this message or email ${process.env.FROM_EMAIL || 'noreply@merchdrop.com'}.

- POPDRP
    `.trim();

    await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: booking.customerInfo.phone
    });

    console.log(`Confirmation SMS sent to customer: ${booking.customerInfo.phone}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending customer SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS'
    };
  }
}
