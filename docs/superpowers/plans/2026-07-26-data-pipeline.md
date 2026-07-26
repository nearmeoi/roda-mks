# Outlet Stock Data Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline Python pipeline that turns the outlet stock xlsx into a single static `data/products.json` file — grouped by model+color, enriched with photos/specs scraped from rodalink.com — that the Next.js web app (separate plan) will consume.

**Architecture:** Four pure, independently-testable stages (parse xlsx → group rows → scrape catalog → fuzzy-match) wired together by an orchestrator script. The scrape stage must drive a real browser (Playwright), not plain HTTP requests — confirmed below.

**Tech Stack:** Python 3, openpyxl (xlsx), Playwright + BeautifulSoup4 (scraping), rapidfuzz (fuzzy matching), pytest.

## Global Constraints

- v1 scope is bicycles only: xlsx rows where `Merchandise Category` starts with `BIKE-`. Non-bike rows (footwear, helmets, spare parts, etc.) are excluded entirely from this pipeline's output.
- Source file: `Outlet I311 Stock 25-Jul-2026 12_55_24.xlsx` (path has spaces — always quote it). Header is row 1; columns in order are `Warehouse, Article Code, Description, Brand, Merchandise Category, Quantity, Ordered Quantity, Price`.
- **rodalink.com blocks plain HTTP requests.** Confirmed 2026-07-26: `requests.get()` with browser-like headers against both a known-good and a guessed product URL returns `403 Access Denied` from an Akamai edge WAF (`errors.edgesuite.net`). A real browser (tested via an automated browser tool) loads the same pages successfully. **The scraper must use Playwright** (a real, JS-capable browser), not `requests`/`urllib`. This supersedes the approach in the existing `scraper.py`/`scraper_v3.py` in this repo — those use `requests` and will no longer work.
- The live site's product-page markup has also changed since `scraper_v3.py` was written: specs now render as `.specification-list .spec-row` (label/value divs) behind a click-to-reveal tab (`#tab-label-additional-title`), not the old `#product-attribute-specs-table`. Selectors below are re-verified against the live site as of 2026-07-26.
- Output is a single static file, `data/products.json`, committed to the repo. No database. Rerun this pipeline manually and redeploy the web app whenever a new xlsx arrives.
- Products the catalog scraper can't confidently match keep `"matched": false` and `"images": []` — they must still appear in the output, never be dropped.

---

## File Structure

```
pipeline/
  __init__.py
  parse_stock.py       # xlsx -> raw per-SKU rows (bike only)
  group_products.py    # raw rows -> grouped products (by brand+model+color)
  scrape_catalog.py     # rodalink.com crawl via Playwright -> catalog entries
  match_catalog.py      # fuzzy-match grouped products against catalog
  build_dataset.py      # orchestrator CLI -> data/products.json
  requirements.txt
tests/
  test_parse_stock.py
  test_group_products.py
  test_scrape_catalog.py
  test_match_catalog.py
  test_build_dataset.py
  fixtures/
    sample_category_page.html   (already created during design)
    sample_product_detail.html  (already created during design)
data/
  catalog_overrides.json   # manual match corrections, starts as {}
  products.json             # final output (generated, not hand-written)
```

---

### Task 1: Project setup

**Files:**
- Create: `pipeline/__init__.py`
- Create: `pipeline/requirements.txt`
- Create: `data/catalog_overrides.json`

**Interfaces:**
- Produces: a `pipeline` package importable from the repo root; an installed environment with `openpyxl`, `playwright`, `beautifulsoup4`, `rapidfuzz`, `pytest` available.

- [ ] **Step 1: Create the package and requirements file**

`pipeline/__init__.py`:
```python
```
(empty file — just makes `pipeline` importable)

`pipeline/requirements.txt`:
```
openpyxl==3.1.5
playwright==1.48.0
beautifulsoup4==4.12.3
rapidfuzz==3.10.1
pytest==8.3.3
```

- [ ] **Step 2: Install dependencies and the Playwright browser**

Run:
```bash
pip install -r pipeline/requirements.txt
playwright install chromium
```
Expected: both commands complete without error (the `playwright install` download is ~150MB, only needed once).

- [ ] **Step 3: Create the empty overrides file**

`data/catalog_overrides.json`:
```json
{}
```

- [ ] **Step 4: Verify pytest runs**

Run: `pytest --collect-only`
Expected: exits 0 with "no tests ran" (no test files exist yet).

- [ ] **Step 5: Commit**

```bash
git add pipeline/__init__.py pipeline/requirements.txt data/catalog_overrides.json
git commit -m "chore: scaffold data pipeline package"
```

---

### Task 2: Parse stock xlsx into raw bike SKU rows

**Files:**
- Create: `pipeline/parse_stock.py`
- Test: `tests/test_parse_stock.py`

**Interfaces:**
- Produces:
  - `parse_description(description: str) -> dict` — returns `{"model_name": str, "size_code": str, "color_code": str}`, raises `ValueError` if the description doesn't split into exactly 3 comma-separated parts.
  - `load_bike_rows(xlsx_path: str) -> list[dict]` — returns one dict per `BIKE-*` SKU row: `{"article_code": int, "brand": str, "category": str, "quantity": int, "price": int | None, "model_name": str, "size_code": str, "color_code": str}`. Rows whose description fails to parse are skipped (logged to stdout), not raised.

- [ ] **Step 1: Write the failing tests**

`tests/test_parse_stock.py`:
```python
import os
import openpyxl
import pytest
from pipeline.parse_stock import parse_description, load_bike_rows


def test_parse_description_simple():
    result = parse_description("OOSTEN DA 24, 14A, L")
    assert result == {"model_name": "OOSTEN DA 24", "size_code": "14A", "color_code": "L"}


def test_parse_description_multiword_model():
    result = parse_description("STRATTOS S2 700C DA, S1, 1L")
    assert result == {
        "model_name": "STRATTOS S2 700C DA",
        "size_code": "S1",
        "color_code": "1L",
    }


def test_parse_description_rejects_wrong_shape():
    with pytest.raises(ValueError):
        parse_description("NOT ENOUGH COMMAS HERE")


def test_load_bike_rows_filters_and_parses(tmp_path):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Warehouse", "Article Code", "Description", "Brand",
               "Merchandise Category", "Quantity", "Ordered Quantity", "Price"])
    ws.append(["Outlet", 503200001, "STRATTOS S4 700C DA, S1, Z", "POLYGON",
               "BIKE-ROAD DROP BAR", 1, None, 10600000])
    ws.append(["Outlet", 503200002, "STRATTOS S4 700C DA, M, Z", "POLYGON",
               "BIKE-ROAD DROP BAR", 1, None, 10600000])
    ws.append(["Outlet", 999999999, "SOME SHOE, 42, BLK", "NIKE",
               "FOOTWEAR", 5, None, 500000])
    xlsx_path = tmp_path / "sample.xlsx"
    wb.save(xlsx_path)

    rows = load_bike_rows(str(xlsx_path))

    assert len(rows) == 2
    assert rows[0] == {
        "article_code": 503200001,
        "brand": "POLYGON",
        "category": "BIKE-ROAD DROP BAR",
        "quantity": 1,
        "price": 10600000,
        "model_name": "STRATTOS S4 700C DA",
        "size_code": "S1",
        "color_code": "Z",
    }


def test_load_bike_rows_skips_unparseable_description(tmp_path, capsys):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Warehouse", "Article Code", "Description", "Brand",
               "Merchandise Category", "Quantity", "Ordered Quantity", "Price"])
    ws.append(["Outlet", 1, "BROKEN DESCRIPTION NO COMMAS", "POLYGON",
               "BIKE-MTB RIGID FRAME", 1, None, 1000000])
    xlsx_path = tmp_path / "sample.xlsx"
    wb.save(xlsx_path)

    rows = load_bike_rows(str(xlsx_path))

    assert rows == []
    assert "1" in capsys.readouterr().out
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_parse_stock.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.parse_stock'`

- [ ] **Step 3: Implement**

`pipeline/parse_stock.py`:
```python
import openpyxl


def parse_description(description: str) -> dict:
    parts = [p.strip() for p in description.split(",")]
    if len(parts) != 3:
        raise ValueError(f"expected 3 comma-separated parts, got {len(parts)}: {description!r}")
    model_name, size_code, color_code = parts
    return {"model_name": model_name, "size_code": size_code, "color_code": color_code}


def load_bike_rows(xlsx_path: str) -> list[dict]:
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb.active
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        warehouse, article_code, description, brand, category, quantity, _ordered, price = row
        if article_code is None or category is None or not category.startswith("BIKE"):
            continue
        try:
            parsed = parse_description(description or "")
        except ValueError as exc:
            print(f"[parse_stock] skipping article {article_code}: {exc}")
            continue
        rows.append({
            "article_code": article_code,
            "brand": brand,
            "category": category,
            "quantity": quantity if quantity is not None else 0,
            "price": price,
            **parsed,
        })
    return rows
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_parse_stock.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/parse_stock.py tests/test_parse_stock.py
git commit -m "feat: parse outlet xlsx bike rows"
```

---

### Task 3: Group raw rows into model+color products

**Files:**
- Create: `pipeline/group_products.py`
- Test: `tests/test_group_products.py`

**Interfaces:**
- Consumes: row dicts shaped exactly like `load_bike_rows`'s return value (Task 2).
- Produces: `group_rows(rows: list[dict]) -> list[dict]`, one dict per `(brand, model_name, color_code)` group: `{"brand": str, "model_name": str, "color_code": str, "category": str, "price": int | None, "sizes": [{"size_code": str, "article_code": int, "quantity": int, "price": int | None}]}`. `price` on the group is the first non-`None` size price (all sizes share the same price in the source data). `sizes` preserves the input row order.

- [ ] **Step 1: Write the failing test**

`tests/test_group_products.py`:
```python
from pipeline.group_products import group_rows


def test_group_rows_merges_same_model_and_color():
    rows = [
        {"article_code": 503202002, "brand": "POLYGON", "category": "BIKE-ROAD DROP BAR",
         "quantity": 2, "price": 6700000, "model_name": "STRATTOS S2 700C DA",
         "size_code": "S1", "color_code": "1L"},
        {"article_code": 503202003, "brand": "POLYGON", "category": "BIKE-ROAD DROP BAR",
         "quantity": 2, "price": 6700000, "model_name": "STRATTOS S2 700C DA",
         "size_code": "M", "color_code": "1L"},
        {"article_code": 503782004, "brand": "POLYGON", "category": "BIKE-ROAD DROP BAR",
         "quantity": 1, "price": 21000000, "model_name": "STRATTOS 6 WHT/BRZ FA 700",
         "size_code": "M", "color_code": "0"},
    ]

    groups = group_rows(rows)

    assert len(groups) == 2
    strattos_s2 = next(g for g in groups if g["model_name"] == "STRATTOS S2 700C DA")
    assert strattos_s2["brand"] == "POLYGON"
    assert strattos_s2["color_code"] == "1L"
    assert strattos_s2["category"] == "BIKE-ROAD DROP BAR"
    assert strattos_s2["price"] == 6700000
    assert strattos_s2["sizes"] == [
        {"size_code": "S1", "article_code": 503202002, "quantity": 2, "price": 6700000},
        {"size_code": "M", "article_code": 503202003, "quantity": 2, "price": 6700000},
    ]


def test_group_rows_uses_first_non_null_price():
    rows = [
        {"article_code": 1, "brand": "POLYGON", "category": "BIKE-ELECTRIC",
         "quantity": 1, "price": None, "model_name": "SISKIU HE-P ID DA 29",
         "size_code": "S1", "color_code": "P"},
        {"article_code": 2, "brand": "POLYGON", "category": "BIKE-ELECTRIC",
         "quantity": 1, "price": 15000000, "model_name": "SISKIU HE-P ID DA 29",
         "size_code": "M", "color_code": "P"},
    ]

    groups = group_rows(rows)

    assert len(groups) == 1
    assert groups[0]["price"] == 15000000
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_group_products.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.group_products'`

- [ ] **Step 3: Implement**

`pipeline/group_products.py`:
```python
def group_rows(rows: list[dict]) -> list[dict]:
    groups: dict[tuple, dict] = {}
    for row in rows:
        key = (row["brand"], row["model_name"], row["color_code"])
        if key not in groups:
            groups[key] = {
                "brand": row["brand"],
                "model_name": row["model_name"],
                "color_code": row["color_code"],
                "category": row["category"],
                "price": None,
                "sizes": [],
            }
        group = groups[key]
        group["sizes"].append({
            "size_code": row["size_code"],
            "article_code": row["article_code"],
            "quantity": row["quantity"],
            "price": row["price"],
        })
        if group["price"] is None and row["price"] is not None:
            group["price"] = row["price"]
    return list(groups.values())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_group_products.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/group_products.py tests/test_group_products.py
git commit -m "feat: group outlet rows into model+color products"
```

---

### Task 4: Parse rodalink.com HTML (category listings + product detail)

**Files:**
- Create: `pipeline/scrape_catalog.py`
- Test: `tests/test_scrape_catalog.py`
- Fixtures (already created and verified against the live site on 2026-07-26): `tests/fixtures/sample_category_page.html`, `tests/fixtures/sample_product_detail.html`

**Interfaces:**
- Produces (pure functions, no network — these are what get unit tested):
  - `extract_product_links(html: str) -> list[dict]` — `[{"url": str, "name": str}, ...]` from a category listing page.
  - `get_next_page_url(html: str) -> str | None` — the `?p=N` URL of the next page, or `None` on the last page.
  - `extract_product_detail(html: str, url: str) -> dict` — `{"url": str, "name": str, "brand": str, "price": int | None, "colors": [str], "sizes": [str], "images": [str], "specs": {str: str}}`.
- These are consumed by Task 5's live crawler.

- [ ] **Step 1: Write the failing tests**

`tests/test_scrape_catalog.py`:
```python
import os
from pipeline.scrape_catalog import (
    extract_product_links,
    get_next_page_url,
    extract_product_detail,
)

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def _read_fixture(name):
    with open(os.path.join(FIXTURES, name), encoding="utf-8") as f:
        return f.read()


def test_extract_product_links():
    html = _read_fixture("sample_category_page.html")
    links = extract_product_links(html)
    assert len(links) == 4
    assert links[0] == {
        "url": "https://www.rodalink.com/id/polygon-sepeda-balap-strattos-7-503769.html",
        "name": "Polygon Sepeda Balap Strattos 7",
    }
    assert links[3]["name"] == "Polygon Sepeda Balap Strattos 6"


def test_get_next_page_url_returns_page_2():
    html = _read_fixture("sample_category_page.html")
    assert get_next_page_url(html) == \
        "https://www.rodalink.com/id/sepeda/sepeda-balap-road-bike.html?p=2"


def test_get_next_page_url_none_on_last_page():
    html = "<div class='pages'><li class='item current'>1</li></div>"
    assert get_next_page_url(html) is None


def test_extract_product_detail():
    html = _read_fixture("sample_product_detail.html")
    detail = extract_product_detail(html, "https://www.rodalink.com/id/polygon-sepeda-balap-strattos-7-503769.html")

    assert detail["name"] == "Polygon Sepeda Balap Strattos 7"
    assert detail["price"] == 25000000
    assert detail["brand"] == "Polygon"
    assert detail["colors"] == ["Black"]
    assert detail["sizes"] == ["XS", "S", "M"]
    assert detail["specs"]["Frame"] == "CARBON ENDURANCE"
    assert detail["specs"]["Weight"] == "8.9 kg (Size M)"
    assert len(detail["images"]) == 7
    assert all(img.startswith("https://media.rodalink.com/catalog/product/") for img in detail["images"])
    assert len(set(detail["images"])) == 7  # deduped
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_scrape_catalog.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.scrape_catalog'`

- [ ] **Step 3: Implement the pure parsing functions**

`pipeline/scrape_catalog.py`:
```python
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup


def extract_product_links(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    links = []
    seen = set()
    for a in soup.select("a.product-item-link"):
        url = a.get("href", "").strip()
        name = a.get_text(strip=True)
        if url and url not in seen:
            seen.add(url)
            links.append({"url": url, "name": name})
    return links


def get_next_page_url(html: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    next_link = soup.select_one("a.action.next") or soup.select_one("li.pages-item-next a")
    if next_link and next_link.get("href"):
        return next_link["href"].strip()
    return None


def _image_url_from_src(src: str) -> str:
    filename = src.rsplit("/", 1)[-1]
    bucket1, bucket2 = filename[0], filename[1]
    base = re.match(r"^(https?://[^/]+)", src).group(1)
    return f"{base}/catalog/product/{bucket1}/{bucket2}/{filename}"


def extract_product_detail(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    name_el = soup.select_one("h1")
    name = name_el.get_text(strip=True) if name_el else ""

    price = None
    price_el = soup.select_one("#price-block .price, .price-wrapper .price, .price-box .price")
    if price_el:
        digits = re.sub(r"[^\d]", "", price_el.get_text())
        price = int(digits) if digits else None

    colors, sizes = [], []
    for attr in soup.select(".swatch-attribute"):
        code = attr.get("data-attribute-code", "")
        labels = [opt.get("data-option-label", "") for opt in attr.select(".swatch-option")]
        labels = [l for l in labels if l]
        if code == "color":
            colors = labels
        elif labels:
            sizes = labels

    specs = {}
    for row in soup.select(".spec-row"):
        label_el = row.select_one(".spec-label")
        value_el = row.select_one(".spec-value")
        if label_el and value_el:
            specs[label_el.get_text(strip=True)] = value_el.get_text(strip=True)

    brand = specs.get("Brand", name.split(" ")[0] if name else "")

    images = []
    seen_images = set()
    for img in soup.select(".fotorama__img"):
        src = img.get("src", "")
        if not src:
            continue
        canonical = _image_url_from_src(src)
        if canonical not in seen_images:
            seen_images.add(canonical)
            images.append(canonical)

    return {
        "url": url,
        "name": name,
        "brand": brand,
        "price": price,
        "colors": colors,
        "sizes": sizes,
        "images": images,
        "specs": specs,
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_scrape_catalog.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/scrape_catalog.py tests/test_scrape_catalog.py
git commit -m "feat: parse rodalink category and product-detail HTML"
```

---

### Task 5: Live catalog crawl via Playwright

**Files:**
- Modify: `pipeline/scrape_catalog.py` (append to the file from Task 4)

**Interfaces:**
- Consumes: `extract_product_links`, `get_next_page_url`, `extract_product_detail` from Task 4.
- Produces: `crawl_category(page, start_url: str) -> list[dict]` and `scrape_bike_catalog(output_path: str, partial_path: str, headless: bool = True) -> list[dict]`, used by Task 7's `build_dataset.py`. Writes/reads a resumable `partial_path` JSON file the same way the existing `scraper_v3.py` does.

This task is network-dependent and cannot be unit-tested against fixtures — it is verified manually in Task 8 by running it for real against one category first. No automated test is written for these two functions.

- [ ] **Step 1: Append the live crawl functions**

Add to `pipeline/scrape_catalog.py`:
```python
import json
import os
from playwright.sync_api import sync_playwright

BASE_URL = "https://www.rodalink.com"
REQUEST_DELAY_MS = 800
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
SEPEDA_CATEGORIES = {
    "Sepeda Elektrik (E-Bike)": "/id/sepeda/sepeda-elektrik-ebike.html",
    "Sepeda Gunung": "/id/sepeda/sepeda-gunung.html",
    "Sepeda Balap (Road Bike)": "/id/sepeda/sepeda-balap-road-bike.html",
    "Sepeda Perkotaan (City Bike)": "/id/sepeda/sepeda-perkotaan-city-bikes.html",
    "Sepeda Gravel & Touring": "/id/sepeda/sepeda-gravel-touring.html",
    "Sepeda Hybrid": "/id/sepeda/sepeda-hybrid.html",
    "Sepeda BMX": "/id/sepeda/sepeda-bmx.html",
    "Sepeda Lipat": "/id/sepeda/sepeda-lipat.html",
    "Sepeda Anak": "/id/sepeda/sepeda-anak.html",
    "Sepeda Wanita": "/id/sepeda/sepeda-wanita.html",
}


def crawl_category(page, start_url: str) -> list[dict]:
    links_by_url = {}
    url = start_url
    while url:
        page.goto(url, wait_until="networkidle")
        html = page.content()
        for link in extract_product_links(html):
            links_by_url[link["url"]] = link["name"]
        url = get_next_page_url(html)
    return [{"url": u, "name": n} for u, n in links_by_url.items()]


def scrape_bike_catalog(output_path: str, partial_path: str, headless: bool = True) -> list[dict]:
    catalog = []
    seen_urls = set()
    if os.path.exists(partial_path):
        with open(partial_path, encoding="utf-8") as f:
            catalog = json.load(f)
        seen_urls = {c["url"] for c in catalog}
        print(f"[scrape_catalog] resuming, {len(catalog)} products already scraped")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        page = browser.new_page(user_agent=USER_AGENT)

        all_links = {}
        for label, path in SEPEDA_CATEGORIES.items():
            print(f"[scrape_catalog] crawling category: {label}")
            for link in crawl_category(page, BASE_URL + path):
                all_links[link["url"]] = link["name"]
        print(f"[scrape_catalog] found {len(all_links)} unique product URLs")

        for i, url in enumerate(all_links):
            if url in seen_urls:
                continue
            print(f"[scrape_catalog] ({i + 1}/{len(all_links)}) {url}")
            page.goto(url, wait_until="networkidle")
            tab = page.query_selector("#tab-label-additional-title")
            if tab:
                tab.click()
                page.wait_for_timeout(400)
            html = page.content()
            detail = extract_product_detail(html, url)
            catalog.append(detail)
            seen_urls.add(url)
            with open(partial_path, "w", encoding="utf-8") as f:
                json.dump(catalog, f, ensure_ascii=False, indent=2)
            page.wait_for_timeout(REQUEST_DELAY_MS)

        browser.close()

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    return catalog
```

- [ ] **Step 2: Smoke-test against one category (manual, real network)**

Run this one-off script to confirm Playwright gets past the Akamai block and the selectors hold up on a live page, without committing to a full 10-category crawl yet:

```bash
python -c "
from playwright.sync_api import sync_playwright
from pipeline.scrape_catalog import crawl_category, extract_product_detail, BASE_URL

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    links = crawl_category(page, BASE_URL + '/id/sepeda/sepeda-bmx.html')
    print('found', len(links), 'links')
    page.goto(links[0]['url'], wait_until='networkidle')
    tab = page.query_selector('#tab-label-additional-title')
    if tab:
        tab.click()
        page.wait_for_timeout(400)
    detail = extract_product_detail(page.content(), links[0]['url'])
    print(detail['name'], detail['price'], len(detail['images']), 'images')
    browser.close()
"
```
Expected: prints a link count > 0, then a product name, a price, and an image count > 0 — no `403`/`Access Denied` output and no exceptions. If it fails with a timeout or block, stop and re-inspect the page manually before continuing (see Task 8's troubleshooting note).

- [ ] **Step 3: Commit**

```bash
git add pipeline/scrape_catalog.py
git commit -m "feat: crawl rodalink.com bike categories via Playwright"
```

---

### Task 6: Fuzzy-match outlet products to catalog entries

**Files:**
- Create: `pipeline/match_catalog.py`
- Test: `tests/test_match_catalog.py`

**Interfaces:**
- Consumes: grouped products shaped like `group_rows`'s output (Task 3); catalog entries shaped like `extract_product_detail`'s output (Task 4).
- Produces: `match_products(grouped: list[dict], catalog: list[dict], overrides: dict | None = None, threshold: int = 55) -> tuple[list[dict], list[dict]]`. Returns `(matches, unmatched)` where each item in `matches` is `{**grouped_product, "catalog": catalog_entry, "match_score": int}` and `unmatched` is the untouched grouped products that found no confident match. `overrides` maps `"{brand}|{model_name}|{color_code}"` to either a catalog `url` string (force that match) or `None` (force unmatched, skip fuzzy matching entirely).

- [ ] **Step 1: Write the failing tests**

`tests/test_match_catalog.py`:
```python
from pipeline.match_catalog import match_products

CATALOG = [
    {"url": "https://www.rodalink.com/id/polygon-strattos-7-503769.html",
     "name": "Polygon Sepeda Balap Strattos 7", "brand": "Polygon",
     "price": 25000000, "colors": ["Black"], "sizes": ["S", "M"],
     "images": ["https://media.rodalink.com/x.jpg"], "specs": {}},
    {"url": "https://www.rodalink.com/id/polygon-cascade-5-503443.html",
     "name": "Polygon Sepeda Gunung Cascade 5", "brand": "Polygon",
     "price": 6300000, "colors": ["Navy"], "sizes": ["S", "M", "L"],
     "images": ["https://media.rodalink.com/y.jpg"], "specs": {}},
]

GROUPED = [
    {"brand": "POLYGON", "model_name": "STRATTOS 7 BLK FA 700", "color_code": "B",
     "category": "BIKE-ROAD DROP BAR", "price": 25000000,
     "sizes": [{"size_code": "S1", "article_code": 1, "quantity": 1, "price": 25000000}]},
    {"brand": "WIM CYCLE", "model_name": "ELENA MEOW 16 FA", "color_code": "P",
     "category": "BIKE-KIDS 16-18\"", "price": None,
     "sizes": [{"size_code": "09B", "article_code": 2, "quantity": 9, "price": None}]},
]


def test_match_products_finds_confident_match():
    matches, unmatched = match_products(GROUPED, CATALOG)
    assert len(matches) == 1
    assert matches[0]["model_name"] == "STRATTOS 7 BLK FA 700"
    assert matches[0]["catalog"]["url"] == "https://www.rodalink.com/id/polygon-strattos-7-503769.html"
    assert matches[0]["match_score"] >= 55


def test_match_products_leaves_no_candidate_unmatched():
    matches, unmatched = match_products(GROUPED, CATALOG)
    assert len(unmatched) == 1
    assert unmatched[0]["model_name"] == "ELENA MEOW 16 FA"


def test_match_products_respects_override_url():
    overrides = {"POLYGON|STRATTOS 7 BLK FA 700|B": "https://www.rodalink.com/id/polygon-cascade-5-503443.html"}
    matches, unmatched = match_products(GROUPED, CATALOG, overrides=overrides)
    strattos_match = next(m for m in matches if m["model_name"] == "STRATTOS 7 BLK FA 700")
    assert strattos_match["catalog"]["url"] == "https://www.rodalink.com/id/polygon-cascade-5-503443.html"
    assert strattos_match["match_score"] == 100


def test_match_products_respects_override_null_forces_unmatched():
    overrides = {"POLYGON|STRATTOS 7 BLK FA 700|B": None}
    matches, unmatched = match_products(GROUPED, CATALOG, overrides=overrides)
    assert not any(m["model_name"] == "STRATTOS 7 BLK FA 700" for m in matches)
    assert any(u["model_name"] == "STRATTOS 7 BLK FA 700" for u in unmatched)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_match_catalog.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.match_catalog'`

- [ ] **Step 3: Implement**

`pipeline/match_catalog.py`:
```python
import re
from rapidfuzz import fuzz

GENERIC_WORDS = {
    "sepeda", "bike", "gunung", "balap", "elektrik", "hybrid", "perkotaan",
    "city", "gravel", "touring", "road", "mtb", "bmx", "lipat", "anak",
    "wanita", "ebike",
}


def _normalize(text: str, brand: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9 ]", " ", text)
    words = [w for w in text.split() if w != brand.lower() and w not in GENERIC_WORDS]
    return " ".join(words)


def match_products(grouped, catalog, overrides=None, threshold=55):
    overrides = overrides or {}
    catalog_by_url = {c["url"]: c for c in catalog}
    catalog_by_brand: dict[str, list[dict]] = {}
    for c in catalog:
        catalog_by_brand.setdefault(c["brand"].lower(), []).append(c)

    matches, unmatched = [], []
    for product in grouped:
        key = f'{product["brand"]}|{product["model_name"]}|{product["color_code"]}'
        if key in overrides:
            override_url = overrides[key]
            if override_url is None:
                unmatched.append(product)
                continue
            catalog_entry = catalog_by_url.get(override_url)
            if catalog_entry:
                matches.append({**product, "catalog": catalog_entry, "match_score": 100})
                continue

        candidates = catalog_by_brand.get(product["brand"].lower(), [])
        target = _normalize(product["model_name"], product["brand"])
        best_entry, best_score = None, 0
        for c in candidates:
            score = fuzz.token_sort_ratio(target, _normalize(c["name"], product["brand"]))
            if score > best_score:
                best_entry, best_score = c, score

        if best_entry and best_score >= threshold:
            matches.append({**product, "catalog": best_entry, "match_score": round(best_score)})
        else:
            unmatched.append(product)

    return matches, unmatched
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_match_catalog.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add pipeline/match_catalog.py tests/test_match_catalog.py
git commit -m "feat: fuzzy-match outlet products to scraped catalog"
```

---

### Task 7: Merge into the final dataset + CLI orchestrator

**Files:**
- Create: `pipeline/build_dataset.py`
- Test: `tests/test_build_dataset.py`

**Interfaces:**
- Consumes: `load_bike_rows` (Task 2), `group_rows` (Task 3), `scrape_bike_catalog` (Task 5), `match_products` (Task 6).
- Produces: `merge_product(matched: dict) -> dict` and `merge_unmatched(product: dict) -> dict`, both returning the final product schema: `{"id": str, "brand": str, "model_name": str, "category": str, "price": int | None, "sizes": [...], "colors": [str], "images": [str], "specs": {str: str}, "matched": bool}`. `build(xlsx_path, catalog_path, overrides_path, output_path)` is the CLI entry point that writes `data/products.json`.

- [ ] **Step 1: Write the failing tests**

`tests/test_build_dataset.py`:
```python
from pipeline.build_dataset import merge_product, merge_unmatched, make_id


def test_make_id_is_slug():
    assert make_id("POLYGON", "STRATTOS 7 BLK FA 700", "B") == "polygon-strattos-7-blk-fa-700-b"


def test_merge_product_combines_grouped_and_catalog_fields():
    matched = {
        "brand": "POLYGON", "model_name": "STRATTOS 7 BLK FA 700", "color_code": "B",
        "category": "BIKE-ROAD DROP BAR", "price": 25000000,
        "sizes": [{"size_code": "S1", "article_code": 1, "quantity": 1, "price": 25000000}],
        "catalog": {
            "url": "https://www.rodalink.com/id/polygon-strattos-7-503769.html",
            "name": "Polygon Sepeda Balap Strattos 7", "brand": "Polygon",
            "price": 25000000, "colors": ["Black"], "sizes": ["S", "M"],
            "images": ["https://media.rodalink.com/x.jpg"],
            "specs": {"Frame": "CARBON ENDURANCE"},
        },
        "match_score": 90,
    }

    result = merge_product(matched)

    assert result["id"] == "polygon-strattos-7-blk-fa-700-b"
    assert result["brand"] == "POLYGON"
    assert result["category"] == "BIKE-ROAD DROP BAR"
    assert result["price"] == 25000000
    assert result["colors"] == ["Black"]
    assert result["images"] == ["https://media.rodalink.com/x.jpg"]
    assert result["specs"] == {"Frame": "CARBON ENDURANCE"}
    assert result["matched"] is True


def test_merge_unmatched_has_empty_photo_fields():
    product = {
        "brand": "WIM CYCLE", "model_name": "ELENA MEOW 16 FA", "color_code": "P",
        "category": "BIKE-KIDS 16-18\"", "price": None,
        "sizes": [{"size_code": "09B", "article_code": 2, "quantity": 9, "price": None}],
    }

    result = merge_unmatched(product)

    assert result["id"] == "wim-cycle-elena-meow-16-fa-p"
    assert result["images"] == []
    assert result["colors"] == []
    assert result["specs"] == {}
    assert result["matched"] is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_build_dataset.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.build_dataset'`

- [ ] **Step 3: Implement**

`pipeline/build_dataset.py`:
```python
import argparse
import json
import re

from pipeline.parse_stock import load_bike_rows
from pipeline.group_products import group_rows
from pipeline.match_catalog import match_products
from pipeline.scrape_catalog import scrape_bike_catalog


def make_id(brand: str, model_name: str, color_code: str) -> str:
    raw = f"{brand}-{model_name}-{color_code}".lower()
    raw = re.sub(r"[^a-z0-9]+", "-", raw)
    return raw.strip("-")


def merge_product(matched: dict) -> dict:
    catalog = matched["catalog"]
    return {
        "id": make_id(matched["brand"], matched["model_name"], matched["color_code"]),
        "brand": matched["brand"],
        "model_name": matched["model_name"],
        "category": matched["category"],
        "price": matched["price"],
        "sizes": matched["sizes"],
        "colors": catalog["colors"],
        "images": catalog["images"],
        "specs": catalog["specs"],
        "matched": True,
    }


def merge_unmatched(product: dict) -> dict:
    return {
        "id": make_id(product["brand"], product["model_name"], product["color_code"]),
        "brand": product["brand"],
        "model_name": product["model_name"],
        "category": product["category"],
        "price": product["price"],
        "sizes": product["sizes"],
        "colors": [],
        "images": [],
        "specs": {},
        "matched": False,
    }


def build(xlsx_path: str, catalog_partial_path: str, catalog_output_path: str,
          overrides_path: str, output_path: str, headless: bool = True) -> None:
    rows = load_bike_rows(xlsx_path)
    grouped = group_rows(rows)
    print(f"[build_dataset] {len(rows)} SKU rows grouped into {len(grouped)} products")

    catalog = scrape_bike_catalog(catalog_output_path, catalog_partial_path, headless=headless)
    print(f"[build_dataset] scraped {len(catalog)} catalog products")

    with open(overrides_path, encoding="utf-8") as f:
        overrides = json.load(f)

    matched, unmatched = match_products(grouped, catalog, overrides=overrides)
    print(f"[build_dataset] matched {len(matched)}, unmatched {len(unmatched)}")

    products = [merge_product(m) for m in matched] + [merge_unmatched(u) for u in unmatched]
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print(f"[build_dataset] wrote {len(products)} products to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", required=True)
    parser.add_argument("--catalog-partial", default="data/catalog_partial.json")
    parser.add_argument("--catalog-output", default="data/catalog.json")
    parser.add_argument("--overrides", default="data/catalog_overrides.json")
    parser.add_argument("--output", default="data/products.json")
    parser.add_argument("--headed", action="store_true", help="run the browser with a visible window")
    args = parser.parse_args()
    build(args.xlsx, args.catalog_partial, args.catalog_output, args.overrides,
          args.output, headless=not args.headed)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_build_dataset.py -v`
Expected: 4 passed

- [ ] **Step 5: Run the full test suite**

Run: `pytest -v`
Expected: all tests across every task pass (20 tests total).

- [ ] **Step 6: Commit**

```bash
git add pipeline/build_dataset.py tests/test_build_dataset.py
git commit -m "feat: merge matched/unmatched products into final dataset"
```

---

### Task 8: Run the pipeline for real and review matches

This is a manual, non-code task — its deliverable is a reviewed `data/products.json` committed to the repo, not new source files.

- [ ] **Step 1: Run the full build**

```bash
python -m pipeline.build_dataset --xlsx "Outlet I311 Stock 25-Jul-2026 12_55_24.xlsx"
```
Expected: prints progress per category and per product, finishes with a "wrote N products to data/products.json" line. This will take a while (roughly 150-250 product pages at ~1-1.5s each plus category crawls) — that's expected, not a bug.

If it fails partway with a network error or a page that looks blocked, it's safe to re-run: `scrape_bike_catalog` resumes from `data/catalog_partial.json` and skips URLs it already has.

- [ ] **Step 2: Sanity-check the match rate**

```bash
python -c "
import json
products = json.load(open('data/products.json', encoding='utf-8'))
matched = [p for p in products if p['matched']]
print(f'{len(matched)}/{len(products)} matched')
for p in products[:5]:
    print(p['matched'], p['brand'], p['model_name'], '->', p.get('images', [])[:1])
"
```
Look through a sample of `matched: true` entries and confirm the attached photo actually looks like the right bike (spot-check by opening a couple of image URLs in a browser). Note any wrong matches.

- [ ] **Step 3: Fix wrong matches via overrides**

For any wrong or missing match found in Step 2, edit `data/catalog_overrides.json` — key is `"{BRAND}|{model_name as it appears in the xlsx}|{color_code}"`, value is either the correct catalog URL (find it by browsing rodalink.com) or `null` to force it to stay unmatched. Example:
```json
{
  "POLYGON|STRATTOS 7 BLK FA 700|B": "https://www.rodalink.com/id/polygon-sepeda-balap-strattos-7-503769.html"
}
```
Re-run Step 1 (it reuses the cached `data/catalog_partial.json`, so this is fast) and re-check.

- [ ] **Step 4: Commit the generated dataset**

```bash
git add data/products.json data/catalog.json data/catalog_overrides.json
git commit -m "data: generate outlet bike products dataset from xlsx + rodalink.com scrape"
```

---

## Self-Review Notes

- Every spec requirement is covered: xlsx parsing (Task 2), model+color grouping (Task 3), full-gallery scraping via a real browser to get past the confirmed Akamai block (Tasks 4-5), fuzzy matching with manual-override support for unmatched/wrong items (Task 6), and the final static `data/products.json` (Task 7-8).
- `merge_unmatched`/`"matched": false` guarantees unmatched products stay in the output with empty photo fields rather than being dropped, per the spec's placeholder requirement.
- Type/shape consistency check: `group_rows` output keys (`brand`, `model_name`, `color_code`, `category`, `price`, `sizes`) match exactly what `match_catalog.match_products` and `build_dataset.merge_product`/`merge_unmatched` read.
