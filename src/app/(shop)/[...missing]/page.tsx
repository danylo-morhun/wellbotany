import { notFound } from "next/navigation";

/**
 * Unknown URLs land here, so their 404 renders inside the shop layout (header
 * and footer). That keeps the root not-found free of NavBar and Footer — Next
 * serializes it into every page's RSC payload.
 */
export default function MissingPage() {
  notFound();
}
