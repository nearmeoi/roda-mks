import { describe, expect, it } from "vitest";
import { searchProducts } from "@/lib/search";
import { getAllProducts } from "@/lib/products";

const products = getAllProducts();

describe("searchProducts", () => {
  it("returns nothing for an empty query", () => {
    expect(searchProducts(products, "")).toEqual([]);
    expect(searchProducts(products, "   ")).toEqual([]);
  });

  it("finds products by partial model name", () => {
    const results = searchProducts(products, "strattos");
    expect(results.map((p) => p.id)).toContain("polygon-strattos-7-blk-fa-700-b");
    expect(results.map((p) => p.id)).toContain("polygon-strattos-s2-700c-da-1l");
  });

  it("finds products by brand", () => {
    const results = searchProducts(products, "wim cycle");
    expect(results.map((p) => p.id)).toContain("wim-cycle-elena-meow-16-fa-p");
  });

  it("finds a product by its exact article code", () => {
    const results = searchProducts(products, "503769003");
    expect(results.map((p) => p.id)).toContain("polygon-strattos-7-blk-fa-700-b");
  });
});
