import type { Product } from "./types";
import { titleCase } from "./format";

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

export function getProductInfoLines(product: Product): string[] {
  const lines: string[] = [];
  const specs = product.specs || {};
  const categoryUpper = (product.category || "").toUpperCase();
  const isBike = categoryUpper.startsWith("BIKE");

  // 1. Genre / Kategori
  let genre = specs["Genre"];
  if (!genre && isBike) {
    genre = titleCase(product.category.replace(/^BIKE-/i, ""));
  }
  if (genre) {
    lines.push(`Genre / Kategori: ${genre}`);
  }

  // 2. Warna Ready
  let colorStr: string | null = null;
  if (product.colors && product.colors.length > 0) {
    colorStr = product.colors.map(titleCase).join(", ");
  } else if (product.color_label) {
    colorStr = titleCase(product.color_label);
  }
  if (colorStr) {
    lines.push(`Warna: ${colorStr}`);
  }

  // 3. Ukuran Ready
  const readySizes: string[] = [];
  for (const s of product.sizes || []) {
    if (s.quantity > 0) {
      const code = s.size_code && s.size_code.toUpperCase() !== "NONE" ? s.size_code : "All Size";
      if (!readySizes.includes(code)) {
        readySizes.push(code);
      }
    }
  }
  if (readySizes.length > 0) {
    lines.push(`Ukuran Ready: ${readySizes.join(", ")}`);
  }

  // 4. Bobot / Weight
  const weight = specs["Weight"] || specs["Max Weight"];
  if (weight) {
    lines.push(`Bobot: ${weight}`);
  }

  return lines;
}

const BIKE_SPEC_MAPPINGS: Array<{ label: string; keys: string[] }> = [
  { label: "Frame / Material", keys: ["Frame", "Material"] },
  { label: "Speed", keys: ["Speed"] },
  { label: "Shifter", keys: ["Shifter"] },
  { label: "Rear Derailleur", keys: ["Rear Derailleur"] },
  { label: "Front Derailleur", keys: ["Front Derailleur"] },
  { label: "Crank Set", keys: ["Crank Set"] },
  { label: "Cassette", keys: ["Cassette"] },
  { label: "Rem", keys: ["Brake", "Brake Lever"] },
  { label: "Ukuran Roda", keys: ["Wheel size", "Wheel Set"] },
  { label: "Ban", keys: ["Tire"] },
];

const NON_BIKE_SKIP_KEYS = new Set([
  "Brand",
  "What's in the box",
  "Genre",
  "Weight",
  "Note",
  "Rentang Usia",
  "Features",
]);

export function getDetailedSpecLines(product: Product): { label: string; lines: string[] } {
  const specs = product.specs || {};
  const isBike = (product.category || "").toUpperCase().startsWith("BIKE");
  const lines: string[] = [];

  if (isBike) {
    for (const mapping of BIKE_SPEC_MAPPINGS) {
      let val: string | undefined;
      for (const k of mapping.keys) {
        if (specs[k]) {
          val = specs[k];
          break;
        }
      }
      if (!val && mapping.label === "Ukuran Roda" && product.wheel_size) {
        val = product.wheel_size;
      }
      if (val) {
        lines.push(`${mapping.label}: ${truncate(val, 75)}`);
      }
    }
    return { label: "Spesifikasi", lines };
  } else {
    for (const [key, value] of Object.entries(specs)) {
      if (NON_BIKE_SKIP_KEYS.has(key)) continue;
      lines.push(`${key}: ${truncate(value, 75)}`);
      if (lines.length >= 6) break;
    }
    return { label: "Spesifikasi", lines };
  }
}

export function cleanFeatureBullet(bullet: string): string {
  const spaced = bullet.trim().replace(/([a-z])([A-Z])/g, "$1 $2");
  return truncate(spaced, 90);
}

export function getKelebihanBullets(specs: Record<string, string>): string[] {
  if (!specs) return [];

  // 1. If explicit Features key exists
  const rawFeatures = specs["Features"];
  if (rawFeatures) {
    return rawFeatures.split(" | ").map(cleanFeatureBullet).slice(0, 3);
  }

  // 2. Fallback to PAA summary keys
  const paaSummaryKeys = [
    "Frame & Fork",
    "Cockpit & Kontrol",
    "Drivetrain",
    "Wheelset & Tire",
    "Kenyamanan & Keamanan",
  ];
  const bullets: string[] = [];
  for (const k of paaSummaryKeys) {
    if (specs[k]) {
      bullets.push(cleanFeatureBullet(`${k}: ${specs[k]}`));
      if (bullets.length >= 3) break;
    }
  }
  return bullets;
}
