import { products, Product } from './products';

export interface ProductGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  image?: string;
  realImage?: string;
  realImages?: string[];
  realVideo?: string;
  buyNowOnly?: boolean;
  sizes: {
    id: number;
    size: string;
    price: number;
    servings: string;
    image?: string;
  }[];
}

export const productGroups: ProductGroup[] = [
  {
    id: 'circle-cake',
    name: 'Circle Cake',
    description: 'Fully customizable round cake - choose your colors, design, and decorations to make it uniquely yours',
    category: 'circle',
    image: 'https://kassycakes.b-cdn.net/assets/cakeicons/6%20Circle%20Cake.jpg',
    realImage: 'https://kassycakes.b-cdn.net/circle.webp',
    buyNowOnly: true,
    sizes: [
      { id: 1, size: '4"', price: 50.00, servings: '2-4 people' },
      { id: 4, size: '6"', price: 140.00, servings: '8-12 people' },
      { id: 5, size: '8"', price: 170.00, servings: '12-16 people' }
    ]
  },
  {
    id: 'heart-cake',
    name: 'Heart Cake',
    description: 'Fully customizable heart-shaped cake - personalize colors, themes, and toppings for your special occasion',
    category: 'heart',
    image: 'https://kassycakes.b-cdn.net/assets/cakeicons/_MSVo2TckPxOkc-iR-uB0_7df2c94ffa074d1dbb8a096e1354536a.png',
    realImage: 'https://kassycakes.b-cdn.net/heart.webp',
    sizes: [
      { id: 2, size: '6"', price: 140.00, servings: '8-12 people' },
      { id: 3, size: '8"', price: 170.00, servings: '12-16 people' }
    ]
  },
  {
    id: 'smashing-pumpkins',
    name: 'Smashing Pumpkins',
    description: 'Festive pumpkin-themed cake perfect for fall celebrations',
    category: 'specialty',
    realImage: 'https://kassy.b-cdn.net/Photos/IMG_8449.webp',
    buyNowOnly: true,
    sizes: [
      { id: 6, size: '6"', price: 150.00, servings: '8-12 people' },
      { id: 7, size: '8"', price: 180.00, servings: '12-20 people' }
    ]
  },
  {
    id: 'witches-dont-age',
    name: "Witches Don't Age",
    description: 'Enchanting witch-themed cake with magical details',
    category: 'specialty',
    realImage: 'https://kassy.b-cdn.net/Cakes/displayIMG_0019.webp',
    realImages: ['https://kassy.b-cdn.net/Cakes/IMG_0022.webp'],
    buyNowOnly: true,
    sizes: [
      { id: 8, size: '6"', price: 150.00, servings: '8-12 people' },
      { id: 9, size: '8"', price: 180.00, servings: '12-20 people' }
    ]
  },
  {
    id: 'the-lizzie-mcguire',
    name: 'The Lizzie Mcguire',
    description: 'Fun and colorful cake inspired by the iconic show',
    category: 'specialty',
    realImage: 'https://kassy.b-cdn.net/Cakes/1C2A15CA-6FE1-4F8F-910E-E025BD963BB4.webp',
    buyNowOnly: true,
    sizes: [
      { id: 10, size: '6"', price: 150.00, servings: '8-12 people' },
      { id: 11, size: '8"', price: 180.00, servings: '12-20 people' }
    ]
  },
  {
    id: '90s-celestial',
    name: '90s Celestial',
    description: 'Mystical celestial-themed cake with stars and moons',
    category: 'specialty',
    realImage: 'https://kassy.b-cdn.net/Cakes/DisplayIMG_7380.webp',
    realImages: ['https://kassy.b-cdn.net/Cakes/IMG_7962.webp'],
    buyNowOnly: true,
    sizes: [
      { id: 12, size: '6"', price: 150.00, servings: '8-12 people' },
      { id: 13, size: '8"', price: 180.00, servings: '12-20 people' }
    ]
  },
  {
    id: 'spongebob-bubbles',
    name: 'Spongebob Bubbles',
    description: 'Fun SpongeBob-themed cake with bubbles',
    category: 'specialty',
    realImage: 'https://kassy.b-cdn.net/Cakes/displayIMG_8214.webp',
    realImages: ['https://kassy.b-cdn.net/Cakes/IMG_8215.webp'],
    buyNowOnly: true,
    sizes: [
      { id: 14, size: '6"', price: 150.00, servings: '8-12 people' },
      { id: 15, size: '8"', price: 180.00, servings: '12-20 people' }
    ]
  },
  {
    id: 'forest-friends',
    name: 'Forest Friends',
    description: 'Adorable woodland creatures cake perfect for nature lovers',
    category: 'specialty',
    realImage: 'https://kassy.b-cdn.net/Cakes/IMG_4059.webp',
    buyNowOnly: true,
    sizes: [
      { id: 16, size: '6"', price: 150.00, servings: '8-12 people' },
      { id: 17, size: '8"', price: 180.00, servings: '12-20 people' }
    ]
  },
  {
    id: 'vintage-cherry',
    name: 'Vintage Cherry',
    description: 'Classic vintage-style cake with cherry decorations',
    category: 'specialty',
    realImage: 'https://kassy.b-cdn.net/Cakes/IMG_2775.webp',
    buyNowOnly: true,
    sizes: [
      { id: 18, size: '6"', price: 150.00, servings: '8-12 people' },
      { id: 19, size: '8"', price: 180.00, servings: '12-20 people' }
    ]
  },
  {
    id: 'cowgirl-princess',
    name: 'Cowgirl Princess',
    description: 'Western-themed princess cake perfect for cowgirl celebrations',
    category: 'specialty',
    realImage: 'https://kassy.b-cdn.net/Cakes/574634068_1042810344566896_6462995457740500017_n.jpg',
    buyNowOnly: true,
    sizes: [
      { id: 20, size: '6"', price: 150.00, servings: '8-12 people' },
      { id: 21, size: '8"', price: 180.00, servings: '12-20 people' }
    ]
  }
];

// Individual specialty items that don't group
export const specialtyProducts = products.filter(p =>
  false
);
