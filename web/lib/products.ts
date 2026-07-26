import productsData from "./products.json";
import type { Product } from "./types";

export function getAllProducts(): Product[] {
  return productsData as unknown as Product[];
}

export function getProductById(id: string): Product | undefined {
  return getAllProducts().find((p) => p.id === id);
}
