# Source provenance guard maintenance v1.0

Tests-only Draft stacked on #932 exact ad2ce4eb562c66836e3c961e79895bd2535ef2c6. No runtime, economic rules, reader acceptance, source927 expected hashes, tools or workflows change. No merge/deploy authorized.

The original guard protects exact source provenance, not behavioral correctness. It failed 1 of 3 checks because the reviewed v0.7 A/B changes were absent from its explicit inversion list. The new helper inverts only the exact flavor projection once and salary mutation twice. All existing codec/private replay inverses and original source927 hash comparisons remain. Missing/duplicate/altered hunks and unrelated edits are rejected. No generic clone stripping or broad normalization.

## Verification

- Before: original source guard 2/3 pass; partner-orders hash mismatch preserved.
- After: original guard 3/3; 10 adversarial inverse tests; existing exact931 A/B source test: 14/14 aggregate.
- Existing behavioral differential tests: 16/16 (with existing source test this is the earlier 17-test suite).
- Independent reviewer reran the 14 provenance/source tests, all pass, and reviewed original hashes and existing transforms unchanged. This was working-tree review, not formal CI.
- No 100-year re-run: runtime is byte-identical to #932; use #932 long-run evidence with its original exact SHA, not as a fresh experiment here.
- Draft CI pending. No browser/phone/runtime claim from test changes.

## Procedure record

An earlier local-only Plan omitted its own lock path and Scope stopped. It remains unmodified on a separate local branch. This fresh plan includes its exact lock path, was committed before applying the test patch, and preserves the same base. No remote write occurred under the erroneous plan. No runtime scope expansion.

## Reproduction

```
node --test works/ambertime/tests/consignment-integration-source.test.mjs works/ambertime/tests/copy-v07-provenance.test.mjs works/ambertime/tests/copy-v07-source.test.mjs works/ambertime/tests/copy-v07-differential.test.mjs
```

This fixes explicit source-provenance enumeration, not the unresolved long-term runtime performance or all existing regression failures. The test remains an independent source contract, alongside behavior/failure and long-run checks.
