# Home Screen Visual Hierarchy Redesign — Design

## Problem
The mobile home screen ([page.tsx](../../../web/app/page.tsx)) applies the same
heavy "floating glass card" treatment (rounded corners, border, shadow,
backdrop-blur) to nearly every element: the search bar, the budget-recommendation
button, each history chip, and every single product row. Nothing recedes, so
nothing stands out — search (the primary action) doesn't read as more important
than a history chip. The history row also wraps to two lines when there are
several terms, eating vertical space above the fold.

The user wants to keep the iOS glass aesthetic (they like it) but fix the
hierarchy: search should stay the loudest, most-noticed element; everything
else should visually recede in proportion to its importance; product lists
should stop repeating the same card chrome for every row.

Scope: home page only ([page.tsx](../../../web/app/page.tsx)), not
`/rekomendasi` or other pages that reuse `ResultRow`.

## Approach
1. **Search bar** — unchanged; stays the hero element.
2. **"Rekomendasi Budget" link** — drops from a bordered/shadowed pill to a
   plain inline text link with an icon (no background, no border, no blur).
3. **Riwayat (history)** — single-row horizontal scroll (`overflow-x-auto`,
   `flex-nowrap`) instead of wrapping to a second line; chips get a lighter
   weight (muted gray text, thin flat background, no per-chip blur/shadow) so
   they read as secondary to search.
4. **Product lists** (search results, favorites, All Stock) — each section
   becomes one grouped glass container (rounded, bordered, shadowed,
   backdrop-blur, `divide-y` between rows) instead of N separately-carded
   rows. `ResultRow` and `AllStockRow` get an `inGroup` prop: when true, the
   row renders flat (padding + hover/active feedback only, no own
   rounded/border/shadow/blur) so the container supplies the chrome once.
   Default (`inGroup` unset) keeps today's standalone-card look, so
   `/rekomendasi`'s use of `ResultRow` is unaffected.

## Out of scope
- `/rekomendasi` page and any other `ResultRow` consumer besides the home page.
- `SearchBar` internals (already the hero, left as-is).
- Product detail page, guide pages, SO Week page.
