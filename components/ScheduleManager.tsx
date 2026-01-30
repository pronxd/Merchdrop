"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface BlockedDate {
  _id: string;
  date: string;
  reason?: string;
  capacity?: number; // Override daily capacity for this specific date (default is 2)
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
  };
  status: 'pending' | 'confirmed' | 'cancelled';
}

export default function ScheduleManager() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [viewingDate, setViewingDate] = useState<string | null>(null); // For mobile: shows order details
  const [legendExpanded, setLegendExpanded] = useState(false); // Mobile legend toggle
  const [showCapacityDropdown, setShowCapacityDropdown] = useState(false); // Bulk capacity dropdown

  useEffect(() => {
    fetchScheduleData();
  }, [currentDate]);

  const fetchScheduleData = async () => {
    setLoading(true);
    try {
      // Fetch bookings for the current month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const [bookingsRes, blockedRes] = await Promise.all([
        fetch(`/api/bookings?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }),
        fetch(`/api/admin/blocked-dates?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
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

  const handleSetDateStatus = async (status: 'Away' | 'Closed' | 'Open') => {
    if (selectedDates.size === 0) return;

    try {
      const results = await Promise.allSettled(
        Array.from(selectedDates).map(async (dateStr) => {
          const response = await fetch('/api/admin/blocked-dates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: dateStr, reason: status })
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Failed to mark date as ${status}`);
          }

          return dateStr;
        })
      );

      const failed = results.filter(r => r.status === 'rejected');
      const succeeded = results.filter(r => r.status === 'fulfilled');

      if (failed.length > 0) {
        alert(`Marked ${succeeded.length} date(s) as ${status}. Failed to mark ${failed.length} date(s).`);
      }

      setSelectedDates(new Set());
      setIsSelecting(false);
      await fetchScheduleData();
    } catch (error) {
      console.error(`Error marking dates as ${status}:`, error);
      alert(`Failed to mark dates as ${status}`);
    }
  };

  // Handle bulk capacity setting for multiple selected dates
  const handleBulkSetCapacity = async (capacity: number) => {
    if (selectedDates.size === 0) return;
    setShowCapacityDropdown(false);

    try {
      const results = await Promise.allSettled(
        Array.from(selectedDates).map(async (dateStr) => {
          // Find existing blocked date entry to preserve its reason
          const existing = blockedDates.find(b => {
            const blockedDateStr = typeof b.date === 'string'
              ? b.date.split('T')[0]
              : new Date(b.date).toISOString().split('T')[0];
            return blockedDateStr === dateStr;
          });

          const response = await fetch('/api/admin/blocked-dates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: dateStr,
              reason: existing?.reason || 'Open', // Default to Open if no existing entry
              capacity: capacity
            })
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to set capacity');
          }

          return dateStr;
        })
      );

      const failed = results.filter(r => r.status === 'rejected');
      const succeeded = results.filter(r => r.status === 'fulfilled');

      if (failed.length > 0) {
        alert(`Set capacity for ${succeeded.length} date(s). Failed for ${failed.length} date(s).`);
      }

      setSelectedDates(new Set());
      setIsSelecting(false);
      await fetchScheduleData();
    } catch (error) {
      console.error('Error setting bulk capacity:', error);
      alert('Failed to set capacity');
    }
  };

  const handleClearDates = async () => {
    if (selectedDates.size === 0) return;

    try {
      const results = await Promise.allSettled(
        Array.from(selectedDates).map(async (dateStr) => {
          const response = await fetch(`/api/admin/blocked-dates?date=${encodeURIComponent(dateStr)}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to clear date');
          }

          return dateStr;
        })
      );

      const failed = results.filter(r => r.status === 'rejected');
      const succeeded = results.filter(r => r.status === 'fulfilled');

      if (failed.length > 0) {
        alert(`Cleared ${succeeded.length} date(s). Failed to clear ${failed.length} date(s).`);
      }

      setSelectedDates(new Set());
      setIsSelecting(false);
      await fetchScheduleData();
    } catch (error) {
      console.error('Error clearing dates:', error);
      alert('Failed to clear dates');
    }
  };

  const toggleDateSelection = (dateStr: string) => {
    // Prevent selecting past dates (but allow today)
    const date = new Date(dateStr + 'T00:00:00'); // Force local timezone interpretation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Only block dates before today (allow today and future dates)
    if (date < today) return;

    if (isSelecting) {
      // In selection mode - toggle selection
      const newSelected = new Set(selectedDates);
      if (newSelected.has(dateStr)) {
        newSelected.delete(dateStr);
      } else {
        newSelected.add(dateStr);
      }
      setSelectedDates(newSelected);
    } else {
      // Not in selection mode - on mobile, show date details
      // Toggle viewing date (tap again to close)
      setViewingDate(viewingDate === dateStr ? null : dateStr);
    }
  };

  // Get bookings for a specific date string
  const getBookingsForDateStr = (dateStr: string) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.orderDate);
      const bookingDateStr = getLocalDateStr(bookingDate);
      return bookingDateStr === dateStr && booking.status !== 'cancelled';
    });
  };

  const previousMonth = () => {
    setViewingDate(null); // Clear mobile viewing state
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewingDate(null); // Clear mobile viewing state
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Helper to get local date string (YYYY-MM-DD) avoiding timezone issues
  const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getBookingsForDate = (date: Date) => {
    const dateStr = getLocalDateStr(date);
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.orderDate);
      const bookingDateStr = getLocalDateStr(bookingDate);
      return bookingDateStr === dateStr && booking.status !== 'cancelled';
    });
  };

  const isDateAway = (date: Date) => {
    const dateStr = getLocalDateStr(date);
    return blockedDates.some(blocked => {
      // blocked.date could be a string or Date from API
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

  // Get capacity for a specific date (default is 2 if not set)
  const DEFAULT_CAPACITY = 2;
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

  // Update capacity for a specific date
  const updateDateCapacity = async (date: Date, newCapacity: number) => {
    const dateStr = getLocalDateStr(date);
    try {
      // Find existing blocked date entry to preserve its reason
      const existing = blockedDates.find(b => {
        const blockedDateStr = typeof b.date === 'string'
          ? b.date.split('T')[0]
          : getLocalDateStr(new Date(b.date));
        return blockedDateStr === dateStr;
      });

      const response = await fetch('/api/admin/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          reason: existing?.reason || 'Open', // Default to Open if no existing entry
          capacity: newCapacity
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update capacity');
      }

      // Refresh data
      await fetchScheduleData();
    } catch (error) {
      console.error('Failed to update capacity:', error);
    }
  };

  // 10-day buffer check - matches the frontend customer calendar logic
  const BUFFER_DAYS = 10;
  const isWithinBuffer = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bufferDate = new Date(today);
    bufferDate.setDate(bufferDate.getDate() + BUFFER_DAYS);
    return date < bufferDate;
  };

  const navigateToOrder = (bookingId: string) => {
    // Navigate to orders tab with the specific booking ID highlighted
    router.push(`/kassycakes/dashboard?tab=orders&highlight=${bookingId}`);
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
      // Use local date to avoid timezone issues
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayBookings = getBookingsForDate(date);
      const isAway = isDateAway(date);
      const isClosed = isDateClosed(date);
      const isOpen = isDateOpen(date);
      const dateCapacity = getDateCapacity(date); // Get capacity for this specific date
      const isPast = date < today;
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDates.has(dateStr);
      const isViewing = viewingDate === dateStr; // Mobile: currently viewing this date
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 2; // Sun, Mon, Tue are closed
      const inBuffer = isWithinBuffer(date) && !isPast; // Within 10-day buffer (but not past)
      const isFull = dayBookings.length >= dateCapacity;

      let bgColor = 'bg-zinc-900/50';
      let ringColor = 'ring-1 ring-white/10';

      if (isPast) {
        bgColor = 'bg-zinc-950';
        ringColor = 'ring-1 ring-white/5';
      } else if (isSelected) {
        bgColor = 'bg-pink-500/20';
        ringColor = 'ring-2 ring-pink-500';
      } else if (isViewing && !isSelecting) {
        // Mobile viewing state - highlight with white ring
        ringColor = 'ring-2 ring-white';
      } else if (isOpen) {
        // Explicitly marked "Open" - overrides buffer
        bgColor = 'bg-emerald-500/20';
        ringColor = 'ring-1 ring-emerald-500/50';
      } else if (isAway) {
        bgColor = 'bg-rose-500/20';
        ringColor = 'ring-1 ring-rose-500/50';
      } else if (isClosed || isWeekend) {
        bgColor = 'bg-zinc-950';
        ringColor = 'ring-1 ring-white/5';
      } else if (inBuffer) {
        // Within 10-day buffer - show as unavailable (grey/slate)
        bgColor = 'bg-slate-800/50';
        ringColor = 'ring-1 ring-slate-500/30';
      } else if (isFull) {
        bgColor = 'bg-amber-500/20';
        ringColor = 'ring-1 ring-amber-500/50';
      } else if (!isPast && !isWeekend && !isClosed && !isAway) {
        // Naturally available (not within buffer)
        bgColor = 'bg-emerald-500/20';
        ringColor = 'ring-1 ring-emerald-500/50';
      }

      days.push(
        <div
          key={day}
          onClick={() => toggleDateSelection(dateStr)}
          className={`aspect-square ${ringColor} rounded-lg sm:rounded-xl p-1 sm:p-2 ${bgColor} ${isPast ? 'cursor-default opacity-50' : 'hover:ring-pink-500/50 cursor-pointer'} transition-all relative overflow-hidden`}
        >
          {/* Open image for manually opened days OR naturally available days outside buffer (hide if there are bookings or if past) - hidden on mobile */}
          {!isPast && (isOpen || (!isPast && !isWeekend && !isClosed && !isAway && !inBuffer)) && dayBookings.length === 0 && (
            <div className="absolute inset-0 hidden sm:flex items-center justify-center pointer-events-none">
              <img
                src="https://kassy.b-cdn.net/cakeicons/opensign.png"
                alt="Open"
                className="w-16 h-16 object-contain opacity-60"
              />
            </div>
          )}

          {/* Buffer indicator for dates within 10-day buffer (unless explicitly Open) - hidden on mobile */}
          {!isPast && inBuffer && !isOpen && !isWeekend && !isClosed && !isAway && (
            <div className="absolute inset-0 hidden sm:flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg sm:text-xl">⏳</span>
              <span className="text-[10px] font-semibold text-slate-400">Buffer</span>
            </div>
          )}

          {/* Closed image for manually closed or weekend closed days (hide if past) - hidden on mobile */}
          {!isPast && (isClosed || (isWeekend && !isAway && !isOpen)) && (
            <div className="absolute inset-0 hidden sm:flex items-center justify-center pointer-events-none">
              <img
                src="https://kassy.b-cdn.net/cakeicons/cloosedrd-illustration-on-white-isolated-background-label-business-concept-free-vector.png"
                alt="Closed"
                className="w-16 h-16 object-contain opacity-60"
              />
            </div>
          )}

          {/* Away emoji and text for admin-marked away dates (hide if past) - smaller on mobile */}
          {!isPast && isAway && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg sm:text-2xl mb-0 sm:mb-1">💅🏻</span>
              <span className="hidden sm:block text-xs font-semibold text-rose-400">Away</span>
            </div>
          )}

          <div className="flex justify-between items-start mb-0.5 sm:mb-1 relative z-10">
            <span className={`text-base sm:text-sm font-bold ${isPast ? 'text-slate-600' : isOpen ? 'text-emerald-400' : isWeekend ? 'text-slate-500' : 'text-white'} ${isToday ? 'bg-emerald-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full text-sm sm:text-xs' : ''}`}>
              {day}
            </span>
            {!isPast && dayBookings.length > 0 && (
              <span className="text-[10px] sm:text-xs font-bold bg-pink-500 text-white px-1 sm:px-1.5 py-0.5 rounded-full">
                {dayBookings.length}
              </span>
            )}
          </div>

          {/* Orders (hide for past dates) - hidden on mobile */}
          {!isPast && (
            <div className="hidden sm:block space-y-1 mt-1">
              {dayBookings.slice(0, 2).map((booking) => (
                <div
                  key={booking._id}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToOrder(booking._id);
                  }}
                  className="bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-md hover:bg-pink-600 transition-colors cursor-pointer truncate"
                  title={`${booking.cakeDetails.productName} for ${booking.customerInfo.name}`}
                >
                  {booking.customerInfo.name}
                </div>
              ))}
            </div>
          )}

          {/* Full indicator (hide for past dates) - hidden on mobile */}
          {!isPast && isFull && !isAway && !isClosed && (
            <div className="hidden sm:block text-[10px] text-amber-400 font-semibold mt-1">
              FULL
            </div>
          )}

          {/* Capacity controls - show for open/available non-past dates on desktop */}
          {!isPast && !isWeekend && !isClosed && !isAway && (
            <div className="hidden sm:flex items-center justify-center gap-1 mt-1 relative z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (dateCapacity > 0) updateDateCapacity(date, dateCapacity - 1);
                }}
                className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-slate-400 hover:text-white transition-colors text-xs font-bold"
                title="Decrease capacity"
              >
                -
              </button>
              <span className="text-[10px] text-slate-400 font-medium min-w-[24px] text-center">
                {dateCapacity - dayBookings.length > 0 ? `${dateCapacity - dayBookings.length} left` : '0'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateDateCapacity(date, dateCapacity + 1);
                }}
                className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-slate-400 hover:text-white transition-colors text-xs font-bold"
                title="Increase capacity"
              >
                +
              </button>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <img
            src="https://kassy.b-cdn.net/cakeicons/imgi_1_465941555_449745564808548_4917675504211736534_n.png"
            alt="Kassy"
            className="w-12 h-12 rounded-full object-cover ring-2 ring-pink-500"
          />
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white">
              Schedule
            </h2>
            <p className="text-sm text-slate-500">Manage availability</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {isSelecting ? (
            <>
              <button
                onClick={() => {
                  setIsSelecting(false);
                  setSelectedDates(new Set());
                  setShowCapacityDropdown(false);
                }}
                className="px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/15 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSetDateStatus('Open')}
                disabled={selectedDates.size === 0}
                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Open ({selectedDates.size})
              </button>
              <button
                onClick={() => handleSetDateStatus('Closed')}
                disabled={selectedDates.size === 0}
                className="px-3 py-1.5 bg-white/10 text-slate-300 ring-1 ring-white/20 rounded-lg hover:bg-white/15 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Closed ({selectedDates.size})
              </button>
              <button
                onClick={() => handleSetDateStatus('Away')}
                disabled={selectedDates.size === 0}
                className="px-3 py-1.5 bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/50 rounded-lg hover:bg-rose-500/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Away ({selectedDates.size})
              </button>
              {/* Capacity Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowCapacityDropdown(!showCapacityDropdown)}
                  disabled={selectedDates.size === 0}
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50 rounded-lg hover:bg-blue-500/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1"
                >
                  Spots
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCapacityDropdown && selectedDates.size > 0 && (
                  <div className="absolute top-full mt-1 right-0 bg-zinc-800 ring-1 ring-white/20 rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                    <div className="px-3 py-1.5 text-xs text-slate-400 border-b border-white/10">
                      Set spots for {selectedDates.size} date{selectedDates.size !== 1 ? 's' : ''}
                    </div>
                    {[0, 1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleBulkSetCapacity(num)}
                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                      >
                        <span>{num} spot{num !== 1 ? 's' : ''}</span>
                        {num === 0 && <span className="text-xs text-amber-400">Full</span>}
                        {num === 2 && <span className="text-xs text-slate-400">Default</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => {
                setViewingDate(null); // Clear mobile viewing state
                setIsSelecting(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/15 transition-colors font-medium text-sm w-full sm:w-auto justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
              Manage Dates
            </button>
          )}
        </div>
      </div>

      {/* Legend - Collapsible on mobile */}
      <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-3 sm:p-4">
        {/* Mobile toggle header */}
        <button
          onClick={() => setLegendExpanded(!legendExpanded)}
          className="sm:hidden flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-slate-400">Legend</span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${legendExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Legend items - always visible on desktop, toggle on mobile */}
        <div className={`${legendExpanded ? 'mt-3' : 'hidden'} sm:block`}>
          <div className="flex flex-wrap gap-3 sm:gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-pink-500 rounded-md"></div>
              <span className="text-slate-400">Orders</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500/20 ring-1 ring-emerald-500/50 rounded-md flex items-center justify-center">
                <img
                  src="https://kassy.b-cdn.net/cakeicons/opensign.png"
                  alt="Open"
                  className="w-3 h-3 object-contain"
                />
              </div>
              <span className="text-slate-400">Open</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-rose-500/20 ring-1 ring-rose-500/50 rounded-md flex items-center justify-center">
                <span className="text-[8px]">💅🏻</span>
              </div>
              <span className="text-slate-400">Away</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500/20 ring-1 ring-amber-500/50 rounded-md"></div>
              <span className="text-slate-400">Full</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-800/50 ring-1 ring-slate-500/30 rounded-md flex items-center justify-center">
                <span className="text-[8px]">⏳</span>
              </div>
              <span className="text-slate-400">Buffer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-zinc-950 ring-1 ring-white/10 rounded-md relative overflow-hidden flex items-center justify-center">
                <img
                  src="https://kassy.b-cdn.net/cakeicons/cloosedrd-illustration-on-white-isolated-background-label-business-concept-free-vector.png"
                  alt="Closed"
                  className="w-3 h-3 object-contain"
                />
              </div>
              <span className="text-slate-400">Closed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-xl sm:text-2xl font-semibold text-white">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-medium text-slate-500 text-sm sm:text-sm py-2">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
            <p className="text-slate-400">Loading calendar...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {renderCalendar()}
          </div>
        )}

        {/* Mobile Date Details Panel */}
        {viewingDate && !isSelecting && (
          <div className="sm:hidden mt-4 border-t border-white/10 pt-4">
            {(() => {
              const viewDate = new Date(viewingDate + 'T00:00:00');
              const dateBookings = getBookingsForDateStr(viewingDate);
              const isAway = isDateAway(viewDate);
              const isClosed = isDateClosed(viewDate);
              const isOpen = isDateOpen(viewDate);
              const dayOfWeek = viewDate.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 2;
              const inBuffer = isWithinBuffer(viewDate);
              const viewDateCapacity = getDateCapacity(viewDate);
              const viewDateIsFull = dateBookings.length >= viewDateCapacity;

              // Determine status
              let statusText = '';
              let statusColor = '';
              if (isOpen) {
                statusText = 'Open';
                statusColor = 'text-emerald-400';
              } else if (isAway) {
                statusText = 'Away';
                statusColor = 'text-rose-400';
              } else if (isClosed || isWeekend) {
                statusText = 'Closed';
                statusColor = 'text-slate-500';
              } else if (inBuffer) {
                statusText = 'Buffer Period';
                statusColor = 'text-slate-400';
              } else if (viewDateIsFull) {
                statusText = 'Full';
                statusColor = 'text-amber-400';
              } else {
                statusText = 'Available';
                statusColor = 'text-emerald-400';
              }

              return (
                <div className="space-y-3">
                  {/* Date header with close button */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-white font-semibold">
                        {viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </h4>
                      <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
                    </div>
                    <button
                      onClick={() => setViewingDate(null)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Capacity controls for mobile */}
                  {!isWeekend && !isClosed && !isAway && (
                    <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
                      <span className="text-sm text-slate-400">Spots Available</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (viewDateCapacity > 0) updateDateCapacity(viewDate, viewDateCapacity - 1);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors text-lg font-bold"
                        >
                          -
                        </button>
                        <span className="text-lg font-bold text-white min-w-[40px] text-center">
                          {Math.max(0, viewDateCapacity - dateBookings.length)}
                        </span>
                        <button
                          onClick={() => updateDateCapacity(viewDate, viewDateCapacity + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors text-lg font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Orders for this date */}
                  {dateBookings.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Orders ({dateBookings.length}/{viewDateCapacity})</p>
                      {dateBookings.map((booking) => (
                        <div
                          key={booking._id}
                          onClick={() => navigateToOrder(booking._id)}
                          className="bg-pink-500/10 ring-1 ring-pink-500/30 rounded-lg p-3 cursor-pointer hover:bg-pink-500/20 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium">{booking.customerInfo.name}</p>
                              <p className="text-sm text-pink-300">{booking.cakeDetails.productName}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {booking.cakeDetails.size} • {booking.cakeDetails.flavor}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              booking.status === 'confirmed'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No orders for this date</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
