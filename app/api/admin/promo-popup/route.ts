import { NextRequest, NextResponse } from 'next/server';
import { getPromoPopupSettings, updatePromoPopupSettings, getDiscountCodes } from '@/lib/discount-codes-db';
import { isAdminAuthenticated } from '@/lib/auth';

// GET promo popup settings
export async function GET(req: NextRequest) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const settings = await getPromoPopupSettings();
    const codes = await getDiscountCodes(true); // Include inactive for selection

    const response = NextResponse.json({
      settings: settings || { enabled: false, discountCodeId: null, customMessage: '' },
      availableCodes: codes
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching promo popup settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update promo popup settings
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
    const { enabled, discountCodeId, customMessage } = body;

    const result = await updatePromoPopupSettings({
      enabled: enabled ?? false,
      discountCodeId: discountCodeId || undefined,
      customMessage: customMessage || undefined
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating promo popup settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
