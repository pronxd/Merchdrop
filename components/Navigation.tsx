"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";

export default function Navigation() {
  const pathname = usePathname();
  const { cartCount } = useCart();

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  // Extract product ID from URL if on product page
  const getOrderLink = () => {
    const productMatch = pathname.match(/\/cakes\/product\/(\d+)/);
    if (productMatch) {
      return `/cakes?scrollTo=${productMatch[1]}`;
    }
    return "/cakes";
  };

  return (
    <nav
      className={`${pathname === "/" ? "absolute top-0 left-0 right-0 z-50 bg-transparent" : "bg-[#ff94b3] shadow-lg relative z-50"}`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Location */}
          <div className="flex items-center gap-4">
            <Link href="/" className="group">
              <span className="font-cursive text-3xl md:text-4xl text-white md:group-hover:text-baroqueGold transition-colors" style={pathname === "/" ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' } : {}}>
                KassyCakes
              </span>
            </Link>

            {/* Location - Desktop */}
            <div className="hidden md:flex items-center gap-2 text-white" style={pathname === "/" ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' } : {}}>
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span className="font-cormorant text-base font-semibold">Kyle, Texas</span>
            </div>
          </div>

          {/* Location - Mobile (centered) */}
          <div className="md:hidden absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-white" style={pathname === "/" ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' } : {}}>
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span className="font-cormorant text-sm font-semibold">Kyle, Texas</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className={`font-playfair text-lg font-semibold transition-colors ${
                isActive("/") && pathname === "/"
                  ? "text-baroqueGold"
                  : "text-white hover:text-baroqueGold"
              }`}
              style={pathname === "/" ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' } : {}}
            >
              Home
            </Link>
            <Link
              href="/#gallery"
              className={`font-playfair text-lg font-semibold transition-colors text-white hover:text-baroqueGold`}
              style={pathname === "/" ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' } : {}}
            >
              Gallery
            </Link>
            <Link
              href={getOrderLink()}
              className={`font-playfair text-lg font-semibold transition-colors ${
                isActive("/cakes")
                  ? "text-baroqueGold"
                  : "text-white hover:text-baroqueGold"
              }`}
              style={pathname === "/" ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' } : {}}
            >
              Order
            </Link>
            <Link
              href="/faq"
              className={`font-playfair text-lg font-semibold transition-colors ${
                isActive("/faq")
                  ? "text-baroqueGold"
                  : "text-white hover:text-baroqueGold"
              }`}
              style={pathname === "/" ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' } : {}}
            >
              FAQ
            </Link>

            {/* Social Media Icons */}
            <div className="flex items-center gap-4">
              <a
                href="https://www.tiktok.com/@_kassycakes_"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-baroqueGold transition-colors"
                aria-label="TikTok"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={pathname === "/" ? { filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.3))' } : {}}>
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/_kassycakes_/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-baroqueGold transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={pathname === "/" ? { filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.3))' } : {}}>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>

            <Link
              href="/cart"
              className={`relative flex items-center gap-2 px-6 py-2 rounded-full transition-all duration-300 font-playfair font-semibold ${
                isActive("/cart")
                  ? "bg-baroqueGold text-white"
                  : "bg-white hover:bg-baroqueGold active:bg-baroqueGold text-deepBurgundy hover:text-white active:text-white"
              }`}
            >
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="bg-deepBurgundy text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <Link
              href="/cart"
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 font-playfair font-semibold text-sm ${
                isActive("/cart")
                  ? "bg-baroqueGold text-white"
                  : "bg-white hover:bg-baroqueGold active:bg-baroqueGold text-deepBurgundy hover:text-white active:text-white"
              }`}
            >
              Cart
              {cartCount > 0 && (
                <span className="bg-deepBurgundy text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Links */}
        <div className="md:hidden pb-4">
          <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/"
            className={`font-playfair text-base font-semibold transition-colors ${
              isActive("/") && pathname === "/"
                ? "text-baroqueGold"
                : "text-white hover:text-baroqueGold"
            }`}
            style={pathname === "/" ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' } : {}}
          >
            Home
          </Link>
          <Link
            href="/#gallery"
            className="font-playfair text-base font-semibold transition-colors text-white hover:text-baroqueGold"
            style={pathname === "/" ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' } : {}}
          >
            Gallery
          </Link>
          <Link
            href={getOrderLink()}
            className={`font-playfair text-base font-semibold transition-colors ${
              isActive("/cakes")
                ? "text-baroqueGold"
                : "text-white hover:text-baroqueGold"
            }`}
            style={pathname === "/" ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' } : {}}
          >
            Order
          </Link>
          <Link
            href="/faq"
            className={`font-playfair text-base font-semibold transition-colors ${
              isActive("/faq")
                ? "text-baroqueGold"
                : "text-white hover:text-baroqueGold"
            }`}
            style={pathname === "/" ? { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)' } : {}}
          >
            FAQ
          </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
