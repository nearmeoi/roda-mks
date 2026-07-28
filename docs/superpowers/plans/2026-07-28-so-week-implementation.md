# SO Week Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff scan or search their way through products and log a physical count for each one as fast as possible, with a running log of everything counted so far this week.

**Architecture:** A new `web/lib/soWeek.ts` module holds the count data (localStorage, keyed by product id) and a `useStockCounts()` hook, following the exact pattern already used by `web/lib/favorites.ts` and `web/lib/comparison.ts` in this codebase. A new `web/components/StockCountSheet.tsx` bottom sheet handles entering a count for one product. A new `web/app/so-week/page.tsx` route ties scanning (reusing the existing `BarcodeScanner` component), a text search fallback, the running list, and the sheet together. `web/app/page.tsx` gets a small floating entry-point button.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4, `fuse.js` (existing search), `lucide-react` (existing icons), Vitest (existing test runner, Node environment — no DOM).

## Global Constraints

- No backend, no database, no auth — all data lives in `localStorage` on the counting device (spec: "Data storage").
- Counting is a pure log: no system-stock lookup, no comparison, no discrepancy calculation, anywhere (spec: "Non-goals" — this was explicitly reversed from an earlier draft, do not reintroduce it).
- A count is one number per product (all sizes combined), not per size/article code (spec: "Non-goals").
- The existing product detail page (`web/app/product/[id]/page.tsx`, `web/components/ProductDetailContent.tsx`) is not modified by this feature at all (spec: "Non-goals").
- "This week" = Monday–Sunday by the device's local clock, computed on read, no explicit reset (spec: "Data model & storage").
- The vitest config (`web/vitest.config.ts`) uses `environment: "node"` — there is no DOM/jsdom available in tests, and no `jsdom` package is installed. Do not add one. Pure logic (week-boundary math, the merge function) is unit tested directly; localStorage I/O and JSX are not unit tested, matching how `favorites.ts`, `comparison.ts`, and `recentSearches.ts` are already untested in this codebase.
- Follow the codebase's existing localStorage-hook pattern exactly (see `web/lib/favorites.ts`): plain exported functions guarded by `typeof window === "undefined"`, plus a `useXxx()` hook wrapping them in `useState`/`useEffect`.

---

### Task 1: `StockCount` type, `soWeek.ts` core logic, and unit tests

**Files:**
- Modify: `web/lib/types.ts`
- Create: `web/lib/soWeek.ts`
- Test: `web/__tests__/soWeek.test.ts`

**Interfaces:**
- Produces: `StockCount { productId: string; productName: string; countedQty: number; countedAt: string }` (added to `web/lib/types.ts`, exported)
- Produces (from `web/lib/soWeek.ts`):
  - `getWeekStart(date: Date): Date`
  - `isInCurrentWeek(isoTimestamp: string, now?: Date): boolean`
  - `mergeStockCount(existing: Record<string, StockCount>, entry: StockCount): Record<string, StockCount>`
  - `getStockCounts(): Record<string, StockCount>`
  - `saveStockCount(productId: string, productName: string, countedQty: number): StockCount`
  - `getCurrentWeekCounts(): StockCount[]`
  - `useStockCounts(): { counts: StockCount[]; saveCount: (productId: string, productName: string, countedQty: number) => void; getCount: (productId: string) => StockCount | undefined }`

- [ ] **Step 1: Add the `StockCount` type**

Open `web/lib/types.ts` and add this interface at the end of the file (after the existing `Product` interface):

```ts
export interface StockCount {
  productId: string;
  productName: string;
  countedQty: number;
  countedAt: string; // ISO timestamp
}
```

- [ ] **Step 2: Write the failing tests**

Create `web/__tests__/soWeek.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getWeekStart, isInCurrentWeek, mergeStockCount } from "@/lib/soWeek";
import type { StockCount } from "@/lib/types";

// January 1, 2024 was a Monday -- used as a fixed, known anchor so these
// tests don't depend on what day it happens to be when they run.

describe("getWeekStart", () => {
  it("returns the same day (at midnight) when given a Monday", () => {
    const monday = new Date(2024, 0, 1, 15, 30);
    const result = getWeekStart(monday);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it("returns the preceding Monday when given a Wednesday", () => {
    const wednesday = new Date(2024, 0, 3, 9, 0);
    const result = getWeekStart(wednesday);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(0);
  });

  it("returns the preceding Monday when given a Sunday (end of that week)", () => {
    const sunday = new Date(2024, 0, 7, 23, 0);
    const result = getWeekStart(sunday);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(0);
  });

  it("rolls over to the next Monday correctly", () => {
    const nextMonday = new Date(2024, 0, 8, 6, 0);
    const result = getWeekStart(nextMonday);
    expect(result.getDate()).toBe(8);
    expect(result.getMonth()).toBe(0);
  });
});

describe("isInCurrentWeek", () => {
  const wednesdayNoon = new Date(2024, 0, 3, 12, 0);

  it("is true for a timestamp on the Monday of the same week", () => {
    expect(isInCurrentWeek(new Date(2024, 0, 1, 8, 0).toISOString(), wednesdayNoon)).toBe(true);
  });

  it("is true for a timestamp late on the Sunday of the same week", () => {
    expect(isInCurrentWeek(new Date(2024, 0, 7, 23, 59).toISOString(), wednesdayNoon)).toBe(true);
  });

  it("is false for a timestamp from the previous week", () => {
    expect(isInCurrentWeek(new Date(2023, 11, 31, 23, 59).toISOString(), wednesdayNoon)).toBe(false);
  });

  it("is false for a timestamp from the following week", () => {
    expect(isInCurrentWeek(new Date(2024, 0, 8, 0, 0).toISOString(), wednesdayNoon)).toBe(false);
  });
});

describe("mergeStockCount", () => {
  const existing: Record<string, StockCount> = {
    "product-a": { productId: "product-a", productName: "Product A", countedQty: 3, countedAt: "2024-01-01T08:00:00.000Z" },
  };

  it("overwrites the entry for the same product id", () => {
    const entry: StockCount = { productId: "product-a", productName: "Product A", countedQty: 5, countedAt: "2024-01-02T08:00:00.000Z" };
    const result = mergeStockCount(existing, entry);
    expect(Object.keys(result)).toEqual(["product-a"]);
    expect(result["product-a"].countedQty).toBe(5);
  });

  it("keeps existing entries for other product ids", () => {
    const entry: StockCount = { productId: "product-b", productName: "Product B", countedQty: 7, countedAt: "2024-01-02T08:00:00.000Z" };
    const result = mergeStockCount(existing, entry);
    expect(result["product-a"].countedQty).toBe(3);
    expect(result["product-b"].countedQty).toBe(7);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd web && npm test -- --run soWeek`
Expected: FAIL — `web/lib/soWeek.ts` does not exist yet (`Cannot find module '@/lib/soWeek'` or similar).

- [ ] **Step 4: Implement `web/lib/soWeek.ts`**

Create `web/lib/soWeek.ts`:

```ts
"use client";

import { useState, useEffect } from "react";
import type { StockCount } from "./types";

const STORAGE_KEY = "rodalink_stock_counts";

// Monday-start week boundary, in the device's local time. Jan 1 2024 was a
// Monday -- see soWeek.test.ts for the fixed dates the tests anchor on.
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export function isInCurrentWeek(isoTimestamp: string, now: Date = new Date()): boolean {
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const t = new Date(isoTimestamp);
  return t >= weekStart && t < weekEnd;
}

export function mergeStockCount(
  existing: Record<string, StockCount>,
  entry: StockCount
): Record<string, StockCount> {
  return { ...existing, [entry.productId]: entry };
}

export function getStockCounts(): Record<string, StockCount> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStockCount(productId: string, productName: string, countedQty: number): StockCount {
  const entry: StockCount = {
    productId,
    productName,
    countedQty,
    countedAt: new Date().toISOString(),
  };
  try {
    const updated = mergeStockCount(getStockCounts(), entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save stock count", e);
  }
  return entry;
}

export function getCurrentWeekCounts(): StockCount[] {
  const all = Object.values(getStockCounts());
  return all
    .filter((c) => isInCurrentWeek(c.countedAt))
    .sort((a, b) => new Date(b.countedAt).getTime() - new Date(a.countedAt).getTime());
}

export function useStockCounts() {
  const [counts, setCounts] = useState<StockCount[]>([]);

  useEffect(() => {
    setCounts(getCurrentWeekCounts());
  }, []);

  const saveCount = (productId: string, productName: string, countedQty: number) => {
    saveStockCount(productId, productName, countedQty);
    setCounts(getCurrentWeekCounts());
  };

  const getCount = (productId: string): StockCount | undefined =>
    counts.find((c) => c.productId === productId);

  return { counts, saveCount, getCount };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd web && npm test -- --run soWeek`
Expected: PASS — all 9 tests green (4 `getWeekStart`, 4 `isInCurrentWeek`, 2 `mergeStockCount` — 10 total).

- [ ] **Step 6: Run the full test suite to check for regressions**

Run: `cd web && npm test -- --run`
Expected: PASS — all existing tests (format, products, search) plus the new soWeek tests.

- [ ] **Step 7: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add web/lib/types.ts web/lib/soWeek.ts web/__tests__/soWeek.test.ts
git commit -m "feat: add SO Week count storage (soWeek.ts) with week-boundary and merge logic"
```

---

### Task 2: `StockCountSheet` component and `/so-week` page

**Files:**
- Modify: `web/app/globals.css`
- Modify: `web/lib/format.ts`
- Create: `web/components/StockCountSheet.tsx`
- Create: `web/app/so-week/page.tsx`

**Interfaces:**
- Consumes: `useStockCounts()`, `StockCount` (Task 1); `titleCase`, `formatPrice`, `primaryArticleCode` (existing `web/lib/format.ts`); `searchProducts` (existing `web/lib/search.ts`); `getAllProducts` (existing `web/lib/products.ts`); `BarcodeScanner` (existing `web/components/BarcodeScanner.tsx`, props `{ onScan: (code: string) => void; onClose: () => void }`); `BackButton` (existing `web/components/BackButton.tsx`); `Product` (existing `web/lib/types.ts`)
- Produces: `getColorDisplay(product: Pick<Product, "colors" | "color_label">): string | null` (added to `web/lib/format.ts`); `StockCountSheet` component, props `{ product: Product; initialQty?: number; onSave: (qty: number) => void; onClose: () => void }`; the `/so-week` route

This task has no automated tests — the codebase doesn't unit-test components (`ResultRow`, `CompareModal`, `BarcodeScanner` have none either). Verification is a concrete manual walkthrough in the browser at the end of the task.

- [ ] **Step 1: Add the missing `fadeIn` keyframe**

`CompareModal.tsx` and `BarcodeScanner.tsx` both already use the Tailwind arbitrary class `[animation:fadeIn_0.2s_ease]`, but `web/app/globals.css` has no `fadeIn` keyframe defined (confirmed via `grep -n "@keyframes" web/app/globals.css` — only `fadeSlideUp` and `slideInRight` exist). That makes the animation a silent no-op on those two existing overlays, and `StockCountSheet` (built in this task) uses the same backdrop-fade pattern, so it would inherit the same broken reference a third time. Fix it once, here.

Open `web/app/globals.css` and add this keyframe block after the existing `@keyframes slideInRight { ... }` block (around line 54):

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

- [ ] **Step 2: Add `getColorDisplay` to `web/lib/format.ts`**

The "join colors, or fall back to color_label, or null" logic already appears twice in this codebase (`ProductDetailContent.tsx` and `CompareModal.tsx`, both inline). `StockCountSheet` needs the same logic a third time, so extract it now for the new caller — don't touch the two existing inline call sites, that's unrelated refactoring outside this feature's scope.

Open `web/lib/format.ts`. Change the top import line from:

```ts
import type { ProductSize } from "./types";
```

to:

```ts
import type { Product, ProductSize } from "./types";
```

Then add this function anywhere after the existing `titleCase` function:

```ts
export function getColorDisplay(product: Pick<Product, "colors" | "color_label">): string | null {
  if (product.colors && product.colors.length > 0) return product.colors.map(titleCase).join(", ");
  if (product.color_label) return titleCase(product.color_label);
  return null;
}
```

- [ ] **Step 3: Create `web/components/StockCountSheet.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { titleCase, getColorDisplay, primaryArticleCode } from "@/lib/format";
import { Package } from "lucide-react";

export function StockCountSheet({
  product,
  initialQty,
  onSave,
  onClose,
}: {
  product: Product;
  initialQty?: number;
  onSave: (qty: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialQty !== undefined ? String(initialQty) : "");

  const isValid = /^\d+$/.test(value.trim());

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
        </div>

        <h3 className="mt-2 text-base font-bold text-gray-900">{titleCase(product.model_name)}</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Kode: {articleCode}
          {colorDisplay ? ` · ${colorDisplay}` : ""}
        </p>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-accent px-4 py-3">
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
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            className="ml-auto rounded-full bg-accent px-4 py-2.5 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
          >
            Simpan &amp; Scan Lagi
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `web/app/so-week/page.tsx`**

```tsx
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
```

- [ ] **Step 5: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Run the full test suite to check for regressions**

Run: `cd web && npm test -- --run`
Expected: PASS.

- [ ] **Step 7: Manual verification in the browser**

Start the dev server (`cd web && npm run dev`), then in the browser:

1. Visit `/so-week` directly. Confirm: top bar shows "SO Week" and "0 dihitung", empty state text shows, search field is present, blue circular scan button is fixed bottom-right.
2. Type a known product name (e.g. a brand from `web/lib/products.json`) into the search field. Confirm a short list of matching results appears below it.
3. Tap one result. Confirm the bottom sheet slides up showing that product's photo (or placeholder icon if it has none), brand/category badges, name, article code, and color (if any) — and no price, no system-stock number anywhere on the sheet.
4. Type a number into "Hitung fisik" and tap "Simpan & Scan Lagi". Confirm: the sheet closes, the barcode scanner opens automatically, and (after closing the scanner) the product now appears at the top of the list below the search field with the count you entered and a timestamp.
5. Search for and re-select the same product. Confirm the sheet reopens with the previously entered count pre-filled in the input.
6. Change the number and save again. Confirm the list still shows only one row for that product (updated, not duplicated).
7. Type a query with zero matches (e.g. `"zzzzzz999"`). Confirm no results list appears and no crash occurs.
8. Tap the scan button, then tap the scanner's close button without scanning anything. Confirm it closes cleanly with no sheet appearing.

- [ ] **Step 8: Commit**

```bash
git add web/app/globals.css web/lib/format.ts web/components/StockCountSheet.tsx web/app/so-week/page.tsx
git commit -m "feat: add /so-week screen with scan/search-driven physical count sheet"
```

---

### Task 3: Home screen entry point

**Files:**
- Modify: `web/app/page.tsx`

**Interfaces:**
- Consumes: `useStockCounts` (Task 1); `counts.length` from its return value

The floating "SO Week" button must not visually collide with the existing "Sticky Bottom Bar for Active Comparisons" (`web/app/page.tsx:194-208`), which occupies the same `fixed bottom-5 left-1/2` position whenever `compareIds.length > 0` — regardless of whether there's an active search query. Decision: the SO Week button is hidden whenever the compare bar is showing (`!hasQuery && compareIds.length === 0`). Compare mode is a transient state the user chose to enter; SO Week reappears as soon as it's cleared or the compare modal is opened and closed.

- [ ] **Step 1: Add the import**

In `web/app/page.tsx`, change the import block (lines 1–14) — add `useStockCounts` and the `ClipboardList` icon:

```tsx
"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { ResultRow } from "@/components/ResultRow";
import { CompareModal } from "@/components/CompareModal";
import { getAllProducts } from "@/lib/products";
import { searchProducts } from "@/lib/search";
import { useFavorites } from "@/lib/favorites";
import { useRecentSearches } from "@/lib/recentSearches";
import { useCompareList } from "@/lib/comparison";
import { useStockCounts } from "@/lib/soWeek";
import { Star, History, X, ArrowLeftRight, ClipboardList } from "lucide-react";
```

- [ ] **Step 2: Call the hook**

In `web/app/page.tsx`, in `HomeContent()`, right after the existing `useCompareList()` call (line 29):

```tsx
  const { compareIds, toggleCompare, isCompared, clearAll: clearCompare } = useCompareList();
  const { counts: stockCounts } = useStockCounts();
```

- [ ] **Step 3: Add the floating button**

In `web/app/page.tsx`, add the new block immediately after the existing "Sticky Bottom Bar for Active Comparisons" block and before "Compare Modal" (i.e. right after the closing `)}` that follows line 208, before line 210's `{/* Compare Modal */}` comment):

```tsx
      {/* SO Week Entry Point */}
      {!hasQuery && compareIds.length === 0 && (
        <Link
          href="/so-week"
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-gray-900/90 px-5 py-2.5 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-all active:scale-95 [animation:fadeSlideUp_0.25s_ease]"
        >
          <ClipboardList className="h-4 w-4 text-accent" />
          <span>{stockCounts.length > 0 ? `SO Week · ${stockCounts.length} dihitung` : "SO Week"}</span>
        </Link>
      )}

```

- [ ] **Step 4: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full test suite**

Run: `cd web && npm test -- --run`
Expected: PASS.

- [ ] **Step 6: Manual verification in the browser**

With the dev server running:

1. Visit `/`. Confirm the "SO Week" pill button is fixed at the bottom-center, above the safe area, readable over the background.
2. Type any search query into the search bar. Confirm the SO Week button disappears while results are showing.
3. Clear the search. Confirm the button reappears.
4. Tap the button. Confirm it navigates to `/so-week`.
5. Go back to `/`, add a product to comparison (tap the compare icon on a search result), confirm the existing "N Produk Dipilih" bar appears at the bottom — and confirm the SO Week button is NOT also showing at the same time (no visual overlap).
6. Clear the compare selection (or open and close the compare modal via Reset). Confirm the SO Week button reappears once `compareIds` is empty again.
7. Go to `/so-week`, count one product, go back to `/`. Confirm the button now reads "SO Week · 1 dihitung".

- [ ] **Step 7: Commit**

```bash
git add web/app/page.tsx
git commit -m "feat: add SO Week entry button to home screen"
```

---

### Task 4: Full end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `cd web && npm test -- --run`
Expected: PASS — every test file (`format.test.ts`, `products.test.ts`, `search.test.ts`, `soWeek.test.ts`).

- [ ] **Step 2: Type-check the whole project**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Full manual walkthrough in the browser**

With the dev server running (`cd web && npm run dev`):

1. Start at `/`, clear any existing localStorage for a clean run (`localStorage.clear()` in the browser console), reload.
2. Confirm the SO Week button reads just "SO Week" (no count) since nothing's been counted this (real) week yet.
3. Tap it, land on `/so-week` with an empty list and the empty-state message.
4. Search for two different products, count each one via the sheet (different quantities), confirming the scanner auto-opens after each save (close it manually each time since there's no real camera in a plain dev-server test).
5. Confirm both now appear in the list, most-recently-counted first, with correct name/qty/time — and confirm neither row shows any system-stock number, match/mismatch indicator, or diff of any kind.
6. Go back to `/`, confirm the button now reads "SO Week · 2 dihitung".
7. Visit a normal product detail page (`/product/<any-id>`) directly and confirm it looks and behaves exactly as it did before this feature — no "Hitung Fisik" field or any other change there.
8. Confirm existing features are unaffected: search still works, favorites still work, compare still works and its bottom bar still appears/functions correctly.

- [ ] **Step 4: Confirm nothing is left uncommitted**

Run: `git status`
Expected: clean working tree (everything from Tasks 1–3 already committed).
