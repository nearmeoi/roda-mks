"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

// The Shape Detection API isn't in TS's default DOM lib yet.
interface DetectedBarcode {
  rawValue: string;
}
interface NativeBarcodeDetector {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
interface NativeBarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
  getSupportedFormats?(): Promise<string[]>;
}

const NATIVE_FORMATS = [
  "code_128",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_39",
  "code_93",
  "itf",
  "codabar",
  "qr_code",
];

// TRY_HARDER is fine here: this only ever runs a bounded burst of attempts
// after a tap (not an always-on loop), so its extra per-attempt cost is paid
// a handful of times on demand, not accumulated indefinitely.
const ZXING_HINTS = new Map<DecodeHintType, unknown>([
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

const ZXING_BURST_ATTEMPTS = 15;
const ZXING_BURST_INTERVAL_MS = 200; // ~3s total burst

type Status = "idle" | "scanning" | "not-found";

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const nativeDetectorRef = useRef<NativeBarcodeDetector | null>(null);
  const timerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [hasNativeDetector, setHasNativeDetector] = useState(false);

  useEffect(() => {
    const Ctor = (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorConstructor })
      .BarcodeDetector;
    if (Ctor) {
      nativeDetectorRef.current = new Ctor({ formats: NATIVE_FORMATS });
      setHasNativeDetector(true);
    } else {
      zxingReaderRef.current = new BrowserMultiFormatReader(ZXING_HINTS);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

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
        // Native detection is hardware-accelerated and cheap enough to run
        // continuously -- restores instant, no-tap-needed scanning safely.
        if (nativeDetectorRef.current) {
          setStatus("scanning");
          runNativeLoop();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Tidak bisa mengakses kamera. Pastikan izin kamera sudah diaktifkan di browser.");
        }
      });

    return () => {
      cancelled = true;
      stoppedRef.current = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function runNativeLoop() {
    const tick = async () => {
      if (stoppedRef.current || !videoRef.current || !nativeDetectorRef.current) return;
      try {
        const results = await nativeDetectorRef.current.detect(videoRef.current);
        if (results.length > 0) {
          stoppedRef.current = true;
          onScan(results[0].rawValue);
          return;
        }
      } catch {
        // ignore a single bad frame, keep trying
      }
      if (!stoppedRef.current) {
        timerRef.current = window.setTimeout(tick, 120);
      }
    };
    tick();
  }

  function handleCapture() {
    if (!videoRef.current || !zxingReaderRef.current) return;
    setStatus("scanning");
    let attempts = 0;

    const attempt = () => {
      if (stoppedRef.current || !videoRef.current || !zxingReaderRef.current) return;
      try {
        const result = zxingReaderRef.current.decode(videoRef.current);
        setStatus("idle");
        onScan(result.getText());
      } catch (e) {
        if (!(e instanceof NotFoundException)) {
          setStatus("idle");
          return;
        }
        attempts += 1;
        if (attempts >= ZXING_BURST_ATTEMPTS) {
          setStatus("not-found");
          return;
        }
        timerRef.current = window.setTimeout(attempt, ZXING_BURST_INTERVAL_MS);
      }
    };
    attempt();
  }

  const statusText =
    status === "scanning"
      ? hasNativeDetector
        ? "Mendeteksi otomatis..."
        : "Memindai... jangan gerakkan HP"
      : status === "not-found"
        ? "Barcode tidak terbaca, coba lagi"
        : "Posisikan barcode di dalam kotak";

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
            <div
              className={`pointer-events-none absolute left-1/2 top-[42%] h-28 w-60 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 ${
                status === "scanning" ? "animate-pulse border-accent" : "border-white/80"
              }`}
            />
            <p className="pointer-events-none absolute left-0 top-[42%] w-full -translate-y-[calc(50%+64px)] px-6 text-center text-xs text-white/85">
              {statusText}
            </p>
            {!hasNativeDetector && (
              <button
                type="button"
                onClick={handleCapture}
                disabled={status === "scanning"}
                aria-label="Ambil foto barcode"
                className="absolute bottom-4 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-4 border-white/40 bg-white shadow-lg active:scale-95 disabled:opacity-60"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
