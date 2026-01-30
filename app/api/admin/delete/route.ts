import { NextRequest, NextResponse } from 'next/server';
import { deleteFromBunny, extractPathFromCdnUrl } from '@/lib/bunny';
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

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'Missing URL' },
        { status: 400 }
      );
    }

    // Extract the path from the CDN URL
    const filePath = extractPathFromCdnUrl(url);

    if (!filePath) {
      return NextResponse.json(
        { error: 'Invalid CDN URL' },
        { status: 400 }
      );
    }

    // Delete from Bunny
    const result = await deleteFromBunny(filePath);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
