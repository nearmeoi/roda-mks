import openpyxl


def parse_description(description: str) -> dict:
    parts = [p.strip() for p in description.split(",")]
    if len(parts) != 3:
        raise ValueError(f"expected 3 comma-separated parts, got {len(parts)}: {description!r}")
    model_name, size_code, color_code = parts
    return {"model_name": model_name, "size_code": size_code, "color_code": color_code}


def load_bike_rows(xlsx_path: str) -> list[dict]:
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb.active
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        warehouse, article_code, description, brand, category, quantity, _ordered, price = row
        if article_code is None or category is None or not category.startswith("BIKE"):
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
            "quantity": quantity if quantity is not None else 0,
            "price": price,
            **parsed,
        })
    return rows
