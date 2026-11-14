# Change OS D1 — Staging classification comparison (research only)

Date: 2026-11-06. No runtime, gate, Ruleset, or Production changes.

## Why

The current trusted Fast Path accepts a wholly new single work and bounded changes to an active work. PR #821 adds only `works/postcard-generator/review-world/index.html`, a nested independent comparison Lab, and failed `Verify locked Plan precedes implementation`. This failure is procedural; no runtime defect was established by that job.

## New candidate scheme

- **A Explore**: isolated nested Lab with trusted Git evidence of a new directory, additive-only diff, no existing entry-point changes, no reachable runtime side effects, and imported dependencies resolved under the same work by trusted Git-tree inspection. Scope-level checks.
- **B Improve**: active single-work changes with trusted dependency and semantic review, no contract changes. Relevant regression.
- **C Protect**: shared systems, persistence, game rules, release, unsafe or ambiguous/unknown evidence. Existing strict reviews.

A and B are *candidates* only: passing the heuristic alone is not permission to merge. The Git-data collector, content safety checks, actual per-work tests, and operator confirmation of the trust boundary must be developed and independently verified in D2.

## Comparison on known evidence

| Case | Current route | D1 candidate |
| --- | --- | --- |
| PR #821 nested Lab | Full Plan; gate failed | A **if** trusted isolation/side-effect facts are established |
| Local visual change in active work | Fast Path only when strict bounds met | B **if** reviewed and related tests pass |
| Game/save/Engine changes | Full Plan | C |
| External communication, unsafe dependencies, release | Full Plan | C |
| Old base plan / competing main updates | Fresh locked base may be necessary | C pending a separate rebase-safe design |

Run: `node research/change-os-d1/test.mjs`.

## Important limits

This prototype accepts a structured fact summary rather than inspecting immutable Git blobs itself. `trustedFacts`, `noRuntimeReachability`, `noExternalSideEffects`, and the semantic review fields **cannot** be supplied by a candidate PR and accepted as proof. Relative imports are allowed only with separately verified same-work resolution. Text scanning is a deliberately conservative signal, **not** a semantic security analysis: dynamic calls and indirect dependencies may evade it. The existing pinned base-owned validation remains authoritative until D2 is proven. Do not add this research classifier to required checks, remove Plan Lock, or relax Ruleset on the basis of this draft.

D2 readiness: bind immutable base/head trees, reproduce existing negative-case corpus, validate no false allow on modified hidden behavior, preserve failures on unknowns, exercise PR #821 and several representative existing PR diffs, then independently review before gate changes.
