import { Heart } from "lucide-react";
import { cookies } from "next/headers";
import { getWishlist, WISHLIST_COOKIE_NAME } from "../lib/session";
import { WishlistButton } from "./WishlistButton";

type Props = {
  productId: string;
};

export async function ProductWishlistButton({ productId }: Props) {
  const cookieStore = await cookies();
  const wishlistId = cookieStore.get(WISHLIST_COOKIE_NAME)?.value;
  const wishlist = wishlistId ? await getWishlist(wishlistId) : null;
  const initialInWishlist = wishlist?.items.some((item) => item.productId === productId) ?? false;

  return <WishlistButton productId={productId} initialInWishlist={initialInWishlist} />;
}

export function ProductWishlistButtonFallback() {
  return (
    <div className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
      <Heart className="size-5" />
    </div>
  );
}
