"""
Decodes only the tokens embedded in Description model text that we can
confidently identify: wheel sizes and standard color abbreviations. A
recurring 2-letter code (FA, CA, EA, DA, GA, SA, HS, LS, AA, CB, BA, RA, ID)
and single letters (Y, U, V, X) also appear in most model names, but their
meaning is an unknown internal Polygon/Wimcycle code -- intentionally left
undecoded rather than guessed.
"""

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
    """Only decode for BIKE-* categories: PAA numeric/word tokens collide with
    unrelated meanings (fluid ounces, speed counts, scent names, ...) that make
    the same heuristic unsafe outside bike model names."""
    if not category.startswith("BIKE"):
        return None, None
    return extract_wheel_size(model_name), extract_color_label(model_name)
