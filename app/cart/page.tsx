"use client";

import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { trackCheckoutStarted } from "@/lib/analytics";
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import CustomerScheduleCalendar from "@/components/CustomerScheduleCalendar";
import "react-datepicker/dist/react-datepicker.css";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const DELIVERY_FEE = 40;

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart, discountCode, discountAmount, cartTotalWithDiscount, applyDiscountCode, removeDiscountCode } = useCart();
  const [discountInput, setDiscountInput] = useState('');
  const [discountError, setDiscountError] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '' });
  const [orderDate, setOrderDate] = useState<Date | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [completedOrderDate, setCompletedOrderDate] = useState<string>('');
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('pickup');
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Fetch products from database on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          setDbProducts(data.products || []);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (orderSuccess || showCheckoutModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [orderSuccess, showCheckoutModal]);

  // Check for Stripe success/cancel in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      console.log('🎉 Payment success detected!');
      const sessionId = params.get('session_id');
      console.log('📋 Session ID:', sessionId);

      // Load customer info and order date from sessionStorage immediately
      const pendingOrderInfo = sessionStorage.getItem('pendingOrderInfo');
      if (pendingOrderInfo) {
        try {
          const orderInfo = JSON.parse(pendingOrderInfo);
          setCustomerInfo({
            name: orderInfo.customerName || '',
            email: orderInfo.customerEmail || '',
            phone: orderInfo.customerPhone || ''
          });
          setCompletedOrderDate(orderInfo.orderDate || '');
          console.log('✅ Loaded order info from sessionStorage:', orderInfo);

          // Clear from sessionStorage
          sessionStorage.removeItem('pendingOrderInfo');
        } catch (error) {
          console.error('Error parsing order info:', error);
        }
      }

      // Show success message immediately
      setOrderSuccess(true);

      // Clear cart immediately
      clearCart();

      if (sessionId) {
        console.log('🔄 Calling checkout-success endpoint in background...');
        // Process order in background (create booking, send emails)
        fetch(`/api/checkout-success?session_id=${sessionId}`)
          .then(res => {
            console.log('📦 Response status:', res.status);
            return res.json();
          })
          .then(data => {
            console.log('✅ Checkout success response:', data);
            if (data.error) {
              console.error('❌ Error from checkout-success:', data.error);
            }
            // We already have the display data from sessionStorage, no need to update
          })
          .catch(error => {
            console.error('❌ Fetch error:', error);
          });
      }
      // Clear URL params
      window.history.replaceState({}, '', '/cart');
    } else if (params.get('canceled') === 'true') {
      setCheckoutError('Payment was canceled. Please try again.');
      window.history.replaceState({}, '', '/cart');
    }
  }, [clearCart]);

  const handleCheckout = () => {
    const itemsCount = cart.reduce((count, item) => count + item.quantity, 0);
    trackCheckoutStarted(cartTotal * 1.0825, itemsCount);
  };

  // Handle applying a discount code
  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) {
      setDiscountError('Please enter a discount code');
      return;
    }

    setIsApplyingDiscount(true);
    setDiscountError('');

    const result = await applyDiscountCode(discountInput);

    if (result.success) {
      setDiscountInput('');
      setDiscountError('');
    } else {
      setDiscountError(result.error || 'Invalid discount code');
    }

    setIsApplyingDiscount(false);
  };

  // Fetch unavailable dates and pre-fill date from cart when checkout modal opens
  useEffect(() => {
    if (showCheckoutModal) {
      fetchUnavailableDates();

      // Check if any cart items already have a date in their design notes
      // Get delivery info from first cart item
      for (const item of cart) {
        // First priority: Check for direct delivery fields (new method)
        if (item.orderDate) {
          const parsedOrderDate = new Date(item.orderDate);
          if (!isNaN(parsedOrderDate.getTime())) {
            setOrderDate(parsedOrderDate);
            console.log('📅 Pre-filled order date from cart item:', parsedOrderDate);
          }
        }

        if (item.fulfillmentType) {
          setFulfillmentType(item.fulfillmentType);
          console.log('🚚 Pre-filled fulfillment type from cart item:', item.fulfillmentType);
        }

        if (item.pickupDate) {
          const parsedPickupDate = new Date(item.pickupDate);
          if (!isNaN(parsedPickupDate.getTime())) {
            setPickupDate(parsedPickupDate);
            console.log('📅 Pre-filled pickup date from cart item:', parsedPickupDate);
          }
        }

        // Note: deliveryTime is not used in checkout modal, only on product page
        // The checkout page doesn't need to manage individual delivery times

        // If we found delivery info, stop looking
        if (item.orderDate || item.fulfillmentType) {
          break;
        }
      }
    }
  }, [showCheckoutModal, cart]);

  // Format phone number as user types: (XXX) XXX-XXXX
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10);

    // Format based on length
    if (limitedDigits.length === 0) return '';
    if (limitedDigits.length <= 3) return `(${limitedDigits}`;
    if (limitedDigits.length <= 6) return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setCustomerInfo(prev => ({ ...prev, phone: formatted }));
  };

  // Validate email format and domain
  const validateEmail = (email: string): { valid: boolean; error?: string } => {
    if (!email) return { valid: false, error: 'Email is required' };

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Please enter a valid email address' };
    }

    // Extract domain and TLD
    const parts = email.split('@');
    if (parts.length !== 2) return { valid: false, error: 'Invalid email format' };

    const domain = parts[1].toLowerCase();
    const tld = domain.split('.').pop() || '';

    // Valid TLDs (comprehensive list)
    const validTLDs = new Set([
      // Common
      'com', 'net', 'org', 'edu', 'gov', 'mil', 'io', 'co', 'me', 'tv', 'cc', 'biz', 'info',
      // Country codes
      'us', 'uk', 'ca', 'au', 'de', 'fr', 'es', 'it', 'nl', 'be', 'ch', 'at', 'mx', 'br',
      'in', 'jp', 'cn', 'kr', 'ru', 'pl', 'se', 'no', 'dk', 'fi', 'ie', 'nz', 'za', 'sg',
      'hk', 'tw', 'pt', 'gr', 'cz', 'hu', 'ro', 'bg', 'hr', 'sk', 'si', 'lt', 'lv', 'ee',
      'is', 'lu', 'mt', 'cy', 'ar', 'cl', 'pe', 've', 'ec', 'uy', 'py', 'bo', 'cr', 'pa',
      'gt', 'hn', 'sv', 'ni', 'do', 'pr', 'cu', 'jm', 'tt', 'bb', 'bs', 'ky', 'bm', 'vg',
      'ai', 'ag', 'dm', 'gd', 'kn', 'lc', 'vc', 'aw', 'cw', 'sx', 'bq', 'mf', 'bl', 'gp',
      'mq', 'gf', 'sr', 'gy', 'fk', 'pm', 'gl', 'fo', 'ax', 'sj', 'bv', 'gs', 'aq', 'tf',
      'id', 'my', 'th', 'vn', 'ph', 'pk', 'bd', 'lk', 'np', 'mm', 'kh', 'la', 'bn', 'tl',
      'mv', 'bt', 'mn', 'kz', 'uz', 'tm', 'kg', 'tj', 'af', 'ir', 'iq', 'sy', 'lb', 'jo',
      'ps', 'il', 'sa', 'ae', 'qa', 'kw', 'bh', 'om', 'ye', 'eg', 'ly', 'tn', 'dz', 'ma',
      'eh', 'mr', 'ml', 'sn', 'gm', 'gw', 'gn', 'sl', 'lr', 'ci', 'gh', 'tg', 'bj', 'ne',
      'bf', 'ng', 'cm', 'cf', 'td', 'sd', 'ss', 'et', 'er', 'dj', 'so', 'ke', 'ug', 'tz',
      'rw', 'bi', 'cd', 'cg', 'ga', 'gq', 'st', 'ao', 'zm', 'zw', 'mw', 'mz', 'mg', 'mu',
      're', 'yt', 'km', 'sc', 'na', 'bw', 'sz', 'ls', 'cv',
      // New gTLDs
      'xyz', 'online', 'store', 'shop', 'app', 'dev', 'tech', 'design', 'agency', 'email',
      'cloud', 'pro', 'live', 'world', 'site', 'website', 'space', 'fun', 'club', 'vip',
      'top', 'win', 'bid', 'trade', 'webcam', 'date', 'faith', 'review', 'party', 'science',
      'work', 'family', 'money', 'plus', 'gold', 'news', 'media', 'studio', 'digital',
      'marketing', 'social', 'network', 'company', 'business', 'enterprises', 'solutions',
      'services', 'support', 'systems', 'technology', 'software', 'computer', 'mobile',
      'phone', 'video', 'audio', 'music', 'movie', 'film', 'photo', 'gallery', 'art',
      'style', 'fashion', 'beauty', 'fitness', 'health', 'doctor', 'dental', 'hospital',
      'clinic', 'pharmacy', 'insurance', 'finance', 'bank', 'capital', 'fund', 'invest',
      'property', 'realty', 'estate', 'house', 'home', 'kitchen', 'garden', 'furniture',
      'auto', 'car', 'bike', 'taxi', 'travel', 'flights', 'hotel', 'holiday', 'vacation',
      'tours', 'cruise', 'casino', 'poker', 'bet', 'games', 'game', 'play', 'lol', 'wtf',
      'food', 'pizza', 'coffee', 'beer', 'wine', 'vodka', 'bar', 'pub', 'restaurant',
      'cafe', 'catering', 'recipes', 'organic', 'bio', 'eco', 'green', 'earth', 'solar',
      'energy', 'builders', 'construction', 'contractors', 'plumbing', 'heating', 'cooling',
      'flooring', 'glass', 'lighting', 'tools', 'equipment', 'supplies', 'parts', 'tires',
      'lawyer', 'legal', 'attorney', 'law', 'tax', 'accountant', 'consulting', 'coach',
      'training', 'education', 'school', 'university', 'college', 'academy', 'institute',
      'courses', 'degree', 'mba', 'kids', 'baby', 'toys', 'pet', 'dog', 'cat', 'vet',
      'flowers', 'gifts', 'cards', 'wedding', 'events', 'tickets', 'dating', 'singles',
      'adult', 'sex', 'xxx', 'porn', 'cam', 'chat', 'forum', 'blog', 'page', 'link',
      'click', 'download', 'stream', 'watch', 'show', 'radio', 'fm', 'tv', 'theater',
      'actor', 'band', 'fan', 'deals', 'discount', 'sale', 'bargains', 'coupons', 'promo',
      'free', 'cheap', 'express', 'direct', 'delivery', 'shipping', 'supply', 'market',
      'exchange', 'auction', 'buy', 'sell', 'rent', 'lease', 'jobs', 'career', 'work',
      'team', 'group', 'community', 'foundation', 'charity', 'church', 'faith', 'bible',
      'catholic', 'christmas', 'black', 'red', 'blue', 'pink', 'green', 'orange', 'gold',
      'silver', 'diamond', 'luxury', 'rich', 'vip', 'sexy', 'cool', 'best', 'top', 'one',
      'zone', 'center', 'city', 'town', 'country', 'state', 'place', 'land', 'world',
      'global', 'international', 'asia', 'africa', 'americas', 'europe', 'paris', 'london',
      'nyc', 'la', 'vegas', 'miami', 'amsterdam', 'berlin', 'tokyo', 'moscow', 'dubai',
      'sydney', 'melbourne', 'aero', 'asia', 'cat', 'coop', 'jobs', 'mobi', 'museum',
      'name', 'post', 'tel', 'travel', 'nato', 'arpa', 'int', 'local', 'onion', 'test'
    ]);

    // Check for common typos of popular TLDs
    const typoTLDs: { [key: string]: string } = {
      'cmo': 'com', 'ocm': 'com', 'vom': 'com', 'con': 'com', 'comm': 'com', 'cpm': 'com',
      'nte': 'net', 'ent': 'net', 'nett': 'net',
      'ogr': 'org', 'rog': 'org', 'orgg': 'org',
      'cvm': 'com', 'cim': 'com', 'xom': 'com', 'cm': 'com', 'om': 'com',
      'gmal': 'gmail', 'gmial': 'gmail', 'gmil': 'gmail',
      'edi': 'edu', 'eud': 'edu',
      'oi': 'io', 'gio': 'io'
    };

    if (typoTLDs[tld]) {
      return { valid: false, error: `Did you mean .${typoTLDs[tld]}?` };
    }

    // TLD must be at least 2 characters
    if (tld.length < 2) {
      return { valid: false, error: 'Please enter a valid email domain' };
    }

    // TLD must be in the valid list
    if (!validTLDs.has(tld)) {
      return { valid: false, error: 'Please enter a valid email domain' };
    }

    return { valid: true };
  };

  const fetchUnavailableDates = async () => {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // Next 3 months

      const response = await fetch(
        `/api/available-dates?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();

      if (data.unavailableDates) {
        // Convert date strings to Date objects
        const dates = data.unavailableDates.map((dateStr: string) => new Date(dateStr + 'T00:00:00'));
        setUnavailableDates(dates);
      }
    } catch (error) {
      console.error('Error fetching unavailable dates:', error);
    }
  };

  const handleCheckoutClick = () => {
    setShowCheckoutModal(true);
  };

  // Reset pickup date when baking date changes
  useEffect(() => {
    if (orderDate && pickupDate) {
      // Check if pickup date is still valid (within 7 days of new baking date)
      const daysDiff = Math.floor((pickupDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 0 || daysDiff > 7) {
        setPickupDate(null);
      }
    }
  }, [orderDate]);

  const handleConfirmCheckout = async () => {
    // Check if cart items have required date/time information
    if (cart.length === 0) {
      setCheckoutError('Your cart is empty');
      return;
    }

    const firstItem = cart[0];
    if (!firstItem.fulfillmentType) {
      setCheckoutError('Please select delivery or pickup from the product page');
      return;
    }

    if (!firstItem.pickupDate) {
      setCheckoutError(`Please select a ${firstItem.fulfillmentType === 'delivery' ? 'delivery' : 'pickup'} date from the product page`);
      return;
    }

    if (firstItem.fulfillmentType === 'delivery' && !firstItem.deliveryTime) {
      setCheckoutError('Please select a delivery time from the product page');
      return;
    }

    if (firstItem.fulfillmentType === 'pickup' && !firstItem.pickupTime) {
      setCheckoutError('Please select a pickup time from the product page');
      return;
    }

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      setCheckoutError('Please provide your name, email, and phone number');
      return;
    }

    // Validate email format and domain
    const emailValidation = validateEmail(customerInfo.email);
    if (!emailValidation.valid) {
      setCheckoutError(emailValidation.error || 'Please enter a valid email address');
      return;
    }

    // Validate phone number format (must contain at least 10 digits)
    const phoneDigits = customerInfo.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setCheckoutError('Please enter a valid phone number with at least 10 digits');
      return;
    }

    setIsProcessing(true);
    setCheckoutError('');

    try {
      // Store customer info and order date in sessionStorage for instant display after payment
      const firstItem = cart[0];
      const pickupDateFormatted = new Date(firstItem.pickupDate!).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      const timeSlot = firstItem.fulfillmentType === 'delivery'
        ? firstItem.deliveryTime
        : firstItem.pickupTime;

      sessionStorage.setItem('pendingOrderInfo', JSON.stringify({
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        orderDate: `${pickupDateFormatted}${timeSlot ? ` at ${timeSlot}` : ''}`,
        fulfillmentType: firstItem.fulfillmentType,
        deliveryFee: firstItem.fulfillmentType === 'delivery' ? DELIVERY_FEE : 0
      }));

      // Cart items already have fulfillmentType, pickupDate, deliveryTime, pickupTime
      // No need to add to design notes since we have dedicated fields
      const cartItemsWithDate = cart;

      console.log('🛒 Creating Stripe checkout session with:', {
        customerInfo,
        cartItems: cartItemsWithDate,
        fulfillmentType: firstItem.fulfillmentType,
        pickupDate: firstItem.pickupDate,
        timeSlot: timeSlot,
        deliveryFee: firstItem.fulfillmentType === 'delivery' ? DELIVERY_FEE : 0
      });

      // Track checkout started (including delivery fee and discount if applicable)
      const totalWithDeliveryAndDiscount = firstItem.fulfillmentType === 'delivery'
        ? (cartTotalWithDiscount + DELIVERY_FEE) * 1.0825
        : cartTotalWithDiscount * 1.0825;
      trackCheckoutStarted(totalWithDeliveryAndDiscount, cart.reduce((count, item) => count + item.quantity, 0));

      // Create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerInfo,
          cartItems: cartItemsWithDate,
          fulfillmentType: firstItem.fulfillmentType,
          deliveryFee: firstItem.fulfillmentType === 'delivery' ? DELIVERY_FEE : 0,
          discountCode: discountCode ? {
            code: discountCode.code,
            percentage: discountCode.percentage,
            amount: discountAmount
          } : null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      console.log('✅ Checkout session created, redirecting to Stripe...');

      // Redirect to Stripe Checkout using the URL
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error) {
      console.error('Checkout error:', error);
      setCheckoutError(error instanceof Error ? error.message : 'Checkout failed');
      setIsProcessing(false);
    }
  };

  if (cart.length === 0 && !orderSuccess) {
    return (
      <div className="min-h-screen bg-creamWhite">
        {/* Empty Cart */}
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="mb-8">
            <img
              src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png"
              alt="Angel with cupcake"
              className="mx-auto drop-shadow-xl w-[200px] h-[200px]"
            />
          </div>
          <h1 className="font-playfair text-5xl font-bold text-deepBurgundy mb-4">
            Your Cart is Empty
          </h1>
          <p className="font-cormorant text-xl text-deepBurgundy/80 mb-8">
            Start adding some divine confections to your cart!
          </p>
          <Link
            href="/cakes#catalog"
            className="inline-block bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-xl px-10 py-4 rounded-full transition-all duration-300 transform hover:scale-105 baroque-shadow"
          >
            Browse Cakes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-creamWhite overflow-x-hidden">
      {/* Cart Content - only show if there are items */}
      {cart.length > 0 && (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="font-playfair text-5xl font-bold text-deepBurgundy mb-8">
          Your Cart
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cart.map((item, index) => {
              // Match product by name from database
              const product = dbProducts.find(p => p.name === item.name);

              // Extract shape from design notes
              const shapeMatch = item.designNotes?.match(/Shape:\s*(\w+)/i);
              const shape = shapeMatch ? shapeMatch[1].toLowerCase() : null;
              const flavor = item.flavor?.toLowerCase();

              // Map flavor + shape to images
              const getFlavorImage = () => {
                // Check if a design variant was selected - if so, use the saved item image
                // (which contains the correct variant image from addToCart)
                const designMatch = item.designNotes?.match(/Design:\s*Design\s*\d+/i);
                if (designMatch && item.image) {
                  return item.image;
                }

                // Check if a color variant was selected - if so, use the saved item image
                // (which contains the correct color variant image from addToCart)
                const colorMatch = item.designNotes?.match(/Color:\s*.+/i);
                if (colorMatch && item.image) {
                  return item.image;
                }

                // For signature cakes, use the product image from database
                if (product && product.media && product.media.length > 0) {
                  const imageMedia = product.media.find((m: any) => m.type === 'image');
                  if (imageMedia?.url) return imageMedia.url;
                }

                // For custom cakes (heart/circle), use flavor-based images
                if (!flavor || !shape) return item.image;

                if (shape === 'heart') {
                  const heartFlavorImages: { [key: string]: string } = {
                    'chocolate': 'https://kassy.b-cdn.net/cakeicons/chocolate_cake.webp',
                    'funfetti': 'https://kassy.b-cdn.net/cakeicons/funfetti_cake_heartx.webp',
                    'lemon': 'https://kassy.b-cdn.net/cakeicons/lemonsize.webp',
                    'red velvet': 'https://kassy.b-cdn.net/cakeicons/redvel.webp',
                    'strawberry': 'https://kassy.b-cdn.net/cakeicons/strawberry_cake.webp',
                    'vanilla': 'https://kassycakes.b-cdn.net/heart.webp'
                  };
                  return heartFlavorImages[flavor] || item.image;
                } else if (shape === 'circle') {
                  const circleFlavorImages: { [key: string]: string } = {
                    'chocolate': 'https://kassy.b-cdn.net/cakeicons/chocolate_cake_circle.webp',
                    'funfetti': 'https://kassy.b-cdn.net/cakeicons/funfetti_cake_circle.webp',
                    'lemon': 'https://kassy.b-cdn.net/cakeicons/lemon_cake_circle.webp',
                    'red velvet': 'https://kassy.b-cdn.net/cakeicons/redvelvet_cake_circle.webp',
                    'strawberry': 'https://kassy.b-cdn.net/cakeicons/Strawberry_cake_circle.webp',
                    'vanilla': 'https://kassycakes.b-cdn.net/circle.webp'
                  };
                  return circleFlavorImages[flavor] || item.image;
                }

                return item.image;
              };

              const displayImage = getFlavorImage();

              return (
              <div
                key={`${item.id || 'unknown'}-${item.size || 'nosize'}-${index}`}
                className="bg-white rounded-lg p-4 sm:p-6 baroque-shadow"
              >
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  {/* Image */}
                  <div className="w-32 h-32 relative flex-shrink-0 ornamental-border rounded overflow-hidden bg-white">
                    {isLoadingProducts ? (
                      <div className="w-full h-full bg-pink-50 animate-pulse flex items-center justify-center">
                        <svg className="w-8 h-8 text-kassyPink/30" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                    ) : (
                      <img
                        src={displayImage}
                        alt={item.name}
                        className="object-cover w-full h-full"
                      />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    {item.slug ? (
                      <Link
                        href={`/cakes/${item.slug}`}
                        className="font-playfair text-2xl font-bold text-deepBurgundy hover:text-kassyPink transition-colors"
                      >
                        {item.name.replace(/^\d+[""]\s*/, '')}
                      </Link>
                    ) : (
                      <h3 className="font-playfair text-2xl font-bold text-deepBurgundy">
                        {item.name.replace(/^\d+[""]\s*/, '')}
                      </h3>
                    )}

                    {/* Compact Design Info */}
                    {item.designNotes && (
                      <div className="mt-3 bg-creamWhite rounded-lg p-3 border-l-4 border-kassyPink">
                        <p className="font-semibold text-deepBurgundy text-sm mb-2">Design Notes:</p>
                        <div className="text-sm text-deepBurgundy/80 whitespace-pre-line">
                          {item.designNotes.split('\n').map((line, lineIndex) => {
                            // Check if this line contains a color selection
                            const colorMatch = line.match(/^Color:\s*(.+)$/i);
                            if (colorMatch) {
                              const colorName = colorMatch[1].trim();
                              // Find the hex color from product's colorVariants
                              const colorVariant = product?.colorVariants?.find(
                                (cv: any) => cv.name.toLowerCase() === colorName.toLowerCase()
                              );
                              const hexColor = colorVariant?.color || null;

                              // Show "Color:" followed by the color square
                              if (hexColor) {
                                return (
                                  <div key={lineIndex} className="flex items-center gap-2">
                                    <span>Color:</span>
                                    <span
                                      className="inline-block w-5 h-5 rounded border-2 border-deepBurgundy/20 shadow-sm"
                                      style={{ backgroundColor: hexColor }}
                                      title={colorName}
                                    />
                                  </div>
                                );
                              }
                              // If no hex color found, skip the line entirely
                              return null;
                            }
                            return <div key={lineIndex}>{line}</div>;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Delivery/Pickup Info */}
                    {(item.fulfillmentType || item.pickupDate) && (
                      <div className="mt-3 bg-baroqueGold/10 rounded-lg p-3 border-l-4 border-baroqueGold">
                        <p className="font-semibold text-deepBurgundy text-sm mb-2">
                          {item.fulfillmentType === 'delivery' ? '📦 Delivery' : '🎂 Pickup'}
                        </p>
                        <div className="text-sm text-deepBurgundy/80 space-y-1">
                          {item.pickupDate && (
                            <p>
                              <span className="font-medium">
                                {item.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'} Date:
                              </span>{' '}
                              {new Date(item.pickupDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          )}
                          {item.fulfillmentType === 'delivery' && item.deliveryTime && (
                            <p>
                              <span className="font-medium">Time:</span> {item.deliveryTime}
                            </p>
                          )}
                          {item.fulfillmentType === 'pickup' && item.pickupTime && (
                            <p>
                              <span className="font-medium">Time:</span> {item.pickupTime}
                            </p>
                          )}
                          {item.fulfillmentType === 'delivery' && item.deliveryAddress && (
                            <p className="mt-2">
                              <span className="font-medium">Address:</span>{' '}
                              {item.deliveryAddress.fullAddress}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Edible Printed Image */}
                    {item.edibleImageUrl && (
                      <div className="mt-3 bg-pink-50 rounded-lg p-3 border-2 border-pink-200">
                        <p className="font-semibold text-deepBurgundy text-sm mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-kassyPink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Edible Printed Image
                        </p>
                        <img
                          src={item.edibleImageUrl}
                          alt="Customer's edible image"
                          className="w-full max-w-[180px] rounded-lg border-2 border-white shadow-md"
                        />
                      </div>
                    )}

                    {/* Reference Image/Video or Edible Photo */}
                    {item.referenceImageUrl && (
                      <div className={`mt-3 rounded-lg p-3 border-2 ${item.isEditablePhoto ? 'bg-kassyPink/10 border-kassyPink/30' : 'bg-baroqueGold/10 border-baroqueGold/30'}`}>
                        <p className="font-semibold text-deepBurgundy text-sm mb-2 flex items-center gap-2">
                          <svg className={`w-4 h-4 ${item.isEditablePhoto ? 'text-kassyPink' : 'text-baroqueGold'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {item.isEditablePhoto ? 'Your Photo for Cake' : 'Reference Photo'}
                        </p>
                        {item.referenceImageUrl.match(/\.(mp4|webm|mov)$/i) ? (
                          <video
                            src={item.referenceImageUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full max-w-[180px] rounded-lg border-2 border-white shadow-md"
                          />
                        ) : (
                          <img
                            src={item.referenceImageUrl}
                            alt={item.isEditablePhoto ? "Your photo for cake" : "Reference photo"}
                            className="w-full max-w-[180px] rounded-lg border-2 border-white shadow-md"
                          />
                        )}
                      </div>
                    )}

                    {/* Add-ons with Images */}
                    {item.addOns && item.addOns.length > 0 && (
                      <div className="mt-3">
                        <p className="font-semibold text-deepBurgundy text-sm mb-2">Add-ons:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(() => {
                            // Fallback images for add-ons not from database
                            const fallbackImages: { [key: string]: string } = {
                              'cherries': 'https://kassy.b-cdn.net/KassyCakeIcons/Cherries.webp',
                              'glitter-cherries': 'https://kassy.b-cdn.net/cakeicons/Glitter%20Cherries.webp',
                              'candy-pearls': 'https://kassy.b-cdn.net/KassyCakeIcons/Candy%20Pearls.webp',
                              'bows': 'https://kassy.b-cdn.net/menuicons/addons-icons/bows.png',
                              'edible-butterflies': 'https://kassy.b-cdn.net/menuicons/addons-icons/editble%20butterflys.jpg',
                              'fresh-florals': 'https://kassy.b-cdn.net/KassyCakeIcons/Fresh%20florals.webp',
                              'frosting-animals': 'https://kassy.b-cdn.net/KassyCakeIcons/frostinganimals.webp',
                              'white-chocolate': 'https://kassy.b-cdn.net/KassyCakeIcons/whitechoclate.webp',
                              'gold': 'https://kassy.b-cdn.net/KassyCakeIcons/Gold.webp',
                              'chrome': 'https://kassy.b-cdn.net/KassyCakeIcons/chrome.webp',
                              '2d-character': 'https://kassy.b-cdn.net/KassyCakeIcons/2d%20character.webp',
                              'disco-balls': 'https://kassy.b-cdn.net/KassyCakeIcons/discoballs.webp',
                              'cowboy-hat': 'https://kassy.b-cdn.net/KassyCakeIcons/miniature%20cowboy%20hats.webp'
                            };

                            return item.addOns.filter(addOn => addOn.id !== 'edible-image').map((addOn) => {
                              // Use database image if available, otherwise fallback
                              const addOnImage = addOn.image || fallbackImages[addOn.id];
                              return (
                                <div key={addOn.id} className="bg-white rounded-lg p-2 border border-deepBurgundy/10 flex items-center gap-2">
                                  {addOnImage && (
                                    <img
                                      src={addOnImage}
                                      alt={addOn.name}
                                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-deepBurgundy truncate">{addOn.name}</p>
                                    <p className="text-xs font-semibold text-kassyPink">+${addOn.price}</p>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Price Summary & Remove */}
                    <div className="mt-3 pt-3 border-t border-deepBurgundy/10 flex items-center justify-between">
                      <p className="font-playfair text-lg font-semibold text-deepBurgundy">
                        ${item.price} base {item.addOns && item.addOns.length > 0 && (
                          <span className="text-kassyPink">+ ${item.addOns.reduce((sum, a) => sum + a.price, 0)} add-ons</span>
                        )}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.id, item.size || "", item.designNotes)}
                        className="font-cormorant text-red-600 hover:text-red-800 underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="text-left sm:text-right sm:ml-auto">
                    <p className="font-playfair text-2xl font-bold text-deepBurgundy">
                      ${((item.price + (item.addOns?.reduce((sum, a) => sum + a.price, 0) || 0)) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              );
            })}

            <button
              onClick={clearCart}
              className="font-cormorant text-red-600 hover:text-red-800 underline"
            >
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 baroque-shadow sticky top-8">
              <h2 className="font-playfair text-3xl font-bold text-deepBurgundy mb-6">
                Order Summary
              </h2>

              {/* Discount Code Input */}
              <div className="mb-6 pb-6 border-b border-baroqueGold/20">
                <label className="block font-cormorant text-sm font-semibold text-deepBurgundy mb-2">
                  Discount Code
                </label>
                {discountCode ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                        <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42z"/>
                        <circle cx="6.5" cy="6.5" r="1.5"/>
                      </svg>
                      <span className="font-semibold text-green-700">{discountCode.code}</span>
                      <span className="text-green-600">({discountCode.percentage}% off)</span>
                    </div>
                    <button
                      onClick={removeDiscountCode}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Remove discount code"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountInput}
                      onChange={(e) => {
                        setDiscountInput(e.target.value);
                        setDiscountError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 border border-deepBurgundy/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-kassyPink/50 font-cormorant text-deepBurgundy"
                    />
                    <button
                      onClick={handleApplyDiscount}
                      disabled={isApplyingDiscount}
                      className="px-4 py-2 bg-deepBurgundy text-white rounded-lg hover:bg-deepBurgundy/80 transition-colors font-cormorant font-semibold disabled:opacity-50"
                    >
                      {isApplyingDiscount ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
                {discountError && (
                  <p className="text-red-500 text-sm mt-2 font-cormorant">{discountError}</p>
                )}
              </div>

              <div className="space-y-3 mb-6 font-cormorant text-lg">
                <div className="flex justify-between">
                  <span className="text-deepBurgundy/80">Subtotal</span>
                  <span className="font-semibold text-deepBurgundy">
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>
                {discountCode && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discountCode.percentage}%)</span>
                    <span className="font-semibold">
                      -${discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-deepBurgundy/80">Tax (8.25%)</span>
                  <span className="font-semibold text-deepBurgundy">
                    ${(cartTotalWithDiscount * 0.0825).toFixed(2)}
                  </span>
                </div>
                <div className="border-t-2 border-baroqueGold pt-3 flex justify-between">
                  <span className="font-playfair text-xl font-bold text-deepBurgundy">
                    Total
                  </span>
                  <span className="font-playfair text-xl font-bold text-kassyPink">
                    ${(cartTotalWithDiscount * 1.0825).toFixed(2)}
                  </span>
                </div>

                {/* Pay in 4 / Monthly messaging */}
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-3 mt-3 border border-pink-100">
                  <p className="text-sm text-deepBurgundy/80 text-center">
                    As low as <span className="font-bold text-kassyPink">${((cartTotalWithDiscount * 1.0825) / 12).toFixed(2)}/mo</span> or{' '}
                    <span className="font-semibold text-deepBurgundy">4 interest-free payments</span> of{' '}
                    <span className="font-bold text-kassyPink">${((cartTotalWithDiscount * 1.0825) / 4).toFixed(2)}</span>
                  </p>
                  <div className="flex items-center justify-center mt-2">
                    <img
                      src="https://kassy.b-cdn.net/klarna2.png"
                      alt="Klarna"
                      className="h-6"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCheckoutClick}
                  className="block w-full bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-lg text-center px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 baroque-shadow"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Customer Info Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="font-playfair text-2xl font-bold text-deepBurgundy mb-4">
              Order Details
            </h2>

            {checkoutError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {checkoutError}
              </div>
            )}

            {/* Show selected fulfillment info from cart */}
            {cart.length > 0 && cart[0].fulfillmentType && (
              <div className="mb-4 bg-baroqueGold/10 rounded-lg p-4 border-l-4 border-baroqueGold">
                <p className="font-playfair font-semibold text-deepBurgundy mb-2">
                  {cart[0].fulfillmentType === 'delivery' ? '📦 Delivery' : '🎂 Pickup'}
                </p>
                <div className="text-sm text-deepBurgundy/80 space-y-1">
                  {cart[0].pickupDate && (
                    <p>
                      <span className="font-medium">
                        {cart[0].fulfillmentType === 'delivery' ? 'Delivery Date:' : 'Pickup Date:'}
                      </span>{' '}
                      {new Date(cart[0].pickupDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                  {cart[0].fulfillmentType === 'delivery' && cart[0].deliveryTime && (
                    <p>
                      <span className="font-medium">Time:</span> {cart[0].deliveryTime}
                    </p>
                  )}
                  {cart[0].fulfillmentType === 'pickup' && cart[0].pickupTime && (
                    <p>
                      <span className="font-medium">Time:</span> {cart[0].pickupTime}
                    </p>
                  )}
                  {cart[0].fulfillmentType === 'delivery' && (
                    <p className="text-xs text-deepBurgundy/60 mt-1">
                      $40 delivery fee
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4 mb-4">
              <div>
                <label className="block font-cormorant text-sm text-deepBurgundy mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-base"
                  placeholder="Your full name"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="block font-cormorant text-sm text-deepBurgundy mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value.slice(0, 100) }))}
                  className="w-full px-3 py-2 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-base"
                  placeholder="your@email.com"
                  disabled={isProcessing}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block font-cormorant text-sm text-deepBurgundy mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={handlePhoneChange}
                  className="w-full px-3 py-2 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-base"
                  placeholder="(512) 777-5555"
                  disabled={isProcessing}
                  maxLength={14}
                  required
                />
              </div>
            </div>

            {/* Order Total Breakdown */}
            <div className="bg-baroqueGold/10 rounded-lg p-4 space-y-2 font-cormorant">
              <div className="flex justify-between text-deepBurgundy/80">
                <span>Subtotal:</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              {discountCode && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discountCode.code} - {discountCode.percentage}%):</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              {fulfillmentType === 'delivery' && (
                <div className="flex justify-between text-deepBurgundy/80">
                  <span>Delivery Fee:</span>
                  <span>${DELIVERY_FEE.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-deepBurgundy/80">
                <span>Tax (8.25%):</span>
                <span>${((fulfillmentType === 'delivery' ? cartTotalWithDiscount + DELIVERY_FEE : cartTotalWithDiscount) * 0.0825).toFixed(2)}</span>
              </div>
              <div className="border-t border-baroqueGold pt-2 flex justify-between font-playfair text-lg font-bold text-deepBurgundy">
                <span>Total:</span>
                <span className="text-kassyPink">
                  ${((fulfillmentType === 'delivery' ? cartTotalWithDiscount + DELIVERY_FEE : cartTotalWithDiscount) * 1.0825).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleConfirmCheckout}
                disabled={isProcessing}
                className="w-full bg-kassyPink hover:bg-baroqueGold disabled:bg-gray-300 text-white font-playfair px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105"
              >
                {isProcessing ? 'Redirecting to Stripe...' : 'Proceed to Payment'}
              </button>
              <p className="text-center font-cormorant text-xs text-deepBurgundy/60">
                You'll be redirected to secure Stripe checkout
              </p>
            </div>

            {!isProcessing && (
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="w-full mt-2 text-deepBurgundy/60 hover:text-deepBurgundy font-cormorant text-sm transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-lg max-w-md w-full p-8 text-center animate-scale-in">
            <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <img
                src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png"
                alt="Success"
                className="mx-auto drop-shadow-xl w-[150px] h-[150px]"
              />
            </div>
            <h2 className="font-playfair text-3xl font-bold text-deepBurgundy mb-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Payment complete.
            </h2>
            <p className="font-cormorant text-xl text-deepBurgundy/80 mb-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              Thank you{customerInfo.name ? `, ${customerInfo.name}` : ''}!
            </p>
            <div className="animate-fade-in-up min-h-[80px]" style={{ animationDelay: '0.4s' }}>
              <p className="font-cormorant text-base text-deepBurgundy/70 mb-2">
                Your order has been confirmed. You'll receive an email shortly with your order details{completedOrderDate && ' and pickup/delivery date'}.
              </p>
              <p className="font-cormorant text-lg text-kassyPink font-semibold mb-6 h-[28px]">
                {completedOrderDate || '\u00A0'}
              </p>
            </div>
            <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <Link
                href="/kassycakes/orders"
                onClick={() => {
                  clearCart();
                  setOrderSuccess(false);
                }}
                className="block w-full bg-baroqueGold hover:bg-baroqueGold/90 text-white font-playfair text-lg px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105"
              >
                View My Orders
              </Link>
              <Link
                href="/cakes"
                onClick={() => {
                  clearCart();
                  setOrderSuccess(false);
                }}
                className="block w-full bg-kassyPink hover:bg-kassyPink/90 text-white font-playfair text-lg px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105"
              >
                Order More Cakes
              </Link>
              <Link
                href="/"
                onClick={() => {
                  clearCart();
                  setOrderSuccess(false);
                }}
                className="block w-full bg-white border-2 border-deepBurgundy/20 hover:border-kassyPink text-deepBurgundy font-playfair text-lg px-8 py-4 rounded-full transition-all duration-300"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
