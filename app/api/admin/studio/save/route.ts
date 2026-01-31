import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
    const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
    const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME;
    const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL;

    if (!BUNNY_STORAGE_ZONE || !BUNNY_ACCESS_KEY || !BUNNY_HOSTNAME || !BUNNY_CDN_URL) {
      return NextResponse.json(
        { error: 'Bunny CDN not configured' },
        { status: 500 }
      );
    }

    let imageBuffer: Buffer;

    // Handle base64 data URLs (from Nano Banana)
    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    }
    // Handle external URLs (from Seedream/FAL)
    else {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    // Generate filename with timestamp
    const timestamp = Date.now();
    const fileName = `edited-${timestamp}.png`;
    const path = `/Studio/${fileName}`;

    console.log(`💾 Saving edited image to: ${path}`);

    // Upload to Bunny CDN
    const uploadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}${path}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
        'Content-Type': 'image/png'
      },
      body: new Uint8Array(imageBuffer)
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Bunny upload failed:', errorText);
      return NextResponse.json(
        { error: `Upload failed: ${uploadResponse.statusText}` },
        { status: 500 }
      );
    }

    const cdnUrl = `${BUNNY_CDN_URL}${path}`;
    console.log(`✅ Saved to library: ${cdnUrl}`);

    return NextResponse.json({
      success: true,
      url: cdnUrl
    });

  } catch (error) {
    console.error('Save to library error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
