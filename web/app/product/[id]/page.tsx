import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProducts, getProductById } from "@/lib/products";
import { formatPrice, getStockStatus, primaryArticleCode, totalOrderedQuantity, totalQuantity } from "@/lib/format";
import { ProductCarousel } from "@/components/ProductCarousel";

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ id: p.id }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  const qty = totalQuantity(product.sizes);
  const ordered = totalOrderedQuantity(product.sizes);
  const status = getStockStatus(qty);

  const colorDisplay = product.colors[0] ?? product.color_label;

  const infoRows = [
    { label: "Kode Artikel", value: String(primaryArticleCode(product.sizes)) },
    { label: "Brand", value: product.brand },
    { label: "Kategori", value: product.category },
    ...(colorDisplay ? [{ label: "Warna", value: colorDisplay }] : []),
    ...(product.wheel_size ? [{ label: "Ukuran Roda", value: product.wheel_size }] : []),
    { label: "Gudang", value: product.warehouse },
    ...(product.variant_extra ? [{ label: "Varian", value: product.variant_extra }] : []),
    { label: "Stok Tersedia", value: `${qty} unit` },
    { label: "Sedang Dipesan", value: `${ordered} unit` },
  ];

  return (
    <div className="min-h-screen pb-12 [animation:slideInRight_0.28s_ease]">
      <div className="sticky top-0 z-10 flex items-center border-b border-black/[0.08] bg-[#f6f6f8]/75 px-5 py-3.5 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-1 text-base font-medium">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path
              d="M9 1L2 8L9 15"
              stroke="var(--color-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ color: "var(--color-accent)" }}>Kembali</span>
        </Link>
      </div>

      <div className="mx-auto max-w-[560px] px-5 pt-5">
        <ProductCarousel images={product.images} alt={product.model_name} />

        <div className="mt-[22px]">
          <div className="mb-2.5 flex flex-wrap gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ color: "var(--color-accent)", background: "color-mix(in oklab, var(--color-accent) 10%, white)" }}
            >
              {product.brand}
            </span>
            <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-xs font-semibold text-gray-500">
              {product.category}
            </span>
          </div>

          <h1 className="mb-1.5 text-2xl font-bold tracking-tight text-gray-900">{product.model_name}</h1>
          <div className="mb-4 font-mono text-[13px] text-gray-500">{primaryArticleCode(product.sizes)}</div>
          <div className="mb-5 text-[30px] font-bold text-gray-900">{formatPrice(product.price)}</div>

          <div className="mb-5.5 inline-flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-white/70 px-3.5 py-2">
            <div className="h-2 w-2 rounded-full" style={{ background: status.dotColor }} />
            <span className="text-sm font-semibold text-gray-900">{status.label}</span>
            <span className="text-[13px] text-gray-500">· {qty} unit</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-lg">
            {infoRows.map((row, i) => (
              <div
                key={row.label}
                className={`flex items-center justify-between px-4 py-3.5 ${i < infoRows.length - 1 ? "border-b border-black/[0.08]" : ""}`}
              >
                <span className="text-sm text-gray-500">{row.label}</span>
                <span className="text-sm font-semibold text-gray-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
