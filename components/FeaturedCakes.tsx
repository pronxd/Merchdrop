"use client";

import { productGroups } from "@/lib/productGroups";

// Customer testimonial photos
const customerPhotos = [
  {
    id: 1,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(1).webp",
    productId: 68,
  },
  {
    id: 2,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(11).webp",
    productId: 42,
  },
  {
    id: 3,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(12).webp",
    productId: 6,
  },
  {
    id: 4,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(13).webp",
    productId: 76,
  },
  {
    id: 5,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(17).webp",
    productId: 6,
  },
  {
    id: 6,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(18).webp",
    productId: 6,
  },
  {
    id: 7,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(19).webp",
    productId: 56,
  },
  {
    id: 8,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(20).webp",
    productId: 2,
  },
  {
    id: 9,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(21).webp",
    productId: 70,
  },
  {
    id: 10,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(22).webp",
    productId: 6,
  },
  {
    id: 11,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(3).webp",
    productId: 6,
  },
  {
    id: 12,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(5).webp",
    productId: 6,
  },
  {
    id: 13,
    image: "https://kassycakes.b-cdn.net/assets/photowall/insta%20(8).webp",
    productId: 50,
  },
  {
    id: 14,
    image: "https://kassycakes.b-cdn.net/assets/photowall/imgi_70_455194011_18455368099018433_4907170996250551757_n.webp",
    productId: 6,
  },
  {
    id: 16,
    image: "https://kassycakes.b-cdn.net/assets/photowall/imgi_49_484873119_18490676194025147_7344270873845949058_n.webp",
    productId: 74,
  },
  {
    id: 17,
    image: "https://kassycakes.b-cdn.net/assets/photowall/imgi_71_448127994_1125886321972106_2174638486447219077_n.webp",
    productId: 50,
  },
  {
    id: 18,
    image: "https://kassycakes.b-cdn.net/assets/photowall/imgi_72_439498905_983996249959606_1271076490819124041_n.webp",
    productId: 32,
  },
  {
    id: 19,
    image: "https://kassycakes.b-cdn.net/assets/photowall/imgi_48_530379400_18524117890043214_7540961981949537511_n.webp",
    productId: 50,
  },
  {
    id: 20,
    image: "https://kassycakes.b-cdn.net/assets/photowall/imgi_71_472658586_18478889176012809_8675109009492009427_n.webp",
    productId: 75,
  },
  {
    id: 21,
    image: "https://kassycakes.b-cdn.net/assets/photowall/imgi_64_338443202_1006398960741858_1407773634961239937_n.webp",
    productId: 42,
  },
];

// Featured products from the actual catalog
const featuredCakes = productGroups.slice(0, 12).map(product => ({
  id: product.id,
  productId: product.sizes[0].id, // Use the first size's product ID for linking
  image: product.realImage || product.image,
  title: product.name,
  description: product.description,
}));

const _oldFeaturedCakes = [
  {
    id: 1,
    image: "https://kassycakes.b-cdn.net/blue_gold_celestial_night_cake.jpg",
    title: "Celestial Dreams",
    description: "Starry night masterpiece",
  },
  {
    id: 2,
    image: "https://kassycakes.b-cdn.net/blue_gold_guardian_angel_cake.jpg",
    title: "Guardian Angel",
    description: "Divine protection",
  },
  {
    id: 3,
    image: "https://kassycakes.b-cdn.net/auburn_haired_classical_woman_cake.jpg",
    title: "Renaissance Beauty",
    description: "Classical elegance",
  },
  {
    id: 4,
    image: "https://kassycakes.b-cdn.net/blue_gold_floral_wedding_cake.jpg",
    title: "Baroque Florals",
    description: "Ornate garden dreams",
  },
  {
    id: 5,
    image: "https://kassycakes.b-cdn.net/blue_cherub_moon_cake.jpg",
    title: "Cherub's Moon",
    description: "Heavenly sweetness",
  },
  {
    id: 6,
    image: "https://kassycakes.b-cdn.net/enchanted_portal_fantasy_cake.jpg",
    title: "Enchanted Portal",
    description: "Gateway to wonder",
  },
  {
    id: 7,
    image: "https://kassycakes.b-cdn.net/alice_wonderland_eat_me_cake.jpg",
    title: "Wonderland Dreams",
    description: "Curiouser and curiouser",
  },
  {
    id: 8,
    image: "https://kassycakes.b-cdn.net/blue_ocean_seashell_cake.jpg",
    title: "Ocean's Treasure",
    description: "Seashell serenity",
  },
  {
    id: 9,
    image: "https://kassycakes.b-cdn.net/blue_gold_sun_moon_cake.jpg",
    title: "Sun & Moon",
    description: "Celestial harmony",
  },
  {
    id: 10,
    image: "https://kassycakes.b-cdn.net/green_fairy_birthday_cake.jpg",
    title: "Fairy Garden",
    description: "Magical woodland",
  },
  {
    id: 11,
    image: "https://kassycakes.b-cdn.net/blue_butterfly_birthday_cake.jpg",
    title: "Butterfly Meadow",
    description: "Nature's beauty",
  },
  {
    id: 12,
    image: "https://kassycakes.b-cdn.net/blue_gold_angel_baby_cake.jpg",
    title: "Angel Baby",
    description: "Angelic grace",
  },
];

export default function FeaturedCakes() {
  return (
    <section id="gallery" className="py-20 px-4 md:px-8 bg-creamWhite">
      {/* Section Header */}
      <div className="text-center mb-16 relative">
        <div className="absolute left-1/2 -translate-x-1/2 -top-12 w-32 md:w-40">
          <img
            src="https://kassycakes.b-cdn.net/assets/baby%20angels%20on%20cherry%20pie%20tea%20keettle%20big%20tea%20kettle%20next%20to%20them.png"
            alt="Angels on pie"
            className="drop-shadow-lg"
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
            loading="eager"
          />
        </div>

        <h2 className="font-playfair text-5xl md:text-6xl font-bold text-deepBurgundy mb-4 pt-24">
          Forever Grateful for Your Trust
        </h2>

        <div className="flex justify-center mb-6">
          <svg viewBox="0 0 300 20" className="w-96" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 10 Q 75 5, 150 10 T 300 10"
              stroke="#d4af37"
              fill="none"
              strokeWidth="2"
            />
            <circle cx="150" cy="10" r="4" fill="#d4af37" />
            <circle cx="75" cy="8" r="2.5" fill="#d4af37" />
            <circle cx="225" cy="8" r="2.5" fill="#d4af37" />
          </svg>
        </div>

        <p className="font-cormorant text-xl md:text-2xl text-deepBurgundy/80 max-w-2xl mx-auto">
          Thank you from the bottom of my heart for letting me be part of your most special moments. Every smile, every celebration, every memory you've shared with me means the world. Your support has turned my passion into a dream come true. 💖
        </p>
      </div>

      {/* Customer Photos Grid - eager load since images are small & cached */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {customerPhotos.map((photo) => (
          <div key={photo.id} className="relative ornamental-border rounded-lg overflow-hidden bg-white p-2 baroque-shadow">
            <div className="aspect-square relative overflow-hidden rounded" onContextMenu={(e) => e.preventDefault()}>
              <img
                src={photo.image}
                alt="Happy Kassy Cakes customer"
                className="w-full h-full object-cover"
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <div className="text-center mt-16">
        <a
          href="/cakes"
          className="inline-block bg-kassyPink hover:bg-baroqueGold text-white font-playfair text-lg md:text-xl px-10 py-4 rounded-full transition-all duration-300 transform hover:scale-105 baroque-shadow"
        >
          Create Your Celebration
        </a>
      </div>
    </section>
  );
}
