import type { ProductSize } from "./types";

export function formatPrice(price: number | null): string {
  if (price === null) return "Hubungi toko";
  return `Rp ${price.toLocaleString("id-ID").replace(/,/g, ".")}`;
}

export function totalQuantity(sizes: ProductSize[]): number {
  return sizes.reduce((sum, s) => sum + s.quantity, 0);
}

export function totalOrderedQuantity(sizes: ProductSize[]): number {
  return sizes.reduce((sum, s) => sum + (s.ordered_quantity ?? 0), 0);
}

export function primaryArticleCode(sizes: ProductSize[]): number {
  return sizes[0].article_code;
}

export interface StockStatus {
  label: string;
  dotColor: string;
}

export function getStockStatus(qty: number): StockStatus {
  if (qty <= 0) return { label: "Habis", dotColor: "oklch(58% 0.22 25)" };
  if (qty < 5) return { label: "Terbatas", dotColor: "oklch(75% 0.16 80)" };
  return { label: "Tersedia", dotColor: "oklch(64% 0.17 145)" };
}
