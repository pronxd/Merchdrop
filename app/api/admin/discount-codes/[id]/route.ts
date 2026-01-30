import { NextRequest, NextResponse } from 'next/server';
import {
  getDiscountCodeById,
  updateDiscountCode,
  deleteDiscountCode,
  toggleDiscountCodeActive
} from '@/lib/discount-codes-db';
import { isAdminAuthenticated } from '@/lib/auth';

// GET single discount code
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const code = await getDiscountCodeById(id);

    if (!code) {
      return NextResponse.json(
        { error: 'Discount code not found' },
        { status: 404 }
      );
    }

    const response = NextResponse.json({ code });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return response;
  } catch (error) {
    console.error('Error fetching discount code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update discount code
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    if (body.action === 'toggleActive') {
      const result = await toggleDiscountCodeActive(id);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        active: result.active
      });
    }

    // Validate percentage if provided
    if (body.percentage !== undefined && (body.percentage < 1 || body.percentage > 100)) {
      return NextResponse.json(
        { error: 'Percentage must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Process expiration date
    const updates = { ...body };
    if (updates.expiresAt) {
      updates.expiresAt = new Date(updates.expiresAt);
    }

    // Track fields to unset (when they should be removed/unlimited)
    const fieldsToUnset: string[] = [];

    // Handle maxUses - if undefined/null/0, remove it (unlimited)
    if (updates.maxUses === undefined || updates.maxUses === null || updates.maxUses === 0) {
      delete updates.maxUses;
      fieldsToUnset.push('maxUses');
    }

    // Handle expiresAt - if empty, remove it (no expiration)
    if (body.expiresAt === undefined || body.expiresAt === null || body.expiresAt === '') {
      delete updates.expiresAt;
      fieldsToUnset.push('expiresAt');
    }

    const result = await updateDiscountCode(id, updates, fieldsToUnset);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating discount code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Permanently delete discount code
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await deleteDiscountCode(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting discount code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
