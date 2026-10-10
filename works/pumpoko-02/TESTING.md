# Opening integration evidence

Formal verificationState remains **UNVERIFIED**. Automated results do not certify actual device perception or production release.

## Automated checks

- `node --expose-gc --test --test-reporter=tap works/pumpoko-02/tests/story.test.cjs`: 16 integration cases. Original opening motion/camera agrees exactly until first real rooting at 30/60/120fps when supplied the same adapted contact geometry; initial title→opening projected seed positions agree. Different incoming velocities produce different actual roots. Recorded contact, immutable positions, root-to-body contact seating, same art identity, continuous grown-fruit projection, camera travel through every actual rooting event, unchanged lab integration from the new actual birth pose and four real handoffs are checked.
- The same suite covers primary touch, interruption/reset/replay, logical portrait/landscape native rendering, ending/title return, single RAF, single music player and media lifecycle doubles.
- 196 related cases: physics lab, original ending/audio, canonical Engine input/audio lifecycle, work lifecycle and world consistency.
- Protected file bytes and adopted pumpkin/rutabaga function bytes are compared with #184. Playing/coast/ending/return block is compared byte-for-byte; original/common files have no diff.
- Scope → Risk → Impact and trusted-base static checks run against the published exact PR head; GitHub required checks must pass before staging merge. Evidence SHAs and results are recorded in the PR.

Native rendering jobs should run serially: a combined run of the full native suite and exporters exhausted the test process's memory; the complete suite is rerun alone. This resource failure is separate from an assertion result.

## Reproduce the visual comparison

Run serially (requires `@napi-rs/canvas` and ffmpeg/ffprobe):

```sh
node --expose-gc works/pumpoko-02/tests/opening-film.cjs
node --expose-gc works/pumpoko-02/tests/opening-review.cjs
node --expose-gc works/pumpoko-02/tests/render-review.cjs
```

The comparison runs actual read-only original scenes, exact #184 (`7a5fadefc589bcf5b743ee86ac35a104df8ad9da`), and the revision. All three use the same moving pointer gesture and align at nine actual detachments. The video preserves native elapsed time: 60Hz updates, 15fps capture, 14 seconds / 210 frames, .8-second initial title still, no audio. It checks entry reaches play without any WORLD LOOP handoff during the opening comparison. Sequential frames show 0–13 seconds after detachment. Five-scene stills use each version's actual timing, not position-matched screenshots.

## Actual iPhone review still needed

- Does the continuously moving seed/cut camera restore the feeling of entering the pumpkin?
- Can falling, settling, sprouting and one fruit's roll be followed as one event, without artificial positioning?
- Is the longer original opening plus local growth comfortable on the portrait screen? Can the selected fruit be found naturally?
- Verify actual touch recovery, all four handoffs, unchanged play scale, ending/title replay, rotation/background/return, and audible single BGM/sounds in Safari.

No iPhone, Safari, audible output or subjective artistic success has been marked PASS.
