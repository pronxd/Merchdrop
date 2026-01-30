import { NextResponse } from 'next/server';
import { getAddOns, getFlavors, getFillings } from '@/lib/addons-db';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';

// Public endpoint to fetch all visible add-ons, flavors, and fillings
export async function GET() {
  try {
    const [addons, flavors, fillings] = await Promise.all([
      getAddOns(false), // Only visible
      getFlavors(false),
      getFillings(false)
    ]);

    const response = NextResponse.json({
      addons,
      flavors,
      fillings
    });

    // No caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
