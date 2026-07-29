"use client";

import { useEffect, useState } from "react";
import Fuse from "fuse.js";

export interface AllStockEntry {
  id: string;
  brand: string;
  model_name: string;
  category: string;
  wheel_size: string | null;
  color_label: string | null;
  price: number;
  priceSource: "master" | "fallback" | "pos";
}

const options = {
  keys: [
    { name: "model_name", weight: 0.5 },
    { name: "brand", weight: 0.2 },
    { name: "category", weight: 0.1 },
  ],
  threshold: 0.18,
  ignoreLocation: true,
};

export function searchAllStock(entries: AllStockEntry[], query: string): AllStockEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const fuse = new Fuse(entries, options);
  return fuse.search(trimmed).map((result) => result.item);
}

// Not statically imported: at 10k+ entries the dataset is a couple MB, too
// big to bundle into the main JS payload for a section most page loads never
// use. Fetched once from /public and cached in module scope for the tab's
// lifetime.
let cache: AllStockEntry[] | null = null;
let inflight: Promise<AllStockEntry[]> | null = null;

function loadAllStock(): Promise<AllStockEntry[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/all_stock.json")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: AllStockEntry[]) => {
        cache = data;
        return data;
      })
      .catch(() => []);
  }
  return inflight;
}

export function useAllStock(enabled: boolean): AllStockEntry[] {
  const [entries, setEntries] = useState<AllStockEntry[]>(cache ?? []);

  useEffect(() => {
    if (!enabled || cache) return;
    let cancelled = false;
    loadAllStock().then((data) => {
      if (!cancelled) setEntries(data);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return entries;
}
