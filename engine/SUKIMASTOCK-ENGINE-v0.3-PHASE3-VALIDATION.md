# Engine 0.3 Phase 3 validation

Base: `97a51acfd3ec4f7dde5f7e1c9bf4ca948ffc807b` (staging).
Change: `engine-phase3-diagnostics`; immutable revision-0 Plan Lock precedes code.

## Automated evidence

- `node --test tests/test-engine-diagnostics.cjs`: **30 PASS**.
  Actual Engine + canonical Codea execute in VM DOM doubles. Covers identity/boot,
  missing runtime/canvas, canvas sizes/DPR, local focus eligibility, keyboard and
  pointer counts, lifecycle state, readiness vs output, bounded failures, Assets,
  persistence evidence/fallback/privacy, external declarations, scoped wording,
  explicit severity and detached snapshots. Report/text/panel side-effect guards
  prohibit persistence access, fetch/Audio construction, resource creation, audio
  unlock, resize, listener installation and focus changes; managed state is unchanged.
- Input / Boot: **27 PASS**; Audio / Asset: **50 PASS** (including failure injection).
- Starter adoption: **5 PASS**; Canary static/wiring checks: **3 PASS**.
- JavaScript syntax: **PASS**.

Commands:

```sh
node --test tests/test-engine-diagnostics.cjs
node --test tests/test-engine-input-boot.cjs tests/test-engine-audio-assets.cjs
python3 -B tests/test_starter_adoption.py -v
python3 -B tests/test_engine_canary.py -v
node --check engine/sukimastock-engine.v0.3.0.js
```

The historical v0.2 byte-identity test now excludes only the devtools report
section in addition to Phase 2's existing exclusions. Diagnostic event recording,
performance, all non-report subsystems and all Input/Boot behavior tests retain
their protections. Runtime behavior is unchanged; no global instrumentation.
Scope/Risk/Impact and trusted/static results are attached to the exact PR head by CI.

## Observation limits

**Phase 3 browser Report UI/output: UNVERIFIED.** Chromium executable is absent
in the available automation environment. VM tests are not real-browser evidence.

The owner reports iPhone Safari canary success for Phase 1/2 tap/drag,
background/foreground, orientation, AudioContext resume, valid audio, intentional
missing audio and false-ready prevention. This is owner-reported evidence for
those checks only, not a Phase 3 browser PASS. Physical keyboard, strict BFCache
and nested iframe focus remain unverified.

Private Codea capture count, unrecorded pageshow/migration history, unaccessed
persistence and all external subsystem observations are explicitly unknown.
No saved values are included, no storage probe is performed, and external
boolean declarations never promote unobserved systems to observed/PASS.

Engine 0.2.0, Codea, existing works, starter, canary, town registration, sitemap,
production and workflows are outside scope and unchanged. Stop at Draft PR;
no merge. Repository-level final verificationState remains **UNVERIFIED**.
