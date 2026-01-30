import { NextRequest, NextResponse } from 'next/server';
import { addBlockedDate, removeBlockedDate, getBlockedDates } from '@/lib/bookings';
import { isAdminAuthenticated } from '@/lib/auth';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Get all blocked dates
export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blockedDates = await getBlockedDates();
    return NextResponse.json(
      { blockedDates },
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
    console.error('Error fetching blocked dates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blocked dates' },
      { status: 500 }
    );
  }
}

// Add a blocked date
export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, reason, capacity } = await request.json();

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const result = await addBlockedDate(new Date(date), reason, capacity);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error blocking date:', error);
    return NextResponse.json(
      { error: 'Failed to block date' },
      { status: 500 }
    );
  }
}

// Remove a blocked date
export async function DELETE(request: NextRequest) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    console.log('DELETE request for date:', date);

    const result = await removeBlockedDate(new Date(date));

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to unblock date' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unblocking date:', error);
    return NextResponse.json(
      { error: 'Failed to unblock date' },
      { status: 500 }
    );
  }
}
