import { NextRequest, NextResponse } from 'next/server';
import { products } from '@/lib/products';
import { createProduct, generateSlug } from '@/lib/products-db';
import { isAdminAuthenticated } from '@/lib/auth';

/**
 * Migration endpoint to transfer hardcoded products to MongoDB
 * This is a one-time migration script
 *
 * To run: Visit /api/admin/migrate-products in your browser while logged in as admin
 */
export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as { name: string; error: string }[],
      skipped: [] as string[]
    };

    // Group products by name (to handle 6" and 8" sizes)
    const productGroups = new Map<string, typeof products>();

    for (const product of products) {
      // Extract base name (without size)
      const baseName = product.name.replace(/^\d+"?\s*/, '');

      if (!productGroups.has(baseName)) {
        productGroups.set(baseName, []);
      }
      productGroups.get(baseName)!.push(product);
    }

    // Migrate each product group
    for (const [baseName, groupProducts] of productGroups.entries()) {
      try {
        // Determine product type based on ID
        const firstProduct = groupProducts[0];
        const isCustomCake = firstProduct.id <= 5;
        const productType = isCustomCake ? 'custom' : 'signature';

        // Extract sizes from group
        const sizes = groupProducts.map(p => {
          // Extract size from name (e.g., "6\"" from "6\" Circle Cake")
          const sizeMatch = p.name.match(/^(\d+"?)/);
          const size = sizeMatch ? sizeMatch[1] : '6"';

          return {
            size: size.includes('"') ? size : `${size}"`,
            price: p.price,
            servings: size === '6"' ? '8-12 people' : '12-20 people'
          };
        });

        // Create media array from existing images
        const media = [];
        if (firstProduct.realImage) {
          media.push({
            url: firstProduct.realImage,
            type: 'image' as const,
            order: 0,
            isThumbnail: true
          });
        }

        // Add additional images from realImages array
        if (firstProduct.realImages) {
          firstProduct.realImages.forEach((url, index) => {
            media.push({
              url,
              type: 'image' as const,
              order: index + 1,
              isThumbnail: false
            });
          });
        }

        // Add video if exists
        if (firstProduct.realVideo) {
          media.push({
            url: firstProduct.realVideo,
            type: 'video' as const,
            order: media.length,
            isThumbnail: false
          });
        }

        // Create product in MongoDB
        const result = await createProduct({
          name: baseName,
          slug: generateSlug(baseName),
          category: firstProduct.category,
          productType,
          sizes,
          media,
          tagline: firstProduct.tagline,
          description: firstProduct.description,
          detailed_description: firstProduct.detailed_description,
          searchable_tags: firstProduct.searchable_tags,
          shape: firstProduct.shape,
          buyNowOnly: firstProduct.buyNowOnly || false,
          hidden: false
        });

        if (result.success) {
          results.success.push(baseName);
        } else {
          results.failed.push({
            name: baseName,
            error: result.error || 'Unknown error'
          });
        }

      } catch (error: any) {
        results.failed.push({
          name: baseName,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      message: 'Migration completed',
      total: productGroups.size,
      ...results
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 }
    );
  }
}
