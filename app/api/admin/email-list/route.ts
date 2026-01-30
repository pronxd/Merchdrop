import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { isAdminAuthenticated } from '@/lib/auth';

export interface EmailSubscriber {
  _id?: ObjectId;
  email: string;
  name?: string;
  source: 'manual' | 'order'; // Track how the email was added
  addedAt: Date;
}

export async function GET(req: NextRequest) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const emailListCollection = await getCollection('emailList');
    const subscribers = await emailListCollection
      .find({})
      .sort({ addedAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      subscribers,
      count: subscribers.length
    });
  } catch (error) {
    console.error('Error fetching email list:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email list' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { email, name, source = 'manual' } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const emailListCollection = await getCollection('emailList');

    // Check if email already exists
    const existing = await emailListCollection.findOne({
      email: email.toLowerCase()
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already in list' },
        { status: 400 }
      );
    }

    const subscriber: EmailSubscriber = {
      email: email.toLowerCase(),
      name,
      source,
      addedAt: new Date()
    };

    const result = await emailListCollection.insertOne(subscriber);

    return NextResponse.json({
      success: true,
      subscriber: { ...subscriber, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error adding email to list:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add email' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Email ID is required' },
        { status: 400 }
      );
    }

    const emailListCollection = await getCollection('emailList');
    const result = await emailListCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete email' },
      { status: 500 }
    );
  }
}
