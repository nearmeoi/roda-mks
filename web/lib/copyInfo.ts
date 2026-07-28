export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

const GROUPSET_KEYS = ["Shifter", "Rear Derailleur", "Crank Set", "Cassette"];

export function getGroupsetLines(specs: Record<string, string>): string[] {
  const lines: string[] = [];
  for (const key of GROUPSET_KEYS) {
    if (specs[key]) {
      lines.push(`${key}: ${truncate(specs[key], 60)}`);
      if (lines.length >= 2) break;
    }
  }
  return lines;
}

const PAA_BOILERPLATE_KEYS = new Set([
  "Brand",
  "What's in the box",
  "Genre",
  "Weight",
  "Note",
  "Rentang Usia",
]);

export function getPaaSpecLines(specs: Record<string, string>): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(specs)) {
    if (PAA_BOILERPLATE_KEYS.has(key)) continue;
    lines.push(`${key}: ${truncate(value, 60)}`);
    if (lines.length >= 2) break;
  }
  return lines;
}

export function getKeySpecLines(product: {
  category: string;
  specs: Record<string, string>;
}): { label: string; lines: string[] } {
  const isBike = product.category.toUpperCase().startsWith("BIKE");
  return {
    label: isBike ? "Groupset" : "Spesifikasi",
    lines: isBike ? getGroupsetLines(product.specs) : getPaaSpecLines(product.specs),
  };
}

// The scraped Features data has bike bullets where a short title runs
// directly into its sentence with no space ("...2x12 SpeedRasakan
// perpindahan..."). Insert a space at any lowercase-to-uppercase letter
// boundary, which fixes that specific case and is a no-op on already-clean
// sentences (PAA Features entries don't have this squish).
export function cleanFeatureBullet(bullet: string): string {
  const spaced = bullet.trim().replace(/([a-z])([A-Z])/g, "$1 $2");
  return truncate(spaced, 80);
}

export function getKelebihanBullets(specs: Record<string, string>): string[] {
  const raw = specs["Features"];
  if (!raw) return [];
  return raw.split(" | ").map(cleanFeatureBullet).slice(0, 2);
}
