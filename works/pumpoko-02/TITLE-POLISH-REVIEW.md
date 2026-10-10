# PUMPOKO 02｜Title polish review

Base: `db2dd9eca49add0bf0434ba75955bc6d45712a5e`; staging only.

## Change

Only `title-draw.js` runtime changed: existing SVG logo display grows 6% and rises 3 px, with a 2.2 px slow floating motion. Fallback font grows proportionately. Shadow alpha increases modestly. Existing idle-only twitch amplitude and onset curve are slightly more visible, without new input/state/physics. Bottom credit becomes `SUKIMA STOCK`, centered at the same baseline with 12 px Avenir Next / Segoe UI / sans-serif and individual glyph spacing of 1.55 px.

No new 'TAP TO START' text. No asset, story, physics, audio, Engine, Codea or production changes.

## Checks

- Code review confirms `title-draw.js` is the only changed executable and a READY Plan Lock was committed first.
- Static syntax, scope/risk/impact trusted checks and regression runs: verify on CI exact PR head; don't assume without results.
- Native before/after screenshot and iPhone actual gesture, layout, sound, title return: not independently captured; remain UNVERIFIED.
- Rollback: revert isolated staging PR.
