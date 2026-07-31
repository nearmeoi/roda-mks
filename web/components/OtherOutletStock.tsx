"use client";

import { useState } from "react";
import { MapPin, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { titleCase } from "@/lib/format";
import { ensureOutletStockLoaded, searchOutletStock, type OutletStockResult } from "@/lib/outletStock";

type OutletEntry = OutletStockResult["outlets"][number];

function shortOutletName(name: string): string {
  return titleCase(name.replace("RODALINK", "").trim());
}

const VISIBLE_LIMIT = 6;

function SpecialRow({ label, qty, weekLabel }: { label: string; qty: number | null; weekLabel: string | null }) {
  if (qty === null && !weekLabel) return null;
  const isRestock = weekLabel !== null;
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 ${
        isRestock ? "bg-amber-50" : "bg-accent/[0.07]"
      }`}
    >
      <span className={`text-[13px] font-semibold ${isRestock ? "text-amber-700" : "text-accent"}`}>{label}</span>
      <span className={`shrink-0 text-[11px] font-bold ${isRestock ? "text-amber-700" : "text-accent"}`}>
        {isRestock ? weekLabel : `${qty} unit`}
      </span>
    </div>
  );
}

function OutletRow({ outlet }: { outlet: OutletEntry }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div className="min-w-0 pr-2">
        <div className="truncate text-[13px] font-medium text-gray-800">{shortOutletName(outlet.name)}</div>
        {outlet.city && <div className="truncate text-[11px] text-gray-400">{titleCase(outlet.city)}</div>}
      </div>
      <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-bold tabular-nums text-gray-700">
        {outlet.qty}
      </span>
    </div>
  );
}

function VariantGroup({ result, showHeader }: { result: OutletStockResult; showHeader: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const visibleOutlets = expanded ? result.outlets : result.outlets.slice(0, VISIBLE_LIMIT);
  const remaining = result.outlets.length - visibleOutlets.length;
  const hasSpecial = result.hq.qty !== null || result.hq.weekLabel || result.bs.qty !== null || result.bs.weekLabel;

  return (
    <div className="px-4 py-3">
      {showHeader && <div className="mb-2 text-[11px] font-semibold text-gray-400">{result.description}</div>}
      <div className="overflow-hidden rounded-xl border border-black/[0.06]">
        {hasSpecial && (
          <div className="divide-y divide-black/[0.05] border-b border-black/[0.05]">
            <SpecialRow label="HQ" qty={result.hq.qty} weekLabel={result.hq.weekLabel} />
            <SpecialRow label="Bike Science" qty={result.bs.qty} weekLabel={result.bs.weekLabel} />
          </div>
        )}
        <div className="divide-y divide-black/[0.05]">
          {visibleOutlets.map((o) => (
            <OutletRow key={o.code} outlet={o} />
          ))}
        </div>
      </div>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-accent"
        >
          <ChevronDown className="h-3 w-3" />
          <span>{remaining} outlet lainnya</span>
        </button>
      )}
    </div>
  );
}

// Shown on every product detail page. Reads a local snapshot (refreshed
// occasionally via pipeline/fetch_pos_outlet_stock.py) on demand -- never
// automatically -- rather than querying POS live.
export function OtherOutletStock({ query }: { query: string }) {
  const [state, setState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [results, setResults] = useState<OutletStockResult[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCheck = async () => {
    setState("loading");
    try {
      await ensureOutletStockLoaded();
      setResults(searchOutletStock(query));
      setState("loaded");
    } catch {
      setErrorMsg("Gagal memuat data outlet");
      setState("error");
    }
  };

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={handleCheck}
        className="mb-5.5 flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/70 px-3.5 py-2 text-xs font-semibold text-gray-700 transition-all hover:border-accent/40 hover:text-accent active:scale-95"
      >
        <MapPin className="h-3.5 w-3.5" />
        <span>Cek Outlet Lain</span>
      </button>
    );
  }

  if (state === "loading") {
    return (
      <div className="mb-5.5 flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/70 px-3.5 py-2 text-xs font-semibold text-gray-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Mengecek outlet lain...</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mb-5.5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">
        <span>{errorMsg}</span>
        <button
          type="button"
          onClick={handleCheck}
          className="ml-auto flex items-center gap-1 font-semibold hover:underline"
        >
          <RefreshCw className="h-3 w-3" />
          Coba lagi
        </button>
      </div>
    );
  }

  const hasAny = results.some(
    (r) => r.outlets.length > 0 || r.hq.qty || r.hq.weekLabel || r.bs.qty || r.bs.weekLabel
  );

  return (
    <div className="mb-5.5 overflow-hidden rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-lg">
      <div className="flex items-center justify-between border-b border-black/[0.08] px-4 py-2.5">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-gray-400">Stok Outlet Lain</span>
        <button type="button" onClick={handleCheck} className="text-gray-400 hover:text-accent" aria-label="Muat ulang">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {!hasAny ? (
        <div className="px-4 py-3 text-xs text-gray-400">Tidak tersedia di outlet lain.</div>
      ) : (
        <div className="divide-y divide-black/[0.05]">
          {results.map((r) => (
            <VariantGroup key={r.articleCode} result={r} showHeader={results.length > 1} />
          ))}
        </div>
      )}
    </div>
  );
}
