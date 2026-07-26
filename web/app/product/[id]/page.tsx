import { notFound } from "next/navigation";
import { getAllProducts, getColorSiblings, getProductById } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { ProductCarousel } from "@/components/ProductCarousel";
import { SizeChips } from "@/components/SizeChips";
import { ColorSwatches } from "@/components/ColorSwatches";
import { SpecsTable } from "@/components/SpecsTable";

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ id: p.id }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  const siblings = getColorSiblings(product, getAllProducts());

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <ProductCarousel images={product.images} alt={product.model_name} />
      <h1 className="mt-4 text-lg font-bold text-gray-900">{product.model_name}</h1>
      <p className="text-sm text-gray-500">
        {product.brand} · {product.category}
      </p>
      <p className="mt-2 text-lg font-bold text-brand-green">{formatPrice(product.price)}</p>
      <SizeChips sizes={product.sizes} />
      <ColorSwatches current={product} siblings={siblings} />
      <SpecsTable specs={product.specs} />
    </main>
  );
}
