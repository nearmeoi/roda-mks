import json

def main():
    # Read from either the partial or full json
    try:
        with open('rodalink_products_partial.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        with open('rodalink_products.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
    for p in data:
        p['specs'] = ''
                
    with open('rodalink_products_partial.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"Reset {len(data)} items. Ready for FULL fast rescrape!")

if __name__ == "__main__":
    main()
