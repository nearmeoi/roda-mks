# Concise Copy-Info Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the WhatsApp share text (`formatWhatsAppMessage`) to be short and to the point — name, price, a key-spec line, kelebihan when available, article code, stock — instead of the current full data dump.

**Architecture:** Pure, independently-testable selection/formatting logic lives in a new `web/lib/copyInfo.ts` (groupset field selection for bikes, boilerplate-filtered spec selection for PAA, `Features` bullet cleanup and truncation). `web/lib/copy.ts`'s `formatWhatsAppMessage` is rewritten to assemble the final message string from those helpers — no UI changes needed, since the "Salin seluruh info" button in `ProductDetailContent.tsx` already calls `formatWhatsAppMessage` and copies whatever it returns.

**Tech Stack:** TypeScript, Vitest (existing test runner).

## Global Constraints

- No fabricated "kelebihan" content — only shown when `product.specs["Features"]` genuinely exists (spec: "Non-goals"). **Current real catalog data has zero products with a `Features` field** (verified directly against `data/catalog.json`) — this logic is being built forward-compatible for when a future catalog scrape includes one, per explicit user decision. Tests for it use synthetic fixtures, not live data.
- Bikes (`category` starts with `"BIKE"`): groupset fields are `Shifter`, `Rear Derailleur`, `Crank Set`, `Cassette`, in that priority order, capped at 2 (spec: "Key spec selection").
- Non-bikes (PAA): skip `Brand`, `What's in the box`, `Genre`, `Weight`, `Note`, `Rentang Usia`; show up to 2 of whatever remains, in their existing order (spec: "Key spec selection").
- Spec values truncated to 60 characters; `Features` bullets truncated to 80 characters (spec: "Key spec selection", "Kelebihan formatting").
- No changes to the on-screen product detail page — only `formatWhatsAppMessage`'s output text changes (spec: "Non-goals").

---

### Task 1: Pure selection/formatting helpers in `web/lib/copyInfo.ts`

**Files:**
- Create: `web/lib/copyInfo.ts`
- Test: `web/__tests__/copyInfo.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `truncate(text: string, maxLen: number): string`
  - `getGroupsetLines(specs: Record<string, string>): string[]`
  - `getPaaSpecLines(specs: Record<string, string>): string[]`
  - `getKeySpecLines(product: { category: string; specs: Record<string, string> }): { label: string; lines: string[] }`
  - `cleanFeatureBullet(bullet: string): string`
  - `getKelebihanBullets(specs: Record<string, string>): string[]`

- [ ] **Step 1: Write the failing tests**

Create `web/__tests__/copyInfo.test.ts`. The bike fixture below is real data from `polygon-strattos-7-blk-fa-700-b` and the PAA fixture is real data from `xzone-helmet-kids-superhero-g` (both current, post-data-fix values in `web/lib/products.json`); the `Features`-based tests use synthetic data since no real product currently has that field.

```ts
import { describe, expect, it } from "vitest";
import {
  truncate,
  getGroupsetLines,
  getPaaSpecLines,
  getKeySpecLines,
  cleanFeatureBullet,
  getKelebihanBullets,
} from "@/lib/copyInfo";

describe("truncate", () => {
  it("returns the text unchanged when under the limit", () => {
    expect(truncate("Shimano 105", 60)).toBe("Shimano 105");
  });

  it("cuts and appends an ellipsis when over the limit", () => {
    const long = "SHIMANO SORA SL-R3000, 2x9-SPEED RAPID FIRE SHIFTER WITH EXTRA TEXT";
    const result = truncate(long, 20);
    expect(result.length).toBeLessThanOrEqual(21);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("getGroupsetLines", () => {
  const bikeSpecs: Record<string, string> = {
    Shifter: "SHIMANO 105 R7120, 2x12 SPEED",
    "Rear Derailleur": "SHIMANO 105 R7100",
    "Crank Set": "SHIMANO 105 FC-R7100",
    Cassette: "SHIMANO 105 CS-R7101",
    Frame: "ALX ALL-ROUND",
  };

  it("prioritizes Shifter and Rear Derailleur, capped at 2", () => {
    expect(getGroupsetLines(bikeSpecs)).toEqual([
      "Shifter: SHIMANO 105 R7120, 2x12 SPEED",
      "Rear Derailleur: SHIMANO 105 R7100",
    ]);
  });

  it("falls through to Crank Set and Cassette when earlier fields are missing", () => {
    const { Shifter, "Rear Derailleur": _rd, ...rest } = bikeSpecs;
    expect(getGroupsetLines(rest)).toEqual([
      "Crank Set: SHIMANO 105 FC-R7100",
      "Cassette: SHIMANO 105 CS-R7101",
    ]);
  });

  it("returns an empty array when none of the four fields exist", () => {
    expect(getGroupsetLines({ Frame: "ALX ALL-ROUND" })).toEqual([]);
  });
});

describe("getPaaSpecLines", () => {
  const helmetSpecs: Record<string, string> = {
    Brand: "Xzone",
    "What's in the box": "1 x Polygon Superhero Kids Bike Helmet",
    Material: "Glue on shell material",
    Technology: "Antibacterial padding",
    "Tipe Fitting": "Regular Fitting",
    "Air Vents": "5 vents",
    Genre: "Kids",
  };

  it("skips boilerplate keys and shows the first 2 remaining, in order", () => {
    expect(getPaaSpecLines(helmetSpecs)).toEqual([
      "Material: Glue on shell material",
      "Technology: Antibacterial padding",
    ]);
  });

  it("returns an empty array when only boilerplate keys are present", () => {
    expect(getPaaSpecLines({ Brand: "Xzone", Genre: "Kids" })).toEqual([]);
  });
});

describe("getKeySpecLines", () => {
  it("uses groupset fields and a 'Groupset' label for a bike category", () => {
    const result = getKeySpecLines({
      category: "BIKE-ROAD DROP BAR",
      specs: { Shifter: "SHIMANO 105 R7120, 2x12 SPEED" },
    });
    expect(result.label).toBe("Groupset");
    expect(result.lines).toEqual(["Shifter: SHIMANO 105 R7120, 2x12 SPEED"]);
  });

  it("uses the boilerplate filter and a 'Spesifikasi' label for a non-bike category", () => {
    const result = getKeySpecLines({
      category: "HELMET",
      specs: { Material: "Glue on shell material" },
    });
    expect(result.label).toBe("Spesifikasi");
    expect(result.lines).toEqual(["Material: Glue on shell material"]);
  });
});

describe("cleanFeatureBullet", () => {
  it("inserts a space at a lowercase-to-uppercase boundary (title/sentence squish)", () => {
    const squished = "Drivetrain Shimano 105 2x12 SpeedRasakan perpindahan gigi yang mulus.";
    expect(cleanFeatureBullet(squished)).toContain("Speed Rasakan");
  });

  it("leaves an already-clean sentence unchanged aside from truncation", () => {
    const clean = "One-piece alloy body, yang kuat dan ringan.";
    expect(cleanFeatureBullet(clean)).toBe(clean);
  });

  it("truncates long bullets to 80 characters", () => {
    const long = "A".repeat(100);
    expect(cleanFeatureBullet(long).length).toBeLessThanOrEqual(81);
  });
});

describe("getKelebihanBullets", () => {
  it("splits on ' | ' and caps at 2 bullets", () => {
    const specs = {
      Features: "First bullet here. | Second bullet here. | Third bullet here.",
    };
    expect(getKelebihanBullets(specs)).toEqual([
      "First bullet here.",
      "Second bullet here.",
    ]);
  });

  it("returns an empty array when there's no Features field", () => {
    expect(getKelebihanBullets({ Brand: "Polygon" })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npm test -- --run copyInfo`
Expected: FAIL — `web/lib/copyInfo.ts` doesn't exist yet.

- [ ] **Step 3: Implement `web/lib/copyInfo.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npm test -- --run copyInfo`
Expected: PASS — all 12 tests green.

- [ ] **Step 5: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add web/lib/copyInfo.ts web/__tests__/copyInfo.test.ts
git commit -m "feat: add key-spec and kelebihan selection helpers for concise copy-info"
```

---

### Task 2: Rewrite `formatWhatsAppMessage` in `web/lib/copy.ts`

**Files:**
- Modify: `web/lib/copy.ts`

**Interfaces:**
- Consumes: `getKeySpecLines`, `getKelebihanBullets` (Task 1); `formatPrice`, `primaryArticleCode`, `titleCase`, `totalQuantity`, `getStockStatus` (existing `web/lib/format.ts`); `Product` (existing `web/lib/types.ts`)
- Produces: `formatWhatsAppMessage(product: Product): string` — same exported name and signature as today, only its output text changes. `copyToClipboard` is untouched.

- [ ] **Step 1: Replace `formatWhatsAppMessage` in `web/lib/copy.ts`**

Current file for reference:

```ts
import type { Product } from "@/lib/types";
import { formatPrice, primaryArticleCode, titleCase, totalQuantity } from "@/lib/format";

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-999999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    }
  } catch (e) {
    console.error("Failed to copy", e);
    return false;
  }
}

export function formatWhatsAppMessage(product: Product): string {
  const qty = totalQuantity(product.sizes);
  const mainArticleCode = primaryArticleCode(product.sizes);

  let msg = `*RODA STOCK INFO - RODALINK MAKASSAR* 🚲\n\n`;
  msg += `*Model:* ${titleCase(product.model_name)}\n`;
  msg += `*Brand:* ${titleCase(product.brand)}\n`;
  msg += `*Kategori:* ${titleCase(product.category)}\n`;
  if (product.price) {
    msg += `*Harga:* ${formatPrice(product.price)}\n`;
  }
  msg += `*Kode Artikel:* ${mainArticleCode}\n`;

  const colors = product.colors && product.colors.length > 0
    ? product.colors.map(titleCase).join(", ")
    : product.color_label
      ? titleCase(product.color_label)
      : null;
  if (colors) {
    msg += `${colors}\n`;
  }
  if (product.wheel_size) {
    msg += `*Ukuran Roda:* ${product.wheel_size}\n`;
  }

  msg += `\n*Status Stok Gudang:* ${qty > 0 ? `Ready (${qty} unit)` : "Kosong (0 unit)"}\n`;

  if (product.sizes && product.sizes.length > 0) {
    msg += `*Detail Stok per Ukuran:*\n`;
    product.sizes.forEach((s) => {
      const szName = s.size_code ? `Size ${s.size_code}` : "All Size";
      const stockTxt = s.quantity > 0 ? `${s.quantity} unit` : "Kosong";
      msg += `• ${szName} (Kode: ${s.article_code}) : *${stockTxt}*\n`;
    });
  }

  msg += `\n📍 *Lokasi:* ${product.warehouse}`;
  return msg;
}
```

Replace the whole file with:

```ts
import type { Product } from "@/lib/types";
import { formatPrice, getStockStatus, primaryArticleCode, titleCase, totalQuantity } from "@/lib/format";
import { getKeySpecLines, getKelebihanBullets } from "@/lib/copyInfo";

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-999999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    }
  } catch (e) {
    console.error("Failed to copy", e);
    return false;
  }
}

export function formatWhatsAppMessage(product: Product): string {
  const qty = totalQuantity(product.sizes);
  const mainArticleCode = primaryArticleCode(product.sizes);
  const status = getStockStatus(qty);
  const { label: specLabel, lines: specLines } = getKeySpecLines(product);
  const kelebihan = getKelebihanBullets(product.specs);

  let msg = `*RODA STOCK INFO - RODALINK MAKASSAR* 🚲\n\n`;
  msg += `*${titleCase(product.model_name)}*\n`;
  msg += `${formatPrice(product.price)}\n`;

  if (specLines.length > 0) {
    msg += `\n*${specLabel}:*\n`;
    specLines.forEach((line) => {
      msg += `• ${line}\n`;
    });
  }

  if (kelebihan.length > 0) {
    msg += `\n*Kelebihan:*\n`;
    kelebihan.forEach((line) => {
      msg += `• ${line}\n`;
    });
  }

  msg += `\nKode: ${mainArticleCode}\n`;
  msg += `Stok: ${status.label} (${qty} unit)`;

  return msg;
}
```

Note: stock wording now reuses `getStockStatus(qty).label` (`"Tersedia"`/`"Terbatas"`/`"Habis"`) instead of the old ad-hoc `"Ready"`/`"Kosong"` strings — this is the same label already shown everywhere else in the app (search results, product detail page), so the copied text and the on-screen text now agree instead of using two different vocabularies for the same thing.

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `cd web && npm test -- --run`
Expected: PASS (no existing test imports `formatWhatsAppMessage` directly, so this is a regression check on the rest of the suite, not a new test for this step).

- [ ] **Step 4: Manual verification in the browser**

Start the dev server (`cd web && npm run dev`):

1. Open the bike `polygon-strattos-7-blk-fa-700-b` (`/product/polygon-strattos-7-blk-fa-700-b`), tap "Salin seluruh info", paste the clipboard contents somewhere (a notes app, or the browser address bar) and confirm it reads:
   - Bold name line, then price on its own line
   - A `*Groupset:*` section with `Shifter` and `Rear Derailleur` lines (this product doesn't have `Cassette`/`Crank Set` prioritized ahead of these two, so exactly those two should show)
   - No `*Kelebihan:*` section (this product has no `Features` data)
   - `Kode: 503769003` and a `Stok:` line
   - No brand/category badges, no colors, no wheel size, no per-size table — all dropped
2. Open the helmet `xzone-helmet-kids-superhero-g`, copy its info, confirm:
   - A `*Spesifikasi:*` section (not "Groupset") with `Material` and `Technology` lines
   - No `*Kelebihan:*` section
3. Find or temporarily use any product with a short `specs` object (or check one with very few fields) and confirm the message still reads cleanly with the key-spec section omitted entirely (no empty `*Groupset:*`/`*Spesifikasi:*` header) when nothing qualifies.
4. Confirm the toast still reads "Info WhatsApp berhasil disalin!" after copying (this text lives in `ProductDetailContent.tsx`, unchanged by this plan — just confirming nothing broke around the edges).

- [ ] **Step 5: Commit**

```bash
git add web/lib/copy.ts
git commit -m "feat: rewrite WhatsApp copy-info to be concise (name, price, key spec, kelebihan, stock)"
```

---

### Self-Review

**Spec coverage:**
- Drops brand/category/colors/wheel-size/per-size-table/warehouse → all absent from the new `formatWhatsAppMessage`. ✓
- Groupset for bikes, capped at 2, priority order → `getGroupsetLines`. ✓
- PAA boilerplate filter, capped at 2 → `getPaaSpecLines`. ✓
- 60-char truncation on spec values → `truncate(specs[key], 60)` calls. ✓
- Kelebihan from `Features`, split on `" | "`, capped at 2, 80-char truncation, squish-fix regex → `getKelebihanBullets`/`cleanFeatureBullet`. ✓
- Sections omitted (not empty-headered) when nothing qualifies → both `if (specLines.length > 0)` and `if (kelebihan.length > 0)` guards. ✓
- No changes to on-screen product page → only `copy.ts` and the new `copyInfo.ts` touched. ✓

**Placeholder scan:** none — every step has full code, and Task 2 Step 4's manual verification lists exact products, exact expected sections, and exact expected absence of sections.

**Type consistency:** `getKeySpecLines` takes `{ category: string; specs: Record<string, string> }` in Task 1; Task 2 calls `getKeySpecLines(product)` where `product: Product` — `Product` has both `category: string` and `specs: Record<string, string>` (per `web/lib/types.ts`), so it satisfies the parameter type via structural typing. `getKelebihanBullets(product.specs)` matches its `Record<string, string>` parameter. No mismatches.
