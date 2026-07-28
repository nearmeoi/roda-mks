# Voice Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mic button to the search bar that fills the search query by speaking, using the browser's built-in Web Speech API.

**Architecture:** A single change to `web/components/SearchBar.tsx` — a new circular icon button next to the existing barcode-scan button, backed by `SpeechRecognition`/`webkitSpeechRecognition` (feature-detected, following the exact same ambient-type + `window` cast pattern `BarcodeScanner.tsx` already uses for `BarcodeDetector`). Recognized text flows through the same `onChange` prop that typing and barcode scanning already use, so search/results/recent-history behave identically regardless of input method.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript, `lucide-react` (existing icons), browser-native `SpeechRecognition` API (no new dependency).

## Global Constraints

- No cloud/paid speech-to-text service — Web Speech API only (spec: "Approach").
- Recognition locale is `id-ID`, not configurable (spec: "Behavior").
- No changes to `web/lib/search.ts` or how search itself works — voice only fills the existing query field (spec: "Non-goals").
- Feature-detected, not UA-sniffed: mic button doesn't render at all when `SpeechRecognition` isn't available (spec: "Error handling").
- Tapping the mic while listening cancels it immediately (spec: "Behavior", step 3).
- No automated tests: `SearchBar.tsx` and `BarcodeScanner.tsx` have none today, and `SpeechRecognition` can't be exercised in this project's Node-only Vitest environment (spec: "Testing").

---

### Task 1: Add voice input to `SearchBar.tsx`

**Files:**
- Modify: `web/components/SearchBar.tsx`

**Interfaces:**
- Consumes: the existing `onChange: (value: string) => void` prop already passed into `SearchBar` (used identically by typing and by `BarcodeScanner`'s `onScan` callback — see the existing scan button wiring at the bottom of this file).
- Produces: nothing new consumed elsewhere — this is a self-contained UI addition.

No automated test cycle for this task (see Global Constraints) — verification is a concrete manual checklist in Step 3.

- [ ] **Step 1: Read the current file**

Current `web/components/SearchBar.tsx` (for reference — this is the file Step 2 modifies):

```tsx
"use client";

import { useState } from "react";
import { BarcodeScanner } from "./BarcodeScanner";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  hasQuery: boolean;
  onClear: () => void;
}

export function SearchBar({ value, onChange, hasQuery, onClear }: SearchBarProps) {
  const [showScanner, setShowScanner] = useState(false);

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
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          aria-label="Pindai barcode"
          className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 6V4a1 1 0 0 1 1-1h2M3 18v2a1 1 0 0 0 1 1h2M21 6V4a1 1 0 0 0-1-1h-2M21 18v2a1 1 0 0 1-1 1h-2" stroke="#5b5b60" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 7v10M10 7v10M13 7v10M15.5 7v10M18 7v10" stroke="#5b5b60" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

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
```

- [ ] **Step 2: Replace the file with the version below**

`Mic` icon confirmed present in the installed `lucide-react` version (verified via `node -e "console.log('Mic' in require('lucide-react'))"` → `true`).

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { BarcodeScanner } from "./BarcodeScanner";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  hasQuery: boolean;
  onClear: () => void;
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

export function SearchBar({ value, onChange, hasQuery, onClear }: SearchBarProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setMicSupported(!!getSpeechRecognitionCtor());
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    setMicError(null);
    const recognition = new Ctor();
    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) onChange(transcript);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setMicError("Izin mikrofon ditolak atau tidak tersedia.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
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
          onClick={() => setShowScanner(true)}
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
```

Notes on the code above, matched against the spec:

- `micSupported` starts `false` and flips to `true` in `useEffect` (client-only check) — the button is simply absent until then, and stays absent forever on browsers without `SpeechRecognition`/`webkitSpeechRecognition` (spec: "Error handling" — feature-detected, no error shown for unsupported browsers).
- `handleMicClick` checks `isListening` first — a second tap while listening calls `.stop()` and resets state immediately, matching the spec's manual-cancel requirement.
- `recognition.onresult` calls `onChange(transcript)` — the exact same prop typing uses, so search fires immediately with no separate confirm step (spec: "Behavior", step 4; approved as "searches immediately, no review step").
- `recognition.onerror` only sets a visible error for `"not-allowed"` (permission denied). Any other error code (e.g. `"no-speech"`, `"network"`) falls through and does nothing — `onend` still fires afterward and resets `isListening`, so the button returns to idle silently, matching "returns to idle silently, not treated as an error" (spec: "Behavior", step 5, and "Error handling").
- Listening state is shown via the button's own color/pulse (`bg-accent text-white animate-pulse` vs the idle `bg-black/10`) rather than a separate label, consistent with how compact this search bar already is.

- [ ] **Step 3: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full test suite to confirm no regressions**

Run: `cd web && npm test -- --run`
Expected: PASS (this change adds no test files; existing suite must stay green).

- [ ] **Step 5: Manual verification in the browser**

Start the dev server (`cd web && npm run dev`) and open it on an actual phone (Web Speech API requires a real microphone and, on some browsers, a secure context — `localhost` counts as secure, but test over your LAN IP with HTTPS or on a deployed preview if `localhost` isn't reachable from the phone):

1. On a browser that supports `SpeechRecognition` (Chrome on Android, Safari on iOS): confirm the mic button appears between the clear button and the scan button.
2. Tap it. Grant microphone permission when prompted (first time only). Confirm the button turns accent-colored and pulses while listening.
3. Say a product name or brand out loud (e.g. "Polygon" or "Strattos"). Confirm recognition stops automatically after you finish speaking, the button returns to idle, the search field fills with the recognized text, and results appear below exactly as they would for typed text.
4. Tap the mic again, start speaking, then tap it a second time mid-listen. Confirm it stops immediately without filling the field with a partial/garbage result.
5. Deny microphone permission (or test on a device where it's blocked at the OS level) and confirm the red error text appears below the search bar reading "Izin mikrofon ditolak atau tidak tersedia."
6. On a browser without `SpeechRecognition` support (e.g. desktop Firefox), confirm the mic button doesn't render at all — search bar shows only the clear (if applicable) and scan buttons.
7. Confirm typing and barcode scanning both still work exactly as before.

- [ ] **Step 6: Commit**

```bash
git add web/components/SearchBar.tsx
git commit -m "feat: add voice search input via Web Speech API"
```

---

### Self-Review

**Spec coverage:**
- "Tap to start, auto-stops on silence" → `recognition.continuous = false` (Web Speech API's default single-utterance behavior auto-stops on silence and fires `onend`). ✓
- "Tap again while listening cancels" → handled in `handleMicClick`. ✓
- "Fills field, searches immediately, no review step" → `onresult` calls `onChange` directly. ✓
- "id-ID locale" → `recognition.lang = "id-ID"`. ✓
- "Listening visual state" → pulse + color change on the button. ✓
- "Permission denied error text" → `micError` state + rendered `<p>`. ✓
- "No speech / other errors → silent idle" → only `"not-allowed"` sets visible error. ✓
- "Feature-detected, hidden if unsupported" → `micSupported` gate. ✓
- "No changes to search.ts" → not touched. ✓

**Placeholder scan:** none found — every step has complete code or a concrete, numbered manual-verification checklist.

**Type consistency:** `onChange` used identically to the existing prop signature (`(value: string) => void`) in both the typing `onChange={(e) => onChange(e.target.value)}` and the new `onresult` handler — no mismatch.
