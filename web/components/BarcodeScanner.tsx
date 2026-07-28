"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera, X, AlertCircle, RefreshCw } from "lucide-react";

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
  const [isScanning, setIsScanning] = useState(true);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-md [animation:fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gray-900 border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-gray-900/80">
          <div className="flex items-center gap-2 text-white">
            <Camera className="h-4 w-4 text-accent" />
            <span className="text-sm font-bold">Pemindai Barcode Autodetektif</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup scanner"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Video Viewport / Error Fallback */}
        <div className="relative h-[320px] w-full bg-black">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white">
              <AlertCircle className="h-10 w-10 text-amber-400" />
              <p className="text-xs text-gray-300">{error}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              {/* Scanning Reticle Box */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-64 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-accent shadow-[0_0_20px_rgba(230,0,18,0.5)]">
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-accent/80 animate-pulse" />
              </div>
              <div className="pointer-events-none absolute bottom-4 inset-x-0 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10">
                  <RefreshCw className="h-3 w-3 animate-spin text-accent" />
                  Mendeteksi otomatis... paskan barcode di kotak
                </span>
              </div>
            </>
          )}
        </div>

        {/* Fallback Manual Entry Input */}
        <div className="border-t border-white/10 bg-gray-900 p-4">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Atau ketik artikel / barcode..."
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-gray-400 focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              Cari
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
