# S3 — development save (Draft)

Base main: `eabd3de962c48260dea94dac98fe647ca015ba4b` (S2 #817).
Plan Lock: `.change-plans/ambertime-s3-development-save/r0.lock.json`, registered before implementation.

## Direct causes

The supplied v5 file (10,417 bytes, SHA256 `a23d50ab34e607b9ec6aaaaa5b3c2db92602d525dadb62dddb030986aeac0de5`) restores correctly and roundtrips without changes. The next bourbon fill succeeds in the formal model, but S2 `validSource` rejects `type: bourbon` versus formal flavor choice `cask: first`. The exception occurs in `advanceRecentLedger`, before serialization or localStorage. Correct the alias mapping without removing validation. Both bourbon and refill now fill, save and restore identically to the formal result. The original supplied file is unchanged; the test fixture is an exact copy. Actual Safari storage was not inspected, so this does not claim to exclude an additional device quota failure.

The separate reset guard rejected `!game` and `canSave=false`, making recovery impossible after a read/write failure. Invalid debug imports also used to halt a healthy session.

## Current contract

Normal play uses session v6 only under `sukimastock.ambertime.main.v1`: compact unchanged formal game, pause/clock, four slots and recent notebook. Official replay validation and exact roundtrip remain. One conditional setItem plus readback precedes publication of game and sidecars. Failure restores the committed in-memory state and pauses play. Diagnostic phases distinguish notebook, candidate verification, write/readback, boot and file validation.

V2–v5 are rejected before official replay. No automatic migration, backup-file re-selection, allocation selection or multi-stage confirmation is used in normal play. Historical readers remain for research/tests. If only the old placement-trial/wholesale key exists, its raw bytes can be exported and confirmed new play is offered; those old keys are not deleted. New saves use only the formal key. Unknown/corrupt records are not overwritten just by loading.

New start confirms replacement before any mutation, constructs and validates fresh game/slots/notebook/clock, checks the observed prior bytes, writes and reads back, then installs the new session. It works with no game or with saving disabled. Cancel changes nothing; quota failure reports failure; a changed other-tab value is never deliberately adopted as the expected overwrite value. This retains the existing localStorage optimistic conflict/readback protection, not a new cross-tab locking protocol. No localStorage.clear or unrelated-key deletion.

The ordinary menu contains autosave status and new start. Import/export and diagnostic details are behind `?debug=1`; recovery offers new start and raw export without requiring debug. Invalid import parsing/verification leaves the current playable session intact. Current-version exports can be imported; older formats deliberately cannot.

## Verification and remaining gate

- Core, formal save, S1 slots and S2 notebook: 39/39.
- Legacy reader adapter and S2 app transaction tests: 16/16. The legacy stub was updated with S2 operations/month/ledger requirements; no production legacy reader changed.
- S3 app VM tests using real formal model/save functions: 16/16. Include new/cold resume, corrupt/v2–v5, legacy keys, cancelled reset, quota, stale tab, invalid import, error recovery.
- Recipe, generation model/history and slot canvas regression: 33/33. Total focused checks: 109/109.
- H2-5 small tests: 5/5. All 63 files in S2's published dependency closure still match their hashes. Nine 100-year boundaries were not rerun; no new long-play study.
- Formal model, economy, reputation, recipe, release, generation and history implementation files are unchanged. Fixed expected hash evidence is untouched.
- Scope, Risk, Impact and syntax pass. Independent implementation review completed; corrupt diagnostics and filling-resume behavior were corrected before final tests.

Chromium failed before opening a page: process_singleton_posix socket() Operation not permitted (with ptrace also denied). No security bypass was attempted. VM tests are not browser tests. Required real-browser operations remain unverified; keep Draft and do not merge or deploy Staging. Production untouched.

On a browser-capable environment: new start → manual distillation → both cask choices → notebook/recipe → tasting/month → bottle/sell → reload; error/old/corrupt save → cancel and confirmed new start; quota and other-tab conflict; invalid debug import followed by continued play. On iPhone Safari prioritize existing error → new start → normal play → reload/cold reopen and stable cask slots/recent notebook. Do not request deletion of all site data.
