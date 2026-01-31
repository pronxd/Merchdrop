"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { StorefrontProduct, CartItem } from "@/types/storefront";

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: StorefrontProduct, size?: string) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "popdrp-cart";

export function StorefrontCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist cart to localStorage
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  const addItem = useCallback((product: StorefrontProduct, size?: string) => {
    if (product.soldOut) return;

    const sizePrice = size && product.sizes
      ? product.sizes.find((s) => s.size === size)?.price ?? product.price
      : product.price;

    const cartKey = size ? `${product.id}_${size}` : product.id;

    setItems((prev) => {
      const existing = prev.find(
        (item) => item.id === product.id && item.selectedSize === size
      );
      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.selectedSize === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, price: sizePrice, selectedSize: size, quantity: 1 }];
    });
    setIsOpen(true);
  }, []);

  const getCartKey = (item: CartItem) =>
    item.selectedSize ? `${item.id}_${item.selectedSize}` : item.id;

  const removeItem = useCallback((cartKey: string) => {
    setItems((prev) =>
      prev.filter((item) => {
        const key = item.selectedSize ? `${item.id}_${item.selectedSize}` : item.id;
        return key !== cartKey;
      })
    );
  }, []);

  const updateQuantity = useCallback(
    (cartKey: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(cartKey);
        return;
      }
      setItems((prev) =>
        prev.map((item) => {
          const key = item.selectedSize ? `${item.id}_${item.selectedSize}` : item.id;
          return key === cartKey ? { ...item, quantity } : item;
        })
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useStorefrontCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useStorefrontCart must be used within a StorefrontCartProvider");
  }
  return context;
}
