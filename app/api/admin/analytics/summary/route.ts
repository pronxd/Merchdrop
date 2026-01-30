import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

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

    const { analyticsData } = await request.json();

    if (!analyticsData) {
      return NextResponse.json(
        { error: "Analytics data required" },
        { status: 400 }
      );
    }

    // Build terminal-style analytics prompt
    const systemPrompt = `You are an AI analytics assistant with a terminal/hacker aesthetic. Your job is to analyze e-commerce analytics data and provide concise, insightful summaries with a retro command-line vibe.

PERSONALITY:
- Old-school terminal/hacker aesthetic (think green-on-black CRT monitors)
- Concise and data-driven, but with personality
- Use ASCII art sparingly (only when it enhances readability)
- Speak in short, punchy sentences
- Mix tech jargon with business insights

IMPORTANT RULES:
- Keep the ENTIRE response under 200 words
- Focus on actionable insights, not just raw numbers
- Highlight anomalies, trends, and opportunities
- Use this structure:
  1. Opening line (set the mood, reference the data)
  2. Key metrics (2-3 most important stats)
  3. Notable trends or insights (what's interesting?)
  4. Quick recommendation or observation
- Use terminal-style formatting like:
  > arrows for callouts
  → for insights
  ✓ for positive trends
  ✗ for concerns

EXAMPLE TONE:
">> ANALYTICS SCAN COMPLETE
Traffic up 23% from last week → customers are finding you
Top product: 'Celestial Cake' with 47 views → push this on socials
✓ 2 new orders today, avg order value holding steady at $175
→ Weekend traffic spikes suggest scheduling IG posts for Fri-Sat"

Now analyze the following data and give Kassy a terminal-style summary:`;

    const userPrompt = `CURRENT ANALYTICS DATA:

TRAFFIC:
- Page views: ${analyticsData.pageviews?.value || 0}
- Visitors: ${analyticsData.visitors?.value || 0}
- Active visitors right now: ${analyticsData.activeVisitors || 0}

SALES:
- Orders today: ${analyticsData.salesAnalytics?.todaysOrders || 0}
- Total revenue: $${analyticsData.salesAnalytics?.totalRevenue?.toFixed(2) || 0}
- Total orders: ${analyticsData.salesAnalytics?.totalOrders || 0}
- Avg order value: $${analyticsData.salesAnalytics?.averageOrderValue?.toFixed(2) || 0}

TOP PAGES:
${analyticsData.topPages?.slice(0, 3).map((p: any) => `- ${p.page}: ${p.views} views`).join('\n') || 'No data'}

TRENDING CAKES:
${analyticsData.productAnalytics?.productViews?.slice(0, 3).map((p: any) => `- ${p.product}: ${p.views} views`).join('\n') || 'No trending data'}

TRAFFIC SOURCES:
${analyticsData.topReferrers?.slice(0, 3).map((r: any) => `- ${r.referrer}: ${r.count} visits`).join('\n') || 'No referrer data'}

TOP COUNTRIES:
${analyticsData.countries?.slice(0, 3).map((c: any) => `- ${c.country}: ${c.visitors} visitors`).join('\n') || 'No location data'}

CART ACTIVITY:
- Items added to cart: ${analyticsData.cartAnalytics?.addToCart || 0}
- Checkouts started: ${analyticsData.cartAnalytics?.checkoutStarted || 0}

Generate a concise, terminal-style analytics summary for Kassy. Make it insightful and actionable!`;

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
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Grok API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate summary' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || 'Unable to generate summary';

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Analytics summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate analytics summary" },
      { status: 500 }
    );
  }
}
