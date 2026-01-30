# Recreate Deleted Cakes Script

This script recreates the 33 accidentally deleted cakes in your MongoDB database.

## Cakes Included

1. Custom Circle Cake
2. Custom Heart Cake
3. 90s Celestial
4. Smashing Pumpkins
5. The Birth of Venus
6. Forest Friends
7. Bubble Buddy
8. Vintage Cherry
9. Miffy
10. The Lizzie McGuire
11. Tea Time Snoopy
12. Squidward Graduate
13. Gothic Romance
14. Belle
15. The Madeline
16. Dream Angel
17. Engaged froggies
18. Rose Garden
19. Ivory & Rose Blush
20. Sylvanian Fairy Wonderland
21. Thirty Flirty and Thriving
22. Petite Wedding
23. Swirly Girly
24. Just Married
25. Peachy Spring
26. La Vie En Rose
27. Gothic Rose
28. Enchanted Fairy Garden
29. Cowgirl Princess
30. Strawberry Shortcake
31. Cotton Candy Skies
32. Witches Don't Age
33. Barbie Girl

## Prerequisites

- Node.js installed
- MongoDB connection string in `.env.local`
- `tsx` package (for running TypeScript files)

## How to Run

### Option 1: Using npx (Recommended)

```bash
npx tsx scripts/recreate-cakes.ts
```

### Option 2: Install tsx globally first

```bash
npm install -g tsx
tsx scripts/recreate-cakes.ts
```

### Option 3: Add as npm script

Add to `package.json`:

```json
{
  "scripts": {
    "recreate-cakes": "tsx scripts/recreate-cakes.ts"
  }
}
```

Then run:

```bash
npm run recreate-cakes
```

## What the Script Does

1. ✅ Connects to your MongoDB database
2. ✅ Creates all 33 cakes with correct pricing and structure
3. ✅ Generates URL slugs automatically
4. ✅ Sets up searchable tags for AI chatbot
5. ✅ Skips cakes that already exist (won't create duplicates)
6. ✅ Provides detailed progress and summary

## After Running the Script

### Step 1: Upload Images

The script creates placeholder image URLs like:
```
https://kassy.b-cdn.net/cakes/custom-circle.webp
https://kassy.b-cdn.net/cakes/90s-celestial.webp
```

You need to:
1. Upload your actual cake images to Bunny CDN
2. Name them to match the placeholder URLs, OR
3. Update the URLs in the database after upload

### Step 2: Update Image URLs (if needed)

If you use different file names, update the media URLs via:

**Option A: Admin Dashboard**
- Go to `/kassycakes/dashboard`
- Click on each cake
- Upload/update the images

**Option B: Direct Database Update**

You can modify the script to use your actual image URLs before running it, or create a separate update script.

## Customization

### Change Image URLs

Edit the `media` array in each cake object in `recreate-cakes.ts`:

```typescript
media: [
  {
    url: 'https://kassy.b-cdn.net/cakes/YOUR-ACTUAL-IMAGE.webp',
    type: 'image',
    order: 0,
    isThumbnail: true
  }
]
```

### Add Multiple Images

```typescript
media: [
  {
    url: 'https://kassy.b-cdn.net/cakes/cake1.webp',
    type: 'image',
    order: 0,
    isThumbnail: true
  },
  {
    url: 'https://kassy.b-cdn.net/cakes/cake2.webp',
    type: 'image',
    order: 1,
    isThumbnail: false
  }
]
```

### Modify Descriptions

Edit the `tagline`, `description`, or `detailed_description` fields for each cake.

### Update Searchable Tags

Modify the `searchable_tags` to improve AI chatbot recommendations:

```typescript
searchable_tags: {
  occasion: ['birthday', 'wedding'],
  colors: ['pink', 'white'],
  theme: ['romantic', 'elegant'],
  style: ['tiered'],
  elements: ['roses', 'flowers']
}
```

## Troubleshooting

### Error: "MONGODB_URI is not defined"
- Check that `.env.local` exists and contains `MONGODB_URI`

### Error: "tsx: command not found"
- Install tsx: `npm install -g tsx`
- Or use npx: `npx tsx scripts/recreate-cakes.ts`

### Cakes Already Exist
- The script will skip cakes that already exist by name
- To recreate them, delete them from the database first

### Images Not Showing
- Verify images are uploaded to Bunny CDN
- Check that URLs in database match actual file paths
- Ensure images are publicly accessible

## Script Safety Features

✅ Checks for existing cakes before creating (no duplicates)
✅ Provides detailed logging of all operations
✅ Uses transactions where possible
✅ Graceful error handling
✅ Summary report at the end

## Image Naming Convention

The script uses this naming pattern for image URLs:
```
cake name: "90s Celestial"
slug: "90s-celestial"
suggested image: "90s-celestial.webp"
```

For consistency, consider using the slug as the image filename.

## Questions?

If you encounter issues:
1. Check MongoDB connection is working
2. Verify environment variables are loaded
3. Ensure database permissions allow insertions
4. Check the console output for specific error messages
