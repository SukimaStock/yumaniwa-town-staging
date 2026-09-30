// ROJIURA MASALA — replaceable sound manifest
// ------------------------------------------------------------
// The game only refers to these event names. Every event already points to a
// fixed OGG filename in ./sounds/. Files are decoded once into AudioBuffers;
// the synth definition remains as a non-blocking fallback while a file is still
// loading or unavailable. Authored audio can replace placeholders later without
// changing sketch.js.
(function (root) {
  "use strict";

  root.ROJIURA_SOUND_MASTER_VOLUME = 0.58;

  // Drop the authored MP3 files into ./sounds/ with exactly these names.
  // The runtime loops them when ready and falls back to the tiny procedural
  // patterns while a file is missing or still loading.
  root.ROJIURA_BGM_DEFS = Object.freeze({
    normal: Object.freeze({
      id: "bgm_normal",
      file: "sounds/bgm_normal.mp3",
      volume: 0.30,
    }),
    rush: Object.freeze({
      id: "bgm_rush",
      file: "sounds/bgm_rush.mp3",
      volume: 0.32,
    }),
  });

  root.ROJIURA_SOUND_DEFS = Object.freeze({
    pickup: {
      file: "sounds/pickup.ogg",
      volume: 0.16,
      cooldown: 180,
      synth: [
        { frequency: 330, endFrequency: 440, duration: 0.055, type: "square", volume: 0.020 },
        { delay: 0.055, frequency: 440, endFrequency: 560, duration: 0.070, type: "triangle", volume: 0.022 },
      ],
    },

    delivery_hot: {
      file: "sounds/delivery-hot.ogg",
      volume: 0.17,
      cooldown: 55,
      synth: [
        { frequency: 610, endFrequency: 820, duration: 0.070, type: "square", volume: 0.026 },
        { delay: 0.045, frequency: 880, endFrequency: 1040, duration: 0.065, type: "triangle", volume: 0.020 },
      ],
    },

    delivery_warm: {
      file: "sounds/delivery-warm.ogg",
      volume: 0.14,
      cooldown: 55,
      synth: [
        { frequency: 470, endFrequency: 560, duration: 0.070, type: "triangle", volume: 0.020 },
      ],
    },

    delivery_cool: {
      file: "sounds/delivery-cool.ogg",
      // COOL was getting masked by the BGM on an actual phone. Keep its
      // character softer than HOT, but make the result unmistakably audible.
      volume: 0.22,
      cooldown: 55,
      synth: [
        { frequency: 360, endFrequency: 315, duration: 0.085, type: "triangle", volume: 0.018 },
      ],
    },

    delivery_cold: {
      file: "sounds/delivery-cold.ogg",
      volume: 0.13,
      cooldown: 55,
      synth: [
        { frequency: 280, endFrequency: 210, duration: 0.100, type: "square", volume: 0.014 },
      ],
    },

    // Legacy asset/id: now used for the near-RUSH soft-streak cue rather than
    // literally requiring three consecutive HOT deliveries.
    hot_streak_3: {
      file: "sounds/hot-streak-3.ogg",
      volume: 0.16,
      cooldown: 240,
      synth: [
        { frequency: 700, endFrequency: 760, duration: 0.045, type: "square", volume: 0.020 },
        { delay: 0.055, frequency: 840, endFrequency: 930, duration: 0.050, type: "square", volume: 0.022 },
        { delay: 0.110, frequency: 1040, endFrequency: 1160, duration: 0.070, type: "triangle", volume: 0.024 },
      ],
    },

    rush_start: {
      file: "sounds/rush-start.ogg",
      volume: 0.22,
      cooldown: 600,
      synth: [
        { frequency: 240, endFrequency: 480, duration: 0.110, type: "square", volume: 0.030 },
        { delay: 0.085, frequency: 480, endFrequency: 880, duration: 0.150, type: "triangle", volume: 0.034 },
        { delay: 0.190, frequency: 980, endFrequency: 1220, duration: 0.100, type: "square", volume: 0.024 },
      ],
    },

    rush_extend: {
      file: "sounds/rush-extend.ogg",
      volume: 0.12,
      cooldown: 100,
      synth: [
        { frequency: 760, endFrequency: 900, duration: 0.045, type: "triangle", volume: 0.015 },
      ],
    },

    reheat: {
      file: "sounds/reheat.ogg",
      volume: 0.16,
      cooldown: 400,
      synth: [
        { frequency: 260, endFrequency: 620, duration: 0.120, type: "sawtooth", volume: 0.016 },
        { delay: 0.080, frequency: 620, endFrequency: 720, duration: 0.070, type: "triangle", volume: 0.018 },
      ],
    },

    bike_hit: {
      file: "sounds/bike-hit.ogg",
      volume: 0.20,
      cooldown: 500,
      synth: [
        { frequency: 170, endFrequency: 85, duration: 0.135, type: "square", volume: 0.030 },
        { delay: 0.035, frequency: 290, endFrequency: 120, duration: 0.110, type: "sawtooth", volume: 0.016 },
      ],
    },

    night_lost: {
      file: "sounds/night-lost.ogg",
      // Losing a lamp changes the remaining night time, so this cue must read
      // clearly even under the normal BGM.
      volume: 0.30,
      cooldown: 500,
      synth: [
        { frequency: 410, endFrequency: 260, duration: 0.130, type: "triangle", volume: 0.026 },
        { delay: 0.105, frequency: 250, endFrequency: 190, duration: 0.100, type: "triangle", volume: 0.020 },
      ],
    },

    batch_complete: {
      file: "sounds/batch-complete.ogg",
      volume: 0.15,
      cooldown: 180,
      synth: [
        { frequency: 520, endFrequency: 650, duration: 0.055, type: "square", volume: 0.018 },
        { delay: 0.060, frequency: 690, endFrequency: 820, duration: 0.070, type: "triangle", volume: 0.020 },
      ],
    },

    shift_end: {
      file: "sounds/shift-end.ogg",
      volume: 0.18,
      cooldown: 800,
      synth: [
        { frequency: 390, endFrequency: 520, duration: 0.090, type: "triangle", volume: 0.022 },
        { delay: 0.100, frequency: 520, endFrequency: 660, duration: 0.120, type: "triangle", volume: 0.024 },
      ],
    },


    pepper_pickup: {
      // Synth-only events use the per-part volume values below. Keep pickup
      // quieter than READY because several chilies can be collected in a row.
      volume: 0.10,
      cooldown: 55,
      synth: [
        { frequency: 760, endFrequency: 610, duration: 0.035, type: "square", volume: 0.035 },
        { delay: 0.018, frequency: 1080, endFrequency: 820, duration: 0.028, type: "triangle", volume: 0.022 },
      ],
    },

    pepper_ready: {
      volume: 0.15,
      cooldown: 600,
      synth: [
        { frequency: 660, endFrequency: 720, duration: 0.050, type: "square", volume: 0.060 },
        { delay: 0.052, frequency: 880, endFrequency: 960, duration: 0.055, type: "square", volume: 0.065 },
        { delay: 0.106, frequency: 1180, endFrequency: 1260, duration: 0.070, type: "triangle", volume: 0.070 },
      ],
    },

    order_wrong: {
      volume: 0.13,
      cooldown: 180,
      synth: [
        { frequency: 220, endFrequency: 145, duration: 0.095, type: "square", volume: 0.055 },
      ],
    },

    bike_warning: {
      volume: 0.14,
      cooldown: 700,
      synth: [
        { frequency: 920, endFrequency: 900, duration: 0.070, type: "triangle", volume: 0.050 },
        { delay: 0.018, frequency: 1380, endFrequency: 1350, duration: 0.055, type: "triangle", volume: 0.030 },
      ],
    },
  });
})(window);
