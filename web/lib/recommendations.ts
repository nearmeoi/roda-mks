import type { Product } from "@/lib/types";
import { totalQuantity } from "@/lib/format";

export function getRecommendations(currentProduct: Product, allProducts: Product[], limit = 6): Product[] {
  if (!allProducts || allProducts.length === 0) return [];

  // Filter out current product and products with 0 stock
  const inStockProducts = allProducts.filter(
    (p) => p.id !== currentProduct.id && totalQuantity(p.sizes) > 0
  );

  const isCurrentBike = currentProduct.category.toUpperCase().includes("BIKE");

  if (isCurrentBike) {
    // Recommend accessories, apparel, and parts for bikes
    const complementaries = inStockProducts.filter((p) => {
      const cat = p.category.toUpperCase();
      return (
        cat.includes("ACC") ||
        cat.includes("HELMET") ||
        cat.includes("APPAREL") ||
        cat.includes("PART") ||
        cat.includes("PEDAL") ||
        cat.includes("LOCK") ||
        cat.includes("LIGHT") ||
        cat.includes("BOTTLE")
      );
    });

    // Sort: Same brand first, then matched with images first
    complementaries.sort((a, b) => {
      const aSameBrand = a.brand.toUpperCase() === currentProduct.brand.toUpperCase() ? 1 : 0;
      const bSameBrand = b.brand.toUpperCase() === currentProduct.brand.toUpperCase() ? 1 : 0;
      if (aSameBrand !== bSameBrand) return bSameBrand - aSameBrand;

      const aHasImg = a.images && a.images.length > 0 ? 1 : 0;
      const bHasImg = b.images && b.images.length > 0 ? 1 : 0;
      return bHasImg - aHasImg;
    });

    if (complementaries.length >= limit) {
      return complementaries.slice(0, limit);
    }
  }

  // Fallback / Part recommendations: Same brand or same category
  const sameBrandOrCat = inStockProducts.filter(
    (p) =>
      p.brand.toUpperCase() === currentProduct.brand.toUpperCase() ||
      p.category.toUpperCase() === currentProduct.category.toUpperCase()
  );

  sameBrandOrCat.sort((a, b) => {
    const aHasImg = a.images && a.images.length > 0 ? 1 : 0;
    const bHasImg = b.images && b.images.length > 0 ? 1 : 0;
    return bHasImg - aHasImg;
  });

  return sameBrandOrCat.slice(0, limit);
}
