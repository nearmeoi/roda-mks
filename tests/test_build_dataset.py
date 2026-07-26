from pipeline.build_dataset import merge_product, merge_unmatched, make_id


def test_make_id_is_slug():
    assert make_id("POLYGON", "STRATTOS 7 BLK FA 700", "B") == "polygon-strattos-7-blk-fa-700-b"


def test_make_id_handles_missing_color_code():
    assert make_id("HOZAN", "TOOL SPOKE CUTTER C-216", None) == "hozan-tool-spoke-cutter-c-216"


def test_make_id_stays_unique_when_only_variant_extra_differs():
    id_a = make_id("CYCLISTE", "TIRE PRO ONE 700X32C", None, "TLE, F, B")
    id_b = make_id("CYCLISTE", "TIRE PRO ONE 700X32C", None, "TLE, R, B")
    assert id_a != id_b


def test_merge_product_combines_grouped_and_catalog_fields():
    matched = {
        "brand": "POLYGON", "model_name": "STRATTOS 7 BLK FA 700", "color_code": "B", "variant_extra": None,
        "category": "BIKE-ROAD DROP BAR", "warehouse": "Outlet", "price": 25000000,
        "sizes": [{"size_code": "S1", "article_code": 1, "quantity": 1, "ordered_quantity": None, "price": 25000000}],
        "catalog": {
            "url": "https://www.rodalink.com/id/polygon-strattos-7-503769.html",
            "name": "Polygon Sepeda Balap Strattos 7", "brand": "Polygon",
            "price": 25000000, "colors": ["Black"], "sizes": ["S", "M"],
            "images": ["https://media.rodalink.com/x.jpg"],
            "specs": {"Frame": "CARBON ENDURANCE"},
        },
        "match_score": 90,
    }

    result = merge_product(matched)

    assert result["id"] == "polygon-strattos-7-blk-fa-700-b"
    assert result["brand"] == "POLYGON"
    assert result["category"] == "BIKE-ROAD DROP BAR"
    assert result["price"] == 25000000
    assert result["colors"] == ["Black"]
    assert result["images"] == ["https://media.rodalink.com/x.jpg"]
    assert result["specs"] == {"Frame": "CARBON ENDURANCE"}
    assert result["matched"] is True
    assert result["warehouse"] == "Outlet"
    assert result["variant_extra"] is None


def test_merge_unmatched_has_empty_photo_fields():
    product = {
        "brand": "WIM CYCLE", "model_name": "ELENA MEOW 16 FA", "color_code": "P", "variant_extra": None,
        "category": "BIKE-KIDS 16-18\"", "warehouse": "Outlet", "price": None,
        "sizes": [{"size_code": "09B", "article_code": 2, "quantity": 9, "ordered_quantity": None, "price": None}],
    }

    result = merge_unmatched(product)

    assert result["id"] == "wim-cycle-elena-meow-16-fa-p"
    assert result["images"] == []
    assert result["colors"] == []
    assert result["specs"] == {}
    assert result["matched"] is False
    assert result["variant_extra"] is None


def test_merge_unmatched_passes_through_variant_extra():
    product = {
        "brand": "CYCLISTE", "model_name": "TIRE PRO ONE 700X32C", "color_code": None,
        "variant_extra": "TLE, F, B", "category": "TIRE", "warehouse": "Outlet", "price": 250000,
        "sizes": [{"size_code": None, "article_code": 1, "quantity": 3, "ordered_quantity": None, "price": 250000}],
    }

    result = merge_unmatched(product)

    assert result["variant_extra"] == "TLE, F, B"
