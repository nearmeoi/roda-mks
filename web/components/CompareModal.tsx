"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice, getStockStatus, primaryArticleCode, totalQuantity } from "@/lib/format";
import { X, ArrowLeftRight, Check, Trash2, Package } from "lucide-react";

interface CompareModalProps {
  products: Product[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function CompareModal({ products, onClose, onRemove, onClearAll }: CompareModalProps) {
  if (products.length === 0) return null;

  // Gather all unique spec keys across selected products
  const allSpecKeys = Array.from(
    new Set(
      products.flatMap((p) => (p.specs ? Object.keys(p.specs) : []))
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-md [animation:fadeIn_0.2s_ease]">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gray-900/90 px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Perbandingan Produk ({products.length})</h2>
            <p className="text-xs text-gray-400">Bandingkan spesifikasi, harga, & stok secara bersisian</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup perbandingan"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-auto bg-[#f6f6f8] p-4 sm:p-6">
        <div className="mx-auto max-w-5xl rounded-3xl border border-black/[0.08] bg-white p-4 shadow-xl sm:p-6">
          
          {/* Top Sticky Header Row: Product Cards */}
          <div className="grid grid-cols-[140px_repeat(auto-fit,minmax(200px,1fr))] gap-4 border-b border-black/[0.08] pb-6">
            <div className="flex flex-col justify-end text-xs font-bold uppercase tracking-wider text-gray-400">
              Produk
            </div>

            {products.map((p) => {
              const qty = totalQuantity(p.sizes);
              const status = getStockStatus(qty);
              return (
                <div key={p.id} className="relative flex flex-col justify-between rounded-2xl border border-black/[0.08] bg-gray-50/50 p-3">
                  <button
                    type="button"
                    onClick={() => onRemove(p.id)}
                    aria-label={`Hapus ${p.model_name} dari perbandingan`}
                    className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-gray-600 hover:bg-red-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  <div className="flex flex-col items-center text-center">
                    {p.images && p.images.length > 0 ? (
                      <img
                        src={p.images[0]}
                        alt={p.model_name}
                        className="h-28 w-full object-contain rounded-xl bg-white border border-black/[0.04] p-1.5"
                      />
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center rounded-xl bg-black/[0.04] text-gray-400">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                    <span className="mt-2 text-[11px] font-bold text-accent">{p.brand}</span>
                    <Link
                      href={`/product/${p.id}`}
                      onClick={onClose}
                      className="line-clamp-2 text-xs font-bold text-gray-900 hover:text-accent hover:underline"
                    >
                      {p.model_name}
                    </Link>
                  </div>

                  <div className="mt-3 flex flex-col items-center border-t border-black/[0.06] pt-2 text-center">
                    <span className="text-sm font-bold text-gray-900">{formatPrice(p.price)}</span>
                    <div className="mt-1 flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 border border-black/[0.06] text-[11px]">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: status.dotColor }} />
                      <span className="font-semibold text-gray-800">{qty} unit</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Side-by-Side Attribute Matrix */}
          <div className="divide-y divide-black/[0.06] text-xs">
            {/* Brand */}
            <div className="grid grid-cols-[140px_repeat(auto-fit,minmax(200px,1fr))] gap-4 py-3 items-center">
              <span className="font-semibold text-gray-500">Brand</span>
              {products.map((p) => (
                <span key={p.id} className="font-bold text-gray-900">{p.brand}</span>
              ))}
            </div>

            {/* Kategori */}
            <div className="grid grid-cols-[140px_repeat(auto-fit,minmax(200px,1fr))] gap-4 py-3 items-center">
              <span className="font-semibold text-gray-500">Kategori</span>
              {products.map((p) => (
                <span key={p.id} className="font-medium text-gray-800">{p.category}</span>
              ))}
            </div>

            {/* Kode Artikel Utama */}
            <div className="grid grid-cols-[140px_repeat(auto-fit,minmax(200px,1fr))] gap-4 py-3 items-center">
              <span className="font-semibold text-gray-500">Kode Artikel</span>
              {products.map((p) => (
                <span key={p.id} className="font-mono text-gray-700">{primaryArticleCode(p.sizes)}</span>
              ))}
            </div>

            {/* Ukuran / Spek */}
            <div className="grid grid-cols-[140px_repeat(auto-fit,minmax(200px,1fr))] gap-4 py-3 items-center">
              <span className="font-semibold text-gray-500">Ukuran / Wheel</span>
              {products.map((p) => (
                <span key={p.id} className="font-medium text-gray-800">{p.wheel_size || "—"}</span>
              ))}
            </div>

            {/* Warna Ready */}
            <div className="grid grid-cols-[140px_repeat(auto-fit,minmax(200px,1fr))] gap-4 py-3 items-center">
              <span className="font-semibold text-gray-500">Warna Ready</span>
              {products.map((p) => (
                <div key={p.id} className="flex flex-wrap gap-1">
                  {p.colors && p.colors.length > 0 ? (
                    p.colors.map((c, idx) => (
                      <span key={idx} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              ))}
            </div>

            {/* Detailed Scraped Specs Matrix */}
            {allSpecKeys.length > 0 && (
              <div className="pt-4">
                <div className="mb-2 font-bold uppercase tracking-wider text-gray-400 text-[11px]">
                  Spesifikasi Detail
                </div>
                <div className="divide-y divide-black/[0.06]">
                  {allSpecKeys.map((specKey) => (
                    <div key={specKey} className="grid grid-cols-[140px_repeat(auto-fit,minmax(200px,1fr))] gap-4 py-2.5 items-start">
                      <span className="font-semibold text-gray-500">{specKey}</span>
                      {products.map((p) => {
                        const val = p.specs ? p.specs[specKey] : null;
                        return (
                          <span key={p.id} className="font-medium text-gray-800">
                            {val || "—"}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
