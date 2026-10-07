# HOME Echo Archive — Phase 1

Base: staging/main `409964eae518cd92e73a177c8c85a24020b929a6`.
Branch: `feat/orbit-02-home-archive-20261007`. Draft PR only; no merge/deploy/production.

## Behavior

- Full copy of `works/orbit/`. Original work, canonical Engine and copied Engine/Codea/ritual are unchanged.
- Existing HOME terminal status row opens `archive`; four slots per page, three pages. Unknown memories remain dim dots, pending HOME readings have a faint light. Existing terminal frame/type/buttons remain in use.
- Native Echo display/text/timing reused. The terminal steps out of view during replay and returns afterward. Discovery still reads the Echo at SERA; present-day reaction waits until its first HOME replay finishes.
- Echo 1 retains its original short recognition. Echo 12 gets a short HOME completion line in each existing language-recovery band. The original Finale requires Echo 12's HOME interpretation; RESTORE and Finale choreography are otherwise unchanged.
- RETURN/WAIT acquire matching faint marks after both HOME interpretations. A one-time short E.V.E. line respects RESTORE language bands. No graph or additional relationships.
- RESTORE report's former disabled bottom button provides Archive access. Ordinary RESTORE confirmation and resource costs are unchanged.
- Interrupted discovery resumed by CONTINUE/rescue remains uninterpreted; HOME terminal reopens after its text.

## Persistence / compatibility

Existing physical HOME schema 3 and permanent MEMORY schema 1 remain. Both `echoes` objects gain optional `interpreted: number[]` and `returnWaitLinked: boolean`. Discovery IDs remain the original planet identifiers; ordinal Echo indices remain fixed story order. `read` still records original text completion.

New optional arrays are explicitly present, including empty arrays. Missing `interpreted` migrates from legacy `read` (legacy reading already delivered reactions). If legacy `read` itself is absent, the established found-count fallback remains. Invalid/out-of-range/unread interpretation indices are discarded. Pair flag is valid only with interpreted 2 and 7. Both the newer MEMORY merge and rescue checkpoint preserve these fields.

Dedicated keys:

- staging: `sukimastock.orbit-02.web.staging.save.v3` / `.knowledge.v1`
- standalone: `sukimastock.orbit-02.web.save.v3` / `.knowledge.v1`
- language: `sukimastock.orbit-02.lang`
- sound: `sukimastock.orbit-02.sound`

Old ORBIT keys are neither read, imported nor cleared automatically. An old-shaped snapshot supplied in the new namespace is supported; the original Game Jam save remains intact. Saving failure retains the current-session HOME checkpoint, using the existing behavior.

## Boundaries

`data/work-lifecycle.json` adds only `orbit-02`, active / staging-only. No town/SEO listing, production, new logs, debris, chapter, mission, economy, upgrades or inference graph. Copied historical notes describe the original version; this file and TESTING.md document the new phase. The copied export manifest has separate ID/output and retains canonical Engine 0.2.0.
