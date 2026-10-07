# Phase 2 verification

Formal verificationState: UNVERIFIED (repository policy). Automated checks do not substitute for physical-device or subjective playtesting.

## Runtime and regression

`node --test works/orbit-02/tests/archive.test.cjs tests/test-work-lifecycle.cjs tests/test-work-guide.cjs`: 59 PASS (28 ORBIT 02 state-machine tests, 31 repository regressions).

Tests load the actual DriftWorld in a VM through test-only lexical access; no debug API ships. They cover ja/en recovery without SERA analysis/body, immediate departure, ordinary HOME return voice/boot/receive order, automatic serial analysis, Echo discovery only on completion, quiet deposit then original text, inert repeated replay, deliberate RETURN/WAIT counterpart revisit and one-time persistence, RESTORE report entry separation, interrupted analysis/read CONTINUE, pending-only CONTINUE, actual rescue rollback, MEMORY/checkpoint merge with decoded precedence, legacy/malformed optional fields, storage failure checkpoint, Finale once, independent original save keys, NEW GAME/prologue, original 600-frame flight simulation, RESTORE 1→5 and original Echo texts/planets/MiniMap/Engine/Codea/ritual preservation.

`python engine/export-standalone.py works/orbit-02/standalone-export.json --check`: PASS. The work retains its own entry, relative resources and original canonical development Engine path; standalone export supplies local Engine.

## Canvas layout

`node works/orbit-02/tests/render.cjs <output-directory>` (requires @napi-rs/canvas): 16 offscreen 360×640 frames using the unchanged copied Codea adapter, ja/en browse, three Archive pages, memory focus, analysis, deposit and cross-page invitation. English layout visually inspected. Original Echo overlay remains above the persistent HOME frame; controls remain inside the logical phone canvas. Japanese glyph quality is not certified by this backend, which lacks Japanese fonts.

## Manual device follow-up

Actual iPhone Safari, touch feel, sound playback and the subjective desire to return HOME remain UNVERIFIED. On the deployed staging URL:

1. NEW GAME; reach SERA, recover DATA and depart immediately. Contents remain unknown.
2. Return HOME: short voice, boot, DATA RECEIVED, automatic analysis, ECHO DETECTED, Archive light, original memory.
3. Replay from the terminal's Archive row; check no resource/count changes, all pages, return to Archive and launch.
4. Confirm RETURN and WAIT; verify no immediate link. Revisit one, then the softly invited counterpart: one link/short phrase. CONTINUE preserves it.
5. CONTINUE during carried DATA, analysis and body; try rescue before voluntary return. Pending/decoded/interpreted stay distinct.
6. RESTORE through level 5 and Finale once, ja/en, portrait/landscape.

Staging: https://sukimastock.github.io/yumaniwa-town-staging/works/orbit-02/
