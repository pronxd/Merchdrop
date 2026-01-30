// Umami Analytics Event Tracking Utility

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, any>) => void;
    };
  }
}

export const trackEvent = (eventName: string, eventData?: Record<string, any>) => {
  try {
    // Track with Umami if available
    if (typeof window !== "undefined" && window.umami) {
      window.umami.track(eventName, eventData);
    }
  } catch (error) {
    console.error("Analytics tracking error:", error);
  }
};

// Pre-defined event types for type safety
export const AnalyticsEvents = {
  // Product Events
  PRODUCT_VIEW: "product-view",
  PRODUCT_CLICK: "product-click",

  // Cart Events
  ADD_TO_CART: "add-to-cart",
  REMOVE_FROM_CART: "remove-from-cart",
  CART_UPDATE_QUANTITY: "cart-update-quantity",
  CART_CLEARED: "cart-cleared",
  CHECKOUT_STARTED: "checkout-started",

  // Sales Events (for future Stripe integration)
  PURCHASE_COMPLETED: "purchase-completed",
  PAYMENT_INITIATED: "payment-initiated",
  PAYMENT_FAILED: "payment-failed",

  // User Interaction Events
  CHAT_OPENED: "chat-opened",
  ADDON_SELECTED: "addon-selected",
  DESIGN_NOTE_ADDED: "design-note-added",
} as const;

// Helper functions for common events
export const trackProductView = (productId: number, productName: string, price: number) => {
  trackEvent(AnalyticsEvents.PRODUCT_VIEW, {
    product_id: productId,
    product_name: productName,
    price: price,
  });
};

export const trackAddToCart = (
  productId: number | string,
  productName: string,
  price: number,
  quantity: number,
  addOns?: string[]
) => {
  trackEvent(AnalyticsEvents.ADD_TO_CART, {
    product_id: productId,
    product_name: productName,
    price: price,
    quantity: quantity,
    add_ons: addOns?.join(", ") || "none",
    total_value: price * quantity,
  });
};

export const trackRemoveFromCart = (
  productId: number | string,
  productName: string,
  price: number
) => {
  trackEvent(AnalyticsEvents.REMOVE_FROM_CART, {
    product_id: productId,
    product_name: productName,
    price: price,
  });
};

export const trackPurchase = (
  orderId: string,
  items: Array<{ id: number | string; name: string; price: number; quantity: number }>,
  total: number
) => {
  trackEvent(AnalyticsEvents.PURCHASE_COMPLETED, {
    order_id: orderId,
    total_value: total,
    items_count: items.reduce((sum, item) => sum + item.quantity, 0),
    products: items.map(item => item.name).join(", "),
  });
};

export const trackCheckoutStarted = (cartTotal: number, itemsCount: number) => {
  trackEvent(AnalyticsEvents.CHECKOUT_STARTED, {
    cart_total: cartTotal,
    items_count: itemsCount,
  });
};
