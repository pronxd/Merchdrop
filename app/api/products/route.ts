import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/products-db';

// Public endpoint to get all visible products
export async function GET(req: NextRequest) {
  try {
    // Only return visible products to public
    const products = await getProducts(false);

    // No caching for product data - prices and inventory must be real-time
    const response = NextResponse.json({ products });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
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
