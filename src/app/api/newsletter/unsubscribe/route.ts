import { removeSubscriber } from "@/features/newsletter/lib/remove-subscriber";

// One-click unsubscribe (RFC 8058): mail clients POST here from the List-Unsubscribe header
export async function POST(request: Request) {
  const params = new URL(request.url).searchParams;
  const ok = await removeSubscriber(params.get("e") ?? "", params.get("t") ?? "");
  return new Response(null, { status: ok ? 200 : 400 });
}
