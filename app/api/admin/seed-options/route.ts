import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { isAdminAuthenticated } from '@/lib/auth';

// Seed the database with initial add-ons, flavors, and fillings
export async function POST(req: NextRequest) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();

    // Initial Add-ons from lib/products.ts
    const initialAddons = [
      { id: "2d-character", name: "2D character painting", price: 40, image: "https://kassy.b-cdn.net/KassyCakeIcons/square/2D%20character%20painting_sqaure.webp" },
      { id: "cherries", name: "Cherries", price: 5, image: "https://kassy.b-cdn.net/KassyCakeIcons/Cherries.webp" },
      { id: "glitter-cherries", name: "Glitter Cherries", price: 8, image: "https://kassy.b-cdn.net/cakeicons/Glitter%20Cherries.webp" },
      { id: "candy-pearls", name: "Candy Pearls", price: 10, image: "https://kassy.b-cdn.net/KassyCakeIcons/Candy%20Pearls.webp" },
      { id: "white-chocolate", name: "White chocolate adornments", price: 12, image: "https://kassy.b-cdn.net/KassyCakeIcons/square/White%20chocolate%20adornments.webp" },
      { id: "fresh-florals", name: "Fresh florals", price: 15, image: "https://kassy.b-cdn.net/KassyCakeIcons/Fresh%20florals.webp" },
      { id: "frosting-animals", name: "Frosting animals", price: 18, image: "https://kassy.b-cdn.net/KassyCakeIcons/square/Frosting%20animals.webp" },
      { id: "edible-image", name: "Edible printed image", price: 20, image: "" },
      { id: "edible-butterflies", name: "Edible butterflies", price: 8, image: "https://kassy.b-cdn.net/menuicons/addons-icons/editble%20butterflys.jpg" },
      { id: "bows", name: "Bows", price: 6, image: "https://kassy.b-cdn.net/menuicons/addons-icons/bows.png" },
      { id: "gold", name: "Gold Chrome", price: 12, image: "https://kassy.b-cdn.net/KassyCakeIcons/square/Gold%20Chrome.webp" },
      { id: "chrome", name: "Silver Chrome", price: 12, image: "https://kassy.b-cdn.net/KassyCakeIcons/square/Silver%20Chrome_square.webp" },
      { id: "disco-balls", name: "Disco Balls", price: 10, image: "https://kassy.b-cdn.net/KassyCakeIcons/discoballs.webp" },
      { id: "cowboy-hat", name: "Miniature cowboy hat", price: 10, image: "https://kassy.b-cdn.net/KassyCakeIcons/square/cowboyhats_sqaure.webp" }
    ];

    // Initial Flavors from the product page
    const initialFlavors = [
      { id: "vanilla", name: "vanilla", image: "https://kassy.b-cdn.net/menuicons/Flavors/vanillaflavor.jpg" },
      { id: "chocolate", name: "chocolate", image: "https://kassy.b-cdn.net/menuicons/Flavors/chocolate_flavor.jpg" },
      { id: "red-velvet", name: "red velvet", image: "" },
      { id: "lemon", name: "lemon", image: "https://kassy.b-cdn.net/menuicons/Flavors/lemonflavor.jpg" },
      { id: "pumpkin", name: "pumpkin", image: "https://kassy.b-cdn.net/menuicons/Flavors/pumpkin%20flavor.jpg" },
      { id: "strawberry", name: "strawberry", image: "" },
      { id: "funfetti", name: "funfetti", image: "https://kassy.b-cdn.net/menuicons/Flavors/funfettiflavor.jpg" }
    ];

    // Initial Fillings from the product page
    const initialFillings = [
      { id: "vanilla", name: "vanilla", image: "https://kassy.b-cdn.net/KassyCakeIcons/vanilla.webp" },
      { id: "strawberry-compote", name: "strawberry compote", image: "https://kassy.b-cdn.net/menuicons/strawberry%20compote.jpg" },
      { id: "mixed-berry-compote", name: "mixed berry compote", image: "https://kassy.b-cdn.net/menuicons/mixed%20berry%20compote.webp" },
      { id: "fresh-whip-cream", name: "fresh whip cream", image: "https://kassy.b-cdn.net/menuicons/fresh%20whip%20cream.jpg" },
      { id: "vanilla-custard", name: "vanilla custard", image: "https://kassy.b-cdn.net/menuicons/vanilla%20custard.webp" },
      { id: "cream-cheese-frosting", name: "cream cheese frosting", image: "https://kassy.b-cdn.net/menuicons/cream%20cheese%20frosting.webp" },
      { id: "classic-vanilla-frosting", name: "classic vanilla frosting", image: "https://kassy.b-cdn.net/menuicons/classic%20vanilla%20frosting.jpg" },
      { id: "classic-chocolate-frosting", name: "classic chocolate frosting", image: "https://kassy.b-cdn.net/menuicons/classic%20chocolate%20frosting.jpg" }
    ];

    // Insert add-ons
    const addonsCollection = await getCollection('addons');
    const existingAddons = await addonsCollection.countDocuments();
    if (existingAddons === 0) {
      await addonsCollection.insertMany(
        initialAddons.map((addon, index) => ({
          ...addon,
          hidden: false,
          order: index,
          createdAt: now,
          updatedAt: now
        }))
      );
    }

    // Insert flavors
    const flavorsCollection = await getCollection('flavors');
    const existingFlavors = await flavorsCollection.countDocuments();
    if (existingFlavors === 0) {
      await flavorsCollection.insertMany(
        initialFlavors.map((flavor, index) => ({
          ...flavor,
          hidden: false,
          order: index,
          createdAt: now,
          updatedAt: now
        }))
      );
    }

    // Insert fillings
    const fillingsCollection = await getCollection('fillings');
    const existingFillings = await fillingsCollection.countDocuments();
    if (existingFillings === 0) {
      await fillingsCollection.insertMany(
        initialFillings.map((filling, index) => ({
          ...filling,
          hidden: false,
          order: index,
          createdAt: now,
          updatedAt: now
        }))
      );
    }

    return NextResponse.json({
      success: true,
      seeded: {
        addons: existingAddons === 0 ? initialAddons.length : 0,
        flavors: existingFlavors === 0 ? initialFlavors.length : 0,
        fillings: existingFillings === 0 ? initialFillings.length : 0
      }
    });

  } catch (error) {
    console.error('Error seeding options:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
