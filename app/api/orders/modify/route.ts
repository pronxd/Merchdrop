import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { checkDateAvailability } from '@/lib/bookings';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { orderNumber, code, action, newValue } = await request.json();

    const orderNum = orderNumber || code;

    if (!orderNum || !action) {
      return NextResponse.json({ error: 'Order number and action are required' }, { status: 400 });
    }

    // Clean the order number
    const cleanedOrderNumber = String(orderNum).trim();

    const bookingsCollection = await getCollection('bookings');

    // Look up by orderNumber (string match for new orders, or number match for legacy)
    let order = await bookingsCollection.findOne({
      orderNumber: cleanedOrderNumber
    });

    // If not found, try as a number for legacy orders
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

    // Check if order can be modified (only pending or confirmed orders)
    if (order.status === 'cancelled' || order.status === 'forfeited') {
      return NextResponse.json({
        error: 'This order has already been cancelled or forfeited and cannot be modified.'
      }, { status: 400 });
    }

    let updateData: any = {};

    switch (action) {
      case 'change_time':
        if (!newValue) {
          return NextResponse.json({ error: 'New time is required' }, { status: 400 });
        }

        // Validate time format (basic check)
        const timeRegex = /^\d{1,2}:\d{2}\s*(AM|PM)$/i;
        if (!timeRegex.test(newValue)) {
          return NextResponse.json({
            error: 'Invalid time format. Please use format like "3:00 PM"'
          }, { status: 400 });
        }

        // Update the appropriate time field based on fulfillment type
        if (order.cakeDetails?.fulfillmentType === 'delivery') {
          updateData = { 'cakeDetails.deliveryTime': newValue };
        } else {
          updateData = { 'cakeDetails.pickupTime': newValue };
        }
        break;

      case 'push_date':
        if (!newValue) {
          return NextResponse.json({ error: 'New date is required' }, { status: 400 });
        }

        // Parse the new date
        const currentDate = new Date(order.cakeDetails?.pickupDate || order.orderDate);
        const newDate = new Date(newValue);

        // Validate the date was parsed correctly
        if (isNaN(newDate.getTime())) {
          return NextResponse.json({
            error: 'Invalid date format. Please try again with a format like "December 20"'
          }, { status: 400 });
        }

        // Check if new date is within 3 days of original
        const daysDiff = Math.ceil((newDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 0) {
          return NextResponse.json({
            error: 'New date must be after the current scheduled date'
          }, { status: 400 });
        }

        if (daysDiff > 3) {
          return NextResponse.json({
            error: 'You can only push the date by a maximum of 3 days. Please contact us for larger changes.'
          }, { status: 400 });
        }

        // Check if the new date is available
        const availability = await checkDateAvailability(newDate.toISOString());
        if (!availability.available) {
          return NextResponse.json({
            error: `The new date is not available: ${availability.message}`
          }, { status: 400 });
        }

        updateData = {
          'cakeDetails.pickupDate': newDate,
          'orderDate': newDate
        };
        break;

      case 'forfeit':
        // Mark order as forfeited (no refund)
        updateData = {
          status: 'forfeited',
          forfeitedAt: new Date()
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Apply the update using the order's _id for accuracy
    const result = await bookingsCollection.updateOne(
      { _id: order._id },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: action === 'forfeit'
        ? 'Order has been forfeited'
        : 'Order updated successfully'
    });
  } catch (error) {
    console.error('Order modification error:', error);
    return NextResponse.json(
      { error: 'Failed to modify order' },
      { status: 500 }
    );
  }
}
