"use client";

import { useState } from "react";
import Link from "next/link";
import { useProducts } from "@/context/ProductsContext";
import { useStorefrontCart } from "@/context/StorefrontCartContext";
import type { StorefrontProduct } from "@/types/storefront";

export default function NewArrivals() {
  const { products: dbProducts, loading } = useProducts();
  const { addItem } = useStorefrontCart();

  // Transform DB products to StorefrontProduct format
  const products: StorefrontProduct[] = dbProducts.map((p: any) => {
    const firstSize = p.sizes?.[0];
    const thumbnailUrl =
      p.image ||
      p.realImage ||
      (p.media?.[0]?.url) ||
      "/images/products/placeholder.jpg";

    return {
      id: p._id?.toString() || p.slug || "",
      name: p.name || "",
      slug: p.slug || "",
      price: firstSize?.price || 0,
      image: thumbnailUrl,
      soldOut: p.soldOut || false,
      sizes: p.sizes?.length > 1
        ? p.sizes.map((s: any) => ({ size: s.size, price: s.price }))
        : undefined,
    };
  });

  return (
    <section className="bg-black py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <h2 className="text-5xl md:text-7xl font-bold text-center text-red-600 mb-12 md:mb-16 tracking-wider">
          NEW ARRIVALS
        </h2>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-neutral-800 rounded" />
                <div className="mt-4 space-y-2">
                  <div className="h-4 bg-neutral-800 rounded w-3/4 mx-auto" />
                  <div className="h-3 bg-neutral-800 rounded w-1/2 mx-auto" />
                  <div className="h-4 bg-neutral-800 rounded w-1/4 mx-auto" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Product Grid */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={(size?: string) => addItem(product, size)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && products.length === 0 && (
          <p className="text-white/60 text-center text-lg">
            No products available yet. Check back soon!
          </p>
        )}
      </div>
    </section>
  );
}

interface ProductCardProps {
  product: StorefrontProduct;
  onAddToCart: (size?: string) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const hasSizes = product.sizes && product.sizes.length > 0;
  const [selectedSize, setSelectedSize] = useState<string | null>(
    hasSizes ? null : null
  );
  const [showSizePicker, setShowSizePicker] = useState(false);

  const displayPrice = selectedSize && product.sizes
    ? product.sizes.find((s) => s.size === selectedSize)?.price ?? product.price
    : product.price;

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) {
      setShowSizePicker(true);
      return;
    }
    onAddToCart(selectedSize ?? undefined);
    setSelectedSize(null);
    setShowSizePicker(false);
  };

  return (
    <div className="group relative">
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-900">
        <Link href={`/product/${product.id}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        {/* Sold Out Badge */}
        {product.soldOut && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="bg-white text-black px-4 py-2 text-sm font-bold tracking-wider">
              SOLD OUT
            </span>
          </div>
        )}

        {/* Size Picker Overlay */}
        {showSizePicker && hasSizes && !product.soldOut && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 p-4 animate-fade-in">
            <p className="text-white text-xs font-medium tracking-wider mb-1">SELECT SIZE</p>
            <div className="flex flex-wrap justify-center gap-2">
              {product.sizes!.map((s) => (
                <button
                  key={s.size}
                  onClick={() => {
                    setSelectedSize(s.size);
                    onAddToCart(s.size);
                    setSelectedSize(null);
                    setShowSizePicker(false);
                  }}
                  className="border border-white/30 text-white px-3 py-1.5 text-xs font-medium tracking-wider hover:bg-red-600 hover:border-red-600 transition-colors"
                >
                  {s.size}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSizePicker(false)}
              className="text-white/40 text-xs mt-2 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Quick Add Button */}
        {!product.soldOut && !showSizePicker && (
          <button
            onClick={handleAddToCart}
            className="absolute bottom-0 left-0 right-0 bg-red-600 text-white py-3 text-sm font-medium tracking-wider opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-red-700"
          >
            ADD TO CART
          </button>
        )}
      </div>

      {/* Product Info */}
      <div className="mt-4 text-center">
        <Link href={`/product/${product.id}`} className="text-white text-sm font-medium hover:text-red-500 transition-colors line-clamp-2">
          {product.name}
        </Link>
        <p className="text-white/60 text-sm mt-1">Regular price</p>
        <p className="text-white font-medium">${displayPrice}</p>
      </div>
    </div>
  );
}
