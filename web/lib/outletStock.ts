import { formatWeekLabel, parseWeekMarker } from "./weekLabel";

interface OutletInfo {
  name: string;
  city: string | null;
  active: boolean;
}

interface StockSnapshotEntry {
  description: string;
  outlets: Record<string, number>;
  HQ: number | string | null;
  BS: number | string | null;
}

export interface OutletStockResult {
  articleCode: number;
  description: string;
  outlets: { code: string; name: string; city: string | null; qty: number }[];
  hq: { qty: number | null; weekLabel: string | null };
  bs: { qty: number | null; weekLabel: string | null };
}

function parseSpecialField(value: number | string | null): { qty: number | null; weekLabel: string | null } {
  if (typeof value === "number") return { qty: value, weekLabel: null };
  if (typeof value === "string") {
    const week = parseWeekMarker(value);
    if (week !== null) {
      return { qty: null, weekLabel: `${value} (${formatWeekLabel(week)})` };
    }
    const parsed = parseInt(value, 10);
    return { qty: Number.isNaN(parsed) ? null : parsed, weekLabel: null };
  }
  return { qty: null, weekLabel: null };
}

const MAX_RESULTS = 20;

// Fetched once from /public and cached in module scope for the tab's
// lifetime -- same lazy-load pattern as lib/allStock.ts. Not statically
// imported: it's ~1.5MB, no reason to bundle it into every page load when
// most visits never open the "Cek Outlet Lain" panel.
let stockCache: Record<string, StockSnapshotEntry> | null = null;
let outletCache: Record<string, OutletInfo> | null = null;
let inflight: Promise<void> | null = null;

export function ensureOutletStockLoaded(): Promise<void> {
  if (stockCache && outletCache) return Promise.resolve();
  if (!inflight) {
    inflight = Promise.all([
      fetch("/pos_outlet_stock.json").then((r) => (r.ok ? r.json() : {})),
      fetch("/pos_outlets.json").then((r) => (r.ok ? r.json() : {})),
    ])
      .then(([stock, outlets]) => {
        stockCache = stock;
        outletCache = outlets;
      })
      .catch(() => {
        stockCache = {};
        outletCache = {};
      });
  }
  return inflight;
}

export function searchOutletStock(query: string): OutletStockResult[] {
  if (!stockCache || !outletCache) return [];
  const trimmed = query.trim();
  if (!trimmed) return [];

  let matches: [string, StockSnapshotEntry][];
  if (stockCache[trimmed]) {
    matches = [[trimmed, stockCache[trimmed]]];
  } else {
    const needle = trimmed.toLowerCase();
    matches = Object.entries(stockCache)
      .filter(([, entry]) => entry.description.toLowerCase().includes(needle))
      .slice(0, MAX_RESULTS);
  }

  return matches.map(([articleCode, entry]) => {
    const outlets = Object.entries(entry.outlets)
      .map(([code, qty]) => {
        const info = outletCache![code];
        return { code, name: info?.name ?? code, city: info?.city ?? null, qty };
      })
      .sort((a, b) => b.qty - a.qty);

    return {
      articleCode: Number(articleCode),
      description: entry.description,
      outlets,
      hq: parseSpecialField(entry.HQ),
      bs: parseSpecialField(entry.BS),
    };
  });
}
