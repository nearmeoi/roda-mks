"use client";

import { useEffect } from "react";
import type { Product } from "@/lib/types";
import { ProductDetailContent } from "@/components/ProductDetailContent";

export function ProductDetailModal({
  product,
  allProducts,
  onClose,
}: {
  product: Product;
  allProducts: Product[];
  onClose: () => void;
}) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f6f6f8] [animation:slideInRight_0.25s_ease]">
      <div className="relative min-h-screen">
        <ProductDetailContent product={product} allProducts={allProducts} />
      </div>
    </div>
  );
}
