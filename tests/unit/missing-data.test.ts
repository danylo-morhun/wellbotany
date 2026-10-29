import { describe, expect, it } from "vitest";
import { type MissingDataInput, missingData } from "@/features/products/lib/missing-data";

const complete: MissingDataInput = {
  kind: "supplement",
  ingredients: { pl: "Witamina C", en: null },
  healthWarnings: ["Nie przekraczać zalecanej porcji do spożycia w ciągu dnia."],
  usageInstructionsPl: "1 kapsułka dziennie",
  servingSize: null,
  imageCount: 1,
};
const empty: MissingDataInput = {
  kind: "supplement",
  ingredients: null,
  healthWarnings: null,
  usageInstructionsPl: null,
  servingSize: null,
  imageCount: 0,
};

describe("missingData", () => {
  it("passes a complete supplement", () => {
    expect(missingData(complete)).toEqual([]);
  });

  it("lists every gap of an empty supplement", () => {
    expect(missingData(empty)).toEqual(["ingredients", "warnings", "usage", "image"]);
  });

  it("asks food for ingredients and a photo, not supplement warnings or portion", () => {
    expect(missingData({ ...empty, kind: "food" })).toEqual(["ingredients", "image"]);
  });

  it("asks non-food only for a photo", () => {
    expect(missingData({ ...empty, kind: "nonFood" })).toEqual(["image"]);
  });

  it("treats blank values as missing", () => {
    expect(
      missingData({
        ...complete,
        ingredients: { pl: "  ", en: "Vitamin C" },
        healthWarnings: [" "],
        usageInstructionsPl: "",
      }),
    ).toEqual(["ingredients", "warnings", "usage"]);
  });

  it("accepts a serving size in place of usage instructions", () => {
    expect(
      missingData({ ...complete, usageInstructionsPl: null, servingSize: "2 kapsułki dziennie" }),
    ).toEqual([]);
  });
});
