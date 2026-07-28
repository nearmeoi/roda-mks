import type { Product, ProductSize } from "./types";

export function formatPrice(price: number | null): string {
  if (price === null) return "Hubungi toko";
  return `Rp ${price.toLocaleString("id-ID").replace(/,/g, ".")}`;
}

export function totalQuantity(sizes: ProductSize[]): number {
  return sizes.reduce((sum, s) => sum + s.quantity, 0);
}

export function totalOrderedQuantity(sizes: ProductSize[]): number {
  return sizes.reduce((sum, s) => sum + (s.ordered_quantity ?? 0), 0);
}

export function primaryArticleCode(sizes: ProductSize[]): number {
  return sizes[0].article_code;
}

// Y counts as a vowel here so ordinary words like "FLY" title-case correctly
// ("Fly") instead of being mistaken for an acronym.
const VOWELS = /[aeiouyAEIOUY]/;

// Shimano/Polygon/SRAM spec-tier codes that are short enough to contain a
// vowel and so would otherwise slip past the "no vowel = acronym" check
// below and get wrongly title-cased ("Da", "Af", "Axs").
const KNOWN_ACRONYMS = new Set(["DA", "AF", "GS", "PW", "EA", "AXS"]);

// Outlet source data is raw ALL CAPS ("STRATTOS 7", "BIKE-ROAD DROP BAR"),
// which reads like a spreadsheet export rather than product copy. Convert to
// natural title case for display, but leave anything that looks like a code
// (contains a digit, e.g. "700C", or "IFDR8150F") or an acronym (no vowel,
// e.g. "MTB", "SLX", "XTR", "GRX") untouched -- those are correct as-is and
// would look wrong lowercased ("Mtb", "Slx"). Digit-check intentionally
// covers the whole token rather than trying to split "IFDR8150F" into a
// word part + number part: this dataset's codes mix letters and digits too
// unpredictably (IR71202DRRDSC170A) for that split to be reliable.
function titleCaseWord(word: string): string {
  if (!word) return word;
  if (/\d/.test(word)) return word;
  if (KNOWN_ACRONYMS.has(word.toUpperCase())) return word;
  if (word.length >= 2 && !VOWELS.test(word)) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Split on space, hyphen, AND slash so multi-part tokens like "PUTIH/BRONZE"
// or "BIKE-ROAD" get each part cased independently. This also makes the
// function safe to run on strings that are already well-cased (colors and
// specs come from the catalog scrape, not the raw outlet sheet, and are
// often already "Putih/Bronze") -- word-by-word casing is idempotent, but
// treating "Putih/Bronze" as a single token would have flattened it to
// "Putih/bronze", destroying the capital B.
export function titleCase(text: string): string {
  return text
    .split(" ")
    .map((chunk) =>
      chunk
        .split("-")
        .map((part) =>
          part
            .split("/")
            .map((piece) => piece.split(".").map(titleCaseWord).join("."))
            .join("/")
        )
        .join("-")
    )
    .join(" ");
}

export interface StockStatus {
  label: string;
  dotColor: string;
}

export function getStockStatus(qty: number): StockStatus {
  if (qty <= 0) return { label: "Habis", dotColor: "oklch(58% 0.22 25)" };
  if (qty < 5) return { label: "Terbatas", dotColor: "oklch(75% 0.16 80)" };
  return { label: "Tersedia", dotColor: "oklch(64% 0.17 145)" };
}

export function getColorDisplay(product: Pick<Product, "colors" | "color_label">): string | null {
  if (product.colors && product.colors.length > 0) return product.colors.map(titleCase).join(", ");
  if (product.color_label) return titleCase(product.color_label);
  return null;
}
