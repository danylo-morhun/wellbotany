// GPSR art. 19 (Reg. 2023/988): a distance offer of a non-food product names
// the manufacturer with a postal and an electronic address, plus the EU
// responsible person when the manufacturer sits outside the EU.

export type GpsrBrand = {
  name: string;
  manufacturerName: string | null;
  manufacturerAddress: string | null;
  manufacturerContact: string | null;
  euResponsiblePerson: string | null;
};

export type ManufacturerInfo = {
  name: string;
  address: string | null;
  contact: string | null;
  euResponsiblePerson: string | null;
};

const text = (v: string | null) => (v?.trim() ? v.trim() : null);

/**
 * Manufacturer details from the brand, or from its parent when a product line
 * has none of its own. Null when neither has an address or a contact.
 */
export function manufacturerInfo(
  brand: (GpsrBrand & { parentBrand: GpsrBrand | null }) | null,
): ManufacturerInfo | null {
  const source = [brand, brand?.parentBrand].find(
    (b) => b && (text(b.manufacturerAddress) || text(b.manufacturerContact)),
  );
  if (!source) return null;
  return {
    name: text(source.manufacturerName) ?? source.name,
    address: text(source.manufacturerAddress),
    contact: text(source.manufacturerContact),
    euResponsiblePerson: text(source.euResponsiblePerson),
  };
}

/** Link target for the electronic contact: mailto for an e-mail, the URL itself, or none. */
export function contactHref(contact: string): string | null {
  if (/^https?:\/\//i.test(contact)) return contact;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return `mailto:${contact}`;
  return null;
}
