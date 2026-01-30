# Bunny CDN Image Compression Script

This script downloads images from Bunny CDN, compresses them locally, and uploads them back while keeping the originals safe.

## What It Does

1. **Downloads** all images from a specified Bunny CDN folder
2. **Saves originals** to `downloads/originals/` (local backup)
3. **Compresses** images with smart optimization
4. **Backs up originals** in Bunny with `-original` suffix (e.g., `cake.jpg` → `cake-original.jpg`)
5. **Uploads** compressed versions to replace the originals in Bunny

## Setup

### 1. Install Dependencies

```bash
npm install sharp
```

### 2. Configure

Edit the script `compress-bunny-images.js` and change these settings:

```javascript
const FOLDER_TO_COMPRESS = 'cakeicons'; // Your folder name
const MAX_WIDTH = 800;                   // Max width in pixels
const MAX_HEIGHT = 800;                  // Max height in pixels
const QUALITY = 90;                      // JPEG quality (1-100)
```

## Usage

### Run the script:

```bash
node scripts/compress-bunny-images.js
```

### Or add to package.json:

```json
{
  "scripts": {
    "compress-images": "node scripts/compress-bunny-images.js"
  }
}
```

Then run:
```bash
npm run compress-images
```

## What Happens

```
🚀 Bunny CDN Image Compression Script

📁 Folder: cakeicons
🖼️  Max size: 800x800
⚙️  Quality: 90%

📋 Listing files...
✅ Found 15 files

[1/15] chocolate_cake.webp
  📥 Downloading...
  🗜️  Compressing...
  ✅ 450KB → 180KB (60% savings)
  💾 Backing up original...
  📤 Uploading compressed version...
  ✅ Uploaded!

...

📊 Summary:
✅ Processed: 12
⏭️  Skipped: 2
❌ Errors: 1
💾 Total original size: 5.4 MB
🗜️  Total compressed size: 2.1 MB
💰 Total savings: 61.1%
```

## Safety Features

- **Local backups**: All originals saved to `downloads/originals/`
- **Bunny backups**: Originals renamed with `-original` suffix in Bunny
- **Minimal savings check**: Only uploads if savings > 5%
- **Skip non-images**: Automatically skips non-image files
- **No enlargement**: Never makes images bigger than original

## Folder Structure After Running

```
downloads/
├── originals/          # Local backup of originals
│   ├── cake1.jpg
│   ├── cake2.webp
│   └── ...
└── compressed/         # Compressed versions
    ├── cake1.jpg
    ├── cake2.webp
    └── ...
```

**In Bunny CDN:**
```
cakeicons/
├── cake1.jpg           # Compressed version
├── cake1-original.jpg  # Original backup
├── cake2.webp          # Compressed version
├── cake2-original.webp # Original backup
└── ...
```

## Troubleshooting

### "sharp not installed"
```bash
npm install sharp
```

### "Missing Bunny credentials"
Check your `.env.local` has:
```env
BUNNY_ACCESS_KEY=your-key-here
BUNNY_STORAGE_ZONE=your-zone
BUNNY_HOSTNAME=storage.bunnycdn.com
BUNNY_CDN_URL=https://your-cdn.b-cdn.net
```

### Want to test first?
Change the folder to a test folder with just a few images first!

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `FOLDER_TO_COMPRESS` | Bunny folder path | `'cakeicons'` |
| `MAX_WIDTH` | Maximum width in pixels | `800` |
| `MAX_HEIGHT` | Maximum height in pixels | `800` |
| `QUALITY` | JPEG quality (1-100) | `90` |

## Notes

- Images are converted to JPEG format during compression
- Aspect ratio is always preserved
- Images smaller than max dimensions are not enlarged
- You can safely run this multiple times - it will skip files with `-original` suffix
