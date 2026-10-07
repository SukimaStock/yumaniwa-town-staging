# ORBIT Web v2.0 — Return Save

## Phase 9: BASE = SAVE
- Browser-local persistence is now part of the return loop.
- Returning to BASE auto-saves after the return reaction has resolved.
- BASE repair, Echo discovery, final Echo sequence completion, and the first post-finale farewell also save.
- There is no manual save button or slot-management UI.

## Title / Continue
- No save: `NEW ORBIT`.
- Save exists: `CONTINUE` / `NEW ORBIT`.
- `NEW ORBIT` clears the existing local snapshot and starts from the beginning.

## Saved state
- FUEL / ORE / DATA.
- BASE Lv1–5.
- Echo count, unique discovered SERA IDs, and whether an Echo is still being carried home.
- Final Echo sequence completion and the one-time farewell state.
- Resource depletion for fixed and generated planets.
- Current position / velocity and the landed planet when the save was made.

## Continue behavior
- A save made on a SERA resumes landed on that same SERA.
- A BASE save resumes at BASE.
- A post-finale in-flight save resumes in flight.
- If ECHO 12/12 + BASE Lv5 was saved before the final sequence completed, CONTINUE still starts the final sequence instead of skipping it.

## Validation
- `node --check sketch.js` passes.
- Save/load smoke test verified BASE level, resources, Echo discovery, landed location, and SERA resource depletion round-trip correctly through localStorage.

## Unchanged
- Accepted Web drift physics.
- Landing assist and high-speed bounce.
- Launch speed 330 and one-second takeoff hold.
- BASE repair curve and Echo story.
- Deterministic VOX / SERA / LUMA atlas.
