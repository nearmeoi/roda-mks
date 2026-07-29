import type { Product } from "./types";
import { totalQuantity } from "./format";

export interface BudgetCriteria {
  maxBudget: number;
  category?: string;
  brand?: string;
}

export interface BudgetResult {
  products: Product[];
  isFallback: boolean;
}

function hasPrice(p: Product): p is Product & { price: number } {
  return p.price !== null;
}

export function findProductsByBudget(products: Product[], criteria: BudgetCriteria): BudgetResult {
  const { maxBudget, category, brand } = criteria;

  const inStock = products.filter((p) => totalQuantity(p.sizes) > 0);

  const categoryFiltered = category
    ? inStock.filter((p) => p.category.toLowerCase() === category.toLowerCase())
    : inStock;

  const brandFiltered = brand
    ? categoryFiltered.filter((p) => p.brand.toLowerCase() === brand.toLowerCase())
    : categoryFiltered;

  const priced = brandFiltered.filter(hasPrice);

  const withinBudget = priced.filter((p) => p.price <= maxBudget);
  if (withinBudget.length > 0) {
    return {
      products: withinBudget.sort((a, b) => b.price - a.price),
      isFallback: false,
    };
  }

  const aboveBudget = priced.filter((p) => p.price > maxBudget);
  return {
    products: aboveBudget.sort((a, b) => a.price - b.price),
    isFallback: true,
  };
}
