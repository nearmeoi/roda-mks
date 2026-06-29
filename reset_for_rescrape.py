import json

def main():
    with open('rodalink_products.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    count = 0
    for p in data:
        if p.get('specs'):
            s = p['specs'].lower()
            if 'color' not in s and 'warna' not in s:
                p['specs'] = ''
                count += 1
                
    with open('rodalink_products_partial.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"Reset {count} items. Ready for fast rescrape!")

if __name__ == "__main__":
    main()
