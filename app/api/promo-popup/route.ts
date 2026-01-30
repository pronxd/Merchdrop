import { NextResponse } from 'next/server';
import { getActivePopupPromo, getPromoPopupSettings, getDiscountCodeById } from '@/lib/discount-codes-db';

// GET - Get active promo popup info (public endpoint for frontend popup)
export async function GET() {
  try {
    // Debug: Log the settings
    const settings = await getPromoPopupSettings();
    console.log('🎯 Promo popup settings:', settings);

    if (settings?.discountCodeId) {
      const code = await getDiscountCodeById(settings.discountCodeId);
      console.log('🏷️ Linked discount code:', code);
    }

    const promo = await getActivePopupPromo();
    console.log('📢 Active promo result:', promo);

    if (!promo || !promo.enabled) {
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({
      enabled: true,
      code: promo.code,
      percentage: promo.percentage,
      customMessage: promo.customMessage
    });

  } catch (error) {
    console.error('Error fetching promo popup:', error);
    return NextResponse.json({ enabled: false });
  }
}
