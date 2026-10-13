# Collection 05 · 湯間庭町の小さな模型 70–79 — 2026-10-13

Staging-only / active. User delegated topic selection, data modeling, validation, Draft PR and safe Staging deployment in source thread `01a11875-47fb-73f8-b86d-cf31e84fa0c8`; exact cumulative cap1000, batch size min(10,1000−69)=10. Registry is canonical:69 existing entries,00–15 and17–69; do not fill16. Reviewed latest main, AGENTS/Plan/verification, #299/#295, guide, existing69 JSON and the town's station illustration plus actual alley ground/placement sources. No `.agents/skills` exists in either checkout; workspace `.agents` is empty. Palette follows muted wood, iron/green, pale stone, rust and garden colors without copying the town scene. Existing69 entries/source bytes and all engine/UI/runtime bytes are preserved. Initial Plan-only commit `ad98f42` and source `a055086` remain in Draft #310. Unrelated Feel Bridge #311 advanced main to `4db4bad`; fresh Plan lock `ea6a723` precedes byte-identical source transplant `be6a549` on `feat/sukima-collection-05-current`. No stale Plan was rewritten. During final delivery #312 advanced main again to `aad4f11`; final fresh lock `55ec640` precedes the same three checked commits transplanted onto `feat/sukima-collection-05-final`, Draft PR #314. Prior #313/source51c1cde remain preserved. One transient Git authentication failure recovered on the first retry; no new permission was requested.

| Number / ID / name | Behavior | Shape / operation / separation |
| --- | --- | --- |
|70 `alley-postbox` 路地の郵便箱 | MANIPULATION hinge X0…1.15, initial.20 | Narrow hollow wall box with roof and real mail slot. Broad bottom-hinged face opens forward; stays in front of walls and below label. |
|71 `hand-coffee-mill` 喫茶の手回しミル | MANIPULATION rotate Y, initial.40 | Octagonal hopper, wooden base and large crank/palm grip. Short shaft clears solid hopper; no linked drawer or grinding physics. |
|72 `crossing-bar` 小道の遮断棒 | MANIPULATION hinge Z0…1.35, initial.22 | Short cream/rust bar on offset iron post. Thickened and compacted after landscape pixel coverage failed; forward Z gap prevents post interference. |
|73 `rain-lantern` 雨よけの吊り灯 | MOTION swing Z±.13,6.8s | Faceted lantern hangs from asymmetric bracket; calm small sway. Rod shortened to meet cap without overlapping. |
|74 `moss-stairs` 庭へ続く苔の石段 | STATIC | Three uneven stone terraces with two low polygon moss patches; broad horizontal profile. |
|75 `reed-sheaf` 庭先の葦束 | STATIC | Five unequal tapered, slightly leaning reeds and a real hollow binding ring; open spaces between stalks. |
|76 `garden-persimmon` 庭の平たい柿 | TOUCH SOFT | Squat convex fruit with flattened poles, broad equatorial facets and green crown faces; conservative press.09/pull.20 caps. |
|77 `shop-flip-sign` 店先の裏返し札 | MANIPULATION rotate Y, initial.25 | Broad freestanding shop board with cream reverse and green front; thin edge is visible while turning. Separate stationary pedestal. |
|78 `ticket-stamper` 駅の切符刻印器 | MANIPULATION linear Y0….32, initial.12 | Open iron portal, broad wooden press head and stationary ticket. Press stays above ticket/base and ahead of rear crossbeam. No contact physics. |
|79 `drying-cloth` 裏庭の干し布 | MOTION swing X±.20,8.3s | One low-poly cloth sheet with uneven hem/creases between two poles; bounded sway stays below crossbar and between posts. |

Batch mix:STATIC2 / TOUCH1 / MOTION2 / MANIPULATION5, five independent direct controls (hinge2/rotate2/linear1). Shape diversity was compared in actual initial/turned/limit captures. New motion types or hierarchy were unnecessary. Fixed parts can rotate the entire miniature; thin edge/axis views intentionally need whole-model rotation first.

## Verification and limitations

- New immutable `tests/v07-baseline.json` captures every one of the69 complete old registrations and SHA256 source bytes from main90f897c. New tests compare them, enforce exact79 total, unique IDs/numbers/files, preserved missing16/order and≤1000. Fixed69 fixture counts change to79; only Collection04 slices are bounded59…69. All historical goldens/assertions remain unchanged. Guide changes only its two stale next60 pointers to registry max+1; no creation standards change.
- Final work suite **201/201**, lifecycle **24/24**. All79 load. All new geometry obeys existing schema, mesh/triangle budgets and swept bounds. New tests exercise every control's hold/reverse/endpoints/reset/switch and sample each Motion over120seconds. No per-artwork JS, renderer branches, input, schema, gate, cache or package changes.
- Actual Chromium `/usr/bin/chromium` WebGL2/SwiftShader: every new direct control tested using both mouse and CDP touch at390×844. Visible picking, no pointerdown jump, forward/reverse, intermediate release hold, both bounded endpoints, tiny moves, overtravel then immediate reverse in the same capture, fixed-part whole rotation, operation after rotation settles, reset and next/previous fresh values pass.10 full interaction records plus10 edge/reversal records; GL0, no app page errors. A first turned-mill QA attempt computed paths while inertia still moved the view; waiting for settling resolves it without model/engine/input changes or threshold relaxation.
- Actual touch events also verify both STATIC works rotate without changing rest meshes, both Motion works play/pause/paused reset/reopen, and the fruit holds/pulls/releases/recovers.79 enabled cards, no horizontal overflow, scroll-to-last and return at390×844,844×390,768×1024. These are emulated mobile viewports and CDP touch, **not physical iPhone/Safari**.
- Independent convex-component separating-axis checks sample145 poses per movable model, **1,015 whole-model poses /6,525 component-pair poses**, no inter-part overlap after crossing-bar clearance correction. Whole-range reasoning: mailbox flap in front of case; mill crank above hopper; barrier in front of post; lantern away from rear bracket/post; shop board above pedestal; press ahead of rear beam/inside side posts/above ticket; cloth separated from posts by X and crossbar by Y. Range and authored gaps provide separation, not collision simulation.
- Native GLES **1,577 full-suite frames plus25 final crossing-bar scenes** pass unchanged shipped renderer/checker:GL0, CPU/GPU initial previews and reset pixel equality. Final crossing-bar Z clearance is rechecked in all25 of its scenes; all other definitions are identical to the full-suite input. Exact candidate/CI/merge/Pages SHA are recorded in the PR. Native GLES and CPU/GPU preview comparison are separate evidence from browser WebGL2. Failed QA artifacts/logs are preserved under `/workspace/scratch/sukima-batch05/`; no failed definitions silently deleted.

Formal `verificationState` remains **UNVERIFIED**. Physical iPhone/iPad Safari, real finger comfort/mobile GPU performance and owner adoption are unobserved. No milestone100/300/500/750/1000 is crossed by69→79, so no anticipatory performance refactor. Future candidates only: actual linked grinding/stamping, soft hanging cloth or stem contacts; unsupported coupling/deformation/contact is not claimed here.

## Resume checkpoint

Delivery outcome and exact merge/Pages SHA are recorded in PR #314. Checked registry79, next80; before resuming confirm that PR is merged and its exact-SHA Pages deployment succeeded, then re-count current main. A candidate branch alone is not a formal delivery. Next authorized batch is80–89, min(10,1000−verified registry count); re-fetch latest main, inspect worktree/related PRs and keep16 absent. Stop exactly at1000 formal registrations (maximum number will be1000 with current numbering). First performance milestone is crossed by the future99→109 batch; measure real load/preview/mobile-equivalent/memory/scroll/selection-to-operation then. If CI/write/old-work integrity/deployment cannot be resolved within three retries, keep artifacts and stop without claiming delivery. Production and town placement remain untouched.

---

# SukimaStock 3D Collection 04 · Little Mechanisms — 2026-10-12

Base `c11958e7db937dae042bbfbd71e488db85398016` (merged unrelated FEEL LAB #298), active / staging-only. Collection baseline remains `95fb0d1` (#295), byte-identical in the updated main. Reviewed current AGENTS, operations, v0.7 guide, all59 definitions, collection and manipulation/mapping/parts contracts. No applicable `.agents/skills` exists in checkout; workspace `.agents` is empty. Standard WORK Plan `.change-plans/sukima-3d-little-mechanisms-staging-20261012/r0.lock.json` was committed at `6652aea` before transplanting checked source `808fbab` as `ef1ac10`; the entire work subtree matched exactly. Draft PR #299 replaces #297 because main advanced after its five CI checks passed. Earlier plan-only #296 was replaced to correct local test names mistakenly listed as trusted static IDs. Fresh locks preserve old history; no Plan, gate or verification requirement was weakened.

Ten new `sukima3d-specimen/2` JSON files append **60–69**. Existing59 source bytes and complete entries remain identical. Only the ten definitions, manifest, this record, two existing fixture files and Plan Lock change. All shapes use existing manipulation v1, one control per rigid part, sensitivity1 and rotate inertia0. No engine, Touch/Motion, input, camera, UI, package/cache, shared2D, other works, global registration, textures, dedicated JS, editor, new management system or Production change.

| No. / name / ID | Parts / triangles | Structure, gesture and intended touch surface | Range / constraint |
| --- | ---: | --- | --- |
| 60 KEEPSAKE / `keepsake` | 2 / 84 | Low hollow keepsake box; lid and broad grip are one part. Lift the green lid around its rear X hinge. | −1.45…0 rad, initial−.35; lid clears walls throughout. |
| 61 FOLIO / `folio` | 2 / 60 | Standing folio; fixed left leaf/spine and red right cover with raised tab. Open around local Y. | −2.05…0 rad, initial−.35; front depth separates cover from fixed leaf, including beyond90°. |
| 62 AWNING / `awning` | 2 / 72 | Open frame and single gold canopy/fascia. Lift or lower the wide front lip about X. | −.70….75 rad, initial.28; revised forward pivot clears rear beam. |
| 63 SPOOL / `spool` | 2 / 176 | Octagonal reel with both cheeks and barrel as one part, supported by two short stationary end stubs. Drag a cheek/barrel around X. | Continuous, initial.30; no full shaft penetrating the solid reel. |
| 64 PETAL TURNTABLE / `petal-turntable` | 2 / 72 | Low pedestal and one concave three-lobed tabletop. Sweep an outer lobe around Y. | Continuous, initial.25; single manifold outline replaces overlapping boxes. |
| 65 TRI ROTOR / `tri-rotor` | 2 / 72 | Thick triangular rotor and raised pad in front of a rear stem. Turn a corner or pad about Z. | Continuous, initial.30; rotor stays in front of support. |
| 66 RISER / `riser` | 2 / 72 | Open sleeve with a broad cream plunger/cap. Pull cap or front face vertically. | Y0….50, initial.12; lower.26 of stem remains inside sleeve at full extension. |
| 67 SHUTTLE BLOCK / `shuttle-block` | 2 / 72 | Blue sled and grip on a horizontal open track. Slide its broad face sideways. | X−.52….52, initial−.20; .05 clearance to each end stop at endpoints. |
| 68 TWIN PADDLES / `twin-paddles` | 3 / 148 | Two independent broad paddles on separate posts; rotate either about its own Z hinge. | Left0….65, initial.20; right−.65…0, initial−.25. Disjoint swept bays; no linkage. |
| 69 DIAL & SLIDE / `dial-and-slide` | 3 / 108 | Seven-sided red dial plus cream vertical tab on a slab. Turn the dial and slide the tab independently. | Dial continuous, initial.30; tab Y−.34….34, initial−.12. Side-by-side independent mechanisms, no implied gearing. |

## Authoring and verification

- Captured initial/min/mid/max and side poses for every model; inspected initial/max/side sheets alongside intermediate gesture traces and native pixel comparisons. Folio, box and reel display yaw were adjusted after actual rotated-view drag tests lost leverage; no input special case was added. Canopy pivot moved forward after a full-range interference sample found its rear edge meeting the beam. Reel axle was shortened to end supports. Table and paddle silhouettes became single meshes after strict CPU/GPU comparison exposed coplanar overlapping surfaces.
- The original `manipulation.test.mjs` sample points and target angles apply specifically to DOOR/CRANK/DRAWER. Its sample set is now explicitly the unchanged original three. All their assertions remain. Fixed counts change59→69, synthetic registration uses the next free number and relative total, and new assertions protect60–69/types, all12 controls' hold/range/reset and three original v0.7 source hashes. Existing56-source golden meshes/previews/Motion traces remain untouched. `free-forms.test.mjs` changes only its total count. Temporary browser/clearance drivers live outside the repository.
- All69 load, all59 previous JSON bytes/complete registrations and every runtime byte match the fixed base. Existing work suite **182/182**, lifecycle **24/24**; exact checked SHA and final CI/Scope→Risk→Impact results are recorded in PR #299.
- Actual Chromium WebGL2 with SwiftShader, using the shipped app's existing `?debug` observability and real PointerInput/picking: all12 controls at desktop and390×844 touch viewport; direct visible pick, no pointerdown jump, incremental forward/reverse, intermediate hold, endpoints, release retention, whole-model background rotation and operation after that rotation, reset and fresh next-item state. Touch input uses browser CDP touchStart/touchMove/touchEnd, not a CPU fixture or native GLES substitute. Additional desktop gestures exercise ±.03 small moves, bounded overtravel and immediate reverse within the same captured gesture, and fixed-part drags rotating only the viewer. Zero app page errors / GL error0. These are emulated pointer/touch events, not physical-device feel.
- Geometry clearance:73 samples over every individual range/full rotation and independent73×73 combinations for the two dual-control works, **11,534 part-pair poses**, no inter-part convex-component overlap. Concave outlines are conservatively enclosed for this separating check. Whole-range reasoning additionally separates box lid above case, folio in front of fixed leaf, canopy from posts by X and rear beam by Z, reel from supports by X, tabletop from pedestal by Y, rotor/paddles from supports by Z, and the free controls into disjoint bays. Riser retains.26 sleeve overlap; sled remains between stops. Joint clearance is authored geometry, not simulated contact/collision.
- The unchanged native renderer/checker passed **1,361 frames**: all69, three viewports, moved/reversed/turned/reset states and CPU/GPU initial previews. GL error0; reset pixels equal initial pixels. Its first-control native scenes are supplemented by actual browser checks of **both** controls in68/69 and independent combination clearance. Native GLES is separate evidence from actual browser WebGL2.

Physical iPhone/iPad Safari, real finger comfort/frame pacing and author adoption remain **UNVERIFIED**; formal verificationState stays UNVERIFIED. Near-edge-on axes or points at a pivot can still lose leverage: rotate from a fixed area/background. No hierarchy, collision response, mechanical coupling, click stops/snapping, springs or Touch+Manipulation were introduced. Those are extension candidates only; no gears imply unavailable coupling. Rollback is a revert of this isolated Staging PR. Merge SHA, CI/review, Pages run and public delivery checks belong to PR #299.

---

# SukimaStock 3D v0.7 · Hands-on Miniatures — 2026-10-12

Base `6de4dc0329f1d5d248fe9d0c9010943f3399824f` (merged #292), all 56 specimens, related PRs, both guides and the v0.6 engine reviewed. Standard WORK Plan locked **before implementation** at `4155d0317044a57651b7d6d5bb52ddcb496e4a86` in `.change-plans/sukima-3d-hands-on-v07-20261012/r0.lock.json`. Main subsequently advanced to `cb1bcc8647d1cc43c7b1a40a6fee6d1bb4f8eddd` (#293 operations documentation/ignore rules). The stale-base PR #294 was closed without merging; its immutable lock was not modified. A fresh Plan-first branch locks current main at `46c2559f39b7b83b0d154d17ec03d94a6947a067` in `.change-plans/sukima-3d-hands-on-v07-current-20261012/r0.lock.json`, then transplants the checked work implementation. The #293 rules were reviewed; no work files overlap. Changes stay within this work and the fresh lock. No Production, shared 2D Engine, other works, global registration, dependencies or automation changes.

## Direct local control

- Optional specimen/2 `behaviors.manipulation:{version:1,controls:[...]}` references part IDs. `rotate` is continuous; `hinge` has bounded radians; `linear` has bounded local distance. All three retain intermediate values after release. Axes are unit vectors; rotation pivots use original local geometry coordinates. Unknown fields/types, invalid ranges/references/nonfinite values, duplicate controls, same-part autonomous/manual control, and Touch + manipulation are rejected. Existing v1/v2 sources need no conversion.
- `engine/parts.js` extracts the unchanged v0.6 fixed-part compilation, pose composition, GPU model matrices, CPU snapshots, picking and full-range analytic bounds. `motion.js` retains its time controller; `manipulation.js` owns independent copied numeric values, optional rotate inertia (default **0**), reset/cancel and range validation. Different parts may be autonomous and manual. No cumulative edits to source meshes or packed buffers. Manual picking matches one-sided rendered surfaces and explicit double-sided backs; old Motion picking remains unchanged.
- Transform order remains: bake base scale → local pivot rotation/slide → base orientation/position → display scale → whole-view rotation. Base scale also scales the pivot. Bounds cover every allowed angle/distance, including simultaneous independent parts; the existing maximum swept radius 3 remains. No hierarchy, collision solver or joint physics is added.
- `manipulation-mapping.js` captures the touched local point and frozen camera/view at pointerdown. Front-facing rotation uses signed ray/axis-plane angles, incremental `atan2` across ±π; oblique rotation uses projected arc tangents. Linear fits the projected axis/point incrementally. Near-pivot/near-invisible axes, near-parallel rays and extreme deltas are guarded; degenerate views intentionally remain quiet until the user rotates the miniature. Cursor rebasing at a limit allows immediate reversal without overshoot debt.
- `PointerInput` latches a movable part on primary pointerdown, stops whole-view inertia while preserving its exact visible pose, and holds pointer capture until release/cancel. Movable parts respond immediately; fixed parts/background retain the old whole-view rotation/flick branch. No midway reclassification or repicking. Resize, visibility/pagehide/blur, capture loss, reset and selection terminate grabs. Cancellation holds the last bounded part value and stops optional inertia; reopening/reset restores initial values.
- `session.assembly` supplies the existing renderer, posed picking and preview with either the manual or autonomous rigid assembly. Existing Touch, presets, camera/lighting/shaders and normal UI structure remain. Three short type-based hints replace the generic hint on manual specimens. Existing reset handles parts too. Hidden `?debug` adds part ID/type/value, sensitivity/range and rotate inertia/damping adjustments; changes are temporary and never write JSON. Existing iOS selection/callout/contextmenu and scroll protection is retained.
- Previews use the same static CPU depth raster at each authored initial value, with no new WebGL contexts. Cache/import/data/package versions advance together to 0.7.0; ordinary future data-only additions need no engine/version change.

## Three small models

| No. / ID | Parts / triangles | Gesture / range | Construction |
| --- | ---: | --- | --- |
| 57 / door | 6 / 108 | HINGE Y, −1.35…0 rad; initial −0.15 | Four frame members, dark recessed back and one leaf/knob part. Frame remains fixed while the leaf opens onto the recess. |
| 58 / crank | 4 / 148 | ROTATE Z, initial 0.40 rad; inertia 0 | Low plinth, post and bearing support one joined hub/arm/grip. Both directions and multiple turns are retained. |
| 59 / drawer | 2 / 132 | LINEAR Z, 0…0.58; initial 0 | Stationary housing and one hollow tray/front/grip. At maximum travel, 0.16 of the tray remains inside the housing. |

Muted warm material colours and visible low-poly faces match the collection. Housing/frame panels meet without overlapping coplanar faces; the moving geometry is authored with clearance. These are geometrical models, not a claim of simulated physical contact.

## Verification

- Work suite **181/181 PASS** (baseline 162/162); root lifecycle **24/24 PASS**. New tests include actual captured input, part versus whole rotation, all three incremental/reverse/partial gestures, angle wrapping/multiple turns, transformed picking, inverted/oblique/degenerate axes, limits, optional inertia, cancellation/reset/switch, distinct-part Motion composition, invalid definitions and JSON-only addition of an arbitrary next specimen.
- Immutable `tests/v06-baseline.json`, captured from the original base before implementation, checks all 56 JSON hashes and complete registration entries, compiled/packed meshes, initial previews and original Motion pose/matrix/CPU traces. Existing v0.4/v0.5 golden tests are retained. No old source JSON, numbering or order changes.
- Actual native GLES renderer/shaders: **1,111 frames PASS**, all 59 definitions across viewport/turned states, manual initial/partial/limit/reverse/turned/reset poses, and CPU/GPU previews. GL errors are zero; reset images match initial images exactly. A 12-image shape comparison was inspected: opening leaf and recess, crank/grip direction, hollow tray and retained housing overlap. This is native shader/geometry evidence, **not browser GPU or physical-device evidence**.
- `tests/manipulation-fixture.html` intentionally labels its CPU renderer and uses real camera, posed picking, PointerInput, mapping/controller and capture. It provides DOM-readable state, reset/reopen and the actual debug panel for browser testing without pretending to certify GPU/mobile performance. Live browser outcomes, exact checked SHA, CI/review, merge, Pages and delivery results are recorded in the associated PR.
- Scope → Risk → Impact, syntax/diff checks and exact-head CI/self-review precede safe Staging merge. If main advances without overlapping work changes, the checked branch tree and the expected merged tree are compared separately; unrelated main changes are preserved. Rollback is a revert of this isolated work PR.

**Physical iPhone/iPad Safari, long-press OS menu suppression, touch feel, mobile frame pacing and author adoption remain UNVERIFIED.** The formal verificationState remains UNVERIFIED. Near-edge-on/centre rotation can deliberately lose leverage; rotate the model from its fixed area/background. No Touch+manual, same-part auto+manual arbitration, hierarchy, collisions, linked mechanics, springs/snapping, audio, scores or editor. Future priorities are physical feedback and better near-axis affordance, followed only as needed by these separately scoped capabilities.

---

# SukimaStock 3D Collection 03 · Kinetic Forms — 2026-10-12

Base `f29283883bc2da3ccddf29d85257764a2bc144a5` (merged #289 / #291), 41 definitions. Latest main, both PRs, AGENTS/operations, COLLECTION_GUIDE, DEVELOPMENT, Motion composition and PINWHEEL / SHUTTER / PENDULUM / SLIDER / MOBILE reviewed. No relevant skill existed in checkout `.agents/skills` (workspace `.agents` was empty). Active / staging-only. The Standard WORK Plan was committed **before implementation** at `883f959` in `.change-plans/sukima-3d-collection-03-20261012/r0.lock.json`; Draft PR #292. An earlier local plan-only branch was superseded before implementation to include the second existing count fixture; it was never pushed.

Fifteen new JSON definitions, **42–56**, append to the unchanged 41 entries. All use `sukima3d-specimen/2`, existing `behaviors.motion` version 1, and only spin / swing / slide. Names and shapes explore the requested five directions without assigning a purpose or game. No engine, Motion, Touch, input, camera, Collection UI, guide/schema, package/version, textures, shared 2D, other work, global registration, Production or automation changes. No dedicated JavaScript or management system is added. Single sheets stay single parts; detached forms are deliberately detached, without explanatory axles or false joints.

Angles, phase and speed below are radians / rad/s; periods are seconds. Exact axes, initial angles and phase are in each JSON. Parts / triangles counts exclude double-sided back copies.

| No. / direction | Name / ID | Idea, shape and viewing point | Motion | Parts / triangles |
| --- | --- | --- | --- | --- |
| 42 / A SPIN | ECCENTRIC HOOP / `eccentric-hoop` | Uneven open hoop around a stationary triangular stone. Follow the moving opening and unequal rim against the still centre; edge view reveals independent depths. | Hoop spin Z +0.22; stone static | 2 / 108 |
| 43 / A | FOLDED COMET / `folded-comet` | One four-triangle folded sail. Broad face contracts to a fin then opens into a different silhouette. | Spin Y +0.14, initial 0.32 | 1 / 4 |
| 44 / A | SPLIT DISC / `split-disc` | Two unequal polygonal disc halves with a permanent horizontal gap. Front reads a split circle; side reveals the different initial angles. | Both spin Y +0.26, initial +0.20 / −0.32 | 2 / 32 |
| 45 / B SWING | BREATHING KEEL / `breathing-keel` | Two unequal open flanks surround a narrow slit. Small movement changes the slit and lighting; inspect the empty centre from front and side. | Swing Y 0.13 / 0.11, period 7, phase 0 / π | 2 / 4 |
| 46 / B | SOFT BEAK / `soft-beak` | Two dissimilar wedge prisms, deliberately separated even near their roots. A nearly closed expression gently opens without claiming a hinge. | Swing Z 0.070 / 0.055, period 8, phases 0.35 / π+0.35, offset local pivots | 2 / 16 |
| 47 / B | TILTING COVE / `tilting-cove` | Slanted thick arch above a still low island. The island anchors the composition; compare the two changing end heights. | Arch swing Z 0.14, period 9, phase 0.4; island static | 2 / 80 |
| 48 / C SLIDE | WANDERING TEETH / `wandering-teeth` | Three unequal teeth in separate height lanes. Opposed lateral drift alternates a jagged and almost aligned contour. | Slide X 0.18 / 0.23 / 0.12, period 6, middle phase π | 3 / 24 |
| 49 / C | RISING ISLANDS / `rising-islands` | Three chunky irregular islands retain separate X positions. Their rising/falling skyline changes without rails. | Slide Y 0.21 / 0.14 / 0.28, period 8, phase 0 / 2.1 / 4.2 | 3 / 36 |
| 50 / C | SPLIT HORIZON / `split-horizon` | Two folded zigzag strips in separate height bands. Their endpoints alternately lead and lag; side view exposes unequal creases. | Slide X ±0.15, period 10, opposed phase | 2 / 8 |
| 51 / D mixed timing | PHASE PETALS / `phase-petals` | Three detached tented facets at unequal heights. Small independent axes change light and projected width; a slow coincidence is never a mechanical linkage. | Swing Y / Z / X, 0.18 / 0.22 / 0.16, periods 6 / 8 / 12, phases 0.3 / 1.1 / 2.4 | 3 / 9 |
| 52 / D | COUNTER ARCHES / `counter-arches` | Two nested broken arcs on different depth planes. Opposed speed continually rearranges their openings; side view makes the separation explicit. | Spin Z +0.16 / −0.27, initial +0.20 / −0.40 | 2 / 168 |
| 53 / D | SLOW CONVERSATION / `slow-conversation` | A tall shard and a shorter broad shard. Independent nodding and vertical drift create a loose, unconnected pair. | Tall swing Z 0.12 / 11s; short slide Y 0.16 / 7s plus swing Y 0.11 / 13s | 2 / 24 |
| 54 / E free form | HOLLOW COMMA / `hollow-comma` | One open, depth-curled ribbon. The apparent cavity becomes a thick-looking strip then opens again; no actual enclosed volume. | Spin Y +0.10, initial 0.5; slide Y 0.07 / 9s, phase 0.7 | 1 / 10 |
| 55 / E | WALKING FOLD / `walking-fold` | One asymmetric folded band with an empty underside. A small lean and unrelated lateral drift change its balance; the name implies no feet or contact physics. | Swing Z 0.14 / 8s, phase 0.3; slide X 0.13 / 5s, phase −0.5 | 1 / 6 |
| 56 / E | UNSETTLED CROWN / `unsettled-crown` | Wedge, suspended chip and crooked open prong. Compare the tiny sliding outer edge with the central turning face; all pieces remain separated. | Swing Z 0.09 / 10s; spin Y −0.19; slide Y 0.055 / 7s | 3 / 20 |

## Shape comparisons and corrections

Initial and revised forms were rendered with actual Chromium WebGL2 (SwiftShader) in stopped front, quarter/half/three-quarter cycle, side and back poses, 90 captures per pass. Changes from comparison: skewed the hoop radially and slanted the cove instead of leaving symmetric arcs; slowed FOLDED COMET from 0.18 to 0.14 rad/s; replaced flat triangular PHASE PETALS with nine tented triangles; deepened HOLLOW COMMA's curl 1.55× and slowed its spin from 0.12 to 0.10. The small SWING amplitudes remain deliberate; SOFT BEAK is quieter than the broader sliding skyline works.

The first native render run exposed the existing 5,000-pixel visibility floor on landscape thin-face poses (FOLDED COMET 4,937; SPLIT HORIZON 4,349; PHASE PETALS 3,725 / 4,092). Increased only their authored display scales to 1.06 / 1.12 / 1.20 for readability, then repeated the original renderer/checker unchanged. SOFT BEAK initially crossed its midpoint at both t=0 and the native t=4 sample; phase 0.35 / π+0.35 now starts it partly open, improving the initial view while retaining its eight-second breathing rhythm and opposed motion. An initial annular band winding mistake was corrected in the new meshes before review. Temporary diagnostics stayed outside the repository and are not substitutes for the original checks.

## Verification and boundaries

- All **56** definitions validate/load; all prior **41 JSON byte sequences and complete registration entries** match immutable base `f292838` exactly. Original golden mesh/preview/Touch baselines remain unchanged.
- Existing work suite: **162/162** (baseline 147/147); lifecycle: **24/24**. Only `tests/free-forms.test.mjs` and `tests/motion.test.mjs` need fixture maintenance: 41→56 count, fixed old-five identity slice, synthetic next-free number and relative count, and the v2-valid one-part minimum only for new works. Old five retain their multi-part assertion; matrix change, geometry, normal, picking, pause/reset, camera, source-isolation and hash assertions remain. No shader/renderer checks are edited.
- Original native GLES renderer/checker tests all 56 at portrait, landscape and square sizes, animated/turned/reset states and v2 CPU/GPU previews. Final outcome and checked commit are recorded in PR #292. This is shader/geometry evidence, separate from browser and physical-device evidence.
- Actual Chromium WebGL2: 56 enabled cards, new 15 real pause/play/reset controls, running/paused pointer drags, next/previous fresh state, unchanged source mesh, reduced-motion initial pause, zero page errors / GL error 0; layouts at 390×844, 844×390 and 768×1024 without horizontal overflow. After final scaling, controls and the 90 shape captures were repeated.
- Every new form sampled at least 2,453 poses over ≥120s / three slow cycles, each track's full cycle and analytic timestamps 10^6 / 10^9 / 10^12 seconds. Finite vertices remain inside analytic full-cycle bounds; 30/60/120fps agree, resets and switching retain no previous state. Five viewport ratios contain the swept bounding sphere under whole-object rotation. This is analytic/sampled stability, not a continuous multi-day device soak.
- Separate temporary interval calculation bounds each part over its entire rotation arc plus both slide endpoints, including independently varying phases. Every multi-part form has a strictly separating axis for the whole cycle except the intentionally nested ECCENTRIC HOOP; that pair has positive radial clearance. The remaining three forms are single connected sheets. No collision/joint simulation or corrective runtime was added. Visual crossings in projection are depth occlusion, not connected pieces pulling apart.
- Scope → Risk → Impact and exact commit CI/self-review precede safe Staging merge. Merge SHA, Pages outcome and live delivery evidence belong to PR #292. Production is excluded. Rollback: revert this isolated collection PR.

**Physical iPhone/iPad Safari, real mobile frame pacing, touch feel and author adoption remain UNVERIFIED.** Formal verificationState remains UNVERIFIED under the repository contract. Supported data suffice for all fifteen; limitations remain no parent hierarchy, multiple composed rotations, Touch+Motion, joints, collision response or new Motion types. Future extensions could consider authored easing or direct part manipulation first, then hierarchy / ordered rotations / Touch+Motion coordinate composition as separately approved engine work. No extension is implemented here.

---

# SukimaStock 3D v0.6 · Moving Parts — 2026-10-12

Base `5d15872c17e80ac92fc3add1a92c1b88b47e2e61` (merged #288). Latest main, related #277–#288, all36 definitions, both guides, collection, mesh/specimen/session/rotation/behaviors/preview and repository operations reviewed. Standard WORK Plan `sukima-3d-moving-parts-v06-20261012` locked and committed at `4f0629c` before implementation. Only this work and its own immutable Plan Lock change. Active / staging-only; no Production, shared 2D Engine, other works, Motion Lab, global registry or automation changes.

## Optional local Motion

- `engine/motion.js`: strict `behaviors.motion:{version:1,tracks:[...]}` on specimen/2. Tracks address `part` IDs, never specimen names. SPIN uses a signed radians/second speed and initial angle; SWING uses base angle, amplitude, seconds per cycle and phase; SLIDE uses a unit direction, amplitude, period and phase. One rotation plus one slide per part is supported. Unknown types/keys, invalid references/units/nonfinite values/periods/amplitudes, conflicting tracks and excessive swept radius are rejected. Existing v1/v2 JSON is not converted.
- `engine/mesh.js`: an additional compiler applies base nonuniform scale once to copied local vertices and inverse-transpose normals. The existing compiled mesh path is unchanged. Saved base transforms and copied tracks remain separate. Each frame evaluates analytic part poses: scaled pivot rotation → slide → base rotation/position → uniform display scale → whole-object view rotation. SPIN wraps angles; periodic tracks evaluate from time, with no iterative shape edits or accumulated transform drift.
- `engine/renderer.js`: one existing WebGL2 context/program/VAO, fixed Motion vertex data and separate per-part model matrices/draw ranges. The shipped vertex/fragment shaders, lighting and old STATIC/TOUCH draw path remain unchanged. Animated normals receive rigid rotation/uniform scale, correctly following the parts. `MotionPlayer.pick()` uses the inverse posed part transforms; `snapshot()` is only for CPU preview/verification, not the live GPU deformation path.
- Analytic swept bounds cover the complete rotation arc and slide endpoints, including arbitrary axes/offset pivots. They frame camera/shadow consistently throughout a cycle (maximum Motion radius3; the ordinary v2 bind-pose radius1.65 limit remains). Different track phases may produce a conservative extra margin. No collision, self-intersection repair or joint physics is claimed.
- `engine/session.js` keeps rotation/Touch bodies and optional Motion players separate, selects atomically, and adds `step`, `resetPose`, `clear`. Old Touch/Pointer aliases remain. Capabilities use independent fields rather than a mutually exclusive mode enum. **Touch + Motion and v1 Motion are explicitly unsupported in v0.6**; future elastic/rigid composition needs a coordinate-space adapter, not a geometry rewrite.
- `app.js`, HTML/CSS: Motion auto-plays on opening, with only pause/play beside the existing initial-pose control. Reset also returns Motion time to0 and preserves paused state. Whole-body rotation/flick continues while parts play or pause. Back/next/previous discard the old player; reopening creates t=0. Existing RAF cancellation on hidden/pagehide/blur/context loss avoids hidden elapsed-time catch-up. Reduced-motion preference starts Motion paused and allows explicit play. Debug shows time and part/track names; no timeline. Existing Touch presets/input/callout protection are retained.
- `preview.js`: Motion cards snapshot t=0 including authored angle/phase; the same triangles/materials/camera feed the existing 200px CPU depth raster. No card animations or additional WebGL contexts. All module/CSS/data cache versions and package advance together to0.6.0. JSON-only future additions still require no engine/version edit.

## Five quiet studies

| No. / ID | Parts / vertices / GPU triangles | Motion and construction |
| --- | ---: | --- |
| 37 / pinwheel | 4 / 80 / 128 | Four joined low-poly vanes plus hub in one rotor. Z SPIN +0.52rad/s, initial0.16; stationary foot/stem/bearing. |
| 38 / shutter | 6 / 48 / 72 | Two muted panels swing on their outside edges, Y-axis base angles−/+0.42, amplitude0.38, period7s, phases0/0.4. Frame corners meet without coplanar face overlaps. |
| 39 / pendulum | 5 / 56 / 88 | One rod/weight part about its upper pivot, Z SWING amplitude0.32, period4.6s, phaseπ/2. Frame widened for weight clearance at both extremes. |
| 40 / slider | 5 / 48 / 72 | One carriage/handle part travels vertically by amplitude0.30, period5.5s, phase−π/2; rails and foot remain fixed. |
| 41 / mobile-motion | 8 / 96 / 152 | Slow reverse wheel SPIN−0.38, hanging weight SWING amplitude0.20/6.8s, small guided weight SLIDE amplitude0.13/8.2s. Static supports preserve visible connections. Existing21 MOBILE / mobile remains unchanged. |

The five studies total328 authored vertices /512 triangles. Existing36 JSON blobs, initial poses/materials, manifest prefix and explicit numbers/order remain byte-for-byte unchanged. Additions require a new JSON and one manifest entry; the guide includes complete executable v1, static-v2 and Motion-v2 examples. No external 3D engine or runtime dependency was introduced.

## Verification and limits

- Baseline129/129; candidate **147/147** work tests and **24/24** lifecycle tests. Immutable `tests/v05-baseline.json` was captured from main5d15872 before engine edits and compares all36 registrations/JSON/compiled meshes/packed colors+normals/initial previews. Existing16 v0.4 tap/hold/pull/restore/flick golden traces remain exact at HARD/SOFT/BOUNCY. New tests cover pivot/transform order, signed/periodic motion, authored normals, combined tracks, full-cycle camera bounds, posed picking, fixed-buffer renderer commands, pause/reset/reentry/atomic invalid selection, visibility clock, frame rates, source copy isolation, malformed data and data-only new Motion registration.
- **661 native GLES frames** at390×844,844×390,900×900 plus25 v2 previews. Actual shipped shaders and actual fixed-buffer/per-part model commands compile/link with GL error0. New Motion frames change visibly at0.8/2/4s and while the whole body turns. All15 new-work reset frames exactly match their initial pixels. CPU/GPU preview coverage .9995–1.0000; previous color/edge tolerances remain unchanged. Shape-side corrections remove coplanar frame/thread overlaps; no rendering-test threshold was relaxed.
- Reviewed five-study native initial/moving/turned contact sheets for silhouette, shading, support placement and available travel. JS/inline-module syntax and diff checks pass. PR records exact checked SHA, Scope → Risk → Impact, CI, merge and Pages/public confirmation, so this note does not predict a merge hash.
- The current cloud browser cannot create a WebGL2 context (also observed on unchanged v0.5). `tests/motion-fixture.html` deliberately labels its CPU raster; it exercises real browser Pointer Events, playback controls and the clock without pretending to certify browser GPU rendering. Actual public UI/fixture findings are recorded in the PR after deployment.
- **Physical iPhone/iPad, native iOS selection menus, mobile GPU/frame pacing and subjective motion quality remain UNVERIFIED.** Native GLES and a CPU browser fixture are different evidence. Formal verificationState remains UNVERIFIED; staging merge/CI do not imply owner adoption or Production approval.

Future candidates: user manipulation of one part, rigid Motion + elastic Touch composition, multiple ordered rotational tracks, optional part hierarchy, authored easing. None is implemented here. No timeline/editor, general Motion Lab integration, IK, joints, collisions, springs, gravity or new asset system.

---

# SukimaStock 3D Collection 02 · Free Forms — 2026-10-12

Base `f0eaea118fea35b9ecbe503731465a0a7b38b487` (merged #287); latest main, related PRs/reviews, all 21 definitions, COLLECTION_GUIDE, DEVELOPMENT, specimen/mesh and AGENTS/operations reviewed. No applicable production skill was present in the catalog or checkout `.agents/skills`; the work guide is canonical. Active / staging-only. Standard WORK preimplementation Plan `sukima-3d-collection-02-20261012` was committed before authoring; draft PR #288. An earlier plan-only branch was superseded before implementation when the user authorized minimal existing-test count maintenance.

15 individually shaped **v2 STATIC** works, explicit unique display numbers **22–36**, appended after the unchanged 21 entries. Naming followed shape exploration. No random deformation, imported models, dedicated preview images, gameplay or scheduled production. Each JSON uses authored indexed triangles, flat normals and `behaviors:{}`. Shared previews derive from the same data. Engine/camera/input/Touch/UI/package, shared 2D Engine, other works and Production are unchanged.

| No. / Category | Name / ID | Shape idea, v2 expression, angle to inspect; finding |
| --- | --- | --- |
| 22 / A 器と空洞 | TILT MOUTH / `tilt-mouth` | Five-sided deep pocket with sloping asymmetric lip and displaced foot. Closed outer/inner/rim/floors, 22 vertices / 40 triangles. Look down into mouth then below foot; oblique lip changes depth impression. |
| 23 / A | POCKET SHELL / `pocket-shell` | Wide shallow seven-sided recess, thicker back and tilted rim. Closed 30/56. Front → edge → back; a shallow space can read as a shell without copying BOWL. |
| 24 / A | SQUARE FLUE / `square-flue` | Leaning rectangular hollow tube, open at both ends but closed skin, 16/32. Look along Y then across side; thickness belongs to the skin, no end caps across the hole. |
| 25 / B 穴と隙間 | ELBOW WINDOW / `elbow-window` | Concave L-shaped through-window; paired six-corner inner/outer boundary, closed 24/48. Face → oblique → back; the narrow horizontal passage joins the tall slot. |
| 26 / B | FORK GAP / `fork-gap` | Unequal prongs with an open-ended gap, tapered and slanted. Extruded concave polygon, closed 16/28. Front then edge; gap stays open rather than becoming another ring. |
| 27 / B | SKEW TUNNEL / `skew-tunnel` | Shifted triangular portals joined by sloping walls, closed 12/24. Front and back along Z then side; aperture partly occludes itself at oblique angles. |
| 28 / C 薄いもの | CREASE FAN / `crease-fan` | Broad radial zigzag edge from one low corner, 11/9, open + doubleSided. Face → edge → back; nine folds collapse into a jagged profile. |
| 29 / C | RIBBON TURN / `ribbon-turn` | Six unequal cross-sections turn a narrow strip through space, 12/10, open + doubleSided. Rotate around Y; waist is projected twist, not a hole or deformation. |
| 30 / C | SADDLE SHEET / `saddle-sheet` | Four corners bend in opposing directions, 9/8, open + doubleSided. Face → diagonal edge → underside; broad quadrilateral becomes a pinched profile. |
| 31 / D 複数パーツ | OFFSET STACK / `offset-stack` | Five unequal plates separated by explicit air gaps, 40/60. Five closed parts with position, Y rotation and nonuniform scale. Front and side reveal offset versus layering; no hidden supports/animation. |
| 32 / D | BRIDGE PINS / `bridge-pins` | Two unequal feet, slanted lintel and detached triangular cap, 30/44. Four closed TRS parts. Front → side; deliberate small clearances make an unstable-looking assembly without collisions. |
| 33 / D | ORBIT CAGE / `orbit-cage` | Five tangential flat blocks around a small central prism, 48/72. Six separated closed TRS parts. Face → side reveals depth and central occlusion; no moving orbit. |
| 34 / E 自由造形 | THREE RIDGES / `three-ridges` | Three displaced height ridges above a flat underside, closed 24/44. Above → side → below; terrain/tool associations emerge from the same nonconvex solid. |
| 35 / E | PINCHED CROSS / `pinched-cross` | Unequal four-way silhouette with a sheared thick body, closed 24/44. Front → diagonal → back; narrow waist and skew thickness change apparent balance. |
| 36 / E | STEP KNOT / `step-knot` | Six square sections make a continuous angular ascending bend, closed 26/48. Front → side → underside; the bend reads as separate facets without detached parts. |

All fifteen fit v2 without extension. 344 authored vertices / 567 triangles total; three thin sheets draw both sides (additional 27 triangles). Per-work budget is 8–72 authored triangles, far below the contract limit. No authored normal override or Touch configuration is required. Each closed part is one connected surface with positive signed volume; disconnected shells are separate parts. This avoids the known #287 P2 aggregate-volume blind spot. The unknown Touch-key P2 is inapplicable because all behaviors are empty. Neither existing Engine issue was repaired here.

## Verification

- Baseline main: 114/114 existing tests. Candidate: **129/129** work tests and **24/24** lifecycle tests. Minimal `free-forms.test.mjs` maintenance pins old 17–21 to slice(16,21), checks total36/new22–36/v2 STATIC, and makes the independent data-addition example choose the next unused number/count. Old sixteen hash/behavior baselines and old five named geometry checks remain. Manifest-driven v2 tests now cover all twenty v2 forms; switching walks all36 forwards/backwards. No new permanent test system.
- Direct Git byte comparison protects **all21** original JSONs (including the five v2s), and exact manifest prefix equality protects order/number metadata. Only fifteen new JSONs, append-only manifest, this note, one existing test and the Plan Lock change.
- Unchanged native script: **536 GLES frames**, exact shaders compile/link, GL error0; all36 rest/turned/back at three sizes, old Touch states, and all20 v2 CPU/GPU preview comparisons. Coverage .9996–1.0000 for v2 previews; mean channel differences 0–.006. Native results are not browser/device certification.
- A temporary strict noncoplanar edge/triangle intersection check found a slight BRIDGE PINS lintel/left-foot overlap; raising only the lintel from Y=.36 to .42 creates a clear gap. All15 then pass this supplementary check; coplanar contacts/boundaries are not a complete intersection proof. The script is not committed.
- Individually reviewed all15 native three-angle images and same-gray initial/side/back/underside previews (temporary outputs outside repository). Confirmed cavity interiors versus back/foot, unfilled apertures, edge silhouettes, thin backs and intentional separated parts. CPU/GPU equality alone is not the topology evidence.
- Actual local Chromium `/usr/bin/chromium`, Playwright, WebGL2 SwiftShader: all36 load and draw; no pageerror/GL error. Real Pointer Events and next-while-captured switches restore pristine meshes/input; all20 STATIC rotate after hold, reset pose/velocity, retain exact vertices. New15 get >1s holds; keyboard rotations also exercised. Three CSS viewport sizes 390×844, 844×390, 768×1024: no horizontal overflow and collection scroll preserved. Additional actual WebGL views confirm background through SQUARE FLUE along its axis, the L-window and skew tunnel; the deep mouth interior and all three thin backs render. Existing v1 interaction behavior remains protected by unchanged fixed traces.
- PR #288 records exact checked head, Scope → Risk → Impact, CI, merge SHA and Pages/live results. **Physical iPhone/iPad, native iOS menus and device frame pacing are UNVERIFIED**. Formal verificationState stays UNVERIFIED; staging publication is not owner adoption or Production permission.

## Limits / next shapes

Zero-thickness sheets deliberately vanish edge-on; they are not flexible cloth. Parts remain rigid and static, with no joints, transparency, collision or general nonconvex Touch. General self-intersection repair and nested-shell orientation are outside the current validator. Authored cross-sections and separate-part clearances were reviewed here; no automatic repair is claimed. Future exploration: an asymmetric split shell with a narrow slit, interleaved folds, or a branching hollow passage. Moving/contacting parts would require a separate capability decision; no extension or automation was started.

---

# SukimaStock 3D v0.5 · Free Forms — 2026-10-12

## Scope and architecture

Latest main `2a8af03d5795bd1e537ec410a521930dc047434e`; merged #277/#278/#279/#280/#284/#285/#286, all sixteen specimens and both guides reviewed before work. Standard WORK Plan locked first at `.change-plans/sukima-3d-free-forms-v05-20261012/r0.lock.json`. Only this work and its own Plan Lock change. Production, other works, shared 2D Engine, global registries, LAB and Motion Lab stay outside scope.

- **Core**: `math.js`, `camera.js`, `geometry.js`, `mesh.js`, `renderer.js`, `rotation.js`, `loop.js`. `mesh.js` validates explicit triangle surfaces and bakes part TRS; it has no Touch or DOM imports. The existing WebGL 2 shader/light/camera remain. A flat face normal is generated unless authored normals are supplied; nonuniform scale uses inverse transpose. Only explicitly two-sided parts get reversed GPU triangles with reversed normals.
- **Specimen loading**: `specimen.js` retains all v1 convex/welded/volume checks and dispatches v2 surface checks. `sukima3d-specimen/1` JSON is unchanged. `sukima3d-specimen/2` explicitly authors triangles, normals, materials and parts. Open boundaries, concavity, through-holes, inner surfaces and disconnected components are not converted to convex hulls or filled.
- **Behaviors**: `behaviors.js` handles optional capabilities. V1 defaults to its existing `feel`; explicit `behaviors:{}` selects a `RotationBody`. V2 requires explicit behaviors, normally `{}`. Touch uses the existing `TouchBody`, now extending the shared rotation body. This preserves the exact rotation equations and Touch update order. V2 opt-in Touch is limited to one closed convex part validated through the old contract; its adapter adds bending centres. There is no new free-form physics.
- **Collection**: `session.js` is a DOM-free fresh-body factory, named `SpecimenSession` with `TouchSession` retained as a compatibility alias. `PointerInput` retains `TouchInput` as an alias. Static down/hold never calls press or pull; a drag after any hold rotates. Static permits a drag starting on a hole/background. Reset cancels capture, angular velocity and wobble, and restores the authored pose. Existing Touch thresholds, hold/pull mapping, cancellation, presets and callout protection remain.
- **Previews**: old logical-face SVG unchanged; new 200px CPU depth raster uses the same packed triangles, camera and matte lighting. No live card WebGL contexts. One active renderer remains. Static card canvases do not capture input or block collection scrolling. No external 3D engine or runtime package was added.

## Works and registration

| Display | ID | Authored vertices / triangles | Distinction |
| --- | --- | --- | --- |
| 17 | dent | 47 / 90 | irregular solid with a shallow central depression |
| 18 | ring | 72 / 144 | closed torus surface with a genuine through-hole |
| 19 | bowl | 86 / 168 | outer wall, rim, inner wall and inner floor |
| 20 | leaf | 14 / 16 (32 GPU) | bent open sheet, two-sided |
| 21 | mobile | 132 / 240, seven parts | plinth, axis, beam, two threads, warm weight and small loop |

All five are STATIC. Old cards keep numbers 00–15 and original order; new entries explicitly carry 17–21 as requested. The number is display metadata, distinct from position/count. The next registration can use `number:22`. Shape data plus one manifest entry remain sufficient; no object-name conditions were added to runtime. All module/CSS/data URLs and package advance together to 0.5.0. JSON stays `cache:no-cache`, so later data-only additions need no engine-version edits.

## Verification and limitations

Reproducible commands are in COLLECTION_GUIDE.md. The expanded unit suite checks all sixteen unchanged JSON blobs and fixed tap/hold/pull/restore/flick hashes at every profile, generated from the actual pre-change `2a8af03` sources. It also checks all 21 session switches, static gestures/reset, explicit convex Touch reuse, transformed normals, bad indices/nonfinite/zero-area/winding/topology, separate components, ray-through-hole/interior/back-side geometry, preview depth, guide examples and data-only registration.

Observed before PR: all 114 work tests and 24 existing work-lifecycle tests pass; all 27 JS/MJS modules and inline module fixtures pass syntax checks; git diff check passes. Native run succeeds for 386 frames with GL error 0, and all five preview masks match GPU coverage exactly at 200px (one subpixel facet-edge color difference per preview; mean channel difference 0.000–0.006).

Native Mesa GLES compiles the exact shipped shaders and draws all 16 Touch works × 7 states × 3 sizes, all 5 static works × 3 poses × 3 sizes, and five 200px preview comparisons (386 frames). CPU/GPU preview coverage must exceed 99.5%; channel error is bounded, with only differences within 0.01px of an actual triangle edge permitted for subpixel raster rounding and fewer than 0.1% boundary pixels. Existing >5000 body-pixel and >300 change-pixel checks remain for the original full-size scene set. RING also asserts actual background pixels through the hole.

The cloud browser has previously lacked WebGL2. The local runtime has Playwright but no Chromium executable; a browser installation returned truncated downloads, so local Chromium rendering is not claimed. Native GLES evidence is distinct from browser WebGL/device evidence. The actual browser UI/fallback/responsive pages and labelled `tests/debug-fixture.html` can verify Pointer Events, capture, profile controls, static rotation/reset and switching without claiming GL rendering. The fixture selects a centre ray for any point in its labelled 2D surface: it is not a pointer/3D alignment test. Exact final SHA, CI, Pages and live observations are recorded in the PR.

Physical iPhone/iPad touch feel, native iOS callout suppression and actual device performance remain **UNVERIFIED** until tested on hardware. Formal verificationState remains UNVERIFIED under the repository contract; CI/staging merge is not author adoption or production approval.

Remaining limits: self intersections and nested-shell outward orientation are not comprehensively diagnosed or repaired; no arbitrary nonconvex Touch physics, mesh editor, joints/collisions, transparency/textures or Motion system. Part transforms are baked at load time; per-part animation can be a later capability without rewriting authored shape data. Camera fits the bounds and restores orientation; no additional zoom gesture is introduced.

---

Below is preserved v0.4 / Collection 01 history.

# SukimaStock 3D Collection 01 · 2026-10-12

小さな造形を見て、触り、そこから用途を考えるための第1回。ゲームや機能の企画ではない。自然3・人工3・正体不明4を追加し、既存6作と合わせて16作。各形の頂点を意図して配置し、大きな論理面、厚み比率、偏りを先に設計した。ランダム標本、外部モデル、追加パーツは使っていない。

最新main `ea0a63510f89a246e4ff00ee426024d03a880537`、#284/#285、AGENTS、制作ガイドと現行運用を確認。active / staging-only。10 JSON + registry + この記録は小変更ルートの最大4ファイルを超えるため、Standard WORK Planを最初のcommitで固定し、draft PR #286から開始した。JSON/Markdownのみなので非該当のnode-syntaxを成功扱いせず、既存回帰と描画を実行する。必要な制作skillは利用可能一覧にもcheckoutの`.agents/skills`にもなかったため、作品の`COLLECTION_GUIDE.md`を正本にした。

**番号について:** 下表の07〜16は登録順の7〜16番目。既存UIはカード・名前の番号が00始まり（元の6作は00〜05）、件数表示が1始まり。その既存番号・順序・UIを守り、新作のカード表示は06〜15、件数表示は7/16〜16/16になる。番号補正のruntime変更は含めない。

## 制作記録

| 登録順 / 区分 | 名前・ID | 意図 / シルエットと回した変化 | 初期触感 / 触ってほしいところ |
| --- | --- | --- | --- |
| 07 / A 自然 | WILLOW / 柳片 · `willow` | 細い葉の、面から稜へ変わる薄さ。左右非対称の葉形、裏にも厚みがあり、横からは細い刃。茎は付けない | SOFT。中央の葉脈状の稜とその横の面を軽く押す。尖端を大きく引かず、小さい戻りを見る |
| 08 / A 自然 | BASALT / 柱石 · `basalt` | 石の丸い塊とは違う、五角の切断面と縦長の平面。少し傾いた一本の角柱。回すと縦の帯の幅が変わる | HARD。縦の広い面と上端近く。短く押して早い復元を比べる |
| 09 / A 自然 | ICE RAFT / 氷筏 · `ice-raft` | 水辺に浮く一枚の厚い氷。横に広い不規則七角の台形断面、裏は大きな一面。透明表現ではなく輪郭で氷を考える | SOFT。硬そうな平たい天面が控えめに沈む意外性。天面中央を押して、縁近くを小さく引く |
| 10 / B 人工 | DOORSTOP / 戸あたり · `doorstop` | 5面だけの楔。正面の三角と、回したときの大きな斜面の違い | HARD。斜面中央と厚い側の稜。浅い押下の後の短い余韻 |
| 11 / B 人工 | LEAN BLOCK / かたむき積木 · `lean-block` | 横長で低い箱の上面をずらす。不安定そうな平行四辺形と裏の大きな面。柱石との差を見て、縦長案から幅広に修正 | SOFT。積木の硬さを裏切るゆっくりした面の沈み。広い前面を押し、上の角寄りを引く |
| 12 / B 人工 | TETRA / 四つ角 · `tetra` | 4面だけの最少立体。少しずれた頂点、回すと三角から四角い輪郭へ。初期姿勢を調整して二面の稜を見せる | BOUNCY。大きな三角面を短くタップし、離した後を見る。頂点より面の中央 |
| 13 / C 不明 | ELSEWHERE / どこでもない · `elsewhere` | 台形の背に片寄った峰が一つ。前からは畳んだ何か、横はひれ、裏は何もない一面。用途は付けない | BOUNCY。低い峰の脇の三角と、裏の広い台形を交互に触る |
| 14 / C 不明 | OFFSET / ずれた頂き · `offset` | 上下の四角の向きが45度違う反角柱。回転で帯の稜と肩の数が入れ替わる。ねじれは関節ではなく一つの凸面集合 | HARD。斜めの稜の隣の面を押し、輪郭の動かなさと局所の戻りを比べる |
| 15 / C 不明 | FAR TIP / とおい先 · `far-tip` | 左右で長さが違う横向きの二錐。短い背中と遠い先、端から見ると急に三角に縮む | BOUNCY。中央の三角面、短い先の付け根。小さな引きと反発で偏りを感じる |
| 16 / C 不明 | PAUSE / まのかたまり · `pause` | 厚い六角の円盤に小さな平らな頂を二つ。表裏に少しずれ、横からは台形の重なりに見える単一凸体 | SOFT。親指を置きたくなる六角の平面。遅い押し込みと静かな復元を長押しで見る |

全作 `display.scale=1`、matte、`variation=.018`。触感構成は HARD 3 / SOFT 4 / BOUNCY 3。色を一時的に同じ灰色にしたプレビューで初期・90度・180度を並べ、色なしの輪郭差も確認する。既存のプレビュー関数と同じJSONを使い、別形状のサムネイルは作らない。

### データの触感設定

数値はJSONの正本を参照。下表の上限は `pressDepth / maxDisplacement / maxPull`、Cは `cornerCompliance`、`centerCompliance=1`。省略したfeelキーは既存profileの値。

| ID | 論理面 / GPU三角形 | 上限 / C | feel.overrides |
| --- | ---: | --- | --- |
| `willow` | 10 / 30 | 0.065 / 0.09 / 0.15 / C=0.24 | `{"depth":0.09,"radius":0.72,"pullStrength":0.65}` |
| `basalt` | 7 / 30 | 0.1 / 0.14 / 0.23 / C=0.3 | `{"depth":0.1,"radius":0.72,"maxPull":0.23}` |
| `ice-raft` | 9 / 42 | 0.065 / 0.09 / 0.14 / C=0.22 | `{"depth":0.075,"radius":0.85,"pullStrength":0.6,"returnDamping":0.83}` |
| `doorstop` | 5 / 18 | 0.09 / 0.12 / 0.18 / C=0.3 | `{"depth":0.1,"maxPull":0.18,"pullStrength":0.75,"restoreStiffness":360,"returnDamping":0.72}` |
| `lean-block` | 6 / 24 | 0.16 / 0.2 / 0.32 / C=0.44 | `{"pressRate":3.8,"returnDamping":0.77}` |
| `tetra` | 4 / 12 | 0.13 / 0.18 / 0.27 / C=0.33 | `{"returnDamping":0.51,"maxPull":0.27}` |
| `elsewhere` | 5 / 16 | 0.13 / 0.18 / 0.29 / C=0.35 | `{"returnDamping":0.54,"pullStrength":0.85}` |
| `offset` | 10 / 32 | 0.115 / 0.155 / 0.25 / C=0.36 | `{"depth":0.115,"radius":0.82,"maxPull":0.25}` |
| `far-tip` | 6 / 18 | 0.09 / 0.13 / 0.2 / C=0.26 | `{"depth":0.1,"radius":0.72,"pullStrength":0.65,"returnDamping":0.58}` |
| `pause` | 14 / 60 | 0.13 / 0.17 / 0.25 / C=0.42 | `{"pressRate":3.4,"restoreStiffness":145,"returnDamping":0.85,"pullStrength":0.75}` |

`compliance`は押し込み用で、pullの尖端保護には使われない。全作にlimitsを明示し、薄い葉と氷、先の長い二錐は小さいpull上限にした。scaleで上限が縮尺されないため、今回はすべて実寸のscale=1で設計。既存の面積・辺長ガードは対向面衝突や体積を直接保証するものではない。極端な薄板を避け、復元と複数方向の変形を観察する。

## 検証記録と限界

最終の対象SHA・CI・Pages・配信結果はPR #286へ固定する。規格/全16作/各面のpick・変形/複数角度/生成プレビューは既存 `tests/*.test.mjs` と `render-collection.mjs | check-gles.py` で確認する。恒久的な検証コードを追加・変更しない。

既存のswitch回帰は `i % 6` なので、新10作の切替確認の根拠にはしない。今回の一時ブラウザ検証は既存debug公開APIと実アプリのPointer Eventsで全16作のタップ・1秒hold・rotate・pull・release、掴んだままのnext、previousでの再入場、一覧へ戻る/スクロール復元を別に確認する。復元数値の最終確認では実bodyの既存stepを3秒分進める。物理的な指の感覚の代用ではない。

Native Mesa GLESはシェーダ/形状の証拠、ローカルChromium WebGL2はブラウザ描画/入力の証拠、390×844・844×390・768×1024はCSS viewportの証拠として区別する。実機iPhone/iPadの手触り、native menu抑止、端末性能は未確認。正式状態は現行契約どおりUNVERIFIED。作者の採用・Productionの承認を意味しない。

観測結果: 全16作のブラウザ読込み・操作・掴み中切替と前後/一覧復帰が成功し、appのpageerrorは0、GL errorは0。3 viewportで横overflowなし・一覧scroll復元一致。既存native scriptは全16作×7状態×3サイズ=336フレームで成功。同色三方向プレビューとnativeの初期/turned/backを目視し、初期案で近かった柱石と積木は積木の幅/高さ/傾きを変更して区別した。初期の戸あたりは復元が早くreleaseフレーム差分が小さかったため、既存のreturnパラメータを微調整し、検査の閾値を変えずに短い余韻を残した。

## 今回見送った形 / 次回

穴のある輪石、くぼんだ器、割れ目を開閉する莢、独立した二つの塊が触れ合う形はv1対象外。無理に凸の塊へ置き換えず保留し、拡張の実装や予約はしない。

次は作者が実際に触った反応をもとに、「広い一面を押す」対「細い稜をつまむ」、短い復元対ゆっくりした復元を少数の形で深めたい。特に柳片・氷筏の控えめな動きと、四つ角・どこでもないの反発が心地よいかを見たい。用途や遊びはその後に考える。定期量産設定はない。

---

以下はv0.4基盤と以前の検証の履歴（当時の6作品）。

# Touch Lab v0.4 — collection foundation

## Current scope / design

Base: staging/main `90fbd73063cacb53252bb981e66fca9d074f8f34`, after merged #277/#278/#279/#280 and current LAB #283. Reviewed current engine, DEVELOPMENT, AGENTS and operations. Work-only Standard Plan locked before implementation. No global lifecycle/LAB, common 2D Engine, other works, deployment workflow or production changes. Remains active/staging-only. Author success feedback is not blanket certification of these new specimens.

The app opens a six-item Collection View. A static SVG preview uses the exact validated specimen mesh/material/pose; there is no WebGL context or animation per card. The sheet scrolls, with two columns on phones and a responsive wider grid. Selected Touch View has one shared WebGL2 renderer and a fresh mesh/body/input. Back/previous/next are the only normal navigation controls; no score or new gesture. Return restores collection scroll/focus. Keyboard arrows/space, reduced-motion preferences and opt-in debug remain.

`collection.json` is the ordered work-local registry. `objects/*.json` hold independent shape/material/feel/display data. `engine/specimen.js` is a pure validator/mesh adapter; `engine/session.js` creates a fresh body and clears the previous one. No DOM/fetch is required to reuse a specimen in a different app. `collection.js` handles same-work JSON loading at bounded concurrency (four), preserves order and isolates individual invalid/missing specimens. Fatal registry errors produce a short message. Metadata reaches the UI through textContent, and thumbnails contain only generated numeric SVG polygons.

The v1 creation contract deliberately supports a single closed convex solid with planar convex polygon faces, 4–64 corners, 4–96 logical faces and at most 512 fan triangles. Validator checks finite/index bounds, duplicate/unused points, outward halfspaces, planarity/convexity/area, oppositely paired welded edges, connectedness, volume, color/material, whitelisted bounded feel overrides and unit pose/display limits. Hollow/open/concave/self-intersecting solids are rejected; no silent winding repair. SHELL is a thick closed fan, not a hollow shell. These are documented boundaries, not arbitrary imported-model support.

Generic changes to existing engine:

- Geometry packing reads a matte color/optional per-face palette and variation from mesh material. The legacy clay fallback and exact shaders/light remain unchanged.
- Camera framing may move back for a specimen radius above 1.1. Original polyhedron framing is unchanged. The ground shadow also moves down for a larger bounding radius; its original position and shaders remain for the polyhedron.
- TouchBody uses optional shape-owned pressure/displacement/pull caps and reuses the existing whole-field signed-area/edge-strain guard on all deformation of constrained shapes. No object-ID branches. Existing springs, impulse, hold/drag thresholds, quaternion drag/inertia and pull mapping are retained.
- All module/CSS/data request URLs consistently use `?v=0.4.1`. Original `createPolyhedron()` remains the regression reference; production gallery loads its identical JSON copy. JSON requests conditionally revalidate HTTP caches, so subsequent data-only additions do not require changing engine/module versions. No runtime libraries, image downloads, external API, asset editor, storage, imported 3D engine or Dots automation.

Native iOS selection/callout guard from #280 is retained inline on main. Pointer listeners are destroyed/capture cancelled before switching. Each selection creates a fresh pose, zero angular/offset velocities and rest vertices; no deformation/profile from the previous specimen is reused. Resize, blur, visibility/pagehide, BFCache and context-loss cancellation remain. WebGL is initialized only when opening a specimen, so the Collection View still works without WebGL2. In that environment Touch View offers the existing graceful notice plus navigation.

## New specimens / making more

STONE has unequal bevelled planes; CRYSTAL is a slanted hexagonal prism with two unequal tips; SEED tapers with asymmetric belly/tip; SHELL has a raised fan and thin but closed rim; ODD has three offset shoulders with a crooked crest. All use SOFT by default. HARD/SOFT/BOUNCY remain available; shape caps protect narrow geometry even under stronger debug values.

Authoring procedure, valid cube example, parameter bounds, required tests and failure diagnosis: **COLLECTION_GUIDE.md** in this directory. Adding a specimen means a new JSON file and an appended registry entry; previews, UI and specimen tests consume the registry. No renderer/input/deformation edit is needed. A pure synthetic new-item registration and 100-item load test exercise that boundary.

## Verification commands / limits

```sh
node --test works/sukima-3d-lab/tests/*.test.mjs
node tests/test-work-lifecycle.cjs
node works/sukima-3d-lab/tests/render-collection.mjs | python works/sukima-3d-lab/tests/check-gles.py /tmp/touch-v04-render
```

All 38 pre-v0.4 tests are retained. Collection tests add original-mesh/pose/colors/response identity, every specimen/material/face picking and bounded press/pull/recovery, repeated mixed deformation, five viewport sizes/many rotations, invalid data, isolated loading failures, synthetic data-only addition/100-item loading and grabbed/spinning session replacement. 63/63 work tests and 24/24 existing lifecycle tests passed locally. Exact checked SHA and CI are recorded in the PR.

Native Mesa GLES compiled/linked the exact unchanged shaders and rendered **126 specimen frames**: six specimens × seven rest/rotated/back/tap/held/pull/release states × 390×844, 844×390 and 900×900. Pixel evidence and GL errors are checked against each specimen's own rest frame. Rest-frame montage was visually inspected. This is native GLES evidence, not browser WebGL or actual iPhone/iPad touch/performance. No UI/ground shadow is included in native rendering. The v0.3 script remains usable separately.

Cloud-browser collection/navigation/fallback/debug observations and Pages publication are recorded after deployment in the PR. Physical Safari touch comfort, native menu suppression, real mobile frame pacing and WebGL context restoration remain UNVERIFIED until observed. Formal verificationState stays UNVERIFIED under the current repository contract; staging CI/merge is not final author adoption or production permission.

Rollback: revert this isolated work-only PR. No shared registry or other work needs to change.

## Historical v0.3 implementation reference

# Touch Lab v0.3 — surface grab and elastic pull

## Scope / baseline

Started from staging/main `ddb4166106696f2aa0cda241732e5beb941dfcef`, after reviewing merged #277 (v0.2 tactile response), #278 (complete versioned browser module graph), current code, AGENTS and Change operations. The explicit v0.3 instruction supersedes the earlier v0.2 restriction on pull. The work remains **active / staging-only**.

Changes are confined to this work, its lifecycle title and the required pre-implementation Plan Lock. Shared 2D Engine, other works, town, SEO, deployment workflow, production, lifecycle status and public URL are unchanged. No new specimen, editor, multi-object system or two-finger scaling. No Three.js, Babylon.js, external runtime package, physics library, storage or API. Browser-standard WebGL 2, ES modules and Pointer Events remain the implementation.

## Modules

| File | Responsibility |
| --- | --- |
| `engine/interaction.js` | Captured primary pointer; press → rotate or armed → grab; RAF hold age and cancellation |
| `engine/camera.js` | Projection, inverse picking ray, frozen camera-plane drag mapping |
| `engine/pull.js` | Mesh-independent barycentric attachment, smooth neighbour weights, resistant displacement and topology safety |
| `engine/dynamics.js` | Existing press/impulse and quaternion inertia, held pull targets, shared return springs |
| `engine/response.js` | Unchanged v0.2 HARD/SOFT/BOUNCY material parameters and scalar spring |
| `engine/geometry.js` | Unchanged irregular shape: 20 logical faces, 32 welded vertices, 60 GPU triangles; deformed-mesh picking |
| `debug.js` | Opt-in material and parameter UI; values shown beside sliders |
| `app.js` | Input/body composition and existing resize/visibility/BFCache/context cancellation |
| `engine/renderer.js`, `math.js`, `loop.js` | Existing shaders, lighting, quaternion/vector math and RAF |

All runtime imports, CSS/app entry points and browser fixtures use `?v=0.3.0`, checked by the version-graph regression. Some otherwise unchanged rendering/geometry files differ only in import version. A warm older graph cannot mix with v0.3. No import map, Service Worker or new asset framework.

## Gesture contract

- **Tap / ordinary hold:** seed the exact v0.2 bounded contact impulse and retain progressive pressure. A stationary hold keeps deepening even after it becomes eligible for grabbing. Release retains positions and velocities for natural return.
- **Ordinary drag:** travel at least **10 CSS px before 380 ms** commits to rotation for the rest of that pointer capture. The threshold is slightly more tolerant than v0.2's 7 px to allow finger drift. Quaternion drag equations, speed cap, inertia, stale-flick cutoff and rotational settling are retained.
- **Long press:** **380 ms** without crossing the rotation threshold arms the grab. It does not stop the pressure spring or move the shape by itself. After arming, at least **3 CSS px** from the armed position starts pulling; it can no longer turn into rotation. No timer, queued gesture or normal-mode button. Hold age advances on the existing RAF; event timestamps also handle the first move after a stationary hold without an intervening frame.
- **Grab:** bake the current settling pose, stop angular momentum, capture current offsets and keep orientation fixed. The same picked triangle/barycentrics stay attached throughout, including during earlier deformation recovery.
- **Release / interruption:** release clears grab/contact state without a position snap; the rest shape becomes the spring target. Cancel/lost capture, resize, blur, hidden/pagehide and context loss also clear pointer capture and angular/vertex velocity. Current positions recover using the same bounded spring. There is no stale projection plane or delayed grab on re-entry. A secondary pointer cannot cancel the primary one.

This is one-finger or mouse surface grabbing. The word "pinch" does not mean a two-finger scale gesture in this version.

## Screen-to-3D calculation

At grab start, interpolate the **current deformed triangle** with the picked barycentrics. Transform that attachment into world space with the frozen pose. A camera-parallel plane passes through its world Z. For a CSS-pixel delta `(dx,dy)`, use:

```
depth = camera.distance - attachmentWorld.z
worldDelta = [2*depth*tan(fov/2)*aspect*dx/width,
             -2*depth*tan(fov/2)*dy/height, 0]
localDelta = inverse(frozenPose) * worldDelta
```

Canvas offsets, CSS size and camera distance/aspect are respected. Mapping is independent of DPR; the renderer still caps DPR at 2. Right/up finger motion remains right/up on screen after arbitrary object rotation. Resize cancels the capture rather than reusing an obsolete plane. At small displacement the attachment follows this mapped delta; deliberate resistance and the safety bound make large drags fall behind the finger rather than stretch indefinitely.

## Deformation and feel

Pull weights are a spatial field over **rest vertices**, with a flat core out to 35% of the propagation radius and a cubic smoothstep falloff to zero at the radius. Normalize by the barycentric attachment weight so nearby triangles follow the grab without a special face-centre ID or separate face geometry. Shared vertices keep seams welded. Pull does not depend on the 20-face shape or its v0.2 press-compliance metadata.

Target displacement uses `maxPull * tanh(length * pullStrength / maxPull)` in the mapped direction. It is nearly linear for small motion, then resists more strongly. Captured pressure offsets are retained as the baseline, preventing a shape jump at the transition. Critically damped tracking springs follow the live target; the existing material return springs restore every vertex to its exact rest position.

A global displacement cap scales the entire field, preserving smooth neighbour relationships. A safety guard also requires each triangle's signed projected area to remain at least 18% of its rest area and each edge length between 35% and 200% of rest. Extreme input uses a bounded bisection to reduce the whole offset field. The guard covers release overshoot and repeat interactions until offsets are small. It is a compact deformation safeguard, not collision/volume-preserving physics. Arbitrary imported or degenerate meshes are not supported.

Pull release reduces the material damping ratio by at most 10%, proportional to stretch, for a small final rebound. Return stiffness/damping remain the same controls for both pressing and pulling. SOFT is the provisional normal default; actual device comfort is not certified.

| Pull parameter | Default | Debug range |
| --- | ---: | ---: |
| holdDelay (ms) | 380 | 200–700 |
| pullStrength | 1.00 | 0.50–1.50 |
| maxPull (mesh units) | 0.48 | 0.20–0.60 |
| pullRadius (mesh units) | 1.45 | 1.00–1.90 |
| pull tracking stiffness (1/s²) | 520 | fixed |
| tracking damping ratio | 1.00 | fixed |
| return stiffness (1/s²) | 185 SOFT | 100–500 |
| return damping ratio | 0.68 SOFT | 0.40–0.98 |

Higher return damping means less final shaking. Sliders cancel the current contact before changing parameters; presets retain pull settings and rotation preferences while changing the material response. The debug panel scrolls in short viewports. It adds no normal controls or separate update timer.

| v0.2 material retained | HARD | SOFT (default) | BOUNCY |
| --- | ---: | ---: | ---: |
| press depth | 0.145 | 0.205 | 0.195 |
| press radius | 0.78 | 1.08 | 0.98 |
| pressRate (1/s) | 14 | 4.8 | 6.5 |
| press stiffness | 460 | 210 | 240 |
| press damping | 0.90 | 0.95 | 0.85 |
| return stiffness | 460 | 185 | 230 |
| return damping | 0.78 | 0.68 | 0.46 |
| tap velocity impulse | 3.1 | 2.9 | 3.0 |

HARD returns quickly with less rebound; SOFT is slower and deeper; BOUNCY has a livelier release. Pull tracking is shared so comparison isolates press and release feel. Rotation damping/settling are unchanged by presets. Existing reduced-motion rotation preferences remain respected.

## Reproducible verification

```sh
node --test works/sukima-3d-lab/tests/*.test.mjs
node tests/test-work-lifecycle.cjs
node works/sukima-3d-lab/tests/render-scenes.mjs | python works/sukima-3d-lab/tests/check-gles.py /tmp/touch-v03-render
```

38/38 work tests and 18/18 existing lifecycle tests pass locally. The suite retains all v0.2 tap/press/flick/cache/fallback tests. New cases cover stationary arming with unchanged pressure, pre-hold rotation, post-hold capture, jitter, no-RAF timestamp arming, cancellation/capture loss, 600 mapping/attachment checks across 120 rotated viewport configurations, material return at 30/60/120 fps, all faces and off-centre pulls, extreme changing directions, repeated interactions, complete settling and vertex-order independence. Exact counts/results and checked PR SHA are recorded in the PR.

Optional Mesa/EGL script compiles/links the exact shipped shaders and renders rest, tap, hold, release, pull and pull release at 390×844, 844×390 and 900×900. 57 frames passed with visible pixel differences and GL error 0. These establish native GLES geometry/shader evidence; they do **not** certify browser WebGL, mobile performance or physical touch feel. Native rendering excludes UI/ground shadow.

`tests/debug-fixture.html` mounts the actual body, input and debug UI, with a labelled 2D pointer region and visible state/offset readouts. Every point in that fixture deliberately selects the centre face. It checks real browser pointer capture, gesture switching and settings, **not** 3D picking/rendering. The cloud browser has previously lacked WebGL2; main fallback and fixture observations after publishing are reported separately.

Formal verificationState remains **UNVERIFIED** under the current repository contract. iPhone/iPad Safari gestures, real mobile frame pacing and browser context restoration remain unobserved. CI/staging merge is not author adoption or production authorization.

## Device evaluation / next decisions

1. Tap rapidly and hold without moving: compare the preserved v0.2 dent/rebound.
2. Drag immediately and flick: compare ordinary rotation; wait with finger still down and move again to confirm it remains rotation.
3. Hold about 0.4 seconds, drift slightly, then pull right/up and diagonally. Check the arming delay, attachment drift and increasing resistance.
4. Rotate to several faces, then repeat pulling near the centre and an edge. Release shallow and deep pulls; check final rebound and exact recovery.
5. Compare HARD/SOFT/BOUNCY at `?debug`; adjust hold time, strength, max amount/radius and return speed/damping. Report accidental mode changes or excessive lag.
6. Rotate device during a grab, leave/return to the tab and briefly touch with a second finger. No active grab should remain.

Future tuning depends on those observations: long-press discoverability/time, screen attachment lag versus resistance, neighbour radius/strain limits on other shapes and device performance. No additional gestures/editor are implemented.

Rollback: revert this isolated PR, including only its target lifecycle title. The preceding v0.2 and cache repair remain available in Git history (#277/#278).

## Static preview correction (package 0.4.1)

Post-publication browser inspection found antialias seams between internal bending fan triangles in collection thumbnails. The preview now renders each original flat logical face as one polygon, using the same mesh corners/material/pose, with no alternate geometry asset. Native shaders/geometry/physics are unchanged. The complete module/CSS/data URL graph advances together to 0.4.1. A polygon-count regression prevents reintroducing internal preview subdivisions. `tests/viewport-fixture.html` embeds the actual app at portrait/landscape/tablet CSS sizes; it is a labelled developer QA page, not touch/device or WebGL certification. Final browser findings are recorded in the repair PR.
