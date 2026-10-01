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
