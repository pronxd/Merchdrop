import { NextRequest, NextResponse } from 'next/server';
import { getDiscountCodes, createDiscountCode } from '@/lib/discount-codes-db';
import { isAdminAuthenticated } from '@/lib/auth';

// GET all discount codes
export async function GET(req: NextRequest) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const codes = await getDiscountCodes(includeInactive);

    const response = NextResponse.json({ codes });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching discount codes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new discount code
export async function POST(req: NextRequest) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { code, percentage, maxUses, expiresAt } = body;

    if (!code || percentage === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields (code, percentage)' },
        { status: 400 }
      );
    }

    if (percentage < 1 || percentage > 100) {
      return NextResponse.json(
        { error: 'Percentage must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Only set maxUses if it's a positive number
    const parsedMaxUses = maxUses ? parseInt(maxUses) : undefined;

    const result = await createDiscountCode({
      code: code.trim(), // Keep case-sensitivity
      percentage: parseFloat(percentage),
      active: true,
      maxUses: parsedMaxUses && parsedMaxUses > 0 ? parsedMaxUses : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      id: result.id
    });

  } catch (error) {
    console.error('Error creating discount code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
