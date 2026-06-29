import requests
from bs4 import BeautifulSoup
import json
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

# Test a product with special price
r = requests.get('https://www.rodalink.com/id/sepeda/sepeda-gunung.html?product_list_limit=36', headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

items = soup.select('li.product-item')
print(f"Total items: {len(items)}")

# Find items with discounts / special prices
for i, item in enumerate(items):
    name_el = item.select_one('a.product-item-link')
    name = name_el.get_text(strip=True) if name_el else "N/A"
    
    # All prices
    all_prices = item.select('.price')
    price_texts = [p.get_text(strip=True) for p in all_prices]
    
    # Check for price-box structure
    price_box = item.select_one('.price-box')
    if price_box:
        old = price_box.select_one('.old-price .price')
        special = price_box.select_one('.special-price .price')
        normal = price_box.select_one('.price-final_price .price')
        
        old_t = old.get_text(strip=True) if old else "N/A"
        special_t = special.get_text(strip=True) if special else "N/A"
        normal_t = normal.get_text(strip=True) if normal else "N/A"
        
        if old or special:
            print(f"[{i}] {name[:60]}")
            print(f"     prices found: {price_texts}")
            print(f"     old={old_t}, special={special_t}, final={normal_t}")
            print()

# Total items / pagination
total_text = soup.find(string=re.compile(r'Total \d+ item'))
if total_text:
    print(f"\nPagination text found: {total_text.strip()}")

# Test product detail page
print("\n\n=== PRODUCT DETAIL TEST ===")
r2 = requests.get('https://www.rodalink.com/id/polygon-helios-a8x-road-bike-502759.html', headers=headers)
soup2 = BeautifulSoup(r2.text, 'html.parser')

# Check price structure on detail page
price_box = soup2.select_one('.product-info-price')
if price_box:
    print("Price box found!")
    old = price_box.select_one('.old-price .price')
    special = price_box.select_one('.special-price .price')
    final = price_box.select_one('.price-final_price .price')
    print(f"  old: {old.get_text(strip=True) if old else 'N/A'}")
    print(f"  special: {special.get_text(strip=True) if special else 'N/A'}")
    print(f"  final: {final.get_text(strip=True) if final else 'N/A'}")

# Check specs table
print("\n--- Specs ---")
spec_table = soup2.select_one('#product-attribute-specs-table')
if spec_table:
    rows = spec_table.select('tr')
    print(f"Spec table found with {len(rows)} rows")
    for row in rows[:5]:
        th = row.select_one('th')
        td = row.select_one('td')
        if th and td:
            print(f"  {th.get_text(strip=True)}: {td.get_text(strip=True)}")
else:
    print("No spec table found")
    # Try data-table  
    tables = soup2.select('table')
    print(f"Total tables: {len(tables)}")
    for t in tables:
        cls = t.get('class', [])
        tid = t.get('id', '')
        print(f"  table class={cls}, id={tid}")
    
    # Check for additional-attributes section
    attrs = soup2.select('.additional-attributes')
    print(f"additional-attributes divs: {len(attrs)}")
    
    # Check for any table with specs-like content
    all_tables = soup2.select('table')
    for table in all_tables:
        rows = table.select('tr')
        if rows and len(rows) > 3:
            print(f"\nTable with {len(rows)} rows:")
            for row in rows[:5]:
                cells = row.select('td, th')
                texts = [c.get_text(strip=True)[:50] for c in cells]
                print(f"  {' | '.join(texts)}")

# Check description
desc = soup2.select_one('.product.attribute.description .value')
if desc:
    print(f"\nDescription found, length: {len(desc.get_text())}")
    bullets = desc.select('li')
    print(f"Bullet points: {len(bullets)}")
    for b in bullets[:5]:
        print(f"  - {b.get_text(strip=True)[:80]}")
