"use client";

import { useState, useEffect } from "react";

interface BlockedDate {
  _id: string;
  date: string;
  reason?: string;
  capacity?: number;
  createdAt: string;
}

interface Booking {
  _id: string;
  orderDate: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  cakeDetails: {
    productName: string;
    size: string;
    flavor: string;
    fulfillmentType?: 'delivery' | 'pickup';
    pickupTime?: string;
    deliveryTime?: string;
  };
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onReschedule: (bookingId: string, newDate: string, newTime?: string) => Promise<void>;
}

export default function RescheduleModal({ isOpen, onClose, booking, onReschedule }: RescheduleModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [rescheduling, setRescheduling] = useState(false);

  const DEFAULT_CAPACITY = 2;

  useEffect(() => {
    if (isOpen) {
      fetchScheduleData();
      // Pre-fill the current time
      if (booking) {
        const time = booking.cakeDetails.fulfillmentType === 'delivery'
          ? booking.cakeDetails.deliveryTime
          : booking.cakeDetails.pickupTime;
        setSelectedTime(time || '');
      }
    }
  }, [isOpen, currentDate, booking]);

  const fetchScheduleData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const [bookingsRes, blockedRes] = await Promise.all([
        fetch(`/api/bookings?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&_t=${Date.now()}`, {
          cache: 'no-store',
        }),
        fetch(`/api/admin/blocked-dates?_t=${Date.now()}`, {
          cache: 'no-store',
        })
      ]);

      const bookingsData = await bookingsRes.json();
      const blockedData = await blockedRes.json();

      setBookings(bookingsData.bookings || []);
      setBlockedDates(blockedData.blockedDates || []);
    } catch (error) {
      console.error('Failed to fetch schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getBookingsForDate = (date: Date) => {
    const dateStr = getLocalDateStr(date);
    return bookings.filter(b => {
      const bookingDate = new Date(b.orderDate);
      const bookingDateStr = getLocalDateStr(bookingDate);
      // Exclude the current booking being rescheduled from the count
      return bookingDateStr === dateStr && b.status !== 'cancelled' && b._id !== booking?._id;
    });
  };

  const isDateAway = (date: Date) => {
    const dateStr = getLocalDateStr(date);
    return blockedDates.some(blocked => {
      const blockedDateStr = typeof blocked.date === 'string'
        ? blocked.date.split('T')[0]
        : getLocalDateStr(new Date(blocked.date));
      return blockedDateStr === dateStr && blocked.reason === 'Away';
    });
  };

  const isDateClosed = (date: Date) => {
    const dateStr = getLocalDateStr(date);
    return blockedDates.some(blocked => {
      const blockedDateStr = typeof blocked.date === 'string'
        ? blocked.date.split('T')[0]
        : getLocalDateStr(new Date(blocked.date));
      return blockedDateStr === dateStr && blocked.reason === 'Closed';
    });
  };

  const isDateOpen = (date: Date) => {
    const dateStr = getLocalDateStr(date);
    return blockedDates.some(blocked => {
      const blockedDateStr = typeof blocked.date === 'string'
        ? blocked.date.split('T')[0]
        : getLocalDateStr(new Date(blocked.date));
      return blockedDateStr === dateStr && blocked.reason === 'Open';
    });
  };

  const getDateCapacity = (date: Date): number => {
    const dateStr = getLocalDateStr(date);
    const blocked = blockedDates.find(b => {
      const blockedDateStr = typeof b.date === 'string'
        ? b.date.split('T')[0]
        : getLocalDateStr(new Date(b.date));
      return blockedDateStr === dateStr;
    });
    return blocked?.capacity ?? DEFAULT_CAPACITY;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  const handleConfirmReschedule = async () => {
    if (!selectedDate || !booking) return;

    setRescheduling(true);
    try {
      await onReschedule(booking._id, selectedDate, selectedTime || undefined);
      setSelectedDate(null);
      onClose();
    } catch (error) {
      console.error('Failed to reschedule:', error);
    } finally {
      setRescheduling(false);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
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
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayBookings = getBookingsForDate(date);
      const isAway = isDateAway(date);
      const isClosed = isDateClosed(date);
      const isOpen = isDateOpen(date);
      const dateCapacity = getDateCapacity(date);
      const isPast = date < today;
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate === dateStr;
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 2;
      const isFull = dayBookings.length >= dateCapacity;
      const spotsLeft = dateCapacity - dayBookings.length;

      // Check if this is the current order's date
      const isCurrentOrderDate = booking && getLocalDateStr(new Date(booking.orderDate)) === dateStr;

      let bgColor = 'bg-zinc-900/50';
      let ringColor = 'ring-1 ring-white/10';
      let isClickable = !isPast;

      if (isPast) {
        bgColor = 'bg-zinc-950';
        ringColor = 'ring-1 ring-white/5';
        isClickable = false;
      } else if (isSelected) {
        bgColor = 'bg-pink-500/30';
        ringColor = 'ring-2 ring-pink-500';
      } else if (isCurrentOrderDate) {
        bgColor = 'bg-blue-500/20';
        ringColor = 'ring-2 ring-blue-500';
      } else if (isAway) {
        bgColor = 'bg-rose-500/20';
        ringColor = 'ring-1 ring-rose-500/50';
      } else if (isClosed || isWeekend) {
        bgColor = 'bg-zinc-950';
        ringColor = 'ring-1 ring-white/5';
      } else if (isFull && !isOpen) {
        bgColor = 'bg-amber-500/20';
        ringColor = 'ring-1 ring-amber-500/50';
      } else if (isOpen || (!isWeekend && !isClosed && !isAway)) {
        bgColor = 'bg-emerald-500/20';
        ringColor = 'ring-1 ring-emerald-500/50';
      }

      days.push(
        <div
          key={day}
          onClick={() => isClickable && handleDateSelect(dateStr)}
          className={`aspect-square ${ringColor} rounded-lg p-1.5 ${bgColor} ${isClickable ? 'hover:ring-pink-500/50 cursor-pointer' : 'cursor-default opacity-50'} transition-all relative`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-bold ${isPast ? 'text-slate-600' : isSelected ? 'text-pink-400' : isCurrentOrderDate ? 'text-blue-400' : 'text-white'} ${isToday ? 'bg-emerald-500 text-white px-1.5 py-0.5 rounded-full text-xs' : ''}`}>
              {day}
            </span>
            {!isPast && dayBookings.length > 0 && (
              <span className="text-[10px] font-bold bg-pink-500 text-white px-1 py-0.5 rounded-full">
                {dayBookings.length}
              </span>
            )}
          </div>

          {/* Status indicators */}
          {!isPast && isCurrentOrderDate && (
            <div className="text-[9px] text-blue-400 font-semibold mt-0.5">Current</div>
          )}
          {!isPast && isAway && (
            <div className="text-[9px] text-rose-400 font-semibold mt-0.5">Away</div>
          )}
          {!isPast && (isClosed || isWeekend) && !isAway && (
            <div className="text-[9px] text-slate-500 font-semibold mt-0.5">Closed</div>
          )}
          {!isPast && isFull && !isAway && !isClosed && !isWeekend && (
            <div className="text-[9px] text-amber-400 font-semibold mt-0.5">Full</div>
          )}
          {!isPast && !isFull && !isAway && !isClosed && !isWeekend && spotsLeft > 0 && (
            <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">{spotsLeft} left</div>
          )}
        </div>
      );
    }

    return days;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Reschedule Order</h2>
            {booking && (
              <p className="text-sm text-slate-400">
                {booking.customerInfo.name} - {booking.cakeDetails.productName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Calendar */}
        <div className="p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={previousMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-white font-semibold">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/40 ring-1 ring-emerald-500/50"></div>
              <span className="text-slate-400">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500/40 ring-1 ring-amber-500/50"></div>
              <span className="text-slate-400">Full</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500/40 ring-1 ring-blue-500/50"></div>
              <span className="text-slate-400">Current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-rose-500/40 ring-1 ring-rose-500/50"></div>
              <span className="text-slate-400">Away</span>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          )}
        </div>

        {/* Selected Date & Time */}
        {selectedDate && (
          <div className="p-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">New Date:</span>
              <span className="text-white font-medium">{formatDisplayDate(selectedDate)}</span>
            </div>

            {/* Time input */}
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm">Time:</span>
              <input
                type="text"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                placeholder="e.g., 12:00 PM - 1:00 PM"
                className="flex-1 bg-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmReschedule}
            disabled={!selectedDate || rescheduling}
            className="flex-1 px-4 py-2.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {rescheduling ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Rescheduling...
              </>
            ) : (
              'Confirm Reschedule'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
