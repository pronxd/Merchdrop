import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { isAdminAuthenticated } from '@/lib/auth';

// GET site settings (admin)
export async function GET(req: NextRequest) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const settingsCollection = await getCollection('siteSettings');
    const settings = await settingsCollection.findOne({ key: 'global' });

    const response = NextResponse.json({
      chatbotEnabled: settings?.chatbotEnabled ?? true, // Default to enabled
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    return response;
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update site settings
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
    const { chatbotEnabled } = body;

    const settingsCollection = await getCollection('siteSettings');

    await settingsCollection.updateOne(
      { key: 'global' },
      {
        $set: {
          key: 'global',
          chatbotEnabled: chatbotEnabled ?? true,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating site settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
