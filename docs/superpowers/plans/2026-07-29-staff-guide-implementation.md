# Staff Guide (FAQ/Reference Articles) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give staff a searchable, in-app reference section (`/guide`) with short articles covering bike/apparel sizing, groupset tiers, promo/warranty policy, and how to use Roda Stock's own features.

**Architecture:** Articles are a plain static TypeScript array (`web/lib/guideArticles.ts`), no database or markdown pipeline. A small discriminated-union `ContentBlock` type drives a presentational renderer. Search reuses the existing `fuse.js` pattern already used for product search (`web/lib/search.ts`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `fuse.js` (already a dependency), Vitest.

## Global Constraints

- No Markdown parsing dependency — content is structured `ContentBlock` data, not free text.
- No in-app editing UI — articles are static data, edited by changing `web/lib/guideArticles.ts` and redeploying.
- No customer-facing version — reached only via an icon in the app's own header.
- Two of the ten articles ("Promo & Diskon Aktif", "Kebijakan Garansi & Servis") are intentionally templates with placeholder business details for the user to fill in later — this is a deliberate spec decision, not a plan placeholder, and both articles must still render correctly as-is.
- Follow existing card styling used elsewhere in the app: `rounded-2xl border border-black/[0.08] bg-white/70` (or `/85`) for cards, `--color-accent` (`#0a7cff`) for accents, `titleCase`/`formatPrice` conventions from `web/lib/format.ts` where relevant.

---

### Task 1: Data model and article content

**Files:**
- Modify: `web/lib/types.ts` (append `ContentBlock` and `GuideArticle`)
- Create: `web/lib/guideArticles.ts`

**Interfaces:**
- Produces: `ContentBlock` (discriminated union: `heading` | `paragraph` | `bullets` | `table`), `GuideArticle` (`{ id, category, title, summary, tags?, blocks }`), and the exported `guideArticles: GuideArticle[]` array with 10 entries, consumed by Tasks 2–5.

- [ ] **Step 1: Add the content types to `web/lib/types.ts`**

Append to the end of `web/lib/types.ts` (after the existing `StockCount` interface):

```ts
export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export interface GuideArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  tags?: string[];
  blocks: ContentBlock[];
}
```

- [ ] **Step 2: Create `web/lib/guideArticles.ts` with all 10 articles**

```ts
import type { GuideArticle } from "./types";

export const guideArticles: GuideArticle[] = [
  {
    id: "ukuran-sepeda-road-hybrid-gravel",
    category: "Ukuran Sepeda",
    title: "Panduan Ukuran Sepeda Road, Hybrid & Gravel",
    summary: "Cocokkan tinggi badan pelanggan dengan ukuran frame (cm) untuk sepeda drop-bar dan flat-bar.",
    tags: ["road", "hybrid", "gravel", "frame", "tinggi badan", "drop bar", "flat bar"],
    blocks: [
      { type: "paragraph", text: "Tanyakan tinggi badan pelanggan (cm), lalu cocokkan dengan rentang di tabel. Ini estimasi umum industri — kalau ada geometry chart resmi dari brand tertentu, prioritaskan itu." },
      {
        type: "table",
        headers: ["Tinggi Badan", "Ukuran Frame"],
        rows: [
          ["150 - 160 cm", "XS (47-49 cm)"],
          ["160 - 170 cm", "S (50-52 cm)"],
          ["170 - 178 cm", "M (54-55 cm)"],
          ["178 - 185 cm", "L (56-58 cm)"],
          ["185 - 195 cm", "XL (58-61 cm)"],
        ],
      },
      {
        type: "bullets",
        items: [
          "Drop-bar (road/gravel): posisi lebih membungkuk, cocok untuk kecepatan & jarak jauh.",
          "Flat-bar (hybrid): posisi lebih tegak, nyaman untuk commuting harian.",
          "Untuk gravel, banyak pelanggan memilih 1 ukuran lebih kecil dari road murni agar lebih lincah di jalur off-road ringan.",
        ],
      },
    ],
  },
  {
    id: "ukuran-sepeda-mtb",
    category: "Ukuran Sepeda",
    title: "Panduan Ukuran Sepeda Gunung (MTB)",
    summary: "Ukuran frame S/M/L/XL berdasarkan tinggi badan, plus kapan menyarankan roda 27.5\" vs 29\".",
    tags: ["mtb", "gunung", "frame", "tinggi badan", "27.5", "29 inch", "wheel size"],
    blocks: [
      {
        type: "table",
        headers: ["Tinggi Badan", "Ukuran Frame"],
        rows: [
          ["150 - 165 cm", "S"],
          ["165 - 175 cm", "M"],
          ["175 - 185 cm", "L"],
          ["185 - 195 cm", "XL"],
        ],
      },
      {
        type: "bullets",
        items: [
          "Roda 27.5\": lebih lincah, akselerasi lebih cepat — sering dipilih untuk frame kecil (S) atau jalur teknikal.",
          "Roda 29\": menggelinding lebih stabil di kecepatan tinggi dan medan kasar — jadi standar untuk frame M ke atas.",
          "Full suspension vs rigid/hardtail tidak mengubah tabel ukuran di atas — keduanya memakai patokan tinggi badan yang sama.",
        ],
      },
    ],
  },
  {
    id: "ukuran-sepeda-anak",
    category: "Ukuran Sepeda",
    title: "Panduan Ukuran Sepeda Anak",
    summary: "Perkiraan usia dan tinggi badan untuk tiap ukuran roda (12\" - 24\").",
    tags: ["anak", "kids", "roda", "usia", "tinggi badan"],
    blocks: [
      {
        type: "table",
        headers: ["Usia (perkiraan)", "Tinggi Badan", "Ukuran Roda"],
        rows: [
          ["2 - 4 tahun", "85 - 100 cm", "12\""],
          ["3 - 5 tahun", "95 - 110 cm", "14\""],
          ["4 - 6 tahun", "100 - 115 cm", "16\""],
          ["5 - 8 tahun", "110 - 130 cm", "20\""],
          ["8 - 11 tahun", "130 - 145 cm", "24\""],
        ],
      },
      {
        type: "bullets",
        items: [
          "Usia hanya perkiraan kasar — tinggi badan anak jauh lebih akurat untuk menentukan ukuran.",
          "Anak harus bisa menapakkan kedua kaki ke tanah sambil duduk di sadel saat dites langsung.",
          "Kalau tinggi badan pas di antara dua rentang, sarankan ukuran roda yang lebih kecil — anak akan lebih mudah mengendalikannya.",
        ],
      },
    ],
  },
  {
    id: "tingkatan-groupset",
    category: "Groupset",
    title: "Mengenal Tingkatan Groupset",
    summary: "Urutan tingkatan groupset Shimano & SRAM dari yang paling terjangkau sampai paling premium — dan kenapa itu memengaruhi harga sepeda.",
    tags: ["groupset", "shimano", "sram", "deore", "105", "ultegra", "eagle", "tier"],
    blocks: [
      { type: "paragraph", text: "Semakin tinggi tingkatannya, biasanya makin ringan, makin presisi perpindahan giginya, dan makin tahan lama — tapi juga makin mahal. Ini alasan utama dua sepeda yang terlihat mirip bisa punya selisih harga jutaan rupiah." },
      { type: "heading", text: "Shimano - Road" },
      { type: "bullets", items: ["Claris (entry)", "Sora", "Tiagra", "105", "Ultegra", "Dura-Ace (tertinggi)"] },
      { type: "heading", text: "Shimano - MTB (Gunung)" },
      { type: "bullets", items: ["Tourney (entry)", "Altus", "Acera", "Alivio", "Deore", "SLX", "XT", "XTR (tertinggi)"] },
      { type: "heading", text: "SRAM - Road" },
      { type: "bullets", items: ["Apex (entry)", "Rival", "Force", "Red / Red AXS (tertinggi)"] },
      { type: "heading", text: "SRAM - MTB (Eagle)" },
      { type: "bullets", items: ["SX Eagle (entry)", "NX Eagle", "GX Eagle", "X0 Eagle", "XX1 / XX Eagle (tertinggi)"] },
      { type: "paragraph", text: "GX Eagle dan NX Eagle (SRAM) serta 105 dan Deore (Shimano) adalah tingkatan yang paling sering tersedia di stok kita — untuk pelanggan harian/commuting, tingkatan menengah ini biasanya sudah lebih dari cukup." },
    ],
  },
  {
    id: "ukuran-helm",
    category: "Ukuran Aksesori & Apparel",
    title: "Panduan Ukuran Helm",
    summary: "Ukur lingkar kepala (cm) untuk menentukan ukuran helm S/M/L/XL.",
    tags: ["helm", "helmet", "lingkar kepala"],
    blocks: [
      {
        type: "table",
        headers: ["Lingkar Kepala", "Ukuran Helm"],
        rows: [
          ["51 - 55 cm", "S"],
          ["55 - 59 cm", "M"],
          ["59 - 63 cm", "L"],
          ["63 - 67 cm", "XL"],
        ],
      },
      {
        type: "bullets",
        items: [
          "Ukur lingkar kepala di titik terlebar — sekitar 2 cm di atas alis.",
          "Helm yang pas: tidak goyang saat kepala digelengkan, tapi tidak menekan atau terasa sakit.",
        ],
      },
    ],
  },
  {
    id: "ukuran-jersey-apparel",
    category: "Ukuran Aksesori & Apparel",
    title: "Panduan Ukuran Jersey & Apparel",
    summary: "Konversi lingkar dada dan tinggi badan ke ukuran S - XXL untuk jersey dan pakaian bersepeda.",
    tags: ["jersey", "apparel", "baju", "shirt", "ukuran dada"],
    blocks: [
      {
        type: "table",
        headers: ["Ukuran", "Lingkar Dada", "Tinggi Badan"],
        rows: [
          ["S", "86 - 91 cm", "160 - 170 cm"],
          ["M", "91 - 96 cm", "168 - 175 cm"],
          ["L", "96 - 101 cm", "173 - 180 cm"],
          ["XL", "101 - 106 cm", "178 - 185 cm"],
          ["XXL", "106 - 111 cm", "183 - 190 cm"],
        ],
      },
      { type: "paragraph", text: "Jersey cycling biasanya dipotong lebih ketat (aerodinamis) dibanding kaos biasa — kalau pelanggan ragu antara dua ukuran, sarankan naik satu tingkat." },
    ],
  },
  {
    id: "ukuran-sepatu-sepeda",
    category: "Ukuran Aksesori & Apparel",
    title: "Panduan Ukuran Sepatu Sepeda",
    summary: "Tabel konversi EU / US / UK untuk sepatu cleat.",
    tags: ["sepatu", "shoes", "cleat", "footwear"],
    blocks: [
      {
        type: "table",
        headers: ["EU", "US (Pria)", "UK"],
        rows: [
          ["39", "6.5", "6"],
          ["40", "7.5", "7"],
          ["41", "8", "7.5"],
          ["42", "8.5", "8"],
          ["43", "9.5", "9"],
          ["44", "10", "9.5"],
          ["45", "11", "10.5"],
          ["46", "12", "11"],
        ],
      },
      { type: "paragraph", text: "Sepatu cleat biasanya pas rapat (snug) dibanding sepatu biasa — ini normal dan disengaja, bukan tanda salah ukuran, selama jari kaki tidak tertekuk." },
    ],
  },
  {
    id: "promo-diskon-aktif",
    category: "Promo",
    title: "Promo & Diskon Aktif",
    summary: "[Template — isi dengan promo yang sedang berjalan]",
    tags: ["promo", "diskon", "sale"],
    blocks: [
      { type: "heading", text: "Promo Saat Ini" },
      { type: "paragraph", text: "[Ganti bagian ini dengan promo yang sedang berjalan: nama promo, mekanisme diskon, kategori/brand yang termasuk.]" },
      {
        type: "bullets",
        items: [
          "[Nama promo] — [besaran diskon/benefit]",
          "Berlaku: [tanggal mulai] - [tanggal berakhir]",
          "Syarat & ketentuan: [isi syarat]",
        ],
      },
      { type: "paragraph", text: "Update artikel ini di web/lib/guideArticles.ts (id: \"promo-diskon-aktif\") setiap kali promo berubah." },
    ],
  },
  {
    id: "kebijakan-garansi-servis",
    category: "Kebijakan",
    title: "Kebijakan Garansi & Servis",
    summary: "[Template — isi dengan kebijakan garansi dan servis toko]",
    tags: ["garansi", "warranty", "servis", "kebijakan"],
    blocks: [
      { type: "heading", text: "Garansi" },
      {
        type: "table",
        headers: ["Kategori", "Masa Garansi", "Cakupan"],
        rows: [
          ["Frame", "[isi]", "[isi]"],
          ["Groupset", "[isi]", "[isi]"],
          ["Komponen lain", "[isi]", "[isi]"],
        ],
      },
      { type: "heading", text: "Servis" },
      { type: "paragraph", text: "[Ganti bagian ini dengan kebijakan servis toko: apakah ada servis gratis pertama, jadwal servis berkala, biaya sparepart, dsb.]" },
      { type: "paragraph", text: "Update artikel ini di web/lib/guideArticles.ts (id: \"kebijakan-garansi-servis\") setiap kali kebijakan berubah." },
    ],
  },
  {
    id: "cara-menggunakan-roda-stock",
    category: "Panduan Aplikasi",
    title: "Cara Menggunakan Roda Stock",
    summary: "Ringkasan singkat semua fitur aplikasi: cari, scan, suara, SO Week, bandingkan, dan mode ceklis.",
    tags: ["cara pakai", "tutorial", "fitur", "aplikasi"],
    blocks: [
      { type: "heading", text: "Cari Produk" },
      { type: "bullets", items: ["Ketik nama model, kode artikel, atau brand di kotak pencarian.", "Hasil muncul otomatis saat mengetik — tidak perlu menekan Enter."] },
      { type: "heading", text: "Scan Barcode" },
      { type: "bullets", items: ["Tekan ikon barcode di sebelah kotak pencarian.", "Arahkan kamera ke barcode/kode artikel pada produk atau rak."] },
      { type: "heading", text: "Cari dengan Suara" },
      { type: "bullets", items: ["Tekan ikon mikrofon, lalu ucapkan nama produk atau brand.", "Teks akan muncul otomatis di kotak pencarian sambil kamu bicara."] },
      { type: "heading", text: "Favorit" },
      { type: "bullets", items: ["Tekan ikon bintang pada hasil pencarian untuk pin produk yang sering dicari.", "Produk favorit muncul di beranda saat kotak pencarian kosong."] },
      { type: "heading", text: "Bandingkan Produk" },
      { type: "bullets", items: ["Tekan ikon panah-dua-arah pada hingga 3 produk untuk membandingkan.", "Tekan \"Bandingkan\" di bar bawah layar untuk melihat perbandingan spesifikasi berdampingan."] },
      { type: "heading", text: "Mode Ceklis (Salin Banyak Produk)" },
      { type: "bullets", items: ["Tekan ikon ceklis di kotak pencarian untuk masuk mode pilih banyak.", "Pilih beberapa produk, lalu tekan \"Salin WA\" untuk menyalin info semuanya sekaligus."] },
      { type: "heading", text: "SO Week (Stock Opname)" },
      { type: "bullets", items: ["Buka lewat tombol \"SO Week\" di beranda.", "Scan atau cari produk, lalu masukkan jumlah stok fisik yang dihitung."] },
    ],
  },
];
```

- [ ] **Step 3: Verify it type-checks**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/lib/types.ts web/lib/guideArticles.ts
git commit -m "feat: add staff guide content model and article data"
```

---

### Task 2: Guide search

**Files:**
- Create: `web/lib/guideSearch.ts`
- Test: `web/__tests__/guideSearch.test.ts`

**Interfaces:**
- Consumes: `GuideArticle` (Task 1), `guideArticles` (Task 1, test only).
- Produces: `searchGuideArticles(articles: GuideArticle[], query: string): GuideArticle[]` — returns `[]` for an empty/whitespace query (mirrors `searchProducts`' convention in `web/lib/search.ts`), consumed by Task 4.

- [ ] **Step 1: Write the failing test**

Create `web/__tests__/guideSearch.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { searchGuideArticles } from "@/lib/guideSearch";
import { guideArticles } from "@/lib/guideArticles";

describe("searchGuideArticles", () => {
  it("returns nothing for an empty query", () => {
    expect(searchGuideArticles(guideArticles, "")).toEqual([]);
    expect(searchGuideArticles(guideArticles, "   ")).toEqual([]);
  });

  it("finds an article by partial title", () => {
    const results = searchGuideArticles(guideArticles, "groupset");
    expect(results.map((a) => a.id)).toContain("tingkatan-groupset");
  });

  it("finds an article by tag", () => {
    const results = searchGuideArticles(guideArticles, "gravel");
    expect(results.map((a) => a.id)).toContain("ukuran-sepeda-road-hybrid-gravel");
  });

  it("finds an article by category", () => {
    const results = searchGuideArticles(guideArticles, "promo");
    expect(results.map((a) => a.id)).toContain("promo-diskon-aktif");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run __tests__/guideSearch.test.ts`
Expected: FAIL — `Cannot find module '@/lib/guideSearch'` (file doesn't exist yet).

- [ ] **Step 3: Create `web/lib/guideSearch.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run __tests__/guideSearch.test.ts`
Expected: PASS (4/4 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/guideSearch.ts web/__tests__/guideSearch.test.ts
git commit -m "feat: add fuzzy search over guide articles"
```

---

### Task 3: GuideBlockRenderer component

**Files:**
- Create: `web/components/GuideBlockRenderer.tsx`

**Interfaces:**
- Consumes: `ContentBlock` (Task 1).
- Produces: `GuideBlockRenderer({ blocks: ContentBlock[] })` React component, consumed by Task 5.

No automated test for this component — it is a pure presentational switch with no logic branches beyond `block.type`, consistent with how this codebase doesn't unit-test presentational components (`vitest.config.ts` runs in `environment: "node"`, no DOM/render testing set up). Verified manually in Task 5's checklist.

- [ ] **Step 1: Create `web/components/GuideBlockRenderer.tsx`**

```tsx
import type { ContentBlock } from "@/lib/types";

export function GuideBlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h2 key={i} className="text-lg font-bold tracking-tight text-gray-900">
              {block.text}
            </h2>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={i} className="text-sm leading-relaxed text-gray-700">
              {block.text}
            </p>
          );
        }

        if (block.type === "bullets") {
          return (
            <ul key={i} className="flex flex-col gap-2 pl-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <div
            key={i}
            className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-lg"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.08]">
                  {block.headers.map((h, k) => (
                    <th
                      key={k}
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr
                    key={r}
                    className={r < block.rows.length - 1 ? "border-b border-black/[0.08]" : ""}
                  >
                    {row.map((cell, c) => (
                      <td key={c} className="whitespace-nowrap px-4 py-2.5 text-gray-900">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/components/GuideBlockRenderer.tsx
git commit -m "feat: add GuideBlockRenderer presentational component"
```

---

### Task 4: Guide list/search page

**Files:**
- Create: `web/app/guide/page.tsx`

**Interfaces:**
- Consumes: `guideArticles` (Task 1), `searchGuideArticles` (Task 2), `BackButton` (existing, `web/components/BackButton.tsx`).
- Produces: the `/guide` route, linking to `/guide/[id]` (Task 5).

- [ ] **Step 1: Create `web/app/guide/page.tsx`**

```tsx
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
            <p className="pt-8 text-center text-sm text-gray-500">Artikel tidak ditemukan.</p>
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/app/guide/page.tsx
git commit -m "feat: add /guide list and search page"
```

---

### Task 5: Guide article detail page

**Files:**
- Create: `web/app/guide/[id]/page.tsx`

**Interfaces:**
- Consumes: `guideArticles` (Task 1), `GuideBlockRenderer` (Task 3), `BackButton` (existing).
- Produces: the `/guide/[id]` route.

- [ ] **Step 1: Create `web/app/guide/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { guideArticles } from "@/lib/guideArticles";
import { GuideBlockRenderer } from "@/components/GuideBlockRenderer";
import { BackButton } from "@/components/BackButton";

export function generateStaticParams() {
  return guideArticles.map((a) => ({ id: a.id }));
}

export default async function GuideArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = guideArticles.find((a) => a.id === id);
  if (!article) notFound();

  return (
    <div className="min-h-screen pb-16">
      <div className="sticky top-0 z-10 flex items-center border-b border-black/[0.08] bg-[#f6f6f8]/80 px-5 py-3 backdrop-blur-xl">
        <BackButton />
      </div>

      <div className="mx-auto max-w-[560px] px-5 pt-5">
        <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-xs font-semibold text-gray-500">
          {article.category}
        </span>
        <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-gray-900">{article.title}</h1>
        <p className="mt-1.5 text-sm text-gray-500">{article.summary}</p>

        <div className="mt-6">
          <GuideBlockRenderer blocks={article.blocks} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "web/app/guide/[id]/page.tsx"
git commit -m "feat: add guide article detail page"
```

---

### Task 6: Home screen entry point and final verification

**Files:**
- Modify: `web/app/page.tsx`

**Interfaces:**
- Consumes: `/guide` route (Task 4).

- [ ] **Step 1: Add the `BookOpen` import**

In `web/app/page.tsx`, find this line (currently line 16):

```tsx
import { Star, History, X, ArrowLeftRight, ClipboardList, Check, Copy } from "lucide-react";
```

Replace it with:

```tsx
import { Star, History, X, ArrowLeftRight, ClipboardList, Check, Copy, BookOpen } from "lucide-react";
```

- [ ] **Step 2: Restructure the header row to add the guide icon**

Find this block (currently around lines 152–155):

```tsx
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Rodalink Logo" className="h-9 w-auto object-contain" />
          <span className="text-[17px] font-bold tracking-tight text-gray-900">Roda Stock</span>
        </div>
```

Replace it with:

```tsx
        <div className="relative flex w-full items-center justify-center gap-2.5">
          <img src="/logo.png" alt="Rodalink Logo" className="h-9 w-auto object-contain" />
          <span className="text-[17px] font-bold tracking-tight text-gray-900">Roda Stock</span>
          <Link
            href="/guide"
            aria-label="Panduan Staff"
            title="Panduan Staff"
            className="absolute right-0 flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white/80 text-gray-600 backdrop-blur-md transition-all hover:border-black/20 hover:text-accent active:scale-95"
          >
            <BookOpen className="h-[18px] w-[18px]" />
          </Link>
        </div>
```

(`Link` is already imported at the top of this file.)

- [ ] **Step 3: Verify it type-checks**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `cd web && npm test`
Expected: all tests pass, including the new `guideSearch.test.ts`.

- [ ] **Step 5: Manual verification checklist**

Run: `cd web && npm run dev`, then in a browser:

- Home screen shows a book icon next to the "Roda Stock" title; tapping it opens `/guide`.
- `/guide` shows all 10 articles grouped by category (Ukuran Sepeda, Groupset, Ukuran Aksesori & Apparel, Promo, Kebijakan, Panduan Aplikasi, in that order).
- Typing "helm" in the guide search bar shows "Panduan Ukuran Helm"; typing "xyz123" shows "Artikel tidak ditemukan."
- Opening each of the 10 articles renders correctly: tables show as tables (not raw text), bullet lists show bullet markers, headings are bold.
- The "Promo & Diskon Aktif" and "Kebijakan Garansi & Servis" articles render their template placeholder text without errors.
- The back button on both `/guide` and `/guide/[id]` returns to the previous screen.
- Visiting `/guide/does-not-exist` shows the app's standard not-found page.

- [ ] **Step 5: Commit**

```bash
git add web/app/page.tsx
git commit -m "feat: add staff guide entry icon to home screen"
```
