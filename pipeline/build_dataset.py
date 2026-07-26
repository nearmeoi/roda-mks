import argparse
import json
import re

from pipeline.parse_stock import load_bike_rows
from pipeline.group_products import group_rows
from pipeline.match_catalog import match_products
from pipeline.scrape_catalog import scrape_bike_catalog


def make_id(brand: str, model_name: str, color_code: str) -> str:
    raw = f"{brand}-{model_name}-{color_code}".lower()
    raw = re.sub(r"[^a-z0-9]+", "-", raw)
    return raw.strip("-")


def merge_product(matched: dict) -> dict:
    catalog = matched["catalog"]
    return {
        "id": make_id(matched["brand"], matched["model_name"], matched["color_code"]),
        "brand": matched["brand"],
        "model_name": matched["model_name"],
        "category": matched["category"],
        "price": matched["price"],
        "sizes": matched["sizes"],
        "colors": catalog["colors"],
        "images": catalog["images"],
        "specs": catalog["specs"],
        "matched": True,
    }


def merge_unmatched(product: dict) -> dict:
    return {
        "id": make_id(product["brand"], product["model_name"], product["color_code"]),
        "brand": product["brand"],
        "model_name": product["model_name"],
        "category": product["category"],
        "price": product["price"],
        "sizes": product["sizes"],
        "colors": [],
        "images": [],
        "specs": {},
        "matched": False,
    }


def build(xlsx_path: str, catalog_partial_path: str, catalog_output_path: str,
          overrides_path: str, output_path: str, headless: bool = True) -> None:
    rows = load_bike_rows(xlsx_path)
    grouped = group_rows(rows)
    print(f"[build_dataset] {len(rows)} SKU rows grouped into {len(grouped)} products")

    catalog = scrape_bike_catalog(catalog_output_path, catalog_partial_path, headless=headless)
    print(f"[build_dataset] scraped {len(catalog)} catalog products")

    with open(overrides_path, encoding="utf-8") as f:
        overrides = json.load(f)

    matched, unmatched = match_products(grouped, catalog, overrides=overrides)
    print(f"[build_dataset] matched {len(matched)}, unmatched {len(unmatched)}")

    products = [merge_product(m) for m in matched] + [merge_unmatched(u) for u in unmatched]
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print(f"[build_dataset] wrote {len(products)} products to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", required=True)
    parser.add_argument("--catalog-partial", default="data/catalog_partial.json")
    parser.add_argument("--catalog-output", default="data/catalog.json")
    parser.add_argument("--overrides", default="data/catalog_overrides.json")
    parser.add_argument("--output", default="data/products.json")
    parser.add_argument("--headed", action="store_true", help="run the browser with a visible window")
    args = parser.parse_args()
    build(args.xlsx, args.catalog_partial, args.catalog_output, args.overrides,
          args.output, headless=not args.headed)
