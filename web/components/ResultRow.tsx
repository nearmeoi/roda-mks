import type { Product } from "@/lib/types";
import { formatPrice, getStockStatus, titleCase, totalQuantity } from "@/lib/format";
import { ArrowLeftRight, Star, Package, Check } from "lucide-react";

export function ResultRow({
  product,
  isFav = false,
  onToggleFav,
  isCompared = false,
  onToggleCompare,
  selectable = false,
  isSelected = false,
  onToggleSelect,
  inGroup = false,
}: {
  product: Product;
  isFav?: boolean;
  onToggleFav?: (e: React.MouseEvent) => void;
  isCompared?: boolean;
  onToggleCompare?: (e: React.MouseEvent) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
  // When true, renders as a flat row (padding + hover feedback only) so a
  // shared container can supply the card chrome once for the whole list,
  // instead of every row carrying its own border/shadow/blur.
  inGroup?: boolean;
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

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectable && onToggleSelect) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect(e);
    }
  };

  const standaloneChrome = `rounded-[22px] border shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-2xl active:scale-[0.99] ${
    selectable && isSelected
      ? "border-accent/60 bg-accent/[0.06] shadow-[0_4px_20px_rgba(10,124,255,0.12)]"
      : "border-white/70 bg-white/85 hover:border-white hover:bg-white hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)]"
  }`;
  const groupedChrome = selectable && isSelected ? "bg-accent/[0.06]" : "active:bg-black/[0.03]";

  return (
    <div
      onClick={handleCardClick}
      className={`group flex cursor-pointer flex-col gap-2 p-3.5 transition-all ${inGroup ? groupedChrome : standaloneChrome}`}
    >
      {/* Top Row: Select Checkbox + Thumbnail Image + Full Model Name + Price */}
      <div className="flex items-start gap-3">
        {/* Selection Checkbox (if in select mode) */}
        {selectable && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onToggleSelect) onToggleSelect(e);
            }}
            className={`mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
              isSelected
                ? "border-accent bg-accent text-white shadow-xs"
                : "border-gray-300 bg-white hover:border-gray-400"
            }`}
            aria-label={isSelected ? "Batal pilih produk" : "Pilih produk"}
          >
            {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </button>
        )}

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

        {/* Full Model Name & Subtitle */}
        <div className="min-w-0 flex-1 pr-1">
          <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-gray-900 break-words">
            {titleCase(product.model_name)}
          </h3>
          <div className="mt-0.5 text-[11.5px] font-medium text-gray-500 truncate">
            {subtitle}
          </div>
        </div>

        {/* Top Right: Price aligned with Name */}
        <div className="flex flex-col items-end shrink-0 pl-1">
          <div className="text-[16px] font-bold tracking-tight text-gray-900">
            {formatPrice(product.price)}
          </div>
          <div className="mt-0.5 text-[11.5px] font-medium text-gray-500">
            {qty} Unit
          </div>
        </div>
      </div>

      {/* Bottom Footer Row: Colors & Action Buttons */}
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

        {/* Right: Action Buttons (Compare & Star) - hidden in select mode if desired, or shown */}
        {!selectable && (
          <div className="flex shrink-0 items-center gap-1.5 ml-auto">
            {onToggleCompare && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleCompare(e);
                }}
                className={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[10.5px] font-semibold transition-all active:scale-95 ${
                  isCompared
                    ? "border-accent bg-accent text-white shadow-xs"
                    : "border-black/[0.08] bg-black/[0.02] text-gray-600 hover:text-accent hover:border-accent/40"
                }`}
                title={isCompared ? "Keluarkan dari perbandingan" : "Tambahkan ke perbandingan"}
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>{isCompared ? "Dibandingkan" : "Bandingkan"}</span>
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
        )}
      </div>
    </div>
  );
}
