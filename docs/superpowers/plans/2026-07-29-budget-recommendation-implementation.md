# Budget Recommendation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give staff a dedicated screen (`/rekomendasi`) where entering a budget (plus optional category/brand) returns in-stock products ranked closest-to-budget-first, with a fallback when nothing fits.

**Architecture:** A pure filter+sort function (`web/lib/budgetFinder.ts`) — deterministic logic, not ML, confirmed with the user. A single client-side page renders the form and reuses the existing `ResultRow` component for results, identical to how search results are already rendered.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest.

## Global Constraints

- Not ML — deterministic filter/sort over existing product data (confirmed with user).
- Distinct from `web/lib/recommendations.ts`'s `getRecommendations` (per-product complementary-item suggestions) — no shared code beyond common utilities (`totalQuantity`, `Product` type).
- In-stock only (`totalQuantity(p.sizes) > 0`), always — not a togglable option.
- Ranking: within-budget results sorted descending by price (closest to budget ceiling first). Fallback (no within-budget matches): above-budget results sorted ascending by price (closest-over-budget first).
- Entry point: a button on the home screen, not the header.
- Results render via the existing `ResultRow` component so favoriting/comparing/tapping-through all work identically to search results.

---

### Task 1: Budget filter/sort logic

**Files:**
- Create: `web/lib/budgetFinder.ts`
- Test: `web/__tests__/budgetFinder.test.ts`

**Interfaces:**
- Consumes: `Product` (`web/lib/types.ts`), `totalQuantity` (`web/lib/format.ts`).
- Produces: `BudgetCriteria` (`{ maxBudget: number; category?: string; brand?: string }`), `BudgetResult` (`{ products: Product[]; isFallback: boolean }`), `findProductsByBudget(products: Product[], criteria: BudgetCriteria): BudgetResult` — consumed by Task 2.

- [ ] **Step 1: Write the failing tests**

Create `web/__tests__/budgetFinder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findProductsByBudget } from "@/lib/budgetFinder";
import type { Product, ProductSize } from "@/lib/types";

function buildSize(overrides: Partial<ProductSize> = {}): ProductSize {
  return { size_code: "M", article_code: 1, quantity: 1, ordered_quantity: null, price: null, ...overrides };
}

function buildTestProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "test-id",
    brand: "POLYGON",
    model_name: "STRATTOS 7",
    category: "BIKE-ROAD DROP BAR",
    warehouse: "Outlet",
    variant_extra: null,
    wheel_size: "700C",
    color_label: "Hitam",
    price: 5000000,
    sizes: [buildSize()],
    colors: ["Black"],
    images: [],
    specs: {},
    matched: true,
    ...overrides,
  };
}

describe("findProductsByBudget", () => {
  it("sorts within-budget results descending by price (closest to budget first)", () => {
    const products = [
      buildTestProduct({ id: "a", price: 3000000 }),
      buildTestProduct({ id: "b", price: 9500000 }),
      buildTestProduct({ id: "c", price: 7000000 }),
    ];

    const result = findProductsByBudget(products, { maxBudget: 10000000 });

    expect(result.isFallback).toBe(false);
    expect(result.products.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("filters by category (case-insensitive)", () => {
    const products = [
      buildTestProduct({ id: "bike", category: "BIKE-ROAD DROP BAR", price: 5000000 }),
      buildTestProduct({ id: "helmet", category: "HELMET", price: 500000 }),
    ];

    const result = findProductsByBudget(products, { maxBudget: 10000000, category: "helmet" });

    expect(result.products.map((p) => p.id)).toEqual(["helmet"]);
  });

  it("filters by brand (case-insensitive)", () => {
    const products = [
      buildTestProduct({ id: "polygon", brand: "POLYGON", price: 5000000 }),
      buildTestProduct({ id: "wimcycle", brand: "WIM CYCLE", price: 3000000 }),
    ];

    const result = findProductsByBudget(products, { maxBudget: 10000000, brand: "polygon" });

    expect(result.products.map((p) => p.id)).toEqual(["polygon"]);
  });

  it("excludes out-of-stock products", () => {
    const products = [
      buildTestProduct({ id: "in-stock", price: 5000000, sizes: [buildSize({ quantity: 2 })] }),
      buildTestProduct({ id: "out-of-stock", price: 3000000, sizes: [buildSize({ quantity: 0 })] }),
    ];

    const result = findProductsByBudget(products, { maxBudget: 10000000 });

    expect(result.products.map((p) => p.id)).toEqual(["in-stock"]);
  });

  it("excludes products with no price", () => {
    const products = [
      buildTestProduct({ id: "priced", price: 5000000 }),
      buildTestProduct({ id: "no-price", price: null }),
    ];

    const result = findProductsByBudget(products, { maxBudget: 10000000 });

    expect(result.products.map((p) => p.id)).toEqual(["priced"]);
  });

  it("falls back to the closest above-budget products, sorted ascending, when nothing fits", () => {
    const products = [
      buildTestProduct({ id: "far", price: 15000000 }),
      buildTestProduct({ id: "close", price: 11000000 }),
    ];

    const result = findProductsByBudget(products, { maxBudget: 10000000 });

    expect(result.isFallback).toBe(true);
    expect(result.products.map((p) => p.id)).toEqual(["close", "far"]);
  });

  it("returns an empty fallback result when there are no matches at all", () => {
    const result = findProductsByBudget([], { maxBudget: 10000000 });

    expect(result.isFallback).toBe(true);
    expect(result.products).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run __tests__/budgetFinder.test.ts`
Expected: FAIL — `Cannot find module '@/lib/budgetFinder'` (file doesn't exist yet).

- [ ] **Step 3: Create `web/lib/budgetFinder.ts`**

```ts
import type { Product } from "./types";
import { totalQuantity } from "./format";

export interface BudgetCriteria {
  maxBudget: number;
  category?: string;
  brand?: string;
}

export interface BudgetResult {
  products: Product[];
  isFallback: boolean;
}

function hasPrice(p: Product): p is Product & { price: number } {
  return p.price !== null;
}

export function findProductsByBudget(products: Product[], criteria: BudgetCriteria): BudgetResult {
  const { maxBudget, category, brand } = criteria;

  const inStock = products.filter((p) => totalQuantity(p.sizes) > 0);

  const categoryFiltered = category
    ? inStock.filter((p) => p.category.toLowerCase() === category.toLowerCase())
    : inStock;

  const brandFiltered = brand
    ? categoryFiltered.filter((p) => p.brand.toLowerCase() === brand.toLowerCase())
    : categoryFiltered;

  const priced = brandFiltered.filter(hasPrice);

  const withinBudget = priced.filter((p) => p.price <= maxBudget);
  if (withinBudget.length > 0) {
    return {
      products: withinBudget.sort((a, b) => b.price - a.price),
      isFallback: false,
    };
  }

  const aboveBudget = priced.filter((p) => p.price > maxBudget);
  return {
    products: aboveBudget.sort((a, b) => a.price - b.price),
    isFallback: true,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run __tests__/budgetFinder.test.ts`
Expected: PASS (7/7 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/budgetFinder.ts web/__tests__/budgetFinder.test.ts
git commit -m "feat: add budget filter/sort logic (findProductsByBudget)"
```

---

### Task 2: `/rekomendasi` page

**Files:**
- Create: `web/app/rekomendasi/page.tsx`

**Interfaces:**
- Consumes: `findProductsByBudget`, `BudgetCriteria`, `BudgetResult` (Task 1), `getAllProducts` (`web/lib/products.ts`), `ResultRow` (`web/components/ResultRow.tsx`), `BackButton` (`web/components/BackButton.tsx`), `useFavorites` (`web/lib/favorites.ts`), `useCompareList` (`web/lib/comparison.ts`), `titleCase` (`web/lib/format.ts`).

- [ ] **Step 1: Create `web/app/rekomendasi/page.tsx`**

```tsx
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
              <p className="pt-8 text-center text-sm text-gray-500">Barang tidak ditemukan.</p>
            ) : (
              <>
                {result.isFallback && (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-700">
                    Tidak ada barang di bawah budget ini — berikut yang paling dekat.
                  </div>
                )}
                <div className="flex flex-col gap-2.5">
                  {result.products.map((product) => (
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/app/rekomendasi/page.tsx
git commit -m "feat: add /rekomendasi budget recommendation page"
```

---

### Task 3: Home screen entry point and final verification

**Files:**
- Modify: `web/app/page.tsx`

**Interfaces:**
- Consumes: `/rekomendasi` route (Task 2).

- [ ] **Step 1: Add the `Wallet` import**

In `web/app/page.tsx`, find this line:

```tsx
import { Star, History, X, ArrowLeftRight, ClipboardList, Check, Copy, BookOpen } from "lucide-react";
```

(If the staff-guide plan has not been implemented yet in this working copy, the line will instead read `import { Star, History, X, ArrowLeftRight, ClipboardList, Check, Copy } from "lucide-react";` — either way, add `Wallet` to the import list.)

Replace it with:

```tsx
import { Star, History, X, ArrowLeftRight, ClipboardList, Check, Copy, BookOpen, Wallet } from "lucide-react";
```

- [ ] **Step 2: Add the entry button below the search bar**

Find the `<SearchBar ... />` block:

```tsx
        <SearchBar
          value={query}
          onChange={handleQueryChange}
          hasQuery={hasQuery}
          onClear={() => handleQueryChange("")}
          isSelectMode={isSelectMode}
          onToggleSelectMode={() => setIsSelectMode(!isSelectMode)}
        />
```

Immediately after its closing `/>`, add:

```tsx

        {!hasQuery && !isSelectMode && (
          <Link
            href="/rekomendasi"
            className="flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-4 py-2 text-xs font-semibold text-gray-700 backdrop-blur-md transition-all hover:border-black/20 active:scale-95"
          >
            <Wallet className="h-3.5 w-3.5 text-accent" />
            <span>Rekomendasi Budget</span>
          </Link>
        )}
```

(`Link` is already imported at the top of this file.)

- [ ] **Step 3: Verify it type-checks**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `cd web && npm test`
Expected: all tests pass, including the new `budgetFinder.test.ts`.

- [ ] **Step 5: Manual verification checklist**

Run: `cd web && npm run dev`, then in a browser:

- Home screen (with an empty search box) shows a "Rekomendasi Budget" button below the search bar; it disappears once a search query is typed.
- Tapping it opens `/rekomendasi`.
- The "Cari" button is disabled until a budget greater than 0 is entered; typing digits formats them as Rupiah (e.g. "10000000" displays as "10.000.000").
- Searching with just a budget returns in-stock products at or under that budget, ordered highest price first.
- Adding a category filter narrows results to that category only; adding a brand filter narrows to that brand only.
- Entering a budget with no in-budget matches shows the amber fallback banner and lists the cheapest above-budget options first.
- Entering an impossible category+brand combination (with any budget) shows "Barang tidak ditemukan."
- Tapping a result navigates to its product detail page; the favorite star and compare toggle on each row work the same as they do on the home screen's search results.

- [ ] **Step 6: Commit**

```bash
git add web/app/page.tsx
git commit -m "feat: add budget recommendation entry button to home screen"
```
