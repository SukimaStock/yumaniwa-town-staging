# Engine 0.3 Audio lifecycle investigation — 2026-10-07

Status: **UNVERIFIED** for audible iPhone/Safari/PWA behavior. This change fixes
proven Engine scheduling defects; it does not identify Safari's internal renderer
as the confirmed cause of the author's temporary fast BGM report.

## Baseline and scope

- staging main: `a99314cb142986715c7a315c3743abbfa451d386` (merged #167).
- PUMPOKO BGM #115: merged `86f1b8926007ca6538676cd13896645726cb1207`;
  explicitly simulated clocks only, no audible Safari/PWA/background validation.
- Open #140 changes ending camera/tests only, not Engine or audio. Its current
  settings are already carried by #145; no changes to that draft or ending.
- Engine prior commits checked: Phase 1 input/boot `22e6f2e`, resource readiness
  `770df55`, read-only diagnostics `268e793`, privacy `583d908`.
- Full SYSTEM/HQ scope explicitly authorized by this task. Plan-first lock:
  `.change-plans/engine-audio-lifecycle-20261007/r0.lock.json`.
- production read-only baseline: `6351bb94ca132602a0344c18401e27b75e45ad69`.
  No production remote, push, PR, merge, or promotion in this task.

## Search and consumer inventory

Searched all work JS/HTML and canonical runtime for `playMusic`, `resumeMusic`,
`pauseMusic`, `music:`, `lifecycle`, `pagehide`, `pageshow`, `visibilitychange`,
`AudioContext`, `createMediaElementSource`; checked actual HTML script versions
rather than inferring adoption from shared API usage.

| Consumer | Current runtime / audio | Impact and verification |
| --- | --- | --- |
| PUMPOKO | canonical 0.3, music `pumpoko`, buffer SE | Directly affected. Real sketch/scene + canonical Engine tests, deferred BFCache case, same player/time/rate/loop/currentMusic, scene/ending/title continuity. No work runtime changes. |
| Engine Canary | canonical 0.3, music `validMedia`; new `lifecycleMusic` fixture | Directly affected. Added 8-second loop, native event counters, cached-player identity, media time/rate, pause/resume samples, observed pageshow.persisted and human hearing field. No automatic audible PASS. Python wiring/HTML tests. |
| CoffeeFactory | canonical **0.2**, music `coffee`, buffer SE | Current page unaffected; not migrated or edited. Actual work sketch/setup/onPause/onResume/ensurePlaying combined with 0.3 in the regression harness proves compatibility and catches a recovery bypass via its work callback. Own RecipeClock wall-time semantics preserved. |
| Morning Thread / 02 | canonical 0.3, procedural tones, no music | Frozen work code unchanged. Model/paper regression; canonical tone/readiness/input/dispatcher tests. No native browser audible verification. |
| Tea Unfold | canonical 0.3, completion tone, no music | Work code unchanged; tone control path/readiness and Engine lifecycle regressions. No native browser audible verification. |
| Tea Unfold 02 | canonical 0.3, no audio | Runtime reference audited; no music or SE path. Own observation clock unchanged. |
| `_starter` | canonical 0.3, procedural tone example | Existing packaging/starter Python tests. No runtime edits. |
| ORBIT / 02, SteamClock, DotWeather, DioramaCalendar | canonical 0.2; no Engine music definitions/calls | Reference and custom audio/lifecycle audit; unaffected by 0.3 change. |
| Rojiura Masala, Junkissa Dive, Midnight Cola, Yakitori Wars | local/custom audio runtimes | Not users of 0.3 music lifecycle; no changes. |

## Hypotheses and evidence

| Hypothesis | Result |
| --- | --- |
| A: media restarts before asynchronous context resume | **CONFIRMED scheduling defect**. In the baseline, deferred resume leaves context suspended while media `play()` has already run; the independent media clock advances 60 seconds before recovery. New test fails before fix and passes after. Audible fast catch-up remains unproven. |
| B: Safari media/context clock desynchronization | **UNVERIFIED**. Mock clocks cannot reproduce WebKit's decoder/output behavior. Avoided the proven early-media-start window; no seek/rate compensation, node recreation or user-agent workaround. |
| C: duplicate events cause duplicate lifecycle transitions | Existing reason Set already handles repeated hidden/pagehide/pageshow on the baseline. Additional defect: work/direct music calls during pending recovery can bypass it, and stale recovery lacks cancellation on re-hide/mute/stop. Shared playback request gate covers these. |
| D: BFCache and visibility double resume | Baseline reason Set handles tested event orders; no proof of distinct BFCache bug. Tests cover both orders, duplicates and persisted true/false; actual BFCache remains a browser/device check. |
| E: stop suspending the context | Not adopted. No comparative audible evidence, and context pause also owns procedural/buffer SE. Kept existing pause/suspend policy and fixed its asynchronous ordering. |

Primary references (context only, not evidence of this exact device defect):
[Web Audio suspend/resume specification](https://www.w3.org/TR/webaudio-1.1/),
[WebKit 261554](https://bugs.webkit.org/show_bug.cgi?id=261554),
[WebKit 263627](https://bugs.webkit.org/show_bug.cgi?id=263627).
They explain why browser output policy and internal state must not be certified
from an API call or a running state alone.

## Fix and preserved contract

- Pause the cached media before suspending the context. Track pending suspend;
  settle it before starting a subsequent resume. Wait for the resume Promise and
  running state before **restarting** routed BGM.
- Use this recovery gate for both lifecycle and direct work music requests.
  Coalesce pending media requests. Invalidate obsolete requests on re-hide,
  pause, stop, mute, replacement/configuration. A late resume during re-hide
  leaves music paused and suspends the context again.
- Preserve synchronous **initial** HTMLAudio play in its initiating gesture.
  Preserve a native gesture resume after a pending preparation resume that may
  be blocked by autoplay. Repeated work requests during recovery share the
  transition. No automatic retry loop or attempt to evade autoplay.
- Keep public boolean request semantics: accepted request is not proof of audible
  success. Resume rejection/throw/still-suspended leaves media paused; an explicit
  subsequent request can retry. Resources remain ready independently of output.
- No lifecycle seeks, currentTime assignments, playbackRate changes, waiting
  timers, extra player/context/source, physics/game clock linkage, asset/volume,
  scene or ending edits. Existing SE playback paths/buses are unchanged.

## Verification

Before Engine edits: new first 19 deterministic cases had **16 FAIL / 3 PASS**.
Failures include delayed resume, delayed suspend, work/direct request bypass,
re-hide and mute/stop/reconfigure cancellation, interrupted context, pending play
coalescing and the actual CoffeeFactory callback. Event reason-only cases and
fallback/no-SE-replay controls already passed. This is not an audible Safari
reproduction.

After final code:

- **20/20** dedicated Engine Audio lifecycle cases PASS.
- **14/14** PUMPOKO audio/work/scene integration cases PASS (including deferred
  persisted-pageshow case and Stage0 → Stage1 → ending → title).
- Existing readiness (50), diagnostics (42), input/boot (28) PASS.
  The real Engine/Codea dispatcher test spans a 60-second hidden interval and
  excludes hidden wall time from work updates, retaining one RAF/setup.
- Combined Node tests: **522 PASS / 0 FAIL**, including all root non-browser
  `test-*.cjs`, all PUMPOKO `test-*.cjs`, Morning Thread model/paper and 02 model.
- Python discovery: **62 PASS / 0 FAIL**, including canary HTML/wiring and
  canonical Engine packaging/starter tests.
- Scope Guard → Risk Gate → Impact Check PASS; trusted candidate syntax is
  checked separately on the exact committed candidate by the base-owned gate.
- Diff whitespace and protected-path/tree audit: work runtime, physics, ending,
  BGM bytes/levels, 0.2 Engine, Codea, other work content and production untouched.

Local Playwright browser tests did **not** pass. Chromium executable is absent;
installation failed with an invalid/truncated downloaded archive. Two attempted
browser scripts report failure for unavailable infrastructure, not an observed
runtime regression. Do not count them in the 522 non-browser PASS result.
Native browser checks, deployment evidence and exact candidate SHA belong in
the PR description; no assertion of audible verification is made by this file.

## Remaining physical-device checklist

On staging PUMPOKO and Engine Canary, use a physical iPhone with current Safari,
and home-screen PWA separately. Record iOS/Safari versions, navigation method,
duration, pageshow.persisted where observable, and what is actually heard.

1. Initial trusted gesture, normal playback and mute → unmute.
2. Switch tab/app/screen, leave 10–60 seconds, return: silence while absent,
   resume from preceding position at normal speed, no catch-up/duplicate BGM/SE.
3. Navigate to another page, use Back (BFCache when available); compare ordinary
   visibility return with actual persisted-pageshow return.
4. Several quick leave/return cycles, re-leave during recovery, muted return;
   same player, currentMusic, loop and playbackRate 1, no timing jump.
5. PUMPOKO journey, ending and title return; continue same track. Let a natural
   loop finish (wrap at track duration is expected, unlike hidden-time advance).
6. Autoplay refusal may leave output paused until the next valid user request;
   ready/running and a resolved API Promise alone do not prove heard sound.

Every physical/audible item above is **UNVERIFIED** until observed. If fast audio
persists despite correct context-before-media ordering, investigate WebKit's
actual timeline/output with device evidence before changing routing/suspend
policy. Do not add a PUMPOKO-only visibility handler.

Rollback: revert this staging PR as a unit. No data/save migration.
