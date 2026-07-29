# Staff Guide (FAQ/Reference Articles) — Design

## Problem

Staff have no quick, in-app way to answer common customer questions on the
spot — what bike size someone needs, why one groupset costs more than
another, what a current promo actually covers, sizing charts for helmets/
apparel/shoes, warranty terms, or even how to use Roda Stock's own features
(voice search, SO Week, compare). Right now that knowledge either lives in
someone's head, on paper, or nowhere findable in the moment.

## Goal

A staff-facing reference section: short, scannable articles staff can pull
up mid-conversation with a customer and get an answer in seconds — not a
training manual meant to be read once and studied.

## Non-goals

- Not a training/onboarding document — content is written for someone who
  already works there and needs a fast lookup, not a first-day tutorial.
- No in-app editing UI. This app has no backend or database — articles are
  static data in the repo, same as product stock data, updated by editing
  a file and redeploying. Time-sensitive content (promos) needs that step
  each time it changes; accepted trade-off, confirmed with the user.
- No Markdown parsing dependency. Article content is structured data
  (typed "blocks"), not free-text Markdown — avoids adding a new content
  pipeline for what will be a small, hand-maintained set of articles.
- No customer-facing version of this content — staff-only, reached via an
  icon in the app's own header, not something a customer would see over
  someone's shoulder and mistake for official published material (though
  nothing in it is secret, either).

## Data model

```ts
// web/lib/types.ts additions

type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

interface GuideArticle {
  id: string;           // slug, e.g. "ukuran-sepeda-road"
  category: string;     // e.g. "Ukuran Sepeda", "Groupset", "Promo"
  title: string;
  summary: string;      // one-line "quick answer", shown in the article list
  tags?: string[];      // extra search keywords beyond title/category/summary
  blocks: ContentBlock[];
}
```

A small `GuideBlockRenderer` component switches on `block.type` and renders
each block with styling consistent with the rest of the app (the existing
info-table/spec-list visual language already used on the product detail
page — `rounded-2xl border bg-white/70` cards, the same typography scale).

Articles live in `web/lib/guideArticles.ts` as a plain exported array —
no separate file per article, no build step, just a TypeScript module,
consistent with how `web/lib/products.json` is imported directly today.

## Navigation

- **Entry point**: a small icon button in the home screen's header, next
  to the "Roda Stock" logo/title — always visible, doesn't compete with
  the SO Week floating pill or search results for the same screen space.
- **`/guide`**: a search bar at the top (reusing the same `fuse.js`
  fuzzy-search approach already used for products, indexed over
  `title`/`category`/`summary`/`tags`), with the full article list shown
  below when there's no query (grouped by `category`, most useful
  categories first — sizing guides and groupset explainer before the
  app-usage and policy articles, since those are the highest-frequency
  customer questions). Each list row shows title + `summary` (the
  one-line quick answer) so staff often get their answer without even
  opening the article.
- **`/guide/[id]`**: the full article, rendered via `GuideBlockRenderer`,
  with a back button matching the existing `BackButton` component's
  pattern used on product detail pages.

## Content plan

Ten initial articles. Two are explicitly templates for the user to fill in
with real business details (promos, warranty) rather than fabricated
content; the rest are industry-standard reference material drafted as part
of implementation, verified against the actual brands/tiers present in
this app's own product data (`web/lib/products.json`) rather than assumed
generically:

1. **Panduan Ukuran Sepeda Road/Hybrid/Gravel** — frame size by rider
   height, drop-bar and flat-bar road-style bikes.
2. **Panduan Ukuran Sepeda Gunung (MTB)** — frame size by rider height
   (S/M/L convention), 27.5" vs 29" wheel guidance.
3. **Panduan Ukuran Sepeda Anak** — by age/height, wheel sizes 12"–24".
4. **Mengenal Tingkatan Groupset** — one combined article covering
   Shimano's road tier hierarchy (Claris → Sora → Tiagra → 105 → Ultegra
   → Dura-Ace) and MTB tier hierarchy (Tourney → Altus → Acera → Alivio →
   Deore → SLX → XT → XTR), plus SRAM's relevant tiers — both brands are
   confirmed present in the current product data (e.g. Shimano 105/SLX
   groupsets, SRAM XX Eagle AXS) — framed around "why does this bike cost
   more," the actual customer question this answers.
5. **Panduan Ukuran Helm** — head circumference (cm) to helmet size.
6. **Panduan Ukuran Jersey & Apparel** — chest/height to S/M/L/XL, the
   standard cycling-apparel sizing convention.
7. **Panduan Ukuran Sepatu Sepeda** — EU/US/UK size conversion chart for
   cycling shoes.
8. **Promo & Diskon Aktif** — *template*: category + placeholder blocks
   for the user to replace with real, current promo terms.
9. **Kebijakan Garansi & Servis** — *template*: same, for warranty/service
   policy.
10. **Cara Menggunakan Roda Stock** — one combined how-to with a section
    per feature (search, barcode scan, voice search, SO Week, compare) —
    short bullet steps per feature, not a full tutorial.

## Error handling

- `/guide/[id]` for an id that doesn't exist: same "not found" treatment
  pattern as the product detail page (`notFound()` from `next/navigation`).
- No search results: same empty-state tone as the existing "Barang tidak
  ditemukan" pattern on the home screen.

## Testing

- Unit tests for the guide search function (mirrors `web/lib/search.ts`'s
  existing test coverage in `web/__tests__/search.test.ts`) — a fuzzy
  match on title, category, and tags returns the expected article(s).
- `GuideBlockRenderer` has no automated test (a pure rendering component
  with no logic branches beyond a `block.type` switch — consistent with
  how this codebase doesn't unit-test presentational components).
- Manual verification: open each of the 10 articles, confirm content
  renders correctly (tables display as tables, bullets as bullets),
  confirm search finds articles by partial title and by a tag.
