/**
 * MongoDB Restore Script
 * Run with: npx tsx scripts/restore-database.ts [backup-folder-name]
 *
 * Example: npx tsx scripts/restore-database.ts 2025-12-03T15-30-00
 *
 * WARNING: This will REPLACE all data in the collections being restored!
 */

import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB;

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function restoreDatabase() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  if (!DB_NAME) {
    console.error('❌ MONGODB_DB not found in .env.local');
    process.exit(1);
  }

  // Get backup folder from command line argument
  const backupFolderName = process.argv[2];

  if (!backupFolderName) {
    // List available backups
    const backupsDir = path.join(process.cwd(), 'backups');
    if (fs.existsSync(backupsDir)) {
      const backups = fs.readdirSync(backupsDir).filter(f =>
        fs.statSync(path.join(backupsDir, f)).isDirectory()
      );
      console.log('\n📁 Available backups:');
      backups.forEach(b => console.log(`   - ${b}`));
      console.log('\n');
    }
    console.error('❌ Please specify a backup folder name');
    console.log('Usage: npx tsx scripts/restore-database.ts [backup-folder-name]');
    console.log('Example: npx tsx scripts/restore-database.ts 2025-12-03T15-30-00');
    process.exit(1);
  }

  const backupDir = path.join(process.cwd(), 'backups', backupFolderName);

  if (!fs.existsSync(backupDir)) {
    console.error(`❌ Backup folder not found: ${backupDir}`);
    process.exit(1);
  }

  // Read metadata
  const metadataPath = path.join(backupDir, '_metadata.json');
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    console.log('\n📊 Backup Info:');
    console.log(`   Date: ${metadata.backupDate}`);
    console.log(`   Database: ${metadata.database}`);
    console.log(`   Collections: ${metadata.collections.join(', ')}`);
    console.log(`   Total Documents: ${metadata.totalDocuments}`);
  }

  console.log('\n⚠️  WARNING: This will REPLACE all data in the restored collections!');
  const confirmed = await askConfirmation('Are you sure you want to continue? (yes/no): ');

  if (!confirmed) {
    console.log('❌ Restore cancelled');
    process.exit(0);
  }

  console.log('\n🔌 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Get all JSON files in backup folder
    const files = fs.readdirSync(backupDir).filter(f =>
      f.endsWith('.json') && f !== '_metadata.json'
    );

    let totalRestored = 0;

    for (const file of files) {
      const collectionName = file.replace('.json', '');
      const filePath = path.join(backupDir, file);

      // Read documents from JSON
      const documents = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      if (documents.length === 0) {
        console.log(`⏭️  ${collectionName}: empty, skipping`);
        continue;
      }

      const collection = db.collection(collectionName);

      // Drop existing collection and insert backup data
      await collection.deleteMany({});
      await collection.insertMany(documents);

      console.log(`✅ ${collectionName}: ${documents.length} documents restored`);
      totalRestored += documents.length;
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ RESTORE COMPLETE');
    console.log('='.repeat(50));
    console.log(`📊 Total documents restored: ${totalRestored}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

restoreDatabase();
