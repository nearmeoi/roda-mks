# SO Week (Stock Opname Week) — Design

## Problem

Roda Stock is currently read-only: it displays stock quantities sourced from a
periodically-rebuilt Excel export, with no way to record anything back into
the app. Staff have no way to verify that the recorded stock in the system
actually matches what's physically on the shelf, and no lightweight way to
flag when it doesn't.

## Goal

Let one staff member, walking the shop with their phone, physically count
products they check and immediately see whether that count matches the
system's recorded stock — then review everything they've counted so far this
week in one place, with mismatches surfaced first.

This is intentionally a minimal first version. No scheduling, no assignment
of who counts what, no multi-user sync. It should feel like a small addition
to the existing search/scan flow, not a separate app.

## Non-goals (explicitly out of scope for v1)

- Multiple people counting simultaneously / shared or synced data across
  devices. Only one device does the counting.
- A backend, database, or authentication. Counts live in the browser's
  local storage on the counting device.
- A fixed/assigned count list ("count these 40 products this week"). Staff
  count whatever they search or scan, opportunistically.
- Per-size/per-article-code counts. A count is one number for the whole
  product (all sizes combined), compared against the product's total stock.
- Editable history across past weeks (viewing older weeks' results). Old
  data is not deleted, but v1 only surfaces the current week.
- Notes/reasons attached to a discrepancy, or a "resolved" workflow for
  investigated mismatches.

## Core workflow

1. Staff finds a product the way they already do today — search or scan a
   barcode — landing on the existing product detail page.
2. A new "Hitung Fisik" (physical count) section on that page has a number
   input and a save button.
3. On save, the app compares the entered count against the product's current
   total stock (`sum(sizes[].quantity)`) and shows immediate feedback:
   - Match: "✅ Cocok" (green)
   - Mismatch: "⚠️ Selisih: -2" / "+1" etc. (amber/red), showing the signed
     difference (counted − system)
4. Saving again for the same product *this week* overwrites the previous
   entry (lets staff fix a typo without creating duplicate/confusing rows).
5. A new "SO Week" entry point (icon/link from the home screen) opens a
   summary screen listing every product counted this week: name, system
   qty, counted qty, difference, and when it was counted. Mismatches sort to
   the top; within each group (mismatches, then matches), most recently
   counted first.

## Data model & storage

Counts are stored in `localStorage`, keyed by ISO week (`so-week-counts-v1`
holding an object keyed by product id), as:

```ts
interface StockCount {
  productId: string;
  productName: string;       // denormalized so the report reads fine even
                              // if the product dataset changes later
  systemQty: number;         // snapshot of sum(sizes[].quantity) at count time
  countedQty: number;
  difference: number;        // countedQty - systemQty
  countedAt: string;         // ISO timestamp
}
```

`systemQty` is snapshotted at count time rather than looked up live when
displaying the report. The underlying `products.json` gets rebuilt
periodically by the existing Python pipeline — if the report recomputed the
system quantity live, a mismatch found on Monday could silently "resolve
itself" by Friday just because the dataset was rebuilt, which would hide a
real discrepancy. Snapshotting freezes what the count was actually compared
against.

"This week" = Monday–Sunday by the device's local clock. No configuration —
computed from `countedAt` on read. Switching weeks (e.g. viewing last week)
is not in v1; the report always shows the current week only. Data isn't
deleted, so adding a week-picker later is a pure UI addition, no data
migration needed.

## UI placement

- **Product detail page**: new "Hitung Fisik" section, placed near the
  existing "Stok Tersedia" row in the info table — same neighborhood as the
  numbers it's being compared against, so the comparison reads naturally.
- **Home screen**: a new icon/button (near the search bar, alongside the
  existing barcode-scan button) opens `/so-week`, the summary screen.
- **Summary screen (`/so-week`)**: simple list, mismatches first, same
  visual language as the rest of the app (glass cards, status dot + label
  pattern already used for stock status elsewhere).

## Error handling / edge cases

- Empty or non-numeric input: save button stays disabled until a valid
  non-negative integer is entered (matches the existing manual-barcode-entry
  pattern already in the app).
- Product with no stored count yet: "Hitung Fisik" section shows an empty
  input, no prior value, no match/mismatch badge.
- Summary screen with zero counts this week: empty state message, similar
  tone to the existing "Barang tidak ditemukan" empty state.

## Testing

- Unit tests for the week-boundary calculation (Monday-start, handles week
  wraparound correctly) and the discrepancy math (sign, zero case).
- Unit tests for the localStorage read/write helpers (save overwrites same
  product within the same week, doesn't clobber other products or other
  weeks).
- Manual verification in the browser: count a product, confirm the
  match/mismatch badge, confirm it appears correctly in the summary screen,
  confirm resaving overwrites rather than duplicates.

## Future extensions (not v1, noted so v1's data shape doesn't block them)

- Shared/synced counts across multiple devices (would need a backend).
- Per-size counting for finer-grained discrepancy detection.
- Assigned count lists / progress tracking against a target list.
- Viewing past weeks, exporting a week's results.
