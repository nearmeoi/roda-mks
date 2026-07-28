"use client";

import { useState } from "react";
import { BarcodeScanner } from "./BarcodeScanner";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  hasQuery: boolean;
  onClear: () => void;
}

export function SearchBar({ value, onChange, hasQuery, onClear }: SearchBarProps) {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute left-4 right-4 top-0.5 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />
      <div className="pointer-events-none absolute -bottom-3.5 left-0 h-4 w-full rounded-full bg-accent/25 blur-md" />
      <div className="glass-pill relative flex h-[60px] items-center gap-2 rounded-full p-1.5 backdrop-blur-xl backdrop-saturate-200">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(160deg, color-mix(in oklab, var(--color-accent) 70%, white), var(--color-accent))",
            boxShadow: "0 3px 10px rgba(10,124,255,0.4), inset 0 1px 1px rgba(255,255,255,0.6)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2.2" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cari nama, kode, atau brand barang"
          className="h-full min-w-0 flex-1 border-none bg-transparent text-base text-gray-900 outline-none"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Hapus pencarian"
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-black/10"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M5 5L19 19M19 5L5 19" stroke="#5b5b60" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          aria-label="Pindai barcode"
          className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 6V4a1 1 0 0 1 1-1h2M3 18v2a1 1 0 0 0 1 1h2M21 6V4a1 1 0 0 0-1-1h-2M21 18v2a1 1 0 0 1-1 1h-2" stroke="#5b5b60" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 7v10M10 7v10M13 7v10M15.5 7v10M18 7v10" stroke="#5b5b60" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={(code) => {
            setShowScanner(false);
            onChange(code);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
