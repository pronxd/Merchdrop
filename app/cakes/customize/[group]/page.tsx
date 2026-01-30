"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { productGroups } from "@/lib/productGroups";
import { getProductById, addOns } from "@/lib/products";
import { useCart } from "@/context/CartContext";
import Footer from "@/components/Footer";

export default function CustomizePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.group as string;
  const { addToCart } = useCart();

  const group = productGroups.find(g => g.id === groupId);
  const [selectedSize, setSelectedSize] = useState(group?.sizes[0]);
  const [selectedShape, setSelectedShape] = useState<'heart' | 'circle'>(
    groupId === 'celestial-cake' ? 'circle' : 'heart'
  );
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0);
  const [cakeMessage, setCakeMessage] = useState<string>('');
  const [isHovering, setIsHovering] = useState<boolean>(false);

  if (!group) {
    return (
      <div className="min-h-screen bg-creamWhite flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-playfair text-4xl font-bold text-deepBurgundy mb-4">
            Group Not Found
          </h1>
          <Link
            href="/cakes"
            className="text-kassyPink hover:text-baroqueGold font-cormorant text-lg"
          >
            ← Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const handleContinue = () => {
    if (selectedSize) {
      if (group.buyNowOnly) {
        // For signature cakes, add to cart and go to cart
        const product = getProductById(selectedSize.id);
        if (product) {
          const messageText = cakeMessage.trim()
            ? `\nMessage on cake: "${cakeMessage.trim()}"`
            : '';
          addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            size: selectedSize.size,
            addOns: [],
            image: product.realImage || product.image || "https://kassycakes.b-cdn.net/assets/baby%20angel%20holding%20cupcake%20artwork.png",
            designNotes: `Signature design - as pictured (${selectedShape} shape)${messageText}`
          });
          router.push('/cart');
        }
      } else {
        // For customizable cakes, go to product page
        router.push(`/cakes/product/${selectedSize.id}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-creamWhite">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <Link
          href="/cakes#catalog"
          className="inline-flex items-center text-kassyPink hover:text-baroqueGold mb-8 font-cormorant text-lg"
        >
          ← Back to Catalog
        </Link>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Product Info */}
          <div>
            <div className="bg-white rounded-lg p-8 baroque-shadow">
              {/* Size Image */}
              {group.buyNowOnly && group.realVideo && groupId === 'mellon-collie-cake' ? (
                <div
                  className="mb-6 rounded-lg overflow-hidden bg-white relative aspect-square"
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  {/* Background Image - shows after video ends */}
                  {group.realImage && (
                    <img
                      src={group.realImage}
                      alt={group.name}
                      className="w-full aspect-square object-contain"
                    />
                  )}

                  {/* Video - shows on hover */}
                  {isHovering && (
                    <video
                      src={group.realVideo}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-contain scale-175"
                    />
                  )}
                </div>
              ) : group.buyNowOnly && group.realImage ? (
                <div className="mb-6 rounded-lg overflow-hidden bg-white">
                  <img
                    src={group.realImage}
                    alt={group.name}
                    className="w-full aspect-square object-contain"
                  />
                </div>
              ) : group.realImages && group.realImages.length > 0 ? (
                <div className="mb-6">
                  {/* Main Display */}
                  <div className="rounded-lg overflow-hidden bg-white border-2 border-deepBurgundy/10 aspect-square relative max-w-md mx-auto mb-3">
                    <img
                      src={group.realImages[selectedMediaIndex]}
                      alt={`${group.name} - Gallery Image ${selectedMediaIndex + 1}`}
                      className="w-full aspect-square object-contain"
                    />
                  </div>

                  {/* Thumbnail Gallery */}
                  {group.realImages.length > 1 && (
                    <div className="flex gap-2 justify-center flex-wrap">
                      {group.realImages.map((img, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedMediaIndex(index)}
                          className={`rounded-lg overflow-hidden border-2 transition-all cursor-pointer w-20 h-20 ${
                            selectedMediaIndex === index
                              ? 'border-kassyPink ring-2 ring-kassyPink'
                              : 'border-deepBurgundy/10 hover:border-kassyPink'
                          }`}
                        >
                          <img
                            src={img}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : selectedSize?.image ? (
                <div className="mb-6 rounded-lg overflow-hidden bg-white">
                  <img
                    src={selectedSize.image}
                    alt={`${group.name} - ${selectedSize.size}`}
                    className="w-full aspect-square object-contain"
                    key={selectedSize.id}
                  />
                </div>
              ) : group.image ? (
                <div className="mb-6 rounded-lg overflow-hidden bg-white">
                  <img
                    src={group.image}
                    alt={group.name}
                    className="w-full aspect-square object-contain"
                  />
                </div>
              ) : null}

              <h1 className="font-playfair text-5xl font-bold text-deepBurgundy mb-4">
                {group.name}
              </h1>

              {group.description && (
                <p className="font-cormorant text-xl text-deepBurgundy/80 mb-6">
                  {group.description}
                </p>
              )}
            </div>
          </div>

          {/* Size Selection */}
          <div>
            <div className="bg-white rounded-lg p-8 baroque-shadow">
              {/* Shape Selection for Signature Cakes and Chrome Cakes */}
              {(group.buyNowOnly || groupId === 'chrome-cake') && (
                <div className="mb-6">
                  <h3 className="font-playfair text-lg font-semibold text-deepBurgundy mb-3">
                    Select Your Shape
                  </h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedShape('heart')}
                      className={`flex-1 border-2 rounded-lg p-3 transition-all duration-300 ${
                        selectedShape === 'heart'
                          ? 'border-kassyPink bg-kassyPink/10'
                          : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                      }`}
                    >
                      <span className="font-playfair text-base text-deepBurgundy">
                        Heart
                      </span>
                    </button>
                    <button
                      onClick={() => setSelectedShape('circle')}
                      className={`flex-1 border-2 rounded-lg p-3 transition-all duration-300 ${
                        selectedShape === 'circle'
                          ? 'border-kassyPink bg-kassyPink/10'
                          : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                      }`}
                    >
                      <span className="font-playfair text-base text-deepBurgundy">
                        Circle
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Message Input for Signature Cakes */}
              {group.buyNowOnly && (
                <div className="mb-6">
                  <h3 className="font-playfair text-lg font-semibold text-deepBurgundy mb-3">
                    Message on Cake <span className="text-deepBurgundy/60 text-sm font-normal">(Optional)</span>
                  </h3>
                  <input
                    type="text"
                    value={cakeMessage}
                    onChange={(e) => setCakeMessage(e.target.value)}
                    placeholder='e.g., "Happy Birthday Sarah" or "Congratulations!"'
                    maxLength={50}
                    className="w-full px-4 py-3 rounded-lg border-2 border-deepBurgundy/20 focus:border-kassyPink outline-none font-cormorant text-lg"
                  />
                  <p className="font-cormorant text-sm text-deepBurgundy/60 mt-1">
                    {cakeMessage.length}/50 characters
                  </p>

                  {/* Show example image when typing */}
                  {cakeMessage.trim().length > 0 && (
                    <div className="mt-4 rounded-lg overflow-hidden border-2 border-kassyPink/30 bg-white p-2">
                      <p className="font-cormorant text-sm text-deepBurgundy/80 mb-2 text-center">
                        Example of writing style:
                      </p>
                      <img
                        src="https://kassycakes.b-cdn.net/assets/cakeicons/happybirthdaywriting.png"
                        alt="Example of cake writing"
                        className="w-full h-auto rounded"
                      />
                    </div>
                  )}
                </div>
              )}

              <h2 className="font-playfair text-3xl font-bold text-deepBurgundy mb-6">
                Select Your Size
              </h2>

              <div className="space-y-4">
                {group.sizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size)}
                    className={`w-full border-2 rounded-lg p-6 transition-all duration-300 text-left ${
                      selectedSize?.id === size.id
                        ? 'border-kassyPink bg-kassyPink/10'
                        : 'bg-white border-deepBurgundy/20 hover:border-kassyPink hover:bg-kassyPink/5'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-playfair text-2xl font-bold text-deepBurgundy">
                        {size.size}
                      </span>
                      <span className="font-playfair text-3xl font-bold text-kassyPink">
                        ${size.price.toFixed(2)}
                      </span>
                    </div>
                    <p className="font-cormorant text-deepBurgundy/70">
                      Serves {size.servings}
                    </p>
                  </button>
                ))}
              </div>

              <button
                onClick={handleContinue}
                className="mt-8 w-full bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-xl px-8 py-5 rounded-full transition-all duration-300 transform hover:scale-105 baroque-shadow"
              >
                {group.buyNowOnly ? 'Purchase' : 'Continue to Customize'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
