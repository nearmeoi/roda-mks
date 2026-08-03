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
  const q = query.trim().toLowerCase();
  if (!q) {
    if (categoryFilter && categoryFilter !== "Semua") {
      return products.filter((p) => p.promoCategory === categoryFilter);
    }
    return products;
  }

  // Clean leading zeros for barcode/article code matching
  const qClean = q.replace(/^0+/, "");

  return products.filter((p) => {
    const artCodeStr = String(p.articleCode).toLowerCase();
    const artCodeClean = artCodeStr.replace(/^0+/, "");

    // 1. Direct or stripped leading zero match on article code
    const isCodeMatch =
      artCodeStr.includes(q) ||
      (qClean.length > 0 && artCodeClean.includes(qClean)) ||
      (qClean.length > 0 && qClean.includes(artCodeClean));

    if (isCodeMatch) return true;

    // 2. If category filter is active, filter non-code text searches
    if (categoryFilter && categoryFilter !== "Semua") {
      if (p.promoCategory !== categoryFilter) return false;
    }

    // 3. Match in description, brand, or promoCategory
    if (p.description.toLowerCase().includes(q)) return true;
    if (p.brand.toLowerCase().includes(q)) return true;
    if (p.promoCategory.toLowerCase().includes(q)) return true;

    return false;
  });
}

