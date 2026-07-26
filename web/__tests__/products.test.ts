import { describe, expect, it } from "vitest";
import { getAllProducts, getProductById } from "@/lib/products";

describe("getAllProducts", () => {
  it("returns every product in the dataset", () => {
    expect(getAllProducts()).toHaveLength(8);
  });
});

describe("getProductById", () => {
  it("finds an existing product", () => {
    const product = getProductById("polygon-strattos-7-blk-fa-700-b");
    expect(product?.model_name).toBe("STRATTOS 7 BLK FA 700");
  });

  it("returns undefined for an unknown id", () => {
    expect(getProductById("does-not-exist")).toBeUndefined();
  });
});
