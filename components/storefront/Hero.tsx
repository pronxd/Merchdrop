"use client";

import { useEffect, useRef, useState } from "react";

export default function Hero() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [blurAmount, setBlurAmount] = useState(20);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsLoaded(true);

    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionHeight = rect.height;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / (sectionHeight * 0.5)));
      setBlurAmount(20 * (1 - progress));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-black"
    >
      {/* Background Image */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://merch.b-cdn.net/JWzEk_7wjzTLJsfHqxjIk_Py6kCNAv.png"
          alt="Hero background"
          className="hidden sm:block w-full h-full object-cover"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://merch.b-cdn.net/Generated%20Image%20Janua345ry%2031%2C%202026%20-%205_33PM.jpg"
          alt="Hero background"
          className="block sm:hidden w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-red-950/30 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
      </div>

      {/* PUBLIC ENEMY Logo */}
      <h1
        className="relative z-10 text-red-600 font-black uppercase tracking-widest text-5xl sm:text-7xl md:text-8xl lg:text-9xl select-none"
        style={{ filter: `blur(${blurAmount}px)` }}
      >
        PUBLIC ENEMY
      </h1>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}
