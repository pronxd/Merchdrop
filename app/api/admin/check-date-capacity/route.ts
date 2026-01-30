import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

// Admin-side date capacity check that includes pending payment links
export async function GET(request: NextRequest) {
  try {
    const dateParam = request.nextUrl.searchParams.get('date');
    const excludeRequestId = request.nextUrl.searchParams.get('excludeRequestId'); // Don't count this request

    if (!dateParam) {
      return NextResponse.json({ error: 'Date required' }, { status: 400 });
    }

    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    // Get start/end of day
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const dateStr = date.toISOString().split('T')[0];

    // Count confirmed bookings
    const bookingsCollection = await getCollection('bookings');
    const confirmedOrders = await bookingsCollection.countDocuments({
      orderDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    });

    // Count pending payment links (quoted but not paid custom cake requests)
    const customRequestsCollection = await getCollection('customCakeRequests');

    // Try multiple date formats since MongoDB stores dates inconsistently
    const pendingCustomRequests = await customRequestsCollection.find({
      status: 'quoted',
      $or: [
        { 'cakeDetails.requestedDate': { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() } },
        { 'cakeDetails.requestedDate': { $regex: dateStr } },
        { 'cakeDetails.requestedDate': { $gte: startOfDay, $lte: endOfDay } },
      ]
    }).toArray();

    // Filter out the current request if we're resending (don't double count)
    const filteredPendingCustom = excludeRequestId
      ? pendingCustomRequests.filter(r => r._id.toString() !== excludeRequestId)
      : pendingCustomRequests;

    // Count pending wedding requests too
    const weddingRequestsCollection = await getCollection('weddingCakeRequests');
    const pendingWeddingRequests = await weddingRequestsCollection.find({
      status: 'quoted',
      $or: [
        { 'eventDetails.eventDate': { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() } },
        { 'eventDetails.eventDate': { $regex: dateStr } },
        { 'eventDetails.eventDate': { $gte: startOfDay, $lte: endOfDay } },
      ]
    }).toArray();

    const pendingPaymentLinks = filteredPendingCustom.length + pendingWeddingRequests.length;
    const totalPotential = confirmedOrders + pendingPaymentLinks + 1; // +1 for the new one being created

    // Get capacity for this date from blocked dates collection (default 2 if not set)
    const blockedDatesCollection = await getCollection('blockedDates');
    const dateOverride = await blockedDatesCollection.findOne({
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    const maxPerDay = dateOverride?.capacity ?? 2;

    // Build customer names for pending requests
    const pendingCustomerNames = [
      ...filteredPendingCustom.map(r => r.customerInfo?.name || 'Unknown'),
      ...pendingWeddingRequests.map(r => r.customerInfo?.name || 'Unknown')
    ];

    return NextResponse.json({
      date: dateStr,
      confirmedOrders,
      pendingPaymentLinks,
      pendingCustomerNames,
      totalPotential,
      maxPerDay,
      wouldExceedLimit: totalPotential > maxPerDay,
      slotsLeft: Math.max(0, maxPerDay - confirmedOrders),
      message: totalPotential > maxPerDay
        ? `You have ${confirmedOrders} confirmed order${confirmedOrders !== 1 ? 's' : ''} and ${pendingPaymentLinks} pending payment link${pendingPaymentLinks !== 1 ? 's' : ''} for this date. If all customers pay, you'll have ${totalPotential} orders which exceeds your ${maxPerDay}/day limit.`
        : null
    });

  } catch (error) {
    console.error('Check date capacity error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check capacity' },
      { status: 500 }
    );
  }
}
