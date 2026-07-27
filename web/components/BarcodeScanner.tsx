"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

const HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.TRY_HARDER, true],
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
      BarcodeFormat.QR_CODE,
    ],
  ],
]);

// Library defaults to a decode attempt every 500ms -- far too slow for a quick
// pass over a barcode. Scan near-continuously instead.
const READER_OPTIONS = { delayBetweenScanAttempts: 50 };

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(HINTS, READER_OPTIONS);
    let cancelled = false;

    // Chain cleanup onto the promise decodeFromConstraints ITSELF returns (which
    // resolves as soon as the stream/decode loop starts), not onto a `controls`
    // variable captured from inside the per-frame callback -- that callback may
    // not have fired yet by the time React's Strict Mode double-invokes this
    // effect in dev (mount -> cleanup -> mount), which left the first, visible
    // camera session's results silently dropped forever (`cancelled` was already
    // true for that closure) while a second, uncleaned-up session raced it.
    const controlsPromise = reader.decodeFromConstraints(
      {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      videoRef.current ?? undefined,
      (result, _err, scannerControls) => {
        if (cancelled || !result) return;
        cancelled = true;
        scannerControls.stop();
        onScan(result.getText());
      }
    );

    controlsPromise.catch(() => {
      if (!cancelled) {
        setError("Tidak bisa mengakses kamera. Pastikan izin kamera sudah diaktifkan di browser.");
      }
    });

    return () => {
      cancelled = true;
      controlsPromise.then((controls) => controls.stop()).catch(() => {});
    };
  }, [onScan]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-black/60 px-4 pt-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-black shadow-2xl"
        style={{ height: "55vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup scanner"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>

        {error ? (
          <div className="flex h-full items-center justify-center px-6">
            <p className="text-center text-sm text-white">{error}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-60 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white/80" />
            <p className="pointer-events-none absolute bottom-5 left-0 w-full px-6 text-center text-xs text-white/85">
              Arahkan kamera ke barcode produk
            </p>
          </>
        )}
      </div>
    </div>
  );
}
