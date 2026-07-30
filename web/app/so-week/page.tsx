"use client";

import { useMemo, useState } from "react";
import { getAllProducts } from "@/lib/products";
import { searchProducts } from "@/lib/search";
import { useStockCounts, formatSoWeekReport } from "@/lib/soWeek";
import { titleCase, primaryArticleCode, formatPrice } from "@/lib/format";
import { copyToClipboard } from "@/lib/copy";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { StockCountSheet } from "@/components/StockCountSheet";
import { BackButton } from "@/components/BackButton";
import type { Product } from "@/lib/types";
import { Package, ScanLine, Pencil, Trash2, CheckCircle2, UserCheck, Share2, Store, Warehouse } from "lucide-react";

const allProducts = getAllProducts();

export default function SoWeekPage() {
  const { counts, pic, updatePic, saveCount, deleteCount, clearCounts, getCount } = useStockCounts();
  const [showScanner, setShowScanner] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [notFoundMsg, setNotFoundMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isPicEditing, setIsPicEditing] = useState(false);
  const [picInput, setPicInput] = useState(pic);

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

  const totals = useMemo(() => {
    let sh = 0;
    let wh = 0;
    let total = 0;
    for (const c of counts) {
      const cSh = c.shQty ?? c.countedQty ?? 0;
      const cWh = c.whQty ?? 0;
      sh += cSh;
      wh += cWh;
      total += (cSh + cWh);
    }
    return { sh, wh, total };
  }, [counts]);

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

  const handleSaveCount = (shQty: number, whQty: number) => {
    if (!activeProduct) return;
    const isEdit = getCount(activeProduct.id) !== undefined;
    const articleCode = primaryArticleCode(activeProduct.sizes);

    saveCount(activeProduct.id, titleCase(activeProduct.model_name), shQty, whQty, {
      articleCode: articleCode || activeProduct.id,
      brand: activeProduct.brand,
      category: activeProduct.category,
      price: activeProduct.price,
    });

    const total = shQty + whQty;
    showToast(
      isEdit
        ? `Diperbarui: SH ${shQty} | WH ${whQty} (Total: ${total})`
        : `Tersimpan: SH ${shQty} | WH ${whQty} (Total: ${total} unit)`
    );
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

  const handleExportReport = async () => {
    if (counts.length === 0) return;
    const text = formatSoWeekReport(counts, pic);
    const ok = await copyToClipboard(text);
    if (ok) {
      showToast("Laporan SO Week tercopy ke clipboard! Siap kirim ke WA.");
    }
  };

  const handleSavePic = () => {
    updatePic(picInput);
    setIsPicEditing(false);
    showToast(`PIC SO disimpan: ${picInput.trim() || "Tidak diisi"}`);
  };

  const handleEditItem = (c: { productId: string; productName: string }) => {
    const p = productMap.get(c.productId);
    if (p) {
      setActiveProduct(p);
    } else {
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
    <div className="min-h-screen pb-28 bg-[#f8f9fa]">
      {toastMsg && (
        <div className="fixed top-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toastMsg}
        </div>
      )}

      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.08] bg-white/90 px-4 py-3 backdrop-blur-xl">
        <BackButton />
        <span className="text-sm font-bold text-gray-900">SO Week (Stock Opname)</span>
        <div className="flex items-center gap-2">
          {counts.length > 0 && (
            <button
              type="button"
              onClick={handleExportReport}
              title="Salin Laporan SO ke WhatsApp"
              className="flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Share2 className="h-3 w-3" />
              <span>Salin WA</span>
            </button>
          )}
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
              className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[560px] px-4 pt-3">
        {/* PIC Header & Summary Banner */}
        <div className="mb-3.5 flex flex-col gap-2 rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-gray-500">PIC SO:</span>
              {isPicEditing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={picInput}
                    onChange={(e) => setPicInput(e.target.value)}
                    placeholder="Nama PIC (misal: Cintya)"
                    className="rounded-lg border border-black/15 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-900 outline-none focus:border-accent"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSavePic}
                    className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Simpan
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPicInput(pic);
                    setIsPicEditing(true);
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-gray-900 hover:text-accent"
                >
                  <span>{pic || "Set Nama PIC..."}</span>
                  <Pencil className="h-3 w-3 text-gray-400" />
                </button>
              )}
            </div>
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-extrabold text-accent">
              {counts.length} Item Terhitung
            </span>
          </div>

          {counts.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-black/[0.05]">
              <div className="flex flex-col items-center rounded-xl bg-accent/5 p-1.5">
                <span className="flex items-center gap-1 text-[10px] font-bold text-accent">
                  <Store className="h-3 w-3" />
                  SH (Showroom)
                </span>
                <span className="text-xs font-extrabold text-gray-900">{totals.sh} unit</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-emerald-50 p-1.5">
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                  <Warehouse className="h-3 w-3" />
                  WH (Gudang)
                </span>
                <span className="text-xs font-extrabold text-gray-900">{totals.wh} unit</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-gray-900 text-white p-1.5">
                <span className="text-[10px] font-semibold text-gray-300">Grand Total</span>
                <span className="text-xs font-extrabold">{totals.total} unit</span>
              </div>
            </div>
          )}
        </div>

        {/* Search input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama atau kode artikel..."
          className="w-full rounded-full border border-black/[0.08] bg-white px-4 py-2.5 text-sm text-gray-900 outline-none shadow-sm focus:border-accent"
        />

        {searchResults.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {searchResults.map((p) => {
              const existingCount = getCount(p.id);
              const artCode = primaryArticleCode(p.sizes);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePickResult(p)}
                  className="flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white px-4 py-2.5 text-left text-sm font-medium text-gray-800 transition-all hover:border-accent shadow-sm"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="truncate text-xs font-bold text-gray-900">{titleCase(p.model_name)}</div>
                    <div className="text-[11px] text-gray-400">
                      Art Code: <span className="font-semibold text-gray-700">{artCode || p.id}</span>
                      {p.brand ? ` · ${p.brand}` : ""}
                    </div>
                  </div>
                  {existingCount ? (
                    <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                      SH: {existingCount.shQty ?? existingCount.countedQty} | WH: {existingCount.whQty ?? 0}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-semibold text-accent">+ Hitung</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {notFoundMsg && <p className="mt-2 text-center text-xs text-red-500">{notFoundMsg}</p>}

        {/* Counted Items List */}
        <div className="mt-4 flex flex-col gap-2.5">
          {counts.length === 0 && (
            <div className="pt-10 text-center text-sm text-gray-400">
              <Package className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              Belum ada barang terhitung minggu ini.
              <br />
              Scan barcode atau cari kode artikel di atas untuk mulai.
            </div>
          )}
          {counts.map((c) => {
            const matchedP = productMap.get(c.productId);
            const imageUrl = matchedP?.images?.[0];
            const sh = c.shQty ?? c.countedQty ?? 0;
            const wh = c.whQty ?? 0;
            const total = sh + wh;
            const artCode = c.articleCode || (matchedP ? primaryArticleCode(matchedP.sizes) : c.productId);

            return (
              <div
                key={c.productId}
                className="group flex flex-col gap-2 rounded-2xl border border-black/[0.06] bg-white p-3.5 transition-all hover:border-black/15 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={c.productName}
                      className="h-12 w-12 shrink-0 rounded-xl border border-black/[0.06] object-contain bg-white p-0.5"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-gray-400">
                      <Package className="h-6 w-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleEditItem(c)}>
                    <div className="truncate text-xs font-bold text-gray-900 group-hover:text-accent">
                      {c.productName}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                      <span>Kode: <span className="font-semibold text-gray-800">{artCode}</span></span>
                      {c.price && <span>· {formatPrice(c.price)}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
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

                {/* Breakdown Badges SH & WH */}
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-600">
                      SH: <span className="font-bold text-accent">{sh}</span>
                    </span>
                    <span className="font-medium text-gray-600">
                      WH: <span className="font-bold text-emerald-600">{wh}</span>
                    </span>
                  </div>
                  <div className="font-bold text-gray-900">
                    Total: <span className="text-accent">{total} unit</span>
                  </div>
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
          initialShQty={getCount(activeProduct.id)?.shQty}
          initialWhQty={getCount(activeProduct.id)?.whQty}
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


