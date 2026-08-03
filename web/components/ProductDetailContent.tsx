"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice, getStockStatus, primaryArticleCode, titleCase, totalOrderedQuantity, totalQuantity } from "@/lib/format";
import { ProductCarousel } from "@/components/ProductCarousel";
import { OtherOutletStock } from "@/components/OtherOutletStock";
import { BackButton } from "@/components/BackButton";
import { copyToClipboard, formatWhatsAppMessage } from "@/lib/copy";
import { getRecommendations } from "@/lib/recommendations";
import { useCompareList } from "@/lib/comparison";
import { Copy, Check, Share2, ExternalLink, Sparkles, Package, ArrowLeftRight, ChevronDown, Search, X } from "lucide-react";

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="rounded-xs bg-amber-200 text-gray-900 px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function ProductDetailContent({
  product,
  allProducts,
  onBack,
}: {
  product: Product;
  allProducts: Product[];
  onBack?: () => void;
}) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showSpecs, setShowSpecs] = useState(false);
  const [specQuery, setSpecQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { isCompared, toggleCompare } = useCompareList();
  const compared = isCompared(product.id);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleCopyText = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      showToast(`${label} disalin`);
    }
  };

  const handleCopyWhatsApp = async () => {
    const waText = formatWhatsAppMessage(product);
    const success = await copyToClipboard(waText);
    if (success) {
      showToast("Info disalin");
    }
  };

  const qty = totalQuantity(product.sizes);
  const ordered = totalOrderedQuantity(product.sizes);
  const status = getStockStatus(qty);

  const mainArticle = String(primaryArticleCode(product.sizes));
  const displayName = titleCase(product.model_name);
  const displayBrand = titleCase(product.brand);
  const displayCategory = titleCase(product.category);
  const colorDisplay = product.colors && product.colors.length > 0
    ? product.colors.map(titleCase).join(", ")
    : product.color_label
      ? titleCase(product.color_label)
      : null;

  const infoRows = [
    { label: "Kode Artikel", value: mainArticle, copyable: true },
    { label: "Brand", value: displayBrand, copyable: true },
    { label: "Kategori", value: displayCategory, copyable: false },
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

  const cleanQuery = specQuery.trim().toLowerCase();

  // Filter info rows based on spec search query
  const filteredInfoRows = infoRows.filter((row) => {
    if (!cleanQuery) return true;
    return row.label.toLowerCase().includes(cleanQuery) || row.value.toLowerCase().includes(cleanQuery);
  });

  // Filter detailed specs dictionary
  const rawSpecsEntries = product.specs ? Object.entries(product.specs) : [];
  const filteredSpecsEntries = rawSpecsEntries.filter(([key, val]) => {
    if (!cleanQuery) return true;
    return key.toLowerCase().includes(cleanQuery) || val.toLowerCase().includes(cleanQuery);
  });

  const handleSpecSearchChange = (val: string) => {
    setSpecQuery(val);
    if (val.trim().length > 0) {
      setShowSpecs(true);
    }
  };

  const focusSearchInput = () => {
    searchInputRef.current?.focus();
  };

  return (
    <div className="min-h-screen pb-16 [animation:slideInRight_0.28s_ease]">
      {/* Toast Feedback Banner */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-black/10 bg-gray-900/90 px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-lg [animation:fadeSlideUp_0.25s_ease]">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.08] bg-[#f6f6f8]/80 px-5 py-3 backdrop-blur-xl gap-2">
        <BackButton onClick={onBack} />
        <div className="flex items-center gap-2">
          {/* Quick Focus Spec Search Icon */}
          <button
            type="button"
            onClick={focusSearchInput}
            title="Cari spesifikasi (warna, material, shifter...)"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              toggleCompare(product.id);
              showToast(compared ? "Dihapus" : "Ditambahkan");
            }}
            title={compared ? "Dibandingkan" : "Bandingkan"}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all active:scale-95 ${
              compared
                ? "border-accent bg-accent text-white"
                : "border-black/10 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Salin WA</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[560px] px-5 pt-5">
        <ProductCarousel images={product.images} alt={displayName} />

        <div className="mt-[22px]">
          {/* Brand & Category Badges */}
          <div className="mb-2.5 flex flex-wrap gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ color: "var(--color-accent)", background: "color-mix(in oklab, var(--color-accent) 10%, white)" }}
            >
              {displayBrand}
            </span>
            <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-xs font-semibold text-gray-500">
              {displayCategory}
            </span>
          </div>

          {/* Model Name & Copy Action */}
          <div className="group mb-1.5 flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{displayName}</h1>
            <button
              type="button"
              onClick={() => handleCopyText(displayName, "Nama Model")}
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
            <span className="text-sm font-semibold text-gray-900">{qty} Unit</span>
          </div>

          <OtherOutletStock query={product.model_name} />

          {/* Ready Colors Badges */}
          {product.colors && product.colors.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Warna Ready</span>
              {product.colors.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleCopyText(titleCase(c), `Warna ${titleCase(c)}`)}
                  className="rounded-lg border border-black/[0.08] bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-sm hover:border-black/20"
                >
                  {titleCase(c)}
                </button>
              ))}
            </div>
          )}

          {/* Spec Search Bar Section */}
          <div className="mb-5 relative">
            <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3.5 py-2 shadow-xs transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={specQuery}
                onChange={(e) => handleSpecSearchChange(e.target.value)}
                placeholder="Cari spesifikasi (warna, material, shifter, ban...)"
                className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              {specQuery && (
                <button
                  type="button"
                  onClick={() => setSpecQuery("")}
                  className="rounded-full bg-black/10 p-1 text-gray-500 hover:text-gray-700"
                  aria-label="Bersihkan pencarian spesifikasi"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {cleanQuery && (
              <div className="mt-1.5 px-1 text-[11.5px] font-semibold text-gray-500">
                Menampilkan hasil spesifikasi cocok dengan &quot;<span className="text-accent">{cleanQuery}</span>&quot;
              </div>
            )}
          </div>

          {/* Core Product Details Table */}
          {filteredInfoRows.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-lg">
              {filteredInfoRows.map((row, i) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between px-4 py-3.5 ${
                    i < filteredInfoRows.length - 1 ? "border-b border-black/[0.08]" : ""
                  }`}
                >
                  <span className="text-sm text-gray-500">{highlightMatch(row.label, cleanQuery)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {highlightMatch(row.value, cleanQuery)}
                    </span>
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
          )}

          {/* Per-Size Stock Table */}
          {hasSizes && !cleanQuery && (
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

          {/* Full Scraped Product Specifications Section */}
          {rawSpecsEntries.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-lg">
              <button
                type="button"
                onClick={() => setShowSpecs(!showSpecs)}
                className="flex w-full items-center justify-between px-4 py-3 border-b border-transparent transition-colors hover:bg-gray-50 active:bg-gray-100"
              >
                <span className="text-[13px] font-semibold uppercase tracking-wide text-gray-700">
                  Spesifikasi Detail Lengkap {cleanQuery ? `(${filteredSpecsEntries.length})` : ""}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${
                    showSpecs ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  showSpecs ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="divide-y divide-black/[0.06] border-t border-black/[0.08]">
                    {filteredSpecsEntries.length > 0 ? (
                      filteredSpecsEntries.map(([key, val]) => {
                        const k = key.toLowerCase();
                        const v = val.toLowerCase();

                        const isPartOrCompatibility =
                          k === "brand" ||
                          k.includes("kompatib") ||
                          k.includes("compatib") ||
                          v.includes("kompatib") ||
                          v.includes("compatib") ||
                          [
                            "bottom bracket",
                            "bb",
                            "shifter",
                            "cassette",
                            "crank",
                            "chain",
                            "derailleur",
                            "brake rotor",
                            "brake lever",
                            "head set",
                            "front hub",
                            "rear hub",
                          ].some((partKey) => k.includes(partKey));

                        const isClickable = isPartOrCompatibility && val.length > 1 && val.length < 90;
                        const searchTarget =
                          k === "brand" ? val.trim() : val.split(",")[0].split(" FOR ")[0].trim();

                        return (
                          <div
                            key={key}
                            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center justify-between"
                          >
                            <span className="text-xs font-semibold text-gray-500 sm:w-1/3">
                              {highlightMatch(key, cleanQuery)}
                            </span>
                            <div className="sm:w-2/3 sm:text-right">
                              {isClickable ? (
                                <Link
                                  href={`/?q=${encodeURIComponent(searchTarget)}`}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                                  title={`Cari stok part/brand "${searchTarget}"`}
                                >
                                  <span>{highlightMatch(val, cleanQuery)}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </Link>
                              ) : (
                                <span className="text-xs font-medium text-gray-800">
                                  {highlightMatch(val, cleanQuery)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-4 text-center text-xs text-gray-500">
                        Tidak ada spesifikasi detail yang cocok dengan &quot;{cleanQuery}&quot;
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Smart Recommendations Section */}
          {recommendations.length > 0 && !cleanQuery && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span>Rekomendasi Tambahan</span>
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
                          alt={titleCase(rec.model_name)}
                          className="h-24 w-full object-contain rounded-lg border border-black/[0.04] p-1"
                        />
                      ) : (
                        <div className="flex h-24 w-full items-center justify-center rounded-lg bg-black/[0.03] text-gray-300">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="text-[11px] font-semibold text-accent">{titleCase(rec.brand)}</div>
                        <div className="line-clamp-2 text-xs font-semibold text-gray-900 group-hover:text-accent">
                          {titleCase(rec.model_name)}
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
