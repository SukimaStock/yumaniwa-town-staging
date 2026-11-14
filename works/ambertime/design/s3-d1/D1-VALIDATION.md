> Historical D1 stop record, preserved unchanged below. The separately authorized repair is documented in [D1-R-REPORT.md](D1-R-REPORT.md). D1 overall remains incomplete.

# D1 validation ledger

## Reproduce

From repository root, use Node v24.22.1. Restore the #854 synthetic fixture archive outside the repository. Archive SHA-256: aa148020a3e3223b5608ec2be409d49b519ffabc165e4ac72d2160b333db4877. Verify the game SHA against the report before using it.

- `node --test works/ambertime/tests/s3-d1-codec.test.mjs`: 16 passed.
- `node works/ambertime/design/s3-d1/reproduce-rejection-failure.mjs`: **expected defect reproduction, exit 1**. It asserts the desired rejection, not the faulty acceptance.
- `node --expose-gc works/ambertime/design/s3-d1/measure.mjs /path/wide-1200.research.json`: fresh-process codec benchmark. Repeat as separate processes; it does not run formal replay.
- `node works/ambertime/design/s3-d1/run.mjs /path/wide-1200.research.json`: prospective gated continuation runner; do not treat its edited instrumentation as already executed for all durations. The recorded partial evidence was generated before per-operation callbacks were added. Only the separate 1-month operation comparison was executed with that callback.

## Evidence distinctions

New: known input hash/count check; exact input/game JSON roundtrip; 1/3-month final JSON and month-end game/collector/dialogue hashes; one completed public-operation hash comparison; 16 tests; isolated 3-process timing; retained formal-cap rejection; independent rejection counterexample.

Reused: #854 fixture and D0 capacity/dependency context. The continuation scenario is adapted from market-dialogue-s3/long-run.mjs at the base SHA: uses supplied snapshot/sidecars, starts at its absolute month, initializes deterministic cask targets for both branches, returns existing collectors, never injects game facts. It invokes current public model APIs without modifying them.

Independent review by a separate read-only worker found the stopping defect in codec.mjs. Its actual 10-year research input SHA is 533991ceb815d7fb51037fd79ccff15afb7446390b37f6f53b87983b201f531b; game SHA de8e462c70e80a2b91bc458e1e75ef4207f22a38940056707009116f94fc5621. The committed reproducer reduces the same defect to one arrival. Unknown top-level fields and unused schemas are also accepted; that is another strict-canonical-envelope gap, not game-state inequality.

The reviewer ran existing D0/R0 and historical-boundary tests: 12 passed, 1 existing dependency-binding failure (economy.mjs changed). No historical expectation was updated. These are not current-model nine-boundary validation.

## Trust boundary

Decoder requires game/input SHA anchors supplied independently of the candidate. They detect different decoded content relative to known fixture bytes; they neither prove a creator nor replace full formal replay. Decoder materializes full JSON. It is not a non-expanding formal validator. Recomputing both candidate hashes and trusted anchors would defeat the comparison; deployment has no authenticated persistent anchor mechanism here. No hash-only provenance claim.

## Safety

No formal save keys used, no original overwritten/deleted, no official modules changed/importing research. No save-limit bypass. Existing 100-year input is over formal limit and remains rejected. A candidate can still be malformed despite correct final decoded content: this is why D1 stopped.

Verification state: UNVERIFIED for browser/device and formal save. D1 failed its rejection gate; 12-month run cancelled, further acceptance evaluation stopped.
