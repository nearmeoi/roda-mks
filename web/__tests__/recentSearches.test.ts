import { describe, expect, it, beforeEach } from "vitest";
import { addRecentSearch, getRecentSearches, clearRecentSearches } from "@/lib/recentSearches";

describe("recentSearches module", () => {
  beforeEach(() => {
    let store: Record<string, string> = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };

    Object.defineProperty(global, "window", {
      value: { localStorage: localStorageMock },
      writable: true,
    });
    Object.defineProperty(global, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    clearRecentSearches();
  });

  it("adds search queries to history", () => {
    addRecentSearch("Polygon");
    expect(getRecentSearches()).toEqual(["Polygon"]);
  });

  it("purges incomplete prefixes when adding a longer query (e.g. tam/tambo when adding tambora)", () => {
    addRecentSearch("tam");
    addRecentSearch("tambo");
    addRecentSearch("tambora");

    const searches = getRecentSearches();
    expect(searches).toEqual(["tambora"]);
  });

  it("limits maximum history entries to 5", () => {
    addRecentSearch("one");
    addRecentSearch("two");
    addRecentSearch("three");
    addRecentSearch("four");
    addRecentSearch("five");
    addRecentSearch("six");

    const list = getRecentSearches();
    expect(list.length).toBe(5);
    expect(list[0]).toBe("six");
  });
});
