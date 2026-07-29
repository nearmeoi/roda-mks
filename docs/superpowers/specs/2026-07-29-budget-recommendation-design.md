# Budget Recommendation — Design

## Problem

A customer tells staff a budget ("ada rekomendasi di bawah 10 juta?") and
staff need to quickly find matching in-stock products. Today that means
manually scrolling/searching and eyeballing prices — there's no way to
directly ask "what fits under this budget."

## Goal

A dedicated screen where staff enter a budget (and optionally category/
brand) and get a ranked, in-stock-only list of matching products.

## Non-goals

- Not a machine learning feature. There's no sales, popularity, or
  customer-preference data anywhere in this app to train a model on —
  confirmed with the user. This is deterministic filtering and sorting
  over the existing product data, same class of logic as the app's
  existing search.
- Not the same thing as `web/lib/recommendations.ts`'s `getRecommendations`
  function, which suggests complementary items (accessories, same-brand/
  category alternatives) for a product a customer is *already looking at*.
  This feature has no "current product" — it's a budget-first, standalone
  search. Different name, different file, no shared code beyond common
  utilities (`totalQuantity`, `formatPrice`, `Product` type).
- No saved/remembered budget preferences, no history of past searches.

## Data flow / logic

New file `web/lib/budgetFinder.ts`:

```ts
interface BudgetCriteria {
  maxBudget: number;
  category?: string;
  brand?: string;
}

interface BudgetResult {
  products: Product[];
  isFallback: boolean; // true when nothing fit the budget, showing closest-above instead
}

function findProductsByBudget(products: Product[], criteria: BudgetCriteria): BudgetResult
```

Logic:
1. Filter to in-stock only: `totalQuantity(p.sizes) > 0`.
2. Filter by `category` if set (case-insensitive match against
   `product.category`).
3. Filter by `brand` if set (case-insensitive match against
   `product.brand`).
4. Split remaining products into `withinBudget` (`price <= maxBudget`) and
   `aboveBudget` (`price > maxBudget`).
5. If `withinBudget` is non-empty: sort descending by price (closest to
   budget ceiling first — maximizes what the customer gets for the money)
   and return `{ products: withinBudget, isFallback: false }`.
6. If `withinBudget` is empty: sort `aboveBudget` ascending by price
   (cheapest-over-budget first — closest to what they asked for) and
   return `{ products: aboveBudget, isFallback: true }`. If `aboveBudget`
   is also empty, `products` is an empty array with `isFallback: true`
   (the UI treats this as the plain empty state, see below).

This is a pure function — no component-local state, easy to unit test in
isolation.

## Navigation / UI

- **Entry point**: a button/card on the home screen, below the search bar
  (not the header — already carries the search bar, the guide icon, and
  the SO Week entry pill; adding a fourth element there would crowd it).
  Label: "Rekomendasi Budget".
- **`/rekomendasi`**: a form with:
  - Budget input — numeric, formatted as Rupiah as the user types
    (consistent with how prices are displayed elsewhere via
    `formatPrice`).
  - Category dropdown — optional, defaults to "Semua Kategori", options
    populated from the distinct `category` values in the product data.
  - Brand dropdown — optional, defaults to "Semua Brand", options
    populated from the distinct `brand` values in the product data.
  - "Cari" button — disabled until budget is a number > 0.
- **Results**: rendered as a list of the existing `ResultRow` component —
  identical to search results, so tapping through to product detail,
  favoriting, and compare-toggling all work with no new code in that
  area.
- **Fallback banner**: when `isFallback` is true and `products` is
  non-empty, a small banner above the results: "Tidak ada barang di bawah
  budget ini — berikut yang paling dekat."

## Error handling

- Invalid/empty budget: "Cari" stays disabled — no error message, the
  action is simply unavailable until a valid budget is entered.
- No results at all (even the above-budget fallback is empty — e.g. an
  impossible brand+category combination): same empty-state tone as the
  existing "Barang tidak ditemukan" pattern used on the home screen.

## Testing

- Unit tests in `web/__tests__/budgetFinder.test.ts` covering:
  - Within-budget results sorted descending by price.
  - Category filter applied correctly.
  - Brand filter applied correctly.
  - Out-of-stock products excluded.
  - Fallback path: no within-budget matches, above-budget results sorted
    ascending, `isFallback: true`.
  - Fully-empty path: no matches at all (within or above budget).
- No automated UI test, consistent with the rest of this codebase (pages
  and components aren't unit-tested; `ResultRow` and the form are already
  exercised structurally by reuse of existing tested pieces).
- Manual verification: search with budget only, budget+category,
  budget+brand, a budget with no in-budget matches (confirm fallback
  banner and sort order), and an impossible combination (confirm empty
  state).
