"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";

interface AccessDeniedProps {
  userEmail: string;
}

export default function AccessDenied({ userEmail }: AccessDeniedProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/kassycakes" });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: 'url(https://kassycakes.b-cdn.net/assets/WS5V5h8f1T_FaP6d8-mvL.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Access Denied Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 md:p-10 ornamental-border baroque-shadow">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="font-playfair text-3xl font-bold text-deepBurgundy text-center mb-2">
            Access Denied
          </h1>

          <p className="font-cormorant text-deepBurgundy/70 text-center text-lg mb-4">
            You don&apos;t have permission to access this area.
          </p>

          {/* User Email */}
          <div className="bg-deepBurgundy/5 rounded-lg p-4 mb-6">
            <p className="font-cormorant text-deepBurgundy/60 text-sm text-center mb-1">
              Signed in as
            </p>
            <p className="font-cormorant text-deepBurgundy font-semibold text-center">
              {userEmail}
            </p>
          </div>

          {/* Ornamental Divider */}
          <div className="flex justify-center mb-6">
            <svg
              viewBox="0 0 200 20"
              className="w-48 opacity-60"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 10 Q 50 5, 100 10 T 200 10"
                stroke="#d4af37"
                fill="none"
                strokeWidth="1.5"
              />
              <circle cx="100" cy="10" r="4" fill="#d4af37" />
              <circle cx="50" cy="8" r="2" fill="#d4af37" />
              <circle cx="150" cy="8" r="2" fill="#d4af37" />
            </svg>
          </div>

          {/* Message */}
          <p className="font-cormorant text-deepBurgundy/60 text-center text-sm mb-6">
            This dashboard is reserved for authorized administrators only.
            If you believe you should have access, please contact the site owner.
          </p>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full bg-kassyPink hover:bg-baroqueGold text-white font-playfair py-3 px-6 rounded-full text-lg transition-all duration-300 hover:scale-[1.02] baroque-shadow"
          >
            Sign Out
          </button>

          {/* Back to Home */}
          <a
            href="/"
            className="block text-center font-cormorant text-deepBurgundy/60 hover:text-kassyPink text-sm mt-4 transition-colors"
          >
            Return to Kassy Cakes
          </a>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-creamWhite/50 to-transparent"></div>
    </div>
  );
}
