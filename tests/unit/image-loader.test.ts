import { beforeAll, describe, expect, it, vi } from "vitest";

let publicImageUrl: (src: string, width?: number) => string;

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "demo");
  ({ publicImageUrl } = await import("@/lib/image-loader"));
});

describe("publicImageUrl", () => {
  it("replaces a stored transformation instead of chaining after it", () => {
    expect(
      publicImageUrl("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v17/abc.avif"),
    ).toBe("https://res.cloudinary.com/demo/image/upload/f_jpg,q_auto,c_limit,w_1200/v17/abc.avif");
  });

  it("keeps folders in the public id", () => {
    expect(
      publicImageUrl(
        "https://res.cloudinary.com/demo/image/upload/v1/migrated/products/x.png",
        600,
      ),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_jpg,q_auto,c_limit,w_600/v1/migrated/products/x.png",
    );
  });

  it("serves other remote images through fetch delivery as JPEG", () => {
    expect(publicImageUrl("https://example.com/a b.jpg")).toBe(
      "https://res.cloudinary.com/demo/image/fetch/f_jpg,q_auto,c_limit,w_1200/https%3A%2F%2Fexample.com%2Fa%20b.jpg",
    );
  });

  it("leaves local assets alone", () => {
    expect(publicImageUrl("/og-image.jpg")).toBe("/og-image.jpg");
  });
});
