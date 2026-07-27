"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice, getStockStatus, primaryArticleCode, totalOrderedQuantity, totalQuantity } from "@/lib/format";
import { ProductCarousel } from "@/components/ProductCarousel";
import { BackButton } from "@/components/BackButton";
import { copyToClipboard, formatWhatsAppMessage } from "@/lib/copy";
import { getRecommendations } from "@/lib/recommendations";
import { Copy, Check, Share2, ExternalLink, Sparkles, Package } from "lucide-react";

export function ProductDetailContent({
  product,
  allProducts,
}: {
  product: Product;
  allProducts: Product[];
}) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleCopyText = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      showToast(`${label} berhasil disalin!`);
    }
  };

  const handleCopyWhatsApp = async () => {
    const waText = formatWhatsAppMessage(product);
    const success = await copyToClipboard(waText);
    if (success) {
      showToast("Teks Format WhatsApp disalin ke Clipboard!");
    }
  };

  const qty = totalQuantity(product.sizes);
  const ordered = totalOrderedQuantity(product.sizes);
  const status = getStockStatus(qty);

  const mainArticle = String(primaryArticleCode(product.sizes));
  const colorDisplay = product.colors && product.colors.length > 0 ? product.colors.join(", ") : product.color_label;

  const infoRows = [
    { label: "Kode Artikel", value: mainArticle, copyable: true },
    { label: "Brand", value: product.brand, copyable: true },
    { label: "Kategori", value: product.category, copyable: false },
    ...(colorDisplay ? [{ label: "Warna", value: colorDisplay, copyable: true }] : []),
    ...(product.wheel_size
      ? [
          {
            label: product.category.startsWith("BIKE") ? "Ukuran Roda" : "Ukuran / Spek",
            value: product.wheel_size,
            copyable: true,
          },
        ]
      : []),
    { label: "Gudang", value: product.warehouse, copyable: false },
    ...(product.variant_extra ? [{ label: "Varian", value: product.variant_extra, copyable: true }] : []),
    { label: "Stok Tersedia", value: `${qty} unit`, copyable: false },
    { label: "Sedang Dipesan", value: `${ordered} unit`, copyable: false },
  ];

  const hasSizes = product.sizes.length > 1 || (product.sizes[0]?.size_code != null);
  const recommendations = getRecommendations(product, allProducts, 4);

  return (
    <div className="min-h-screen pb-16 [animation:slideInRight_0.28s_ease]">
      {/* Toast Feedback Banner */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-black/10 bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-lg animate-bounce">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.08] bg-[#f6f6f8]/80 px-5 py-3 backdrop-blur-xl">
        <BackButton />
        <button
          type="button"
          onClick={handleCopyWhatsApp}
          className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Salin seluruh info</span>
        </button>
      </div>

      <div className="mx-auto max-w-[560px] px-5 pt-5">
        <ProductCarousel images={product.images} alt={product.model_name} />

        <div className="mt-[22px]">
          {/* Brand & Category Badges */}
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

          {/* Model Name & Copy Action */}
          <div className="group mb-1.5 flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{product.model_name}</h1>
            <button
              type="button"
              onClick={() => handleCopyText(product.model_name, "Nama Model")}
              className="mt-1 flex shrink-0 items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 active:scale-95"
              title="Salin Nama Model"
            >
              <Copy className="h-3 w-3 text-gray-500" />
              <span>Salin</span>
            </button>
          </div>

          {/* Primary Article Code & Copy */}
          <div className="mb-4 flex items-center gap-2 font-mono text-[13px] text-gray-500">
            <span>Kode: {mainArticle}</span>
            <button
              type="button"
              onClick={() => handleCopyText(mainArticle, "Kode Artikel")}
              className="flex items-center gap-1 rounded bg-black/[0.05] px-1.5 py-0.5 text-[10.5px] font-medium hover:bg-black/10"
              title="Salin Kode Artikel"
            >
              <Copy className="h-2.5 w-2.5" />
              <span>Salin</span>
            </button>
          </div>

          <div className="mb-5 text-[30px] font-bold text-gray-900">{formatPrice(product.price)}</div>

          {/* Stock Status Badge */}
          <div className="mb-5.5 inline-flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-white/70 px-3.5 py-2">
            <div className="h-2 w-2 rounded-full" style={{ background: status.dotColor }} />
            <span className="text-sm font-semibold text-gray-900">{status.label}</span>
            <span className="text-[13px] text-gray-500">· {qty} unit</span>
          </div>

          {/* Ready Colors Badges */}
          {product.colors && product.colors.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Warna Ready:</span>
              {product.colors.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleCopyText(c, `Warna ${c}`)}
                  className="rounded-lg border border-black/[0.08] bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-sm hover:border-black/20"
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Core Product Details Table */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-lg">
            {infoRows.map((row, i) => (
              <div
                key={row.label}
                className={`flex items-center justify-between px-4 py-3.5 ${i < infoRows.length - 1 ? "border-b border-black/[0.08]" : ""}`}
              >
                <span className="text-sm text-gray-500">{row.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{row.value}</span>
                  {row.copyable && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(row.value, row.label)}
                      className="text-gray-400 hover:text-accent p-0.5"
                      title={`Salin ${row.label}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Per-Size Stock Table */}
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
                  const stockColor =
                    s.quantity <= 0 ? "text-red-400" : s.quantity < 5 ? "text-amber-500" : "text-emerald-600";
                  return (
                    <div key={i} className="contents">
                      <div className={`${rowBorder} px-4 py-3 font-semibold text-gray-900`}>
                        {s.size_code ?? "—"}
                      </div>
                      <div
                        onClick={() => handleCopyText(String(s.article_code), "Kode Artikel Size")}
                        className={`${rowBorder} cursor-pointer px-4 py-3 font-mono text-gray-600 hover:text-accent hover:underline`}
                        title="Klik untuk menyalin Kode Artikel"
                      >
                        {s.article_code}
                      </div>
                      <div className={`${rowBorder} px-3 py-3 text-right font-bold ${stockColor}`}>
                        {s.quantity}
                      </div>
                      <div className={`${rowBorder} px-4 py-3 text-right text-gray-500`}>
                        {s.ordered_quantity ?? 0}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Scraped Product Specifications Section with Clickable Blue Links */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-lg">
              <div className="border-b border-black/[0.08] px-4 py-3">
                <span className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">Spesifikasi Detail</span>
              </div>
              <div className="divide-y divide-black/[0.06]">
                {Object.entries(product.specs).map(([key, val]) => {
                  const isClickable = val.length > 2 && val.length < 80;
                  return (
                    <div key={key} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 sm:w-1/3">{key}</span>
                      <div className="sm:w-2/3 sm:text-right">
                        {isClickable ? (
                          <Link
                            href={`/?q=${encodeURIComponent(val.split(",")[0].split("/")[0].trim())}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                            title={`Cari produk berkaitan dengan "${val}"`}
                          >
                            <span>{val}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </Link>
                        ) : (
                          <span className="text-xs font-medium text-gray-800">{val}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Smart Recommendations Section (Blue Link Cards) */}
          {recommendations.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span>Rekomendasi Pelengkap (Stok Ready)</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {recommendations.map((rec) => (
                  <Link
                    key={rec.id}
                    href={`/product/${rec.id}`}
                    className="group flex flex-col justify-between rounded-xl border border-accent/20 bg-white p-3 backdrop-blur-md transition-all hover:border-accent hover:shadow-md"
                  >
                    <div className="flex flex-col gap-2">
                      {rec.images && rec.images.length > 0 ? (
                        <img
                          src={rec.images[0]}
                          alt={rec.model_name}
                          className="h-24 w-full object-contain rounded-lg border border-black/[0.04] p-1"
                        />
                      ) : (
                        <div className="flex h-24 w-full items-center justify-center rounded-lg bg-black/[0.03] text-gray-300">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="text-[11px] font-semibold text-accent">{rec.brand}</div>
                        <div className="line-clamp-2 text-xs font-bold text-gray-900 group-hover:text-accent">
                          {rec.model_name}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-black/[0.06] pt-2 text-[11px]">
                      <span className="font-bold text-gray-900">{formatPrice(rec.price)}</span>
                      <span className="font-semibold text-emerald-600">Ready</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
