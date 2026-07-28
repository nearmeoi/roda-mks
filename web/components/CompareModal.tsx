"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice, getStockStatus, primaryArticleCode, titleCase, totalQuantity } from "@/lib/format";
import { X, ArrowLeftRight, Trash2, Package, ChevronDown } from "lucide-react";

interface CompareModalProps {
  products: Product[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function CompareModal({ products, onClose, onRemove, onClearAll }: CompareModalProps) {
  const [showDetailedSpecs, setShowDetailedSpecs] = useState(false);

  if (products.length === 0) return null;

  // Gather all unique spec keys across selected products
  const allSpecKeys = Array.from(
    new Set(
      products.flatMap((p) => (p.specs ? Object.keys(p.specs) : []))
    )
  );

  const colCount = products.length;

  const baseSpecs = [
    { label: "Brand", getValue: (p: Product) => titleCase(p.brand) },
    { label: "Kategori", getValue: (p: Product) => titleCase(p.category) },
    { label: "Kode Artikel", getValue: (p: Product) => primaryArticleCode(p.sizes) },
    { label: "Ukuran / Spek", getValue: (p: Product) => p.wheel_size || "—" },
    {
      label: "Warna Ready",
      render: (p: Product) => {
        const displayColors = p.colors && p.colors.length > 0 ? p.colors : p.color_label ? [p.color_label] : [];
        if (displayColors.length === 0) return <span className="text-gray-400">—</span>;
        return (
          <div className="flex flex-wrap justify-center gap-1">
            {displayColors.map((c, i) => (
              <span key={i} className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold text-gray-700 border border-black/[0.04]">
                {titleCase(c)}
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xl transition-all [animation:fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      {/* iOS Sheet Container with Fixed Height for Smooth Inner Scrolling */}
      <div
        className="relative flex h-[88vh] max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[32px] border-t border-white/50 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.15)] sm:h-[85vh] sm:max-h-[85vh] sm:max-w-4xl sm:mx-auto sm:my-auto sm:rounded-3xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Drag Capsule Bar */}
        <div className="flex w-full justify-center pt-3 pb-1 shrink-0 bg-white">
          <div className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        {/* Navigation Bar Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3 text-gray-900 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/10 text-accent border border-accent/20">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-900">Perbandingan Produk ({products.length})</h2>
              <p className="text-[11px] font-medium text-gray-500">Perbandingan spesifikasi & harga bersisian</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearAll}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup perbandingan"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.06] text-gray-700 transition-all hover:bg-black/10 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Fixed Equal Column Product Header Cards */}
        <div className="shrink-0 bg-white px-4 pt-3 pb-3 border-b border-gray-100 z-10 shadow-xs">
          <div
            className="grid gap-2 text-center"
            style={{
              gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
            }}
          >
            {products.map((p) => {
              const qty = totalQuantity(p.sizes);
              const status = getStockStatus(qty);
              return (
                <div
                  key={p.id}
                  className="relative flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-gray-50/70 p-2.5 shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => onRemove(p.id)}
                    aria-label={`Hapus ${p.model_name}`}
                    className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-gray-600 transition-all hover:bg-red-500 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>

                  <div className="flex flex-col items-center">
                    {p.images && p.images.length > 0 ? (
                      <img
                        src={p.images[0]}
                        alt={titleCase(p.model_name)}
                        className="h-20 w-full object-contain rounded-xl bg-white border border-gray-100 p-1"
                      />
                    ) : (
                      <div className="flex h-20 w-full items-center justify-center rounded-xl bg-black/[0.04] text-gray-400">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                    <span className="mt-1.5 text-[9.5px] font-bold uppercase text-gray-400 tracking-wider truncate max-w-full">
                      {titleCase(p.brand)}
                    </span>
                    <Link
                      href={`/product/${p.id}`}
                      onClick={onClose}
                      className="line-clamp-2 text-[11.5px] font-bold text-gray-900 hover:text-accent leading-tight mt-0.5"
                    >
                      {titleCase(p.model_name)}
                    </Link>
                  </div>

                  <div className="mt-2 flex flex-col items-center border-t border-gray-200/60 pt-1.5">
                    <span className="text-xs font-extrabold text-gray-900">{formatPrice(p.price)}</span>
                    <div className="mt-1 flex items-center gap-1 rounded-full bg-white px-2 py-0.5 border border-gray-200/80 text-[10px]">
                      <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: status.dotColor }} />
                      <span className="font-semibold text-gray-700">{status.label} ({qty})</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Body Content (Guaranteed Smooth Touch & Wheel Scrolling) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:p-6 text-xs space-y-3">
          {/* Base Specs */}
          <div className="divide-y divide-gray-100">
            {baseSpecs.map((row) => (
              <div key={row.label} className="py-2.5">
                <div className="mb-1 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/80 py-1 rounded-md border border-gray-100">
                  {row.label}
                </div>
                <div
                  className="grid gap-2 text-center items-center"
                  style={{
                    gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
                  }}
                >
                  {products.map((p) => (
                    <div key={p.id} className="p-1.5 font-medium text-gray-800 bg-gray-50/40 rounded-lg">
                      {row.render ? row.render(p) : row.getValue ? row.getValue(p) : "—"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Specs Section */}
          {allSpecKeys.length > 0 && (
            <div className="pt-2 pb-4">
              <button
                type="button"
                onClick={() => setShowDetailedSpecs(!showDetailedSpecs)}
                className="flex w-full items-center justify-between px-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-accent bg-accent/5 py-2.5 rounded-xl border border-accent/15 transition-all hover:bg-accent/10 active:scale-[0.98]"
              >
                <span>Spesifikasi Detail Lengkap</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showDetailedSpecs ? "rotate-180" : ""}`} />
              </button>

              <div className={`grid transition-all duration-300 ease-in-out ${showDetailedSpecs ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="divide-y divide-gray-100 border-t border-gray-100 mt-1">
                    {allSpecKeys.map((specKey) => (
                      <div key={specKey} className="py-2.5">
                        <div className="mb-1 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/80 py-1 rounded-md border border-gray-100">
                          {specKey}
                        </div>
                        <div
                          className="grid gap-2 text-center items-center"
                          style={{
                            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
                          }}
                        >
                          {products.map((p) => {
                            const val = p.specs ? p.specs[specKey] : null;
                            return (
                              <div key={p.id} className="p-1.5 font-medium text-gray-800 leading-normal bg-gray-50/40 rounded-lg">
                                {val || "—"}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
