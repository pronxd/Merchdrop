import { NextRequest, NextResponse } from 'next/server';
import { uploadToBunny } from '@/lib/bunny';
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
    const productName = formData.get('productName') as string;

    if (!file || !productName) {
      return NextResponse.json(
        { error: 'Missing file or product name' },
        { status: 400 }
      );
    }

    console.log(`📤 Upload request: ${file.name}, type: ${file.type}, size: ${(file.size / 1024).toFixed(1)} KB`);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);

    // Validate buffer has content
    if (buffer.length === 0) {
      console.error('❌ Empty file buffer received');
      return NextResponse.json(
        { error: 'Empty file received' },
        { status: 400 }
      );
    }

    console.log(`📦 Buffer created: ${(buffer.length / 1024).toFixed(1)} KB`);

    // Check if it's an image and compress it
    const isImage = file.type.startsWith('image/');
    if (isImage) {
      try {
        console.log(`📸 Compressing image: ${file.name} (${(buffer.length / 1024).toFixed(1)} KB)`);

        const compressedBuffer = await sharp(buffer)
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 90 })
          .toBuffer();

        buffer = Buffer.from(compressedBuffer);

        console.log(`✅ Compressed to: ${(buffer.length / 1024).toFixed(1)} KB`);
      } catch (compressError) {
        console.error('⚠️  Compression failed, using original:', compressError);
        // If compression fails, continue with original buffer
      }
    }

    // Generate unique filename to prevent overwrites
    const timestamp = Date.now();

    // Get extension from filename or MIME type
    let extension = file.name.split('.').pop();

    // If extension is 'blob' or invalid, derive from MIME type
    if (!extension || extension === 'blob' || extension.length > 5) {
      const mimeType = file.type;
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
      extension = mimeExtensions[mimeType] || 'jpg';
    }

    const fileName = `${timestamp}.${extension}`;
    const isVideo = file.type.startsWith('video/');

    console.log(`📁 Uploading as: ${fileName} (${isVideo ? 'video' : 'image'})`);

    // Upload to Bunny
    const result = await uploadToBunny(buffer, fileName, productName);

    if (!result.success) {
      console.error(`❌ Bunny upload failed: ${result.error}`);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    console.log(`✅ Upload successful: ${result.url}`);

    return NextResponse.json({
      success: true,
      url: result.url
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
