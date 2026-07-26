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
    { name: "model_name", weight: 0.5 },
    { name: "brand", weight: 0.3 },
    { name: "category", weight: 0.15 },
    { name: "article_codes", weight: 0.05 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
};

export function searchProducts(products: Product[], query: string): Product[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const fuse = new Fuse(toSearchable(products), options);
  return fuse.search(trimmed).map((result) => result.item);
}
