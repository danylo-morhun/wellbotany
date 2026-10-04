import type { ShippingMethod } from "@prisma/client";

// Orlen Paczka, FedEx and Poczta Polska have no confirmed deep-link query
// param — link to the generic tracking page; customer pastes the number in.
export function buildTrackingUrl(method: ShippingMethod, trackingNumber: string): string | null {
  const n = encodeURIComponent(trackingNumber);
  switch (method) {
    case "INPOST_PACZKOMAT":
    case "INPOST_KURIER":
      return `https://inpost.pl/sledzenie-paczek?number=${n}`;
    case "DHL":
    case "DHL_POINT":
      return `https://www.dhl.com/pl-pl/home/tracking.html?tracking-id=${n}`;
    case "DPD":
    case "DPD_PICKUP":
      return `https://tracktrace.dpd.com.pl/parcelDetails?typ=1&p1=${n}`;
    case "GLS":
      return `https://gls-group.com/PL/pl/sledzenie-paczek?match=${n}`;
    case "ORLEN_PACZKA":
      return "https://www.orlenpaczka.pl/sledz-paczke/";
    case "FEDEX":
    case "FEDEX_POINT":
      return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    case "POCZTEX":
    case "POCZTA_POLSKA":
      return `https://emonitoring.poczta-polska.pl/?numer=${n}`;
    case "EPAKA_POINT":
      return "https://www.epaka.pl/sledzenie-przesylek";
    default:
      return null;
  }
}
