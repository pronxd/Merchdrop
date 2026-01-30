/**
 * Helper script to update cake image URLs after uploading to CDN
 * Run with: npx tsx scripts/update-cake-images.ts
 *
 * This script updates the media URLs for cakes after you've uploaded
 * the actual images to your CDN.
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Define your actual image URLs here
 * Format: { cakeName: imageUrl }
 */
const imageUpdates: Record<string, string> = {
  // Example:
  // 'Custom Circle Cake': 'https://kassy.b-cdn.net/cakes/custom-circle-actual.webp',
  // '90s Celestial': 'https://kassy.b-cdn.net/cakes/90s-celestial-actual.webp',

  // Add your actual image URLs below:
  // 'Cake Name': 'https://kassy.b-cdn.net/path/to/image.webp',
};

/**
 * Or use this format if you have multiple images per cake
 */
const multipleImageUpdates: Record<string, Array<{ url: string; type: 'image' | 'video' }>> = {
  // Example:
  // 'Custom Circle Cake': [
  //   { url: 'https://kassy.b-cdn.net/cakes/circle1.webp', type: 'image' },
  //   { url: 'https://kassy.b-cdn.net/cakes/circle2.webp', type: 'image' },
  // ],
};

async function updateCakeImages() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in .env.local');
  }

  // Check if there are any updates to apply
  const singleUpdates = Object.keys(imageUpdates).length;
  const multiUpdates = Object.keys(multipleImageUpdates).length;

  if (singleUpdates === 0 && multiUpdates === 0) {
    console.log('⚠️  No image updates defined!');
    console.log('\nPlease edit this script and add your image URLs in the imageUpdates object.');
    console.log('\nExample:');
    console.log(`const imageUpdates = {
  'Custom Circle Cake': 'https://kassy.b-cdn.net/cakes/my-circle-cake.webp',
  '90s Celestial': 'https://kassy.b-cdn.net/cakes/my-celestial.webp',
};`);
    return;
  }

  console.log('🔌 Connecting to MongoDB...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const dbName = process.env.MONGODB_DB || 'kassycakes';
    const db = client.db(dbName);
    const productsCollection = db.collection('products');

    let successCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    // Update single images
    for (const [cakeName, imageUrl] of Object.entries(imageUpdates)) {
      try {
        const result = await productsCollection.updateOne(
          { name: cakeName },
          {
            $set: {
              media: [
                {
                  url: imageUrl,
                  type: 'image',
                  order: 0,
                  isThumbnail: true
                }
              ],
              updatedAt: new Date()
            }
          }
        );

        if (result.matchedCount === 0) {
          notFoundCount++;
          console.log(`⚠️  Cake not found: "${cakeName}"`);
        } else if (result.modifiedCount > 0) {
          successCount++;
          console.log(`✅ Updated: "${cakeName}"`);
          console.log(`   → ${imageUrl}`);
        } else {
          console.log(`ℹ️  No change: "${cakeName}" (already has this URL)`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating "${cakeName}":`, error);
      }
    }

    // Update multiple images
    for (const [cakeName, images] of Object.entries(multipleImageUpdates)) {
      try {
        const mediaArray = images.map((img, index) => ({
          url: img.url,
          type: img.type,
          order: index,
          isThumbnail: index === 0
        }));

        const result = await productsCollection.updateOne(
          { name: cakeName },
          {
            $set: {
              media: mediaArray,
              updatedAt: new Date()
            }
          }
        );

        if (result.matchedCount === 0) {
          notFoundCount++;
          console.log(`⚠️  Cake not found: "${cakeName}"`);
        } else if (result.modifiedCount > 0) {
          successCount++;
          console.log(`✅ Updated: "${cakeName}" (${images.length} images)`);
          images.forEach((img, i) => {
            console.log(`   ${i + 1}. ${img.url}`);
          });
        } else {
          console.log(`ℹ️  No change: "${cakeName}" (already has these URLs)`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating "${cakeName}":`, error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${successCount} cakes`);
    console.log(`⚠️  Not found: ${notFoundCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
updateCakeImages()
  .then(() => {
    console.log('\n🎉 Image update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
