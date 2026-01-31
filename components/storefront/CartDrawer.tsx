"use client";

import { useState } from "react";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import { useStorefrontCart } from "@/context/StorefrontCartContext";

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    totalItems,
    totalPrice,
  } = useStorefrontCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const freeShippingThreshold = 100;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - totalPrice);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/merch-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to create checkout session");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-black border-l border-white/10 z-50 flex flex-col cart-slide-enter">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-white text-xl font-bold">
              Cart &bull; {totalItems}
            </h2>
            {totalItems > 0 && (
              <p className="text-white/60 text-sm mt-1">
                {amountToFreeShipping > 0
                  ? `You're $${amountToFreeShipping.toFixed(2)} USD away from free shipping!`
                  : "You qualify for free shipping!"}
              </p>
            )}
          </div>
          <button
            onClick={closeCart}
            className="text-white/60 hover:text-white transition-colors p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-16 h-16 text-white/20 mb-4" />
              <p className="text-white/60">Your cart is empty</p>
              <button
                onClick={closeCart}
                className="mt-4 text-red-500 hover:text-red-400 transition-colors"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => {
                const cartKey = item.selectedSize ? `${item.id}_${item.selectedSize}` : item.id;
                return (
                  <div
                    key={cartKey}
                    className="flex gap-4 pb-6 border-b border-white/10"
                  >
                    {/* Product Image */}
                    <div className="w-24 h-24 flex-shrink-0 bg-neutral-900 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium line-clamp-2">
                        {item.name}
                      </h3>
                      {item.selectedSize && (
                        <p className="text-white/40 text-xs mt-0.5">
                          Size: {item.selectedSize}
                        </p>
                      )}
                      <p className="text-white/60 text-sm mt-1">
                        ${item.price}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center border border-white/20">
                          <button
                            onClick={() =>
                              updateQuantity(cartKey, item.quantity - 1)
                            }
                            className="p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center text-white text-sm">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(cartKey, item.quantity + 1)
                            }
                            className="p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(cartKey)}
                          className="text-white/40 hover:text-red-500 transition-colors text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <p className="text-white font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-white/10 bg-neutral-950">
            {/* Subtotal */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/60">Subtotal</span>
              <span className="text-white text-xl font-bold">
                ${totalPrice.toFixed(2)} USD
              </span>
            </div>

            {/* Note */}
            <p className="text-white/40 text-sm mb-4">
              Taxes and shipping calculated at checkout
            </p>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full bg-red-600 text-white py-4 font-bold tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkoutLoading ? "PROCESSING..." : "CHECKOUT"}
            </button>

            {/* Continue Shopping */}
            <button
              onClick={closeCart}
              className="w-full text-white/60 hover:text-white transition-colors mt-3 text-sm"
            >
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
