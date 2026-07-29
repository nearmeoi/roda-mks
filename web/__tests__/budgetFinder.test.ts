import { describe, expect, it } from "vitest";
import { findProductsByBudget } from "@/lib/budgetFinder";
import type { Product, ProductSize } from "@/lib/types";

function buildSize(overrides: Partial<ProductSize> = {}): ProductSize {
  return { size_code: "M", article_code: 1, quantity: 1, ordered_quantity: null, price: null, ...overrides };
}

function buildTestProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "test-id",
    brand: "POLYGON",
    model_name: "STRATTOS 7",
    category: "BIKE-ROAD DROP BAR",
    warehouse: "Outlet",
    variant_extra: null,
    wheel_size: "700C",
    color_label: "Hitam",
    price: 5000000,
    sizes: [buildSize()],
    colors: ["Black"],
    images: [],
    specs: {},
    matched: true,
    ...overrides,
  };
}

describe("findProductsByBudget", () => {
  it("sorts within-budget results descending by price (closest to budget first)", () => {
    const products = [
      buildTestProduct({ id: "a", price: 3000000 }),
      buildTestProduct({ id: "b", price: 9500000 }),
      buildTestProduct({ id: "c", price: 7000000 }),
    ];

    const result = findProductsByBudget(products, { maxBudget: 10000000 });

    expect(result.isFallback).toBe(false);
    expect(result.products.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("filters by category (case-insensitive)", () => {
    const products = [
      buildTestProduct({ id: "bike", category: "BIKE-ROAD DROP BAR", price: 5000000 }),
      buildTestProduct({ id: "helmet", category: "HELMET", price: 500000 }),
    ];

    const result = findProductsByBudget(products, { maxBudget: 10000000, category: "helmet" });

    expect(result.products.map((p) => p.id)).toEqual(["helmet"]);
  });

  it("filters by brand (case-insensitive)", () => {
    const products = [
      buildTestProduct({ id: "polygon", brand: "POLYGON", price: 5000000 }),
      buildTestProduct({ id: "wimcycle", brand: "WIM CYCLE", price: 3000000 }),
    ];

    const result = findProductsByBudget(products, { maxBudget: 10000000, brand: "polygon" });

    expect(result.products.map((p) => p.id)).toEqual(["polygon"]);
  });

  it("excludes out-of-stock products", () => {
    const products = [
      buildTestProduct({ id: "in-stock", price: 5000000, sizes: [buildSize({ quantity: 2 })] }),
      buildTestProduct({ id: "out-of-stock", price: 3000000, sizes: [buildSize({ quantity: 0 })] }),
    ];

    const result = findProductsByBudget(products, { maxBudget: 10000000 });

    expect(result.products.map((p) => p.id)).toEqual(["in-stock"]);
  });

  it("excludes products with no price", () => {
    const products = [
      buildTestProduct({ id: "priced", price: 5000000 }),
      buildTestProduct({ id: "no-price", price: null }),
    ];

    const result = findProductsByBudget(products, { maxBudget: 10000000 });

    expect(result.products.map((p) => p.id)).toEqual(["priced"]);
  });

  it("falls back to the closest above-budget products, sorted ascending, when nothing fits", () => {
    const products = [
      buildTestProduct({ id: "far", price: 15000000 }),
      buildTestProduct({ id: "close", price: 11000000 }),
    ];

    const result = findProductsByBudget(products, { maxBudget: 10000000 });

    expect(result.isFallback).toBe(true);
    expect(result.products.map((p) => p.id)).toEqual(["close", "far"]);
  });

  it("returns an empty fallback result when there are no matches at all", () => {
    const result = findProductsByBudget([], { maxBudget: 10000000 });

    expect(result.isFallback).toBe(true);
    expect(result.products).toEqual([]);
  });
});
