import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDb } from '@/lib/mongodb';

// Lazy initialize Stripe to avoid build-time errors when env vars aren't available
let stripe: Stripe | null = null;
function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_STUDIO_SECRET_KEY!, {
      apiVersion: '2025-10-29.clover'
    });
  }
  return stripe;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (process.env.STRIPE_STUDIO_WEBHOOK_SECRET && signature) {
      event = getStripe().webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_STUDIO_WEBHOOK_SECRET
      );
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Check if this is a wallet top-up
    if (session.metadata?.type === 'wallet_topup') {
      const email = session.metadata.email?.toLowerCase();
      const amount = parseFloat(session.metadata.amount);

      console.log(`💰 Wallet top-up: ${email} +$${amount}`);

      try {
        const db = await getDb();

        await db.collection('wallets').updateOne(
          { email },
          {
            $inc: { balance: amount },
            $set: { updatedAt: new Date() },
            $push: {
              transactions: {
                type: 'credit',
                amount: amount,
                description: `Added $${amount} via Stripe`,
                stripeSessionId: session.id,
                date: new Date()
              }
            } as any
          },
          { upsert: true }
        );

        console.log(`✅ Wallet credited: ${email} now has +$${amount}`);
      } catch (dbError) {
        console.error('Failed to credit wallet:', dbError);
      }
    }
  }

  return NextResponse.json({ received: true });
}
