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
      cakeDetails
    } = body;

    // Validate required fields
    if (!orderDate || !customerInfo || !cakeDetails) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the booking first to get the bookingId
    const result = await createBooking({
      orderDate: new Date(orderDate),
      status,
      customerInfo,
      cakeDetails
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // If there's an edible image URL in temp, move it to permanent storage
    let permanentEdibleImageUrl = cakeDetails.edibleImageUrl;
    if (cakeDetails.edibleImageUrl && cakeDetails.edibleImageUrl.includes('/temp/')) {
      try {
        const moveResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/move-edible-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tempUrl: cakeDetails.edibleImageUrl,
            bookingId: result.bookingId
          })
        });

        if (moveResponse.ok) {
          const moveData = await moveResponse.json();
          permanentEdibleImageUrl = moveData.url;
          console.log('✅ Moved edible image to permanent storage:', permanentEdibleImageUrl);

          // Update the booking with the permanent URL
          const { getCollection } = await import('@/lib/mongodb');
          const { ObjectId } = await import('mongodb');
          const bookingsCollection = await getCollection('bookings');
          await bookingsCollection.updateOne(
            { _id: new ObjectId(result.bookingId) },
            { $set: { 'cakeDetails.edibleImageUrl': permanentEdibleImageUrl } }
          );
        } else {
          console.warn('Failed to move edible image, using temp URL');
        }
      } catch (error) {
        console.error('Error moving edible image:', error);
        // Continue with temp URL if move fails
      }
    }

    // Send email notification to Kassy
    const emailResult = await sendOrderNotificationEmail({
      _id: result.bookingId as any,
      orderDate: new Date(orderDate),
      createdAt: new Date(),
      status,
      customerInfo,
      cakeDetails: {
        ...cakeDetails,
        edibleImageUrl: permanentEdibleImageUrl
      }
    });

    if (!emailResult.success) {
      console.warn('Email notification failed:', emailResult.error);
      // Don't fail the booking if email fails
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
