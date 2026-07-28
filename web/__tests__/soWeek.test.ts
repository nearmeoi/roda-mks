import { describe, expect, it } from "vitest";
import { getWeekStart, isInCurrentWeek, mergeStockCount } from "@/lib/soWeek";
import type { StockCount } from "@/lib/types";

// January 1, 2024 was a Monday -- used as a fixed, known anchor so these
// tests don't depend on what day it happens to be when they run.

describe("getWeekStart", () => {
  it("returns the same day (at midnight) when given a Monday", () => {
    const monday = new Date(2024, 0, 1, 15, 30);
    const result = getWeekStart(monday);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it("returns the preceding Monday when given a Wednesday", () => {
    const wednesday = new Date(2024, 0, 3, 9, 0);
    const result = getWeekStart(wednesday);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(0);
  });

  it("returns the preceding Monday when given a Sunday (end of that week)", () => {
    const sunday = new Date(2024, 0, 7, 23, 0);
    const result = getWeekStart(sunday);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(0);
  });

  it("rolls over to the next Monday correctly", () => {
    const nextMonday = new Date(2024, 0, 8, 6, 0);
    const result = getWeekStart(nextMonday);
    expect(result.getDate()).toBe(8);
    expect(result.getMonth()).toBe(0);
  });
});

describe("isInCurrentWeek", () => {
  const wednesdayNoon = new Date(2024, 0, 3, 12, 0);

  it("is true for a timestamp on the Monday of the same week", () => {
    expect(isInCurrentWeek(new Date(2024, 0, 1, 8, 0).toISOString(), wednesdayNoon)).toBe(true);
  });

  it("is true for a timestamp late on the Sunday of the same week", () => {
    expect(isInCurrentWeek(new Date(2024, 0, 7, 23, 59).toISOString(), wednesdayNoon)).toBe(true);
  });

  it("is false for a timestamp from the previous week", () => {
    expect(isInCurrentWeek(new Date(2023, 11, 31, 23, 59).toISOString(), wednesdayNoon)).toBe(false);
  });

  it("is false for a timestamp from the following week", () => {
    expect(isInCurrentWeek(new Date(2024, 0, 8, 0, 0).toISOString(), wednesdayNoon)).toBe(false);
  });
});

describe("mergeStockCount", () => {
  const existing: Record<string, StockCount> = {
    "product-a": { productId: "product-a", productName: "Product A", countedQty: 3, countedAt: "2024-01-01T08:00:00.000Z" },
  };

  it("overwrites the entry for the same product id", () => {
    const entry: StockCount = { productId: "product-a", productName: "Product A", countedQty: 5, countedAt: "2024-01-02T08:00:00.000Z" };
    const result = mergeStockCount(existing, entry);
    expect(Object.keys(result)).toEqual(["product-a"]);
    expect(result["product-a"].countedQty).toBe(5);
  });

  it("keeps existing entries for other product ids", () => {
    const entry: StockCount = { productId: "product-b", productName: "Product B", countedQty: 7, countedAt: "2024-01-02T08:00:00.000Z" };
    const result = mergeStockCount(existing, entry);
    expect(result["product-a"].countedQty).toBe(3);
    expect(result["product-b"].countedQty).toBe(7);
  });
});
