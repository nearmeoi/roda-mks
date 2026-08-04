"use client";

import { useState } from "react";
import type { AllStockEntry } from "@/lib/allStock";
import { formatPrice, titleCase } from "@/lib/format";
import {
  ensureOutletStockLoaded,
  searchOutletStock,
  type OutletStockResult,
} from "@/lib/outletStock";
import { Package, ChevronDown, MapPin, Loader2, Store } from "lucide-react";

function shortOutletName(name: string): string {
  return titleCase(name.replace(/^RODALINK\s+/i, "").trim());
}

export function AllStockRow({ entry }: { entry: AllStockEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outletResults, setOutletResults] = useState<OutletStockResult[] | null>(null);
  const [showAllOutlets, setShowAllOutlets] = useState(false);

  const subtitle = [titleCase(entry.brand), titleCase(entry.category), entry.wheel_size]
    .filter(Boolean)
    .join(" · ");

  const handleToggle = async () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    if (nextState && !outletResults) {
      setLoading(true);
      try {
        await ensureOutletStockLoaded();
        let res = searchOutletStock(entry.model_name);
        if (res.length === 0 && entry.brand) {
          res = searchOutletStock(`${entry.brand} ${entry.model_name}`);
        }
        setOutletResults(res);
      } catch (err) {
        console.error("Failed to load outlet stock", err);
        setOutletResults([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const allOutlets = outletResults
    ? outletResults.flatMap((r) => r.outlets)
    : [];

  const outletMap = new Map<string, { code: string; name: string; city: string | null; qty: number }>();
  allOutlets.forEach((o) => {
    const existing = outletMap.get(o.code);
    if (!existing || o.qty > existing.qty) {
      outletMap.set(o.code, o);
    }
  });

  const uniqueOutlets = Array.from(outletMap.values()).sort((a, b) => b.qty - a.qty);
  const totalUnits = uniqueOutlets.reduce((acc, o) => acc + o.qty, 0);

  const visibleOutlets = showAllOutlets ? uniqueOutlets : uniqueOutlets.slice(0, 5);
  const remainingCount = uniqueOutlets.length - visibleOutlets.length;

  return (
    <div className="w-full transition-colors">
      <button
        type="button"
        onClick={handleToggle}
        className={`flex w-full items-center justify-between gap-3 p-3.5 text-left transition-colors hover:bg-black/[0.02] active:bg-black/[0.04] ${
          isExpanded ? "bg-black/[0.015]" : ""
        }`}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.03] text-gray-400 border border-black/[0.04]">
          <Package className="h-5 w-5 opacity-40" />
        </div>

        <div className="min-w-0 flex-1 pr-1">
          <h3 className="text-[14px] font-semibold leading-snug tracking-tight text-gray-800 break-words">
            {titleCase(entry.model_name)}
          </h3>
          <div className="mt-0.5 text-[11px] font-medium text-gray-500 truncate">
            {subtitle}
            {entry.color_label && ` · ${titleCase(entry.color_label)}`}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pl-1">
          <div className="flex flex-col items-end">
            <div className="text-[14px] font-bold tracking-tight text-gray-700">
              {formatPrice(entry.price)}
            </div>
            {entry.priceSource === "fallback" && (
              <div className="text-[10px] font-medium text-gray-400">dari data stok</div>
            )}
            {entry.priceSource === "pos" && (
              <div className="text-[10px] font-medium text-gray-400">dari POS</div>
            )}
          </div>

          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.04] text-gray-400 transition-transform duration-200 ${
              isExpanded ? "rotate-180 text-gray-700" : ""
            }`}
          >
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-black/[0.05] bg-gray-50/70 p-3.5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              <span>Memuat ketersediaan stok outlet...</span>
            </div>
          ) : uniqueOutlets.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <span>Ditemukan di {uniqueOutlets.length} Outlet</span>
                </span>
                <span className="text-[11px] font-semibold text-gray-500">
                  Total {totalUnits} unit
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white divide-y divide-black/[0.05]">
                {visibleOutlets.map((o) => (
                  <div key={o.code} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                        <Store className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{shortOutletName(o.name)}</span>
                      </div>
                      {o.city && (
                        <div className="pl-5 text-[10px] font-medium text-gray-400 truncate">
                          {titleCase(o.city)}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-700">
                      {o.qty} unit
                    </span>
                  </div>
                ))}
              </div>

              {remainingCount > 0 && !showAllOutlets && (
                <button
                  type="button"
                  onClick={() => setShowAllOutlets(true)}
                  className="mt-1 flex items-center justify-center gap-1 text-center text-xs font-semibold text-gray-500 hover:text-gray-800 hover:underline py-1"
                >
                  Lihat {remainingCount} outlet lainnya...
                </button>
              )}
            </div>
          ) : (
            <div className="py-3 text-center text-xs font-medium text-gray-400">
              Stok produk ini tidak terdeteksi di daftar toko fisik POS saat ini.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
