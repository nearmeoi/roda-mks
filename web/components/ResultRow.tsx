import type { Product } from "@/lib/types";
import { formatPrice, getStockStatus, totalQuantity } from "@/lib/format";

export function ResultRow({ product }: { product: Product }) {
  const qty = totalQuantity(product.sizes);
  const status = getStockStatus(qty);
  const subtitle = [
    product.brand,
    product.category,
    product.wheel_size,
    product.color_label,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-black/[0.08] bg-white/70 px-3.5 py-3 backdrop-blur-lg transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
      {product.images && product.images.length > 0 ? (
        <img
          src={product.images[0]}
          alt={product.model_name}
          className="h-[52px] w-[52px] shrink-0 rounded-xl object-cover border border-black/[0.06]"
        />
      ) : (
        <div
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-gray-400"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
            <circle cx="5.5" cy="17.5" r="3.5" />
            <circle cx="18.5" cy="17.5" r="3.5" />
            <path d="M15 6h2l3 6.5" />
            <path d="M12 17.5V14l-3-3 4-3 2 3h3" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-gray-900">{product.model_name}</div>
        <div className="mt-0.5 truncate text-[12.5px] text-gray-500">{subtitle}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="text-sm font-semibold text-gray-900">{formatPrice(product.price)}</div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: status.dotColor }} />
          <span className="text-[11px] text-gray-500">{status.label}</span>
        </div>
      </div>
      <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0 opacity-35">
        <path d="M1 1L7 7L1 13" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

