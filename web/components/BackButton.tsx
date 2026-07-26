"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      className="flex items-center gap-1 text-base font-medium transition-opacity hover:opacity-80"
    >
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
        <path
          d="M9 1L2 8L9 15"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span style={{ color: "var(--color-accent)" }}>Kembali</span>
    </button>
  );
}
