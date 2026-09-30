// ROJIURA MASALA — sound adapter
// Authored audio files are decoded once into Web Audio AudioBuffers by SSE.audio.
// Gameplay SFX playback creates lightweight AudioBufferSource nodes; authored BGM
// uses the same decoded buffers with loop=true.
(function (root) {
  "use strict";

  const definitions = root.ROJIURA_SOUND_DEFS || {};
  const bgmDefinitions = root.ROJIURA_BGM_DEFS || {};
  const fileSounds = {};

  // Normal BGM is intentionally registered first so SSE's sequential decoder
  // makes it available as early as possible. It can begin the moment gameplay
  // starts instead of waiting for every short SFX file to finish decoding.
  const normalBgm = bgmDefinitions.normal;
  if (normalBgm && normalBgm.id && normalBgm.file) {
    fileSounds[normalBgm.id] = {
      file: normalBgm.file,
      volume: normalBgm.volume ?? 0.30,
      cooldown: 0,
      playbackRate: 1,
    };
  }

  for (const [name, def] of Object.entries(definitions)) {
    if (!def || !def.file) continue;
    fileSounds[name] = {
      file: def.file,
      volume: def.volume ?? 0.2,
      cooldown: def.cooldown ?? 80,
      playbackRate: def.playbackRate ?? 1,
    };
  }

  // RUSH can decode after the normal loop and the small SFX have started
  // loading; its synth fallback remains available until the MP3 is ready.
  const rushBgm = bgmDefinitions.rush;
  if (rushBgm && rushBgm.id && rushBgm.file) {
    fileSounds[rushBgm.id] = {
      file: rushBgm.file,
      volume: rushBgm.volume ?? 0.32,
      cooldown: 0,
      playbackRate: 1,
    };
  }

  const SOUND_LEVEL_STORAGE_KEY = "rojiura-masala:sound-level";
  const SOUND_LEVEL_VOLUMES = Object.freeze([0, 0.24, 0.40, Number(root.ROJIURA_SOUND_MASTER_VOLUME ?? 0.58)]);

  function loadSoundLevel() {
    try {
      const raw = root.localStorage?.getItem(SOUND_LEVEL_STORAGE_KEY);
      if (raw !== null && raw !== undefined && raw !== "") {
        const saved = Number(raw);
        if (Number.isInteger(saved) && saved >= 0 && saved <= 3) return saved;
      }
      if (root.localStorage?.getItem("rojiura-masala:sound") === "false") return 0;
    } catch (_error) {}
    return 3;
  }

  let soundLevel = loadSoundLevel();

  const audioConfig = {
    masterVolume: SOUND_LEVEL_VOLUMES[soundLevel],
    storageKey: "rojiura-masala:sound",
    sounds: fileSounds,
  };

  const lastSynthPlayed = {};

  // ----------------------------------------------------------
  // Tiny procedural BGM sequencer
  // ----------------------------------------------------------
  // BGM is intentionally sparse and cheap: a few short square/triangle notes,
  // no continuous pad, no reverb, and no always-on loud layer. MASALA RUSH
  // swaps to a faster variation, then returns to the normal loop when it ends.
  let bgmMode = "off";
  let bgmStep = 0;
  let bgmTimer = null;
  let bgmFileSource = null;
  let bgmFileGain = null;
  let bgmFileMode = null;
  let bgmFileStartedAt = 0;
  let bgmFileStartOffset = 0;
  const bgmFilePositions = { normal: 0, rush: 0 };

  const BGM_PATTERNS = Object.freeze({
    normal: Object.freeze({
      stepMs: 170,
      bass: Object.freeze([110, 0, 110, 0, 147, 0, 123, 0, 110, 0, 165, 0, 147, 0, 123, 0]),
      lead: Object.freeze([0, 330, 0, 392, 0, 440, 0, 392, 0, 330, 0, 294, 0, 330, 0, 392]),
    }),
    rush: Object.freeze({
      stepMs: 105,
      bass: Object.freeze([147, 147, 196, 147, 220, 196, 147, 196, 165, 165, 220, 165, 247, 220, 165, 220]),
      lead: Object.freeze([440, 0, 494, 523, 0, 587, 659, 0, 523, 0, 587, 659, 0, 784, 659, 587]),
    }),
  });

  function playBgmTone(frequency, type, volume, duration) {
    if (!frequency || !root.SSE || !root.SSE.audio || typeof root.SSE.audio.tone !== "function") return;
    if (!root.SSE.audio.enabled || root.document?.hidden) return;
    root.SSE.audio.tone({ frequency, duration, type, volume });
  }

  function tickBgm() {
    const pattern = BGM_PATTERNS[bgmMode];
    if (!pattern) return;
    const index = bgmStep % pattern.bass.length;
    const bass = pattern.bass[index];
    const lead = pattern.lead[index];

    if (bgmMode === "rush") {
      playBgmTone(bass, "square", 0.0065, 0.075);
      if (lead) playBgmTone(lead, "square", 0.0052, 0.060);
    } else {
      playBgmTone(bass, "triangle", 0.0048, 0.095);
      if (lead) playBgmTone(lead, "square", 0.0038, 0.055);
    }
    bgmStep += 1;
  }

  function stopProceduralBgm() {
    if (bgmTimer) root.clearInterval(bgmTimer);
    bgmTimer = null;
  }

  function startProceduralBgm() {
    stopProceduralBgm();
    const pattern = BGM_PATTERNS[bgmMode];
    if (!pattern) return;
    tickBgm();
    bgmTimer = root.setInterval(tickBgm, pattern.stepMs);
  }

  function stopAuthoredBgm(rememberPosition = true) {
    if (rememberPosition && bgmFileSource && bgmFileMode) {
      const ctx = root.SSE && root.SSE.audio && root.SSE.audio.ctx;
      const duration = Number(bgmFileSource.buffer && bgmFileSource.buffer.duration) || 0;
      if (ctx && duration > 0) {
        const elapsed = Math.max(0, ctx.currentTime - bgmFileStartedAt);
        bgmFilePositions[bgmFileMode] = (bgmFileStartOffset + elapsed) % duration;
      }
    }

    if (bgmFileSource) {
      try { bgmFileSource.stop(); } catch (_error) {}
      try { bgmFileSource.disconnect(); } catch (_error) {}
    }
    if (bgmFileGain) {
      try { bgmFileGain.disconnect(); } catch (_error) {}
    }
    bgmFileSource = null;
    bgmFileGain = null;
    bgmFileMode = null;
    bgmFileStartedAt = 0;
    bgmFileStartOffset = 0;
  }

  function startAuthoredBgm(mode) {
    const def = bgmDefinitions[mode];
    if (!def || !def.id || !root.SSE || !root.SSE.audio) return false;
    const audio = root.SSE.audio;
    const buffer = audio.buffers && audio.buffers[def.id];
    if (!buffer) return false;
    const ctx = typeof audio.ensureContext === "function" ? audio.ensureContext(false) : audio.ctx;
    if (!ctx || !audio.masterGain) return false;

    try {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = Math.max(0, Math.min(1, Number(def.volume ?? (mode === "rush" ? 0.32 : 0.30))));
      source.connect(gain);
      gain.connect(audio.masterGain);

      const duration = Number(buffer.duration) || 0;
      const savedOffset = Math.max(0, Number(bgmFilePositions[mode]) || 0);
      const startOffset = duration > 0 ? savedOffset % duration : 0;
      source.start(0, startOffset);
      bgmFileSource = source;
      bgmFileGain = gain;
      bgmFileMode = mode;
      bgmFileStartedAt = ctx.currentTime;
      bgmFileStartOffset = startOffset;
      return true;
    } catch (_error) {
      stopAuthoredBgm();
      return false;
    }
  }

  function restartBgmPlayback(rememberPrevious = true) {
    stopProceduralBgm();
    stopAuthoredBgm(rememberPrevious);
    if (bgmMode === "off") return;
    if (!startAuthoredBgm(bgmMode)) startProceduralBgm();
  }

  function setBgmMode(mode) {
    const validMode = !!(BGM_PATTERNS[mode] || bgmDefinitions[mode]);
    const next = validMode ? mode : "off";

    // playScene asks for the current mode every frame. If we started on the
    // procedural fallback while an MP3 was decoding, promote to the authored
    // loop as soon as its AudioBuffer becomes ready without needing a scene
    // transition.
    if (next === bgmMode) {
      if (next !== "off" && !bgmFileSource) {
        if (startAuthoredBgm(next)) stopProceduralBgm();
      }
      return bgmMode;
    }

    const goingOff = next === "off";
    bgmMode = next;
    bgmStep = 0;
    restartBgmPlayback(!goingOff);
    if (goingOff) {
      bgmFilePositions.normal = 0;
      bgmFilePositions.rush = 0;
    }
    return bgmMode;
  }

  function nowMs() {
    return (root.performance && typeof root.performance.now === "function")
      ? root.performance.now()
      : Date.now();
  }

  function playSynth(name, def, options) {
    if (!root.SSE || !root.SSE.audio || typeof root.SSE.audio.tone !== "function") return false;
    if (!root.SSE.audio.enabled) return false;
    const opts = options || {};
    const cooldown = Number(opts.cooldown ?? def.cooldown ?? 80);
    const now = nowMs();
    if (!opts.force && lastSynthPlayed[name] && now - lastSynthPlayed[name] < cooldown) return false;
    lastSynthPlayed[name] = now;
    const parts = Array.isArray(def.synth) ? def.synth : [];
    if (!parts.length) return false;
    const volumeScale = Number.isFinite(Number(opts.volumeScale)) ? Number(opts.volumeScale) : 1;
    for (const part of parts) {
      const fire = () => root.SSE.audio.tone({
        frequency: part.frequency,
        endFrequency: part.endFrequency,
        duration: part.duration,
        type: part.type,
        volume: Math.max(0.0001, Number(part.volume ?? 0.02) * volumeScale),
      });
      const delay = Math.max(0, Number(part.delay) || 0);
      if (delay > 0) root.setTimeout(fire, delay * 1000);
      else fire();
    }
    return true;
  }

  function play(name, options) {
    const def = definitions[name];
    if (!def || !root.SSE || !root.SSE.audio) return false;

    // Ready OGGs play from decoded memory. If a file has not finished decoding
    // yet (or is unavailable), use the tiny synth fallback without blocking
    // the gameplay frame.
    if (def.file && typeof root.SSE.audio.play === "function") {
      const fileState = typeof root.SSE.audio.status === "function"
        ? root.SSE.audio.status(name)
        : "unknown";
      const played = root.SSE.audio.play(name, options || {});
      if (played) return true;
      // A decoded file that declines playback is usually inside its cooldown
      // window. Do not bypass that limiter by firing the synth fallback.
      if (fileState === "ready") return false;
    }
    return playSynth(name, def, options || {});
  }

  function applySoundLevel(level, persist = true) {
    soundLevel = Math.max(0, Math.min(3, Math.round(Number(level) || 0)));
    const volume = SOUND_LEVEL_VOLUMES[soundLevel];

    if (persist) {
      try {
        root.localStorage?.setItem(SOUND_LEVEL_STORAGE_KEY, String(soundLevel));
      } catch (_error) {}
    }

    if (root.SSE && root.SSE.audio) {
      root.SSE.audio.masterVolume = volume;
      if (root.SSE.audio.masterGain) root.SSE.audio.masterGain.gain.value = volume;
      root.SSE.audio.setEnabled(soundLevel > 0);
    } else {
      try {
        root.localStorage?.setItem("rojiura-masala:sound", soundLevel > 0 ? "true" : "false");
      } catch (_error) {}
    }

    audioConfig.masterVolume = volume;
    return soundLevel;
  }

  root.RojiuraSound = Object.freeze({
    definitions,
    bgmDefinitions,
    audioConfig,
    play,
    fileStatus(name) {
      if (root.SSE && root.SSE.audio && typeof root.SSE.audio.status === "function") {
        return root.SSE.audio.status(name);
      }
      return "synth";
    },
    setEnabled(value) {
      if (value) applySoundLevel(soundLevel > 0 ? soundLevel : 3);
      else applySoundLevel(0);
    },
    isEnabled() { return soundLevel > 0; },
    getLevel() { return soundLevel; },
    setLevel(level) { return applySoundLevel(level); },
    cycleLevel() { return applySoundLevel(soundLevel <= 0 ? 3 : soundLevel - 1); },
    setBgmMode,
    getBgmMode() { return bgmMode; },
    getBgmSource() { return bgmFileMode ? "file" : (bgmMode === "off" ? "off" : "procedural"); },
  });
})(window);
