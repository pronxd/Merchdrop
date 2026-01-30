"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

export default function AdminSignIn() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/kassycakes/dashboard");
    }
  }, [status, router]);

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/kassycakes/dashboard" });
  };

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creamWhite">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-kassyPink border-t-transparent"></div>
      </div>
    );
  }

  // Don't render sign-in if already authenticated (will redirect)
  if (status === "authenticated") {
    return null;
  }

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
      {/* Floating Angel - Left */}
      <div className="absolute left-4 md:left-16 top-1/3 w-24 md:w-36 opacity-80 animate-float hidden sm:block">
        <Image
          src="https://kassycakes.b-cdn.net/assets/pointer.webp"
          alt="Angel"
          width={150}
          height={150}
          className="drop-shadow-2xl"
          priority
        />
      </div>

      {/* Floating Angel - Right */}
      <div className="absolute right-4 md:right-16 top-1/2 w-28 md:w-40 opacity-80 animate-float-delayed hidden sm:block">
        <Image
          src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png"
          alt="Angel with cupcake"
          width={160}
          height={160}
          className="drop-shadow-2xl"
          priority
        />
      </div>

      {/* Sign In Card */}
      <div className="relative z-10 w-full max-w-sm md:max-w-xs lg:max-w-sm mx-4 animate-fade-in-up">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-8 ornamental-border baroque-shadow">
          {/* Logo - Click to go home */}
          <a href="/" className="flex justify-center mb-4 cursor-pointer">
            <Image
              src="https://kassycakes.b-cdn.net/assets/baby%20angel%20sitting%20on%20moon%20looking%20back%20holding%20spoon%20artwork.png"
              alt="Kassy Cakes - Click to go home"
              width={90}
              height={90}
              className="drop-shadow-lg hover:scale-105 transition-transform"
              style={{ animation: 'float 4s ease-in-out infinite' }}
              priority
            />
          </a>

          {/* Title */}
          <h1 className="font-playfair text-2xl md:text-3xl font-bold text-deepBurgundy text-center mb-1">
            Welcome Back
          </h1>

          <p className="font-cormorant text-deepBurgundy/70 text-center text-base mb-5">
            Sign in to access your dashboard
          </p>

          {/* Ornamental Divider */}
          <div className="flex justify-center mb-5">
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

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-deepBurgundy/20 hover:border-kassyPink text-deepBurgundy font-cormorant text-base font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group"
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
            <span className="group-hover:text-kassyPink transition-colors">
              Continue with Google
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-deepBurgundy/20"></div>
            <span className="font-cormorant text-deepBurgundy/50 text-xs">or</span>
            <div className="flex-1 h-px bg-deepBurgundy/20"></div>
          </div>

          {/* Email/Password placeholder for future */}
          <div className="space-y-2 opacity-50 pointer-events-none">
            <input
              type="email"
              placeholder="Email address"
              disabled
              className="w-full px-3 py-2 rounded-lg border-2 border-deepBurgundy/20 font-cormorant text-sm bg-gray-50"
            />
            <input
              type="password"
              placeholder="Password"
              disabled
              className="w-full px-3 py-2 rounded-lg border-2 border-deepBurgundy/20 font-cormorant text-sm bg-gray-50"
            />
            <button
              disabled
              className="w-full bg-kassyPink/50 text-white font-playfair py-2 px-4 rounded-full text-sm"
            >
              Sign In
            </button>
          </div>

          <p className="text-center font-cormorant text-deepBurgundy/40 text-xs mt-3">
            Email sign-in disabled
          </p>
        </div>

        {/* Footer text */}
        <p className="text-center font-cormorant text-white/80 text-sm mt-6 drop-shadow-lg">
          Admin access only
        </p>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-creamWhite/50 to-transparent"></div>

      {/* Float animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}
