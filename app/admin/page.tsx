"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminSignIn() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/admin/dashboard");
    }
  }, [status, router]);

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/admin/dashboard" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="relative z-10 w-full max-w-sm mx-4 animate-fade-in-up">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8">
          {/* Logo */}
          <a href="/" className="flex justify-center mb-6 cursor-pointer">
            <span className="font-oswald text-4xl font-bold text-white uppercase tracking-widest hover:text-red-500 transition-colors">
              POPDRP
            </span>
          </a>

          {/* Title */}
          <h1 className="font-oswald text-2xl md:text-3xl font-bold text-white text-center uppercase tracking-wider mb-1">
            Welcome Back
          </h1>

          <p className="font-inter text-neutral-400 text-center text-base mb-6">
            Sign in to access your dashboard
          </p>

          {/* Divider */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-0.5 bg-red-600"></div>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-neutral-800 border border-neutral-700 hover:border-red-500 text-white font-inter text-base font-semibold py-3 px-5 rounded-lg transition-all duration-300 hover:bg-neutral-700 group"
          >
            {/* Google Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="group-hover:text-red-400 transition-colors">
              Continue with Google
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-neutral-700"></div>
            <span className="font-inter text-neutral-500 text-xs">or</span>
            <div className="flex-1 h-px bg-neutral-700"></div>
          </div>

          {/* Email/Password placeholder for future */}
          <div className="space-y-2 opacity-50 pointer-events-none">
            <input
              type="email"
              placeholder="Email address"
              disabled
              className="w-full px-3 py-2 rounded-lg border border-neutral-700 font-inter text-sm bg-neutral-800 text-neutral-400"
            />
            <input
              type="password"
              placeholder="Password"
              disabled
              className="w-full px-3 py-2 rounded-lg border border-neutral-700 font-inter text-sm bg-neutral-800 text-neutral-400"
            />
            <button
              disabled
              className="w-full bg-red-600/50 text-white font-oswald py-2 px-4 rounded-lg text-sm uppercase tracking-wider"
            >
              Sign In
            </button>
          </div>

          <p className="text-center font-inter text-neutral-600 text-xs mt-3">
            Email sign-in disabled
          </p>
        </div>

        <p className="text-center font-inter text-neutral-500 text-sm mt-6">
          Admin access only
        </p>
      </div>
    </div>
  );
}
