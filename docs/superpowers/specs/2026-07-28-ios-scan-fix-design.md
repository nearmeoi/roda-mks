# iOS Barcode Scan Speed & Focus Fix — Design

## Problem

`web/components/BarcodeScanner.tsx` scans noticeably slower on iOS Safari
than on Android Chrome, and on an iPhone 13 specifically, moving the phone
close enough to fill the frame with a barcode causes the camera to blur and
fail to focus at all. Two separate root causes, verified before designing
around them (see chat for sources):

1. **Speed**: Android Chrome has the native `BarcodeDetector` API
   (hardware-accelerated). Safari has never implemented it, so iOS always
   falls to the JS-based ZXing decoder — and it currently decodes the
   *entire* video frame (1280×720) on every attempt, which is expensive in
   JS regardless of device.
2. **Focus/blur**: `focusMode`/`focusDistance` camera constraints are
   Chrome-Android-only — Safari doesn't expose them, so there's no way to
   force autofocus behavior via `getUserMedia` constraints. The real cause
   is that the iPhone's default back lens (main/wide) has a minimum focus
   distance too long for close-up barcode scanning — a hardware limitation,
   confirmed as a widely-reported issue on iPhone 12/13/14+ across many
   native and web scanning apps, not something specific to this app's code.

## Goal

Make scanning meaningfully faster on iOS (closer to the Android experience)
and fix the close-range blur, using techniques that actually work within
Safari's real constraint support — not attempting APIs confirmed unsupported
there.

## Non-goals

- No `focusMode`/`focusDistance` constraints — confirmed unsupported in
  Safari, would be dead code.
- No user-agent sniffing to decide behavior. Both fixes below are feature-
  detected (does a matching camera device exist? did cropping produce a
  valid canvas?) so the same code path runs everywhere; it simply finds
  nothing to do on platforms where it doesn't apply.
- No native app / app-wrapper approach — stays a web app.
- No changes to the manual text-entry fallback, the scanner's UI chrome, or
  anything outside the camera-acquisition and decode-loop logic in
  `BarcodeScanner.tsx`.

## Fix 1: decode a cropped region instead of the full frame

Every scan attempt currently calls `zxingReaderRef.current.decode(videoRef.current)`
(or, on Android, `nativeDetectorRef.current.detect(videoRef.current)`),
passing the whole `<video>` element — the decoder processes the full frame
even though the user is only pointing at the reticle box.

Instead: each tick, draw *only* the reticle-box region of the current video
frame onto a small offscreen `<canvas>`, and decode that canvas instead of
the full video element.

- `@zxing/browser`'s `BrowserCodeReader` (the base class
  `BrowserMultiFormatReader` extends) has a `decodeFromCanvas(canvas:
  HTMLCanvasElement): Result` method — confirmed present in the installed
  package (`node_modules/@zxing/browser/cjs/readers/BrowserCodeReader.d.ts`).
  Swap `decode(videoRef.current)` for `decodeFromCanvas(cropCanvas)`.
- The native `BarcodeDetector.detect()` method accepts any
  `CanvasImageSource` per the Shape Detection API spec, which includes
  `HTMLCanvasElement` — so the same cropped canvas works for the Android
  native path too, unifying both branches on one crop step instead of
  branching further.
- **Computing the crop rectangle**: the video element uses `object-cover`
  inside its container, so its *rendered* size isn't necessarily its
  *native* resolution (`video.videoWidth`/`video.videoHeight`) — object-fit
  scaling means a straight CSS-pixel-to-video-pixel mapping would be wrong.
  Correct approach: read both the video's and the reticle overlay's
  `getBoundingClientRect()`, compute the reticle's position/size *relative
  to the video's rendered box*, then scale that by
  `video.videoWidth / videoRenderedWidth` (and the equivalent for height) to
  get the crop rectangle in native video pixel coordinates for
  `ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh)`.
- The offscreen canvas is created once (via a ref) and reused every tick —
  only its `drawImage` call runs per tick, not a new canvas allocation.
- **Graceful degradation**: if the video hasn't loaded dimensions yet
  (`videoWidth`/`videoHeight` are 0) or either `getBoundingClientRect()`
  call returns a zero-size rect, skip cropping for that tick and fall back
  to decoding the full video element as it does today — never crash the
  scan loop over a measurement glitch.

This directly targets the actual bottleneck (JS decode cost scales with
pixel count) on exactly the code path iOS is stuck on, and costs nothing on
Android where the native detector is already fast.

## Fix 2: auto-select the ultra-wide back lens when available

After the initial `getUserMedia` call succeeds and the stream is attached
(which also unlocks real camera *labels* for `enumerateDevices()` — labels
are blank until permission is granted, a standard browser privacy
behavior), call `navigator.mediaDevices.enumerateDevices()`, filter to
`kind === "videoinput"`, and look for a label that case-insensitively
contains `"ultra wide"`. Since iOS 16.3, Safari exposes each back camera
lens (wide, ultra-wide, telephoto) as a separate enumerable device for
exactly this reason — and the ultra-wide lens can focus much closer than
the default wide lens, directly fixing the blur.

If a match is found and its `deviceId` differs from the currently active
track's device: stop the current stream's tracks, re-request
`getUserMedia({ video: { deviceId: { exact: matchedId }, width: { ideal:
1280 }, height: { ideal: 720 } } })`, and replace `streamRef.current` and
the video's `srcObject` with the new stream.

If no matching device is found (older iOS, a device without an ultra-wide
lens, or a platform where this simply doesn't apply): keep the original
default stream, no error, no visible change — this is a pure enhancement
layered on top of the existing working flow, not a replacement for it.

## Error handling

- Both fixes are additive on top of the existing permission-error and
  no-camera-support handling already in `BarcodeScanner.tsx` — unchanged.
- If the lens-switch `getUserMedia` call itself fails (e.g., device busy),
  catch it, keep the original stream running, and don't surface an error to
  the user — scanning should keep working on the default lens rather than
  breaking over an enhancement that didn't pan out.

## Testing

Camera/hardware behavior can't be meaningfully exercised in the project's
Node-only Vitest environment (no DOM, no `getUserMedia`) — consistent with
how this component has no automated tests today. Verification is manual,
on real devices, since that's the only way to confirm either fix actually
works:

- On the iPhone 13 that reported the issue: confirm scanning feels
  noticeably faster, and confirm holding the phone close enough to fill
  the frame with a barcode no longer blurs (the ultra-wide lens should now
  be in use — this can be visually confirmed by the wider field of view
  suddenly visible in the preview once the switch happens).
- On an Android Chrome device: confirm no regression — native detection
  should still work exactly as before, cropping shouldn't break anything.
- Confirm the manual text-entry fallback still works unchanged on both.

## Future extension (not required now)

If scanning is still slower than desired on iOS after the crop fix lands,
the 200ms polling interval between decode attempts (`startAutoScanLoop`'s
`setTimeout`) is a secondary lever worth revisiting — but only after
measuring the actual improvement from cropping on a real device, since
tightening the interval blind risks pinning CPU on slower phones for a
benefit that might not be needed once the primary fix is in.
