"use client";

import { useEffect, useRef, useState } from "react";
import { useTransition } from "@/context/TransitionContext";

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isTabletDevice() {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent;
  const isIPad = /iPad/.test(userAgent) ||
    (navigator.maxTouchPoints &&
     navigator.maxTouchPoints > 2 &&
     /MacIntel/.test(navigator.platform));
  const isAndroidTablet = /Android(?!.*Mobile)/i.test(userAgent);
  return isIPad || isAndroidTablet;
}

// Global cache for video blobs - persists across component unmounts
const videoCache: { [key: string]: string } = {};

// Track if we've already detected device type (persists across mounts)
let cachedDeviceInfo: { isMobile: boolean; isTablet: boolean } | null = null;

const desktopVideoSrc = 'https://kassycakes.b-cdn.net/assets/kasscakeslogoanimated800x.webm';
const mobileVideoSrc = 'https://kassy.b-cdn.net/straighty.mp4';

function getDeviceInfo() {
  if (cachedDeviceInfo) return cachedDeviceInfo;
  if (typeof window === 'undefined') return { isMobile: false, isTablet: false };
  cachedDeviceInfo = { isMobile: isMobileDevice(), isTablet: isTabletDevice() };
  return cachedDeviceInfo;
}

function getVideoUrl() {
  const { isMobile, isTablet } = getDeviceInfo();
  return (isMobile || isTablet) ? mobileVideoSrc : desktopVideoSrc;
}

// Check cache synchronously for initial render
function getCachedUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const url = getVideoUrl();
  return videoCache[url] || null;
}

async function loadAndCacheVideo(url: string): Promise<string> {
  if (videoCache[url]) return videoCache[url];

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    videoCache[url] = blobUrl;
    return blobUrl;
  } catch {
    return url; // Fallback to original URL
  }
}

export default function Hero() {
  const { startTransition } = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize with cached values synchronously to avoid flicker on re-navigation
  const [deviceInfo, setDeviceInfo] = useState(() => {
    if (typeof window === 'undefined') return { isMobile: false, isTablet: false };
    return getDeviceInfo();
  });
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(() => getCachedUrl());
  const [isClient, setIsClient] = useState(() => typeof window !== 'undefined' && getCachedUrl() !== null);

  useEffect(() => {
    // Update device info (in case SSR mismatch)
    const info = getDeviceInfo();
    setDeviceInfo(info);
    setIsClient(true);

    // If we already have a cached URL, we're done
    const cachedUrl = getCachedUrl();
    if (cachedUrl) {
      setVideoBlobUrl(cachedUrl);
      return;
    }

    // Otherwise, load and cache the video
    const videoUrl = getVideoUrl();
    loadAndCacheVideo(videoUrl).then(setVideoBlobUrl);
  }, []);

  const handleOrderClick = (e: React.MouseEvent) => {
    e.preventDefault();
    startTransition("/cakes");
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ backgroundImage: 'url(https://kassycakes.b-cdn.net/assets/WS5V5h8f1T_FaP6d8-mvL.png)', backgroundSize: 'cover', backgroundPosition: '85% center', backgroundRepeat: 'no-repeat' }}>
      {/* Decorative Angels */}
      <div className="absolute left-4 md:left-24 top-1/2 w-20 md:w-40 opacity-90 animate-float">
        <img
          src="https://kassycakes.b-cdn.net/assets/pointer.webp"
          alt="Angel pointing"
          className="md:drop-shadow-2xl"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
          crossOrigin="anonymous"
          fetchPriority="high"
        />
      </div>

      <div className="absolute right-4 md:right-24 top-1/3 w-32 md:w-48 opacity-90 animate-float-delayed">
        <img
          src="https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png"
          alt="Angel with cupcake"
          className="md:drop-shadow-2xl"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
          crossOrigin="anonymous"
          fetchPriority="high"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Logo - animated video for all devices */}
        <div className="mb-2 mt-16">
          {!isClient || !videoBlobUrl ? (
            <div className="mx-auto w-80 sm:w-96 md:w-64 lg:w-80" style={{ aspectRatio: '1/1' }} />
          ) : deviceInfo.isMobile || deviceInfo.isTablet ? (
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              className={`mx-auto drop-shadow-2xl ${deviceInfo.isTablet ? 'w-[36rem]' : 'w-80 sm:w-96'}`}
              style={{ backgroundColor: 'transparent' }}
              onContextMenu={(e) => e.preventDefault()}
              src={videoBlobUrl}
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              className="mx-auto w-64 md:w-60 lg:w-80 drop-shadow-2xl"
              style={{ backgroundColor: 'transparent' }}
              onContextMenu={(e) => e.preventDefault()}
              src={videoBlobUrl}
            />
          )}
        </div>

        {/* CTA Button */}
        <a
          href="/cakes"
          onClick={handleOrderClick}
          className="inline-block bg-baroqueGold hover:bg-deepBurgundy text-white font-playfair rounded-full transition-all duration-300 transform hover:scale-105 baroque-shadow text-lg md:text-xl px-10 py-4"
        >
          Order Your Masterpiece
        </a>

        {/* Ornamental Divider */}
        <div className="mt-4">
          <svg
            viewBox="0 0 200 20"
            className="w-64 mx-auto opacity-80 drop-shadow-lg"
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

      {/* Bottom decorative element */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-creamWhite to-transparent"></div>
    </section>
  );
}
