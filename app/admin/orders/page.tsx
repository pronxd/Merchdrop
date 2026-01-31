"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Booking {
  _id: string;
  orderDate: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  orderDetails: {
    productId: number | string;
    productName: string;
    size: string;
    price: number;
    quantity: number;
    image?: string;
  };
  paymentInfo?: {
    amountPaid: number;
  };
}

export default function OrdersPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [customerEmail, setCustomerEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => {
    const pendingOrderInfo = sessionStorage.getItem('pendingOrderInfo');
    if (pendingOrderInfo) {
      try {
        const orderInfo = JSON.parse(pendingOrderInfo);
        if (orderInfo.customerEmail) {
          setCustomerEmail(orderInfo.customerEmail);
          setEmailSubmitted(true);
        }
      } catch (error) {
        console.error('Error parsing order info:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (emailSubmitted && customerEmail) {
      fetchBookings();
    }
  }, [emailSubmitted, customerEmail]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/bookings');
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      const customerBookings = data.bookings.filter(
        (booking: Booking) => booking.customerInfo.email.toLowerCase() === customerEmail.toLowerCase()
      );
      setBookings(customerBookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerEmail.trim()) {
      setEmailSubmitted(true);
    }
  };

  const filteredBookings = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-900/50 text-green-400 border border-green-700';
      case 'cancelled': return 'bg-red-900/50 text-red-400 border border-red-700';
      default: return 'bg-yellow-900/50 text-yellow-400 border border-yellow-700';
    }
  };

  if (!emailSubmitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="font-oswald text-3xl font-bold text-white uppercase tracking-wider mb-2">
              View Your Orders
            </h1>
            <p className="font-inter text-lg text-neutral-400">
              Enter your email to view your order history
            </p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block font-inter text-sm text-neutral-400 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-700 bg-neutral-800 text-white focus:border-red-500 outline-none font-inter text-base"
                placeholder="your@email.com"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-oswald text-lg uppercase tracking-wider px-8 py-3 rounded-lg transition-colors"
            >
              View My Orders
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="font-inter text-neutral-500 hover:text-red-500 transition-colors underline"
            >
              Back to Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="font-inter text-xl text-neutral-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-oswald text-4xl font-bold text-white uppercase tracking-wider mb-2">
            Your Orders
          </h1>
          <div className="flex items-center gap-3">
            <p className="font-inter text-lg text-neutral-400">
              Viewing orders for: <span className="font-semibold text-white">{customerEmail}</span>
            </p>
            <button
              onClick={() => {
                setEmailSubmitted(false);
                setCustomerEmail('');
                setBookings([]);
              }}
              className="font-inter text-sm text-red-500 hover:text-red-400 underline"
            >
              Change Email
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-6 flex gap-3">
          {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-oswald uppercase tracking-wider text-sm transition-colors ${
                filter === status
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 text-xs">
                ({status === 'all' ? bookings.length : bookings.filter(b => b.status === status).length})
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center">
              <p className="font-inter text-xl text-neutral-500">
                No {filter !== 'all' ? filter : ''} orders found
              </p>
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const total = booking.paymentInfo?.amountPaid || booking.orderDetails.price || 0;

              return (
                <div key={booking._id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-oswald text-2xl font-bold text-white uppercase tracking-wider mb-1">
                        {booking.orderDetails.productName}
                      </h3>
                      <div className="flex gap-3 text-sm">
                        <span className={`px-3 py-1 rounded font-inter text-xs uppercase ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                        <span className="text-neutral-500 font-inter">
                          Order ID: {booking._id.slice(-8)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-oswald text-3xl font-bold text-red-500">
                        ${total.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6 mb-4">
                    <div>
                      <h4 className="font-oswald font-semibold text-neutral-300 uppercase tracking-wider text-sm mb-2">
                        Customer
                      </h4>
                      <p className="font-inter text-white">
                        {booking.customerInfo.name}
                      </p>
                      <p className="font-inter text-neutral-500 text-sm">
                        {booking.customerInfo.email}
                      </p>
                      {booking.customerInfo.phone && (
                        <p className="font-inter text-neutral-500 text-sm">
                          {booking.customerInfo.phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-oswald font-semibold text-neutral-300 uppercase tracking-wider text-sm mb-2">
                        Order Details
                      </h4>
                      <p className="font-inter text-white">
                        Size: {booking.orderDetails.size}
                      </p>
                      <p className="font-inter text-neutral-400 text-sm">
                        Qty: {booking.orderDetails.quantity || 1}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-oswald font-semibold text-neutral-300 uppercase tracking-wider text-sm mb-2">
                        Dates
                      </h4>
                      <p className="font-inter text-white">
                        Ordered: {formatDate(booking.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
