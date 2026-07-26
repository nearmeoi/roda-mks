# Rodalink Outlet Stock Checker — Design

## 1. Purpose

Internal web app for checking Rodalink Outlet (I311) stock. A user searches for a bike by name/brand/category and gets a glassy, light-themed search-first UI. Search results lead to a product detail page with a photo carousel, price, available sizes with per-size stock, color variants, and specs.

**Scope (v1):** Bicycles only (xlsx `Merchandise Category` starting with `BIKE-`). Non-bike categories (footwear, helmets, bottles, apparel, spare parts — 87 categories total in the source file) are explicitly out of scope for v1 and will be a follow-up iteration.

## 2. Source Data

- **Stock data**: `Outlet I311 Stock 25-Jul-2026 12_55_24.xlsx` — columns: `Warehouse, Article Code, Description, Brand, Merchandise Category, Quantity, Ordered Quantity, Price`. 1,145 rows total, 176 rows in `BIKE-*` categories.
  - `Description` encodes model name + color + frame/wheel size + size code + color code, e.g. `STRATTOS S2 700C DA, S1, 1L` = model "Strattos S2 700C", size code `S1`, color code `1L`.
  - Each row is one SKU (one size + one color). Same model in different colors/sizes appears as separate rows sharing the same base model name.
- **Photos & specs**: not present in the xlsx or in the existing `rodalink_products.json` scrape. Must be sourced by scraping rodalink.com product pages (full photo gallery, specs, description, color swatches), matched to outlet rows by brand + model name.

## 3. Data Pipeline (offline, rerun manually when a new xlsx arrives)

1. Parse the xlsx, filter to `BIKE-*` categories.
2. Parse `Description` into `{model_name, color_code, size_code, wheel_size}`.
3. Group rows by `(Brand, model_name, color_code)` into one **product**; each product holds an array of size variants: `{size_code, article_code, quantity, price}`.
4. Extend `scraper_v3.py` to crawl the bike categories on rodalink.com and capture the **full photo gallery** per product (current version only grabs a single `image_url`), plus specs, description, and color swatches (this part already exists).
5. Match each grouped product to a scraped catalog product using fuzzy matching on brand + model name. Store the matches in a mapping file that can be **manually corrected** (outlet items are often older/discontinued models that may not exist on the live site, or may match to the wrong variant).
6. Unmatched products are kept in the dataset without photos (UI falls back to a placeholder/category icon — not an error state).
7. Output a single static file, `data/products.json`, committed to the repo. This file is the web app's only data source.

**Update model for v1**: when a new xlsx is provided, rerun the pipeline and redeploy to Vercel manually. No admin upload UI, no database — confirmed acceptable for v1.

## 4. Web App

### 4.1 Home page
- Centered glassy pill search bar on a light background: white base with a soft pastel mesh-gradient (blurred color blobs — green/blue/purple/yellow), matching the approved visual mockup.
- Pill contents: a green circular "+" button on the left, placeholder text "Cari apa?", and a **search icon button** on the right (no mic/voice search — decorative icon only, replaced per user feedback).
- Frosted-glass effect via `backdrop-filter: blur()` + translucent white fill.

### 4.2 Search / results
- Search is client-side fuzzy search (Fuse.js) over product name, brand, category, and article code across all grouped v1 (bike) products.
- On submit, the search bar animates from centered to pinned at the top, and a results list appears below it.
- Each result card: thumbnail (first gallery photo, or placeholder), model name, brand, category, price, and a note of how many sizes are available (e.g. "3 ukuran").

### 4.3 Product detail page
- Photo carousel (swipeable) built from the scraped gallery; placeholder if unmatched/no photos.
- Model name, brand, category, price.
- Size chips, each showing per-size stock quantity. Sizes with `quantity = 0` are shown but visually disabled/greyed with a "Habis" label (not hidden).
- Color swatches for other color variants of the same model — clicking switches to that color variant's product page.
- Specs table (key/value) from the scraped data.

### 4.4 Out-of-stock handling
- Products/sizes with quantity 0 remain visible everywhere (search results and detail) but are marked "Habis" rather than removed.

## 5. Tech Stack & Deployment

- **Next.js (App Router) + Tailwind CSS**, deployed to **Vercel** as serverless.
- No database — `data/products.json` (bike products only, ~100-130 grouped entries) is bundled statically; search runs entirely client-side.
- No auth/admin page in v1.

## 6. Testing

- Data pipeline: unit-test the `Description` parser against a sample of real rows (covering multi-word models, missing color/size segments, and known edge cases like `ELENA MEOW 16 FA, 09B, P`).
- Grouping: verify rows with identical brand+model+color but different sizes collapse into one product with correct size/qty/price arrays.
- Web app: manual verification in-browser of the three flows (home → search → detail) across at least one product with multiple sizes+colors and one unmatched (no-photo) product.
