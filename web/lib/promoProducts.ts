import promoProductsData from "./promoProducts.json";

export interface PromoProduct {
  articleCode: string;
  description: string;
  brand: string;
  promoCategory: string;
  retailPrice: number;
  discountLabel: string;
  nettPrice: number;
}

export const promoProducts: PromoProduct[] = promoProductsData as PromoProduct[];

export function searchPromoProducts(
  products: PromoProduct[],
  query: string,
  categoryFilter?: string
): PromoProduct[] {
  let list = products;

  if (categoryFilter && categoryFilter !== "Semua") {
    list = list.filter((p) => p.promoCategory === categoryFilter);
  }

  const q = query.trim().toLowerCase();
  if (!q) return list;

  // Check if query is numeric (article code scan/search)
  const isNumeric = /^\d+$/.test(q);

  return list.filter((p) => {
    const artCodeStr = String(p.articleCode).toLowerCase();
    if (artCodeStr.includes(q)) return true;
    if (!isNumeric) {
      if (p.description.toLowerCase().includes(q)) return true;
      if (p.brand.toLowerCase().includes(q)) return true;
      if (p.promoCategory.toLowerCase().includes(q)) return true;
    }
    return false;
  });
}
