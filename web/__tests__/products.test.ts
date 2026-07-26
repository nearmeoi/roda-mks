import { describe, expect, it } from "vitest";
import { getAllProducts, getProductById } from "@/lib/products";

describe("getAllProducts", () => {
  it("returns a non-empty product list", () => {
    // Intentionally not an exact count: products.json is the real dataset generated
    // by the pipeline and its size changes whenever the source xlsx is refreshed.
    expect(getAllProducts().length).toBeGreaterThan(0);
  });
});

describe("getProductById", () => {
  it("finds an existing product", () => {
    const product = getProductById("polygon-strattos-7-blk-fa-700-b");
    expect(product?.model_name).toBe("STRATTOS 7");
  });

  it("returns undefined for an unknown id", () => {
    expect(getProductById("does-not-exist")).toBeUndefined();
  });
});
