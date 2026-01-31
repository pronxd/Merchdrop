import { NextRequest, NextResponse } from 'next/server';
import { createBooking, getBookings } from '@/lib/bookings';
import { sendOrderNotificationEmail } from '@/lib/email';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      orderDate,
      status = 'pending',
      customerInfo,
      orderDetails
    } = body;

    // Validate required fields
    if (!orderDate || !customerInfo || !orderDetails) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await createBooking({
      orderDate: new Date(orderDate),
      status,
      customerInfo,
      orderDetails
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Send email notification to admin
    const emailResult = await sendOrderNotificationEmail({
      _id: result.bookingId as any,
      orderDate: new Date(orderDate),
      createdAt: new Date(),
      status,
      customerInfo,
      orderDetails
    });

    if (!emailResult.success) {
      console.warn('Email notification failed:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      emailSent: emailResult.success
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const bookings = await getBookings(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    const response = NextResponse.json({ bookings });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;

  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
