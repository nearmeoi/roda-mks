import os
import openpyxl
import pytest
from pipeline.parse_stock import parse_description, load_bike_rows


def test_parse_description_simple():
    result = parse_description("OOSTEN DA 24, 14A, L")
    assert result == {"model_name": "OOSTEN DA 24", "size_code": "14A", "color_code": "L"}


def test_parse_description_multiword_model():
    result = parse_description("STRATTOS S2 700C DA, S1, 1L")
    assert result == {
        "model_name": "STRATTOS S2 700C DA",
        "size_code": "S1",
        "color_code": "1L",
    }


def test_parse_description_rejects_wrong_shape():
    with pytest.raises(ValueError):
        parse_description("NOT ENOUGH COMMAS HERE")


def test_load_bike_rows_filters_and_parses(tmp_path):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Warehouse", "Article Code", "Description", "Brand",
               "Merchandise Category", "Quantity", "Ordered Quantity", "Price"])
    ws.append(["Outlet", 503200001, "STRATTOS S4 700C DA, S1, Z", "POLYGON",
               "BIKE-ROAD DROP BAR", 1, 2, 10600000])
    ws.append(["Outlet", 503200002, "STRATTOS S4 700C DA, M, Z", "POLYGON",
               "BIKE-ROAD DROP BAR", 1, None, 10600000])
    ws.append(["Outlet", 999999999, "SOME SHOE, 42, BLK", "NIKE",
               "FOOTWEAR", 5, None, 500000])
    xlsx_path = tmp_path / "sample.xlsx"
    wb.save(xlsx_path)

    rows = load_bike_rows(str(xlsx_path))

    assert len(rows) == 2
    assert rows[0] == {
        "article_code": 503200001,
        "brand": "POLYGON",
        "category": "BIKE-ROAD DROP BAR",
        "warehouse": "Outlet",
        "quantity": 1,
        "ordered_quantity": 2,
        "price": 10600000,
        "model_name": "STRATTOS S4 700C DA",
        "size_code": "S1",
        "color_code": "Z",
    }
    assert rows[1]["ordered_quantity"] is None


def test_load_bike_rows_skips_unparseable_description(tmp_path, capsys):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Warehouse", "Article Code", "Description", "Brand",
               "Merchandise Category", "Quantity", "Ordered Quantity", "Price"])
    ws.append(["Outlet", 1, "BROKEN DESCRIPTION NO COMMAS", "POLYGON",
               "BIKE-MTB RIGID FRAME", 1, None, 1000000])
    xlsx_path = tmp_path / "sample.xlsx"
    wb.save(xlsx_path)

    rows = load_bike_rows(str(xlsx_path))

    assert rows == []
    assert "1" in capsys.readouterr().out
