import argparse
import json
import os
import re

from pipeline.parse_stock import load_bike_rows, load_paa_rows
from pipeline.group_products import group_rows
from pipeline.decode_variant import decode_variant, clean_model_name


def make_id(brand: str, model_name: str, color_code: str | None, variant_extra: str | None = None) -> str:
    raw = f"{brand}-{model_name}-{color_code or ''}-{variant_extra or ''}".lower()
    raw = re.sub(r"[^a-z0-9]+", "-", raw)
    return raw.strip("-")


def _price_fallback_index(products: list[dict]) -> dict[int, float]:
    """article_code -> price, from the currently-stocked products dataset."""
    index: dict[int, float] = {}
    for p in products:
        for s in p["sizes"]:
            price = s["price"] if s["price"] is not None else p["price"]
            if price is not None:
                index[s["article_code"]] = price
    return index


def build(xlsx_path: str, products_path: str, output_path: str, pos_prices_path: str | None = None) -> None:
    rows = load_bike_rows(xlsx_path) + load_paa_rows(xlsx_path)
    grouped = group_rows(rows)
    print(f"[build_all_stock] {len(rows)} SKU rows grouped into {len(grouped)} entries")

    with open(products_path, encoding="utf-8") as f:
        existing_products = json.load(f)
    existing_ids = {p["id"] for p in existing_products}
    price_fallback = _price_fallback_index(existing_products)

    pos_prices: dict[str, float] = {}
    if pos_prices_path and os.path.exists(pos_prices_path):
        with open(pos_prices_path, encoding="utf-8") as f:
            pos_prices = json.load(f)
        print(f"[build_all_stock] loaded {len(pos_prices)} live prices from {pos_prices_path}")

    entries = []
    skipped_existing = 0
    fallback_used = 0
    pos_used = 0
    no_price = 0
    for g in grouped:
        entry_id = make_id(g["brand"], g["model_name"], g["color_code"], g.get("variant_extra"))
        price = g["price"]
        price_source = "master"
        if price is None:
            for s in g["sizes"]:
                fallback_price = price_fallback.get(s["article_code"])
                if fallback_price is not None:
                    price = fallback_price
                    price_source = "fallback"
                    fallback_used += 1
                    break
            else:
                for s in g["sizes"]:
                    pos_price = pos_prices.get(str(s["article_code"]))
                    if pos_price is not None:
                        price = pos_price
                        price_source = "pos"
                        pos_used += 1
                        break

        if price is None:
            # No price anywhere -- master list, current stock data, and a live
            # POS lookup all agree this article has no price on record. A
            # priceless row isn't useful for "what would this cost", so skip
            # it rather than show a dead end.
            no_price += 1
            continue

        wheel_size, color_label = decode_variant(g["model_name"], g["category"], g.get("color_code"))
        entries.append({
            "id": entry_id,
            "brand": g["brand"],
            "model_name": clean_model_name(g["model_name"], g["category"]),
            "category": g["category"],
            "wheel_size": wheel_size,
            "color_label": color_label,
            "price": price,
            "priceSource": price_source,
        })

    print(f"[build_all_stock] {skipped_existing} already covered by main catalog, "
          f"{fallback_used} filled from stock-price fallback, {pos_used} filled from live POS price, "
          f"{no_price} dropped for having no price anywhere")
    print(f"[build_all_stock] wrote {len(entries)} entries to {output_path}")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    # Served as a static asset and fetched lazily on the client (not statically
    # imported) -- at 10k+ lightweight entries this file is ~2.7MB, too big to
    # bundle into the main JS payload for a section most page loads never use.
    web_json_path = os.path.join("web", "public", "all_stock.json")
    if os.path.exists(os.path.dirname(web_json_path)):
        with open(web_json_path, "w", encoding="utf-8") as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
        print(f"[build_all_stock] synced {len(entries)} entries to {web_json_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", required=True)
    parser.add_argument("--products", default="data/products.json")
    parser.add_argument("--output", default="data/all_stock.json")
    parser.add_argument("--pos-prices", default="data/pos_prices.json")
    args = parser.parse_args()
    build(args.xlsx, args.products, args.output, pos_prices_path=args.pos_prices)
