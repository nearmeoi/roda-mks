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

  it("handles scanned barcodes with leading zeros correctly", () => {
    const sampleItem = promoProducts[0]; // e.g. "741170001"
    const scannedCodeWithZero = "00" + sampleItem.articleCode;
    const results = searchPromoProducts(promoProducts, scannedCodeWithZero);
    expect(results.some((r) => r.articleCode === sampleItem.articleCode)).toBe(true);
  });

  it("finds scanned barcode regardless of active category filter", () => {
    const sampleItem = promoProducts.find((p) => p.promoCategory !== "Diskon 10% Thule")!;
    // Filter active is "Diskon 10% Thule", but user scans barcode for an item in another category
    const results = searchPromoProducts(promoProducts, sampleItem.articleCode, "Diskon 10% Thule");
    expect(results.some((r) => r.articleCode === sampleItem.articleCode)).toBe(true);
  });

  it("searches by description query", () => {
    const results = searchPromoProducts(promoProducts, "helmet");
    expect(results.length).toBeGreaterThan(0);
  });
});

