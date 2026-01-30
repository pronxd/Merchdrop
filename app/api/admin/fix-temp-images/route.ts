import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { moveImageFromTempToPermanent } from '@/lib/bunny-storage';
import { isAdminAuthenticated } from '@/lib/auth';

export async function POST() {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingsCollection = await getCollection('bookings');

    // Find all bookings with temp images
    const bookingsWithTempImages = await bookingsCollection.find({
      $or: [
        { 'cakeDetails.edibleImageUrl': { $regex: '/temp/' } },
        { 'cakeDetails.referenceImageUrl': { $regex: '/temp/' } }
      ]
    }).toArray();

    console.log(`Found ${bookingsWithTempImages.length} bookings with temp images`);

    const results = [];

    for (const booking of bookingsWithTempImages) {
      const bookingId = booking._id.toString();
      const updates: any = {};
      let updated = false;

      // Move edible image
      if (booking.cakeDetails.edibleImageUrl?.includes('/temp/')) {
        console.log(`Moving edible image for booking ${bookingId}...`);
        const permanentUrl = await moveImageFromTempToPermanent(
          booking.cakeDetails.edibleImageUrl,
          bookingId
        );
        if (permanentUrl) {
          updates['cakeDetails.edibleImageUrl'] = permanentUrl;
          updated = true;
          console.log(`✅ Moved edible image to: ${permanentUrl}`);
        } else {
          console.error(`❌ Failed to move edible image for ${bookingId}`);
        }
      }

      // Move reference image
      if (booking.cakeDetails.referenceImageUrl?.includes('/temp/')) {
        console.log(`Moving reference image for booking ${bookingId}...`);
        const permanentUrl = await moveImageFromTempToPermanent(
          booking.cakeDetails.referenceImageUrl,
          bookingId
        );
        if (permanentUrl) {
          updates['cakeDetails.referenceImageUrl'] = permanentUrl;
          updated = true;
          console.log(`✅ Moved reference image to: ${permanentUrl}`);
        } else {
          console.error(`❌ Failed to move reference image for ${bookingId}`);
        }
      }

      // Update booking if any images were moved
      if (updated) {
        await bookingsCollection.updateOne(
          { _id: booking._id },
          { $set: updates }
        );
        results.push({
          bookingId,
          success: true,
          updates
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${results.length} bookings`,
      results
    });

  } catch (error) {
    console.error('Error fixing temp images:', error);
    return NextResponse.json(
      { error: 'Failed to fix temp images' },
      { status: 500 }
    );
  }
}
