"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { guideArticles } from "@/lib/guideArticles";
import { searchGuideArticles } from "@/lib/guideSearch";
import type { GuideArticle } from "@/lib/types";
import { Search } from "lucide-react";

function groupByCategory(articles: GuideArticle[]): [string, GuideArticle[]][] {
  const map = new Map<string, GuideArticle[]>();
  for (const article of articles) {
    const list = map.get(article.category) ?? [];
    list.push(article);
    map.set(article.category, list);
  }
  return [...map.entries()];
}

function ArticleRow({ article }: { article: GuideArticle }) {
  return (
    <Link
      href={`/guide/${article.id}`}
      className="rounded-2xl border border-black/[0.08] bg-white/85 p-3.5 shadow-xs transition-all hover:border-black/20 hover:bg-white"
    >
      <h3 className="text-[15px] font-semibold text-gray-900">{article.title}</h3>
      <p className="mt-0.5 text-[13px] text-gray-500">{article.summary}</p>
    </Link>
  );
}

export default function GuidePage() {
  const [query, setQuery] = useState("");
  const hasQuery = query.trim().length > 0;

  const results = useMemo(() => {
    if (!hasQuery) return [];
    return searchGuideArticles(guideArticles, query);
  }, [query, hasQuery]);

  const grouped = useMemo(() => groupByCategory(guideArticles), []);

  return (
    <div className="min-h-screen pb-16">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.08] bg-[#f6f6f8]/80 px-5 py-3 backdrop-blur-xl">
        <BackButton />
        <span className="text-sm font-semibold text-gray-900">Panduan Staff</span>
        <div className="w-[68px]" />
      </div>

      <div className="mx-auto max-w-[560px] px-5 pt-4">
        <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3.5 py-2.5 shadow-xs transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari topik, misal: ukuran helm, groupset..."
            className="w-full border-none bg-transparent text-sm text-gray-900 outline-none"
          />
        </div>

        {hasQuery ? (
          results.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2.5">
              {results.map((article) => (
                <ArticleRow key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <p className="pt-8 text-center text-sm text-gray-500">Tidak ditemukan</p>
          )
        ) : (
          <div className="mt-5 flex flex-col gap-6">
            {grouped.map(([category, articles]) => (
              <div key={category} className="flex flex-col gap-2.5">
                <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {category}
                </h2>
                {articles.map((article) => (
                  <ArticleRow key={article.id} article={article} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
