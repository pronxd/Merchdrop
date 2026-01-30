"use client";

import { useState } from "react";

interface ImageGalleryProps {
  images: string[];
  cakeName: string;
}

export default function ImageGallery({ images, cakeName }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="ornamental-border rounded-lg overflow-hidden bg-white p-4 baroque-shadow">
        <div className="relative aspect-square" onContextMenu={(e) => e.preventDefault()}>
          <img
            src={images[selectedImage]}
            alt={`${cakeName} - Photo ${selectedImage + 1}`}
            className="object-cover rounded transition-opacity duration-300 w-full h-full"
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        </div>
      </div>

      {/* Thumbnail Navigation */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              onContextMenu={(e) => e.preventDefault()}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                selectedImage === index
                  ? "border-kassyPink scale-105 shadow-lg"
                  : "border-deepBurgundy/20 hover:border-kassyPink/50 opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={image}
                alt={`${cakeName} thumbnail ${index + 1}`}
                className="object-cover w-full h-full"
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <p className="text-center font-cormorant text-deepBurgundy/70">
          Photo {selectedImage + 1} of {images.length}
        </p>
      )}
    </div>
  );
}
