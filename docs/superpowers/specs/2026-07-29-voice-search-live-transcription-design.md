# Voice Search — Live Transcription — Design

## Problem

Voice search (shipped) currently sets `interimResults = false`, so nothing
appears in the search field until `SpeechRecognition` fully finishes an
utterance. While speaking, there's no feedback that the mic is actually
picking anything up — the user can't tell if it's working until they stop
talking.

## Goal

Text (and therefore search results) should update live, word by word, as
speech is recognized — the same way typing already works — not just once
at the end.

## Approach

Flip `interimResults` to `true`. This is the Web Speech API's built-in
mechanism for exactly this: with `continuous = false` (unchanged) and
`interimResults = true`, `onresult` fires repeatedly for the same
in-progress utterance as the recognizer refines its guess, with a final
firing once it's confident. `event.results[0][0].transcript` already
returns "whatever the current best guess is" on every firing — interim or
final — so the existing `onresult` handler needs no other change:

```ts
recognition.onresult = (event) => {
  const transcript = event.results[0]?.[0]?.transcript;
  if (transcript) onChange(transcript);
};
```

Every firing — interim or final — flows through this same `onChange`, the
identical path typing already uses. Since search already re-runs on every
query change, results update live as a natural consequence, with no
separate "live search" logic to build. This was evaluated against a
sound-wave/audio-level visualization as the alternative and rejected: a
waveform only proves audio is reaching the mic, not that it's being
understood as speech, and would need new Web Audio API plumbing (an
`AnalyserNode`, a render loop) for a weaker signal than what flipping one
existing flag already provides.

## Non-goals

- No visual distinction between interim (still-refining) and final text —
  same plain styling throughout, consistent with the rest of this
  feature's minimal styling.
- No separate "preview" state — the search field itself is the live
  transcript; there is no staging area.
- No change to the listening-state pulse animation on the mic button, the
  auto-stop-on-silence behavior, the manual-cancel-via-`.abort()`
  behavior, error handling, or feature detection — all already correct
  from the shipped feature and unaffected by this change.

## Cancel behavior

Tapping the mic again mid-listen still calls `.abort()`, which only
stops *further* updates — it does not retroactively clear whatever
interim text already landed in the field via earlier `onresult` firings.
This matches typing: stopping mid-word doesn't erase what you'd already
typed. Explicitly not "revert to the value from before listening
started" — that would need snapshotting the pre-listen query and adds
complexity for behavior that doesn't match how every other input method
in this app already works.

## Testing

No automated tests: `SearchBar.tsx` has none today (Web Speech API can't
be exercised in this project's Node-only Vitest environment), and this
change doesn't touch any pure/testable logic — it's a single boolean
config flip. Manual verification: speak a multi-word product name or
brand slowly, confirm the search field updates and results refresh as
each word is recognized, before the utterance finishes. Confirm tapping
cancel mid-sentence stops further updates but leaves whatever was already
transcribed in place. Confirm all prior voice-search manual verification
steps (permission denied, unsupported browser, unmount cleanup) still
hold — this change doesn't touch any of that code.
