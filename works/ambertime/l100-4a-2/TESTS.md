# L100-4A-2 tests and boundaries

- Node v24.22.1. Focused accessor tests 8/8, formal-save + recall-save + accessor combined 24/24 PASS.
- 12 baseline snapshots × A/B/C × 12 unmodified advanceTown calls = 432 exact whole-game comparisons after explicit reconstruction. B/C retain the accessor between transitions.
- 3 original 100-year official readSession → each A/B/C explicit hydrate → actual full-model next month and collectors → whole-session equality → official save/re-read: PASS. This is NOT a compact full-model test.
- Actual compact full-model tick from original initial states: `s.arrivals.push is not a function`, due to native cloning losing class private state. Recorded as incompatibility, not hidden or bypassed.
- Direct mapProgress on accessor silently sees no arrivals due to Array.isArray. Explicitly hydrated map matches. Not full UI/browser verification.
- Malformed/duplicate IDs, missing/deleted references, duplicate/unordered pushes, incomplete arrival registration, invalid index, long varint gaps, buffer growth, index/ID/identity/ordered iteration: tested.
- 12 inputs ×3 in-process measurement runs; separate wide100 Node process A/B/C×3 runs. Memory retained samples and process lifetime RSS high-water, NOT synchronous phase peaks.
- Source SHA-256 preserved; no original save writes. Test result files contain input names/hashes, no player data overwrite.

## Independent review correction
The reviewer found compactFormalGame returns an object, so `.length` omitted the attempted wire metric. Fixed both scripts to `JSON.stringify(...).length`, named `compactGameUnits`, and reran the 12 comparisons and nine fresh-process measurements. This is compact game JSON, not the enclosing session file. No game expected values changed.

## Known limits
No 30→100 full-operation compact replay; no compact new-generation selection/reappearance proof; no browser or iPhone Safari; no exact per-phase allocation/peak; no formal limit/headroom improvement; no official checkpoint/backup; no Production, main merge or formal save/UI changes.

## Change OS
Plan Lock, Scope Guard, Risk Check, Impact Check and diff check are run against the final local/published tree. Exact-head CI is reported separately in publication evidence. These do not certify browser/manual results or Release Complete.
