"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "rodalink_recent_searches";
const MAX_RECENT = 5;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): string[] {
  const q = query.trim();
  if (!q || q.length < 2) return getRecentSearches();

  try {
    const list = getRecentSearches();
    const qLower = q.toLowerCase();

    // Filter out items that are exact matches or incomplete prefixes of q (e.g. "tam" when adding "tambora")
    const filtered = list.filter((item) => {
      const itemLower = item.toLowerCase();
      if (itemLower === qLower) return false;
      if (qLower.startsWith(itemLower)) return false;
      return true;
    });

    const updated = [q, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeRecentSearch(query: string): string[] {
  try {
    const list = getRecentSearches().filter((item) => item.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  const addSearch = (q: string) => {
    const updated = addRecentSearch(q);
    setRecent(updated);
  };

  const removeSearch = (q: string) => {
    const updated = removeRecentSearch(q);
    setRecent(updated);
  };

  const clearAll = () => {
    clearRecentSearches();
    setRecent([]);
  };

  return { recent, addSearch, removeSearch, clearAll };
}
