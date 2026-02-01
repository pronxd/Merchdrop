import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");

    if (!orderNumber || !orderNumber.trim()) {
      return NextResponse.json(
        { error: "Order number is required" },
        { status: 400 }
      );
    }

    const bookings = await getCollection("bookings");
    const booking = await bookings.findOne({ orderNumber: orderNumber.trim() });

    if (!booking) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order: {
        orderNumber: booking.orderNumber,
        productName: booking.orderDetails?.productName,
        size: booking.orderDetails?.size,
        quantity: booking.orderDetails?.quantity,
        price: booking.orderDetails?.price,
        image: booking.orderDetails?.image,
        status: booking.status,
        orderDate: booking.orderDate,
      },
    });
  } catch (error) {
    console.error("Order lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
