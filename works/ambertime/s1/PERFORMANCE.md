# S1 performance verification — blocked

Baseline: `d521c3a8677239994599384e1bae2942bf7855a1` (H1-C1 / PR #815).

The same-environment Chromium before/after measurement has **not completed**. The first baseline launch failed before the page loaded:

```
FATAL:chrome/browser/process_singleton_posix.cc:297
Check failed: . socket() failed: Operation not permitted (1)
```

The attempted permission escalation was rejected by the execution policy (`sandbox_approval: false`). No bypass was attempted. No boot, paint opportunity, first-operation, reader, slot, heap or first-ledger timing is available from this attempt. H1-C1's previous values must not be subtracted or used as an observed speedup.

`local-before.json` retains the incomplete result. `browser-timing.mjs` is an unfinished adaptation of the existing isolated H1-C1 runner, **not validated evidence**. It instruments served copies only, uses v3 for baseline and v4 for the candidate, and records input/source hashes. Its input test is Tab response, not a completed game action; first-ledger and completed-game-action coverage still need to be added before final acceptance. The candidate fingerprint must be refreshed after final code changes.

The unchanged H24 generator produced local 30/60/90/100-year inputs in scratch. `input-status.json` records their hashes; this list alone does not certify equivalence to all earlier published inputs. Wide generation was interrupted after its 30-year checkpoint; no 100-year wide result is claimed. Mixed generation and additional heavy measurement were not started after the browser blocker.

Resume only in an environment that supports the requested isolated Chromium execution. Compare before and after sequentially, match input SHA and model/history dependencies, exercise migration and real actions separately, and leave Safari as unverified until actual device confirmation. The incomplete test is a reason to retain a Draft PR, not to claim the requested performance completion.
