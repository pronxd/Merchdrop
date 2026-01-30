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

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const folder = formData.get('folder') as string || 'temp';

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const filename = `${timestamp}-${randomString}.jpg`;
    const path = `${folder}/edible-images/${filename}`;

    // Convert file to buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Bunny Storage
    const uploadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${path}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
        'Content-Type': 'image/jpeg',
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Bunny upload error:', errorText);
      return NextResponse.json(
        { error: 'Failed to upload to Bunny' },
        { status: 500 }
      );
    }

    // Return the CDN URL
    const cdnUrl = `${BUNNY_CDN_URL}/${path}`;

    return NextResponse.json({
      success: true,
      url: cdnUrl,
      path: path,
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
