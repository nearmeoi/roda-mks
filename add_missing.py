import requests
import json
import csv
import sys
from bs4 import BeautifulSoup
import re

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def clean_price(price_text):
    if not price_text: return ""
    cleaned = re.sub(r'[^\d]', '', price_text)
    return cleaned if cleaned else ""

def get_product(url):
    print(f"Fetching {url}...")
    r = requests.get(url, headers=HEADERS)
    soup = BeautifulSoup(r.text, 'html.parser')
    
    # Base info
    product = {
        "category": "Sepeda",
        "sub_category": "Sepeda Perkotaan (City Bike)",
        "name": "",
        "url": url,
        "price": "",
        "special_price": "",
        "discount": "",
        "specs": "",
        "description_summary": "",
    }
    
    name_el = soup.select_one('h1.page-title span')
    if name_el:
        product['name'] = name_el.get_text(strip=True)
    else:
        product['name'] = "Polygon Sepeda Kota Aluna 26"
        
    price_box = soup.select_one('.product-info-price')
    if price_box:
        old_price = price_box.select_one('.old-price .price')
        special_price = price_box.select_one('.special-price .price')
        
        if old_price and special_price:
            product["price"] = clean_price(old_price.get_text(strip=True))
            product["special_price"] = clean_price(special_price.get_text(strip=True))
        else:
            all_prices = price_box.select('.price')
            for p in all_prices:
                text = p.get_text(strip=True)
                if 'Rp' in text:
                    product["price"] = clean_price(text)
                    break
                    
    desc = soup.select_one('.product.attribute.description .value')
    if desc:
        product["description_summary"] = desc.get_text(separator=' ', strip=True)[:500]
        
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
                    
    if specs_dict:
        product["specs"] = json.dumps(specs_dict, ensure_ascii=False)
        
    return product

def add_to_json(product):
    with open('rodalink_products.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Check if already exists
    for p in data:
        if p['url'] == product['url']:
            print("Product already in JSON!")
            return
            
    data.append(product)
    
    with open('rodalink_products.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Added to JSON!")

if __name__ == "__main__":
    url = "https://www.rodalink.com/id/polygon-sepeda-kota-aluna-26-503770.html"
    product = get_product(url)
    add_to_json(product)
