"use client";

import { useState, useEffect, useLayoutEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { products, addOns, importantNote } from "@/lib/products";
import { productGroups, specialtyProducts } from "@/lib/productGroups";
import Footer from "@/components/Footer";
import OrderAssistantChat from "@/components/OrderAssistantChat";
import WeddingCakeQuoteModal from "@/components/WeddingCakeQuoteModal";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { getProductById } from "@/lib/products";
import CroppedImage from "@/components/CroppedImage";
import { useSiteSettings } from "@/hooks/useSiteSettings";

function CakesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { products: dbProducts, loading: productsLoading } = useProducts();
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedQuoteProduct, setSelectedQuoteProduct] = useState<any>(null);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const { settings: siteSettings } = useSiteSettings();

  // Fetch collections
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch('/api/collections');
        const data = await response.json();
        setCollections(data.collections || []);
      } catch (error) {
        console.error('Failed to fetch collections:', error);
      } finally {
        setCollectionsLoading(false);
      }
    };
    fetchCollections();
  }, []);

  // Hide floating button when footer is visible (mobile)
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  // Scroll to product if scrollTo parameter is present
  // Use layoutEffect to scroll BEFORE paint (no visible jump)
  useLayoutEffect(() => {
    const scrollToProductId = searchParams.get('scrollTo');
    if (scrollToProductId && !productsLoading) {
      const scrollToProduct = () => {
        const element = document.getElementById(`product-${scrollToProductId}`);
        if (element) {
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - (window.innerHeight / 2) + (element.offsetHeight / 2);

          window.scrollTo({
            top: offsetPosition,
            behavior: 'auto' as ScrollBehavior
          });

          // Add a brief highlight effect
          element.classList.add('ring-4', 'ring-baroqueGold');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-baroqueGold');
          }, 2000);
          return true;
        }
        return false;
      };

      // Try immediately
      if (!scrollToProduct()) {
        // Retry after a short delay for mobile browsers
        setTimeout(scrollToProduct, 50);
      }

      // Mobile browsers may reset scroll after initial paint, so retry after render
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollToProduct);
      });
    }
  }, [searchParams, productsLoading]);

  // Scroll to hash fragment (e.g., #catalog) when page loads
  // But only if there's no scrollTo parameter (which takes priority)
  useEffect(() => {
    const scrollToProductId = searchParams.get('scrollTo');
    if (typeof window !== 'undefined' && window.location.hash && !scrollToProductId) {
      const hash = window.location.hash.substring(1); // Remove the #
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100); // Small delay to ensure DOM is ready
    }
  }, [searchParams]);

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

  // Build filter tabs from collections
  const filterTabs = [
    { id: 'all', name: 'All' },
    ...collections.map(c => ({ id: c.name, name: c.name }))
  ];

  // Transform MongoDB products into display format
  const allDisplayItems = dbProducts.map(product => {
    // Sort media by order to respect dashboard ordering
    const sortedMedia = product.media ? [...product.media].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) : [];

    // Get thumbnail from media (respects dashboard order)
    const thumbnailMedia = sortedMedia.find((m: any) => m.isThumbnail) || sortedMedia[0];
    const thumbnail = thumbnailMedia?.url;
    const thumbnailCropData = thumbnailMedia?.cropData;
    const thumbnailType = thumbnailMedia?.type;

    // Ensure _id is a string (MongoDB can return objects)
    let productId = product._id;
    if (typeof productId === 'object') {
      productId = productId.toString();
    }

    return {
      id: product.slug || `product-${productId}`,
      name: product.name,
      description: product.tagline || product.description || '',
      category: product.category,
      image: thumbnail,
      realImage: thumbnailType === 'image' ? thumbnail : null,
      cropData: thumbnailCropData,
      realVideo: thumbnailType === 'video' ? thumbnail : null,
      buyNowOnly: product.buyNowOnly,
      productType: product.productType,
      quoteOnly: product.quoteOnly,
      shape: product.shape,
      collections: product.collections || [], // Include collections for filtering
      order: product.order ?? 999, // Include order for sorting, default high if not set
      _id: productId,
      sizes: product.sizes.map((size: any, index: number) => ({
        id: `${productId}-${index}`, // Use MongoDB ID with index
        size: size.size,
        price: size.price,
        servings: size.servings,
        productId: productId, // Store MongoDB ID
        productName: product.name
      }))
    };
  });

  // Filter by collection
  let filteredItems = allDisplayItems;

  if (selectedCollection !== 'all') {
    filteredItems = filteredItems.filter(item => {
      return item.collections?.includes(selectedCollection);
    });
  }

  // Sort by order field from dashboard - gives full control over arrangement
  filteredItems = filteredItems.sort((a, b) => {
    return (a.order ?? 999) - (b.order ?? 999);
  });

  const handleStartWithCake = (group: any) => {
    // For quote-only products (Wedding Cake), open the quote modal
    if (group.quoteOnly) {
      setSelectedQuoteProduct(group);
      setShowQuoteModal(true);
      return;
    }
    // Navigate to product page using MongoDB ID with client-side navigation
    router.push(`/cakes/product/${group._id}`);
  };

  const handleOpenQuoteModal = (product: any) => {
    setSelectedQuoteProduct(product);
    setShowQuoteModal(true);
  };

  const handleAskAboutProduct = (product: any) => {
    // Only play sound if chat is not already open
    if (!showChat) {
      const audio = new Audio('https://kassy.b-cdn.net/audio/openchat.MP3');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio failed:', err));
    }

    setSelectedProduct(product);
    setShowChat(true);
  };

  const handleCustomDesign = () => {
    // Only play sound if chat is not already open
    if (!showChat) {
      const audio = new Audio('https://kassy.b-cdn.net/audio/openchat.MP3');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio failed:', err));
    }

    setSelectedProduct(null);
    setShowChat(true);
  };

  const handleAddToCart = async (productId?: number | string, size?: string, flavor?: string) => {
    // Summarize chat conversation into concise design notes
    let designNotes = 'No customizations (make exactly as shown)';

    if (chatMessages.length > 0) {
      try {
        const response = await fetch('/api/summarize-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: chatMessages,
            productName: productId === 'custom' ? 'Custom Design' : (typeof productId === 'number' ? getProductById(productId)?.name : 'Unknown'),
            selectedAddOns: [],
            selectedSize: size
          })
        });

        if (response.ok) {
          const data = await response.json();
          designNotes = data.summary || designNotes;
        }
      } catch (error) {
        console.error('Failed to summarize chat:', error);
        // Fall back to default
      }
    }

    // Prepend size and flavor to design notes
    let fullDesignNotes = '';
    if (size) fullDesignNotes += `Size: ${size}\n`;
    if (flavor) fullDesignNotes += `Flavor: ${flavor}\n`;
    if (fullDesignNotes) fullDesignNotes += '\n';
    fullDesignNotes += designNotes;
    designNotes = fullDesignNotes;

    if (productId === 'custom') {
      // Custom design - try to extract product name from chat
      const sizePrice = size === '6"' ? 155 : 180;
      let productName = 'Custom Design';
      let productImage = 'https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png';

      // Search chat for mentioned products
      const chatText = chatMessages.map(m => m.content).join(' ').toLowerCase();
      const allProducts = Object.values(products);

      for (const product of allProducts) {
        const nameMatch = product.name.toLowerCase().replace(/[468]"\s*/, ''); // Remove size prefix
        if (chatText.includes(nameMatch.toLowerCase())) {
          productName = `${size} ${nameMatch}`;
          productImage = product.realImage || product.image || productImage;
          break;
        }
      }

      addToCart({
        id: Date.now(), // Unique ID for custom item
        name: productName,
        price: sizePrice,
        quantity: 1,
        size: size || '6"',
        flavor: flavor,
        addOns: [],
        image: productImage,
        designNotes
      });
    } else if (typeof productId === 'number') {
      // Catalog product
      const product = getProductById(productId);
      if (product) {
        addToCart({
          id: productId,
          name: product.name,
          price: product.price,
          quantity: 1,
          size: size || '6"',
          flavor: flavor,
          addOns: [],
          image: product.image || 'https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png',
          designNotes
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-creamWhite">
      {/* Header */}
      <header className="bg-[#ff94b3] py-12 px-4 relative overflow-hidden">
        <div className="absolute -left-2 md:left-12 -bottom-2 md:top-1/2 md:-translate-y-1/2 w-28 md:w-32 opacity-80">
          <img
            src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20big%20rolling%20pin.png"
            alt="Angel with rolling pin"
            className="drop-shadow-xl"
            loading="lazy"
          />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="font-playfair text-4xl md:text-7xl font-bold text-white mb-4 text-shadow-gold animate-fade-in-down">
            Order Your Perfect Cake
          </h1>
          <p className="font-cormorant text-xl md:text-2xl text-white/90 max-w-2xl mx-auto mb-6 animate-fade-in-down hidden md:block" style={{ animationDelay: '0.2s' }}>
            Browse our top sellers and customize your dream cake
          </p>

          {/* Ask Kassy Button - hidden when chatbot is disabled */}
          {siteSettings.chatbotEnabled && (
            <button
              onClick={handleCustomDesign}
              className="bg-baroqueGold hover:bg-deepBurgundy text-white font-playfair text-lg px-8 py-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              💬 Ask Kassy to Design your Custom Cake
            </button>
          )}

          {/* Ornamental Divider */}
          <div className="mt-8">
            <svg viewBox="0 0 200 20" className="w-64 mx-auto opacity-80" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 10 Q 50 5, 100 10 T 200 10" stroke="#ffffff" fill="none" strokeWidth="1.5" />
              <circle cx="100" cy="10" r="4" fill="#ffffff" />
              <circle cx="50" cy="8" r="2" fill="#ffffff" />
              <circle cx="150" cy="8" r="2" fill="#ffffff" />
            </svg>
          </div>
        </div>

        <div className="absolute right-2 md:right-12 bottom-4 md:top-1/2 md:-translate-y-1/2 w-16 md:w-32 opacity-80">
          <img
            src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png"
            alt="Angel with cupcake"
            className="drop-shadow-xl"
            loading="lazy"
          />
        </div>
      </header>

      {/* Important Note */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg p-6 baroque-shadow border-2 border-deepBurgundy/20">
          <p className="font-cormorant text-lg text-deepBurgundy text-center">
            <span className="font-bold">Add-ons available:</span> {addOns.map(a => a.name).join(", ")}
          </p>
          <p className="font-playfair text-sm text-deepBurgundy/80 text-center mt-2">
            Please note: <span className="font-bold">Strictly NO REFUNDS will be provided</span>
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="font-playfair text-4xl font-bold text-deepBurgundy mb-6 text-center">
          Top Sellers
        </h2>

        {/* Collection Filters */}
        <div className="flex flex-wrap gap-2 justify-center">
          {collectionsLoading ? (
            <div className="text-deepBurgundy/60 text-sm">Loading...</div>
          ) : (
            filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCollection(tab.id)}
                className={`px-4 py-1.5 rounded-full font-cormorant text-sm transition-all duration-300 ${
                  selectedCollection === tab.id
                    ? 'bg-baroqueGold text-white'
                    : 'bg-white text-deepBurgundy/70 border border-deepBurgundy/20 hover:border-baroqueGold hover:text-baroqueGold'
                }`}
              >
                {tab.name}
              </button>
            ))
          )}
        </div>
      </section>

      {/* Products Grid */}
      <section className="max-w-7xl mx-auto px-3 md:px-4 pb-12">
        {productsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-kassyPink mx-auto mb-4"></div>
            <p className="font-cormorant text-xl text-deepBurgundy/60">Loading cakes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filteredItems.map((item) => (
            <div
              key={item._id}
              id={`product-${item._id}`}
              className="bg-white rounded-md overflow-hidden baroque-shadow hover:shadow-2xl transition-all duration-300 group flex flex-col"
            >
              {/* Product Image/Video */}
              {(item.image || item.realImage || item.realVideo) && (
                <div
                  className="overflow-hidden bg-white relative cursor-pointer"
                  onClick={() => handleStartWithCake(item)}
                >
                  {/* Real Image/Video - Default (if available) */}
                  {(item.realImage || item.realVideo) ? (
                    <>
                      {item.realVideo ? (
                        <video
                          src={item.realVideo}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      ) : item.realImage ? (
                        <img
                          src={item.realImage}
                          alt={item.name}
                          className="w-full aspect-square object-cover bg-creamWhite img-smooth-load group-hover:scale-105 transition-transform duration-300"
                          style={item.sizes[0].id === 56 ? { transform: 'translate(3px, -3px)' } : undefined}
                          onContextMenu={(e) => e.preventDefault()}
                          ref={(el) => {
                            // Handle both cached images (already complete) and fresh loads
                            if (el && el.complete) {
                              el.classList.add('loaded');
                            }
                          }}
                          onLoad={(e) => e.currentTarget.classList.add('loaded')}
                          draggable={false}
                        />
                      ) : null}
                    </>
                  ) : (
                    /* Fallback to artwork image only if no real image */
                    item.image && (
                      <CroppedImage
                        src={item.image}
                        alt={item.name}
                        cropData={item.cropData}
                        className="w-full aspect-square object-cover bg-creamWhite group-hover:scale-105 transition-transform duration-300"
                      />
                    )
                  )}

                  {/* Custom Icon for Custom Cakes */}
                  {item.productType === 'custom' && !item.quoteOnly && (
                    <img
                      src="https://kassy.b-cdn.net/menuicons/circle/custom.png"
                      alt="Customizable"
                      className="absolute top-1.5 left-1.5 w-8 h-8 md:w-10 md:h-10 drop-shadow-lg"
                      draggable={false}
                    />
                  )}

                  {/* Wedding Badge for Wedding Cakes */}
                  {item.quoteOnly && item.name.includes('Wedding') && (
                    <div className="absolute top-1.5 left-1.5 bg-baroqueGold text-white px-2 py-0.5 rounded-full text-xs font-playfair drop-shadow-lg">
                      Quote Only
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 md:p-4 flex flex-col flex-1">
                <div className="mb-2">
                  <h3 className="font-playfair text-sm md:text-base font-semibold text-deepBurgundy leading-tight">
                    {item.name}
                  </h3>
                  {/* Show description for custom cakes and wedding cakes */}
                  {item.description && (item.productType === 'custom' || item.quoteOnly) && (
                    <p className="font-cormorant text-xs text-deepBurgundy/60 mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mb-2">
                  {(item.quoteOnly || item.productType === 'custom') ? (
                    <span className="font-playfair text-sm md:text-base font-bold text-baroqueGold">
                      Request a Quote
                    </span>
                  ) : item.sizes.length === 1 ? (
                    <span className="font-playfair text-xl md:text-2xl font-bold text-kassyPink">
                      ${item.sizes[0].price.toFixed(2)}
                    </span>
                  ) : (
                    <div>
                      <span className="font-playfair text-xs text-deepBurgundy/80">
                        From
                      </span>
                      <span className="font-playfair text-xl md:text-2xl font-bold text-kassyPink ml-1">
                        ${Math.min(...item.sizes.map((s: any) => s.price)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-auto">
                  <button
                    onClick={() => item.quoteOnly ? handleOpenQuoteModal(item) : handleStartWithCake(item)}
                    className="w-full bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-xs md:text-sm px-3 py-1.5 md:py-2 rounded-full transition-all duration-300 flex items-center justify-center gap-1.5"
                  >
                    {item.quoteOnly ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ) : item.productType === 'custom' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                    {item.quoteOnly ? 'Get Quote' : item.productType === 'custom' ? 'Customize' : 'Purchase'}
                  </button>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}

        {!productsLoading && filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="font-cormorant text-2xl text-deepBurgundy/60">
              No cakes found in this category
            </p>
          </div>
        )}
      </section>

      {/* Floating Ask Kassy Button - hides when footer is visible on mobile, or when chatbot is disabled */}
      {siteSettings.chatbotEnabled && (
        <button
          onClick={handleCustomDesign}
          className={`fixed bottom-8 right-8 bg-baroqueGold hover:bg-deepBurgundy text-white font-playfair px-6 py-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 z-40 ${
            isFooterVisible ? 'md:opacity-100 opacity-0 pointer-events-none md:pointer-events-auto' : 'opacity-100'
          }`}
        >
          💬 Ask Kassy
        </button>
      )}

      {/* AI Chat Modal */}
      {siteSettings.chatbotEnabled && (
        <OrderAssistantChat
          selectedProduct={selectedProduct}
          onClose={() => {
            setShowChat(false);
            setSelectedProduct(null);
          }}
          isMessengerStyle={true}
          onChatUpdate={setChatMessages}
          onAddToCart={handleAddToCart}
          isVisible={showChat}
        />
      )}

      {/* Wedding Cake Quote Modal */}
      <WeddingCakeQuoteModal
        isOpen={showQuoteModal}
        onClose={() => {
          setShowQuoteModal(false);
          setSelectedQuoteProduct(null);
        }}
        productImage={selectedQuoteProduct?.realImage || selectedQuoteProduct?.image}
      />

      <Footer />
    </div>
  );
}

export default function CakesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-creamWhite flex items-center justify-center"><p className="font-playfair text-xl text-deepBurgundy">Loading...</p></div>}>
      <CakesContent />
    </Suspense>
  );
}
