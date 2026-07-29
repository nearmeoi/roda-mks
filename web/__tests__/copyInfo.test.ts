import { describe, expect, it } from "vitest";
import {
  truncate,
  getProductInfoLines,
  getDetailedSpecLines,
  cleanFeatureBullet,
  getKelebihanBullets,
} from "@/lib/copyInfo";
import type { Product } from "@/lib/types";

function buildTestProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "test-id",
    brand: "POLYGON",
    model_name: "STRATTOS 7",
    category: "BIKE-ROAD DROP BAR",
    warehouse: "Outlet",
    variant_extra: null,
    wheel_size: "700C",
    color_label: "Hitam",
    price: 25000000,
    sizes: [
      { size_code: "S1", article_code: 503769003, quantity: 1, ordered_quantity: null, price: 25000000 },
      { size_code: "M", article_code: 503769004, quantity: 1, ordered_quantity: null, price: 25000000 },
    ],
    colors: ["Black"],
    images: [],
    specs: {},
    matched: true,
    ...overrides,
  };
}

describe("truncate", () => {
  it("returns text unchanged when under limit", () => {
    expect(truncate("Shimano 105", 60)).toBe("Shimano 105");
  });

  it("cuts and appends ellipsis when over limit", () => {
    const long = "SHIMANO SORA SL-R3000, 2x9-SPEED RAPID FIRE SHIFTER WITH EXTRA TEXT";
    const result = truncate(long, 20);
    expect(result.length).toBeLessThanOrEqual(21);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("getProductInfoLines", () => {
  it("extracts genre, color, ready sizes, and weight", () => {
    const p = buildTestProduct({
      specs: { Genre: "Road", Weight: "8.9 kg (Size M)" },
      colors: ["Black", "Red"],
      sizes: [
        { size_code: "S", article_code: 101, quantity: 1, ordered_quantity: null, price: 100 },
        { size_code: "M", article_code: 102, quantity: 0, ordered_quantity: null, price: 100 },
        { size_code: "L", article_code: 103, quantity: 2, ordered_quantity: null, price: 100 },
      ],
    });

    const lines = getProductInfoLines(p);

    expect(lines).toContain("Genre / Kategori: Road");
    expect(lines).toContain("Warna: Black, Red");
    expect(lines).toContain("Ukuran Ready: S, L");
    expect(lines).toContain("Bobot: 8.9 kg (Size M)");
  });

  it("falls back to category title for bike genre if not in specs", () => {
    const p = buildTestProduct({
      category: "BIKE-MTB XC",
      specs: {},
    });
    const lines = getProductInfoLines(p);
    expect(lines).toContain("Genre / Kategori: MTB XC");
  });
});

describe("getDetailedSpecLines", () => {
  it("extracts comprehensive bike specs including frame, speed, shifter, RD, FD, crank, cassette, brake, wheel, and tire", () => {
    const p = buildTestProduct({
      specs: {
        Frame: "CARBON ENDURANCE",
        Speed: "2x12 Speed",
        Shifter: "SHIMANO 105 R7120",
        "Rear Derailleur": "SHIMANO 105 R7100",
        "Front Derailleur": "SHIMANO 105 R7100 BRAZE ON",
        "Crank Set": "SHIMANO 105 50/34T",
        Cassette: "SHIMANO 105 11-34T",
        Brake: "SHIMANO 105 HYDRAULIC DISC",
        Tire: "SCHWALBE ONE ADDIX TLE 700x30C",
      },
    });

    const { label, lines } = getDetailedSpecLines(p);

    expect(label).toBe("Spesifikasi");
    expect(lines).toContain("Frame / Material: CARBON ENDURANCE");
    expect(lines).toContain("Speed: 2x12 Speed");
    expect(lines).toContain("Shifter: SHIMANO 105 R7120");
    expect(lines).toContain("Rear Derailleur: SHIMANO 105 R7100");
    expect(lines).toContain("Front Derailleur: SHIMANO 105 R7100 BRAZE ON");
    expect(lines).toContain("Crank Set: SHIMANO 105 50/34T");
    expect(lines).toContain("Cassette: SHIMANO 105 11-34T");
    expect(lines).toContain("Rem: SHIMANO 105 HYDRAULIC DISC");
    expect(lines).toContain("Ukuran Roda: 700C");
    expect(lines).toContain("Ban: SCHWALBE ONE ADDIX TLE 700x30C");
  });

  it("extracts non-bike specs while filtering out boilerplate keys", () => {
    const p = buildTestProduct({
      category: "HELMET",
      specs: {
        Brand: "Xzone",
        "What's in the box": "1 x Helmet",
        Material: "Glue on shell material",
        Technology: "Antibacterial padding",
        "Air Vents": "5 vents",
      },
    });

    const { label, lines } = getDetailedSpecLines(p);

    expect(label).toBe("Spesifikasi");
    expect(lines).toContain("Material: Glue on shell material");
    expect(lines).toContain("Technology: Antibacterial padding");
    expect(lines).toContain("Air Vents: 5 vents");
    expect(lines).not.toContain("Brand: Xzone");
  });
});

describe("cleanFeatureBullet", () => {
  it("inserts space at lowercase-to-uppercase boundary", () => {
    const squished = "Drivetrain Shimano 105 2x12 SpeedRasakan perpindahan gigi yang mulus.";
    expect(cleanFeatureBullet(squished)).toContain("Speed Rasakan");
  });
});

describe("getKelebihanBullets", () => {
  it("splits Features on ' | ' and caps at 3 bullets", () => {
    const specs = {
      Features: "First bullet | Second bullet | Third bullet | Fourth bullet",
    };
    expect(getKelebihanBullets(specs)).toEqual([
      "First bullet",
      "Second bullet",
      "Third bullet",
    ]);
  });

  it("falls back to PAA summary keys if Features is missing", () => {
    const specs = {
      "Frame & Fork": "Hi-Ten Steel frame kokoh",
      Drivetrain: "Single speed ringan",
    };
    expect(getKelebihanBullets(specs)).toEqual([
      "Frame & Fork: Hi-Ten Steel frame kokoh",
      "Drivetrain: Single speed ringan",
    ]);
  });
});
