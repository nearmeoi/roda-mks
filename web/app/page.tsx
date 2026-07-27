"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { ResultRow } from "@/components/ResultRow";
import { getAllProducts } from "@/lib/products";
import { searchProducts } from "@/lib/search";
import { useFavorites } from "@/lib/favorites";

const RESULT_LIMIT = 15;
const allProducts = getAllProducts();

const CATEGORY_CHIPS = [
  { label: "🚲 Sepeda", query: "sepeda" },
  { label: "⚙️ Spare Part", query: "spare part" },
  { label: "🪖 Apparel / Helm", query: "helm" },
  { label: "🔧 Aksesoris", query: "aksesoris" },
];

function HomeContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);

  const { favorites, toggle, isFav } = useFavorites();

  // Sync internal state if URL changes (e.g. back navigation)
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Update URL state synchronously without re-triggering Next.js router cycles or race conditions
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
  };

  const hasQuery = query.trim().length > 0;

  const results = useMemo(() => {
    if (!hasQuery) return [];
    return searchProducts(allProducts, query).slice(0, RESULT_LIMIT);
  }, [query, hasQuery]);

  const favoriteProducts = useMemo(() => {
    if (favorites.length === 0) return [];
    return allProducts.filter((p) => favorites.includes(p.id));
  }, [favorites]);

  const noResults = hasQuery && results.length === 0;

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-x-hidden pb-10 pt-6">
      {/* Background Blobs (Full width, not constrained by padding) */}
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
      <div className="relative z-[1] flex w-full max-w-[560px] flex-col items-center gap-5 px-5">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Rodalink Logo" className="h-9 w-auto object-contain" />
          <span className="text-[17px] font-bold tracking-tight text-gray-900">Roda Stock</span>
        </div>

        <SearchBar value={query} onChange={handleQueryChange} hasQuery={hasQuery} onClear={() => handleQueryChange("")} />

        {/* Quick Category Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
          {CATEGORY_CHIPS.map((chip) => {
            const isActive = query.toLowerCase() === chip.query.toLowerCase();
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleQueryChange(isActive ? "" : chip.query)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                  isActive
                    ? "border-accent bg-accent text-white shadow-sm"
                    : "border-black/[0.08] bg-white/70 text-gray-700 hover:bg-white backdrop-blur-md"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {noResults && <div className="pt-2 text-center text-sm text-gray-500">Barang tidak ditemukan.</div>}

        {!noResults && results.length > 0 && (
          <div className="flex w-full flex-col gap-2.5 [animation:fadeSlideUp_0.25s_ease]">
            {results.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <ResultRow
                  product={product}
                  isFav={isFav(product.id)}
                  onToggleFav={() => toggle(product.id)}
                />
              </Link>
            ))}
          </div>
        )}

        {!hasQuery && (
          <div className="flex w-full flex-col gap-4 pt-1">
            {/* Favorites / Pinned Items Section */}
            {favoriteProducts.length > 0 && (
              <div className="flex w-full flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    ⭐ Stok Favorit Dipin ({favoriteProducts.length})
                  </span>
                </div>
                {favoriteProducts.map((product) => (
                  <Link key={product.id} href={`/product/${product.id}`}>
                    <ResultRow
                      product={product}
                      isFav={true}
                      onToggleFav={() => toggle(product.id)}
                    />
                  </Link>
                ))}
              </div>
            )}

            <p className="text-center text-[13px] text-gray-400 pt-2">
              Ketik nama model, kode artikel, atau brand untuk mencari stok
            </p>
          </div>
        )}
      </div>

      <div className="min-h-4 flex-auto" />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
