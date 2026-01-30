"use client";

import { useState, useEffect } from "react";

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function OrderSection() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return isMobileDevice();
    }
    return false;
  });

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  return (
    <section id="order" className="pt-8 pb-20 px-4 md:px-8 bg-[#ff94b3] relative overflow-hidden">
      {/* Decorative Angel */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-28 md:w-32 z-10">
        {isMobile ? (
          <img
            src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20big%20rolling%20pin.webp"
            alt="Angel with rolling pin"
            className="md:drop-shadow-2xl w-full h-auto"
          />
        ) : (
          <video
            src="https://kassycakes.b-cdn.net/assets/video%20(25)_1.webm"
            autoPlay
            loop
            muted
            playsInline
            className="drop-shadow-2xl w-full h-auto"
          />
        )}
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-0 pt-32 md:pt-0">
        {/* Rolling Pin Image - Desktop Only */}
        {!isMobile && (
          <div className="mb-4 flex justify-center">
            <img
              src="https://kassy.b-cdn.net/KassyCakeIcons/baby%20angel%20holding%20big%20rolling%20pin.png"
              alt="Baby angel with rolling pin"
              className="w-24 md:w-32 h-auto"
            />
          </div>
        )}

        <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white mb-12 text-shadow-gold">
          Begin Your Sweet Journey
        </h2>

        {/* Order Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a
            href="/cakes"
            className="bg-white hover:bg-baroqueGold text-deepBurgundy hover:text-white font-playfair text-lg md:text-xl px-10 py-4 rounded-full transition-all duration-300 transform hover:scale-105 baroque-shadow"
          >
            Place Custom Order
          </a>
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-6">
          <a
            href="https://instagram.com/kassycakes"
            target="_blank"
            rel="noopener noreferrer"
            className="font-cormorant text-white hover:text-baroqueGold text-lg transition-colors duration-300 underline underline-offset-4"
          >
            Instagram
          </a>
          <a
            href="https://tiktok.com/@kassycakes"
            target="_blank"
            rel="noopener noreferrer"
            className="font-cormorant text-white hover:text-baroqueGold text-lg transition-colors duration-300 underline underline-offset-4"
          >
            TikTok
          </a>
          <a
            href="/blog"
            className="font-cormorant text-white hover:text-baroqueGold text-lg transition-colors duration-300 underline underline-offset-4"
          >
            Blog
          </a>
          <a
            href="/faq"
            className="font-cormorant text-white hover:text-baroqueGold text-lg transition-colors duration-300 underline underline-offset-4"
          >
            FAQ
          </a>
        </div>

        {/* Ornamental Divider */}
        <div className="mt-12">
          <svg
            viewBox="0 0 200 20"
            className="w-64 mx-auto opacity-80"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 10 Q 50 5, 100 10 T 200 10"
              stroke="#ffffff"
              fill="none"
              strokeWidth="1.5"
            />
            <circle cx="100" cy="10" r="4" fill="#ffffff" />
            <circle cx="50" cy="8" r="2" fill="#ffffff" />
            <circle cx="150" cy="8" r="2" fill="#ffffff" />
          </svg>
        </div>
      </div>
    </section>
  );
}
