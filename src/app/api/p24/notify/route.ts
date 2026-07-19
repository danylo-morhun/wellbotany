import { type NextRequest, NextResponse } from "next/server";
import { CRC, verifyTransaction } from "@/features/przelewy24/lib/client";
import { p24Sign } from "@/features/przelewy24/lib/sign";
import { pushOrderToBaselinker } from "@/lib/baselinker/orders";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/timing-safe-equal";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const {
    merchantId,
    posId,
    sessionId,
    amount,
    originAmount,
    currency,
    orderId,
    methodId,
    statement,
    sign,
  } = body as Record<string, unknown>;

  // Verify P24 signature
  const expected = p24Sign({
    merchantId,
    posId,
    sessionId,
    amount,
    originAmount,
    currency,
    orderId,
    methodId,
    statement,
    crc: CRC,
  });

  if (typeof sign !== "string" || !safeCompare(sign, expected)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (typeof sessionId !== "string" || typeof orderId !== "number" || typeof amount !== "number") {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: sessionId },
    select: { id: true, totalPln: true, paymentStatus: true },
  });

  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  // Idempotent — already confirmed
  if (order.paymentStatus === "CAPTURED") {
    return NextResponse.json({ status: 200 });
  }

  if (order.totalPln !== amount) {
    return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
  }

  await verifyTransaction({ sessionId, orderId, amount });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "CAPTURED",
      paymentRef: String(orderId),
      status: "PAID",
    },
  });

  pushOrderToBaselinker(order.id).catch((err) => {
    console.error(`[BL] push failed for order ${order.id}:`, err);
  });

  return NextResponse.json({ status: 200 });
}
