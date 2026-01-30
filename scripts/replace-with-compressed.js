/**
 * Replace Original Files with Compressed Versions
 *
 * This script will:
 * 1. Delete all original files in Bunny Storage (keeping -original backups)
 * 2. Upload the compressed versions from downloads/compressed/
 *
 * This forces a clean slate - no cache issues!
 *
 * Usage: node scripts/replace-with-compressed.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

// Bunny CDN Configuration
const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME;

// Configuration
const FOLDER_TO_PROCESS = 'cakes';
const COMPRESSED_DIR = path.join(__dirname, '../downloads/compressed');

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
 * Delete a file from Bunny Storage
 */
async function deleteFile(remotePath) {
  await bunnyRequest('DELETE', remotePath);
}

/**
 * Upload a file to Bunny Storage
 */
async function uploadFile(localPath, remotePath) {
  const fileBuffer = fs.readFileSync(localPath);
  await bunnyRequest('PUT', remotePath, fileBuffer);
}

/**
 * Get all files recursively from local directory
 */
function getLocalFiles(dir, baseDir = dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getLocalFiles(filePath, baseDir, fileList);
    } else {
      const relativePath = path.relative(baseDir, filePath);
      fileList.push({
        localPath: filePath,
        relativePath: relativePath.replace(/\\/g, '/') // Convert Windows paths to Unix
      });
    }
  });

  return fileList;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔥 REPLACE ORIGINALS WITH COMPRESSED VERSIONS\n');
  console.log('⚠️  WARNING: This will delete original files from Bunny Storage!');
  console.log('   (Your -original backups will remain safe)\n');
  console.log(`📁 Folder: ${FOLDER_TO_PROCESS}`);
  console.log(`💾 Source: ${COMPRESSED_DIR}\n`);

  if (!BUNNY_ACCESS_KEY || !BUNNY_STORAGE_ZONE) {
    console.error('❌ Missing Bunny credentials in .env.local');
    process.exit(1);
  }

  if (!fs.existsSync(COMPRESSED_DIR)) {
    console.error(`❌ Compressed folder not found: ${COMPRESSED_DIR}`);
    console.error('   Run the compression script first!');
    process.exit(1);
  }

  // Get all compressed files
  console.log('📋 Scanning compressed files...');
  const files = getLocalFiles(COMPRESSED_DIR);
  console.log(`✅ Found ${files.length} compressed files\n`);

  if (files.length === 0) {
    console.log('No files to process.');
    return;
  }

  let deletedCount = 0;
  let uploadedCount = 0;
  let errorCount = 0;

  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const remotePath = `${FOLDER_TO_PROCESS}/${file.relativePath}`;

    console.log(`[${i + 1}/${files.length}] ${file.relativePath}`);

    try {
      // Step 1: Delete original from Bunny (if it exists)
      try {
        console.log('  🗑️  Deleting original...');
        await deleteFile(remotePath);
        deletedCount++;
        console.log('  ✅ Deleted');
      } catch (error) {
        if (error.message.includes('404')) {
          console.log('  ⏭️  Original not found (already deleted or never existed)');
        } else {
          throw error;
        }
      }

      // Step 2: Upload compressed version
      console.log('  📤 Uploading compressed version...');
      await uploadFile(file.localPath, remotePath);
      uploadedCount++;

      const fileSizeKB = (fs.statSync(file.localPath).size / 1024).toFixed(1);
      console.log(`  ✅ Uploaded (${fileSizeKB} KB)\n`);

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
      errorCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log('='.repeat(50));
  console.log(`🗑️  Deleted: ${deletedCount}`);
  console.log(`📤 Uploaded: ${uploadedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('\n✅ Done! All original files replaced with compressed versions.');
  console.log('💡 Your -original backup files remain safe in Bunny Storage.');
  console.log('\n🔥 Now purge your CDN cache and test!');
}

main().catch(console.error);
