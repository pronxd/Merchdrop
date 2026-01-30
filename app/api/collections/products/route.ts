import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// GET - Get products in a collection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionName = searchParams.get('collection');

    const productsCol = await getCollection('products');

    if (collectionName) {
      // Get products in specific collection
      const products = await productsCol.find({
        collections: collectionName,
        hidden: { $ne: true }
      }).sort({ order: 1 }).toArray();

      return NextResponse.json({ products });
    }

    // Get all products with their collections
    const products = await productsCol.find({ hidden: { $ne: true } })
      .sort({ order: 1 })
      .toArray();

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST - Add product(s) to a collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, productIds, collectionName } = body;

    if (!collectionName) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    const productsCol = await getCollection('products');

    // Handle single product
    if (productId) {
      await productsCol.updateOne(
        { _id: new ObjectId(productId) },
        { $addToSet: { collections: collectionName } }
      );
      return NextResponse.json({ success: true });
    }

    // Handle multiple products
    if (productIds && Array.isArray(productIds)) {
      const objectIds = productIds.map((id: string) => new ObjectId(id));
      await productsCol.updateMany(
        { _id: { $in: objectIds } },
        { $addToSet: { collections: collectionName } }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Product ID(s) required' }, { status: 400 });
  } catch (error) {
    console.error('Error adding products to collection:', error);
    return NextResponse.json({ error: 'Failed to add products to collection' }, { status: 500 });
  }
}

// DELETE - Remove product from a collection
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const collectionName = searchParams.get('collection');

    if (!productId || !collectionName) {
      return NextResponse.json({ error: 'Product ID and collection name required' }, { status: 400 });
    }

    const productsCol = await getCollection('products');

    await productsCol.updateOne(
      { _id: new ObjectId(productId) },
      { $pull: { collections: collectionName } } as any
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing product from collection:', error);
    return NextResponse.json({ error: 'Failed to remove product from collection' }, { status: 500 });
  }
}
