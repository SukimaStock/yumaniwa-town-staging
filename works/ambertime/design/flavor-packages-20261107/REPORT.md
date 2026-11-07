# AmberTime C1–L package integration — 2026-11-07

Base: `6a1707c106afb4bf0658a274edf404bbc541de64`. Draft only; no merge or deployment.

## Change

Reuse `glassColor().family` on the frozen bottled release's `profile.flavor.profile` (version 1, all eight finite axes). This is a display classification; `flavor.primary` remains the original spirit identity. Map it to the five adopted classic package colors. Never alter glass colors.

`release-package.mjs` preserves the original `codeaBottle()` cells verbatim and layers the C1–L box behind them: 24×24 viewBox, box (12,4,11,19), bottle `translate(-2 0) scale(2)`. No geometry adjustment. No gradients. Invalid/missing/legacy profiles retain the exact existing bottle.

The common `releaseArt` connects hand/shop shelves, product detail, ledger, release comparisons and source views. Brand history release rows also show the package. Brand configuration remains a plain bottle. First completion retains the original bare-bottle/label animation with identical transforms; reduced-motion/static styles remain supported.

Product changes: `release-package.mjs`, `shop-app.mjs`, `first-bottle-view.mjs`, `room-scene.css`, `index.html` (cache keys). Test/evidence additions: unit test, optional browser capture test, legal public-operation fixture and this report. `market-ui`, `ledger-view`, `nearby-comparison`, `partner-orders`, source bottle matrices and flavor modules are unchanged.

No save fields, economic rules, RNG calls, flavor math, stock assignment or management controls added. No 100-year simulation required.

## Verification

- 52 related unit tests passed: package (6), first bottle, original brand art, brands UI, ledger, nearby comparison, flavor and glass color.
- Required market/copy suite: 32 passed, 5 failed. The same 5 failures reproduce on the untouched base (with first-bottle included, base 36/41 passed): two stale formal-copy source expectations, one stale entry-cache expectation, and two existing save fixture expectations. Tests were not weakened or edited.
- Scope Guard, Risk Gate, Impact Check passed. Syntax and whitespace checked.
- Independent code review found no required fixes. Browser appearance is NOT certified by that review.
- Fixture uses actual public manufacture/bottling/sales APIs; five modern releases fruit/grain/smoke/body/mixed (11/14/17/20/23), each 12 remaining, hand9/store3. Both shops accepted. Formal serialize/restore roundtrip identical. A first-bottle pre-state is also supplied.

## Browser limitation — UNVERIFIED

Both mandatory market browser tests and the new capture test were attempted. Chromium aborts during launch: `process_singleton_posix.cc: socket() failed: Operation not permitted`. The shared browser could not access the local app (returned `Missing or invalid bearer token`). Installing the official headless shell also failed because the download was not a usable ZIP.

No implemented-screen screenshots were obtained. No generated images are substituted. Phone geometry, 24px visual discrimination, selection/placement animations, initial completion timing and physical iPhone Safari remain unverified. Do not merge until actual screenshots and owner review are complete.

Capture runner for a browser-capable environment:

```sh
AMBER_BROWSER_MODULE=/absolute/playwright-core/index.mjs \
AMBER_BROWSER_EXECUTABLE=/absolute/chromium \
AMBER_PACKAGE_SCREENSHOTS=/absolute/output \
node --test works/ambertime/tests/release-package-browser.test.mjs
```

The capture runner is syntactically checked but its UI assertions have not run past browser launch. It targets the actual main page and supplies a legal fixture through the existing preview fixture endpoint. It does not replace product UI with a mockup.

Plan lock: `.change-plans/ambertime-package-c1l-20261107/r0.lock.json`. Formal verificationState remains UNVERIFIED.
