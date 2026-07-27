import { notFound } from "next/navigation";
import { getAllProducts, getProductById } from "@/lib/products";
import { ProductDetailContent } from "@/components/ProductDetailContent";

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ id: p.id }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  const allProducts = getAllProducts();

  return <ProductDetailContent product={product} allProducts={allProducts} />;
}
