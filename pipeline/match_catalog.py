import re
from rapidfuzz import fuzz

GENERIC_WORDS = {
    # Sepeda
    "sepeda", "bike", "gunung", "balap", "elektrik", "hybrid", "perkotaan",
    "city", "gravel", "touring", "road", "mtb", "bmx", "lipat", "anak",
    "wanita", "ebike",
    # Frame & Fork / Spare Part
    "frame", "fork", "drop", "out", "linkage", "spare", "part", "parts",
    "lain", "lainnya", "bar", "end", "tape", "handle", "grip", "stem",
    "handlebar", "headset", "rear", "shock", "bottom", "bracket",
    "chainring", "rantai", "chain", "crank", "set", "cassette", "front",
    "derailleur", "shifter", "brake", "lever", "cable", "pad", "rotor",
    "hub", "jari", "pelek", "wheel", "saddle", "seat", "post", "clamp",
    "pedal", "quick", "release", "thru", "axle", "ban", "tire", "tube",
    "dalam", "valve", "tubeless", "kit",
    # Apparel
    "jersey", "celana", "jaket", "kaos", "helm", "helmet", "sarung",
    "tangan", "gloves", "sepatu", "shoes", "kacamata", "eyewear",
    "sunglasses", "sock", "apparel",
    # Aksesoris & Spare Part
    "cyclo", "computer", "carrier", "child", "baby", "rack", "botol",
    "minum", "bottle", "cage", "tas", "bag", "tools", "stand", "pompa",
    "kunci", "lock", "fender", "spakbor", "lampu", "light", "bel", "bell",
    "keranjang", "basket", "peralatan", "aksesoris", "aksesori",
    "accessories",
    # Supplemen
    "supplemen", "supplement",
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
        key = f'{product["brand"]}|{product["model_name"]}|{product["color_code"]}|{product.get("variant_extra")}'
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
