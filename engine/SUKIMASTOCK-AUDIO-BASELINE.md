# SukimaStock Audio Baseline

Updated: 2026-09-22

## Purpose

This baseline exists because AI-assisted implementation repeatedly started audio too quietly, causing the author to perform the same correction over and over:

```text
AI chooses conservative gain
→ real-device test is too quiet
→ author raises it
→ repeat in the next work
```

That repetition is now treated as removable production friction.

The baseline is derived from CoffeeFactory after repeated real-device tuning.

The rule is:

> Start from a clearly audible level, then reduce only the sounds that are actually too loud.

Do **not** start every new sound conservatively and make the author raise everything again.

## Important compatibility rule

The baseline is opt-in.

Existing works must not become louder merely because Engine is updated.

Use it for:

- new works
- new audio systems
- newly added sounds
- deliberate audio retuning

Do not bulk-apply it to finished works without a real listening pass.

## Runtime helper

For new work configuration:

```js
audio: SSE.audio.withBaseline({
  storageKey: "my-work.sound",
  sounds: {
    select: {
      file: "./audio/select.wav",
      mode: "buffer",
      volume: SSE.audio.baseline().reference.se.ui,
    },
  },
  music: {
    bgm: {
      file: "./audio/bgm.mp3",
      loop: true,
      volume: SSE.audio.baseline().reference.bgm.calm,
    },
  },
})
```

`withBaseline()` starts the three Engine buses at:

```text
masterVolume = 1.00
musicVolume  = 1.00
seVolume     = 1.00
```

This avoids accidental double attenuation such as:

```text
master 0.70 × SE bus 0.70 × sound 0.40 = 0.196
```

when no such reduction was intentionally designed.

## Reference starting points

These are authoring starting points, not universal mixing rules.

### BGM

Derived from CoffeeFactory real-device levels, raised roughly 10–15% for new-work starting points:

```text
quiet   0.075
calm    0.135
active  0.225
finish  0.270
```

Interpretation:

- `quiet`: opening, setup, sparse screen
- `calm`: ordinary low-key working state
- `active`: main interaction / gameplay / brewing state
- `finish`: result or completion state that may carry a little more presence

A work may use entirely different levels. These values exist to prevent an unnecessarily quiet first pass.

### SE

Reference starting points:

```text
soft      0.24
ui        0.36
action    0.46
cue       0.68
emphasis  0.75
```

Interpretation:

- `soft`: steam, ambience-adjacent texture, subtle mechanical sound
- `ui`: ordinary selection / step / button feedback
- `action`: machinery, movement, meaningful interaction
- `cue`: timing cue, state transition, important feedback
- `emphasis`: completion or one-shot event that must be clearly heard

These values should still be adjusted for the source file itself. A mastered loud WAV may need less gain than a quiet recording.

## AI implementation rule

When ChatGPT/Astra adds audio to a SukimaStock work:

1. Do not choose a low gain merely because it seems "safe."
2. Start from this baseline unless the work already has a proven audio reference.
3. Prefer bus levels near 1.0 and tune individual sounds intentionally.
4. Compare on the real target device.
5. If one sound is intrusive, lower that sound rather than lowering the entire mix.
6. Preserve proven per-work values during migrations.
7. Never normalize an existing finished work to this baseline automatically.

The desired workflow is:

```text
audible first pass
→ real-device listen
→ subtract where needed
```

not:

```text
quiet first pass
→ raise everything repeatedly
```

## CoffeeFactory remains the reference work

CoffeeFactory is the current practical reference because its BGM and SE were repeatedly adjusted on a real iPhone and then migrated to canonical Audio v2 without changing their effective loudness.

Its current production-tuned values are not automatically rewritten to the slightly louder new-work baseline.

The baseline is a **starting reference for future work**, not a command to remix CoffeeFactory.
