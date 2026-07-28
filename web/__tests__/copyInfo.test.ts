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
