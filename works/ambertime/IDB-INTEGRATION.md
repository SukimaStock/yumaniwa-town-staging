# Bounded formal IndexedDB integration v0.3

Status: local implementation candidate, not Staging-deployed. Production forbidden.

Plan: `.change-plans/ambertime-idb-live-v03-20261112/r0.lock.json`.
Base: `0778bcf4555737ec45947a80aca8f761f39fa429`.
Plan-only commit: `b2f852fc`.

## Preserved behavior

One player-facing formal save slot. The current title remains “はじめから / つづきから”; title inspection does not replay the prior game or its recall. Continue performs the unchanged official reader and migration. Confirmed new start may create a fresh IDB save while preserving the exact legacy source bytes. Existing IDB records must validate before replacement. No Production changes, old-key deletion, economic changes, history reduction or recall alteration.

## Durable storage

The existing main IDB namespace is used with a bounded schema. An existing #894 archive-schema database is refused without mutation, rather than ignored in favor of stale localStorage. Preflight remains separate. The main store contains origin, metadata, head, and (after revision one) previous. Repeated new starts/imports/rule transitions do not create backup lists or append-only archives. Original legacy source keys remain read-only and one origin snapshot is immutable.

The official reader accepts the formal version; the adapter is not a migration or validation substitute. Every candidate and committed head is formally read. Already-validated exact bytes may reuse the existing bounded connection/reader-specific cache for previous/origin work; hashes, structure and fresh transaction snapshots are still checked. Every successful transaction compares the entire prior map, including presence and full values, then atomically rotates validated head to previous. Null, false, zero, empty text and stored undefined are not absence. A damaged head or previous is fail-stop, never automatic repair.

The commit barrier blocks additional input. Only durable transaction completion plus readback allows game/clock/all sidecars and UI success to publish. Failed preparation, quota, partial write abort, mismatched revision, stale legacy writer, damaged data, and uncertain readback stop the runtime. No automatic reset, rollback or retry. Cold reload reconciles an uncertain committed outcome through official validation. Original localStorage and IDB transactions cannot be atomic across stores; any observed source change is an uncertain halt preserving both.

## Current verification evidence

- Original main full-suite baseline: 1,863 tests, 1,736 pass, 109 fail, 18 skipped. Baseline failures are recorded separately; they are not reported as successes.
- Adapter/storage/runtime core: 65/65 pass on the current local code.
- Runtime/entry-failure/barrier subset: 26/26 pass.
- Scoped tests cover readback delay/failure, no early publication, duplicate input, cross-tab conflicts, malformed previous/head, 24 bounded replacements, migration source preservation, atomic partial-put abort, cold reconciliation, and six existing enable boundaries.
- Scope, Risk and Impact pass. Independent review and final exact candidate regression comparison are underway.
- Tests use simulated IDB/DOM unless explicitly marked native. iPhone physical storage eviction, OS shutdown, native display and touch are not established by these tests.

## Remaining integration conditions

This candidate alone does not remove the formal codec cap or make a large replay fast. Separate new-consignment 100-year bulk serialization failed at the existing cap; regional cold restore was measured around 68 seconds. Those are not solved by switching storage. Lossless codec work, if accepted, needs exact joint tests with this candidate and all sidecars.

Do not merge until required exact-candidate gates, independent review, relevant regression and long-save conditions are resolved. Do not use CI success alone as physical-device or Production approval.

## Rollback

Code rollback cannot silently revive old localStorage. Preserve all database records and source keys. Export/verify the latest applicable record and obtain an explicit recovery choice before changing the active storage interpretation. No data deletion or automatic previous-generation selection is part of this candidate.

An idle hidden session pauses without a save and resumes only after exact current-record verification. A hidden pending commit remains fail-stop. The bounded validator cache is scoped to the same connection and reader identity and exact verified envelope bytes; unchanged previous generations may reuse that prior validation, while current is read and checked again.
