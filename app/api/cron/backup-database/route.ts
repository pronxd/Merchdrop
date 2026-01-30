import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Increase timeout for backup operations (Vercel Pro allows up to 300s)
export const maxDuration = 60;

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'kassycakes';
const BUNNY_ACCESS_KEY = process.env.BUNNY_ACCESS_KEY;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME;
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL;
const CRON_SECRET = process.env.CRON_SECRET;

async function uploadToBunny(path: string, content: string): Promise<boolean> {
  if (!BUNNY_ACCESS_KEY || !BUNNY_STORAGE_ZONE || !BUNNY_HOSTNAME) {
    console.error('Bunny storage not configured');
    return false;
  }

  const uploadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${path}`;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'AccessKey': BUNNY_ACCESS_KEY,
      'Content-Type': 'application/json',
    },
    body: content,
  });

  if (!response.ok) {
    console.error(`Failed to upload ${path}:`, await response.text());
    return false;
  }

  return true;
}

export async function GET(req: NextRequest) {
  try {
    // Optional security check
    const authHeader = req.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!MONGODB_URI) {
      return NextResponse.json({ error: 'MONGODB_URI not configured' }, { status: 500 });
    }

    if (!BUNNY_ACCESS_KEY || !BUNNY_STORAGE_ZONE || !BUNNY_HOSTNAME) {
      return NextResponse.json({ error: 'Bunny storage not configured' }, { status: 500 });
    }

    // Create timestamp for backup folder
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = `backups/${timestamp}`;

    console.log('🔌 Connecting to MongoDB...');
    const client = new MongoClient(MONGODB_URI);

    try {
      await client.connect();
      console.log('✅ Connected to MongoDB');

      const db = client.db(DB_NAME);
      const collections = await db.listCollections().toArray();

      console.log(`📦 Found ${collections.length} collections to backup`);

      const results: { collection: string; documents: number; uploaded: boolean }[] = [];
      let totalDocuments = 0;

      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        const collection = db.collection(collectionName);

        // Get all documents
        const documents = await collection.find({}).toArray();
        totalDocuments += documents.length;

        // Upload to Bunny
        const filePath = `${backupPath}/${collectionName}.json`;
        const uploaded = await uploadToBunny(filePath, JSON.stringify(documents, null, 2));

        results.push({
          collection: collectionName,
          documents: documents.length,
          uploaded
        });

        console.log(`${uploaded ? '✅' : '❌'} ${collectionName}: ${documents.length} documents`);
      }

      // Create and upload metadata
      const metadata = {
        backupDate: now.toISOString(),
        database: DB_NAME,
        collections: collections.map(c => c.name),
        totalDocuments,
        results
      };

      const metadataUploaded = await uploadToBunny(
        `${backupPath}/_metadata.json`,
        JSON.stringify(metadata, null, 2)
      );

      await client.close();

      const allUploaded = results.every(r => r.uploaded) && metadataUploaded;
      const backupUrl = `${BUNNY_CDN_URL}/${backupPath}`;

      console.log('='.repeat(50));
      console.log(allUploaded ? '✅ BACKUP COMPLETE' : '⚠️ BACKUP COMPLETED WITH ERRORS');
      console.log(`📁 Location: ${backupUrl}`);
      console.log(`📊 Total documents: ${totalDocuments}`);
      console.log('='.repeat(50));

      return NextResponse.json({
        success: allUploaded,
        message: allUploaded ? 'Backup completed successfully' : 'Backup completed with some errors',
        backupPath,
        backupUrl,
        timestamp: now.toISOString(),
        totalDocuments,
        collections: results
      });

    } finally {
      await client.close();
    }

  } catch (error) {
    console.error('❌ Backup failed:', error);
    return NextResponse.json(
      { error: 'Backup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for Vercel Cron
export async function POST(req: NextRequest) {
  return GET(req);
}
