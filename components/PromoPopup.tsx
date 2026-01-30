"use client";

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

interface PromoData {
  enabled: boolean;
  code?: string;
  percentage?: number;
  customMessage?: string;
}

export default function PromoPopup() {
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the popup recently (24 hours)
    const dismissedAt = localStorage.getItem('promoPopupDismissed');
    if (dismissedAt) {
      const dismissTime = parseInt(dismissedAt);
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (now - dismissTime < twentyFourHours) {
        return; // Don't show popup if dismissed within 24 hours
      }
    }

    // Fetch promo data
    const fetchPromo = async () => {
      try {
        const response = await fetch('/api/promo-popup');
        const data = await response.json();

        if (data.enabled && data.code) {
          setPromo(data);
          // Delay showing popup by 2 seconds for better UX
          setTimeout(() => {
            setIsOpen(true);
            // Fire confetti celebration - background layer
            confetti({
              particleCount: 80,
              spread: 100,
              origin: { y: 0.6 },
              colors: ['#ff94b3', '#ffc0cb', '#ff69b4', '#ffb6c1', '#db7093'],
              zIndex: 9998
            });
            // Fire confetti celebration - foreground layer (separate canvas)
            const foregroundCanvas = document.createElement('canvas');
            foregroundCanvas.style.position = 'fixed';
            foregroundCanvas.style.top = '0';
            foregroundCanvas.style.left = '0';
            foregroundCanvas.style.width = '100%';
            foregroundCanvas.style.height = '100%';
            foregroundCanvas.style.pointerEvents = 'none';
            foregroundCanvas.style.zIndex = '10001';
            document.body.appendChild(foregroundCanvas);
            const foregroundConfetti = confetti.create(foregroundCanvas, { resize: true });
            foregroundConfetti({
              particleCount: 60,
              spread: 50,
              origin: { y: 0.5 },
              colors: ['#ff94b3', '#ffc0cb', '#ff69b4', '#ffb6c1', '#db7093']
            });
            // Clean up foreground canvas after animation
            setTimeout(() => {
              foregroundCanvas.remove();
            }, 5000);
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to fetch promo:', error);
      }
    };

    fetchPromo();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Save dismissal time
    localStorage.setItem('promoPopupDismissed', Date.now().toString());
  };

  const handleCopyCode = async () => {
    if (promo?.code) {
      try {
        await navigator.clipboard.writeText(promo.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  if (!isOpen || !promo) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] animate-fadeIn"
        onClick={handleClose}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative bg-gradient-to-br from-creamWhite to-white rounded-3xl shadow-2xl max-w-md w-full pointer-events-auto animate-scaleIn overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            aria-label="Close popup"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Decorative top bar */}
          <div className="h-2 bg-gradient-to-r from-kassyPink via-rose-400 to-kassyPink" />

          {/* Content */}
          <div className="p-8 pt-6 text-center">
            {/* Logo */}
            <div className="mb-4">
              <img
                src="https://kassy.b-cdn.net/kassycakespromo.png"
                alt="Kassy Cakes"
                className="w-32 h-32 mx-auto object-contain"
              />
            </div>

            {/* Custom message */}
            <p className="text-kassyPink font-medium mb-2 font-cormorant text-lg">
              {promo.customMessage || "Sweet treats deserve sweet savings!"}
            </p>

            {/* Discount percentage */}
            <h2 className="text-5xl md:text-6xl font-bold text-deepBurgundy mb-2 font-playfair">
              {promo.percentage}% OFF
            </h2>

            <p className="text-gray-600 mb-6 font-cormorant">
              Your entire order
            </p>

            {/* Code box */}
            <div className="bg-gray-50 border-2 border-dashed border-kassyPink/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500 mb-2">Use code at checkout:</p>
              <div className="flex items-center justify-center gap-3">
                <code className="text-2xl font-bold text-kassyPink tracking-wider">
                  {promo.code}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="p-2 hover:bg-kassyPink/10 rounded-lg transition-colors"
                  title="Copy code"
                >
                  {copied ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff94b3" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-3">
              <a
                href="/cakes"
                className="w-full py-3 px-6 bg-gradient-to-r from-kassyPink to-rose-400 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                onClick={handleClose}
              >
                Shop Now
              </a>
              <button
                onClick={handleClose}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
              >
                No thanks, I&apos;ll pay full price
              </button>
            </div>
          </div>

          {/* Decorative corner elements */}
          <div className="absolute top-12 left-4 w-8 h-8 opacity-10">
            <svg viewBox="0 0 24 24" fill="#ff94b3">
              <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z"/>
            </svg>
          </div>
          <div className="absolute bottom-4 right-4 w-8 h-8 opacity-10">
            <svg viewBox="0 0 24 24" fill="#ff94b3">
              <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z"/>
            </svg>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
}
