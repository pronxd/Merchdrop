import { NextRequest, NextResponse } from 'next/server';
import { getFlavorById, updateFlavor, deleteFlavor, toggleFlavorVisibility } from '@/lib/addons-db';
import { isAdminAuthenticated } from '@/lib/auth';

// GET single flavor
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const flavor = await getFlavorById(id);

    if (!flavor) {
      return NextResponse.json(
        { error: 'Flavor not found' },
        { status: 404 }
      );
    }

    const response = NextResponse.json({ flavor });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return response;
  } catch (error) {
    console.error('Error fetching flavor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update flavor
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

    if (body.action === 'toggleVisibility') {
      const result = await toggleFlavorVisibility(id);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        hidden: result.hidden
      });
    }

    const result = await updateFlavor(id, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating flavor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Permanently delete flavor
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
    const result = await deleteFlavor(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting flavor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
