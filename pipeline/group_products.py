def group_rows(rows: list[dict]) -> list[dict]:
    groups: dict[tuple, dict] = {}
    for row in rows:
        key = (row["brand"], row["model_name"], row["color_code"], row["variant_extra"])
        if key not in groups:
            groups[key] = {
                "brand": row["brand"],
                "model_name": row["model_name"],
                "color_code": row["color_code"],
                "variant_extra": row["variant_extra"],
                "category": row["category"],
                "warehouse": row["warehouse"],
                "price": None,
                "sizes": [],
            }
        group = groups[key]
        group["sizes"].append({
            "size_code": row["size_code"],
            "article_code": row["article_code"],
            "quantity": row["quantity"],
            "ordered_quantity": row["ordered_quantity"],
            "price": row["price"],
        })
        if group["price"] is None and row["price"] is not None:
            group["price"] = row["price"]
    return list(groups.values())
