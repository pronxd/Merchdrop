/**
 * Delete all -original backup files from Bunny Storage
 *
 * This will delete all files ending with -original.jpg, -original.webp, etc.
 * Keeps only the compressed versions.
 *
 * Usage: node scripts/delete-originals.js
 */

const https = require('https');
require('dotenv').config({ path: '.env.local' });

const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME;

const FOLDER_TO_CLEAN = 'cakes';

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
      res.on('data', (chunk) => { data += chunk; });
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

async function listFiles(folderPath, allFiles = []) {
  try {
    const data = await bunnyRequest('GET', `${folderPath}/`);
    if (!Array.isArray(data)) return allFiles;

    for (const item of data) {
      if (item.IsDirectory) {
        const subFolderPath = `${folderPath}/${item.ObjectName}`;
        await listFiles(subFolderPath, allFiles);
      } else {
        allFiles.push({
          ...item,
          FullPath: `${folderPath}/${item.ObjectName}`
        });
      }
    }
    return allFiles;
  } catch (error) {
    console.error(`Error listing ${folderPath}:`, error.message);
    return allFiles;
  }
}

async function deleteFile(remotePath) {
  await bunnyRequest('DELETE', remotePath);
}

async function main() {
  console.log('🗑️  DELETE -ORIGINAL BACKUP FILES\n');
  console.log(`📁 Folder: ${FOLDER_TO_CLEAN}\n`);

  if (!BUNNY_ACCESS_KEY || !BUNNY_STORAGE_ZONE) {
    console.error('❌ Missing Bunny credentials');
    process.exit(1);
  }

  console.log('📋 Scanning for -original files...');
  const files = await listFiles(FOLDER_TO_CLEAN);
  const originalFiles = files.filter(f => f.ObjectName.includes('-original.'));

  console.log(`✅ Found ${originalFiles.length} -original files\n`);

  if (originalFiles.length === 0) {
    console.log('No -original files to delete.');
    return;
  }

  let deletedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < originalFiles.length; i++) {
    const file = originalFiles[i];
    const relativePath = file.FullPath.replace(`${FOLDER_TO_CLEAN}/`, '');

    console.log(`[${i + 1}/${originalFiles.length}] ${relativePath}`);

    try {
      await deleteFile(file.FullPath);
      console.log('  ✅ Deleted\n');
      deletedCount++;
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
      errorCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('='.repeat(50));
  console.log('📊 Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Deleted: ${deletedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('\n🗑️  All -original backup files removed!');
}

main().catch(console.error);
