import { describe, expect, it } from "vitest";
import { formatPrice, getStockStatus, totalQuantity, totalOrderedQuantity, primaryArticleCode } from "@/lib/format";
import type { ProductSize } from "@/lib/types";

const sizes: ProductSize[] = [
  { size_code: "S1", article_code: 111, quantity: 2, ordered_quantity: 3, price: 1000 },
  { size_code: "M", article_code: 222, quantity: 3, ordered_quantity: null, price: 1000 },
];

describe("formatPrice", () => {
  it("formats a price in Indonesian rupiah style", () => {
    expect(formatPrice(25000000)).toBe("Rp 25.000.000");
  });

  it("falls back to a contact message when price is null", () => {
    expect(formatPrice(null)).toBe("Hubungi toko");
  });
});

describe("totalQuantity", () => {
  it("sums quantity across all sizes", () => {
    expect(totalQuantity(sizes)).toBe(5);
  });
});

describe("totalOrderedQuantity", () => {
  it("sums ordered_quantity, treating null as 0", () => {
    expect(totalOrderedQuantity(sizes)).toBe(3);
  });
});

describe("primaryArticleCode", () => {
  it("returns the first size's article code", () => {
    expect(primaryArticleCode(sizes)).toBe(111);
  });
});

describe("getStockStatus", () => {
  it("returns Habis for zero stock", () => {
    expect(getStockStatus(0).label).toBe("Habis");
  });

  it("returns Terbatas for low stock", () => {
    expect(getStockStatus(3).label).toBe("Terbatas");
  });

  it("returns Tersedia for healthy stock", () => {
    expect(getStockStatus(10).label).toBe("Tersedia");
  });
});
