// Canonical ORBIT sound configuration.
// This file is the runtime source of truth for ORBIT Sound Lab and the game.
// Cues omitted here intentionally fall back to procedural Web Audio.
window.ORBIT_SOUND_CONFIG = Object.freeze({
  takeoff: Object.freeze({ file: "sounds/takeoff.ogg", volume: 0.14, cooldown: 120 }),
  landing: Object.freeze({ file: "sounds/landing.ogg", volume: 0.14, cooldown: 120 }),
  ore: Object.freeze({ file: "sounds/ore.ogg", volume: 0.10, cooldown: 100 }),
  data: Object.freeze({ file: "sounds/data.ogg", volume: 0.11, cooldown: 120 }),
  fuel: Object.freeze({ file: "sounds/fuel.ogg", volume: 0.28, cooldown: 140 }),
  impact: Object.freeze({ file: "sounds/impact.ogg", volume: 0.16, cooldown: 350 }),
  echo: Object.freeze({ file: "sounds/echo.ogg", volume: 0.14, cooldown: 300 }),
  restore: Object.freeze({ file: "sounds/restore.ogg", volume: 0.15, cooldown: 500 }),
  boot: Object.freeze({ file: "sounds/boot.ogg", volume: 0.12, cooldown: 400 }),
  eve_online: Object.freeze({ file: "sounds/eve_online.ogg", volume: 0.12, cooldown: 180 }),
  terminal_open: Object.freeze({ file: "sounds/terminal_open.ogg", volume: 0.12, cooldown: 160 }),
  scan: Object.freeze({ file: "sounds/scan.wav", volume: 0.12, cooldown: 250 }),
  rescue: Object.freeze({ file: "sounds/rescue.ogg", volume: 0.12, cooldown: 900 }),
  rebirth: Object.freeze({ file: "sounds/rebirth.wav", volume: 0.12, cooldown: 900 }),
  diagnostic: Object.freeze({ file: "sounds/diagnostic.wav", volume: 0.10, cooldown: 80 }),
  restore_link: Object.freeze({ file: "sounds/restore_link.ogg", volume: 0.12, cooldown: 500 }),
  takeoff_power: Object.freeze({ file: "sounds/takeoff_power.ogg", volume: 0.12, cooldown: 120 }),
  ambient_drone: Object.freeze({ file: "sounds/ambient_drone.wav", volume: 0.45, cooldown: 0 }),
});

// Intentionally procedural until a correct file is explicitly re-approved:
// weak_signal, archive, terminal_boot
