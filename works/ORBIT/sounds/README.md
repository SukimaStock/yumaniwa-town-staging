# ORBIT sound replacement guide

ORBIT currently uses procedural Web Audio tones for Phase A sound testing.

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

## Per-cue volume

Per-cue OGG volume and cooldown are defined in `ORBIT_OGG_SOUNDS` in `sketch.js`.
Adjust those values after listening in the actual game rather than normalizing every file to sound equally loud.

## Current design rule

Keep the soundscape sparse. These cues are for tactile confirmation and story punctuation, not continuous feedback.
HOME auto-refuel is intentionally silent. Collision is throttled by the existing E.V.E. collision cadence.

BGM is intentionally not part of Phase A and should be added separately after the cue pass is approved.
