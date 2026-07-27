from pipeline.match_catalog import match_products

CATALOG = [
    {"url": "https://www.rodalink.com/id/polygon-strattos-7-503769.html",
     "name": "Polygon Sepeda Balap Strattos 7", "brand": "Polygon",
     "price": 25000000, "colors": ["Black"], "sizes": ["S", "M"],
     "images": ["https://media.rodalink.com/x.jpg"], "specs": {}},
    {"url": "https://www.rodalink.com/id/polygon-cascade-5-503443.html",
     "name": "Polygon Sepeda Gunung Cascade 5", "brand": "Polygon",
     "price": 6300000, "colors": ["Navy"], "sizes": ["S", "M", "L"],
     "images": ["https://media.rodalink.com/y.jpg"], "specs": {}},
]

GROUPED = [
    {"brand": "POLYGON", "model_name": "STRATTOS 7 BLK FA 700", "color_code": "B", "variant_extra": None,
     "category": "BIKE-ROAD DROP BAR", "price": 25000000,
     "sizes": [{"size_code": "S1", "article_code": 1, "quantity": 1, "price": 25000000}]},
    {"brand": "WIM CYCLE", "model_name": "ELENA MEOW 16 FA", "color_code": "P", "variant_extra": None,
     "category": "BIKE-KIDS 16-18\"", "price": None,
     "sizes": [{"size_code": "09B", "article_code": 2, "quantity": 9, "price": None}]},
]


def test_match_products_finds_confident_match():
    matches, unmatched = match_products(GROUPED, CATALOG)
    assert len(matches) == 1
    assert matches[0]["model_name"] == "STRATTOS 7 BLK FA 700"
    assert matches[0]["catalog"]["url"] == "https://www.rodalink.com/id/polygon-strattos-7-503769.html"
    assert matches[0]["match_score"] >= 55


def test_match_products_leaves_no_candidate_unmatched():
    matches, unmatched = match_products(GROUPED, CATALOG)
    assert len(unmatched) == 1
    assert unmatched[0]["model_name"] == "ELENA MEOW 16 FA"


def test_match_products_normalizes_brand_spacing_and_case():
    # Real bug found in production data: outlet xlsx has "WIM CYCLE" (with a
    # space) but the scraped catalog has "Wimcycle" (no space) -- a strict
    # brand-equality filter was silently discarding every Wim Cycle candidate
    # before fuzzy name matching ever ran, even when the catalog clearly had
    # the product.
    catalog = [
        {"url": "https://www.rodalink.com/id/wimcycle-elena-meow-16.html",
         "name": "Wimcycle Sepeda Anak Elena Meow 16", "brand": "Wimcycle",
         "price": 1800000, "colors": ["Pink"], "sizes": [],
         "images": ["https://media.rodalink.com/meow.jpg"], "specs": {}},
    ]
    grouped = [
        {"brand": "WIM CYCLE", "model_name": "ELENA MEOW 16 FA", "color_code": "P", "variant_extra": None,
         "category": "BIKE-KIDS 16-18\"", "price": None,
         "sizes": [{"size_code": "09B", "article_code": 2, "quantity": 9, "price": None}]},
    ]

    matches, unmatched = match_products(grouped, catalog)

    assert len(matches) == 1
    assert unmatched == []
    assert matches[0]["catalog"]["url"] == "https://www.rodalink.com/id/wimcycle-elena-meow-16.html"


def test_match_products_finds_short_internal_code_inside_long_catalog_name():
    # Real bug found in production data: PAA rows are often just a terse
    # internal SKU/part code (e.g. "SHOES SH-XC302E"), while the catalog name
    # is a long descriptive marketing string that happens to contain that
    # exact code as a substring ("Shimano Sepatu Sepeda XC Racing SH-XC302E
    # Wide Fit"). token_sort_ratio alone scores this ~49 (below threshold)
    # because of how much extra text dilutes the ratio; token_set_ratio
    # (which rewards one string's tokens being a subset of the other's)
    # correctly scores it near 100.
    catalog = [
        {"url": "https://www.rodalink.com/id/shimano-sh-xc302e.html",
         "name": "Shimano Sepatu Sepeda XC Racing SH-XC302E Wide Fit", "brand": "Shimano",
         "price": 2500000, "colors": [], "sizes": [],
         "images": ["https://media.rodalink.com/shoe.jpg"], "specs": {}},
    ]
    grouped = [
        {"brand": "SHIMANO", "model_name": "SHOES SH-XC302E", "color_code": "B", "variant_extra": None,
         "category": "FOOTWEAR", "price": 2500000,
         "sizes": [{"size_code": "440", "article_code": 1, "quantity": 2, "price": 2500000}]},
    ]

    matches, unmatched = match_products(grouped, catalog)

    assert len(matches) == 1
    assert unmatched == []
    assert matches[0]["catalog"]["url"] == "https://www.rodalink.com/id/shimano-sh-xc302e.html"


def test_match_products_rejects_low_confidence_token_set_collision():
    # Real false positive found in production data: "ST-R9270 BRACKET COVER"
    # (a Shimano Di2 shifter part) and "Shimano Cleat Sepatu Sepeda SM-SH12"
    # (an unrelated shoe cleat) share no real content after normalization
    # besides both being terse Shimano codes, yet token_set_ratio alone
    # scored this ~55 -- just barely over the general threshold. A coincidental
    # low-end token_set_ratio score must NOT be enough to accept a match;
    # only token_sort_ratio (the safe metric) or a near-exact token_set_ratio
    # (>=90, a genuine subset match) should be.
    catalog = [
        {"url": "https://www.rodalink.com/id/shimano-cleat-sm-sh12.html",
         "name": "Shimano Cleat Sepatu Sepeda SM-SH12 Y40B98140", "brand": "Shimano",
         "price": 150000, "colors": [], "sizes": [],
         "images": ["https://media.rodalink.com/cleat.jpg"], "specs": {}},
    ]
    grouped = [
        {"brand": "SHIMANO", "model_name": "ST-R9270 BRACKET COVER Y0MX98010", "color_code": None,
         "variant_extra": None, "category": "OTHER BRAKE PARTS", "price": 80000,
         "sizes": [{"size_code": None, "article_code": 1, "quantity": 3, "price": 80000}]},
    ]

    matches, unmatched = match_products(grouped, catalog)

    assert matches == []
    assert len(unmatched) == 1


def test_match_products_does_not_confuse_different_part_types():
    # Real false positive found in production data: GENERIC_WORDS used to
    # strip actual part-type nouns (derailleur, brake, lever, ...) thinking
    # of them as filler, which let a Front Derailleur match an unrelated
    # Brake Lever -- both reduced to nearly nothing (just the shared model
    # tier "Tiagra" and a coincidentally-overlapping number) once stripped.
    # Part-type words must stay meaningful so mismatched parts score low.
    catalog = [
        {"url": "https://www.rodalink.com/id/shimano-tiagra-brake-lever.html",
         "name": "Shimano Brake Lever Sepeda Tiagra EBL-4700", "brand": "Shimano",
         "price": 350000, "colors": [], "sizes": [],
         "images": ["https://media.rodalink.com/lever.jpg"], "specs": {}},
    ]
    grouped = [
        {"brand": "SHIMANO", "model_name": "FD TIAGRA IFD4700F", "color_code": None,
         "variant_extra": None, "category": "FRONT DERAILLEUR", "price": 300000,
         "sizes": [{"size_code": None, "article_code": 1, "quantity": 2, "price": 300000}]},
    ]

    matches, unmatched = match_products(grouped, catalog)

    assert matches == []
    assert len(unmatched) == 1


def test_match_products_respects_override_url():
    overrides = {"POLYGON|STRATTOS 7 BLK FA 700|B|None": "https://www.rodalink.com/id/polygon-cascade-5-503443.html"}
    matches, unmatched = match_products(GROUPED, CATALOG, overrides=overrides)
    strattos_match = next(m for m in matches if m["model_name"] == "STRATTOS 7 BLK FA 700")
    assert strattos_match["catalog"]["url"] == "https://www.rodalink.com/id/polygon-cascade-5-503443.html"
    assert strattos_match["match_score"] == 100


def test_match_products_respects_override_null_forces_unmatched():
    overrides = {"POLYGON|STRATTOS 7 BLK FA 700|B|None": None}
    matches, unmatched = match_products(GROUPED, CATALOG, overrides=overrides)
    assert not any(m["model_name"] == "STRATTOS 7 BLK FA 700" for m in matches)
    assert any(u["model_name"] == "STRATTOS 7 BLK FA 700" for u in unmatched)


def test_match_products_override_key_distinguishes_by_variant_extra():
    grouped = [
        {"brand": "CYCLISTE", "model_name": "TIRE PRO ONE 700X32C", "color_code": None,
         "variant_extra": "TLE, F, B", "category": "TIRE", "price": 250000,
         "sizes": [{"size_code": None, "article_code": 1, "quantity": 3, "price": 250000}]},
        {"brand": "CYCLISTE", "model_name": "TIRE PRO ONE 700X32C", "color_code": None,
         "variant_extra": "TLE, R, B", "category": "TIRE", "price": 250000,
         "sizes": [{"size_code": None, "article_code": 2, "quantity": 2, "price": 250000}]},
    ]
    overrides = {
        "CYCLISTE|TIRE PRO ONE 700X32C|None|TLE, F, B":
            "https://www.rodalink.com/id/polygon-strattos-7-503769.html",
    }
    matches, unmatched = match_products(grouped, CATALOG, overrides=overrides)
    front = next(m for m in matches if m["variant_extra"] == "TLE, F, B")
    assert front["catalog"]["url"] == "https://www.rodalink.com/id/polygon-strattos-7-503769.html"
    # the override is keyed to the front tire's variant_extra only -- if the override
    # lookup key ignored variant_extra, this rear tire (no Cycliste catalog candidates
    # to fuzzy-match against) would incorrectly inherit the front tire's override too
    assert not any(m["variant_extra"] == "TLE, R, B" for m in matches)
    assert any(u["variant_extra"] == "TLE, R, B" for u in unmatched)
