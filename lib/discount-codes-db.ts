import { getCollection } from './mongodb';
import { ObjectId } from 'mongodb';

// Discount Code interface
export interface DiscountCodeDB {
  _id?: ObjectId;
  code: string; // Case-sensitive code (e.g., "kassy26", "SPRING2024")
  percentage: number; // Discount percentage (e.g., 10, 15, 25)
  active: boolean; // Whether this code is currently usable
  usageCount: number; // How many times this code has been used
  maxUses?: number; // Optional limit on total uses (undefined = unlimited)
  expiresAt?: Date; // Optional expiration date
  createdAt: Date;
  updatedAt: Date;
}

// Popup settings interface - stored separately
export interface PromoPopupSettingsDB {
  _id?: ObjectId;
  enabled: boolean; // Whether popup is shown to visitors
  discountCodeId?: string; // Which discount code to show in popup (ObjectId as string)
  customMessage?: string; // Optional custom message
  updatedAt: Date;
}

// ==================== DISCOUNT CODES ====================

export async function getDiscountCodes(includeInactive = false): Promise<DiscountCodeDB[]> {
  try {
    const collection = await getCollection('discountCodes');
    const query = includeInactive ? {} : { active: true };
    const codes = await collection.find(query).sort({ createdAt: -1 }).toArray();
    return codes as DiscountCodeDB[];
  } catch (error) {
    console.error('Error fetching discount codes:', error);
    return [];
  }
}

export async function getDiscountCodeById(id: string): Promise<DiscountCodeDB | null> {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
    const collection = await getCollection('discountCodes');
    return await collection.findOne({ _id: new ObjectId(id) }) as DiscountCodeDB | null;
  } catch (error) {
    console.error('Error fetching discount code:', error);
    return null;
  }
}

// Validate a discount code (case-sensitive) and return it if valid
export async function validateDiscountCode(code: string): Promise<{
  valid: boolean;
  discountCode?: DiscountCodeDB;
  error?: string;
}> {
  try {
    const collection = await getCollection('discountCodes');
    // Case-sensitive search
    const discountCode = await collection.findOne({ code: code }) as DiscountCodeDB | null;

    if (!discountCode) {
      return { valid: false, error: 'Invalid discount code' };
    }

    if (!discountCode.active) {
      return { valid: false, error: 'This discount code is no longer active' };
    }

    // Check expiration
    if (discountCode.expiresAt && new Date(discountCode.expiresAt) < new Date()) {
      return { valid: false, error: 'This discount code has expired' };
    }

    // Check max uses (only if maxUses is set and greater than 0)
    if (discountCode.maxUses && discountCode.maxUses > 0 && discountCode.usageCount >= discountCode.maxUses) {
      return { valid: false, error: 'This discount code has reached its usage limit' };
    }

    return { valid: true, discountCode };
  } catch (error) {
    console.error('Error validating discount code:', error);
    return { valid: false, error: 'Failed to validate discount code' };
  }
}

export async function createDiscountCode(
  data: Omit<DiscountCodeDB, '_id' | 'usageCount' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const collection = await getCollection('discountCodes');

    // Check for existing code (case-sensitive)
    const existing = await collection.findOne({ code: data.code });
    if (existing) {
      return { success: false, error: 'A discount code with this name already exists' };
    }

    const discountCode: DiscountCodeDB = {
      ...data,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(discountCode);
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error('Error creating discount code:', error);
    return { success: false, error: 'Failed to create discount code' };
  }
}

export async function updateDiscountCode(
  id: string,
  updates: Partial<Omit<DiscountCodeDB, '_id' | 'createdAt' | 'usageCount'>>,
  fieldsToUnset: string[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('discountCodes');

    // If updating the code, check it doesn't already exist
    if (updates.code) {
      const existing = await collection.findOne({
        code: updates.code,
        _id: { $ne: new ObjectId(id) }
      });
      if (existing) {
        return { success: false, error: 'A discount code with this name already exists' };
      }
    }

    // Build update operation
    const updateOp: any = {
      $set: { ...updates, updatedAt: new Date() }
    };

    // Add $unset for fields that should be removed
    if (fieldsToUnset.length > 0) {
      updateOp.$unset = {};
      for (const field of fieldsToUnset) {
        updateOp.$unset[field] = '';
      }
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      updateOp
    );

    if (result.matchedCount === 0) {
      return { success: false, error: 'Discount code not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating discount code:', error);
    return { success: false, error: 'Failed to update discount code' };
  }
}

export async function toggleDiscountCodeActive(id: string): Promise<{
  success: boolean;
  active?: boolean;
  error?: string
}> {
  try {
    const collection = await getCollection('discountCodes');
    const code = await collection.findOne({ _id: new ObjectId(id) });

    if (!code) {
      return { success: false, error: 'Discount code not found' };
    }

    const newActiveState = !code.active;
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { active: newActiveState, updatedAt: new Date() } }
    );

    return { success: true, active: newActiveState };
  } catch (error) {
    console.error('Error toggling discount code active state:', error);
    return { success: false, error: 'Failed to toggle active state' };
  }
}

export async function incrementDiscountCodeUsage(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('discountCodes');
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: { usageCount: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: 'Discount code not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error incrementing discount code usage:', error);
    return { success: false, error: 'Failed to increment usage' };
  }
}

export async function deleteDiscountCode(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('discountCodes');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Discount code not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting discount code:', error);
    return { success: false, error: 'Failed to delete discount code' };
  }
}

// ==================== PROMO POPUP SETTINGS ====================

export async function getPromoPopupSettings(): Promise<PromoPopupSettingsDB | null> {
  try {
    const collection = await getCollection('promoPopupSettings');
    const settings = await collection.findOne({});
    return settings as PromoPopupSettingsDB | null;
  } catch (error) {
    console.error('Error fetching promo popup settings:', error);
    return null;
  }
}

export async function updatePromoPopupSettings(
  updates: Partial<Omit<PromoPopupSettingsDB, '_id' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('promoPopupSettings');

    // Upsert - create if doesn't exist
    await collection.updateOne(
      {},
      {
        $set: { ...updates, updatedAt: new Date() }
      },
      { upsert: true }
    );

    return { success: true };
  } catch (error) {
    console.error('Error updating promo popup settings:', error);
    return { success: false, error: 'Failed to update popup settings' };
  }
}

// Get the active popup discount code (for frontend)
export async function getActivePopupPromo(): Promise<{
  enabled: boolean;
  code?: string;
  percentage?: number;
  customMessage?: string;
} | null> {
  try {
    const settings = await getPromoPopupSettings();

    if (!settings || !settings.enabled) {
      return { enabled: false };
    }

    if (!settings.discountCodeId) {
      return { enabled: false };
    }

    const discountCode = await getDiscountCodeById(settings.discountCodeId);

    if (!discountCode || !discountCode.active) {
      return { enabled: false };
    }

    // Check if code is still valid
    if (discountCode.expiresAt && new Date(discountCode.expiresAt) < new Date()) {
      return { enabled: false };
    }

    if (discountCode.maxUses && discountCode.maxUses > 0 && discountCode.usageCount >= discountCode.maxUses) {
      return { enabled: false };
    }

    return {
      enabled: true,
      code: discountCode.code,
      percentage: discountCode.percentage,
      customMessage: settings.customMessage
    };
  } catch (error) {
    console.error('Error getting active popup promo:', error);
    return null;
  }
}
