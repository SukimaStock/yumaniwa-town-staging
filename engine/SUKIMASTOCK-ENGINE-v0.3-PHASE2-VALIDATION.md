# Engine 0.3.0 Phase 2 — Audio / Asset readiness validation

- Date: 2026-09-30
- Repository: `SukimaStock/yumaniwa-town-staging`
- Base: `b4f588e8e105edc00c97b99e7768830456610551`
- Implementation tested: `770df554ac45a98bc1cdf8f2c1255b0dac23d09e`
- Plan: `engine-phase2-audio-asset-readiness-v2`
- Plan Lock commit: `d596cbd4069e1859e47f090524c7667c64249fad`
- Plan digest: `bff0b26c5584233a5658a519d75e7cc33ac8faec63c223a390a677d875a00f80`
- Verification state: **UNVERIFIED** under the current Change Verification contract.
- Delivery: dedicated branch / Draft PR only; no merge or production promotion.

The initial local attempt omitted `tests/test-engine-input-boot.cjs` from its
allowed paths and stopped when the historical byte-identity assertion failed.
The Owner authorized a fresh branch and lock. That abandoned lock was not edited
or pushed; this fresh lock precedes all implementation and includes the test path.
Phase 1a/1b locks are unchanged.

## Root cause and correction

`assets.loadAudio()` previously awaited `audio.preload()`, then returned a cached
buffer, a newly constructed music player, or unconditional `true`. A rejected
buffer fetch/decode was converted to null; undefined names added no preload task;
HTMLAudio load initiation was not awaited. All three could become Asset ready.

Audio now tracks idle/loading/ready/failed/unavailable and a retained reason.
Asset loading consumes the actual resource result and rejects non-ready or empty
results. Asset public statuses and strict/aggregate retry semantics are unchanged.

Buffer readiness requires a usable decoded AudioBuffer. HTMLAudio readiness uses
HAVE_FUTURE_DATA/canplay for every used pool element or the music element, with a
15-second default timeout and complete attempt listener/timer cleanup. Explicit
retry replaces failed media elements. Tone remains the existing direct procedural
API; no named generated-sound format or undefined-name fallback was introduced.

## Executed automatic checks

| Check | Result | What it establishes |
| --- | --- | --- |
| `node --test tests/test-engine-audio-assets.cjs` | 50 PASS | Resource success, failure, pending, explicit retry and output separation |
| `node --test tests/test-engine-input-boot.cjs` | 27 PASS | All 26 Input/Boot behavior tests plus preserved non-Phase-2 byte identity |
| `python3 -B tests/test_starter_adoption.py -v` | 5 PASS | Canonical pins, generated ZIP, isolated local→staging handoff and old explicit pins |
| Scope Guard → Risk Gate → Impact Check | PASS | Locked scope and required classification/impact declarations |
| Base-owned trusted static checker | PASS | Unchanged registry transition and candidate JS syntax |
| `git diff --check` | PASS | No whitespace errors |

All above checks ran against the implementation SHA. This record is a later
Markdown-only commit; the final PR head is checked separately by GitHub gates.
The New Work Starter workflow is triggered by the canonical Engine change; its
run and artifact result are reported on the PR. This document does not predeclare
unobserved CI results.

Failure injection includes HTTP 404, rejected/synchronously throwing fetch,
response-body failure, malformed audio/decode rejection, null/undefined/invalid
decode results, absent fetch/Web Audio/media/event APIs, closed context, media
error, synchronous media load failure, and unresolved media until timeout.

Boundary coverage includes concurrent pending fetch/decode, metadata-only media,
all pool elements, already-playable media, stale media callbacks after retry,
listener/timer cleanup, retry reason clearing, preload partial failure, optional
asset reporting without global boot failure, strict Asset rejection, muted/zero
volume loading, suspended Context with rejected or throwing resume, later valid
gesture retries, autoplay rejection, and old pending loads after reconfiguration.

The historical Phase 1 identity assertion now excludes exactly `assets.loadAudio`
and the Audio object. All other sections from Storage through the beginning of
Input remain byte-compared to v0.2, retaining Phase 1's listener normalization.
No Input/Boot behavior assertion was removed or skipped.

## Impact, unchanged boundaries and rollback

- `runtime.shared`: only canonical Engine 0.3.0 changes; existing pinned work
  entries/runtimes, v0.2, Codea 1.0.0 and starter source remain unchanged.
- `runtime.regression`: 50 Audio/Asset + 27 Input/Boot + 5 packaging tests above.
- `risk.high-risk-review`: the Owner-supplied readiness design is implemented as
  SYSTEM / Full / HQ Review; no new audio subsystem or named tone registry.
- `runtime.rollback`: revert the Phase 2 implementation and related test/docs
  together. No data migration or save-key changes are involved.
- No Scene, Storage, host bridge, Session Report UI, town retry or iframe change.
- Production was read only; observed main remained
  `53d31cfe98313c87cfc5ffb78e3b4e8cdaed1ca3`.

## Browser/device limits

Playwright is present, but its Chromium/headless-shell executable is absent.
A launch attempt failed with “Executable doesn't exist”. No browser test passed.

Browser AudioContext/HTMLAudio smoke, browser codecs, autoplay policy behavior,
actual audible playback, and iPhone Safari initial gesture, background→foreground,
resume, mute/unmute and audible output all remain **UNVERIFIED**.
Node mocks do not establish any of those properties. Phase 3 diagnostics and
existing-work migration are out of scope.
