import { describe, it, expect } from "vitest";
import { weekToDateRange, formatWeekLabel, parseWeekMarker } from "@/lib/weekLabel";

describe("weekToDateRange", () => {
  it("matches ISO-8601 week 34 of 2026 (Aug 17-23)", () => {
    const { start, end } = weekToDateRange(34, 2026);
    expect(start.toISOString().slice(0, 10)).toBe("2026-08-17");
    expect(end.toISOString().slice(0, 10)).toBe("2026-08-23");
  });

  it("matches ISO-8601 week 1 of 2026 (Dec 29 2025-Jan 4 2026)", () => {
    const { start, end } = weekToDateRange(1, 2026);
    expect(start.toISOString().slice(0, 10)).toBe("2025-12-29");
    expect(end.toISOString().slice(0, 10)).toBe("2026-01-04");
  });
});

describe("formatWeekLabel", () => {
  it("formats a same-month range", () => {
    expect(formatWeekLabel(34, 2026)).toBe("17-23 Agu 2026");
  });
});

describe("parseWeekMarker", () => {
  it("extracts the week number from a POS-style marker", () => {
    expect(parseWeekMarker("Week 34")).toBe(34);
  });

  it("returns null for non-matching values", () => {
    expect(parseWeekMarker("10+")).toBeNull();
    expect(parseWeekMarker("5")).toBeNull();
  });
});
