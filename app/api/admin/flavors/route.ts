import { NextRequest, NextResponse } from 'next/server';
import { getFlavors, createFlavor, generateSlug } from '@/lib/addons-db';
import { isAdminAuthenticated } from '@/lib/auth';

// GET all flavors
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeHidden = searchParams.get('includeHidden') === 'true';

    const flavors = await getFlavors(includeHidden);

    const response = NextResponse.json({ flavors });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching flavors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new flavor
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
    const { name, image } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field (name)' },
        { status: 400 }
      );
    }

    const id = generateSlug(name);

    const result = await createFlavor({
      id,
      name,
      image: image || '',
      hidden: false
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
    console.error('Error creating flavor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
