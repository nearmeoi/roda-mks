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
import { Package, ScanLine } from "lucide-react";

const allProducts = getAllProducts();

export default function SoWeekPage() {
  const { counts, saveCount, getCount } = useStockCounts();
  const [showScanner, setShowScanner] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [notFoundMsg, setNotFoundMsg] = useState<string | null>(null);

  const searchResults = useMemo(() => {
    if (query.trim().length === 0) return [];
    return searchProducts(allProducts, query).slice(0, 8);
  }, [query]);

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
    // Ambiguous (rare for a full barcode/article code) -- let staff pick
    // from the search results list instead of guessing.
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
    saveCount(activeProduct.id, titleCase(activeProduct.model_name), qty);
    setActiveProduct(null);
    setShowScanner(true);
  };

  return (
    <div className="min-h-screen pb-28">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.08] bg-[#f6f6f8]/80 px-5 py-3 backdrop-blur-xl">
        <BackButton />
        <span className="text-sm font-semibold text-gray-900">SO Week</span>
        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
          {counts.length} dihitung
        </span>
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
            {searchResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePickResult(p)}
                className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 transition-all hover:border-accent"
              >
                {titleCase(p.model_name)}
              </button>
            ))}
          </div>
        )}

        {notFoundMsg && <p className="mt-2 text-center text-xs text-red-500">{notFoundMsg}</p>}

        <div className="mt-5 flex flex-col gap-2.5">
          {counts.length === 0 && (
            <p className="pt-10 text-center text-sm text-gray-400">
              Belum ada barang dihitung minggu ini.
              <br />
              Scan atau cari untuk mulai.
            </p>
          )}
          {counts.map((c) => (
            <div
              key={c.productId}
              className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-gray-400">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-gray-900">{c.productName}</div>
                <div className="text-[11px] text-gray-400">
                  {new Date(c.countedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="text-sm font-bold text-gray-900">{c.countedQty}</div>
            </div>
          ))}
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
          onClose={() => setActiveProduct(null)}
        />
      )}
    </div>
  );
}
