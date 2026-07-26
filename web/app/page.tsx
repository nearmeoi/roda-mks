"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { getAllProducts } from "@/lib/products";
import { searchProducts } from "@/lib/search";

const allProducts = getAllProducts();

export default function HomePage() {
  const [query, setQuery] = useState("");
  const hasQuery = query.trim().length > 0;
  const results = useMemo(() => searchProducts(allProducts, query), [query]);

  return (
    <main
      className={`flex min-h-screen flex-col items-center px-4 pb-10 transition-all duration-300 ${
        hasQuery ? "justify-start pt-10" : "justify-center"
      }`}
    >
      <SearchBar value={query} onChange={setQuery} />
      {hasQuery && (
        <div className="mt-6 flex w-full max-w-xl flex-col gap-3">
          {results.length === 0 ? (
            <p className="text-center text-sm text-gray-500">Tidak ada produk ditemukan.</p>
          ) : (
            results.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <ProductCard product={product} />
              </Link>
            ))
          )}
        </div>
      )}
    </main>
  );
}
