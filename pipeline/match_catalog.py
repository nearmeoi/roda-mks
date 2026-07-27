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


def match_products(grouped, catalog, overrides=None, threshold=55, set_ratio_threshold=90):
    overrides = overrides or {}
    catalog_by_url = {c["url"]: c for c in catalog}
    catalog_by_brand: dict[str, list[dict]] = {}
    for c in catalog:
        catalog_by_brand.setdefault(_normalize_brand(c["brand"]), []).append(c)

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

        # token_sort_ratio (the original, proven-safe metric) and token_set_ratio
        # are tracked as two SEPARATE candidate searches, not combined into one
        # max() score. token_set_ratio rewards one string's tokens being a subset
        # of the other's -- perfect for a terse internal SKU code ("SHOES
        # SH-XC302E") embedded verbatim in a long catalog name ("Shimano Sepatu
        # Sepeda XC Racing SH-XC302E Wide Fit"), but for Shimano's dense spare-
        # parts catalog it also happily "matches" two genuinely DIFFERENT parts
        # that only share a tier name after normalization (e.g. a shifter
        # bracket cover vs. an unrelated shoe cleat, both just "105" once brand/
        # generic words are stripped) -- confirmed by manually reviewing real
        # matches, where those false positives clustered right at the low end
        # (~55-56) while genuine subset matches scored ~100. So token_set_ratio
        # only gets to contribute a match through a much higher, separate bar.
        best_sort_entry, best_sort_score = None, 0
        best_set_entry, best_set_score = None, 0
        for c in candidates:
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
