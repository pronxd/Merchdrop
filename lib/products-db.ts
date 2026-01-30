import { getCollection } from './mongodb';
import { ObjectId } from 'mongodb';

export interface ProductMedia {
  url: string;
  type: 'image' | 'video';
  order: number; // For drag-drop ordering
  isThumbnail: boolean; // First media item should be thumbnail
  cropData?: {
    x: number;
    y: number;
    scale: number;
    canvasSize: number;
  };
}

export interface ColorVariant {
  color: string; // hex color code like "#FF5733"
  name: string;  // color name like "Pink", "Blue", etc.
  media: Array<{
    url: string;
    type: 'image' | 'video';
  }>;
}

export interface DesignVariant {
  name: string;  // design name like "Bunny", "Flower", etc.
  media: Array<{
    url: string;
    type: 'image' | 'video';
  }>;
}

export interface ProductDB {
  _id?: ObjectId;
  name: string;
  slug: string; // URL-friendly version of name
  category: 'lunchbox' | 'mini' | 'circle' | 'heart' | 'chrome' | 'cupcakes' | 'bento' | 'tier' | 'specialty';
  productType: 'custom' | 'signature'; // Custom (Circle/Heart) vs Signature cakes

  // Pricing - support for multiple sizes
  sizes: Array<{
    size: string; // e.g., "6\"", "8\""
    price: number;
    servings?: string; // e.g., "8-12 people"
  }>;

  // Media
  media: ProductMedia[]; // Photos and videos, ordered

  // Color variants - photos/videos for different color options
  colorVariants?: ColorVariant[];

  // Design variants - different cake designs (e.g., different small cake designs in a group)
  designVariants?: DesignVariant[];

  // Per-product option controls (null/undefined = all options available)
  availableFlavors?: string[] | null;    // Array of flavor IDs, null = all, [] = none
  availableFillings?: string[] | null;   // Array of filling IDs
  availableAddOns?: string[] | null;     // Array of add-on IDs

  // Section visibility controls (default true if undefined)
  showFlavorSection?: boolean;
  showFillingSection?: boolean;
  showAddOnsSection?: boolean;
  showShapeSection?: boolean;

  // Per-product shape controls
  availableShapes?: ('heart' | 'circle')[] | null;  // Array of shapes, null = all, [] = none

  // Descriptions
  tagline?: string; // Short tagline for website display
  description?: string; // Customer-facing description
  detailed_description?: string; // Detailed description for AI chatbot

  // Search tags for AI
  searchable_tags?: {
    occasion?: string[];
    colors?: string[];
    theme?: string[];
    style?: string[];
    elements?: string[];
  };

  // Shape for custom cakes
  shape?: 'circle' | 'heart';

  // Visibility
  hidden: boolean; // Hide instead of delete
  buyNowOnly?: boolean; // Whether it requires immediate purchase

  // Display order
  order?: number; // For custom ordering on catalog page

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Get all products (optionally filter by hidden status)
export async function getProducts(includeHidden = false): Promise<ProductDB[]> {
  try {
    const productsCollection = await getCollection('products');

    const query = includeHidden ? {} : { hidden: false };
    const products = await productsCollection
      .find(query)
      .toArray();

    // Sort by order field (if it exists), then by createdAt
    const sortedProducts = (products as ProductDB[]).sort((a, b) => {
      // If both have order, sort by order
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // If only a has order, it comes first
      if (a.order !== undefined) return -1;
      // If only b has order, it comes first
      if (b.order !== undefined) return 1;
      // If neither has order, sort by createdAt (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sortedProducts;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// Get single product by ID
export async function getProductById(id: string): Promise<ProductDB | null> {
  try {
    // Check if ID is a valid ObjectId format (24 hex characters)
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return null;
    }

    const productsCollection = await getCollection('products');
    const product = await productsCollection.findOne({ _id: new ObjectId(id) });
    return product as ProductDB | null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

// Get product by slug
export async function getProductBySlug(slug: string): Promise<ProductDB | null> {
  try {
    const productsCollection = await getCollection('products');
    const product = await productsCollection.findOne({ slug });
    return product as ProductDB | null;
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return null;
  }
}

// Create new product
export async function createProduct(
  productData: Omit<ProductDB, '_id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const productsCollection = await getCollection('products');

    // Check if slug already exists
    const existingProduct = await productsCollection.findOne({ slug: productData.slug });
    if (existingProduct) {
      return {
        success: false,
        error: 'A product with this name already exists'
      };
    }

    const product: ProductDB = {
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await productsCollection.insertOne(product);

    return {
      success: true,
      productId: result.insertedId.toString()
    };
  } catch (error) {
    console.error('Error creating product:', error);
    return {
      success: false,
      error: 'Failed to create product'
    };
  }
}

// Update product
export async function updateProduct(
  id: string,
  updates: Partial<Omit<ProductDB, '_id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const productsCollection = await getCollection('products');

    // If updating slug, check it's not taken
    if (updates.slug) {
      const existingProduct = await productsCollection.findOne({
        slug: updates.slug,
        _id: { $ne: new ObjectId(id) }
      });

      if (existingProduct) {
        return {
          success: false,
          error: 'A product with this name already exists'
        };
      }
    }

    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return {
        success: false,
        error: 'Product not found'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating product:', error);
    return {
      success: false,
      error: 'Failed to update product'
    };
  }
}

// Toggle product visibility (hide/unhide)
export async function toggleProductVisibility(
  id: string
): Promise<{ success: boolean; hidden?: boolean; error?: string }> {
  try {
    const productsCollection = await getCollection('products');

    const product = await productsCollection.findOne({ _id: new ObjectId(id) });
    if (!product) {
      return {
        success: false,
        error: 'Product not found'
      };
    }

    const newHiddenState = !product.hidden;

    await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          hidden: newHiddenState,
          updatedAt: new Date()
        }
      }
    );

    return {
      success: true,
      hidden: newHiddenState
    };
  } catch (error) {
    console.error('Error toggling product visibility:', error);
    return {
      success: false,
      error: 'Failed to toggle visibility'
    };
  }
}

// Delete product (permanently)
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const productsCollection = await getCollection('products');

    // First, get the product to extract image URLs
    const product = await productsCollection.findOne({ _id: new ObjectId(id) }) as ProductDB | null;

    if (!product) {
      return {
        success: false,
        error: 'Product not found'
      };
    }

    // Delete all media files from Bunny Storage
    if (product.media && product.media.length > 0) {
      const { deleteFromBunny } = await import('./bunny');

      for (const mediaItem of product.media) {
        try {
          // Extract path from CDN URL
          // Example: https://kassy.b-cdn.net/cakes/subfolder/image.jpg -> /cakes/subfolder/image.jpg
          const cdnUrl = process.env.BUNNY_CDN_URL || 'https://kassy.b-cdn.net';
          const path = '/' + mediaItem.url.replace(`${cdnUrl}/`, '');

          console.log(`🗑️  Deleting from Bunny: ${path}`);
          await deleteFromBunny(path);
        } catch (error) {
          console.error(`Failed to delete media: ${mediaItem.url}`, error);
          // Continue deleting other files even if one fails
        }
      }
    }

    // Delete the product from MongoDB
    const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return {
        success: false,
        error: 'Product not found'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return {
      success: false,
      error: 'Failed to delete product'
    };
  }
}

// Helper to generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Update media order
export async function updateMediaOrder(
  id: string,
  mediaUrls: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const productsCollection = await getCollection('products');

    const product = await productsCollection.findOne({ _id: new ObjectId(id) });
    if (!product) {
      return {
        success: false,
        error: 'Product not found'
      };
    }

    // Reorder media based on provided URL order
    const updatedMedia = mediaUrls.map((url, index) => {
      const existingMedia = (product.media as ProductMedia[]).find(m => m.url === url);
      return {
        ...existingMedia,
        url,
        order: index,
        isThumbnail: index === 0
      } as ProductMedia;
    });

    await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          media: updatedMedia,
          updatedAt: new Date()
        }
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error updating media order:', error);
    return {
      success: false,
      error: 'Failed to update media order'
    };
  }
}

// Update product display order
export async function updateProductOrder(
  products: Array<{ id: string; order: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const productsCollection = await getCollection('products');

    // Update each product's order
    const updatePromises = products.map(({ id, order }) =>
      productsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            order,
            updatedAt: new Date()
          }
        }
      )
    );

    await Promise.all(updatePromises);

    return { success: true };
  } catch (error) {
    console.error('Error updating product order:', error);
    return {
      success: false,
      error: 'Failed to update product order'
    };
  }
}
