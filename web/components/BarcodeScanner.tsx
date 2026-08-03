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
  detect(source: HTMLVideoElement | HTMLCanvasElement): Promise<DetectedBarcode[]>;
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

// The video uses object-cover inside its container, so its rendered CSS
// size isn't the same as its native resolution -- map the reticle overlay's
// on-screen rect into native video pixel coordinates for the crop.
function getCropRect(
  video: HTMLVideoElement,
  reticle: HTMLDivElement
): { sx: number; sy: number; sw: number; sh: number } | null {
  const videoRect = video.getBoundingClientRect();
  const reticleRect = reticle.getBoundingClientRect();

  if (
    videoRect.width === 0 ||
    videoRect.height === 0 ||
    video.videoWidth === 0 ||
    video.videoHeight === 0
  ) {
    return null;
  }

  // object-cover applies ONE uniform scale (not independent X/Y stretching)
  // -- the native video is magnified by cssPerNative = max(boxW/nativeW,
  // boxH/nativeH) to just cover the box, then whichever dimension overflows
  // gets center-cropped. Map a box-relative CSS point into native pixels by
  // going the other way: shift by the cropped-off margin, then scale by
  // the inverse.
  const cssPerNative = Math.max(
    videoRect.width / video.videoWidth,
    videoRect.height / video.videoHeight
  );
  const nativePerCss = 1 / cssPerNative;

  const displayedWidth = video.videoWidth * cssPerNative;
  const displayedHeight = video.videoHeight * cssPerNative;
  const cropLeft = (displayedWidth - videoRect.width) / 2;
  const cropTop = (displayedHeight - videoRect.height) / 2;

  const boxX = reticleRect.left - videoRect.left;
  const boxY = reticleRect.top - videoRect.top;

  // 1D barcodes need a blank "quiet zone" margin around them to decode
  // reliably. Cropping exactly to the reticle's bounds risks clipping that
  // margin off if the user fills the box edge-to-edge (which the on-screen
  // instruction encourages), making scanning worse rather than better -- so
  // pad the crop 15% of the reticle's size on each side, clamped to the
  // native video's bounds.
  const padX = reticleRect.width * 0.15 * nativePerCss;
  const padY = reticleRect.height * 0.15 * nativePerCss;
  const rawSx = (boxX + cropLeft) * nativePerCss;
  const rawSy = (boxY + cropTop) * nativePerCss;
  const sx = Math.max(0, rawSx - padX);
  const sy = Math.max(0, rawSy - padY);
  const sw = Math.min(video.videoWidth - sx, reticleRect.width * nativePerCss + padX * 2);
  const sh = Math.min(video.videoHeight - sy, reticleRect.height * nativePerCss + padY * 2);

  if (sw <= 0 || sh <= 0) return null;
  return { sx, sy, sw, sh };
}

// Since iOS 16.3, Safari exposes each back camera lens as a separate
// enumerable device -- the ultra-wide lens can focus much closer than the
// default wide lens, which is the actual cause of close-range blur on
// iPhone 12/13/14+ (a hardware minimum-focus-distance limit, not something
// fixable via focusMode/focusDistance constraints -- those are confirmed
// unsupported in Safari). If no matching device is found, or anything
// about the lookup/switch fails, this silently returns the original
// stream unchanged -- pure enhancement, never a regression.
async function tryUseUltraWideLens(stream: MediaStream): Promise<MediaStream> {
  try {
    const currentTrack = stream.getVideoTracks()[0];
    const currentDeviceId = currentTrack?.getSettings().deviceId;

    if (!navigator.mediaDevices?.enumerateDevices) return stream;

    const devices = await navigator.mediaDevices.enumerateDevices();
    const ultraWide = devices.find(
      (d) => d.kind === "videoinput" && d.label.toLowerCase().includes("ultra wide")
    );

    if (!ultraWide || !ultraWide.deviceId || ultraWide.deviceId === currentDeviceId) {
      return stream;
    }

    const upgradedStream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: ultraWide.deviceId },
      },
    });

    const upgradedTrack = upgradedStream.getVideoTracks()[0];
    if (!upgradedTrack || upgradedTrack.readyState !== "live") {
      upgradedStream.getTracks().forEach((track) => track.stop());
      return stream;
    }

    stream.getTracks().forEach((track) => track.stop());
    return upgradedStream;
  } catch {
    return stream;
  }
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const nativeDetectorRef = useRef<NativeBarcodeDetector | null>(null);
  const timerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

    async function initCamera() {
      let stream: MediaStream | null = null;

      // 1. Try environment (back) camera
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
      } catch {
        // 2. Fallback to default/any camera if environment constraint fails
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (err) {
          if (!cancelled) {
            console.error("Camera access error:", err);
            setError("Izin kamera ditolak atau tidak tersedia. Masukkan kode secara manual.");
          }
          return;
        }
      }

      if (cancelled || !stream) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }

      const activeStream = await tryUseUltraWideLens(stream);
      if (cancelled) {
        activeStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = activeStream;
      if (videoRef.current) {
        videoRef.current.srcObject = activeStream;
        videoRef.current.play().catch(() => {});
      }
      startAutoScanLoop();
    }

    initCamera();

    return () => {
      cancelled = true;
      stoppedRef.current = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Draws just the reticle-box region of the current video frame onto the
  // (reused, off-DOM-visible) crop canvas. Returns null -- meaning "decode
  // the full video frame instead, as before" -- if dimensions aren't ready
  // yet or measurement fails, so a glitch here never breaks scanning.
  function getCroppedCanvas(): HTMLCanvasElement | null {
    const video = videoRef.current;
    const reticle = reticleRef.current;
    const canvas = cropCanvasRef.current;
    if (!video || !reticle || !canvas) return null;

    const rect = getCropRect(video, reticle);
    if (!rect) return null;

    canvas.width = rect.sw;
    canvas.height = rect.sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, rect.sw, rect.sh);
    return canvas;
  }

  function startAutoScanLoop() {
    const tick = async () => {
      if (stoppedRef.current || !videoRef.current) return;

      const cropped = getCroppedCanvas();
      const source: HTMLVideoElement | HTMLCanvasElement = cropped ?? videoRef.current;

      // 1. Try Native BarcodeDetector if available
      if (nativeDetectorRef.current) {
        try {
          let results = await nativeDetectorRef.current.detect(source);
          if (results.length === 0 && source !== videoRef.current && videoRef.current) {
            results = await nativeDetectorRef.current.detect(videoRef.current);
          }
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
          let result =
            source instanceof HTMLCanvasElement
              ? zxingReaderRef.current.decodeFromCanvas(source)
              : zxingReaderRef.current.decode(source);

          if ((!result || !result.getText()) && source !== videoRef.current && videoRef.current) {
            result = zxingReaderRef.current.decode(videoRef.current);
          }

          if (result && result.getText()) {
            stoppedRef.current = true;
            onScan(result.getText());
            return;
          }
        } catch {
          if (source !== videoRef.current && videoRef.current && zxingReaderRef.current) {
            try {
              const result = zxingReaderRef.current.decode(videoRef.current);
              if (result && result.getText()) {
                stoppedRef.current = true;
                onScan(result.getText());
                return;
              }
            } catch {}
          }
        }
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
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => {
                  videoRef.current?.play().catch(() => {});
                }}
              />
              <canvas ref={cropCanvasRef} className="hidden" />

              {/* Instruction Text & Scanning Reticle Rectangle */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                <span className="mb-3 text-xs font-medium text-white/90 drop-shadow-md">
                  Posisikan barcode di dalam kotak
                </span>
                <div
                  ref={reticleRef}
                  className="h-32 w-64 rounded-2xl border-2 border-white/90 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                />
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
