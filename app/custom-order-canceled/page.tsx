'use client';

import Link from 'next/link';

export default function CustomOrderCanceledPage() {
  return (
    <div className="min-h-screen bg-[#fef8f4] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🎂</div>
        <h1 className="text-2xl font-bold text-[#4a2c2a] mb-4">
          Payment Canceled
        </h1>

        <p className="text-[#6b4c4a] mb-6">
          No worries! Your custom cake request is still saved. You can complete
          the payment anytime using the link in your email.
        </p>

        <div className="bg-[#fff8f0] rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-[#6b4c4a]">
            <strong>Need help?</strong> Just reply to the quote email or contact
            us and we&apos;ll be happy to assist!
          </p>
        </div>

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
