import { getCollection } from './mongodb';
import { ObjectId } from 'mongodb';
import { addEmailFromOrder } from './email-list';

export interface Booking {
  _id?: ObjectId;
  orderNumber?: string; // Random order number (e.g., "1350987631-359")
  orderDate: Date;
  createdAt: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'forfeited';
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  orderDetails: {
    productId: string | null;
    productName: string;
    size: string;
    price: number;
    quantity: number;
    image?: string;
  };
  paymentInfo?: {
    stripeSessionId: string;
    stripePaymentIntentId: string;
    amountPaid: number;
    paymentStatus: 'paid' | 'pending' | 'failed';
  };
}

// Generate a random order number (e.g., "1350987631-359")
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-10); // Last 10 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 random digits
  return `${timestamp}-${random}`;
}

// Create a new order
export async function createBooking(bookingData: Omit<Booking, '_id' | 'createdAt' | 'orderNumber'>): Promise<{ success: boolean; bookingId?: string; orderNumber?: string; error?: string }> {
  try {
    console.log('Creating order:', {
      product: bookingData.orderDetails.productName,
      quantity: bookingData.orderDetails.quantity,
      customer: bookingData.customerInfo.name
    });

    // Generate random order number
    const orderNumber = generateOrderNumber();
    console.log('Generated order number:', orderNumber);

    const bookingsCollection = await getCollection('bookings');

    const booking: Booking = {
      ...bookingData,
      orderNumber,
      createdAt: new Date()
    };

    const result = await bookingsCollection.insertOne(booking);

    console.log('Order saved! ID:', result.insertedId.toString());

    // Add customer email to email marketing list
    await addEmailFromOrder(bookingData.customerInfo.email, bookingData.customerInfo.name);

    return {
      success: true,
      bookingId: result.insertedId.toString(),
      orderNumber: orderNumber
    };

  } catch (error) {
    console.error('Error creating order:', error);
    return {
      success: false,
      error: 'Failed to create order. Please try again.'
    };
  }
}

// Get all orders for a date range
export async function getBookings(startDate?: Date, endDate?: Date) {
  try {
    console.log('Fetching orders from MongoDB...', { startDate, endDate });
    const bookingsCollection = await getCollection('bookings');

    const query: any = {};
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = startDate;
      if (endDate) query.orderDate.$lte = endDate;
    }

    const bookings = await bookingsCollection.find(query).sort({ orderDate: 1 }).toArray();
    console.log(`Found ${bookings.length} order(s) in database`);

    return bookings;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

// Update order status
export async function updateBookingStatus(bookingId: string, status: 'pending' | 'confirmed' | 'cancelled') {
  console.log('updateBookingStatus called:', { bookingId, status });
  const bookingsCollection = await getCollection('bookings');

  const result = await bookingsCollection.updateOne(
    { _id: new ObjectId(bookingId) },
    { $set: { status } }
  );

  console.log('MongoDB update result:', {
    bookingId,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount
  });

  return result.modifiedCount > 0;
}
