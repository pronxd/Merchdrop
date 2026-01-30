import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    // Get IP address from request headers
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwarded?.split(",")[0] || realIp || "Unknown";

    // Get user agent and other info
    const userAgent = request.headers.get("user-agent") || "Unknown";

    // Parse request body for additional context
    const body = await request.json();
    const { pathname } = body;

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "kassycakes");
    const visitors = db.collection("visitor_sessions");

    // Check if this visitor already has a recent session (within last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existingSession = await visitors.findOne({
      ip,
      userAgent,
      lastSeen: { $gte: thirtyMinutesAgo },
    });

    if (existingSession) {
      // Update existing session
      await visitors.updateOne(
        { _id: existingSession._id },
        {
          $set: {
            lastSeen: new Date(),
            lastPage: pathname,
          },
          $inc: { pageviews: 1 },
          $push: {
            pages: {
              path: pathname,
              timestamp: new Date(),
            },
          } as any,
        }
      );
    } else {
      // Create new session
      await visitors.insertOne({
        ip,
        userAgent,
        firstSeen: new Date(),
        lastSeen: new Date(),
        lastPage: pathname,
        pageviews: 1,
        pages: [
          {
            path: pathname,
            timestamp: new Date(),
          },
        ],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Visitor tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track visitor" },
      { status: 500 }
    );
  }
}
