/**
 * Test Bunny CDN Connection
 *
 * This script verifies your Bunny CDN credentials and lists folders.
 * Run this before using the compression script to ensure everything is configured correctly.
 *
 * Usage: node scripts/test-bunny-connection.js
 */

const https = require('https');
require('dotenv').config({ path: '.env.local' });

const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME;
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL;

console.log('🔍 Testing Bunny CDN Connection\n');

// Check environment variables
console.log('📋 Configuration:');
console.log(`   Access Key: ${BUNNY_ACCESS_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   Storage Zone: ${BUNNY_STORAGE_ZONE || '❌ Missing'}`);
console.log(`   Hostname: ${BUNNY_HOSTNAME || '❌ Missing'}`);
console.log(`   CDN URL: ${BUNNY_CDN_URL || '❌ Missing'}\n`);

if (!BUNNY_ACCESS_KEY || !BUNNY_STORAGE_ZONE || !BUNNY_HOSTNAME) {
  console.error('❌ Missing required environment variables in .env.local\n');
  console.log('Required variables:');
  console.log('  BUNNY_ACCESS_KEY=your-access-key');
  console.log('  BUNNY_STORAGE_ZONE=your-zone-name');
  console.log('  BUNNY_HOSTNAME=storage.bunnycdn.com');
  console.log('  BUNNY_CDN_URL=https://your-cdn.b-cdn.net\n');
  process.exit(1);
}

// Test connection by listing root directory
console.log('🌐 Testing connection...\n');

const options = {
  hostname: BUNNY_HOSTNAME,
  path: `/${BUNNY_STORAGE_ZONE}/`,
  method: 'GET',
  headers: {
    'AccessKey': BUNNY_ACCESS_KEY,
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Connection successful!\n');

      try {
        const items = JSON.parse(data);
        const folders = items.filter(item => item.IsDirectory);

        if (folders.length > 0) {
          console.log(`📁 Found ${folders.length} folders:\n`);
          folders.forEach(folder => {
            console.log(`   📂 ${folder.ObjectName}`);
          });
          console.log('\n💡 Use one of these folder names in the compression script.');
        } else {
          console.log('No folders found in root directory.');
        }
      } catch (e) {
        console.log('✅ Connected but could not parse directory listing.');
      }

      console.log('\n🎉 You\'re ready to run the compression script!');
      console.log('   Run: npm run compress-images');

    } else {
      console.error(`❌ Connection failed with status ${res.statusCode}`);
      console.error(`Response: ${data}`);

      if (res.statusCode === 401) {
        console.error('\n💡 Hint: Check your BUNNY_ACCESS_KEY is correct');
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.error('\n💡 Check your BUNNY_HOSTNAME is correct (usually storage.bunnycdn.com)');
});

req.end();
