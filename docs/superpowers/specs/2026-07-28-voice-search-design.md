# Voice Search Input — Design

## Problem

The search bar currently supports two ways to fill in a query: typing, and
scanning a barcode with the camera. There's no hands-freer option for when
staff know a product's name/brand but don't want to type it (e.g. hands busy
holding a product, or it's just faster to say "Strattos" than type it).

## Goal

Add a third input method to the search bar: tap a mic button, speak a
product name/brand/keyword, and have it fill the search field the same way
typing would — using results the same way they already work today.

## Approach

Use the browser's built-in **Web Speech API** (`SpeechRecognition` /
`webkitSpeechRecognition`), not a cloud speech-to-text service. This app has
no backend by design (see the SO Week spec's non-goals, same constraint
applies generally) — a cloud STT API would need a server to hold the API key
and proxy audio, which breaks that constraint and adds per-request cost for
no real benefit. Web Speech API is free, on-device or OS-level, and already
ships in Chrome (Android/desktop) and Safari (iOS/macOS) — the two browsers
this app actually needs to support. The only cost: browsers without any
implementation (mainly desktop Firefox) simply don't get the mic button —
same graceful-degradation pattern `BarcodeScanner` already uses when a
browser lacks camera APIs.

## Non-goals

- No cloud/paid speech-to-text service.
- No language other than Indonesian (`id-ID`) recognition. This is a single
  browser-level setting, not per-word — `id-ID` is the one sensible default
  since all UI copy and most product/category text is Indonesian.
- No changes to how search itself works (`web/lib/search.ts`) — voice input
  only fills the existing query field; everything downstream (fuzzy search,
  results, recent-search history) behaves exactly as it does for typed text.
- No transcript history, no re-listen/playback of what was heard.

## Behavior

1. Tap the mic button (new, in the search bar next to the existing scan
   button). Browser prompts for microphone permission the first time.
2. While listening, the mic button shows a distinct "listening" state (icon
   color/pulse changes) so it's clear speech is being picked up.
3. Recognition auto-stops when the browser detects the user has stopped
   talking (native `SpeechRecognition` behavior — no manual stop needed).
   Tapping the mic button again while it's listening cancels it immediately
   (manual override, in case it mis-starts or picks up the wrong moment).
4. The recognized text is passed through the exact same `onChange` path the
   search input already uses — it lands in the query field and results
   appear immediately, no separate confirm/review step. If a word was
   misheard, staff can just edit the field afterward exactly as if they'd
   typed it wrong, same as today.
5. If nothing is heard before the browser's own recognition timeout, it
   just returns to idle — not treated as an error.

## Error handling

- Microphone permission denied: inline error message in the same visual
  style `BarcodeScanner` uses for its camera-permission error state
  ("Izin mikrofon ditolak atau tidak tersedia.").
- Browser doesn't implement `SpeechRecognition` at all: feature-detected on
  mount, mic button doesn't render — no error shown, it just isn't there
  (matches how the scan button assumes camera support rather than
  advertising a broken feature).
- Recognition error mid-listen (network blip, etc.): drop back to idle
  state silently; the user can just tap the mic again.

## UI placement

New circular icon button in `web/components/SearchBar.tsx`, immediately
after the existing "Pindai barcode" scan button (same `h-9 w-9 rounded-full
bg-black/10` treatment as that button for visual consistency). Mic icon;
while listening, background/icon color switches to the app's accent color
with a subtle pulse, mirroring the scanning reticle's existing pulse
animation elsewhere in the app.

## Testing

- No automated tests: `SearchBar.tsx` and `BarcodeScanner.tsx` have none
  today (this codebase only unit-tests pure logic in `web/lib/*`, not
  components — see the SO Week plan's Global Constraints for the same
  reasoning), and `SpeechRecognition` has no meaningful way to be exercised
  in the Node-only Vitest environment this project uses (no DOM, no Web
  Speech API).
- Manual verification: tap the mic, grant permission, speak a known
  product/brand name, confirm the field fills and results appear. Deny
  permission and confirm the inline error shows. Test on both an
  Android Chrome device and an iOS Safari device, since this feature's
  whole reason for existing is cross-browser support — confirming it
  actually works on both is the point, not optional.
