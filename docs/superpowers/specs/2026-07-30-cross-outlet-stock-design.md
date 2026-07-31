# Cross-Outlet Stock Lookup — Design

## Problem
When an item is out of stock (or a specific size is missing) at this outlet,
staff currently have no way to check whether another Rodalink outlet has it,
short of manually calling around. The internal POS admin
(pos.rodalink.com) has this data, but only staff with POS access can see it,
and its stock-by-outlet columns are just raw outlet codes (`I259`, `I261`, ...)
with no names attached, plus occasional non-numeric values like `"Week 34"`
that need interpreting.

## Constraints
- **Read-only, always.** Only GET requests against POS search/report views.
  Never any endpoint that creates, updates, or deletes POS data.
- **No automated login.** I'm not able to type a password into the POS login
  form on the user's behalf. The integration runs on a POS session
  (`POS_COOKIE` / `POS_XSRF_TOKEN`) the user captures manually from an
  authenticated browser session, same pattern as `pipeline/fetch_pos_prices.py`.
  Laravel sessions expire, so this will periodically need a fresh cookie
  pasted into the server's env vars -- there's no way to avoid that without
  a login flow, which is out of bounds.
- **Be light on POS traffic.** No eager/automatic calls (e.g. one per row in
  a list). Only fires on an explicit user action, one query at a time.

## Data sources (confirmed via manual exploration)
- `GET /admin/outlet-stock/all-new?article=<text or exact article code>&...`
  -- returns, per matching article, a stock count for every outlet as a
  column keyed by outlet code (`I259`, `I261`, ..., `I311` for this outlet,
  plus `HQ` and `BS` for the two central warehouses). Confirmed it matches
  both free-text (`STRATTOS`) and an exact numeric article code
  (`503328001`). `HQ`/`BS` values are sometimes a number, sometimes a string
  like `"10+"` or `"Week 34"` (apparent restock-ETA marker).
- `GET /admin/outlet/all?type=withhq` -- full outlet list: `id` (matches the
  column codes above), `display_name`, `city`, `active`. Changes rarely, so
  it's snapshotted by a pipeline script rather than fetched on every lookup.

## Approach
1. **`pipeline/fetch_pos_outlets.py`** -- one-off/occasional script (same
   `POS_COOKIE`/`POS_XSRF_TOKEN` env var pattern as `fetch_pos_prices.py`),
   pulls `/admin/outlet/all?type=withhq`, writes `{code: {name, city,
   active}}` to `data/pos_outlets.json`, synced to `web/lib/pos_outlets.json`
   (server-only import -- not shipped to the client, since resolving outlet
   names happens server-side in the API route below).

2. **`web/lib/weekLabel.ts`** -- pure utility: `weekToDateRange(week, year?)`
   returns the Monday–Sunday date range for that ISO week (defaults to the
   current year), plus a formatter for a human string like "18–24 Agu 2026".
   Used to turn `"Week 34"` markers into an actual date range.

3. **`web/app/api/outlet-stock/route.ts`** -- Next.js server route, `GET
   ?query=<text or article code>`. Server-side only:
   - Reads `POS_COOKIE`/`POS_XSRF_TOKEN` from env vars (never sent to the
     client).
   - Calls `/admin/outlet-stock/all-new` with that query.
   - For each matching article row, maps non-zero outlet columns to
     `{code, name, city, qty}` via `pos_outlets.json`, and separately
     surfaces `HQ`/`BS` (parsing `"Week NN"` through `weekToDateRange` when
     present).
   - Returns a trimmed JSON shape the client renders directly. If the POS
     session has expired (401), returns a clear error the UI surfaces as
     "Sesi POS kadaluarsa, perlu di-refresh" rather than a generic failure.

4. **UI**: on the product detail page
   ([ProductDetailContent.tsx](../../../web/components/ProductDetailContent.tsx)),
   a "Cek Outlet Lain" button appears only when total stock at this outlet is
   0. Tapping it calls `/api/outlet-stock?query=<product.model_name>` (the
   stored model name is already uppercase, matching POS's raw description
   format, and searching by name rather than one article code surfaces
   *all* size variants across outlets in a single call) and renders the
   result inline: outlet name + city + qty, sorted by qty descending, with
   HQ/BS shown separately (including the resolved week date range when
   applicable).

## Out of scope
- Not wired into the All Stock section or any list view -- manual,
  single-item lookup only, to keep POS traffic minimal.
- Sales-person report (separate feature, tackled after this one).
- Any POS write action.
