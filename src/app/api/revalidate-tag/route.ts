import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
  revalidateTag("products");
  revalidateTag("categories");
  revalidateTag("brands");
  return NextResponse.json({ 
    ok: true, 
    message: "Cache tags [products, categories, brands] successfully revalidated" 
  });
}
