import { NextRequest, NextResponse } from 'next/server';
import { validateDiscountCode } from '@/lib/discount-codes-db';

// POST - Validate a discount code (public endpoint for cart)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'No code provided' },
        { status: 400 }
      );
    }

    const result = await validateDiscountCode(code.trim());

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        error: result.error
      });
    }

    // Return the discount info without exposing internal IDs
    return NextResponse.json({
      valid: true,
      code: result.discountCode!.code,
      percentage: result.discountCode!.percentage
    });

  } catch (error) {
    console.error('Error validating discount code:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate code' },
      { status: 500 }
    );
  }
}
