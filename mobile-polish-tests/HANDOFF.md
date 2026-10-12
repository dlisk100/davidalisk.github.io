# Final mobile candidate — local only

Base: `40b37ef`; branch: `fix/freight-final-mobile`. No push, deployment, install, browser launch, dataset deletion, or renderer experiment adoption.

## Changes

- Removed the loading illustration's figcaption and its border/padding row; kept the live map title/subtitle.
- Removed AK/HI inset construction and targets. Main display arrays, search catalog admission and saved selection admission exclude AK/HI/offshore AK/HI coordinates. Canonical rows remain in their original assets; national quantities remain national, not lower-48 sums. The existing lower-48 metro exclusion remains.
- Removed only the map's Methods/Data/About main navigation. The initial article now exposes all three next to Open the map. Editorial pages, safe return handling and metric-specific card Methods links remain intact.
- Layers/Explore now occupy one vertical flow dock on phones and short landscape. A Layers expansion moves Explore down instead of covering it; scroll bounds retain the summary, pointer events are restricted to real controls, Escape restores summary focus, and disclosures close when a phone/landscape card opens. ResizeObserver supplies card clearance. Short portrait hides the selected card only while Layers is expanded (the selection remains and returns on close), avoiding a negative-height card. Safe-area offsets, 44px phone controls and 16px search input text are included.
- The unit switch visibly says USD. Headline calculation/year remain unchanged. Data explains the mixed-year 2025 edition and the national-versus-visible-geography distinction.
- Canada/Mexico context retained unchanged: `A.neighbors`, fill `#ece5d0`, coastline stroke `#8c9a9c`, 0.5px. No foreign flows or weight inferred. Code inspection only; this child did not claim a rendered appearance check.

## Headline trace

Actual producer: `metro-flows/prototypes/country-v2/v3/faf_extract.py` lines 37–44 reads FAF5.7.1 and converts `tons_2024 × 1000`, `current_value_2024 × 1000000`. Lines 59–70 retain source metadata and national `[trade_type|mode]` aggregates. `build_atlas.py` lines 819–826 sums those national rows into `balance.faf2024.domestic/imports/exports`.

Retained `faf2024-v3.json.gz` source metadata explicitly identifies FAF5.7.1_2018-2024.csv and the 2024 columns. Independent sum of its national rows equals the released `core.js.gz` balance and the live headline function:

- 20,011,502,950 short tons → **20.0 billion tons of freight · 2024**.
- 24,969,523,213,365 current USD → **$25.0 trillion of freight · 2024**.

Registry evidence: retained `candidate/metric-registry.json`, family `national`, fields `national[trade_type|mode]; shipping_weight/trade_value; FREIGHT+MAIL`, vintage `FAF 2024; Census/T-1002025`, version `FAF5.7.1; annual2025 retained trade`, anchor `methods.html#national`; nominal edition `2025 snapshot; actual source years differ`. Registry untouched. No unsupported 2025 relabel or source recalculation.

Byte equality to base verified for core.js.gz, plate.json.gz, pz-sys.js.gz, explore-catalog.json, route-render.js and info-inspector.js. Source-ID SNAPSHOT and metric anchors untouched. Core SHA256: `f9c8de4915bcf11b6f390bc5c733931d69f782a685101008cf3fed5aa3616bc0`. Plate SHA256: `6c2e765940d59daa43a3e13788423b01eaedb0995c9eb9cee53d89d7fc55ed69`.

## Verification / limits

Run `node --max-old-space-size=128 --test --test-concurrency=1 mobile-polish-tests/*.test.cjs` for focused contracts and production-handler seams. Tests use retained real core/plate/catalog facts. Width-shaped event boundaries at 390/393/430 and 852 exercise toggle, focus and clearance publication, **not browser CSS layout or native pointer acceptance**. Syntax checks and `git diff --check` also pass.

`python3 mobile-polish-tests/run-retained.py` exercises 21 retained loading/entry checks in a small CommonJS fixture. Both candidate and `--baseline` have 18 pass / the same 3 fail: old expectations for `Loading map data…` versus actual received-byte text, and `1 detail payload decoded` versus the released `Opening the map · 1 file loaded · preparing the view…`. Preserved logs (only blank-line trailing spaces removed in committed copies); exact raw originals are in `/home/hermes/workspace/freight-final-mobile-handoff/retained-{baseline,current}.log`. These are inherited copy mismatches, not newly green tests or new candidate regressions. Original owner tests were not edited. First fixture-discovery failures were investigated, not counted as product failures.

## Required bounded parent browser QA before publication

Use one bounded browser owner against these exact candidate bytes; no experimental workers. Capture loading, Ready, entered country, Layers expanded, Explore expanded and a long card at **390×844, 393×852, 430×932**, short **852×393**, and a desktop width. Reload at each width rather than trusting stale canvas dimensions. Also include a short portrait / software-keyboard search case.

1. Confirm no loading caption/border row. Capture actual preparation→Ready→entry and reduced motion; reject startup regressions.
2. Use native clicks/taps and `elementFromPoint` at Layers/Explore summary centers, repeatedly open/close each, toggle a checkbox, scroll Layers/legend, press Escape, type Albany and click the unchanged first result. Require summary rectangles disjoint and no intercepted native targets. Opening Explore closes Layers; selecting a map place closes disclosures and leaves a readable scrollable card.
3. With a long selected card, repeat disclosure toggles, close/Zoom here/source details/card Methods→Back; verify card/control rectangles, focus visibility, correct source anchor, state restoration, no card target hidden by a disclosure, and no sideways page overflow. Check actual iPhone Safari/browser chrome, safe areas and search keyboard. There is no fullscreen toggle in this released UI; inspect Safari expanded/collapsed chrome and standalone/full-viewport presentation, not an invented control.
4. Confirm map main nav absent, article Methods/Data/About all present, editorial nav intact. Ensure no inset SVG groups, inset tabs, AK/HI/offshore markers or old saved AK/HI selection pick targets; try Anchorage/Honolulu search and warm zoom/pan in both units. Source facts and national totals must still match. Verify lower-48 marks keep their camera-following original anchors.
5. Inspect Canada/Mexico's retained faint context and coastline, not added freight coverage. Check headline 2024 and visible USD, unit legends/labels, card typography and loading-error Retry target. Review country/deep-view animation and gestures for unchanged released-renderer responsiveness.

This is an implemented/tested local candidate, **not final native mobile polish acceptance**. Engineering browser gates remain mandatory; taste review alone is not the remaining gate. Public publication requires separate parent approval.

## Recorded next-stage prerequisite

User message `1559281566117527753` authorizes automatic screenshot/video production **after mobile cleanup and build review/QA**; no extra user approval for media production is needed. Parent brief: `/home/hermes/workspace/metro-flows-mobile-share-brief.md`. The parent owns browser QA, authorized publication and then media. This child does not start media or alter the visual design to improve captures. Keep the accepted/current released renderer and finish the engineering gates above before capturing share assets.
