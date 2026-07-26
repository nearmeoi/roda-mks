import productsData from "./products.json";
import type { Product } from "./types";

export function getAllProducts(): Product[] {
  return productsData as Product[];
}

export function getProductById(id: string): Product | undefined {
  return getAllProducts().find((p) => p.id === id);
}

export function getColorSiblings(product: Product, allProducts: Product[]): Product[] {
  return allProducts.filter(
    (p) => p.id !== product.id && p.brand === product.brand && p.model_name === product.model_name
  );
}
