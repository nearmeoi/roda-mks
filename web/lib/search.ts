import Fuse from "fuse.js";
import type { Product } from "./types";

interface SearchableProduct extends Product {
  article_codes: string;
}

function toSearchable(products: Product[]): SearchableProduct[] {
  return products.map((p) => ({
    ...p,
    article_codes: p.sizes.map((s) => String(s.article_code)).join(" "),
  }));
}


const options = {
  keys: [
    { name: "article_codes", weight: 0.6 },
    { name: "model_name", weight: 0.45 },
    { name: "brand", weight: 0.25 },
    { name: "category", weight: 0.12 },
    { name: "color_label", weight: 0.08 },
    { name: "wheel_size", weight: 0.06 },
    { name: "variant_extra", weight: 0.04 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
};

export function searchProducts(products: Product[], query: string): Product[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cleanQuery = trimmed.toLowerCase();

  // 1. Exact article code match (100% exact)
  const exactArticleMatches = products.filter((p) =>
    p.sizes.some((s) => String(s.article_code).toLowerCase() === cleanQuery)
  );

  if (exactArticleMatches.length > 0) {
    return exactArticleMatches;
  }

  // 2. Partial article code match if query is numeric / digit-heavy
  if (/^\d+$/.test(cleanQuery)) {
    const articlePartialMatches = products.filter((p) =>
      p.sizes.some((s) => String(s.article_code).toLowerCase().includes(cleanQuery))
    );
    if (articlePartialMatches.length > 0) {
      return articlePartialMatches;
    }
  }

  // 3. Fallback to Fuse.js fuzzy search for text queries
  const fuse = new Fuse(toSearchable(products), options);
  return fuse.search(trimmed).map((result) => result.item);
}
