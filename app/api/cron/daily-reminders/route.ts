import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { sendTomorrowReminderEmail } from '@/lib/email';
import { Booking } from '@/lib/bookings';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Optional: Add a secret key for security (set CRON_SECRET in env)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  try {
    // Optional security check - verify cron secret if configured
    const authHeader = req.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Calculate tomorrow's date range (in Central Time)
    const now = new Date();

    // Get tomorrow in Central Time
    const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    const tomorrow = new Date(centralTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    console.log('🔍 Checking for orders due tomorrow:', {
      start: tomorrow.toISOString(),
      end: tomorrowEnd.toISOString()
    });

    // Fetch bookings for tomorrow
    const bookingsCollection = await getCollection('bookings');
    const tomorrowBookings = await bookingsCollection.find({
      orderDate: { $gte: tomorrow, $lte: tomorrowEnd },
      status: { $in: ['pending', 'confirmed'] }
    }).toArray() as Booking[];

    console.log(`📋 Found ${tomorrowBookings.length} order(s) due tomorrow`);

    if (tomorrowBookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders due tomorrow',
        ordersChecked: 0,
        emailSent: false
      });
    }

    // Send reminder email
    const emailResult = await sendTomorrowReminderEmail(tomorrowBookings);

    if (!emailResult.success) {
      console.error('❌ Failed to send reminder email:', emailResult.error);
      return NextResponse.json({
        success: false,
        error: emailResult.error,
        ordersFound: tomorrowBookings.length
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Reminder email sent for ${tomorrowBookings.length} order(s)`,
      ordersFound: tomorrowBookings.length,
      emailSent: true,
      orders: tomorrowBookings.map(b => ({
        orderNumber: b.orderNumber,
        customerName: b.customerInfo.name,
        cake: b.cakeDetails.productName,
        fulfillmentType: b.cakeDetails.fulfillmentType
      }))
    });

  } catch (error) {
    console.error('❌ Error in daily reminders cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for Vercel Cron
export async function POST(req: NextRequest) {
  return GET(req);
}
