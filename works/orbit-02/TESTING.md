# Phase 1 verification

Formal verificationState: UNVERIFIED (repository policy). Unit/mechanical success is not release completion.

## Automated runtime tests

`node --test works/orbit-02/tests/archive.test.cjs`: 17 PASS, 0 FAIL.

Actual `DriftWorld` loaded in an isolated VM with test-only lexical access (no shipped debug API). Covers ja/en SERA analysis/discovery, original text playback, HOME-only interpretation, repeated replay without resource/log/count/first-reaction changes, page/touch/cancel/launch isolation, one RETURN/WAIT resonance and CONTINUE, newer MEMORY/older HOME and rescue merges, legacy schemas, malformed indices, final Echo gate and one-time Finale trigger, separate saves/NEW GAME/prologue handoff, storage failure checkpoint, original flight simulation, RESTORE 1→5 spending/caps/departure voice, original planets/MiniMap/Echo text and byte-identical Engine/Codea/ritual copies.

`python engine/export-standalone.py works/orbit-02/standalone-export.json --check`: PASS. ZIP built and inspected for local Engine, ja/en, runtime and sounds; no old-work dependency except the canonical development Engine path (export rewrites it to the local Engine).

## Canvas QA

`node works/orbit-02/tests/render.cjs /tmp/orbit-02-render` requires `@napi-rs/canvas`.

Ten 360×640 offscreen frames rendered with the exact copied Codea adapter. Inspected browse, three Archive pages and original Echo overlay. Terminal/rows/buttons fit the logical iPhone-width canvas; replay overlay is unobstructed. English layouts visually checked. Japanese glyph rendering cannot be certified by this offscreen backend: Japanese system fonts are absent. Text-key parity, authored line preservation and short new strings are mechanically checked.

## Browser / physical device — UNVERIFIED

Playwright launch attempted: Chromium executable missing. Installation attempted: browser download was not a valid ZIP. No browser/Safari/PWA/audio/network claims are inferred from VM or offscreen Canvas evidence.

After checkout/branch preview (or a separately authorized staging merge), verify on iPhone Safari:

1. NEW GAME, short flight, SERA landing and DATA ANALYSIS: original Echo text appears; its present-day interpretation does not.
2. Return HOME, wait for existing boot, tap ECHO ARCHIVE. Faint mark identifies pending memories; dim slots do not play. Check ja and en, page arrows and BACK.
3. Tap a memory: original overlay plays, Terminal returns, one first interpretation is heard. Repeat: resource amounts/Echo count/first events remain unchanged. Close and launch normally.
4. Interpret Echo 2 and 7: matching faint marks and one short E.V.E. phrase. Reopen/replay/CONTINUE: phrase does not repeat.
5. CONTINUE before/after an interrupted reading, and after HOME interpretation. Echo count/read/interpretation/link restore correctly. Old-shaped data in the dedicated namespace migrates without damaging the Game Jam edition.
6. RESTORE through level 5; post-RESTORE report still opens Archive. Echo 12 HOME confirmation enables the unchanged Finale once. Completed Echo 12 replay does not restart it.

Staging URL after an authorized merge/deployment:
https://sukimastock.github.io/yumaniwa-town-staging/works/orbit-02/

Draft PR alone does not deploy this URL.
