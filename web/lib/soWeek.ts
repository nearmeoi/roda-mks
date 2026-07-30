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

export function removeStockCount(
  existing: Record<string, StockCount>,
  productId: string
): Record<string, StockCount> {
  const next = { ...existing };
  delete next[productId];
  return next;
}

const PIC_KEY = "rodalink_so_pic_name";

export function getPicName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(PIC_KEY) || "";
  } catch {
    return "";
  }
}

export function savePicName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PIC_KEY, name.trim());
  } catch (e) {
    console.error("Failed to save PIC name", e);
  }
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

export function saveStockCount(
  productId: string,
  productName: string,
  shQtyOrTotal: number,
  whQty: number = 0,
  meta?: {
    articleCode?: string | number;
    brand?: string;
    category?: string;
    price?: number | null;
  }
): StockCount {
  const sh = Math.max(0, shQtyOrTotal || 0);
  const wh = Math.max(0, whQty || 0);
  const total = sh + wh;

  const entry: StockCount = {
    productId,
    productName,
    countedQty: total,
    shQty: sh,
    whQty: wh,
    articleCode: meta?.articleCode,
    brand: meta?.brand,
    category: meta?.category,
    price: meta?.price,
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

export function deleteStockCount(productId: string): void {
  try {
    const updated = removeStockCount(getStockCounts(), productId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to delete stock count", e);
  }
}

export function clearAllStockCounts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear stock counts", e);
  }
}

export function getCurrentWeekCounts(): StockCount[] {
  const all = Object.values(getStockCounts());
  return all
    .filter((c) => isInCurrentWeek(c.countedAt))
    .sort((a, b) => new Date(b.countedAt).getTime() - new Date(a.countedAt).getTime());
}

export function formatSoWeekReport(counts: StockCount[], picName: string = ""): string {
  const dateStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let totalSH = 0;
  let totalWH = 0;
  let totalAll = 0;

  const lines: string[] = [];
  lines.push(`📋 *LAPORAN SO WEEK (STOCK OPNAME)*`);
  lines.push(`📅 Tanggal: ${dateStr}`);
  if (picName) {
    lines.push(`👤 PIC: ${picName.toUpperCase()}`);
  }
  lines.push(`-----------------------------------`);

  counts.forEach((c, idx) => {
    const sh = c.shQty ?? c.countedQty ?? 0;
    const wh = c.whQty ?? 0;
    const total = sh + wh;
    totalSH += sh;
    totalWH += wh;
    totalAll += total;

    const codeStr = c.articleCode ? ` [${c.articleCode}]` : "";
    const brandStr = c.brand ? `${c.brand.toUpperCase()} - ` : "";
    const priceStr = c.price ? ` | Rp ${c.price.toLocaleString("id-ID")}` : "";

    lines.push(`${idx + 1}. ${brandStr}${c.productName}${codeStr}`);
    lines.push(`   📍 SH: ${sh} | WH: ${wh} | *Total: ${total} unit*${priceStr}`);
  });

  lines.push(`-----------------------------------`);
  lines.push(`📊 *RINGKASAN TOTAL:*`);
  lines.push(`• Total Showroom (SH): *${totalSH} unit*`);
  lines.push(`• Total Gudang (WH): *${totalWH} unit*`);
  lines.push(`• Grand Total Fisik: *${totalAll} unit*`);

  return lines.join("\n");
}

export function useStockCounts() {
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [pic, setPic] = useState<string>("");

  useEffect(() => {
    setCounts(getCurrentWeekCounts());
    setPic(getPicName());
  }, []);

  const saveCount = (
    productId: string,
    productName: string,
    shQty: number,
    whQty: number = 0,
    meta?: {
      articleCode?: string | number;
      brand?: string;
      category?: string;
      price?: number | null;
    }
  ) => {
    saveStockCount(productId, productName, shQty, whQty, meta);
    setCounts(getCurrentWeekCounts());
  };

  const updatePic = (name: string) => {
    savePicName(name);
    setPic(name.trim());
  };

  const deleteCount = (productId: string) => {
    deleteStockCount(productId);
    setCounts(getCurrentWeekCounts());
  };

  const clearCounts = () => {
    clearAllStockCounts();
    setCounts(getCurrentWeekCounts());
  };

  const getCount = (productId: string): StockCount | undefined =>
    counts.find((c) => c.productId === productId);

  return { counts, pic, updatePic, saveCount, deleteCount, clearCounts, getCount };
}


