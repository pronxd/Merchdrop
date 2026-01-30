import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// GET - Fetch all collections
export async function GET() {
  try {
    const collectionsCol = await getCollection('collections');
    const collections = await collectionsCol.find({}).sort({ order: 1 }).toArray();

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

// POST - Create a new collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    const collectionsCol = await getCollection('collections');

    // Check if collection already exists
    const existing = await collectionsCol.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ error: 'Collection already exists' }, { status: 400 });
    }

    // Get highest order number
    const lastCollection = await collectionsCol.findOne({}, { sort: { order: -1 } });
    const newOrder = (lastCollection?.order ?? -1) + 1;

    const result = await collectionsCol.insertOne({
      name: name.trim(),
      order: newOrder,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      collection: {
        _id: result.insertedId,
        name: name.trim(),
        order: newOrder,
      }
    });
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}

// PUT - Update collection (rename or reorder)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, order, collections: bulkCollections } = body;

    const collectionsCol = await getCollection('collections');

    // Bulk reorder
    if (bulkCollections && Array.isArray(bulkCollections)) {
      const bulkOps = bulkCollections.map((col: { _id: string; order: number }) => ({
        updateOne: {
          filter: { _id: new ObjectId(col._id) },
          update: { $set: { order: col.order } },
        },
      }));

      await collectionsCol.bulkWrite(bulkOps);
      return NextResponse.json({ success: true });
    }

    // Single update
    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    // If renaming, we need to update all products with the old name
    if (name !== undefined) {
      const oldCollection = await collectionsCol.findOne({ _id: new ObjectId(id) });
      if (!oldCollection) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }

      const oldName = oldCollection.name;
      const newName = name.trim();

      // Update the collection name
      await collectionsCol.updateOne(
        { _id: new ObjectId(id) },
        { $set: { name: newName } }
      );

      // Update all products that have the old collection name
      if (oldName !== newName) {
        const productsCol = await getCollection('products');
        await productsCol.updateMany(
          { collections: oldName },
          { $set: { 'collections.$[elem]': newName } },
          { arrayFilters: [{ elem: oldName }] }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Order-only update
    const updateData: any = {};
    if (order !== undefined) updateData.order = order;

    const result = await collectionsCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating collection:', error);
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 });
  }
}

// DELETE - Delete a collection
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    const collectionsCol = await getCollection('collections');
    const productsCol = await getCollection('products');

    // Get collection name before deleting
    const collection = await collectionsCol.findOne({ _id: new ObjectId(id) });
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Remove collection from all products
    await productsCol.updateMany(
      { collections: collection.name },
      { $pull: { collections: collection.name } }
    );

    // Delete the collection
    await collectionsCol.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting collection:', error);
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
  }
}
