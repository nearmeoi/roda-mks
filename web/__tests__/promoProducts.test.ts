import { describe, expect, it } from "vitest";
import { promoProducts, searchPromoProducts } from "@/lib/promoProducts";

describe("promoProducts module", () => {
  it("loads non-empty list of promo products from Buku Saku", () => {
    expect(promoProducts.length).toBeGreaterThan(1000);
  });

  it("filters by category accurately", () => {
    const thuleItems = searchPromoProducts(promoProducts, "", "Diskon 10% Thule");
    expect(thuleItems.length).toBeGreaterThan(0);
    expect(thuleItems.every((item) => item.promoCategory === "Diskon 10% Thule")).toBe(true);
  });

  it("searches by article code (e.g., barcode scan)", () => {
    const sampleItem = promoProducts[0];
    const results = searchPromoProducts(promoProducts, sampleItem.articleCode);
    expect(results.some((r) => r.articleCode === sampleItem.articleCode)).toBe(true);
  });

  it("searches by description query", () => {
    const results = searchPromoProducts(promoProducts, "helmet");
    expect(results.length).toBeGreaterThan(0);
  });
});
