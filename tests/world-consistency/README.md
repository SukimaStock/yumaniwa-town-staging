# World Consistency Audit — staging

Read-only, cross-event audit for game-world causality. It supplements existing work-specific tests rather than replacing them. Supported works: PUMPOKO and ORBIT 02.

Run from repository root:

```sh
node --test tests/world-consistency/integration.test.cjs
node --test works/pumpoko/test-ending.cjs works/pumpoko/test-audio.cjs works/orbit-02/tests/archive.test.cjs
```

The first suite uses two distinct evidence levels:

1. **Live captured timelines:** The current PUMPOKO scene advances through a deterministic two-arrival fixture, growth, title return and second run. The current ORBIT 02 simulation executes SERA recovery, HOME analysis, first memory and archive replay. At each event, observed state is passed directly to the shared audit contract.
2. **Synthetic contradiction fixtures:** Small, deliberately invalid sequences prove that each relevant invariant emits an identifiable finding. These are not substitutes for live observations.

The second command runs the existing, work-owned integration suites unchanged. An isolated GitHub workflow executes both when either supported work or the audit tests change. This workflow is not a production release gate or authorization mechanism.

## Current contract boundary

- PUMPOKO: conserve nine seeds, preserve final result for a run, reset outcome when returning to title, start each new run with clean identity.
- ORBIT 02: collect DATA before HOME analysis, avoid prematurely creating an Echo, retain recovered packet identity, and keep archive replay read-only.
- Rules report the event/step of the first observed contradiction. They do not decide aesthetic quality or intentionally ambiguous narrative meaning.
- Do not change game source or shared Engine to make an audit pass. Investigate contracts, fixtures and actual behavior separately.

The tests use Node simulation and existing harnesses, not actual browser pixels, audio perception, mobile device input, or all player paths. Formal verificationState remains **UNVERIFIED**. Staging-only integration does not imply production promotion.
