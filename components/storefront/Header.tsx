"use client";

import { useState } from "react";
import { Search, User, ShoppingBag, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { useStorefrontCart } from "@/context/StorefrontCartContext";

export default function Header() {
  const { totalItems, openCart } = useStorefrontCart();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-[#dc2626] text-white text-center py-2 px-4 text-xs font-medium tracking-wider">
        FREE SHIPPING ON ORDERS $100 & UP (CONTINENTAL US)
      </div>

      {/* Main Header */}
      <header className="bg-black border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/"
                className="text-white text-sm font-medium tracking-wider hover:text-red-500 transition-colors"
              >
                HOME
              </Link>
              <Link
                href="#contact"
                className="text-white text-sm font-medium tracking-wider hover:text-red-500 transition-colors"
              >
                CONTACT
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button className="md:hidden text-white p-2">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Logo */}
            <Link href="/" className="absolute left-1/2 transform -translate-x-1/2">
              <svg
                viewBox="0 0 200 80"
                className="h-12 w-auto"
                fill="currentColor"
              >
                <text
                  x="50%"
                  y="60%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  className="fill-white font-bold text-2xl"
                  style={{ fontFamily: "Oswald, sans-serif" }}
                >
                  PUBLICENEMY
                </text>
              </svg>
            </Link>

            {/* Right Actions */}
            <div className="flex items-center space-x-4">
              {/* Country Selector */}
              <button className="hidden sm:flex items-center text-white text-sm hover:text-red-500 transition-colors">
                <span>United States | USD $</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>

              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="text-white hover:text-red-500 transition-colors p-2"
              >
                {isSearchOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>

              {/* Account */}
              <button className="text-white hover:text-red-500 transition-colors p-2">
                <User className="w-5 h-5" />
              </button>

              {/* Cart */}
              <button
                onClick={openCart}
                className="text-white hover:text-red-500 transition-colors p-2 relative"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {isSearchOpen && (
            <div className="py-4 border-t border-white/10">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full bg-white/5 border border-white/20 rounded-none px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-red-500"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
