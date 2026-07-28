# Concise Copy-Info (WhatsApp Share Text) — Design

## Problem

`formatWhatsAppMessage` (`web/lib/copy.ts`) — the text behind the "Salin
seluruh info" button on the product detail page — currently dumps
everything: model, brand, category, price, colors, wheel size, stock
status, a full per-size stock breakdown table, and warehouse. It reads like
a data export, not something a staff member would paste into a customer
chat.

## Goal

Rewrite it to be short and to the point: **name, price, a short key-spec
line (groupset for bikes, filtered specs for PAA), a short "kelebihan"
(advantages) line when available, article code, and a brief stock line.**
Drop everything else.

## Non-goals

- No changes to the on-screen product detail page layout — this is only
  about the copied text.
- No per-PAA-category curation (helmet fields vs pedal fields vs shoe
  fields, etc.) — too many categories to hand-maintain. See "Key spec
  selection" below for the generic rule used instead.
- No fabricating a "kelebihan" section when the product has no `Features`
  spec data (currently 43/992 products) — it's just omitted, not padded
  with generic filler.

## Key spec selection

**Bikes** (`category` starts with `BIKE`): look for these spec keys, in
this priority order — `Shifter`, `Rear Derailleur`, `Crank Set`,
`Cassette` — and show whichever exist, **capped at 2**. This is what
"groupset" actually refers to (the drivetrain tier), so it needs to target
those specific fields rather than "whatever's first" — spec field order in
the scraped data isn't guaranteed to put drivetrain parts early (a bike's
`specs` object commonly lists `Frame`/`Fork`/`Saddle` before `Shifter`).

**Everything else (PAA)**: no fixed per-category field list. Instead, skip
a fixed boilerplate set — `Brand`, `What's in the box`, `Genre`, `Weight`,
`Note`, `Rentang Usia` — and show up to **2** of whatever spec keys remain,
in the order they appear in `product.specs` (a plain object, so insertion
order from the scrape). This has no curation to maintain as new PAA
categories show up in the catalog.

Both cases: each shown spec value is truncated to 60 characters (`…`
appended if cut) — raw scraped values can run long
(`"SHIMANO SORA SL-R3000, 2x9-SPEED RAPID FIRE SHIFTER"`), and the whole
point is conciseness.

## Kelebihan (advantages) formatting

When `product.specs["Features"]` exists, split it on `" | "` and take the
first **2** bullets. Each bullet gets one cleanup pass before display: the
scraped source data has bike features where a bullet's short title runs
directly into its sentence with no space or punctuation between them
(confirmed in the current dataset, e.g.
`"Drivetrain Shimano 105 2x12 SpeedRasakan perpindahan gigi..."` — the
title is `"Drivetrain Shimano 105 2x12 Speed"`, immediately followed by
`"Rasakan perpindahan..."`). Insert a space wherever a lowercase letter is
immediately followed by an uppercase letter
(`text.replace(/([a-z])([A-Z])/g, '$1 $2')`), which fixes this specific,
common case (`"SpeedRasakan"` → `"Speed Rasakan"`).

This does **not** fix a rarer, different scrape artifact where an
italic-emphasized word loses its surrounding spaces entirely (e.g.
`"...hingga sprint cepat..."` scraped as `"...hinggasprintcepat..."`, no
capital-letter boundary to detect) — there's no reliable general rule to
catch that without a hardcoded word list, which would be fragile and not
worth building for a cosmetic edge case. Left as a known limitation.

Each bullet is then truncated to 80 characters (a bit longer than the spec
values above, since these are meant to read as a phrase, not a label).
PAA products' `Features` entries in the current dataset are already
well-formed full sentences (no title/paragraph squish), so the space-
insertion pass is a no-op for them — same code path works for both.

## Message format

Bike example:

```
*RODA STOCK INFO - RODALINK MAKASSAR* 🚲

*Strattos F3 CRC*
Rp 6.000.000

*Groupset:*
• Shifter: SHIMANO SORA SL-R3000, 2x9-SPEED RAPID FIRE SHIFTER
• Rear Derailleur: SHIMANO SORA RD-R3000

*Kelebihan:*
• Drivetrain Shimano 105 2x12 Speed Rasakan perpindahan gigi yang mulus…
• Sistem Pengereman Shimano 105 Hydraulic Disc Dapatkan kontrol penuh…

Kode: 503787003
Stok: Tersedia (5 unit)
```

PAA example — same structure, but the section header is generic
("Spesifikasi", not "Groupset", since that word is bike-specific jargon
that wouldn't make sense on a helmet or a pedal) and its fields are
whatever survived the boilerplate filter:

```
*RODA STOCK INFO - RODALINK MAKASSAR* 🚲

*Helmet Kids Superhero*
Rp 228.000

*Spesifikasi:*
• Material: In-Mold PC + EPS
• Air Vents: 12 Vents

Kode: 742286003
Stok: Tersedia (5 unit)
```

- Header line: unchanged (`*RODA STOCK INFO - RODALINK MAKASSAR* 🚲`).
- Name + price: unchanged fields, same `titleCase`/`formatPrice` helpers,
  just dropped the `*Model:*`/`*Harga:*` labels — the name as a bold
  line and the price right under it reads cleaner for a short message.
- The key-spec section ("Groupset" for bikes, "Spesifikasi" for PAA) only
  appears when at least one relevant field was found. "Kelebihan" only
  appears when `Features` exists. Both are cleanly omitted (no empty
  headers) when there's nothing to put under them — this applies the same
  way to PAA products whose remaining specs, after the boilerplate filter,
  turn out to be empty.
- Article code and stock stay, single short lines, no per-size table.
- Brand, category, colors, wheel size, and warehouse are dropped entirely
  (available on the product page itself if needed).

## Testing

- Unit tests in `web/__tests__/format.test.ts` or a new
  `web/__tests__/copy.test.ts` for the pure helper logic: the space-
  insertion regex on the known squished-title case, the boilerplate-key
  filter for PAA, the groupset field priority/cap-at-2 for bikes, and
  truncation at the specified lengths.
- Manual verification: copy the info for a bike with a `Features` entry,
  a bike without one, a PAA product with `Features`, and a PAA product
  without — confirm each section appears/disappears correctly and the
  pasted text reads as intended.
