import openpyxl


def parse_description(description: str) -> dict:
    description = description.strip()
    if not description:
        raise ValueError("empty description")

    parts = [p.strip() for p in description.split(",")]
    model_name = parts[0]
    size_code = None
    color_code = None
    variant_extra = None

    if len(parts) == 2:
        color_code = parts[1]
    elif len(parts) == 3:
        size_code, color_code = parts[1], parts[2]
    elif len(parts) > 3:
        variant_extra = ", ".join(parts[1:])

    return {
        "model_name": model_name,
        "size_code": size_code,
        "color_code": color_code,
        "variant_extra": variant_extra,
    }


def _load_rows(xlsx_path: str, category_matches) -> list[dict]:
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb.active
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        warehouse, article_code, description, brand, category, quantity, ordered_quantity, price = row
        if article_code is None or category is None or not category_matches(category):
            continue
        try:
            parsed = parse_description(description or "")
        except ValueError as exc:
            print(f"[parse_stock] skipping article {article_code}: {exc}")
            continue
        rows.append({
            "article_code": article_code,
            "brand": brand,
            "category": category,
            "warehouse": warehouse,
            "quantity": quantity if quantity is not None else 0,
            "ordered_quantity": ordered_quantity,
            "price": price,
            **parsed,
        })
    return rows


def load_bike_rows(xlsx_path: str) -> list[dict]:
    return _load_rows(xlsx_path, lambda category: category.startswith("BIKE"))


def load_paa_rows(xlsx_path: str) -> list[dict]:
    return _load_rows(xlsx_path, lambda category: not category.startswith("BIKE"))
