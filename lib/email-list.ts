import { getCollection } from './mongodb';

/**
 * Adds an email from a booking/order to the email list automatically
 * This is called when a new booking is created
 */
export async function addEmailFromOrder(email: string, name: string): Promise<void> {
  try {
    const emailListCollection = await getCollection('emailList');

    // Check if email already exists
    const existing = await emailListCollection.findOne({
      email: email.toLowerCase()
    });

    if (existing) {
      console.log(`📧 Email ${email} already in list`);
      return;
    }

    // Add the email
    await emailListCollection.insertOne({
      email: email.toLowerCase(),
      name,
      source: 'order',
      addedAt: new Date()
    });

    console.log(`✅ Added ${email} to email list from order`);
  } catch (error) {
    console.error('Error adding email to list from order:', error);
    // Don't throw - we don't want to block order creation if email list fails
  }
}
