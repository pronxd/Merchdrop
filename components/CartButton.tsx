"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartButton() {
  const { cartCount } = useCart();

  return (
    <Link
      href="/cart"
      className="fixed top-4 right-4 z-50 bg-white hover:bg-baroqueGold active:bg-baroqueGold text-deepBurgundy hover:text-white active:text-white px-6 py-3 rounded-full transition-all duration-300 baroque-shadow font-playfair font-semibold flex items-center gap-2"
    >
      <span>Cart</span>
      {cartCount > 0 && (
        <span className="bg-kassyPink text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
          {cartCount}
        </span>
      )}
    </Link>
  );
}
