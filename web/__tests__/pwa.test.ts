import { describe, expect, it } from "vitest";

describe("PWA Manifest & Service Worker", () => {
  it("verifies manifest.json parameters", async () => {
    const manifest = await import("../public/manifest.json");
    expect(manifest.name).toContain("Roda Stock");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
