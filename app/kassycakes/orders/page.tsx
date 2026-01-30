"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  cakeDetails: {
    productId: number | string;
    productName: string;
    size: string;
    flavor: string;
    designNotes: string;
    price: number;
    addOns: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  };
}

export default function OrdersPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [customerEmail, setCustomerEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => {
    // Check if email is in sessionStorage from checkout
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
      // Filter bookings by customer email
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
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Show email entry form if not submitted yet
  if (!emailSubmitted) {
    return (
      <div className="min-h-screen bg-creamWhite flex items-center justify-center px-4">
        <div className="bg-white rounded-lg p-8 baroque-shadow max-w-md w-full">
          <div className="text-center mb-6">
            <img
              src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png"
              alt="Angel with cupcake"
              className="mx-auto drop-shadow-xl w-[150px] h-[150px] mb-4"
            />
            <h1 className="font-playfair text-3xl font-bold text-deepBurgundy mb-2">
              View Your Orders
            </h1>
            <p className="font-cormorant text-lg text-deepBurgundy/80">
              Enter your email to view your order history
            </p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block font-cormorant text-sm text-deepBurgundy mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-base"
                placeholder="your@email.com"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-lg px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 baroque-shadow"
            >
              View My Orders
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/cakes"
              className="font-cormorant text-deepBurgundy/60 hover:text-kassyPink transition-colors underline"
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
      <div className="min-h-screen bg-creamWhite flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kassyPink mx-auto mb-4"></div>
          <p className="font-cormorant text-xl text-deepBurgundy">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-creamWhite">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with email and change email option */}
        <div className="mb-6">
          <h1 className="font-playfair text-4xl font-bold text-deepBurgundy mb-2">
            Your Orders
          </h1>
          <div className="flex items-center gap-3">
            <p className="font-cormorant text-lg text-deepBurgundy/70">
              Viewing orders for: <span className="font-semibold text-deepBurgundy">{customerEmail}</span>
            </p>
            <button
              onClick={() => {
                setEmailSubmitted(false);
                setCustomerEmail('');
                setBookings([]);
              }}
              className="font-cormorant text-sm text-kassyPink hover:text-baroqueGold underline"
            >
              Change Email
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 mb-6 flex gap-3">
          {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full font-playfair transition-colors ${
                filter === status
                  ? 'bg-kassyPink text-white'
                  : 'bg-gray-100 text-deepBurgundy hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 text-sm">
                ({status === 'all' ? bookings.length : bookings.filter(b => b.status === status).length})
              </span>
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <p className="font-cormorant text-xl text-deepBurgundy/60">
                No {filter !== 'all' ? filter : ''} orders found
              </p>
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const total = booking.cakeDetails.price +
                booking.cakeDetails.addOns.reduce((sum, a) => sum + a.price, 0);

              return (
                <div key={booking._id} className="bg-white rounded-lg p-6 baroque-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-playfair text-2xl font-bold text-deepBurgundy mb-1">
                        {booking.cakeDetails.productName}
                      </h3>
                      <div className="flex gap-3 text-sm">
                        <span className={`px-3 py-1 rounded-full font-cormorant ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                        <span className="text-deepBurgundy/60 font-cormorant">
                          Order ID: {booking._id.slice(-8)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-playfair text-3xl font-bold text-kassyPink">
                        ${total.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6 mb-4">
                    {/* Customer Info */}
                    <div>
                      <h4 className="font-playfair font-semibold text-deepBurgundy mb-2">
                        Customer
                      </h4>
                      <p className="font-cormorant text-deepBurgundy">
                        {booking.customerInfo.name}
                      </p>
                      <p className="font-cormorant text-deepBurgundy/70 text-sm">
                        {booking.customerInfo.email}
                      </p>
                      {booking.customerInfo.phone && (
                        <p className="font-cormorant text-deepBurgundy/70 text-sm">
                          {booking.customerInfo.phone}
                        </p>
                      )}
                    </div>

                    {/* Cake Details */}
                    <div>
                      <h4 className="font-playfair font-semibold text-deepBurgundy mb-2">
                        Cake Details
                      </h4>
                      <p className="font-cormorant text-deepBurgundy">
                        {booking.cakeDetails.size} • {booking.cakeDetails.flavor}
                      </p>
                      {booking.cakeDetails.addOns.length > 0 && (
                        <div className="mt-1">
                          <p className="font-cormorant text-sm text-deepBurgundy/70">
                            Add-ons:
                          </p>
                          {booking.cakeDetails.addOns.map((addon, i) => (
                            <p key={i} className="font-cormorant text-sm text-deepBurgundy/70">
                              • {addon.name} (+${addon.price})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Dates */}
                    <div>
                      <h4 className="font-playfair font-semibold text-deepBurgundy mb-2">
                        Important Dates
                      </h4>
                      <p className="font-cormorant text-deepBurgundy">
                        <span className="font-semibold">Needed:</span> {formatDate(booking.orderDate)}
                      </p>
                      <p className="font-cormorant text-deepBurgundy/70 text-sm">
                        Ordered: {formatDate(booking.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Design Notes */}
                  {booking.cakeDetails.designNotes && (
                    <div className="bg-creamWhite rounded p-4">
                      <h4 className="font-playfair font-semibold text-deepBurgundy mb-2">
                        Design Notes
                      </h4>
                      <p className="font-cormorant text-deepBurgundy whitespace-pre-wrap">
                        {booking.cakeDetails.designNotes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
