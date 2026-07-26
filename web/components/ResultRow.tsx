import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export function ResultRow({ product }: { product: Product }) {
  return (
    <div className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-black/[0.08] bg-white/70 px-3.5 py-3 backdrop-blur-lg transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
      <div
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl font-mono text-[9px] text-gray-400"
        style={{
          background: "repeating-linear-gradient(135deg, #eef0f3, #eef0f3 6px, #e5e7eb 6px, #e5e7eb 12px)",
        }}
      >
        foto
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-gray-900">{product.model_name}</div>
        <div className="mt-0.5 text-[12.5px] text-gray-500">
          {product.brand} · {product.category}
        </div>
      </div>
      <div className="shrink-0 text-sm font-semibold text-gray-900">{formatPrice(product.price)}</div>
      <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0 opacity-35">
        <path d="M1 1L7 7L1 13" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
