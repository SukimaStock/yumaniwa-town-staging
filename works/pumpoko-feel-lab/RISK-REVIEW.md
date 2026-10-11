# FEEL LAB — B→D long, ground-gap risk experiment

Base SHA: `8a144ebbba858e27a413c694c94e2b7bab741c0e`. Staging work only. PUMPOKO 02, shared Engine/Codea and production not modified.

## Controlled hypotheses

User iPhone experiments found B→D's long flat most durable for intrinsic, non-goal-oriented play. The risk comparison *does not change its actual Hermite curve* and does not conflate felt fun, challenge, or post-success satisfaction.

- A / `safe` — exact `bdVariants.long`, **no gap**.
- B / `mid` — same curve with surface gap x=2890..3000, width=110, on the long D plateau.
- C / `exit` — same curve with surface gap x=3160..3270, width=110, near the flat's end (flat ends at x=3305).

The selected gap is authored as `{layer:'surface',a,b,stage:true}`; the existing PUMPOKO 02 `W.contact`, `W.groundFrame`, `W.hasGround`, and `P.integrate` handle real collision and falling. No invisible floor or artificial speed/air boost is inserted. The draw code splits soil into disjoint solid bank polygons and adds soil end cuts; collision and visuals share exactly the same endpoints. Shadows do not remain over missing floor.

In the risk mode, a fall is detected when the body drops more than 85 physical units below the authored surface. After 0.48 seconds, the work restarts **near the same gap at x=gap.a-280**, with zero initial velocity, no forced launch, and re-press required (the pointer/axis are cleared). The ordinary full-course RESET button always starts at the original B entry. Short fall/crossing descriptions are informational, not achievement scoring. The existing 'feel' feedback and local save store course ID, gap descriptor, fall count, crossing state and exact control points. Older four study modes are unchanged and remain selectable. Versioned CSS/JS query parameters prevent stale iPhone Safari app scripts.

## Physics test evidence

A synthetic DOM/canvas JS fixture executed the exact fetched work-local physics.js, world.js, draw.js and candidate FEEL LAB app.js with RAF stepping and pointerdown/up simulations, no simplified physics:

1. ROLL/BOUNCE × safe/mid/exit = **six 15-second right-hold runs**. All reached the original long-course end without a fall, confirming none of the chosen gaps makes full-speed crossing impossible. Both gap variants recorded `crossed=true` for each kind. No JavaScript exceptions.
2. The same exact-physics runtime was tested at low initial speed, body projected onto the floor 55 units before each lip (four cases: two kinds × two gap placements). Each passed over the missing ground, fell below the floor, incremented fallCount to 1, and was restored at the calm run-up position after approximately half a second. No exceptions or extra impulse.
3. The `safe` geometry was byte-for-byte equal as a JSON point array to previously accepted `bdVariants.long` (27 points), and both gap experiments had the same point count/geometry. Switching to the older `B→D · 平面長` study preserved the same points.
4. Selection, active-button marking, save payloads and finite camera zoom were exercised in all six cases.

These tests used **synthetic canvas graphics**, not real iPhone rendering. Final Safari visual continuity, touch response, ease of landing, subjective challenge and the difference between enjoyable play and post-crossing satisfaction are **UNVERIFIED** until owner device testing. Do not treat CI PASS as approval of the actual level design or production release.

## Suggested user tests

Start with A on ROLL and BOUNCE as the unchanged reference. In B and C, first approach fast using right hold, then deliberately slow before the gap to induce a fall and compare both experiences. After an automatic near-gap restart, build speed again. Consider independently: (1) did manipulating movement feel good? (2) did the gap make retry inviting? (3) did crossing feel rewarding? The answer may legitimately favor A without any cliff. Preserve the pleasurable no-risk baseline regardless.

Rollback: revert this isolated staging PR. Formal verificationState remains UNVERIFIED.
