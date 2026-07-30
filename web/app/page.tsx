"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { ResultRow } from "@/components/ResultRow";
import { AllStockRow } from "@/components/AllStockRow";
import { CompareModal } from "@/components/CompareModal";
import { getAllProducts } from "@/lib/products";
import { searchProducts } from "@/lib/search";
import { useAllStock, searchAllStock } from "@/lib/allStock";
import { useFavorites } from "@/lib/favorites";
import { useRecentSearches } from "@/lib/recentSearches";
import { useCompareList } from "@/lib/comparison";
import { useStockCounts } from "@/lib/soWeek";
import { copyToClipboard, formatBulkWhatsAppMessage } from "@/lib/copy";
import { Star, History, X, ArrowLeftRight, ClipboardList, Check, Copy, BookOpen, Wallet, Boxes } from "lucide-react";

const RESULT_LIMIT = 15;
const allProducts = getAllProducts();

function HomeContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Multi-select / Checklist state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedToast, setCopiedToast] = useState(false);

  const { favorites, toggle, isFav } = useFavorites();
  const { recent, addSearch, removeSearch } = useRecentSearches();
  const { compareIds, toggleCompare, isCompared, clearAll: clearCompare } = useCompareList();
  const { counts: stockCounts } = useStockCounts();

  // Sync internal state if URL changes (e.g. back navigation)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
    if (q) addSearch(q);
  }, [searchParams]);

  // Update URL state synchronously
  const updateUrlParams = (newQuery: string) => {
    const params = new URLSearchParams();
    if (newQuery) params.set("q", newQuery);
    const queryString = params.toString();
    const newUrl = pathname + (queryString ? `?${queryString}` : "");
    window.history.replaceState(null, "", newUrl);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    updateUrlParams(val);
    if (val.trim().length >= 3) {
      addSearch(val.trim());
    }
  };

  const hasQuery = query.trim().length > 0;

  const results = useMemo(() => {
    if (!hasQuery) return [];
    return searchProducts(allProducts, query).slice(0, RESULT_LIMIT);
  }, [query, hasQuery]);

  const allStockEntries = useAllStock(hasQuery);
  const allStockResults = useMemo(() => {
    if (!hasQuery) return [];
    return searchAllStock(allStockEntries, query).slice(0, RESULT_LIMIT);
  }, [allStockEntries, query, hasQuery]);

  const favoriteProducts = useMemo(() => {
    if (favorites.length === 0) return [];
    return allProducts.filter((p) => favorites.includes(p.id));
  }, [favorites]);

  const compareProducts = useMemo(() => {
    if (compareIds.length === 0) return [];
    return allProducts.filter((p) => compareIds.includes(p.id));
  }, [compareIds]);

  const activeVisibleProducts = hasQuery ? results : favoriteProducts;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allVisibleSelected =
    activeVisibleProducts.length > 0 &&
    activeVisibleProducts.every((p) => selectedIds.has(p.id));

  const handleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        activeVisibleProducts.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        activeVisibleProducts.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const handleCopyBulk = async () => {
    if (selectedIds.size === 0) return;
    const selectedProducts = allProducts.filter((p) => selectedIds.has(p.id));
    const text = formatBulkWhatsAppMessage(selectedProducts);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const noResults = hasQuery && results.length === 0;

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-x-hidden pb-24 pt-6">
      {/* Background Blobs */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[450px] justify-center overflow-hidden">
        <div className="relative w-full max-w-[600px] shrink-0">
          <div className="absolute left-1/2 top-[-20px] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-accent opacity-40 blur-[55px]" />
          <div
            className="absolute right-[-5%] top-[60px] h-[260px] w-[260px] rounded-full opacity-30 blur-[55px]"
            style={{ background: "oklch(75% 0.19 335)" }}
          />
          <div
            className="absolute left-[-2%] top-[90px] h-[240px] w-[240px] rounded-full opacity-30 blur-[55px]"
            style={{ background: "oklch(78% 0.16 195)" }}
          />
          <div
            className="absolute left-[38%] top-[130px] h-[180px] w-[180px] rounded-full opacity-20 blur-[55px]"
            style={{ background: "oklch(82% 0.15 95)" }}
          />
        </div>
      </div>

      <div className="min-h-4 flex-auto" />

      {/* Main Content Area */}
      <div className="relative z-[1] flex w-full max-w-[560px] flex-col items-center gap-4 px-5">
        <div className="relative flex w-full items-center justify-center gap-2.5">
          <img src="/logo.png" alt="Rodalink Logo" className="h-9 w-auto object-contain" />
          <span className="text-[17px] font-bold tracking-tight text-gray-900">Roda Stock</span>
          <Link
            href="/guide"
            aria-label="Panduan Staff"
            title="Panduan Staff"
            className="absolute right-0 flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white/80 text-gray-600 backdrop-blur-md transition-all hover:border-black/20 hover:text-accent active:scale-95"
          >
            <BookOpen className="h-[18px] w-[18px]" />
          </Link>
        </div>

        <SearchBar
          value={query}
          onChange={handleQueryChange}
          hasQuery={hasQuery}
          onClear={() => handleQueryChange("")}
          isSelectMode={isSelectMode}
          onToggleSelectMode={() => setIsSelectMode(!isSelectMode)}
        />

        {!hasQuery && !isSelectMode && (
          <div className="flex items-center gap-2">
            <Link
              href="/rekomendasi"
              className="flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-4 py-2 text-xs font-semibold text-gray-700 backdrop-blur-md transition-all hover:border-black/20 active:scale-95"
            >
              <Wallet className="h-3.5 w-3.5 text-accent" />
              <span>Rekomendasi Budget</span>
            </Link>
          </div>
        )}

        {/* Recent Searches Chips */}
        {recent.length > 0 && !hasQuery && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
              <History className="h-3 w-3" />
              <span>Riwayat</span>
            </div>
            {recent.map((term) => (
              <div
                key={term}
                className="group inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-gray-700 backdrop-blur-md transition-all hover:border-black/20"
              >
                <button
                  type="button"
                  onClick={() => handleQueryChange(term)}
                  className="hover:text-accent"
                >
                  {term}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSearch(term);
                  }}
                  className="text-gray-400 hover:text-red-500"
                  aria-label={`Hapus ${term} dari riwayat`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {noResults && <div className="pt-2 text-center text-sm text-gray-500">Barang tidak ditemukan.</div>}

        {!noResults && results.length > 0 && (
          <div className="flex w-full flex-col gap-2.5 [animation:fadeSlideUp_0.25s_ease]">
            {results.map((product) =>
              isSelectMode ? (
                <ResultRow
                  key={product.id}
                  product={product}
                  selectable={true}
                  isSelected={selectedIds.has(product.id)}
                  onToggleSelect={() => toggleSelect(product.id)}
                />
              ) : (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <ResultRow
                    product={product}
                    isFav={isFav(product.id)}
                    onToggleFav={() => toggle(product.id)}
                    isCompared={isCompared(product.id)}
                    onToggleCompare={() => toggleCompare(product.id)}
                  />
                </Link>
              )
            )}
          </div>
        )}

        {allStockResults.length > 0 && (
          <div className="flex w-full flex-col gap-2.5 pt-1 [animation:fadeSlideUp_0.25s_ease]">
            <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <Boxes className="h-3.5 w-3.5" />
              <span>All Stock · Harga Referensi</span>
            </div>
            {allStockResults.map((entry) => (
              <AllStockRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        {!hasQuery && (
          <div className="flex w-full flex-col gap-4 pt-1">
            {/* Favorites / Pinned Items Section */}
            {favoriteProducts.length > 0 && (
              <div className="flex w-full flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-500" />
                    <span>Stok Favorit Dipin ({favoriteProducts.length})</span>
                  </div>
                </div>
                {favoriteProducts.map((product) =>
                  isSelectMode ? (
                    <ResultRow
                      key={product.id}
                      product={product}
                      selectable={true}
                      isSelected={selectedIds.has(product.id)}
                      onToggleSelect={() => toggleSelect(product.id)}
                    />
                  ) : (
                    <Link key={product.id} href={`/product/${product.id}`}>
                      <ResultRow
                        product={product}
                        isFav={true}
                        onToggleFav={() => toggle(product.id)}
                        isCompared={isCompared(product.id)}
                        onToggleCompare={() => toggleCompare(product.id)}
                      />
                    </Link>
                  )
                )}
              </div>
            )}

            <p className="text-center text-[13px] text-gray-400 pt-2">
              Ketik nama model, kode artikel, atau brand untuk mencari stok
            </p>
          </div>
        )}
      </div>

      <div className="min-h-4 flex-auto" />

      {/* Sticky Bottom Bar for Multi-Select Mode */}
      {isSelectMode && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-gray-900/95 px-4 py-2.5 text-white shadow-[0_10px_35px_rgba(0,0,0,0.35)] backdrop-blur-2xl [animation:fadeSlideUp_0.25s_ease]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200 pr-1">
            <span>{selectedIds.size} Dipilih</span>
          </div>
          {activeVisibleProducts.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 active:scale-95 transition-all"
            >
              {allVisibleSelected ? "Batal Semua" : "Pilih Semua"}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyBulk}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-40"
          >
            {copiedToast ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedToast ? "Tercopy!" : "Salin WA"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSelectMode(false);
              setSelectedIds(new Set());
            }}
            className="ml-0.5 rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
            aria-label="Tutup mode seleksi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sticky Bottom Bar for Active Comparisons */}
      {!isSelectMode && compareIds.length > 0 && (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/20 bg-gray-900/90 px-5 py-2.5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-2xl [animation:fadeSlideUp_0.25s_ease]">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-tight">
            <ArrowLeftRight className="h-4 w-4 text-accent" />
            <span>{compareIds.length} Produk Dipilih</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCompareModal(true)}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-95 transition-all"
          >
            Bandingkan
          </button>
        </div>
      )}

      {/* SO Week Entry Point */}
      {!isSelectMode && !hasQuery && compareIds.length === 0 && (
        <Link
          href="/so-week"
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-gray-900/90 px-5 py-2.5 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-all active:scale-95 [animation:fadeSlideUp_0.25s_ease]"
        >
          <ClipboardList className="h-4 w-4 text-accent" />
          <span>{stockCounts.length > 0 ? `SO Week · ${stockCounts.length} dihitung` : "SO Week"}</span>
        </Link>
      )}

      {/* Compare Modal */}
      {showCompareModal && (
        <CompareModal
          products={compareProducts}
          onClose={() => setShowCompareModal(false)}
          onRemove={(id) => toggleCompare(id)}
          onClearAll={() => {
            clearCompare();
            setShowCompareModal(false);
          }}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
