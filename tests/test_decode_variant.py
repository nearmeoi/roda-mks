from pipeline.decode_variant import decode_bike_variant, extract_color_label, extract_wheel_size


def test_extract_wheel_size_from_inch_token():
    assert extract_wheel_size("RAZOR MICRO CA 20") == '20"'


def test_extract_wheel_size_normalizes_700_and_700c():
    assert extract_wheel_size("STRATTOS 7 BLK FA 700") == "700C"
    assert extract_wheel_size("STRATTOS S4 700C DA") == "700C"


def test_extract_wheel_size_ignores_unrelated_numbers():
    assert extract_wheel_size("CASCADE 5 FA 27").endswith('27"')
    assert extract_wheel_size("RAYZ 2 EA 27") == '27"'


def test_extract_wheel_size_returns_none_when_absent():
    assert extract_wheel_size("RAZOR PRO XL CA") is None


def test_extract_wheel_size_finds_size_not_at_the_end():
    assert extract_wheel_size("COLLOSUS N8E CA 29 CLS 1") == '29"'


def test_extract_color_label_single_abbreviation():
    assert extract_color_label("STRATTOS 7 BLK FA 700") == "Hitam"


def test_extract_color_label_spelled_out_word():
    assert extract_color_label("CASCADE 5 WHT FA 27") == "Putih"


def test_extract_color_label_slash_combo():
    assert extract_color_label("STRATTOS 6 WHT/BRZ FA 700") == "Putih/Bronze"


def test_extract_color_label_two_separate_tokens():
    assert extract_color_label("FAIRFAX 1 700C V BLUE GREY") == "Biru/Abu-abu"
    assert extract_color_label("DSX 1 700C Y GREEN SILVER") == "Hijau/Silver"


def test_extract_color_label_returns_none_for_unrecognized_tokens():
    assert extract_color_label("STRATTOS S4 700C DA") is None
    assert extract_color_label("FAIRFAX 1 700C Y ROARANGE") is None


def test_decode_bike_variant_decodes_for_bike_categories():
    wheel_size, color_label = decode_bike_variant("STRATTOS 7 BLK FA 700", "BIKE-ROAD DROP BAR")
    assert wheel_size == "700C"
    assert color_label == "Hitam"


def test_decode_bike_variant_skips_non_bike_categories():
    # "12" here means fluid ounces, not a wheel size -- decoding must not run for PAA
    wheel_size, color_label = decode_bike_variant("ECOTECH CLNER & DEGREASER 12 OZ", "LUBRICANT/MAINTENANCE")
    assert wheel_size is None
    assert color_label is None
