import { NextRequest, NextResponse } from 'next/server';

const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME;
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL;

export async function POST(request: NextRequest) {
  try {
    if (!BUNNY_ACCESS_KEY || !BUNNY_STORAGE_ZONE || !BUNNY_HOSTNAME || !BUNNY_CDN_URL) {
      return NextResponse.json(
        { error: 'Bunny storage not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }

    // Extract path from CDN URL
    const path = url.replace(`${BUNNY_CDN_URL}/`, '');

    // Only delete from temp folder for safety
    if (!path.startsWith('temp/')) {
      return NextResponse.json(
        { error: 'Can only delete from temp folder' },
        { status: 400 }
      );
    }

    // Delete from Bunny Storage
    const deleteUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${path}`;

    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
      },
    });

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      // 404 is okay - file already deleted or doesn't exist
      const errorText = await deleteResponse.text();
      console.error('Bunny delete error:', errorText);
      return NextResponse.json(
        { error: 'Failed to delete from Bunny' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
