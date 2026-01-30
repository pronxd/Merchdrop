import { getCollection } from './mongodb';
import { ObjectId } from 'mongodb';

// Add-On interface
export interface AddOnDB {
  _id?: ObjectId;
  id: string; // URL-friendly slug (e.g., "cherries", "gold-chrome")
  name: string;
  price: number;
  image?: string;
  hidden: boolean;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Flavor interface
export interface FlavorDB {
  _id?: ObjectId;
  id: string;
  name: string;
  image?: string;
  hidden: boolean;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Filling interface
export interface FillingDB {
  _id?: ObjectId;
  id: string;
  name: string;
  image?: string;
  hidden: boolean;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ==================== ADD-ONS ====================

export async function getAddOns(includeHidden = false): Promise<AddOnDB[]> {
  try {
    const collection = await getCollection('addons');
    // Match items where hidden is false OR hidden doesn't exist (for backwards compatibility)
    const query = includeHidden ? {} : { $or: [{ hidden: false }, { hidden: { $exists: false } }] };
    const addons = await collection.find(query).toArray();

    return (addons as AddOnDB[]).sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (error) {
    console.error('Error fetching add-ons:', error);
    return [];
  }
}

export async function getAddOnById(id: string): Promise<AddOnDB | null> {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
    const collection = await getCollection('addons');
    return await collection.findOne({ _id: new ObjectId(id) }) as AddOnDB | null;
  } catch (error) {
    console.error('Error fetching add-on:', error);
    return null;
  }
}

export async function createAddOn(
  data: Omit<AddOnDB, '_id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const collection = await getCollection('addons');

    const existing = await collection.findOne({ id: data.id });
    if (existing) {
      return { success: false, error: 'An add-on with this name already exists' };
    }

    const addon: AddOnDB = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(addon);
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error('Error creating add-on:', error);
    return { success: false, error: 'Failed to create add-on' };
  }
}

export async function updateAddOn(
  id: string,
  updates: Partial<Omit<AddOnDB, '_id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('addons');

    if (updates.id) {
      const existing = await collection.findOne({
        id: updates.id,
        _id: { $ne: new ObjectId(id) }
      });
      if (existing) {
        return { success: false, error: 'An add-on with this name already exists' };
      }
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: 'Add-on not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating add-on:', error);
    return { success: false, error: 'Failed to update add-on' };
  }
}

export async function toggleAddOnVisibility(id: string): Promise<{ success: boolean; hidden?: boolean; error?: string }> {
  try {
    const collection = await getCollection('addons');
    const addon = await collection.findOne({ _id: new ObjectId(id) });

    if (!addon) {
      return { success: false, error: 'Add-on not found' };
    }

    // Handle case where hidden might be undefined (treat as false)
    const currentHidden = addon.hidden === true;
    const newHiddenState = !currentHidden;
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { hidden: newHiddenState, updatedAt: new Date() } }
    );

    return { success: true, hidden: newHiddenState };
  } catch (error) {
    console.error('Error toggling add-on visibility:', error);
    return { success: false, error: 'Failed to toggle visibility' };
  }
}

export async function deleteAddOn(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('addons');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Add-on not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting add-on:', error);
    return { success: false, error: 'Failed to delete add-on' };
  }
}

export async function updateAddOnOrder(
  items: Array<{ id: string; order: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('addons');

    const updatePromises = items.map(({ id, order }) =>
      collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { order, updatedAt: new Date() } }
      )
    );

    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    console.error('Error updating add-on order:', error);
    return { success: false, error: 'Failed to update order' };
  }
}

// ==================== FLAVORS ====================

export async function getFlavors(includeHidden = false): Promise<FlavorDB[]> {
  try {
    const collection = await getCollection('flavors');
    // Match items where hidden is false OR hidden doesn't exist (for backwards compatibility)
    const query = includeHidden ? {} : { $or: [{ hidden: false }, { hidden: { $exists: false } }] };
    const flavors = await collection.find(query).toArray();

    return (flavors as FlavorDB[]).sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (error) {
    console.error('Error fetching flavors:', error);
    return [];
  }
}

export async function getFlavorById(id: string): Promise<FlavorDB | null> {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
    const collection = await getCollection('flavors');
    return await collection.findOne({ _id: new ObjectId(id) }) as FlavorDB | null;
  } catch (error) {
    console.error('Error fetching flavor:', error);
    return null;
  }
}

export async function createFlavor(
  data: Omit<FlavorDB, '_id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const collection = await getCollection('flavors');

    const existing = await collection.findOne({ id: data.id });
    if (existing) {
      return { success: false, error: 'A flavor with this name already exists' };
    }

    const flavor: FlavorDB = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(flavor);
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error('Error creating flavor:', error);
    return { success: false, error: 'Failed to create flavor' };
  }
}

export async function updateFlavor(
  id: string,
  updates: Partial<Omit<FlavorDB, '_id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('flavors');

    if (updates.id) {
      const existing = await collection.findOne({
        id: updates.id,
        _id: { $ne: new ObjectId(id) }
      });
      if (existing) {
        return { success: false, error: 'A flavor with this name already exists' };
      }
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: 'Flavor not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating flavor:', error);
    return { success: false, error: 'Failed to update flavor' };
  }
}

export async function toggleFlavorVisibility(id: string): Promise<{ success: boolean; hidden?: boolean; error?: string }> {
  try {
    const collection = await getCollection('flavors');
    const flavor = await collection.findOne({ _id: new ObjectId(id) });

    if (!flavor) {
      return { success: false, error: 'Flavor not found' };
    }

    // Handle case where hidden might be undefined (treat as false)
    const currentHidden = flavor.hidden === true;
    const newHiddenState = !currentHidden;
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { hidden: newHiddenState, updatedAt: new Date() } }
    );

    return { success: true, hidden: newHiddenState };
  } catch (error) {
    console.error('Error toggling flavor visibility:', error);
    return { success: false, error: 'Failed to toggle visibility' };
  }
}

export async function deleteFlavor(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('flavors');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Flavor not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting flavor:', error);
    return { success: false, error: 'Failed to delete flavor' };
  }
}

export async function updateFlavorOrder(
  items: Array<{ id: string; order: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('flavors');

    const updatePromises = items.map(({ id, order }) =>
      collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { order, updatedAt: new Date() } }
      )
    );

    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    console.error('Error updating flavor order:', error);
    return { success: false, error: 'Failed to update order' };
  }
}

// ==================== FILLINGS ====================

export async function getFillings(includeHidden = false): Promise<FillingDB[]> {
  try {
    const collection = await getCollection('fillings');
    // Match items where hidden is false OR hidden doesn't exist (for backwards compatibility)
    const query = includeHidden ? {} : { $or: [{ hidden: false }, { hidden: { $exists: false } }] };
    const fillings = await collection.find(query).toArray();

    return (fillings as FillingDB[]).sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (error) {
    console.error('Error fetching fillings:', error);
    return [];
  }
}

export async function getFillingById(id: string): Promise<FillingDB | null> {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
    const collection = await getCollection('fillings');
    return await collection.findOne({ _id: new ObjectId(id) }) as FillingDB | null;
  } catch (error) {
    console.error('Error fetching filling:', error);
    return null;
  }
}

export async function createFilling(
  data: Omit<FillingDB, '_id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const collection = await getCollection('fillings');

    const existing = await collection.findOne({ id: data.id });
    if (existing) {
      return { success: false, error: 'A filling with this name already exists' };
    }

    const filling: FillingDB = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(filling);
    return { success: true, id: result.insertedId.toString() };
  } catch (error) {
    console.error('Error creating filling:', error);
    return { success: false, error: 'Failed to create filling' };
  }
}

export async function updateFilling(
  id: string,
  updates: Partial<Omit<FillingDB, '_id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('fillings');

    if (updates.id) {
      const existing = await collection.findOne({
        id: updates.id,
        _id: { $ne: new ObjectId(id) }
      });
      if (existing) {
        return { success: false, error: 'A filling with this name already exists' };
      }
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return { success: false, error: 'Filling not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating filling:', error);
    return { success: false, error: 'Failed to update filling' };
  }
}

export async function toggleFillingVisibility(id: string): Promise<{ success: boolean; hidden?: boolean; error?: string }> {
  try {
    const collection = await getCollection('fillings');
    const filling = await collection.findOne({ _id: new ObjectId(id) });

    if (!filling) {
      return { success: false, error: 'Filling not found' };
    }

    // Handle case where hidden might be undefined (treat as false)
    const currentHidden = filling.hidden === true;
    const newHiddenState = !currentHidden;
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { hidden: newHiddenState, updatedAt: new Date() } }
    );

    return { success: true, hidden: newHiddenState };
  } catch (error) {
    console.error('Error toggling filling visibility:', error);
    return { success: false, error: 'Failed to toggle visibility' };
  }
}

export async function deleteFilling(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('fillings');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Filling not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting filling:', error);
    return { success: false, error: 'Failed to delete filling' };
  }
}

export async function updateFillingOrder(
  items: Array<{ id: string; order: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = await getCollection('fillings');

    const updatePromises = items.map(({ id, order }) =>
      collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { order, updatedAt: new Date() } }
      )
    );

    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    console.error('Error updating filling order:', error);
    return { success: false, error: 'Failed to update order' };
  }
}
