import { updateProduct } from '../lib/products-db';

const heartGalleryMedia = [
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/black_heart_rose_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/blue_floral_frenchie_twins_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/blue_gold_celestial_heart_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/blue_ruffled_heart_wedding_cake_1.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/blue_seashell_heart_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/burgundy_rose_mother_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/chocolate_heart_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/emerald_green_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/heart_hellfire_club_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/mint_green_butterfly_birthday_cake_1.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/orange_pink_invader_zim_graduation_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_black_cat_valentine_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_cherry_seventeen_birthday_cake_1.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_cow_print_heart_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_heart_birthday_cake_2.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_heart_cherry_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_heart_engagement_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_heart_valentines_day_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_heart_wedding_cake.mp4', type: 'video' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_hello_kitty_halloween_cake_2.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_hello_kitty_heart_cake_1.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_orange_floral_thirty_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_purple_cherry_anniversary_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_purple_heart_valentine_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pink_red_teddy_bear_heart_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pisces_baby_rainbow_heart_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/purple_butterfly_heart_cake_3.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/pusheen_pineapple_heart_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/red_pink_princess_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/silver_cherry_heart_anniversary_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/strawberry_shortcake_pink_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/teal_purple_heart_birthday_cake.webp', type: 'image' as const },
  { url: 'https://kassy.b-cdn.net/menuicons/Gallery-heart/yellow_pink_miffy_birthday_cake.webp', type: 'image' as const },
];

async function updateHeartGallery() {
  const productId = '690700d608316fb27fab1be0';

  // Build the media array with proper structure
  const media = heartGalleryMedia.map((item, index) => ({
    url: item.url,
    type: item.type,
    order: index,
    isThumbnail: index === 0, // First item is the thumbnail
  }));

  console.log('🔄 Updating Heart Cake gallery with', media.length, 'items...');

  const result = await updateProduct(productId, { media });

  if (result.success) {
    console.log('✅ Successfully updated Heart Cake gallery!');
  } else {
    console.error('❌ Failed to update:', result.error);
  }
}

updateHeartGallery().catch(console.error);
