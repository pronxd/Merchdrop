/**
 * Script to recreate accidentally deleted cakes
 * Run with: npx tsx scripts/recreate-cakes.ts
 *
 * Note: You'll need to update the media URLs with actual image paths after upload
 */

import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface ProductMedia {
  url: string;
  type: 'image' | 'video';
  order: number;
  isThumbnail: boolean;
}

interface ProductSize {
  size: string;
  price: number;
  servings?: string;
}

interface CreateProductData {
  name: string;
  category: 'lunchbox' | 'mini' | 'circle' | 'heart' | 'chrome' | 'cupcakes' | 'bento' | 'tier' | 'specialty' | 'wedding';
  productType: 'custom' | 'signature' | 'quote';
  sizes: ProductSize[];
  media: ProductMedia[];
  tagline?: string;
  description?: string;
  detailed_description?: string;
  searchable_tags?: {
    occasion?: string[];
    colors?: string[];
    theme?: string[];
    style?: string[];
    elements?: string[];
  };
  shape?: 'circle' | 'heart';
  hidden: boolean;
  buyNowOnly?: boolean;
  quoteOnly?: boolean;
  order?: number;
}

// Generate URL-safe slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Define all cakes to recreate
const cakesToCreate: CreateProductData[] = [
  {
    name: 'Custom Wedding Cake',
    category: 'wedding',
    productType: 'quote',
    sizes: [
      { size: 'Quote Only', price: 0 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/Cakes-All/WB0EkZv7onQGvbm0kRVFI.png', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Dream wedding cake - request a custom quote',
    description: 'Let us create your perfect wedding cake. Submit your vision and we\'ll provide a personalized quote.',
    searchable_tags: {
      occasion: ['wedding', 'engagement', 'anniversary'],
      theme: ['elegant', 'romantic', 'wedding'],
      style: ['tiered', 'sophisticated', 'custom']
    },
    hidden: false,
    buyNowOnly: false,
    quoteOnly: true,
    order: 0
  },
  {
    name: 'Custom Circle Cake',
    category: 'circle',
    productType: 'custom',
    shape: 'circle',
    sizes: [
      { size: '6"', price: 140.00 },
      { size: '8"', price: 170.00 }
    ],
    media: [
      // TODO: Add actual image URL after upload
      { url: 'https://kassy.b-cdn.net/cakes/custom-circle.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Fully customizable circle cake',
    description: 'Create your perfect custom circle cake with your choice of design and flavors.',
    hidden: false,
    buyNowOnly: false,
    order: 1
  },
  {
    name: 'Custom Heart Cake',
    category: 'heart',
    productType: 'custom',
    shape: 'heart',
    sizes: [
      { size: '6"', price: 140.00 },
      { size: '8"', price: 170.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/custom-heart.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Fully customizable heart cake',
    description: 'Create your perfect custom heart-shaped cake with your choice of design and flavors.',
    hidden: false,
    buyNowOnly: false,
    order: 2
  },
  {
    name: '90s Celestial',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 175.00 },
      { size: '8"', price: 195.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/90s-celestial.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Nostalgic 90s celestial design',
    description: 'A stunning cake featuring 90s-inspired celestial elements like stars, moons, and cosmic vibes.',
    searchable_tags: {
      theme: ['90s', 'celestial', 'nostalgic', 'cosmic'],
      colors: ['purple', 'blue', 'gold'],
      elements: ['stars', 'moon', 'planets']
    },
    hidden: false,
    buyNowOnly: true,
    order: 3
  },
  {
    name: 'Smashing Pumpkins',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 185.00 },
      { size: '8"', price: 215.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/smashing-pumpkins.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Pumpkin-themed delight',
    description: 'Perfect for fall celebrations with a beautiful pumpkin design.',
    searchable_tags: {
      occasion: ['halloween', 'fall', 'thanksgiving'],
      theme: ['autumn', 'seasonal'],
      colors: ['orange', 'green'],
      elements: ['pumpkins']
    },
    hidden: false,
    buyNowOnly: true,
    order: 4
  },
  {
    name: 'The Birth of Venus',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 195.00 },
      { size: '8"', price: 225.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/birth-of-venus.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Classical art-inspired masterpiece',
    description: 'An elegant cake inspired by Botticelli\'s The Birth of Venus.',
    searchable_tags: {
      theme: ['art', 'classical', 'elegant', 'renaissance'],
      colors: ['pink', 'cream', 'gold'],
      style: ['artistic', 'sophisticated']
    },
    hidden: false,
    buyNowOnly: true,
    order: 5
  },
  {
    name: 'Forest Friends',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 170.00 },
      { size: '8"', price: 205.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/forest-friends.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Adorable woodland creatures',
    description: 'Cute forest animals and nature elements perfect for any celebration.',
    searchable_tags: {
      theme: ['woodland', 'nature', 'animals', 'cute'],
      colors: ['green', 'brown', 'white'],
      elements: ['animals', 'trees', 'mushrooms']
    },
    hidden: false,
    buyNowOnly: true,
    order: 6
  },
  {
    name: 'Bubble Buddy',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 165.00 },
      { size: '8"', price: 185.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/bubble-buddy.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Bubbly fun design',
    description: 'A playful cake with bubble-themed decorations.',
    searchable_tags: {
      theme: ['playful', 'fun', 'whimsical'],
      colors: ['pastel', 'rainbow'],
      elements: ['bubbles']
    },
    hidden: false,
    buyNowOnly: true,
    order: 7
  },
  {
    name: 'Vintage Cherry',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 150.00 },
      { size: '8"', price: 180.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/vintage-cherry.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Classic cherry design',
    description: 'Vintage-inspired cake with charming cherry decorations.',
    searchable_tags: {
      theme: ['vintage', 'retro', 'classic'],
      colors: ['red', 'white', 'pink'],
      elements: ['cherries']
    },
    hidden: false,
    buyNowOnly: true,
    order: 8
  },
  {
    name: 'Miffy',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 175.00 },
      { size: '8"', price: 195.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/miffy.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Adorable Miffy bunny',
    description: 'Cute cake featuring the beloved Miffy character.',
    searchable_tags: {
      theme: ['cute', 'character', 'bunny'],
      colors: ['white', 'pastel'],
      elements: ['miffy', 'bunny']
    },
    hidden: false,
    buyNowOnly: true,
    order: 9
  },
  {
    name: 'The Lizzie McGuire',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 160.00 },
      { size: '8"', price: 195.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/lizzie-mcguire.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Y2K nostalgia',
    description: 'Inspired by the iconic Lizzie McGuire era.',
    searchable_tags: {
      theme: ['y2k', 'nostalgic', '2000s'],
      colors: ['pink', 'purple', 'multicolor']
    },
    hidden: false,
    buyNowOnly: true,
    order: 10
  },
  {
    name: 'Tea Time Snoopy',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 175.00 },
      { size: '8"', price: 195.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/tea-time-snoopy.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Snoopy tea party',
    description: 'Charming Snoopy-themed cake perfect for tea time celebrations.',
    searchable_tags: {
      theme: ['snoopy', 'peanuts', 'tea party', 'cute'],
      colors: ['white', 'black', 'pastel'],
      elements: ['snoopy', 'teacups']
    },
    hidden: false,
    buyNowOnly: true,
    order: 11
  },
  {
    name: 'Squidward Graduate',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 175.00 },
      { size: '8"', price: 195.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/squidward-graduate.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Graduation celebration',
    description: 'Fun Squidward-themed graduation cake.',
    searchable_tags: {
      occasion: ['graduation'],
      theme: ['spongebob', 'cartoon', 'fun'],
      colors: ['blue', 'teal'],
      elements: ['squidward', 'graduation cap']
    },
    hidden: false,
    buyNowOnly: true,
    order: 12
  },
  {
    name: 'Gothic Romance',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 185.00 },
      { size: '8"', price: 215.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/gothic-romance.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Dark romantic elegance',
    description: 'A stunning gothic-inspired cake with romantic details.',
    searchable_tags: {
      theme: ['gothic', 'romantic', 'dark', 'elegant'],
      colors: ['black', 'red', 'deep purple'],
      style: ['dramatic', 'sophisticated']
    },
    hidden: false,
    buyNowOnly: true,
    order: 13
  },
  {
    name: 'Belle',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 175.00 },
      { size: '8"', price: 195.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/belle.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Beauty and the Beast inspired',
    description: 'Enchanting cake inspired by Belle from Beauty and the Beast.',
    searchable_tags: {
      theme: ['disney', 'princess', 'fairytale'],
      colors: ['yellow', 'gold', 'rose'],
      elements: ['belle', 'roses', 'enchanted']
    },
    hidden: false,
    buyNowOnly: true,
    order: 14
  },
  {
    name: 'The Madeline',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 160.00 },
      { size: '8"', price: 195.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/madeline.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Parisian charm',
    description: 'Inspired by the classic Madeline storybook with Parisian flair.',
    searchable_tags: {
      theme: ['parisian', 'french', 'storybook', 'classic'],
      colors: ['yellow', 'blue', 'white']
    },
    hidden: false,
    buyNowOnly: true,
    order: 15
  },
  {
    name: 'Dream Angel',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 175.00 },
      { size: '8"', price: 185.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/dream-angel.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Heavenly angelic design',
    description: 'A dreamy cake with angelic details and soft colors.',
    searchable_tags: {
      theme: ['angelic', 'dreamy', 'heavenly'],
      colors: ['white', 'pastel', 'gold'],
      elements: ['angels', 'clouds', 'wings']
    },
    hidden: false,
    buyNowOnly: true,
    order: 16
  },
  {
    name: 'Engaged froggies',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 175.00 },
      { size: '8"', price: 215.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/engaged-froggies.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Cute engagement celebration',
    description: 'Adorable engaged frog couple perfect for engagement celebrations.',
    searchable_tags: {
      occasion: ['engagement', 'wedding'],
      theme: ['cute', 'fun', 'romantic'],
      colors: ['green', 'pink'],
      elements: ['frogs']
    },
    hidden: false,
    buyNowOnly: true,
    order: 17
  },
  {
    name: 'Rose Garden',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 150.00 },
      { size: '8"', price: 180.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/rose-garden.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Beautiful rose garden',
    description: 'Elegant cake adorned with beautiful rose decorations.',
    searchable_tags: {
      theme: ['floral', 'romantic', 'elegant'],
      colors: ['pink', 'red', 'green'],
      elements: ['roses', 'flowers']
    },
    hidden: false,
    buyNowOnly: true,
    order: 18
  },
  {
    name: 'Ivory & Rose Blush',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 150.00 },
      { size: '8"', price: 180.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/ivory-rose-blush.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Soft and romantic',
    description: 'Delicate ivory cake with blush rose accents.',
    searchable_tags: {
      theme: ['romantic', 'elegant', 'wedding'],
      colors: ['ivory', 'blush', 'pink'],
      elements: ['roses'],
      style: ['minimalist', 'sophisticated']
    },
    hidden: false,
    buyNowOnly: true,
    order: 19
  },
  {
    name: 'Sylvanian Fairy Wonderland',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 190.00 },
      { size: '8"', price: 235.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/sylvanian-fairy-wonderland.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Magical Sylvanian world',
    description: 'Whimsical cake featuring Sylvanian Families in a fairy wonderland.',
    searchable_tags: {
      theme: ['sylvanian', 'fairy', 'magical', 'whimsical'],
      colors: ['pastel', 'rainbow'],
      elements: ['sylvanian families', 'fairies', 'flowers']
    },
    hidden: false,
    buyNowOnly: true,
    order: 20
  },
  {
    name: 'Thirty Flirty and Thriving',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 160.00 },
      { size: '8"', price: 185.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/thirty-flirty-thriving.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Fabulous 30th birthday',
    description: 'Fun and flirty cake perfect for celebrating 30.',
    searchable_tags: {
      occasion: ['birthday', '30th birthday'],
      theme: ['fun', 'celebration', 'milestone'],
      colors: ['pink', 'gold']
    },
    hidden: false,
    buyNowOnly: true,
    order: 21
  },
  {
    name: 'Petite Wedding',
    category: 'tier',
    productType: 'signature',
    sizes: [
      { size: 'Standard', price: 315.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/petite-wedding.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Elegant small wedding cake',
    description: 'Beautiful tiered wedding cake perfect for intimate celebrations.',
    searchable_tags: {
      occasion: ['wedding', 'engagement'],
      theme: ['elegant', 'romantic', 'wedding'],
      colors: ['white', 'ivory'],
      style: ['tiered', 'sophisticated']
    },
    hidden: false,
    buyNowOnly: true,
    order: 22
  },
  {
    name: 'Swirly Girly',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 150.00 },
      { size: '8"', price: 180.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/swirly-girly.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Fun swirly design',
    description: 'Playful cake with beautiful swirly decorations.',
    searchable_tags: {
      theme: ['fun', 'playful', 'girly'],
      colors: ['pink', 'pastel'],
      elements: ['swirls']
    },
    hidden: false,
    buyNowOnly: true,
    order: 23
  },
  {
    name: 'Just Married',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 175.00 },
      { size: '8"', price: 215.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/just-married.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Wedding celebration',
    description: 'Perfect cake for celebrating newlyweds.',
    searchable_tags: {
      occasion: ['wedding'],
      theme: ['romantic', 'wedding', 'celebration'],
      colors: ['white', 'gold'],
      elements: ['hearts', 'wedding']
    },
    hidden: false,
    buyNowOnly: true,
    order: 24
  },
  {
    name: 'Peachy Spring',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 175.00 },
      { size: '8"', price: 195.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/peachy-spring.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Fresh spring vibes',
    description: 'Light and fresh cake with beautiful peachy spring colors.',
    searchable_tags: {
      theme: ['spring', 'fresh', 'seasonal'],
      colors: ['peach', 'pink', 'green'],
      elements: ['flowers', 'peaches']
    },
    hidden: false,
    buyNowOnly: true,
    order: 25
  },
  {
    name: 'La Vie En Rose',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 185.00 },
      { size: '8"', price: 215.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/la-vie-en-rose.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Life through rose-colored glasses',
    description: 'Romantic French-inspired cake celebrating life and love.',
    searchable_tags: {
      theme: ['romantic', 'french', 'elegant'],
      colors: ['pink', 'rose', 'gold'],
      elements: ['roses'],
      style: ['sophisticated']
    },
    hidden: false,
    buyNowOnly: true,
    order: 26
  },
  {
    name: 'Gothic Rose',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 185.00 },
      { size: '8"', price: 215.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/gothic-rose.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Dark romantic roses',
    description: 'Dramatic gothic cake with beautiful dark roses.',
    searchable_tags: {
      theme: ['gothic', 'romantic', 'dark'],
      colors: ['black', 'red', 'deep purple'],
      elements: ['roses'],
      style: ['dramatic', 'sophisticated']
    },
    hidden: false,
    buyNowOnly: true,
    order: 27
  },
  {
    name: 'Enchanted Fairy Garden',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 175.00 },
      { size: '8"', price: 195.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/enchanted-fairy-garden.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Magical fairy garden',
    description: 'Enchanting cake with fairy garden elements and magical details.',
    searchable_tags: {
      theme: ['fairy', 'magical', 'enchanted', 'whimsical'],
      colors: ['pastel', 'green', 'pink'],
      elements: ['fairies', 'flowers', 'mushrooms']
    },
    hidden: false,
    buyNowOnly: true,
    order: 28
  },
  {
    name: 'Cowgirl Princess',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 150.00 },
      { size: '8"', price: 180.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/cowgirl-princess.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Western meets princess',
    description: 'Fun combination of cowgirl and princess themes.',
    searchable_tags: {
      theme: ['western', 'princess', 'cowgirl', 'fun'],
      colors: ['pink', 'brown', 'gold'],
      elements: ['cowboy hat', 'crown']
    },
    hidden: false,
    buyNowOnly: true,
    order: 29
  },
  {
    name: 'Strawberry Shortcake',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 175.00 },
      { size: '8"', price: 195.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/strawberry-shortcake.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Sweet strawberry character',
    description: 'Adorable Strawberry Shortcake character-themed cake.',
    searchable_tags: {
      theme: ['character', 'nostalgic', 'cute'],
      colors: ['red', 'pink', 'white'],
      elements: ['strawberries', 'strawberry shortcake character']
    },
    hidden: false,
    buyNowOnly: true,
    order: 30
  },
  {
    name: 'Cotton Candy Skies',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 185.00 },
      { size: '8"', price: 215.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/cotton-candy-skies.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Dreamy cotton candy clouds',
    description: 'Whimsical cake with cotton candy-inspired sky colors.',
    searchable_tags: {
      theme: ['dreamy', 'whimsical', 'sky'],
      colors: ['pink', 'blue', 'pastel'],
      elements: ['clouds', 'cotton candy']
    },
    hidden: false,
    buyNowOnly: true,
    order: 31
  },
  {
    name: 'Witches Don\'t Age',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 185.00 },
      { size: '8"', price: 215.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/witches-dont-age.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Magical birthday celebration',
    description: 'Fun witchy-themed birthday cake with a playful message.',
    searchable_tags: {
      occasion: ['birthday', 'halloween'],
      theme: ['witchy', 'magical', 'fun'],
      colors: ['purple', 'black', 'orange'],
      elements: ['witch', 'magic']
    },
    hidden: false,
    buyNowOnly: true,
    order: 32
  },
  {
    name: 'Barbie Girl',
    category: 'specialty',
    productType: 'signature',
    sizes: [
      { size: '6"', price: 150.00 },
      { size: '8"', price: 180.00 }
    ],
    media: [
      { url: 'https://kassy.b-cdn.net/cakes/barbie-girl.webp', type: 'image', order: 0, isThumbnail: true }
    ],
    tagline: 'Life in plastic, it\'s fantastic',
    description: 'Fun Barbie-themed cake in signature pink.',
    searchable_tags: {
      theme: ['barbie', 'fun', 'girly'],
      colors: ['pink', 'hot pink'],
      elements: ['barbie']
    },
    hidden: false,
    buyNowOnly: true,
    order: 33
  }
];

async function createCakesInDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in .env.local');
  }

  console.log('🔌 Connecting to MongoDB...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const dbName = process.env.MONGODB_DB || 'kassycakes';
    const db: Db = client.db(dbName);
    const productsCollection = db.collection('products');

    console.log(`\n📊 Database: ${dbName}`);
    console.log(`📦 Collection: products`);
    console.log(`🎂 Total cakes to create: ${cakesToCreate.length}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const cake of cakesToCreate) {
      try {
        // Check if cake already exists by name
        const existingCake = await productsCollection.findOne({ name: cake.name });

        if (existingCake) {
          console.log(`⚠️  Skipping "${cake.name}" - already exists`);
          continue;
        }

        // Generate slug
        const slug = generateSlug(cake.name);

        // Create product document
        const productDoc = {
          ...cake,
          slug,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Insert into database
        const result = await productsCollection.insertOne(productDoc);

        if (result.acknowledged) {
          successCount++;
          console.log(`✅ Created: "${cake.name}" (${cake.sizes.map(s => s.size).join(', ')})`);
        } else {
          errorCount++;
          console.log(`❌ Failed to create: "${cake.name}"`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error creating "${cake.name}":`, error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${successCount} cakes`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⏭️  Skipped (already exist): ${cakesToCreate.length - successCount - errorCount}`);
    console.log('='.repeat(60));

    console.log('\n📝 NEXT STEPS:');
    console.log('1. Upload images for each cake to your CDN');
    console.log('2. Update the media URLs in the database via your admin dashboard');
    console.log('3. Verify all cakes appear correctly on your website\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createCakesInDatabase()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
