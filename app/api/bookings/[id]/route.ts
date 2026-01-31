import { NextRequest, NextResponse } from 'next/server';
import { updateBookingStatus } from '@/lib/bookings';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { id } = await params;
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'No valid update field provided' },
        { status: 400 }
      );
    }

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const success = await updateBookingStatus(id, status);

    if (!success) {
      return NextResponse.json(
        { error: 'Booking not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
