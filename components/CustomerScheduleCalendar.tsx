"use client";

import { useState, useEffect } from "react";

interface CustomerScheduleCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  fulfillmentType: 'delivery' | 'pickup';
  minDaysAhead?: number;
}

interface BlockedDate {
  date: string;
  reason: string;
  capacity?: number; // Override daily capacity for this specific date
}

export default function CustomerScheduleCalendar({
  selectedDate,
  onDateSelect,
  fulfillmentType,
  minDaysAhead = 10
}: CustomerScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailability();
  }, [currentMonth]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      // Use YYYY-MM-DD format to avoid timezone issues
      const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const response = await fetch(
        `/api/available-dates?startDate=${startDateStr}&endDate=${endDateStr}&_t=${Date.now()}`,
        {
          cache: 'no-store', // Prevent caching for real-time updates
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
      const data = await response.json();

      setBlockedDates(data.blockedDates || []);
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getBookingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter((b: any) => {
      const bookingDate = new Date(b.orderDate).toISOString().split('T')[0];
      return bookingDate === dateStr;
    });
  };

  const getBlockedDateInfo = (date: Date) => {
    // Use local date string to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return blockedDates.find(blocked => {
      // blocked.date is already YYYY-MM-DD string from API
      return blocked.date === dateStr;
    });
  };

  // Get capacity for a specific date (default is 2 if not set)
  const DEFAULT_CAPACITY = 2;
  const getDateCapacity = (date: Date): number => {
    const blockedInfo = getBlockedDateInfo(date);
    return blockedInfo?.capacity ?? DEFAULT_CAPACITY;
  };

  const isDateAvailable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ALWAYS block past dates first - nothing should override this
    if (date < today) return false;

    const dayOfWeek = date.getDay();
    const blockedInfo = getBlockedDateInfo(date);

    // Check if manually opened (overrides buffer period, but NOT past dates)
    if (blockedInfo?.reason === 'Open') {
      // Even if manually opened, still check if not full
      const dayBookings = getBookingsForDate(date);
      const dateCapacity = getDateCapacity(date);
      if (dayBookings.length >= dateCapacity) return false;
      return true;
    }

    // Must be at least minDaysAhead in the future
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + minDaysAhead);
    if (date < minDate) return false;

    // For delivery: only Wed-Sat (3-6)
    if (fulfillmentType === 'delivery') {
      if (dayOfWeek < 3 || dayOfWeek > 6) return false;
    }

    // For pickup: check if it's a naturally closed day (Sun, Mon, Tue) or manually closed
    const isWeekendClosed = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 2;
    if (fulfillmentType === 'pickup' && isWeekendClosed) return false;

    // Check if date is blocked (Away or Closed status)
    if (blockedInfo && (blockedInfo.reason === 'Away' || blockedInfo.reason === 'Closed')) return false;

    // Check if date is full (capacity is set per day, default 2)
    const dayBookings = getBookingsForDate(date);
    const dateCapacity = getDateCapacity(date);
    if (dayBookings.length >= dateCapacity) return false;

    return true;
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isAvailable = isDateAvailable(date);
      const isSelected = selectedDate && selectedDate.toISOString().split('T')[0] === dateStr;
      const isPast = date < today;
      const dayBookings = getBookingsForDate(date);
      const blockedInfo = getBlockedDateInfo(date);
      const dayOfWeek = date.getDay();
      const isWeekendClosed = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 2;
      const dateCapacity = getDateCapacity(date);
      const spotsLeft = Math.max(0, dateCapacity - dayBookings.length);

      // Check if date is within the buffer period (minDaysAhead)
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + minDaysAhead);
      const isInBufferPeriod = date >= today && date < minDate;

      const isOpen = blockedInfo?.reason === 'Open';
      const isAway = blockedInfo?.reason === 'Away';
      const isClosed = blockedInfo?.reason === 'Closed' || (isWeekendClosed && !isOpen && !isAway);
      const isFull = dayBookings.length >= dateCapacity;

      let bgColor = 'bg-white';
      let borderColor = 'border-deepBurgundy/20';
      let textColor = 'text-gray-900';

      if (isSelected) {
        bgColor = 'bg-kassyPink';
        borderColor = 'border-kassyPink';
        textColor = 'text-white';
      } else if (isPast) {
        // Past dates - always grey
        bgColor = 'bg-gray-200';
        borderColor = 'border-gray-300';
        textColor = 'text-gray-400';
      } else if (isAway) {
        // Away status - RED (check before buffer/closed to override)
        bgColor = 'bg-red-50';
        borderColor = 'border-red-300';
      } else if (isClosed) {
        // Closed status - DARK GREY (check before buffer)
        bgColor = 'bg-gray-800';
        borderColor = 'border-gray-700';
        textColor = 'text-white';
      } else if (isFull) {
        // Full capacity
        bgColor = 'bg-red-50';
        borderColor = 'border-red-300';
        textColor = 'text-gray-700';
      } else if (spotsLeft === 1) {
        // Only 1 spot left - show yellow - check before isOpen so yellow shows even on manually opened dates
        bgColor = 'bg-yellow-50';
        borderColor = 'border-yellow-300';
      } else if (isOpen) {
        // Manually opened with 0 bookings - GREEN (overrides buffer period)
        bgColor = 'bg-green-50';
        borderColor = 'border-green-300';
      } else if (isInBufferPeriod) {
        // Buffer period dates that are NOT manually opened - grey
        bgColor = 'bg-gray-200';
        borderColor = 'border-gray-300';
        textColor = 'text-gray-400';
      } else if (isAvailable) {
        // All other available dates - GREEN
        bgColor = 'bg-green-50';
        borderColor = 'border-green-300';
      }

      const className = `aspect-square border ${borderColor} rounded p-0.5 sm:p-1 transition-all ${isAvailable ? 'cursor-pointer hover:border-kassyPink' : 'cursor-not-allowed opacity-60'} flex flex-col items-center justify-center min-h-[40px] sm:min-h-[60px] relative overflow-hidden ${bgColor}`;

      days.push(
        <div
          key={day}
          onClick={() => isAvailable && onDateSelect(date)}
          className={className}
        >
          <span className={`text-sm sm:text-base font-semibold relative z-10 ${textColor}`}>{day}</span>
          {/* Only show "1 spot left" when exactly 1 spot remaining */}
          {isAvailable && spotsLeft === 1 && (
            <span className="text-[8px] sm:text-[10px] mt-0.5 relative z-10 whitespace-nowrap">
              1 spot left
            </span>
          )}
          {!isAvailable && isFull && !isAway && !isClosed && !isPast && !isInBufferPeriod && (
            <span className="text-[8px] sm:text-[10px] mt-0.5 font-semibold text-orange-600 relative z-10">FULL</span>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg border-2 border-deepBurgundy/20 p-2 sm:p-3">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        <button
          onClick={previousMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-playfair text-sm font-semibold text-deepBurgundy">
          {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </h3>
        <button
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-[2px] sm:gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center font-semibold text-gray-600 text-xs py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-kassyPink mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-[2px] sm:gap-1">
          {renderCalendar()}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-center text-deepBurgundy/80 leading-relaxed">
        {fulfillmentType === 'delivery' ? (
          <>
            <p className="font-semibold mb-1">Select when your cake will be made & delivered</p>
            <p className="text-[10px] sm:text-xs">📦 Wed-Sat • Next step: choose delivery time</p>
          </>
        ) : (
          <>
            <p className="font-semibold mb-1">UNAVAILABLE DATES</p>
            <p className="text-[10px] sm:text-xs">Cakes stay fresh for up to 5 days in the fridge or 2 weeks in the freezer.</p>
            <p className="text-[10px] sm:text-xs">If your preferred date isn't available, please choose the next closest one. ❤️</p>
          </>
        )}
      </div>
    </div>
  );
}
