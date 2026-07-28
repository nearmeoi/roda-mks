"use client";

import { useState, useEffect } from "react";
import type { StockCount } from "./types";

const STORAGE_KEY = "rodalink_stock_counts";

// Monday-start week boundary, in the device's local time. Jan 1 2024 was a
// Monday -- see soWeek.test.ts for the fixed dates the tests anchor on.
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export function isInCurrentWeek(isoTimestamp: string, now: Date = new Date()): boolean {
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const t = new Date(isoTimestamp);
  return t >= weekStart && t < weekEnd;
}

export function mergeStockCount(
  existing: Record<string, StockCount>,
  entry: StockCount
): Record<string, StockCount> {
  return { ...existing, [entry.productId]: entry };
}

export function getStockCounts(): Record<string, StockCount> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStockCount(productId: string, productName: string, countedQty: number): StockCount {
  const entry: StockCount = {
    productId,
    productName,
    countedQty,
    countedAt: new Date().toISOString(),
  };
  try {
    const updated = mergeStockCount(getStockCounts(), entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save stock count", e);
  }
  return entry;
}

export function getCurrentWeekCounts(): StockCount[] {
  const all = Object.values(getStockCounts());
  return all
    .filter((c) => isInCurrentWeek(c.countedAt))
    .sort((a, b) => new Date(b.countedAt).getTime() - new Date(a.countedAt).getTime());
}

export function useStockCounts() {
  const [counts, setCounts] = useState<StockCount[]>([]);

  useEffect(() => {
    setCounts(getCurrentWeekCounts());
  }, []);

  const saveCount = (productId: string, productName: string, countedQty: number) => {
    saveStockCount(productId, productName, countedQty);
    setCounts(getCurrentWeekCounts());
  };

  const getCount = (productId: string): StockCount | undefined =>
    counts.find((c) => c.productId === productId);

  return { counts, saveCount, getCount };
}
