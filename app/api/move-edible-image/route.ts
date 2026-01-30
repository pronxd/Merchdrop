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
    const { tempUrl, bookingId } = body;

    if (!tempUrl || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract path from temp URL
    const tempPath = tempUrl.replace(`${BUNNY_CDN_URL}/`, '');

    // Ensure it's from temp folder
    if (!tempPath.startsWith('temp/')) {
      return NextResponse.json(
        { error: 'Can only move files from temp folder' },
        { status: 400 }
      );
    }

    // Download the file from temp location
    const downloadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${tempPath}`;

    const downloadResponse = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
      },
    });

    if (!downloadResponse.ok) {
      console.error('Failed to download temp image:', await downloadResponse.text());
      return NextResponse.json(
        { error: 'Failed to download temp image' },
        { status: 500 }
      );
    }

    const fileBuffer = await downloadResponse.arrayBuffer();

    // Create permanent path: orders/edible-images/{bookingId}/{filename}
    const filename = tempPath.split('/').pop();
    const permanentPath = `orders/edible-images/${bookingId}/${filename}`;

    // Upload to permanent location
    const uploadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${permanentPath}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
        'Content-Type': 'image/jpeg',
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      console.error('Failed to upload to permanent location:', await uploadResponse.text());
      return NextResponse.json(
        { error: 'Failed to upload to permanent location' },
        { status: 500 }
      );
    }

    // Delete from temp location
    const deleteUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${tempPath}`;

    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
      },
    });

    // Don't fail if delete fails - the file is already in permanent location
    if (!deleteResponse.ok) {
      console.warn('Failed to delete temp file (non-critical):', tempPath);
    }

    // Return the permanent CDN URL
    const permanentUrl = `${BUNNY_CDN_URL}/${permanentPath}`;

    return NextResponse.json({
      success: true,
      url: permanentUrl,
    });

  } catch (error) {
    console.error('Error moving edible image:', error);
    return NextResponse.json(
      { error: 'Failed to move image' },
      { status: 500 }
    );
  }
}
