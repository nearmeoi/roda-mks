"use client";

import { useMemo, useState } from "react";
import { Search, X, Mic, Tag, Copy, Check } from "lucide-react";
import { BarcodeScanner } from "./BarcodeScanner";
import { promoProducts, searchPromoProducts, type PromoProduct } from "@/lib/promoProducts";
import { formatPrice } from "@/lib/format";

const CATEGORIES = [
  "Semua",
  "Diskon PAA Up to 81%",
  "Diskon 10% Thule",
  "Aging Polygon",
  "Aging Marin",
  "Gratis Tas / Paper Bag",
];

const ITEMS_PER_PAGE = 40;

function getCategoryBadgeColor(cat: string) {
  switch (cat) {
    case "Diskon PAA Up to 81%":
      return "bg-rose-50 text-rose-700 border-rose-200/60";
    case "Diskon 10% Thule":
      return "bg-sky-50 text-sky-700 border-sky-200/60";
    case "Aging Polygon":
      return "bg-amber-50 text-amber-700 border-amber-200/60";
    case "Aging Marin":
      return "bg-indigo-50 text-indigo-700 border-indigo-200/60";
    case "Gratis Tas / Paper Bag":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function PromoProductsViewer({ initialCategory = "Semua" }: { initialCategory?: string }) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [showScanner, setShowScanner] = useState(false);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return searchPromoProducts(promoProducts, query, selectedCategory);
  }, [query, selectedCategory]);

  const visibleItems = useMemo(() => {
    return filtered.slice(0, displayCount);
  }, [filtered, displayCount]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-xl md:p-6">
      {/* Header Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Tag className="h-5 w-5 text-accent" />
            Cari & Daftar Barang Promo Buku Saku
          </h3>
          <p className="text-xs text-gray-500">
            Ketik nama barang, kode artikel, scan barcode, atau filter kategori promo.
          </p>
        </div>
        <div className="mt-1 flex items-center gap-2 sm:mt-0">
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            {filtered.length.toLocaleString()} Barang Promo
          </span>
        </div>
      </div>

      {/* Search Input Bar with Barcode Scanner & Clear */}
      <div className="relative flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3.5 py-2 shadow-xs transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDisplayCount(ITEMS_PER_PAGE);
          }}
          placeholder="Cari kode artikel, barcode, deskripsi, atau brand..."
          className="w-full border-none bg-transparent text-sm text-gray-900 outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDisplayCount(ITEMS_PER_PAGE);
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
          >
            <X className="h-3.5 w-3.5 text-gray-600" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          title="Pindai Barcode"
          className="flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-accent/90 active:scale-95 shadow-xs shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 6V4a1 1 0 0 1 1-1h2M3 18v2a1 1 0 0 0 1 1h2M21 6V4a1 1 0 0 0-1-1h-2M21 18v2a1 1 0 0 1-1 1h-2"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M7 7v10M10 7v10M13 7v10M15.5 7v10M18 7v10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Scan Barcode</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setDisplayCount(ITEMS_PER_PAGE);
              }}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? "bg-accent text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Products Table / Cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Tidak ditemukan barang promo yang cocok dengan &quot;{query}&quot;
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/10 bg-gray-50/80 text-gray-500">
                <tr>
                  <th className="px-3.5 py-3 font-semibold">Artikel / Barcode</th>
                  <th className="px-3.5 py-3 font-semibold">Deskripsi & Brand</th>
                  <th className="px-3.5 py-3 font-semibold">Kategori Promo</th>
                  <th className="px-3.5 py-3 text-right font-semibold">Harga Retail</th>
                  <th className="px-3.5 py-3 text-center font-semibold">Diskon</th>
                  <th className="px-3.5 py-3 text-right font-semibold text-gray-900">Harga Nett</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {visibleItems.map((item, idx) => (
                  <tr key={`${item.articleCode}-${idx}`} className="hover:bg-gray-50/60 transition-colors">
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs font-semibold text-gray-800">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(item.articleCode)}
                        className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 hover:bg-gray-200 transition-colors"
                        title="Klik untuk salin kode"
                      >
                        <span>{item.articleCode}</span>
                        {copiedCode === item.articleCode ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-semibold text-gray-900">{item.description}</div>
                      <div className="mt-0.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                        {item.brand}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getCategoryBadgeColor(
                          item.promoCategory
                        )}`}
                      >
                        {item.promoCategory}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-medium text-gray-400 line-through">
                      {item.retailPrice > 0 ? formatPrice(item.retailPrice) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-center">
                      <span className="inline-block rounded-md bg-rose-100 px-2 py-0.5 font-bold text-rose-700">
                        {item.discountLabel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-bold text-emerald-700 text-sm">
                      {item.nettPrice > 0 ? formatPrice(item.nettPrice) : item.discountLabel.includes("Gratis") ? "Rp 0 (Gratis)" : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More Button if results > displayCount */}
          {displayCount < filtered.length && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setDisplayCount((prev) => prev + ITEMS_PER_PAGE)}
                className="rounded-full border border-black/10 bg-white px-5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 active:scale-95 transition-all"
              >
                Muat Lebih Banyak ({filtered.length - displayCount} tersisa)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={(code) => {
            setShowScanner(false);
            setSelectedCategory("Semua");
            setQuery(code);
            setDisplayCount(ITEMS_PER_PAGE);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
