"use client";

import { ErrorView } from "@/components/layout/ErrorView";

/** Keeps the shop header and footer around the error. */
export default function ShopError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorView {...props} as="div" />;
}
