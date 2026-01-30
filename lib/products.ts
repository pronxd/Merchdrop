export interface Product {
  id: number;
  name: string;
  duration: string;
  price: number;
  category: 'lunchbox' | 'mini' | 'circle' | 'heart' | 'chrome' | 'cupcakes' | 'bento' | 'tier' | 'specialty';
  description?: string;
  image?: string;
  realImage?: string;
  realImages?: string[]; // Gallery of multiple photos
  realVideo?: string;
  buyNowOnly?: boolean;
  shape?: 'circle' | 'heart';
  tagline?: string; // Short tagline for website display
  detailed_description?: string; // Detailed description for AI chatbot
  searchable_tags?: {
    occasion?: string[];
    colors?: string[];
    theme?: string[];
    style?: string[];
    elements?: string[];
  };
}

export const products: Product[] = [
  {
    id: 1,
    name: "4\" Circle Cake",
    duration: "15m",
    price: 50.00,
    category: 'mini',
    image: "https://kassycakes.b-cdn.net/assets/cakeicons/4minicake.jpg",
    realImage: "https://kassycakes.b-cdn.net/circle.webp",
    buyNowOnly: true,
    shape: 'circle',
  tagline: "Adorable two-tier cake with strawberry topping",
  detailed_description: "This is a two-tier cake suitable for birthdays or children's parties. The cake features a round shape with a small top tier and a slightly larger bottom tier. The primary color is a light beige for the cake layers, with white frosting applied in a whimsical, playful style. The frosting is piped in a cloud-like pattern around the top and middle, creating a fluffy appearance. The top tier is adorned with fresh, vibrant red strawberries, adding a pop of color and freshness. The cake has a unique feature where the bottom tier has a face design with small white frosting arms and legs, giving it a cute, character-like appearance. There are no special techniques like drip or ombre, but the simplicity and charm lie in its playful design. The overall style is whimsical and fun, perfect for a child's celebration or a themed party.",
  searchable_tags: {
    occasion: ["birthday", "children's party"],
    colors: ["light beige", "white", "red"],
    theme: ["cute", "character"],
    style: ["whimsical", "playful", "tiered"],
    elements: ["strawberries", "frosting face", "frosting arms and legs"]
  }
  },
  {
    id: 2,
    name: "6\" Heart Cake",
    duration: "60m",
    price: 140.00,
    category: 'heart',
    realImage: "https://kassy.b-cdn.net/menuicons/heart/vanilla_heart.webp",
    shape: 'heart',
  tagline: "Romantic heart-shaped cherry cake",
  detailed_description: "This is a single-tier cake suitable for romantic occasions like anniversaries, Valentine's Day, or engagements. The cake is heart-shaped, approximately 8 inches in diameter. The primary color is a vibrant magenta pink, with accents of deep red from the cherries and white from the pearl bead decorations. The theme is romantic and whimsical, with no specific character but evoking a classic love theme. Decorative elements include seven red cherries placed around the top edge, pearl beads forming a heart outline on the top, and a delicate white pearl bead border around the base of the cake. The frosting is a textured buttercream with intricate swirls and ruffles, giving it a vintage, elegant look. The cake features the text 'happy love you' written in white on the top center. The overall style is elaborate and romantic, with the standout feature being the combination of the heart shape, cherry decorations, and detailed frosting work.",
  searchable_tags: {
    occasion: ["anniversary", "Valentine's Day", "engagement"],
    colors: ["pink"],
    theme: ["romantic", "love", "vintage"],
    style: ["heart-shaped", "buttercream", "single-tier"],
    elements: ["cherries", "pearl beads", "text", "swirls", "ruffles"]
  }
  },
  {
    id: 3,
    name: "8\" Heart Cake",
    duration: "60m",
    price: 170.00,
    category: 'heart',
    realImage: "https://kassy.b-cdn.net/menuicons/heart/vanilla_heart.webp",
    shape: 'heart'
  },
  {
    id: 4,
    name: "6\" Circle Cake",
    duration: "60m",
    price: 140.00,
    category: 'circle',
    image: "https://kassycakes.b-cdn.net/assets/cakeicons/6%20Circle%20Cake.jpg",
    realImage: "https://kassycakes.b-cdn.net/circle.webp",
    buyNowOnly: true,
    shape: 'circle',
  tagline: "Adorable two-tier cake with strawberry topping",
  detailed_description: "This is a charming two-tier cake suitable for birthdays or children's parties. The cake features two round layers of light vanilla sponge. The top tier is smaller and adorned with a generous swirl of white whipped cream frosting, creating a fluffy, cloud-like appearance. Four vibrant red strawberries are placed on top, adding a fresh and natural touch. The bottom tier is slightly larger and also covered with white whipped cream, with a playful smiley face drawn on the frosting in brown. The cake sits on a white, round cake board with a subtle striped texture. The overall style is whimsical and cute, perfect for a fun, light-hearted celebration. The standout feature is the playful face on the lower tier, giving the cake a personality.",
  searchable_tags: {
    occasion: ["birthday", "children's party"],
    colors: ["white", "red", "brown"],
    theme: ["cute", "playful", "fruit"],
    style: ["whimsical", "tiered", "whipped cream"],
    elements: ["strawberries", "smiley face", "whipped cream"]
  }
  },
  {
    id: 5,
    name: "8\" Circle Cake",
    duration: "60m",
    price: 170.00,
    category: 'circle',
    image: "https://kassycakes.b-cdn.net/assets/cakeicons/cute_strawberry_character_cake.jpg",
    realImage: "https://kassycakes.b-cdn.net/circle.webp",
    buyNowOnly: true,
    shape: 'circle',
  tagline: "Adorable two-tier cake with strawberry topping",
  detailed_description: "This is a charming two-tier cake suitable for birthdays or children's parties. The cake features two round layers of light vanilla sponge. The top tier is smaller and adorned with a generous swirl of white whipped cream frosting, creating a fluffy, cloud-like appearance. Four vibrant red strawberries are placed on top, adding a fresh and natural touch. The bottom tier is slightly larger and also covered with white whipped cream, with a playful smiley face drawn on the frosting in brown. The cake sits on a white, round cake board with a subtle striped texture. The overall style is whimsical and cute, perfect for a fun, light-hearted celebration. The standout feature is the playful face on the lower tier, giving the cake a personality.",
  searchable_tags: {
    occasion: ["birthday", "children's party"],
    colors: ["white", "red"],
    theme: ["cute", "playful", "fruit"],
    style: ["whimsical", "tiered", "whipped cream"],
    elements: ["strawberries", "smiley face", "whipped cream"]
  }
  },
  {
    id: 6,
    name: "6\" Smashing Pumpkins",
    duration: "60m",
    price: 150.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Photos/IMG_8449.webp",
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 7,
    name: "8\" Smashing Pumpkins",
    duration: "60m",
    price: 180.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Photos/IMG_8449.webp",
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 8,
    name: "6\" Witches Don't Age",
    duration: "60m",
    price: 150.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/displayIMG_0019.webp",
    realImages: ["https://kassy.b-cdn.net/Cakes/IMG_0022.webp"],
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 9,
    name: "8\" Witches Don't Age",
    duration: "60m",
    price: 180.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/displayIMG_0019.webp",
    realImages: ["https://kassy.b-cdn.net/Cakes/IMG_0022.webp"],
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 10,
    name: "6\" The Lizzie Mcguire",
    duration: "60m",
    price: 150.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/1C2A15CA-6FE1-4F8F-910E-E025BD963BB4.webp",
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 11,
    name: "8\" The Lizzie Mcguire",
    duration: "60m",
    price: 180.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/1C2A15CA-6FE1-4F8F-910E-E025BD963BB4.webp",
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 12,
    name: "6\" 90s Celestial",
    duration: "60m",
    price: 150.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/DisplayIMG_7380.webp",
    realImages: ["https://kassy.b-cdn.net/Cakes/IMG_7962.webp"],
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 13,
    name: "8\" 90s Celestial",
    duration: "60m",
    price: 180.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/DisplayIMG_7380.webp",
    realImages: ["https://kassy.b-cdn.net/Cakes/IMG_7962.webp"],
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 14,
    name: "6\" Spongebob Bubbles",
    duration: "60m",
    price: 150.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/displayIMG_8214.webp",
    realImages: ["https://kassy.b-cdn.net/Cakes/IMG_8215.webp"],
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 15,
    name: "8\" Spongebob Bubbles",
    duration: "60m",
    price: 180.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/displayIMG_8214.webp",
    realImages: ["https://kassy.b-cdn.net/Cakes/IMG_8215.webp"],
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 16,
    name: "6\" Forest Friends",
    duration: "60m",
    price: 150.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/IMG_4059.webp",
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 17,
    name: "8\" Forest Friends",
    duration: "60m",
    price: 180.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/IMG_4059.webp",
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 18,
    name: "6\" Vintage Cherry",
    duration: "60m",
    price: 150.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/IMG_2775.webp",
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 19,
    name: "8\" Vintage Cherry",
    duration: "60m",
    price: 180.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/IMG_2775.webp",
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 20,
    name: "6\" Cowgirl Princess",
    duration: "60m",
    price: 150.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/574634068_1042810344566896_6462995457740500017_n.jpg",
    buyNowOnly: true,
    shape: 'circle',
  },
  {
    id: 21,
    name: "8\" Cowgirl Princess",
    duration: "60m",
    price: 180.00,
    category: 'specialty',
    realImage: "https://kassy.b-cdn.net/Cakes/574634068_1042810344566896_6462995457740500017_n.jpg",
    buyNowOnly: true,
    shape: 'circle',
  }
];

export interface AddOn {
  id: string;
  name: string;
  price: number;
  image?: string; // Optional image URL for database-driven add-ons
}

export const addOns: AddOn[] = [
  { id: "2d-character", name: "2D character painting", price: 40 },
  { id: "cherries", name: "Cherries", price: 5 },
  { id: "glitter-cherries", name: "Glitter Cherries", price: 8 },
  { id: "candy-pearls", name: "Candy Pearls", price: 10 },
  { id: "white-chocolate", name: "White chocolate adornments", price: 12 },
  { id: "fresh-florals", name: "Fresh florals", price: 15 },
  { id: "frosting-animals", name: "Frosting animals", price: 18 },
  { id: "edible-image", name: "Add Edible Image", price: 20 },
  { id: "edible-butterflies", name: "Edible butterflies", price: 8 },
  { id: "bows", name: "Bows", price: 6 },
  { id: "gold", name: "Gold Chrome", price: 12 },
  { id: "chrome", name: "Silver Chrome", price: 12 },
  { id: "disco-balls", name: "Disco Balls", price: 10 },
  { id: "cowboy-hat", name: "Miniature cowboy hat", price: 10 }
];

export const importantNote = "Add-ons consist of: Cherries, Glitter Cherries, Candy Pearls, White chocolate adornments, Fresh florals, Frosting animals, Edible printed image, Edible butterflies, Bows, Gold Chrome, Silver Chrome, 2D character painting, Disco Balls, and Miniature cowboy hat. Please note strictly NO REFUNDS will be provided.";

export function getProductById(id: number): Product | undefined {
  return products.find(p => p.id === id);
}
