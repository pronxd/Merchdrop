import { updateProduct } from '../lib/products-db';

const circleGalleryMedia = [
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/adventure_time_birthday_cake.mp4', type: 'video' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/black_gold_celestial_wedding_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/blue_butterfly_floral_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/blue_gold_celestial_zodiac_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/blue_jean_baby_shower_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/bluey_bingo_birthday_cake_3.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/cute_strawberry_character_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/green_bunny_floral_25th_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/green_butterfly_birthday_cake_2.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/green_butterfly_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/green_pink_fairy_girl_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/green_pink_frog_engagement_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/green_totoro_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/maroon_gold_witch_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/pink_blue_unicorn_birthday_cake.mp4', type: 'video' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/pink_cat_birthday_cake_2.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/pink_cat_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/pink_floral_40th_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/pink_my_melody_strawberry_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/pink_rose_birthday_cake_5.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/pokemon_green_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/purple_pumpkin_halloween_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/snoopy_strawberry_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/spongebob_25th_anniversary_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/spongebob_25th_birthday_cake_1.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/white_pink_angel_baptism_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/gallery-circle/white_pink_butterfly_birthday_cake.webp', type: 'image' as const },
];

async function updateCircleGallery() {
  const productId = '690700d608316fb27fab1bdf';

  // Build the media array with proper structure
  const media = circleGalleryMedia.map((item, index) => ({
    url: item.url,
    type: item.type,
    order: index,
    isThumbnail: index === 0, // First item is the thumbnail
  }));

  console.log('🔄 Updating Circle Cake gallery with', media.length, 'items...');

  const result = await updateProduct(productId, { media });

  if (result.success) {
    console.log('✅ Successfully updated Circle Cake gallery!');
  } else {
    console.error('❌ Failed to update:', result.error);
  }
}

updateCircleGallery().catch(console.error);
