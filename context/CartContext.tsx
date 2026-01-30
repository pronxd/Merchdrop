"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { trackAddToCart, trackRemoveFromCart, trackEvent, AnalyticsEvents } from "@/lib/analytics";

export interface AddOn {
  id: string;
  name: string;
  price: number;
  image?: string; // Optional image URL for database-driven add-ons
}

export interface CartItem {
  id: number | string; // Support both legacy numeric IDs and MongoDB string IDs
  slug?: string;
  name: string;
  image: string;
  price: number;
  size?: string;
  servings?: string;
  flavor?: string;
  quantity: number;
  addOns?: AddOn[];
  designNotes?: string;
  edibleImageUrl?: string;
  referenceImageUrl?: string; // URL of the reference photo when "Make like photo" is checked
  isEditablePhoto?: boolean; // True when this is an edible photo for signature cakes (not a reference photo)
  // Delivery information
  fulfillmentType?: 'delivery' | 'pickup';
  orderDate?: string; // ISO string
  pickupDate?: string; // ISO string (pickup or delivery date)
  deliveryTime?: string; // Time slot for delivery (e.g., "5:00 PM - 6:00 PM")
  pickupTime?: string; // Time slot for pickup (e.g., "12:00 PM - 1:00 PM")
  // Delivery address
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    fullAddress: string;
  };
}

export interface DiscountCode {
  code: string;
  percentage: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: number | string, size: string, designNotes?: string) => void;
  updateQuantity: (id: number | string, size: string, quantity: number, designNotes?: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  // Discount code support
  discountCode: DiscountCode | null;
  discountAmount: number;
  cartTotalWithDiscount: number;
  applyDiscountCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeDiscountCode: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountCode, setDiscountCode] = useState<DiscountCode | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("kassycakes-cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    // Load discount code from localStorage
    const savedDiscount = localStorage.getItem("kassycakes-discount");
    if (savedDiscount) {
      setDiscountCode(JSON.parse(savedDiscount));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("kassycakes-cart", JSON.stringify(cart));
  }, [cart]);

  // Save discount code to localStorage whenever it changes
  useEffect(() => {
    if (discountCode) {
      localStorage.setItem("kassycakes-discount", JSON.stringify(discountCode));
    } else {
      localStorage.removeItem("kassycakes-discount");
    }
  }, [discountCode]);

  const addToCart = (item: CartItem) => {
    setCart((prevCart) => {
      // Match items by id, size, AND design notes to keep customizations separate
      const existingItem = prevCart.find(
        (cartItem) =>
          cartItem.id === item.id &&
          (cartItem.size || "") === (item.size || "") &&
          (cartItem.designNotes || "") === (item.designNotes || "")
      );

      if (existingItem) {
        // Track cart update analytics
        trackAddToCart(
          item.id,
          item.name,
          item.price,
          item.quantity,
          item.addOns?.map(a => a.name)
        );

        return prevCart.map((cartItem) =>
          cartItem.id === item.id &&
          (cartItem.size || "") === (item.size || "") &&
          (cartItem.designNotes || "") === (item.designNotes || "")
            ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
            : cartItem
        );
      }

      // Track new item added to cart
      trackAddToCart(
        item.id,
        item.name,
        item.price,
        item.quantity,
        item.addOns?.map(a => a.name)
      );

      return [...prevCart, item];
    });
  };

  const removeFromCart = (id: number | string, size: string, designNotes?: string) => {
    setCart((prevCart) => {
      // Find the item being removed for tracking
      const removedItem = prevCart.find(
        (item) =>
          item.id === id &&
          (item.size || "") === size &&
          (item.designNotes || "") === (designNotes || "")
      );

      if (removedItem) {
        // Track removal analytics
        trackRemoveFromCart(removedItem.id, removedItem.name, removedItem.price);
      }

      return prevCart.filter(
        (item) => !(
          item.id === id &&
          (item.size || "") === size &&
          (item.designNotes || "") === (designNotes || "")
        )
      );
    });
  };

  const updateQuantity = (id: number | string, size: string, quantity: number, designNotes?: string) => {
    if (quantity <= 0) {
      removeFromCart(id, size, designNotes);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id &&
        (item.size || "") === size &&
        (item.designNotes || "") === (designNotes || "")
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    // Track cart cleared event
    trackEvent(AnalyticsEvents.CART_CLEARED, {
      items_count: cart.length,
      cart_value: cartTotal,
    });

    setCart([]);
    setDiscountCode(null); // Also clear discount code when cart is cleared
  };

  // Apply a discount code
  const applyDiscountCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/discount-code/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });

      const data = await response.json();

      if (data.valid) {
        setDiscountCode({
          code: data.code,
          percentage: data.percentage
        });
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Invalid discount code' };
      }
    } catch (error) {
      console.error('Failed to validate discount code:', error);
      return { success: false, error: 'Failed to validate code. Please try again.' };
    }
  };

  // Remove the current discount code
  const removeDiscountCode = () => {
    setDiscountCode(null);
  };

  const cartTotal = cart.reduce(
    (total, item) => {
      const basePrice = item.price;
      const addOnsPrice = item.addOns?.reduce((sum, addOn) => sum + addOn.price, 0) || 0;
      return total + (basePrice + addOnsPrice) * item.quantity;
    },
    0
  );

  // Calculate discount amount
  const discountAmount = discountCode ? (cartTotal * discountCode.percentage) / 100 : 0;

  // Calculate cart total after discount
  const cartTotalWithDiscount = cartTotal - discountAmount;

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        discountCode,
        discountAmount,
        cartTotalWithDiscount,
        applyDiscountCode,
        removeDiscountCode,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
