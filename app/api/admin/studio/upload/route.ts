import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import sharp from 'sharp';

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

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file' },
        { status: 400 }
      );
    }

    console.log(`📤 Studio upload: ${file.name}, type: ${file.type}, size: ${(file.size / 1024).toFixed(1)} KB`);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: 'Empty file received' },
        { status: 400 }
      );
    }

    // Check if it's an image and compress it
    const isImage = file.type.startsWith('image/');
    if (isImage) {
      try {
        console.log(`📸 Compressing image: ${file.name}`);
        const compressedBuffer = await sharp(buffer)
          .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 90 })
          .toBuffer();

        buffer = Buffer.from(compressedBuffer);
        console.log(`✅ Compressed to: ${(buffer.length / 1024).toFixed(1)} KB`);
      } catch (compressError) {
        console.error('⚠️ Compression failed, using original:', compressError);
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    let extension = file.name.split('.').pop();

    if (!extension || extension === 'blob' || extension.length > 5) {
      const mimeExtensions: { [key: string]: string } = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
        'video/x-msvideo': 'avi'
      };
      extension = mimeExtensions[file.type] || 'jpg';
    }

    const fileName = `${timestamp}.${extension}`;
    const isVideo = file.type.startsWith('video/');

    // Upload to Bunny CDN - Studio folder
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

    // Save to /Studio/ folder (import library)
    const path = `/Studio/${fileName}`;
    const uploadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}${path}`;

    console.log(`📁 Uploading to: ${path}`);

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
        'Content-Type': 'application/octet-stream'
      },
      body: new Uint8Array(buffer)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Bunny upload failed:', errorText);
      return NextResponse.json(
        { error: `Upload failed: ${response.statusText}` },
        { status: 500 }
      );
    }

    const cdnUrl = `${BUNNY_CDN_URL}${path}`;
    console.log(`✅ Upload successful: ${cdnUrl}`);

    return NextResponse.json({
      success: true,
      url: cdnUrl,
      type: isVideo ? 'video' : 'image',
      name: fileName
    });

  } catch (error) {
    console.error('Studio upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
