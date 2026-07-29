# All Stock Section — Design

## Problem
Staff currently only see products actually stocked at the outlet. A new master
price-list file (`Outlet I311 Stock 29-Jul-2026 13_05_31.xlsx`, 13,978 rows,
110 brands) contains nearly all bike/PAA SKUs company-wide, most without
warehouse/stock at this outlet but with a reference price. Staff want to look
up "how much would this other model cost" even though it's not in stock here.

## Data analysis
- 13,978 rows total. Only ~1,150 have `Warehouse = Outlet` (i.e. actually
  stocked here — same set as the existing stock file).
- 4,348 rows have no price. Of those, only 34 are for in-stock items (the
  rest are simply un-carried SKUs, expected to lack pricing).
- Of those 34, 25 have a price in the current `data/products.json` (built
  from the regular stock file) that can be used as fallback. The remaining 9
  have no price anywhere.
- No parse failures, no duplicate article codes, no missing categories —
  structurally clean.

## Approach
Lightweight, separate dataset. No catalog scraping (infeasible/unnecessary
for 14k SKUs) — just brand/model/category/price for reference lookups.

### Pipeline (`pipeline/build_all_stock.py`)
1. Load all rows from the master xlsx (bike + PAA, no category filter).
2. Group by (brand, model_name, color_code, variant_extra) via existing
   `group_rows`.
3. Derive `wheel_size`/`color_label` via `decode_variant`, clean name via
   `clean_model_name` (reuse from `pipeline/decode_variant.py`).
4. Price = first non-null price among the group's rows. If null and the
   group has any row with `warehouse` set, fall back to the price for a
   matching article_code in `data/products.json`; if still null, leave null
   and set `priceSource: "fallback"` when the fallback was used, else
   `priceSource: "none"`.
5. Compute `id` with the same `make_id()` used in `build_dataset.py`, so IDs
   line up with `data/products.json`.
6. Drop any group whose `id` already exists in `data/products.json` (already
   covered by the main catalog/search).
7. Write `data/all_stock.json`; auto-sync to `web/lib/all_stock.json`
   (mirrors `build_dataset.py`'s sync step).

Output shape per entry:
```json
{
  "id": "string",
  "brand": "string",
  "model_name": "string",
  "category": "string",
  "wheel_size": "string|null",
  "color_label": "string|null",
  "price": "number|null",
  "priceSource": "master|fallback|none"
}
```

### Frontend
- `web/lib/allStock.ts`: `getAllStock()` (reads `all_stock.json`) and
  `searchAllStock(items, query)` — same Fuse.js approach as `search.ts` but
  over brand/model_name/category only (no article codes/sizes available).
- `web/components/AllStockRow.tsx`: read-only row — no image, no
  compare/favorite/select actions, no link to a detail page (no spec data
  exists for these). Shows brand · category · wheel size/color, and price;
  `priceSource: "fallback"` shows a small gray "· dari data stok" suffix;
  `"none"` shows "Harga belum tersedia" instead of a price.
- `web/app/page.tsx`: new `allStockResults` (useMemo, only when `hasQuery`,
  capped at `RESULT_LIMIT`), rendered below the main results list under an
  "ALL STOCK" header (same visual pattern as the existing "Stok Favorit"
  section header). Hidden entirely when empty.

## Out of scope
- No catalog/spec/image scraping for these SKUs.
- No detail page / click-through for All Stock rows.
- No changes to the existing stock pipeline or `products.json` build.
