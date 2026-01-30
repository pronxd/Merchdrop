import { NextRequest, NextResponse } from 'next/server';
import { getAddOns, createAddOn, generateSlug } from '@/lib/addons-db';
import { isAdminAuthenticated } from '@/lib/auth';

// GET all add-ons
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeHidden = searchParams.get('includeHidden') === 'true';

    const addons = await getAddOns(includeHidden);

    const response = NextResponse.json({ addons });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching add-ons:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new add-on
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
    const { name, price, image } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields (name, price)' },
        { status: 400 }
      );
    }

    const id = generateSlug(name);

    const result = await createAddOn({
      id,
      name,
      price: parseFloat(price),
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
    console.error('Error creating add-on:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
