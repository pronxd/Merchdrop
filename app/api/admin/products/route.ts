import { NextRequest, NextResponse } from 'next/server';
import { getProducts, createProduct, generateSlug } from '@/lib/products-db';
import { isAdminAuthenticated } from '@/lib/auth';

// GET all products
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeHidden = searchParams.get('includeHidden') === 'true';

    const products = await getProducts(includeHidden);

    const response = NextResponse.json({ products });
    // Prevent caching for admin product list to ensure real-time updates
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new product
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

    const body = await req.json();

    const {
      name,
      category,
      sizes,
      media,
      colorVariants,
      designVariants,
      tagline,
      description,
      detailed_description,
      searchable_tags,
      buyNowOnly
    } = body;

    // Validate required fields
    if (!name || !category || !sizes || sizes.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = generateSlug(name);

    // Create product
    const result = await createProduct({
      name,
      slug,
      category,
      sizes,
      media: media || [],
      colorVariants: colorVariants || [],
      designVariants: designVariants || [],
      tagline,
      description,
      detailed_description,
      searchable_tags,
      buyNowOnly: buyNowOnly || false,
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
      productId: result.productId
    });

  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
