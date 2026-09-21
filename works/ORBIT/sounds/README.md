# ORBIT sound replacement guide

ORBIT uses decoded Web Audio buffers for approved OGG cues. Procedural tones remain only as a fallback while a file is still decoding.

## Final OGG filenames

Place approved files in this folder using these exact names:

- `takeoff.ogg`
- `landing.ogg`
- `ore.ogg`
- `data.ogg`
- `fuel.ogg`
- `impact.ogg`
- `echo.ogg`
- `restore.ogg`

Gameplay code always calls the same cue names through `playOrbitCue(name)`.

## Switching from placeholder tones to OGG

In `../sketch.js`, change:

```js
const ORBIT_AUDIO_MODE = "tone";
```

to:

```js
const ORBIT_AUDIO_MODE = "ogg";
```

No event hook needs to be edited.

OGG playback intentionally does **not** use HTMLAudioElement pools. Files are fetched and decoded once, then each cue plays through an AudioBufferSourceNode. This avoids the iPhone stutter/catch behavior previously seen in CoffeeFactory.

## Per-cue volume

Per-cue OGG volume and cooldown are defined in `ORBIT_OGG_SOUNDS` in `sketch.js`.
Adjust those values after listening in the actual game rather than normalizing every file to sound equally loud.

## Current design rule

Keep the soundscape sparse. These cues are for tactile confirmation and story punctuation, not continuous feedback.
HOME auto-refuel is intentionally silent. Collision is throttled by the existing E.V.E. collision cadence.

BGM is intentionally not part of Phase A and should be added separately after the cue pass is approved.


## Phase B procedural cues

These cues currently use Web Audio only. They intentionally do not request missing OGG files.

Reserved future filenames:

- `boot.ogg` — SYSTEM REBOOT low power-on bloom
- `eve_online.ogg` — E.V.E. ONLINE two-note presence
- `terminal.ogg` — HOME terminal open
- `scan.ogg` — DATA ANALYSIS start
- `rescue.ogg` — fuel-out / emergency return
- `weak_signal.ogg` — post-credits ASTRA record signal
- `archive.ogg` — INCIDENT LOG open
- `rebirth.ogg` — REBIRTH completion

When a Phase B file is approved, add its definition to `ORBIT_OGG_SOUNDS` using the same cue name. `playOrbitCue(name)` will automatically prefer the OGG definition and otherwise keep using the procedural fallback.
