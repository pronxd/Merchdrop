import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isDevUser } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// GET - Get user's wallet balance
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email.toLowerCase();
    const db = await getDb();
    const trialAmount = 1.00;

    // Use findOneAndUpdate with upsert - $setOnInsert only applies on INSERT (new wallet)
    // returnDocument: 'before' returns null if document didn't exist (was just created)
    const beforeDoc = await db.collection('wallets').findOneAndUpdate(
      { email: userEmail },
      {
        $setOnInsert: {
          email: userEmail,
          balance: trialAmount,
          trialCredited: true,
          createdAt: new Date(),
          transactions: [{
            type: 'trial',
            amount: trialAmount,
            description: 'Free trial credit',
            date: new Date()
          }]
        },
        $set: { updatedAt: new Date() }
      },
      { upsert: true, returnDocument: 'before' }
    );

    // If beforeDoc is null, the wallet was just created (this is a new trial)
    const newTrial = beforeDoc === null;

    // Fetch current wallet state
    const wallet = await db.collection('wallets').findOne({ email: userEmail });
    const balance = wallet?.balance || 0;

    // Check if user has dev privileges
    const isDev = await isDevUser();

    return NextResponse.json({
      success: true,
      balance,
      email: session.user.email,
      isDev,
      newTrial
    });

  } catch (error) {
    console.error('Wallet GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Deduct from wallet (called after successful edit)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email.toLowerCase();
    const { amount, description } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const db = await getDb();

    // Get current balance
    const wallet = await db.collection('wallets').findOne({
      email: userEmail
    });

    const currentBalance = wallet?.balance || 0;

    if (currentBalance < amount) {
      return NextResponse.json({
        error: 'Insufficient balance',
        balance: currentBalance
      }, { status: 400 });
    }

    // Deduct amount
    const newBalance = currentBalance - amount;

    await db.collection('wallets').updateOne(
      { email: userEmail },
      {
        $set: {
          balance: newBalance,
          updatedAt: new Date()
        },
        $push: {
          transactions: {
            type: 'debit',
            amount: amount,
            description: description || 'Studio edit',
            date: new Date()
          }
        } as any
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      balance: newBalance
    });

  } catch (error) {
    console.error('Wallet POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
