import { describe, expect, it } from "vitest";
import { getAllProducts, getProductById, getColorSiblings } from "@/lib/products";

describe("getAllProducts", () => {
  it("returns every product in the dataset", () => {
    expect(getAllProducts()).toHaveLength(6);
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

describe("getColorSiblings", () => {
  it("finds other color variants of the same brand+model", () => {
    const all = getAllProducts();
    const black = getProductById("polygon-razor-micro-ca-20-s")!;
    const siblings = getColorSiblings(black, all);
    expect(siblings.map((s) => s.id)).toEqual(["polygon-razor-micro-ca-20-g"]);
  });

  it("returns an empty array when there are no other colors", () => {
    const all = getAllProducts();
    const strattos7 = getProductById("polygon-strattos-7-blk-fa-700-b")!;
    expect(getColorSiblings(strattos7, all)).toEqual([]);
  });
});
