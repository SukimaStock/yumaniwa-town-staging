# HOME DATA analysis — Phase 2

Base: staging/main `fbfa4d4b1a32a63e84a8ed5cfb4c843df689a35f`.
Branch: `feat/orbit-02-home-analysis-20261007`. Staging PR/merge only; production excluded.
PHASE1.md records the earlier prototype; the behavior below supersedes it.

## Loop

SERA recovers one DATA packet, plays the existing short recovery sound and shows `DATA RECOVERED`. There is no analysis, Echo discovery or memory playback there, and takeoff remains immediately available. Existing DATA capacity, recovery economy, planet/RESTORE gates and flight remain unchanged.

At HOME, the existing return voice and terminal boot complete first. The terminal briefly shows `DATA RECEIVED`, then automatically opens the existing DATA ANALYSIS window. Each packet is processed serially. Only completion marks it decoded and discovers the next Echo (up to the original 12); later DATA resolves to the existing empty result. No ANALYZE button.

An Echo result opens its Archive page. A tiny light moves into its slot for 0.9 seconds; the original timed memory display follows inside the persistent terminal frame. First HOME playback records read/interpreted and delivers the existing short recognition or Phase 1 HOME completion line. Archive replays retain their page/focus, return to the same Archive and never award resources, increment Echoes or repeat first reactions.

RETURN/WAIT do not link just because both are interpreted. Revisit either confirmed memory in Archive: the counterpart's point (or its page arrow) faintly reacts. Reopen that counterpart to link once and hear the existing short E.V.E. line. Existing saved links remain linked. The invitation is temporary, not a saved deduction/task; closing and reopening within the session retains it, CONTINUE starts with no invitation.

RESTORE report's bottom button now acknowledges the report and returns to ordinary terminal status. The same `ECHO ARCHIVE : x/12` status row is the consistent Archive entry. RESTORE confirmation, ritual, costs, caps and departure voice remain unchanged. Finale waits for the last HOME interpretation and any pending packets, and cannot retrigger after completion.

## Optional save extension

HOME schema 3 / MEMORY schema 1 and every Phase 1 key remain unchanged. Both snapshots add `dataSignals.pendingAnalysis: string[]` (SERA planet identities). Existing `decoded` is HOME-processed DATA; `echoes.discovered` is Echo-bearing processed DATA; `read`, `interpreted` and `returnWaitLinked` keep their Phase 1 meanings.

Recovery immediately saves pending IDs and existing DATA resource knowledge. A decoded result removes its pending ID, adds decoded and (if applicable) discovers its Echo before writing knowledge and the HOME checkpoint. Unread discoveries resume at HOME after terminal opening, so interruption during result/deposit/text neither loses a memory nor processes its packet twice.

Missing pendingAnalysis means empty: Phase 1/pre-Phase 1 packets were already analyzed. Missing interpreted still falls back to legacy read. Explicit empty arrays stay empty. Invalid pending types, empty IDs and duplicates are discarded; decoded/discovered IDs take precedence over pending IDs during checkpoint/MEMORY merge. Existing interpreted/link states are preserved.

Rescue rolls physical ORE/flight state back to HOME as before while preserving pending DATA and decoded/Echo knowledge. Processing waits for rescue fade and its return voice. Pending-only MEMORY enables CONTINUE even without a first physical checkpoint; the starting craft resumes in space and must return HOME to decode.

No original ORBIT save imports or writes. `works/orbit/`, Engine, Codea Lite, ritual bridge and shared infrastructure are unchanged. No new Echo texts, chapters, systems or production promotion.
