"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Shirt,
  Heart,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { useStorefrontCart } from "@/context/StorefrontCartContext";
import type { StorefrontProduct } from "@/types/storefront";

interface DBProduct {
  _id: string;
  name: string;
  slug: string;
  category: string;
  sizes: Array<{ size: string; price: number }>;
  media: Array<{ url: string; type: string; order: number; isThumbnail: boolean }>;
  description?: string;
  tagline?: string;
  soldOut?: boolean;
  hidden?: boolean;
}

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const { addItem } = useStorefrontCart();

  const [product, setProduct] = useState<DBProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>("details");
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;

    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${params.id}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setProduct(data.product);

        // Fetch all products for related items
        const allRes = await fetch("/api/products");
        if (allRes.ok) {
          const allData = await allRes.json();
          const others = (allData.products || []).filter(
            (p: DBProduct) => p._id !== data.product._id
          );
          setRelatedProducts(others);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-2xl font-bold mb-4">
            Product Not Found
          </h1>
          <Link href="/" className="text-red-500 hover:text-red-400">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const hasSizes = product.sizes && product.sizes.length > 1;
  const firstSize = product.sizes?.[0];
  const displayPrice = selectedSize
    ? product.sizes.find((s) => s.size === selectedSize)?.price ?? firstSize?.price ?? 0
    : firstSize?.price ?? 0;

  const productImage =
    product.media?.find((m) => m.isThumbnail)?.url ||
    product.media?.[0]?.url ||
    "/images/products/placeholder.jpg";

  const toStorefrontProduct = (): StorefrontProduct => ({
    id: product._id,
    name: product.name,
    slug: product.slug,
    price: displayPrice,
    image: productImage,
    soldOut: product.soldOut,
    sizes: hasSizes
      ? product.sizes.map((s) => ({ size: s.size, price: s.price }))
      : undefined,
  });

  const handleAddToCart = () => {
    if (product.soldOut) return;
    if (hasSizes && !selectedSize) {
      alert("Please select a size");
      return;
    }
    addItem(toStorefrontProduct(), selectedSize || undefined);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleAccordion = (section: string) => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

  return (
    <main className="pt-16 bg-black min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-white/60">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-white">{product.name}</span>
        </nav>
      </div>

      {/* Product Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="relative">
            <div className="aspect-[3/4] bg-neutral-900 overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.media?.[selectedImageIndex]?.url || productImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />

              {/* Image navigation arrows */}
              {product.media && product.media.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImageIndex((prev) => prev === 0 ? product.media.length - 1 : prev - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImageIndex((prev) => prev === product.media.length - 1 ? 0 : prev + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {product.soldOut && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="bg-white text-black px-6 py-3 text-lg font-bold tracking-wider">
                  SOLD OUT
                </span>
              </div>
            )}

            {/* Additional media thumbnails */}
            {product.media && product.media.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
                {product.media.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`w-20 h-20 flex-shrink-0 bg-neutral-900 overflow-hidden border transition-colors ${
                      selectedImageIndex === i
                        ? "border-white"
                        : "border-white/10 hover:border-white/40"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.url}
                      alt={`${product.name} ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-red-600 uppercase tracking-wider mb-4">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mb-4">
              <p className="text-white/60 text-sm">Regular price</p>
              <p className="text-white text-2xl font-medium">
                ${displayPrice}
              </p>
            </div>

            {/* Shipping Note */}
            <p className="text-white/60 text-sm mb-6">
              Shipping calculated at checkout.
            </p>

            {/* Size Selection */}
            {hasSizes && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-medium">Size</span>
                  <button
                    onClick={() => setShowSizeChart(!showSizeChart)}
                    className="flex items-center gap-2 text-white/60 hover:text-white text-sm"
                  >
                    <Ruler className="w-4 h-4" />
                    Size Chart
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s.size}
                      onClick={() => setSelectedSize(s.size)}
                      disabled={product.soldOut}
                      className={`
                        w-12 h-12 border text-sm font-medium transition-colors
                        ${
                          selectedSize === s.size
                            ? "bg-white text-black border-white"
                            : "bg-transparent text-white border-white/30 hover:border-white"
                        }
                        ${product.soldOut ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      {s.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Chart */}
            {showSizeChart && (
              <div className="mb-6 p-4 bg-neutral-900 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Shirt className="w-5 h-5" />
                    Size Chart
                  </h3>
                  <button
                    onClick={() => setShowSizeChart(false)}
                    className="text-white/60 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left text-white/60 py-2">Size</th>
                      <th className="text-left text-white/60 py-2">
                        Chest (in)
                      </th>
                      <th className="text-left text-white/60 py-2">
                        Length (in)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { size: "S", chest: "36-38", length: "27" },
                      { size: "M", chest: "38-40", length: "28" },
                      { size: "L", chest: "40-42", length: "29" },
                      { size: "XL", chest: "42-44", length: "30" },
                      { size: "2XL", chest: "44-46", length: "31" },
                      { size: "3XL", chest: "46-48", length: "32" },
                      { size: "4XL", chest: "48-50", length: "33" },
                      { size: "5XL", chest: "50-52", length: "34" },
                    ].map((row) => (
                      <tr key={row.size} className="border-b border-white/10">
                        <td className="text-white py-2">{row.size}</td>
                        <td className="text-white/60 py-2">{row.chest}</td>
                        <td className="text-white/60 py-2">{row.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              disabled={product.soldOut}
              className={`
                w-full py-4 font-bold tracking-wider text-lg mb-3
                ${
                  product.soldOut
                    ? "bg-white/20 text-white/40 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                }
                transition-colors
              `}
            >
              {product.soldOut ? "SOLD OUT" : "ADD TO CART"}
            </button>

            {/* More Payment Options */}
            <button className="w-full text-white/60 hover:text-white text-sm underline mb-8">
              More payment options
            </button>

            {/* Accordions */}
            <div className="border-t border-white/10">
              {/* Product Details */}
              <div className="border-b border-white/10">
                <button
                  onClick={() => toggleAccordion("details")}
                  className="w-full flex items-center justify-between py-4 text-white"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Shirt className="w-5 h-5" />
                    PRODUCT DETAILS
                  </span>
                  {openAccordion === "details" ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                {openAccordion === "details" && product.description && (
                  <div className="pb-4">
                    <p className="text-white/60 text-sm whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Materials & Care */}
              <div className="border-b border-white/10">
                <button
                  onClick={() => toggleAccordion("care")}
                  className="w-full flex items-center justify-between py-4 text-white"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Heart className="w-5 h-5" />
                    MATERIALS & CARE
                  </span>
                  {openAccordion === "care" ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                {openAccordion === "care" && (
                  <div className="pb-4">
                    <ul className="space-y-2">
                      <li className="text-white/60 text-sm flex items-start gap-2">
                        <span className="text-white">•</span>
                        Machine wash cold, inside out
                      </li>
                      <li className="text-white/60 text-sm flex items-start gap-2">
                        <span className="text-white">•</span>
                        Tumble dry low
                      </li>
                      <li className="text-white/60 text-sm flex items-start gap-2">
                        <span className="text-white">•</span>
                        Do not bleach or iron directly on print
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Share */}
              <div className="border-b border-white/10">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="w-full flex items-center justify-between py-4 text-white"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Share2 className="w-5 h-5" />
                    Share
                  </span>
                  {showShareMenu ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                {showShareMenu && (
                  <div className="pb-4">
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-green-500">Link copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy link</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* You May Also Like */}
      {relatedProducts.length > 0 && (
        <RelatedProducts products={relatedProducts} />
      )}
    </main>
  );
}

/* ── Related Products Section ── */

function RelatedProductCard({ rp, fadeIn }: { rp: DBProduct; fadeIn?: boolean }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [visible, setVisible] = useState(!fadeIn);

  useEffect(() => {
    if (!fadeIn || !cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [fadeIn]);

  const rpImage =
    rp.media?.find((m) => m.isThumbnail)?.url ||
    rp.media?.[0]?.url ||
    "/images/products/placeholder.jpg";
  const rpPrice = rp.sizes?.[0]?.price ?? 0;

  return (
    <Link
      ref={cardRef}
      href={`/product/${rp._id}`}
      className={`group flex-shrink-0 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="aspect-[3/4] bg-neutral-900 overflow-hidden mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={rpImage}
          alt={rp.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <h3 className="text-white font-medium group-hover:text-red-500 transition-colors line-clamp-2">
        {rp.name}
      </h3>
      <p className="text-white/60">${rpPrice}</p>
    </Link>
  );
}

const MOBILE_INITIAL = 3;
const MOBILE_BATCH = 9;

function RelatedProducts({ products }: { products: DBProduct[] }) {
  const [mobileCount, setMobileCount] = useState(MOBILE_INITIAL);
  const [moreClicked, setMoreClicked] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Infinite scroll on mobile after "more" is clicked
  useEffect(() => {
    if (!moreClicked || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMobileCount((prev) => {
            const next = prev + MOBILE_BATCH;
            if (next >= products.length) {
              observer.disconnect();
            }
            return Math.min(next, products.length);
          });
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [moreClicked, products.length]);

  // Desktop carousel scroll state
  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    return () => el.removeEventListener("scroll", updateScrollButtons);
  }, [updateScrollButtons, products]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-carousel-item]");
    const scrollAmount = card ? (card.offsetWidth + 24) * 3 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  const handleMoreClick = () => {
    setMoreClicked(true);
    setMobileCount((prev) => Math.min(prev + MOBILE_BATCH, products.length));
  };

  const mobileProducts = products.slice(0, mobileCount);
  const showMoreButton = !moreClicked && mobileCount < products.length;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
        You may also like....
      </h2>

      {/* Mobile: Grid with "more" button + infinite scroll */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-4">
          {mobileProducts.map((rp, i) => (
            <RelatedProductCard key={rp._id} rp={rp} fadeIn={i >= MOBILE_INITIAL} />
          ))}
          {showMoreButton && (
            <button
              onClick={handleMoreClick}
              className="aspect-[3/4] bg-neutral-900 border-2 border-red-600 flex items-center justify-center hover:bg-red-600/10 transition-colors"
            >
              <span className="text-red-600 font-bold tracking-wider text-lg">MORE</span>
            </button>
          )}
        </div>
        {/* Infinite scroll sentinel */}
        {moreClicked && mobileCount < products.length && (
          <div ref={sentinelRef} className="h-10" />
        )}
      </div>

      {/* Desktop: Horizontal carousel with arrows */}
      <div className="hidden md:block relative group/carousel">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 border border-white/20 hover:border-white/50 text-white p-3 -ml-4 transition-all opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 border border-white/20 hover:border-white/50 text-white p-3 -mr-4 transition-all opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {products.map((rp) => (
            <div key={rp._id} data-carousel-item className="w-[calc(33.333%-16px)] flex-shrink-0">
              <RelatedProductCard rp={rp} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
