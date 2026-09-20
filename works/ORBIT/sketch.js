// ORBIT — Phase 14 / OPEN UNIVERSE v2.5
// New Web implementation grown from the accepted DRIFT + ORBIT + HARVEST feel.
// Scope: accepted flight foundation + MiniMap + restored Station/Ship visuals + five RESTORE rituals.
// Still no missions, full upgrade tree, shop, corrupted logs, or forced ending screen.

(function () {
  "use strict";

  const TX = window.OrbitText;
  if (!TX || !TX.isReady()) throw new Error("ORBIT text must be loaded before sketch.js");
  const tx = (key, vars) => TX.t(key, vars);
  const txValue = (key) => TX.get(key);

  // ------------------------------------------------------------
  // Preservation lock
  // ------------------------------------------------------------
  // These values are copied from the original ORBIT source as the first
  // calibration baseline. They are deliberately kept separate from later
  // tuning values so that "improvement" never silently replaces preservation.
  const SOURCE_LOCK = Object.freeze({
    fixedHz: 60,
    maxSpeed: 460,
    maxAccel: 900,
    tiltGain: 16,
    thrustMultiplier: 26,
    shipInitDamp: 0.996,
    openSpaceDamp: 0.991,
    swirlBase: 0.18,
    radialDamping: 0.22,
    repelK: 80,
    repelFriction: 0.85,
    hardRepelThreshold: 150,
    hardRepelBounce: 1.5,
    snapTangK: 0.55,
    snapRadK: 0.35,
    defaultCore: 34,
    defaultSoft: 40,
    defaultPower: 2.0,
    starSectorSize: 1536,
    starsPerSector: 120,
    starParallax: 0.78,
    starSizeMin: 1.0,
    starSizeMax: 2.0,
    starAlphaMin: 150,
    starAlphaMax: 230,
    starSeed: 13579,
    background: [8, 10, 16],
    shipVisualDiameter: 28,
    trailSpawnHz: 60,
    trailLifetime: 0.1,
    trailMax: 10,
  });

  // ------------------------------------------------------------
  // Calibration options
  // ------------------------------------------------------------
  // Default behavior reproduces the executable condition in the source:
  // swirl is added when shipVel · dir < 0 (moving away from the planet),
  // even though the Lua comment says "when approaching".
  const QUERY = new URLSearchParams(window.location.search);
  const DEBUG = QUERY.get("debug") === "1";
  const SWIRL_MODE = QUERY.get("swirl") === "approach" ? "approach" : "source";
  // Author-verified control feel (2026-09-17): touch marks the thruster side.
  // The pod is pushed away from the finger; the camera stays locked to the pod,
  // so the world scrolls toward the finger / backward relative to travel.
  // ?control=target keeps the first reconstruction for A/B comparison only.
  const CONTROL_MODE = QUERY.get("control") === "target" ? "target" : "thruster";

  // v0.3: Web ORBIT becomes a new implementation rather than a literal port.
  // Keep a source-like profile for A/B comparison with ?physics=source.
  const PHYSICS_PROFILE = QUERY.get("physics") === "source" ? "source" : "web";
  const WEB_FEEL = Object.freeze({
    maxSpeed: 520,
    maxAccel: 900,
    tiltGain: 16,
    thrustMultiplier: 26,
    openSpaceDamp: 0.9980,
    planetDampBase: 0.9980,
    planetDampNearBonus: 0.0010,
    gravityScale: 180,
    swirlBase: 0.10,
    radialDamping: 0.10,
    snapTangK: 0.18,
    snapRadK: 0.12,
    // v2.2: while the player is actively thrusting, gently rotate the existing
    // velocity toward the thrust direction. Releasing touch restores pure drift.
    turnAssistPerSec: 1.6,
    turnAssistMinSpeed: 40,
    turnAssistFullSpeed: 260,
  });

  // Phase 3 keeps the accepted DRIFT v0.3 flight feel locked.
  // Landing/takeoff timing starts from the original Lua values, but is
  // isolated here so later Web tuning never silently mutates DRIFT.
  const ORBIT_TUNE = Object.freeze({
    // v1.0 landing intent: no broad capture field and no landing tap.
    // A thin marker lives close to the planet; crossing deeper toward the body
    // means "I want to land" and starts the landing sequence automatically.
    landingMarkerRevealRadius: 205,
    landingMarkerRadius: 104,
    landingAssistRadius: 132,
    landingTriggerRadius: 104,
    landingMaxSpeed: 180,
    landingAssistTargetSpeed: 72,
    landingAssistStrength: 2.6,
    landingIntentMinRatio: 0.20,
    landSpringK: 2.2,
    landDamping: 1.65,
    landTargetFactor: 0.62,
    settleHoldSec: 0.12,
    landedAnchorK: 0.9,
    landedAnchorDamp: 2.2,
    takeoffHoldSec: 1.0,
    takeoffImpulse: 120, // preserved as historical/source reference only
    launchSpeed: 330,
    launchDuration: 0.28,
    relandLockSec: 2.0,
    landingTimeScale: 1.0,
    fallbackPlanetRadius: 120,
    landingZoom: 1.2,
  });

  // Phase 12: one RESTORE level now repairs three things at once:
  // home (BASE), E.V.E.'s language layer, and the ship's practical range.
  // Flight feel is deliberately NOT part of progression; speed/turning stay fixed.
  const PROGRESSION_TUNE = Object.freeze({
    // v2.5: FUEL is an expedition clock, not a corridor wall. Each tier gives
    // enough slack for wrong turns and usually lets the player physically reach
    // the next interaction band before they can fully use it.
    levels: Object.freeze({
      1: Object.freeze({ fuelMax: 45,  oreMax: 20, safeRadius: 3720 }),
      2: Object.freeze({ fuelMax: 70,  oreMax: 25, safeRadius: 5790 }),
      3: Object.freeze({ fuelMax: 105, oreMax: 30, safeRadius: 8690 }),
      4: Object.freeze({ fuelMax: 145, oreMax: 30, safeRadius: 12000 }),
      5: Object.freeze({ fuelMax: 190, oreMax: 30, safeRadius: 15720 }),
    }),
    restoreCosts: Object.freeze({
      1: Object.freeze({ ore: 20, data: 2 }),
      2: Object.freeze({ ore: 25, data: 2 }),
      3: Object.freeze({ ore: 30, data: 3 }),
      4: Object.freeze({ ore: 30, data: 3 }),
    }),
  });

  // HOME stays fixed in Phase 12. Keeping it as data avoids scattering the
  // offset through relay/range calculations.
  const HOME_TUNE = Object.freeze({ x: 0, y: -270 });

  // v2.5: LUMA is deliberately NOT progression-gated. Finding a chain of fuel
  // worlds is the space-travel equivalent of sneaking into a high-level RPG
  // area early: the player may reach it, see it, and remember it even when its
  // resources/signals are still beyond the current RESTORE state.
  const LUMA_TUNE = Object.freeze({
    openRelayNetwork: true,
  });

  function relayTierForPosition(x, y) {
    const d = Math.hypot(x - HOME_TUNE.x, y - HOME_TUNE.y);
    for (let level = 1; level <= 5; level += 1) {
      if (d <= PROGRESSION_TUNE.levels[level].safeRadius) return level;
    }
    return 5;
  }

  const RESOURCE_TUNE = Object.freeze({
    fuelStart: 45,
    dataStart: 0,
    dataMax: 12,
    mineTickMin: 0.78,
    mineTickJitter: 0.28,
    mineGainMin: 2,
    mineGainMax: 3,
    dataTickMin: 0.85,
    dataTickJitter: 0.25,
    dataGain: 1,
    refuelTick: 0.72,
    refuelGainFractionMin: 0.08,
    refuelGainFractionMax: 0.12,
  });

  // Fuel is charged by DISTANCE, not by time or speed. A future optional speed
  // module may shorten real-world travel time without secretly changing range.
  const RETURN_TUNE = Object.freeze({
    fuelPer1000: 4.23,
    lowFuelFraction: 0.30,
    baseRefuelTick: 0.45,
    baseRefuelFraction: 0.18,
    rescueDuration: 2.4,
    rescueTeleportAt: 0.72,
    baseReturnNormalSec: 30,
    baseReturnLongSec: 120,
  });

  // Fuel-out is presented like an old CRT losing power: the picture closes to
  // a thin line, drops to black, then HOME slowly returns underneath the dark.
  // The rescue/checkpoint semantics themselves remain unchanged.
  const RESCUE_CRT_TUNE = Object.freeze({
    collapseSec: 0.28,
    lineHoldSec: 0.14,
    postBlackHoldSec: 0.22,
    homeFadeSec: 0.96,
  });

  // Short tap at home advances the shared RESTORE level when the current
  // expedition has brought back enough ORE and DATA. DATA comes one-per-SERA.
  const REPAIR_TUNE = Object.freeze({
    costs: PROGRESSION_TUNE.restoreCosts,
    // BASE has one gesture with two outcomes:
    // release before the 1.0s launch threshold = RESTORE,
    // keep holding through 1.0s = launch.
    // Keep a tiny margin so the launch transition always wins cleanly.
    tapMaxSec: ORBIT_TUNE.takeoffHoldSec - 0.08,
    pulseSec: 1.8,
  });

  // Phase 13: RESTORE is no longer an instant tap. Each step uses the approved
  // source-derived ritual, while the final REBIRTH is part of the Echo 12 finale.
  const RESTORE_RITUAL_BY_LEVEL = Object.freeze({
    1: "wake",
    2: "link",
    3: "memory",
    4: "resonance",
  });

  const STATION_SCALE = 0.60;
  const STATION_MAX_RADIUS = 120;
  const STATION_COLORS = Object.freeze({
    hubFill:[216,222,236,255], hubStroke:[36,42,60,255],
    ring1:[210,218,232,200], ringEdge1:[46,52,70,200],
    ring2:[200,210,230,160], ringEdge2:[46,52,70,160],
    spoke:[70,84,110,180], dockFill:[150,160,180,255], dockStroke:[40,45,62,255],
    beacon:[240,248,255,220], panelFill:[200,208,224,180], panelStroke:[46,52,70,200],
    line:[90,110,150,200],
  });
  const STATION_PRESETS = Object.freeze({
    1:Object.freeze({HubR:28,HubW:2,RingR1:84,RingW1:6,UseRing2:false,SpokeN:3,SpokeW:3,SpokeLen:.94,DockN:0,DockInset:.83,DockW:16,DockH:36,BeaconN:0,BeaconR:3.2,PanelN:4,PanelInset:.95,PanelW:22,PanelH:12,PanelRound:3,PanelAngleOffset:0,LineN:6,LineAngleOffset:0,LineFrom:.70,LineTo:1,LineW:2}),
    2:Object.freeze({HubR:32,HubW:2.2,RingR1:90,RingW1:7,UseRing2:false,SpokeN:4,SpokeW:3.5,SpokeLen:.96,DockN:2,DockInset:.84,DockW:16,DockH:36,BeaconN:6,BeaconR:3.2,PanelN:6,PanelInset:.96,PanelW:24,PanelH:12,PanelRound:3,PanelAngleOffset:0,LineN:8,LineAngleOffset:0,LineFrom:.70,LineTo:1,LineW:2.5}),
    3:Object.freeze({HubR:34,HubW:2.5,RingR1:96,RingW1:8,UseRing2:false,SpokeN:4,SpokeW:4,SpokeLen:.97,DockN:2,DockInset:.85,DockW:18,DockH:40,BeaconN:8,BeaconR:3.6,PanelN:8,PanelInset:.96,PanelW:26,PanelH:14,PanelRound:4,PanelAngleOffset:0,LineN:10,LineAngleOffset:0,LineFrom:.70,LineTo:1.02,LineW:2.5}),
    4:Object.freeze({HubR:36,HubW:2.8,RingR1:100,RingW1:9,UseRing2:false,SpokeN:6,SpokeW:4.2,SpokeLen:.98,DockN:4,DockInset:.84,DockW:18,DockH:42,BeaconN:12,BeaconR:3.8,PanelN:10,PanelInset:.96,PanelW:28,PanelH:14,PanelRound:4,PanelAngleOffset:6,LineN:12,LineAngleOffset:0,LineFrom:.68,LineTo:1.02,LineW:3}),
    5:Object.freeze({HubR:38,HubW:3,RingR1:104,RingW1:9,UseRing2:true,RingR2:120,RingW2:6,SpokeN:8,SpokeW:4,SpokeLen:.985,DockN:4,DockInset:.86,DockW:20,DockH:44,BeaconN:16,BeaconR:4,PanelN:12,PanelInset:.96,PanelW:30,PanelH:16,PanelRound:4,PanelAngleOffset:8,LineN:16,LineAngleOffset:0,LineFrom:.66,LineTo:1.04,LineW:3.2}),
  });

  const SHIP_PRESETS = Object.freeze({
    1:Object.freeze({bodyR:70,body:[206,211,222,255],outline:[45,50,66,255],inner:null,glass:[140,182,240,230],gStroke:2.5}),
    2:Object.freeze({bodyR:70,body:[210,215,226,255],outline:[45,50,66,255],inner:{r:54.6,fill:[235,238,246,120],stroke:[120,130,160,140]},glass:[128,170,230,230],gStroke:2.5}),
    3:Object.freeze({bodyR:70,body:[214,220,232,255],outline:[38,44,62,255],inner:{r:53.2,fill:[238,241,250,130],stroke:[105,120,160,170]},glass:[110,190,240,235],gStroke:2}),
    4:Object.freeze({bodyR:74,body:[222,228,240,255],outline:[36,42,60,255],inner:{r:56.98,fill:[242,246,255,140],stroke:[95,115,160,190]},glass:[96,168,232,235],gStroke:1}),
    5:Object.freeze({bodyR:78,body:[230,236,248,255],outline:[34,40,58,255],inner:{r:62.4,fill:[248,250,255,150],stroke:[90,110,165,210]},inner2:{r:45.24,fill:[255,255,255,70],stroke:[120,150,200,90]},glass:[210,225,255,230],gStroke:2.5}),
  });

  // Echoes are permanent memory fragments found inside recovered DATA.
  // DATA itself remains useful after all 12 Echoes have been recovered, so every
  // fresh SERA still goes through E.V.E.'s analysis step.
  const ECHO_TUNE = Object.freeze({
    total: 12,
    pulseSec: 1.6,
    memorySec: 4.2,
    // DATA first lands as a small HUD pickup. E.V.E. then analyzes the recovered
    // packet before revealing whether an Echo was present.
    memoryRevealDelaySec: 0.78,
    analysisSec: 2.4,
    analysisResultSec: 0.72,
    emptyResultSec: 1.05,
  });

  // Phase 9: returning home is also persistence. Save is intentionally quiet:
  // no manual save screen, no slot management. Meaningful progress writes one
  // browser-local snapshot and CONTINUE restores it.
  const SAVE_TUNE = Object.freeze({
    key: "sukimastock.orbit.web.save.v3",
    schema: 3,
    pulseSec: 1.1,
  });

  // Phase 10: exploration guidance without turning ORBIT into navigation.
  // When no undiscovered SERA is nearby, the screen edge occasionally carries
  // a weak signal from the nearest one. No arrow, no distance, no planet name.
  const SIGNAL_TUNE = Object.freeze({
    quietRadius: 1150,
    maxSearchDistance: 16000,
    searchSectorRadius: 4,
    initialDelay: 3.8,
    interval: 6.2,
    pulseSec: 1.25,
    edgeInset: 15,
    edgeLength: 38,
  });

  const ASTRA_TUNE = Object.freeze({
    idleDelay: 2.8,
    zoomOut: 0.76,
    zoomDuration: 2.0,
    returnZoomDuration: 0.7,
    meteorIntervalMin: 4.5,
    meteorIntervalMax: 9.0,
    meteorLifeMin: 0.85,
    meteorLifeMax: 1.35,
  });

  // RESTORE also repairs the ship's damaged navigation sensor. Nothing is
  // announced in text: the instrument simply sees farther and points HOME
  // with less angular uncertainty as the station comes back online.
  const MINIMAP_RESTORE_TUNE = Object.freeze({
    rangeMul: Object.freeze([0, 1.00, 1.16, 1.34, 1.56, 1.82]),
    directionStepDeg: Object.freeze([0, 90, 60, 45, 22.5, 0]),
  });

  // Phase 8 / STORY FIRST: each Echo now has a fixed narrative position.
  // The planet only decides whether an Echo is new; discovery order decides
  // which memory opens, so the story remains coherent no matter which way
  // the player drifts through the deterministic atlas.
  const ECHO_MEMORIES = txValue("echo.memories");

  // v2.5 OPEN UNIVERSE: the deterministic atlas once again contains real
  // resource worlds. Authored planets remain as guaranteed landmarks, but they
  // are no longer the only correct route. The player can drift in any direction
  // and still encounter SERA / VOX / LUMA.
  const ATLAS_TUNE = Object.freeze({
    sectorSize: 1800,
    planetChance: 0.52,
    seed: 987654,
    maxPerSector: 2,
    activeSectorRadius: 1,
    fixedActiveRadius: 4300,
    originExclusionRadius: 1080,
    minPlanetSpacing: 560,
    ambientFuelMin: 150,
    ambientFuelMax: 240,
    ambientOreMin: 12,
    ambientOreMax: 22,
  });

  // These authored SERA/VOX are retained as guaranteed landmarks so a seed can
  // never become unwinnable. In v2.5 they are peers of procedural resource
  // worlds, not a prescribed route. requiredLevel now means interaction depth:
  // the body is always visible and physically reachable, but a resource world
  // only presents a landing opportunity once the current RESTORE can use it.
  const STORY_SERA_TUNE = Object.freeze([
    Object.freeze({ id: 1,  x: -520,  y: 420,    requiredLevel: 1 }),
    Object.freeze({ id: 2,  x: 1973,  y: 718,    requiredLevel: 1 }),
    Object.freeze({ id: 3,  x: -2703, y: 1893,   requiredLevel: 2 }),
    Object.freeze({ id: 4,  x: 3727,  y: -2610,  requiredLevel: 2 }),
    Object.freeze({ id: 5,  x: 1915,  y: 5262,   requiredLevel: 3 }),
    Object.freeze({ id: 6,  x: -6520, y: -1747,  requiredLevel: 3 }),
    Object.freeze({ id: 7,  x: 1337,  y: -7583,  requiredLevel: 3 }),
    Object.freeze({ id: 8,  x: -5657, y: 6741,   requiredLevel: 4 }),
    Object.freeze({ id: 9,  x: 9750,  y: 1719,   requiredLevel: 4 }),
    Object.freeze({ id: 10, x: -6252, y: -8929,  requiredLevel: 4 }),
    Object.freeze({ id: 11, x: 1089,  y: 12452,  requiredLevel: 5 }),
    Object.freeze({ id: 12, x: 8202,  y: -11714, requiredLevel: 5 }),
  ]);

  // Authored VOX keep their old capacities as guaranteed fallback supply.
  // Procedural VOX now add surplus routes, so these values no longer define an
  // exact economy or a mandatory sequence.
  const STORY_VOX_TUNE = Object.freeze([
    Object.freeze({ id: 1, x: 145,   y: 155,    ore: 20, requiredLevel: 1 }),
    Object.freeze({ id: 2, x: -3162, y: 1238,   ore: 13, requiredLevel: 2 }),
    Object.freeze({ id: 3, x: 4186,  y: -1955,  ore: 12, requiredLevel: 2 }),
    Object.freeze({ id: 4, x: 1257,  y: 5501,   ore: 10, requiredLevel: 3 }),
    Object.freeze({ id: 5, x: -6339, y: -2423,  ore: 10, requiredLevel: 3 }),
    Object.freeze({ id: 6, x: 2026,  y: -7461,  ore: 10, requiredLevel: 3 }),
    Object.freeze({ id: 7, x: -6193, y: 6291,   ore: 10, requiredLevel: 4 }),
    Object.freeze({ id: 8, x: 9628,  y: 2408,   ore: 10, requiredLevel: 4 }),
    Object.freeze({ id: 9, x: -5679, y: -9331,  ore: 10, requiredLevel: 4 }),
  ]);

  const STORY_LUMA_TUNE = Object.freeze([
    Object.freeze({ id: 1, x: 720,    y: -520,  relayTier: 1 }),
    Object.freeze({ id: 2, x: -2858,  y: -1650, relayTier: 2 }),
    Object.freeze({ id: 3, x: 5075,   y: 2367,  relayTier: 3 }),
    Object.freeze({ id: 4, x: -4885,  y: -5822, relayTier: 3 }),
    Object.freeze({ id: 5, x: -8927,  y: 3249,  relayTier: 4 }),
    Object.freeze({ id: 6, x: 11276,  y: -4104, relayTier: 5 }),
  ]);

  // Runtime dialogue now lives in text/<locale>.json. The Japanese file
  // preserves the current five-stage language recovery exactly; other locales
  // can author an equivalent recovery curve without changing game logic.
  const EVE_PHASE_LINES = txValue("eve.phase");
  const EVE_IDLE_LINES = txValue("eve.idle");
  const EVE_LANDING_LINES = txValue("eve.landing");
  const EVE_COLLISION_LINES = txValue("eve.collision");
  const ECHO_ANALYSIS_LINES = txValue("eve.echoAnalysis");
  const ECHO_REACTIONS = txValue("eve.echoReactions");
  const ECHO_RETURN_LINES = txValue("eve.echoReturn");
  const RESTORE_DEPARTURE_LINES = txValue("eve.restoreDeparture");

  const TUNE = {
    fixedHz: SOURCE_LOCK.fixedHz,
    maxSpeed: PHYSICS_PROFILE === "source" ? SOURCE_LOCK.maxSpeed : WEB_FEEL.maxSpeed,
    maxAccel: PHYSICS_PROFILE === "source" ? SOURCE_LOCK.maxAccel : WEB_FEEL.maxAccel,
    tiltGain: PHYSICS_PROFILE === "source" ? SOURCE_LOCK.tiltGain : WEB_FEEL.tiltGain,
    thrustMultiplier: PHYSICS_PROFILE === "source" ? SOURCE_LOCK.thrustMultiplier : WEB_FEEL.thrustMultiplier,
    openSpaceDamp: PHYSICS_PROFILE === "source" ? SOURCE_LOCK.openSpaceDamp : WEB_FEEL.openSpaceDamp,
    planetDampBase: WEB_FEEL.planetDampBase,
    planetDampNearBonus: WEB_FEEL.planetDampNearBonus,
    gravityScale: PHYSICS_PROFILE === "source" ? 1 : WEB_FEEL.gravityScale,
    swirlBase: PHYSICS_PROFILE === "source" ? SOURCE_LOCK.swirlBase : WEB_FEEL.swirlBase,
    radialDamping: PHYSICS_PROFILE === "source" ? SOURCE_LOCK.radialDamping : WEB_FEEL.radialDamping,
    snapTangK: PHYSICS_PROFILE === "source" ? SOURCE_LOCK.snapTangK : WEB_FEEL.snapTangK,
    snapRadK: PHYSICS_PROFILE === "source" ? SOURCE_LOCK.snapRadK : WEB_FEEL.snapRadK,
    turnAssistPerSec: PHYSICS_PROFILE === "source" ? 0 : WEB_FEEL.turnAssistPerSec,
    turnAssistMinSpeed: WEB_FEEL.turnAssistMinSpeed,
    turnAssistFullSpeed: WEB_FEEL.turnAssistFullSpeed,
    starParallax: SOURCE_LOCK.starParallax,
  };

  const W = 360;
  const H = 640;
  const FIXED_DT = 1 / TUNE.fixedHz;
  const TWO_PI = Math.PI * 2;

  // ------------------------------------------------------------
  // Small vector helpers (work-specific; Engine stays untouched)
  // ------------------------------------------------------------
  function v(x = 0, y = 0) { return { x, y }; }
  function add(a, b) { return v(a.x + b.x, a.y + b.y); }
  function sub(a, b) { return v(a.x - b.x, a.y - b.y); }
  function mul(a, s) { return v(a.x * s, a.y * s); }
  function len(a) { return Math.hypot(a.x, a.y); }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }
  function norm(a) {
    const l = len(a);
    return l > 0.000001 ? v(a.x / l, a.y / l) : v(0, 0);
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function smoothstep(e0, e1, x) {
    if (Math.abs(e1 - e0) < 0.000001) return 0;
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // ------------------------------------------------------------
  // Deterministic star field
  // ------------------------------------------------------------
  function lcg(seed) {
    const next = (Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0;
    return [next, next / 4294967296];
  }

  function seedMix(base, sx, sy, i) {
    let s = (base + Math.imul(sx, 73856093) + Math.imul(sy, 19349663) + Math.imul(i, 83492791)) >>> 0;
    if (s < 1) s = 1;
    return s;
  }

  // Position-only hash for the Web starfield. The old sequential LCG made
  // neighboring samples visibly correlate into columns on the 360px canvas.
  // X and Y now use separate avalanche hashes; all visual properties below
  // keep their original LCG sequence unchanged.
  function starPosition01(seed, salt) {
    let x = (seed ^ salt) >>> 0;
    x ^= x >>> 16;
    x = Math.imul(x, 0x7feb352d) >>> 0;
    x ^= x >>> 15;
    x = Math.imul(x, 0x846ca68b) >>> 0;
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  class Starfield {
    constructor() {
      this.sectorSize = SOURCE_LOCK.starSectorSize;
      this.starsPerSector = SOURCE_LOCK.starsPerSector;
      this.parallax = TUNE.starParallax;
      this.cache = new Map();
      this.seed = SOURCE_LOCK.starSeed;
    }

    sectorKey(sx, sy) { return `${sx},${sy}`; }

    buildSector(sx, sy) {
      const S = this.sectorSize;
      const out = [];
      for (let i = 1; i <= this.starsPerSector; i += 1) {
        let s = seedMix(this.seed, sx, sy, i);

        // Keep advancing the original LCG exactly as before so color, alpha
        // and size remain unchanged. Only position comes from independent
        // X/Y hashes to remove the visible column pattern.
        let legacyRx, legacyRy, rc, ra, rs;
        [s, legacyRx] = lcg(s);
        [s, legacyRy] = lcg(s);
        [s, rc] = lcg(s);
        [s, ra] = lcg(s);
        [s, rs] = lcg(s);

        const rx = starPosition01(seedMix(this.seed, sx, sy, i), 0xA341316C);
        const ry = starPosition01(seedMix(this.seed, sx, sy, i), 0xC8013EA4);
        const x = sx * S + rx * S;
        const y = sy * S + ry * S;

        const c1 = { r: 190 + rc * 50, g: 210 + rc * 35, b: 255 };
        const c2 = { r: 255, g: 242, b: 220 + rc * 25 };
        const mix = rc < 0.5 ? rc * 2 : (1 - rc) * 2;
        const r = c1.r * (1 - mix) + c2.r * mix;
        const g = c1.g * (1 - mix) + c2.g * mix;
        const b = c1.b * (1 - mix) + c2.b * mix;
        const a = SOURCE_LOCK.starAlphaMin + (SOURCE_LOCK.starAlphaMax - SOURCE_LOCK.starAlphaMin) * ra;
        const size = SOURCE_LOCK.starSizeMin + (SOURCE_LOCK.starSizeMax - SOURCE_LOCK.starSizeMin) * rs;

        out.push({ x, y, r, g, b, a, size });
      }
      return out;
    }

    getSector(sx, sy) {
      const key = this.sectorKey(sx, sy);
      if (!this.cache.has(key)) this.cache.set(key, this.buildSector(sx, sy));
      return this.cache.get(key);
    }

    draw(cam) {
      const S = this.sectorSize;
      const p = this.parallax;
      const starCamX = cam.x * p;
      const starCamY = cam.y * p;
      const viewR = Math.hypot(W, H) * 1.35;
      const minx = Math.floor((starCamX - viewR) / S) - 1;
      const maxx = Math.floor((starCamX + viewR) / S) + 1;
      const miny = Math.floor((starCamY - viewR) / S) - 1;
      const maxy = Math.floor((starCamY + viewR) / S) + 1;

      pushMatrix();
      translate(W / 2 - starCamX, H / 2 - starCamY);
      noStroke();
      for (let sx = minx; sx <= maxx; sx += 1) {
        for (let sy = miny; sy <= maxy; sy += 1) {
          const stars = this.getSector(sx, sy);
          for (const st of stars) {
            fill(st.r, st.g, st.b, st.a);
            if (st.size <= 1.3) rect(st.x, st.y, 1, 1);
            else ellipse(st.x, st.y, st.size, st.size);
          }
        }
      }
      popMatrix();
    }
  }

  // ------------------------------------------------------------
  // Deterministic planet atlas (Phase 8)
  // ------------------------------------------------------------
  function hashText01(text, seed = 0) {
    let h = (2166136261 ^ (seed >>> 0)) >>> 0;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= h >>> 16;
    h = Math.imul(h, 2246822507) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909) >>> 0;
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  class PlanetAtlasWeb {
    constructor(makePlanet) {
      this.makePlanet = makePlanet;
      this.cache = new Map();
      this.S = ATLAS_TUNE.sectorSize;
    }

    key(sx, sy) { return `${sx},${sy}`; }
    rand(sx, sy, salt) { return hashText01(`${sx}:${sy}:${salt}`, ATLAS_TUNE.seed); }

    pickType(t) {
      // Keep the old world-reading vocabulary simple: fuel, ore, data, quiet.
      // There is intentionally no "correct" SERA or VOX anymore.
      if (t < 0.20) return { name: "LUMA", kind: "refuel", color: [160, 205, 255] };
      if (t < 0.46) return { name: "VOX",  kind: "mine",   color: [255, 90, 70] };
      if (t < 0.52) return { name: "SERA", kind: "data",   color: [240, 230, 120] };
      return { name: "ASTRA", kind: "neutral", color: [135, 150, 175] };
    }

    buildSector(sx, sy) {
      const out = [];
      const S = this.S;
      for (let n = 1; n <= ATLAS_TUNE.maxPerSector; n += 1) {
        const roll = this.rand(sx, sy, `p${n}`);
        if (roll <= 1 - ATLAS_TUNE.planetChance) continue;

        const x = sx * S + this.rand(sx, sy, `px${n}`) * S;
        const y = sy * S + this.rand(sx, sy, `py${n}`) * S;
        if (Math.hypot(x, y) < ATLAS_TUNE.originExclusionRadius) continue;
        if (out.some((p) => Math.hypot(p.pos.x - x, p.pos.y - y) < ATLAS_TUNE.minPlanetSpacing)) continue;

        const type = this.pickType(this.rand(sx, sy, `type${n}`));
        const resT = this.rand(sx, sy, `res${n}`);
        let resourceMax = 0;
        if (type.kind === "refuel") {
          resourceMax = Math.floor(ATLAS_TUNE.ambientFuelMin + resT * (ATLAS_TUNE.ambientFuelMax - ATLAS_TUNE.ambientFuelMin + 1));
        } else if (type.kind === "mine") {
          resourceMax = Math.floor(ATLAS_TUNE.ambientOreMin + resT * (ATLAS_TUNE.ambientOreMax - ATLAS_TUNE.ambientOreMin + 1));
        } else if (type.kind === "data") {
          // One SERA = one discovery. DATA and Echo stay paired.
          resourceMax = 1;
        }
        const planet = this.makePlanet(
          type.name, x, y, 410, 1100, 0.991, type.color, type.kind, resourceMax
        );
        planet.interactionTier = relayTierForPosition(x, y);
        if (type.kind === "refuel") planet.relayTier = planet.interactionTier;
        planet.generated = true;
        planet.atlasId = `P:${sx}:${sy}:${n}`;
        planet.phase = this.rand(sx, sy, `phase${n}`) * TWO_PI;
        out.push(planet);
      }
      return out;
    }

    getSector(sx, sy) {
      const k = this.key(sx, sy);
      if (!this.cache.has(k)) this.cache.set(k, this.buildSector(sx, sy));
      return this.cache.get(k);
    }

    query(center) {
      const sx0 = Math.floor(center.x / this.S);
      const sy0 = Math.floor(center.y / this.S);
      const r = ATLAS_TUNE.activeSectorRadius;
      const out = [];
      for (let sx = sx0 - r; sx <= sx0 + r; sx += 1) {
        for (let sy = sy0 - r; sy <= sy0 + r; sy += 1) {
          out.push(...this.getSector(sx, sy));
        }
      }
      return out;
    }
  }

  // ------------------------------------------------------------
  // DRIFT-A world
  // ------------------------------------------------------------
  class DriftWorld {
    constructor() {
      this.starfield = new Starfield();
      this.reset();
    }

    reset() {
      this.ship = {
        pos: v(0, 0),
        vel: v(0, 0),
        damp: SOURCE_LOCK.shipInitDamp,
        currentMaxSpeed: TUNE.maxSpeed,
      };

      this.camera = { x: 0, y: 0 };
      this.pressing = false;
      // v2.3.1: store the pointer in screen space. Reprojecting it every fixed
      // step keeps thrust direction stable even when the finger itself is still
      // while the camera follows the ship.
      this.pressScreen = v(W / 2, H / 2);
      this.pressWorld = v(0, 0); // retained for debug/visual compatibility
      this.thrustTime = 0;
      // Same-session HOME rollback is independent from localStorage. A failed
      // persistent write must never send the player to an older save.
      this.homeCheckpoint = null;
      this.storageSaveFailed = false;
      this.dominantPlanet = null;
      this.lastDominantPlanet = null;
      this.accumulator = 0;
      this.trailAccumulator = 0;
      this.trail = [];
      this.takeoffParticles = [];

      // Phase 3 state. DRIFT physics remains untouched while mode === flight.
      this.mode = "flight";
      // Landing intent is spatial now: marker near the planet, then a deeper
      // approach to commit. Legacy fields remain only for debug compatibility.
      this.ringStayTimer = 0;
      this.captureReady = false;
      this.scanProgress = 0;
      this.lastLandingDistance = Infinity;
      this.landPlanet = null;
      this.landTarget = v(0, 0);
      this.settleTimer = 0;
      this.departHold = 0;
      this.repairTapArmed = false;
      this.repairInputLock = 0;
      this.relandLock = 0;
      this.cameraZoom = 1;
      this.zoomAnim = null;
      this.feedback = { kind: null, timer: 0 };
      this.savePulse = 0;
      this.signal = {
        timer: SIGNAL_TUNE.initialDelay,
        pulseTimer: 0,
        dir: null,
        targetId: null,
        distance: Infinity,
      };
      // v2.3.2: source-style spacecraft MiniMap. It stays deliberately
      // simple: local planets, HOME, ship center, and an occasional scan pulse.
      this.minimap = { pulseTimer: 0 };

      // Phase 4: a tiny sense of home. E.V.E. is intentionally not a full
      // dialogue system yet; only return/fuel signals are allowed in this build.
      this.simTime = 0;
      this.tripStartTime = 0;
      this.hasDepartedBase = false;
      this.baseRefuelTimer = 0;
      this.base = {
        level: 1,
        repairPulse: 0,
      };
      this.stationPulse = { timer: 0, duration: 0.7 };
      this.restoreRitualActive = false;

      // v2.7: HOME is a system connection, not an instruction floating in
      // space. Landing at BASE automatically opens a source-inspired
      // Windows-98-like operations terminal.
      this.homeTerminal = {
        visible: false,
        mode: "browse",     // browse | confirm
        pressed: null,
        status: "OFFLINE",
        // Shown only immediately after RESTORE. Closing the terminal consumes
        // the report; the next HOME return opens the ordinary operations view.
        restoreReportLevel: 0,
      };

      // v2.7.8: SYSTEM status and E.V.E.'s actual voice are separate layers.
      // The console is a quiet instrument; E.V.E. appears only while speaking.
      this.systemLog = [{ key: "boot", vars: {} }, { key: "eveOnline", vars: {} }];
      this.eve = {
        text: "",
        timer: 0,
        duration: 0,
        lowFuelNotified: false,
        idleTimer: 45 + Math.random() * 45,
        idleLastIndex: -1,
        landingQueues: {},
        landingLastAt: {},
        collisionQueue: [],
        collisionLastAt: -Infinity,
        // Persistent until the next HOME departure; consumed exactly once.
        restoreDepartureLevel: 0,
        // Volatile handoff from launch start to the flight transition.
        departureLineLevel: 0,
      };
      // ASTRA is intentionally quiet. After a short stillness the camera
      // opens outward, and rare meteors remind the player that the universe
      // continues beyond utility and progression.
      this.astra = {
        idleTimer: 0,
        active: false,
        meteorTimer: ASTRA_TUNE.meteorIntervalMin + Math.random() * (ASTRA_TUNE.meteorIntervalMax - ASTRA_TUNE.meteorIntervalMin),
        meteors: [],
      };
      this.echoes = {
        found: 0,
        total: ECHO_TUNE.total,
        discovered: new Set(),
        carriedThisTrip: 0,
        pulseTimer: 0,
      };
      this.echoStory = {
        active: false,
        index: 0,
        timer: 0,
        pendingIndex: 0,
        pendingTimer: 0,
        pendingPlanet: null,
        analyzing: false,
        analysisTimer: 0,
        analysisPlanet: null,
        analysisResult: null,
        analysisResultTimer: 0,
        analysisResultIndex: 0,
      };
      // DATA and ECHO are related but not identical. This archive remembers
      // every SERA packet already decoded, including post-12 packets with no Echo.
      this.dataSignals = {
        decoded: new Set(),
      };
      this.finale = {
        active: false,
        timer: 0,
        stage: "intro",
        completed: false,
        pulseFired: false,
        farewellPending: false,
        farewellInFlight: false,
      };
      this.rescue = {
        timer: 0,
        didTeleport: false,
        postFadeTimer: 0,
        postFadeDuration: 0,
        pendingReturnLine: false,
      };

      // RESTORE level owns practical carrying/range caps. Flight feel itself
      // remains identical at every level.
      const initialProfile = PROGRESSION_TUNE.levels[1];
      this.resources = {
        fuel: RESOURCE_TUNE.fuelStart,
        fuelMax: initialProfile.fuelMax,
        ore: 0,
        oreMax: initialProfile.oreMax,
        data: RESOURCE_TUNE.dataStart,
        dataMax: RESOURCE_TUNE.dataMax,
      };
      this.harvest = {
        timer: 0,
        threshold: RESOURCE_TUNE.mineTickMin,
        pulseTimer: 0,
        lastKind: null,
        lastAmount: 0,
        loggedThisLanding: false,
        fullSteamTimer: 0,
        fullSteamActive: false,
        sparks: [],
      };

      // Authored resource worlds guarantee a viable seed, while the procedural
      // atlas now provides alternative SERA / VOX / LUMA routes in every direction.
      const base = this.makePlanet("BASE", HOME_TUNE.x, HOME_TUNE.y, 410, 1100, 0.991, [140, 255, 140], "base", 0);
      base.atlasId = "F:BASE";

      const sera = STORY_SERA_TUNE.map((spec) => {
        const planet = this.makePlanet("SERA", spec.x, spec.y, 410, 1100, 0.991, [240, 230, 120], "data", 1);
        planet.atlasId = `S:${String(spec.id).padStart(2, "0")}`;
        planet.storyTier = spec.requiredLevel;
        planet.requiredLevel = spec.requiredLevel;
        planet.interactionTier = spec.requiredLevel;
        planet.storyResource = true;
        return planet;
      });

      const vox = STORY_VOX_TUNE.map((spec) => {
        const planet = this.makePlanet("VOX", spec.x, spec.y, 410, 1100, 0.991, [255, 90, 70], "mine", spec.ore);
        planet.atlasId = `V:${String(spec.id).padStart(2, "0")}`;
        planet.storyTier = spec.requiredLevel;
        planet.requiredLevel = spec.requiredLevel;
        planet.interactionTier = spec.requiredLevel;
        planet.storyResource = true;
        return planet;
      });

      const luma = STORY_LUMA_TUNE.map((spec) => {
        const planet = this.makePlanet("LUMA", spec.x, spec.y, 410, 1100, 0.991, [160, 205, 255], "refuel", 240);
        planet.atlasId = `L:${String(spec.id).padStart(2, "0")}`;
        planet.relayTier = spec.relayTier || relayTierForPosition(spec.x, spec.y);
        planet.interactionTier = planet.relayTier;
        planet.storyResource = true;
        return planet;
      });

      this.fixedPlanets = [base, ...sera, ...vox, ...luma];
      this.basePlanet = base;
      this.planetAtlas = new PlanetAtlasWeb((...args) => this.makePlanet(...args));
      this.atlasSectorKey = null;
      this.planets = [];
      this.refreshActivePlanets(true);
    }

    hasSave() {
      try {
        const raw = window.localStorage.getItem(SAVE_TUNE.key);
        if (!raw) return false;
        const data = JSON.parse(raw);
        return !!(data && data.schema === SAVE_TUNE.schema);
      } catch (_) {
        return false;
      }
    }

    clearSave() {
      try { window.localStorage.removeItem(SAVE_TUNE.key); } catch (_) { /* ignore */ }
    }

    planetId(planet) {
      if (!planet) return null;
      return planet.atlasId || `${planet.name}:${Math.round(planet.pos.x)}:${Math.round(planet.pos.y)}`;
    }

    capturePlanetStates() {
      const states = {};
      const capture = (planet) => {
        const id = this.planetId(planet);
        if (!id || planet.kind === "base" || planet.kind === "neutral") return;
        states[id] = {
          resourceCurrent: Math.max(0, Number(planet.resourceCurrent || 0)),
          depleted: !!planet.depleted,
        };
      };
      for (const planet of this.fixedPlanets || []) capture(planet);
      if (this.planetAtlas && this.planetAtlas.cache) {
        for (const planets of this.planetAtlas.cache.values()) {
          for (const planet of planets) capture(planet);
        }
      }
      return states;
    }

    applyPlanetStates(states) {
      if (!states || typeof states !== "object") return;
      const apply = (planet) => {
        const st = states[this.planetId(planet)];
        if (!st) return;
        const max = Math.max(0, Number(planet.resourceMax || 0));
        planet.resourceCurrent = clamp(Number(st.resourceCurrent || 0), 0, max);
        planet.depleted = !!st.depleted || planet.resourceCurrent <= 0;
      };
      for (const planet of this.fixedPlanets || []) apply(planet);

      // Build only sectors that actually contain saved mutable state. The atlas
      // remains deterministic; this simply reapplies depletion to those bodies.
      if (this.planetAtlas) {
        const sectors = new Set();
        for (const id of Object.keys(states)) {
          const m = /^P:(-?\d+):(-?\d+):(\d+)$/.exec(id);
          if (m) sectors.add(`${m[1]},${m[2]}`);
        }
        for (const key of sectors) {
          const [sx, sy] = key.split(",").map(Number);
          const planets = this.planetAtlas.getSector(sx, sy);
          for (const planet of planets) apply(planet);
        }
      }
      this.refreshActivePlanets(true);
    }

    findPlanetById(id) {
      if (!id) return null;
      const fixed = (this.fixedPlanets || []).find((p) => this.planetId(p) === id);
      if (fixed) return fixed;
      const m = /^P:(-?\d+):(-?\d+):(\d+)$/.exec(id);
      if (!m || !this.planetAtlas) return null;
      const planets = this.planetAtlas.getSector(Number(m[1]), Number(m[2]));
      return planets.find((p) => this.planetId(p) === id) || null;
    }

    buildSaveData(reason = "auto") {
      const landed = this.mode === "landed" && !!this.landPlanet;
      return {
        schema: SAVE_TUNE.schema,
        savedAt: Date.now(),
        reason,
        systemLog: Array.isArray(this.systemLog) ? this.systemLog.slice(-12) : [],
        resources: {
          fuel: this.resources.fuel,
          ore: this.resources.ore,
          data: this.resources.data,
        },
        baseLevel: this.base.level,
        eve: {
          restoreDepartureLevel: Math.max(0, Math.floor(Number(this.eve && this.eve.restoreDepartureLevel || 0))),
        },
        echoes: {
          found: this.echoes.found,
          discovered: Array.from(this.echoes.discovered),
          carriedThisTrip: this.echoes.carriedThisTrip,
        },
        dataSignals: {
          decoded: this.dataSignals ? Array.from(this.dataSignals.decoded || []) : [],
        },
        finale: {
          completed: !!this.finale.completed,
          farewellPending: !!this.finale.farewellPending,
          farewellInFlight: !!this.finale.farewellInFlight,
        },
        location: {
          mode: landed ? "landed" : "flight",
          planetId: landed ? this.planetId(this.landPlanet) : null,
          shipPos: { x: this.ship.pos.x, y: this.ship.pos.y },
          shipVel: { x: this.ship.vel.x, y: this.ship.vel.y },
        },
        planets: this.capturePlanetStates(),
      };
    }

    cloneSaveData(data) {
      if (!data || typeof data !== "object") return null;
      try {
        return JSON.parse(JSON.stringify(data));
      } catch (_) {
        return null;
      }
    }

    rememberHomeCheckpoint(data) {
      const copy = this.cloneSaveData(data);
      if (!copy || copy.schema !== SAVE_TUNE.schema) return false;
      this.homeCheckpoint = copy;
      return true;
    }

    saveGame(reason = "auto") {
      // HOME remains the normal persistence point. v2.5 additionally commits decoded
      // DATA/Echo after an emergency rescue; physical ORE still requires return.
      const atHome = this.mode === "landed" && this.landPlanet && this.landPlanet.kind === "base";
      if (!atHome) return false;

      const data = this.buildSaveData(reason);
      // v2.3.1: update the in-memory HOME checkpoint before touching storage.
      // This guarantees the current session can always roll back to the latest
      // departure/home state even if localStorage is full, blocked, or throws.
      this.rememberHomeCheckpoint(data);

      try {
        window.localStorage.setItem(SAVE_TUNE.key, JSON.stringify(data));
        this.storageSaveFailed = false;
        this.savePulse = SAVE_TUNE.pulseSec;
        return true;
      } catch (_) {
        this.storageSaveFailed = true;
        return false;
      }
    }

    applySaveData(data, rememberCheckpoint = true) {
      if (!data || data.schema !== SAVE_TUNE.schema) return false;
      const checkpointCopy = rememberCheckpoint ? this.cloneSaveData(data) : null;

      this.reset();

      if (Array.isArray(data.systemLog) && data.systemLog.length) {
        this.systemLog = data.systemLog.slice(-12).map((entry) => this.normalizeSystemLogEntry(entry));
      }

      const rr = data.resources || {};
      this.base.level = clamp(Math.floor(Number(data.baseLevel || 1)), 1, 5);
      this.applyRestoreCaps(this.base.level, false);
      const savedEve = data.eve || {};
      this.eve.restoreDepartureLevel = clamp(
        Math.floor(Number(savedEve.restoreDepartureLevel || 0)),
        0,
        5
      );
      this.eve.departureLineLevel = 0;
      this.resources.fuel = clamp(Number(rr.fuel ?? this.resources.fuelMax), 0, this.resources.fuelMax);
      this.resources.ore = clamp(Number(rr.ore ?? 0), 0, this.resources.oreMax);

      const ee = data.echoes || {};
      this.echoes.discovered = new Set(Array.isArray(ee.discovered) ? ee.discovered : []);
      this.echoes.found = clamp(Math.floor(Number(ee.found ?? this.echoes.discovered.size)), 0, this.echoes.total);
      this.echoes.carriedThisTrip = Math.max(0, Math.floor(Number(ee.carriedThisTrip || 0)));

      // v2.7.30 migration: one short-lived build omitted DATA from saves while
      // RESTORE temporarily used Echo thresholds. Preserve normal saves exactly;
      // only reconstruct DATA when the field is genuinely absent.
      if (Object.prototype.hasOwnProperty.call(rr, "data")) {
        this.resources.data = clamp(Number(rr.data ?? 0), 0, this.resources.dataMax);
      } else {
        const spentByLevel = [0, 0, 2, 4, 7, 10];
        const spent = spentByLevel[this.base.level] || 0;
        this.resources.data = clamp(Math.max(0, this.echoes.found - spent), 0, this.resources.dataMax);
      }

      const ds = data.dataSignals || {};
      const savedDecoded = Array.isArray(ds.decoded) ? ds.decoded : Array.from(this.echoes.discovered);
      this.dataSignals.decoded = new Set(savedDecoded);

      const ff = data.finale || {};
      this.finale.completed = !!ff.completed;
      this.finale.farewellPending = !!ff.farewellPending;
      this.finale.farewellInFlight = !!ff.farewellInFlight;
      this.finale.active = false;
      this.finale.stage = "intro";
      this.finale.timer = this.finale.completed ? 3.2 : 0;

      this.applyPlanetStates(data.planets || {});

      const loc = data.location || {};
      const px = Number(loc.shipPos && loc.shipPos.x);
      const py = Number(loc.shipPos && loc.shipPos.y);
      const vx = Number(loc.shipVel && loc.shipVel.x);
      const vy = Number(loc.shipVel && loc.shipVel.y);
      if (Number.isFinite(px) && Number.isFinite(py)) this.ship.pos = v(px, py);
      if (Number.isFinite(vx) && Number.isFinite(vy)) this.ship.vel = v(vx, vy);
      this.camera.x = this.ship.pos.x;
      this.camera.y = this.ship.pos.y;
      this.cameraZoom = 1.0;
      this.zoomAnim = null;

      if (loc.mode === "landed") {
        const planet = this.findPlanetById(loc.planetId);
        if (planet && this.canLandOnPlanet(planet)) {
          this.landPlanet = planet;
          this.landTarget = v(this.ship.pos.x, this.ship.pos.y);
          this.mode = "landed";
          this.ship.vel = v(0, 0);
          this.resetHarvestCycle();
          this.baseRefuelTimer = 0;
          if (planet.kind === "base") this.openHomeTerminal();
        } else {
          // v2.7.11 migration: an older save may have been written while
          // docked to a depleted or RESTORE-locked resource world. Keep the
          // physical location, but resume in flight instead of reviving an
          // invalid landing state.
          this.mode = "flight";
          this.landPlanet = null;
        }
      } else {
        this.mode = "flight";
        this.landPlanet = null;
      }
      this.refreshActivePlanets(true);
      this.eve.timer = 0;
      this.savePulse = 0;

      // reset() clears the volatile checkpoint; restore it only after the world
      // has been rebuilt from the snapshot.
      if (checkpointCopy) this.homeCheckpoint = checkpointCopy;

      // A snapshot can be taken immediately after the last missing half of the
      // story is restored. CONTINUE should still lead into the finale, not skip it.
      if (this.shouldStartFinale()) this.startFinale(0.7);
      return true;
    }

    restoreHomeCheckpoint() {
      const data = this.cloneSaveData(this.homeCheckpoint);
      if (!data || data.schema !== SAVE_TUNE.schema) return false;
      return this.applySaveData(data, true);
    }

    loadGame() {
      let data = null;
      try {
        const raw = window.localStorage.getItem(SAVE_TUNE.key);
        data = raw ? JSON.parse(raw) : null;
      } catch (_) {
        return false;
      }
      if (!data || data.schema !== SAVE_TUNE.schema) return false;
      return this.applySaveData(data, true);
    }

    makePlanet(name, x, y, range, gravity, drag, color, kind, resourceMax) {
      return {
        name,
        kind,
        pos: v(x, y),
        range,
        gravity,
        drag,
        core: SOURCE_LOCK.defaultCore,
        soft: SOURCE_LOCK.defaultSoft,
        power: SOURCE_LOCK.defaultPower,
        capMin: 300,
        capMax: 360,
        color,
        resourceMax,
        resourceCurrent: resourceMax,
        depleted: false,
        phase: (x * 0.013 + y * 0.007) % TWO_PI,
      };
    }

    refreshActivePlanets(force = false) {
      if (!this.planetAtlas) {
        this.planets = this.fixedPlanets ? [...this.fixedPlanets] : this.planets;
        return;
      }
      const sx = Math.floor(this.ship.pos.x / ATLAS_TUNE.sectorSize);
      const sy = Math.floor(this.ship.pos.y / ATLAS_TUNE.sectorSize);
      const sectorKey = `${sx},${sy}`;
      if (!force && sectorKey === this.atlasSectorKey) return;
      this.atlasSectorKey = sectorKey;
      const localFixed = (this.fixedPlanets || []).filter((planet) =>
        Math.hypot(planet.pos.x - this.ship.pos.x, planet.pos.y - this.ship.pos.y) <= ATLAS_TUNE.fixedActiveRadius
      );
      const generated = this.planetAtlas.query(this.ship.pos).filter((planet) =>
        !(this.fixedPlanets || []).some((fixed) =>
          Math.hypot(fixed.pos.x - planet.pos.x, fixed.pos.y - planet.pos.y) < ATLAS_TUNE.minPlanetSpacing
        )
      );
      this.planets = [...localFixed, ...generated];
      this.syncDiscoveredSeraState();
      // Generated landing targets are backed by the atlas cache, so mutable
      // depletion state survives when sectors leave and later re-enter view.
    }

    screenToWorld(x, y) {
      const z = Math.max(0.0001, this.cameraZoom || 1);
      return v((x - W / 2) / z + this.camera.x, (y - H / 2) / z + this.camera.y);
    }

    setPointer(touch) {
      this.pressScreen = v(touch.x, touch.y);
      // Keep pressWorld current for debug overlays immediately after an event;
      // flight physics will reproject from pressScreen every fixed step.
      this.pressWorld = this.screenToWorld(this.pressScreen.x, this.pressScreen.y);
    }

    livePointerWorld() {
      const p = this.pressScreen || v(W / 2, H / 2);
      return this.screenToWorld(p.x, p.y);
    }

    touch(touch) {
      // The final memory return is the only deliberately non-interactive beat.
      // It lasts only a few seconds, then hands control straight back to ORBIT.
      if (this.finale && this.finale.active) return true;
      if (this.mode === "landing" || this.mode === "rescue") return true;

      // Phase 17.1: takeoff keeps the same pointer session that began with the
      // one-second launch hold. The short launch impulse remains automatic, but
      // releasing or moving the finger is still observed so normal flight can
      // continue without requiring a second touch.
      if (this.mode === "takeoff") {
        if (touch.state === BEGAN) {
          this.pressing = true;
          this.setPointer(touch);
        } else if (touch.state === MOVING) {
          if (this.pressing) this.setPointer(touch);
        } else if (touch.state === ENDED || touch.state === CANCELLED) {
          this.pressing = false;
        }
        return true;
      }

      if (this.mode === "landed") {
        // HOME terminal and launch are now two separate interaction modes.
        // While connected, every touch belongs to the terminal. After explicit
        // disconnect, the familiar 1-second hold is launch-only.
        if (
          this.landPlanet &&
          this.landPlanet.kind === "base" &&
          this.homeTerminal &&
          this.homeTerminal.visible
        ) {
          return this.handleHomeTerminalTouch(touch);
        }

        if (touch.state === BEGAN) {
          this.departHold = 0;
          this.pressing = true;
          this.setPointer(touch);
        } else if (touch.state === MOVING) {
          if (this.pressing) this.setPointer(touch);
        } else if (touch.state === ENDED || touch.state === CANCELLED) {
          this.pressing = false;
          this.departHold = 0;
        }
        return true;
      }

      if (touch.state === BEGAN) {
        // v1.0: flight input is always thrust. Landing no longer competes
        // with a tap; intent is expressed by flying deeper toward the planet.
        this.pressing = true;
        this.setPointer(touch);
        return true;
      }
      if (touch.state === MOVING) {
        if (this.pressing) this.setPointer(touch);
        return true;
      }
      if (touch.state === ENDED || touch.state === CANCELLED) {
        this.pressing = false;
        return true;
      }
      return true;
    }

    update(frameDt) {
      // Avoid a giant catch-up after tab restore, while keeping the actual
      // simulation itself fixed-step.
      const dt = Math.min(Math.max(frameDt || 0, 0), 0.1);
      this.accumulator += dt;
      let guard = 0;
      while (this.accumulator >= FIXED_DT && guard < 8) {
        this.fixedUpdate(FIXED_DT);
        this.accumulator -= FIXED_DT;
        guard += 1;
      }
    }

    resetAstraQuiet(restoreZoom = true) {
      if (!this.astra) return;
      const wasActive = !!this.astra.active;
      this.astra.idleTimer = 0;
      this.astra.active = false;
      this.astra.meteorTimer = ASTRA_TUNE.meteorIntervalMin + Math.random() * (ASTRA_TUNE.meteorIntervalMax - ASTRA_TUNE.meteorIntervalMin);
      this.astra.meteors = [];
      if (restoreZoom && wasActive && this.mode !== "landing") this.startZoom(1.0, ASTRA_TUNE.returnZoomDuration);
    }

    spawnAstraMeteor() {
      if (!this.astra) return;
      const fromLeft = Math.random() < 0.55;
      const sx = fromLeft ? (-20 - Math.random() * 30) : (W + 20 + Math.random() * 30);
      const sy = 70 + Math.random() * (H * 0.38);
      const speed = 130 + Math.random() * 80;
      const dx = fromLeft ? 1 : -1;
      const dy = 0.22 + Math.random() * 0.22;
      const dir = norm(v(dx, dy));
      const life = ASTRA_TUNE.meteorLifeMin + Math.random() * (ASTRA_TUNE.meteorLifeMax - ASTRA_TUNE.meteorLifeMin);
      this.astra.meteors.push({
        x: sx, y: sy,
        vx: dir.x * speed, vy: dir.y * speed,
        life, age: 0,
        len: 20 + Math.random() * 12,
      });
    }

    updateAstraQuiet(dt) {
      const onAstra = this.mode === "landed" && this.landPlanet && this.landPlanet.kind === "neutral";
      if (!onAstra) {
        this.resetAstraQuiet(true);
        return;
      }

      if (!this.astra) return;
      if (!this.pressing) this.astra.idleTimer += dt;
      if (!this.astra.active && this.astra.idleTimer >= ASTRA_TUNE.idleDelay) {
        this.astra.active = true;
        this.startZoom(ASTRA_TUNE.zoomOut, ASTRA_TUNE.zoomDuration);
      }

      if (!this.astra.active) return;
      this.astra.meteorTimer -= dt;
      if (this.astra.meteorTimer <= 0) {
        this.spawnAstraMeteor();
        this.astra.meteorTimer = ASTRA_TUNE.meteorIntervalMin + Math.random() * (ASTRA_TUNE.meteorIntervalMax - ASTRA_TUNE.meteorIntervalMin);
      }

      for (let i = this.astra.meteors.length - 1; i >= 0; i -= 1) {
        const m = this.astra.meteors[i];
        m.age += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.age >= m.life || m.x < -80 || m.x > W + 80 || m.y > H + 80) this.astra.meteors.splice(i, 1);
      }
    }

    drawAstraMeteors() {
      if (!this.astra || !this.astra.active || !this.astra.meteors || this.astra.meteors.length <= 0) return;
      if (!(this.mode === "landed" && this.landPlanet && this.landPlanet.kind === "neutral")) return;

      pushMatrix();
      noFill();
      for (const m of this.astra.meteors) {
        const q = clamp(m.age / Math.max(0.001, m.life), 0, 1);
        const fade = Math.sin(Math.PI * q);
        const alpha = 95 * fade;
        const mag = Math.max(0.001, Math.hypot(m.vx, m.vy));
        const nx = m.vx / mag;
        const ny = m.vy / mag;
        stroke(175, 210, 245, alpha * 0.45);
        strokeWidth(3.0);
        line(m.x - nx * m.len * 0.55, m.y - ny * m.len * 0.55, m.x, m.y);
        stroke(235, 245, 255, alpha);
        strokeWidth(1.0);
        line(m.x - nx * m.len, m.y - ny * m.len, m.x, m.y);
      }
      popMatrix();
    }

    fixedUpdate(dt) {
      this.simTime += dt;
      this.updateCameraZoom(dt);
      if (this.rescue && this.rescue.postFadeTimer > 0) {
        const before = this.rescue.postFadeTimer;
        this.rescue.postFadeTimer = Math.max(0, before - dt);
        if (before > 0 && this.rescue.postFadeTimer === 0 && this.rescue.pendingReturnLine) {
          this.rescue.pendingReturnLine = false;
          this.sayEve(this.evePhaseLines().short, 2.8);
        }
      }
      if (this.eve && this.eve.timer > 0) this.eve.timer = Math.max(0, this.eve.timer - dt);
      this.updateEveIdle(dt);
      if (this.relandLock > 0) this.relandLock = Math.max(0, this.relandLock - dt);
      if (this.feedback.timer > 0) {
        this.feedback.timer = Math.max(0, this.feedback.timer - dt);
        if (this.feedback.timer === 0) this.feedback.kind = null;
      }
      if (this.harvest && this.harvest.pulseTimer > 0) {
        this.harvest.pulseTimer = Math.max(0, this.harvest.pulseTimer - dt);
      }
      this.updateHarvestSparks(dt);
      this.updateTakeoffParticles(dt);
      if (this.base && this.base.repairPulse > 0) {
        this.base.repairPulse = Math.max(0, this.base.repairPulse - dt);
      }
      if (this.stationPulse && this.stationPulse.timer > 0) {
        this.stationPulse.timer = Math.max(0, this.stationPulse.timer - dt);
      }
      if (this.echoes && this.echoes.pulseTimer > 0) {
        this.echoes.pulseTimer = Math.max(0, this.echoes.pulseTimer - dt);
      }
      if (this.savePulse > 0) this.savePulse = Math.max(0, this.savePulse - dt);
      this.updateNarrative(dt);
      this.updateFaintSignal(dt);
      if (this.minimap && this.minimap.pulseTimer > 0) {
        this.minimap.pulseTimer = Math.max(0, this.minimap.pulseTimer - dt);
      }

      if (this.mode === "flight" || this.mode === "takeoff") this.refreshActivePlanets(false);
      this.updateAstraQuiet(dt);

      if (this.mode === "flight") this.fixedFlight(dt);
      else if (this.mode === "landing") this.fixedLanding(dt * ORBIT_TUNE.landingTimeScale);
      else if (this.mode === "landed") this.fixedLanded(dt);
      else if (this.mode === "takeoff") this.fixedTakeoff(dt);
      else if (this.mode === "rescue") this.fixedRescue(dt);

      this.updateTrail(dt);
      this.camera.x = this.ship.pos.x;
      this.camera.y = this.ship.pos.y;
    }

    fixedFlight(dt) {
      const force = this.gravityUpdate();
      let acc = force;

      if (this.pressing && this.mode === "flight") {
        // Reproject the same screen-space finger position against the current
        // camera every fixed step. A perfectly still finger therefore keeps a
        // perfectly stable intended direction while the ship/camera moves.
        const livePressWorld = this.livePointerWorld();
        this.pressWorld = livePressWorld;
        const fingerVector = sub(livePressWorld, this.ship.pos);
        const d = len(fingerVector);
        const fingerDir = d > 1 ? mul(fingerVector, 1 / d) : fingerVector;
        const thrustDir = CONTROL_MODE === "target" ? fingerDir : mul(fingerDir, -1);
        this.applySteeringAssist(thrustDir, dt);
        acc = add(acc, mul(thrustDir, TUNE.tiltGain * TUNE.thrustMultiplier));
        this.thrustTime += dt;
      } else {
        this.thrustTime = 0;
      }

      this.applyShipPhysics(acc, dt);
      this.updateFlightFuel(len(this.ship.vel) * dt);
      if (this.mode !== "flight") return;
      this.updateCapture(dt);
    }

    fixedLanding(dt) {
      this.pressing = false;
      const force = this.gravityUpdate();
      const to = sub(this.landTarget, this.ship.pos);
      let acc = sub(mul(to, ORBIT_TUNE.landSpringK), mul(this.ship.vel, ORBIT_TUNE.landDamping));
      acc = add(acc, mul(force, 0.25));
      this.applyShipPhysics(acc, dt);

      const close = len(to) < 8 && len(this.ship.vel) < 10;
      if (close) {
        this.settleTimer += dt;
        if (this.settleTimer >= ORBIT_TUNE.settleHoldSec) {
          this.mode = "landed";
          this.ship.pos = v(this.landTarget.x, this.landTarget.y);
          this.ship.vel = v(0, 0);
          this.settleTimer = 0;
          this.startZoom(1.0, 0.5);
          this.resetHarvestCycle();
          this.onLanded();
          this.feedback = { kind: "landed", timer: 0.8 };
        }
      } else {
        this.settleTimer = 0;
      }
    }

    fixedLanded(dt) {
      if ((this.repairInputLock || 0) > 0) {
        this.repairInputLock = Math.max(0, this.repairInputLock - dt);
      }
      const to = sub(this.landTarget, this.ship.pos);
      const acc = sub(mul(to, ORBIT_TUNE.landedAnchorK), mul(this.ship.vel, ORBIT_TUNE.landedAnchorDamp));
      this.ship.damp = 0.9999;
      this.applyShipPhysics(acc, dt);

      // Being landed is the action. Resource planets harvest automatically;
      // BASE automatically refuels. Holding for takeoff pauses neither behavior.
      if (this.landPlanet && this.landPlanet.kind === "base") this.updateBaseRefuel(dt);
      else this.updateHarvest(dt);

      if (this.pressing) {
        this.departHold += dt;
        if (this.departHold >= ORBIT_TUNE.takeoffHoldSec) this.startTakeoff();
      } else {
        this.departHold = 0;
      }
    }

    fixedTakeoff(dt) {
      // Web launch phase: the one-second hold remains the ritual, but the
      // release is intentionally not ordinary flight physics. For a brief
      // moment the ship is thrown cleanly away from the planet: no gravity,
      // no damping, no landing capture. This makes the launch read as a
      // decisive release instead of a soft handoff.
      this.launchTimer += dt;
      this.ship.vel = mul(this.launchDir, ORBIT_TUNE.launchSpeed);
      this.ship.pos = add(this.ship.pos, mul(this.ship.vel, dt));

      if (this.launchTimer >= ORBIT_TUNE.launchDuration) {
        this.mode = "flight";
        this.landPlanet = null;
        this.captureReady = false;
        this.ringStayTimer = 0;
        this.ship.damp = TUNE.openSpaceDamp;
        if (this.finale && this.finale.farewellInFlight) {
          this.finale.farewellInFlight = false;
          this.eve.departureLineLevel = 0;
          this.sayEve(tx("eve.farewell"), 3.4);
        } else {
          const restoredLevel = Math.floor(Number(this.eve && this.eve.departureLineLevel || 0));
          const restoredLine = RESTORE_DEPARTURE_LINES[restoredLevel];
          this.eve.departureLineLevel = 0;
          if (restoredLine) this.sayEve(restoredLine, restoredLevel === 5 ? 4.0 : 3.4);
        }
      }
    }

    fixedRescue(dt) {
      this.pressing = false;
      this.ship.vel = v(0, 0);
      this.rescue.timer += dt;
      if (this.rescue.timer < RETURN_TUNE.rescueTeleportAt || this.rescue.didTeleport) return;
      this.rescue.didTeleport = true;

      // Keep the established rescue semantics: physical expedition state rolls
      // back to HOME, while decoded DATA/Echo knowledge survives the accident.
      const discovery = this.captureDiscoveryProgress();
      let restored = this.restoreHomeCheckpoint();
      if (!restored) restored = this.loadGame();
      if (!restored) {
        this.reset();
        const p = this.basePlanet;
        if (p) {
          const stopR = (p.radius || ORBIT_TUNE.fallbackPlanetRadius) * ORBIT_TUNE.landTargetFactor;
          this.landPlanet = p;
          this.landTarget = v(p.pos.x, p.pos.y + stopR);
          this.ship.pos = v(this.landTarget.x, this.landTarget.y);
          this.ship.vel = v(0, 0);
          this.mode = "landed";
          this.resources.fuel = this.resources.fuelMax;
          this.openHomeTerminal();
          this.camera.x = this.ship.pos.x;
          this.camera.y = this.ship.pos.y;
          this.refreshActivePlanets(true);
        }
      }
      this.mergeDiscoveryProgress(discovery);
      this.pushSystemLog("emergencyReturn");
      this.saveGame("rescue-discovery");
      this.eve.lowFuelNotified = false;

      // applySaveData()/reset() rebuilt volatile state. Start the HOME reveal on
      // that new state and let E.V.E. speak only after the screen is fully back.
      const post = RESCUE_CRT_TUNE.postBlackHoldSec + RESCUE_CRT_TUNE.homeFadeSec;
      this.rescue.postFadeDuration = post;
      this.rescue.postFadeTimer = post;
      this.rescue.pendingReturnLine = true;
      this.eve.timer = 0;
    }

    applySteeringAssist(thrustDir, dt) {
      if (!thrustDir || TUNE.turnAssistPerSec <= 0) return;
      const speed = len(this.ship.vel);
      if (speed <= TUNE.turnAssistMinSpeed) return;

      // Keep the old inertial character when coasting. The assist exists only
      // during active thrust, and becomes more useful as speed rises.
      const span = Math.max(1, TUNE.turnAssistFullSpeed - TUNE.turnAssistMinSpeed);
      const speedWeight = clamp((speed - TUNE.turnAssistMinSpeed) / span, 0, 1);
      const alpha = 1 - Math.exp(-TUNE.turnAssistPerSec * speedWeight * dt);
      const desiredVel = mul(thrustDir, speed);

      // Linear blending is intentional: a hard 180-degree reversal bleeds speed
      // before changing direction instead of snapping the pod around instantly.
      this.ship.vel = add(mul(this.ship.vel, 1 - alpha), mul(desiredVel, alpha));
    }

    applyShipPhysics(acc, dt) {
      let a = acc || v(0, 0);
      const aLen = len(a);
      if (aLen > TUNE.maxAccel) a = mul(a, TUNE.maxAccel / aLen);
      this.ship.vel = mul(add(this.ship.vel, mul(a, dt)), this.ship.damp);
      const speed = len(this.ship.vel);
      if (speed > TUNE.maxSpeed) this.ship.vel = mul(this.ship.vel, TUNE.maxSpeed / speed);
      this.ship.pos = add(this.ship.pos, mul(this.ship.vel, dt));
    }

    updateCapture(dt) {
      const p = this.dominantPlanet;
      if (!p || this.relandLock > 0 || !this.canLandOnPlanet(p)) {
        this.captureReady = false;
        this.scanProgress = Math.max(0, this.scanProgress - dt * 3.0);
        this.lastDominantPlanet = p;
        this.lastLandingDistance = Infinity;
        return;
      }

      if (p !== this.lastDominantPlanet) {
        this.scanProgress = 0;
        this.captureReady = false;
        this.lastDominantPlanet = p;
        this.lastLandingDistance = Infinity;
      }

      const d = len(sub(p.pos, this.ship.pos));
      const revealR = ORBIT_TUNE.landingMarkerRevealRadius;
      const triggerR = ORBIT_TUNE.landingTriggerRadius;
      const withinMarker = d < revealR;
      this.scanProgress = withinMarker
        ? Math.min(1, this.scanProgress + dt * 3.2)
        : Math.max(0, this.scanProgress - dt * 4.0);
      this.captureReady = withinMarker;

      // Landing intent is directional, not just proximity. A slow/medium
      // approach that is actually aimed into the planet receives a gentle
      // assist near the surface. Tangential fly-bys and fast impacts are left
      // completely alone so the existing bounce behavior remains intact.
      const approachSpeed = len(this.ship.vel);
      const inwardDir = norm(sub(p.pos, this.ship.pos));
      const inwardSpeed = dot(this.ship.vel, inwardDir);
      const inwardRatio = approachSpeed > 1 ? inwardSpeed / approachSpeed : 0;
      const intentionalApproach =
        inwardSpeed > 0 && inwardRatio >= ORBIT_TUNE.landingIntentMinRatio;

      if (
        d <= ORBIT_TUNE.landingAssistRadius &&
        approachSpeed <= ORBIT_TUNE.landingMaxSpeed &&
        intentionalApproach
      ) {
        const q = clamp(dt * ORBIT_TUNE.landingAssistStrength, 0, 1);
        const targetVel = mul(inwardDir, Math.min(approachSpeed, ORBIT_TUNE.landingAssistTargetSpeed));
        this.ship.vel = v(
          this.ship.vel.x + (targetVel.x - this.ship.vel.x) * q,
          this.ship.vel.y + (targetVel.y - this.ship.vel.y) * q
        );
      }

      // Once an intentional approach reaches the marker itself, hand off to
      // the landing sequence. No precision crossing is required anymore.
      if (
        d <= triggerR &&
        approachSpeed <= ORBIT_TUNE.landingMaxSpeed &&
        intentionalApproach
      ) {
        this.startLanding(p);
        this.lastLandingDistance = Infinity;
        return;
      }

      // Fast approaches remain impacts and continue into the hard-shell/core
      // collision response, preserving the satisfying bounce.
      this.lastLandingDistance = d;
    }

    sayEve(text, duration = 2.6) {
      if (!this.eve || !text) return;
      const dur = Math.max(0.1, Number(duration || 2.6));
      this.eve.text = String(text);
      this.eve.timer = dur;
      this.eve.duration = dur;

      // E.V.E. is no longer written into the SYSTEM history. Her words are a
      // transient voice layer, matching the original separation between the
      // console/toast system and EveUI.
      if (this.stationPulse) this.stationPulse.timer = this.stationPulse.duration;
    }

    restoreProfile(level = null) {
      const lv = clamp(Math.floor(level || (this.base && this.base.level) || 1), 1, 5);
      return PROGRESSION_TUNE.levels[lv] || PROGRESSION_TUNE.levels[1];
    }

    applyRestoreCaps(level = null, refillFuel = false) {
      const profile = this.restoreProfile(level);
      this.resources.fuelMax = profile.fuelMax;
      this.resources.oreMax = profile.oreMax;
      this.resources.dataMax = RESOURCE_TUNE.dataMax;
      this.resources.ore = clamp(this.resources.ore, 0, this.resources.oreMax);
      this.resources.data = clamp(this.resources.data, 0, this.resources.dataMax);
      if (refillFuel) this.resources.fuel = this.resources.fuelMax;
      else this.resources.fuel = clamp(this.resources.fuel, 0, this.resources.fuelMax);
    }

    evePhaseLines() {
      const level = clamp(Math.floor((this.base && this.base.level) || 1), 1, 5);
      return EVE_PHASE_LINES[level] || EVE_PHASE_LINES[1];
    }

    eveIdleLines() {
      const level = clamp(Math.floor((this.base && this.base.level) || 1), 1, 5);
      return EVE_IDLE_LINES[level] || EVE_IDLE_LINES[1];
    }

    pickEveIdleLine() {
      const lines = this.eveIdleLines();
      if (!lines.length) return "";
      if (lines.length === 1) return lines[0];

      let index = Math.floor(Math.random() * lines.length);
      if (index === this.eve.idleLastIndex) {
        index = (index + 1 + Math.floor(Math.random() * (lines.length - 1))) % lines.length;
      }
      this.eve.idleLastIndex = index;
      return lines[index];
    }

    updateEveIdle(dt) {
      if (!this.eve) return;

      // Keep the intentionally silent beats silent.
      if (this.mode === "rescue") return;
      if (this.finale && this.finale.active) return;
      if (this.homeTerminal && this.homeTerminal.visible) return;
      if (
        this.echoStory &&
        (
          this.echoStory.active ||
          this.echoStory.analyzing ||
          this.echoStory.pendingTimer > 0 ||
          this.echoStory.analysisResultTimer > 0
        )
      ) return;
      if (this.mode === "landed" && this.landPlanet && this.landPlanet.kind === "neutral") return;

      // Match the original spirit: chatter while travelling, or while quietly
      // sitting on an ordinary resource world. Do not interrupt another line.
      const eligible =
        this.mode === "flight" ||
        (this.mode === "landed" && this.landPlanet && this.landPlanet.kind !== "base");
      if (!eligible || this.eve.timer > 0) return;

      this.eve.idleTimer -= dt;
      if (this.eve.idleTimer > 0) return;

      const line = this.pickEveIdleLine();
      if (line) this.sayEve(line, 4.0);
      this.eve.idleTimer = 45 + Math.random() * 45;
    }

    eveLandingLines(kind) {
      const level = clamp(Math.floor((this.base && this.base.level) || 1), 1, 5);
      const phase = EVE_LANDING_LINES[level] || EVE_LANDING_LINES[1];
      return phase[kind] || null;
    }

    pickEveLandingLine(kind) {
      if (!this.eve) return "";
      const lines = this.eveLandingLines(kind);
      if (!lines || !lines.length) return "";

      const level = clamp(Math.floor((this.base && this.base.level) || 1), 1, 5);
      const eventId = `land_${kind}`;
      const lastAt = Number(this.eve.landingLastAt[eventId] ?? -Infinity);
      if (this.simTime - lastAt < 4.0) return "";

      const key = `${level}:${eventId}`;
      let queue = this.eve.landingQueues[key];
      if (!Array.isArray(queue) || queue.length === 0) {
        queue = Array.from({ length: lines.length }, (_, i) => i);
        for (let i = queue.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [queue[i], queue[j]] = [queue[j], queue[i]];
        }
        this.eve.landingQueues[key] = queue;
      }

      const index = queue.shift();
      this.eve.landingLastAt[eventId] = this.simTime;
      return lines[index] || "";
    }

    sayEveLanding(kind) {
      const line = this.pickEveLandingLine(kind);
      if (line) this.sayEve(line, 2.5);
    }

    pickEveCollisionLine() {
      if (!this.eve) return "";
      if (this.simTime - Number(this.eve.collisionLastAt ?? -Infinity) < 4.0) return "";

      const level = clamp(Math.floor((this.base && this.base.level) || 1), 1, 5);
      const lines = EVE_COLLISION_LINES[level] || EVE_COLLISION_LINES[1];
      if (!lines.length) return "";

      if (!Array.isArray(this.eve.collisionQueue) || this.eve.collisionQueue.length === 0) {
        this.eve.collisionQueue = Array.from({ length: lines.length }, (_, i) => i);
        for (let i = this.eve.collisionQueue.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [this.eve.collisionQueue[i], this.eve.collisionQueue[j]] =
            [this.eve.collisionQueue[j], this.eve.collisionQueue[i]];
        }
      }

      const index = this.eve.collisionQueue.shift();
      this.eve.collisionLastAt = this.simTime;
      return lines[index] || "";
    }

    sayEveCollision() {
      const line = this.pickEveCollisionLine();
      if (line) this.sayEve(line, 2.0);
    }

    echoBand(index) {
      if (index <= 3) return 0;
      if (index <= 6) return 1;
      if (index <= 9) return 2;
      if (index <= 11) return 3;
      return 4;
    }

    echoReaction(index) {
      const level = clamp(Math.floor((this.base && this.base.level) || 1), 1, 5);
      const band = this.echoBand(index);
      const rows = ECHO_REACTIONS[level] || ECHO_REACTIONS[1];
      return rows[band] || rows[0];
    }

    echoReturnLine() {
      const level = clamp(Math.floor((this.base && this.base.level) || 1), 1, 5);
      return ECHO_RETURN_LINES[level] || ECHO_RETURN_LINES[1];
    }

    formatEchoLine(text) {
      if (!text || !this.echoes) return text || "";
      return text
        .replaceAll("{a}", String(this.echoes.found))
        .replaceAll("{b}", String(this.echoes.total));
    }

    echoAnalysisLine() {
      const level = clamp(Math.floor((this.base && this.base.level) || 1), 1, 5);
      return ECHO_ANALYSIS_LINES[level] || ECHO_ANALYSIS_LINES[1];
    }

    startEchoAnalysis(index, planet) {
      this.echoStory.pendingIndex = 0;
      this.echoStory.pendingTimer = 0;
      this.echoStory.pendingPlanet = null;
      this.echoStory.index = Math.max(0, Math.floor(Number(index || 0)));
      this.echoStory.analysisPlanet = planet || null;
      this.echoStory.analyzing = true;
      this.echoStory.analysisTimer = ECHO_TUNE.analysisSec;
      this.echoStory.analysisResult = null;
      this.echoStory.analysisResultTimer = 0;
      this.echoStory.analysisResultIndex = 0;

      // The Windows-style DATA ANALYSIS window now represents E.V.E.'s actual
      // processing. Clear any landing line so speech and system work stay distinct.
      this.eve.timer = 0;
    }

    startEchoMemory(index) {
      this.echoStory.pendingIndex = 0;
      this.echoStory.pendingTimer = 0;
      this.echoStory.pendingPlanet = null;
      this.echoStory.analyzing = false;
      this.echoStory.analysisTimer = 0;
      this.echoStory.analysisPlanet = null;
      this.echoStory.analysisResult = null;
      this.echoStory.analysisResultTimer = 0;
      this.echoStory.analysisResultIndex = 0;
      this.echoStory.active = true;
      this.echoStory.index = index;
      this.echoStory.timer = ECHO_TUNE.memorySec;
      // The recovered text is past data, not present-day E.V.E. speech.
      this.eve.timer = 0;
    }

    queueDataAnalysis(planet) {
      if (!planet || planet.kind !== "data") return false;
      if (
        this.echoStory.active ||
        this.echoStory.analyzing ||
        this.echoStory.pendingTimer > 0 ||
        this.echoStory.analysisResultTimer > 0
      ) return false;

      // Before 12/12 every fresh SERA carries the next Echo. After 12/12 DATA
      // remains recoverable, but analysis resolves to NO ECHO TRACE.
      const stagedIndex = Math.max(0, Math.floor(Number(this.echoStory.pendingIndex || 0)));
      this.echoStory.pendingIndex = stagedIndex > 0
        ? stagedIndex
        : (this.canDiscoverEcho(planet) ? this.echoes.found + 1 : 0);
      this.echoStory.pendingPlanet = planet;
      this.echoStory.pendingTimer = ECHO_TUNE.memoryRevealDelaySec;
      this.echoStory.analyzing = false;
      this.echoStory.analysisTimer = 0;
      return true;
    }

    echoIdForPlanet(planet) {
      if (!planet) return null;
      return planet.atlasId || `${planet.name}:${Math.round(planet.pos.x)}:${Math.round(planet.pos.y)}`;
    }

    canDiscoverEcho(planet) {
      if (!planet || planet.kind !== "data" || !this.echoes) return false;
      if (this.echoes.found >= this.echoes.total) return false;
      const echoId = this.echoIdForPlanet(planet);
      return !!(echoId && !this.echoes.discovered.has(echoId));
    }

    discoverEcho(planet) {
      if (!this.canDiscoverEcho(planet)) return false;
      const echoId = this.echoIdForPlanet(planet);
      this.echoes.discovered.add(echoId);
      this.echoes.found = Math.min(this.echoes.total, this.echoes.found + 1);
      this.echoes.carriedThisTrip += 1;
      this.echoes.pulseTimer = ECHO_TUNE.pulseSec;
      this.pushSystemLog("echoRecovered", { index: String(this.echoes.found).padStart(2, "0") });
      if (this.harvest) this.harvest.loggedThisLanding = true;
      return true;
    }

    shouldStartFinale() {
      return !!(
        this.echoes &&
        this.echoes.found >= this.echoes.total &&
        this.base &&
        this.base.level >= 5 &&
        this.landPlanet &&
        this.landPlanet.kind === "base" &&
        this.finale &&
        !this.finale.active &&
        !this.finale.completed
      );
    }

    startFinale(delay = 0) {
      if (!this.finale || this.finale.active || this.finale.completed) return false;
      this.finale.active = true;
      this.finale.stage = "intro";
      this.finale.timer = -Math.max(0, delay);
      this.finale.pulseFired = false;
      this.pressing = false;
      this.departHold = 0;
      return true;
    }

    startRebirthRitual() {
      if (!this.finale || !this.finale.active || this.finale.stage !== "intro") return false;

      // A previous RESTORE ritual can, on mobile Safari, finish visually while
      // leaving the local flag behind for a frame/session edge. The final
      // REBIRTH must never be blocked by that stale bookkeeping.
      if (
        this.restoreRitualActive &&
        (!window.OrbitRitual || !window.OrbitRitual.active)
      ) {
        this.restoreRitualActive = false;
      }

      if (this.restoreRitualActive) return false;
      if (!window.OrbitRitual || typeof window.OrbitRitual.start !== "function") return false;

      this.finale.stage = "ritual";
      this.restoreRitualActive = true;
      this.pressing = false;
      this.departHold = 0;
      const started = window.OrbitRitual.start("rebirth", () => {
        this.restoreRitualActive = false;
        if (!this.finale || !this.finale.active) return;
        this.finale.stage = "outro";
        this.finale.timer = 0;
        this.base.repairPulse = Math.max(this.base.repairPulse || 0, 2.2);
        if (this.stationPulse) this.stationPulse.timer = this.stationPulse.duration;
      });
      if (!started) {
        this.restoreRitualActive = false;
        this.finale.stage = "intro";
      }
      return !!started;
    }

    updateNarrative(dt) {
      if (
        this.echoStory &&
        !this.echoStory.active &&
        !this.echoStory.analyzing &&
        this.echoStory.pendingTimer > 0
      ) {
        this.echoStory.pendingTimer = Math.max(0, this.echoStory.pendingTimer - dt);
        if (this.echoStory.pendingTimer <= 0) {
          const index = this.echoStory.pendingIndex;
          const planet = this.echoStory.pendingPlanet;
          this.startEchoAnalysis(index, planet);
        }
      }

      if (this.echoStory && this.echoStory.analyzing) {
        this.echoStory.analysisTimer = Math.max(0, this.echoStory.analysisTimer - dt);
        if (this.echoStory.analysisTimer <= 0) {
          const candidate = this.echoStory.analysisPlanet;
          const expectedIndex = this.echoStory.index;
          const found = expectedIndex > 0 && candidate ? this.discoverEcho(candidate) : false;

          this.echoStory.analyzing = false;
          this.echoStory.analysisTimer = 0;
          this.echoStory.analysisPlanet = null;
          this.echoStory.analysisResult = found ? "echo" : "empty";
          this.echoStory.analysisResultIndex = found ? this.echoes.found : 0;
          this.echoStory.analysisResultTimer = found
            ? ECHO_TUNE.analysisResultSec
            : ECHO_TUNE.emptyResultSec;
        }
      }

      if (this.echoStory && this.echoStory.analysisResultTimer > 0) {
        this.echoStory.analysisResultTimer = Math.max(0, this.echoStory.analysisResultTimer - dt);
        if (this.echoStory.analysisResultTimer <= 0) {
          const result = this.echoStory.analysisResult;
          const index = this.echoStory.analysisResultIndex;
          this.echoStory.analysisResult = null;
          this.echoStory.analysisResultIndex = 0;
          if (result === "echo" && index > 0) {
            this.startEchoMemory(index);
          }
        }
      }

      if (this.echoStory && this.echoStory.active) {
        this.echoStory.timer = Math.max(0, this.echoStory.timer - dt);
        if (this.echoStory.timer <= 0) {
          const index = this.echoStory.index;
          this.echoStory.active = false;
          this.sayEve(this.echoReaction(index), index === 12 ? 3.8 : 3.2);
        }
      }

      if (!this.finale || !this.finale.active) return;
      if (this.finale.stage === "ritual") return;

      const previous = this.finale.timer;
      this.finale.timer += dt;

      if (this.finale.stage === "intro") {
        if (previous < 0 && this.finale.timer >= 0) {
          this.eve.timer = 0;
          this.echoStory.active = false;
          this.echoStory.analyzing = false;
          this.echoStory.analysisTimer = 0;
          this.echoStory.analysisPlanet = null;
          this.echoStory.analysisResult = null;
          this.echoStory.analysisResultTimer = 0;
          this.echoStory.analysisResultIndex = 0;
          this.echoStory.pendingIndex = 0;
          this.echoStory.pendingTimer = 0;
          this.echoStory.pendingPlanet = null;
        }
        if (!this.finale.pulseFired && this.finale.timer >= 10.8) {
          this.finale.pulseFired = true;
          this.base.repairPulse = Math.max(this.base.repairPulse || 0, 2.2);
          if (this.stationPulse) this.stationPulse.timer = this.stationPulse.duration;
        }
        // The reveal ends with "……返します。". The player then performs the
        // approved REBIRTH hold ritual; its E.V.E. response carries the line
        // "あなたの心は また 動き出した。" before control returns home.
        if (this.finale.timer >= 13.2) this.startRebirthRitual();
        return;
      }

      if (this.finale.stage === "outro" && this.finale.timer >= 3.2) {
        this.finale.active = false;
        this.finale.completed = true;
        this.finale.farewellPending = true;
        this.finale.timer = 3.2;

        // Hand control back explicitly. The player should be able to hold and
        // leave HOME immediately after "……おかえり。".
        if (this.landPlanet && this.landPlanet.kind === "base") {
          this.mode = "landed";
        }
        this.restoreRitualActive = false;
        this.pressing = false;
        this.departHold = 0;
        this.repairTapArmed = false;
        this.repairInputLock = 0;
        this.openHomeTerminal();

        this.saveGame("finale");
      }
    }


    nearestUndiscoveredSera() {
      if (!this.echoes || this.echoes.found >= this.echoes.total) return null;

      let best = null;
      let bestD = Infinity;
      const consider = (planet) => {
        if (!planet || planet.kind !== "data") return;
        // The faint signal is only a gentle way back toward meaningful progress.
        // It does not hide locked SERA from the universe; it simply avoids
        // deliberately navigating the player to something E.V.E. cannot decode yet.
        if (!this.canInteractWithPlanet(planet)) return;
        const id = this.echoIdForPlanet(planet);
        if (!id || this.echoes.discovered.has(id)) return;
        const d = Math.hypot(planet.pos.x - this.ship.pos.x, planet.pos.y - this.ship.pos.y);
        if (d < bestD) { best = planet; bestD = d; }
      };

      for (const planet of this.fixedPlanets || []) consider(planet);

      // Search the deterministic atlas without turning the signal into a stored
      // waypoint. This allows any nearby procedural SERA to become the next Echo.
      if (this.planetAtlas) {
        const S = ATLAS_TUNE.sectorSize;
        const sx0 = Math.floor(this.ship.pos.x / S);
        const sy0 = Math.floor(this.ship.pos.y / S);
        const r = SIGNAL_TUNE.searchSectorRadius;
        for (let sx = sx0 - r; sx <= sx0 + r; sx += 1) {
          for (let sy = sy0 - r; sy <= sy0 + r; sy += 1) {
            for (const planet of this.planetAtlas.getSector(sx, sy)) consider(planet);
          }
        }
      }

      if (!best || bestD > SIGNAL_TUNE.maxSearchDistance) return null;
      return { planet: best, distance: bestD, id: this.echoIdForPlanet(best) };
    }

    updateFaintSignal(dt) {
      if (!this.signal) return;
      if (this.signal.pulseTimer > 0) this.signal.pulseTimer = Math.max(0, this.signal.pulseTimer - dt);

      // Do not compete with landing, memories, rescue, or the final return.
      const quiet = this.mode !== "flight" ||
        (this.echoStory && this.echoStory.active) ||
        (this.finale && this.finale.active) ||
        this.echoes.found >= this.echoes.total;
      if (quiet) {
        this.signal.timer = Math.max(this.signal.timer, 1.0);
        this.signal.pulseTimer = 0;
        return;
      }

      this.signal.timer -= dt;
      if (this.signal.timer > 0) return;
      this.signal.timer = SIGNAL_TUNE.interval;

      const hit = this.nearestUndiscoveredSera();
      if (!hit || hit.distance <= SIGNAL_TUNE.quietRadius) {
        this.signal.pulseTimer = 0;
        this.signal.dir = null;
        this.signal.targetId = null;
        this.signal.distance = hit ? hit.distance : Infinity;
        return;
      }

      const raw = sub(hit.planet.pos, this.ship.pos);
      const d = Math.max(0.001, len(raw));
      this.signal.dir = mul(raw, 1 / d);
      this.signal.targetId = hit.id;
      this.signal.distance = hit.distance;
      this.signal.pulseTimer = SIGNAL_TUNE.pulseSec;
    }

    drawFaintSignal() {
      if (!this.signal || this.signal.pulseTimer <= 0 || !this.signal.dir) return;
      if (this.mode !== "flight") return;

      const elapsed = SIGNAL_TUNE.pulseSec - this.signal.pulseTimer;
      const q = clamp(elapsed / SIGNAL_TUNE.pulseSec, 0, 1);
      const envelope = Math.sin(Math.PI * q);
      const flicker = 0.68 + 0.32 * Math.sin(this.simTime * 18.0);
      const a = 105 * envelope * flicker;
      if (a <= 1) return;

      const dir = this.signal.dir;
      const cx = W / 2, cy = H / 2;
      const halfW = Math.max(1, W / 2 - SIGNAL_TUNE.edgeInset);
      const halfH = Math.max(1, H / 2 - SIGNAL_TUNE.edgeInset);
      const tx = Math.abs(dir.x) > 0.0001 ? halfW / Math.abs(dir.x) : Infinity;
      const ty = Math.abs(dir.y) > 0.0001 ? halfH / Math.abs(dir.y) : Infinity;
      const t = Math.min(tx, ty);
      const x = cx + dir.x * t;
      const y = cy + dir.y * t;
      const hitVertical = tx < ty;
      const L = SIGNAL_TUNE.edgeLength * (0.82 + 0.18 * envelope);

      noFill();
      stroke(155, 205, 238, a * 0.38);
      strokeWidth(4.5);
      if (hitVertical) line(x, y - L * 0.52, x, y + L * 0.52);
      else line(x - L * 0.52, y, x + L * 0.52, y);

      stroke(190, 225, 246, a);
      strokeWidth(1.1);
      if (hitVertical) line(x, y - L * 0.5, x, y + L * 0.5);
      else line(x - L * 0.5, y, x + L * 0.5, y);
    }

    updateFlightFuel(distanceMoved) {
      // Range is a distance budget. Speed changes real-world travel time only.
      let distance = Math.max(0, Number(distanceMoved || 0));
      let multiplier = 1.0;
      if (this.dominantPlanet && this.dominantPlanet.name === "LUMA") multiplier *= 0.85;
      const spent = (distance / 1000) * RETURN_TUNE.fuelPer1000 * multiplier;
      this.resources.fuel = Math.max(0, this.resources.fuel - spent);

      const fraction = this.resources.fuel / Math.max(1, this.resources.fuelMax);
      if (fraction <= RETURN_TUNE.lowFuelFraction && !this.eve.lowFuelNotified && this.resources.fuel > 0) {
        this.eve.lowFuelNotified = true;
        this.sayEve(this.evePhaseLines().lowFuel, 3.0);
      } else if (fraction > RETURN_TUNE.lowFuelFraction && this.eve.lowFuelNotified) {
        this.eve.lowFuelNotified = false;
      }

      if (this.resources.fuel <= 0) this.startRescue();
    }

    updateBaseRefuel(dt) {
      if (!this.landPlanet || this.landPlanet.kind !== "base") return;
      if (this.resources.fuel >= this.resources.fuelMax) {
        this.baseRefuelTimer = 0;
        this.eve.lowFuelNotified = false;
        return;
      }
      this.baseRefuelTimer += dt;
      if (this.baseRefuelTimer < RETURN_TUNE.baseRefuelTick) return;
      this.baseRefuelTimer = 0;
      const requested = Math.max(1, Math.ceil(this.resources.fuelMax * RETURN_TUNE.baseRefuelFraction));
      const gained = Math.min(requested, this.resources.fuelMax - this.resources.fuel);
      if (gained > 0) {
        this.resources.fuel += gained;
        this.recordHarvest("refuel", gained);
        // A full tank is a stable HOME checkpoint, not an in-flight save.
        if (this.resources.fuel >= this.resources.fuelMax) this.saveGame("base-refueled");
      }
      if (this.resources.fuel / this.resources.fuelMax > RETURN_TUNE.lowFuelFraction) this.eve.lowFuelNotified = false;
    }

    onLanded() {
      const p = this.landPlanet;
      if (!p) return;
      if (p.kind === "neutral") {
        this.resetAstraQuiet(false);
        return;
      }
      this.resetAstraQuiet(true);

      if (p.kind === "mine" || p.kind === "data" || p.kind === "refuel") {
        this.sayEveLanding(p.kind);
      }

      if (p.kind === "base") {
        if (this.hasDepartedBase) this.pushSystemLog("returnedHome");
        this.hasDepartedBase = false;
        this.baseRefuelTimer = 0;
        this.openHomeTerminal();
        const away = Math.max(0, this.simTime - this.tripStartTime);
        if (this.shouldStartFinale()) {
          this.echoes.carriedThisTrip = 0;
          // Touching HOME commits the expedition before the non-interactive
          // finale starts. Reloading during the sequence will replay it safely.
          this.saveGame("base-return-final");
          this.startFinale(0.7);
        } else if (this.echoes && this.echoes.carriedThisTrip > 0) {
          // Returning with an Echo still matters, but the memory itself has
          // already spoken. Home only acknowledges that something came back.
          this.sayEve(this.formatEchoLine(this.echoReturnLine()), 3.5);
          this.echoes.carriedThisTrip = 0;
        } else {
          const lines = this.evePhaseLines();
          if (away > RETURN_TUNE.baseReturnLongSec) this.sayEve(lines.long, 3.0);
          else if (away > RETURN_TUNE.baseReturnNormalSec) this.sayEve(lines.normal, 3.0);
          else this.sayEve(lines.short, 2.4);
        }
        // Home is the checkpoint. The finale path already committed above.
        if (!this.finale.active) this.saveGame("base-return");
      }
    }


    openHomeTerminal() {
      if (!this.landPlanet || this.landPlanet.kind !== "base") return false;
      if (!this.homeTerminal) {
        this.homeTerminal = {
          visible: false,
          mode: "browse",
          pressed: null,
          status: "OFFLINE",
          restoreReportLevel: 0,
        };
      }
      this.homeTerminal.visible = true;
      this.homeTerminal.mode = "browse";
      this.homeTerminal.pressed = null;
      this.homeTerminal.status = "CONNECTED";
      this.homeTerminal.restoreReportLevel = 0;
      this.pressing = false;
      this.departHold = 0;
      this.repairTapArmed = false;
      return true;
    }

    closeHomeTerminal() {
      if (!this.homeTerminal) return;
      this.homeTerminal.visible = false;
      this.homeTerminal.mode = "browse";
      this.homeTerminal.pressed = null;
      this.homeTerminal.status = "DISCONNECTED";
      this.homeTerminal.restoreReportLevel = 0;
      this.pressing = false;
      this.departHold = 0;
    }

    homeTerminalLayout() {
      // The source window was 380x260. On the narrow Web canvas we preserve
      // its squat desktop-window proportion while keeping it clear of the
      // lower-left log and lower-right MiniMap.
      const w = Math.min(310, W - 34);
      const h = Math.min(238, H * 0.43);
      const x = (W - w) / 2;
      const hud = this.cockpitHudLayout();
      const centeredY = (H - h) / 2 + 28;
      const eveClearY = hud.eve.y + hud.eve.h + 12;
      const y = Math.max(centeredY, eveClearY);
      const titleH = 24;
      const close = { x: x + w - 24, y: y + h - 21, w: 17, h: 16 };
      const restore = { x: x + 26, y: y + 30, w: w - 52, h: 32 };
      const dialogW = Math.min(246, w - 34);
      const dialogH = 112;
      const dialog = {
        x: x + (w - dialogW) / 2,
        y: y + (h - dialogH) / 2 - 4,
        w: dialogW,
        h: dialogH,
      };
      dialog.yes = { x: dialog.x + 24, y: dialog.y + 18, w: 76, h: 28 };
      dialog.no = { x: dialog.x + dialog.w - 100, y: dialog.y + 18, w: 76, h: 28 };
      return { x, y, w, h, titleH, close, restore, dialog };
    }

    pointInRect(px, py, r) {
      return !!r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    }

    homeTerminalHit(x, y) {
      if (!this.homeTerminal || !this.homeTerminal.visible) return null;
      const L = this.homeTerminalLayout();

      if (this.homeTerminal.mode === "confirm") {
        if (this.pointInRect(x, y, L.dialog.yes)) return "yes";
        if (this.pointInRect(x, y, L.dialog.no)) return "no";
        return null;
      }

      if (this.pointInRect(x, y, L.close)) return "close";
      if (
        !(this.homeTerminal.restoreReportLevel >= 2) &&
        this.pointInRect(x, y, L.restore) &&
        this.canBaseRepair()
      ) return "restore";
      return null;
    }

    handleHomeTerminalTouch(touch) {
      if (!this.homeTerminal || !this.homeTerminal.visible) return false;

      // While connected to HOME, flight/takeoff input is completely isolated.
      this.pressing = false;
      this.departHold = 0;
      this.repairTapArmed = false;

      if (touch.state === BEGAN) {
        this.homeTerminal.pressed = this.homeTerminalHit(touch.x, touch.y);
        return true;
      }

      if (touch.state === MOVING) return true;

      if (touch.state === ENDED || touch.state === CANCELLED) {
        const pressed = this.homeTerminal.pressed;
        const released = touch.state === ENDED ? this.homeTerminalHit(touch.x, touch.y) : null;
        this.homeTerminal.pressed = null;

        if (!pressed || pressed !== released) return true;

        if (pressed === "close") {
          this.closeHomeTerminal();
          return true;
        }

        if (pressed === "restore") {
          this.homeTerminal.mode = "confirm";
          return true;
        }

        if (pressed === "no") {
          this.homeTerminal.mode = "browse";
          return true;
        }

        if (pressed === "yes") {
          this.homeTerminal.mode = "browse";
          this.tryBaseRepair();
          return true;
        }
        return true;
      }

      return true;
    }

    drawWinBevel(x, y, w, h, pressed = false) {
      const face = [212, 208, 200];
      const hi = pressed ? [80, 80, 80] : [255, 255, 255];
      const lo = pressed ? [255, 255, 255] : [80, 80, 80];
      noStroke();
      fill(face[0], face[1], face[2], 255);
      rect(x, y, w, h);

      strokeWidth(1);
      stroke(hi[0], hi[1], hi[2], 255);
      line(x, y + h, x + w, y + h);
      line(x, y, x, y + h);
      stroke(lo[0], lo[1], lo[2], 255);
      line(x, y, x + w, y);
      line(x + w, y, x + w, y + h);

      stroke(hi[0], hi[1], hi[2], 190);
      line(x + 1, y + h - 1, x + w - 1, y + h - 1);
      line(x + 1, y + 1, x + 1, y + h - 1);
      stroke(lo[0], lo[1], lo[2], 190);
      line(x + 1, y + 1, x + w - 1, y + 1);
      line(x + w - 1, y + 1, x + w - 1, y + h - 1);
    }

    drawHomeTerminalButton(r, label, enabled = true, pressed = false) {
      this.drawWinBevel(r.x, r.y, r.w, r.h, !!pressed);
      fill(enabled ? 0 : 125, enabled ? 0 : 125, enabled ? 0 : 125, 255);
      noStroke();
      font("monospace");
      fontSize(10.5);
      textAlign(CENTER);
      text(label, r.x + r.w / 2, r.y + r.h / 2 + 0.5);
    }

    restoreReportLines(level) {
      const lv = clamp(Math.floor(Number(level || 0)), 2, 5);
      const prev = PROGRESSION_TUNE.levels[lv - 1] || PROGRESSION_TUNE.levels[1];
      const curr = PROGRESSION_TUNE.levels[lv] || PROGRESSION_TUNE.levels[1];
      const prevRange = MINIMAP_RESTORE_TUNE.rangeMul[lv - 1] || 1;
      const currRange = MINIMAP_RESTORE_TUNE.rangeMul[lv] || 1;
      const prevStep = MINIMAP_RESTORE_TUNE.directionStepDeg[lv - 1];
      const currStep = MINIMAP_RESTORE_TUNE.directionStepDeg[lv];
      const deg = (value) => value > 0
        ? tx("home.restoreReport.degrees", { value })
        : tx("home.restoreReport.precise");

      const rows = [
        tx("home.restoreReport.complete"),
        tx("home.restoreReport.baseCore", { level: lv }),
        tx("home.restoreReport.shipFrame", {
          status: lv >= 5 ? tx("home.restoreReport.fullyRestored") : tx("home.restoreReport.updated")
        }),
        tx("home.restoreReport.eveLanguage", {
          status: lv >= 5 ? tx("home.restoreReport.completeStatus") : tx("home.restoreReport.updated")
        }),
        tx("home.restoreReport.fuelCapacity", { prev: prev.fuelMax, curr: curr.fuelMax }),
      ];

      if (curr.oreMax !== prev.oreMax) {
        rows.push(tx("home.restoreReport.oreCapacity", { prev: prev.oreMax, curr: curr.oreMax }));
      }

      rows.push(
        tx("home.restoreReport.navRange", { prev: prevRange.toFixed(2), curr: currRange.toFixed(2) }),
        tx("home.restoreReport.homeFix", { prev: deg(prevStep), curr: deg(currStep) }),
        tx("home.restoreReport.accessBand", { level: lv })
      );
      return rows;
    }

    drawRestoreReport(sx, sy, sw, sh, level) {
      const rows = this.restoreReportLines(level);
      const top = sy + sh - 15;
      const bottom = sy + 9;
      const usable = Math.max(1, top - bottom);
      const lineH = Math.min(13.2, usable / Math.max(1, rows.length - 1));

      font("monospace");
      textAlign(LEFT);
      noStroke();

      for (let i = 0; i < rows.length; i += 1) {
        const y = top - i * lineH;
        if (i === 0) {
          fill(0, 0, 128, 255);
          fontSize(9.8);
        } else {
          fill(0, 0, 0, 255);
          fontSize(8.6);
        }
        text(rows[i], sx + 10, y);
      }
    }

    drawHomeTerminal() {
      if (!this.homeTerminal || !this.homeTerminal.visible) return;
      if (!this.landPlanet || this.landPlanet.kind !== "base") return;
      if (this.finale && this.finale.active) return;

      const L = this.homeTerminalLayout();

      // Source-inspired desktop window: flat grey body, dark-blue title bar,
      // hard 3D bevels. No blur, no rounded Web cards.
      this.drawWinBevel(L.x, L.y, L.w, L.h, false);

      noStroke();
      fill(0, 0, 128, 255);
      rect(L.x + 3, L.y + L.h - L.titleH - 2, L.w - 6, L.titleH);

      fill(255, 255, 255, 255);
      font("monospace");
      fontSize(10.5);
      textAlign(LEFT);
      text(tx("home.terminalTitle"), L.x + 9, L.y + L.h - 14);

      this.drawWinBevel(
        L.close.x, L.close.y, L.close.w, L.close.h,
        this.homeTerminal.pressed === "close"
      );
      stroke(0, 0, 0, 255);
      strokeWidth(1.2);
      line(L.close.x + 5, L.close.y + 5, L.close.x + 12, L.close.y + 11);
      line(L.close.x + 12, L.close.y + 5, L.close.x + 5, L.close.y + 11);

      const cost = this.nextBaseRepairCost();
      const ready = this.canBaseRepair();
      const level = this.base ? this.base.level : 1;
      const echoFound = this.echoes ? this.echoes.found : 0;
      const echoTotal = this.echoes ? this.echoes.total : ECHO_TUNE.total;

      // Inset status panel.
      const sx = L.x + 18;
      const sy = L.y + 78;
      const sw = L.w - 36;
      const sh = L.h - 122;

      fill(236, 233, 216, 255);
      noStroke();
      rect(sx, sy, sw, sh);
      stroke(80, 80, 80, 255);
      strokeWidth(1);
      line(sx, sy + sh, sx + sw, sy + sh);
      line(sx, sy, sx, sy + sh);
      stroke(255, 255, 255, 255);
      line(sx, sy, sx + sw, sy);
      line(sx + sw, sy, sx + sw, sy + sh);

      const reportLevel = Math.floor(Number(this.homeTerminal.restoreReportLevel || 0));
      if (reportLevel >= 2) {
        this.drawRestoreReport(sx, sy, sw, sh, reportLevel);
      } else {
        font("monospace");
        textAlign(LEFT);
        noStroke();
        fontSize(8.9);

        // Use real columns instead of padding labels with spaces. The previous
        // single-string layout depended on glyph spacing and looked stretched
        // on mobile Safari.
        const labelX = sx + 10;
        const colonX = sx + 105;
        const valueX = sx + 119;
        const firstY = sy + sh - 17;
        const rowH = 17;
        const drawStatusRow = (row, label, value, valueColor = 0) => {
          const y = firstY - row * rowH;
          fill(0, 0, 0, 255);
          text(label, labelX, y);
          text(":", colonX, y);
          fill(valueColor, 0, 0, 255);
          text(String(value), valueX, y);
        };

        drawStatusRow(0, tx("home.labels.systemLink"), tx("home.values.online"));
        drawStatusRow(1, tx("home.labels.restore"), `${level}/5`);
        drawStatusRow(2, tx("home.labels.echoArchive"), `${echoFound}/${echoTotal}`);

        if (cost) {
          const oreOk = this.resources.ore >= cost.ore;
          const dataOk = this.resources.data >= cost.data;
          drawStatusRow(
            3,
            tx("home.labels.ore"),
            `${Math.floor(this.resources.ore)}/${cost.ore}`,
            oreOk ? 0 : 145
          );
          drawStatusRow(
            4,
            tx("home.labels.data"),
            `${Math.floor(this.resources.data)}/${cost.data}`,
            dataOk ? 0 : 145
          );
          drawStatusRow(5, tx("home.labels.status"), ready ? tx("home.values.restoreReady") : tx("home.values.waitingResources"));
        } else {
          drawStatusRow(3, tx("home.labels.ore"), `${Math.floor(this.resources.ore)}/${this.resources.oreMax}`);
          drawStatusRow(4, tx("home.labels.data"), `${Math.floor(this.resources.data)}/${this.resources.dataMax}`);
          drawStatusRow(5, tx("home.labels.status"), tx("home.values.restoreComplete"));
        }
      }

      const restoreLabel = reportLevel >= 2
        ? tx("home.restoreButton.complete")
        : (cost ? (ready ? tx("home.restoreButton.ready") : tx("home.restoreButton.locked")) : tx("home.restoreButton.complete"));
      this.drawHomeTerminalButton(
        L.restore,
        restoreLabel,
        reportLevel >= 2 ? false : !!(cost && ready),
        this.homeTerminal.pressed === "restore"
      );

      fill(75, 75, 75, 255);
      font("monospace");
      fontSize(7.2);
      textAlign(CENTER);
      // Two compact lines keep the launch instruction inside the terminal on
      // narrow phones instead of letting it run through the right frame.
      text(tx("home.disconnect"), L.x + L.w / 2, L.y + 20);
      text(tx("home.launchInstruction"), L.x + L.w / 2, L.y + 9);

      if (this.homeTerminal.mode === "confirm") {
        // Classic modal confirmation. It intentionally blocks all other HOME
        // interaction, keeping RESTORE deliberate and impossible to confuse
        // with takeoff.
        noStroke();
        fill(0, 0, 0, 60);
        rect(L.x + 3, L.y + 3, L.w - 6, L.h - 6);

        const D = L.dialog;
        this.drawWinBevel(D.x, D.y, D.w, D.h, false);
        noStroke();
        fill(0, 0, 128, 255);
        rect(D.x + 3, D.y + D.h - 24, D.w - 6, 21);

        fill(255, 255, 255, 255);
        font("monospace");
        fontSize(9.5);
        textAlign(LEFT);
        text(tx("home.confirmTitle"), D.x + 9, D.y + D.h - 14);

        fill(0, 0, 0, 255);
        fontSize(10);
        textAlign(CENTER);
        text(tx("home.confirmQuestion"), D.x + D.w / 2, D.y + 66);

        this.drawHomeTerminalButton(D.yes, tx("home.yes"), true, this.homeTerminal.pressed === "yes");
        this.drawHomeTerminalButton(D.no, tx("home.no"), true, this.homeTerminal.pressed === "no");
      }
    }

    nextBaseRepairCost() {
      if (!this.base || this.base.level >= 5) return null;
      return REPAIR_TUNE.costs[this.base.level] || null;
    }

    canBaseRepair() {
      const cost = this.nextBaseRepairCost();
      return !!(
        cost &&
        this.landPlanet &&
        this.landPlanet.kind === "base" &&
        this.resources.ore >= cost.ore &&
        this.resources.data >= cost.data
      );
    }

    tryBaseRepair() {
      const cost = this.nextBaseRepairCost();
      if (!cost || !this.canBaseRepair()) return false;

      const bridge = window.OrbitRitual;
      const ritual = RESTORE_RITUAL_BY_LEVEL[this.base.level];
      if (!ritual || !bridge || typeof bridge.start !== "function") return false;

      // v2.7.1: bridge.active is the single source of truth. Ritual visibility
      // is immediate and no longer depends on a READY handshake from the child.
      if (this.restoreRitualActive && !bridge.active) {
        this.restoreRitualActive = false;
      }
      if (bridge.active || this.restoreRitualActive) return false;

      this.restoreRitualActive = true;
      this.pressing = false;
      this.departHold = 0;
      this.repairTapArmed = false;
      this.eve.timer = 0;

      const started = bridge.start(ritual, () => {
        this.restoreRitualActive = false;
        this.completeBaseRepair(cost);
      });

      if (!started) {
        this.restoreRitualActive = false;
      }
      return !!started;
    }

    completeBaseRepair(cost) {
      if (!cost || !this.landPlanet || this.landPlanet.kind !== "base") return false;
      // Re-check the economy on completion so the ritual can never create
      // progress from a stale state. Normally resources cannot change while
      // the overlay is active, but keeping this guard makes the contract clear.
      if (this.resources.ore < cost.ore || this.resources.data < cost.data) return false;
      this.resources.ore -= cost.ore;
      this.resources.data -= cost.data;
      this.base.level = Math.min(5, this.base.level + 1);
      this.pushSystemLog("restoreLevel", { level: this.base.level });
      this.mode = "landed";
      this.pressing = false;
      this.departHold = 0;
      this.repairInputLock = 0;
      this.applyRestoreCaps(this.base.level, true);
      this.openHomeTerminal();
      this.homeTerminal.restoreReportLevel = this.base.level;
      this.base.repairPulse = REPAIR_TUNE.pulseSec;
      if (this.stationPulse) this.stationPulse.timer = this.stationPulse.duration;
      if (this.minimap) this.minimap.pulseTimer = 1.2;
      this.feedback = { kind: "repair", timer: 1.1 };
      // The ritual owns the immediate repair response. The *next departure*
      // owns a different beat: E.V.E. experiences the repaired body/sensors
      // once the ship is back in open space.
      this.eve.timer = 0;
      this.eve.restoreDepartureLevel = this.base.level;
      this.eve.departureLineLevel = 0;
      this.saveGame("base-repair");

      // Echo 12 may already be home when the last practical RESTORE completes.
      // In that case the story reveal can begin after the ritual has closed.
      if (this.shouldStartFinale()) this.startFinale(0.8);
      return true;
    }

    startRescue() {
      if (this.mode === "rescue") return;
      this.mode = "rescue";
      this.pressing = false;
      this.ship.vel = v(0, 0);
      this.rescue.timer = 0;
      this.rescue.didTeleport = false;
      this.rescue.postFadeTimer = 0;
      this.rescue.postFadeDuration = 0;
      this.rescue.pendingReturnLine = false;
      this.eve.lowFuelNotified = true;
      // No warning card or spoken explanation here. The CRT power-loss motion
      // itself communicates that the ship has gone dark.
      this.eve.timer = 0;
    }

    teleportToBase() {
      // Legacy helper retained for debug compatibility. Phase 12 rescue uses
      // HOME checkpoint rollback instead of preserving an unreturned trip.
      return this.loadGame();
    }

    resetHarvestCycle() {
      if (!this.harvest) return;
      this.harvest.timer = 0;
      this.harvest.threshold = RESOURCE_TUNE.mineTickMin;
      this.harvest.pulseTimer = 0;
      this.harvest.lastKind = null;
      this.harvest.lastAmount = 0;
      this.harvest.loggedThisLanding = false;
      this.harvest.fullSteamTimer = 0;
      this.harvest.fullSteamActive = false;
    }

    planetInteractionTier(planet) {
      if (!planet) return 1;
      const tier = Number(planet.interactionTier || planet.requiredLevel || relayTierForPosition(planet.pos.x, planet.pos.y));
      return clamp(Math.floor(tier || 1), 1, 5);
    }

    canInteractWithPlanet(planet) {
      if (!planet) return false;
      // HOME, quiet worlds and LUMA are open from the beginning. RESTORE gates
      // what can be extracted/decoded, not where the ship is allowed to travel.
      if (planet.kind === "base" || planet.kind === "neutral" || planet.kind === "refuel") return true;
      const currentLevel = clamp(Math.floor(Number(this.base && this.base.level || 1)), 1, 5);
      return currentLevel >= this.planetInteractionTier(planet);
    }

    canLandOnPlanet(planet) {
      if (!planet) return false;
      if (planet.kind === "base") return true;

      // Quiet ASTRA worlds remain physical places the player may settle on.
      // Resource worlds, however, only offer a landing while they can actually
      // be used. This keeps distant/locked worlds visible and reachable without
      // turning a landing into a text explanation about progression.
      if (planet.kind === "neutral") return true;

      if (planet.depleted || Number(planet.resourceCurrent || 0) <= 0) return false;
      if (
        planet.kind === "data" &&
        this.dataSignals &&
        this.dataSignals.decoded.has(this.echoIdForPlanet(planet))
      ) return false;
      if ((planet.kind === "mine" || planet.kind === "data") && !this.canInteractWithPlanet(planet)) return false;

      // LUMA is intentionally progression-open; it only becomes unavailable
      // after its local fuel reserve is exhausted.
      return planet.kind === "refuel" || planet.kind === "mine" || planet.kind === "data";
    }

    syncDiscoveredSeraState() {
      if (!this.echoes || !this.echoes.discovered) return;
      const decoded = new Set(this.dataSignals ? Array.from(this.dataSignals.decoded || []) : []);
      // Older saves predate the separate DATA archive; every discovered Echo in
      // those builds necessarily came from one decoded SERA.
      for (const id of this.echoes.discovered) decoded.add(id);

      const sync = (planet) => {
        if (!planet || planet.kind !== "data") return;
        const id = this.echoIdForPlanet(planet);
        if (id && decoded.has(id)) {
          planet.resourceCurrent = 0;
          planet.depleted = true;
        }
      };
      for (const planet of this.fixedPlanets || []) sync(planet);
      if (this.planetAtlas) {
        // A rescued procedural SERA may no longer be in the active cache after
        // the HOME rollback. Rebuild only sectors named by decoded signal ids.
        for (const id of decoded) {
          const m = /^P:(-?\d+):(-?\d+):(\d+)$/.exec(id);
          if (!m) continue;
          const planets = this.planetAtlas.getSector(Number(m[1]), Number(m[2]));
          for (const planet of planets) sync(planet);
        }
        if (this.planetAtlas.cache) {
          for (const planets of this.planetAtlas.cache.values()) {
            for (const planet of planets) sync(planet);
          }
        }
      }
    }

    captureDiscoveryProgress() {
      return {
        data: Math.max(0, Math.floor(Number(this.resources && this.resources.data || 0))),
        found: Math.max(0, Math.floor(Number(this.echoes && this.echoes.found || 0))),
        discovered: this.echoes ? Array.from(this.echoes.discovered || []) : [],
        decoded: this.dataSignals ? Array.from(this.dataSignals.decoded || []) : [],
      };
    }

    mergeDiscoveryProgress(snapshot) {
      if (!snapshot || !this.echoes || !this.resources) return;
      const merged = new Set(this.echoes.discovered || []);
      for (const id of snapshot.discovered || []) merged.add(id);
      this.echoes.discovered = merged;
      this.echoes.found = clamp(Math.max(this.echoes.found || 0, snapshot.found || 0, merged.size), 0, this.echoes.total);
      this.echoes.carriedThisTrip = 0;

      const decoded = new Set(this.dataSignals ? Array.from(this.dataSignals.decoded || []) : []);
      for (const id of snapshot.decoded || []) decoded.add(id);
      for (const id of merged) decoded.add(id);
      this.dataSignals.decoded = decoded;

      // DATA is decoded knowledge, not physical ORE. Once recovered it survives
      // an emergency return; the decoded-SERA archive prevents re-reading it.
      this.resources.data = clamp(Math.max(this.resources.data || 0, snapshot.data || 0), 0, this.resources.dataMax);
      this.syncDiscoveredSeraState();
      this.refreshActivePlanets(true);
    }

    lumaRelayTier(planet) {
      if (!planet || planet.kind !== "refuel") return 0;
      const tier = Number(planet.relayTier || relayTierForPosition(planet.pos.x, planet.pos.y));
      return clamp(Math.floor(tier), 1, 5);
    }

    canUseLumaRelay(planet) {
      return !!(planet && planet.kind === "refuel");
    }

    resourceRoom(kind) {
      if (kind === "mine") return Math.max(0, this.resources.oreMax - this.resources.ore);
      if (kind === "data") return Math.max(0, this.resources.dataMax - this.resources.data);
      if (kind === "refuel") return Math.max(0, this.resources.fuelMax - this.resources.fuel);
      return 0;
    }

    recordHarvest(kind, amount) {
      if (amount <= 0) return;
      this.harvest.lastKind = kind;
      this.harvest.lastAmount = Math.max(1, Math.round(amount));
      this.harvest.pulseTimer = 0.72;

      // SYSTEM records one quiet fact per resource stop, never every harvest tick.
      if (
        this.landPlanet &&
        this.landPlanet.kind !== "base" &&
        !this.harvest.loggedThisLanding
      ) {
        if (kind === "mine") {
          this.pushSystemLog("oreRecovered");
          this.harvest.loggedThisLanding = true;
        } else if (kind === "refuel") {
          this.pushSystemLog("fuelRecovered");
          this.harvest.loggedThisLanding = true;
        }
      }

      if (kind === "mine" || kind === "refuel" || kind === "data") {
        this.spawnHarvestSparks(kind);
      }
    }

    spawnHarvestSteam() {
      if (!this.harvest) return;
      if (!Array.isArray(this.harvest.sparks)) this.harvest.sparks = [];

      const p = this.landPlanet;
      let outward = v(0, 1);
      if (p && p.pos) {
        const away = sub(this.ship.pos, p.pos);
        if (len(away) > 0.001) outward = norm(away);
      }
      const source = add(this.ship.pos, mul(outward, 20));

      // Source steam: five slow grey-blue puffs, expanding as they rise.
      for (let i = 0; i < 5; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const speed = 10 + Math.random() * 20;
        this.harvest.sparks.push({
          x: source.x,
          y: source.y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          age: 0,
          life: 0.8 + Math.random() * 0.4,
          kind: "steam",
        });
      }
      if (this.harvest.sparks.length > 50) {
        this.harvest.sparks.splice(0, this.harvest.sparks.length - 50);
      }
    }

    spawnHarvestSparks(kind = "mine") {
      if (!this.harvest) return;
      if (!Array.isArray(this.harvest.sparks)) this.harvest.sparks = [];

      // Source-faithful resource FX. Original FXManager uses the same
      // 10-particle motion for fuel / ore / data; only the color changes.
      // fxPos sits 20 units outward from the landed ship.
      const p = this.landPlanet;
      let outward = v(0, 1);
      if (p && p.pos) {
        const away = sub(this.ship.pos, p.pos);
        if (len(away) > 0.001) outward = norm(away);
      }
      const source = add(this.ship.pos, mul(outward, 20));

      for (let i = 0; i < 10; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const speed = 25 + Math.random() * 35;
        this.harvest.sparks.push({
          x: source.x,
          y: source.y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          age: 0,
          life: 0.5,
          kind,
        });
      }

      if (this.harvest.sparks.length > 40) {
        this.harvest.sparks.splice(0, this.harvest.sparks.length - 40);
      }
    }

    updateHarvestSparks(dt) {
      if (!this.harvest || !Array.isArray(this.harvest.sparks)) return;
      for (let i = this.harvest.sparks.length - 1; i >= 0; i -= 1) {
        const s = this.harvest.sparks[i];
        s.age += dt;
        if (s.age >= s.life) {
          this.harvest.sparks.splice(i, 1);
          continue;
        }

        if (s.kind === "steam") {
          // Original steam drifts upward slowly with strong horizontal drag.
          s.vy += 8 * dt;
          s.vx *= Math.max(0, 1 - 0.9 * dt);
          s.vy *= Math.max(0, 1 - 0.5 * dt);
        } else {
          // Original FXManager gravity for fuel / ore / data particles.
          s.vy -= 30 * dt;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
    }

    drawHarvestSparks() {
      if (!this.harvest || !Array.isArray(this.harvest.sparks)) return;

      noStroke();
      for (const s of this.harvest.sparks) {
        const q = clamp(s.age / Math.max(0.001, s.life), 0, 1);

        if (s.kind === "steam") {
          const fade = (1 - q) * (1 - q);
          fill(200, 200, 220, 120 * fade);
          ellipse(s.x, s.y, 5 + 15 * q, 5 + 15 * q);
          continue;
        }

        const a = 255 * (1 - q);
        const size = 6 * (1 - q);
        if (s.kind === "refuel") {
          fill(100, 220, 255, a);
        } else if (s.kind === "data") {
          fill(120, 255, 140, a);
        } else {
          fill(255, 200, 120, a);
        }
        ellipse(s.x, s.y, size, size);
      }
    }

    spawnTakeoffParticles() {
      if (!this.landPlanet || !this.landPlanet.pos) return;
      if (!Array.isArray(this.takeoffParticles)) this.takeoffParticles = [];

      // Source-faithful takeoff blast:
      // 40 pale-blue particles fire back toward the planet (opposite launch),
      // spreading +/-45 degrees and easing out over 1.8 seconds.
      const towardPlanet = sub(this.landPlanet.pos, this.ship.pos);
      let blastDir = len(towardPlanet) > 0.001 ? norm(towardPlanet) : v(0, -1);
      const baseAngle = Math.atan2(blastDir.y, blastDir.x);
      const life = 1.8;

      for (let i = 0; i < 40; i += 1) {
        const angle = baseAngle + ((Math.random() * 90 - 45) * Math.PI / 180);
        const speed = 180 * (0.8 + Math.random() * 0.4);
        const startX = this.ship.pos.x;
        const startY = this.ship.pos.y;
        const endX = startX + Math.cos(angle) * speed * life;
        const endY = startY + Math.sin(angle) * speed * life;

        this.takeoffParticles.push({
          startX,
          startY,
          endX,
          endY,
          age: 0,
          life,
          size: 4 + Math.floor(Math.random() * 5),
          alpha: 150 + Math.floor(Math.random() * 71),
        });
      }
    }

    updateTakeoffParticles(dt) {
      if (!Array.isArray(this.takeoffParticles)) return;
      for (let i = this.takeoffParticles.length - 1; i >= 0; i -= 1) {
        const p = this.takeoffParticles[i];
        p.age += dt;
        if (p.age >= p.life) this.takeoffParticles.splice(i, 1);
      }
    }

    drawTakeoffParticles() {
      if (!Array.isArray(this.takeoffParticles) || !this.takeoffParticles.length) return;

      noStroke();
      for (const p of this.takeoffParticles) {
        const q = clamp(p.age / Math.max(0.001, p.life), 0, 1);
        const eased = 1 - (1 - q) * (1 - q); // tween.easing.quadOut
        const x = p.startX + (p.endX - p.startX) * eased;
        const y = p.startY + (p.endY - p.startY) * eased;
        const size = p.size * (1 - eased);
        const alpha = p.alpha * (1 - eased);

        fill(180, 220, 255, alpha);
        ellipse(x, y, size, size);
      }
    }

    updateHarvest(dt) {
      const p = this.landPlanet;
      if (!p || !p.kind) return;

      // Defensive gate for migrated/edge states. Normal flight now prevents a
      // landing on locked resource worlds, while still leaving those bodies
      // visible and physically reachable in space.
      if ((p.kind === "mine" || p.kind === "data") && !this.canInteractWithPlanet(p)) {
        this.harvest.timer = 0;
        return;
      }

      // A DATA packet can only be decoded once from each SERA. This archive is
      // intentionally separate from Echo discovery because post-12 DATA can be
      // valid even when its analysis contains no Echo.
      if (p.kind === "data") {
        const dataId = this.echoIdForPlanet(p);
        if (dataId && this.dataSignals && this.dataSignals.decoded.has(dataId)) {
          p.resourceCurrent = 0;
          p.depleted = true;
          this.harvest.timer = 0;
          return;
        }

        // Keep one analysis pipeline at a time. The planet remains landed and
        // will begin recovery automatically once the previous analysis clears.
        if (
          this.echoStory.active ||
          this.echoStory.analyzing ||
          this.echoStory.pendingTimer > 0 ||
          this.echoStory.analysisResultTimer > 0
        ) {
          this.harvest.timer = 0;
          return;
        }
      }

      if (p.depleted) return;

      const room = this.resourceRoom(p.kind);
      if (room <= 0) {
        this.harvest.timer = 0;

        // ORE/DATA full means the ship cannot accept more cargo. Reuse the
        // original small steam "sputter" as physical feedback. FUEL full stays
        // silent: refuelling simply has nothing left to do.
        if (p.kind === "mine" || p.kind === "data") {
          if (!this.harvest.fullSteamActive) {
            this.spawnHarvestSteam();
            this.harvest.fullSteamActive = true;
            this.harvest.fullSteamTimer = 0;
          } else {
            this.harvest.fullSteamTimer += dt;
            if (this.harvest.fullSteamTimer >= 2.0) {
              this.spawnHarvestSteam();
              this.harvest.fullSteamTimer = 0;
            }
          }
        }
        return;
      }

      this.harvest.fullSteamActive = false;
      this.harvest.fullSteamTimer = 0;

      this.harvest.timer += dt;
      const threshold = p.kind === "refuel" ? RESOURCE_TUNE.refuelTick : this.harvest.threshold;
      if (this.harvest.timer < threshold) return;
      this.harvest.timer = 0;

      let requested = 0;
      if (p.kind === "mine") {
        requested = RESOURCE_TUNE.mineGainMin + Math.floor(Math.random() * (RESOURCE_TUNE.mineGainMax - RESOURCE_TUNE.mineGainMin + 1));
      } else if (p.kind === "data") {
        requested = RESOURCE_TUNE.dataGain;
      } else if (p.kind === "refuel") {
        const span = RESOURCE_TUNE.refuelGainFractionMax - RESOURCE_TUNE.refuelGainFractionMin;
        const fraction = RESOURCE_TUNE.refuelGainFractionMin + Math.random() * span;
        requested = Math.max(1, Math.ceil(this.resources.fuelMax * fraction));
      }

      const available = Math.max(0, p.resourceCurrent || 0);
      let gained = Math.max(0, Math.min(requested, room, available));
      if (p.kind === "mine" || p.kind === "data") {
        gained = Math.max(0, Math.floor(gained + 1e-6));
      }

      if (gained > 0) {
        const echoCandidate = p.kind === "data" && this.canDiscoverEcho(p);

        if (p.kind === "mine") this.resources.ore += gained;
        else if (p.kind === "data") this.resources.data += gained;
        else if (p.kind === "refuel") this.resources.fuel += gained;

        p.resourceCurrent = Math.max(0, available - gained);
        if (p.resourceCurrent <= 0) p.depleted = true;
        this.recordHarvest(p.kind, gained);

        if (p.kind === "data") {
          const dataId = this.echoIdForPlanet(p);
          if (dataId && this.dataSignals) this.dataSignals.decoded.add(dataId);

          // One SERA packet is one DATA recovery. The analysis window, not the
          // pickup itself, reveals whether that packet contains an Echo.
          p.resourceCurrent = 0;
          p.depleted = true;
          this.echoStory.pendingIndex = echoCandidate ? this.echoes.found + 1 : 0;
          this.queueDataAnalysis(p);
        }
      }

      if (p.kind === "mine") {
        this.harvest.threshold = RESOURCE_TUNE.mineTickMin + Math.random() * RESOURCE_TUNE.mineTickJitter;
      } else if (p.kind === "data") {
        this.harvest.threshold = RESOURCE_TUNE.dataTickMin + Math.random() * RESOURCE_TUNE.dataTickJitter;
      }
    }

    startLanding(p) {
      if (!this.canLandOnPlanet(p)) return false;
      this.mode = "landing";
      this.landPlanet = p;
      const toward = sub(p.pos, this.ship.pos);
      const dir = len(toward) > 0.0001 ? norm(toward) : v(0, 1);
      const stopR = (p.radius || ORBIT_TUNE.fallbackPlanetRadius) * ORBIT_TUNE.landTargetFactor;
      this.landTarget = sub(p.pos, mul(dir, stopR));
      this.settleTimer = 0;
      this.ringStayTimer = 0;
      this.captureReady = false;
      this.lastLandingDistance = Infinity;
      this.pressing = false;
      this.startZoom(ORBIT_TUNE.landingZoom, 0.65);
      this.feedback = { kind: "landing", timer: 0.65 };
      return true;
    }

    startTakeoff() {
      if (!this.landPlanet) return;
      if (this.landPlanet.kind === "neutral") this.resetAstraQuiet(true);
      if (this.landPlanet.kind === "base") {
        if (this.homeTerminal && this.homeTerminal.visible) return;
        this.closeHomeTerminal();
        // Consume the one-time post-RESTORE voice before writing the HOME
        // departure checkpoint, so CONTINUE never replays a line already earned.
        const pendingRestoreLevel = Math.floor(Number(this.eve && this.eve.restoreDepartureLevel || 0));
        this.eve.departureLineLevel = pendingRestoreLevel;
        this.eve.restoreDepartureLevel = 0;

        // Departure is still HOME, so it is the cleanest rollback checkpoint:
        // refuel/repairs performed while docked are locked in before launch.
        this.pushSystemLog("departedHome");
        this.saveGame("base-departure");
        this.tripStartTime = this.simTime;
        this.hasDepartedBase = true;
        if (this.finale && this.finale.completed && this.finale.farewellPending) {
          this.finale.farewellPending = false;
          this.finale.farewellInFlight = true;
        }
      }
      this.mode = "takeoff";
      // Keep the launch-hold pointer alive. fixedTakeoff ignores steering for
      // the brief launch impulse, then fixedFlight inherits the same held touch.
      this.departHold = 0;
      let dirOut = sub(this.ship.pos, this.landPlanet.pos);
      dirOut = len(dirOut) < 1 ? v(0, 1) : norm(dirOut);
      // Keep the original one-second hold and outward direction, but Web ORBIT
      // now uses a dedicated launch phase rather than source-speed 120. The
      // surrounding flight physics changed too much for 120 to preserve the
      // original feel.
      this.launchDir = dirOut;
      this.launchTimer = 0;
      this.spawnTakeoffParticles();
      this.ship.vel = mul(dirOut, ORBIT_TUNE.launchSpeed);
      this.ship.damp = 1.0;
      this.relandLock = ORBIT_TUNE.relandLockSec;
      this.lastLandingDistance = Infinity;
      this.harvest.pulseTimer = 0;
      this.feedback = { kind: "takeoff", timer: 0.6 };
    }

    startZoom(target, duration) {
      this.zoomAnim = { from: this.cameraZoom, to: target, t: 0, duration: Math.max(0.001, duration) };
    }

    updateCameraZoom(dt) {
      if (!this.zoomAnim) return;
      this.zoomAnim.t += dt;
      const q = clamp(this.zoomAnim.t / this.zoomAnim.duration, 0, 1);
      const eased = 1 - (1 - q) * (1 - q);
      this.cameraZoom = this.zoomAnim.from + (this.zoomAnim.to - this.zoomAnim.from) * eased;
      if (q >= 1) this.zoomAnim = null;
    }

    gravityUpdate() {
      let total = v(0, 0);
      let closestSq = Infinity;
      let dominant = null;
      const shipPos = this.ship.pos;
      const shipVel = this.ship.vel;

      for (const p of this.planets) {
        const dir = sub(p.pos, shipPos);
        const d2 = dir.x * dir.x + dir.y * dir.y;
        const d = Math.max(1, Math.sqrt(d2));

        if (d2 >= p.range * p.range) continue;

        const core = p.core || SOURCE_LOCK.defaultCore;
        const soft = p.soft || SOURCE_LOCK.defaultSoft;
        const pow = p.power || SOURCE_LOCK.defaultPower;
        const grav = p.gravity || 1100;
        const weight = 1 - smoothstep(core, p.range, d);
        const aMag = (grav / Math.pow(d + soft, pow) * weight) * TUNE.gravityScale;
        const nrm = d > 0.0001 ? mul(dir, 1 / d) : v(0, 0);

        // Preserve executable source condition by default.
        const radialToward = dot(shipVel, dir);
        const shouldSwirl = SWIRL_MODE === "approach" ? radialToward > 0 : radialToward < 0;
        if (shouldSwirl) {
          const tang = v(-nrm.y, nrm.x);
          total = add(total, mul(tang, aMag * TUNE.swirlBase));
        }

        total = add(total, mul(nrm, aMag));

        const nearW = 1 - smoothstep(core, core * 2.2, d);
        const vr = dot(shipVel, nrm);
        total = sub(total, mul(nrm, vr * (TUNE.radialDamping * nearW)));

        const visualDiameter = p.range * 0.34;
        const visualRadius = visualDiameter / 2;
        const hardShellRadius = visualRadius * 0.9;

        if (d < hardShellRadius) {
          const radialVel = dot(this.ship.vel, nrm);
          if (radialVel > SOURCE_LOCK.hardRepelThreshold) {
            this.ship.vel = sub(
              this.ship.vel,
              mul(nrm, radialVel * (1 + SOURCE_LOCK.hardRepelBounce))
            );
            this.ship.pos = sub(this.ship.pos, mul(nrm, hardShellRadius - d));
            this.sayEveCollision();
            continue;
          }
        }

        if (d < core) {
          const pen = core - d;
          total = add(total, mul(nrm, pen * SOURCE_LOCK.repelK));
          this.ship.vel = mul(this.ship.vel, SOURCE_LOCK.repelFriction);
          this.ship.pos = sub(this.ship.pos, mul(nrm, Math.min(pen * 0.25, 2.0)));
        }

        if (d2 < closestSq) {
          closestSq = d2;
          dominant = p;
        }
      }

      if (dominant) {
        const p = dominant;
        const d = len(sub(p.pos, shipPos));
        const capMin = p.capMin || p.range * 0.62;
        const capMax = p.capMax || p.range * 0.78;

        if (d > capMin && d < capMax) {
          const nrm = mul(sub(p.pos, shipPos), 1 / Math.max(1, d));
          const tang = v(-nrm.y, nrm.x);
          const vr = dot(shipVel, nrm);
          const vt = dot(shipVel, tang);
          const ar = Math.max(0, (p.gravity || 1100) / Math.pow(d + (p.soft || 40), p.power || 2.0));
          const vtTarget = Math.sqrt(ar * d);
          const tangBoost = vtTarget - vt;
          total = add(total, mul(tang, tangBoost * TUNE.snapTangK));
          total = sub(total, mul(nrm, vr * TUNE.snapRadK));
        }

        const dist = Math.sqrt(closestSq);
        const nearW = 1 - smoothstep(p.core || 34, p.range, dist);
        if (PHYSICS_PROFILE === "source") {
          this.ship.damp = clamp((p.drag || 0.991) + (0.002 + 0.003 * nearW), 0.90, 0.9999);
        } else {
          // New Web feel: planets bend the route without suddenly killing momentum.
          this.ship.damp = clamp(TUNE.planetDampBase + TUNE.planetDampNearBonus * nearW, 0.90, 0.9999);
        }
      } else {
        // In the source, self.ship.baseDrag is never assigned in this file,
        // so the fallback 0.991 is the likely executable open-space value.
        this.ship.damp = clamp(TUNE.openSpaceDamp, 0.90, 0.9999);
      }

      this.dominantPlanet = dominant;
      return total;
    }

    updateTrail(dt) {
      this.trailAccumulator += dt;
      const step = 1 / SOURCE_LOCK.trailSpawnHz;
      while (this.trailAccumulator >= step) {
        this.trail.push({ x: this.ship.pos.x, y: this.ship.pos.y, age: 0, life: SOURCE_LOCK.trailLifetime });
        this.trailAccumulator -= step;
      }
      for (let i = this.trail.length - 1; i >= 0; i -= 1) {
        this.trail[i].age += dt;
        if (this.trail[i].age >= this.trail[i].life) this.trail.splice(i, 1);
      }
      while (this.trail.length > SOURCE_LOCK.trailMax) this.trail.shift();
    }

    draw() {
      const bg = SOURCE_LOCK.background;
      background(bg[0], bg[1], bg[2]);

      // Zoom is centered on the pod, as in the original landing presentation.
      pushMatrix();
      translate(W / 2, H / 2);
      scale(this.cameraZoom);
      translate(-W / 2, -H / 2);
      this.starfield.draw(this.camera);
      popMatrix();
      this.drawAstraMeteors();

      pushMatrix();
      translate(W / 2, H / 2);
      scale(this.cameraZoom);
      translate(-W / 2, -H / 2);
      translate(W / 2 - this.camera.x, H / 2 - this.camera.y);
      this.drawPlanets();
      this.drawCaptureEffects();
      this.drawTrail();
      this.drawTakeoffParticles();
      this.drawShip();
      this.drawHarvestSparks();
      popMatrix();

      this.drawPhaseFeedback();
      this.drawHarvestFeedback();
      this.drawResourceHUD();
      this.drawMiniMap();
      this.drawFaintSignal();
      this.drawDataAnalysis();
      this.drawEchoMemory();
      this.drawSystemConsole();
      this.drawHomeTerminal();
      // E.V.E. is a voice, not a cockpit log. Draw her after HOME so return
      // lines remain audible/visible even while the terminal is connected.
      if (!(this.finale && this.finale.active && this.finale.timer >= 0)) this.drawEveSpeech();
      this.drawFinaleOverlay();
      this.drawRescueOverlay();
      if (DEBUG) this.drawDebug();
    }

    drawDashedCircle(cx, cy, radius, phase, alpha, thickness = 1.5) {
      const segments = 32;
      const dashFrac = 0.58;
      stroke(175, 215, 245, alpha);
      strokeWidth(thickness);
      noFill();
      for (let i = 0; i < segments; i += 1) {
        if (i % 2 !== 0) continue;
        const a0 = phase + (i / segments) * TWO_PI;
        const a1 = phase + ((i + dashFrac) / segments) * TWO_PI;
        line(cx + Math.cos(a0) * radius, cy + Math.sin(a0) * radius,
             cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius);
      }
    }

    drawCaptureEffects() {
      if (this.mode !== "flight" || !this.dominantPlanet || this.relandLock > 0) return;
      const p = this.dominantPlanet;
      if (!this.canLandOnPlanet(p)) return;

      const d = len(sub(p.pos, this.ship.pos));
      if (d >= ORBIT_TUNE.landingMarkerRevealRadius) return;

      // v2.7.18: landing readiness is no longer drawn as a permanent marker.
      // The ship's sensor occasionally catches a return from the near-side limb
      // of a usable planet. A fast approach produces no echo: at that speed the
      // same body remains something to bounce from, not a landing target.
      const speed = len(this.ship.vel);
      if (speed > ORBIT_TUNE.landingMaxSpeed) return;

      const now = performance.now() / 1000;
      const triggerR = ORBIT_TUNE.landingTriggerRadius;
      const closeness = clamp((ORBIT_TUNE.landingMarkerRevealRadius - d) /
        Math.max(1, ORBIT_TUNE.landingMarkerRevealRadius - triggerR), 0, 1);

      // Most of the cycle is intentionally dark. The echo exists only as a
      // brief scan return, so it reads as instrumentation rather than a UI ring.
      const cycle = 1.55 - 0.18 * closeness;
      const localTime = (now + (p.phase || 0) * 0.13) % cycle;
      const pulseTime = 0.34;
      if (localTime > pulseTime) return;

      const q = clamp(localTime / pulseTime, 0, 1);
      const envelope = Math.sin(Math.PI * q);
      const towardShip = norm(sub(this.ship.pos, p.pos));
      const baseAngle = Math.atan2(towardShip.y, towardShip.x);

      // Sweep a narrow glint across the ship-facing edge. It sits just outside
      // the visible body, like a radar/field return grazing the surface.
      const bodyRadius = p.range * 0.17;
      const echoRadius = bodyRadius + 5 + 1.5 * closeness;
      const sweepOffset = -0.20 + 0.40 * q;
      const echoCenter = baseAngle + sweepOffset;
      const brightSpan = 0.18;
      const faintSpan = 0.34;
      const brightSteps = 6;
      const faintSteps = 10;
      const alpha = (55 + 125 * closeness) * envelope;

      const drawArc = (span, steps, radius, a, width) => {
        let px = null, py = null;
        for (let i = 0; i <= steps; i += 1) {
          const t = i / steps;
          const ang = echoCenter - span / 2 + span * t;
          const x = p.pos.x + Math.cos(ang) * radius;
          const y = p.pos.y + Math.sin(ang) * radius;
          if (px !== null) line(px, py, x, y);
          px = x; py = y;
        }
      };

      noFill();
      stroke(155, 205, 238, alpha * 0.34);
      strokeWidth(2.6);
      drawArc(faintSpan, faintSteps, echoRadius + 1.5, alpha * 0.34, 2.6);

      stroke(220, 240, 252, alpha);
      strokeWidth(0.95 + 0.25 * closeness);
      drawArc(brightSpan, brightSteps, echoRadius, alpha, 0.95 + 0.25 * closeness);
    }

    drawPhaseFeedback() {
      if (this.mode !== "landed") return;
      const q = clamp(this.departHold / ORBIT_TUNE.takeoffHoldSec, 0, 1);
      if (q <= 0) return;

      // v2.7.19: takeoff is no longer shown as a circular progress UI.
      // Holding the ship against the surface disturbs the local field instead:
      // sparse cosmic-ray traces begin to bend toward the pod, compress and
      // brighten as the one-second launch threshold approaches.
      const cx = W / 2, cy = H / 2;
      const t = this.simTime;
      const visibleCount = 4 + Math.floor(q * 5); // 4 -> 9, intentionally sparse
      const outerR = 48 - 15 * q;
      const inward = 8 + 12 * q;
      const baseAlpha = 24 + 78 * q;
      const flicker = 0.82 + 0.18 * Math.sin(t * 19.0);

      // Irregular angular spacing avoids reading as another hidden ring gauge.
      const angles = [-2.72, -2.05, -1.28, -0.52, 0.18, 0.93, 1.67, 2.31, 2.86];
      noFill();
      for (let i = 0; i < visibleCount; i += 1) {
        const a = angles[i] + 0.035 * Math.sin(t * (2.2 + i * 0.17) + i * 1.7);
        const radial = v(Math.cos(a), Math.sin(a));
        const tangent = v(-radial.y, radial.x);
        const wobble = Math.sin(t * (4.0 + i * 0.23) + i * 2.1);
        const r0 = outerR + 4.0 * wobble;
        const bend = (5.5 - 2.5 * q) * Math.sin(i * 2.33 + t * 1.8);

        const p0 = add(v(cx, cy), add(mul(radial, r0), mul(tangent, bend)));
        const p1 = add(v(cx, cy), add(mul(radial, r0 - inward * 0.48), mul(tangent, bend * 0.46)));
        const p2 = add(v(cx, cy), mul(radial, r0 - inward));

        const strandAlpha = baseAlpha * flicker * (0.72 + 0.28 * Math.sin(i * 1.91 + t * 7.0));
        stroke(135, 190, 225, strandAlpha * 0.34);
        strokeWidth(2.6);
        line(p0.x, p0.y, p1.x, p1.y);
        stroke(205, 232, 248, strandAlpha);
        strokeWidth(0.8 + 0.35 * q);
        line(p0.x, p0.y, p1.x, p1.y);
        line(p1.x, p1.y, p2.x, p2.y);
      }

      // Close to launch, add only a tiny central interference shimmer. This is
      // deliberately not a completion flash or percentage cue.
      if (q > 0.72) {
        const e = clamp((q - 0.72) / 0.28, 0, 1);
        const a = (18 + 46 * e) * (0.72 + 0.28 * Math.sin(t * 23.0));
        stroke(220, 240, 252, a);
        strokeWidth(0.8);
        const span = 8 + 5 * e;
        line(cx - span, cy + 2, cx - 3, cy);
        line(cx + 3, cy, cx + span, cy - 2);
      }
    }

    drawRescueOverlay() {
      const inPowerLoss = this.mode === "rescue";
      const inHomeReveal = this.rescue && this.rescue.postFadeTimer > 0;
      if (!inPowerLoss && !inHomeReveal) return;

      noStroke();

      if (inPowerLoss) {
        const t = this.rescue.timer;
        const collapse = RESCUE_CRT_TUNE.collapseSec;
        const lineEnd = collapse + RESCUE_CRT_TUNE.lineHoldSec;

        if (t < collapse) {
          // Two black shutters close toward the centre. We deliberately do not
          // add labels: the remaining strip of the actual game image is the CRT.
          const q0 = clamp(t / Math.max(0.001, collapse), 0, 1);
          const q = 1 - (1 - q0) * (1 - q0);
          const halfBlack = (H * 0.5) * q;
          fill(0, 0, 0, 255);
          rect(0, 0, W, halfBlack);
          rect(0, H - halfBlack, W, halfBlack);

          const slit = Math.max(1, H * (1 - q));
          const lineA = 70 + 145 * q;
          fill(220, 238, 250, lineA);
          rect(0, H / 2 - Math.min(1.2, slit * 0.5), W, Math.min(2.4, slit));
          return;
        }

        // Once the picture has collapsed, the set is fully dark. A short pale
        // line dies away first, then only black remains until HOME is restored.
        fill(0, 0, 0, 255);
        rect(0, 0, W, H);
        if (t < lineEnd) {
          const q = clamp((t - collapse) / Math.max(0.001, RESCUE_CRT_TUNE.lineHoldSec), 0, 1);
          const a = 225 * (1 - q);
          fill(225, 242, 252, a);
          rect(0, H / 2 - 0.7, W, 1.4);
        }
        return;
      }

      // HOME already exists underneath this overlay. Hold black for one quiet
      // beat, then dissolve it slowly instead of cutting back to the cockpit.
      const duration = Math.max(0.001, this.rescue.postFadeDuration || 1);
      const elapsed = duration - this.rescue.postFadeTimer;
      const hold = RESCUE_CRT_TUNE.postBlackHoldSec;
      let a = 255;
      if (elapsed > hold) {
        const q = clamp((elapsed - hold) / Math.max(0.001, RESCUE_CRT_TUNE.homeFadeSec), 0, 1);
        const eased = q * q * (3 - 2 * q);
        a = 255 * (1 - eased);
      }
      fill(0, 0, 0, a);
      rect(0, 0, W, H);
    }

    drawDataAnalysis() {
      if (!this.echoStory) return;
      const showingAnalysis = this.echoStory.analyzing;
      const showingResult = this.echoStory.analysisResultTimer > 0 && !!this.echoStory.analysisResult;
      if (!showingAnalysis && !showingResult) return;
      if (this.finale && this.finale.active) return;

      const w = 264;
      const h = 126;
      const x = (W - w) / 2;
      const y = H / 2 - h / 2 + 8;

      this.drawWinBevel(x, y, w, h, false);
      noStroke();
      fill(0, 0, 128, 255);
      rect(x + 3, y + h - 24, w - 6, 21);

      fill(255, 255, 255, 255);
      font("monospace");
      fontSize(9.8);
      textAlign(LEFT);
      text(tx("dataAnalysis.title"), x + 9, y + h - 14);

      if (showingAnalysis) {
        const lines = String(this.echoAnalysisLine() || tx("dataAnalysis.analyzing")).split("\n");
        fill(0, 0, 0, 255);
        fontSize(9.4);
        textAlign(LEFT);
        const firstY = y + h - 46;
        for (let i = 0; i < Math.min(2, lines.length); i += 1) {
          text(lines[i], x + 14, firstY - i * 14);
        }

        // Classic segmented progress: visibly mechanical, no percentage text.
        const blocks = 16;
        const gap = 2;
        const barX = x + 14;
        const barY = y + 20;
        const barW = w - 28;
        const barH = 17;
        this.drawWinBevel(barX, barY, barW, barH, true);

        const innerX = barX + 4;
        const innerY = barY + 4;
        const innerW = barW - 8;
        const innerH = barH - 8;
        const bw = (innerW - gap * (blocks - 1)) / blocks;
        const progress = clamp(1 - this.echoStory.analysisTimer / Math.max(0.001, ECHO_TUNE.analysisSec), 0, 1);
        const lit = Math.floor(progress * blocks + 1e-6);

        noStroke();
        for (let i = 0; i < blocks; i += 1) {
          if (i < lit) fill(0, 0, 128, 255);
          else fill(190, 190, 190, 255);
          rect(innerX + i * (bw + gap), innerY, bw, innerH);
        }
        return;
      }

      fill(0, 0, 0, 255);
      fontSize(9.5);
      textAlign(CENTER);
      text(tx("dataAnalysis.complete"), W / 2, y + 65);

      if (this.echoStory.analysisResult === "echo") {
        fill(0, 0, 128, 255);
        fontSize(11.2);
        text(tx("dataAnalysis.echoDetected"), W / 2, y + 40);
      } else {
        fill(75, 75, 75, 255);
        fontSize(10.7);
        text(tx("dataAnalysis.noEcho"), W / 2, y + 40);
      }
    }

    drawEchoMemory() {
      if (!this.echoStory || !this.echoStory.active) return;
      const item = ECHO_MEMORIES[this.echoStory.index - 1];
      if (!item) return;
      const q = clamp(this.echoStory.timer / Math.max(0.001, ECHO_TUNE.memorySec), 0, 1);
      const fadeIn = clamp((ECHO_TUNE.memorySec - this.echoStory.timer) / 0.35, 0, 1);
      const fadeOut = clamp(this.echoStory.timer / 0.55, 0, 1);
      const a = 230 * Math.min(fadeIn, fadeOut);

      noStroke();
      fill(3, 7, 13, 150 * Math.min(fadeIn, fadeOut));
      rect(24, H / 2 - 72, W - 48, 150, 10);

      fill(165, 205, 235, a);
      font("monospace");
      fontSize(9);
      textAlign(CENTER);
      text(tx("echo.header", {
        index: String(this.echoStory.index).padStart(2, "0"),
        total: this.echoes.total,
        key: item.key
      }), W / 2, H / 2 + 46);

      fill(230, 237, 244, a);
      fontSize(12);
      text(item.lines[0], W / 2, H / 2 + 8);
      text(item.lines[1], W / 2, H / 2 - 18);

      // A tiny residual line keeps this feeling like recovered signal, not a
      // modal story card or collectible inventory.
      fill(130, 160, 190, a * 0.65);
      fontSize(8);
      text(tx("hud.memoryFragment"), W / 2, H / 2 - 51);
    }

    drawFinaleOverlay() {
      if (!this.finale || !this.finale.active || this.finale.timer < 0) return;
      if (this.finale.stage === "ritual") return;

      const t = this.finale.timer;
      const segment = (start, end, fade = 0.45) => {
        if (t < start || t >= end) return 0;
        return Math.min(1, (t - start) / fade, (end - t) / fade);
      };

      // HOME remains visible beneath the story. The final sync belongs to this
      // place, not to a separate ending screen.
      noStroke();
      fill(2, 5, 10, 105);
      rect(0, 0, W, H);
      font("monospace");
      textAlign(CENTER);

      if (this.finale.stage === "outro") {
        const a = segment(0.15, 3.05, 0.55);
        if (a > 0) {
          fill(220, 233, 244, 235 * a);
          fontSize(13);
          text(tx("finale.outro"), W / 2, H / 2 + 4);
        }
        return;
      }

      let a = segment(0.0, 2.7);
      if (a > 0) {
        fill(220, 233, 244, 235 * a);
        fontSize(13);
        text(tx("finale.connected"), W / 2, H / 2 + 6);
      }

      a = segment(3.0, 5.9);
      if (a > 0) {
        fill(170, 205, 235, 220 * a);
        fontSize(10);
        text(tx("finale.eveName"), W / 2, H / 2 + 18);
        fill(232, 238, 245, 240 * a);
        fontSize(14);
        text(tx("finale.expansion"), W / 2, H / 2 - 12);
      }

      a = segment(6.2, 10.5);
      if (a > 0) {
        fill(220, 233, 244, 235 * a);
        fontSize(11);
        text(tx("finale.accident1"), W / 2, H / 2 + 34);
        text(tx("finale.accident2"), W / 2, H / 2 + 4);
        text(tx("finale.accident3"), W / 2, H / 2 - 26);
      }

      a = segment(10.8, 13.15);
      if (a > 0) {
        fill(225, 236, 245, 240 * a);
        fontSize(13);
        text(tx("finale.returnMemory"), W / 2, H / 2 + 4);
      }
    }

    normalizeSystemLogEntry(entry) {
      if (entry && typeof entry === "object" && typeof entry.key === "string") {
        return { key: entry.key, vars: entry.vars && typeof entry.vars === "object" ? { ...entry.vars } : {} };
      }

      const legacy = String(entry || "").trim();
      if (!legacy) return { key: "boot", vars: {} };
      const direct = {
        "SYSTEM BOOT": "boot",
        "E.V.E. ONLINE.": "eveOnline",
        "EMERGENCY RETURN": "emergencyReturn",
        "RETURNED HOME": "returnedHome",
        "ORE RECOVERED": "oreRecovered",
        "FUEL RECOVERED": "fuelRecovered",
        "DEPARTED HOME": "departedHome",
      };
      if (direct[legacy]) return { key: direct[legacy], vars: {} };

      let match = /^RESTORE LEVEL (\d+)$/.exec(legacy);
      if (match) return { key: "restoreLevel", vars: { level: match[1] } };
      match = /^ECHO (\d+) RECOVERED$/.exec(legacy);
      if (match) return { key: "echoRecovered", vars: { index: match[1] } };

      return { legacy, vars: {} };
    }

    systemLogText(entry) {
      const normalized = this.normalizeSystemLogEntry(entry);
      if (normalized.legacy) return normalized.legacy;
      return tx(`system.${normalized.key}`, normalized.vars || {});
    }

    pushSystemLog(key, vars = {}) {
      const entry = { key: String(key || ""), vars: vars && typeof vars === "object" ? { ...vars } : {} };
      if (!entry.key) return;
      if (!Array.isArray(this.systemLog)) this.systemLog = [];
      const rendered = this.systemLogText(entry);
      const last = this.systemLog.length ? this.systemLogText(this.systemLog[this.systemLog.length - 1]) : "";
      if (last === rendered) return;
      this.systemLog.push(entry);
      if (this.systemLog.length > 12) {
        this.systemLog.splice(0, this.systemLog.length - 12);
      }
    }

    drawSystemConsole() {
      if (this.mode === "rescue") return;
      if (this.echoStory && this.echoStory.active) return;
      if (this.finale && this.finale.active) return;

      const L = this.cockpitHudLayout();
      const P = L.status;
      const dividerY = P.y + P.h - 85;

      const sourceLines = Array.isArray(this.systemLog) && this.systemLog.length
        ? this.systemLog
        : [{ key: "boot", vars: {} }, { key: "eveOnline", vars: {} }];
      const saving = this.savePulse > 0;
      const lines = sourceLines
        .slice(saving ? -2 : -3)
        .map((entry) => ({ text: this.systemLogText(entry), transient: false }));

      // SAVED is a display-only system event. It never enters systemLog, so
      // repeated checkpoints cannot fill the voyage history with save notices.
      if (saving) {
        lines.push({ text: tx("hud.saved"), transient: true });
      }

      font("monospace");
      textAlign(LEFT);
      fontSize(8.1);
      const lineH = 14;
      const topY = dividerY - 15;
      for (let i = 0; i < lines.length; i += 1) {
        const age = lines.length - 1 - i;
        const baseAlpha = age === 0 ? 165 : Math.max(72, 132 - age * 24);
        const saveAlpha = lines[i].transient
          ? clamp(this.savePulse / SAVE_TUNE.pulseSec, 0, 1)
          : 1;
        noStroke();
        fill(190, 218, 236, baseAlpha * saveAlpha);
        text(String(lines[i].text), P.x + 9, topY - i * lineH);
      }

      // One tiny idle cursor keeps the lower instrument alive without
      // competing with E.V.E.'s dedicated dialogue window above it.
      if (Math.floor(performance.now() / 850) % 2 === 0) {
        noStroke();
        fill(160, 205, 235, 78);
        rect(P.x + 9, P.y + 9, 7, 1);
      }
    }

    drawEveSpeech() {
      if (!this.eve) return;
      if (this.mode === "rescue") return;
      if (this.echoStory && this.echoStory.active) return;
      if (this.finale && this.finale.active) return;

      const L = this.cockpitHudLayout();
      const P = L.eve;
      const speaking = this.eve.timer > 0 && !!this.eve.text;
      if (!speaking) return;

      // E.V.E. is a voice, not telemetry. The original was easy to read
      // because it used a normal medium-weight face at a generous size against
      // a strongly isolated dark surface. Preserve that reason, not the exact UI.
      const bodyFontSize = 13.5;
      const labelFontSize = 12.5;
      const bodyFont = (typeof SSE !== "undefined" && SSE.theme)
        ? SSE.theme.font("ui")
        : '"Hiragino Sans", "Noto Sans JP", sans-serif';
      const labelCol = Math.min(86, Math.max(72, P.w * 0.245));
      const bodyX = P.x + labelCol;
      const textMaxWidth = Math.max(60, P.x + P.w - bodyX - 14);

      const measure = (value) => {
        const s = String(value || "");
        if (
          typeof SSE !== "undefined" &&
          SSE.type &&
          typeof SSE.type.measure === "function"
        ) {
          return SSE.type.measure(s, "body", { size: bodyFontSize, font: "ui" });
        }
        return Array.from(s).length * bodyFontSize * 0.58;
      };

      const visual = [];
      const noLineStart = new Set(Array.from("、。，．！？!?：；)]｝〕〉》」』】〙〗〟’”"));
      const noLineEnd = new Set(Array.from("([｛〔〈《「『【〘〖〝‘“"));

      const pushWrapped = (source) => {
        const raw = String(source || "").trim();
        if (!raw) return;

        const tokens = raw.match(/[A-Za-z0-9][A-Za-z0-9._:+\-/?'’]*/g) || [];
        const mixed = [];
        let cursor = 0;
        for (const token of tokens) {
          const at = raw.indexOf(token, cursor);
          if (at > cursor) mixed.push(...Array.from(raw.slice(cursor, at)));
          mixed.push(token);
          cursor = at + token.length;
        }
        if (cursor < raw.length) mixed.push(...Array.from(raw.slice(cursor)));

        let line = "";
        const flush = () => {
          const out = line.trimEnd();
          if (out) visual.push(out);
          line = "";
        };

        for (let token of mixed) {
          if (/^\s+$/.test(token)) {
            if (line && !line.endsWith(" ")) token = " ";
            else continue;
          }

          const candidate = line + token;
          if (!line || measure(candidate) <= textMaxWidth) {
            line = candidate;
            continue;
          }

          const first = Array.from(token)[0] || "";
          if (noLineStart.has(first) && line) {
            const chars = Array.from(line.trimEnd());
            const carry = chars.pop() || "";
            const previous = chars.join("").trimEnd();
            if (previous) visual.push(previous);
            line = carry + token;
            continue;
          }

          const lineChars = Array.from(line.trimEnd());
          const last = lineChars[lineChars.length - 1] || "";
          if (noLineEnd.has(last)) {
            lineChars.pop();
            const previous = lineChars.join("").trimEnd();
            if (previous) visual.push(previous);
            line = last;
          } else {
            flush();
          }

          if (measure(line + token) > textMaxWidth && token.length > 1) {
            for (const ch of Array.from(token)) {
              const next = line + ch;
              if (line && measure(next) > textMaxWidth) flush();
              line += ch;
            }
          } else {
            line += token;
          }
        }
        flush();
      };

      if (speaking) {
        for (const raw of String(this.eve.text).split(/\n+/)) pushWrapped(raw);
      }

      let speechAlpha = 0;
      let slideY = 0;
      if (speaking) {
        const dur = Math.max(0.1, this.eve.duration || this.eve.timer || 0.1);
        const elapsed = Math.max(0, dur - this.eve.timer);
        const enterSec = 0.4;
        const exitSec = 0.5;
        const enterT = clamp(elapsed / enterSec, 0, 1);
        const enterEase = 1 - (1 - enterT) * (1 - enterT);
        const exitT = clamp((exitSec - this.eve.timer) / exitSec, 0, 1);
        const exitEase = exitT * exitT;
        speechAlpha = Math.min(enterEase, 1 - exitEase);
        const slidePhase = Math.max(1 - enterEase, exitEase);
        slideY = -3 * slidePhase;
      }

      const flicker = 1.0 + Math.sin((performance.now() / 1000) * 15) * 0.15;

      // Communications surface: the backdrop deliberately blocks most of the
      // planet/space pattern so contrast is stable regardless of what is behind it.
      noStroke();
      fill(10, 15, 30, 214 * speechAlpha);
      rect(P.x, P.y, P.w, P.h);

      noFill();
      stroke(
        120, 190, 225,
        104 * speechAlpha * flicker
      );
      strokeWidth(0.68);
      rect(P.x, P.y, P.w, P.h);

      const firstY = P.y + P.h - 25;

      font(bodyFont);
      textAlign(LEFT);
      noStroke();
      fontSize(labelFontSize);
      fill(210, 232, 246, 228 * speechAlpha);
      text(tx("hud.eveLabel"), P.x + 12, firstY);

      if (!visual.length) return;

      fontSize(bodyFontSize);
      fill(248, 250, 252, 250 * speechAlpha);
      const lineH = 18.5;
      for (let i = 0; i < visual.length; i += 1) {
        const yy = firstY + slideY - i * lineH;
        if (yy < P.y + 10) break;
        text(visual[i], bodyX, yy);
      }
    }

    drawHarvestFeedback() {
      if (this.harvest && this.harvest.pulseTimer > 0 && this.harvest.lastKind) {
        const q = clamp(this.harvest.pulseTimer / 0.72, 0, 1);
        const rise = (1 - q) * 14;
        const fy = H / 2 + 48 + rise;

        font("monospace");
        fontSize(11.8);
        textAlign(CENTER);

        if (this.harvest.lastKind === "mine") {
          // Resource pickup = icon + integer only. Keep the whole unit compact
          // so it reads instantly without becoming another text notification.
          this.drawCargoIcon("ore", W / 2 - 12, fy, 0.82, q);
          noStroke();
          fill(255, 110, 90, 225 * q);
          textAlign(LEFT);
          text(`+${this.harvest.lastAmount}`, W / 2 - 2, fy);
        } else if (this.harvest.lastKind === "data") {
          this.drawCargoIcon("data", W / 2 - 12, fy, 0.82, q);
          noStroke();
          fill(240, 230, 120, 225 * q);
          textAlign(LEFT);
          text(`+${this.harvest.lastAmount}`, W / 2 - 2, fy);
        } else {
          noStroke();
          fill(220, 238, 250, 210 * q);
          textAlign(CENTER);
          text(tx("hud.fuelPickup", { amount: this.harvest.lastAmount }), W / 2, fy);
        }
      }

      if (this.echoes && this.echoes.pulseTimer > 0) {
        const q = clamp(this.echoes.pulseTimer / ECHO_TUNE.pulseSec, 0, 1);
        const pulse = 1 + 0.08 * Math.sin((1 - q) * Math.PI * 8);
        noFill();
        stroke(180, 220, 245, 130 * q);
        strokeWidth(1.5);
        ellipse(W / 2, H / 2, 54 * pulse, 54 * pulse);
        noStroke();
        fill(210, 235, 250, 225 * q);
        font("monospace");
        fontSize(10.7);
        textAlign(CENTER);
        text(tx("hud.echo", { found: this.echoes.found, total: this.echoes.total }), W / 2, H / 2 + 68);
      }
    }

    drawCargoIcon(kind, x, y, scale = 1, alpha = 1) {
      const a = clamp(alpha, 0, 1);
      const s = scale;
      const w = Math.max(0.65, 0.78 * s);

      noFill();
      strokeWidth(w);

      if (kind === "ore") {
        // ORE = three irregular angular shards. No circles, no fill.
        // It should read as matter/mineral even when the label is unfamiliar.
        stroke(225, 112, 92, 215 * a);

        line(x - 5.2*s, y + 0.5*s, x - 3.6*s, y + 4.0*s);
        line(x - 3.6*s, y + 4.0*s, x - 0.8*s, y + 2.5*s);
        line(x - 0.8*s, y + 2.5*s, x - 1.9*s, y - 1.5*s);
        line(x - 1.9*s, y - 1.5*s, x - 5.2*s, y + 0.5*s);

        line(x + 0.2*s, y + 3.7*s, x + 3.4*s, y + 5.0*s);
        line(x + 3.4*s, y + 5.0*s, x + 5.2*s, y + 2.1*s);
        line(x + 5.2*s, y + 2.1*s, x + 2.1*s, y + 0.8*s);
        line(x + 2.1*s, y + 0.8*s, x + 0.2*s, y + 3.7*s);

        line(x + 0.6*s, y - 0.8*s, x + 4.3*s, y - 1.8*s);
        line(x + 4.3*s, y - 1.8*s, x + 3.6*s, y - 4.8*s);
        line(x + 3.6*s, y - 4.8*s, x + 0.7*s, y - 4.0*s);
        line(x + 0.7*s, y - 4.0*s, x + 0.6*s, y - 0.8*s);

      } else if (kind === "data") {
        // DATA = one precise crystal. Regular geometry contrasts with ORE.
        stroke(224, 205, 112, 220 * a);
        line(x, y + 5.0*s, x + 4.4*s, y);
        line(x + 4.4*s, y, x, y - 5.0*s);
        line(x, y - 5.0*s, x - 4.4*s, y);
        line(x - 4.4*s, y, x, y + 5.0*s);

        // Tiny internal data mark; still line-only and square.
        line(x - 1.4*s, y, x + 1.4*s, y);
        line(x, y - 1.4*s, x, y + 1.4*s);

      } else if (kind === "echo") {
        // ECHO = old storage medium / memory backup. Deliberately reads as
        // a tiny floppy rather than a modern rounded save-app icon.
        stroke(166, 197, 218, 220 * a);
        const l = x - 4.8*s;
        const r = x + 4.8*s;
        const b = y - 5.0*s;
        const t = y + 5.0*s;

        line(l, b, l, t);
        line(l, t, r, t);
        line(r, t, r, b);
        line(r, b, l, b);

        // shutter / label cut
        line(x - 2.8*s, y + 2.9*s, x + 2.2*s, y + 2.9*s);
        line(x + 2.2*s, y + 2.9*s, x + 2.2*s, y + 0.7*s);
        line(x - 2.8*s, y - 1.4*s, x + 2.8*s, y - 1.4*s);
        line(x - 2.8*s, y - 1.4*s, x - 2.8*s, y - 3.5*s);
        line(x + 2.8*s, y - 1.4*s, x + 2.8*s, y - 3.5*s);
      }
    }

    cockpitHudLayout() {
      // v2.7.22: move all persistent cockpit information to the lower edge.
      // The upper field belongs to the universe; the lower field belongs to
      // E.V.E. and the instruments. E.V.E. gets one full-width home above
      // the paired STATUS / MiniMap instruments.
      const margin = 14;
      const gap = 10;
      const mapSize = Math.min(180, Math.max(126, W * 0.40));
      const map = {
        x: W - margin - mapSize,
        y: margin,
        w: mapSize,
        h: mapSize,
      };
      const status = {
        x: margin,
        y: margin,
        w: Math.max(118, map.x - margin - gap),
        h: mapSize,
      };
      const eveHeight = Math.min(84, Math.max(74, H * 0.09));
      const eve = {
        x: margin,
        y: map.y + map.h + gap,
        w: W - margin * 2,
        h: eveHeight,
      };
      return { margin, gap, map, status, eve };
    }

    drawResourceHUD() {
      const r = this.resources;
      if (!r) return;
      if (this.mode === "rescue") return;
      if (this.echoStory && this.echoStory.active) return;
      if (this.finale && this.finale.active) return;

      const L = this.cockpitHudLayout();
      const P = L.status;

      // One quiet STATUS instrument holds, from top to bottom:
      // FUEL -> resource balance -> voyage/system log.
      noStroke();
      fill(7, 12, 20, 78);
      rect(P.x, P.y, P.w, P.h);
      noFill();
      stroke(105, 165, 205, 66);
      strokeWidth(0.8);
      rect(P.x, P.y, P.w, P.h);

      // FUEL
      const fuelX = P.x + 8;
      const fuelW = Math.max(60, P.w - 16);
      const fuelH = 13;
      const fuelY = P.y + P.h - 25;
      const fuelRate = clamp(r.fuel / Math.max(1, r.fuelMax), 0, 1);

      noStroke();
      fill(8, 12, 20, 138);
      rect(fuelX, fuelY, fuelW, fuelH);
      noFill();
      stroke(160, 185, 205, 110);
      strokeWidth(0.75);
      rect(fuelX, fuelY, fuelW, fuelH);

      const inner = 2;
      noStroke();
      if (fuelRate <= 0.18) fill(220, 120, 105, 195);
      else if (fuelRate <= 0.35) fill(215, 180, 105, 190);
      else fill(105, 175, 220, 195);
      rect(
        fuelX + inner,
        fuelY + inner,
        Math.max(0, (fuelW - inner * 2) * fuelRate),
        fuelH - inner * 2
      );

      fill(225, 235, 244, 215);
      font("monospace");
      fontSize(9.2);
      textAlign(CENTER);
      text(
        tx("hud.fuel", { current: Math.floor(r.fuel), max: r.fuelMax }),
        fuelX + fuelW / 2,
        fuelY + fuelH / 2 + 0.3
      );

      // PRACTICAL RESOURCES
      // ORE and DATA are both spendable RESTORE resources.
      const iconX = P.x + 15;
      const labelX = P.x + 27;
      const valueX = P.x + P.w - 9;
      const firstResourceY = fuelY - 17;
      const resourceRowH = 14;
      const oreY = firstResourceY;
      const dataY = firstResourceY - resourceRowH;

      this.drawCargoIcon("ore", iconX, oreY - 0.5, 0.74, 0.92);
      this.drawCargoIcon("data", iconX, dataY - 0.5, 0.74, 0.92);

      noStroke();
      fill(205, 222, 235, 190);
      fontSize(8.4);
      textAlign(LEFT);
      text(tx("home.labels.ore"), labelX, oreY);
      text(tx("home.labels.data"), labelX, dataY);

      fill(225, 235, 244, 215);
      textAlign(RIGHT);
      text(`${Math.floor(r.ore)}/${r.oreMax}`, valueX, oreY);
      text(`${Math.floor(r.data)}/${r.dataMax}`, valueX, dataY);

      // ECHO ARCHIVE
      // Echo is discovered inside recovered DATA, but it is not spendable
      // cargo. Give it a separate archive row so the hierarchy is visible.
      const echoDividerY = dataY - 9;
      const echoY = dataY - 24;
      stroke(105, 165, 205, 30);
      strokeWidth(0.65);
      line(P.x + 9, echoDividerY, P.x + P.w - 9, echoDividerY);

      this.drawCargoIcon("echo", iconX, echoY - 0.5, 0.74, 0.92);
      noStroke();
      fill(180, 210, 228, 172);
      textAlign(LEFT);
      text(tx("home.labels.echoArchive"), labelX, echoY);
      fill(215, 232, 242, 202);
      textAlign(RIGHT);
      text(
        `${this.echoes ? this.echoes.found : 0}/${this.echoes ? this.echoes.total : ECHO_TUNE.total}`,
        valueX,
        echoY
      );

      // Hairline division only. SYSTEM LOG is drawn by drawSystemConsole()
      // into the remaining lower portion of this same instrument.
      const dividerY = P.y + P.h - 85;
      stroke(105, 165, 205, 38);
      strokeWidth(0.7);
      line(P.x + 8, dividerY, P.x + P.w - 8, dividerY);
    }

    drawMiniMap() {
      // The original ORBIT MiniMap was intentionally plain: a dark square,
      // crosshair, local planets, HOME, and the ship fixed at center. Keep that
      // restraint here. It now shares the lower instrument row with STATUS.
      if (!this.ship || !this.basePlanet) return;
      if (this.mode === "rescue") return;
      if (this.echoStory && this.echoStory.active) return;
      if (this.finale && this.finale.active && this.finale.timer >= 0) return;

      const L = this.cockpitHudLayout();
      const size = L.map.w;
      const x = L.map.x;
      const y = L.map.y;
      const cx = x + size / 2;
      const cy = y + size / 2;
      const sensorLevel = clamp(Math.floor(Number(this.base && this.base.level || 1)), 1, 5);
      const baseRange = Math.hypot(W, H) * 2.2;
      const R = baseRange * MINIMAP_RESTORE_TUNE.rangeMul[sensorLevel];
      const scale = size / 180;

      noStroke();
      fill(12, 12, 18, 158);
      rect(x, y, size, size);
      stroke(220, 220, 240, 88);
      strokeWidth(Math.max(0.75, 1 * scale));
      noFill();
      rect(x, y, size, size);

      stroke(220, 220, 240, 55);
      strokeWidth(Math.max(0.65, 0.85 * scale));
      line(cx, y + 8 * scale, cx, y + size - 8 * scale);
      line(x + 8 * scale, cy, x + size - 8 * scale, cy);

      const plotPlanet = (p) => {
        if (!p || p === this.basePlanet) return;
        const dx = p.pos.x - this.ship.pos.x;
        const dy = p.pos.y - this.ship.pos.y;
        const mx = cx + (dx / R) * (size * 0.48);
        const my = cy + (dy / R) * (size * 0.48);
        if (!(mx > x && mx < x + size && my > y && my < y + size)) return;

        const pcol = p.color || [210, 220, 235];
        const locked = (p.kind === "data" || p.kind === "mine") && !this.canInteractWithPlanet(p);
        if (locked) {
          noFill();
          stroke(pcol[0], pcol[1], pcol[2], 155);
          strokeWidth(Math.max(0.65, 0.9 * scale));
          ellipse(mx, my, 6 * scale, 6 * scale);
        } else {
          noStroke();
          fill(pcol[0], pcol[1], pcol[2], p.depleted ? 105 : 220);
          ellipse(mx, my, 5 * scale, 5 * scale);
        }
      };

      for (const p of this.planets || []) plotPlanet(p);

      const bdx = this.basePlanet.pos.x - this.ship.pos.x;
      const bdy = this.basePlanet.pos.y - this.ship.pos.y;
      const bx = cx + (bdx / R) * (size * 0.48);
      const by = cy + (bdy / R) * (size * 0.48);
      const baseInRange = bx > x && bx < x + size && by > y && by < y + size;

      if (baseInRange) {
        noStroke();
        fill(120, 255, 120, 240);
        ellipse(bx, by, 8 * scale, 8 * scale);
        fill(0, 80, 0, 240);
        font("monospace");
        fontSize(Math.max(10, 12 * scale));
        textAlign(CENTER);
        text("B", bx, by - 1 * scale);
      } else {
        let ang = Math.atan2(bdy, bdx);
        const stepDeg = MINIMAP_RESTORE_TUNE.directionStepDeg[sensorLevel] || 0;
        if (stepDeg > 0) {
          const step = stepDeg * Math.PI / 180;
          ang = Math.round(ang / step) * step;
        }
        const ux = Math.cos(ang);
        const uy = Math.sin(ang);
        const inset = 10 * scale;
        const halfW = size / 2 - inset;
        const halfH = size / 2 - inset;
        const txEdge = Math.abs(ux) > 0.0001 ? halfW / Math.abs(ux) : Infinity;
        const tyEdge = Math.abs(uy) > 0.0001 ? halfH / Math.abs(uy) : Infinity;
        const edgeT = Math.min(txEdge, tyEdge);
        const ix = cx + ux * edgeT;
        const iy = cy + uy * edgeT;

        noStroke();
        fill(120, 255, 120, 235);
        ellipse(ix, iy, 4.6 * scale, 4.6 * scale);
        stroke(120, 255, 120, 205);
        strokeWidth(Math.max(0.7, 0.9 * scale));
        const tick = 5.5 * scale;
        line(ix - ux * tick, iy - uy * tick, ix + ux * tick, iy + uy * tick);
      }

      noStroke();
      fill(255, 255, 255, 255);
      ellipse(cx, cy, 6 * scale, 6 * scale);

      if (this.minimap && this.minimap.pulseTimer > 0) {
        const duration = 1.2;
        const progress = clamp(1 - this.minimap.pulseTimer / duration, 0, 1);
        const easeOut = 1 - (1 - progress) * (1 - progress);
        const radius = (size / 2) * easeOut;
        const alpha = 200 * (1 - easeOut);
        noFill();
        stroke(100, 255, 200, alpha);
        strokeWidth(2.5 * scale);
        ellipse(cx, cy, radius * 2, radius * 2);
      }
    }

    stationDamageForLevel(level) {
      return [0, 1.0, 0.30, 0.08, 0, 0][clamp(Math.floor(level || 1), 1, 5)] || 0;
    }

    drawStationCapsule(w, h, scaleValue) {
      const ww = w * scaleValue;
      const hh = h * scaleValue;
      const straight = Math.max(0, hh - ww);
      rectMode(CENTER);
      fill(150,160,180,255);
      stroke(40,45,62,255);
      strokeWidth(2 * scaleValue);
      rect(0, 0, ww, straight);
      ellipse(0, -straight / 2, ww, ww);
      ellipse(0,  straight / 2, ww, ww);
      rectMode(CORNER);
    }

    drawHomeStation(planet, now) {
      const level = clamp(Math.floor((this.base && this.base.level) || 1), 1, 5);
      const P = STATION_PRESETS[level];
      if (!P) return;
      const sc = STATION_SCALE;
      const planetBodyDiameter = planet.range * 0.34;
      const offset = planetBodyDiameter + STATION_MAX_RADIUS * sc + 30;
      const sx = planet.pos.x;
      const sy = planet.pos.y + offset;
      const rotDeg = (this.simTime * 0.05) * 180 / Math.PI;
      const C = STATION_COLORS;

      pushMatrix();
      translate(sx, sy);
      rotate(rotDeg);

      // hub
      fill(...C.hubFill);
      stroke(...C.hubStroke);
      strokeWidth(P.HubW * sc);
      ellipse(0, 0, P.HubR * 2 * sc, P.HubR * 2 * sc);
      noStroke();
      fill(255,255,255,40);
      ellipse(-P.HubR*.25*sc, P.HubR*.25*sc, P.HubR*1.0*sc, P.HubR*.55*sc);
      fill(0,0,0,16);
      ellipse(0, -P.HubR*.35*sc, P.HubR*1.2*sc, P.HubR*.60*sc);

      const drawRing = (R, Wd, fc, ec) => {
        noStroke(); fill(fc[0],fc[1],fc[2],fc[3]);
        ellipse(0,0,(R+Wd/2)*2*sc,(R+Wd/2)*2*sc);
        noFill(); stroke(ec[0],ec[1],ec[2],ec[3]); strokeWidth(3.5*sc);
        ellipse(0,0,(R+Wd/2)*2*sc,(R+Wd/2)*2*sc);
        ellipse(0,0,(R-Wd/2)*2*sc,(R-Wd/2)*2*sc);
      };
      drawRing(P.RingR1,P.RingW1,C.ring1,C.ringEdge1);
      if(P.UseRing2) drawRing(P.RingR2,P.RingW2,C.ring2,C.ringEdge2);

      // radial service lines
      stroke(C.line[0],C.line[1],C.line[2],C.line[3]);
      strokeWidth(P.LineW*sc);
      for(let i=0;i<P.LineN;i+=1){
        const a=(P.LineAngleOffset*Math.PI/180)+(i/P.LineN)*TWO_PI;
        const r0=P.RingR1*P.LineFrom*sc, r1=P.RingR1*P.LineTo*sc;
        line(Math.cos(a)*r0,Math.sin(a)*r0,Math.cos(a)*r1,Math.sin(a)*r1);
      }

      // panels
      for(let i=0;i<P.PanelN;i+=1){
        const a=(P.PanelAngleOffset*Math.PI/180)+(i/P.PanelN)*TWO_PI;
        const rr=P.RingR1*P.PanelInset*sc;
        pushMatrix();
        translate(Math.cos(a)*rr,Math.sin(a)*rr);
        rotate((a*180/Math.PI)+99);
        rectMode(CENTER);
        fill(C.panelFill[0],C.panelFill[1],C.panelFill[2],C.panelFill[3]);
        stroke(C.panelStroke[0],C.panelStroke[1],C.panelStroke[2],C.panelStroke[3]);
        strokeWidth(2*sc);
        rect(0,0,P.PanelW*sc,P.PanelH*sc,P.PanelRound*sc);
        rectMode(CORNER);
        popMatrix();
      }

      // spokes
      stroke(C.spoke[0],C.spoke[1],C.spoke[2],C.spoke[3]);
      strokeWidth(P.SpokeW*sc);
      for(let i=0;i<P.SpokeN;i+=1){
        const a=(i/P.SpokeN)*TWO_PI;
        line(0,0,Math.cos(a)*P.RingR1*P.SpokeLen*sc,Math.sin(a)*P.RingR1*P.SpokeLen*sc);
      }

      // docks
      for(let i=0;i<P.DockN;i+=1){
        const a=(i/P.DockN)*TWO_PI;
        const rr=P.RingR1*P.DockInset*sc;
        pushMatrix();
        translate(Math.cos(a)*rr,Math.sin(a)*rr);
        rotate((a*180/Math.PI)+90);
        this.drawStationCapsule(P.DockW,P.DockH,sc);
        popMatrix();
      }

      // beacons
      if(P.BeaconN>0){
        const pulse=.7+.3*Math.sin(now*4);
        noStroke();
        fill(C.beacon[0],C.beacon[1],C.beacon[2],C.beacon[3]*pulse);
        const rr=(P.RingR1+P.RingW1*.5)*sc;
        for(let i=0;i<P.BeaconN;i+=1){
          const a=(i/P.BeaconN)*TWO_PI;
          ellipse(Math.cos(a)*rr,Math.sin(a)*rr,P.BeaconR*2*sc,P.BeaconR*2*sc);
        }
      }

      // Approved damage pass: structural cracks and dim modules only.
      const damage=this.stationDamageForLevel(level);
      if(damage>.01){
        const rr=P.RingR1*sc;
        const scars=[[[0,-.25],[.14,-.12],[.08,.02],[.20,.13]],[[-.58,.12],[-.40,.07],[-.31,.20],[-.16,.15]],[[.34,.55],[.24,.42],[.32,.31]]];
        stroke(52,64,84,72+102*damage); strokeWidth(1.45*sc);
        for(let si=0;si<scars.length;si+=1){
          if(si===2&&damage<.65) continue;
          const pts=scars[si];
          for(let j=1;j<pts.length;j+=1){
            line(pts[j-1][0]*rr,pts[j-1][1]*rr,pts[j][0]*rr,pts[j][1]*rr);
          }
        }
        for(const a of [-2.05,.18]){
          const pr=P.RingR1*P.PanelInset*sc;
          pushMatrix(); translate(Math.cos(a)*pr,Math.sin(a)*pr); rotate((a*180/Math.PI)+99);
          rectMode(CENTER); fill(170,178,194,26+31*damage); stroke(78,92,118,46+46*damage); strokeWidth(1.2*sc);
          rect(0,0,P.PanelW*sc*.95,P.PanelH*sc*.95,P.PanelRound*sc); rectMode(CORNER); popMatrix();
        }
        if(damage>.6){
          const blink=.10+.08*Math.max(0,Math.sin(now*2.2));
          noStroke(); fill(118,153,170,255*blink);
          ellipse(-P.HubR*.24*sc,P.HubR*.10*sc,5*sc,5*sc);
        }
      }
      popMatrix();

      // E.V.E. response travels from the station core toward the ring.
      if(this.stationPulse && this.stationPulse.timer>0){
        const q=1-this.stationPulse.timer/this.stationPulse.duration;
        const e=1-Math.pow(1-clamp(q,0,1),2);
        const r0=P.HubR*sc*.8, r1=P.RingR1*sc*1.1;
        const rr=r0+(r1-r0)*e;
        noFill(); stroke(120,200,255,220*(1-e)); strokeWidth(2.5*sc);
        ellipse(sx,sy,rr*2,rr*2);
      }
    }

    drawPlanets() {
      const now = performance.now() / 1000;
      for (const p of this.planets) {
        const sourceColor = p.color;
        const c = p.depleted
          ? [sourceColor[0] * 0.42, sourceColor[1] * 0.42, sourceColor[2] * 0.42]
          : sourceColor;
        const glow = 24 + 16 * Math.sin(now * 1.6 + p.phase);
        const baseDiameter = p.range * 0.34;
        const maxGlowDiameter = p.range * 2.0 + glow;
        const glowSteps = 8;

        noStroke();
        for (let i = glowSteps; i >= 1; i -= 1) {
          const ratio = i / glowSteps;
          const diameter = baseDiameter + (maxGlowDiameter - baseDiameter) * ratio;
          const a = Math.max(0, 40 * (1 - ratio * 1.2));
          fill(c[0], c[1], c[2], a);
          ellipse(p.pos.x, p.pos.y, diameter, diameter);
        }

        fill(c[0], c[1], c[2], 255);
        ellipse(p.pos.x, p.pos.y, baseDiameter, baseDiameter);

        if (p.kind === "base") {
          this.drawHomeStation(p, now);

          if (this.base.repairPulse > 0) {
            const q = 1 - this.base.repairPulse / REPAIR_TUNE.pulseSec;
            noFill();
            stroke(220, 255, 230, 150 * (1 - q));
            strokeWidth(1.4);
            ellipse(p.pos.x, p.pos.y, baseDiameter + 24 + q * 54, baseDiameter + 24 + q * 54);
          }
        }
      }
    }

    drawTrail() {
      noStroke();
      for (const t of this.trail) {
        const q = t.age / t.life;
        const shrink = 1 - 0.75 * q;
        const shipVisualRatio = 0.80;
        const sizeCore = SOURCE_LOCK.shipVisualDiameter * shipVisualRatio * shrink;
        const sizeOuter = sizeCore + 6 * shipVisualRatio;
        const aOuter = 60 * (1 - q);
        const aCore = 100 * (1 - q);
        fill(170, 200, 240, aOuter);
        ellipse(t.x, t.y, sizeOuter, sizeOuter);
        fill(200, 220, 255, aCore);
        ellipse(t.x, t.y, sizeCore, sizeCore);
      }
    }

    drawShipArc(cx, cy, radius, a0Deg, a1Deg, width, rgba) {
      const seg = 28;
      stroke(rgba[0],rgba[1],rgba[2],rgba[3] ?? 255);
      strokeWidth(width);
      noFill();
      let a = a0Deg * Math.PI / 180;
      let px = cx + radius * Math.cos(a);
      let py = cy + radius * Math.sin(a);
      for(let i=1;i<=seg;i+=1){
        a = (a0Deg + (a1Deg-a0Deg)*(i/seg)) * Math.PI / 180;
        const qx=cx+radius*Math.cos(a), qy=cy+radius*Math.sin(a);
        line(px,py,qx,qy); px=qx; py=qy;
      }
    }

    drawShip() {
      const x = this.ship.pos.x;
      const y = this.ship.pos.y;
      const level = clamp(Math.floor((this.base && this.base.level) || 1), 1, 5);
      const Q = SHIP_PRESETS[level] || SHIP_PRESETS[1];
      const s = 0.16;
      const visualScaleRatio = s / 0.20;
      const R = Q.bodyR * s;
      const lodSmall = level >= 3 && R <= 22;

      // v2.7.3: remove the orange directional plume. Flight input keeps only
      // a very quiet blue halo so the small ship stays visually calm.
      if (this.pressing && this.mode === "flight") {
        const hr = (SOURCE_LOCK.shipVisualDiameter + 2 + 4 * Math.sin(this.thrustTime * 8)) * visualScaleRatio;
        noFill();
        stroke(140, 220, 255, 72);
        strokeWidth(1.2 * visualScaleRatio);
        ellipse(x, y, hr, hr);
      }

      // Approved tuned orb: source silhouette preserved, outer rim ~24% thinner.
      const sourceLW = (lodSmall ? 4 : 3) * visualScaleRatio;
      const outerLW = sourceLW * 0.76;
      fill(Q.body[0],Q.body[1],Q.body[2],Q.body[3]);
      stroke(Q.outline[0],Q.outline[1],Q.outline[2],Q.outline[3]);
      strokeWidth(outerLW);
      ellipse(x,y,R*2,R*2);
      noStroke();
      fill(255,255,255,40);
      ellipse(x-R*.25,y+R*.25,R*1.0,R*.55);
      fill(0,0,0,16);
      ellipse(x,y-R*.35,R*1.2,R*.60);

      const drawInner=(inner)=>{
        if(!inner) return;
        const rr=inner.r*s;
        noStroke(); fill(inner.fill[0],inner.fill[1],inner.fill[2],inner.fill[3]); ellipse(x,y,rr*2,rr*2);
        noFill(); stroke(inner.stroke[0],inner.stroke[1],inner.stroke[2],inner.stroke[3]); strokeWidth((lodSmall?3:2) * visualScaleRatio); ellipse(x,y,rr*2,rr*2);
      };
      drawInner(Q.inner);
      drawInner(Q.inner2);

      const WR = (level>=3 && lodSmall) ? R*.42 : R*.37;
      const wy = y + R*.12;
      fill(Q.glass[0],Q.glass[1],Q.glass[2],Q.glass[3]);
      stroke(40,45,62,255);
      strokeWidth(Q.gStroke * visualScaleRatio);
      ellipse(x,wy,WR*2,WR*2);
      if(!lodSmall){
        noStroke(); fill(255,255,255,70);
        ellipse(x-WR*.35,wy+WR*.28,WR*.75,WR*.45);
      }

      // Lv1 tuned damage: readable at game scale without black scorch marks.
      if(level===1){
        const col=[48,55,70,230];
        const lw=1.45 * visualScaleRatio;
        stroke(col[0],col[1],col[2],col[3]); strokeWidth(lw);
        line(x+R*.36,y+R*.05,x+R*.55,y+R*.17);
        line(x+R*.55,y+R*.17,x+R*.76,y+R*.11);
        line(x+R*.55,y+R*.17,x+R*.50,y+R*.32);
        strokeWidth(lw*.9);
        line(x-R*.58,y-R*.03,x-R*.39,y+R*.08);
        strokeWidth(lw*.82);
        line(x-R*.39,y+R*.08,x-R*.23,y+R*.01);
        stroke(58,66,80,158); strokeWidth(lw*.68);
        line(x-R*.30,y+R*.55,x-R*.08,y+R*.47);
      }

      if(level>=3){
        const r=R*(lodSmall?.60:.56);
        this.drawShipArc(x,y,r,lodSmall?-125:-110,lodSmall?-55:-70,(lodSmall?2:1) * visualScaleRatio,[242,184,70,255]);
      }
      if(level===4){
        const sw=(lodSmall?2:1.2) * visualScaleRatio;
        const arm=WR*(lodSmall?.70:.60);
        stroke(90,170,245,220); strokeWidth(sw);
        line(x-arm,wy,x+arm,wy);
        line(x,wy-arm,x,wy+arm);
      }
      if(level===5){
        const inset=R*.72;
        stroke(68,81,125,255); strokeWidth(3 * visualScaleRatio);
        line(x-inset,y-R*.30,x-inset,y+R*.30);
        line(x+inset,y-R*.30,x+inset,y+R*.30);
      }
    }

    drawDebug() {
      const speed = len(this.ship.vel);
      const p = this.dominantPlanet;
      const lines = [
        `ORBIT v2.5  ${this.mode}  ${TUNE.fixedHz}Hz`,
        `speed ${speed.toFixed(1)} / ${TUNE.maxSpeed}`,
        `damp ${this.ship.damp.toFixed(4)}`,
        `control ${CONTROL_MODE} / swirl ${SWIRL_MODE}`,
        `planet ${p ? `${p.name}/${p.kind}` : "none"} / marker ${this.captureReady ? "ON" : "off"}`,
        `sector ${this.atlasSectorKey || "0,0"} / active planets ${this.planets.length}`,
        `signal ${this.signal && this.signal.targetId ? this.signal.targetId : "none"} / ${this.signal && Number.isFinite(this.signal.distance) ? Math.round(this.signal.distance) : "-"}`,
        `res F${Math.floor(this.resources.fuel)} O${Math.floor(this.resources.ore)} D${Math.floor(this.resources.data)} / E${this.echoes.found}/${this.echoes.total} / restore L${this.base.level}`,
        `pos ${this.ship.pos.x.toFixed(0)}, ${this.ship.pos.y.toFixed(0)}`,
      ];

      noStroke();
      fill(0, 0, 0, 150);
      rect(8, H - 177, 220, 167, 6);
      fill(210, 225, 245, 220);
      font("monospace");
      fontSize(11);
      textAlign(LEFT);
      for (let i = 0; i < lines.length; i += 1) {
        text(lines[i], 16, H - 28 - i * 17);
      }
    }
  }

  const world = new DriftWorld();

  // ------------------------------------------------------------
  // Scenes
  // ------------------------------------------------------------
  let pendingStartMode = "new";

  const titleScene = {
    opaque: true,
    continueButton: { x: 16, y: 142, w: 328, h: 46 },
    newButton: { x: 16, y: 86, w: 328, h: 46 },
    soloButton: { x: 16, y: 114, w: 328, h: 50 },
    pressedButton: null,

    // Original Codea MenuScene values.
    starConfig: {
      count: [70, 40, 22],
      speed: [8, 16, 28],
      size: [1.2, 1.6, 2.0],
    },
    meteorConfig: {
      max: 3,
      spawnP60: 0.020,
      vel: 560,
      lifeMin: 0.75,
      lifeMax: 1.25,
      angle: -22 * Math.PI / 180,
    },
    stars: [[], [], []],
    meteors: [],
    time: 0,

    enter() {
      this.time = 0;
      this.meteors = [];
      this.stars = [[], [], []];

      // Original: three independently moving layers with random position,
      // size (0.8..1.2x) and base alpha (180..240).
      for (let layer = 0; layer < 3; layer += 1) {
        const count = this.starConfig.count[layer];
        const baseSize = this.starConfig.size[layer];
        const out = [];
        for (let i = 0; i < count; i += 1) {
          out.push({
            x: Math.random() * W,
            y: Math.random() * H,
            size: baseSize * (0.8 + Math.random() * 0.4),
            alpha: 180 + Math.random() * 60,
          });
        }
        this.stars[layer] = out;
      }
    },

    update(dt) {
      const step = Math.min(Math.max(Number(dt || 0), 0), 0.1);
      this.time += step;

      // Original layers move left at 8 / 16 / 28 px per second.
      for (let layer = 0; layer < 3; layer += 1) {
        const speed = this.starConfig.speed[layer];
        for (const s of this.stars[layer]) {
          s.x -= speed * step;
          if (s.x < -2) {
            s.x = W + Math.random() * 20;
            s.y = Math.random() * H;
          }
        }
      }

      // Codea checked a 2% spawn chance every update. Convert that 60 Hz
      // probability to a dt-based probability so the Web version preserves
      // the same timing without becoming frame-rate dependent.
      const cfg = this.meteorConfig;
      const spawnChance = 1 - Math.pow(1 - cfg.spawnP60, step * 60);
      if (this.meteors.length < cfg.max && Math.random() < spawnChance) {
        const startX = W + 60 + Math.random() * 80;
        const startY = H * (0.55 + Math.random() * 0.35);
        this.meteors.push({
          x: startX,
          y: startY,
          vx: -Math.cos(cfg.angle) * cfg.vel,
          vy: Math.sin(cfg.angle) * cfg.vel,
          life: cfg.lifeMin + Math.random() * (cfg.lifeMax - cfg.lifeMin),
          t: 0,
        });
      }

      for (let i = this.meteors.length - 1; i >= 0; i -= 1) {
        const m = this.meteors[i];
        m.t += step;
        m.x += m.vx * step;
        m.y += m.vy * step;
        if (m.t > m.life || m.x < -80 || m.y < -80) {
          this.meteors.splice(i, 1);
        }
      }
    },

    drawTitleGradient() {
      // Original MenuScene: bgTop(10,14,24) -> bgBottom(3,5,9),
      // rendered in 64 horizontal bands.
      noStroke();
      const bands = 64;
      const bandH = H / bands;
      for (let i = 0; i < bands; i += 1) {
        const t = i / (bands - 1);
        const r = 10 + (3 - 10) * t;
        const g = 14 + (5 - 14) * t;
        const b = 24 + (9 - 24) * t;
        fill(r, g, b, 255);
        rect(0, i * bandH, W, bandH + 1);
      }
    },

    drawTitleStars() {
      noStroke();
      for (let layer = 0; layer < 3; layer += 1) {
        for (const s of this.stars[layer]) {
          const alpha = s.alpha +
            40 * Math.sin((this.time * 1.3) + ((s.x + s.y) * 0.01));
          fill(240, 250, 255, alpha);
          ellipse(s.x, s.y, s.size, s.size);
        }
      }
    },

    drawMeteors() {
      const cfg = this.meteorConfig;
      strokeWidth(2);
      for (const m of this.meteors) {
        const u = clamp(1 - (m.t / m.life), 0, 1);
        const tailLen = 90 + 130 * u;
        const nx = Math.cos(cfg.angle);
        const ny = -Math.sin(cfg.angle);
        const hx = m.x;
        const hy = m.y;
        const tx = m.x + nx * tailLen;
        const ty = m.y + ny * tailLen;

        for (let i = 0; i <= 7; i += 1) {
          const t = i / 7;
          const ax = hx * (1 - t) + tx * t;
          const ay = hy * (1 - t) + ty * t;
          const a = 160 * (1 - t) * u;
          stroke(200, 230, 255, a);
          line(ax, ay, hx, hy);
        }

        noStroke();
        fill(255, 255, 255, 180 * u);
        const head = 3.6 + 1.8 * u;
        ellipse(hx, hy, head, head);
      }
    },

    drawTitleVignette() {
      // Original uses four 32 px black strips at alpha 90.
      noStroke();
      fill(0, 0, 0, 90);
      const t = 32;
      rect(0, H - t, W, t);
      rect(0, 0, W, t);
      rect(0, 0, t, H);
      rect(W - t, 0, t, H);
    },

    drawButton(rectData, label, pressed = false, primary = false) {
      const cx = rectData.x + rectData.w / 2;
      const cy = rectData.y + rectData.h / 2;
      const scalePressed = pressed ? 0.985 : 1.0;
      const w = rectData.w * scalePressed;
      const h = rectData.h * scalePressed;
      const x = cx - w / 2;
      const y = cy - h / 2;

      // Wide, borderless translucent-white panel.
      // Keep the title layout untouched; only the button surface changes.
      noStroke();
      fill(255, 255, 255, pressed ? 64 : 48);
      rect(x, y, w, h, 2);

      fill(245, 248, 255, 245);
      font("monospace");
      fontSize(12);
      textAlign(CENTER);
      text(label, cx, cy - 1);
    },

    draw() {
      this.drawTitleGradient();
      this.drawTitleStars();
      this.drawMeteors();
      this.drawTitleVignette();

      // Keep the Web version's title layout. Only the background and buttons
      // borrow from the original Codea menu.
      fill(226, 235, 247, 245);
      font("monospace");
      fontSize(34);
      textAlign(CENTER);
      text(tx("title.title"), W / 2, 402);

      fill(160, 184, 212, 210);
      fontSize(13);
      text(tx("title.subtitle"), W / 2, 370);

      const hasSave = world.hasSave();
      if (hasSave) {
        this.drawButton(
          this.continueButton,
          tx("title.continue"),
          this.pressedButton === "continue",
          true
        );
        this.drawButton(
          this.newButton,
          tx("title.newOrbit"),
          this.pressedButton === "new",
          false
        );
      } else {
        this.drawButton(
          this.soloButton,
          tx("title.newOrbit"),
          this.pressedButton === "new",
          true
        );
      }

    },

    touch(touch) {
      const hasSave = world.hasSave();
      const newRect = hasSave ? this.newButton : this.soloButton;

      if (touch.state === BEGAN) {
        if (SSE.ui.hit(touch, newRect)) this.pressedButton = "new";
        else if (hasSave && SSE.ui.hit(touch, this.continueButton)) this.pressedButton = "continue";
        else this.pressedButton = null;
        return true;
      }

      if (touch.state === MOVING) {
        if (this.pressedButton === "new" && !SSE.ui.hit(touch, newRect)) this.pressedButton = null;
        if (
          this.pressedButton === "continue" &&
          (!hasSave || !SSE.ui.hit(touch, this.continueButton))
        ) this.pressedButton = null;
        return true;
      }

      if (touch.state === ENDED) {
        const pressed = this.pressedButton;
        this.pressedButton = null;

        if (pressed === "continue" && hasSave && SSE.ui.hit(touch, this.continueButton)) {
          pendingStartMode = "continue";
          SSE.app.replace("drift", null, { duration: "scene" });
          return true;
        }

        if (pressed === "new" && SSE.ui.hit(touch, newRect)) {
          world.clearSave();
          pendingStartMode = "new";
          SSE.app.replace("drift", null, { duration: "scene" });
          return true;
        }
        return true;
      }

      if (touch.state === CANCELLED) this.pressedButton = null;
      return true;
    },
  };

  const driftScene = {
    opaque: true,
    enter() {
      if (pendingStartMode === "continue") {
        if (!world.loadGame()) world.reset();
      } else {
        world.reset();
      }
      pendingStartMode = null;
    },
    update(dt) { world.update(dt); },
    draw() { world.draw(); },
    touch(touch) { return world.touch(touch); },
  };

  SSE.createApp({
    id: "orbit-web-v24",
    logicalWidth: W,
    logicalHeight: H,
    initialScene: "title",
    debug: true,
    pointerMode: "primary",
    analytics: { enabled: false },
    scenes: {
      title: titleScene,
      drift: driftScene,
    },
  });
})();
