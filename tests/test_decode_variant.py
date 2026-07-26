from pipeline.decode_variant import (
    decode_bike_variant,
    decode_paa_variant,
    decode_paa_size_code,
    extract_color_label,
    extract_wheel_size,
    clean_model_name,
)


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
    wheel_size, color_label = decode_bike_variant("ECOTECH CLNER & DEGREASER 12 OZ", "LUBRICANT/MAINTENANCE")
    assert wheel_size is None
    assert color_label is None


def test_decode_paa_size_code_shoes():
    assert decode_paa_size_code("440", "FOOTWEAR") == "44"
    assert decode_paa_size_code("430", "FOOTWEAR") == "43"


def test_decode_paa_size_code_apparel_and_helmets():
    assert decode_paa_size_code("S1", "HELMET") == "S"
    assert decode_paa_size_code("L2", "JERSEY") == "XL"
    assert decode_paa_size_code("S2", "GLOVES") == "XS"


def test_decode_paa_size_code_drivetrain_and_position():
    assert decode_paa_size_code("11", "SHIFTER") == "11 Speed"
    assert decode_paa_size_code("F", "BRAKE-CALIPER") == "Depan"


def test_decode_paa_variant_drivetrain_speed_and_color():
    spec, col = decode_paa_variant("CHAIN ICNHG60111126Q 11SP", "CHAIN & PART OF CHAIN", "B")
    assert spec == "11 Speed"
    assert col == "Hitam"


def test_decode_paa_variant_tire_size():
    spec, col = decode_paa_variant("TIRE ONE 700X30C P", "TIRE")
    assert spec == "700X30C"
    assert col is None


def test_clean_model_name_bikes():
    assert clean_model_name("STRATTOS 7 BLK FA 700", "BIKE-ROAD DROP BAR") == "STRATTOS 7"
    assert clean_model_name("CASCADE 5 FA 27", "BIKE-MTB HARD TAIL") == "CASCADE 5"
    assert clean_model_name("ELENA MEOW 16 FA", "BIKE-KIDS 16-18\"") == "ELENA MEOW"
    assert clean_model_name("GESTALT 1 700C U RED", "BIKE-ROAD DROP BAR") == "GESTALT 1"
