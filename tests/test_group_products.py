from pipeline.group_products import group_rows


def test_group_rows_merges_same_model_and_color():
    rows = [
        {"article_code": 503202002, "brand": "POLYGON", "category": "BIKE-ROAD DROP BAR",
         "warehouse": "Outlet", "quantity": 2, "ordered_quantity": None, "price": 6700000,
         "model_name": "STRATTOS S2 700C DA", "size_code": "S1", "color_code": "1L", "variant_extra": None},
        {"article_code": 503202003, "brand": "POLYGON", "category": "BIKE-ROAD DROP BAR",
         "warehouse": "Outlet", "quantity": 2, "ordered_quantity": 5, "price": 6700000,
         "model_name": "STRATTOS S2 700C DA", "size_code": "M", "color_code": "1L", "variant_extra": None},
        {"article_code": 503782004, "brand": "POLYGON", "category": "BIKE-ROAD DROP BAR",
         "warehouse": "Outlet", "quantity": 1, "ordered_quantity": None, "price": 21000000,
         "model_name": "STRATTOS 6 WHT/BRZ FA 700", "size_code": "M", "color_code": "0", "variant_extra": None},
    ]

    groups = group_rows(rows)

    assert len(groups) == 2
    strattos_s2 = next(g for g in groups if g["model_name"] == "STRATTOS S2 700C DA")
    assert strattos_s2["brand"] == "POLYGON"
    assert strattos_s2["color_code"] == "1L"
    assert strattos_s2["variant_extra"] is None
    assert strattos_s2["category"] == "BIKE-ROAD DROP BAR"
    assert strattos_s2["warehouse"] == "Outlet"
    assert strattos_s2["price"] == 6700000
    assert strattos_s2["sizes"] == [
        {"size_code": "S1", "article_code": 503202002, "quantity": 2, "ordered_quantity": None, "price": 6700000},
        {"size_code": "M", "article_code": 503202003, "quantity": 2, "ordered_quantity": 5, "price": 6700000},
    ]


def test_group_rows_uses_first_non_null_price():
    rows = [
        {"article_code": 1, "brand": "POLYGON", "category": "BIKE-ELECTRIC",
         "warehouse": "Outlet", "quantity": 1, "ordered_quantity": None, "price": None,
         "model_name": "SISKIU HE-P ID DA 29", "size_code": "S1", "color_code": "P", "variant_extra": None},
        {"article_code": 2, "brand": "POLYGON", "category": "BIKE-ELECTRIC",
         "warehouse": "Outlet", "quantity": 1, "ordered_quantity": None, "price": 15000000,
         "model_name": "SISKIU HE-P ID DA 29", "size_code": "M", "color_code": "P", "variant_extra": None},
    ]

    groups = group_rows(rows)

    assert len(groups) == 1
    assert groups[0]["price"] == 15000000


def test_group_rows_keeps_different_variant_extra_separate():
    rows = [
        {"article_code": 1, "brand": "CYCLISTE", "category": "TIRE",
         "warehouse": "Outlet", "quantity": 3, "ordered_quantity": None, "price": 250000,
         "model_name": "TIRE PRO ONE 700X32C", "size_code": None, "color_code": None,
         "variant_extra": "TLE, F, B"},
        {"article_code": 2, "brand": "CYCLISTE", "category": "TIRE",
         "warehouse": "Outlet", "quantity": 2, "ordered_quantity": None, "price": 250000,
         "model_name": "TIRE PRO ONE 700X32C", "size_code": None, "color_code": None,
         "variant_extra": "TLE, R, B"},
    ]

    groups = group_rows(rows)

    assert len(groups) == 2
    assert {g["variant_extra"] for g in groups} == {"TLE, F, B", "TLE, R, B"}


def test_group_rows_handles_paa_row_with_no_size_or_color():
    rows = [
        {"article_code": 721852, "brand": "HOZAN", "category": "TOOLS",
         "warehouse": "Outlet", "quantity": 1, "ordered_quantity": None, "price": 498000,
         "model_name": "TOOL SPOKE CUTTER C-216", "size_code": None, "color_code": None,
         "variant_extra": None},
    ]

    groups = group_rows(rows)

    assert len(groups) == 1
    assert groups[0]["sizes"] == [
        {"size_code": None, "article_code": 721852, "quantity": 1, "ordered_quantity": None, "price": 498000},
    ]
