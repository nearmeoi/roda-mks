"use client";

import { useMemo, useState } from "react";
import { getAllProducts } from "@/lib/products";
import { searchProducts } from "@/lib/search";
import { useStockCounts } from "@/lib/soWeek";
import { titleCase } from "@/lib/format";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { StockCountSheet } from "@/components/StockCountSheet";
import { BackButton } from "@/components/BackButton";
import type { Product } from "@/lib/types";
import { Package, ScanLine, Pencil, Trash2, CheckCircle2 } from "lucide-react";

const allProducts = getAllProducts();

export default function SoWeekPage() {
  const { counts, saveCount, deleteCount, clearCounts, getCount } = useStockCounts();
  const [showScanner, setShowScanner] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [notFoundMsg, setNotFoundMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of allProducts) {
      map.set(p.id, p);
    }
    return map;
  }, []);

  const searchResults = useMemo(() => {
    if (query.trim().length === 0) return [];
    return searchProducts(allProducts, query).slice(0, 8);
  }, [query]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const resolveCode = (code: string) => {
    setNotFoundMsg(null);
    const results = searchProducts(allProducts, code);
    if (results.length === 0) {
      setNotFoundMsg(`Produk dengan kode "${code}" tidak ditemukan.`);
      return;
    }
    if (results.length === 1) {
      setActiveProduct(results[0]);
      return;
    }
    setQuery(code);
  };

  const handleScan = (code: string) => {
    setShowScanner(false);
    resolveCode(code);
  };

  const handlePickResult = (p: Product) => {
    setQuery("");
    setActiveProduct(p);
  };

  const handleSaveCount = (qty: number) => {
    if (!activeProduct) return;
    const isEdit = getCount(activeProduct.id) !== undefined;
    saveCount(activeProduct.id, titleCase(activeProduct.model_name), qty);
    showToast(isEdit ? `Hitungan ${titleCase(activeProduct.model_name)} diperbarui ke ${qty}` : `Berhasil menyimpan ${qty} unit ${titleCase(activeProduct.model_name)}`);
    setActiveProduct(null);
    setShowScanner(true);
  };

  const handleDeleteCount = (productId: string, productName: string) => {
    if (window.confirm(`Hapus hitungan untuk "${productName}"?`)) {
      deleteCount(productId);
      showToast(`Hitungan ${productName} dihapus.`);
      if (activeProduct?.id === productId) {
        setActiveProduct(null);
      }
    }
  };

  const handleEditItem = (c: { productId: string; productName: string }) => {
    const p = productMap.get(c.productId);
    if (p) {
      setActiveProduct(p);
    } else {
      // Fallback synthetic product if product object not in catalog
      setActiveProduct({
        id: c.productId,
        brand: "Rodalink",
        model_name: c.productName,
        category: "Stock",
        warehouse: "",
        variant_extra: null,
        wheel_size: null,
        color_label: null,
        price: null,
        sizes: [],
        colors: [],
        images: [],
        specs: {},
        matched: true,
      });
    }
  };

  return (
    <div className="min-h-screen pb-28">
      {toastMsg && (
        <div className="fixed top-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toastMsg}
        </div>
      )}

      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.08] bg-[#f6f6f8]/80 px-5 py-3 backdrop-blur-xl">
        <BackButton />
        <span className="text-sm font-semibold text-gray-900">SO Week (Stock Opname)</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
            {counts.length} item
          </span>
          {counts.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Apakah Anda yakin ingin menghapus SELURUH daftar hitungan minggu ini?")) {
                  clearCounts();
                  showToast("Daftar SO Week telah dikosongkan.");
                }
              }}
              title="Kosongkan semua hitungan minggu ini"
              className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[560px] px-5 pt-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama atau kode artikel..."
          className="w-full rounded-full border border-black/[0.08] bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-accent"
        />

        {searchResults.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {searchResults.map((p) => {
              const existingCount = getCount(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePickResult(p)}
                  className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-white px-3.5 py-2.5 text-left text-sm font-medium text-gray-800 transition-all hover:border-accent"
                >
                  <span>{titleCase(p.model_name)}</span>
                  {existingCount && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                      Edit ({existingCount.countedQty})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {notFoundMsg && <p className="mt-2 text-center text-xs text-red-500">{notFoundMsg}</p>}

        <div className="mt-5 flex flex-col gap-2.5">
          {counts.length === 0 && (
            <p className="pt-10 text-center text-sm text-gray-400">
              Belum ada barang dihitung minggu ini.
              <br />
              Scan atau cari barang untuk mulai hitung fisik.
            </p>
          )}
          {counts.map((c) => {
            const matchedP = productMap.get(c.productId);
            const imageUrl = matchedP?.images?.[0];

            return (
              <div
                key={c.productId}
                className="group flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-3 transition-all hover:border-black/15 shadow-sm"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={c.productName}
                    className="h-10 w-10 shrink-0 rounded-xl border border-black/[0.06] object-contain bg-white"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-gray-400">
                    <Package className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleEditItem(c)}>
                  <div className="truncate text-[13px] font-semibold text-gray-900 group-hover:text-accent">
                    {c.productName}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Waktu: {new Date(c.countedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-black/[0.04] px-3 py-1.5 text-sm font-bold text-gray-900">
                    {c.countedQty} unit
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEditItem(c)}
                    title="Edit hitungan"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] text-gray-600 transition-all hover:bg-accent/10 hover:text-accent active:scale-95"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCount(c.productId, c.productName)}
                    title="Hapus hitungan"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition-all hover:bg-red-100 active:scale-95"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowScanner(true)}
        aria-label="Pindai barcode"
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_20px_rgba(10,124,255,0.4)] transition-all active:scale-95"
      >
        <ScanLine className="h-6 w-6" />
      </button>

      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {activeProduct && (
        <StockCountSheet
          product={activeProduct}
          initialQty={getCount(activeProduct.id)?.countedQty}
          onSave={handleSaveCount}
          onDelete={
            getCount(activeProduct.id) !== undefined
              ? () => handleDeleteCount(activeProduct.id, titleCase(activeProduct.model_name))
              : undefined
          }
          onClose={() => setActiveProduct(null)}
        />
      )}
    </div>
  );
}

