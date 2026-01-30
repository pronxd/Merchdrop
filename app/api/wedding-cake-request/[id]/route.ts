import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// PATCH: Update a wedding cake request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const collection = await getCollection('weddingCakeRequests');

    // Build update object
    const updateFields: any = {};

    if (updates.eventDetails) {
      Object.keys(updates.eventDetails).forEach(key => {
        if (updates.eventDetails[key] !== undefined) {
          updateFields[`eventDetails.${key}`] = updates.eventDetails[key];
        }
      });
    }

    if (updates.cakeDetails) {
      Object.keys(updates.cakeDetails).forEach(key => {
        if (updates.cakeDetails[key] !== undefined) {
          updateFields[`cakeDetails.${key}`] = updates.cakeDetails[key];
        }
      });
    }

    if (updates.status) {
      updateFields.status = updates.status;
    }

    updateFields.updatedAt = new Date();

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Wedding request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating wedding request:', error);
    return NextResponse.json(
      { error: 'Failed to update wedding request' },
      { status: 500 }
    );
  }
}

// GET: Get a single wedding cake request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const collection = await getCollection('weddingCakeRequests');
    const weddingRequest = await collection.findOne({ _id: new ObjectId(id) });

    if (!weddingRequest) {
      return NextResponse.json({ error: 'Wedding request not found' }, { status: 404 });
    }

    return NextResponse.json({ request: weddingRequest });
  } catch (error) {
    console.error('Error fetching wedding request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wedding request' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a wedding cake request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const collection = await getCollection('weddingCakeRequests');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Wedding request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting wedding request:', error);
    return NextResponse.json(
      { error: 'Failed to delete wedding request' },
      { status: 500 }
    );
  }
}
