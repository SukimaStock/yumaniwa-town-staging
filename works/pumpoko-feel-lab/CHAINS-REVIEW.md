# PUMPOKO FEEL LAB — connected terrain Phase 1

Base: `5d7c312af5f4c791d1591c0ac06e11db1435b707` (PR #210). Implemented as a staging-only exploration work; PUMPOKO 02, Engine and Codea unchanged.

## Four connected studies

| ID | Purpose | World span |
| --- | --- | --- |
| FLOW | Long downhill → deep catch → shallow transition → long uphill | x -500..1700 |
| RHYTHM | Shallow banks / repeated rebound landings | x -500..1700 |
| PUMP | Wide U → slope → smaller U → climb | x -500..1700 |
| BREATH | Downhill → deep bowl → horizontal pause → shallow bowl | x -500..1700 |

Each study is one continuous Hermite surface with matching draw and physical contact (using unchanged `../pumpoko-02/{physics,world,draw}.js`). The four authored surfaces use ordinary contact and no extra boosters, hazards, targets or new controls. All eight previous single studies remain available as a separate mode, including original impassable waves as user-reported experimental evidence.

The lab now follows the fruit horizontally with gentle forward look-ahead rather than fitting all 2200 world units into one screen. It recalculates local vertical bounds with clearance for the fruit and rutabaga bounce, without affecting physical trajectories. Ends are clamped with existing small rebound and can be reversed; RESET always restores the same state.

## UI and saved observations

A study-mode selector separates the existing eight single shapes from four new connected trials. HTML/CSS/JS resources have new version query parameters to address the previous stale-cache selector issue. Study controls are explicitly 4-column responsive and thumb-sized; optional feedback expands in a details panel to keep primary actions visible on iPhone.

The previously existing localStorage save key stays unchanged, but records now include `mode`, `feedback`, the selected `kind`, course ID and an actual copy of the selected Hermite control points, plus user notes and timestamp. No automatic adoption into game stages.

## Mechanical checks

A standalone V8 DOM/canvas stub loaded the exact committed PUMPOKO 02 physics/world/fruit JavaScript together with the candidate FEEL LAB runtime. Both active kinds × 4 connected course selections were executed for 90 right-hold frames and then reversed; all eight progressed at least 5 world units to the right, had the correct selected `mode=chain` and course ID, and produced no JavaScript exceptions. All eight had valid computed camera/zoom. Saving RHYTHM/BREATH observations records the selected Hermite points, freeform feedback and active character.

These are **not real-browser or iPhone tests**; the synthetic canvas did not rasterize actual fruit art. The user needs to verify camera motion, readability and enjoyment on mobile, plus all original single-mode regression; physical "fun" is never inferred from CI success. Staging merge requires scope, risk, trusted static and validator checks. Formal verificationState remains UNVERIFIED.

Rollback: revert isolated PR.
