from pipeline.group_products import group_rows


def test_group_rows_merges_same_model_and_color():
    rows = [
        {"article_code": 503202002, "brand": "POLYGON", "category": "BIKE-ROAD DROP BAR",
         "warehouse": "Outlet", "quantity": 2, "ordered_quantity": None, "price": 6700000,
         "model_name": "STRATTOS S2 700C DA", "size_code": "S1", "color_code": "1L"},
        {"article_code": 503202003, "brand": "POLYGON", "category": "BIKE-ROAD DROP BAR",
         "warehouse": "Outlet", "quantity": 2, "ordered_quantity": 5, "price": 6700000,
         "model_name": "STRATTOS S2 700C DA", "size_code": "M", "color_code": "1L"},
        {"article_code": 503782004, "brand": "POLYGON", "category": "BIKE-ROAD DROP BAR",
         "warehouse": "Outlet", "quantity": 1, "ordered_quantity": None, "price": 21000000,
         "model_name": "STRATTOS 6 WHT/BRZ FA 700", "size_code": "M", "color_code": "0"},
    ]

    groups = group_rows(rows)

    assert len(groups) == 2
    strattos_s2 = next(g for g in groups if g["model_name"] == "STRATTOS S2 700C DA")
    assert strattos_s2["brand"] == "POLYGON"
    assert strattos_s2["color_code"] == "1L"
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
         "model_name": "SISKIU HE-P ID DA 29", "size_code": "S1", "color_code": "P"},
        {"article_code": 2, "brand": "POLYGON", "category": "BIKE-ELECTRIC",
         "warehouse": "Outlet", "quantity": 1, "ordered_quantity": None, "price": 15000000,
         "model_name": "SISKIU HE-P ID DA 29", "size_code": "M", "color_code": "P"},
    ]

    groups = group_rows(rows)

    assert len(groups) == 1
    assert groups[0]["price"] == 15000000
