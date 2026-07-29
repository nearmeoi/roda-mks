import { describe, expect, it } from "vitest";
import { searchGuideArticles } from "@/lib/guideSearch";
import { guideArticles } from "@/lib/guideArticles";

describe("searchGuideArticles", () => {
  it("returns nothing for an empty query", () => {
    expect(searchGuideArticles(guideArticles, "")).toEqual([]);
    expect(searchGuideArticles(guideArticles, "   ")).toEqual([]);
  });

  it("finds an article by partial title", () => {
    const results = searchGuideArticles(guideArticles, "groupset");
    expect(results.map((a) => a.id)).toContain("tingkatan-groupset");
  });

  it("finds an article by tag", () => {
    const results = searchGuideArticles(guideArticles, "gravel");
    expect(results.map((a) => a.id)).toContain("ukuran-sepeda-road-hybrid-gravel");
  });

  it("finds an article by category", () => {
    const results = searchGuideArticles(guideArticles, "promo");
    expect(results.map((a) => a.id)).toContain("promo-diskon-aktif");
  });
});
