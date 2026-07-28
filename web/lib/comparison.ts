"use client";

import { useState, useEffect } from "react";
import type { Product } from "./types";

const STORAGE_KEY = "rodalink_compare_ids";
const MAX_COMPARE = 3;

export function getCompareIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleCompareId(id: string): string[] {
  try {
    const current = getCompareIds();
    let updated: string[];
    if (current.includes(id)) {
      updated = current.filter((item) => item !== id);
    } else {
      if (current.length >= MAX_COMPARE) {
        // limit to MAX_COMPARE items
        updated = [...current.slice(1), id];
      } else {
        updated = [...current, id];
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearCompareList(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function useCompareList() {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    setCompareIds(getCompareIds());
  }, []);

  const toggleCompare = (id: string) => {
    const updated = toggleCompareId(id);
    setCompareIds(updated);
  };

  const clearAll = () => {
    clearCompareList();
    setCompareIds([]);
  };

  const isCompared = (id: string) => compareIds.includes(id);

  return { compareIds, toggleCompare, clearAll, isCompared };
}
