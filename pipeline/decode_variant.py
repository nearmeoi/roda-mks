"""
Decodes variant tokens embedded in model names, color codes, and size codes.
- BIKE categories: wheel sizes and standard color abbreviations in model names.
- PAA categories: shoes/apparel size cleaning, drivetrain speeds, tire sizes, and explicit/full color labels.
- Clean model names: strips internal factory generation/revision codes, colors, and wheel size tokens for display.
"""

import re

WHEEL_SIZES = {"12", "14", "16", "18", "20", "22", "24", "26", "27", "29", "700", "700C"}

COLOR_WORDS = {
    "blk": "Hitam", "black": "Hitam",
    "wht": "Putih", "white": "Putih",
    "gry": "Abu-abu", "grey": "Abu-abu", "gray": "Abu-abu",
    "blu": "Biru", "blue": "Biru",
    "grn": "Hijau", "green": "Hijau",
    "red": "Merah",
    "slv": "Silver", "silver": "Silver",
    "pnk": "Pink", "pink": "Pink",
    "brz": "Bronze", "bronze": "Bronze",
    "org": "Oranye", "orange": "Oranye",
    "ylw": "Kuning", "yellow": "Kuning",
    "gld": "Gold", "gold": "Gold",
    "nvy": "Navy", "navy": "Navy",
    "ppl": "Ungu", "purple": "Ungu",
}

BIKE_FACTORY_CODES = {
    "FA", "CA", "EA", "DA", "GA", "SA", "HS", "LS", "AA", "CB", "BA", "RA", "ID", "00", "0",
    "08A", "09B", "11A", "13B", "14A", "21A", "1L", "2L", "1P", "1N", "1H",
    "U", "V", "X", "Y", "Z", "E", "G", "S", "B", "K", "N", "P", "H", "CLS"
}

BIKE_STRIP_TOKENS = {
    "BLK", "WHT", "GRY", "GREY", "GRAY", "BLU", "BLUE", "GRN", "GREEN", "RED", "SLV", "SILVER",
    "PNK", "PINK", "BRZ", "BRONZE", "ORG", "ORANGE", "YLW", "YELLOW", "GLD", "GOLD", "NVY", "NAVY", "PPL", "PURPLE",
    "12", "14", "16", "18", "20", "22", "24", "26", "27", "27.5", "29", "700", "700C"
}

# --- PAA Specific Dictionaries ---

PAA_SHOES_SIZES = {
    "360": "36", "370": "37", "380": "38", "390": "39", "400": "40",
    "410": "41", "420": "42", "430": "43", "440": "44", "450": "45", "460": "46"
}

PAA_APPAREL_SIZES = {
    "S1": "S", "S2": "XS",
    "M1": "M",
    "L1": "L", "L2": "XL", "L3": "XXL"
}

PAA_DRIVETRAIN_SPEEDS = {
    "11": "11 Speed", "12": "12 Speed", "10": "10 Speed", "9": "9 Speed",
    "8": "8 Speed", "7": "7 Speed", "3": "3 Speed", "2": "2 Speed"
}

PAA_POSITIONS = {
    "F": "Depan", "R": "Belakang", "L": "Kiri"
}

PAA_COLOR_CODES = {
    "B": "Hitam", "BLK": "Hitam", "BLACK": "Hitam",
    "W": "Putih", "WHT": "Putih", "WHITE": "Putih",
    "R": "Merah", "RED": "Merah",
    "G": "Hijau", "GRN": "Hijau", "GREEN": "Hijau",
    "BL": "Biru", "BLU": "Biru", "BLUE": "Biru",
    "BR": "Cokelat", "BROWN": "Cokelat",
    "BE": "Beige",
    "Y": "Kuning", "YLW": "Kuning", "YELLOW": "Kuning",
    "OR": "Oranye", "ORG": "Oranye", "ORANGE": "Oranye",
    "PK": "Pink", "PNK": "Pink", "PINK": "Pink",
    "GY": "Abu-abu", "GRY": "Abu-abu", "GREY": "Abu-abu", "GRAY": "Abu-abu",
    "SL": "Silver", "SV": "Silver", "SLV": "Silver", "SILVER": "Silver",
    "NV": "Navy", "NVY": "Navy", "NAVY": "Navy",
}

FULL_COLOR_WORDS = {
    "BLACK": "Hitam", "WHITE": "Putih", "RED": "Merah", "GREEN": "Hijau",
    "BLUE": "Biru", "BROWN": "Cokelat", "YELLOW": "Kuning", "ORANGE": "Oranye",
    "PINK": "Pink", "GREY": "Abu-abu", "GRAY": "Abu-abu", "SILVER": "Silver",
    "NAVY": "Navy", "GOLD": "Gold", "PURPLE": "Ungu", "CREAM": "Krim"
}

APPAREL_CATS = {
    "HELMET", "GLOVES", "JERSEY", "SHORT/PANTS",
    "SHIRT/T-SHIRT/POLO SHIRT", "ARM COVER", "BODY PROTECTOR", "OTHER BIKERS APPAREL"
}

DRIVETRAIN_CATS = {
    "SHIFTER", "CHAIN & PART OF CHAIN", "SPROCKET FREEWHEEL",
    "REAR DERAILLEUR", "FRONT DERAILLEUR", "DERAILLEUR GROUP SET", "CHAINWHEEL AND PARTS"
}

POSITION_CATS = {
    "BRAKE-CALIPER", "BRAKE-DISC BRK HYDRO", "BRAKE-DISC BRK MECH", "BRAKE-LEVER", "SHIFTER"
}


def extract_wheel_size(model_name: str) -> str | None:
    for token in model_name.split():
        if token.upper() in WHEEL_SIZES:
            return "700C" if token.upper() in ("700", "700C") else f'{token}"'
    return None


def extract_color_label(model_name: str) -> str | None:
    labels: list[str] = []
    for token in model_name.split():
        for part in token.split("/"):
            label = COLOR_WORDS.get(part.lower())
            if label and label not in labels:
                labels.append(label)
    return "/".join(labels) if labels else None


def decode_bike_variant(model_name: str, category: str) -> tuple[str | None, str | None]:
    if not category.startswith("BIKE"):
        return None, None
    return extract_wheel_size(model_name), extract_color_label(model_name)


def decode_paa_size_code(size_code: str | None, category: str) -> str | None:
    if not size_code:
        return None
    sz_str = str(size_code).strip()
    cat_upper = category.upper()

    if "FOOTWEAR" in cat_upper and sz_str in PAA_SHOES_SIZES:
        return PAA_SHOES_SIZES[sz_str]
    elif cat_upper in APPAREL_CATS and sz_str in PAA_APPAREL_SIZES:
        return PAA_APPAREL_SIZES[sz_str]
    elif cat_upper in DRIVETRAIN_CATS and sz_str in PAA_DRIVETRAIN_SPEEDS:
        return PAA_DRIVETRAIN_SPEEDS[sz_str]
    elif cat_upper in POSITION_CATS and sz_str in PAA_POSITIONS:
        return PAA_POSITIONS[sz_str]
    return size_code


def decode_paa_variant(model_name: str, category: str, color_code: str | None = None) -> tuple[str | None, str | None]:
    if category.startswith("BIKE"):
        return None, None

    cat_upper = category.upper()
    col_str = str(color_code).strip() if color_code else None

    decoded_color = None
    decoded_spec = None

    if col_str and col_str in PAA_COLOR_CODES:
        decoded_color = PAA_COLOR_CODES[col_str]
    else:
        found = []
        tokens = re.split(r'[\s/,-]+', model_name.upper())
        for t in tokens:
            if t in FULL_COLOR_WORDS and FULL_COLOR_WORDS[t] not in found:
                found.append(FULL_COLOR_WORDS[t])
        if found:
            decoded_color = "/".join(found)

    if cat_upper in DRIVETRAIN_CATS:
        sp_match = re.search(r'\b(\d{1,2})\s*SP\b', model_name.upper())
        if sp_match:
            decoded_spec = f"{sp_match.group(1)} Speed"

    if cat_upper in ("TIRE", "TUBE"):
        tire_match = re.search(r'\b(700X\d{2}C?|\d{2}\.?\d?X\d\.\d{1,2})\b', model_name.upper())
        if tire_match:
            decoded_spec = tire_match.group(1)

    return decoded_spec, decoded_color


def decode_variant(model_name: str, category: str, color_code: str | None = None) -> tuple[str | None, str | None]:
    if category.startswith("BIKE"):
        return decode_bike_variant(model_name, category)
    return decode_paa_variant(model_name, category, color_code)


def clean_bike_model_name(model_name: str) -> str:
    parts = model_name.split()
    cleaned = []
    for p in parts:
        p_upper = p.upper()
        subparts = p_upper.split("/")
        if all(sp in BIKE_STRIP_TOKENS for sp in subparts):
            continue
        if p_upper in BIKE_FACTORY_CODES or p_upper in BIKE_STRIP_TOKENS:
            continue
        cleaned.append(p)
    result = " ".join(cleaned).strip()
    return result if result else model_name


def clean_paa_model_name(model_name: str) -> str:
    cleaned = re.sub(r'\s+\b(00|0)\b$', '', model_name).strip()
    return cleaned


def clean_model_name(model_name: str, category: str) -> str:
    if category.startswith("BIKE"):
        return clean_bike_model_name(model_name)
    return clean_paa_model_name(model_name)
