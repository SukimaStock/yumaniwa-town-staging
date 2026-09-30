# Phase 1b — Starter Adoption validation

Baseline: staging `307e65b29fb15bf91e47a08a3eedea697da9e7b6`.
Lock: `.change-plans/engine-phase1b-starter-adoption/r0.lock.json`, created
before implementation. Phase 1a's lock and historical validation are unchanged.

## Executed mechanical checks

- `python3 -B tests/test_starter_adoption.py -v`: 5 tests passed.
  Builds/extracts the real ZIP, verifies its complete file set, canonical Engine
  and Codea bytes, local HTML and example version, then copies it to both
  dist/staging-canary and works/new-work-canary in a temporary repository.
  Adoption retains the rollback copy; --remove-local deletes it without changing
  or breaking the canonical 0.3.0 reference. Explicit 0.2.0 override and generic
  0.2.0 export remain supported; adoption without an explicit target fails.
- All shell steps of new-work-starter.yml executed locally: export validation,
  actual ZIP build/extraction, content and syntax checks, both handoff stages passed.
- `node --test tests/test-engine-input-boot.cjs`: 27 tests passed.
- `node --test tests/test-change-*.cjs`: 139 tests passed.
- Starter Codea and sketch passed Node syntax checks.

The workflow runs these packaging tests on relevant push and pull_request paths;
its artifact is the inspected local starter. Scope/Risk/Impact and trusted static
checks apply to the exact PR head. CI outcomes are reported with the PR, not
presented here as browser or final VERIFIED certification.

## Browser

UNVERIFIED. The existing browser runner was attempted but Playwright could not
launch: Chromium headless shell is absent. No browser assertions executed.
Starter boot/input in a browser, iPhone Safari, real keyboard, actual BFCache,
nested iframe focus and physical pointer interruption/multitouch remain UNVERIFIED.
ZIP and handoff success do not imply browser success.

## Boundaries and rollback

Engine 0.2.0, canonical Engine 0.3.0 and Codea 1.0.0 sources, the generic exporter,
all five existing works and production are unchanged. No Audio/Asset readiness,
Diagnostics, town launch or retry changes. Only new-work starter paths adopt the
new runtime. Revert the Phase 1b adoption commit to restore prior starter pins;
the separate lock is immutable and canonical runtime files remain available.
