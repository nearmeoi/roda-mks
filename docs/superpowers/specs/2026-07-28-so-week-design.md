# SO Week (Stock Opname Week) — Design

## Problem

Roda Stock is currently read-only: it displays stock quantities sourced from a
periodically-rebuilt Excel export, with no way to record anything back into
the app. Staff have no fast, phone-in-hand way to log a physical count while
walking the shop.

## Goal

Let one staff member, walking the shop with their phone, scan (or search)
their way through products and log a physical count for each one as fast as
possible — scan, type a number, scan the next thing — with a running list of
everything counted so far this week to look back on.

This is intentionally a minimal first version, scoped down hard for speed
and simplicity. It's a **counting log**, not a reconciliation tool: it does
not look up or compare against system stock. See "Future extensions" for
where discrepancy detection could go later.

## Non-goals (explicitly out of scope for v1)

- **Comparing the count against system stock, or flagging mismatches.**
  This was in an earlier draft of this spec and was deliberately dropped:
  SO Week just records what was physically counted and when. No
  system-quantity lookup, no match/mismatch calculation, no diff, anywhere
  in the feature.
- Multiple people counting simultaneously / shared or synced data across
  devices. Only one device does the counting.
- A backend, database, or authentication. Counts live in the browser's
  local storage on the counting device.
- A fixed/assigned count list ("count these 40 products this week"). Staff
  count whatever they scan or search, opportunistically.
- Per-size/per-article-code counts. A count is one number for the whole
  product (all sizes combined).
- Any changes to the existing product detail page. Counting lives entirely
  inside the new SO Week screen; the page staff reaches through normal
  search is untouched.
- Editable history across past weeks (viewing older weeks' results). Old
  data is not deleted, but v1 only surfaces the current week.

## Core workflow

1. **Entry point**: on the home screen, a floating pill button fixed at the
   bottom (visually consistent with the app's existing "N Produk Dipilih"
   compare bar) reads "SO Week · N dihitung" (N = count logged this week).
   Tapping it opens the SO Week screen.
2. **SO Week screen**: shows the running list of everything counted this
   week — thumbnail, product name, time counted, quantity — most-recently
   counted first. A floating scan button (bottom-right) opens the app's
   existing `BarcodeScanner` component (same modal used elsewhere today, not
   a new scanner); a small search field is also available for typing a name
   or article code when scanning isn't practical (missing/damaged barcode,
   faster to type a known code).
3. **Scanning or picking a search result** slides up a bottom sheet, without
   leaving the SO Week screen: product photo, brand/category badges, name,
   article code, and color, plus a "Hitung fisik" number input and a "Simpan
   & Scan Lagi" (Save & Scan Next) button.
4. Saving closes the sheet, adds/updates the entry in the list behind it,
   and the screen is immediately ready for the next scan — no navigation,
   no back button, no page load in between items.
5. Scanning or searching to a product already counted this week re-opens the
   same sheet pre-filled with the existing count; saving overwrites that
   entry rather than creating a duplicate (fixes a typo without cluttering
   the list).

## Data model & storage

Counts are stored in `localStorage` (`so-week-counts-v1`, an object keyed by
product id):

```ts
interface StockCount {
  productId: string;
  productName: string;   // denormalized so the list reads fine even if the
                          // product dataset changes later
  countedQty: number;
  countedAt: string;      // ISO timestamp
}
```

"This week" = Monday–Sunday by the device's local clock, computed from
`countedAt` on read — no configuration, no explicit reset needed. Viewing
past weeks is not in v1; the screen always shows the current week only. Data
isn't deleted, so a week-picker is a pure UI addition later, no migration
needed.

## UI placement

- **Home screen**: floating pill button, fixed bottom-center, same visual
  treatment as the existing compare bar (dark rounded pill, white text,
  accent-colored icon). Reads "SO Week · N dihitung"; if nothing's been
  counted yet this week, reads just "SO Week".
- **`/so-week` screen**: top bar with back button, title, and a small pill
  showing the count this week. Below it, the search fallback, then the
  list. Floating scan button bottom-right, matching the app's existing
  accent-blue circular icon-button style.
- **Count sheet**: a bottom sheet (same drag-handle + rounded-top-corner
  pattern as the existing CompareModal), not a full page — this is what
  keeps the loop fast, since it overlays the list instead of navigating
  away from it.
- **Product detail page**: unchanged.

## Error handling / edge cases

- Empty or non-numeric input: save button stays disabled until a valid
  non-negative integer is entered (matches the existing manual
  barcode-entry pattern already in the app).
- Scanned/searched code doesn't resolve to a known product: same error
  treatment the barcode scanner already uses today (Izin/format error
  state), no new pattern needed.
- SO Week screen with zero counts this week: empty state message, similar
  tone to the existing "Barang tidak ditemukan" empty state, prompting to
  scan or search to get started.

## Testing

- Unit tests for the week-boundary calculation (Monday-start, handles week
  wraparound correctly).
- Unit tests for the localStorage read/write helpers (save overwrites the
  same product within the same week, doesn't clobber other products or
  other weeks).
- Manual verification in the browser: scan/search to a product, save a
  count, confirm it appears in the list, confirm re-scanning the same
  product pre-fills and overwrites rather than duplicating.

## Future extensions (not v1, noted so v1's data shape doesn't block them)

- Comparing counts against system stock and flagging discrepancies (this
  was v1's original premise; dropped per the user's explicit request to
  keep it a pure log for now — the `StockCount` shape above has room to add
  a `systemQty` snapshot back in later without breaking existing data).
- Shared/synced counts across multiple devices (would need a backend).
- Per-size counting for finer-grained records.
- Assigned count lists / progress tracking against a target list.
- Viewing past weeks, exporting a week's results.
