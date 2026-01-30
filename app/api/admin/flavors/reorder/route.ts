import { NextRequest, NextResponse } from 'next/server';
import { updateFlavorOrder } from '@/lib/addons-db';
import { isAdminAuthenticated } from '@/lib/auth';

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
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid items array' },
        { status: 400 }
      );
    }

    const result = await updateFlavorOrder(items);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error reordering flavors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
