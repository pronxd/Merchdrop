import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isDevUser } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// POST - Set wallet balance (dev users only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has dev privileges
    const isDev = await isDevUser();
    if (!isDev) {
      return NextResponse.json({ error: 'Dev access required' }, { status: 403 });
    }

    const { balance } = await req.json();

    if (typeof balance !== 'number' || balance < 0) {
      return NextResponse.json({ error: 'Invalid balance' }, { status: 400 });
    }

    const db = await getDb();
    const userEmail = session.user.email.toLowerCase();

    await db.collection('wallets').updateOne(
      { email: userEmail },
      {
        $set: {
          balance: balance,
          updatedAt: new Date()
        },
        $push: {
          transactions: {
            type: 'dev_set',
            amount: balance,
            description: `Dev: Set balance to $${balance.toFixed(2)}`,
            date: new Date()
          }
        } as any
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      balance: balance
    });

  } catch (error) {
    console.error('Set balance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
