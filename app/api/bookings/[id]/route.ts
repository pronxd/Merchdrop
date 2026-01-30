import { NextRequest, NextResponse } from 'next/server';
import { updateBookingStatus, updateBookingDesignNotes, updateBookingImages } from '@/lib/bookings';
import { isAdminAuthenticated } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { id } = await params;
    const { status, designNotes, referenceImageUrl, edibleImageUrl } = body;

    console.log('PATCH /api/bookings/[id] - Updating booking:', { id, status, hasDesignNotes: !!designNotes, hasImages: !!(referenceImageUrl || edibleImageUrl) });

    // Handle status update
    if (status) {
      if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }

      const success = await updateBookingStatus(id, status);

      if (!success) {
        console.error('Failed to update booking status:', id);
        return NextResponse.json(
          { error: 'Booking not found or update failed' },
          { status: 404 }
        );
      }

      console.log('Successfully updated booking status:', id);
      return NextResponse.json({ success: true });
    }

    // Handle design notes update (requires admin auth)
    if (designNotes !== undefined) {
      const isAdmin = await isAdminAuthenticated();
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const success = await updateBookingDesignNotes(id, designNotes);

      if (!success) {
        console.error('Failed to update design notes:', id);
        return NextResponse.json(
          { error: 'Booking not found or update failed' },
          { status: 404 }
        );
      }

      console.log('Successfully updated design notes:', id);
      return NextResponse.json({ success: true });
    }

    // Handle image updates (requires admin auth)
    if (referenceImageUrl !== undefined || edibleImageUrl !== undefined) {
      const isAdmin = await isAdminAuthenticated();
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const images: { referenceImageUrl?: string; edibleImageUrl?: string } = {};
      if (referenceImageUrl !== undefined) images.referenceImageUrl = referenceImageUrl;
      if (edibleImageUrl !== undefined) images.edibleImageUrl = edibleImageUrl;

      const success = await updateBookingImages(id, images);

      if (!success) {
        console.error('Failed to update images:', id);
        return NextResponse.json(
          { error: 'Booking not found or update failed' },
          { status: 404 }
        );
      }

      console.log('Successfully updated images:', id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'No valid update field provided' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
