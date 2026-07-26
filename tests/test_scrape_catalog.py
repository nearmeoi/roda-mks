import os
from pipeline.scrape_catalog import (
    extract_product_links,
    get_next_page_url,
    extract_product_detail,
)

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def _read_fixture(name):
    with open(os.path.join(FIXTURES, name), encoding="utf-8") as f:
        return f.read()


def test_extract_product_links():
    html = _read_fixture("sample_category_page.html")
    links = extract_product_links(html)
    assert len(links) == 4
    assert links[0] == {
        "url": "https://www.rodalink.com/id/polygon-sepeda-balap-strattos-7-503769.html",
        "name": "Polygon Sepeda Balap Strattos 7",
    }
    assert links[3]["name"] == "Polygon Sepeda Balap Strattos 6"


def test_get_next_page_url_returns_page_2():
    html = _read_fixture("sample_category_page.html")
    assert get_next_page_url(html) == \
        "https://www.rodalink.com/id/sepeda/sepeda-balap-road-bike.html?p=2"


def test_get_next_page_url_none_on_last_page():
    html = "<div class='pages'><li class='item current'>1</li></div>"
    assert get_next_page_url(html) is None


def test_extract_product_detail():
    html = _read_fixture("sample_product_detail.html")
    detail = extract_product_detail(html, "https://www.rodalink.com/id/polygon-sepeda-balap-strattos-7-503769.html")

    assert detail["name"] == "Polygon Sepeda Balap Strattos 7"
    assert detail["price"] == 25000000
    assert detail["brand"] == "Polygon"
    assert detail["colors"] == ["Black"]
    assert detail["sizes"] == ["XS", "S", "M"]
    assert detail["specs"]["Frame"] == "CARBON ENDURANCE"
    assert detail["specs"]["Weight"] == "8.9 kg (Size M)"
    assert len(detail["images"]) == 7
    assert all(img.startswith("https://media.rodalink.com/catalog/product/") for img in detail["images"])
    assert len(set(detail["images"])) == 7  # deduped
