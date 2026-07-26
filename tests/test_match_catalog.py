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
    {"brand": "POLYGON", "model_name": "STRATTOS 7 BLK FA 700", "color_code": "B",
     "category": "BIKE-ROAD DROP BAR", "price": 25000000,
     "sizes": [{"size_code": "S1", "article_code": 1, "quantity": 1, "price": 25000000}]},
    {"brand": "WIM CYCLE", "model_name": "ELENA MEOW 16 FA", "color_code": "P",
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


def test_match_products_respects_override_url():
    overrides = {"POLYGON|STRATTOS 7 BLK FA 700|B": "https://www.rodalink.com/id/polygon-cascade-5-503443.html"}
    matches, unmatched = match_products(GROUPED, CATALOG, overrides=overrides)
    strattos_match = next(m for m in matches if m["model_name"] == "STRATTOS 7 BLK FA 700")
    assert strattos_match["catalog"]["url"] == "https://www.rodalink.com/id/polygon-cascade-5-503443.html"
    assert strattos_match["match_score"] == 100


def test_match_products_respects_override_null_forces_unmatched():
    overrides = {"POLYGON|STRATTOS 7 BLK FA 700|B": None}
    matches, unmatched = match_products(GROUPED, CATALOG, overrides=overrides)
    assert not any(m["model_name"] == "STRATTOS 7 BLK FA 700" for m in matches)
    assert any(u["model_name"] == "STRATTOS 7 BLK FA 700" for u in unmatched)
