"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { ResultRow } from "@/components/ResultRow";
import { getAllProducts } from "@/lib/products";
import { searchProducts } from "@/lib/search";

const RESULT_LIMIT = 12;
const allProducts = getAllProducts();

// Build a sorted list of unique categories from the real dataset
const ALL_CATEGORIES = Array.from(new Set(allProducts.map((p) => p.category))).sort();

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const hasQuery = query.trim().length > 0;

  const results = useMemo(() => {
    let base = hasQuery ? searchProducts(allProducts, query) : [];
    if (activeCategory) base = base.filter((p) => p.category === activeCategory);
    return base.slice(0, RESULT_LIMIT);
  }, [query, activeCategory]);

  const noResults = (hasQuery || activeCategory) && results.length === 0;

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-10 pt-6">
      <div className="min-h-4 flex-auto" />

      <div className="relative w-full max-w-[560px]">
        <div className="pointer-events-none absolute inset-x-0 -top-[70px] h-80 overflow-visible">
          <div className="absolute left-1/2 top-[-20px] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-accent opacity-40 blur-[55px]" />
          <div
            className="absolute right-[6%] top-[60px] h-[260px] w-[260px] rounded-full opacity-30 blur-[55px]"
            style={{ background: "oklch(75% 0.19 335)" }}
          />
          <div
            className="absolute left-[4%] top-[90px] h-[240px] w-[240px] rounded-full opacity-30 blur-[55px]"
            style={{ background: "oklch(78% 0.16 195)" }}
          />
          <div
            className="absolute left-[38%] top-[130px] h-[180px] w-[180px] rounded-full opacity-20 blur-[55px]"
            style={{ background: "oklch(82% 0.15 95)" }}
          />
        </div>

        <div className="relative z-[1] flex flex-col items-center gap-6.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-black/10 bg-white shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="var(--color-accent)" strokeWidth="2" />
                <circle cx="12" cy="12" r="1.6" fill="var(--color-accent)" />
                <line x1="12" y1="12" x2="12" y2="4" stroke="var(--color-accent)" strokeWidth="1.4" />
                <line x1="12" y1="12" x2="18" y2="15" stroke="var(--color-accent)" strokeWidth="1.4" />
                <line x1="12" y1="12" x2="6" y2="15" stroke="var(--color-accent)" strokeWidth="1.4" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">Roda Stock</span>
          </div>

          <SearchBar value={query} onChange={setQuery} hasQuery={hasQuery} onClear={() => setQuery("")} />

          {/* Category filter chips — always visible */}
          <div className="flex w-full gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {ALL_CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(active ? null : cat)}
                  className="shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all"
                  style={
                    active
                      ? {
                          background: "var(--color-accent)",
                          borderColor: "var(--color-accent)",
                          color: "#fff",
                          boxShadow: "0 2px 8px rgba(10,124,255,0.3)",
                        }
                      : {
                          background: "rgba(255,255,255,0.7)",
                          borderColor: "rgba(0,0,0,0.1)",
                          color: "#5b5b60",
                        }
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {noResults && <div className="pt-2 text-center text-sm text-gray-500">Barang tidak ditemukan.</div>}

          {!noResults && results.length > 0 && (
            <div className="flex w-full flex-col gap-2.5 [animation:fadeSlideUp_0.25s_ease]">
              {results.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <ResultRow product={product} />
                </Link>
              ))}
            </div>
          )}

          {!hasQuery && !activeCategory && (
            <p className="pt-1 text-center text-[13px] text-gray-400">
              Ketik nama, kode, atau brand · atau pilih kategori di atas
            </p>
          )}
        </div>
      </div>

      <div className="min-h-4 flex-auto" />
    </div>
  );
}
