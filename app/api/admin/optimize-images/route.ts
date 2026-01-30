import { NextRequest, NextResponse } from 'next/server';
import { getProducts, updateProduct } from '@/lib/products-db';
import { isAdminAuthenticated } from '@/lib/auth';

// POST - Update product media URLs after optimization
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

    const { productId, optimizedMedia } = await req.json();

    if (!productId || !optimizedMedia) {
      return NextResponse.json(
        { error: 'Missing productId or optimizedMedia' },
        { status: 400 }
      );
    }

    // Update the product's media array with optimized URLs
    const result = await updateProduct(productId, {
      media: optimizedMedia
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Error updating optimized media:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Fetch all products for optimization
export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all products (including hidden ones)
    const products = await getProducts(true);

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
