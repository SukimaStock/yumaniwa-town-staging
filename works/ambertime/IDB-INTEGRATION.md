# IndexedDB runtime integration (#889)

Status: **Draft / not merged / not ready for real-player recovery**.

This work continues PR #894 under the existing Full Plan Lock
`.change-plans/ambertime-idb-runtime-889/r0.lock.json`, digest
`f258e3838ed2f2483cc1b821964165db4b8adec1cede02b46be1346ab715ca96`.
The base is `8d83160f962b1394ad3a2dd2fa8939216bb19255`. The plan-only commit
is `5171bc8a5fa4a69e5834c8f92506cb44fc64bc40`.

## Safety contract

- The main-game database is separate from the existing preflight database.
- All three legacy game-save keys remain read-only. Original bytes are retained
  in the main database's origin record as well as their original locations.
- Existing source precedence is preserved: when valid formal `main.v1` exists,
  the two older-format keys are retained archives, not competing current games.
  Any subsequent change to any of the three captured keys stops the runtime.
- The unchanged formal v8 reader and serializer remain authoritative. No codec,
  gameplay, economy, RNG, history, recall collector, or formal-cap changes.
- A detached candidate is published only after transaction completion and exact
  formal readback. Busy input is rejected, not queued. Saving is not game time.
- Revision CAS, head/previous, and immutable migration/import/new-start/rule-change
  records protect prior generations. Corruption, disagreement, quota, abort, and
  uncertain completion stop progress; they do not trigger reset or rollback.
- Hidden/pagehide interruption invalidates pending publication. Recovery requires
  a cold read, never retrying an uncertain write with the old revision.
- No private player save is included in this repository, evidence, or comments.
  Production is outside the authorized scope.

## Fresh baseline, 2026-11-10

The full unchanged AmberTime Node suite was rerun from the plan-only commit:

`node --test --test-reporter=tap works/ambertime/tests/*.test.mjs`

Result: **1,620 tests; 1,514 pass, 95 fail, 11 skipped**, 124.637 seconds.
The same source tree as current main is used apart from the inert plan lock.
These existing failures are not an all-green baseline. New-head results must be
compared by individual test name and cause, not merely by total failure count.
Historical source-oracle assertions are not weakened to conceal differences.

## Initial implementation verification (a9730640)

The implementation full run (before adding the separately gated browser file)
finished in 125.497 seconds: **1,656 tests; 1,580 pass, 65 fail, 11 skipped**.
Sixty failing titles also failed baseline. Their causes are not all unchanged:
some historical source extractors now fail on the new async contract before
reaching their older assertions. Thirty-five baseline failures no longer fail.

Five newly failing titles remain, all from untouched synchronous extraction
harnesses that drop the `async` prefix:

- `distill-cut-main-integration.test.mjs`: countdown cancellation, run-one-to-three
  guidance/reload, and automatic-batch/generation guidance.
- `distill-display.test.mjs`: unfinished-spirit reload entrance.
- `r3-preparation-controller.test.mjs`: restored legacy/automatic staff gates.

The shared `r0-distill-host.mjs` and the first two test files are outside this
locked scope. No pinned historical bytes or behavioral assertions were changed
to hide failures. These regressions need an explicitly scoped harness follow-up;
the suite is **not green** and is another reason to retain Draft.

Focused new main/preflight/boundary/runtime checks: **49 pass, 0 fail**. The
separate optional native-browser suite is **skipped**, not passed. Main storage,
boundary, real adapter boot/import/new-start, and unchanged `s4-save` separately
passed **59/59**. Tests cover delayed publication/replacement, serial startup
migrations, mounted notices, unchanged legacy bytes, CAS, quota/abort/conflict,
semantic corruption, interruption, original backups, and cache eviction.

Independent code review found and resolved four defects: recursive candidate
preparation, invalid-import clock freeze, a distillation-completion phase guard,
and native dialog cancellation while a save is pending. The final storage/cache
review found no remaining concrete safety defect. This does not replace the
missing browser evidence or remove the performance/test blockers below.

## Browser limit

A fresh Chromium launch probe failed before any page opened:
`process_singleton_posix.cc:297: socket() failed: Operation not permitted (1)`.
The installed Playwright WebKit executable is absent. No security restriction
was bypassed. Native IndexedDB, browser event timing, two real tabs, touch,
iPhone Chrome/Safari, OS termination, and physical durability remain unverified.
Node transaction simulations are not native IndexedDB evidence.

## Performance measurements and limits

The existing unmodified
`design/market-dialogue-s3/long-run.mjs` / `simulateScenario('wide', 154)`
generated a synthetic seed-42 record through public game operations and all
formal sidecars. Its month-154 round trip was exact: 302 operations,
1,909,946 UTF-16 code units / 2,081,804 UTF-8 bytes, SHA-256
`3d5379e6a017ea53429a010f4cb14206b8e61e3a19674c01e39c683d7c24c678`.
It is not the author's month-154 record.

On Node v24.22.1, one cold formal read took 5,343 ms. The first implementation
measurement uses
the actual main adapter and a serialized transaction simulation, retaining the
unchanged formal reader, serializer, hashing, generation checks, and backups:

- Boot/migration: 5,617 ms.
- Three elapsed-only logical candidates: 634 / 644 / 646 ms total per tick,
  including 194–211 ms serialization and 435–448 ms adapter work.
- Month 154 to 155: 737 ms including 48 ms native preparation, 227 ms
  serialization, and 462 ms adapter work.
- Reopen in the same Node process: 5,367 ms. The restored month-155 session was
  exact, the legacy bytes unchanged, and the original migration copy retained.

This is synthetic transaction evidence, not native IndexedDB, a real-browser
scheduler, an OS-cold benchmark, or an iPhone measurement. Every logical tick
at that checkpoint took more than six times the nominal 100 ms interval. **Performance is a
merge blocker.** All archives are also read and hashed on every save, so history
of explicit replacements adds another unbounded cost.

A bounded per-connection exact-byte validation cache avoids replaying unchanged
successful records, while every record's shape/hash/metadata is checked and each
new candidate plus committed head are formally decoded. Cache hit refresh fixed
an observed multi-second replay spike; eviction, corrupted bytes with recomputed
hashes, and reopen remain covered. No decoded mutable game is shared from cache.
No cadence reduction or codec-validation bypass is authorized by these results.

### Narrow follow-up within the same locked Plan

Unchanged prior/archive strings that already passed canonical parsing and the
official reader now reuse both successful results from the existing exact-text
cache. Every fresh envelope is still shape-checked and hashed. Every new
candidate and forced committed-head readback still run canonical parsing and
the official reader. No parsed session is cached. Stored source bytes and the
format stay unchanged; no validation check on changed bytes is removed.

In a matched unprofiled synthetic run, adapter median time fell from 424 to
370 ms. Total elapsed-only saves were 612–625 ms before and 555–607 ms after;
the month-154-to-155 step was 752 ms before and 656 ms after. The two mandatory
adapter reader calls, exact reopened month-155 session, original legacy bytes,
and migration backup all remained intact. Timing varies between runs. This is
still more than five times the 100 ms interval, with no native-browser cost.
The unchanged serializer alone measured 184–237 ms. Further fundamental pacing
changes require a separate design; this follow-up does not make the PR ready.

Four new regressions cover noncanonical changed head/previous/archive bytes
with recomputed hashes, checksum corruption on a cached exact string, mandatory
candidate/head parsing, and invalid validators. The focused storage, boundary,
runtime, and unchanged `s4-save` group passes **56/56**, independently rerun.

The allowed R3 preparation harness now awaits real async runtime actions and
uses formally checked sidecars for current-session fixtures. Historical native
legacy/staff fixtures remain read-only projections with their original bytes;
they are not treated as importable v8 sessions. Its newly failing restored-state
case and three baseline-failing cases now pass: **6/7 pass**, with related
runtime/save/recall checks **25/25 pass**.

The one retained R3 failure now reaches `selectRoom:shownFillSpiritId`: current
and initial main (`8d83160f`) reset it to null, while pinned pre-R3 code retains
1. The original assertion and pinned source digest remain intact. The monthly
fixture now uses an observed native tick through the action boundary, checking
the expected exact native bytes, instead of injecting an unsaved state. The
other four newly failing extractor cases still require paths outside this lock;
no compatibility shim or copied harness is used to bypass that scope.

IndexedDB does not solve the independent expanded-state cap (6,016,384 UTF-16
units) or the 12,000-operation limit. Existing long-term research remains relevant;
100-year / four-generation continuation is not claimed by this integration.

## Author's eventual device check

Do not import the private backup into the unchanged Staging game yet. After a
separate report confirms that a safe integration is actually deployed:

1. Keep the original month-154 v8 JSON and old backups outside the browser.
2. In the same iPhone Chrome profile, open the Staging game with `?debug=1` and
   explicitly import the original month-154 v8 JSON. Do not reset or delete keys.
3. Verify the restored date, inventory, ledger, history, and completed recalls.
4. Advance one month, wait for the saved indication, close the page, reopen, and
   verify that date and records again. Stop if there is a conflict/error or an
   unacceptable wait. A preflight-page success does not replace this test.

## Remaining completion gates

- Resolve the remaining full-suite/historical-harness regressions without
  weakening the unchanged behavioral oracles.
- Full-path representative performance and actual browser verification.
- Scope → Risk → Impact, syntax, and required CI on the implementation's exact
  remote head. Plan-only CI success does not verify implementation.
- Staging merge only if material high-risk blockers are resolved. Real-device
  acceptance and 100-year safety remain separate claims.

## Expression audit

The six-point source review keeps only necessary saving/recovery state, explicit
replacement confirmation, and the existing import/export controls. The retry
label now describes the actual cold reload. No decorative copy, game dialogue,
article text, or new layout was added. Browser readability/touch behavior remains
unverified with the browser limitation above.
