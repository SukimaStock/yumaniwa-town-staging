# World Consistency Audit — staging pilot

Experimental, **read-only** cross-event consistency checks. Contracts flag the earliest observed contradiction and explain the rule. They never modify any work source, game state, Engine, Codea, saved data, or production.

Commands, from repository root:

```sh
node --test tests/world-consistency/integration.test.cjs
node --test works/pumpoko/test-ending.cjs works/pumpoko/test-audio.cjs works/orbit-02/tests/archive.test.cjs
```

The first command tests event-contract semantics and deliberately corrupted traces. The second executes the **current, real** PUMPOKO and ORBIT 02 work-owned integration suites, including ending/title/replay, SERA/HOME/archive and CONTINUE edge cases. Both must pass in the CI workflow. **Do not interpret the static traces as real-code-derived evidence**: they prove only that the generic contradiction detector recognizes specified problems. Real source is exercised by the work-owned suites. A later phase could capture snapshots directly from the harnesses to avoid this split; this pilot intentionally does not patch gameplay or alter the work tests.

Evidence scope: Node simulated scenes only, not browser pixels, iPhone/iPad, audio perceptibility, or every possible event sequence. Do not conflate exit 0 with Release Complete or formal verificationState.

Added only on staging; no production instruction and no automatic merging.
