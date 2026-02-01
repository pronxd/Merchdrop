"use client";

import { useState } from "react";
import { Instagram, Twitter, Youtube } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Thanks for subscribing!");
    setEmail("");
  };

  return (
    <footer className="bg-black border-t border-white/10">
      {/* Newsletter Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h3 className="text-white text-2xl font-bold mb-2">
            Subscribe for 15% off your order
          </h3>
          <p className="text-white/60 mb-6">
            Be the first to know about new drops and exclusive offers.
          </p>
          <form
            onSubmit={handleSubmit}
            className="max-w-md mx-auto flex gap-2"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="flex-1 bg-white/5 border border-white/20 px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              className="bg-red-600 text-white px-6 py-3 font-medium hover:bg-red-700 transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-t border-white/10">
          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-white/60 hover:text-red-500 transition-colors"
                >
                  HOME
                </Link>
              </li>
              <li>
                <Link
                  href="#contact"
                  className="text-white/60 hover:text-red-500 transition-colors"
                >
                  CONTACT
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#privacy"
                  className="text-white/60 hover:text-red-500 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#refund"
                  className="text-white/60 hover:text-red-500 transition-colors"
                >
                  Refund Policy
                </a>
              </li>
              <li>
                <a
                  href="#terms"
                  className="text-white/60 hover:text-red-500 transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#shipping"
                  className="text-white/60 hover:text-red-500 transition-colors"
                >
                  Shipping Information
                </a>
              </li>
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h4 className="text-white font-bold mb-4">Follow Us</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-red-500 transition-colors flex items-center gap-2"
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-red-500 transition-colors flex items-center gap-2"
                >
                  <Twitter className="w-4 h-4" />
                  X
                </a>
              </li>
              <li>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-red-500 transition-colors flex items-center gap-2"
                >
                  <Youtube className="w-4 h-4" />
                  YouTube
                </a>
              </li>
            </ul>
          </div>

          {/* Country Selector */}
          <div>
            <h4 className="text-white font-bold mb-4">Country/region</h4>
            <button className="flex items-center text-white/60 hover:text-white transition-colors">
              <span>United States | USD $</span>
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Payment Methods */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-white/40 text-sm">Payment methods</span>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { src: "https://merch.b-cdn.net/icons/VISAlogo.png", alt: "Visa" },
                { src: "https://merch.b-cdn.net/icons/mastercardlogo.png", alt: "Mastercard" },
                { src: "https://merch.b-cdn.net/icons/AMEX%20logo.png", alt: "American Express" },
                { src: "https://merch.b-cdn.net/icons/discoverlogo.png", alt: "Discover" },
                { src: "https://merch.b-cdn.net/icons/paypallogo.png", alt: "PayPal" },
                { src: "https://merch.b-cdn.net/icons/applepaycreditlogo.png", alt: "Apple Pay" },
                { src: "https://merch.b-cdn.net/icons/googlepaylogo.png", alt: "Google Pay" },
                { src: "https://merch.b-cdn.net/icons/shoplogo.png", alt: "Shop Pay" },
                { src: "https://merch.b-cdn.net/icons/Venmologo.png", alt: "Venmo" },
                { src: "https://merch.b-cdn.net/icons/card%20logo.png", alt: "Card" },
              ].map((icon) => (
                <img
                  key={icon.alt}
                  src={icon.src}
                  alt={icon.alt}
                  className="h-6 w-auto"
                />
              ))}
            </div>
          </div>

          {/* Copyright */}
          <div className="text-white/40 text-sm text-center">
            <p>
              Powered by{" "}
              <a
                href="https://jamesweb.dev/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Lucas James
              </a>
            </p>
            <p className="mt-1">
              &copy; 2026,{" "}
              <Link href="/" className="hover:text-white transition-colors">
                PUBLICENEMY
              </Link>
              . All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
