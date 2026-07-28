import type { Product } from "@/lib/types";
import { formatPrice, getStockStatus, titleCase, totalQuantity } from "@/lib/format";
import { ArrowLeftRight, Star, Package } from "lucide-react";

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
    titleCase(product.brand),
    titleCase(product.category),
    product.wheel_size,
  ]
    .filter(Boolean)
    .join(" · ");

  // Colors to display
  const displayColors = product.colors && product.colors.length > 0
    ? product.colors
    : product.color_label
      ? [product.color_label]
      : [];

  return (
    <div className="group flex cursor-pointer flex-col gap-2 rounded-[22px] border border-white/70 bg-white/85 p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-2xl transition-all hover:border-white hover:bg-white hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] active:scale-[0.99]">
      {/* Top Row: Thumbnail Image + Full Model Name + Large Top-Right Price */}
      <div className="flex items-start gap-3">
        {/* Product Image Thumbnail */}
        {product.images && product.images.length > 0 ? (
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/[0.05] bg-white p-1 shadow-xs">
            <img
              src={product.images[0]}
              alt={product.model_name}
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/[0.03] text-gray-400 border border-black/[0.04]">
            <Package className="h-6 w-6 opacity-40" />
          </div>
        )}

        {/* Full Model Name & Subtitle (Left/Middle) */}
        <div className="min-w-0 flex-1 pr-1">
          <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-gray-900 break-words">
            {titleCase(product.model_name)}
          </h3>
          <div className="mt-0.5 text-[11.5px] font-medium text-gray-500 truncate">
            {subtitle}
          </div>
        </div>

        {/* Top Right: Large Price aligned with Name */}
        <div className="flex flex-col items-end shrink-0 pl-1">
          <div className="text-[16px] font-bold tracking-tight text-gray-900">
            {formatPrice(product.price)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-gray-600">
            <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: status.dotColor }} />
            <span>{qty} Unit</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Row: Colors & Action Buttons (Compare & Star) */}
      <div className="flex items-center justify-between gap-2 border-t border-black/[0.04] pt-2 mt-0.5">
        {/* Left: Ready Colors Pill Badges */}
        {displayColors.length > 0 ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-1 truncate">
              {displayColors.slice(0, 3).map((c, i) => (
                <span
                  key={i}
                  className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold text-gray-700 border border-black/[0.04]"
                >
                  {titleCase(c)}
                </span>
              ))}
              {displayColors.length > 3 && (
                <span className="text-[10px] text-gray-400 font-semibold">+{displayColors.length - 3}</span>
              )}
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Right: iOS Action Buttons (Compare & Star) */}
        <div className="flex shrink-0 items-center gap-1.5 ml-auto">
          {onToggleCompare && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleCompare(e);
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all active:scale-95 ${isCompared
                ? "border-accent bg-accent text-white shadow-xs"
                : "border-black/[0.08] bg-black/[0.02] text-gray-600 hover:text-accent hover:border-accent/40"
                }`}
              title={isCompared ? "Keluarkan dari perbandingan" : "Tambahkan ke perbandingan"}
            >
              <ArrowLeftRight className="h-3 w-3" />
            </button>
          )}

          {onToggleFav && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFav(e);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-black/[0.06] bg-black/[0.02] transition-all hover:bg-black/[0.08] active:scale-95"
              title={isFav ? "Hapus dari favorit" : "Tambahkan ke favorit"}
            >
              <Star
                className="h-3.5 w-3.5"
                fill={isFav ? "#f59e0b" : "none"}
                stroke={isFav ? "#d97706" : "#9ca3af"}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
