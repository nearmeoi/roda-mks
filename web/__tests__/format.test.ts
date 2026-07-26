import { describe, expect, it } from "vitest";
import { formatPrice, sizesAvailableLabel } from "@/lib/format";

describe("formatPrice", () => {
  it("formats a price in Indonesian rupiah style", () => {
    expect(formatPrice(25000000)).toBe("Rp 25.000.000");
  });

  it("falls back to a contact message when price is null", () => {
    expect(formatPrice(null)).toBe("Hubungi toko");
  });
});

describe("sizesAvailableLabel", () => {
  it("pluralizes correctly for multiple sizes", () => {
    expect(
      sizesAvailableLabel([
        { size_code: "S", article_code: 1, quantity: 1, price: null },
        { size_code: "M", article_code: 2, quantity: 1, price: null },
      ])
    ).toBe("2 ukuran");
  });

  it("handles a single size", () => {
    expect(
      sizesAvailableLabel([{ size_code: "S", article_code: 1, quantity: 1, price: null }])
    ).toBe("1 ukuran");
  });
});
