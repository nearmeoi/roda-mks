import re
from rapidfuzz import fuzz


# Only true filler/category-boilerplate words and bike-TYPE descriptors --
# NOT actual part-type nouns (derailleur, brake, lever, hub, chain, pedal,
# helmet, bottle, ...). Bike-type words (gunung, balap, kota, ...) are safe
# to strip because two different bikes are already disambiguated by their
# model NAME (Cascade vs Strattos); but for spare parts there's often no
# separate "model name" beyond brand tier + part type (a "Tiagra" front
# derailleur vs. a "Tiagra" brake lever vs. a "Tiagra" crankset), so the
# part-type word IS the disambiguating signal and must stay meaningful.
# Stripping it was a real bug found in production data: a Front Derailleur
# and an unrelated Brake Lever both reduced to nearly nothing once "front"/
# "derailleur"/"brake"/"lever" were all treated as filler, leaving only
# their shared tier "Tiagra" -- enough to coincidentally clear the match
# threshold.
GENERIC_WORDS = {
    # True filler / category boilerplate
    "sepeda", "bike", "spare", "part", "parts", "lain", "lainnya",
    "aksesoris", "aksesori", "accessories", "peralatan", "apparel",
    "supplemen", "supplement", "set", "kit",
    # Bike-type descriptors (disambiguated by model name instead)
    "gunung", "balap", "elektrik", "hybrid", "perkotaan", "city", "kota",
    "gravel", "touring", "road", "mtb", "bmx", "lipat", "anak", "wanita",
    "ebike",
    # Apparel/accessory CATEGORY labels -- unlike spare-part sub-types
    # (derailleur vs. brake vs. lever), these already correspond 1:1 to the
    # outlet's own category column, so stripping them doesn't create
    # cross-product collisions the way stripping part-type words did.
    "jersey", "celana", "jaket", "kaos", "helm", "helmet", "sarung",
    "tangan", "gloves", "sepatu", "shoes", "kacamata", "eyewear",
    "sunglasses", "sock", "botol", "minum", "bottle", "cage", "tas", "bag",
    "tools", "stand", "pompa", "kunci", "lock", "fender", "spakbor",
    "lampu", "light", "bel", "bell", "keranjang", "basket", "carrier",
    "rack", "cyclo", "computer", "child", "baby",
}


def _normalize(text: str, brand: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9 ]", " ", text)
    words = [w for w in text.split() if w != brand.lower() and w not in GENERIC_WORDS]
    return " ".join(words)


def _normalize_brand(brand: str) -> str:
    # Outlet xlsx and the scraped catalog don't always spell brands the same
    # way (e.g. "WIM CYCLE" vs "Wimcycle") -- compare on letters/digits only
    # so spacing/punctuation/case differences don't block a real match.
    return re.sub(r"[^a-z0-9]", "", brand.lower())


def _extract_model_numbers(text: str) -> set[str]:
    # Find series digits like '7' in 'STRATTOS 7' or '4' in 'STRATTOS S4'
    return set(re.findall(r"\b(?:s)?(\d+)\b", text.lower()))


def _has_model_number_conflict(target_text: str, candidate_text: str) -> bool:
    t_nums = _extract_model_numbers(target_text)
    c_nums = _extract_model_numbers(candidate_text)
    if t_nums and c_nums:
        # If target specifies model numbers (e.g. {'7'}) and candidate specifies different ones (e.g. {'4'}), conflict!
        if not t_nums.intersection(c_nums):
            return True
    return False


def match_products(grouped, catalog, overrides=None, threshold=55, set_ratio_threshold=90):
    overrides = overrides or {}
    catalog_by_url = {c["url"]: c for c in catalog if "url" in c}
    catalog_by_brand: dict[str, list[dict]] = {}
    for c in catalog:
        brand_val = c.get("brand") or (c.get("specs", {}).get("Brand") if isinstance(c.get("specs"), dict) else "") or ""
        catalog_by_brand.setdefault(_normalize_brand(brand_val), []).append(c)

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

        candidates = catalog_by_brand.get(_normalize_brand(product["brand"]), [])
        target = _normalize(product["model_name"], product["brand"])

        best_sort_entry, best_sort_score = None, 0
        best_set_entry, best_set_score = None, 0
        for c in candidates:
            if _has_model_number_conflict(product["model_name"], c["name"]):
                continue

            candidate_name = _normalize(c["name"], product["brand"])
            sort_score = fuzz.token_sort_ratio(target, candidate_name)
            if sort_score > best_sort_score:
                best_sort_entry, best_sort_score = c, sort_score
            set_score = fuzz.token_set_ratio(target, candidate_name)
            if set_score > best_set_score:
                best_set_entry, best_set_score = c, set_score

        if best_sort_entry and best_sort_score >= threshold:
            matches.append({**product, "catalog": best_sort_entry, "match_score": round(best_sort_score)})
        elif best_set_entry and best_set_score >= set_ratio_threshold:
            matches.append({**product, "catalog": best_set_entry, "match_score": round(best_set_score)})
        else:
            unmatched.append(product)

    return matches, unmatched
