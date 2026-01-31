"use client";

import { signOut } from "next-auth/react";

interface AccessDeniedProps {
  userEmail: string;
}

export default function AccessDenied({ userEmail }: AccessDeniedProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/admin" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 md:p-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-900/50 rounded-full flex items-center justify-center">
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
          <h1 className="font-oswald text-3xl font-bold text-white text-center uppercase tracking-wider mb-2">
            Access Denied
          </h1>

          <p className="font-inter text-neutral-400 text-center text-lg mb-4">
            You don&apos;t have permission to access this area.
          </p>

          {/* User Email */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 mb-6">
            <p className="font-inter text-neutral-500 text-sm text-center mb-1">
              Signed in as
            </p>
            <p className="font-inter text-white font-semibold text-center">
              {userEmail}
            </p>
          </div>

          {/* Divider */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-0.5 bg-red-600"></div>
          </div>

          {/* Message */}
          <p className="font-inter text-neutral-500 text-center text-sm mb-6">
            This dashboard is reserved for authorized administrators only.
            If you believe you should have access, please contact the site owner.
          </p>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-oswald py-3 px-6 rounded-lg text-lg uppercase tracking-wider transition-colors"
          >
            Sign Out
          </button>

          {/* Back to Home */}
          <a
            href="/"
            className="block text-center font-inter text-neutral-500 hover:text-red-500 text-sm mt-4 transition-colors"
          >
            Return to POPDRP
          </a>
        </div>
      </div>
    </div>
  );
}
