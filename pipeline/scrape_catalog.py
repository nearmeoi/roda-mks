import json
import os
import re
from bs4 import BeautifulSoup
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
