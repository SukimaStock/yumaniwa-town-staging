# SukimaStock New Work Starter

This is the general starter for games and interactive Web works that use SukimaStock Engine.

Do not confuse it with `works/_template`, which is the separate Rakugaki Engine template.

## Recommended start

For the rough local phase, use the generated self-contained starter ZIP rather than copying this repository folder manually.

The local ZIP contains:

```text
index.html
style.css
work-config.js
codea-lite.js
sketch.js
sukimastock-engine.js   <- frozen local starter snapshot
assets/
sounds/
```

Edit `work-config.js` first:

```js
window.SUKIMASTOCK_WORK = Object.freeze({
  id: "my-new-game",
  title: "MY NEW GAME",
  logicalWidth: 390,
  logicalHeight: 844,
  frameRate: 60,
});
```

Then change `sketch.js` freely.

The initial touch demo is disposable. It exists only to prove that rendering, touch and audible audio are working.

## Production phases

### 1. Local rough build

Stay local while large structural changes are frequent.

Focus on:

- the core interaction
- the main loop
- scene structure
- basic controls
- whether the work is worth continuing

Do not spend time repeatedly auditing FPS, browser lifecycle or final packaging yet.

### 2. First playable loop

Move to Staging when the work can be played through one meaningful loop.

Examples:

```text
title -> play -> result
title -> depart -> explore -> return
setup -> action -> finish
```

This is the handoff point from "build quickly" to "touch and refine."

See `STAGING-HANDOFF.md`.

### 3. Staging refinement

On Staging:

```text
Push
-> iPhone Safari
-> ?dev=1
-> Session Report when useful
-> refine
-> repeat
```

Staging automatically cache-busts `work-config.js` and `sketch.js`, so a browser should not silently keep an older work script after a Push.

### 4. Engine feedback

If you notice:

> I am doing this again.

do not immediately add it to the Engine.

First ask whether it is:

- browser/runtime infrastructure
- repeated across multiple works
- removable without taking tuning freedom away from the work

Only then promote it.

### 5. Release

Yumaniwa-only work:

- keep the canonical Engine reference

Standalone/itch work:

- add/update `standalone-export.json`
- use `engine/export-standalone.py`
- test the generated artifact itself once before upload

The exported work receives a frozen copy of the current canonical Engine.

## Audio

New works start from:

```text
SSE.audio.withBaseline(...)
```

This is intentionally on the audible side and is derived from CoffeeFactory real-device tuning.

The rule is:

```text
audible first
-> listen on the real device
-> lower only what is intrusive
```

Do not restart the old pattern of making every sound conservative and raising everything repeatedly.

## DevTools

Use:

```text
?dev=1
```

when the work has reached Staging.

DevTools should help answer questions such as:

- is the frame rate actually unhealthy?
- did Storage persist?
- did an asset finish loading?
- did Safari lifecycle recovery work?
- is input stuck?
- did audio unlock?

It is not a replacement for judging the work by touch.
