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


def scrape_catalog(output_path: str, partial_path: str, headless: bool = True,
                    categories: dict = ALL_CATEGORIES) -> list[dict]:
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
        for label, path in categories.items():
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
