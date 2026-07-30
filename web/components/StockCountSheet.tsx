"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { titleCase, getColorDisplay, primaryArticleCode, formatPrice } from "@/lib/format";
import { Package, Trash2, Store, Warehouse } from "lucide-react";

export function StockCountSheet({
  product,
  initialShQty,
  initialWhQty,
  initialQty,
  onSave,
  onDelete,
  onClose,
}: {
  product: Product;
  initialShQty?: number;
  initialWhQty?: number;
  initialQty?: number;
  onSave: (shQty: number, whQty: number) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const defaultSh = initialShQty !== undefined ? String(initialShQty) : (initialQty !== undefined ? String(initialQty) : "0");
  const defaultWh = initialWhQty !== undefined ? String(initialWhQty) : "0";

  const [shVal, setShVal] = useState(defaultSh);
  const [whVal, setWhVal] = useState(defaultWh);

  const isValidSh = /^\d+$/.test(shVal.trim());
  const isValidWh = /^\d+$/.test(whVal.trim());
  const isValid = isValidSh && isValidWh;

  const isEditing = initialShQty !== undefined || initialWhQty !== undefined || initialQty !== undefined;

  const shNum = isValidSh ? Number(shVal.trim()) : 0;
  const whNum = isValidWh ? Number(whVal.trim()) : 0;
  const totalNum = shNum + whNum;

  const handleSave = () => {
    if (!isValid) return;
    onSave(shNum, whNum);
  };

  const colorDisplay = getColorDisplay(product);
  const articleCode = primaryArticleCode(product.sizes);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm [animation:fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[24px] bg-white p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] [animation:fadeSlideUp_0.25s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/15" />

        <div className="flex items-center gap-3">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={titleCase(product.model_name)}
              className="h-20 w-20 shrink-0 rounded-2xl border border-black/[0.06] object-contain bg-white p-1"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-black/[0.03] text-gray-300">
              <Package className="h-7 w-7" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-accent">
                {titleCase(product.brand)}
              </span>
              <span className="rounded-full bg-black/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-gray-500">
                {titleCase(product.category)}
              </span>
              {isEditing && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                  Mode Edit
                </span>
              )}
            </div>

            <h3 className="mt-1 line-clamp-1 text-sm font-bold text-gray-900">{titleCase(product.model_name)}</h3>
            <p className="text-[11px] font-medium text-gray-500">
              Kode Artikel: <span className="font-semibold text-gray-800">{articleCode || product.id}</span>
            </p>
            {product.price && (
              <p className="text-[11px] font-semibold text-accent">{formatPrice(product.price)}</p>
            )}
          </div>
        </div>

        {/* SH & WH Count Inputs */}
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-3">
            {/* Showroom (SH) Input */}
            <div className="flex flex-col gap-1 rounded-2xl border border-black/10 bg-gray-50/60 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1">
                  <Store className="h-3.5 w-3.5 text-accent" />
                  SH (Showroom)
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShVal(String(Math.max(0, shNum - 1)))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-black/10 text-sm font-bold text-gray-700 active:scale-95"
                >
                  -
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={shVal}
                  onChange={(e) => setShVal(e.target.value)}
                  className="w-12 text-center text-lg font-extrabold text-gray-900 bg-transparent outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShVal(String(shNum + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-black/10 text-sm font-bold text-gray-700 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Warehouse (WH) Input */}
            <div className="flex flex-col gap-1 rounded-2xl border border-black/10 bg-gray-50/60 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1">
                  <Warehouse className="h-3.5 w-3.5 text-emerald-600" />
                  WH (Gudang)
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setWhVal(String(Math.max(0, whNum - 1)))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-black/10 text-sm font-bold text-gray-700 active:scale-95"
                >
                  -
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={whVal}
                  onChange={(e) => setWhVal(e.target.value)}
                  className="w-12 text-center text-lg font-extrabold text-gray-900 bg-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setWhVal(String(whNum + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-black/10 text-sm font-bold text-gray-700 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Total Calculation Display */}
          <div className="flex items-center justify-between rounded-xl bg-accent/10 px-4 py-2 text-xs font-semibold text-accent">
            <span>Total Hitung Fisik (SH + WH):</span>
            <span className="text-sm font-extrabold">{totalNum} unit</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 pt-1 border-t border-black/[0.06]">
          {onDelete && isEditing ? (
            <button
              type="button"
              onClick={onDelete}
              title="Hapus hitungan barang ini"
              className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            className="ml-auto rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-40 shadow-sm"
          >
            {isEditing ? "Simpan Perubahan" : "Simpan & Scan Lagi"}
          </button>
        </div>
      </div>
    </div>
  );
}


