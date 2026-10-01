# Staging validation — こつ、ころ。

This is a standalone experiment under `works/kotsu-koro/`, not a registered
town release or a production publication. Formal verificationState remains
UNVERIFIED under the current Change Verification contract.

## Local first loop

- Built outside the repository from current Starter and frozen Engine 0.3.0.
- The meaningful loop is hold/tilt → release → shell recovery → later seed
  motion/contact → quiet arrangement → another gesture from that arrangement.
- Ten executable focused checks pass (`node works/kotsu-koro/test-dynamics.cjs`):
  momentum preservation, delayed response, eventual quiet, equal elapsed
  simulation at 30/60/120fps, knock response, long-run containment/finite values,
  regrab continuity, trace expiry, pointer cancellation and keyboard loop.
- Codea snapshot is byte-identical to `engine/codea-lite.v1.0.0.js`.
- Canonical Engine is referenced by the adoption tool; no Engine change.

## Browser evidence status at first staging commit

Cloud Browser rejects the local 127.0.0.1 URL (`ERR_BLOCKED_BY_CLIENT`).
The installed ephemeral preview helper cannot mount its sandbox (`bwrap`
proc-mount failure). Neither attempt verifies rendering or input.

The first staging commit is therefore a canary, not the completion of this
task. Browser drag/release/regrab, keyboard, layout, audio resource/Session
Report and interruption will be checked on the actual staging Pages URL.
Observations and any following refinement belong to the subsequent exact-SHA
record. No physical iPhone or subjective sound/feel claim is made here.

Production, existing works, town registration and shared runtime are excluded.

## First deployed browser canary / refinement

Observed runtime: staging merge `917ca9967770b957fee13952098110f8994f19eb`
(PR #100), Cloud Chrome, 1363 × 936 CSS viewport.

- Rendering is present after bootstrap: paper, single vessel, seeds, title and
  one sound control. The first capture preceded the first rendered frame; no
  bootstrap error was observed.
- Actual drag reproduced a work-side `CHANGED is not defined` exception on
  pointer end. The original mock supplied a noncanonical constant and hid it.
  Refinement removes that constant from both sketch and harness, and tests
  ENDED and CANCELLED independently against canonical touch vocabulary.
- Observed seed pile had visual overlap. Collision radius increased from 6.5
  to 8.5; shell translation/rotation modestly increased to clarify the hold.
  No additional effects/UI/game rules were introduced. Unused impact-flash
  state was removed.
- Eleven focused checks pass after this correction. Canonical Engine remains
  unchanged. Final deployed drag/release/regrab and audio/lifecycle checks
  are still pending at this refinement commit.
- Existing six-work Release Validator: PASS 827 / FAIL 30 / WARNING 3 /
  HQ REVIEW 0 / EXTERNAL 38. Output compared byte-for-byte equal to the
  start main `936dbc8e5993708853a9fc945c462f8cee201c35`; the 30 existing
  failures are not new work regressions and are not called PASS.
