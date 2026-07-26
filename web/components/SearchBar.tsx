"use client";

import type { FormEvent } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-pill flex h-14 w-full max-w-xl items-center gap-2 px-2 backdrop-blur-lg backdrop-saturate-150"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green text-lg text-white">
        +
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cari apa?"
        className="flex-1 border-none bg-transparent text-gray-800 outline-none placeholder:text-gray-500"
      />
      <button
        type="submit"
        aria-label="Cari"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5"
      >
        🔍
      </button>
    </form>
  );
}
