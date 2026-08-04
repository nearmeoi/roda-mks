"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  onClick?: () => void;
}

export function BackButton({ onClick }: BackButtonProps = {}) {
  const router = useRouter();

  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (typeof window !== "undefined") {
      const isInternalReferrer =
        Boolean(document.referrer) && document.referrer.includes(window.location.host);

      if (isInternalReferrer) {
        router.back();
      } else {
        router.push("/");
      }
    } else {
      router.push("/");
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
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

