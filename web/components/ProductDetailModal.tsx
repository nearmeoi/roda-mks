"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/lib/types";
import { ProductDetailContent } from "@/components/ProductDetailContent";

export function ProductDetailModal({
  product,
  allProducts,
  onClose,
  onSelectProduct,
  onSearchQuery,
}: {
  product: Product;
  allProducts: Product[];
  onClose: () => void;
  onSelectProduct?: (p: Product) => void;
  onSearchQuery?: (q: string) => void;
}) {
  const isPushedRef = useRef(false);

  // Prevent body scroll and sync with browser history/back button when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";

    if (!isPushedRef.current) {
      window.history.pushState({ modal: true }, "");
      isPushedRef.current = true;
    }

    const handlePopState = () => {
      isPushedRef.current = false;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isPushedRef.current) {
          isPushedRef.current = false;
          window.history.back();
        }
        onClose();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleBack = () => {
    if (isPushedRef.current) {
      isPushedRef.current = false;
      window.history.back();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f6f6f8] [animation:slideInRight_0.25s_ease]">
      <div className="relative min-h-screen">
        <ProductDetailContent
          product={product}
          allProducts={allProducts}
          onBack={handleBack}
          onSelectProduct={onSelectProduct}
          onSearchQuery={onSearchQuery}
        />
      </div>
    </div>
  );
}

