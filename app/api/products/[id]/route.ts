import { NextRequest, NextResponse } from 'next/server';
import { getProductById, getProductBySlug } from '@/lib/products-db';

// Public endpoint to get a single product by ID or slug
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🔍 Fetching product with ID/slug: ${id}`);

    // Try to get by ObjectId first, then by slug if that fails
    let product = await getProductById(id).catch(() => null);

    if (!product) {
      console.log(`⚠️ Not found by ID, trying slug: ${id}`);
      product = await getProductBySlug(id);
    }

    if (!product) {
      console.log(`❌ Product not found by ID or slug: ${id}`);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Don't return hidden products to public
    if (product.hidden) {
      console.log(`🚫 Product is hidden: ${id}`);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Found product: ${product.name}`);

    // No caching for product data - prices and inventory must be real-time
    const response = NextResponse.json({ product });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
