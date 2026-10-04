import { type NextRequest, NextResponse } from "next/server";
import { EpakaError, getEpakaLabel } from "@/features/shipping/lib/epaka";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Shipping label PDF from epaka, streamed so the admin can print it straight away
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { orderNumber: true, epakaOrderId: true },
  });
  if (!order?.epakaOrderId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const pdf = await getEpakaLabel(order.epakaOrderId);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="etykieta-${order.orderNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof EpakaError) {
      return new NextResponse(
        `${err.message}\nEtykieta może nie być jeszcze gotowa — spróbuj za chwilę.`,
        {
          status: 502,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    }
    throw err;
  }
}
