import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Check auth
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const websiteId = process.env.UMAMI_WEBSITE_ID;
    const UMAMI_API_URL = process.env.UMAMI_API_URL || "https://censorly-analytics.vercel.app/api";
    const UMAMI_API_TOKEN = process.env.UMAMI_API_TOKEN;

    if (!websiteId || !UMAMI_API_TOKEN) {
      return NextResponse.json(
        { error: "Configuration error" },
        { status: 500 }
      );
    }

    // Fetch realtime data from Umami
    const response = await fetch(`${UMAMI_API_URL}/realtime/${websiteId}`, {
      headers: {
        "Authorization": `Bearer ${UMAMI_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Umami API error: ${response.statusText}`);
    }

    const realtimeData = await response.json();

    // Extract total visitors from realtime data
    const visitors = realtimeData?.totals?.visitors || 0;

    return NextResponse.json({ visitors });
  } catch (error) {
    console.error("Error fetching realtime data:", error);
    return NextResponse.json({ visitors: 0 });
  }
}
