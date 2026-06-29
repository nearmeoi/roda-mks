"""
Rodalink Product Scraper v2
============================
Scrapes all products (Bikes, Parts, Accessories, Apparel) from rodalink.com
Extracts: product name, category, sub-category, price, special price, specs, URL
Outputs: CSV and JSON files

Usage: python scraper.py
"""

import requests
from bs4 import BeautifulSoup
import csv
import json
import time
import re
import os
import math
import sys
from datetime import datetime
import concurrent.futures

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ============================================================
# CONFIGURATION
# ============================================================

BASE_URL = "https://www.rodalink.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
}

REQUEST_DELAY = 1.0  # seconds between requests
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
ITEMS_PER_PAGE = 36
SCRAPE_DETAILS = True  # Set False to only scrape listings (faster)

# ============================================================
# ALL CATEGORIES TO SCRAPE
# ============================================================

CATEGORIES = {
    # === SEPEDA (BIKES) ===
    "Sepeda": {
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
    },
    # === FRAME & FORK ===
    "Frame & Fork": {
        "Frame Sepeda": "/id/frame-fork/frame-sepeda.html",
        "Fork": "/id/frame-fork/fork.html",
        "Drop Out": "/id/frame-fork/drop-out.html",
        "Linkage": "/id/frame-fork/linkage.html",
        "Spare Part Frame Lain": "/id/frame-fork/spare-part-lain.html",
    },
    # === SPARE PART ===
    "Spare Part": {
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
        "Crank": "/id/spare-part/crank.html",
        "Front Derailleur": "/id/spare-part/front-derailleur.html",
        "Rear Derailleur": "/id/spare-part/rear-derailleur.html",
        "Kabel": "/id/spare-part/kabel.html",
        "Shifter": "/id/spare-part/shifter.html",
        "Sprocket": "/id/spare-part/sprocket.html",
        "Rem": "/id/spare-part/rem.html",
        "Handle Rem": "/id/spare-part/handle-rem.html",
        "Pad & Kampas Rem": "/id/spare-part/pad-kampas-rem.html",
        "Rotor": "/id/spare-part/rotor.html",
        "Footstep": "/id/spare-part/footstep.html",
        "Sadel": "/id/spare-part/saddle.html",
        "Seat Clamp": "/id/spare-part/seat-clamp.html",
        "Seat Post": "/id/spare-part/seat-post.html",
        "Pedal": "/id/spare-part/pedal.html",
        "Groupset": "/id/spare-part/groupset.html",
    },
    # === WHEELS & TIRES ===
    "Wheels & Tires": {
        "Wheel Set": "/id/wheels-tires/wheel-set.html",
        "Ban": "/id/wheels-tires/ban.html",
        "Ban Dalam": "/id/wheels-tires/ban-dalam.html",
        "Rim": "/id/wheels-tires/rim.html",
        "Rim Tape": "/id/wheels-tires/rim-tape.html",
        "Hub Depan": "/id/wheels-tires/hub-depan.html",
        "Hub Belakang": "/id/wheels-tires/hub-belakang.html",
        "Quick Release": "/id/wheels-tires/quick-release.html",
        "Spoke & Nipple": "/id/wheels-tires/spoke-nipple.html",
    },
    # === APPAREL ===
    "Apparel": {
        "Arm Sleeve": "/id/apparel/arm-sleeve.html",
        "Jersey": "/id/apparel/jersey.html",
        "Kaos": "/id/apparel/kaos.html",
        "Celana": "/id/apparel/celana.html",
        "Kacamata": "/id/apparel/kacamata.html",
        "Sarung Tangan / Gloves": "/id/apparel/sarung-tangan-gloves.html",
        "Topi": "/id/apparel/topi.html",
        "Leg Sleeve": "/id/apparel/leg-sleeve.html",
        "Kaos Kaki": "/id/apparel/kaos-kaki.html",
    },
    # === PROTECTION ===
    "Protection": {
        "Helm Sepeda": "/id/protection/helm-sepeda.html",
        "Body Protector": "/id/protection/body-protector.html",
        "Reflector": "/id/protection/reflector.html",
    },
    # === FOOTWEAR ===
    "Footwear": {
        "Sepatu": "/id/footwear/sepatu.html",
        "Cleat Sepatu": "/id/footwear/cleat-sepatu.html",
        "Aksesoris Sepatu": "/id/footwear/aksesoris-sepatu.html",
    },
    # === TRAINING ===
    "Training": {
        "Turbo Trainer": "/id/training/turbo-trainer.html",
        "Roller": "/id/training/roller.html",
        "Aksesoris & Spare Part Training": "/id/training/aksesoris-spare-part.html",
    },
    # === PERAWATAN SEPEDA ===
    "Perawatan Sepeda": {
        "Sealant Ban": "/id/perawatan-sepeda/sealant-ban.html",
        "Minyak Rem": "/id/perawatan-sepeda/minyak-rem.html",
        "Pelumas Rantai": "/id/perawatan-sepeda/pembersih-rantai.html",
        "Pembersih": "/id/perawatan-sepeda/pembersih.html",
        "Degreaser": "/id/perawatan-sepeda/degreaser.html",
        "Suspension Care": "/id/perawatan-sepeda/suspension-care.html",
        "Grease / Pelumas": "/id/perawatan-sepeda/grease-pelumas.html",
        "Lain-lain": "/id/perawatan-sepeda/lain-lain.html",
    },
    # === AKSESORIS & SPARE PART ===
    "Aksesoris & Spare Part": {
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
        "Roof Box": "/id/aksesoris-spare-part/roof-box.html",
        "Roof Rack Kit & Wingbar": "/id/aksesoris-spare-part/roof-rack-kit-wingbar.html",
    },
    # === SUPPLEMEN ===
    "Supplemen": {
        "Supplemen": "/id/supplement.html",
    },
}


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def log(msg):
    """Print with flush for real-time output."""
    print(msg, flush=True)


def fetch_page(url, retries=3):
    """Fetch a page with retry logic and rate limiting."""
    for attempt in range(retries):
        try:
            time.sleep(REQUEST_DELAY)
            response = requests.get(url, headers=HEADERS, timeout=30)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            log(f"  [!] Attempt {attempt + 1}/{retries} failed for {url}: {e}")
            if attempt < retries - 1:
                time.sleep(3 * (attempt + 1))
    log(f"  [X] Failed to fetch: {url}")
    return None


def clean_price(price_text):
    """Extract numeric price from text like 'Rp 60.000.000'"""
    if not price_text:
        return ""
    cleaned = re.sub(r'[^\d]', '', price_text)
    return cleaned if cleaned else ""


def format_price(price_str):
    """Format price string for display: '60000000' -> 'Rp 60.000.000'"""
    if not price_str:
        return ""
    try:
        n = int(price_str)
        return f"Rp {n:,.0f}".replace(",", ".")
    except ValueError:
        return price_str


def get_total_pages(soup):
    """Get total number of pages from pagination."""
    # Method 1: look for "Total X items"
    toolbar = soup.select_one('.toolbar-amount')
    if toolbar:
        text = toolbar.get_text()
        match = re.search(r'(\d+)', text.replace('.', ''))
        if match:
            total = int(match.group(1))
            return math.ceil(total / ITEMS_PER_PAGE), total
    
    # Method 2: look in page text
    all_text = soup.get_text()
    match = re.search(r'Total\s+(\d+)\s+items?', all_text)
    if match:
        total = int(match.group(1))
        return math.ceil(total / ITEMS_PER_PAGE), total
    
    # Method 3: find max page number in pagination
    max_page = 1
    for a in soup.select('a'):
        href = a.get('href', '')
        m = re.search(r'[?&]p=(\d+)', href)
        if m:
            max_page = max(max_page, int(m.group(1)))
    
    return max_page, max_page * ITEMS_PER_PAGE


def extract_products_from_listing(soup, category, sub_category):
    """Extract product basic info from category listing page."""
    products = []
    items = soup.select('li.product-item')
    
    for item in items:
        product = {
            "category": category,
            "sub_category": sub_category,
            "name": "",
            "url": "",
            "price": "",
            "special_price": "",
            "discount": "",
            "specs": "",
            "description_summary": "",
        }
        
        # Product name and URL
        name_link = item.select_one('a.product-item-link')
        if name_link:
            product["name"] = name_link.get_text(strip=True)
            product["url"] = name_link.get('href', '')
        
        if not product["name"]:
            continue
        
        # Price extraction from the price-box
        price_box = item.select_one('.price-box')
        if price_box:
            old_price = price_box.select_one('.old-price .price')
            special_price = price_box.select_one('.special-price .price')
            
            if old_price and special_price:
                # Has discount
                product["price"] = clean_price(old_price.get_text(strip=True))
                product["special_price"] = clean_price(special_price.get_text(strip=True))
            else:
                # Regular price - get first .price that looks like Rp
                all_prices = price_box.select('.price')
                for p in all_prices:
                    text = p.get_text(strip=True)
                    if 'Rp' in text:
                        product["price"] = clean_price(text)
                        break
        
        if product["name"] and product["url"]:
            products.append(product)
    
    return products


def extract_product_detail(html):
    """Extract detailed specs from product detail page."""
    if not html:
        return {}
    
    soup = BeautifulSoup(html, 'html.parser')
    details = {
        "price": "",
        "special_price": "",
        "description_summary": "",
        "specs": "",
    }
    
    # ---- PRICES ----
    price_box = soup.select_one('.product-info-price')
    if price_box:
        old_price = price_box.select_one('.old-price .price')
        special_price = price_box.select_one('.special-price .price')
        
        if old_price and special_price:
            details["price"] = clean_price(old_price.get_text(strip=True))
            details["special_price"] = clean_price(special_price.get_text(strip=True))
        else:
            all_prices = price_box.select('.price')
            for p in all_prices:
                text = p.get_text(strip=True)
                if 'Rp' in text:
                    details["price"] = clean_price(text)
                    break
    
    # ---- DESCRIPTION ----
    desc = soup.select_one('.product.attribute.description .value')
    if desc:
        details["description_summary"] = desc.get_text(separator=' ', strip=True)[:500]
    
    # ---- SPECS ----
    # Method 1: Formal spec table
    specs_dict = {}
    spec_table = soup.select_one('#product-attribute-specs-table')
    if spec_table:
        for row in spec_table.select('tr'):
            th = row.select_one('th')
            td = row.select_one('td')
            if th and td:
                key = th.get_text(strip=True)
                val = td.get_text(strip=True)
                if key and val and key != val:
                    specs_dict[key] = val
    
    # Method 2: Extract from description bullet points (common for bikes)
    if desc:
        bullets = desc.select('li')
        for bullet in bullets:
            text = bullet.get_text(strip=True)
            if ':' in text and len(text) > 5:
                parts = text.split(':', 1)
                specs_dict[parts[0].strip()] = parts[1].strip()[:200]
            elif len(text) > 5:
                # Add as feature
                if "Features" not in specs_dict:
                    specs_dict["Features"] = text[:200]
                else:
                    specs_dict["Features"] += " | " + text[:200]
    
    # Method 3: Look for structured specs in divs
    for div in soup.select('.product-spec-item, .spec-row'):
        label = div.select_one('.label, .spec-label')
        value = div.select_one('.value, .spec-value')
        if label and value:
            specs_dict[label.get_text(strip=True)] = value.get_text(strip=True)
    
    # Try to find variant colors (Magento swatches) from JSON config
    for key in ['"spConfig":', '"jsonConfig":']:
        start_idx = html.find(key)
        if start_idx != -1:
            start_idx += len(key)
            brace_idx = html.find('{', start_idx)
            if brace_idx != -1:
                brace_count = 0
                end_idx = -1
                for i in range(brace_idx, len(html)):
                    if html[i] == '{':
                        brace_count += 1
                    elif html[i] == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i
                            break
                if end_idx != -1:
                    json_str = html[brace_idx:end_idx+1]
                    try:
                        config = json.loads(json_str)
                        attributes = config.get('attributes', {})
                        for attr_id, attr_data in attributes.items():
                            label = attr_data.get('code', '').lower()
                            if label in ['color', 'warna', 'warna_sepeda']:
                                options = attr_data.get('options', [])
                                colors = [opt.get('label') for opt in options]
                                if colors and not any(k.lower() in ['color', 'warna'] for k in specs_dict.keys()):
                                    specs_dict['Color'] = " / ".join(colors)
                                break
                    except Exception:
                        pass
            
    if specs_dict:
        details["specs"] = json.dumps(specs_dict, ensure_ascii=False)
    
    return details


def scrape_category_listing(category, sub_category, path):
    """Scrape all products from a single sub-category listing."""
    log(f"\n>> {category} > {sub_category}")
    
    base_url = f"{BASE_URL}{path}"
    all_products = []
    seen_urls = set()
    
    # Fetch first page
    page_url = f"{base_url}?product_list_limit={ITEMS_PER_PAGE}"
    html = fetch_page(page_url)
    if not html:
        log(f"   [X] Could not fetch category page")
        return []
    
    soup = BeautifulSoup(html, 'html.parser')
    total_pages, total_items = get_total_pages(soup)
    log(f"   {total_items} items, {total_pages} page(s)")
    
    # Parse first page
    products = extract_products_from_listing(soup, category, sub_category)
    for p in products:
        if p["url"] not in seen_urls:
            seen_urls.add(p["url"])
            all_products.append(p)
    
    # Parse remaining pages
    for page in range(2, total_pages + 1):
        page_url = f"{base_url}?p={page}&product_list_limit={ITEMS_PER_PAGE}"
        html = fetch_page(page_url)
        if html:
            soup = BeautifulSoup(html, 'html.parser')
            products = extract_products_from_listing(soup, category, sub_category)
            new_count = 0
            for p in products:
                if p["url"] not in seen_urls:
                    seen_urls.add(p["url"])
                    all_products.append(p)
                    new_count += 1
            log(f"   Page {page}/{total_pages}: +{new_count} products")
    
    log(f"   => {len(all_products)} unique products")
    return all_products


def process_product(args):
    i, product = args
    if not product["url"] or product.get("specs"):
        return None
        
    html = fetch_page(product["url"])
    if html:
        details = extract_product_detail(html)
        if details.get("price"):
            product["price"] = details["price"]
        if details.get("special_price"):
            product["special_price"] = details["special_price"]
        if details.get("description_summary"):
            product["description_summary"] = details["description_summary"]
        if details.get("specs"):
            product["specs"] = details["specs"]
    return i

def scrape_product_details(products):
    """Scrape detailed specs for each product concurrently."""
    total = len(products)
    log(f"\n{'='*60}")
    log(f"PHASE 2: Scraping {total} product detail pages for specs (FAST MODE)...")
    log(f"{'='*60}")
    
    to_scrape = [(i, p) for i, p in enumerate(products) if p["url"] and not p.get("specs")]
    log(f"Items remaining to scrape: {len(to_scrape)}")
    
    if not to_scrape:
        return
        
    completed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        for result_index in executor.map(process_product, to_scrape):
            if result_index is not None:
                completed += 1
                if completed % 20 == 0 or completed == 1:
                    pct = (completed / len(to_scrape)) * 100
                    log(f"  [{completed}/{len(to_scrape)}] ({pct:.0f}%) Processed details...")
                
                if completed % 100 == 0:
                    save_results(products, partial=True)
                    log(f"  [SAVE] Progress saved ({completed}/{len(to_scrape)})")


def save_results(products, partial=False):
    """Save results to CSV and JSON files."""
    suffix = "_partial" if partial else ""
    
    # ---- CSV ----
    csv_path = os.path.join(OUTPUT_DIR, f"rodalink_products{suffix}.csv")
    fieldnames = [
        "category", "sub_category", "name", "price", "special_price",
        "discount", "description_summary", "specs", "url"
    ]
    
    try:
        with open(csv_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for product in products:
                row = {k: product.get(k, '') for k in fieldnames}
                writer.writerow(row)
        log(f"  CSV: {csv_path} ({len(products)} rows)")
    except PermissionError:
        log(f"  [!] CSV File is open/locked. Could not save {csv_path}")

    # ---- JSON ----
    json_path = os.path.join(OUTPUT_DIR, f"rodalink_products{suffix}.json")
    try:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(products, f, ensure_ascii=False, indent=2)
        log(f"  JSON: {json_path}")
    except PermissionError:
        log(f"  [!] JSON File is open/locked. Could not save {json_path}")
    
    return csv_path, json_path


def print_summary(products):
    """Print a summary of scraped products."""
    log(f"\n{'='*60}")
    log(f"SCRAPING SUMMARY")
    log(f"{'='*60}")
    
    cat_counts = {}
    for p in products:
        cat = p.get("category", "Unknown")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    
    for cat, count in sorted(cat_counts.items()):
        log(f"  {cat}: {count} products")
    
    log(f"\n  TOTAL: {len(products)} products")
    
    # Count products with specs
    with_specs = sum(1 for p in products if p.get("specs"))
    with_special = sum(1 for p in products if p.get("special_price"))
    log(f"  With specs: {with_specs}")
    log(f"  With special price: {with_special}")
    
    # Price statistics
    prices = []
    for p in products:
        price = p.get("special_price") or p.get("price")
        if price and price.isdigit():
            prices.append(int(price))
    
    if prices:
        log(f"\n  Price Range:")
        log(f"    Min: {format_price(str(min(prices)))}")
        log(f"    Max: {format_price(str(max(prices)))}")
        log(f"    Avg: {format_price(str(int(sum(prices)/len(prices))))}")
    
    log(f"{'='*60}")


# ============================================================
# MAIN
# ============================================================

def main():
    log(f"{'='*60}")
    log(f"RODALINK PRODUCT SCRAPER v2")
    log(f"{'='*60}")
    log(f"Start: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    total_subcats = sum(len(v) for v in CATEGORIES.values())
    log(f"Categories: {len(CATEGORIES)} main, {total_subcats} sub-categories")
    log(f"Detail scraping: {'ON' if SCRAPE_DETAILS else 'OFF'}")
    log("")
    
    all_products = []
    seen_urls = set()
    
    # ================================================
    # PHASE 1: Scrape listing pages
    # ================================================
    log(f"{'='*60}")
    log(f"PHASE 1: Scraping category listing pages")
    log(f"{'='*60}")
    
    for category, sub_categories in CATEGORIES.items():
        log(f"\n[CATEGORY] {category} ({len(sub_categories)} sub-categories)")
        
        for sub_category, path in sub_categories.items():
            products = scrape_category_listing(category, sub_category, path)
            for p in products:
                if p["url"] not in seen_urls:
                    seen_urls.add(p["url"])
                    all_products.append(p)
    
    log(f"\n{'='*60}")
    log(f"Phase 1 complete: {len(all_products)} unique products")
    log(f"{'='*60}")
    
    # Try to load existing specs from partial json to resume Phase 2
    partial_json_path = os.path.join(OUTPUT_DIR, "rodalink_products_partial.json")
    if os.path.exists(partial_json_path):
        try:
            with open(partial_json_path, 'r', encoding='utf-8') as f:
                old_products = json.load(f)
                old_dict = {p["url"]: p for p in old_products if p.get("url") and p.get("specs")}
                for p in all_products:
                    if p["url"] in old_dict:
                        p["specs"] = old_dict[p["url"]]["specs"]
                        if old_dict[p["url"]].get("description_summary"):
                            p["description_summary"] = old_dict[p["url"]]["description_summary"]
            log(f"Resumed {len(old_dict)} product details from previous run.")
        except Exception as e:
            log(f"Could not load partial JSON: {e}")

    # Save listing-only results
    save_results(all_products, partial=True)
    
    # ================================================
    # PHASE 2: Scrape product details
    # ================================================
    if SCRAPE_DETAILS:
        scrape_product_details(all_products)
    
    # ================================================
    # SAVE FINAL RESULTS
    # ================================================
    log(f"\n{'='*60}")
    log(f"SAVING FINAL RESULTS")
    log(f"{'='*60}")
    csv_path, json_path = save_results(all_products, partial=False)
    
    print_summary(all_products)
    
    log(f"\nFinish: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log(f"\nFinal files:")
    log(f"  {csv_path}")
    log(f"  {json_path}")


if __name__ == "__main__":
    main()
