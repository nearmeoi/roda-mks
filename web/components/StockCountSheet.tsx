"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { titleCase, getColorDisplay, primaryArticleCode } from "@/lib/format";
import { Package, Trash2 } from "lucide-react";

export function StockCountSheet({
  product,
  initialQty,
  onSave,
  onDelete,
  onClose,
}: {
  product: Product;
  initialQty?: number;
  onSave: (qty: number) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialQty !== undefined ? String(initialQty) : "");

  const isValid = /^\d+$/.test(value.trim());
  const isEditing = initialQty !== undefined;

  const handleSave = () => {
    if (!isValid) return;
    onSave(Number(value.trim()));
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
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/15" />

        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={titleCase(product.model_name)}
            className="h-28 w-full rounded-2xl border border-black/[0.06] object-contain bg-white"
          />
        ) : (
          <div className="flex h-28 w-full items-center justify-center rounded-2xl bg-black/[0.03] text-gray-300">
            <Package className="h-8 w-8" />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
            {titleCase(product.brand)}
          </span>
          <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-semibold text-gray-500">
            {titleCase(product.category)}
          </span>
          {isEditing && (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
              Mode Edit
            </span>
          )}
        </div>

        <h3 className="mt-2 text-base font-bold text-gray-900">{titleCase(product.model_name)}</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Kode: {articleCode}
          {colorDisplay ? ` · ${colorDisplay}` : ""}
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-accent px-4 py-3">
          <span className="text-xs font-semibold text-gray-600">Hitung fisik</span>
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            className="w-16 border-none text-lg font-bold text-gray-900 outline-none"
            autoFocus
          />
          <div className="ml-auto flex items-center gap-1.5">
            {onDelete && isEditing && (
              <button
                type="button"
                onClick={onDelete}
                title="Hapus hitungan barang ini"
                className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid}
              className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
            >
              {isEditing ? "Simpan Perubahan" : "Simpan & Scan Lagi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

