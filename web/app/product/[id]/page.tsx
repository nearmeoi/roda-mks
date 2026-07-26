import { notFound } from "next/navigation";
import { getAllProducts, getProductById } from "@/lib/products";
import { formatPrice, getStockStatus, primaryArticleCode, totalOrderedQuantity, totalQuantity } from "@/lib/format";
import { ProductCarousel } from "@/components/ProductCarousel";
import { BackButton } from "@/components/BackButton";

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
    ...(product.wheel_size
      ? [
          {
            label: product.category.startsWith("BIKE") ? "Ukuran Roda" : "Ukuran / Spek",
            value: product.wheel_size,
          },
        ]
      : []),
    { label: "Gudang", value: product.warehouse },
    ...(product.variant_extra ? [{ label: "Varian", value: product.variant_extra }] : []),
    { label: "Stok Tersedia", value: `${qty} unit` },
    { label: "Sedang Dipesan", value: `${ordered} unit` },
  ];

  // Show the per-size table when there are multiple sizes, or when any size has a meaningful size_code
  const hasSizes = product.sizes.length > 1 || (product.sizes[0]?.size_code != null);

  return (
    <div className="min-h-screen pb-12 [animation:slideInRight_0.28s_ease]">
      <div className="sticky top-0 z-10 flex items-center border-b border-black/[0.08] bg-[#f6f6f8]/75 px-5 py-3.5 backdrop-blur-xl">
        <BackButton />
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

          {hasSizes && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-lg">
              <div className="border-b border-black/[0.08] px-4 py-3">
                <span className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">Stok per Ukuran</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto_auto] text-[13px]">
                <div className="border-b border-black/[0.06] px-4 py-2.5 font-medium text-gray-400">Ukuran</div>
                <div className="border-b border-black/[0.06] px-4 py-2.5 font-medium text-gray-400">Kode</div>
                <div className="border-b border-black/[0.06] px-3 py-2.5 text-right font-medium text-gray-400">Stok</div>
                <div className="border-b border-black/[0.06] px-4 py-2.5 text-right font-medium text-gray-400">Dipesan</div>
                {product.sizes.map((s, i) => {
                  const isLast = i === product.sizes.length - 1;
                  const rowBorder = isLast ? "" : "border-b border-black/[0.06]";
                  const stockColor = s.quantity <= 0
                    ? "text-red-400"
                    : s.quantity < 5
                    ? "text-amber-500"
                    : "text-emerald-600";
                  return (
                    <>
                      <div key={`sz-${i}`} className={`${rowBorder} px-4 py-3 font-semibold text-gray-900`}>
                        {s.size_code ?? "—"}
                      </div>
                      <div key={`ac-${i}`} className={`${rowBorder} px-4 py-3 font-mono text-gray-500`}>
                        {s.article_code}
                      </div>
                      <div key={`q-${i}`} className={`${rowBorder} px-3 py-3 text-right font-bold ${stockColor}`}>
                        {s.quantity}
                      </div>
                      <div key={`oq-${i}`} className={`${rowBorder} px-4 py-3 text-right text-gray-500`}>
                        {s.ordered_quantity ?? 0}
                      </div>
                    </>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

