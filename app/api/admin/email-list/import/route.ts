import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

interface CustomerToAdd {
  email: string;
  name: string;
  source: 'order';
  addedAt: Date;
}

export async function POST() {
  try {
    // Get all bookings
    const bookingsCollection = await getCollection('bookings');
    const bookings = await bookingsCollection.find({}).toArray();

    if (bookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders found to import',
        imported: 0,
        skipped: 0
      });
    }

    // Get existing email list
    const emailListCollection = await getCollection('emailList');
    const existingEmails = await emailListCollection.find({}).toArray();
    const existingEmailAddresses = new Set(existingEmails.map((e: any) => e.email.toLowerCase()));

    // Extract unique customer emails from bookings
    const customersToAdd: CustomerToAdd[] = [];
    const skippedEmails: string[] = [];

    for (const booking of bookings as any[]) {
      const email = booking.customerInfo?.email?.toLowerCase();
      const name = booking.customerInfo?.name;

      if (!email || !email.includes('@')) {
        continue; // Skip invalid emails
      }

      // Skip if already in email list
      if (existingEmailAddresses.has(email)) {
        skippedEmails.push(email);
        continue;
      }

      // Skip if already in our list to add (avoid duplicates from multiple orders)
      if (customersToAdd.find(c => c.email === email)) {
        continue;
      }

      customersToAdd.push({
        email: email,
        name: name || '',
        source: 'order',
        addedAt: new Date()
      });
    }

    // Bulk insert new emails
    let importedCount = 0;
    if (customersToAdd.length > 0) {
      const result = await emailListCollection.insertMany(customersToAdd);
      importedCount = result.insertedCount;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedCount} customer email(s)`,
      imported: importedCount,
      skipped: skippedEmails.length,
      total: bookings.length
    });

  } catch (error) {
    console.error('Error importing emails from orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import emails from orders' },
      { status: 500 }
    );
  }
}
