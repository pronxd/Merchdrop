'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CustomOrderSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [orderData, setOrderData] = useState<{
    orderNumber?: string;
    customerName?: string;
    productName?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found');
      setLoading(false);
      return;
    }

    // Process the payment
    fetch(`/api/custom-cake-payment/success?session_id=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSuccess(true);
          setOrderData({
            orderNumber: data.orderNumber,
            customerName: data.customerName,
            productName: data.productName,
          });
        } else {
          setError(data.error || 'Failed to process order');
        }
      })
      .catch(err => {
        setError('Failed to process order');
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fef8f4] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#4a2c2a] text-lg">Processing your order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fef8f4] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-[#4a2c2a] mb-4">Something went wrong</h1>
          <p className="text-[#6b4c4a] mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-pink-400 text-white px-6 py-3 rounded-full font-medium hover:bg-pink-500 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fef8f4] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-[#4a2c2a] mb-2">
          Payment Successful!
        </h1>

        {orderData?.orderNumber && (
          <p className="text-[#ff94b3] font-medium text-lg mb-4">
            Order #{orderData.orderNumber}
          </p>
        )}

        <div className="bg-[#fff8f0] rounded-xl p-6 mb-6 text-left">
          <h2 className="font-semibold text-[#4a2c2a] mb-3">What happens next?</h2>
          <ul className="space-y-2 text-[#6b4c4a]">
            <li className="flex items-start gap-2">
              <span className="text-pink-400">✓</span>
              <span>You&apos;ll receive a confirmation email shortly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400">✓</span>
              <span>Kassy will start working on your custom cake</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-400">✓</span>
              <span>We&apos;ll contact you if we have any questions</span>
            </li>
          </ul>
        </div>

        {orderData?.productName && (
          <p className="text-[#6b4c4a] mb-6">
            Thank you for ordering your <strong>{orderData.productName}</strong>!
          </p>
        )}

        <Link
          href="/"
          className="inline-block bg-pink-400 text-white px-8 py-3 rounded-full font-medium hover:bg-pink-500 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function CustomOrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fef8f4] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#4a2c2a] text-lg">Loading...</p>
        </div>
      </div>
    }>
      <CustomOrderSuccessContent />
    </Suspense>
  );
}
