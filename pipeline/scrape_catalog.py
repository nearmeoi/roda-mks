import re
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
