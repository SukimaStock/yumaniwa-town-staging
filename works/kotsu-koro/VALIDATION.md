# Staging validation — こつ、ころ。

This is a standalone experiment under `works/kotsu-koro/`, not a registered
town release or a production publication. Formal verificationState remains
UNVERIFIED under the current Change Verification contract.

## Local first loop

- Built outside the repository from current Starter and frozen Engine 0.3.0.
- The meaningful loop is hold/tilt → release → shell recovery → later seed
  motion/contact → quiet arrangement → another gesture from that arrangement.
- Ten executable focused checks pass (`node works/kotsu-koro/test-dynamics.cjs`):
  momentum preservation, delayed response, eventual quiet, equal elapsed
  simulation at 30/60/120fps, knock response, long-run containment/finite values,
  regrab continuity, trace expiry, pointer cancellation and keyboard loop.
- Codea snapshot is byte-identical to `engine/codea-lite.v1.0.0.js`.
- Canonical Engine is referenced by the adoption tool; no Engine change.

## Browser evidence status at first staging commit

Cloud Browser rejects the local 127.0.0.1 URL (`ERR_BLOCKED_BY_CLIENT`).
The installed ephemeral preview helper cannot mount its sandbox (`bwrap`
proc-mount failure). Neither attempt verifies rendering or input.

The first staging commit is therefore a canary, not the completion of this
task. Browser drag/release/regrab, keyboard, layout, audio resource/Session
Report and interruption will be checked on the actual staging Pages URL.
Observations and any following refinement belong to the subsequent exact-SHA
record. No physical iPhone or subjective sound/feel claim is made here.

Production, existing works, town registration and shared runtime are excluded.

## First deployed browser canary / refinement

Observed runtime: staging merge `917ca9967770b957fee13952098110f8994f19eb`
(PR #100), Cloud Chrome, 1363 × 936 CSS viewport.

- Rendering is present after bootstrap: paper, single vessel, seeds, title and
  one sound control. The first capture preceded the first rendered frame; no
  bootstrap error was observed.
- Actual drag reproduced a work-side `CHANGED is not defined` exception on
  pointer end. The original mock supplied a noncanonical constant and hid it.
  Refinement removes that constant from both sketch and harness, and tests
  ENDED and CANCELLED independently against canonical touch vocabulary.
- Observed seed pile had visual overlap. Collision radius increased from 6.5
  to 8.5; shell translation/rotation modestly increased to clarify the hold.
  No additional effects/UI/game rules were introduced. Unused impact-flash
  state was removed.
- Eleven focused checks pass after this correction. Canonical Engine remains
  unchanged. Final deployed drag/release/regrab and audio/lifecycle checks
  are still pending at this refinement commit.
- Existing six-work Release Validator: PASS 827 / FAIL 30 / WARNING 3 /
  HQ REVIEW 0 / EXTERNAL 38. Output compared byte-for-byte equal to the
  start main `936dbc8e5993708853a9fc945c462f8cee201c35`; the 30 existing
  failures are not new work regressions and are not called PASS.

## Accepted environment canary — 2026-10-01

Observed deployed runtime SHA: `05fa1afd817ce2593ed44084b906b02862a09621`
(PR #101 merge; implementation `78e2e82da55bbb577435649c158ef6749347c36b`).
GitHub Pages deployment and Change Operations Tests both completed successfully.
This following record changes documentation only; runtime is identical.

Cloud Chrome at 1363 × 936 CSS viewport:

- Ordinary `/works/kotsu-koro/` and `?dev=1` both render the work. The
  ordinary page contains no diagnostic panel, score or results UI. Initial
  one-line hint is visible, then fades after interaction.
- Repeated diagonal mouse drags, release, opposite-direction regrab and a
  later drag on the ordinary page all work. Early post-release screenshots
  show separated moving seeds; later screenshots show recovered shell and
  a settled arrangement. Regrab acts on the existing arrangement.
- ArrowRight and Space were exercised; Space changes the contents without
  a pointer gesture. Longer keyboard-hold equivalence is covered by the
  executable physics/input test, not by the brief browser keypress.
- Sound control changes its label/pressed state, and muted state persists
  after reload. It was returned to enabled for the delivered page. Diagnostic
  AudioContext changes from suspended before gesture to running afterward.
  All three WAV URLs return HTTP 200. This confirms delivery/unlock and
  controls, not subjective hearing or an iPhone speaker mix.
- Session Report COPY reports COPIED. A subsequent clipboard read captured
  the final report generated at `2026-10-01T03:42:12.987Z`: Engine 0.3.0 / Codea
  1.0.0 both running; audio unlocked, running, buffers 3/3 ready, failed 0;
  pointer inactive, held keys 0, lifecycle active; diagnostic error count 0.
  It explicitly reports audibility unknown. Historic pre-correction console
  entries are excluded from this new session report.
- Ordinary-page navigation away and back, followed by Space, remains
  playable. This is Chrome navigation recovery, not verified Safari
  backgrounding or BFCache acceptance.
- Environment reports roughly 51–54 average FPS / 60 current FPS and
  ~33ms p95, with slow-frame warnings. Work update ~0.02–0.03ms and draw
  ~0.31–0.37ms. Frame-count-independent motion is covered at 30/60/120fps.
- Adoption tool removed the uncommitted local rollback Engine after canary.
  Codea snapshot still equals canonical 1.0.0; Engine unchanged.
- Production main rechecked: `53d31cfe98313c87cfc5ffb78e3b4e8cdaed1ca3`,
  unchanged from task start. Only new work and locked Plans are changed.

Eleven focused checks and Scope → Risk → Impact checks pass on implementation
`78e2e82da55bbb577435649c158ef6749347c36b`; trusted base CI checks also pass.
Formal verificationState remains UNVERIFIED. Physical iPhone touch feel,
actual audible mix, Safari background/resume and the author's creative
judgment remain unverified. No production or Release Complete claim.

## Horizontal world / scale transition — 2026-10-01

Base: `43eff88789468644f477d82847da8509d54cdf5f`.
Plan: `.change-plans/kotsu-koro-world-zoom-20261001/r0.lock.json` (immutable
plan-only first commit). Work-only scope; no production or canonical changes.

- Stage 0: all 14 existing tests PASS; physics and tests unchanged.
- Horizontal Stage 1: 15 focused tests PASS. Includes nine object identities,
  projected position/pose/momentum and relative arrangement, exact screen
  transform, continuous transition, complete route with world tilt only,
  physical return/rejoin, knock, post-release/post-finish tail, shared terrain,
  long bounded stress, neutral no-steering and 30/60/120fps matching physics.
- Static syntax, Scope → Risk → Impact and PR trusted checks are recorded for
  the implementation commit in the PR.
- Actual staging browser observations follow deployment; do not reuse the old
  vertical journey screenshots as evidence for this redesign.
- Author iPhone feel, sound mix, Safari lifecycle and final automatic VERIFIED
  remain UNVERIFIED. Passing code tests does not claim an author feel check.

The town Release Validator with `--ids kotsu-koro` reports
`metadata.identity: expected exactly one WORKS entry`: this standalone staging
experiment is intentionally not registered in WORKS. This is not a release
candidate, and no metadata/registration change is made to silence that result.
Its work runtime is verified with the focused tests and browser observations.

### Browser-driven touch refinement

Cloud Browser at deployed `5ff848a80ae3ffe001cc545771f8f0d941ec35fd`:
observed ordinary prologue 3/9 -> physical detach 9/9 -> post-detach pause ->
zoom with the rim beyond the viewport -> open horizontal ground with nine grains.
Observed drag/release movement, mute toggle and running audio; Engine dev panel
ERR 0. Slow-frame WARNs (inactive remote-browser frames around 1 second) remain
observed and are not described as errors or silently cleared. Audible mix on
the author's device remains unverified. Full round/recovery/end route was tested
mechanically; do not claim those original browser gestures completed it.

Repeated Stage 1 grabs exposed a large spread and an empty camera frame.
A fresh Plan at the deployed main fixes only Stage 1 tap/drag separation and
view-only median follow; Stage 0 is unchanged. All 14 Stage 0 and 17 horizontal
journey tests PASS, including the two new observed-case regressions. The new
exact candidate/staging browser observation is recorded in the refinement PR.


## Stage 0 depth / two-gap risk prototype — 2026-10-01

Fetched current staging main before implementation:
`07bbecddf238bdf2aab24ee2ce50f35e2a1f6c61`.
Locked Plan: `.change-plans/kotsu-koro-two-gaps-20261001/r0.lock.json`.
Formal verificationState remains UNVERIFIED; no production promotion.

- Stage 0: 14 existing checks PASS. `dynamics.js` and `test-dynamics.cjs`
  remain byte-identical to the fetched base. Only the vessel drawing changes.
- Stage 1: 24 focused checks PASS, including exact nine-object transfer,
  projected screen continuity, actual weak-layer drawing/fade, null gap floors,
  natural fall/cut-side collision, retained objects, lost physics/camera exclusion,
  live ground stragglers, 1/3/6/8/9-survivor finish, all-lost quiet replay,
  actual replay returning to three loose/six attached, input-only nine-grain
  route (including physically detached Stage 0 source), constant-right risk,
  30/60/120fps, tap/regrab regression, and finite bounded 120-second stress.
- Reproducible world-input route: moderate right/up until all x>730; neutral
  gather 8s; moderate right/up until all x>1160; neutral gather 8s; left/up until
  all x<1260; right/up (.32,-.32) run-up; release after all x>1820. It reaches
  9/9 without seed position changes, jumps, knock or helper attraction.
- Constant maximum right (.38,0) from the ordinary Stage 1 initial party loses
  six grains at GAP B; the remaining three can settle and finish after release.
  This is an observed simulation outcome, not a fixed required score.
- Static canvas inspection: both holes match the rendered cuts; ordinary
  falling seeds remain visible briefly beside a cut, with no extra effects;
  surviving grains settle in the existing quiet basin. Transition retains the
  original composition while the few-pixel layer differences ease away.
- Scope → Risk → Impact and trusted PR checks are recorded at exact candidate
  SHA in the PR. Actual deployed browser observations are recorded separately
  there after deployment. Author device feel, subjective depth/risk/fun, audible
  mix and Safari lifecycle remain for the author's hands-on check.
