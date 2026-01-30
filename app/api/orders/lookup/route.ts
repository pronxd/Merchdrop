import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const orderNumber = request.nextUrl.searchParams.get('orderNumber') || request.nextUrl.searchParams.get('code');

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
    }

    // Clean the order number - trim whitespace
    const cleanedOrderNumber = orderNumber.trim();

    const bookingsCollection = await getCollection('bookings');

    // Look up by orderNumber (string match for new orders, or number match for legacy)
    let order = await bookingsCollection.findOne({
      orderNumber: cleanedOrderNumber
    });

    // If not found, try as a number for legacy orders (old sequential numbers)
    if (!order) {
      const numericOrder = parseInt(cleanedOrderNumber.replace(/^#/, '').replace(/^0+/, '') || '0', 10);
      if (!isNaN(numericOrder) && numericOrder > 0) {
        order = await bookingsCollection.findOne({
          orderNumber: numericOrder
        });
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Return sanitized order data (don't expose payment details)
    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        status: order.status,
        customerInfo: {
          name: order.customerInfo?.name
        },
        cakeDetails: {
          productName: order.cakeDetails?.productName,
          size: order.cakeDetails?.size,
          flavor: order.cakeDetails?.flavor,
          fulfillmentType: order.cakeDetails?.fulfillmentType,
          pickupDate: order.cakeDetails?.pickupDate,
          pickupTime: order.cakeDetails?.pickupTime,
          deliveryTime: order.cakeDetails?.deliveryTime
        }
      }
    });
  } catch (error) {
    console.error('Order lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to look up order' },
      { status: 500 }
    );
  }
}
