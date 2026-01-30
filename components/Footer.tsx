"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  const handleOrderClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname.startsWith("/cakes")) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-deepBurgundy text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Ornamental Divider */}
        <div className="mb-6 flex justify-center">
          <svg viewBox="0 0 100 20" className="w-48" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 10 Q 25 5, 50 10 T 100 10"
              stroke="#d4af37"
              fill="none"
              strokeWidth="1"
            />
            <circle cx="50" cy="10" r="3" fill="#d4af37" />
          </svg>
        </div>

        <div className="text-center">
          <p className="font-cormorant text-lg mb-2">
            &copy; {new Date().getFullYear()} Kassy Cakes
          </p>
          <p className="font-cormorant text-base text-white/80">
            Handcrafted with love in Kyle, Texas
          </p>
        </div>

        {/* Quick Links and Powered By - Aligned */}
        <div className="flex justify-center items-center gap-8 mt-6 flex-wrap">
          {/* Quick Links */}
          <div className="flex gap-6">
            <a
              href="/cakes#top-sellers"
              onClick={handleOrderClick}
              className="font-cormorant text-white hover:text-baroqueGold text-sm transition-colors duration-300"
            >
              Order
            </a>
            <a
              href="/contact"
              className="font-cormorant text-white hover:text-baroqueGold text-sm transition-colors duration-300"
            >
              Contact
            </a>
            <a
              href="/blog"
              className="font-cormorant text-white hover:text-baroqueGold text-sm transition-colors duration-300"
            >
              Blog
            </a>
            <a
              href="/faq"
              className="font-cormorant text-white hover:text-baroqueGold text-sm transition-colors duration-300"
            >
              FAQ
            </a>
          </div>

        </div>

        {/* Powered By Logo */}
        <div className="flex justify-center items-center gap-2 mt-8 pt-6 border-t border-white/20">
          <span className="font-cormorant text-sm text-white/70">Powered by</span>
          <a href="https://www.jamesweb.dev/contact" target="_blank" rel="noopener noreferrer">
            <img
              src="https://kassy.b-cdn.net/cc.png"
              alt="Powered by logo"
              className="h-8 w-auto hover:opacity-80 transition-opacity"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
