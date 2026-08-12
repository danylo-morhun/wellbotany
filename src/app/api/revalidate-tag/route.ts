import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
  revalidateTag("products", "max");
  revalidateTag("categories", "max");
  revalidateTag("brands", "max");
  return NextResponse.json({
    ok: true,
    message: "Cache tags [products, categories, brands] successfully revalidated",
  });
}
