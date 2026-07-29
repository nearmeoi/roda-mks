"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, ListChecks } from "lucide-react";
import { BarcodeScanner } from "./BarcodeScanner";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  hasQuery: boolean;
  onClear: () => void;
  isSelectMode?: boolean;
  onToggleSelectMode?: () => void;
}

interface SpeechRecognitionResultItem {
  0: { transcript: string };
}
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResultItem;
  length: number;
}
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent {
  error: string;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

function sanitizeTranscript(text: string): string {
  return text.replace(/[.]/g, "").replace(/\s+/g, " ").trim();
}

const STALL_TIMEOUT_MS = 7000;

export function SearchBar({
  value,
  onChange,
  hasQuery,
  onClear,
  isSelectMode = false,
  onToggleSelectMode,
}: SearchBarProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const stallTimerRef = useRef<number | null>(null);

  const clearStallTimer = () => {
    if (stallTimerRef.current !== null) {
      window.clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };

  const armStallTimer = () => {
    clearStallTimer();
    stallTimerRef.current = window.setTimeout(() => {
      recognitionRef.current?.abort();
      setIsListening(false);
      setMicError("Tidak terdengar, coba lagi.");
    }, STALL_TIMEOUT_MS);
  };

  useEffect(() => {
    setMicSupported(!!getSpeechRecognitionCtor());
  }, []);

  useEffect(() => {
    return () => {
      clearStallTimer();
      recognitionRef.current?.abort();
    };
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      clearStallTimer();
      recognitionRef.current?.abort();
      setIsListening(false);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    setMicError(null);
    const recognition = new Ctor();
    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      armStallTimer();
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) onChange(sanitizeTranscript(transcript));
    };

    recognition.onerror = (event) => {
      clearStallTimer();
      if (event.error === "not-allowed") {
        setMicError("Izin mikrofon ditolak atau tidak tersedia.");
      }
    };

    recognition.onend = () => {
      clearStallTimer();
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    armStallTimer();
    recognition.start();
  };

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute left-4 right-4 top-0.5 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />
      <div className="pointer-events-none absolute -bottom-3.5 left-0 h-4 w-full rounded-full bg-accent/25 blur-md" />
      <div className="glass-pill relative flex h-[60px] items-center gap-2 rounded-full p-1.5 backdrop-blur-xl backdrop-saturate-200">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(160deg, color-mix(in oklab, var(--color-accent) 70%, white), var(--color-accent))",
            boxShadow: "0 3px 10px rgba(10,124,255,0.4), inset 0 1px 1px rgba(255,255,255,0.6)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2.2" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cari nama, kode, atau brand barang"
          className="h-full min-w-0 flex-1 border-none bg-transparent text-base text-gray-900 outline-none"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Hapus pencarian"
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-black/10"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M5 5L19 19M19 5L5 19" stroke="#5b5b60" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {onToggleSelectMode && (
          <button
            type="button"
            onClick={onToggleSelectMode}
            aria-label={isSelectMode ? "Matikan mode seleksi" : "Aktifkan mode seleksi"}
            className={`mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
              isSelectMode ? "bg-accent text-white shadow-xs" : "bg-black/10 text-[#5b5b60] hover:bg-black/15"
            }`}
            title={isSelectMode ? "Matikan mode seleksi" : "Mode Ceklis (Copy Banyak Produk)"}
          >
            <ListChecks className="h-[18px] w-[18px]" />
          </button>
        )}
        {micSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            aria-label={isListening ? "Berhenti merekam suara" : "Cari dengan suara"}
            className={`mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${
              isListening ? "bg-accent text-white animate-pulse" : "bg-black/10 text-[#5b5b60]"
            }`}
          >
            <Mic className="h-[18px] w-[18px]" />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            recognitionRef.current?.abort();
            setIsListening(false);
            setShowScanner(true);
          }}
          aria-label="Pindai barcode"
          className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 6V4a1 1 0 0 1 1-1h2M3 18v2a1 1 0 0 0 1 1h2M21 6V4a1 1 0 0 0-1-1h-2M21 18v2a1 1 0 0 1-1 1h-2" stroke="#5b5b60" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 7v10M10 7v10M13 7v10M15.5 7v10M18 7v10" stroke="#5b5b60" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {micError && (
        <p className="mt-1.5 text-center text-xs text-red-500">{micError}</p>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={(code) => {
            setShowScanner(false);
            onChange(code);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
