// SukimaStock New Work Starter
// Delete this demo interaction as soon as the real work has a first playable loop.

(function (root) {
  "use strict";

  const WORK = root.SUKIMASTOCK_WORK;
  if (!WORK) throw new Error("SUKIMASTOCK_WORK is missing.");

  const state = {
    x: WORK.logicalWidth * 0.5,
    y: WORK.logicalHeight * 0.5,
    pulse: 0,
  };

  const scene = {
    opaque: true,

    update(dt) {
      state.pulse = Math.max(0, state.pulse - dt * 2.8);
    },

    draw() {
      background(11, 16, 24);

      const pulse = 1 + state.pulse * 0.18;
      noStroke();
      fill(37, 49, 64, 255);
      ellipse(state.x, state.y, 132 * pulse, 132 * pulse);

      fill(221, 229, 231, 225);
      textAlign(CENTER);
      textSize(18);
      text(WORK.title, WORK.logicalWidth * 0.5, WORK.logicalHeight * 0.72);

      fill(155, 169, 177, 185);
      textSize(11);
      text("TOUCH TO START MAKING", WORK.logicalWidth * 0.5, WORK.logicalHeight * 0.26);
    },

    touch(touch) {
      if (touch.state !== BEGAN && touch.state !== MOVING) return true;

      state.x = touch.x;
      state.y = touch.y;

      if (touch.state === BEGAN) {
        state.pulse = 1;

        const baseline = SSE.audio.baseline();
        SSE.audio.tone({
          frequency: 360,
          endFrequency: 470,
          duration: 0.055,
          volume: baseline.reference.se.ui,
        });
      }

      return true;
    },
  };

  SSE.createApp({
    id: WORK.id,
    logicalWidth: WORK.logicalWidth,
    logicalHeight: WORK.logicalHeight,
    frameRate: WORK.frameRate,
    initialScene: "main",
    debug: false,
    pointerMode: "primary",

    // New works begin from the SukimaStock real-device audio baseline.
    // Lower only the sounds that are actually too loud.
    audio: SSE.audio.withBaseline({
      storageKey: WORK.id + ".sound",
    }),

    analytics: {
      enabled: false,
    },

    scenes: {
      main: scene,
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
