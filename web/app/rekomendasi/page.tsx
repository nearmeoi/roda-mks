"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getAllProducts } from "@/lib/products";
import { findProductsByBudget, type BudgetCriteria, type BudgetResult } from "@/lib/budgetFinder";
import { ResultRow } from "@/components/ResultRow";
import { BackButton } from "@/components/BackButton";
import { useFavorites } from "@/lib/favorites";
import { useCompareList } from "@/lib/comparison";
import { titleCase } from "@/lib/format";

const allProducts = getAllProducts();
const RESULT_LIMIT = 15;

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

const categories = uniqueSorted(allProducts.map((p) => p.category));
const brands = uniqueSorted(allProducts.map((p) => p.brand));

export default function RekomendasiPage() {
  const [budgetDigits, setBudgetDigits] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [submitted, setSubmitted] = useState<BudgetCriteria | null>(null);

  const { toggle, isFav } = useFavorites();
  const { toggleCompare, isCompared } = useCompareList();

  const maxBudget = Number(budgetDigits);
  const canSearch = maxBudget > 0;

  const result: BudgetResult | null = useMemo(() => {
    if (!submitted) return null;
    return findProductsByBudget(allProducts, submitted);
  }, [submitted]);

  const handleSearch = () => {
    if (!canSearch) return;
    setSubmitted({
      maxBudget,
      category: category || undefined,
      brand: brand || undefined,
    });
  };

  const budgetDisplay = budgetDigits
    ? Number(budgetDigits).toLocaleString("id-ID").replace(/,/g, ".")
    : "";

  return (
    <div className="min-h-screen pb-16">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.08] bg-[#f6f6f8]/80 px-5 py-3 backdrop-blur-xl">
        <BackButton />
        <span className="text-sm font-semibold text-gray-900">Rekomendasi Budget</span>
        <div className="w-[68px]" />
      </div>

      <div className="mx-auto max-w-[560px] px-5 pt-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.08] bg-white/85 p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Budget Maksimal
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 py-2.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
              <span className="text-sm font-semibold text-gray-500">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={budgetDisplay}
                onChange={(e) => setBudgetDigits(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="10.000.000"
                className="w-full border-none bg-transparent text-sm text-gray-900 outline-none"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Kategori</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-accent"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Brand</span>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-accent"
            >
              <option value="">Semua Brand</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {titleCase(b)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleSearch}
            disabled={!canSearch}
            className="mt-1 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-40"
          >
            Cari
          </button>
        </div>

        {result && (
          <div className="mt-5">
            {result.products.length === 0 ? (
              <p className="pt-8 text-center text-sm text-gray-500">Tidak ditemukan</p>
            ) : (
              <>
                {result.isFallback && (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-700">
                    Tidak ada barang di bawah budget ini — berikut yang paling dekat.
                  </div>
                )}
                <div className="flex flex-col gap-2.5">
                  {result.products.slice(0, RESULT_LIMIT).map((product) => (
                    <Link key={product.id} href={`/product/${product.id}`}>
                      <ResultRow
                        product={product}
                        isFav={isFav(product.id)}
                        onToggleFav={() => toggle(product.id)}
                        isCompared={isCompared(product.id)}
                        onToggleCompare={() => toggleCompare(product.id)}
                      />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
