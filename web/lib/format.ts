import type { ProductSize } from "./types";

export function formatPrice(price: number | null): string {
  if (price === null) return "Hubungi toko";
  return `Rp ${price.toLocaleString("id-ID").replace(/,/g, ".")}`;
}

export function sizesAvailableLabel(sizes: ProductSize[]): string {
  return `${sizes.length} ukuran`;
}
