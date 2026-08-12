import type { ShippingMethod } from "@prisma/client";

// Orlen Paczka has no confirmed deep-link query param — links to the
// generic tracking page; customer pastes the number in manually.
export function buildTrackingUrl(method: ShippingMethod, trackingNumber: string): string | null {
  switch (method) {
    case "INPOST_PACZKOMAT":
    case "INPOST_KURIER":
      return `https://inpost.pl/sledzenie-paczek?number=${trackingNumber}`;
    case "DHL":
      return `https://www.dhl.com/pl-pl/home/tracking.html?tracking-id=${trackingNumber}`;
    case "DPD":
      return `https://tracktrace.dpd.com.pl/parcelDetails?typ=1&p1=${trackingNumber}`;
    case "ORLEN_PACZKA":
      return "https://www.orlenpaczka.pl/sledz-paczke/";
    default:
      return null;
  }
}
