import type { Product } from "@/lib/types";
import { formatPrice, getStockStatus, totalQuantity } from "@/lib/format";
import { ArrowLeftRight, Star } from "lucide-react";

export function ResultRow({
  product,
  isFav = false,
  onToggleFav,
  isCompared = false,
  onToggleCompare,
}: {
  product: Product;
  isFav?: boolean;
  onToggleFav?: (e: React.MouseEvent) => void;
  isCompared?: boolean;
  onToggleCompare?: (e: React.MouseEvent) => void;
}) {
  const qty = totalQuantity(product.sizes);
  const status = getStockStatus(qty);

  const subtitle = [
    product.brand,
    product.category,
    product.wheel_size,
  ]
    .filter(Boolean)
    .join(" · ");

  // Colors to display (either from scraped colors array or color_label fallback)
  const displayColors = product.colors && product.colors.length > 0
    ? product.colors
    : product.color_label
    ? [product.color_label]
    : [];

  // Key specs preview (first 2 spec entries)
  const specEntries = product.specs ? Object.entries(product.specs) : [];
  const specPreview = specEntries.slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" • ");

  return (
    <div className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-black/[0.08] bg-white/80 p-3 backdrop-blur-lg transition-all hover:border-black/20 hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)]">
      {/* Product Image Thumbnail */}
      {product.images && product.images.length > 0 ? (
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/[0.06] bg-white p-1">
          <img
            src={product.images[0]}
            alt={product.model_name}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-gray-400 border border-black/[0.04]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
            <circle cx="5.5" cy="17.5" r="3.5" />
            <circle cx="18.5" cy="17.5" r="3.5" />
            <path d="M15 6h2l3 6.5" />
            <path d="M12 17.5V14l-3-3 4-3 2 3h3" />
          </svg>
        </div>
      )}

      {/* Main Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-[14.5px] font-semibold text-gray-900">{product.model_name}</div>
        </div>
        <div className="mt-0.5 truncate text-[12px] text-gray-500">{subtitle}</div>

        {/* Ready Colors Preview */}
        {displayColors.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="text-[10.5px] font-medium text-gray-400">Warna:</span>
            {displayColors.slice(0, 3).map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[10.5px] font-medium text-gray-700 border border-black/[0.04]"
              >
                {c}
              </span>
            ))}
            {displayColors.length > 3 && (
              <span className="text-[10px] font-medium text-gray-400">+{displayColors.length - 3}</span>
            )}
          </div>
        )}

        {/* Specs Preview (if available) */}
        {specPreview && (
          <div className="mt-0.5 truncate text-[11px] text-gray-400 italic">
            {specPreview}
          </div>
        )}
      </div>

      {/* Price, Stock & Action Buttons */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex flex-col items-end gap-0.5">
          <div className="text-[14px] font-bold text-gray-900">{formatPrice(product.price)}</div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: status.dotColor }} />
            <span className="text-[11px] font-medium text-gray-500">{status.label}</span>
          </div>
        </div>

        {/* Compare Toggle Button */}
        {onToggleCompare && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleCompare(e);
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all active:scale-95 ${
              isCompared
                ? "border-accent bg-accent text-white"
                : "border-black/[0.08] bg-black/[0.02] text-gray-400 hover:text-accent hover:border-accent/40"
            }`}
            title={isCompared ? "Keluarkkan dari perbandingan" : "Tambahkan ke perbandingan"}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Favorite Star Button */}
        {onToggleFav && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFav(e);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.06] bg-black/[0.02] p-1.5 transition-all hover:bg-black/[0.08] active:scale-95"
            title={isFav ? "Hapus dari Favorit" : "Tambah ke Favorit"}
          >
            <Star
              className="h-4 w-4"
              fill={isFav ? "#f59e0b" : "none"}
              stroke={isFav ? "#d97706" : "#9ca3af"}
            />
          </button>
        )}
      </div>
    </div>
  );
}
