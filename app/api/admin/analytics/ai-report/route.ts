import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

// Cost calculation for Grok (same as chat route)
function calculateCost(usage: any): { cost: number; details: string } {
  const inputTokens = usage?.prompt_tokens || 0;
  const cachedTokens = usage?.prompt_tokens_details?.cached_tokens || 0;
  const outputTokens = usage?.completion_tokens || 0;

  // Grok pricing: input $0.20/1M, cached $0.05/1M, output $0.50/1M
  const uncachedInput = inputTokens - cachedTokens;
  const cost = (uncachedInput * 0.20 / 1000000) + (cachedTokens * 0.05 / 1000000) + (outputTokens * 0.50 / 1000000);

  const details = `Input: ${inputTokens} tokens (${cachedTokens} cached), Output: ${outputTokens} tokens`;

  return { cost, details };
}

// GET - Fetch the last saved report for the specified month
export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: "2026-01"

    const reportsCollection = await getCollection('aiReports');

    // Find report for the specified month, or latest if no month specified
    const query = month ? { month } : {};
    const lastReport = await reportsCollection.findOne(
      query,
      { sort: { createdAt: -1 } }
    );

    if (!lastReport) {
      return NextResponse.json({ report: null });
    }

    return NextResponse.json({
      report: lastReport.report,
      abandonedCarts: lastReport.abandonedCarts,
      cost: lastReport.cost,
      dateRange: lastReport.dateRange,
      month: lastReport.month,
      createdAt: lastReport.createdAt,
    });
  } catch (error) {
    console.error("Error fetching last report:", error);
    return NextResponse.json(
      { error: "Failed to fetch last report" },
      { status: 500 }
    );
  }
}

// POST - Generate a new report
export async function POST(request: NextRequest) {
  try {
    // Check auth
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!XAI_API_KEY) {
      return NextResponse.json(
        { error: "XAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { analyticsData, dateRange, month } = await request.json();

    if (!analyticsData) {
      return NextResponse.json(
        { error: "Analytics data required" },
        { status: 400 }
      );
    }

    // Fetch ALL abandoned carts from tempCheckouts (no limit)
    let abandonedCarts: any[] = [];
    let abandonedCartsValue = 0;
    try {
      const tempCheckoutsCollection = await getCollection('tempCheckouts');
      const now = new Date();

      // Get all temp checkouts (these are potential abandoned carts)
      // Sessions older than 1 hour are likely abandoned
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      abandonedCarts = await tempCheckoutsCollection.find({
        createdAt: { $lt: oneHourAgo }
      }).sort({ createdAt: -1 }).toArray();

      // Calculate total value of abandoned carts
      abandonedCarts.forEach((cart: any) => {
        if (cart.cartItems && Array.isArray(cart.cartItems)) {
          cart.cartItems.forEach((item: any) => {
            const addOnsTotal = item.addOns?.reduce((sum: number, a: any) => sum + (a.price || 0), 0) || 0;
            abandonedCartsValue += (item.price + addOnsTotal) * (item.quantity || 1);
          });
        }
      });
    } catch (dbError) {
      console.error('Error fetching abandoned carts:', dbError);
    }

    // Build comprehensive analytics context for AI
    // Calculate actual date range - use month if provided, otherwise use dateRange preset
    let startDate: Date;
    let endDate: Date;
    let dateRangeLabel: string;

    if (month) {
      // Month-based: "2026-01" format
      const [year, monthNum] = month.split('-').map(Number);
      startDate = new Date(year, monthNum - 1, 1);
      endDate = new Date(year, monthNum, 0, 23, 59, 59); // Last day of month
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      dateRangeLabel = `${monthNames[monthNum - 1]} ${year}`;
    } else {
      // Preset date range
      endDate = new Date();
      startDate = new Date();
      switch (dateRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }
      dateRangeLabel = dateRange === '24h' ? 'Last 24 Hours' :
                       dateRange === '7d' ? 'Last 7 Days' :
                       dateRange === '30d' ? 'Last 30 Days' : 'Last 90 Days';
    }

    // Format dates nicely (e.g., "Jan 1 - Jan 31, 2026")
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    const year = endDate.getFullYear();
    const dateRangeStr = `${startDateStr} - ${endDateStr}, ${year}`;

    // Calculate previous period dates for comparison (previous month if using month mode)
    let prevStartDate: Date;
    let prevEndDate: Date;
    if (month) {
      const [yearNum, monthNum] = month.split('-').map(Number);
      prevEndDate = new Date(yearNum, monthNum - 1, 0, 23, 59, 59); // Last day of previous month
      prevStartDate = new Date(yearNum, monthNum - 2, 1); // First day of previous month
    } else {
      const periodLength = endDate.getTime() - startDate.getTime();
      prevEndDate = new Date(startDate.getTime() - 1); // Day before current period
      prevStartDate = new Date(prevEndDate.getTime() - periodLength);
    }
    const prevDateRangeStr = `${formatDate(prevStartDate)} - ${formatDate(prevEndDate)}`;

    const systemPrompt = `Generate a concise, data-focused analytics report. NO fluff, NO conversational tone, NO emojis, NO greetings, NO cheerleading. Just clean data and brief insights.

STYLE:
- Bullet points only
- Numbers and percentages
- Short phrases, not sentences
- No filler words or enthusiasm
- Professional and direct

BUSINESS CONTEXT:
- Based in Kyle, TX - delivers within 50 miles only ($40 fee)
- No shipping - local pickup/delivery only
- Only Austin metro visitors can order (Kyle, Austin, Round Rock, Cedar Park, San Marcos, Buda, Pflugerville, Georgetown, Leander, etc.)
- Out-of-state/international = cannot order

FORMAT:
## Summary (include date range in header)
[2-3 bullet points with key numbers]

## Traffic
[Bullet points: visits, visitors, top sources, devices]

## Local Reach
[Bullet points: Austin-area visitors only, list cities with counts]

## Products
[Bullet points: top viewed, top selling with revenue]

## Revenue (include date range in header, e.g., "Revenue: Jan 16 - Jan 23")
[Bullet points: total, orders, AOV, today's numbers - ALWAYS mention the specific dates]

## Abandoned Carts
[Bullet points: count, value, notable patterns]

## Action Items
[3-4 specific actions, no fluff]`;

    // Format all analytics data comprehensively
    const userPrompt = `Generate a comprehensive analytics report for this online store.

**TIME PERIOD:** ${dateRangeLabel} (${dateRangeStr})

═══════════════════════════════════════════════════════
TRAFFIC METRICS
═══════════════════════════════════════════════════════
• Total Visits: ${analyticsData.visits?.value || 0} (${analyticsData.visits?.change > 0 ? '+' : ''}${analyticsData.visits?.change?.toFixed(1) || 0}% vs previous period)
• Unique Visitors: ${analyticsData.visitors?.value || 0} (${analyticsData.visitors?.change > 0 ? '+' : ''}${analyticsData.visitors?.change?.toFixed(1) || 0}% vs previous period)
• Page Views: ${analyticsData.pageviews?.value || 0} (${analyticsData.pageviews?.change > 0 ? '+' : ''}${analyticsData.pageviews?.change?.toFixed(1) || 0}% vs previous period)
• Average Visit Duration: ${analyticsData.avgVisitTime?.value || '0m'}
• Bounce Rate: ${analyticsData.bounceRate?.value || 0}%

═══════════════════════════════════════════════════════
TOP PAGES (Most Viewed)
═══════════════════════════════════════════════════════
${analyticsData.topPages?.slice(0, 10).map((p: any, i: number) => `${i + 1}. ${p.page}: ${p.views} views`).join('\n') || 'No page data available'}

═══════════════════════════════════════════════════════
TRAFFIC SOURCES (Referrers)
═══════════════════════════════════════════════════════
${analyticsData.topReferrers?.slice(0, 10).map((r: any, i: number) => `${i + 1}. ${r.referrer || 'Direct'}: ${r.count} visits`).join('\n') || 'No referrer data available'}

═══════════════════════════════════════════════════════
TOP COUNTRIES (Remember: Only US/Texas visitors can order!)
═══════════════════════════════════════════════════════
${analyticsData.countries?.slice(0, 10).map((c: any, i: number) => `${i + 1}. ${c.countryFlag || ''} ${c.country}: ${c.visitors} visitors ${c.country !== 'US' ? '(CANNOT ORDER - outside delivery area)' : ''}`).join('\n') || 'No country data available'}

═══════════════════════════════════════════════════════
TOP CITIES (delivery within 50mi of Kyle, TX only!)
═══════════════════════════════════════════════════════
Local Austin Metro (CAN ORDER):
${(() => {
  const localCities = ['Kyle', 'Austin', 'Round Rock', 'Cedar Park', 'San Marcos', 'Buda', 'Pflugerville', 'Georgetown', 'Leander', 'Dripping Springs', 'Bastrop', 'Lockhart', 'New Braunfels', 'San Antonio', 'Lakeway', 'Bee Cave', 'Manor', 'Hutto', 'Taylor', 'Elgin', 'Wimberley', 'Jarrell', 'Liberty Hill', 'Florence', 'Bertram', 'Burnet', 'Marble Falls', 'Spicewood', 'Lago Vista', 'Jonestown', 'Point Venture', 'Volente'];
  const local = analyticsData.cities?.filter((c: any) => localCities.some(lc => c.city?.toLowerCase().includes(lc.toLowerCase()))) || [];
  return local.length > 0 ? local.map((c: any, i: number) => `  ${i + 1}. ${c.city}: ${c.visitors} visitors ✓`).join('\n') : '  No local city data';
})()}

Outside Delivery Area (CANNOT ORDER):
${(() => {
  const localCities = ['Kyle', 'Austin', 'Round Rock', 'Cedar Park', 'San Marcos', 'Buda', 'Pflugerville', 'Georgetown', 'Leander', 'Dripping Springs', 'Bastrop', 'Lockhart', 'New Braunfels', 'San Antonio', 'Lakeway', 'Bee Cave', 'Manor', 'Hutto', 'Taylor', 'Elgin', 'Wimberley', 'Jarrell', 'Liberty Hill', 'Florence', 'Bertram', 'Burnet', 'Marble Falls', 'Spicewood', 'Lago Vista', 'Jonestown', 'Point Venture', 'Volente'];
  const nonLocal = analyticsData.cities?.filter((c: any) => !localCities.some(lc => c.city?.toLowerCase().includes(lc.toLowerCase()))) || [];
  return nonLocal.length > 0 ? nonLocal.slice(0, 5).map((c: any, i: number) => `  ${i + 1}. ${c.city}: ${c.visitors} visitors ✗`).join('\n') : '  No non-local city data';
})()}

═══════════════════════════════════════════════════════
DEVICE BREAKDOWN
═══════════════════════════════════════════════════════
• Desktop: ${analyticsData.devices?.desktop || 0} visitors (${analyticsData.devices ? ((analyticsData.devices.desktop / (analyticsData.devices.desktop + analyticsData.devices.mobile + analyticsData.devices.tablet || 1)) * 100).toFixed(1) : 0}%)
• Mobile: ${analyticsData.devices?.mobile || 0} visitors (${analyticsData.devices ? ((analyticsData.devices.mobile / (analyticsData.devices.desktop + analyticsData.devices.mobile + analyticsData.devices.tablet || 1)) * 100).toFixed(1) : 0}%)
• Tablet: ${analyticsData.devices?.tablet || 0} visitors (${analyticsData.devices ? ((analyticsData.devices.tablet / (analyticsData.devices.desktop + analyticsData.devices.mobile + analyticsData.devices.tablet || 1)) * 100).toFixed(1) : 0}%)

═══════════════════════════════════════════════════════
TRENDING PRODUCTS (Most Viewed Products)
═══════════════════════════════════════════════════════
${analyticsData.productAnalytics?.productViews?.slice(0, 10).map((p: any, i: number) => `${i + 1}. ${p.product}: ${p.views} views`).join('\n') || 'No trending products data'}

═══════════════════════════════════════════════════════
SALES & REVENUE
═══════════════════════════════════════════════════════
• Total Revenue: $${analyticsData.salesAnalytics?.totalRevenue?.toFixed(2) || '0.00'}
• Total Orders: ${analyticsData.salesAnalytics?.totalOrders || 0}
• Average Order Value: $${analyticsData.salesAnalytics?.averageOrderValue?.toFixed(2) || '0.00'}
• Today's Orders: ${analyticsData.salesAnalytics?.todaysOrders || 0}
• Today's Revenue: $${analyticsData.salesAnalytics?.todaysRevenue?.toFixed(2) || '0.00'}

Period Comparison:
• Current Period (${dateRangeStr}): $${analyticsData.salesAnalytics?.periodComparison?.current?.revenue?.toFixed(2) || '0.00'} (${analyticsData.salesAnalytics?.periodComparison?.current?.orders || 0} orders)
• Previous Period (${prevDateRangeStr}): $${analyticsData.salesAnalytics?.periodComparison?.previous?.revenue?.toFixed(2) || '0.00'} (${analyticsData.salesAnalytics?.periodComparison?.previous?.orders || 0} orders)
• Revenue Change: ${analyticsData.salesAnalytics?.periodComparison?.revenueChange?.toFixed(1) || 0}%
• Orders Change: ${analyticsData.salesAnalytics?.periodComparison?.ordersChange?.toFixed(1) || 0}%

Day-of-Week Patterns:
${analyticsData.salesAnalytics?.dayOfWeekStats?.map((d: any) => `• ${d.dayName}: $${d.revenue?.toFixed(2) || '0.00'} (${d.orders} orders)`).join('\n') || 'No day patterns available'}

Best Day: ${analyticsData.salesAnalytics?.insights?.bestDay || 'N/A'} ($${analyticsData.salesAnalytics?.insights?.bestDayRevenue?.toFixed(2) || '0.00'}, ${analyticsData.salesAnalytics?.insights?.bestDayOrders || 0} orders)
Slowest Day: ${analyticsData.salesAnalytics?.insights?.worstDay || 'N/A'} ($${analyticsData.salesAnalytics?.insights?.worstDayRevenue?.toFixed(2) || '0.00'})
Avg Revenue/Day: $${analyticsData.salesAnalytics?.insights?.avgRevenuePerDay?.toFixed(2) || '0.00'}

Recent Daily Breakdown:
${analyticsData.salesAnalytics?.dailyBreakdown?.slice(0, 7).map((d: any) => `• ${d.date}: $${d.revenue?.toFixed(2) || '0.00'} (${d.orders} orders)`).join('\n') || 'No daily data'}

Top Selling Products:
${analyticsData.salesAnalytics?.topProducts?.slice(0, 5).map((p: any, i: number) => `${i + 1}. ${p.product}: $${p.revenue?.toFixed(2) || 0} (${p.quantity} sold)`).join('\n') || 'No sales data yet'}

═══════════════════════════════════════════════════════
CART ACTIVITY
═══════════════════════════════════════════════════════
• Items Added to Cart: ${analyticsData.cartAnalytics?.addToCart || 0}
• Items Removed from Cart: ${analyticsData.cartAnalytics?.removeFromCart || 0}
• Checkouts Started: ${analyticsData.cartAnalytics?.checkoutStarted || 0}

Popular Add-ons:
${analyticsData.cartAnalytics?.popularAddOns?.slice(0, 5).map((a: any, i: number) => `${i + 1}. ${a.name}: ${a.count} times`).join('\n') || 'No add-on data'}

═══════════════════════════════════════════════════════
ABANDONED CARTS (Potential Lost Sales)
═══════════════════════════════════════════════════════
• Abandoned Checkouts: ${abandonedCarts.length}
• Estimated Lost Revenue: $${abandonedCartsValue.toFixed(2)}

Recent Abandoned Carts:
${abandonedCarts.slice(0, 5).map((cart: any, i: number) => {
  const items = cart.cartItems?.map((item: any) => item.name).join(', ') || 'Unknown items';
  const customerName = cart.customerInfo?.name || 'Unknown';
  const customerEmail = cart.customerInfo?.email || 'No email';
  const abandonedAgo = Math.round((Date.now() - new Date(cart.createdAt).getTime()) / (1000 * 60 * 60));
  return `${i + 1}. ${customerName} (${customerEmail}) - ${items} - Abandoned ${abandonedAgo}h ago`;
}).join('\n') || 'No abandoned carts found'}

═══════════════════════════════════════════════════════
RECENT VISITORS (Sample)
═══════════════════════════════════════════════════════
${analyticsData.recentVisitors?.slice(0, 5).map((v: any, i: number) => {
  const location = [v.city, v.state, v.country].filter(Boolean).join(', ');
  return `${i + 1}. ${location || 'Unknown'} - ${v.device} / ${v.browser} - ${v.pageviews} pages viewed`;
}).join('\n') || 'No recent visitor data'}

═══════════════════════════════════════════════════════

Generate a clean, data-focused report. Bullet points only. No fluff.`;

    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4-fast-non-reasoning',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Grok API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate report' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content || 'Unable to generate report';

    // Calculate cost
    const { cost, details } = calculateCost(data.usage);
    console.log(`📊 AI Report Cost: $${cost.toFixed(6)} | ${details}`);

    // Prepare abandoned carts data (ALL carts, not limited)
    const abandonedCartsData = {
      count: abandonedCarts.length,
      value: abandonedCartsValue,
      carts: abandonedCarts.map((cart: any) => ({
        customerName: cart.customerInfo?.name || 'Unknown',
        customerEmail: cart.customerInfo?.email || '',
        customerPhone: cart.customerInfo?.phone || '',
        items: cart.cartItems?.map((item: any) => ({
          name: item.name,
          price: item.price,
          size: item.size,
          quantity: item.quantity
        })) || [],
        createdAt: cart.createdAt,
        hoursAgo: Math.round((Date.now() - new Date(cart.createdAt).getTime()) / (1000 * 60 * 60))
      }))
    };

    // Save report to database
    try {
      const reportsCollection = await getCollection('aiReports');
      await reportsCollection.insertOne({
        report,
        abandonedCarts: abandonedCartsData,
        cost: {
          amount: cost,
          details,
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens || 0,
        },
        dateRange,
        dateRangeLabel,
        month: month || null,
        createdAt: new Date(),
      });
      console.log('✅ AI Report saved to database');
    } catch (dbError) {
      console.error('Failed to save report to database:', dbError);
      // Continue even if save fails
    }

    return NextResponse.json({
      report,
      abandonedCarts: abandonedCartsData,
      cost: {
        amount: cost,
        details,
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens || 0,
      },
      dateRange,
      month: month || null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("AI Report error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI report" },
      { status: 500 }
    );
  }
}
