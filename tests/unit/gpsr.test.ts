import { describe, expect, it } from "vitest";
import { contactHref, type GpsrBrand, manufacturerInfo } from "@/features/products/lib/gpsr";

const blank: GpsrBrand = {
  name: "BICAPS",
  manufacturerName: null,
  manufacturerAddress: null,
  manufacturerContact: null,
  euResponsiblePerson: null,
};
const formeds: GpsrBrand = {
  name: "ForMeds",
  manufacturerName: "ForMeds Sp. z o.o.",
  manufacturerAddress: "ul. Przykładowa 1, 00-001 Warszawa",
  manufacturerContact: "kontakt@formeds.pl",
  euResponsiblePerson: null,
};

describe("manufacturerInfo", () => {
  it("is null without a brand or any contact data", () => {
    expect(manufacturerInfo(null)).toBeNull();
    expect(manufacturerInfo({ ...blank, parentBrand: null })).toBeNull();
    expect(manufacturerInfo({ ...blank, manufacturerAddress: "  ", parentBrand: null })).toBeNull();
  });

  it("uses the brand's own data, falling back to the brand name", () => {
    expect(
      manufacturerInfo({ ...blank, manufacturerContact: "info@bicaps.pl", parentBrand: formeds }),
    ).toEqual({
      name: "BICAPS",
      address: null,
      contact: "info@bicaps.pl",
      euResponsiblePerson: null,
    });
  });

  it("inherits the manufacturer from the parent brand", () => {
    expect(manufacturerInfo({ ...blank, parentBrand: formeds })).toEqual({
      name: "ForMeds Sp. z o.o.",
      address: "ul. Przykładowa 1, 00-001 Warszawa",
      contact: "kontakt@formeds.pl",
      euResponsiblePerson: null,
    });
  });

  it("carries the EU responsible person of a non-EU manufacturer", () => {
    const now: GpsrBrand = {
      name: "NOW Foods",
      manufacturerName: "NOW Health Group, Inc.",
      manufacturerAddress: "244 Knollwood Dr, Bloomingdale, IL 60108, USA",
      manufacturerContact: "https://www.nowfoods.com/contact-us",
      euResponsiblePerson: "Importer Sp. z o.o., ul. Testowa 2, 00-002 Warszawa, eu@importer.pl",
    };
    expect(manufacturerInfo({ ...now, parentBrand: null })?.euResponsiblePerson).toBe(
      now.euResponsiblePerson,
    );
  });
});

describe("contactHref", () => {
  it("links e-mails and URLs, leaves anything else as text", () => {
    expect(contactHref("kontakt@formeds.pl")).toBe("mailto:kontakt@formeds.pl");
    expect(contactHref("https://formeds.pl/kontakt")).toBe("https://formeds.pl/kontakt");
    expect(contactHref("tel. 22 123 45 67")).toBeNull();
  });
});
