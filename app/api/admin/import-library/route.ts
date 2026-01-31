import { NextRequest, NextResponse } from 'next/server';
import { listBunnyFolder } from '@/lib/bunny';
import { isAdminAuthenticated } from '@/lib/auth';

// Force dynamic - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/import-library
 * Returns all files from the /Studio/ folder in Bunny CDN
 */
export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // List files from Studio folder
    const result = await listBunnyFolder('/Studio/');

    console.log(`📂 Import library: Found ${result.files?.length || 0} files in Studio`);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch import library' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      files: result.files || []
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Import library API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
