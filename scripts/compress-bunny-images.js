/**
 * Bunny CDN Image Compression Script
 *
 * This script will:
 * 1. Download all images from a Bunny CDN folder
 * 2. Save originals to ./downloads/originals/
 * 3. Compress images and save to ./downloads/compressed/
 * 4. Upload compressed versions back to Bunny (keeping originals with -original suffix)
 *
 * Usage: node scripts/compress-bunny-images.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

// Bunny CDN Configuration
const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME;
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL;

// Configuration
const FOLDER_TO_COMPRESS = 'cakes'; // Change this to the folder you want to compress
const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 90; // 1-100

// Create directories
const DOWNLOAD_DIR = path.join(__dirname, '../downloads');
const ORIGINALS_DIR = path.join(DOWNLOAD_DIR, 'originals');
const COMPRESSED_DIR = path.join(DOWNLOAD_DIR, 'compressed');

[DOWNLOAD_DIR, ORIGINALS_DIR, COMPRESSED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Check if sharp is available for compression
let sharp;
try {
  sharp = require('sharp');
  console.log('✅ Using sharp for image compression');
} catch (error) {
  console.error('❌ sharp not installed. Run: npm install sharp');
  process.exit(1);
}

/**
 * Make a request to Bunny Storage API
 */
function bunnyRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BUNNY_HOSTNAME,
      path: `/${BUNNY_STORAGE_ZONE}/${path}`,
      method: method,
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
      }
    };

    if (body && method === 'PUT') {
      options.headers['Content-Type'] = 'application/octet-stream';
      options.headers['Content-Length'] = body.length;
    }

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : null);
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (body && method === 'PUT') {
      req.write(body);
    }

    req.end();
  });
}

/**
 * List all files in a Bunny storage folder (recursively)
 */
async function listFiles(folderPath, allFiles = []) {
  try {
    const data = await bunnyRequest('GET', `${folderPath}/`);

    if (!Array.isArray(data)) return allFiles;

    for (const item of data) {
      if (item.IsDirectory) {
        // Recursively scan subdirectories
        const subFolderPath = `${folderPath}/${item.ObjectName}`;
        await listFiles(subFolderPath, allFiles);
      } else {
        // Add file with its full path
        allFiles.push({
          ...item,
          FullPath: `${folderPath}/${item.ObjectName}`
        });
      }
    }

    return allFiles;
  } catch (error) {
    console.error(`Error listing files in ${folderPath}:`, error.message);
    return allFiles;
  }
}

/**
 * Download a file from Bunny
 */
function downloadFile(remotePath, localPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BUNNY_HOSTNAME,
      path: `/${BUNNY_STORAGE_ZONE}/${remotePath}`,
      method: 'GET',
      headers: {
        'AccessKey': BUNNY_ACCESS_KEY,
      }
    };

    const file = fs.createWriteStream(localPath);

    https.get(options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(localPath, () => {});
      reject(err);
    });
  });
}

/**
 * Compress an image using sharp
 */
async function compressImage(inputPath, outputPath) {
  const ext = path.extname(inputPath).toLowerCase();

  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    console.log(`  ⏭️  Skipping non-image: ${path.basename(inputPath)}`);
    return null;
  }

  try {
    const metadata = await sharp(inputPath).metadata();
    const originalSize = fs.statSync(inputPath).size;

    await sharp(inputPath)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: QUALITY })
      .toFile(outputPath);

    const compressedSize = fs.statSync(outputPath).size;
    const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    return {
      originalSize,
      compressedSize,
      savings: parseFloat(savings),
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    console.error(`  ❌ Error compressing ${path.basename(inputPath)}:`, error.message);
    return null;
  }
}

/**
 * Upload a file to Bunny Storage
 */
async function uploadFile(localPath, remotePath) {
  const fileBuffer = fs.readFileSync(localPath);
  await bunnyRequest('PUT', remotePath, fileBuffer);
}

/**
 * Rename/backup a file in Bunny Storage (by downloading and re-uploading)
 */
async function backupFileInBunny(originalPath) {
  const ext = path.extname(originalPath);
  const nameWithoutExt = originalPath.replace(ext, '');
  const backupPath = `${nameWithoutExt}-original${ext}`;

  try {
    // Download original
    const tempPath = path.join(DOWNLOAD_DIR, 'temp-backup' + ext);
    await downloadFile(originalPath, tempPath);

    // Upload as backup
    await uploadFile(tempPath, backupPath);

    // Clean up temp file
    fs.unlinkSync(tempPath);

    return backupPath;
  } catch (error) {
    console.error(`  ⚠️  Could not backup ${originalPath}:`, error.message);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Bunny CDN Image Compression Script\n');
  console.log(`📁 Folder: ${FOLDER_TO_COMPRESS}`);
  console.log(`🖼️  Max size: ${MAX_WIDTH}x${MAX_HEIGHT}`);
  console.log(`⚙️  Quality: ${QUALITY}%\n`);

  if (!BUNNY_ACCESS_KEY || !BUNNY_STORAGE_ZONE) {
    console.error('❌ Missing Bunny credentials in .env.local');
    process.exit(1);
  }

  // Step 1: List all files (recursively)
  console.log('📋 Scanning folders recursively...');
  const files = await listFiles(FOLDER_TO_COMPRESS);
  console.log(`✅ Found ${files.length} files\n`);

  if (files.length === 0) {
    console.log('No files to process.');
    return;
  }

  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Step 2: Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file.ObjectName;
    const remotePath = file.FullPath;

    // Preserve folder structure locally
    const relativePath = remotePath.replace(`${FOLDER_TO_COMPRESS}/`, '');
    const originalLocalPath = path.join(ORIGINALS_DIR, relativePath);
    const compressedLocalPath = path.join(COMPRESSED_DIR, relativePath);

    // Create subdirectories if needed
    const originalDir = path.dirname(originalLocalPath);
    const compressedDir = path.dirname(compressedLocalPath);
    if (!fs.existsSync(originalDir)) fs.mkdirSync(originalDir, { recursive: true });
    if (!fs.existsSync(compressedDir)) fs.mkdirSync(compressedDir, { recursive: true });

    console.log(`[${i + 1}/${files.length}] ${relativePath}`);

    try {
      // Download original
      console.log('  📥 Downloading...');
      await downloadFile(remotePath, originalLocalPath);

      // Compress
      console.log('  🗜️  Compressing...');
      const result = await compressImage(originalLocalPath, compressedLocalPath);

      if (!result) {
        skippedCount++;
        continue;
      }

      totalOriginalSize += result.originalSize;
      totalCompressedSize += result.compressedSize;

      console.log(`  ✅ ${(result.originalSize / 1024).toFixed(1)}KB → ${(result.compressedSize / 1024).toFixed(1)}KB (${result.savings}% savings)`);

      // Only upload if there's significant savings
      if (result.savings > 5) {
        // Backup original in Bunny
        console.log('  💾 Backing up original...');
        await backupFileInBunny(remotePath);

        // Upload compressed version
        console.log('  📤 Uploading compressed version...');
        await uploadFile(compressedLocalPath, remotePath);
        console.log('  ✅ Uploaded!\n');
        processedCount++;
      } else {
        console.log(`  ⏭️  Skipped (minimal savings)\n`);
        skippedCount++;
      }

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Processed: ${processedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`💾 Total original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`🗜️  Total compressed size: ${(totalCompressedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`💰 Total savings: ${((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1)}%`);
  console.log('\n📁 Downloads saved to:');
  console.log(`   Originals: ${ORIGINALS_DIR}`);
  console.log(`   Compressed: ${COMPRESSED_DIR}`);
}

main().catch(console.error);
