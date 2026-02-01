"use client";

import { useState, useEffect, useRef } from "react";
import { Search, User, ShoppingBag, ChevronDown, X, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useStorefrontCart } from "@/context/StorefrontCartContext";

interface OrderResult {
  orderNumber: string;
  productName: string;
  size: string;
  quantity: number;
  price: number;
  image?: string;
  status: string;
  orderDate: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  forfeited: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function Header() {
  const { totalItems, openCart, cartBump } = useStorefrontCart();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOrderLookupOpen, setIsOrderLookupOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const badgeRef = useRef<HTMLSpanElement>(null);

  // Order lookup state
  const [orderQuery, setOrderQuery] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    if (cartBump === 0) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 400);
    return () => clearTimeout(t);
  }, [cartBump]);

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      setIsOrderLookupOpen(false);
    }
  };

  const toggleOrderLookup = () => {
    setIsOrderLookupOpen(!isOrderLookupOpen);
    if (!isOrderLookupOpen) {
      setIsSearchOpen(false);
      setOrderQuery("");
      setOrderResult(null);
      setOrderError("");
    }
  };

  const lookupOrder = async () => {
    const trimmed = orderQuery.trim();
    if (!trimmed) return;

    setOrderLoading(true);
    setOrderResult(null);
    setOrderError("");

    try {
      const res = await fetch(
        `/api/orders/lookup?orderNumber=${encodeURIComponent(trimmed)}`
      );
      if (res.ok) {
        const data = await res.json();
        setOrderResult(data.order);
      } else if (res.status === 404) {
        setOrderError("Order not found. Please check your order number.");
      } else {
        setOrderError("Something went wrong. Please try again.");
      }
    } catch {
      setOrderError("Unable to look up order. Please try again.");
    } finally {
      setOrderLoading(false);
    }
  };

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
                href="/contact"
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
              <span className="font-barcode text-2xl sm:text-3xl text-white hover:text-red-500 transition-colors relative top-1">
                PUBLICINFAMY
              </span>
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
                onClick={toggleSearch}
                className="text-white hover:text-red-500 transition-colors p-2"
              >
                {isSearchOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>

              {/* Account / Order Lookup */}
              <button
                onClick={toggleOrderLookup}
                className="text-white hover:text-red-500 transition-colors p-2"
              >
                {isOrderLookupOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </button>

              {/* Cart */}
              <button
                id="cart-icon-target"
                onClick={openCart}
                className="text-white hover:text-red-500 transition-colors p-2 relative"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span
                    ref={badgeRef}
                    className={`absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium transition-transform ${
                      bump ? "animate-cart-bump" : ""
                    }`}
                  >
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

          {/* Order Lookup Panel */}
          {isOrderLookupOpen && (
            <div className="py-4 border-t border-white/10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  lookupOrder();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="Enter your order number..."
                  className="flex-1 bg-white/5 border border-white/20 rounded-none px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-red-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={orderLoading || !orderQuery.trim()}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 text-sm font-medium tracking-wider transition-colors"
                >
                  {orderLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "LOOK UP"
                  )}
                </button>
              </form>

              {/* Loading */}
              {orderLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                </div>
              )}

              {/* Error */}
              {orderError && (
                <div className="mt-4 text-center py-6 text-white/60 text-sm">
                  {orderError}
                </div>
              )}

              {/* Result Card */}
              {orderResult && (
                <div className="mt-4 bg-white/5 border border-white/10 p-4 flex gap-4">
                  {orderResult.image && (
                    <div className="relative w-20 h-20 flex-shrink-0 bg-white/5">
                      <Image
                        src={orderResult.image}
                        alt={orderResult.productName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-white font-medium text-sm truncate">
                        {orderResult.productName}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 border rounded flex-shrink-0 ${
                          statusColors[orderResult.status] ||
                          statusColors.pending
                        }`}
                      >
                        {orderResult.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-white/50 text-xs mt-1">
                      Order #{orderResult.orderNumber}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
                      <span>Size: {orderResult.size}</span>
                      <span>Qty: {orderResult.quantity}</span>
                      <span>${orderResult.price.toFixed(2)}</span>
                    </div>
                    <p className="text-white/40 text-xs mt-1">
                      Ordered{" "}
                      {new Date(orderResult.orderDate).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
