"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';

interface ProductsContextType {
  products: any[];
  loading: boolean;
  getProductById: (id: string) => any | null;
  refreshProducts: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

// Transform product helper - runs once per product when fetched
const transformProduct = (p: any) => {
  const transformed = { ...p };
  if (transformed.media && transformed.media.length > 0) {
    // Sort media by order to respect dashboard ordering
    const sortedMedia = [...transformed.media].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    // Find thumbnail (marked as isThumbnail OR first in order)
    const thumbnail = sortedMedia.find((m: any) => m.isThumbnail) || sortedMedia[0];

    // Set thumbnail as the primary display item (could be image OR video)
    transformed.realImage = thumbnail?.type === 'image' ? thumbnail.url : null;
    transformed.realImageCrop = thumbnail?.type === 'image' ? thumbnail.cropData : null;
    transformed.realVideo = thumbnail?.type === 'video' ? thumbnail.url : null;
    transformed.image = thumbnail?.url || null;
    transformed.imageCrop = thumbnail?.cropData || null;

    // Get remaining media items (excluding thumbnail) for gallery
    const remainingMedia = sortedMedia.filter((m: any) => m !== thumbnail);
    const imageMedia = sortedMedia.filter((m: any) => m.type === 'image');

    // Additional images for gallery (excluding the thumbnail if it's an image)
    transformed.realImages = remainingMedia.filter((m: any) => m.type === 'image').map((m: any) => m.url);
    transformed.realImagesCrop = remainingMedia.filter((m: any) => m.type === 'image').map((m: any) => m.cropData);
  }
  return transformed;
};

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-transform products once when they're fetched
  const products = useMemo(() => {
    return rawProducts.map(transformProduct);
  }, [rawProducts]);

  const fetchProducts = async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/products?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      setRawProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setRawProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Memoize getProductById to prevent unnecessary re-renders
  const getProductById = useMemo(() => {
    return (id: string) => {
      return products.find(p => {
        // Handle different _id formats
        let productId = p._id;
        if (typeof productId === 'object') {
          productId = productId.toString();
        }
        return productId === id || p.slug === id;
      }) || null;
    };
  }, [products]);

  const refreshProducts = async () => {
    setLoading(true);
    await fetchProducts();
  };

  return (
    <ProductsContext.Provider value={{ products, loading, getProductById, refreshProducts }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
}
