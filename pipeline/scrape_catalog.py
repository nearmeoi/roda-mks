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

PAA_CATEGORIES = {
    # Frame & Fork
    "Frame Sepeda": "/id/frame-fork/frame-sepeda.html",
    "Fork": "/id/frame-fork/fork.html",
    "Drop Out": "/id/frame-fork/drop-out.html",
    "Linkage": "/id/frame-fork/linkage.html",
    "Spare Part Frame Lain": "/id/frame-fork/spare-part-lain.html",
    # Spare Part
    "Bar End": "/id/spare-part/bar-end.html",
    "Bar Tape": "/id/spare-part/bar-tape.html",
    "Handle Grip": "/id/spare-part/handle-grip.html",
    "Handle Stem": "/id/spare-part/handle-stem.html",
    "Handlebar": "/id/spare-part/handlebar.html",
    "Headset": "/id/spare-part/headset.html",
    "Rear Shock": "/id/spare-part/rear-shock.html",
    "Bottom Bracket": "/id/spare-part/bottom-bracket.html",
    "Chainring": "/id/spare-part/chainring.html",
    "Rantai": "/id/spare-part/rantai.html",
    "Crank Set": "/id/spare-part/crank-set.html",
    "Cassette": "/id/spare-part/cassette.html",
    "Front Derailleur": "/id/spare-part/front-derailleur.html",
    "Rear Derailleur": "/id/spare-part/rear-derailleur.html",
    "Shifter": "/id/spare-part/shifter.html",
    "Brake": "/id/spare-part/brake.html",
    "Brake Lever": "/id/spare-part/brake-lever.html",
    "Brake Cable": "/id/spare-part/brake-cable.html",
    "Brake Pad": "/id/spare-part/brake-pad.html",
    "Rotor": "/id/spare-part/rotor.html",
    "Hub": "/id/spare-part/hub.html",
    "Jari-Jari": "/id/spare-part/jari-jari.html",
    "Pelek": "/id/spare-part/pelek.html",
    "Wheel Set": "/id/spare-part/wheel-set.html",
    "Saddle": "/id/spare-part/saddle.html",
    "Seat Post": "/id/spare-part/seat-post.html",
    "Seat Clamp": "/id/spare-part/seat-clamp.html",
    "Pedal": "/id/spare-part/pedal.html",
    "Quick Release": "/id/spare-part/quick-release.html",
    "Thru Axle": "/id/spare-part/thru-axle.html",
    "Ban": "/id/spare-part/ban.html",
    "Tube (Ban Dalam)": "/id/spare-part/tube-ban-dalam.html",
    "Valve": "/id/spare-part/valve.html",
    "Tubeless Kit": "/id/spare-part/tubeless-kit.html",
    "Spare Part Lainnya": "/id/spare-part/spare-part-lainnya.html",
    # Apparel
    "Jersey": "/id/apparel/jersey.html",
    "Celana": "/id/apparel/celana.html",
    "Jaket": "/id/apparel/jaket.html",
    "Kaos": "/id/apparel/kaos.html",
    "Helm": "/id/apparel/helm.html",
    "Sarung Tangan": "/id/apparel/sarung-tangan.html",
    "Sepatu": "/id/apparel/sepatu.html",
    "Kacamata": "/id/apparel/kacamata.html",
    "Sock": "/id/apparel/sock.html",
    "Apparel Lainnya": "/id/apparel/apparel-lainnya.html",
    # Aksesoris & Spare Part
    "Cyclo Computer": "/id/aksesoris-spare-part/cyclo-computer.html",
    "Carrier": "/id/aksesoris-spare-part/carrier.html",
    "Child Seat": "/id/aksesoris-spare-part/baby-carrier.html",
    "Bike Rack": "/id/aksesoris-spare-part/bike-rack.html",
    "Botol Minum": "/id/aksesoris-spare-part/botol-minum.html",
    "Cage Botol Minum": "/id/aksesoris-spare-part/cage-botol-minum.html",
    "Tas": "/id/aksesoris-spare-part/tas.html",
    "Tools Sepeda": "/id/aksesoris-spare-part/tools-sepeda.html",
    "Stand Sepeda": "/id/aksesoris-spare-part/stand-sepeda.html",
    "Pompa": "/id/aksesoris-spare-part/pompa.html",
    "Kunci Sepeda": "/id/aksesoris-spare-part/kunci-sepeda.html",
    "Fender/Spakbor": "/id/aksesoris-spare-part/fender-spakbor.html",
    "Lampu Sepeda": "/id/aksesoris-spare-part/lampu-sepeda.html",
    "Bel Sepeda": "/id/aksesoris-spare-part/bel-sepeda.html",
    "Keranjang Sepeda": "/id/aksesoris-spare-part/keranjang-sepeda.html",
    "Peralatan Touring": "/id/aksesoris-spare-part/peralatan-touring.html",
    "Aksesoris Lainnya": "/id/aksesoris-spare-part/aksesoris-lainnya.html",
    # Supplemen
    "Supplemen": "/id/supplement.html",
}

ALL_CATEGORIES = {**SEPEDA_CATEGORIES, **PAA_CATEGORIES}


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
    try:
        filename = src.rsplit("/", 1)[-1]
        bucket1, bucket2 = filename[0], filename[1]
        base = re.match(r"^(https?://[^/]+)", src).group(1)
        return f"{base}/catalog/product/{bucket1}/{bucket2}/{filename}"
    except Exception:
        return src


def extract_product_detail(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    name_el = soup.select_one("h1")
    name = name_el.get_text(strip=True) if name_el else ""

    price = None
    price_el = soup.select_one("#price-block .price, .price-wrapper .price, .price-box .price, .special-price .price")
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

    # Rich Spec Extraction
    specs = {}
    spec_table = soup.select_one("#product-attribute-specs-table")
    if spec_table:
        for row in spec_table.select("tr"):
            th = row.select_one("th")
            td = row.select_one("td")
            if th and td:
                k = th.get_text(strip=True)
                v = td.get_text(strip=True)
                if k and v and k != v:
                    specs[k] = v

    for row in soup.select(".spec-row, .product-spec-item"):
        label_el = row.select_one(".spec-label, .label")
        value_el = row.select_one(".spec-value, .value")
        if label_el and value_el:
            k = label_el.get_text(strip=True)
            v = value_el.get_text(strip=True)
            if k and v:
                specs[k] = v

    desc = soup.select_one(".product.attribute.description .value")
    if desc:
        bullets = desc.select("li")
        for bullet in bullets:
            text = bullet.get_text(strip=True)
            if ":" in text and len(text) > 5:
                parts = text.split(":", 1)
                k = parts[0].strip()
                if k not in specs:
                    specs[k] = parts[1].strip()[:200]

    # SpConfig Color fallback
    if not colors:
        for key in ['"spConfig":', '"jsonConfig":']:
            idx = html.find(key)
            if idx != -1:
                brace_idx = html.find("{", idx)
                if brace_idx != -1:
                    brace_count = 0
                    end_idx = -1
                    for i in range(brace_idx, len(html)):
                        if html[i] == "{":
                            brace_count += 1
                        elif html[i] == "}":
                            brace_count -= 1
                            if brace_count == 0:
                                end_idx = i
                                break
                    if end_idx != -1:
                        try:
                            config = json.loads(html[brace_idx:end_idx+1])
                            attributes = config.get("attributes", {})
                            for attr_id, attr_data in attributes.items():
                                code = attr_data.get("code", "").lower()
                                if code in ["color", "warna", "warna_sepeda"]:
                                    opts = [opt.get("label") for opt in attr_data.get("options", []) if opt.get("label")]
                                    if opts:
                                        colors = opts
                                        break
                        except Exception:
                            pass

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
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            html = page.content()
            for link in extract_product_links(html):
                links_by_url[link["url"]] = link["name"]
            url = get_next_page_url(html)
        except Exception as e:
            print(f"  [crawl_category error] {url}: {e}")
            break
    return [{"url": u, "name": n} for u, n in links_by_url.items()]


def scrape_catalog(output_path: str, partial_path: str, headless: bool = False,
                    categories: dict = ALL_CATEGORIES) -> list[dict]:
    catalog = []
    seen_urls = set()
    if os.path.exists(partial_path):
        try:
            with open(partial_path, encoding="utf-8") as f:
                catalog = json.load(f)
            seen_urls = {c["url"] for c in catalog}
            print(f"[scrape_catalog] Resuming: {len(catalog)} products already scraped in partial file")
        except Exception as e:
            print(f"[scrape_catalog] Warning loading partial path: {e}")

    urls_to_scrape = []
    product_urls_file = os.path.join(os.path.dirname(output_path), "catalog_product_urls.json")
    if os.path.exists(product_urls_file):
        with open(product_urls_file, encoding="utf-8") as f:
            urls_to_scrape = json.load(f)
        print(f"[scrape_catalog] Pre-loaded {len(urls_to_scrape)} product URLs from {product_urls_file}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1280, "height": 800},
            locale="id-ID"
        )
        page = context.new_page()

        if not urls_to_scrape:
            print("[scrape_catalog] No pre-loaded URLs found. Crawling category listing pages...")
            all_links = {}
            for label, path in categories.items():
                print(f"[scrape_catalog] Crawling category: {label}")
                for link in crawl_category(page, BASE_URL + path):
                    all_links[link["url"]] = link["name"]
            urls_to_scrape = list(all_links.keys())
            with open(product_urls_file, "w", encoding="utf-8") as f:
                json.dump(urls_to_scrape, f, ensure_ascii=False, indent=2)
            print(f"[scrape_catalog] Found and saved {len(urls_to_scrape)} unique product URLs to {product_urls_file}")

        total_urls = len(urls_to_scrape)
        for i, url in enumerate(urls_to_scrape):
            if url in seen_urls:
                continue
            print(f"[scrape_catalog] ({i + 1}/{total_urls}) {url}")
            try:
                res = page.goto(url, wait_until="domcontentloaded", timeout=20000)
                if res and res.status == 200:
                    tab = page.query_selector("#tab-label-additional-title")
                    if tab:
                        try:
                            tab.click()
                            page.wait_for_timeout(300)
                        except Exception:
                            pass
                    html = page.content()
                    detail = extract_product_detail(html, url)
                    catalog.append(detail)
                    seen_urls.add(url)
                    
                    # Incremental save
                    with open(partial_path, "w", encoding="utf-8") as f:
                        json.dump(catalog, f, ensure_ascii=False, indent=2)
                    
                    scraped_file = os.path.join(os.path.dirname(output_path), "catalog_scraped.json")
                    with open(scraped_file, "w", encoding="utf-8") as f:
                        json.dump(catalog, f, ensure_ascii=False, indent=2)
                else:
                    status_code = res.status if res else 'No Response'
                    print(f"  [!] Non-200 status ({status_code}) for {url}")
            except Exception as exc:
                print(f"  [!] Failed to scrape {url}: {exc}")

            page.wait_for_timeout(REQUEST_DELAY_MS)

        browser.close()

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    return catalog


if __name__ == "__main__":
    output_p = os.path.join("data", "catalog.json")
    partial_p = os.path.join("data", "catalog_partial.json")
    scrape_catalog(output_p, partial_p, headless=False)

