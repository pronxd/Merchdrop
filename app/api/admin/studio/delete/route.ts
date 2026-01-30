import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
  try {
    // Check admin authentication
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
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

    // Extract the path from the CDN URL
    // e.g., https://kassy.b-cdn.net/Cakes-All/123.jpg -> /Cakes-All/123.jpg
    const filePath = fileUrl.replace(BUNNY_CDN_URL, '');

    console.log(`🗑️ Deleting file: ${filePath}`);

    const deleteUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}${filePath}`;

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Bunny delete failed:', errorText);
      return NextResponse.json(
        { error: `Delete failed: ${response.statusText}` },
        { status: 500 }
      );
    }

    console.log(`✅ File deleted: ${filePath}`);

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Studio delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
