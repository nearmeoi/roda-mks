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
    { name: "model_name", weight: 0.5 },
    { name: "brand", weight: 0.2 },
    { name: "category", weight: 0.1 },
    { name: "color_label", weight: 0.05 },
    { name: "wheel_size", weight: 0.05 },
  ],
  threshold: 0.18,
  ignoreLocation: true,
};

export function searchProducts(products: Product[], query: string): Product[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cleanQuery = trimmed.toLowerCase();

  // 1. If query is numeric (Kode Artikel), search STRICTLY by article code
  if (/^\d+$/.test(cleanQuery)) {
    // Exact match first
    const exact = products.filter((p) =>
      p.sizes.some((s) => String(s.article_code).toLowerCase() === cleanQuery)
    );
    if (exact.length > 0) return exact;

    // Partial match (contains code)
    const partial = products.filter((p) =>
      p.sizes.some((s) => String(s.article_code).toLowerCase().includes(cleanQuery))
    );
    // Return ONLY matching article codes, NEVER leak random products!
    return partial;
  }

  // 2. Exact model name match
  const exactModelMatches = products.filter(
    (p) => p.model_name.toLowerCase() === cleanQuery
  );

  // 3. Strict Fuse.js fuzzy search for general text
  const fuse = new Fuse(toSearchable(products), options);
  const fuzzyResults = fuse.search(trimmed).map((result) => result.item);

  if (exactModelMatches.length > 0) {
    const set = new Set(exactModelMatches.map((p) => p.id));
    const rest = fuzzyResults.filter((p) => !set.has(p.id));
    return [...exactModelMatches, ...rest];
  }

  return fuzzyResults;
}
