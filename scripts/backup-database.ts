/**
 * MongoDB Backup Script
 * Run with: npx tsx scripts/backup-database.ts
 *
 * Creates JSON backups of all collections in the backups/ folder
 */

import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB;

async function backupDatabase() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  if (!DB_NAME) {
    console.error('❌ MONGODB_DB not found in .env.local');
    process.exit(1);
  }

  // Create backups directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(process.cwd(), 'backups', timestamp);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('🔌 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Get all collection names
    const collections = await db.listCollections().toArray();

    console.log(`📊 Database: ${DB_NAME}`);
    console.log(`📁 Backup folder: ${backupDir}`);
    console.log(`📦 Collections found: ${collections.length}\n`);

    let totalDocuments = 0;

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);

      // Get all documents from the collection
      const documents = await collection.find({}).toArray();

      // Write to JSON file
      const filePath = path.join(backupDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));

      console.log(`✅ ${collectionName}: ${documents.length} documents`);
      totalDocuments += documents.length;
    }

    // Create a metadata file
    const metadata = {
      backupDate: new Date().toISOString(),
      database: DB_NAME,
      collections: collections.map(c => c.name),
      totalDocuments,
    };
    fs.writeFileSync(
      path.join(backupDir, '_metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('\n' + '='.repeat(50));
    console.log('✅ BACKUP COMPLETE');
    console.log('='.repeat(50));
    console.log(`📁 Location: ${backupDir}`);
    console.log(`📊 Total documents backed up: ${totalDocuments}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

backupDatabase();
