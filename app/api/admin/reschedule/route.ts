import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// Admin reschedule endpoint - no date restrictions unlike customer-facing modify endpoint
export async function POST(request: NextRequest) {
  try {
    const { bookingId, newDate, newTime } = await request.json();

    if (!bookingId || !newDate) {
      return NextResponse.json({ error: 'Booking ID and new date are required' }, { status: 400 });
    }

    const bookingsCollection = await getCollection('bookings');

    // Find the booking
    let booking;
    try {
      booking = await bookingsCollection.findOne({
        _id: new ObjectId(bookingId)
      });
    } catch {
      return NextResponse.json({ error: 'Invalid booking ID format' }, { status: 400 });
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Parse the new date - handle YYYY-MM-DD format properly
    // Add T12:00:00 to avoid timezone issues where midnight UTC becomes previous day in some timezones
    const dateStr = newDate.includes('T') ? newDate : `${newDate}T12:00:00`;
    const parsedNewDate = new Date(dateStr);
    if (isNaN(parsedNewDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Build update data
    const updateData: Record<string, any> = {
      orderDate: parsedNewDate,
      'cakeDetails.pickupDate': parsedNewDate,
    };

    // Update time if provided
    if (newTime) {
      if (booking.cakeDetails?.fulfillmentType === 'delivery') {
        updateData['cakeDetails.deliveryTime'] = newTime;
      } else {
        updateData['cakeDetails.pickupTime'] = newTime;
      }
    }

    // Update the booking
    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: updateData }
    );

    // matchedCount tells us if the document was found
    // modifiedCount can be 0 if the new data is same as old data
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Booking not found for update' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Order rescheduled successfully',
      newDate: parsedNewDate.toISOString()
    });
  } catch (error) {
    console.error('Admin reschedule error:', error);
    return NextResponse.json(
      { error: 'Failed to reschedule order' },
      { status: 500 }
    );
  }
}
