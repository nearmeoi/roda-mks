"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

// TRY_HARDER is safe here: this reader now only decodes ONE frame per button
// tap, not a continuous loop, so its extra per-attempt cost (which made
// continuous scanning take 5-10s on Android) no longer accumulates -- it's
// paid once, on demand, and buys better accuracy for that single shot.
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

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  if (!readerRef.current) {
    readerRef.current = new BrowserMultiFormatReader(HINTS);
  }

  useEffect(() => {
    let cancelled = false;

    // Plain getUserMedia for a live preview only -- no decode loop attached.
    // Nothing runs on the CPU here besides rendering the camera feed until
    // the capture button is tapped.
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Tidak bisa mengakses kamera. Pastikan izin kamera sudah diaktifkan di browser.");
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function handleCapture() {
    if (!videoRef.current || !readerRef.current) return;
    setNotFound(false);
    try {
      const result = readerRef.current.decode(videoRef.current);
      onScan(result.getText());
    } catch (e) {
      if (e instanceof NotFoundException) {
        setNotFound(true);
      }
    }
  }

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
            <div className="pointer-events-none absolute left-1/2 top-[42%] h-28 w-60 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white/80" />
            <p className="pointer-events-none absolute left-0 top-[42%] w-full -translate-y-[calc(50%+64px)] px-6 text-center text-xs text-white/85">
              {notFound ? "Barcode tidak terbaca, coba lagi" : "Posisikan barcode di dalam kotak"}
            </p>
            <button
              type="button"
              onClick={handleCapture}
              aria-label="Ambil foto barcode"
              className="absolute bottom-4 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-4 border-white/40 bg-white shadow-lg active:scale-95"
            />
          </>
        )}
      </div>
    </div>
  );
}
