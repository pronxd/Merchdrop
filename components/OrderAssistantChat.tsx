"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { getProductById, addOns } from "@/lib/products";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  productId?: string; // For displaying product cards (single) - MongoDB ObjectId
  productIds?: string[]; // For displaying multiple product cards - MongoDB ObjectIds
  productData?: any[]; // Full product objects from database
  images?: string[]; // For displaying images sent by Kassy
  quickActions?: QuickAction[]; // Clickable action buttons
  orderData?: OrderLookupData; // For displaying order information
}

interface QuickAction {
  label: string;
  action: string;
  icon?: string;
}

interface OrderLookupData {
  orderNumber: string;
  status: string;
  orderDate: string;
  pickupDate?: string;
  pickupTime?: string;
  deliveryTime?: string;
  fulfillmentType: string;
  customerName: string;
  cakeName: string;
  canModify: boolean;
  maxPushDays: number;
}

interface OrderDetails {
  name: string;
  email: string;
  summary: string;
}

interface OrderAssistantChatProps {
  selectedProduct?: any;
  onClose: () => void;
  isMessengerStyle?: boolean;
  onSelectAddOns?: (addOnIds: string[]) => void;
  initialDesignNotes?: string;
  isLikePicture?: boolean;
  onChatUpdate?: (messages: any[]) => void;
  onCheckout?: () => void;
  alwaysFresh?: boolean; // If true, always start with a fresh chat (ignore localStorage)
  userSelectedSize?: string; // The size the user actually selected (may differ from product name)
  onAddToCart?: (productId?: number | string, size?: string, flavor?: string, dateString?: string) => void; // Callback to add product to cart
  referenceImageUrl?: string | null; // URL of uploaded reference photo
  isVisible?: boolean; // Controls visibility without unmounting
}

export default function OrderAssistantChat({
  selectedProduct,
  onClose,
  isMessengerStyle = false,
  onSelectAddOns,
  initialDesignNotes,
  isLikePicture = false,
  onChatUpdate,
  onCheckout,
  alwaysFresh = false,
  userSelectedSize,
  onAddToCart,
  referenceImageUrl,
  isVisible = true
}: OrderAssistantChatProps) {
  // Helper to clean product name (remove size prefixes)
  const getCleanProductName = (name: string) => {
    // Remove size prefixes like 6", 8", 4" from the beginning of product names
    let cleanName = name.replace(/^[468]"\s*/, '');
    // Remove size patterns in parentheses like (6"+4")
    cleanName = cleanName.replace(/\([468]"\+[468]"\)\s*/g, '');
    return cleanName;
  };

  // Generate initial message based on context
  const getInitialMessage = () => {
    if (selectedProduct && isMessengerStyle) {
      const cleanName = getCleanProductName(selectedProduct.name);
      // If reference photo was uploaded
      if (referenceImageUrl) {
        return `Hey! I see you've selected the ${cleanName} and uploaded a reference photo! 📸 Perfect! I can see your inspiration. Would you like me to recreate this design, or would you like to make some changes to it?`;
      }
      // If "I want this exact design" is checked
      else if (isLikePicture) {
        return `Hey! I see you've selected the ${cleanName} and want this exact design from the photo! 😊 Perfect choice! Would you like to order it exactly as shown, or would you like to change anything about it?`;
      }
      // If custom notes provided (but not "exact design")
      else if (initialDesignNotes) {
        return `Hey! I see you've got the ${cleanName} and some design ideas! 🎂 Let me take a look at what you're thinking... "${initialDesignNotes}"\n\nThis sounds beautiful! Want to talk through any details or add-ons?`;
      }
      // No design notes at all
      else {
        return `Hey I see you've selected the ${cleanName} cake, you can Order it as shown in the photo, or customize it to your vision. What are you thinking?`;
      }
    } else if (selectedProduct) {
      const cleanName = getCleanProductName(selectedProduct.name);
      // For all cakes
      return `Hi! I see you're checking out the ${cleanName}. You can order it exactly as shown OR customize the colors, details, and add-ons. What's the occasion?`;
    } else {
      return `Hi there! So excited to help you design your dream cake! 🎂

I can help you:
• Browse our catalog and find the perfect cake
• Design a completely custom cake from scratch
• Choose sizes, flavors, colors, and designs
• Answer any questions about pricing and capabilities

Tell me about your special occasion! What kind of cake are you looking for?`;
    }
  };

  const getInitialQuickActions = (): QuickAction[] | undefined => {
    if (!selectedProduct) {
      return [
        { label: 'Browse Catalog', action: 'browse_catalog', icon: '🎂' },
        { label: 'Custom Cake', action: 'custom_cake', icon: '✨' },
        { label: 'Check My Order', action: 'check_order', icon: '📋' },
        { label: 'Pricing Info', action: 'pricing_info', icon: '💰' }
      ];
    }
    return undefined;
  };

  const initialMessage: Message = {
    role: 'assistant' as const,
    content: getInitialMessage(),
    quickActions: getInitialQuickActions()
  };

  // Determine localStorage key based on context
  const getStorageKey = () => {
    if (selectedProduct) {
      return `kassycakes-chat-messages-product-${selectedProduct.id}`;
    }
    return 'kassycakes-chat-messages';
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    // If alwaysFresh is true, skip localStorage and start fresh
    if (alwaysFresh) {
      return [initialMessage];
    }

    // Load messages from localStorage on mount
    if (typeof window !== 'undefined') {
      const storageKey = getStorageKey();
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          // Clean up any markers from saved messages
          const cleanedMessages = parsed.map((msg: Message, index: number) => {
            const cleanedMsg = {
              ...msg,
              content: msg.content
                .replace('[READY_TO_BAKE]', '')
                .replace(/\[SHOW_PRODUCT:[a-zA-Z0-9\-]+\]/g, '')
                .replace(/\[SELECT_ADDONS:[\w\-,]+\]/, '')
                .trim()
            };
            // Restore quick actions to the first message if it's the greeting
            if (index === 0 && msg.role === 'assistant' && msg.content.includes('So excited to help you design your dream cake')) {
              cleanedMsg.quickActions = getInitialQuickActions();
            }
            return cleanedMsg;
          });
          return cleanedMessages;
        } catch (e) {
          return [initialMessage];
        }
      }
    }
    return [initialMessage];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const MAX_MESSAGE_LENGTH = 500;
  const [showForm, setShowForm] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    name: '',
    email: '',
    summary: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showReadyToBake, setShowReadyToBake] = useState(() => {
    // Check if loaded messages already had the ready to bake signal
    if (typeof window !== 'undefined') {
      const storageKey = getStorageKey();
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          return parsed.some((msg: Message) => msg.content.includes('[READY_TO_BAKE]'));
        } catch (e) {
          return false;
        }
      }
    }
    return false;
  });

  const [dateConfirmed, setDateConfirmed] = useState(() => {
    // Check if loaded messages already had items added to cart (date confirmed)
    if (typeof window !== 'undefined') {
      const storageKey = getStorageKey();
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          return parsed.some((msg: Message) => msg.content.includes('[ADD_TO_CART]'));
        } catch (e) {
          return false;
        }
      }
    }
    return false;
  });
  const [showNewOrderConfirm, setShowNewOrderConfirm] = useState(false);
  const [showOrderLookup, setShowOrderLookup] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [currentOrderData, setCurrentOrderData] = useState<OrderLookupData | null>(null);

  // Generate session ID once and persist
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('kassycakes-session-id');
      if (!id) {
        id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('kassycakes-session-id', id);
      }
      return id;
    }
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasPlayedBakeSound = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track the currently displayed product for vision context
  const [displayedProduct, setDisplayedProduct] = useState<any>(null);

  // Set hasMounted to true after component mounts to prevent hydration mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Save messages to localStorage whenever they change (unless alwaysFresh is true)
  useEffect(() => {
    if (typeof window !== 'undefined' && !alwaysFresh) {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
    // Also update parent component if callback provided
    if (onChatUpdate) {
      onChatUpdate(messages);
    }
  }, [messages, onChatUpdate, alwaysFresh]);

  // Prevent background scrolling when chat is open (only for full-screen mode)
  useEffect(() => {
    if (!isMessengerStyle) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isMessengerStyle]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Only auto-scroll if user is already near the bottom
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Reset iOS Safari zoom after sending
    setTimeout(() => {
      window.scrollTo(0, window.scrollY);
      if (document.body.style.zoom) document.body.style.zoom = '1';
      // Also try resetting visual viewport for iOS
      if (window.visualViewport) {
        window.scrollTo(0, window.scrollY);
      }
    }, 150);

    // Play sent sound
    const sentSound = new Audio('https://kassycakes.b-cdn.net/assets/sent.MP3');
    sentSound.play().catch(e => console.log('Audio play failed:', e));

    // Add user message
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    // Scroll to user's message immediately
    setTimeout(() => scrollToBottom(), 100);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          sessionId: sessionId,
          productContext: selectedProduct ? {
            id: selectedProduct.id,
            name: getCleanProductName(selectedProduct.name),
            price: selectedProduct.price,
            category: selectedProduct.category,
            duration: selectedProduct.duration,
            image: selectedProduct.image,
            designNotes: initialDesignNotes,
            isLikePicture: isLikePicture,
            buyNowOnly: selectedProduct.buyNowOnly,
            userSelectedSize: userSelectedSize
          } : displayedProduct ? {
            id: displayedProduct.id,
            name: getCleanProductName(displayedProduct.name),
            price: displayedProduct.price,
            category: displayedProduct.category,
            duration: displayedProduct.duration,
            image: displayedProduct.image,
            designNotes: null,
            isLikePicture: false,
            buyNowOnly: displayedProduct.buyNowOnly
          } : null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to get response';

        // Display error as a chat message instead of throwing (avoids Next.js error overlay)
        setMessages([...newMessages, {
          role: 'assistant',
          content: errorMessage
        }]);

        // Play received sound for the error message
        const receivedSound = new Audio('https://kassycakes.b-cdn.net/assets/gotmail.MP3');
        receivedSound.play().catch(e => console.log('Audio play failed:', e));

        setIsLoading(false);
        return;
      }

      const data = await response.json();
      let assistantMessage = data.choices[0].message.content;
      let productId: string | undefined;
      let productIds: string[] | undefined;
      let images: string[] = [];

      // Check if AI is sending images (like selfies)
      const imageMatches = assistantMessage.matchAll(/\[IMAGE:(https?:\/\/[^\]]+)\]/g);
      for (const match of imageMatches) {
        images.push(match[1]);
      }
      // Remove image markers from the message
      assistantMessage = assistantMessage.replace(/\[IMAGE:https?:\/\/[^\]]+\]/g, '').trim();

      // Check if AI is showing multiple products (for variants like Betty Boop)
      // Updated regex to capture MongoDB ObjectId strings and slugs (alphanumeric + hyphens)
      const allProductMatches = assistantMessage.matchAll(/\[SHOW_PRODUCT:([a-zA-Z0-9\-]+)\]/g);
      const matchedProducts: string[] = [];
      for (const match of allProductMatches) {
        matchedProducts.push(match[1]); // Keep as string (MongoDB ObjectId or slug)
      }

      let productData: any[] = [];

      if (matchedProducts.length > 0) {
        if (matchedProducts.length === 1) {
          // Single product - backward compatible
          productId = matchedProducts[0];
        } else {
          // Multiple products
          productIds = matchedProducts;
        }

        // Remove all markers from the message (updated regex for MongoDB IDs and slugs)
        assistantMessage = assistantMessage.replace(/\[SHOW_PRODUCT:[a-zA-Z0-9\-]+\]/g, '').trim();

        // Fetch ALL products data from API
        try {
          const fetchPromises = matchedProducts.map(id =>
            fetch(`/api/products/${id}`)
              .then(res => {
                if (!res.ok) {
                  console.error(`Failed to fetch product ${id}: ${res.status}`);
                  return null;
                }
                return res.json();
              })
              .then(data => {
                if (!data?.product) {
                  console.error(`No product data for ID ${id}`);
                  return null;
                }
                return data.product;
              })
              .catch(err => {
                console.error(`Error fetching product ${id}:`, err);
                return null;
              })
          );

          const products = await Promise.all(fetchPromises);
          productData = products.filter(p => p !== null && p !== undefined);
          console.log(`Fetched ${productData.length} products out of ${matchedProducts.length}`);

          // Store the FIRST product for vision context on next message
          if (productData.length > 0 && productData[0]) {
            const firstProduct = productData[0];
            // Add extra safety checks
            if (firstProduct.name && firstProduct.sizes) {
              const firstImage = firstProduct.media?.find((m: any) => m.type === 'image')?.url;
              setDisplayedProduct({
                id: firstProduct._id?.toString() || matchedProducts[0],
                name: firstProduct.name,
                price: firstProduct.sizes[0]?.price || 0,
                category: firstProduct.category,
                duration: '60m', // Default duration
                image: firstImage || '',
                buyNowOnly: firstProduct.buyNowOnly || false
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch products:', error);
        }
      }

      // Check if AI is selecting add-ons
      const addOnMatch = assistantMessage.match(/\[SELECT_ADDONS:([\w\-,]+)\]/);
      if (addOnMatch && onSelectAddOns) {
        const addOnIds = addOnMatch[1].split(',');
        // Remove the marker from the message
        assistantMessage = assistantMessage.replace(/\[SELECT_ADDONS:[\w\-,]+\]/, '').trim();
        // Call the callback to select add-ons on the page
        onSelectAddOns(addOnIds);
      }

      // Check if AI is signaling ready to bake
      if (assistantMessage.includes('[READY_TO_BAKE]')) {
        // Remove the marker from the message
        assistantMessage = assistantMessage.replace('[READY_TO_BAKE]', '').trim();

        // Show the button
        setShowReadyToBake(true);

        // Play bake sound (only once)
        if (!hasPlayedBakeSound.current) {
          hasPlayedBakeSound.current = true;
          const bakeSound = new Audio('https://kassycakes.b-cdn.net/assets/bake.MP3');
          bakeSound.play().catch(e => console.log('Audio play failed:', e));
        }
      }

      // Check if AI is adding to cart (accepts MongoDB IDs, slugs with hyphens, numbers, or "custom" as product ID)
      const addToCartMatch = assistantMessage.match(/\[ADD_TO_CART(?::([a-zA-Z0-9\-]+|custom):([^:\]]+))?\]/);
      if (addToCartMatch) {
        // Remove the marker from the message
        assistantMessage = assistantMessage.replace(/\[ADD_TO_CART(?::([a-zA-Z0-9\-]+|custom):([^:\]]+))?\]/, '').trim();

        // Mark that date has been confirmed (required for checkout)
        setDateConfirmed(true);

        // Extract product ID and size if provided (now supports MongoDB string IDs)
        const productId = addToCartMatch[1] || undefined;
        const size = addToCartMatch[2] || undefined;

        // Extract flavor and date from conversation
        const conversationText = [...newMessages, { role: 'assistant', content: assistantMessage }]
          .map(m => m.content.toLowerCase())
          .join(' ');

        const flavors = ['vanilla', 'chocolate', 'red velvet', 'lemon', 'strawberry', 'funfetti'];
        const flavor = flavors.find(f => conversationText.includes(f)) || undefined;

        // Extract date from conversation
        const fullConversationText = [...newMessages, { role: 'assistant', content: assistantMessage }]
          .map(m => m.content)
          .join(' ');

        const datePatterns = [
          /(?:date|for|needed|need it|pickup).*?([A-Z][a-z]+ \d{1,2}(?:,?\s+\d{4})?)/i,
          /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
          /([A-Z][a-z]{2,8} \d{1,2}(?:,?\s+\d{4})?)/,
          /(nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct)\s+\d{1,2}/i
        ];

        let dateString = undefined;
        for (const pattern of datePatterns) {
          const match = fullConversationText.match(pattern);
          if (match) {
            dateString = match[1] || match[0];
            break;
          }
        }

        // Call the add to cart callback if provided
        if (onAddToCart) {
          onAddToCart(productId, size, flavor, dateString);
        }
      }

      // Safety check: detect if AI said "added to cart" but forgot the marker
      // Normalize curly quotes to straight quotes for comparison (AI often uses smart quotes)
      const normalizedMessage = assistantMessage.toLowerCase()
        .replace(/[\u2018\u2019]/g, "'")  // Curly single quotes to straight
        .replace(/[\u201C\u201D]/g, '"'); // Curly double quotes to straight
      const cartPhrases = ['added to your cart', 'added to cart', "i've added your", 'added your cake'];
      const saidAddedToCart = cartPhrases.some(phrase => normalizedMessage.includes(phrase));
      if (saidAddedToCart && !addToCartMatch) {
        // AI claimed to add to cart but didn't include the marker - append a warning
        assistantMessage += '\n\n⚠️ Oops! There was a technical issue adding to your cart. Please say "add to cart" again and I\'ll make sure it goes through!';
      }

      setMessages([...newMessages, {
        role: 'assistant',
        content: assistantMessage,
        productId,
        productIds,
        productData: productData.length > 0 ? productData : undefined,
        images: images.length > 0 ? images : undefined
      }]);

      // Play received sound
      const receivedSound = new Audio('https://kassycakes.b-cdn.net/assets/gotmail.MP3');
      receivedSound.play().catch(e => console.log('Audio play failed:', e));

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'I apologize, but I encountered an error. Please try again or contact me directly at hello@kassycakes.com.';

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: errorMessage
        }
      ]);

      // Play received sound even for error messages
      const receivedSound = new Audio('https://kassycakes.b-cdn.net/assets/gotmail.MP3');
      receivedSound.play().catch(e => console.log('Audio play failed:', e));
    } finally {
      setIsLoading(false);
      // Refocus the input field so user can continue typing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const requestContactInfo = async () => {
    setShowForm(true);

    // Ask AI to generate summary
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            {
              role: 'user',
              content: 'Please provide a detailed summary of our conversation, including the cake specifications, pricing estimate, and any customization details we discussed.'
            }
          ],
          productContext: selectedProduct ? {
            id: selectedProduct.id,
            name: getCleanProductName(selectedProduct.name),
            price: selectedProduct.price,
            category: selectedProduct.category,
            duration: selectedProduct.duration,
            image: selectedProduct.image,
            buyNowOnly: selectedProduct.buyNowOnly,
            userSelectedSize: userSelectedSize
          } : null
        }),
      });

      const data = await response.json();
      const summary = data.choices[0].message.content;
      setOrderDetails(prev => ({ ...prev, summary }));
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!orderDetails.name || !orderDetails.email) {
      alert('Please provide your name and email');
      return;
    }

    // Here you would send the order to your backend/email service
    const orderData = {
      ...orderDetails,
      productName: selectedProduct?.name || 'Custom Design',
      conversation: messages,
      timestamp: new Date().toISOString()
    };

    console.log('Order submitted:', orderData);

    // Clear the chat after successful submission
    const storageKey = getStorageKey();
    localStorage.removeItem(storageKey);

    // For now, we'll just show success
    setIsSubmitted(true);

    // TODO: Send email or save to database
    // await fetch('/api/orders', { method: 'POST', body: JSON.stringify(orderData) });
  };

  const handleNewOrderClick = () => {
    setShowNewOrderConfirm(true);
  };

  const confirmNewOrder = () => {
    const storageKey = getStorageKey();
    localStorage.removeItem(storageKey);
    setMessages([initialMessage]);
    setShowReadyToBake(false);
    setDateConfirmed(false);
    hasPlayedBakeSound.current = false;
    setShowNewOrderConfirm(false);
  };

  const cancelNewOrder = () => {
    setShowNewOrderConfirm(false);
  };

  // Handle quick action button clicks
  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'browse_catalog':
        // Send a message asking to browse
        setInput('Show me your cake catalog');
        setTimeout(() => sendMessage(), 100);
        break;
      case 'custom_cake':
        setInput('I want to design a completely custom cake');
        setTimeout(() => sendMessage(), 100);
        break;
      case 'check_order':
        setShowOrderLookup(true);
        break;
      case 'pricing_info':
        setInput('What are your prices for different cake sizes?');
        setTimeout(() => sendMessage(), 100);
        break;
      default:
        break;
    }
  };

  // Look up order by order number
  const handleOrderLookup = async () => {
    if (!orderNumberInput.trim()) return;

    setLookupLoading(true);
    try {
      const response = await fetch(`/api/orders/lookup?orderNumber=${encodeURIComponent(orderNumberInput.trim())}`);
      const data = await response.json();

      if (response.ok && data.order) {
        const order = data.order;
        const orderData: OrderLookupData = {
          orderNumber: String(order.orderNumber),
          status: order.status,
          orderDate: order.orderDate,
          pickupDate: order.cakeDetails?.pickupDate,
          pickupTime: order.cakeDetails?.pickupTime,
          deliveryTime: order.cakeDetails?.deliveryTime,
          fulfillmentType: order.cakeDetails?.fulfillmentType || 'pickup',
          customerName: order.customerInfo?.name || '',
          cakeName: order.cakeDetails?.productName || 'Custom Cake',
          canModify: order.status === 'pending' || order.status === 'confirmed',
          maxPushDays: 3
        };

        setCurrentOrderData(orderData);
        setShowOrderLookup(false);

        // Add message with order data
        const orderMessage = `Found your order! Here are the details:`;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: orderMessage,
          orderData: orderData
        }]);

        // Play sound
        const receivedSound = new Audio('https://kassycakes.b-cdn.net/assets/gotmail.MP3');
        receivedSound.play().catch(e => console.log('Audio play failed:', e));
      } else {
        // Order not found
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I couldn't find order "${orderNumberInput}". Please check the number and try again. You can find your order number in your confirmation email.`
        }]);
        setShowOrderLookup(false);
      }
    } catch (error) {
      console.error('Order lookup error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble looking up your order. Please try again or contact us at hello@kassycakes.com'
      }]);
      setShowOrderLookup(false);
    } finally {
      setLookupLoading(false);
      setOrderNumberInput('');
    }
  };

  // Handle order modifications
  const handleOrderModification = async (action: 'change_time' | 'push_date' | 'forfeit', newValue?: string) => {
    if (!currentOrderData) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/orders/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: currentOrderData.orderNumber,
          action,
          newValue
        })
      });

      const data = await response.json();

      if (response.ok) {
        let successMessage = '';
        switch (action) {
          case 'change_time':
            successMessage = `Got it! Your ${currentOrderData.fulfillmentType} time has been updated to ${newValue}. See you then! 🎂`;
            break;
          case 'push_date':
            successMessage = `Your order has been rescheduled to ${newValue}. All set! 📅`;
            break;
          case 'forfeit':
            successMessage = `I understand. Your order has been marked as forfeited. Since all our cakes are custom-made, refunds aren't available, but if there's anything else I can help with, just let me know. 💕`;
            break;
        }

        setMessages(prev => [...prev, { role: 'assistant', content: successMessage }]);
        setCurrentOrderData(null);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.error || 'Sorry, I couldn\'t update your order. Please contact us directly at hello@kassycakes.com'
        }]);
      }
    } catch (error) {
      console.error('Order modification error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please contact us at hello@kassycakes.com'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-8 text-center">
          <div className="mb-6">
            <img
              src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png"
              alt="Success"
              width="120"
              height="120"
              className="mx-auto drop-shadow-xl"
            />
          </div>
          <h2 className="font-playfair text-4xl font-bold text-deepBurgundy mb-4">
            Order Submitted!
          </h2>
          <p className="font-cormorant text-xl text-deepBurgundy/80 mb-8">
            Thank you {orderDetails.name}! Kassy will review your order and get back to you at {orderDetails.email} within 24 hours.
          </p>
          <button
            onClick={onClose}
            className="bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-lg px-10 py-4 rounded-full transition-all duration-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="bg-kassyPink p-6 flex justify-between items-center sticky top-0">
            <h2 className="font-playfair text-3xl font-bold text-white">
              Review Your Order
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-white hover:text-baroqueGold text-3xl transition-colors"
            >
              ←
            </button>
          </div>

          <div className="p-8">
            {/* Order Summary */}
            <div className="mb-8">
              <h3 className="font-playfair text-2xl font-bold text-deepBurgundy mb-4">
                Order Summary
              </h3>
              <div className="bg-creamWhite rounded-lg p-6 font-cormorant text-lg text-deepBurgundy/90 whitespace-pre-wrap">
                {orderDetails.summary || 'Generating summary...'}
              </div>
            </div>

            {/* Contact Form */}
            <div className="mb-8">
              <h3 className="font-playfair text-2xl font-bold text-deepBurgundy mb-4">
                Your Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block font-cormorant text-lg text-deepBurgundy mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={orderDetails.name}
                    onChange={(e) => setOrderDetails(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-lg"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block font-cormorant text-lg text-deepBurgundy mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={orderDetails.email}
                    onChange={(e) => setOrderDetails(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-lg"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                onClick={handleSubmitOrder}
                className="flex-1 bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-lg px-10 py-4 rounded-full transition-all duration-300"
              >
                Submit Order Request
              </button>
            </div>

            <p className="font-cormorant text-sm text-deepBurgundy/60 text-center mt-4">
              Custom orders require at least 10 days advance notice
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* New Order Confirmation Modal */}
      {showNewOrderConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-8 baroque-shadow">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-kassyPink/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎂</span>
              </div>
              <h3 className="font-playfair text-2xl font-bold text-deepBurgundy mb-2">
                Start a New Order?
              </h3>
              <p className="font-cormorant text-lg text-deepBurgundy/80">
                This will clear your current conversation. Are you sure?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelNewOrder}
                className="flex-1 bg-white border-2 border-deepBurgundy/20 hover:border-deepBurgundy text-deepBurgundy font-playfair py-3 rounded-full transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewOrder}
                className="flex-1 bg-kassyPink hover:bg-baroqueGold text-white font-playfair py-3 rounded-full transition-all duration-300"
              >
                Start New Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Lookup Modal */}
      {showOrderLookup && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-8 baroque-shadow">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-kassyPink/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📋</span>
              </div>
              <h3 className="font-playfair text-2xl font-bold text-deepBurgundy mb-2">
                Check Your Order
              </h3>
              <p className="font-cormorant text-lg text-deepBurgundy/80">
                Enter your order number to view status and make changes
              </p>
            </div>
            <div className="mb-6">
              <label className="block font-cormorant text-sm text-deepBurgundy/60 mb-2">
                Order Number (from your confirmation email)
              </label>
              <input
                type="text"
                value={orderNumberInput}
                onChange={(e) => setOrderNumberInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleOrderLookup()}
                placeholder="e.g., 1733247631-482"
                className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-lg text-center"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOrderLookup(false);
                  setOrderNumberInput('');
                }}
                className="flex-1 bg-white border-2 border-deepBurgundy/20 hover:border-deepBurgundy text-deepBurgundy font-playfair py-3 rounded-full transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleOrderLookup}
                disabled={lookupLoading || !orderNumberInput.trim()}
                className="flex-1 bg-kassyPink hover:bg-baroqueGold disabled:bg-gray-300 text-white font-playfair py-3 rounded-full transition-all duration-300"
              >
                {lookupLoading ? 'Looking up...' : 'Find Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`${isMessengerStyle ? "fixed bottom-4 right-4 z-50" : "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"} ${!isVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}
      >
        <div className={isMessengerStyle
          ? "bg-white rounded-2xl w-[340px] h-[450px] flex flex-col shadow-2xl border border-deepBurgundy/10"
          : "bg-white rounded-lg max-w-4xl w-full h-[90vh] flex flex-col"}>
        {/* Header */}
        <div className={isMessengerStyle ? "bg-kassyPink p-2 flex justify-between items-center flex-shrink-0 rounded-t-2xl" : "bg-kassyPink p-6 flex justify-between items-center flex-shrink-0"}>
          <div className="flex items-center gap-2">
            <video
              src="https://kassy.b-cdn.net/Videos/234651.webm"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className={isMessengerStyle ? "w-10 h-10 rounded-full object-cover" : "w-14 h-14 rounded-full object-cover"}
            >
              <source src="https://kassy.b-cdn.net/Videos/234651.webm" type="video/webm" />
            </video>
            <div>
              <h2 className={isMessengerStyle ? "font-playfair text-base font-bold text-white" : "font-playfair text-3xl font-bold text-white"}>
                Ask Kassy
              </h2>
              {selectedProduct && !isMessengerStyle && (
                <p className="font-cormorant text-white/90">
                  Discussing: {selectedProduct.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Ready to Bake button - shows in catalog chat (non-messenger) */}
            {hasMounted && showReadyToBake && !isMessengerStyle && (
              <button
                onClick={requestContactInfo}
                className="bg-baroqueGold hover:bg-deepBurgundy text-white font-playfair px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg animate-pulse"
              >
                🎂 Ready to bake?
              </button>
            )}
            {/* Fallback: Ready to Bake in messenger style (if no checkout callback) */}
            {hasMounted && showReadyToBake && isMessengerStyle && !onCheckout && (
              <button
                onClick={requestContactInfo}
                className="bg-baroqueGold hover:bg-deepBurgundy text-white font-playfair px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg animate-pulse text-sm"
              >
                🎂 Ready to bake?
              </button>
            )}
            {/* New Order button - shows in messenger style next to X */}
            {isMessengerStyle && hasMounted && messages.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNewOrderClick}
                  className="text-white hover:text-white/80 text-xs font-cormorant transition-colors whitespace-nowrap"
                >
                  New Order
                </button>
                {hasMounted && dateConfirmed && (
                  <Link
                    href="/cart"
                    className="text-white hover:text-white/80 text-xs font-cormorant transition-colors whitespace-nowrap"
                  >
                    Checkout
                  </Link>
                )}
              </div>
            )}
            {!isMessengerStyle && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleNewOrderClick}
                  className="text-white/80 hover:text-white text-sm font-cormorant underline transition-colors whitespace-nowrap"
                >
                  New order
                </button>
                {hasMounted && dateConfirmed && (
                  <Link
                    href="/cart"
                    className="text-white/80 hover:text-white text-sm font-cormorant underline transition-colors whitespace-nowrap"
                  >
                    Checkout
                  </Link>
                )}
              </div>
            )}
            <button
              onClick={() => {
                // Play close sound
                const audio = new Audio('https://kassy.b-cdn.net/audio/exitchat.MP3');
                audio.volume = 0.5;
                audio.play().catch(err => console.log('Audio failed:', err));
                // Close chat
                onClose();
              }}
              className={isMessengerStyle ? "text-white hover:text-baroqueGold text-2xl transition-colors leading-none flex-shrink-0 mr-3" : "text-white hover:text-baroqueGold text-3xl transition-colors flex-shrink-0 mr-3"}
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={chatContainerRef}
          className={isMessengerStyle ? "flex-1 overflow-y-auto p-2 space-y-1.5" : "flex-1 overflow-y-auto p-6 space-y-4"}
        >
          {messages.map((message, index) => {
            // Use productData from message if available (from database), otherwise fall back to old static method
            const allProducts = message.productData || [];

            if (message.role === 'assistant' && allProducts.length > 0) {
              console.log(`📦 Message ${index} has ${allProducts.length} products:`, allProducts.map(p => p?.name));
            }

            // Deduplicate products by name - only show one card per unique name
            const seenNames = new Set<string>();
            const products = allProducts.filter(p => {
              const baseName = p.name.replace(/^\d+"\s*/, '');
              if (seenNames.has(baseName)) {
                return false;
              }
              seenNames.add(baseName);
              return true;
            });

            return (
              <div key={index}>
                <div
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                >
                  <div
                    className={`max-w-[80%] ${isMessengerStyle ? 'rounded-2xl p-2.5' : 'rounded-lg p-4'} ${
                      message.role === 'user'
                        ? 'bg-kassyPink text-white'
                        : isMessengerStyle
                        ? 'bg-gray-100 text-deepBurgundy'
                        : 'bg-creamWhite text-deepBurgundy border-2 border-deepBurgundy/10'
                    }`}
                  >
                    <p className={isMessengerStyle ? "font-cormorant text-sm whitespace-pre-wrap leading-snug" : "font-cormorant text-lg whitespace-pre-wrap"}>
                      {message.content}
                    </p>
                  </div>
                </div>

                {/* Images sent by Kassy */}
                {message.images && message.images.length > 0 && message.role === 'assistant' && (
                  <div className="flex justify-start mt-2 ml-14">
                    {message.images.map((imageUrl, imgIndex) => (
                      <div key={imgIndex} className={isMessengerStyle ? "rounded-2xl overflow-hidden max-w-[200px]" : "rounded-lg overflow-hidden max-w-[300px]"}>
                        <img
                          src={imageUrl}
                          alt="Kassy"
                          className="w-full h-auto object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Multiple Product Cards */}
                {products.length > 0 && message.role === 'assistant' && (
                  <div className="flex justify-start mt-2 space-x-2 overflow-x-auto">
                    {products.map((prod: any, prodIndex) => {
                      // Get product image from media array
                      const productImage = prod.media?.find((m: any) => m.type === 'image')?.url;
                      // Get product ID (MongoDB ObjectId or slug)
                      const productId = prod._id?.toString() || prod.slug;
                      // Get price (first size)
                      const productPrice = prod.sizes?.[0]?.price || prod.price || 0;
                      // Strip size prefix from name (e.g., "6\" Celestial Blue" -> "Celestial Blue")
                      const displayName = prod.name.replace(/^\d+"\s*/, '');

                      return (
                      <div key={prodIndex} className={isMessengerStyle
                        ? "flex-shrink-0 w-64 bg-white rounded-2xl overflow-hidden shadow-lg border border-kassyPink/30"
                        : "flex-shrink-0 w-80 bg-white rounded-lg overflow-hidden baroque-shadow border-2 border-kassyPink/30"}>
                        {/* Product Image */}
                        {productImage && (
                          <div className="relative w-full aspect-square bg-creamWhite">
                            <img
                              src={productImage}
                              alt={displayName}
                              className="w-full h-full object-contain"
                              loading="eager"
                            />
                          </div>
                        )}

                        {/* Product Info */}
                        <div className={isMessengerStyle ? "p-3" : "p-4"}>
                          <h3 className={isMessengerStyle
                            ? "font-playfair text-base font-bold text-deepBurgundy mb-1"
                            : "font-playfair text-xl font-bold text-deepBurgundy mb-2"}>
                            {displayName}
                          </h3>
                          {/* Show all sizes if available */}
                          {prod.sizes && prod.sizes.length > 1 ? (
                            <div className="mb-2">
                              {prod.sizes.map((size: any, i: number) => (
                                <p key={i} className={isMessengerStyle
                                  ? "font-playfair text-sm text-deepBurgundy"
                                  : "font-playfair text-base text-deepBurgundy"}>
                                  {size.size}: <span className="font-bold text-kassyPink">${size.price.toFixed(2)}</span>
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className={isMessengerStyle
                              ? "font-playfair text-lg font-bold text-kassyPink mb-2"
                              : "font-playfair text-2xl font-bold text-kassyPink mb-3"}>
                              ${productPrice.toFixed(2)}
                            </p>
                          )}

                          {/* Customize Button */}
                          <button
                            onClick={() => window.location.href = `/cakes/product/${productId}`}
                            className={isMessengerStyle
                              ? "w-full bg-kassyPink hover:bg-baroqueGold text-white font-playfair px-4 py-2 rounded-full transition-all duration-300 text-sm"
                              : "w-full bg-kassyPink hover:bg-baroqueGold text-white font-playfair px-6 py-3 rounded-full transition-all duration-300 shadow-md hover:shadow-lg"}
                          >
                            View Cake →
                          </button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}

                {/* Quick Action Buttons */}
                {message.quickActions && message.quickActions.length > 0 && message.role === 'assistant' && (
                  <div className={`flex flex-wrap gap-2 mt-3 justify-start ${isMessengerStyle ? 'px-1' : ''}`}>
                    {message.quickActions.map((action, actionIndex) => (
                      <button
                        key={actionIndex}
                        onClick={() => handleQuickAction(action.action)}
                        className={`bg-white border-2 border-kassyPink/30 hover:border-kassyPink hover:bg-kassyPink/10 text-deepBurgundy font-cormorant rounded-full transition-all duration-300 flex items-center gap-1 ${
                          isMessengerStyle
                            ? 'px-2.5 py-1.5 text-xs'
                            : 'px-4 py-2 text-sm gap-2'
                        }`}
                      >
                        {action.icon && <span>{action.icon}</span>}
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Order Data Card */}
                {message.orderData && message.role === 'assistant' && (
                  <div className="mt-3 bg-white rounded-lg border-2 border-kassyPink/30 p-4 max-w-md">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">📋</span>
                      <div>
                        <h4 className="font-playfair text-sm font-bold text-deepBurgundy">
                          Order #{message.orderData.orderNumber}
                        </h4>
                      </div>
                      <span className={`ml-auto px-2 py-1 rounded-full text-xs font-semibold ${
                        message.orderData.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        message.orderData.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        message.orderData.status === 'forfeited' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {message.orderData.status.charAt(0).toUpperCase() + message.orderData.status.slice(1)}
                      </span>
                    </div>

                    <div className="space-y-2 font-cormorant text-deepBurgundy/80">
                      <p><span className="font-semibold">Cake:</span> {message.orderData.cakeName}</p>
                      <p><span className="font-semibold">Customer:</span> {message.orderData.customerName}</p>
                      <p><span className="font-semibold">{message.orderData.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'} Date:</span> {new Date(message.orderData.pickupDate || message.orderData.orderDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      <p><span className="font-semibold">Time:</span> {message.orderData.fulfillmentType === 'delivery' ? message.orderData.deliveryTime : message.orderData.pickupTime || 'Not set'}</p>
                    </div>

                    {message.orderData.canModify && (
                      <div className="mt-4 pt-3 border-t border-deepBurgundy/10">
                        <p className="font-cormorant text-sm text-deepBurgundy/60 mb-3">Need to make changes?</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              const newTime = prompt(`Enter new ${message.orderData!.fulfillmentType} time (e.g., "3:00 PM"):`);
                              if (newTime) handleOrderModification('change_time', newTime);
                            }}
                            className="bg-kassyPink/10 hover:bg-kassyPink/20 text-deepBurgundy font-cormorant px-3 py-1.5 rounded-full transition-all text-sm"
                          >
                            Change Time
                          </button>
                          <button
                            onClick={() => {
                              const newDate = prompt('Enter new date (max 3 days later, e.g., "December 20"):');
                              if (newDate) handleOrderModification('push_date', newDate);
                            }}
                            className="bg-kassyPink/10 hover:bg-kassyPink/20 text-deepBurgundy font-cormorant px-3 py-1.5 rounded-full transition-all text-sm"
                          >
                            Push Date (max 3 days)
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to forfeit this order? Since all cakes are custom-made, refunds are not available.')) {
                                handleOrderModification('forfeit');
                              }
                            }}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-cormorant px-3 py-1.5 rounded-full transition-all text-sm"
                          >
                            Forfeit Order
                          </button>
                        </div>
                        <p className="font-cormorant text-xs text-deepBurgundy/50 mt-2">
                          Note: Cancellations & refunds are not available for custom orders.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start gap-2">
              <div className={isMessengerStyle
                ? "bg-gray-100 text-deepBurgundy rounded-2xl p-2.5"
                : "bg-creamWhite text-deepBurgundy rounded-lg p-4 border-2 border-deepBurgundy/10"}>
                <p className={isMessengerStyle ? "font-cormorant text-sm" : "font-cormorant text-lg"}>Typing...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={isMessengerStyle ? "p-2 border-t border-gray-200 flex-shrink-0 bg-white rounded-b-2xl" : "p-6 border-t-2 border-deepBurgundy/10 flex-shrink-0"}>
          {/* Quick Actions */}
          {/* Checkout button - shows in product page messenger chat above input */}
          {hasMounted && showReadyToBake && isMessengerStyle && onCheckout && (
            <div className={isMessengerStyle ? "mb-2 flex gap-2" : "mb-4 flex gap-3"}>
              <button
                onClick={onCheckout}
                className={isMessengerStyle
                  ? "bg-baroqueGold hover:bg-deepBurgundy text-white font-playfair px-3 py-1 rounded-full transition-all duration-300 text-xs shadow-lg animate-pulse flex-1"
                  : "bg-baroqueGold hover:bg-deepBurgundy text-white font-playfair px-4 py-2 rounded-full transition-all duration-300 text-sm shadow-lg animate-pulse"}
              >
                🛒 Checkout
              </button>
            </div>
          )}
          <div className={isMessengerStyle ? "flex gap-1.5 items-center" : "flex gap-4"}>
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                onKeyPress={handleKeyPress}
                onBlur={() => {
                  // Reset iOS Safari zoom when keyboard closes
                  setTimeout(() => {
                    window.scrollTo(0, window.scrollY);
                    document.body.style.zoom = '1';
                  }, 100);
                }}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={isMessengerStyle ? "Ask about this cake..." : "Ask me anything about cakes..."}
                className={isMessengerStyle
                  ? "w-full px-3 py-1.5 rounded-full border border-gray-300 focus:border-kassyPink outline-none font-cormorant text-base"
                  : "w-full px-4 py-3 rounded-full border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-lg"}
                disabled={isLoading}
                style={{ fontSize: '16px' }}
              />
              {input.length > MAX_MESSAGE_LENGTH * 0.8 && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${input.length >= MAX_MESSAGE_LENGTH ? 'text-red-500' : 'text-gray-400'}`}>
                  {input.length}/{MAX_MESSAGE_LENGTH}
                </span>
              )}
            </div>
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className={isMessengerStyle
                ? "bg-kassyPink hover:bg-baroqueGold disabled:bg-gray-300 text-white rounded-full w-8 h-8 flex items-center justify-center transition-all duration-300 flex-shrink-0"
                : "bg-kassyPink hover:bg-baroqueGold disabled:bg-deepBurgundy/30 text-white font-playfair px-8 py-3 rounded-full transition-all duration-300"}
            >
              {isMessengerStyle ? (
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                  <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/>
                </svg>
              ) : "Send"}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
