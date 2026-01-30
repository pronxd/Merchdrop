import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/lib/products';
import { getProducts, ProductDB } from '@/lib/products-db';
import { checkDateAvailability, getBookings, getBlockedDates } from '@/lib/bookings';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

// Enhanced rate limiting with session tracking
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const dailyLimitMap = new Map<string, { count: number; resetTime: number }>();
const sessionLimitMap = new Map<string, number>();

const RATE_LIMIT = 10; // Max requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const DAILY_LIMIT = 100; // Max requests per day per IP
const DAILY_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_MESSAGE_LIMIT = 50; // Max messages per session
const MAX_MESSAGE_LENGTH = 500; // Max characters per message

// Spam detection - track recent messages per session
const recentMessagesMap = new Map<string, { messages: string[]; lastMessageTime: number }>();
const MIN_MESSAGE_INTERVAL = 1000; // Minimum 1 second between messages

// Cost tracking
let dailyCost = 0;
let dailyCostResetTime = Date.now() + DAILY_LIMIT_WINDOW;
const DAILY_COST_ALERT_THRESHOLD = 10; // Alert if daily cost exceeds $10

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

function checkDailyLimit(identifier: string): boolean {
  const now = Date.now();
  const userDaily = dailyLimitMap.get(identifier);

  if (!userDaily || now > userDaily.resetTime) {
    dailyLimitMap.set(identifier, {
      count: 1,
      resetTime: now + DAILY_LIMIT_WINDOW
    });
    return true;
  }

  if (userDaily.count >= DAILY_LIMIT) {
    return false;
  }

  userDaily.count++;
  return true;
}

function checkSessionLimit(sessionId: string): boolean {
  const count = sessionLimitMap.get(sessionId) || 0;

  if (count >= SESSION_MESSAGE_LIMIT) {
    return false;
  }

  sessionLimitMap.set(sessionId, count + 1);
  return true;
}

// Spam detection functions
function isSpamMessage(message: string): { isSpam: boolean; reason?: string } {
  const content = message.trim().toLowerCase();

  // Check for empty or too short messages
  if (content.length < 2) {
    return { isSpam: true, reason: 'Please type a message before sending.' };
  }

  // Check for repeated characters (e.g., "aaaaaaa" or "!!!!!!")
  const repeatedCharPattern = /(.)\1{7,}/;
  if (repeatedCharPattern.test(content)) {
    return { isSpam: true, reason: 'Hmm, that doesn\'t look like a real message. How can I help you with your cake order?' };
  }

  // Check for repeated words (e.g., "cake cake cake cake cake")
  const words = content.split(/\s+/);
  if (words.length >= 5) {
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
    for (const [word, count] of wordCounts) {
      if (word.length > 1 && count >= 5 && count / words.length > 0.6) {
        return { isSpam: true, reason: 'Hmm, that doesn\'t look like a real message. How can I help you with your cake order?' };
      }
    }
  }

  // Check for gibberish - low vowel ratio in the message
  // Real English has ~38% vowels, gibberish keyboard mashing has very few
  const lettersOnly = content.replace(/[^a-z]/gi, '');
  if (lettersOnly.length >= 3) {
    const vowelCount = (lettersOnly.match(/[aeiou]/gi) || []).length;
    const vowelRatio = vowelCount / lettersOnly.length;

    // For short messages (3-5 chars), require at least 1 vowel
    // Valid short words: "hi", "ok", "yes", "no", "cake", "help"
    // Gibberish: "dsg", "fgh", "bdfg", "sdgsg"
    if (lettersOnly.length <= 5 && vowelCount === 0) {
      return { isSpam: true, reason: 'Hmm, that doesn\'t look like a real message. How can I help you with your cake order?' };
    }

    // For longer messages, if less than 15% vowels, likely gibberish
    if (lettersOnly.length > 5 && vowelRatio < 0.15) {
      return { isSpam: true, reason: 'Hmm, that doesn\'t look like a real message. How can I help you with your cake order?' };
    }
  }

  // Check for keyboard mashing patterns (sequential keys)
  const keyboardPatterns = [
    /asdf/i, /fdsa/i, /qwer/i, /rewq/i, /zxcv/i, /vcxz/i,
    /jkl/i, /lkj/i, /ghjk/i, /kjhg/i, /sdfg/i, /gfds/i,
    /dfgh/i, /hgfd/i, /cvbn/i, /nbvc/i, /bnm/i, /mnb/i
  ];
  for (const pattern of keyboardPatterns) {
    if (pattern.test(content) && lettersOnly.length < 15) {
      // Only flag short messages with keyboard patterns
      const vowelCount = (lettersOnly.match(/[aeiou]/gi) || []).length;
      if (vowelCount / lettersOnly.length < 0.25) {
        return { isSpam: true, reason: 'Hmm, that doesn\'t look like a real message. How can I help you with your cake order?' };
      }
    }
  }

  return { isSpam: false };
}

function checkMessageSpam(sessionId: string, message: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const sessionData = recentMessagesMap.get(sessionId);

  // Check minimum interval between messages
  if (sessionData && now - sessionData.lastMessageTime < MIN_MESSAGE_INTERVAL) {
    return { allowed: false, reason: 'Please wait a moment before sending another message.' };
  }

  // Check for duplicate messages
  if (sessionData) {
    const recentDuplicates = sessionData.messages.filter(m => m === message.trim().toLowerCase()).length;
    if (recentDuplicates >= 2) {
      return { allowed: false, reason: 'Please avoid sending duplicate messages.' };
    }
  }

  // Update session data
  const messages = sessionData?.messages || [];
  messages.push(message.trim().toLowerCase());
  // Keep only last 10 messages for comparison
  if (messages.length > 10) {
    messages.shift();
  }
  recentMessagesMap.set(sessionId, { messages, lastMessageTime: now });

  return { allowed: true };
}

function trackCost(usage: any) {
  const now = Date.now();

  // Reset daily cost if needed
  if (now > dailyCostResetTime) {
    dailyCost = 0;
    dailyCostResetTime = now + DAILY_LIMIT_WINDOW;
  }

  // Calculate cost (input: $0.20/1M, cached: $0.05/1M, output: $0.50/1M)
  const inputTokens = usage.prompt_tokens || 0;
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;

  const uncachedInput = inputTokens - cachedTokens;
  const cost = (uncachedInput * 0.20 / 1000000) + (cachedTokens * 0.05 / 1000000) + (outputTokens * 0.50 / 1000000);

  dailyCost += cost;

  // Alert if threshold exceeded
  if (dailyCost > DAILY_COST_ALERT_THRESHOLD) {
    console.warn(`⚠️ COST ALERT: Daily cost exceeded $${DAILY_COST_ALERT_THRESHOLD}. Current: $${dailyCost.toFixed(2)}`);
  }

  return cost;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitMap.entries()).forEach(([key, value]) => {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  });
  Array.from(dailyLimitMap.entries()).forEach(([key, value]) => {
    if (now > value.resetTime) {
      dailyLimitMap.delete(key);
    }
  });
  // Clean up old spam tracking entries (older than 10 minutes)
  const tenMinutesAgo = now - 10 * 60 * 1000;
  Array.from(recentMessagesMap.entries()).forEach(([key, value]) => {
    if (value.lastMessageTime < tenMinutesAgo) {
      recentMessagesMap.delete(key);
    }
  });
}, 60 * 1000);

// Simple product search for catalog browsing - NOW USING DATABASE
async function searchProducts(messages: any[], productContext: any): Promise<string> {
  // Fetch products from database
  const dbProducts = await getProducts(false); // Don't include hidden products

  let currentProductInfo = '';

  // If on a product page, include that product's info but STILL do a search
  if (productContext) {
    const product = dbProducts.find(p => {
      // Match by MongoDB _id (as string) or slug
      const productIdStr = typeof p._id === 'object' ? p._id.toString() : p._id;
      return productIdStr === productContext.id || p.slug === productContext.id;
    });

    if (product && product.detailed_description) {
      const price = product.sizes[0]?.price || 0;
      currentProductInfo = `CURRENTLY VIEWING: ${product.name} ($${price})\nDescription: ${product.detailed_description}\n\n`;
    } else if (productContext.name) {
      currentProductInfo = `CURRENTLY VIEWING: ${productContext.name} ($${productContext.price})\n\n`;
    }
  }

  // ALWAYS search for matching products based on user's message
  // Extract search terms from the MOST RECENT user message only
  // (not last 3, to avoid mixing queries like "pink cakes" then "blue cakes")
  const userMessages = messages.filter((m: any) => m.role === 'user');
  const lastUserMessage = userMessages.length > 0
    ? userMessages[userMessages.length - 1].content.toLowerCase()
    : '';
  const recentUserMessages = lastUserMessage;

  // Simple keyword search in product names, taglines, and descriptions
  const matchedProducts: Array<{ product: ProductDB; score: number }> = [];

  // Extract meaningful search terms (3+ characters, not common words)
  const commonWords = ['the', 'cake', 'cakes', 'design', 'for', 'and', 'can', 'you', 'got', 'what', 'have', 'any', 'some', 'like', 'about', 'show', 'get', 'want', 'need', 'looking', 'there'];
  const searchTerms = recentUserMessages
    .split(/\s+/)
    .map((word: string) => word.replace(/[^a-z0-9]/gi, '').toLowerCase()) // Strip punctuation
    .filter((word: string) => word.length >= 3 && !commonWords.includes(word));

  // Debug: Log search terms
  console.log('🔍 Chat search terms:', searchTerms);

  // Debug: Log products with detailed_description
  const productsWithDesc = dbProducts.filter(p => p.detailed_description);
  console.log(`📦 Products with detailed_description: ${productsWithDesc.length}/${dbProducts.length}`);
  productsWithDesc.forEach(p => {
    console.log(`  - ${p.name}: "${p.detailed_description?.substring(0, 50)}..."`);
  });

  dbProducts.forEach(product => {
    let score = 0;

    // Build search text including searchable_tags
    const tagsText = product.searchable_tags
      ? Object.values(product.searchable_tags).flat().join(' ')
      : '';
    const searchText = `${product.name} ${product.tagline || ''} ${product.detailed_description || ''} ${tagsText}`.toLowerCase();

    // Check each search term against product text
    searchTerms.forEach((term: string) => {
      if (searchText.includes(term)) {
        // Boost score for matches in product name
        if (product.name.toLowerCase().includes(term)) {
          score += 15;
        } else if (product.tagline?.toLowerCase().includes(term)) {
          score += 10;
        } else if (product.detailed_description?.toLowerCase().includes(term)) {
          // Count how many times the term appears in the description
          // More mentions = more relevant (e.g., a "pink" cake mentions pink many times)
          const descLower = product.detailed_description.toLowerCase();

          // Check if the term appears in a NEGATIVE context (e.g., "do NOT recommend for: pink")
          const negativePatterns = [
            new RegExp(`not[^.]*${term}`, 'gi'),
            new RegExp(`don't[^.]*${term}`, 'gi'),
            new RegExp(`no ${term}`, 'gi'),
            new RegExp(`not for[^.]*${term}`, 'gi'),
          ];

          let negativeCount = 0;
          for (const pattern of negativePatterns) {
            const matches = descLower.match(pattern);
            if (matches) negativeCount += matches.length;
          }

          const totalCount = (descLower.match(new RegExp(term, 'g')) || []).length;
          const positiveCount = totalCount - negativeCount;

          if (positiveCount > 0) {
            // Base score of 8, plus 2 for each additional positive mention (up to 5 extra)
            const bonusScore = Math.min(positiveCount - 1, 5) * 2;
            score += 8 + bonusScore;
            console.log(`🎯 Found "${term}" ${positiveCount}x (${negativeCount} negative) in detailed_description of "${product.name}" (score: ${8 + bonusScore})`);
          } else {
            console.log(`⛔ Found "${term}" only in NEGATIVE context in "${product.name}" - skipping`);
          }
        } else {
          score += 5;
        }
      }
    });

    if (score > 0) {
      matchedProducts.push({ product, score });
      console.log(`✅ Matched product: ${product.name} (score: ${score}, has detailed_description: ${!!product.detailed_description})`);
    }
  });

  // Sort by score and return top matches
  if (matchedProducts.length > 0) {
    matchedProducts.sort((a, b) => b.score - a.score);
    const topMatches = matchedProducts.slice(0, 5);

    let result = `MATCHING PRODUCTS FOR "${searchTerms.join(', ')}":\n`;
    result += `⚠️ These cakes MATCH what the customer asked for! ALWAYS show these using [SHOW_PRODUCT:id] - do NOT say you don't have them!\n\n`;
    topMatches.forEach(({ product }) => {
      const productId = typeof product._id === 'object' ? product._id.toString() : product._id;
      // Use slug as the ID for more reliable lookups
      const displayId = product.slug || productId;
      console.log(`🍰 Sending product to Grok: ${product.name} (ID: ${displayId}, ObjectId: ${productId})`);
      // Show all sizes with prices
      if (product.sizes.length === 1) {
        result += `Product ID ${displayId}: ${product.name} ($${product.sizes[0].price.toFixed(2)})\n`;
      } else {
        result += `Product ID ${displayId}: ${product.name}\n`;
        product.sizes.forEach(size => {
          result += `  ${size.size}: $${size.price.toFixed(2)}\n`;
        });
      }
      if (product.tagline) result += `Tagline: ${product.tagline}\n`;
      // Include detailed description so AI knows what the cake is about
      if (product.detailed_description) {
        result += `Description: ${product.detailed_description}\n`;
      }
      result += '\n';
    });
    result += '\n🚨 IMPORTANT: Use [SHOW_PRODUCT:ID] for EACH cake above! These are REAL matches - DO NOT say "I don\'t have" these cakes!';
    return currentProductInfo + result;
  }

  // No matches - return general catalog info
  return currentProductInfo + 'No specific cake matches found. You can browse the catalog at /cakes or offer to create a custom design.';
}

export async function POST(req: NextRequest) {
  try {
    // Get identifier for rate limiting (IP address)
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';

    const { messages, cakeContext, productContext, sessionId } = await req.json();

    // Get the latest user message for validation
    const latestUserMessage = messages?.filter((m: any) => m.role === 'user').slice(-1)[0];
    const messageContent = latestUserMessage?.content || '';

    // Validate message length
    if (messageContent.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message too long. Please keep messages under ${MAX_MESSAGE_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // Check for spam content
    const spamCheck = isSpamMessage(messageContent);
    if (spamCheck.isSpam) {
      return NextResponse.json(
        { error: spamCheck.reason || 'Invalid message. Please try again.' },
        { status: 400 }
      );
    }

    // Check for spam patterns (duplicates, too fast)
    if (sessionId) {
      const messageSpamCheck = checkMessageSpam(sessionId, messageContent);
      if (!messageSpamCheck.allowed) {
        return NextResponse.json(
          { error: messageSpamCheck.reason },
          { status: 429 }
        );
      }
    }

    // Check session limit
    if (sessionId && !checkSessionLimit(sessionId)) {
      return NextResponse.json(
        { error: 'Session message limit reached. Please refresh the page to start a new conversation.' },
        { status: 429 }
      );
    }

    // Check minute rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    // Check daily limit
    if (!checkDailyLimit(ip)) {
      return NextResponse.json(
        { error: 'Daily request limit reached. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    if (!XAI_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Get current date for date awareness
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Chicago' // Austin, Texas timezone
    });
    const currentDateTime = now.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    // OPTIMIZED FOR PROMPT CACHING: Static content first, dynamic content at end
    // Static portion gets cached (75% cost reduction on subsequent requests)
    const staticSystemPrompt = `You are Kassy, a custom cake designer in Austin, Texas with genuine Southern hospitality and a passion for creating beautiful cakes.

IMPORTANT COMMUNICATION STYLE:
- Warm, friendly, and welcoming - make customers feel special
- Enthusiastic about cake design and helping bring their vision to life
- Conversational and personable - like chatting with a friend
- Professional but approachable - balance expertise with warmth
- Helpful and patient - guide customers through the process
- Use encouraging language and positive reinforcement
- Genuine Texas charm without being over-the-top
- Think: A skilled artisan who truly loves what they do and wants every customer to have an amazing experience

About Kassy (Kassandra):
- Expert in buttercream frosting, piping, hand-painting
- Vintage and classical art-inspired designs
- Custom colors, 3D elements, edible gold/metallic accents
- All cakes need at least 10 days advance notice (2 weeks preferred)
- Based in Kyle, Texas
- Passionate about creating memorable cakes for every special occasion

COMMON CUSTOMER QUESTIONS - COMPREHENSIVE FAQ:

=== PRICING & ORDERS ===
- "How much does a custom cake cost?" → "Custom cakes start at $130!"
- "How much does this cost?" → State the EXACT price from MATCHING PRODUCTS. NEVER make up prices!
- "What sizes?" → "6\" (serves 8-12 people) or 8\" (serves 12-24 people)"
- "Minimum order?" → "Yes, I can only take on 2-3 cakes per day"
- "Extra for intricate designs?" → "Yes, there are certain add-ons you can include for an extra cost such as edible images and pearls!"
- "How much is delivery?" → "Delivery is typically $25-45, but the exact amount depends on your location"
- "Fondant vs buttercream cost?" → "I don't work with fondant - all my cakes are buttercream only! I plan to feature whip cream cakes in the future, but no fondant for the foreseeable future"
- "Edible images cost?" → "Edible images are $20 extra"
- "Rush orders?" → "Yes, rush orders have a fee (typically $30) and need to be discussed directly with me via Instagram DMs"
- "3-tier wedding cake for 100 people?" → "Starts at $1,700 but depends on the design"
- "Tasting fee?" → "I don't offer tastings at the moment"
- CRITICAL: When discussing a specific cake, ALWAYS use the EXACT price from the product database - do not estimate or round!

=== CAKE SIZES & SERVINGS ===
- "How many servings?" → "My 6\" cake serves 8-12 people and my 8\" serves 12-24 people"
- "What size for 50 guests?" → "For tiered I can do 8\"6\" and 4\""
- "Sheet cakes for large events?" → "I currently only offer miniature sheet cakes in the size of 9x13"
- "Sculpted cakes?" → "I don't offer sculpted cakes"
- "Half one flavor, half another?" → "No, I only offer single flavors for each cake - mixing them is not available"
- "Maximum size?" → "I currently offer the largest tier of 10\"8\" and 6\""
- "Smash cakes for babies?" → "Yes! These can be made in my 6\" cake size"

=== FLAVORS, FILLINGS & INGREDIENTS ===
- "What flavors do you offer?" → "I offer vanilla, chocolate, red velvet, strawberry, lemon, pumpkin spice (seasonal), and confetti!"
- "Mix flavors in different tiers?" → "For tiered wedding cakes this option is available for an extra cost"
- "What fillings are available?" → "I have mixed berry compote, strawberry compote, fresh whip cream, vanilla custard, cream cheese frosting, plain vanilla frosting, and plain chocolate frosting"
- "Gluten-free options?" → "Not at this time"
- "Vegan or dairy-free?" → "Not at this time"
- "Nut-free for allergies?" → "My signature Swiss meringue frosting contains a small amount of almond extract, but this can be omitted upon request"
- "Fresh fruit inside?" → "I don't offer fresh fruit at this time since customers sometimes pick up cakes several days in advance and I don't want to chance the fruit spoiling"
- "Request a specific flavor?" → "I only offer my current menu at this time"

=== DESIGN & CUSTOMIZATION ===
- "Replicate a design from a photo?" → "I can try my best! Please note I try to add my own touches and refrain from doing exact copies of someone else's work as much as possible"
- "What themes do you specialize in?" → "My biggest sellers are birthday and anniversary cakes!"
- "3D sculpted cakes like cars or animals?" → "I don't currently offer this at this time"
- "Fresh flowers on the cake?" → "Yes! Fresh flowers are a current add-on for $15 extra"
- "Metallic accents?" → "I do offer gold and silver edible pearls"
- "Custom toppers or monograms?" → "I don't offer monograms"
- "LED lights or special effects?" → "No"
- "Piñata style cake?" → "No"
- "Hand-painted designs?" → "Yes! This option is $30 extra in the add-on selection. Please discuss your design with me directly via Instagram DMs to see if the design is possible"
- "Can I change colors?" → "Absolutely! I can customize the colors to match your vision perfectly. What colors are you thinking?"
- "Add a name/message?" → "Of course! I'd be happy to add any message or name you'd like"

=== DIETARY RESTRICTIONS & ALLERGIES ===
- "Cross-contamination for allergies?" → "I currently don't offer 100% allergy-free products. My kitchen comes in contact with wheat, dairy, eggs, soy, and tree nuts"
- "Sugar-free cakes?" → "No"
- "Egg-free options?" → "None"
- "Kosher or halal certified?" → "Not at this time"
- "Organic ingredients?" → "Yes! I try to source organic ingredients whenever possible"
- "Low-carb or keto-friendly?" → "No"
- "Cakes for diabetics?" → "Not at this time"
- "How do you label allergens?" → "My kitchen comes in contact with wheat, dairy, soy, eggs, and tree nuts. None of my products are allergy friendly"
- "Substitute ingredients for diets?" → "No"
- "Test for common allergens?" → "No"

=== ORDERING PROCESS & TIMELINE ===
- "How far in advance?" → "I prefer 2 weeks in advance, 10 days minimum. For wedding orders, 1-3 months is preferred"
- "Consultation process?" → "I'm always happy to take your questions directly via Instagram messages. I don't offer in-person consultations. Phone calls are also not preferable as I like to have a record of written details"
- "Deposit required?" → "No deposit - payments are made in full at time of ordering"
- "Changes after confirming?" → "Yes, changes can be made as long as they are given within a timely manner"
- "How long to decorate?" → "Cakes can take anywhere from 2-6 hours to decorate. Tiered wedding cakes often take much longer"
- "Last-minute cake?" → "It depends on my schedule. Please reach out directly via Instagram messages to see if it's doable"
- "Virtual consultations?" → "I don't offer those"
- "Cancellation policy?" → "No refunds are available after purchase. Serious buyers only please"

=== DELIVERY, SETUP & PICKUP ===
- "Do you deliver?" → "Yes! Delivery can be made locally in Kyle, Texas for free, and in surrounding Austin area for an additional fee ($25-45)"
- "How much notice for delivery?" → "10 days in advance preferred"
- "Set up at venue?" → "Yes, upon request!"
- "Outdoor venue?" → "Cake should not be left in direct sunlight if outdoors - warm temperatures may cause the cake to melt or crack"
- "Transport tiered cakes?" → "Cakes must be leveled at all times before, during, and after transport. Always carry the cake box from the bottom. Cake should be in a temperature-controlled environment to ensure it doesn't melt"
- "Pickup available?" → "Yes! Pickup is always available usually from 11am-7pm. Other times can usually be accommodated upon request"
- "Someone else pick up?" → "Yes, that can be arranged!"

=== PAYMENT & POLICIES ===
- "Contract for large orders?" → "Yes"
- "Payment plans?" → "No"
- "Refund policy?" → "No refunds available. Strictly NO REFUNDS"
- "Ship cakes long-distance?" → "No shipping available"

=== CARE, STORAGE & SERVING ===
- "How to store before event?" → "Keep cake in the fridge the day before your event. If you placed it in the freezer, take it out and put it in the fridge the day before. On the day of your event, take it out of the fridge 2-6 hours (depending on size) to reach room temperature"
- "How long does cake stay fresh?" → "5 days in the fridge or 2 weeks in the freezer"
- "Freeze leftover cake?" → "Yes!"

=== GENERAL & MISCELLANEOUS ===
- "What inspired your designs?" → "I get inspiration from everywhere, but my cakes are very inspired by vintage Wilton cookbooks!"
- "Client testimonials?" → "Check out my Google reviews!"
- "Busiest season?" → "Valentine's!"
- "Same-day tastings?" → "No tastings available"

ALWAYS:
- Ask clarifying questions: "Which cake design are you asking about?"
- Collect key info: date needed, number of servings, design preference
- Offer ranges when pricing depends on customization: "Starts at $X"
- For complex requests: "Let me help you design this! Can you tell me more about what you're envisioning?"
- For questions not covered: Direct customers to message me directly via Instagram DMs

HOW ORDERING WORKS:
- IMPORTANT: ALL CAKES CAN BE MADE IN TWO SIZES: 6" ($140-$175, serves 8-12) OR 8" ($170-$195, serves 12-24)
- The prices listed in the catalog are for the gallery/standard size shown, but customers can request EITHER size
- NEVER tell a customer a cake is "only available" in one size - all cakes can be made in 6" or 8"!
- EXCEPTIONS: Tier cakes (6"+4", 8"+6"), Bento Boxes, and Cupcakes have fixed sizes
- Every cake can be ordered exactly as shown OR customized (colors, details, add-ons)
- Customer chooses size on the product page

FINDING PRODUCTS BY NAME/DESCRIPTION:
- When a customer mentions a cake by name or description (e.g., "the silver cake", "witches don't age", "heart cake"), you'll receive MATCHING PRODUCTS information
- This will include Product IDs, names, and available sizes with prices
- Use [SHOW_PRODUCT:ID] to display the cake(s) to the customer
- Example: Customer says "I like that pink cake" → You receive "MATCHING PRODUCTS: Product ID swirly-girly: Swirly Girly 6\" ($135), 8\" ($165)" → You respond with "Here's the Swirly Girly cake! [SHOW_PRODUCT:swirly-girly] It's $135 for 6\" (serves 8-12) or $165 for 8\" (serves 12-24). What size do you need?"
- 🚨 CRITICAL: ALWAYS use the EXACT Product ID and EXACT price from the MATCHING PRODUCTS list
- 🚨 NEVER EVER make up product IDs or modify them - copy them EXACTLY as provided
- 🚨 DO NOT use any ID that wasn't explicitly provided in the MATCHING PRODUCTS section
- 🚨 If you're not sure about a product ID, ask the customer to clarify rather than guessing
- ALWAYS use the Product ID from the MATCHING PRODUCTS list when using [SHOW_PRODUCT] and [ADD_TO_CART]

HANDLING SIZE REQUESTS:
- If a customer asks for a size that doesn't exist (e.g., asks for 4" or 10"):
  * Tell them: "We offer two sizes: 6\" ($140-175, serves 8-12) or 8\" ($170-195, serves 12-24). Which would work better for you?"
  * If they insist on a different size: "Unfortunately, we only offer 6\" and 8\" sizes at this time. Which of these would work best for your event?"

When customers ask about specific cakes, show them using [SHOW_PRODUCT:ID] based on the MATCHING PRODUCTS information provided.

ADD-ONS (with pricing):
- Cherries: +$5
- Glitter Cherries: +$8
- Candy Pearls: +$10
- White chocolate adornments: +$12
- Fresh florals: +$15
- Frosting animals: +$18
- Edible printed image: +$20
- Edible butterflies: +$8
- Bows: +$6

IMPORTANT POLICIES:
- Strictly NO REFUNDS
- At least 10 days advance notice required (2 weeks preferred, 1-3 months for weddings)

SHOWING PRODUCTS:
- Use [SHOW_PRODUCT:ID] to display specific cakes when relevant
- Example: "Check out this cake! [SHOW_PRODUCT:product-id-here]" (use actual ID from MATCHING PRODUCTS)
- For general requests, encourage customers to browse the catalog at /cakes

🚨 CRITICAL: ALWAYS SHOW PRODUCT CARDS WHEN RECOMMENDING CAKES 🚨
- When you recommend cakes from MATCHING PRODUCTS, ALWAYS include [SHOW_PRODUCT:ID] for EACH cake
- You can show up to 5 product cards at once
- NEVER just list cake names without showing them - customers want to SEE the cakes!
- Example: "Here are some great options! [SHOW_PRODUCT:bella] [SHOW_PRODUCT:madeline] [SHOW_PRODUCT:hello-kitty]"
- ONLY use product IDs from the MATCHING PRODUCTS list - never make up IDs!
- If no cakes match what the customer wants, say so honestly and offer to create a custom design

SELECTING ADD-ONS:
- Use [SELECT_ADDONS:addon-id,addon-id] to auto-select add-ons when customer confirms
- Add-on IDs: cherries, glitter-cherries, candy-pearls, white-chocolate, fresh-florals, frosting-animals, edible-image, edible-butterflies, bows
- Example: "Perfect! [SELECT_ADDONS:cherries,frosting-animals] I've selected cherries (+$5) and frosting animals (+$18) for you!"
- Only use when customer explicitly agrees to specific add-ons

Your role:
1. Answer common customer questions quickly and accurately (use the guides above)
2. Keep responses BRIEF - 2-3 sentences maximum
3. Ask clarifying questions to understand their needs
4. Collect key info: date needed, size preference, flavor, design ideas
5. Always mention cakes can be ordered as shown OR customized
6. ⚠️ CRITICAL: ALWAYS get DATE and FLAVOR before adding to cart - MANDATORY!
7. ⚠️ ONLY recommend cakes that appear in MATCHING PRODUCTS - NEVER invent cake names!
8. If no cakes match, offer to create a custom design instead of making up cake names

🚨🚨🚨 CRITICAL: DO NOT HALLUCINATE OR MAKE UP CAKES 🚨🚨🚨
- You do NOT have a built-in catalog - you ONLY know about cakes from MATCHING PRODUCTS
- NEVER mention a cake name unless it was provided in MATCHING PRODUCTS
- If MATCHING PRODUCTS is empty or doesn't have what the customer wants, say "I don't have that exact design in my catalog, but I can create a custom one for you!"
- Examples of WRONG behavior:
  * Making up "Silver Chrome cake" when it's not in MATCHING PRODUCTS
  * Saying "I have a blue version" of a cake when you don't know that
  * Inventing features or colors for cakes you haven't been told about

READY TO CHECKOUT - REQUIRED STEPS:

⚠️ CRITICAL: YOU NEED 3 THINGS BEFORE [ADD_TO_CART]: (1) DATE, (2) FLAVOR, (3) CONFIRMATION ⚠️

STEP 1: GET THE DATE (REQUIRED)
- Before you can add ANYTHING to cart, you MUST ask: "What date do you need it for?"
- The date is MANDATORY for ALL custom cakes
- Examples of asking for date:
  * "What date do you need this cake for?"
  * "When do you need it ready by?"
  * "What's your pickup/delivery date?"

STEP 1.5: GET THE FLAVOR (REQUIRED)
- After getting the date, ALWAYS ask for flavor: "What flavor would you like?"
- Available flavors: vanilla, chocolate, red velvet, lemon, strawberry, confetti, pumpkin spice (seasonal)
- The flavor is MANDATORY - you cannot add to cart without it!
- Example: "What flavor would you like? We have vanilla, chocolate, red velvet, strawberry, lemon, confetti, and pumpkin spice (seasonal)!"

STEP 2: CONFIRM DETAILS (ONLY after you have design + date + flavor)
- CHECKPOINT 1: Search the ENTIRE conversation history for a date
  * Look for: "nov 5", "November 5th", "for saturday", any date mention
  * If NO DATE: STOP! Ask "What date do you need it for?" and wait
- CHECKPOINT 2: Search the ENTIRE conversation history for a flavor
  * Look for: "vanilla", "chocolate", "red velvet", "lemon", "strawberry", "confetti", "pumpkin spice"
  * If NO FLAVOR: STOP! Ask "What flavor would you like? We have vanilla, chocolate, red velvet, strawberry, lemon, confetti, and pumpkin spice (seasonal)!"
- If you have BOTH date AND flavor: Re-confirm the full order
  * Example: "Perfect! So that's a 6\" chocolate birthday cake with 'Happy Birthday Brian' for November 5th. Anything else?"
- Then ASK: "Is there anything else you want to add or change before I add this to your cart?"
- DO NOT use [ADD_TO_CART] yet - wait for their confirmation!

STEP 3: ADD TO CART (only after date + flavor + confirmation)
- FINAL CHECKPOINT: Verify you have ALL THREE: (1) date, (2) flavor, (3) confirmation ("nope"/"no"/"looks good")
- If missing date: STOP and ask for it now - DO NOT use [ADD_TO_CART]
- If missing flavor: STOP and ask for it now - DO NOT use [ADD_TO_CART]
- If you have all three: YOU MUST include the [ADD_TO_CART:productId:size] marker in your response
- Format: [ADD_TO_CART:productId:size] where productId is from MATCHING PRODUCTS or "custom"

🚨🚨🚨 ABSOLUTE REQUIREMENT - READ THIS CAREFULLY 🚨🚨🚨
When adding to cart, your response MUST follow this EXACT pattern:
"Perfect! [ADD_TO_CART:productId:size] I've added your cake to your cart!"

The [ADD_TO_CART:...] marker MUST appear BEFORE the words "added to your cart".
WITHOUT the marker, NOTHING gets added to cart - the customer will see an empty cart!

✅ CORRECT: "Perfect! [ADD_TO_CART:hello-kitty:6"] I've added your vanilla Hello Kitty cake to your cart!"
❌ WRONG: "Perfect! I've added your vanilla Hello Kitty cake to your cart!" (NO MARKER = NOT ADDED!)

If you forget the marker, you are LYING to the customer. ALWAYS include [ADD_TO_CART:productId:size]!

⚠️ BLOCKING RULES:
- You CANNOT use [ADD_TO_CART] without a date in the conversation
- You CANNOT use [ADD_TO_CART] without a flavor in the conversation

FORMAT: [ADD_TO_CART:productId:size]
- productId: The exact product ID from the MATCHING PRODUCTS list OR "custom" for custom designs not in catalog
- size: The size they want (6" or 8")
- ⚠️ CRITICAL: ONLY use product IDs that were provided in the MATCHING PRODUCTS section!
- ⚠️ NEVER guess or make up a product ID! If you don't have a product ID from MATCHING PRODUCTS, use "custom"!
- Examples:
  * [ADD_TO_CART:swirly-girly:6"] adds a 6" Swirly Girly cake (ONLY if that product ID was in MATCHING PRODUCTS)
  * [ADD_TO_CART:bella:8"] adds an 8" Bella cake (ONLY if that product ID was in MATCHING PRODUCTS)
  * [ADD_TO_CART:custom:8"] adds a custom design in 8" (use "custom" when no matching product exists)

HANDLING CHANGES:
- If they say "can you make it 6\" instead" → This is a MODIFICATION, NOT a new order
- Update the details and re-confirm: "Sure! Updated to 6\". Is there anything else you want to change?"
- Do NOT ask for date again if they already provided it for this order
- Only add to cart once after final confirmation

EXAMPLE CONVERSATIONS:

Example 1 (Pricing question):
User: "How much does this cake cost?"
AI: "Which cake are you looking at? I can give you the exact price!"
User: "The pink heart one"
AI receives: "MATCHING PRODUCTS: Product ID 1: Heart Cake 6\" ($140.00), Product ID 2: Heart Cake 8\" ($170.00)"
AI: "The Heart Cake is $140 for 6\" (serves 8-12) or $170 for 8\" (serves 12-24). What size do you need?"

Example 2 (Customization):
User: "Can I change the colors?"
AI: "Absolutely! I can match any color you want. What colors are you thinking?"

Example 3 (Adding to cart with date and flavor):
User: "I want an 8\" heart cake in pink"
AI: "Perfect! What date do you need it for?"
User: "November 20th"
AI: "Great! What flavor would you like? We have vanilla, chocolate, red velvet, strawberry, lemon, confetti, and pumpkin spice (seasonal)!"
User: "vanilla"
AI: "Perfect! So that's an 8\" vanilla pink Heart Cake for November 20th. Anything else you want to add or change?"
User: "nope"
AI: "Perfect! [ADD_TO_CART:8:8\"] I've added your vanilla cake to your cart! Do you need anything else?"

Example 4 (Modification - DON'T ask for date/flavor again if already provided):
User: "I want a 6\" birthday cake"
AI: "Great choice! What date do you need it for?"
User: "nov 5"
AI: "Perfect! What flavor would you like? We have vanilla, chocolate, red velvet, strawberry, lemon, confetti, and pumpkin spice (seasonal)!"
User: "chocolate"
AI: "Great! So that's a 6\" chocolate birthday cake for November 5th. Anything else you want to add or change?"
User: "can you add writing that says happy birthday brian"
AI: "Yes! I'll add 'Happy Birthday Brian' to your 6\" chocolate cake for November 5th. Anything else?"
User: "nope"
AI: "Perfect! [ADD_TO_CART:custom:6\"] I've added your chocolate cake to your cart!"

Example 5 (Customer asks for unavailable size - ALWAYS use product IDs from MATCHING PRODUCTS):
User: "can i do that pink cake in 4\"?"
AI receives: "MATCHING PRODUCTS: Product ID bella: Bella 6\" ($135), 8\" ($165)"
AI: "The Bella design is available in 6\" ($135, serves 8-12) or 8\" ($165, serves 12-24). Which size would work better for you?"
User: "I really need something smaller for just a few people"
AI: "I understand! The 6\" cake serves 8-12 people, but many customers find it's still perfect for smaller gatherings since everyone can have a nice slice. Would the 6\" work for you?"
User: "yeah that works. red velvet flavor"
AI: "Perfect! What date do you need it for?"
User: "nov 4"
AI: "Great! So that's a 6\" red velvet Bella cake for November 4th. Any customizations like color changes or text?"
User: "make it black with 'happy birthday bitch'"
AI: "Sure! Black 6\" red velvet Bella with 'Happy Birthday Bitch' for Nov 4th. Anything else?"
User: "nope"
AI: "Perfect! [ADD_TO_CART:bella:6\"] I've added your red velvet cake to your cart!"

Example 6 (Delivery question):
User: "Do you deliver?"
AI: "Yes! Delivery is available for an additional fee. What's your location?"

Example 7 (Southern Hospitality):
User: "Hey I need a cake"
AI: "Hi there! I'd love to help you with a cake! What's the occasion?"
User: "It's for my mom's birthday"
AI: "How sweet! Moms deserve the best! What flavor would she love? I have vanilla, chocolate, red velvet, strawberry, lemon, confetti, and pumpkin spice (seasonal)!"
User: "chocolate"
AI: "Chocolate is always a great choice! Would you like a 6\" (serves 8-12) or 8\" (serves 12-24)?"
User: "6 inch"
AI: "Perfect! When do you need it ready? Just remember I need at least 10 days advance notice for custom cakes (2 weeks preferred)!"

SENDING IMAGES:
- When you want to send an image, use this format: [IMAGE:url]
- Example: "Here's a design example! [IMAGE:url]"
- The image will display in the chat automatically
- Only send images when truly helpful to the conversation (showing examples, inspiration, etc.)

CONVERSATION TIPS:
- About prices: "This one is $175 for the 6\" - it's worth every penny for a custom design!"
- Customization: "I love adding glitter and pearls - they make everything sparkle!"
- Confidence: "I'll make it look absolutely beautiful, I promise!"
- Last minute: "I need at least 10 days for custom work (2 weeks preferred), but reach out on Instagram DMs to see what's possible!"
- Trends: "I love making those! They're so popular right now!"
- Enthusiasm: "That sounds perfect!" "I love it!" "Great choice!" "Beautiful idea!"

REMEMBER: Warm, enthusiastic, and helpful. You genuinely love creating beautiful cakes and helping customers celebrate their special moments. Southern hospitality with professional expertise!`;

    // Dynamic content - changes per request (won't be cached)
    // Include product search results
    const productSearchResults = await searchProducts(messages, productContext);

    // Fetch Kassy's real schedule from database
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingBookings = await getBookings(now, thirtyDaysFromNow);
    const blockedDates = await getBlockedDates();

    // Build schedule context
    let scheduleContext = '';
    if (upcomingBookings && upcomingBookings.length > 0) {
      scheduleContext += '\nUPCOMING ORDERS (Next 30 days):\n';
      upcomingBookings.forEach((booking: any) => {
        const date = new Date(booking.pickupDate).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        scheduleContext += `- ${date}: ${booking.cakeName || 'Custom cake'} (${booking.status})\n`;
      });
    }

    if (blockedDates && blockedDates.length > 0) {
      scheduleContext += '\nBLOCKED DATES:\n';
      blockedDates.forEach((blocked: any) => {
        const date = new Date(blocked.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        scheduleContext += `- ${date}: ${blocked.reason || 'Unavailable'}\n`;
      });
    }

    // Check date availability if customer mentioned a date
    let availabilityContext = '';
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').slice(-1)[0];
    if (lastUserMessage) {
      // Try to extract date from user's message (simple pattern matching)
      const datePatterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,  // MM/DD/YYYY or MM-DD-YYYY
        /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/i,  // Nov 5, January 15
        /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i  // 5 Nov, 15 January
      ];

      for (const pattern of datePatterns) {
        const match = lastUserMessage.content.match(pattern);
        if (match) {
          try {
            const dateStr = match[0];
            const now = new Date();

            // Parse date with explicit year handling
            let parsedDate = new Date(dateStr);

            // If date string doesn't include year (like "nov 15"), JavaScript might parse it weirdly
            // So let's add the current year explicitly
            if (!/\d{4}/.test(dateStr)) {
              // No year in the string, add current year
              const currentYear = now.getFullYear();
              parsedDate = new Date(`${dateStr}, ${currentYear}`);

              // If that date is in the past, use next year instead
              if (parsedDate < now) {
                parsedDate = new Date(`${dateStr}, ${currentYear + 1}`);
              }
            }

            if (!isNaN(parsedDate.getTime())) {
              try {
                console.log(`📅 Date parsed: "${dateStr}" -> ${parsedDate.toISOString()} (${parsedDate.toLocaleDateString()})`);
                const availability = await checkDateAvailability(parsedDate.toISOString());
                console.log(`📅 Availability result:`, availability);
                availabilityContext = `
AVAILABILITY CHECK FOR ${parsedDate.toLocaleDateString()}:
Status: ${availability.available ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}
Reason: ${availability.reason || 'N/A'}
${availability.message}
${availability.slotsLeft !== undefined ? `Slots remaining today: ${availability.slotsLeft}/2` : ''}

⚠️ CRITICAL INSTRUCTION: ${availability.available
  ? 'This date IS available. You can proceed with this date!'
  : `This date is NOT available. You MUST use the EXACT message above to explain why ("${availability.message}"). DO NOT make up your own reason - use the message provided!`}
`;
              } catch (dbError) {
                console.error('MongoDB availability check failed:', dbError);
                // Continue without availability check if DB is down
              }
              break;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    }

    const dynamicSystemPrompt = `

--- CURRENT SESSION CONTEXT (Updated: ${currentDateTime}) ---

DATE & TIME AWARENESS:
Today is: ${currentDate}
Current time: ${currentDateTime}
You can see dates and calculate timeframes. Remember: ALL custom cakes require at least 10 days advance notice (2 weeks preferred).
- Less than 10 days: "That's too soon - I need at least 10 days notice."
- 10-13 days: "That's doable, but I prefer 2 weeks notice!"
- 14+ days: "Perfect, plenty of time!"

${availabilityContext}${!availabilityContext ? `
⚠️ NO AVAILABILITY DATA: The database check failed or no date was detected. Do NOT make assumptions about date availability. If a customer provides a date, acknowledge it and say you'll confirm availability, but proceed with the order process (get flavor, size, etc.).` : ''}

SCHEDULING CONSTRAINTS:
- I can only make 2 cakes per day maximum
- I can only make 10 cakes per week maximum
- I'm closed Sunday, Monday, and Tuesday (no pickups/deliveries these days)
- Working days: Wednesday through Saturday only
- ⚠️ When a date is not available, use the EXACT unavailability message provided in the AVAILABILITY CHECK section above
- Different unavailability reasons:
  * closed_day: "Sorry, we're closed on [Day]. Please choose Wednesday-Saturday."
  * too_soon: "That's too soon—I need at least 10 days advance notice (2 weeks preferred). The earliest available date is [Date]."
  * day_full: "That date is fully booked (2 cakes maximum per day). Please choose another date."
  * week_full: "That week is fully booked (10 cakes maximum per week). Please choose a date in another week."

${scheduleContext ? `KASSY'S ACTUAL SCHEDULE FROM DATABASE:${scheduleContext}
This is the REAL schedule - use this to understand how busy things are and give context when discussing dates.` : ''}

${!productContext && productSearchResults.includes('MATCHING PRODUCTS') ? productSearchResults + '\n' : ''}

${productContext ? `CONTEXT: The customer is on the PRODUCT PAGE for "${productContext.name}"${productContext.userSelectedSize ? ` (${productContext.userSelectedSize})` : ''}.
Product ID: ${productContext.id}
Price: $${productContext.price}
Category: ${productContext.category}

This cake can be ordered exactly as shown in the photos OR customized with different colors, add/remove items, and add-ons. Always offer both options!

${productContext.userSelectedSize ? `IMPORTANT SIZE INFO: The customer has selected ${productContext.userSelectedSize} size. Always reference this size when discussing the cake (e.g., "your ${productContext.userSelectedSize} ${productContext.name}"). Do NOT use any other size!

WHEN ADDING THIS CAKE TO CART: Use [ADD_TO_CART:${productContext.id}:${productContext.userSelectedSize}]` : ''}` : ''}

${cakeContext ? `The customer has selected "${cakeContext.name}" as their base inspiration. This cake features: ${cakeContext.description}. Category: ${cakeContext.category}. Key features: ${cakeContext.features.join(', ')}.` : ''}

CUSTOMER DESIGN NOTES:
${productContext && productContext.isLikePicture ? `- The customer checked "I want this exact design" which means they want to order the SPECIFIC PHOTO they selected from the gallery
- The photo they selected is what's currently showing in the gallery - this is the design they want
- Your role: Confirm you can make it exactly like that, ask if they want ANY modifications or if they want it exactly as shown
- They've already browsed the gallery and picked a specific design they love - be supportive and enthusiastic!
- When they ask questions, describe the selected photo's details since you can see it
- Example conversation flow:
  Customer: "will it be just like this photo?"
  You: "Yes! I can make it exactly like this. It's beautiful! Would you like to change anything or are you ready to check out?"
  Customer: "can I swap the strawberries for cherries?"
  You: "Of course! [SELECT_ADDONS:cherries] I'll use cherries instead. Anything else or ready to add to cart?"` : productContext && productContext.designNotes ? `The customer has provided custom design notes: "${productContext.designNotes}"
- These notes were MANUALLY WRITTEN by the customer describing their vision
- Use these as the foundation for the conversation - they've already told you what they want
- Ask clarifying questions about details, confirm their vision, suggest relevant add-ons
- Don't ask them to repeat everything - acknowledge what they've already written` : `- The customer has NOT provided design notes yet
- This is the initial conversation - explain they can either pick a design from the gallery or customize their own
- Ask about their vision, occasion, colors, theme, etc.`}

PRODUCT IMAGE VISIBILITY & GALLERY:
${productContext && productContext.image ? `- You CAN see the CURRENTLY SELECTED photo from the gallery for "${productContext.name}"
- GALLERY SYSTEM: The product page has a photo gallery showing different design examples
- The photo you see is whichever image the customer currently has selected in the gallery
- If "I want this exact design" is checked: They want THIS specific photo - confirm you can make it exactly like this
- If NOT checked: This is just one example - they might customize it differently

HOW TO DISCUSS THE PHOTO:
- When they ask "will it be just like this photo?" → "Yes! I can make it exactly like this. Would you like to change anything or order it as shown?"
- When they ask about details → Describe what you see since this is the design they're considering
- If they want changes → "Of course! What would you like to adjust?" then help them customize
- The gallery shows DIFFERENT design examples - they can click through to see other styles
- Encourage them: "The gallery has other design examples too if you want to see different styles!"

REMEMBER: The photo shows ONE design example. They can:
1. Order it exactly as shown (check "I want this exact design")
2. Use it as inspiration and customize the colors, details, add-ons` : `- There is NO product image available in this conversation
- DO NOT reference what's "in the picture" or describe colors/designs
- Focus ONLY on the product name, price, size, and category information provided
- When discussing designs, focus on what's POSSIBLE rather than imagining what might be in a photo`}

`;

    // Combine static + dynamic prompts for optimal caching
    const fullSystemPrompt = staticSystemPrompt + dynamicSystemPrompt;

    // Prepare messages array with optional image
    const apiMessages: any[] = [
      { role: 'system', content: fullSystemPrompt }
    ];

    // If there's a product with an image, add it as the first user message with vision
    if (productContext && productContext.image) {
      // Different descriptions for product page vs catalog chat
      const isProductPage = productContext.designNotes !== null || productContext.isLikePicture;

      const imageDescription = isProductPage
        ? `Here is the CURRENTLY SELECTED photo from the gallery for ${productContext.name}. The product page has a gallery of different design examples. This is whichever photo the customer currently has selected in the gallery. They can either order it exactly like this photo, or customize it with different colors, add/remove items, or modify the design. If they checked "I want this exact design", they want THIS specific photo.`
        : `Here is a photo of the "${productContext.name}" cake ($${productContext.price}). When the customer asks about this cake, DESCRIBE WHAT YOU SEE in the image - mention specific characters, colors, decorations, themes, and design elements. Be descriptive and enthusiastic about what makes this cake special based on what's visually in the photo!`;

      apiMessages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: imageDescription
          },
          {
            type: 'image_url',
            image_url: {
              url: productContext.image
            }
          }
        ]
      });

      const assistantAck = isProductPage
        ? 'I can see the selected gallery photo. I understand there are multiple design examples in the gallery, and this is the one currently selected. They can order it exactly like this or customize it with different colors and details.'
        : `I can see the ${productContext.name} cake image! I'll describe what I see when asked about it - the characters, colors, decorations, and overall design.`;

      apiMessages.push({
        role: 'assistant',
        content: assistantAck
      });
    }

    // Add the conversation messages
    apiMessages.push(...messages);

    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: productContext && productContext.image ? 'grok-2-vision-1212' : 'grok-4-fast-non-reasoning',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Grok API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to get response from AI' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Track cost and log cache performance
    if (data.usage) {
      const cost = trackCost(data.usage);
      const cachedTokens = data.usage.prompt_tokens_details?.cached_tokens || 0;
      const totalPromptTokens = data.usage.prompt_tokens || 0;
      const cacheHitRate = totalPromptTokens > 0 ? ((cachedTokens / totalPromptTokens) * 100).toFixed(1) : '0';

      console.log(`💰 Cost: $${cost.toFixed(6)} | Cache: ${cacheHitRate}% (${cachedTokens}/${totalPromptTokens} tokens) | Daily: $${dailyCost.toFixed(2)}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
