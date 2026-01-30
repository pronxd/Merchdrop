"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getProductById } from "@/lib/products";
import { productGroups } from "@/lib/productGroups";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import Footer from "@/components/Footer";
import OrderAssistantChat from "@/components/OrderAssistantChat";
import WeddingCakeQuoteModal from "@/components/WeddingCakeQuoteModal";
import { trackProductView, trackEvent, AnalyticsEvents } from "@/lib/analytics";
import CroppedImage from "@/components/CroppedImage";
import CustomerScheduleCalendar from "@/components/CustomerScheduleCalendar";
import DeliveryAddressInput, { DeliveryAddress } from "@/components/DeliveryAddressInput";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  const { getProductById: getProductFromContext, loading: contextLoading } = useProducts();

  // Get product from context with memoization - products are already pre-transformed
  const product = useMemo(() => {
    return getProductFromContext(params.id as string);
  }, [params.id, getProductFromContext]);

  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [designNotes, setDesignNotes] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [useLikePicture, setUseLikePicture] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dateSectionRef = useRef<HTMLDivElement>(null);
  const designNotesSectionRef = useRef<HTMLDivElement>(null);
  const designNotesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0); // 0 for video/realImage, 1+ for gallery images
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedShape, setSelectedShape] = useState<'heart' | 'circle'>(product?.shape || 'heart');
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const [expandedColorImage, setExpandedColorImage] = useState<string | null>(null);
  const [selectedDesignIndex, setSelectedDesignIndex] = useState<number | null>(null);
  const [expandedDesignImage, setExpandedDesignImage] = useState<string | null>(null);
  const [selectedFlavor, setSelectedFlavor] = useState<string>('vanilla');
  const [selectedFilling, setSelectedFilling] = useState<string>('vanilla');
  const [cakeWriting, setCakeWriting] = useState<string>('');
  const [wantsCakeWriting, setWantsCakeWriting] = useState<boolean>(false);
  const [showIllustration, setShowIllustration] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const hasSizeBeenManuallyChanged = useRef(false);
  const [showDesignNotesAlert, setShowDesignNotesAlert] = useState(false);
  const [edibleImageUrl, setEdibleImageUrl] = useState<string | null>(null);
  const [edibleImagePreview, setEdibleImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tempImageUrlRef = useRef<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [isUploadingReferenceImage, setIsUploadingReferenceImage] = useState(false);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);
  const tempReferenceImageUrlRef = useRef<string | null>(null);
  const wasAddedToCartRef = useRef<boolean>(false); // Track if item was added to cart
  const { settings: siteSettings } = useSiteSettings();

  // Delivery/Date selection states
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('pickup');
  const [orderDate, setOrderDate] = useState<Date | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [pickupTime, setPickupTime] = useState<string>('');
  const [highlightDateSection, setHighlightDateSection] = useState(false);
  const [showDateAlert, setShowDateAlert] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null);

  // Custom cake request states
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [showRequestSuccess, setShowRequestSuccess] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');

  // Database-driven options (add-ons, flavors, fillings)
  const [dbAddOns, setDbAddOns] = useState<any[]>([]);
  const [dbFlavors, setDbFlavors] = useState<any[]>([]);
  const [dbFillings, setDbFillings] = useState<any[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  // Filter options based on product settings (per-product option controls)
  const filteredFlavors = useMemo(() => {
    if (!product) return dbFlavors;
    if (product.showFlavorSection === false) return [];
    if (product.availableFlavors === null || product.availableFlavors === undefined) return dbFlavors;
    return dbFlavors.filter(f => product.availableFlavors.includes(f.id));
  }, [dbFlavors, product]);

  const filteredFillings = useMemo(() => {
    if (!product) return dbFillings;
    if (product.showFillingSection === false) return [];
    if (product.availableFillings === null || product.availableFillings === undefined) return dbFillings;
    return dbFillings.filter(f => product.availableFillings.includes(f.id));
  }, [dbFillings, product]);

  const filteredAddOns = useMemo(() => {
    if (!product) return dbAddOns;
    // For signature cakes, only show add-ons if explicitly enabled (default to hidden)
    // For custom cakes, show add-ons unless explicitly disabled (default to shown)
    if (product.productType === 'signature') {
      if (product.showAddOnsSection !== true) return []; // Must be explicitly enabled for signature
    } else {
      if (product.showAddOnsSection === false) return []; // Only hide if explicitly disabled for custom
    }
    if (product.availableAddOns === null || product.availableAddOns === undefined) return dbAddOns;
    return dbAddOns.filter(a => product.availableAddOns.includes(a.id));
  }, [dbAddOns, product]);

  // Filter shapes based on product settings
  const filteredShapes = useMemo(() => {
    const allShapes: ('heart' | 'circle')[] = ['heart', 'circle'];
    if (!product) return allShapes;
    if (product.showShapeSection === false) return [];
    if (product.availableShapes === null || product.availableShapes === undefined) return allShapes;
    return product.availableShapes;
  }, [product]);

  // Auto-select shape if only one is available
  useEffect(() => {
    if (filteredShapes.length === 1 && selectedShape !== filteredShapes[0]) {
      setSelectedShape(filteredShapes[0]);
    }
  }, [filteredShapes, selectedShape]);

  // Use filtered options
  const addOns = filteredAddOns;

  // Play sound on button click
  const playOpenChatSound = () => {
    const audio = new Audio('https://kassy.b-cdn.net/audio/openchat.MP3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Audio failed:', err));
  };

  // Helper to determine if this is a custom cake (circle/heart), signature cake, or quote-only
  const isCustomCake = product && product.productType === 'custom';
  const isSignatureCake = product && product.productType === 'signature';
  const isQuoteOnly = product && product.quoteOnly;

  // IDs for the linked Circle/Heart custom cake pair (these can switch between each other)
  const CIRCLE_CAKE_ID = '690f7162196b1d1935db83b4';
  const HEART_CAKE_ID = '690f7162196b1d1935db83b5';

  // Check if current product is one of the linked circle/heart cakes
  const isLinkedCircleHeartCake = product && (
    product._id === CIRCLE_CAKE_ID ||
    product._id === HEART_CAKE_ID ||
    (typeof product._id === 'object' && (product._id.toString() === CIRCLE_CAKE_ID || product._id.toString() === HEART_CAKE_ID))
  );

  // State for quote modal
  const [showQuoteModal, setShowQuoteModal] = useState(true); // Open by default for quote-only products

  // Get both circle and heart products for the linked custom cakes only
  const circleProduct = useMemo(() => {
    if (!isLinkedCircleHeartCake) return null;
    return getProductFromContext(CIRCLE_CAKE_ID);
  }, [getProductFromContext, isLinkedCircleHeartCake]);

  const heartProduct = useMemo(() => {
    if (!isLinkedCircleHeartCake) return null;
    return getProductFromContext(HEART_CAKE_ID);
  }, [getProductFromContext, isLinkedCircleHeartCake]);

  // Get the product to display based on selected shape for linked circle/heart cakes only
  const displayProduct = useMemo(() => {
    if (isLinkedCircleHeartCake && circleProduct && heartProduct) {
      return selectedShape === 'circle' ? circleProduct : heartProduct;
    }
    return product;
  }, [isLinkedCircleHeartCake, selectedShape, circleProduct, heartProduct, product]);

  // Get the tab parameter to return to the correct tab
  const tabParam = searchParams.get('tab') || 'all';

  // Update selected shape when product loads to match product's actual shape
  useEffect(() => {
    if (product && product.shape) {
      setSelectedShape(product.shape);
    }
  }, [product]);

  // Initialize selected size from product's first size
  useEffect(() => {
    if (product && product.sizes && product.sizes.length > 0 && !selectedSize) {
      setSelectedSize(product.sizes[0].size);
    }
  }, [product, selectedSize]);

  // Fetch add-ons, flavors, and fillings from database
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch('/api/options');
        const data = await response.json();
        if (data.addons) setDbAddOns(data.addons);
        if (data.flavors) setDbFlavors(data.flavors);
        if (data.fillings) setDbFillings(data.fillings);
        setOptionsLoaded(true);
      } catch (error) {
        console.error('Failed to fetch options:', error);
        setOptionsLoaded(true); // Fall back to hardcoded options
      }
    };
    fetchOptions();
  }, []);

  // Restore selections from URL parameters when switching shapes
  useEffect(() => {
    const size = searchParams.get('size');
    const flavor = searchParams.get('flavor');
    const filling = searchParams.get('filling');
    const writing = searchParams.get('writing');
    const wantsWriting = searchParams.get('wantsWriting');
    const notes = searchParams.get('notes');
    const addons = searchParams.get('addons');
    const refImage = searchParams.get('refImage');
    const fulfillment = searchParams.get('fulfillmentType');
    const orderDateParam = searchParams.get('orderDate');
    const pickupDateParam = searchParams.get('pickupDate');
    const deliveryTimeParam = searchParams.get('deliveryTime');
    const pickupTimeParam = searchParams.get('pickupTime');

    if (size) setSelectedSize(size);
    if (flavor) setSelectedFlavor(flavor);
    if (filling) setSelectedFilling(filling);
    if (writing) setCakeWriting(writing);
    if (wantsWriting === 'true') setWantsCakeWriting(true);
    if (notes) setDesignNotes(notes);
    if (addons) setSelectedAddOns(addons.split(','));
    if (refImage) {
      setReferenceImageUrl(refImage);
      setReferenceImagePreview(refImage);
      tempReferenceImageUrlRef.current = refImage;
    }
    // Restore date/time selections
    if (fulfillment && (fulfillment === 'pickup' || fulfillment === 'delivery')) {
      setFulfillmentType(fulfillment);
    }
    if (orderDateParam) {
      setOrderDate(new Date(orderDateParam));
    }
    if (pickupDateParam) {
      setPickupDate(new Date(pickupDateParam));
    }
    if (deliveryTimeParam) {
      setDeliveryTime(deliveryTimeParam);
    }
    if (pickupTimeParam) {
      setPickupTime(pickupTimeParam);
    }
  }, [searchParams]);

  // Reset gallery to first image when shape changes for custom cakes
  useEffect(() => {
    if (isCustomCake) {
      setSelectedMediaIndex(0);
    }
  }, [selectedShape, isCustomCake]);

  // Scroll thumbnail into view when selection changes
  useEffect(() => {
    if (thumbnailRefs.current[selectedMediaIndex]) {
      thumbnailRefs.current[selectedMediaIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedMediaIndex]);

  // Helper function to remove size from product name and update shape
  const getCleanProductName = () => {
    if (!product) return '';
    // Remove size prefixes like 6", 8", 4" from the beginning of product names
    let cleanName = product.name.replace(/^[468]"\s*/, '');
    // Remove size patterns in parentheses like (6"+4")
    cleanName = cleanName.replace(/\([468]"\+[468]"\)\s*/g, '');

    // For custom cakes, replace shape name based on selected shape
    if (isCustomCake) {
      if (selectedShape === 'circle' && cleanName.toLowerCase().includes('heart')) {
        cleanName = cleanName.replace(/heart/gi, 'Circle');
      } else if (selectedShape === 'heart' && cleanName.toLowerCase().includes('circle')) {
        cleanName = cleanName.replace(/circle/gi, 'Heart');
      }
    }

    return cleanName;
  };

  // Helper function to get current price based on selected size
  const getCurrentPrice = () => {
    if (!product || !product.sizes) return 0;

    // Find the size option that matches the selected size
    const sizeOption = product.sizes.find((s: any) => s.size === selectedSize);
    if (sizeOption) {
      return sizeOption.price;
    }

    // Fallback to first size's price
    return product.sizes[0]?.price || 0;
  };

  // Track product view when page loads
  useEffect(() => {
    if (product) {
      trackProductView(product.id, product.name, product.price);
    }
  }, [product]);

  // Handle size changes for product 2 - show illustration then fade back
  useEffect(() => {
    if (product && product.id === 2 && hasSizeBeenManuallyChanged.current) {
      setShowIllustration(true);
      setIsFadingOut(false);

      // Start fading out after 3.5 seconds (so full fade completes at 4 seconds)
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 3500);

      // Hide illustration completely after fade completes
      const hideTimer = setTimeout(() => {
        setShowIllustration(false);
      }, 4000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [selectedSize, product]);

  // Cleanup temp image on page unload (ONLY if not added to cart)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Don't delete if item was added to cart - checkout-success will move them to permanent storage
      if (wasAddedToCartRef.current) {
        return;
      }

      if (tempImageUrlRef.current) {
        // Use sendBeacon for reliable cleanup on page unload
        navigator.sendBeacon(
          '/api/delete-temp-image',
          JSON.stringify({ url: tempImageUrlRef.current })
        );
      }
      if (tempReferenceImageUrlRef.current) {
        navigator.sendBeacon(
          '/api/delete-temp-image',
          JSON.stringify({ url: tempReferenceImageUrlRef.current })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Don't delete if item was added to cart - checkout-success will move them to permanent storage
      if (wasAddedToCartRef.current) {
        return;
      }

      // Also cleanup when component unmounts (only if NOT added to cart)
      if (tempImageUrlRef.current) {
        fetch('/api/delete-temp-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: tempImageUrlRef.current }),
        });
      }
      if (tempReferenceImageUrlRef.current) {
        fetch('/api/delete-temp-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: tempReferenceImageUrlRef.current }),
        });
      }
    };
  }, []);

  // Preload video and audio for instant chat opening
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Preload the Kassy avatar video
      const video = document.createElement('video');
      video.src = 'https://kassy.b-cdn.net/Videos/234651.webm';
      video.preload = 'auto';
      video.muted = true;
      video.load();

      // Preload the chat open sound
      const openAudio = new Audio('https://kassy.b-cdn.net/audio/openchat.MP3');
      openAudio.preload = 'auto';
      openAudio.load();

      // Preload the chat close sound
      const closeAudio = new Audio('https://kassy.b-cdn.net/audio/exitchat.MP3');
      closeAudio.preload = 'auto';
      closeAudio.load();
    }
  }, []);

  // Sync pickupDate with orderDate
  useEffect(() => {
    if (orderDate) {
      setPickupDate(orderDate);
    }
  }, [orderDate]);

  // No loading screen - page renders immediately, images load from cache

  const toggleAddOn = (addOnId: string) => {
    // Special handling for edible-image - open file picker
    if (addOnId === 'edible-image') {
      fileInputRef.current?.click();
      return;
    }

    setSelectedAddOns(prev => {
      const newSelection = prev.includes(addOnId)
        ? prev.filter(id => id !== addOnId)
        : [...prev, addOnId];

      // Track add-on selection
      if (!prev.includes(addOnId)) {
        const addOn = addOns.find(a => a.id === addOnId);
        trackEvent(AnalyticsEvents.ADDON_SELECTED, {
          product_id: product.id,
          product_name: product.name,
          addon_name: addOn?.name || addOnId,
          addon_price: addOn?.price || 0,
        });
      }

      return newSelection;
    });
  };

  const handleEdibleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Compress image using canvas
      const compressedFile = await compressImage(file);

      // Create preview
      const previewUrl = URL.createObjectURL(compressedFile);
      setEdibleImagePreview(previewUrl);

      // Upload to Bunny temp folder
      const formData = new FormData();
      formData.append('image', compressedFile);
      formData.append('folder', 'temp');

      const response = await fetch('/api/upload-edible-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      const imageUrl = data.url;

      setEdibleImageUrl(imageUrl);
      tempImageUrlRef.current = imageUrl;

      // Add to selected add-ons if not already there
      if (!selectedAddOns.includes('edible-image')) {
        setSelectedAddOns(prev => [...prev, 'edible-image']);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      setEdibleImagePreview(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Max dimensions
          const maxWidth = 1200;
          const maxHeight = 1200;

          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.85
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const removeEdibleImage = async () => {
    if (tempImageUrlRef.current) {
      // Delete temp image from Bunny
      try {
        await fetch('/api/delete-temp-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: tempImageUrlRef.current }),
        });
      } catch (error) {
        console.error('Error deleting temp image:', error);
      }
    }

    setEdibleImageUrl(null);
    setEdibleImagePreview(null);
    tempImageUrlRef.current = null;
    setSelectedAddOns(prev => prev.filter(id => id !== 'edible-image'));
  };

  const handleReferenceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setIsUploadingReferenceImage(true);

    try {
      // Compress image using canvas
      const compressedFile = await compressImage(file);

      // Create preview
      const previewUrl = URL.createObjectURL(compressedFile);
      setReferenceImagePreview(previewUrl);

      // Upload to Bunny temp folder
      const formData = new FormData();
      formData.append('image', compressedFile);
      formData.append('folder', 'temp');

      const response = await fetch('/api/upload-edible-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      const imageUrl = data.url;

      setReferenceImageUrl(imageUrl);
      tempReferenceImageUrlRef.current = imageUrl;
    } catch (error) {
      console.error('Error uploading reference image:', error);
      alert('Failed to upload image. Please try again.');
      setReferenceImagePreview(null);
    } finally {
      setIsUploadingReferenceImage(false);
    }
  };

  const removeReferenceImage = async () => {
    if (tempReferenceImageUrlRef.current) {
      // Delete temp image from Bunny
      try {
        await fetch('/api/delete-temp-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: tempReferenceImageUrlRef.current }),
        });
      } catch (error) {
        console.error('Error deleting temp reference image:', error);
      }
    }

    setReferenceImageUrl(null);
    setReferenceImagePreview(null);
    tempReferenceImageUrlRef.current = null;
  };

  // Wrapper function to handle manual size selection
  const handleSizeSelect = (size: string) => {
    hasSizeBeenManuallyChanged.current = true;
    setSelectedSize(size);
  };

  // Helper function to get the correct image based on selected shape for custom cakes
  const getShapeBasedImage = () => {
    // Don't show default shape images - use gallery instead
    return null;
  };

  // Helper function to get the correct image based on selected size for product 2
  const getSizeBasedImage = () => {
    if (product.id === 2 && product.realImages) {
      const sizeMap: { [key: string]: number } = {
        '6"': 0,
        '8"': 1
      };
      return product.realImages[sizeMap[selectedSize]] || product.realImages[0];
    }
    return null;
  };

  // Helper function to get the correct image based on selected flavor
  const getFlavorBasedImage = () => {
    // For custom cakes, show flavor images from database
    if (isCustomCake && selectedFlavor) {
      const flavor = dbFlavors.find(f => f.name === selectedFlavor);
      return flavor?.image || null;
    }
    return null;
  };

  const handleAISelectAddOns = (addOnIds: string[]) => {
    setSelectedAddOns(prev => {
      // Add any new add-ons that aren't already selected
      const newAddOns = addOnIds.filter(id => !prev.includes(id));
      return [...prev, ...newAddOns];
    });
  };

  const handleLikePictureToggle = () => {
    const newValue = !useLikePicture;
    setUseLikePicture(newValue);

    // If unchecking, clear any notes
    if (!newValue && !designNotes.trim()) {
      setDesignNotes('');
    }
  };

  const handleAIAddToCart = async (productId?: string | number, size?: string, flavor?: string, dateString?: string) => {
    // This is called when AI adds item to cart (doesn't close chat or redirect)
    // If productId and size are provided, add that specific product. Otherwise add current product.
    try {
      // Determine which product to add
      const productIdNum = typeof productId === 'string' ? parseInt(productId, 10) : productId;
      const productToAdd = productIdNum ? getProductById(productIdNum) : product;
      if (!productToAdd) {
        console.error('Product not found:', productId);
        return;
      }

      // Determine size to use
      const sizeToUse = size || selectedSize;

      // Determine flavor to use
      const flavorToUse = flavor || selectedFlavor;

      // Determine shape (default to circle for most cakes, heart if it's a heart cake)
      const shapeToUse = productToAdd.shape || selectedShape;

      let finalDesignNotes = designNotes.trim();

      // Generate summary from chat if we have messages
      if (chatMessages.length > 1) {
        const response = await fetch('/api/summarize-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: chatMessages,
            productName: productToAdd.name,
            selectedAddOns: selectedAddOns,
            selectedSize: sizeToUse,
            selectedShape: shapeToUse
          })
        });

        const data = await response.json();
        finalDesignNotes = data.summary || designNotes.trim() || 'Custom design as discussed';
      } else {
        finalDesignNotes = designNotes.trim() || 'Custom design';
      }

      const selectedAddOnsDetails = addOns.filter(a => selectedAddOns.includes(a.id));

      // Use product image (or get from current selection if same product)
      const imageToUse = (productToAdd.id === product.id)
        ? (getSelectedImageUrl() || productToAdd.image)
        : (productToAdd.realImage || productToAdd.image);

      // Build cart notes with DATE, size and shape
      let cartDesignNotes = '';

      // Add date if provided
      if (dateString) {
        cartDesignNotes += `Date: ${dateString}\n`;
      }

      // Add color if selected (use displayProduct for current product since that's what UI shows)
      const productForVariants = (productToAdd.id === product?.id) ? displayProduct : productToAdd;
      const selectedColorName = selectedColorIndex !== null && productForVariants?.colorVariants?.[selectedColorIndex]?.name
        ? productForVariants.colorVariants[selectedColorIndex].name
        : null;
      // Add design if selected
      const selectedDesignLabel = selectedDesignIndex !== null && productForVariants?.designVariants?.[selectedDesignIndex]
        ? `Design ${selectedDesignIndex + 1}`
        : null;
      cartDesignNotes += `Size: ${sizeToUse}\nShape: ${shapeToUse}\nFlavor: ${flavorToUse}`;
      if (filteredFillings.length > 0) cartDesignNotes += `\nFilling: ${selectedFilling}`;
      if (selectedColorName) cartDesignNotes += `\nColor: ${selectedColorName}`;
      if (selectedDesignLabel) cartDesignNotes += `\nDesign: ${selectedDesignLabel}`;
      cartDesignNotes += '\n\n';
      cartDesignNotes += finalDesignNotes || '';

      // Determine price based on selected size from product's sizes array
      let priceToUse = productToAdd.price;
      if (productToAdd.sizes && productToAdd.sizes.length > 0) {
        const sizeOption = productToAdd.sizes.find((s: any) => s.size === sizeToUse);
        if (sizeOption) {
          priceToUse = sizeOption.price;
        } else {
          // Fallback to first size price if selected size not found
          priceToUse = productToAdd.sizes[0].price;
        }
      }

      // Use _id for MongoDB products, fallback to id for legacy products
      const cartProductId = typeof productToAdd._id === 'object'
        ? productToAdd._id.toString()
        : (productToAdd._id || productToAdd.id);

      addToCart({
        id: cartProductId,
        name: productToAdd.name,
        price: priceToUse,
        quantity,
        size: sizeToUse,
        flavor: flavorToUse,
        addOns: selectedAddOnsDetails,
        image: imageToUse || "https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png",
        designNotes: cartDesignNotes,
        referenceImageUrl: referenceImageUrl || undefined
      });

      // Show success feedback (optional)
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleCheckout = async () => {
    // This is called from the "Checkout" button in the messenger chat
    setShowChat(false);
    setIsAnalyzingImage(true);

    try {
      let finalDesignNotes = designNotes.trim();

      // Generate summary from chat if "like picture" is checked and no custom notes
      if (useLikePicture && !designNotes.trim()) {
        if (chatMessages.length > 1) {
          const response = await fetch('/api/summarize-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: chatMessages,
              productName: product.name,
              selectedAddOns: selectedAddOns,
              selectedSize: selectedSize,
              selectedShape: selectedShape
            })
          });

          const data = await response.json();
          finalDesignNotes = data.summary || 'Make like the example photo';
        } else {
          finalDesignNotes = 'Recreate as shown in photo';
        }
      }

      const selectedAddOnsDetails = addOns.filter(a => selectedAddOns.includes(a.id));
      const selectedImageUrl = getSelectedImageUrl();
      const currentPrice = getCurrentPrice();

      // If "I want this exact design" is checked, include the image reference
      // Add color if selected
    const selectedColorName = selectedColorIndex !== null && displayProduct?.colorVariants?.[selectedColorIndex]?.name
      ? displayProduct.colorVariants[selectedColorIndex].name
      : null;
    // Add design if selected
    const selectedDesignLabel = selectedDesignIndex !== null && displayProduct?.designVariants?.[selectedDesignIndex]
      ? `Design ${selectedDesignIndex + 1}`
      : null;
    let cartDesignNotes = `Size: ${selectedSize}\nShape: ${selectedShape}\nFlavor: ${selectedFlavor}`;
    if (filteredFillings.length > 0) cartDesignNotes += `\nFilling: ${selectedFilling}`;
    if (selectedColorName) cartDesignNotes += `\nColor: ${selectedColorName}`;
    if (selectedDesignLabel) cartDesignNotes += `\nDesign: ${selectedDesignLabel}`;
    cartDesignNotes += '\n\n';
    cartDesignNotes += finalDesignNotes || '';

    // Use _id for MongoDB products, fallback to id for legacy products
    const productId = typeof displayProduct._id === 'object'
        ? displayProduct._id.toString()
        : (displayProduct._id || displayProduct.id);

      addToCart({
        id: productId,
        name: product.name,
        price: currentPrice,
        quantity,
        size: selectedSize,
        flavor: selectedFlavor,
        addOns: selectedAddOnsDetails,
        image: selectedImageUrl || product.image || "https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png",
        designNotes: cartDesignNotes,
        referenceImageUrl: referenceImageUrl || undefined
      });

      // Clear chat history
      localStorage.removeItem('kassycakes-chat-messages');

      // Redirect to cart
      router.push('/cart');
    } catch (error) {
      console.error('Error during checkout:', error);
      setIsAnalyzingImage(false);
    }
  };

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const getSelectedImageUrl = () => {
    // If a color variant is selected, use its first image
    if (selectedColorIndex !== null && displayProduct?.colorVariants?.[selectedColorIndex]?.media?.length > 0) {
      return displayProduct.colorVariants[selectedColorIndex].media[0].url;
    }

    // If a design variant is selected, use its first image
    if (selectedDesignIndex !== null && displayProduct?.designVariants?.[selectedDesignIndex]?.media?.length > 0) {
      return displayProduct.designVariants[selectedDesignIndex].media[0].url;
    }

    // For custom cakes, get URL from displayProduct's media
    if (isCustomCake && displayProduct?.media) {
      const mediaItem = displayProduct.media[selectedMediaIndex];
      if (mediaItem) {
        return mediaItem.url;
      }
    }

    // Get the URL of the currently selected image in the gallery
    if (selectedMediaIndex === 0) {
      if (product.realVideo) return product.realVideo;
      if (product.realImage) return product.realImage;
      if (product.realImages && product.realImages[0]) return product.realImages[0];
    } else if (product.realImages && product.realImages[selectedMediaIndex - 1]) {
      return product.realImages[selectedMediaIndex - 1];
    }
    return product.image || '';
  };

  const calculateTotal = () => {
    const basePrice = getCurrentPrice();
    const addOnsTotal = selectedAddOns.reduce((total, addOnId) => {
      const addOn = addOns.find(a => a.id === addOnId);
      return total + (addOn?.price || 0);
    }, 0);
    return (basePrice + addOnsTotal) * quantity;
  };

  const handleAddToCart = async () => {
    // Validate date selection FIRST
    if (!orderDate) {
      // Scroll to date section, show alert, and highlight text
      dateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowDateAlert(true);
      setHighlightDateSection(true);
      setTimeout(() => {
        setShowDateAlert(false);
        setHighlightDateSection(false);
      }, 5000);
      return;
    }

    if (fulfillmentType === 'pickup' && !pickupTime) {
      // Scroll to date section, show alert, and highlight text
      dateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowDateAlert(true);
      setHighlightDateSection(true);
      setTimeout(() => {
        setShowDateAlert(false);
        setHighlightDateSection(false);
      }, 5000);
      return;
    }

    if (fulfillmentType === 'delivery' && !deliveryTime) {
      // Scroll to date section, show alert, and highlight text
      dateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowDateAlert(true);
      setHighlightDateSection(true);
      setTimeout(() => {
        setShowDateAlert(false);
        setHighlightDateSection(false);
      }, 5000);
      return;
    }

    // Check delivery address
    if (fulfillmentType === 'delivery' && !deliveryAddress) {
      dateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowDateAlert(true);
      setHighlightDateSection(true);
      setTimeout(() => {
        setShowDateAlert(false);
        setHighlightDateSection(false);
      }, 5000);
      return;
    }

    // Check if delivery address is within delivery zone
    if (fulfillmentType === 'delivery' && deliveryAddress && !deliveryAddress.isWithinDeliveryZone) {
      dateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowDateAlert(true);
      setHighlightDateSection(true);
      setTimeout(() => {
        setShowDateAlert(false);
        setHighlightDateSection(false);
      }, 5000);
      return;
    }

    // For signature cakes - simple checkout with flavor and filling
    if (isSignatureCake) {
      const selectedImageUrl = getSelectedImageUrl();
      const currentPrice = getCurrentPrice();

      // Add color if selected
      const selectedColorName = selectedColorIndex !== null && displayProduct?.colorVariants?.[selectedColorIndex]?.name
        ? displayProduct.colorVariants[selectedColorIndex].name
        : null;

      // Add design if selected
      const selectedDesignLabel = selectedDesignIndex !== null && displayProduct?.designVariants?.[selectedDesignIndex]
        ? `Design ${selectedDesignIndex + 1}`
        : null;
      let cartDesignNotes = `Size: ${selectedSize}\nShape: ${selectedShape}\nFlavor: ${selectedFlavor}`;
      if (filteredFillings.length > 0) cartDesignNotes += `\nFilling: ${selectedFilling}`;
      if (selectedColorName) cartDesignNotes += `\nColor: ${selectedColorName}`;
      if (selectedDesignLabel) cartDesignNotes += `\nDesign: ${selectedDesignLabel}`;
      if (cakeWriting.trim()) {
        cartDesignNotes += `\nWriting: ${cakeWriting.trim()}`;
      }
      cartDesignNotes += `\n\nDesign: Recreate as shown in photo`;

      // Use _id for MongoDB products, fallback to id for legacy products
      const productId = typeof displayProduct._id === 'object'
        ? displayProduct._id.toString()
        : (displayProduct._id || displayProduct.id);

      const cartItem = {
        id: productId,
        name: displayProduct.name,
        price: currentPrice,
        quantity,
        size: selectedSize,
        flavor: selectedFlavor,
        addOns: [],
        image: selectedImageUrl || displayProduct.image || "https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png",
        designNotes: cartDesignNotes,
      };

      addToCart({
        ...cartItem,
        edibleImageUrl: edibleImageUrl || undefined,
        referenceImageUrl: referenceImageUrl || undefined,
        isEditablePhoto: product.allowEditablePhoto && referenceImageUrl ? true : false,
        // Add delivery info
        fulfillmentType,
        orderDate: orderDate.toISOString(),
        pickupDate: pickupDate ? pickupDate.toISOString() : undefined,
        deliveryTime: fulfillmentType === 'delivery' ? deliveryTime : undefined,
        pickupTime: fulfillmentType === 'pickup' ? pickupTime : undefined,
        deliveryAddress: fulfillmentType === 'delivery' && deliveryAddress ? {
          street: deliveryAddress.street,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          zipCode: deliveryAddress.zipCode,
          fullAddress: deliveryAddress.fullAddress,
        } : undefined,
      });

      // Mark that item was added to cart so temp images won't be deleted on unmount
      wasAddedToCartRef.current = true;

      router.push('/cart');
      return;
    }

    // For custom cakes - full customization flow
    // Validate that Design Notes are provided (either typed or from "like picture")
    if (!designNotes.trim() && !useLikePicture) {
      // Scroll to design notes section and show alert
      designNotesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setShowDesignNotesAlert(true);
      // Focus and select the textarea after scroll completes
      setTimeout(() => {
        designNotesTextareaRef.current?.focus();
        designNotesTextareaRef.current?.select();
      }, 800); // Delay to allow smooth scroll to complete
      // Dismiss alert after 5 seconds
      setTimeout(() => setShowDesignNotesAlert(false), 5000);
      return;
    }

    let finalDesignNotes = designNotes.trim();

    // If "like picture" is checked and no custom notes, generate summary
    if (useLikePicture && !designNotes.trim()) {
      setIsAnalyzingImage(true);
      try {
        // If there were chat messages, summarize the conversation
        if (chatMessages.length > 1) { // More than just initial greeting
          const response = await fetch('/api/summarize-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: chatMessages,
              productName: product.name,
              selectedAddOns: selectedAddOns
            })
          });

          const data = await response.json();
          finalDesignNotes = data.summary || 'Make like the example photo';
        } else {
          // No chat conversation, just use simple text
          finalDesignNotes = 'Recreate as shown in photo';
        }
      } catch (error) {
        console.error('Error generating summary:', error);
        finalDesignNotes = 'Make like the example photo';
      } finally {
        setIsAnalyzingImage(false);
      }
    }

    const selectedAddOnsDetails = addOns.filter(a => selectedAddOns.includes(a.id));
    const selectedImageUrl = getSelectedImageUrl();
    const currentPrice = getCurrentPrice();

    // If "I want this exact design" is checked, include the image reference
    // Add color if selected
    const selectedColorName = selectedColorIndex !== null && displayProduct?.colorVariants?.[selectedColorIndex]?.name
      ? displayProduct.colorVariants[selectedColorIndex].name
      : null;
    // Add design if selected
    const selectedDesignLabel = selectedDesignIndex !== null && displayProduct?.designVariants?.[selectedDesignIndex]
      ? `Design ${selectedDesignIndex + 1}`
      : null;
    let cartDesignNotes = `Size: ${selectedSize}\nShape: ${selectedShape}\nFlavor: ${selectedFlavor}`;
    if (filteredFillings.length > 0) cartDesignNotes += `\nFilling: ${selectedFilling}`;
    if (selectedColorName) cartDesignNotes += `\nColor: ${selectedColorName}`;
    if (selectedDesignLabel) cartDesignNotes += `\nDesign: ${selectedDesignLabel}`;
    cartDesignNotes += '\n\n';

    // If "Make like photo" is checked, add note about reference image
    if (useLikePicture) {
      cartDesignNotes += `📸 Reference Image: Recreate as shown in photo\n\n`;
    }

    cartDesignNotes += finalDesignNotes || '';

    // Use _id for MongoDB products, fallback to id for legacy products
    const productId = typeof displayProduct._id === 'object'
      ? displayProduct._id.toString()
      : (displayProduct._id || displayProduct.id);

    addToCart({
      id: productId,
      name: displayProduct.name,
      price: currentPrice,
      quantity,
      size: selectedSize,
      flavor: selectedFlavor,
      addOns: selectedAddOnsDetails,
      image: selectedImageUrl || product.image || "https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png",
      designNotes: cartDesignNotes,
      edibleImageUrl: edibleImageUrl || undefined,
      referenceImageUrl: referenceImageUrl || (useLikePicture ? selectedImageUrl : undefined),
      // Add delivery info
      fulfillmentType,
      orderDate: orderDate.toISOString(),
      pickupDate: pickupDate ? pickupDate.toISOString() : undefined,
      deliveryTime: fulfillmentType === 'delivery' ? deliveryTime : undefined,
      pickupTime: fulfillmentType === 'pickup' ? pickupTime : undefined,
      deliveryAddress: fulfillmentType === 'delivery' && deliveryAddress ? {
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        zipCode: deliveryAddress.zipCode,
        fullAddress: deliveryAddress.fullAddress,
      } : undefined,
    });

    // Mark that item was added to cart so temp images won't be deleted on unmount
    wasAddedToCartRef.current = true;

    // Clear chat history
    localStorage.removeItem('kassycakes-chat-messages');

    // Redirect to cart
    router.push('/cart');
  };

  // Handle custom cake request submission
  const handleSubmitRequest = async () => {
    // Validate date selection
    if (!orderDate) {
      dateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowDateAlert(true);
      setHighlightDateSection(true);
      setTimeout(() => {
        setShowDateAlert(false);
        setHighlightDateSection(false);
      }, 5000);
      return;
    }

    // Validate design notes
    if (!designNotes.trim()) {
      designNotesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setShowDesignNotesAlert(true);
      setTimeout(() => {
        designNotesTextareaRef.current?.focus();
        designNotesTextareaRef.current?.select();
      }, 800);
      setTimeout(() => setShowDesignNotesAlert(false), 5000);
      return;
    }

    // Validate customer info
    if (!customerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsSubmittingRequest(true);

    try {
      const selectedAddOnsDetails = addOns.filter(a => selectedAddOns.includes(a.id));
      const currentPrice = getCurrentPrice();
      const addOnsTotal = selectedAddOnsDetails.reduce((sum, a) => sum + a.price, 0);
      const estimatedPrice = (currentPrice + addOnsTotal) * quantity;

      const productId = typeof product._id === 'object'
        ? product._id.toString()
        : (product._id || product.id);

      const response = await fetch('/api/custom-cake-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerInfo: {
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim() || undefined,
          },
          cakeDetails: {
            productId,
            productName: product.name,
            size: selectedSize,
            flavor: selectedFlavor,
            filling: selectedFilling,
            designNotes: designNotes.trim(),
            estimatedPrice,
            addOns: selectedAddOnsDetails.map(a => ({
              id: a.id,
              name: a.name,
              price: a.price,
            })),
            edibleImageUrl: edibleImageUrl || undefined,
            referenceImageUrl: referenceImageUrl || undefined,
            fulfillmentType,
            requestedDate: orderDate.toISOString(),
            deliveryTime: fulfillmentType === 'delivery' ? deliveryTime : undefined,
            pickupTime: fulfillmentType === 'pickup' ? pickupTime : undefined,
            deliveryAddress: fulfillmentType === 'delivery' && deliveryAddress ? {
              street: deliveryAddress.street,
              city: deliveryAddress.city,
              state: deliveryAddress.state,
              zipCode: deliveryAddress.zipCode,
              fullAddress: deliveryAddress.fullAddress,
            } : undefined,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setRequestNumber(data.requestNumber);
        setShowRequestSuccess(true);
        // Mark that request was submitted so temp images won't be deleted
        wasAddedToCartRef.current = true;
      } else {
        alert(data.error || 'Failed to submit request. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Render minimal placeholder while product loads (should be instant from pre-transformed context)
  if (!product) {
    // Show a skeleton loader instead of blank div to reduce perceived loading time
    return (
      <div className="min-h-screen bg-creamWhite">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="h-8 w-32 bg-deepBurgundy/10 rounded animate-pulse mb-8"></div>
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="bg-white rounded-lg p-8 baroque-shadow">
              <div className="aspect-square bg-deepBurgundy/10 rounded-lg animate-pulse mb-6"></div>
            </div>
            <div className="bg-white rounded-lg p-8 baroque-shadow">
              <div className="h-8 bg-deepBurgundy/10 rounded animate-pulse mb-4"></div>
              <div className="h-4 bg-deepBurgundy/10 rounded animate-pulse mb-8 w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Custom cake request success screen
  if (showRequestSuccess) {
    return (
      <div className="min-h-screen bg-creamWhite flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-kassyPink to-[#c97a8f] p-8 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-playfair text-2xl md:text-3xl font-bold text-white">
              Request Sent!
            </h2>
          </div>

          {/* Content */}
          <div className="p-8 text-center">
            <p className="font-cormorant text-lg text-deepBurgundy mb-4">
              Your custom cake request has been submitted successfully!
            </p>
            <p className="font-cormorant text-deepBurgundy/70 mb-6">
              Kassy will review your request and get back to you within 24 hours to discuss details and finalize pricing.
            </p>

            {requestNumber && (
              <div className="bg-kassyPink/10 rounded-lg p-4 mb-6">
                <p className="font-cormorant text-sm text-deepBurgundy/70">Request Number</p>
                <p className="font-playfair text-lg font-semibold text-kassyPink">{requestNumber}</p>
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/cakes"
                className="block w-full bg-kassyPink hover:bg-baroqueGold text-white font-playfair px-8 py-4 rounded-full transition-all duration-300"
              >
                Browse More Cakes
              </Link>
              <Link
                href="/"
                className="block w-full border-2 border-kassyPink text-kassyPink hover:bg-kassyPink hover:text-white font-playfair px-8 py-4 rounded-full transition-all duration-300"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For quote-only products (Wedding Cake), show a simplified page with just the quote form
  if (isQuoteOnly) {
    const productImage = product.media?.[0]?.url || product.realImage;

    return (
      <div className="min-h-screen bg-creamWhite">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link
            href={`/cakes?tab=${tabParam}&scrollTo=${params.id}`}
            className="inline-flex items-center text-kassyPink hover:text-baroqueGold mb-8 font-cormorant text-lg"
          >
            ← Back to Catalog
          </Link>

          <div className="bg-white rounded-lg baroque-shadow overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-kassyPink to-[#c97a8f] p-8 text-center">
              <h1 className="font-playfair text-3xl md:text-4xl font-bold text-white mb-2">
                {product.name}
              </h1>
              <p className="font-cormorant text-white/90 text-lg">
                {product.tagline || product.description}
              </p>
            </div>

            {/* Product Image */}
            {productImage && (
              <div className="p-8 flex justify-center bg-creamWhite/50">
                <img
                  src={productImage}
                  alt={product.name}
                  className="max-w-md w-full rounded-lg shadow-lg"
                />
              </div>
            )}

            {/* Quote Info */}
            <div className="p-8 text-center">
              <div className="bg-baroqueGold/10 border border-baroqueGold/30 rounded-lg p-6 mb-6">
                <h2 className="font-playfair text-xl font-bold text-deepBurgundy mb-2">
                  Request a Custom Quote
                </h2>
                <p className="font-cormorant text-deepBurgundy/80">
                  Every wedding cake is unique! Tell me about your vision and I'll create a personalized quote just for you.
                </p>
              </div>

              <button
                onClick={() => setShowQuoteModal(true)}
                className="bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-lg px-10 py-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Get Quote
              </button>
            </div>
          </div>
        </div>

        {/* Quote Modal */}
        <WeddingCakeQuoteModal
          isOpen={showQuoteModal}
          onClose={() => {
            setShowQuoteModal(false);
            // Navigate back to catalog when modal closes
            router.push(`/cakes?tab=${tabParam}#catalog`);
          }}
          productImage={productImage}
        />

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-creamWhite">
      {/* Date Selection Alert Notification */}
      {showDateAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-kassyPink to-baroqueGold text-white px-6 py-4 shadow-xl">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="font-playfair text-lg font-semibold">Date & Time Required</p>
                  <p className="font-cormorant text-sm">Please select a pickup or delivery date and time to continue.</p>
                </div>
              </div>
              <button
                onClick={() => setShowDateAlert(false)}
                className="text-white hover:text-deepBurgundy text-2xl transition-colors ml-4"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Design Notes Alert Notification */}
      {showDesignNotesAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-kassyPink to-baroqueGold text-white px-6 py-4 shadow-xl">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎨</span>
                <div>
                  <p className="font-playfair text-lg font-semibold">Design Notes Required</p>
                  <p className="font-cormorant text-sm">Please provide design notes or upload a reference photo to continue.</p>
                </div>
              </div>
              <button
                onClick={() => setShowDesignNotesAlert(false)}
                className="text-white hover:text-deepBurgundy text-2xl transition-colors ml-4"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-12 overflow-x-hidden">
        <Link
          href={`/cakes?tab=${tabParam}&scrollTo=${params.id}`}
          className="inline-flex items-center text-kassyPink hover:text-baroqueGold mb-8 font-cormorant text-lg"
        >
          ← Back to Catalog
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Info */}
          <div className="overflow-hidden">
            <div className="bg-white rounded-lg p-8 baroque-shadow overflow-hidden">
              {/* Product Images/Videos */}
              {displayProduct.realImage || displayProduct.realVideo || displayProduct.realImages || displayProduct.media?.length > 0 ? (
                <div className="mb-6 overflow-hidden">
                  <h1 className="text-center font-playfair text-3xl font-bold text-deepBurgundy mb-4">
                    {getCleanProductName()}
                  </h1>

                  {/* Main Display */}
                  <div className="rounded-lg overflow-hidden bg-white border-2 border-deepBurgundy/10 aspect-square relative max-w-md mx-auto group">
                    {(() => {
                      const sizeBasedImage = getSizeBasedImage();

                      // For custom cakes, show gallery media based on selected shape
                      if (isCustomCake && selectedMediaIndex === 0 && displayProduct.media && displayProduct.media.length > 0) {
                        const firstMedia = displayProduct.media[0];
                        if (firstMedia.type === 'video') {
                          return (
                            <video
                              src={firstMedia.url}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover cursor-pointer"
                              style={{ position: 'absolute', top: 0, left: 0 }}
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          );
                        } else {
                          return (
                            <img
                              src={firstMedia.url}
                              alt={`${displayProduct.name} - Gallery Image 1`}
                              className="w-full aspect-square object-cover bg-creamWhite"
                              onContextMenu={(e) => e.preventDefault()}
                              draggable={false}
                              loading="lazy"
                            />
                          );
                        }
                      }

                      // For custom cakes, show selected gallery media
                      if (isCustomCake && selectedMediaIndex > 0 && displayProduct.media && displayProduct.media[selectedMediaIndex]) {
                        const selectedMedia = displayProduct.media[selectedMediaIndex];
                        if (selectedMedia.type === 'video') {
                          return (
                            <video
                              src={selectedMedia.url}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover cursor-pointer"
                              style={{ position: 'absolute', top: 0, left: 0 }}
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          );
                        } else {
                          return (
                            <img
                              src={selectedMedia.url}
                              alt={`${displayProduct.name} - Gallery Image ${selectedMediaIndex + 1}`}
                              className="w-full aspect-square object-cover bg-creamWhite"
                              onContextMenu={(e) => e.preventDefault()}
                              draggable={false}
                              loading="lazy"
                            />
                          );
                        }
                      }

                      // Special handling for product 2 - show base image with illustration overlay
                      if (product.id === 2 && selectedMediaIndex === 0) {
                        return (
                          <div className="relative w-full h-full bg-creamWhite" onContextMenu={(e) => e.preventDefault()}>
                            {/* Base image - always visible */}
                            <img
                              src={product.realImage || ""}
                              alt={`${product.name}`}
                              className="w-full aspect-square object-cover"
                              onContextMenu={(e) => e.preventDefault()}
                              draggable={false}
                              loading="lazy"
                            />
                            {/* Illustration overlay - fades in and out */}
                            {showIllustration && sizeBasedImage && (
                              <div
                                className="absolute inset-0 transition-opacity duration-500"
                                style={{ opacity: isFadingOut ? 0 : 1 }}
                              >
                                <img
                                  src={sizeBasedImage}
                                  alt={`${product.name} - ${selectedSize}`}
                                  className="w-full aspect-square object-cover"
                                  onContextMenu={(e) => e.preventDefault()}
                                  draggable={false}
                                />
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (sizeBasedImage && selectedMediaIndex === 0) {
                        return (
                          <img
                            src={sizeBasedImage}
                            alt={`${product.name} - ${selectedSize}`}
                            className="w-full aspect-square object-cover bg-creamWhite"
                            onContextMenu={(e) => e.preventDefault()}
                            draggable={false}
                            loading="lazy"
                          />
                        );
                      }

                      // Check for media in media array (from Manage Cakes uploads) - prioritize this over realImage/realVideo
                      if (!isCustomCake && selectedMediaIndex === 0 && product.media && product.media.length > 0) {
                        const firstMedia = product.media[0];
                        if (firstMedia.type === 'video') {
                          return (
                            <video
                              ref={videoRef}
                              src={firstMedia.url}
                              autoPlay
                              loop
                              muted
                              playsInline
                              onClick={handleVideoClick}
                              className="w-full h-full object-cover cursor-pointer"
                              style={{ position: 'absolute', top: 0, left: 0 }}
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          );
                        } else {
                          // First media is an image
                          return (
                            <CroppedImage
                              src={firstMedia.url}
                              alt={`${product.name} - Gallery Image 1`}
                              cropData={firstMedia.cropData}
                              className="w-full aspect-square object-cover bg-creamWhite"
                            />
                          );
                        }
                      }

                      if (selectedMediaIndex === 0 && product.realVideo) {
                        return (
                          <video
                            ref={videoRef}
                            src={product.realVideo}
                            autoPlay
                            loop
                            muted
                            playsInline
                            onClick={handleVideoClick}
                            className="w-full h-full object-cover cursor-pointer"
                            style={{ position: 'absolute', top: 0, left: 0 }}
                            onContextMenu={(e) => e.preventDefault()}
                          />
                        );
                      }

                      if (selectedMediaIndex === 0 && product.realImage) {
                        return (
                          <CroppedImage
                            src={product.realImage}
                            alt={`${product.name} - Real Photo`}
                            cropData={product.realImageCrop}
                            className="w-full aspect-square object-cover bg-creamWhite"
                          />
                        );
                      }

                      if (selectedMediaIndex === 0 && product.realImages && product.realImages[0]) {
                        return (
                          <CroppedImage
                            src={product.realImages[0]}
                            alt={`${product.name} - Gallery Image 1`}
                            cropData={product.realImagesCrop?.[0]}
                            className="w-full aspect-square object-cover bg-creamWhite"
                          />
                        );
                      }

                      // Check for media in media array at selected index (for non-custom cakes)
                      if (!isCustomCake && product.media && product.media[selectedMediaIndex]) {
                        const selectedMedia = product.media[selectedMediaIndex];
                        if (selectedMedia.type === 'video') {
                          return (
                            <video
                              src={selectedMedia.url}
                              autoPlay
                              loop
                              muted
                              playsInline
                              onClick={handleVideoClick}
                              className="w-full h-full object-cover cursor-pointer"
                              style={{ position: 'absolute', top: 0, left: 0 }}
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          );
                        } else {
                          return (
                            <CroppedImage
                              src={selectedMedia.url}
                              alt={`${product.name} - Gallery Image ${selectedMediaIndex + 1}`}
                              cropData={selectedMedia.cropData}
                              className="w-full aspect-square object-cover bg-creamWhite"
                            />
                          );
                        }
                      }

                      if (product.realImages && product.realImages[selectedMediaIndex - 1]) {
                        return (
                          <CroppedImage
                            src={product.realImages[selectedMediaIndex - 1]}
                            alt={`${product.name} - Gallery Image ${selectedMediaIndex}`}
                            cropData={product.realImagesCrop?.[selectedMediaIndex - 1]}
                            className="w-full aspect-square object-cover bg-creamWhite"
                          />
                        );
                      }

                      return null;
                    })()}

                    {/* Navigation Arrows */}
                    {(() => {
                      // Check if there are multiple media items to navigate
                      let totalMedia = 0;
                      if (isCustomCake && displayProduct.media) {
                        totalMedia = displayProduct.media.length;
                      } else if (product.id !== 2) {
                        // Check for media array first
                        if (product.media && product.media.length > 0) {
                          totalMedia = product.media.length;
                        } else {
                          const hasMainMedia = !!(product.realVideo || product.realImage);
                          const galleryCount = product.realImages ? product.realImages.length : 0;
                          totalMedia = (hasMainMedia ? 1 : 0) + galleryCount;
                        }
                      }

                      if (totalMedia <= 1) return null;

                      return (
                        <>
                          {/* Previous Arrow */}
                          {selectedMediaIndex > 0 && (
                            <button
                              onClick={() => setSelectedMediaIndex(selectedMediaIndex - 1)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-deepBurgundy rounded-full p-2 shadow-lg transition-all duration-200 md:opacity-0 md:group-hover:opacity-100 z-10"
                              aria-label="Previous image"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                          )}

                          {/* Next Arrow */}
                          {selectedMediaIndex < totalMedia - 1 && (
                            <button
                              onClick={() => setSelectedMediaIndex(selectedMediaIndex + 1)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-deepBurgundy rounded-full p-2 shadow-lg transition-all duration-200 md:opacity-0 md:group-hover:opacity-100 z-10"
                              aria-label="Next image"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Thumbnail Gallery - Show for custom cakes or if multiple images */}
                  {(() => {
                    // For custom cakes, show gallery from displayProduct
                    if (isCustomCake && displayProduct.media && displayProduct.media.length > 1) {
                      return true;
                    }
                    // For other products
                    if (product.id === 2) return false; // Hide gallery for product 2
                    // Check media array first
                    if (product.media && product.media.length > 1) {
                      return true;
                    }
                    const hasMainMedia = !!(product.realVideo || product.realImage);
                    const galleryCount = product.realImages ? product.realImages.length : 0;
                    const totalImages = (hasMainMedia ? 1 : 0) + galleryCount;
                    return totalImages > 1;
                  })() && (
                    <div className="mt-4 w-full">
                      {/* Divider Line */}
                      <div className="border-t-2 border-deepBurgundy/10 mb-3"></div>

                      {/* Horizontal Scrollable Thumbnails */}
                      <div className="overflow-x-auto overflow-y-hidden scrollbar-hide cursor-grab active:cursor-grabbing w-full max-w-full"
                           style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
                           onMouseDown={(e) => {
                             const ele = e.currentTarget;
                             const startX = e.pageX - ele.offsetLeft;
                             const scrollLeft = ele.scrollLeft;

                             const onMouseMove = (e: MouseEvent) => {
                               const x = e.pageX - ele.offsetLeft;
                               const walk = (x - startX) * 2;
                               ele.scrollLeft = scrollLeft - walk;
                             };

                             const onMouseUp = () => {
                               document.removeEventListener('mousemove', onMouseMove);
                               document.removeEventListener('mouseup', onMouseUp);
                             };

                             document.addEventListener('mousemove', onMouseMove);
                             document.addEventListener('mouseup', onMouseUp);
                           }}>
                        <div className="flex gap-2 pb-2 w-max">
                      {/* For custom cakes, show media gallery thumbnails */}
                      {isCustomCake && displayProduct.media ? (
                        displayProduct.media.map((mediaItem: any, index: number) => (
                          <div
                            key={index}
                            ref={(el) => { thumbnailRefs.current[index] = el; }}
                            onClick={() => setSelectedMediaIndex(index)}
                            onContextMenu={(e) => e.preventDefault()}
                            className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer w-20 h-20 relative ${
                              selectedMediaIndex === index
                                ? 'border-kassyPink ring-2 ring-kassyPink'
                                : 'border-deepBurgundy/10 hover:border-kassyPink'
                            }`}
                          >
                            {mediaItem.type === 'video' ? (
                              <>
                                <video
                                  src={mediaItem.url}
                                  muted
                                  className="w-full h-full object-cover"
                                  onContextMenu={(e) => e.preventDefault()}
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="white" className="drop-shadow-lg">
                                    <path d="m380-300 280-180-280-180v360ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                                  </svg>
                                </div>
                              </>
                            ) : (
                              <img
                                src={mediaItem.url}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                                onContextMenu={(e) => e.preventDefault()}
                                draggable={false}
                                loading="lazy"
                              />
                            )}
                          </div>
                        ))
                      ) : (
                        <>
                          {/* Media array thumbnails (from Manage Cakes) */}
                          {product.media && product.media.length > 0 ? (
                            product.media.map((mediaItem: any, index: number) => (
                              <div
                                key={index}
                                ref={(el) => { thumbnailRefs.current[index] = el; }}
                                onClick={() => setSelectedMediaIndex(index)}
                                onContextMenu={(e) => e.preventDefault()}
                                className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer w-20 h-20 relative ${
                                  selectedMediaIndex === index
                                    ? 'border-kassyPink ring-2 ring-kassyPink'
                                    : 'border-deepBurgundy/10 hover:border-kassyPink'
                                }`}
                              >
                                {mediaItem.type === 'video' ? (
                                  <>
                                    <video
                                      src={mediaItem.url}
                                      muted
                                      className="w-full h-full object-cover"
                                      onContextMenu={(e) => e.preventDefault()}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="white" className="drop-shadow-lg">
                                        <path d="m380-300 280-180-280-180v360ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                                      </svg>
                                    </div>
                                  </>
                                ) : (
                                  <img
                                    src={mediaItem.url}
                                    alt={`Thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onContextMenu={(e) => e.preventDefault()}
                                    draggable={false}
                                    loading="lazy"
                                  />
                                )}
                              </div>
                            ))
                          ) : (
                            <>
                              {/* Video/Main Image Thumbnail */}
                              {(product.realVideo || product.realImage) && (
                            <div
                              ref={(el) => { thumbnailRefs.current[0] = el; }}
                              onClick={() => setSelectedMediaIndex(0)}
                              onContextMenu={(e) => e.preventDefault()}
                              className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer w-20 h-20 relative ${
                                selectedMediaIndex === 0
                                  ? 'border-kassyPink ring-2 ring-kassyPink'
                                  : 'border-deepBurgundy/10 hover:border-kassyPink'
                              }`}
                            >
                              {product.realVideo ? (
                                <>
                                  <video
                                    src={product.realVideo}
                                    muted
                                    className="w-full h-full object-cover"
                                    onContextMenu={(e) => e.preventDefault()}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="white" className="drop-shadow-lg">
                                      <path d="m380-300 280-180-280-180v360ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                                    </svg>
                                  </div>
                                </>
                              ) : product.realImage ? (
                                <img
                                  src={product.realImage}
                                  alt="Main thumbnail"
                                  className="w-full h-full object-cover"
                                  onContextMenu={(e) => e.preventDefault()}
                                  draggable={false}
                                  loading="lazy"
                                />
                              ) : null}
                            </div>
                          )}

                          {/* Gallery Image Thumbnails */}
                          {product.realImages && product.realImages.map((img: string, index: number) => {
                            // If there's no video/realImage, gallery images start at index 0
                            // Otherwise they start at index 1
                            const thumbnailIndex = (product.realVideo || product.realImage) ? index + 1 : index;
                            return (
                              <div
                                key={index}
                                ref={(el) => { thumbnailRefs.current[thumbnailIndex] = el; }}
                                onClick={() => setSelectedMediaIndex(thumbnailIndex)}
                                onContextMenu={(e) => e.preventDefault()}
                                className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer w-20 h-20 ${
                                  selectedMediaIndex === thumbnailIndex
                                    ? 'border-kassyPink ring-2 ring-kassyPink'
                                    : 'border-deepBurgundy/10 hover:border-kassyPink'
                                }`}
                              >
                                <CroppedImage
                                  src={img}
                                  alt={`Thumbnail ${index + 1}`}
                                  cropData={product.realImagesCrop?.[index]}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            );
                          })}
                            </>
                          )}
                        </>
                      )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : product.image ? (
                <div className="mb-6">
                  <h1 className="text-center font-playfair text-3xl font-bold text-deepBurgundy mb-4">
                    {getCleanProductName()}
                  </h1>
                  <div className="rounded-lg overflow-hidden bg-creamWhite max-w-md mx-auto" onContextMenu={(e) => e.preventDefault()}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full aspect-square object-cover"
                      onContextMenu={(e) => e.preventDefault()}
                      draggable={false}
                      loading="lazy"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mb-4 inline-block px-4 py-1 bg-kassyPink/20 rounded-full">
                <span className="font-cormorant text-deepBurgundy capitalize">{product.category}</span>
              </div>

              <div className="flex items-baseline gap-4 mb-6">
                <span className="font-playfair text-4xl font-bold text-kassyPink">
                  ${getCurrentPrice().toFixed(2)}
                </span>
                <span className="font-cormorant text-lg text-deepBurgundy/60">
                  base price
                </span>
              </div>
            </div>
          </div>

          {/* Customization */}
          <div>
            {/* For Signature Cakes: Show design note at the top */}
            {isSignatureCake && (
              <div className="mb-6 bg-kassyPink/10 border-l-4 border-kassyPink rounded-r-lg p-4">
                <p className="font-cormorant text-sm text-deepBurgundy/80">
                  <span className="font-bold">Note:</span> {product.allowEditablePhoto
                    ? 'This is a signature design - you can replace the edible photo on the cake with your own. You can also select your flavor, filling, and add writing.'
                    : 'This is a signature design - the cake will be recreated as shown in the photo. You can select your flavor, filling, and add writing.'}
                </p>
              </div>
            )}

            {/* Delivery Method & Date Selection - FIRST STEP */}
            <div ref={dateSectionRef} className="mb-8">
              <div className="bg-gradient-to-br from-kassyPink/5 to-baroqueGold/5 border-2 border-kassyPink/30 rounded-lg p-6 baroque-shadow">
                {/* Fulfillment Type Selection */}
                <div className="mb-4">
                  <label className="block font-playfair font-semibold text-sm text-deepBurgundy mb-2">
                    How would you like to receive your order? *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setFulfillmentType('pickup');
                        setDeliveryTime(''); // Clear delivery time when switching to pickup
                      }}
                      type="button"
                      className={`p-4 rounded-lg border-2 transition-all ${
                        fulfillmentType === 'pickup'
                          ? 'border-kassyPink bg-kassyPink/10'
                          : 'border-deepBurgundy/20 hover:border-kassyPink'
                      }`}
                    >
                      <div className="text-2xl mb-2">🎂</div>
                      <div className="font-playfair font-semibold text-deepBurgundy">Pickup</div>
                      <div className="text-xs text-deepBurgundy/60 mt-1">Kyle, TX</div>
                      <div className="text-xs text-deepBurgundy/60">Free • 6AM-10PM</div>
                    </button>
                    <button
                      onClick={() => {
                        setFulfillmentType('delivery');
                        setPickupTime(''); // Clear pickup time when switching to delivery
                      }}
                      type="button"
                      className={`p-4 rounded-lg border-2 transition-all ${
                        fulfillmentType === 'delivery'
                          ? 'border-kassyPink bg-kassyPink/10'
                          : 'border-deepBurgundy/20 hover:border-kassyPink'
                      }`}
                    >
                      <div className="text-2xl mb-2">📦</div>
                      <div className="font-playfair font-semibold text-deepBurgundy">Delivery</div>
                      <div className="text-xs text-deepBurgundy/60 mt-1">Austin, TX area</div>
                      <div className="text-xs text-deepBurgundy/60">$40 • After 5PM</div>
                    </button>
                  </div>
                </div>

                {/* Date Selection with Calendar */}
                <div className="mb-4">
                  <label className="block font-playfair font-semibold text-sm text-deepBurgundy mb-2">
                    {fulfillmentType === 'pickup' ? 'Select Pickup Date *' : 'Select Delivery Date *'}
                  </label>
                  <div className="min-h-[320px]">
                    <CustomerScheduleCalendar
                      selectedDate={orderDate}
                      onDateSelect={(date) => {
                        setOrderDate(date);
                        setPickupDate(date); // Set pickupDate same as orderDate
                      }}
                      fulfillmentType={fulfillmentType}
                      minDaysAhead={10}
                    />
                  </div>
                </div>

                {/* Time Selection with min-height to prevent layout shift */}
                <div style={{ minHeight: '80px' }}>
                  {/* Pickup Time Selection - Only for pickup */}
                  {fulfillmentType === 'pickup' && orderDate && (
                    <div className="mt-4">
                      <label className="block font-playfair font-semibold text-sm text-deepBurgundy mb-2">
                        Select Pickup Time *
                      </label>
                      <select
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-base bg-white"
                      >
                        <option value="">Choose a time...</option>
                        <option value="12:00 PM - 1:00 PM">12:00 PM - 1:00 PM</option>
                        <option value="1:00 PM - 2:00 PM">1:00 PM - 2:00 PM</option>
                        <option value="2:00 PM - 3:00 PM">2:00 PM - 3:00 PM</option>
                        <option value="3:00 PM - 4:00 PM">3:00 PM - 4:00 PM</option>
                        <option value="4:00 PM - 5:00 PM">4:00 PM - 5:00 PM</option>
                        <option value="5:00 PM - 6:00 PM">5:00 PM - 6:00 PM</option>
                        <option value="6:00 PM - 7:00 PM">6:00 PM - 7:00 PM</option>
                        <option value="7:00 PM - 8:00 PM">7:00 PM - 8:00 PM</option>
                      </select>
                    </div>
                  )}

                  {/* Delivery Time Selection - Only for delivery */}
                  {fulfillmentType === 'delivery' && orderDate && (
                    <div className="mt-4">
                      <label className="block font-playfair font-semibold text-sm text-deepBurgundy mb-2">
                        Select Delivery Time *
                      </label>
                      <p className="text-xs text-deepBurgundy/60 mb-3">
                        All deliveries are made after 5PM
                      </p>
                      <select
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-base bg-white"
                      >
                        <option value="">Choose a time...</option>
                        <option value="5:00 PM - 6:00 PM">5:00 PM - 6:00 PM</option>
                        <option value="6:00 PM - 7:00 PM">6:00 PM - 7:00 PM</option>
                        <option value="7:00 PM - 8:00 PM">7:00 PM - 8:00 PM</option>
                        <option value="8:00 PM - 9:00 PM">8:00 PM - 9:00 PM</option>
                        <option value="9:00 PM - 10:00 PM">9:00 PM - 10:00 PM</option>
                      </select>

                      {/* Delivery Address Input */}
                      <div className="mt-6">
                        <DeliveryAddressInput
                          onAddressChange={setDeliveryAddress}
                          initialAddress={deliveryAddress}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Color Selection - Only show if product has color variants */}
            {displayProduct?.colorVariants && displayProduct.colorVariants.length > 0 && (
              <div className="mb-8">
                <div className="bg-white rounded-lg p-6 baroque-shadow">
                  <h3 className="font-playfair text-xl font-semibold text-deepBurgundy mb-4">
                    Select Your Color
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {displayProduct.colorVariants.map((variant: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedColorIndex(selectedColorIndex === index ? null : index);
                          setSelectedMediaIndex(0); // Reset to first image when color changes
                        }}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-300 ${
                          selectedColorIndex === index
                            ? 'border-kassyPink bg-kassyPink/10'
                            : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                          style={{ backgroundColor: variant.color }}
                        />
                        <span className="font-cormorant text-deepBurgundy">
                          {variant.name || 'Color ' + (index + 1)}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Show color-specific images when a color is selected */}
                  {selectedColorIndex !== null && displayProduct.colorVariants[selectedColorIndex]?.media?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-deepBurgundy/10">
                      <p className="text-sm text-deepBurgundy/60 mb-3">
                        {displayProduct.colorVariants[selectedColorIndex].name} color photos:
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {displayProduct.colorVariants[selectedColorIndex].media.map((mediaItem: any, mediaIndex: number) => (
                          <div
                            key={mediaIndex}
                            onClick={() => setExpandedColorImage(mediaItem.url)}
                            className="relative rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-kassyPink hover:scale-105 transition-all"
                          >
                            <img
                              src={mediaItem.url}
                              alt={`${displayProduct.colorVariants[selectedColorIndex].name} - ${mediaIndex + 1}`}
                              className="w-full aspect-square object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all hidden md:flex items-center justify-center opacity-0 hover:opacity-100">
                              <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Design Selection - Only show if product has design variants */}
            {displayProduct?.designVariants && displayProduct.designVariants.length > 0 && (
              <div className="mb-8">
                <div className="bg-white rounded-lg p-6 baroque-shadow">
                  <h3 className="font-playfair text-xl font-semibold text-deepBurgundy mb-4">
                    Select Your Design
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {displayProduct.designVariants.map((variant: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedDesignIndex(selectedDesignIndex === index ? null : index);
                          setSelectedMediaIndex(0);
                        }}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                          selectedDesignIndex === index
                            ? 'border-kassyPink ring-2 ring-kassyPink/50'
                            : 'border-deepBurgundy/20 hover:border-kassyPink'
                        }`}
                      >
                        {variant.media && variant.media.length > 0 && (
                          <img
                            src={variant.media[0].url}
                            alt={'Design ' + (index + 1)}
                            className="w-full aspect-square object-cover"
                          />
                        )}
                        {/* Checkmark for selected */}
                        {selectedDesignIndex === index && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-kassyPink rounded-full flex items-center justify-center shadow-md">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Size Selection */}
            <div className="mb-8">
              <div className="bg-white rounded-lg p-6 baroque-shadow">
                <h3 className="font-playfair text-xl font-semibold text-deepBurgundy mb-4">
                  Select Your Size
                </h3>
                <div className={`grid gap-3 ${product?.sizes?.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {product?.sizes?.map((sizeOption: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleSizeSelect(sizeOption.size)}
                      className={`border-2 rounded-lg p-4 transition-all duration-300 ${
                        selectedSize === sizeOption.size
                          ? 'border-kassyPink bg-kassyPink/10'
                          : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-playfair text-lg text-deepBurgundy font-semibold">
                          {sizeOption.size}
                        </span>
                        {sizeOption.servings && (
                          <span className="font-cormorant text-sm text-deepBurgundy/70">
                            {sizeOption.servings}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Shape Selection - Show for signature cakes only (not custom circle/heart) and only if shapes enabled */}
            {!isCustomCake && filteredShapes.length > 0 && (
            <div className="mb-8">
              <div className="bg-white rounded-lg p-6 baroque-shadow">
                <h3 className="font-playfair text-xl font-semibold text-deepBurgundy mb-4">
                  Select Your Shape
                </h3>
                <div className="flex gap-3">
                  {filteredShapes.includes('heart') && (
                  <button
                    onClick={() => {
                      setSelectedShape('heart');
                    }}
                    className={`flex-1 border-2 rounded-lg p-4 transition-all duration-300 ${
                      selectedShape === 'heart'
                        ? 'border-kassyPink bg-kassyPink/10'
                        : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className={`w-8 h-8 ${selectedShape === 'heart' ? 'text-kassyPink' : 'text-deepBurgundy'}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                      <span className="font-playfair text-lg text-deepBurgundy">
                        Heart
                      </span>
                    </div>
                  </button>
                  )}
                  {filteredShapes.includes('circle') && (
                  <button
                    onClick={() => {
                      setSelectedShape('circle');
                    }}
                    className={`flex-1 border-2 rounded-lg p-4 transition-all duration-300 ${
                      selectedShape === 'circle'
                        ? 'border-kassyPink bg-kassyPink/10'
                        : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className={`w-8 h-8 ${selectedShape === 'circle' ? 'text-kassyPink' : 'text-deepBurgundy'}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                      <span className="font-playfair text-lg text-deepBurgundy">
                        Circle
                      </span>
                    </div>
                  </button>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Writing on Cake - For Signature Cakes Only */}
            {isSignatureCake && (
              <div className="mb-8">
                <div className="bg-white rounded-lg p-6 baroque-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="wantsCakeWriting"
                      checked={wantsCakeWriting}
                      onChange={(e) => {
                        setWantsCakeWriting(e.target.checked);
                        if (!e.target.checked) {
                          setCakeWriting('');
                        }
                      }}
                      className="w-5 h-5 text-kassyPink border-2 border-deepBurgundy/20 rounded focus:ring-kassyPink focus:ring-2"
                    />
                    <label htmlFor="wantsCakeWriting" className="font-playfair text-xl font-semibold text-deepBurgundy cursor-pointer">
                      Add Writing to Cake
                    </label>
                  </div>
                  {wantsCakeWriting && (
                    <div className="mt-4">
                      <input
                        type="text"
                        value={cakeWriting}
                        onChange={(e) => setCakeWriting(e.target.value)}
                        placeholder="e.g., Happy Birthday Sarah"
                        className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-lg"
                        maxLength={50}
                      />
                      <p className="font-cormorant text-sm text-deepBurgundy/60 mt-2">
                        {cakeWriting.length}/50 characters
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* For Signature Cakes: Flavor, Filling, and Writing */}
            {isSignatureCake && (
              <>
                {/* Flavor Selection - only show if flavors available */}
                {filteredFlavors.length > 0 && (
                  <div className="mb-8">
                    <div className="bg-white rounded-lg p-6 baroque-shadow">
                      <h3 className="font-playfair text-xl font-semibold text-deepBurgundy mb-4">
                        Choose Your Flavor
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredFlavors.map((flavor) => (
                          <button
                            key={flavor.name}
                            onClick={() => setSelectedFlavor(flavor.name)}
                            className={`border-2 rounded-lg transition-all duration-300 flex items-center overflow-hidden p-0 ${
                              selectedFlavor === flavor.name
                                ? 'border-kassyPink bg-kassyPink/10'
                                : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                            }`}
                          >
                            <div className="w-1/5 sm:w-1/4 aspect-square flex-shrink-0">
                              <img
                                src={flavor.image || 'https://kassy.b-cdn.net/menuicons/Flavors/vanillaflavor.jpg'}
                                alt={flavor.name}
                                className="w-full h-full object-cover"
                                onContextMenu={(e) => e.preventDefault()}
                                draggable={false}
                              />
                            </div>
                            <span className="font-playfair text-lg text-deepBurgundy capitalize text-left flex-1 px-4">
                              {flavor.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Filling Selection - only show if fillings available */}
                {filteredFillings.length > 0 && (
                  <div className="mb-8">
                    <div className="bg-white rounded-lg p-6 baroque-shadow">
                      <h3 className="font-playfair text-xl font-semibold text-deepBurgundy mb-4">
                        Choose Your Filling
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredFillings.map((filling) => (
                          <button
                            key={filling.name}
                            onClick={() => setSelectedFilling(filling.name)}
                            className={`border-2 rounded-lg transition-all duration-300 flex items-center overflow-hidden p-0 ${
                              selectedFilling === filling.name
                                ? 'border-kassyPink bg-kassyPink/10'
                                : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                            }`}
                          >
                            {filling.image ? (
                              <div className="w-1/5 sm:w-1/4 aspect-square flex-shrink-0">
                                <img
                                  src={filling.image}
                                  alt={filling.name}
                                  className="w-full h-full object-cover"
                                  onContextMenu={(e) => e.preventDefault()}
                                  draggable={false}
                                />
                              </div>
                            ) : (
                              <div className="w-1/5 sm:w-1/4 aspect-square bg-deepBurgundy/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-deepBurgundy/40 text-2xl">∅</span>
                              </div>
                            )}
                            <span className="font-playfair text-base text-deepBurgundy capitalize text-left flex-1 px-4">
                              {filling.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Add-ons Selection for Signature Cakes - only show if add-ons available */}
                {addOns.length > 0 && (
                  <div className="mb-8">
                    <div className="bg-white rounded-lg p-6 baroque-shadow">
                      <h3 className="font-playfair text-xl font-semibold text-deepBurgundy mb-4">
                        Add-ons
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {addOns.map((addOn) => {
                          const fallbackImages: { [key: string]: string } = {
                            'cherries': 'https://kassy.b-cdn.net/KassyCakeIcons/Cherries.webp',
                            'glitter-cherries': 'https://kassy.b-cdn.net/cakeicons/Glitter%20Cherries.webp',
                            'candy-pearls': 'https://kassy.b-cdn.net/KassyCakeIcons/Candy%20Pearls.webp',
                            'bows': 'https://kassy.b-cdn.net/menuicons/addons-icons/bows.png',
                            'edible-butterflies': 'https://kassy.b-cdn.net/menuicons/addons-icons/editble%20butterflys.jpg',
                            'fresh-florals': 'https://kassy.b-cdn.net/KassyCakeIcons/Fresh%20florals.webp',
                            'frosting-animals': 'https://kassy.b-cdn.net/KassyCakeIcons/square/Frosting%20animals.webp',
                            'white-chocolate': 'https://kassy.b-cdn.net/KassyCakeIcons/square/White%20chocolate%20adornments.webp',
                            'gold': 'https://kassy.b-cdn.net/KassyCakeIcons/square/Gold%20Chrome.webp',
                            'chrome': 'https://kassy.b-cdn.net/KassyCakeIcons/square/Silver%20Chrome_square.webp',
                            '2d-character': 'https://kassy.b-cdn.net/KassyCakeIcons/square/2D%20character%20painting_sqaure.webp',
                            'disco-balls': 'https://kassy.b-cdn.net/KassyCakeIcons/discoballs.webp',
                            'cowboy-hat': 'https://kassy.b-cdn.net/KassyCakeIcons/square/cowboyhats_sqaure.webp'
                          };
                          const addOnImage = addOn.image || fallbackImages[addOn.id];

                          return (
                            <button
                              key={addOn.id}
                              onClick={() => toggleAddOn(addOn.id)}
                              className={`border-2 rounded-lg transition-all duration-300 flex items-center overflow-hidden p-0 ${
                                selectedAddOns.includes(addOn.id)
                                  ? 'border-kassyPink bg-kassyPink/10'
                                  : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                              }`}
                            >
                              {addOnImage ? (
                                <div className="w-24 h-24 flex-shrink-0">
                                  <img
                                    src={addOnImage}
                                    alt={addOn.name}
                                    className="w-full h-full object-cover rounded-l-lg"
                                    onContextMenu={(e) => e.preventDefault()}
                                    draggable={false}
                                  />
                                </div>
                              ) : (
                                <div className="w-24 h-24 bg-deepBurgundy/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-deepBurgundy/40 text-2xl sm:text-3xl">+</span>
                                </div>
                              )}
                              <div className="flex flex-col items-start gap-1 flex-1 min-w-0 px-3 py-3">
                                <div className="flex items-start justify-between w-full gap-2">
                                  <span className="font-playfair text-base sm:text-sm text-deepBurgundy text-left leading-tight">
                                    {addOn.name}
                                  </span>
                                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                                    selectedAddOns.includes(addOn.id)
                                      ? "border-kassyPink bg-kassyPink scale-125 rotate-12 shadow-md"
                                      : "border-deepBurgundy/30 scale-100 rotate-0"
                                  }`}>
                                    {selectedAddOns.includes(addOn.id) && (
                                      <span className="text-white text-sm font-bold animate-scale-in">✓</span>
                                    )}
                                  </div>
                                </div>
                                <span className="font-playfair text-base sm:text-lg font-semibold text-kassyPink">
                                  +${addOn.price}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* For Custom Cakes: Full customization options */}
            {isCustomCake && (
              <>
            {/* Flavor Selection - only show if flavors available */}
            {filteredFlavors.length > 0 && (
              <div className="mb-8">
                <div className="bg-white rounded-lg p-6 baroque-shadow">
                  <h3 className="font-playfair text-xl font-semibold text-deepBurgundy mb-4">
                    Choose Your Flavor
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredFlavors.map((flavor) => (
                      <button
                        key={flavor.name}
                        onClick={() => setSelectedFlavor(flavor.name)}
                        className={`border-2 rounded-lg transition-all duration-300 flex items-center overflow-hidden p-0 ${
                          selectedFlavor === flavor.name
                            ? 'border-kassyPink bg-kassyPink/10'
                            : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                        }`}
                      >
                        <div className="w-1/5 sm:w-1/4 aspect-square flex-shrink-0">
                          <img
                            src={flavor.image || 'https://kassy.b-cdn.net/menuicons/Flavors/vanillaflavor.jpg'}
                            alt={flavor.name}
                            className="w-full h-full object-cover"
                            onContextMenu={(e) => e.preventDefault()}
                            draggable={false}
                          />
                        </div>
                        <span className="font-playfair text-lg text-deepBurgundy capitalize text-left flex-1 px-4">
                          {flavor.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Filling Selection - only show if fillings available */}
            {filteredFillings.length > 0 && (
              <div className="mb-8">
                <div className="bg-white rounded-lg p-6 baroque-shadow">
                  <h3 className="font-playfair text-xl font-semibold text-deepBurgundy mb-4">
                    Choose Your Filling
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredFillings.map((filling) => (
                      <button
                        key={filling.name}
                        onClick={() => setSelectedFilling(filling.name)}
                        className={`border-2 rounded-lg transition-all duration-300 flex items-center overflow-hidden p-0 ${
                          selectedFilling === filling.name
                            ? 'border-kassyPink bg-kassyPink/10'
                            : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                        }`}
                      >
                        {filling.image ? (
                          <div className="w-1/5 sm:w-1/4 aspect-square flex-shrink-0">
                            <img
                              src={filling.image}
                              alt={filling.name}
                              className="w-full h-full object-cover"
                              onContextMenu={(e) => e.preventDefault()}
                              draggable={false}
                            />
                          </div>
                        ) : (
                          <div className="w-1/5 sm:w-1/4 aspect-square bg-deepBurgundy/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-deepBurgundy/40 text-2xl">∅</span>
                          </div>
                        )}
                        <span className="font-playfair text-base text-deepBurgundy capitalize text-left flex-1 px-4">
                          {filling.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Add-ons Selection - only show if add-ons available */}
            {addOns.length > 0 && (
              <div className="mb-8">
              <div className="bg-white rounded-lg p-6 baroque-shadow">
                <h3 className="font-playfair text-xl font-semibold text-deepBurgundy mb-4">
                  Select add-ons to make your cake extra special
                </h3>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEdibleImageUpload}
                  className="hidden"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Edible Image - Always first */}
                  {addOns.filter(a => a.id === 'edible-image').map((addOn) => {
                    return (
                      <button
                        key={addOn.id}
                        onClick={() => toggleAddOn(addOn.id)}
                        disabled={isUploadingImage}
                        className={`border-2 rounded-lg transition-all duration-300 flex items-center overflow-hidden p-0 ${
                          selectedAddOns.includes(addOn.id) && edibleImageUrl
                            ? 'border-kassyPink bg-kassyPink/10'
                            : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                        } ${isUploadingImage ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {edibleImagePreview ? (
                          <div className="relative w-24 h-24 flex-shrink-0">
                            <img
                              src={edibleImagePreview}
                              alt="Edible image preview"
                              className="w-full h-full object-cover rounded-l-lg"
                            />
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                removeEdibleImage();
                              }}
                              className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 cursor-pointer text-xs"
                            >
                              ×
                            </div>
                          </div>
                        ) : addOn.image ? (
                          <div className="w-24 h-24 flex-shrink-0">
                            <img
                              src={addOn.image}
                              alt={addOn.name}
                              className="w-full h-full object-cover rounded-l-lg"
                              onContextMenu={(e) => e.preventDefault()}
                              draggable={false}
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-24 bg-kassyPink/10 flex items-center justify-center flex-shrink-0">
                            {isUploadingImage ? (
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kassyPink"></div>
                            ) : (
                              <div className="w-10 h-10 bg-kassyPink rounded-full flex items-center justify-center">
                                <span className="text-white text-2xl font-bold leading-none">+</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex flex-col items-start gap-1 flex-1 min-w-0 px-3 py-3">
                          <div className="flex items-start justify-between w-full gap-2">
                            <span className="font-playfair text-base sm:text-sm text-deepBurgundy text-left leading-tight">
                              {addOn.name}
                            </span>
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                              selectedAddOns.includes(addOn.id) && edibleImageUrl
                                ? "border-kassyPink bg-kassyPink scale-125 rotate-12 shadow-md"
                                : "border-deepBurgundy/30 scale-100 rotate-0"
                            }`}>
                              {selectedAddOns.includes(addOn.id) && edibleImageUrl && (
                                <span className="text-white text-sm font-bold animate-scale-in">✓</span>
                              )}
                            </div>
                          </div>
                          <span className="font-playfair text-base sm:text-lg font-semibold text-kassyPink">
                            +${addOn.price}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {/* Other add-ons */}
                  {addOns.filter(a => a.id !== 'edible-image').map((addOn) => {
                    // Use database image if available, otherwise fall back to hardcoded
                    const fallbackImages: { [key: string]: string } = {
                      'cherries': 'https://kassy.b-cdn.net/KassyCakeIcons/Cherries.webp',
                      'glitter-cherries': 'https://kassy.b-cdn.net/cakeicons/Glitter%20Cherries.webp',
                      'candy-pearls': 'https://kassy.b-cdn.net/KassyCakeIcons/Candy%20Pearls.webp',
                      'bows': 'https://kassy.b-cdn.net/menuicons/addons-icons/bows.png',
                      'edible-butterflies': 'https://kassy.b-cdn.net/menuicons/addons-icons/editble%20butterflys.jpg',
                      'fresh-florals': 'https://kassy.b-cdn.net/KassyCakeIcons/Fresh%20florals.webp',
                      'frosting-animals': 'https://kassy.b-cdn.net/KassyCakeIcons/square/Frosting%20animals.webp',
                      'white-chocolate': 'https://kassy.b-cdn.net/KassyCakeIcons/square/White%20chocolate%20adornments.webp',
                      'gold': 'https://kassy.b-cdn.net/KassyCakeIcons/square/Gold%20Chrome.webp',
                      'chrome': 'https://kassy.b-cdn.net/KassyCakeIcons/square/Silver%20Chrome_square.webp',
                      '2d-character': 'https://kassy.b-cdn.net/KassyCakeIcons/square/2D%20character%20painting_sqaure.webp',
                      'disco-balls': 'https://kassy.b-cdn.net/KassyCakeIcons/discoballs.webp',
                      'cowboy-hat': 'https://kassy.b-cdn.net/KassyCakeIcons/square/cowboyhats_sqaure.webp'
                    };
                    const addOnImage = addOn.image || fallbackImages[addOn.id];

                    return (
                      <button
                        key={addOn.id}
                        onClick={() => toggleAddOn(addOn.id)}
                        className={`border-2 rounded-lg transition-all duration-300 flex items-center overflow-hidden p-0 ${
                          selectedAddOns.includes(addOn.id)
                            ? 'border-kassyPink bg-kassyPink/10'
                            : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                        }`}
                      >
                        {addOnImage ? (
                          <div className="w-24 h-24 flex-shrink-0">
                            <img
                              src={addOnImage}
                              alt={addOn.name}
                              className="w-full h-full object-cover rounded-l-lg"
                              onContextMenu={(e) => e.preventDefault()}
                              draggable={false}
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-24 bg-deepBurgundy/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-deepBurgundy/40 text-2xl sm:text-3xl">+</span>
                          </div>
                        )}
                        <div className="flex flex-col items-start gap-1 flex-1 min-w-0 px-3 py-3">
                          <div className="flex items-start justify-between w-full gap-2">
                            <span className="font-playfair text-base sm:text-sm text-deepBurgundy text-left leading-tight">
                              {addOn.name}
                            </span>
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                              selectedAddOns.includes(addOn.id)
                                ? "border-kassyPink bg-kassyPink scale-125 rotate-12 shadow-md"
                                : "border-deepBurgundy/30 scale-100 rotate-0"
                            }`}>
                              {selectedAddOns.includes(addOn.id) && (
                                <span className="text-white text-sm font-bold animate-scale-in">✓</span>
                              )}
                            </div>
                          </div>
                          <span className="font-playfair text-base sm:text-lg font-semibold text-kassyPink">
                            +${addOn.price}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            )}
            </>
            )}

            {/* Design Notes - For Custom Cakes Only */}
            {!isSignatureCake && (
              <div ref={designNotesSectionRef} className="mb-8">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <h3 className="font-playfair text-xl font-semibold text-deepBurgundy">
                    Design Notes <span className="text-kassyPink">*</span>
                  </h3>

                  {/* Hidden file input - Only for custom cakes */}
                  <input
                    ref={referenceFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReferenceImageUpload}
                    className="hidden"
                  />

                  <button
                    onClick={() => referenceFileInputRef.current?.click()}
                    disabled={isUploadingReferenceImage}
                    className={`bg-baroqueGold hover:bg-deepBurgundy text-white font-playfair px-4 py-2 rounded-full transition-all duration-300 flex items-center gap-2 text-sm shadow-md hover:shadow-lg ${
                      isUploadingReferenceImage ? 'opacity-50 cursor-wait' : ''
                    }`}
                  >
                    {isUploadingReferenceImage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Upload reference photo</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      // Only play sound if chat is not already open
                      if (!showChat) {
                        playOpenChatSound();
                        trackEvent(AnalyticsEvents.CHAT_OPENED, {
                          product_id: product.id,
                          product_name: product.name,
                        });
                      }
                      setShowChat(true);
                    }}
                    className="hidden bg-baroqueGold hover:bg-deepBurgundy text-white font-playfair px-5 py-2.5 rounded-full transition-all duration-300 flex items-center gap-2 text-sm shadow-md hover:shadow-lg"
                  >
                    💬 Ask kassy about this cake
                  </button>
                </div>

                {/* Reference Image Preview */}
                {referenceImagePreview && (
                  <div className="mb-3">
                    <div className="relative inline-block">
                      <img
                        src={referenceImagePreview}
                        alt="Reference cake"
                        className="w-32 h-32 rounded-lg object-cover border-2 border-kassyPink"
                      />
                      <button
                        onClick={removeReferenceImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 text-sm"
                      >
                        ×
                      </button>
                    </div>
                    <p className="font-cormorant text-sm text-deepBurgundy/80 mt-2">
                      Reference photo uploaded
                    </p>
                  </div>
                )}

                <p className="font-cormorant text-deepBurgundy/80 mb-3">
                  Tell us about your vision - colors, themes, text on cake, or any special requests.
                  <span className="block text-sm text-deepBurgundy/60 mt-1">
                    Note: Add-ons mentioned here must be selected above to be included.
                  </span>
                </p>

                <textarea
                  ref={designNotesTextareaRef}
                  value={designNotes}
                  onChange={(e) => setDesignNotes(e.target.value)}
                  placeholder="Example: I'd love a pink and gold theme with 'Happy Birthday Sarah' written in cursive..."
                  className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-lg resize-vertical min-h-[120px]"
                  maxLength={500}
                />
                <p className="font-cormorant text-sm text-deepBurgundy/60 mt-1">
                  {designNotes.length}/500 characters
                </p>
              </div>
            )}

            {/* Edible Photo Upload - For Signature Cakes with allowEditablePhoto */}
            {isSignatureCake && product.allowEditablePhoto && (
              <div className="mb-8">
                <div className="bg-gradient-to-br from-kassyPink/5 to-baroqueGold/5 rounded-xl p-5 border border-kassyPink/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-kassyPink/10 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-kassyPink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-playfair text-lg font-semibold text-deepBurgundy">
                        Personalize Your Cake
                      </h3>
                      <p className="font-cormorant text-sm text-deepBurgundy/70">
                        Upload your own photo for the edible image on this cake
                      </p>
                    </div>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={referenceFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReferenceImageUpload}
                    className="hidden"
                  />

                  {/* Upload Button or Preview */}
                  {referenceImagePreview ? (
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img
                          src={referenceImagePreview}
                          alt="Your uploaded photo"
                          className="w-24 h-24 rounded-lg object-cover border-2 border-kassyPink shadow-md"
                        />
                        <button
                          onClick={removeReferenceImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 text-sm shadow-md"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="font-cormorant text-deepBurgundy font-medium">Photo uploaded!</p>
                        <p className="font-cormorant text-sm text-deepBurgundy/60 mt-1">
                          This photo will be used on your cake.
                        </p>
                        <button
                          onClick={() => referenceFileInputRef.current?.click()}
                          className="mt-2 text-sm font-cormorant text-kassyPink hover:text-deepBurgundy transition-colors underline"
                        >
                          Change photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => referenceFileInputRef.current?.click()}
                      disabled={isUploadingReferenceImage}
                      className={`w-full py-4 border-2 border-dashed border-kassyPink/40 hover:border-kassyPink rounded-lg transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                        isUploadingReferenceImage ? 'opacity-50 cursor-wait bg-kassyPink/5' : 'hover:bg-kassyPink/5'
                      }`}
                    >
                      {isUploadingReferenceImage ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kassyPink"></div>
                          <span className="font-cormorant text-deepBurgundy">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-kassyPink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="font-playfair text-deepBurgundy font-medium">Upload Your Photo</span>
                          <span className="font-cormorant text-sm text-deepBurgundy/60">JPG, PNG or WEBP</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Customer Info - For Custom Cakes Only */}
            {isCustomCake && (
              <div className="mb-8">
                <div className="bg-white rounded-lg p-6 baroque-shadow">
                  <h3 className="font-playfair text-xl font-semibold text-deepBurgundy mb-4">
                    Your Contact Information
                  </h3>
                  <p className="font-cormorant text-deepBurgundy/70 mb-4 text-sm">
                    We'll use this to contact you about your custom cake request.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block font-cormorant text-deepBurgundy mb-1">
                        Name <span className="text-kassyPink">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-cormorant text-deepBurgundy mb-1">
                        Email <span className="text-kassyPink">*</span>
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-cormorant text-deepBurgundy mb-1">
                        Phone <span className="text-deepBurgundy/50">(optional)</span>
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Request for Custom Cakes / Add to Cart for Signature Cakes */}
            {isCustomCake ? (
              <button
                onClick={handleSubmitRequest}
                disabled={isSubmittingRequest}
                className={`w-full bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-xl px-8 py-5 rounded-full transition-all duration-300 transform hover:scale-105 baroque-shadow ${
                  isSubmittingRequest ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                {isSubmittingRequest ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting Request...
                  </span>
                ) : (
                  `Submit Request - $${calculateTotal().toFixed(2)} estimated`
                )}
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={isAnalyzingImage}
                className={`w-full bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-xl px-8 py-5 rounded-full transition-all duration-300 transform hover:scale-105 baroque-shadow ${
                  isAnalyzingImage ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                {isAnalyzingImage ? 'Creating your order...' : `Add to Cart - $${calculateTotal().toFixed(2)}`}
              </button>
            )}

            {/* Info text for custom cakes */}
            {isCustomCake && (
              <p className="font-cormorant text-sm text-deepBurgundy/60 text-center mt-3">
                Price shown is an estimate. Final price will be confirmed by Kassy.
              </p>
            )}

            {/* Success Message */}
            {showSuccess && (
              <div className="mt-4 p-4 bg-green-100 border-2 border-green-400 rounded-lg">
                <p className="font-cormorant text-green-800 text-center text-lg">
                  ✓ Added to cart successfully!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ask Kassy Chat */}
      {siteSettings.chatbotEnabled && (
        <OrderAssistantChat
          key={`chat-${product.id}`}
          selectedProduct={product}
          onClose={() => setShowChat(false)}
          isMessengerStyle={true}
          onSelectAddOns={handleAISelectAddOns}
          initialDesignNotes={designNotes.trim() || undefined}
          isLikePicture={useLikePicture}
          onChatUpdate={setChatMessages}
          onCheckout={handleCheckout}
          userSelectedSize={selectedSize}
          onAddToCart={handleAIAddToCart}
          referenceImageUrl={referenceImageUrl}
          isVisible={showChat}
        />
      )}

      {/* Color Image Lightbox */}
      {expandedColorImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedColorImage(null)}
        >
          <button
            onClick={() => setExpandedColorImage(null)}
            className="absolute top-4 right-4 text-white hover:text-kassyPink transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={expandedColorImage}
            alt="Expanded color view"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Design Image Lightbox */}
      {expandedDesignImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedDesignImage(null)}
        >
          <button
            onClick={() => setExpandedDesignImage(null)}
            className="absolute top-4 right-4 text-white hover:text-kassyPink transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={expandedDesignImage}
            alt="Expanded design view"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <Footer />
    </div>
  );
}
