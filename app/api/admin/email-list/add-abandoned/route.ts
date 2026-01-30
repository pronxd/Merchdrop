import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { isAdminAuthenticated } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emails } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'No emails provided' },
        { status: 400 }
      );
    }

    const emailListCollection = await getCollection('emailList');

    // Get existing emails to avoid duplicates
    const existingEmails = await emailListCollection.find({}).toArray();
    const existingSet = new Set(existingEmails.map((e: any) => e.email.toLowerCase()));

    const toAdd: Array<{
      email: string;
      name: string;
      source: string;
      addedAt: Date;
    }> = [];

    const skipped: string[] = [];

    for (const item of emails) {
      const email = item.email?.toLowerCase();
      const name = item.name || '';

      if (!email || !email.includes('@')) {
        continue;
      }

      if (existingSet.has(email)) {
        skipped.push(email);
        continue;
      }

      // Avoid duplicates in our add list
      if (toAdd.find(e => e.email === email)) {
        continue;
      }

      toAdd.push({
        email,
        name,
        source: 'abandoned_cart',
        addedAt: new Date()
      });
    }

    let addedCount = 0;
    if (toAdd.length > 0) {
      const result = await emailListCollection.insertMany(toAdd);
      addedCount = result.insertedCount;
    }

    return NextResponse.json({
      success: true,
      added: addedCount,
      skipped: skipped.length,
      message: addedCount > 0
        ? `Added ${addedCount} email(s) to marketing list`
        : 'All emails were already in the list'
    });

  } catch (error) {
    console.error('Error adding abandoned cart emails:', error);
    return NextResponse.json(
      { error: 'Failed to add emails' },
      { status: 500 }
    );
  }
}
