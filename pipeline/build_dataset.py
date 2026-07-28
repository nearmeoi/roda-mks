import argparse
import json
import os
import re


from pipeline.parse_stock import load_bike_rows, load_paa_rows
from pipeline.group_products import group_rows
from pipeline.match_catalog import match_products
from pipeline.scrape_catalog import scrape_catalog
from pipeline.decode_variant import decode_variant, decode_paa_size_code, clean_model_name


def make_id(brand: str, model_name: str, color_code: str | None, variant_extra: str | None = None) -> str:
    raw = f"{brand}-{model_name}-{color_code or ''}-{variant_extra or ''}".lower()
    raw = re.sub(r"[^a-z0-9]+", "-", raw)
    return raw.strip("-")


def merge_product(matched: dict) -> dict:
    catalog = matched["catalog"]
    wheel_size, color_label = decode_variant(matched["model_name"], matched["category"], matched.get("color_code"))
    sizes = [
        {**s, "size_code": decode_paa_size_code(s["size_code"], matched["category"])}
        for s in matched["sizes"]
    ]
    cleaned_name = clean_model_name(matched["model_name"], matched["category"])
    return {
        "id": make_id(matched["brand"], matched["model_name"], matched["color_code"], matched.get("variant_extra")),
        "brand": matched["brand"],
        "model_name": cleaned_name,
        "category": matched["category"],
        "warehouse": matched["warehouse"],
        "variant_extra": matched.get("variant_extra"),
        "wheel_size": wheel_size,
        "color_label": color_label,
        "price": matched["price"] if matched["price"] is not None else catalog.get("price"),
        "sizes": sizes,
        "colors": catalog["colors"],
        "images": catalog["images"],
        "specs": catalog["specs"],
        "matched": True,
    }


def merge_unmatched(product: dict) -> dict:
    wheel_size, color_label = decode_variant(product["model_name"], product["category"], product.get("color_code"))
    sizes = [
        {**s, "size_code": decode_paa_size_code(s["size_code"], product["category"])}
        for s in product["sizes"]
    ]
    cleaned_name = clean_model_name(product["model_name"], product["category"])
    return {
        "id": make_id(product["brand"], product["model_name"], product["color_code"], product.get("variant_extra")),
        "brand": product["brand"],
        "model_name": cleaned_name,
        "category": product["category"],
        "warehouse": product["warehouse"],
        "variant_extra": product.get("variant_extra"),
        "wheel_size": wheel_size,
        "color_label": color_label,
        "price": product["price"],
        "sizes": sizes,
        "colors": [],
        "images": [],
        "specs": {},
        "matched": False,
    }


def build(xlsx_path: str, catalog_partial_path: str, catalog_output_path: str,
          overrides_path: str, output_path: str, headless: bool = True,
          skip_photos: bool = False, catalog_input_path: str | None = None) -> None:
    rows = load_bike_rows(xlsx_path) + load_paa_rows(xlsx_path)
    grouped = group_rows(rows)
    print(f"[build_dataset] {len(rows)} SKU rows grouped into {len(grouped)} products")

    if catalog_input_path:
        # Catalog scraped by some other means (e.g. a browser tool run from an
        # environment that isn't network-blocked from rodalink.com) and saved
        # to disk in the same shape scrape_catalog() would have produced.
        with open(catalog_input_path, encoding="utf-8") as f:
            catalog = json.load(f)
        print(f"[build_dataset] loaded {len(catalog)} pre-scraped catalog products from {catalog_input_path}")
    elif skip_photos:
        print("[build_dataset] --skip-photos set, not scraping rodalink.com (all products will be unmatched)")
        catalog = []
    else:
        catalog = scrape_catalog(catalog_output_path, catalog_partial_path, headless=headless)
        print(f"[build_dataset] scraped {len(catalog)} catalog products")

    with open(overrides_path, encoding="utf-8") as f:
        overrides = json.load(f)

    matched, unmatched = match_products(grouped, catalog, overrides=overrides)
    print(f"[build_dataset] matched {len(matched)}, unmatched {len(unmatched)}")

    products = [merge_product(m) for m in matched] + [merge_unmatched(u) for u in unmatched]
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print(f"[build_dataset] wrote {len(products)} products to {output_path}")

    # Auto-sync to web app if web/lib/products.json exists
    web_json_path = os.path.join("web", "lib", "products.json")
    if os.path.exists(os.path.dirname(web_json_path)):
        with open(web_json_path, "w", encoding="utf-8") as f:
            json.dump(products, f, ensure_ascii=False, indent=2)
        print(f"[build_dataset] synced {len(products)} products to {web_json_path}")



if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", required=True)
    parser.add_argument("--catalog-partial", default="data/catalog_partial.json")
    parser.add_argument("--catalog-output", default="data/catalog.json")
    parser.add_argument("--overrides", default="data/catalog_overrides.json")
    parser.add_argument("--output", default="data/products.json")
    parser.add_argument("--headed", action="store_true", help="run the browser with a visible window")
    parser.add_argument("--skip-photos", action="store_true",
                         help="skip scraping rodalink.com; write stock data only, all products unmatched")
    parser.add_argument("--catalog-input",
                         help="path to a pre-scraped catalog JSON file (same shape scrape_catalog() produces); "
                              "skips live scraping entirely when set")
    args = parser.parse_args()
    build(args.xlsx, args.catalog_partial, args.catalog_output, args.overrides,
          args.output, headless=not args.headed, skip_photos=args.skip_photos,
          catalog_input_path=args.catalog_input)
