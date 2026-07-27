"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | undefined;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current ?? undefined,
        (result, _err, scannerControls) => {
          controls = scannerControls;
          if (cancelled || !result) return;
          scannerControls.stop();
          onScan(result.getText());
        }
      )
      .catch(() => {
        if (!cancelled) {
          setError("Tidak bisa mengakses kamera. Pastikan izin kamera sudah diaktifkan di browser.");
        }
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup scanner"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>

      {error ? (
        <p className="max-w-xs px-6 text-center text-sm text-white">{error}</p>
      ) : (
        <>
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-72 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white/80" />
          <p className="pointer-events-none absolute bottom-12 px-6 text-center text-sm text-white/85">
            Arahkan kamera ke barcode produk
          </p>
        </>
      )}
    </div>
  );
}
