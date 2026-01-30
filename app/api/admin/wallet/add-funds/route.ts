import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await req.json();

    // Validate amount (in dollars)
    const validAmounts = [5, 10, 25, 50];
    if (!validAmounts.includes(amount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Create Stripe checkout session
    const checkoutSession = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Studio Credits - $${amount}`,
              description: `Add $${amount} to your Studio wallet for AI photo editing`,
            },
            unit_amount: amount * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/kassycakes/dashboard?tab=studio&wallet=success&amount=${amount}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/kassycakes/dashboard?tab=studio&wallet=cancelled`,
      customer_email: session.user.email,
      metadata: {
        type: 'wallet_topup',
        email: session.user.email.toLowerCase(),
        amount: amount.toString()
      }
    });

    return NextResponse.json({
      success: true,
      url: checkoutSession.url
    });

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create checkout session'
    }, { status: 500 });
  }
}
