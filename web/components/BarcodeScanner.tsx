"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { X, AlertCircle } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

interface DetectedBarcode {
  rawValue: string;
}
interface NativeBarcodeDetector {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
interface NativeBarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
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

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const nativeDetectorRef = useRef<NativeBarcodeDetector | null>(null);
  const timerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    const Ctor = (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorConstructor })
      .BarcodeDetector;
    if (Ctor) {
      nativeDetectorRef.current = new Ctor({ formats: NATIVE_FORMATS });
    } else {
      zxingReaderRef.current = new BrowserMultiFormatReader(ZXING_HINTS);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    stoppedRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Browser tidak mendukung kamera. Masukkan kode secara manual.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
        startAutoScanLoop();
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Camera access error:", err);
          setError("Izin kamera ditolak atau tidak tersedia. Masukkan kode secara manual.");
        }
      });

    return () => {
      cancelled = true;
      stoppedRef.current = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function startAutoScanLoop() {
    const tick = async () => {
      if (stoppedRef.current || !videoRef.current) return;

      // 1. Try Native BarcodeDetector if available
      if (nativeDetectorRef.current) {
        try {
          const results = await nativeDetectorRef.current.detect(videoRef.current);
          if (results.length > 0 && results[0].rawValue) {
            stoppedRef.current = true;
            onScan(results[0].rawValue);
            return;
          }
        } catch {}
      }
      // 2. Fallback to ZXing continuous decode
      else if (zxingReaderRef.current) {
        try {
          const result = zxingReaderRef.current.decode(videoRef.current);
          if (result && result.getText()) {
            stoppedRef.current = true;
            onScan(result.getText());
            return;
          }
        } catch {}
      }

      if (!stoppedRef.current) {
        timerRef.current = window.setTimeout(tick, 200);
      }
    };

    tick();
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-xl transition-all [animation:fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      {/* Sleek iOS Black Container */}
      <div
        className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-[32px] bg-black p-5 shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Right Close Button */}
        <div className="flex w-full justify-end pb-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup scanner"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-all hover:bg-white/30 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Video Viewport / Camera Box */}
        <div className="relative h-[280px] w-full overflow-hidden rounded-2xl bg-black">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white">
              <AlertCircle className="h-10 w-10 text-amber-400" />
              <p className="text-xs font-light text-gray-300">{error}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              
              {/* Instruction Text & Scanning Reticle Rectangle */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                <span className="mb-3 text-xs font-medium text-white/90 drop-shadow-md">
                  Posisikan barcode di dalam kotak
                </span>
                <div className="h-32 w-64 rounded-2xl border-2 border-white/90 shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
              </div>
            </>
          )}
        </div>

        {/* Manual Search Form - OUTSIDE & DIRECTLY BELOW CAMERA BOX */}
        <div className="mt-4 w-full">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Atau ketik artikel / barcode..."
              className="flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-normal text-white placeholder-gray-400 focus:border-white/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="rounded-full bg-white px-4 py-2.5 text-xs font-bold text-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
            >
              Cari
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
