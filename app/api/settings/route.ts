import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

// GET public site settings (no auth required)
export async function GET(req: NextRequest) {
  try {
    const settingsCollection = await getCollection('siteSettings');
    const settings = await settingsCollection.findOne({ key: 'global' });

    const response = NextResponse.json({
      chatbotEnabled: settings?.chatbotEnabled ?? true, // Default to enabled
    });

    // Cache for 30 seconds to reduce DB hits but still allow quick updates
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

    return response;
  } catch (error) {
    console.error('Error fetching public settings:', error);
    // On error, default to enabled so site functionality isn't broken
    return NextResponse.json({
      chatbotEnabled: true,
    });
  }
}
