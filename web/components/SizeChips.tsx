import type { ProductSize } from "@/lib/types";

export function SizeChips({ sizes }: { sizes: ProductSize[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {sizes.map((size) => {
        const outOfStock = size.quantity === 0;
        return (
          <span
            key={size.article_code}
            className={`rounded-full px-3 py-1 text-xs ${
              outOfStock ? "bg-gray-100 text-gray-400 line-through" : "glass-card backdrop-blur text-gray-800"
            }`}
          >
            {size.size_code} · {outOfStock ? "Habis" : `stok ${size.quantity}`}
          </span>
        );
      })}
    </div>
  );
}
