import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ShoperHttpError, shoperRequest } from "@/lib/shoper/client";

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const required = ["SHOPER_API_BASE_URL", "SHOPER_API_TOKEN"] as const;
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length) {
    return NextResponse.json({ ok: false, missing }, { status: 400 });
  }

  const productIdParam = new URL(req.url).searchParams.get("productId");
  if (productIdParam && !/^\d+$/.test(productIdParam)) {
    return NextResponse.json({ ok: false, error: "productId must be numeric" }, { status: 400 });
  }
  const productId = productIdParam;

  try {
    if (productId) {
      const product = await shoperRequest<unknown>(`/products/${productId}`, { method: "GET" });
      return NextResponse.json({ ok: true, product });
    }

    const products = await shoperRequest<unknown>("/products", {
      method: "GET",
      query: { limit: 1, page: 1 },
    });
    const stocks = await shoperRequest<unknown>("/product-stocks", {
      method: "GET",
      query: { limit: 1, page: 1 },
    });

    return NextResponse.json({
      ok: true,
      missing: [],
      hasClientId: Boolean(process.env.SHOPER_CLIENT_ID),
      sample: { products, stocks },
    });
  } catch (e) {
    if (e instanceof ShoperHttpError) {
      return NextResponse.json(
        { ok: false, error: e.message, status: e.status, responseBody: e.responseBody },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown error" },
      { status: 502 },
    );
  }
}
