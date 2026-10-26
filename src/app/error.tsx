"use client";

import { ErrorView } from "@/components/layout/ErrorView";

export default function RootError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorView {...props} />;
}
