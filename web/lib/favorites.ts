import { useState, useEffect } from "react";

const STORAGE_KEY = "rodalink_favorite_products";

export function getFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isFavorite(id: string): boolean {
  return getFavoriteIds().includes(id);
}

export function toggleFavorite(id: string): boolean {
  const current = getFavoriteIds();
  let updated: string[];
  if (current.includes(id)) {
    updated = current.filter((item) => item !== id);
  } else {
    updated = [...current, id];
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save favorites", e);
  }
  return updated.includes(id);
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(getFavoriteIds());
  }, []);

  const toggle = (id: string) => {
    const isFav = toggleFavorite(id);
    setFavorites(getFavoriteIds());
    return isFav;
  };

  return { favorites, toggle, isFav: (id: string) => favorites.includes(id) };
}
