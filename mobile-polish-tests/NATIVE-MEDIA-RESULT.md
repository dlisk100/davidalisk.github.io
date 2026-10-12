# Native QA and approved share media — actual result

## Verified hosted revision and scope

- Hosted source/capture revision: `630c8cbdef9c79a104c750153291d14860510775`, feature branch `fix/freight-final-mobile`.
- Run: https://github.com/dlisk100/davidalisk.github.io/actions/runs/38304343047 . Actual overall conclusion **failure**, solely the original media-duration assertion. **Build, 21 Node tests, 16 Python tests, analytics evidence, and native QA steps all passed.** No third hosted cycle was run.
- All 7 map viewports completed, **366/366 native checks**. Existing 38-criterion matrix now **36 passed / 2 out of scope / 0 partial**. Article Methods/Data/About rendered links, proper document titles, native clicks, native history Back, and each map-return path are complete. Existing Methods selected-view restoration retains raw camera/screen positions, exact facts/source metadata, literal encoded hash, and the tight geographic AND CSS-pixel contract. Share query stripping and save/restore remain exact.
- Matrix out-of-scope identifiers remain the original physical Safari/X keyboard/chrome criterion and public-CDN startup/performance criterion. Both physical iPhone Safari and physical X embedded browser are explicitly unexecuted; a phone-shaped Chrome viewport and live analytics HEAD do not certify either or public-CDN browser performance.
- No app/data/UI change after `34d213ce`; no renderer experiment, X posting, main merge or deployment. Remote main remains `40b37efbe9670f6b03aada50c30eaaeb13f321b6`.

## Correct analytics contract

Actual installed `@vercel/analytics` 2.0.1 Astro component calls inject; actual layout renders Analytics. Built runtime injected `/_vercel/insights/script.js` with `sdkn=@vercel/analytics/astro`, `sdkv=2.0.1`. Live read-only HEAD https://www.davidalisk.com/_vercel/insights/script.js returned **200**, JavaScript, Vercel, length 4550. Protected preview authentication was not bypassed.

Receipt records **4 exact local-service 404s and 4 correlated canceled script-abort events** by the same request IDs. Only a prior exact localhost service 404 qualifies the associated Script `net::ERR_ABORTED` cancellation; no unrelated failed request is waived. Missing favicon, app script/data, other URL/status, actual Vercel HTTP failure, runtime exception and unrelated network failure remain RED in negative tests. No synthetic 200/stub or global integration disable.

## Actual media and bounded alternative

Hosted runner recorded real native Chrome CDP frames, with dedicated reader, acknowledgments, ID-specific response queues and real timestamps: **31 national frames and 308 Chicago frames**, each segment measured **14.0008 seconds**. Matched national tons→USD camera assertion passed before capture continued. Chicago uses native search/result click, wheel zoom and readable freight-region card. Silent, truthful 2024 headline, lower-48 display, native normal-speed gestures and waits; no Gulf detour was needed.

Original hosted MP4 was **16.56 seconds**, H.264/yuv420p/880×1100; a sparse-concat export error dropped each stationary trailing hold. A bounded existing-ffmpeg alternative restored **only those source-timestamp-proven stationary holds** from the actual screencast frames: national 5.28s and Chicago 6.16s. No motion was fabricated, no screenshots became live footage, no dynamic footage was retimed. Scene detection independently located the source cut at8.72s. Dynamic footage comparisons: SSIM 0.999357 national, 0.996296 Chicago after recompression.

Final MP4: **28.000000s, 880×1100 (4:5), H.264, yuv420p, 25fps, no audio, 1,555,451 bytes**. Clean full decode. Reviewed entire 28-frame-per-second contact-sheet chronology, full-resolution transition/end probes, all three final PNGs, and all ten final QA screenshots. Native settling/search remains visible; ending Chicago card is readable. No extra CI/browser/profile/install on VPS; existing ffmpeg used one thread for recovery.

### Deliverable paths

Directory: `/home/hermes/workspace/freight-verified-38304343047/freight-share-630c8cbdef9c79a104c750153291d14860510775/`

- `freight-atlas-tour-28s.mp4` — final reviewed video, 1,555,451 bytes.
- `national-tons.png` — 341,190 bytes.
- `national-usd.png` — 321,960 bytes.
- `chicago-card.png` — 335,542 bytes.
- `final-contact-sheet.jpg`, `final-probe-*.jpg`, `recovery-report.json`, `dynamic-footage-verification.json`, `observed-actions.json` — actual inspection/recovery evidence.

Successful native receipt/coverage/analytics directory:
`/home/hermes/workspace/freight-verified-38304343047/freight-native-630c8cbdef9c79a104c750153291d14860510775/`

- `receipt-80f5f1ea97ab4a4988a720d0c905f500.json`
- `final-coverage.json`
- `analytics-evidence.json`

CI artifacts remain downloadable for14 days:
- https://github.com/dlisk100/davidalisk.github.io/actions/runs/38304343047/artifacts/11772325924 — native evidence, 1,811,210 archived bytes.
- https://github.com/dlisk100/davidalisk.github.io/actions/runs/38304343047/artifacts/11771866832 — original hosted capture/stills/manifests, 2,334,107 archived bytes.

## Explicit remaining limits

The CI artifact contains the **original short MP4**, not the locally recovered final MP4; final delivery is the actual local attachment/review bundle. CI is not globally green. Original driver action list was held in memory and lost before the failed duration assertion; do not call visual observations recovered command telemetry. Real native frame timestamp manifests remain, with a separately labeled observed-action log. Helper now persists future actions incrementally and uses explicit fps filtering. Those helper-only fixes are locally regression-exercised, not rerun in hosted CI, respecting the two-cycle cap. Parent must inspect final attachment, decide promotion and any future hosted rerun. No further user approval is needed merely to deliver the already-authorized media.
