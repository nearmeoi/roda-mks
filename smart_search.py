import json
import os
import sys
import re
import requests
from bs4 import BeautifulSoup

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.prompt import Prompt
    from rich import box
except ImportError:
    print("Error: The 'rich' library is required for the modern CLI.")
    print("Please install it by running: pip install rich")
    sys.exit(1)

# Force UTF-8 output on Windows for emojis and special characters
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

console = Console()

def load_data(file_path):
    if not os.path.exists(file_path):
        console.print(f"[red]Error: Could not find {file_path}[/red]")
        console.print("Please make sure the scraper has generated the JSON file.")
        sys.exit(1)
    
    with console.status(f"[bold cyan]Loading data from {file_path}...[/bold cyan]", spinner="dots"):
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    return data

def format_price(price_str):
    if not price_str:
        return "[dim]N/A[/dim]"
    try:
        n = int(price_str)
        return f"[green]Rp {n:,.0f}[/green]".replace(",", ".")
    except ValueError:
        return f"[green]{price_str}[/green]"

def clean_price(price_text):
    if not price_text: return ""
    cleaned = re.sub(r'[^\d]', '', price_text)
    return cleaned if cleaned else ""

def scrape_and_add_product(url, file_path, data):
    console.print(f"[cyan]Detected Rodalink URL. Fetching and adding to database...[/cyan]")
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    
    # Check if already exists
    for p in data:
        if p.get('url') == url:
            console.print("[yellow]Product is already in the database![/yellow]")
            return data
            
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')
        
        product = {
            "category": "Tambahan Manual",
            "sub_category": "-",
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
            product['name'] = "Produk Rodalink"
            
        # Category from breadcrumb if possible
        breadcrumbs = [li.get_text(strip=True) for li in soup.select('.breadcrumbs li')]
        if len(breadcrumbs) > 2:
            product['category'] = breadcrumbs[1]
            if len(breadcrumbs) > 3:
                product['sub_category'] = breadcrumbs[2]
            
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
                        
        # Try to find variant colors (Magento swatches) if not in specs
        color_swatches = soup.select('.swatch-option')
        if color_swatches:
            colors = []
            for el in color_swatches:
                if el.get('option-label'):
                    colors.append(el['option-label'])
                elif el.get('aria-label'):
                    colors.append(el['aria-label'])
                elif el.get('data-option-label'):
                    colors.append(el['data-option-label'])
            colors = list(set(colors))
            if colors and not any(k.lower() in ['color', 'warna'] for k in specs_dict.keys()):
                specs_dict['Color'] = " / ".join(colors)
                        
        if specs_dict:
            product["specs"] = json.dumps(specs_dict, ensure_ascii=False)
            
        data.append(product)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        console.print(f"[bold green]Successfully added '{product['name']}' to the database![/bold green]")
        return data
        
    except Exception as e:
        console.print(f"[red]Failed to scrape URL: {e}[/red]")
        return data

def smart_search(data, query):
    keywords = [kw.lower() for kw in query.split()]
    # Pre-compile regex for word boundaries to prevent partial matches (e.g. 'ban' in 'bantuan')
    regexes = [re.compile(r'\b' + re.escape(kw) + r'\b') for kw in keywords]
    
    results = []
    
    for product in data:
        name = str(product.get("name", "")).lower()
        cat = str(product.get("category", "")).lower()
        sub_cat = str(product.get("sub_category", "")).lower()
        desc = str(product.get("description_summary", "")).lower()
        specs = str(product.get("specs", "")).lower()
        
        # Check if ALL keywords are present as full words anywhere in the text
        combined = f"{name} {cat} {sub_cat} {desc} {specs}"
        all_matched = True
        for rx in regexes:
            if not rx.search(combined):
                all_matched = False
                break
                
        if all_matched:
            # Calculate relevance score
            score = 0
            matched_in = set()
            for rx in regexes:
                # Highest priority: matches the category or sub-category
                if rx.search(cat) or rx.search(sub_cat):
                    score += 50
                    matched_in.add("Category")
                # High priority: matches the product name
                if rx.search(name):
                    score += 20
                    matched_in.add("Name")
                # Low priority: matches the specs or description
                if rx.search(specs):
                    score += 5
                    matched_in.add("Specs")
                if rx.search(desc):
                    score += 1
                    matched_in.add("Description")
            
            product['_match_reason'] = ", ".join(sorted(list(matched_in)))
            results.append((score, product))
            
    # Sort by score (highest first)
    results.sort(key=lambda x: x[0], reverse=True)
    return [r[1] for r in results]

def display_results(results, query):
    if not results:
        console.print(f"\n[yellow]No products found matching: '{query}'[/yellow]\n")
        return

    table = Table(
        title=f"Search Results for '{query}'",
        box=box.ROUNDED,
        header_style="bold magenta",
        show_lines=True
    )
    
    table.add_column("#", justify="right", style="cyan", no_wrap=True)
    table.add_column("Product Name", style="white")
    table.add_column("Color", style="green")
    table.add_column("Category", style="dim")
    table.add_column("Price", justify="right")
    table.add_column("Matched In", style="italic yellow")
    table.add_column("Link", style="blue underline", overflow="fold")
    
    limit = 15
    for i, p in enumerate(results[:limit], 1):
        name = p.get('name', 'Unknown')
        category = f"{p.get('category', '')} > {p.get('sub_category', '')}"
        price = p.get('special_price') or p.get('price')
        url = p.get('url', 'N/A')
        reason = p.get('_match_reason', '')
        
        color = "-"
        specs_str = p.get('specs', '')
        if specs_str:
            try:
                specs_dict = json.loads(specs_str)
                for k, v in specs_dict.items():
                    kl = k.lower()
                    if kl == 'color' or kl == 'warna':
                        color = v
                        break
            except:
                pass
        
        table.add_row(
            str(i),
            name,
            color,
            category,
            format_price(price),
            reason,
            url
        )
        
    console.print("\n")
    console.print(table)
    
    if len(results) > limit:
        console.print(f"[dim italic]... and {len(results) - limit} more matches. Add more keywords to narrow your search.[/dim italic]\n")
    else:
        console.print(f"[dim italic]Found {len(results)} exact matches.[/dim italic]\n")

def main():
    console.clear()
    console.print(Panel.fit(
        "[bold cyan]🚲 Rodalink Smart Search CLI[/bold cyan]\n"
        "[dim]Type your keywords to search across all product data.\n"
        "Type 'exit' or 'quit' to close.[/dim]",
        border_style="cyan"
    ))
    
    # Check both partial and full files
    file_path = "rodalink_products.json"
    if not os.path.exists(file_path):
        file_path = "rodalink_products_partial.json"
        
    data = load_data(file_path)
    console.print(f"[green]Successfully loaded {len(data)} products.[/green]\n")
    
    while True:
        try:
            query = Prompt.ask("[bold yellow]Search (or paste URL to add)[/bold yellow]").strip()
            
            if not query:
                continue
                
            if query.lower() in ['exit', 'quit', 'q']:
                console.print("[dim]Goodbye![/dim]")
                break
                
            # Check if it's a rodalink URL
            if query.startswith("http") and "rodalink.com" in query:
                data = scrape_and_add_product(query, file_path, data)
                continue
                
            results = smart_search(data, query)
            display_results(results, query)
            
        except KeyboardInterrupt:
            console.print("\n[dim]Goodbye![/dim]")
            break
        except Exception as e:
            console.print(f"[red]An error occurred: {e}[/red]")

if __name__ == "__main__":
    main()
