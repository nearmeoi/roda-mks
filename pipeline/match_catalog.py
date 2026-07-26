import re
from rapidfuzz import fuzz

GENERIC_WORDS = {
    "sepeda", "bike", "gunung", "balap", "elektrik", "hybrid", "perkotaan",
    "city", "gravel", "touring", "road", "mtb", "bmx", "lipat", "anak",
    "wanita", "ebike",
}


def _normalize(text: str, brand: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9 ]", " ", text)
    words = [w for w in text.split() if w != brand.lower() and w not in GENERIC_WORDS]
    return " ".join(words)


def match_products(grouped, catalog, overrides=None, threshold=55):
    overrides = overrides or {}
    catalog_by_url = {c["url"]: c for c in catalog}
    catalog_by_brand: dict[str, list[dict]] = {}
    for c in catalog:
        catalog_by_brand.setdefault(c["brand"].lower(), []).append(c)

    matches, unmatched = [], []
    for product in grouped:
        key = f'{product["brand"]}|{product["model_name"]}|{product["color_code"]}'
        if key in overrides:
            override_url = overrides[key]
            if override_url is None:
                unmatched.append(product)
                continue
            catalog_entry = catalog_by_url.get(override_url)
            if catalog_entry:
                matches.append({**product, "catalog": catalog_entry, "match_score": 100})
                continue

        candidates = catalog_by_brand.get(product["brand"].lower(), [])
        target = _normalize(product["model_name"], product["brand"])
        best_entry, best_score = None, 0
        for c in candidates:
            score = fuzz.token_sort_ratio(target, _normalize(c["name"], product["brand"]))
            if score > best_score:
                best_entry, best_score = c, score

        if best_entry and best_score >= threshold:
            matches.append({**product, "catalog": best_entry, "match_score": round(best_score)})
        else:
            unmatched.append(product)

    return matches, unmatched
