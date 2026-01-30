import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });
    }

    // Parse dates - append time to ensure full day coverage
    // startDate and endDate come as YYYY-MM-DD strings
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    // Get all bookings in date range
    const bookingsCollection = await getCollection('bookings');
    const blockedDatesCollection = await getCollection('blockedDates');

    // Get bookings grouped by date
    const bookings = await bookingsCollection.find({
      orderDate: { $gte: start, $lte: end },
      status: { $in: ['pending', 'confirmed'] }
    }).toArray();

    // Get manually blocked dates
    const blockedDates = await blockedDatesCollection.find({
      date: { $gte: start, $lte: end }
    }).toArray();

    // Format blocked dates with reasons and capacity for frontend
    // Use UTC methods to avoid timezone shifts
    const formattedBlockedDates = blockedDates.map(blocked => {
      const d = new Date(blocked.date);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return {
        date: `${year}-${month}-${day}`,
        reason: blocked.reason || 'Closed',
        capacity: blocked.capacity // Include capacity for per-day limits
      };
    });

    return NextResponse.json(
      {
        blockedDates: formattedBlockedDates,
        bookings: bookings
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching available dates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available dates' },
      { status: 500 }
    );
  }
}
