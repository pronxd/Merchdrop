import { getCollection } from './mongodb';
import { ObjectId } from 'mongodb';
import { addEmailFromOrder } from './email-list';

export interface BlockedDate {
  _id?: ObjectId;
  date: Date;
  reason?: string;
  capacity?: number; // Override daily capacity for this specific date (default is 2)
  createdAt: Date;
}

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
  cakeDetails: {
    productId: number | string | null; // Support legacy numeric IDs, MongoDB string IDs, and null for old data
    productName: string;
    size: string;
    shape?: string;
    flavor: string;
    filling?: string;
    designNotes: string;
    price: number;
    addOns: Array<{
      id: string;
      name: string;
      price: number;
    }>;
    image?: string; // Product image (includes color variant if selected)
    edibleImageUrl?: string;
    referenceImageUrl?: string; // Reference photo for cake design
    isEditablePhoto?: boolean; // True when referenceImageUrl is an edible photo (not reference)
    fulfillmentType?: 'delivery' | 'pickup'; // How customer will receive the cake
    pickupDate?: Date; // Date for pickup or delivery
    deliveryTime?: string; // Time slot for delivery (e.g., "5:00 PM - 6:00 PM")
    pickupTime?: string; // Time slot for pickup (e.g., "12:00 PM - 1:00 PM")
    deliveryAddress?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      fullAddress: string;
    };
  };
  paymentInfo?: {
    stripeSessionId: string;
    stripePaymentIntentId: string;
    amountPaid: number;
    paymentStatus: 'paid' | 'pending' | 'failed';
  };
}

export interface AvailabilityResult {
  available: boolean;
  reason?: 'closed_day' | 'too_soon' | 'day_full' | 'week_full' | 'invalid_date';
  message?: string;
  slotsLeft?: number;
  nextAvailableDate?: Date;
}

// Helper: Get start and end of week (Wed-Tue schedule, since Sun-Tue blocked)
function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getUTCDay();

  // Find Wednesday of current week
  const daysToWednesday = day >= 3 ? day - 3 : day + 4;
  const wednesday = new Date(d);
  wednesday.setUTCDate(d.getUTCDate() - daysToWednesday);
  wednesday.setUTCHours(0, 0, 0, 0);

  // End is Tuesday of next week
  const tuesday = new Date(wednesday);
  tuesday.setUTCDate(wednesday.getUTCDate() + 6);
  tuesday.setUTCHours(23, 59, 59, 999);

  return { start: wednesday, end: tuesday };
}

// Helper: Get days until a date
function getDaysUntil(date: Date): number {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setUTCHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Check if a date is available for booking
export async function checkDateAvailability(dateString: string): Promise<AvailabilityResult> {
  try {
    const date = new Date(dateString);

    // Validate date
    if (isNaN(date.getTime())) {
      return {
        available: false,
        reason: 'invalid_date',
        message: 'Invalid date format'
      };
    }

    const dayOfWeek = date.getUTCDay();
    const daysUntil = getDaysUntil(date);

    // Check if date is manually opened or blocked by admin
    const blockedDatesCollection = await getCollection('blockedDates');
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const dateOverride = await blockedDatesCollection.findOne({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    // Get capacity for this date (default 2 if not set)
    const DEFAULT_CAPACITY = 2;
    const dateCapacity = dateOverride?.capacity ?? DEFAULT_CAPACITY;

    console.log('🔍 Date override check:', {
      dateBeingChecked: date.toISOString(),
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      foundOverride: dateOverride ? { date: dateOverride.date, reason: dateOverride.reason, capacity: dateOverride.capacity } : null,
      effectiveCapacity: dateCapacity
    });

    // Check if manually opened (overrides EVERYTHING including buffer period)
    // This must be checked FIRST before any other restrictions
    if (dateOverride?.reason === 'Open') {
      // Even if manually opened, still check capacity
      const bookingsCollection = await getCollection('bookings');
      const dayCount = await bookingsCollection.countDocuments({
        orderDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['pending', 'confirmed'] }
      });

      if (dayCount >= dateCapacity) {
        return {
          available: false,
          reason: 'day_full',
          message: `That date is fully booked (${dateCapacity} cake${dateCapacity !== 1 ? 's' : ''} maximum per day). Please choose another date.`
        };
      }

      // If manually opened and not full, it's available regardless of buffer period
      const slotsRemaining = dateCapacity - dayCount;
      return {
        available: true,
        slotsLeft: slotsRemaining,
        message: `${date.toLocaleDateString()} is available! ${slotsRemaining} slot(s) remaining for that day.`
      };
    }

    // Check if it's a blocked day (Sunday=0, Monday=1, Tuesday=2)
    if ([0, 1, 2].includes(dayOfWeek)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday'];
      return {
        available: false,
        reason: 'closed_day',
        message: `Sorry, we're closed on ${dayNames[dayOfWeek]}s. Please choose Wednesday-Saturday.`
      };
    }

    // Check advance notice (10-14 days required)
    if (daysUntil < 10) {
      return {
        available: false,
        reason: 'too_soon',
        message: `We need at least 10 days advance notice. The earliest available date is ${new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString()}.`
      };
    }

    // Check if date is manually blocked by admin (Away status)
    const isBlocked = dateOverride && dateOverride.reason !== 'Open';

    if (isBlocked) {
      return {
        available: false,
        reason: 'closed_day',
        message: dateOverride?.reason || 'Sorry, this date is not available.'
      };
    }

    const bookingsCollection = await getCollection('bookings');

    // Check daily capacity (uses per-day capacity, default 2)
    // startOfDay and endOfDay already defined above for blocked dates check

    const dayCount = await bookingsCollection.countDocuments({
      orderDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    });

    if (dayCount >= dateCapacity) {
      return {
        available: false,
        reason: 'day_full',
        message: `That date is fully booked (${dateCapacity} cake${dateCapacity !== 1 ? 's' : ''} maximum per day). Please choose another date.`
      };
    }

    // Check weekly capacity (10 cakes per week max)
    const { start: weekStart, end: weekEnd } = getWeekBounds(date);

    const weekCount = await bookingsCollection.countDocuments({
      orderDate: { $gte: weekStart, $lte: weekEnd },
      status: { $in: ['pending', 'confirmed'] }
    });

    if (weekCount >= 10) {
      return {
        available: false,
        reason: 'week_full',
        message: 'That week is fully booked (10 cakes maximum per week). Please choose a date in another week.'
      };
    }

    const slotsRemaining = dateCapacity - dayCount;
    return {
      available: true,
      slotsLeft: slotsRemaining,
      message: `${date.toLocaleDateString()} is available! ${slotsRemaining} slot(s) remaining for that day.`
    };

  } catch (error) {
    console.error('Error checking availability:', error);
    return {
      available: false,
      reason: 'invalid_date',
      message: 'Error checking availability. Please try again.'
    };
  }
}

// Generate a random order number (e.g., "1350987631-359")
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-10); // Last 10 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 random digits
  return `${timestamp}-${random}`;
}

// Create a new booking
// skipBufferCheck: Set to true when converting a pre-approved custom/wedding request
//   - Skips the 10-day advance notice requirement (date was validated when quote was sent)
//   - Still enforces capacity limits (2 per day, 10 per week) to prevent overbooking
// overrideCapacity: Set to true when admin explicitly overrides capacity limits
//   - Skips ALL availability checks (admin knows they can handle it)
export async function createBooking(bookingData: Omit<Booking, '_id' | 'createdAt' | 'orderNumber'>, options?: { skipBufferCheck?: boolean; overrideCapacity?: boolean }): Promise<{ success: boolean; bookingId?: string; orderNumber?: string; error?: string }> {
  try {
    console.log('📝 Creating booking:', {
      cake: bookingData.cakeDetails.productName,
      date: bookingData.orderDate,
      customer: bookingData.customerInfo.name,
      skipBufferCheck: options?.skipBufferCheck,
      overrideCapacity: options?.overrideCapacity
    });

    // If admin override is enabled, skip ALL availability checks
    if (options?.overrideCapacity) {
      console.log('⚠️ Admin override enabled - skipping all availability checks');
    } else {
      // Check date availability
      const availability = await checkDateAvailability(bookingData.orderDate.toISOString());

      if (!availability.available) {
        // For pre-approved requests, only skip the "too_soon" (buffer) error
        // Still enforce capacity limits to prevent overbooking
        const isBufferError = availability.reason === 'too_soon';

        if (options?.skipBufferCheck && isBufferError) {
          console.log('⏭️ Skipping buffer check for pre-approved request (date was validated when quote was sent)');
        } else {
          console.log('❌ Date not available:', availability.message);
          return {
            success: false,
            error: availability.message
          };
        }
      }
    }

    console.log('✅ Date check passed, saving to MongoDB...');

    // Generate random order number
    const orderNumber = generateOrderNumber();
    console.log('🔢 Generated order number:', orderNumber);

    const bookingsCollection = await getCollection('bookings');

    const booking: Booking = {
      ...bookingData,
      orderNumber,
      createdAt: new Date()
    };

    const result = await bookingsCollection.insertOne(booking);

    console.log('✅ Booking saved! ID:', result.insertedId.toString());

    // Add customer email to email marketing list
    await addEmailFromOrder(bookingData.customerInfo.email, bookingData.customerInfo.name);

    return {
      success: true,
      bookingId: result.insertedId.toString(),
      orderNumber: orderNumber
    };

  } catch (error) {
    console.error('❌ Error creating booking:', error);
    return {
      success: false,
      error: 'Failed to create booking. Please try again.'
    };
  }
}

// Get all bookings for a date range
export async function getBookings(startDate?: Date, endDate?: Date) {
  try {
    console.log('📋 Fetching bookings from MongoDB...', { startDate, endDate });
    const bookingsCollection = await getCollection('bookings');

    const query: any = {};
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = startDate;
      if (endDate) query.orderDate.$lte = endDate;
    }

    const bookings = await bookingsCollection.find(query).sort({ orderDate: 1 }).toArray();
    console.log(`✅ Found ${bookings.length} booking(s) in database`);

    return bookings;
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    return [];
  }
}

// Update booking status
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

// Update booking design notes
export async function updateBookingDesignNotes(bookingId: string, designNotes: string) {
  console.log('updateBookingDesignNotes called:', { bookingId, designNotes: designNotes.substring(0, 50) + '...' });
  const bookingsCollection = await getCollection('bookings');

  const result = await bookingsCollection.updateOne(
    { _id: new ObjectId(bookingId) },
    { $set: { 'cakeDetails.designNotes': designNotes } }
  );

  console.log('MongoDB update result:', {
    bookingId,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount
  });

  return result.modifiedCount > 0;
}

// Update booking images (reference and/or edible) - adds to array instead of replacing
export async function updateBookingImages(
  bookingId: string,
  images: { referenceImageUrl?: string; edibleImageUrl?: string }
) {
  console.log('updateBookingImages called:', { bookingId, images });
  const bookingsCollection = await getCollection('bookings');

  // First, get the current booking to check existing images
  const booking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });
  if (!booking) {
    console.log('Booking not found');
    return false;
  }

  const updateOps: any = { $set: {} };

  // Handle reference images - add to array
  if (images.referenceImageUrl !== undefined) {
    const existingRefs = booking.cakeDetails?.referenceImageUrls || [];
    const legacyRef = booking.cakeDetails?.referenceImageUrl;

    // Build array of all reference images
    let allRefs: string[] = [];
    if (legacyRef && !existingRefs.includes(legacyRef)) {
      allRefs.push(legacyRef);
    }
    allRefs = [...allRefs, ...existingRefs];

    // Add new image if not already in array
    if (!allRefs.includes(images.referenceImageUrl)) {
      allRefs.push(images.referenceImageUrl);
    }

    updateOps.$set['cakeDetails.referenceImageUrls'] = allRefs;
    // Keep legacy field updated with first image for backwards compatibility
    if (!legacyRef) {
      updateOps.$set['cakeDetails.referenceImageUrl'] = images.referenceImageUrl;
    }
  }

  // Handle edible images - add to array
  if (images.edibleImageUrl !== undefined) {
    const existingEdibles = booking.cakeDetails?.edibleImageUrls || [];
    const legacyEdible = booking.cakeDetails?.edibleImageUrl;

    // Build array of all edible images
    let allEdibles: string[] = [];
    if (legacyEdible && !existingEdibles.includes(legacyEdible)) {
      allEdibles.push(legacyEdible);
    }
    allEdibles = [...allEdibles, ...existingEdibles];

    // Add new image if not already in array
    if (!allEdibles.includes(images.edibleImageUrl)) {
      allEdibles.push(images.edibleImageUrl);
    }

    updateOps.$set['cakeDetails.edibleImageUrls'] = allEdibles;
    // Keep legacy field updated with first image for backwards compatibility
    if (!legacyEdible) {
      updateOps.$set['cakeDetails.edibleImageUrl'] = images.edibleImageUrl;
    }
  }

  if (Object.keys(updateOps.$set).length === 0) {
    console.log('No image fields to update');
    return false;
  }

  const result = await bookingsCollection.updateOne(
    { _id: new ObjectId(bookingId) },
    updateOps
  );

  console.log('MongoDB update result:', {
    bookingId,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount
  });

  return result.modifiedCount > 0 || result.matchedCount > 0;
}

// Get available dates for a month (for calendar view)
export async function getAvailableDatesForMonth(year: number, month: number): Promise<Date[]> {
  const availableDates: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const availability = await checkDateAvailability(dateStr);
    if (availability.available) {
      availableDates.push(new Date(d));
    }
  }

  return availableDates;
}

// Blocked dates management
export async function addBlockedDate(date: Date, reason?: string, capacity?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const blockedDatesCollection = await getCollection('blockedDates');

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    console.log('Attempting to block date:', {
      originalDate: date,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      capacity
    });

    // Check if already has an entry
    const existing = await blockedDatesCollection.findOne({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    // Build update object - only include capacity if provided
    const updateData: { reason: string; createdAt: Date; capacity?: number } = {
      reason: reason || 'Unavailable',
      createdAt: new Date()
    };
    if (capacity !== undefined) {
      updateData.capacity = capacity;
    }

    if (existing) {
      // Allow changing status freely between Open, Closed, and Away
      await blockedDatesCollection.updateOne(
        { _id: existing._id },
        { $set: updateData }
      );
      console.log('Updated date status:', date.toISOString(), 'from', existing.reason, 'to', reason, 'capacity:', capacity);
      return { success: true };
    }

    await blockedDatesCollection.insertOne({
      date: startOfDay,
      ...updateData
    });

    console.log('Successfully blocked date:', date.toISOString(), 'capacity:', capacity);
    return { success: true };
  } catch (error) {
    console.error('Error blocking date:', error);
    return { success: false, error: 'Failed to block date' };
  }
}

export async function removeBlockedDate(date: Date): Promise<{ success: boolean; error?: string }> {
  try {
    const blockedDatesCollection = await getCollection('blockedDates');

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    console.log('Attempting to unblock date:', {
      originalDate: date,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });

    const result = await blockedDatesCollection.deleteMany({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    console.log('Unblock result:', {
      deletedCount: result.deletedCount,
      date: date.toISOString()
    });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Date was not blocked or already unblocked' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error unblocking date:', error);
    return { success: false, error: 'Database error while unblocking date' };
  }
}

export async function getBlockedDates(): Promise<BlockedDate[]> {
  try {
    const blockedDatesCollection = await getCollection('blockedDates');
    const blocked = await blockedDatesCollection.find({}).sort({ date: 1 }).toArray();
    return blocked as BlockedDate[];
  } catch (error) {
    console.error('Error fetching blocked dates:', error);
    return [];
  }
}
