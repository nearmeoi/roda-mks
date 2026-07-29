import Fuse from "fuse.js";
import type { GuideArticle } from "./types";

const options = {
  keys: [
    { name: "title", weight: 0.5 },
    { name: "summary", weight: 0.3 },
    { name: "tags", weight: 0.25 },
    { name: "category", weight: 0.15 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
};

export function searchGuideArticles(articles: GuideArticle[], query: string): GuideArticle[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const fuse = new Fuse(articles, options);
  return fuse.search(trimmed).map((result) => result.item);
}
