import type { AllStockEntry } from "@/lib/allStock";
import { formatPrice, titleCase } from "@/lib/format";
import { Package } from "lucide-react";

export function AllStockRow({ entry }: { entry: AllStockEntry }) {
  const subtitle = [titleCase(entry.brand), titleCase(entry.category), entry.wheel_size]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-black/[0.06] bg-white/60 p-3.5 backdrop-blur-2xl">
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

      <div className="flex flex-col items-end shrink-0 pl-1">
        <div className="text-[14px] font-bold tracking-tight text-gray-700">
          {formatPrice(entry.price)}
        </div>
        {entry.priceSource === "fallback" && (
          <div className="text-[10px] font-medium text-gray-400">dari data stok</div>
        )}
      </div>
    </div>
  );
}
