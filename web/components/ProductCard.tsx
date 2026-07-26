import type { Product } from "@/lib/types";
import { formatPrice, sizesAvailableLabel } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  const thumbnail = product.images[0];
  return (
    <div className="glass-card flex items-center gap-3 p-3 backdrop-blur">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-emerald-100 to-blue-100">
        {thumbnail && (
          <img src={thumbnail} alt={product.model_name} className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">{product.model_name}</p>
        <p className="truncate text-xs text-gray-500">
          {product.brand} · {product.category} · {sizesAvailableLabel(product.sizes)}
        </p>
        <p className="text-xs font-semibold text-brand-green">{formatPrice(product.price)}</p>
      </div>
    </div>
  );
}
