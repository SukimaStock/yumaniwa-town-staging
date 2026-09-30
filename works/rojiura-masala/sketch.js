// 路地裏マサラ / ROJIURA MASALA
// SukimaStock Engine migration prototype 36
// ------------------------------------------------------------
// Goal of this pass:
// - Reproduce the Codea prototype's current game feel in JS first.
// - Keep the town and dynamic effects code-drawn; the authored courier sprite
//   is loaded from assets/player at native 18×19px resolution.
// - Do not tune the core movement values casually after this point.

(function () {
  "use strict";

  const ROJIURA_BUILD = "update105";
  if (typeof window !== "undefined") window.ROJIURA_BUILD = ROJIURA_BUILD;

  const BALANCE = typeof window !== "undefined" ? window.ROJIURA_BALANCE : null;
  if (!BALANCE) {
    throw new Error("balance-config.js must load before sketch.js");
  }

  function balanceRampValue(ramp, deliveries = 0) {
    if (!Array.isArray(ramp) || ramp.length === 0) return undefined;
    const d = Math.max(0, Number(deliveries) || 0);
    let value = ramp[0].value;
    for (const step of ramp) {
      if (d < step.at) break;
      value = step.value;
    }
    return value;
  }

  // ----------------------------------------------------------
  // LOGICAL LAYOUT
  // ----------------------------------------------------------

  const W = 360;
  const H = 640;

  // Distribution audit runs the real game loop without producing audio,
  // analytics, persistent records, or scene transitions. It is enabled only
  // through distribution-debug.html / ROJIURA_DISTRIBUTION_TEST.
  let distributionTestActive = false;
  let distributionLastResult = null;

  function playGameSound(name, options = null) {
    if (distributionTestActive) return false;
    const sound = typeof window !== "undefined" ? window.RojiuraSound : null;
    if (!sound || typeof sound.play !== "function") return false;
    return sound.play(name, options || undefined);
  }

  function setGameBgm(mode) {
    if (distributionTestActive) return;
    const sound = typeof window !== "undefined" ? window.RojiuraSound : null;
    if (!sound || typeof sound.setBgmMode !== "function") return;
    sound.setBgmMode(mode);
  }


  const ANALYTICS_ALLOWED_EVENTS = new Set([
    "Masala Game Start",
    "Masala Night End",
    "Masala Result Save",
    "Masala Result Share",
    "Masala Language",
  ]);

  function trackGameAnalytics(name, props = null) {
    if (distributionTestActive || !ANALYTICS_ALLOWED_EVENTS.has(name)) return false;
    if (!SSE || !SSE.analytics) return false;
    return SSE.analytics.track(name, { language: SSE.i18n.language, ...(props || {}) });
  }

  // Font audit mode:
  // - open index.html?fontdebug=1
  // - or open font-debug.html
  // This mode is intentionally separate from the actual game presentation.
  const FONT_DEBUG_MODE =
    (typeof window !== "undefined" && window.ROJIURA_FONT_DEBUG === true)
    || (typeof window !== "undefined"
      && new URLSearchParams(window.location.search).get("fontdebug") === "1");

  const RESULT_DEBUG_MODE =
    (typeof window !== "undefined" && window.ROJIURA_RESULT_DEBUG === true)
    || (typeof window !== "undefined"
      && new URLSearchParams(window.location.search).get("resultdebug") === "1");

  const COLS = 9;
  const ROWS = 11;
  const CELL = 34;

  const BOARD_X = 27;
  const BOARD_Y = 202;
  const BOARD_W = COLS * CELL;
  const BOARD_H = ROWS * CELL;
  const BOARD_TOP = BOARD_Y + BOARD_H;

  const CONTROL_H = 200;
  const PAD_X = W * 0.5;
  const PAD_Y = 54;
  const PAD_RADIUS = 36;
  const PAD_TOUCH_RADIUS = 68;
  const PAD_DEADZONE = 15;
  const PAD_MAX_RANGE = 72;

  // ----------------------------------------------------------
  // CORE MOVEMENT — LOCKED FROM CODEA PROTOTYPE
  // ----------------------------------------------------------

  const MAX_RUN_SPEED = 5.4;
  const RUN_ACCEL = 15.0;
  const RELEASE_DECEL = 38.0;

  const TURN_SNAP = 0.12;

  // Collision movement is gated at cell centers, matching the Codea prototype.
  // We intentionally keep JS turning responsive in this pass: no turn pre-brake yet.
  const MOVE_SUBSTEP = 0.035;
  const COLLISION_CENTER_EPS = 0.003;
  const WALL_DECEL = 44.0;

  // ----------------------------------------------------------
  // CAMERA — LOCKED FEEL
  // ----------------------------------------------------------

  const CAMERA_ZOOM_STOP = 1.03;
  const CAMERA_ZOOM_RUN = 1.30;
  const CAMERA_FOLLOW_SPEED = 3.2;
  const CAMERA_ZOOM_IN_SPEED = 1.45;
  const CAMERA_ZOOM_OUT_SPEED = 1.55;
  const CAMERA_DEADZONE = 0.18;

  // Visual-safe overscan. Destination pins and delivery-value numerals extend
  // beyond a cell center, so the camera may travel a little past the playable
  // grid when the courier reaches an outer lane. This keeps those cues fully
  // inside the play window instead of clipping them against the HUD edges.
  // Side alleys should feel like they keep going beyond the playable grid,
  // so give the camera a little more lateral breathing room for edge scenery.
  const CAMERA_WORLD_BLEED_X = 42;
  const CAMERA_WORLD_BLEED_BOTTOM = 28;
  // Keep enough headroom for destination pins near the north edge, but
  // stop the camera before it reveals the empty dark strip above the upper
  // residential wall.
  const TOP_RESIDENTIAL_WALL_HEIGHT = CELL * 2.85;
  const CAMERA_WORLD_BLEED_TOP = TOP_RESIDENTIAL_WALL_HEIGHT - 18;

  // ----------------------------------------------------------
  // CURRY / SCORE
  // ----------------------------------------------------------

  const COLD_HEAT_LOSS_PER_SEC = BALANCE.heat.coolingPerSecond;
  const COMBO_HOT_HEAT = BALANCE.heat.hotThreshold;
  const COMBO_BREAK_HEAT = BALANCE.heat.comboBreakThreshold;
  const COLD_MISS_HEAT = BALANCE.heat.coldMissThreshold;

  // Prototype 12: the night is endless while the courier keeps the curry
  // service alive. There is no fixed dish count and no voluntary clock-out.
  // Letting the carried curry cool all the way to zero extinguishes one night
  // light, at most once per accepted batch. The accepted batch is still
  // completed before the courier returns for makanai, so zero heat creates a
  // clear consequence without turning an individual delivery into a failure.
  const NIGHT_GAUGE_MAX = BALANCE.night.gaugeMax;
  // The run no longer has a closing clock. This timer only drives the town's
  // late-night visual fade; after the fade completes, gameplay continues until
  // the three-light night gauge is exhausted.
  const AMBIENT_FADE_SECONDS = Math.max(60, Number(BALANCE.night.ambientFadeSeconds) || 420);
  const NIGHT_GAUGE_FX_DURATION = 0.72;
  const RESULT_MIN_TAP_TIME = 1.35;
  const RESULT_ACTION_Y = 10;
  const RESULT_PANEL_BOTTOM_Y = 44;
  const RESULT_PANEL_TOP_Y = 245;
  const RESULT_ACTION_W = 92;
  const RESULT_ACTION_H = 25;
  const RESULT_ACTION_HIT_PAD_X = 8;
  const RESULT_ACTION_HIT_PAD_Y = 8;
  const RESULT_SAVE_X = 74;
  const RESULT_SHARE_X = W - 74 - RESULT_ACTION_W;

  // Playtest telemetry stays local to the browser and never changes gameplay.
  // Finished runs are kept in localStorage so balance can be judged from a
  // small sample of real sessions before building an automated simulator.
  const PLAYTEST_STORAGE_KEY = "rojiura-playtest-runs-v2";
  const PLAYTEST_MAX_RUNS = 200;
  const PLAYTEST_MILESTONES = [30, 60, 90, 100, 120, 150, 200, 250, 300];

  // Late-shift order surges. Normal service stays at three dishes; after the
  // 60-delivery mark, occasional pickups arrive overloaded and the phone has
  // to squeeze every order into the same physical terminal space.
  const NORMAL_BATCH_SIZE = BALANCE.orders.normalBatchSize;
  const BULK_ORDER_START_DELIVERIES = BALANCE.orders.bulkStartDeliveries;
  const BULK_ORDER_INTERVAL_DELIVERIES = BALANCE.orders.bulkIntervalDeliveries;
  const BULK_ORDER_BATCH_SIZES = BALANCE.orders.bulkBatchSizes;

  // After 100 deliveries the boss adds one more real-world rule: the colour
  // cards on the terminal become the delivery sequence. The route stays varied,
  // but nearby stops are preferred so the rule changes the job without turning
  // it into a colour-search zigzag across the whole town.
  const DELIVERY_ORDER_UNLOCK_DELIVERIES = BALANCE.orders.sequenceUnlockDeliveries;
  const DELIVERY_ORDER_WRONG_HEAT_PENALTY = BALANCE.orders.wrongOrderHeatPenalty;
  const DELIVERY_ORDER_NEARBY_CHOICE_WEIGHTS = BALANCE.orders.sequenceNearbyChoiceWeights;
  const DELIVERY_ORDER_INTRO_MESSAGE_IN = 0.24;
  const DELIVERY_ORDER_INTRO_MIN_TAP_TIME = 0.58;
  const DELIVERY_ORDER_WRONG_FX_DURATION = 0.42;
  const DELIVERY_ORDER_HINT_DURATION = 0.42;
  const DELIVERY_ORDER_HEAT_FX_DURATION = 0.75;

  // Result naan is a direct visual receipt for MASALA RUSH: one rush, one naan.
  // A column grows upward until it reaches the safe area below the result
  // title, then a new column starts slightly closer to the curry.
  const NAAN_PER_MASALA_RUSH = BALANCE.economy.naanPerMasalaRush;
  const NAAN_STACK_BASE_CY = 331;
  const NAAN_STACK_RISE = 13;
  const NAAN_STACK_TOP_CY = 486;
  const NAAN_STACK_COLUMN_SHIFT_X = 42;
  const MAKANAI_LEADIN_MESSAGE_AT = 0.92;
  const MAKANAI_LEADIN_MESSAGE_IN = 0.28;
  const MAKANAI_LEADIN_MIN_TAP_TIME =
    MAKANAI_LEADIN_MESSAGE_AT + MAKANAI_LEADIN_MESSAGE_IN + 0.12;
  // End-of-shift camera beat must exceed the normal run zoom (1.30), because
  // the courier often reaches the shop while the player is still holding input.
  const MAKANAI_LEADIN_CAMERA_ZOOM = 1.46;
  const MAKANAI_LEADIN_CAMERA_FOLLOW_SPEED = 6.4;
  const MAKANAI_LEADIN_CAMERA_ZOOM_SPEED = 4.4;

  // ----------------------------------------------------------
  // RESULT TYPOGRAPHY — LIVE-TUNABLE IN result-debug.html
  // ----------------------------------------------------------
  // These are actual bitmap "pixel" sizes, not CSS font sizes.
  // The debug HTML exposes them as sliders so the final hierarchy can be
  // tuned visually on the phone before we hard-lock the composition.
  const RESULT_TYPO_DEFAULTS = Object.freeze({
    ticketY: 148,

    // Labels stay on one calm scale. The numbers do the hierarchy work.
    mealName: 1.90,
    salesLabel: 1.90,
    salesValue: 4.75,      // user-tuned
    deliveryLabel: 1.90,
    deliveryNumber: 2.65,  // user-tuned
    deliverySuffix: 1.50,  // user-tuned
    bestLabel: 1.90,
    bestValue: 3.05,       // user-tuned; past record remains smaller than tonight
    secondary: 1.55,

    brand: 1.92,
    title: 3.45,
    again: 2.12,
  });

  if (typeof window !== "undefined") {
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem("rojiura-result-typo") || "{}");
    } catch (_) {
      stored = {};
    }

    // Prototype 102 stored the delivery number + ケン as one shared value.
    // Keep an old saved tune useful by seeding the new number size from it.
    if (Number.isFinite(Number(stored.deliveryValue))) {
      if (!Number.isFinite(Number(stored.deliveryNumber))) {
        stored.deliveryNumber = Number(stored.deliveryValue);
      }
      if (!Number.isFinite(Number(stored.deliverySuffix))) {
        stored.deliverySuffix = Math.max(0.8, Number(stored.deliveryValue) * 0.64);
      }
    }

    window.ROJIURA_RESULT_TYPO_DEFAULTS = { ...RESULT_TYPO_DEFAULTS };
    window.ROJIURA_RESULT_TYPO = {
      ...RESULT_TYPO_DEFAULTS,
      ...stored,
      ...(window.ROJIURA_RESULT_TYPO || {}),
    };
  }

  function resultTypo(key) {
    let value = RESULT_TYPO_DEFAULTS[key];

    if (typeof window !== "undefined" && window.ROJIURA_RESULT_TYPO) {
      const storedValue = Number(window.ROJIURA_RESULT_TYPO[key]);
      if (Number.isFinite(storedValue)) value = storedValue;
    }

    // English bitmap text tends to read optically larger than the katakana
    // version on the result screen. Keep the rhythm closer across languages.
    if (SSE?.i18n?.language === "en") {
      const enAdjust = {
        mealName: 0.88,
        salesLabel: 0.92,
        deliveryLabel: 0.92,
        bestLabel: 0.88,
        secondary: 0.90,
        brand: 0.90,
        title: 0.82,
        again: 0.90,
      };
      if (Number.isFinite(enAdjust[key])) {
        value *= enAdjust[key];
      }
    }

    return value;
  }

  // ----------------------------------------------------------
  // TITLE / ATTRACT DEMO
  // ----------------------------------------------------------
  // Super-Famicom-style title treatment: the title is an overlay on top of a
  // small autonomous gameplay demo, not a separate menu room.
  const TITLE_DEMO_ZOOM = 1.28;
  const TITLE_LOGO_DELAY = 0.20;
  const TITLE_LOGO_IN = 0.52;
  const TITLE_START_DELAY = 0.92;
  const TITLE_LANG_X = W - 78;
  const TITLE_LANG_Y = H - 34;
  const TITLE_LANG_W = 66;
  const TITLE_LANG_H = 22;
  const TITLE_SOUND_X = 12;
  const TITLE_SOUND_Y = TITLE_LANG_Y;
  const TITLE_SOUND_W = 50;
  const TITLE_SOUND_H = TITLE_LANG_H;
  const DELIVERY_COUNTER_FX_DURATION = 0.34;

  // One short beat between title and gameplay: the terminal receives a message
  // from the boss, then the actual shift starts.
  const BRIEFING_TERMINAL_IN = 0.34;
  const BRIEFING_TERMINAL_AFTERGLOW = 0.20;
  const BRIEFING_BEEP_AT = BRIEFING_TERMINAL_IN + BRIEFING_TERMINAL_AFTERGLOW - 0.04;
  const BRIEFING_MESSAGE_AT = BRIEFING_TERMINAL_IN + BRIEFING_TERMINAL_AFTERGLOW;
  const BRIEFING_MESSAGE_IN = 0.28;
  const BRIEFING_END_AT = 9999; // briefing waits for a tap

  // Opening camera should visibly "catch up", but not make the player wait
  // for the normal gameplay camera's slow, precise convergence.
  const GAME_OPENING_CAMERA_FOLLOW_SPEED = 7.0;
  const GAME_OPENING_CAMERA_ZOOM_SPEED = 4.6;
  const GAME_OPENING_CAMERA_EPS = 2.4;
  const GAME_OPENING_ZOOM_EPS = 0.035;
  const GAME_OPENING_ORDER_BEAT = 0.20;
  const GAME_OPENING_HEAT_FILL_DURATION = 0.46;

  // MID-ROUTE REHEAT / "PIT STOP"
  // Once per accepted three-order batch, returning to the shop after actually
  // leaving it gives the carried curry one quick reheat. It never restores a
  // full 100 HOT: the detour buys breathing room, not a free reset.
  const REHEAT_GAIN = BALANCE.reheat.gain;
  const REHEAT_CAP = BALANCE.reheat.cap;
  const REHEAT_TRIGGER_MAX_HEAT = BALANCE.reheat.triggerMaxHeat;
  const REHEAT_SHOP_RADIUS = BALANCE.reheat.shopRadius;
  const REHEAT_DEPART_RADIUS = BALANCE.reheat.departRadius;
  const REHEAT_FX_DURATION = 0.82;

  // Makanai grows in broad, readable steps. A short night still earns a real
  // meal; surviving longer simply makes the owner's generosity more visible.
  const MAKANAI_TIER_THRESHOLDS = BALANCE.economy.makanaiTierThresholds;

  const SCENT_ADD_AMOUNT = BALANCE.scent.addAmount;
  const SCENT_DECAY_PER_SEC = BALANCE.scent.decayPerSecond;

  // Heat now affects how strongly the curry marks the alley. Hot curry is
  // fragrant and risky; cold curry is quieter but less valuable. This ties
  // HOT, scent, cats, and the mid-route reheat into one readable rule.
  const REHEAT_SCENT_BURST_MULT = BALANCE.scent.reheatBurstMultiplier;

  // Visual-only scent feedback. The invisible scent map still drives cat AI,
  // but the player sees only brief wisps that rise and dissolve from the curry.
  // The motion is intentionally quick and mostly upward: no slow side-to-side
  // bobbing, which can read as bubbles.
  const AROMA_PARTICLE_LIFE = 0.72;
  const AROMA_MOVE_INTERVAL = 0.20;
  const AROMA_IDLE_INTERVAL = 0.48;
  const AROMA_MAX_PARTICLES = 12;
  const CAT_SNIFF_VISIBLE_MIN = 0.10;

  // ----------------------------------------------------------
  // MASALA RUSH — THE NIGHT GETS ON YOUR SIDE
  // ----------------------------------------------------------

  // MASALA RUSH uses a decaying soft streak rather than a hard consecutive-HOT
  // streak. HOT and WARM preserve momentum, COOL erodes it, and COLD clears it.
  // The final delivery must still be HOT, so the rush remains a skill reward.
  const MASALA_SOFT_STREAK = BALANCE.rush.softStreak;
  // Retro rule: the HOT side stays visually quiet while building. Only the
  // exact moment the soft-streak requirement is completed gets a short, clear
  // one-shot animation; the ready state itself is static.
  const MASALA_HOT_READY_FX_DURATION = 0.58;
  const MASALA_RUSH_DURATION = BALANCE.rush.durationSeconds;
  const MASALA_RUSH_EXTEND_UNLOCK_DELIVERIES = BALANCE.rush.extendUnlockDeliveries;
  const MASALA_RUSH_DELIVERY_BONUS = BALANCE.rush.deliveryBonusSeconds;

  // PEPPER is the second half of MASALA RUSH. Heat builds the existing soft
  // streak; scattered red chilies in the alley are the ignition resource.
  // The two progress at roughly the same multi-batch pace, so neither
  // replaces the original "deliver it hot" skill loop.
  const PEPPER_RUSH_COST = BALANCE.pepper.rushCost;
  const PEPPER_CLUSTER_MIN = BALANCE.pepper.clusterSize[0];
  const PEPPER_CLUSTER_MAX = BALANCE.pepper.clusterSize[1];
  const PEPPER_MAX_ACTIVE = BALANCE.pepper.maxActive;
  const PEPPER_PICKUP_RADIUS = BALANCE.pepper.pickupRadius;
  const PEPPER_FRAME_READY_FX_DURATION = 0.72;
  const PEPPER_SPAWN_SETTLE_DURATION = 0.46;
  const PEPPER_SPAWN_STAGGER = 0.055;
  const PEPPER_PICKUP_FX_DURATION = 0.34;
  const PEPPER_PICKUP_FRAME_PULSE_DURATION = 0.14;

  // Each completed delivery is one fixed sale. Heat, combo, and Masala Rush
  // affect the shift's character, but never the customer's bill.
  const DELIVERY_SALE_PRICE = BALANCE.economy.deliverySalePrice;

  // During the rush, active cats become an RPG-like party. They reuse the
  // courier's exact recent path with fixed spacing rather than vaguely
  // wandering toward the player. Distances are in logical grid cells.
  const PARTY_CAT_GAPS = [0.72, 1.42];
  const PLAYER_TRAIL_MAX_POINTS = 420;
  const PLAYER_TRAIL_SAMPLE_DISTANCE = 0.028;

  // Existing RUSH burst feedback is visual-only. The actual meter is model.masalaCharge.
  const MASALA_BURST_DURATION = 0.72;

  // During Masala Rush, rubbish stops being a wall for the courier.
  // Crossing a rubbish cell becomes a short visual hop instead.
  const MASALA_GARBAGE_JUMP_RADIUS = 0.72;
  const MASALA_GARBAGE_JUMP_HEIGHT = 0.34;

  // ----------------------------------------------------------
  // MICRO TRANSITIONS — VISUAL ONLY
  // ----------------------------------------------------------

  // New round choreography:
  // 1) the accepted orders slide into the phone one by one,
  // 2) each accepted order launches a colour-keyed destination pin from the phone,
  // 3) the arrow settles onto the corresponding place in the town.
  // This makes returning to the shop the visible start of the next job.
  const ORDER_CARD_IN_DURATION = 0.20;
  const ORDER_CARD_STAGGER = 0.085;
  const ORDER_CARD_HOLD = 0.075;
  const ORDER_ARROW_FLIGHT_DURATION = 0.34;
  const ORDER_MARKER_POP_DURATION = 0.20;

  // The flying destination pin becomes collectible slightly before its visual
  // landing finishes. This rewards the player for anticipating the pin instead
  // of making a good pass feel like a miss.
  const ORDER_EARLY_DELIVERY_WINDOW = 0.12;

  // The world marker is a colour-keyed delivery pin, never a curry plate.
  const TARGET_ARROW_REST_Y = 13;
  const TARGET_EXIT_DURATION = 0.18;
  const TARGET_EXIT_DISTANCE = 10;

  // Delivered orders leave the phone with a quick swipe instead of
  // vanishing. The logical order is complete immediately; this is visual only.
  const ORDER_EXIT_DURATION = 0.22;
  const ORDER_EXIT_DISTANCE = 34;
  const ORDER_SLOT_PACK_SPEED = 15.0;
  const HEAT_BAR_LINGER_DURATION = 0.24;

  // Phone / order display. The phone is deliberately simple and toy-like:
  // it is a diegetic status panel, not a fake modern app UI.
  const PHONE_W = 250;
  const PHONE_H = 80;
  const PHONE_X = W * 0.5 - PHONE_W * 0.5;
  const PHONE_Y = 88;

  // Bottom UI layout: three code-drawn curry slots above one framed heat bar.
  // The control pad stays at its existing coordinates.
  const PHONE_CARD_W = 52;
  const PHONE_CARD_H = 44;
  const PHONE_CARD_GAP = 6;
  const PHONE_CARD_Y = 157;
  const PHONE_CARD_ICON_INSET = 1;

  // Full-width terminal body / screen, reorganized into a left activity area
  // and a right job/sales area separated by one vertical divider.
  const TERMINAL_BODY_X = 18;
  const TERMINAL_BODY_W = W - TERMINAL_BODY_X * 2;
  const TERMINAL_SCREEN_X = 24;
  const TERMINAL_SCREEN_Y = 98;
  const TERMINAL_SCREEN_W = W - TERMINAL_SCREEN_X * 2;
  const TERMINAL_SCREEN_H = 82;

  const ORDER_GROUP_W = PHONE_CARD_W * 3 + PHONE_CARD_GAP * 2;
  const ORDER_GROUP_LEFT = TERMINAL_SCREEN_X + 10;
  const TERMINAL_DIVIDER_X = ORDER_GROUP_LEFT + ORDER_GROUP_W + 10;

  const HEAT_ICON_X = ORDER_GROUP_LEFT + 6;
  const HEAT_FRAME_X = ORDER_GROUP_LEFT + 16;
  const HEAT_FRAME_Y = 106;
  const HEAT_FRAME_W = 106;
  const HEAT_FRAME_H = 20;

  const LEFT_NIGHT_GAUGE_X = HEAT_FRAME_X + HEAT_FRAME_W + 10;
  const LEFT_NIGHT_GAUGE_Y = HEAT_FRAME_Y + 8;

  const STATUS_INFO_X = TERMINAL_DIVIDER_X + 13;
  const STATUS_INFO_Y_TOP = PHONE_CARD_Y - 1;
  const STATUS_INFO_Y_BOTTOM = 111;
  const STATUS_INFO_RIGHT_X = TERMINAL_SCREEN_X + TERMINAL_SCREEN_W - 14;

  // Return-to-shop choreography. After the final order card has fully left
  // the phone, we deliberately show a short empty beat before the phone
  // buzzes, reveals the shop glyph, and launches a return guide.
  const RETURN_EMPTY_BEAT = 0.20;
  const RETURN_BUZZ_DURATION = 0.14;
  const RETURN_ICON_POP_DURATION = 0.18;
  const RETURN_ARROW_FLIGHT_DURATION = 0.34;
  const RETURN_NEW_ORDER_BEAT = 0.10;
  const RETURN_GUIDE_EDGE_MARGIN = 20;

  const RETURN_BUZZ_START = ORDER_EXIT_DURATION + RETURN_EMPTY_BEAT;
  const RETURN_ICON_START = RETURN_BUZZ_START + RETURN_BUZZ_DURATION;
  const RETURN_FLIGHT_START = RETURN_ICON_START + RETURN_ICON_POP_DURATION;
  const RETURN_SHOP_ICON_SLIDE = 24;
  const RETURN_SHOP_ICON_SHINE_DELAY = 0.06;
  const RETURN_SHOP_ICON_SHINE_DURATION = 0.22;

  // Batch-complete / shop pickup choreography. The final delivery gets one
  // small terminal flash after its card leaves. On a normal return, touching
  // the shop starts a quick moving pickup: HOT fills from 0→100 and the three
  // new order cards arrive while the courier is already free to head out again.
  const BATCH_COMPLETE_FLASH_DURATION = 0.18;
  const PICKUP_TOTAL_DURATION = 0.52;
  const PICKUP_SETTLE_DURATION = 0.04;
  const PICKUP_HEAT_FILL_DURATION = 0.34;
  const PICKUP_ORDER_START = 0.08;

  // Reactive town: because the alley is code-drawn rather than a flat PNG,
  // scenery can answer the player's actions. Deformation stays tiny so the
  // collision grid and the readable pixel silhouette never change.
  const TOWN_DELIVERY_REACT_DURATION = 0.34;
  const TOWN_RUSH_REACT_RADIUS = 3.4;
  const TOWN_RUSH_REACT_AMOUNT = 0.022;

  // ----------------------------------------------------------
  // BIKE
  // ----------------------------------------------------------

  const BIKE_WARNING_TIME = BALANCE.bike.warningSeconds;
  const BIKE_WARNING_LINGER_TIME = 0.30;
  const BIKE_STUN_TIME = BALANCE.bike.stunSeconds;
  const BIKE_JUMP_TIME = 0.36;
  const BIKE_JUMP_HEIGHT = 0.24;
  const BIKE_ROW = 3;

  // ----------------------------------------------------------
  // CAT
  // ----------------------------------------------------------

  const CAT_TELL_TIME = 0.42;
  const CAT_MOVE_PREP_TIME = 0.10;
  const CAT_WALK_FRAME_TIME = 0.10;
  const CAT_ENTRY_SPEED = 4.0;
  const CAT_ENTRY_MARGIN = 0.78;
  const CAT_STAY_CHANCE = BALANCE.cat.stayChance;

  // Cats can smell a short distance around corners. This turns the curry trail
  // into a light positioning tool: leave scent down a side route, step away,
  // and a blocking cat can be coaxed out of the lane instead of feeling purely
  // random. Route-safety checks still prevent the cat from hard-locking a run.
  const CAT_SCENT_LOOKAHEAD_RADIUS = BALANCE.cat.scentLookaheadRadius;
  const CAT_SCENT_LOOKAHEAD_FALLOFF = BALANCE.cat.scentLookaheadFalloff;
  const CAT_SCENT_LURE_THRESHOLD = BALANCE.cat.scentLureThreshold;
  const CAT_SCENT_LURED_STAY_CHANCE = BALANCE.cat.scentLuredStayChance;
  const CAT_TERRITORY = BALANCE.cat.territory;

  // ----------------------------------------------------------
  // DOOR
  // ----------------------------------------------------------

  const DOOR_COL = 5;
  const DOOR_ROW = 6;
  const DOOR_CYCLE = BALANCE.door.cycleSeconds;

  // ----------------------------------------------------------
  // DELIVERY HOUSES / ADJACENT ROAD CELLS
  // ----------------------------------------------------------

  // Delivery identity belongs to a building first. After a house is chosen,
  // its visible pin is placed on one of the walkable road cells directly
  // above, below, left, or right of it. This preserves the arcade "collect the
  // pin" interaction while letting the same house be approached from different
  // sides on different rounds. Pools keep the far / inner / south route balance.
  const outerDeliveryHouses = [
    { buildingC: 2, buildingR: 10 },
    { buildingC: 4, buildingR: 10 },
    { buildingC: 6, buildingR: 10 },
    { buildingC: 8, buildingR: 10 },
    { buildingC: 2, buildingR: 8 },
    { buildingC: 8, buildingR: 8 },
  ];

  const northInnerDeliveryHouses = [
    { buildingC: 4, buildingR: 10 },
    { buildingC: 6, buildingR: 10 },
    { buildingC: 8, buildingR: 10 },
    { buildingC: 4, buildingR: 8 },
    { buildingC: 6, buildingR: 8 },
    { buildingC: 8, buildingR: 8 },
  ];

  const southInnerDeliveryHouses = [
    { buildingC: 2, buildingR: 4 },
    { buildingC: 4, buildingR: 4 },
    { buildingC: 6, buildingR: 4 },
  ];

  const allDeliveryHouses = [
    ...outerDeliveryHouses,
    ...northInnerDeliveryHouses,
    ...southInnerDeliveryHouses,
  ];

  // Every simultaneous delivery keeps a stable accent colour. Normal batches
  // use the first three; overloaded late-shift batches add clearly separated
  // hues so every pin remains unambiguous once colour also means delivery order.
  const DELIVERY_SLOT_COLORS = [
    [240, 182, 63],  // turmeric
    [232, 90, 61],   // tandoori
    [120, 145, 75],  // cardamom
    [239, 216, 171], // naan cream
    [185, 126, 78],  // cumin
    [62, 158, 151],  // teal - deliberately distinct from tandoori/cardamom
    [154, 131, 107], // warm metal
  ];

  function deliverySlotColor(slot = 1) {
    return DELIVERY_SLOT_COLORS[clamp(Math.round(slot) - 1, 0, DELIVERY_SLOT_COLORS.length - 1)];
  }

  const dynamicGarbageCandidates = [
    [2, 5], [4, 5], [6, 5], [8, 5],
    [2, 7], [4, 7], [6, 7], [8, 7],
    [2, 9], [4, 9], [6, 9], [8, 9],
  ];

  // ----------------------------------------------------------
  // MODEL
  // ----------------------------------------------------------

  const model = {
    time: 0,
    nightOver: false,
    attractMode: false,

    playerGX: 5,
    playerGY: 1,
    dirX: 0,
    dirY: 0,
    intentX: 0,
    intentY: 0,
    runSpeed: 0,

    touchActive: false,
    touchId: null,
    touchX: PAD_X,
    touchY: PAD_Y,

    // Desktop controls are kept separate from pointer/touch state so a held
    // keyboard direction cannot steal or strand a real pointer. The shared
    // intent below is whichever source is currently active.
    keyboardActive: false,
    keyboardIntentX: 0,
    keyboardIntentY: 0,

    cameraX: gridX(5),
    cameraY: gridY(1),
    cameraZoom: CAMERA_ZOOM_STOP,

    deliveries: 0,
    deliveryCounterFx: null,
    salesCounterFx: null,
    rounds: 1,
    dishesLeft: NORMAL_BATCH_SIZE,
    carrying: true,
    activeTargets: [],
    bulkOrderNextAt: BULK_ORDER_START_DELIVERIES,
    bulkOrderEventCount: 0,
    bulkOrderHistory: [],
    currentBulkOrder: null,

    // 100+ deliveries: existing colour cards become a shuffled delivery order.
    // The rule is introduced once by the boss, then persists for the shift.
    deliveryOrderMode: false,
    deliveryOrderSequenceEnforced: false,
    deliveryOrderUnlockAt: null,
    deliveryOrderIntro: { active: false, age: 0, armed: false, pending: false, startPickupAfter: false },
    deliveryOrderDeliveries: 0,
    deliveryOrderMistakes: 0,
    deliveryOrderPenaltyTotal: 0,
    deliveryOrderWrongFxTimer: 0,
    deliveryOrderHintTimer: 0,
    deliveryOrderHeatFxTimer: 0,
    deliveryOrderHeatFxLoss: 0,

    // Buildings that received a delivery this shift keep one warm threshold
    // light for the rest of the night. This is a spatial memory of the route,
    // not another score readout.
    deliveredBuildings: new Map(),
    curryHeat: 100,

    combo: 0,
    bestCombo: 0,

    // Night character stats. Every accepted batch is still delivered. The three-light
    // gauge is the sole gameplay end condition; elapsed time only changes the town.
    hotDeliveries: 0,
    warmDeliveries: 0,
    coolDeliveries: 0,
    coldDeliveries: 0,
    bikeHits: 0,
    heatSum: 0,
    nightGauge: NIGHT_GAUGE_MAX,
    nightGaugeHeatZeroRound: -1,
    nightGaugeFxTimer: 0,
    nightClosing: false,
    nightEndReason: null,

    // Elapsed live play time. It drives the late-night town fade and telemetry,
    // but never closes the shop. Briefing/order-rule messages and app background
    // time do not advance it.
    shiftElapsed: 0,
    currentBatchAcceptedSize: NORMAL_BATCH_SIZE,

    // Local playtest-only fields. They are not exposed in the normal HUD.
    playtestElapsed: 0,
    playtestMilestones: {},
    performanceFrameCount: 0,
    performanceFrameSeconds: 0,
    performanceSlowFrames: 0,
    performanceFpsHistogram: new Array(121).fill(0),

    // One hidden, discoverable pit stop per accepted batch. The player has to leave the
    // shop before this can arm, so a new batch never reheats itself instantly.
    reheatAvailable: true,
    reheatDeparted: false,
    reheatFxTimer: 0,
    reheatFxGain: 0,
    reheatCount: 0,

    // Result-character stats.
    // backdoorUses counts full north<->south traversals through the timed
    // center door; simply stepping into the doorway and backing out does not.
    backdoorUses: 0,
    backdoorTransitSide: 0,

    // One stable seed per actual shift. Makanai variation is deterministic
    // inside a finished result, but differs naturally from night to night.
    nightSeed: 1,

    sales: 0,
    bestSales: 0,
    sessionPriorBestSales: 0,

    scent: new Map(),
    lastScentCell: "",
    aroma: [],
    aromaEmitTimer: 0,

    masalaCharge: 0,
    masalaDisplayCharge: 0,
    masalaSoftStreakMax: 0,
    masalaRushTriggers: [],
    masalaRushTimer: 0,
    masalaRushAge: 0,
    masalaRushCount: 0,
    masalaBurstTimer: 0,
    masalaHotReadyFxTimer: 0,
    playerTrail: [{ gx: 5, gy: 1 }],

    // Theme 2 lives in the alley as red chilies. PEPPER is deliberately not
    // exposed as a score/currency: its hidden progress is expressed through
    // the existing HOT frame, while pepperCollected remains telemetry / future
    // makanai context only.
    pepper: [],
    pepperHeld: 0,
    pepperCollected: 0,
    pepperFrameFxTimer: 0,
    pepperPickupFrameFxTimer: 0,
    pepperPickupFx: [],

    garbage: [],
    garbageTimer: 2.8,
    garbageCapSeen: 0,

    cats: [],

    doorTimer: 1.5,
    doorOpen: false,
    doorOpenFx: 0,

    bikePhase: "warning",
    bikeWarningTimer: BIKE_WARNING_TIME,
    bikeWarningLingerTimer: 0,
    bikeWarningSoundPlayed: false,
    bikeGX: 0,
    bikeHitCooldown: 0,
    bikeStunTimer: 0,
    bikeJumpTimer: 0,
    bikeImpactTimer: 0,
    bikeHeatFxTimer: 0,
    bikeHeatFxLoss: 0,
    comboShatterTimer: 0,

    deliveryFx: null,
    targetExitFx: [],
    orderExitFx: [],
    returnGuide: null,
    pickupLeadin: null,
    batchCompleteFxTimer: 0,
    heatBarHoldTimer: 0,

    smoke: [],

    birds: [],
    birdSpawnTimer: 0,
    ambientWindows: new Map(),
  };

  // ----------------------------------------------------------
  // TEXT — RESULT ONLY DURING NORMAL PLAY
  // ----------------------------------------------------------

  const TEXT = {
    title: {
      name: { jp: "ロジウラマサラ", en: "ROJIURA MASALA" },
      sub: { jp: "NIGHT CURRY DELIVERY", en: "NIGHT CURRY DELIVERY" },
      start: { jp: "ハイタツヲ ハジメル", en: "START DELIVERY" },
    },
    briefing: {
      sender: { jp: "テンチョウ", en: "BOSS" },
      line1: { jp: "ハイタツ ヨロシク！", en: "DELIVER THESE!" },
      line2: { jp: "サメルマエニネ！", en: "BEFORE THEY GET COLD!" },
    },
    orderMode: {
      sender: { jp: "テンチョウ", en: "BOSS" },
      line1: { jp: "チュウモンガ タクサン！", en: "LOTS OF ORDERS!" },
      line2: { jp: "ジュンバンニ トドケテ！", en: "DELIVER IN ORDER!" },
      wrong: { jp: "チガウヨ！", en: "NOT THAT ONE!" },
    },
    leadin: {
      sender: { jp: "テンチョウ", en: "BOSS" },
      line1: { jp: "キョウモ オツカレ！", en: "GOOD WORK TONIGHT!" },
      line2: { jp: "オナカ スイタダロ？ タベナ！", en: "HUNGRY? EAT UP!" },
    },
    result: {
      title: { jp: "コンヤノ マカナイ", en: "TONIGHT'S MAKANAI" },
      score: { jp: "ウリアゲ", en: "SALES" },
      deliveries: { jp: "ハイタツ", en: "DELIVERIES" },
      countSuffix: { jp: "ケン", en: "" },
      allTimeBest: { jp: "サイコウ", en: "ALL-TIME BEST" },
      again: { jp: "ツギノヨルヘ", en: "NEXT NIGHT" },
      save: { jp: "ホゾン", en: "SAVE" },
      share: { jp: "キョウユウ", en: "SHARE" },
      hot: { jp: "アツアツ", en: "HOT" },
      rush: { jp: "ラッシュ", en: "RUSH" },
      first: { jp: "シンキロク", en: "NEW RECORD" },
      newBest: { jp: "シンキロク", en: "NEW RECORD" },
    },
  };

  function localizedText(value) {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return String(value || "");
    const language = SSE.i18n.language || "jp";
    return value[language] ?? value.jp ?? value.en ?? "";
  }

  function syncDocumentLanguage() {
    if (typeof document === "undefined" || !document.documentElement) return;
    document.documentElement.lang = SSE.i18n.language === "en" ? "en" : "ja";
  }

  // ----------------------------------------------------------
  // BASIC HELPERS
  // ----------------------------------------------------------

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function approachExp(current, target, speed, dt) {
    const a = 1 - Math.exp(-speed * dt);
    return current + (target - current) * a;
  }

  function easeOutCubic(t) {
    const u = 1 - clamp(t, 0, 1);
    return 1 - u * u * u;
  }

  function easeInCubic(t) {
    const v = clamp(t, 0, 1);
    return v * v * v;
  }

  function easeOutBack(t) {
    const v = clamp(t, 0, 1);
    const c1 = 1.35;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2);
  }

  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }

  function heatBarColor(heat) {
    // Colour carries temperature as well as bar length:
    // hot = vivid tandoori orange, warm = amber, cold = dull brown-grey.
    const h = clamp(heat, 0, 100);
    const cold = [104, 88, 78];
    const warm = [223, 164, 81];
    const hot = [210, 91, 42];

    if (h <= 50) {
      const t = h / 50;
      return [
        lerp(cold[0], warm[0], t),
        lerp(cold[1], warm[1], t),
        lerp(cold[2], warm[2], t),
      ];
    }

    const t = (h - 50) / 50;
    return [
      lerp(warm[0], hot[0], t),
      lerp(warm[1], hot[1], t),
      lerp(warm[2], hot[2], t),
    ];
  }

  function shuffle(values) {
    const arr = values.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function cellKey(c, r) {
    return `${c}:${r}`;
  }

  function parseCellKey(key) {
    const [c, r] = String(key).split(":").map(Number);
    return { c, r };
  }

  function gridX(c) {
    return BOARD_X + (c - 0.5) * CELL;
  }

  function gridY(r) {
    return BOARD_Y + (r - 0.5) * CELL;
  }

  function cellCenter(c, r) {
    return { x: gridX(c), y: gridY(r) };
  }

  function nearestCell(v) {
    return Math.round(v);
  }

  function inGrid(c, r) {
    return c >= 1 && c <= COLS && r >= 1 && r <= ROWS;
  }

  function distanceManhattan(c1, r1, c2, r2) {
    return Math.abs(c1 - c2) + Math.abs(r1 - r2);
  }

  // ----------------------------------------------------------
  // DIFFICULTY CURVE
  // ----------------------------------------------------------

  function bikeSpeed() {
    return balanceRampValue(BALANCE.bike.speedByDeliveries, model.deliveries);
  }

  function bikeHotPenalty() {
    return balanceRampValue(BALANCE.bike.heatPenaltyByDeliveries, model.deliveries);
  }

  function garbageCap() {
    return balanceRampValue(BALANCE.garbage.capByDeliveries, model.deliveries);
  }

  function garbageDelay() {
    return balanceRampValue(BALANCE.garbage.spawnDelayByDeliveries, model.deliveries);
  }

  function catTiming() {
    return balanceRampValue(BALANCE.cat.moveTimingByDeliveries, model.deliveries);
  }

  function randomCatTime() {
    const [a, b] = catTiming();
    return a + Math.random() * (b - a);
  }

  const AMBIENT_WINDOW_IDS = [
    "north-1", "north-2", "north-3", "north-4", "north-5",
    "north-6", "north-7", "north-8", "north-9", "north-10",
    "north-11",
    "left-1", "left-2",
    "right-1", "right-2",
  ];

  function randomAmbientWindowTimer(lit) {
    return lit
      ? 3.8 + Math.random() * 6.2
      : 2.6 + Math.random() * 7.4;
  }

  function initAmbientWindows() {
    model.ambientWindows = new Map();
    for (const id of AMBIENT_WINDOW_IDS) {
      const lit = Math.random() < 0.42;
      model.ambientWindows.set(id, { lit, timer: randomAmbientWindowTimer(lit) });
    }
  }

  // The town now sleeps by clock time, not by the three-life night gauge.
  // Delivered-house lights are drawn in a later pass and therefore stay warm
  // even when almost every ordinary home and surrounding facade has gone dark.
  const AMBIENT_WINDOW_SLEEP_CURVE = [
    [0, 1.00], [120, 0.92], [240, 0.58], [330, 0.28], [390, 0.06], [420, 0.00],
  ];
  const TOWN_WINDOW_SLEEP_CURVE = [
    [0, 1.00], [120, 0.86], [240, 0.44], [330, 0.16], [390, 0.03], [420, 0.00],
  ];
  const TOWN_SHADE_CURVE = [
    [0, 0], [120, 12], [240, 50], [330, 92], [390, 128], [420, 148],
  ];
  const WORLD_VEIL_CURVE = [
    [0, 0], [120, 2], [240, 8], [330, 16], [390, 24], [420, 30],
  ];

  function shiftCurveValue(curve, elapsed = model.shiftElapsed || 0) {
    const t = clamp(elapsed, 0, AMBIENT_FADE_SECONDS);
    if (!curve.length) return 0;
    if (t <= curve[0][0]) return curve[0][1];
    for (let i = 1; i < curve.length; i += 1) {
      const [at, value] = curve[i];
      const [prevAt, prevValue] = curve[i - 1];
      if (t <= at) {
        const q = clamp((t - prevAt) / Math.max(0.001, at - prevAt), 0, 1);
        return lerp(prevValue, value, q);
      }
    }
    return curve[curve.length - 1][1];
  }

  function nightWindowAwake(id, sleepCurve, salt = "sleep") {
    const retention = shiftCurveValue(sleepCurve);
    if (retention >= 0.999) return true;
    if (retention <= 0.001) return false;

    // Stable per-night threshold: every window has its own bedtime, so the
    // neighbourhood dims one home at a time instead of stepping in stages.
    const seed = hashToken(`${model.nightSeed || 0}:${id}:${salt}`) / 0xffffffff;
    return seed < retention;
  }

  function ambientWindowAwake(id) {
    return nightWindowAwake(id, AMBIENT_WINDOW_SLEEP_CURVE, "ambient-sleep");
  }

  function townWindowAwake(id) {
    return nightWindowAwake(id, TOWN_WINDOW_SLEEP_CURVE, "town-sleep");
  }

  // Static scenery darkens far more than live gameplay cues. The shop is drawn
  // after this town pass, and delivered homes are relit after it, so the final
  // minute reads as a sleeping neighbourhood rather than a dimmed HUD filter.
  function nightTownShadeAlpha() {
    return Math.round(shiftCurveValue(TOWN_SHADE_CURVE));
  }

  function nightWorldVeilAlpha() {
    return Math.round(shiftCurveValue(WORLD_VEIL_CURVE));
  }

  function drawNightTownShade() {
    const alpha = nightTownShadeAlpha();
    if (alpha <= 0) return;
    noStroke();
    fill(...rgba(C.night, alpha));
    // World-camera space: deliberately oversized so camera bleed and the upper
    // residential strip darken together without exposing a bright edge.
    rect(-1000, -1000, 2400, 2400);
  }

  function drawNightWorldVeil() {
    const alpha = nightWorldVeilAlpha();
    if (alpha <= 0) return;
    noStroke();
    fill(...rgba(C.night, alpha));
    rect(-1000, -1000, 2400, 2400);
  }

  function ambientWindowLit(id, fallback = false) {
    if (!ambientWindowAwake(id)) return false;
    const state = model.ambientWindows.get(id);
    return state ? state.lit : fallback;
  }

  function hashToken(value) {
    const str = String(value);
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function masalaRushBlink(id, bias = -0.04) {
    const h = hashToken(id);
    const t = model.time;
    const a = Math.sin(t * (14.5 + (h % 5)) + h * 0.010);
    const b = Math.sin(t * (23.0 + (h % 7)) + h * 0.017);
    return a + b * 0.52 > bias;
  }

  function displayWindowLit(id, fallback = false) {
    // Masala Rush can make an awake home flicker with excitement, but it does
    // not relight windows that have already gone dark as the night winds down.
    if (!ambientWindowAwake(id)) return false;
    return masalaRushActive()
      ? masalaRushBlink(id, -0.05)
      : ambientWindowLit(id, fallback);
  }

  function updateAmbientWindows(dt) {
    for (const state of model.ambientWindows.values()) {
      state.timer -= dt;
      if (state.timer > 0) continue;

      if (state.lit) {
        state.lit = Math.random() < 0.70;
      } else {
        state.lit = Math.random() < 0.28;
      }
      state.timer = randomAmbientWindowTimer(state.lit);
    }
  }

  function randomBirdSpawnDelay() {
    return 3.2 + Math.random() * 4.4;
  }

  function spawnAmbientBird() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const margin = CELL * 2.4;
    const minX = BOARD_X - margin;
    const maxX = BOARD_X + BOARD_W + margin;
    const x = dir > 0 ? minX : maxX;
    const wallBottom = BOARD_TOP - 3;
    const wallTop = BOARD_TOP + TOP_RESIDENTIAL_WALL_HEIGHT;
    const yMin = wallBottom + 12;
    const yMax = wallTop - 16;
    const y = yMin + Math.random() * Math.max(6, yMax - yMin);

    model.birds.push({
      x,
      y,
      dir,
      speed: 74 + Math.random() * 30,
      phase: Math.random() * Math.PI * 2,
      amplitude: 1 + Math.random() * 2,
    });
  }

  function updateBirds(dt) {
    model.birdSpawnTimer -= dt;
    if (model.birdSpawnTimer <= 0 && model.birds.length < 2) {
      spawnAmbientBird();
      model.birdSpawnTimer = randomBirdSpawnDelay();
    }

    const minX = BOARD_X - CELL * 2.7;
    const maxX = BOARD_X + BOARD_W + CELL * 2.7;

    for (const bird of model.birds) {
      bird.x += bird.speed * bird.dir * dt;
    }

    model.birds = model.birds.filter((bird) => bird.dir > 0 ? bird.x < maxX : bird.x > minX);
  }

  function catScentWeight() {
    return balanceRampValue(BALANCE.cat.scentWeightByDeliveries, model.deliveries);
  }

  function doorWindow() {
    return balanceRampValue(BALANCE.door.openWindowByDeliveries, model.deliveries);
  }

  // ----------------------------------------------------------
  // BOARD / BLOCKING
  // ----------------------------------------------------------

  function isFixedBlock(c, r) {
    if (!inGrid(c, r)) return true;

    // Bomberman-like fixed blocks.
    if (c % 2 === 0 && r % 2 === 0) return true;

    // Restaurant wall. Door is handled separately.
    if (r === DOOR_ROW && c >= 2 && c <= 8 && c !== DOOR_COL) return true;

    return false;
  }

  function garbageAt(c, r, extra = null) {
    if (extra && extra.c === c && extra.r === r) return true;
    return model.garbage.some((g) => g.c === c && g.r === r);
  }

  function catAt(c, r, simulatedCats = null) {
    const cats = simulatedCats || model.cats;
    return cats.some((cat) => cat.active && cat.c === c && cat.r === r);
  }

  function staticBlocked(c, r, extraGarbage = null) {
    if (isFixedBlock(c, r)) return true;
    if (c === DOOR_COL && r === DOOR_ROW && !model.doorOpen) return true;
    if (garbageAt(c, r, extraGarbage)) return true;
    return false;
  }

  function masalaRushActive() {
    return model.masalaRushTimer > 0;
  }

  function playerBlocked(c, r) {
    // Masala Rush changes only the moving street obstacles:
    // cats join the party and rubbish can be jumped. Buildings, the outer
    // topology, and a currently closed center door remain solid.
    if (isFixedBlock(c, r)) return true;
    if (c === DOOR_COL && r === DOOR_ROW && !model.doorOpen) return true;

    if (!masalaRushActive()) {
      if (garbageAt(c, r)) return true;
      if (catAt(c, r)) return true;
      if (
        model.cats.some(
          (cat) =>
            cat.active
            && cat.tell > 0
            && cat.intentC === c
            && cat.intentR === r
        )
      ) {
        return true;
      }
    }

    return false;
  }

  function activeTargetAt(c, r) {
    return model.activeTargets.some((t) => !t.delivered && t.c === c && t.r === r);
  }

  function playerNearCell(c, r, radius) {
    return Math.abs(model.playerGX - c) <= radius && Math.abs(model.playerGY - r) <= radius;
  }

  // ----------------------------------------------------------
  // ROUTE SAFETY
  // ----------------------------------------------------------

  function cloneCatsWithCandidate(movingIndex, c, r) {
    return model.cats.map((cat, index) => {
      if (index === movingIndex) return { ...cat, active: true, c, r };
      if (!cat.active) return { ...cat };
      if (cat.intentC != null && cat.intentR != null && cat.tell > 0) {
        return { ...cat, c: cat.intentC, r: cat.intentR };
      }
      return { ...cat };
    });
  }

  function routeSafety({ movingCatIndex = -1, catC = null, catR = null, extraGarbage = null, extraTarget = null, ignoreCats = false } = {}) {
    const cats = ignoreCats
      ? []
      : movingCatIndex >= 0
        ? cloneCatsWithCandidate(movingCatIndex, catC, catR)
        : model.cats.map((cat) => ({ ...cat }));

    const startC = clamp(Math.round(model.playerGX), 1, COLS);
    const startR = clamp(Math.round(model.playerGY), 1, ROWS);

    const passable = (c, r) => {
      if (!inGrid(c, r)) return false;
      if (isFixedBlock(c, r)) return false;
      // The center door is timed, not permanent topology. Treat it as open for
      // reachability checks; otherwise every closed-door phase falsely makes
      // all north-side targets unreachable and freezes the cat AI.
      if (garbageAt(c, r, extraGarbage)) return false;
      if (!ignoreCats && catAt(c, r, cats)) return false;
      return true;
    };

    let sC = startC;
    let sR = startR;
    if (!passable(sC, sR)) {
      sC = 5;
      sR = 1;
    }
    if (!passable(sC, sR)) return false;

    const queue = [[sC, sR]];
    const visited = new Set([cellKey(sC, sR)]);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (let head = 0; head < queue.length; head += 1) {
      const [c, r] = queue[head];
      for (const [dx, dy] of dirs) {
        const nc = c + dx;
        const nr = r + dy;
        const key = cellKey(nc, nr);
        if (!visited.has(key) && passable(nc, nr)) {
          visited.add(key);
          queue.push([nc, nr]);
        }
      }
    }

    if (!visited.has(cellKey(5, 1))) return false;

    for (const target of model.activeTargets) {
      if (!target.delivered && !visited.has(cellKey(target.c, target.r))) return false;
    }
    if (extraTarget && !visited.has(cellKey(extraTarget.c, extraTarget.r))) return false;

    return true;
  }

  // Ordered delivery safety is stricter than ordinary reachability. In order
  // mode, stepping onto any later pin auto-delivers it and causes a penalty, so
  // later undelivered pins must be treated as temporary walls while checking
  // whether the requested sequence can actually be followed. Cats are omitted
  // because they move; fixed blocks and rubbish define the persistent topology.
  function deliveryGridPathDistance(startC, startR, goalC, goalR, options = {}) {
    const blockedCells = options.blockedCells || new Set();
    const extraGarbage = options.extraGarbage || null;

    const passable = (c, r) => {
      if (!inGrid(c, r)) return false;
      if (isFixedBlock(c, r)) return false;
      if (garbageAt(c, r, extraGarbage)) return false;
      if (blockedCells.has(cellKey(c, r))) return false;
      return true;
    };

    if (!passable(startC, startR) || !passable(goalC, goalR)) return Infinity;

    const queue = [[startC, startR, 0]];
    const visited = new Set([cellKey(startC, startR)]);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (let head = 0; head < queue.length; head += 1) {
      const [c, r, distance] = queue[head];
      if (c === goalC && r === goalR) return distance;
      for (const [dx, dy] of dirs) {
        const nc = c + dx;
        const nr = r + dy;
        const key = cellKey(nc, nr);
        if (visited.has(key) || !passable(nc, nr)) continue;
        visited.add(key);
        queue.push([nc, nr, distance + 1]);
      }
    }

    return Infinity;
  }

  function deliveryGridPathExists(startC, startR, goalC, goalR, options = {}) {
    return Number.isFinite(
      deliveryGridPathDistance(startC, startR, goalC, goalR, options)
    );
  }

  function deliveryOrderSequenceIsSafe(sequence, options = {}) {
    const live = sequence.filter((target) => target && !target.delivered);
    if (live.length === 0) return true;

    let currentC = Number.isFinite(options.startC)
      ? clamp(Math.round(options.startC), 1, COLS)
      : clamp(Math.round(model.playerGX), 1, COLS);
    let currentR = Number.isFinite(options.startR)
      ? clamp(Math.round(options.startR), 1, ROWS)
      : clamp(Math.round(model.playerGY), 1, ROWS);

    for (let index = 0; index < live.length; index += 1) {
      const target = live[index];
      const blockedCells = new Set(
        live.slice(index + 1).map((later) => cellKey(later.c, later.r))
      );
      if (!deliveryGridPathExists(
        currentC,
        currentR,
        target.c,
        target.r,
        { blockedCells, extraGarbage: options.extraGarbage || null }
      )) {
        return false;
      }
      currentC = target.c;
      currentR = target.r;
    }

    return true;
  }

  function rankedNearbyDeliveryCandidates(remaining, currentC, currentR, extraGarbage = null) {
    return remaining
      .map((target) => {
        const later = remaining.filter((candidate) => candidate !== target);
        const blockedCells = new Set(
          later.map((candidate) => cellKey(candidate.c, candidate.r))
        );
        const distance = deliveryGridPathDistance(
          currentC,
          currentR,
          target.c,
          target.r,
          { blockedCells, extraGarbage }
        );
        return { target, distance, tie: Math.random() };
      })
      .filter((entry) => Number.isFinite(entry.distance))
      .sort((a, b) => (a.distance - b.distance) || (a.tie - b.tie));
  }

  function pickNearbyBiasedDeliveryTarget(remaining, currentC, currentR, extraGarbage = null) {
    const ranked = rankedNearbyDeliveryCandidates(
      remaining, currentC, currentR, extraGarbage
    );
    if (ranked.length === 0) return null;

    // Prefer a stop that is physically close to the current position, while
    // keeping a little variation so every batch does not become the exact same
    // nearest-neighbour route. Only the three easiest next stops participate.
    const weights = Array.isArray(DELIVERY_ORDER_NEARBY_CHOICE_WEIGHTS)
      ? DELIVERY_ORDER_NEARBY_CHOICE_WEIGHTS
      : [0.68, 0.24, 0.08];
    const candidates = ranked.slice(0, Math.min(weights.length, ranked.length));
    let total = 0;
    const weighted = candidates.map((entry, index) => {
      const weight = Math.max(0, Number(weights[index]) || 0);
      total += weight;
      return { ...entry, weight };
    });

    if (total <= 0) return candidates[0].target;

    let pick = Math.random() * total;
    for (const entry of weighted) {
      pick -= entry.weight;
      if (pick <= 0) return entry.target;
    }
    return weighted[weighted.length - 1].target;
  }

  function buildNearbyBiasedDeliveryOrder(live, startC, startR, extraGarbage = null) {
    const remaining = live.slice();
    const ordered = [];
    let currentC = startC;
    let currentR = startR;

    while (remaining.length > 0) {
      const target = pickNearbyBiasedDeliveryTarget(
        remaining, currentC, currentR, extraGarbage
      );
      if (!target) return null;

      ordered.push(target);
      remaining.splice(remaining.indexOf(target), 1);
      currentC = target.c;
      currentR = target.r;
    }

    return ordered;
  }

  function findSafeDeliveryOrder(targets, options = {}) {
    const live = targets.filter((target) => target && !target.delivered);
    const startC = Number.isFinite(options.startC)
      ? clamp(Math.round(options.startC), 1, COLS)
      : clamp(Math.round(model.playerGX), 1, COLS);
    const startR = Number.isFinite(options.startR)
      ? clamp(Math.round(options.startR), 1, ROWS)
      : clamp(Math.round(model.playerGY), 1, ROWS);
    const extraGarbage = options.extraGarbage || null;

    // 100+ delivery order is a rule change, not a punishment. Build a route
    // that usually moves from nearby stop to nearby stop, then retain the
    // existing safety check so later pins are never impossible to avoid.
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const candidate = buildNearbyBiasedDeliveryOrder(
        live, startC, startR, extraGarbage
      );
      if (
        candidate
        && deliveryOrderSequenceIsSafe(candidate, { startC, startR, extraGarbage })
      ) {
        return candidate;
      }
    }

    // Awkward layouts use bounded backtracking. Candidate exploration is still
    // nearest-first, so the fallback remains sensible rather than reverting to
    // a wildly zigzagging random route.
    let visitedNodes = 0;
    const nodeLimit = 6000;
    const search = (remaining, ordered, currentC, currentR) => {
      visitedNodes += 1;
      if (visitedNodes > nodeLimit) return null;
      if (remaining.length === 0) return ordered;

      const candidates = rankedNearbyDeliveryCandidates(
        remaining, currentC, currentR, extraGarbage
      );
      for (const entry of candidates) {
        const target = entry.target;
        const later = remaining.filter((candidate) => candidate !== target);
        const found = search(
          later,
          [...ordered, target],
          target.c,
          target.r
        );
        if (found) return found;
      }
      return null;
    };

    return search(live, [], startC, startR);
  }

  // ----------------------------------------------------------
  // RESET / ROUND
  // ----------------------------------------------------------

  function resetSession() {
    model.time = 0;
    model.nightOver = false;
    model.attractMode = false;

    model.playerGX = 5;
    model.playerGY = 1;
    model.dirX = 0;
    model.dirY = 0;
    model.intentX = 0;
    model.intentY = 0;
    model.runSpeed = 0;

    model.touchActive = false;
    model.touchId = null;
    model.touchX = PAD_X;
    model.touchY = PAD_Y;
    clearKeyboardControlState({ stopSpeed: true });

    model.cameraX = gridX(5);
    model.cameraY = gridY(1);
    model.cameraZoom = CAMERA_ZOOM_STOP;

    model.deliveries = 0;
    model.deliveryCounterFx = null;
    model.salesCounterFx = null;
    model.rounds = 1;
    model.dishesLeft = NORMAL_BATCH_SIZE;
    model.carrying = true;
    model.activeTargets = [];
    model.bulkOrderNextAt = BULK_ORDER_START_DELIVERIES;
    model.bulkOrderEventCount = 0;
    model.bulkOrderHistory = [];
    model.currentBulkOrder = null;
    model.deliveryOrderMode = false;
    model.deliveryOrderSequenceEnforced = false;
    model.deliveryOrderUnlockAt = null;
    model.deliveryOrderIntro = { active: false, age: 0, armed: false, pending: false, startPickupAfter: false };
    model.deliveryOrderDeliveries = 0;
    model.deliveryOrderMistakes = 0;
    model.deliveryOrderPenaltyTotal = 0;
    model.deliveryOrderWrongFxTimer = 0;
    model.deliveryOrderHintTimer = 0;
    model.deliveryOrderHeatFxTimer = 0;
    model.deliveryOrderHeatFxLoss = 0;
    model.deliveredBuildings = new Map();
    model.curryHeat = 100;

    model.combo = 0;
    model.bestCombo = 0;
    model.hotDeliveries = 0;
    model.warmDeliveries = 0;
    model.coolDeliveries = 0;
    model.coldDeliveries = 0;
    model.bikeHits = 0;
    model.heatSum = 0;
    model.nightGauge = NIGHT_GAUGE_MAX;
    model.nightGaugeHeatZeroRound = -1;
    model.nightGaugeFxTimer = 0;
    model.nightClosing = false;
    model.nightEndReason = null;
    model.shiftElapsed = 0;
    model.currentBatchAcceptedSize = NORMAL_BATCH_SIZE;
    model.playtestElapsed = 0;
    model.playtestMilestones = {};
    model.performanceFrameCount = 0;
    model.performanceFrameSeconds = 0;
    model.performanceSlowFrames = 0;
    model.performanceFpsHistogram = new Array(121).fill(0);
    model.reheatAvailable = true;
    model.reheatDeparted = false;
    model.reheatFxTimer = 0;
    model.reheatFxGain = 0;
    model.reheatCount = 0;
    model.backdoorUses = 0;
    model.backdoorTransitSide = 0;
    model.nightSeed = (
      (Date.now() >>> 0)
      ^ Math.floor(Math.random() * 0xffffffff)
      ^ hashToken(`${performance.now ? performance.now() : 0}`)
    ) >>> 0;

    model.sales = 0;
    model.bestSales = Number(SSE.storage.get("bestSales", 0)) || 0;
    model.sessionPriorBestSales = model.bestSales;

    model.scent = new Map();
    model.lastScentCell = "";
    model.aroma = [];
    model.aromaEmitTimer = 0;

    model.masalaCharge = 0;
    model.masalaDisplayCharge = 0;
    model.masalaSoftStreakMax = 0;
    model.masalaRushTriggers = [];
    model.masalaRushTimer = 0;
    model.masalaRushAge = 0;
    model.masalaRushCount = 0;
    model.masalaBurstTimer = 0;
    model.masalaHotReadyFxTimer = 0;
    model.playerTrail = [{ gx: model.playerGX, gy: model.playerGY }];

    model.pepper = [];
    model.pepperHeld = 0;
    model.pepperCollected = 0;
    model.pepperFrameFxTimer = 0;
    model.pepperPickupFrameFxTimer = 0;
    model.pepperPickupFx = [];

    model.garbage = [];
    model.garbageTimer = 2.8;
    model.garbageCapSeen = 0;

    const firstCatVariant = randomCatVariant();
    const secondCatVariant = randomCatVariant(firstCatVariant.id);
    model.cats = [
      makeCat(3, 9, true, firstCatVariant.id),
      makeCat(9, 5, false, secondCatVariant.id),
    ];
    beginCatEntry(model.cats[0], 3, 9, 0.10);

    model.doorTimer = 1.5;
    model.doorOpen = false;
    model.doorOpenFx = 0;

    model.bikePhase = "warning";
    model.bikeWarningTimer = BIKE_WARNING_TIME;
    model.bikeWarningLingerTimer = 0;
    model.bikeWarningSoundPlayed = false;
    model.bikeGX = 0;
    model.bikeHitCooldown = 0;
    model.bikeStunTimer = 0;
    model.bikeJumpTimer = 0;
    model.bikeImpactTimer = 0;
    model.bikeHeatFxTimer = 0;
    model.bikeHeatFxLoss = 0;
    model.comboShatterTimer = 0;

    model.deliveryFx = null;
    model.targetExitFx = [];
    model.orderExitFx = [];
    model.returnGuide = null;
    model.pickupLeadin = null;
    model.batchCompleteFxTimer = 0;
    model.smoke = [];

    model.birds = [];
    model.birdSpawnTimer = 1.5 + Math.random() * 2.0;
    initAmbientWindows();

    startDeliveryRound();
  }

  function makeCat(c, r, active, variant = null) {
    return {
      c,
      r,
      active,
      variant: variant || randomCatVariant().id,
      timer: randomCatTime(),
      intentC: null,
      intentR: null,
      tell: 0,
      blink: 0,
      visualMirror: null,
      entryFromC: null,
      entryFromR: null,
      entryToC: null,
      entryToR: null,
      entryDuration: 0,
      entryTimer: 0,
      entryDelay: 0,
      territoryReturnSteps: 0,
    };
  }

  function catEntryStartCell(c, r) {
    const options = [
      { c, r: ROWS + CAT_ENTRY_MARGIN, d: ROWS + 1 - r },
      { c, r: 1 - CAT_ENTRY_MARGIN, d: r },
      { c: 1 - CAT_ENTRY_MARGIN, r, d: c },
      { c: COLS + CAT_ENTRY_MARGIN, r, d: COLS + 1 - c },
    ].sort((a, b) => a.d - b.d);
    return options[0];
  }

  function finishCatEntry(cat) {
    if (cat.entryToC == null || cat.entryToR == null) return;
    cat.c = cat.entryToC;
    cat.r = cat.entryToR;
    cat.entryFromC = null;
    cat.entryFromR = null;
    cat.entryToC = null;
    cat.entryToR = null;
    cat.entryDuration = 0;
    cat.entryTimer = 0;
    cat.entryDelay = 0;
    cat.tell = 0;
    cat.intentC = null;
    cat.intentR = null;
    cat.blink = 1;
    cat.timer = randomCatTime() + 0.20;
  }

  function beginCatEntry(cat, targetC, targetR, delay = 0) {
    const start = catEntryStartCell(targetC, targetR);
    cat.active = true;
    cat.c = start.c;
    cat.r = start.r;
    cat.entryFromC = start.c;
    cat.entryFromR = start.r;
    cat.entryToC = targetC;
    cat.entryToR = targetR;
    cat.entryDelay = Math.max(0, delay);
    const dist = Math.hypot(targetC - start.c, targetR - start.r);
    cat.entryDuration = Math.max(0.28, dist / CAT_ENTRY_SPEED);
    cat.entryTimer = cat.entryDuration;
    cat.tell = 0;
    cat.intentC = null;
    cat.intentR = null;
    cat.blink = 1;
    if (Math.abs(targetC - start.c) > 0.02) {
      cat.visualMirror = targetC > start.c;
    }
  }

  function targetCellAvailable(c, r) {
    if (staticBlocked(c, r)) return false;
    for (const cat of model.cats) {
      if (!cat.active) continue;
      if (Math.round(cat.c) === c && Math.round(cat.r) === r) return false;
      if (cat.tell > 0 && cat.intentC === c && cat.intentR === r) return false;
    }

    // A pin is only allowed to appear if the player can actually reach it with
    // the current rubbish + cat layout. This closes the old hole where a new
    // round could choose a destination that was already boxed in.
    return routeSafety({ extraTarget: { c, r } });
  }

  function deliveryBuildingKey(candidate) {
    return cellKey(candidate.buildingC, candidate.buildingR);
  }

  function uniqueDeliveryHouseCandidates(pool) {
    const seen = new Set();
    const result = [];
    for (const candidate of pool) {
      const key = deliveryBuildingKey(candidate);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(candidate);
    }
    return result;
  }

  function deliveryRoadCandidatesForHouse(candidate) {
    const c = candidate.buildingC;
    const r = candidate.buildingR;
    return shuffle([
      [c, r + 1],
      [c + 1, r],
      [c, r - 1],
      [c - 1, r],
    ]).filter(([roadC, roadR]) =>
      inGrid(roadC, roadR) && !isFixedBlock(roadC, roadR)
    );
  }

  function pickDeliveryHouse(
    pool,
    usedBuildings,
    previousBuildings,
    usedPinCells,
    avoidPrevious = true
  ) {
    for (const candidate of shuffle(uniqueDeliveryHouseCandidates(pool))) {
      const key = deliveryBuildingKey(candidate);
      if (usedBuildings.has(key)) continue;
      if (avoidPrevious && previousBuildings.has(key)) continue;

      // A house can now be delivered from any of its four road-facing sides.
      // Pick the side independently each round, while keeping simultaneous pins
      // distinct and preserving the existing reachability checks.
      for (const [c, r] of deliveryRoadCandidatesForHouse(candidate)) {
        const pinKey = cellKey(c, r);
        if (usedPinCells.has(pinKey)) continue;
        if (!targetCellAvailable(c, r)) continue;
        return { ...candidate, c, r, delivered: false };
      }
    }
    return null;
  }

  function bulkOrderBatchSize(eventIndex) {
    if (!BULK_ORDER_BATCH_SIZES.length) return NORMAL_BATCH_SIZE;
    const index = clamp(Math.floor(eventIndex), 0, BULK_ORDER_BATCH_SIZES.length - 1);
    return Math.max(NORMAL_BATCH_SIZE, Math.floor(BULK_ORDER_BATCH_SIZES[index]));
  }

  function deliveryBatchPlan({ pickup = false } = {}) {
    if (!pickup || model.deliveries < model.bulkOrderNextAt) {
      return { size: NORMAL_BATCH_SIZE, bulk: null };
    }

    const eventIndex = model.bulkOrderEventCount;
    const threshold = model.bulkOrderNextAt;
    const size = bulkOrderBatchSize(eventIndex);

    model.bulkOrderEventCount += 1;
    model.bulkOrderNextAt += BULK_ORDER_INTERVAL_DELIVERIES;

    const bulk = {
      eventIndex: eventIndex + 1,
      threshold,
      startedAt: model.deliveries,
      sizeRequested: size,
      sizeActual: 0,
      completedAt: null,
    };
    model.bulkOrderHistory.push(bulk);
    model.currentBulkOrder = bulk;

    return { size, bulk };
  }

  function assignDeliveryOrderSequence(targets = model.activeTargets, options = {}) {
    const live = targets.filter((target) => !target.delivered);
    if (!model.deliveryOrderMode || live.length === 0) {
      model.deliveryOrderSequenceEnforced = false;
      live.forEach((target, index) => {
        target.deliveryOrderRank = index + 1;
      });
      return true;
    }

    const safeOrder = findSafeDeliveryOrder(live);
    const ordered = safeOrder || live.slice();
    model.deliveryOrderSequenceEnforced = !!safeOrder;

    ordered.forEach((target, index) => {
      target.deliveryOrderRank = index + 1;
      if (!options.animate) target.displaySlot = index + 1;
    });

    return model.deliveryOrderSequenceEnforced;
  }

  function freeDeliveryDisplayRank(target, fallbackIndex = 0) {
    // Before sequence mode, the three route-band colours still mean only
    // destination identity, not a required delivery order. Put the nearest
    // cardamom-green band first so a player who *assumes* left-to-right order
    // naturally starts close to the shop, while every colour remains freely
    // deliverable. Extra bulk-order colours follow after the normal trio.
    const slot = Math.max(1, Math.round(target?.orderSlot || fallbackIndex + 1));
    if (slot === 3) return 1; // cardamom green: south / nearest route band
    if (slot === 1) return 2; // turmeric yellow
    if (slot === 2) return 3; // tandoori red
    return slot;
  }

  function orderedUndeliveredTargets() {
    const live = model.activeTargets.filter((target) => !target.delivered);
    if (!model.deliveryOrderMode) {
      return live.slice().sort((a, b) =>
        freeDeliveryDisplayRank(a) - freeDeliveryDisplayRank(b)
      );
    }
    return live.slice().sort((a, b) =>
      (a.deliveryOrderRank ?? 999) - (b.deliveryOrderRank ?? 999)
    );
  }

  function expectedDeliveryTarget() {
    return orderedUndeliveredTargets()[0] || null;
  }

  function maybeUnlockDeliveryOrderMode() {
    if (
      model.deliveryOrderMode
      || model.deliveryOrderIntro.pending
      || model.attractMode
      || model.deliveries < DELIVERY_ORDER_UNLOCK_DELIVERIES
    ) {
      return false;
    }

    // Reaching 100 mid-route only arms the new rule. The boss explains it the
    // next time the courier returns for a fresh batch, so an accepted delivery
    // is never interrupted by a tutorial message.
    model.deliveryOrderIntro.pending = true;
    return true;
  }

  function activateDeliveryOrderMode() {
    if (model.deliveryOrderMode) return false;

    model.deliveryOrderMode = true;
    model.deliveryOrderUnlockAt = model.deliveries;
    model.deliveryOrderIntro.pending = false;

    return true;
  }

  function applyWrongDeliveryOrderPenalty() {
    const before = clamp(model.curryHeat, 0, 100);
    setCurryHeat(model.curryHeat - DELIVERY_ORDER_WRONG_HEAT_PENALTY);
    const loss = Math.max(0, before - model.curryHeat);

    model.deliveryOrderMistakes += 1;
    model.deliveryOrderPenaltyTotal += loss;
    if (!model.attractMode) playGameSound("order_wrong");
    model.deliveryOrderWrongFxTimer = DELIVERY_ORDER_WRONG_FX_DURATION;
    // After the correction text disappears, the actual next card gets one
    // tiny physical pop. No arrow, number, or permanent helper UI is added.
    model.deliveryOrderHintTimer = DELIVERY_ORDER_WRONG_FX_DURATION + DELIVERY_ORDER_HINT_DURATION;
    model.deliveryOrderHeatFxTimer = DELIVERY_ORDER_HEAT_FX_DURATION;
    model.deliveryOrderHeatFxLoss = Math.round(loss);
    return loss;
  }

  function pepperTooClose(gx, gy, radius = 0.48) {
    return model.pepper.some((grain) => Math.hypot(grain.gx - gx, grain.gy - gy) < radius);
  }

  function pepperSpawnBlocked(c, r) {
    if (!inGrid(c, r)) return true;
    if (isFixedBlock(c, r)) return true;
    if (garbageAt(c, r)) return true;
    if (Math.hypot(c - 5, r - 1) < 1.25) return true;
    if (playerNearCell(c, r, 0.65)) return true;

    // Keep peppers slightly away from active destination pins. They should
    // tempt a route adjustment, not become an automatic reward for touching
    // the delivery marker itself.
    const nearTarget = model.activeTargets.some((target) => {
      if (target.delivered) return false;
      return Math.hypot(target.c - c, target.r - r) < 0.9;
    });
    if (nearTarget) return true;

    return false;
  }

  function pepperRunCandidates(count) {
    const candidates = [];
    const dirs = [[1, 0], [0, 1]];

    for (let r = 1; r <= ROWS; r += 1) {
      for (let c = 1; c <= COLS; c += 1) {
        for (const [dc, dr] of dirs) {
          const cells = [];
          let valid = true;
          for (let i = 0; i < count; i += 1) {
            const cc = c + dc * i;
            const rr = r + dr * i;
            if (pepperSpawnBlocked(cc, rr) || pepperTooClose(cc, rr, 0.7)) {
              valid = false;
              break;
            }
            cells.push({ c: cc, r: rr });
          }
          if (!valid) continue;
          candidates.push({ cells, dc, dr });
        }
      }
    }
    return candidates;
  }

  function spawnPepperForBatch() {
    // Keep the whole PEPPER economy physically legible: held chilies plus
    // chilies still lying in the alley can never exceed one RUSH charge.
    // This prevents a full pouch from leaving an uncollectable pepper field.
    const streetRoom = Math.max(0, PEPPER_MAX_ACTIVE - model.pepper.length);
    const ignitionRoom = Math.max(
      0,
      PEPPER_RUSH_COST - model.pepperHeld - model.pepper.length
    );
    const room = Math.min(streetRoom, ignitionRoom);
    if (room <= 0) return;

    const minCount = Math.max(1, Math.floor(PEPPER_CLUSTER_MIN));
    const maxCount = Math.max(minCount, Math.floor(PEPPER_CLUSTER_MAX));
    const desired = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
    const count = Math.min(room, desired);
    if (count <= 0) return;

    const candidates = pepperRunCandidates(count);
    if (!candidates.length) return;
    const run = candidates[Math.floor(Math.random() * candidates.length)];

    for (let i = 0; i < run.cells.length; i += 1) {
      const cell = run.cells[i];
      const side = Math.random() < 0.5 ? -1 : 1;
      const perpendicularX = -run.dr * side * (0.05 + Math.random() * 0.05);
      const perpendicularY = run.dc * side * (0.05 + Math.random() * 0.05);
      model.pepper.push({
        gx: cell.c,
        gy: cell.r,
        phase: Math.random() * Math.PI * 2,
        // New chilies do not pop into existence. A small gust rolls the short
        // run into place one after another, then each settles on its grid cell.
        spawnAge: -i * PEPPER_SPAWN_STAGGER,
        spawnDx: -run.dc * (0.34 + Math.random() * 0.10) + perpendicularX,
        spawnDy: -run.dr * (0.34 + Math.random() * 0.10) + perpendicularY,
      });
    }
  }

  function setPepperHeld(nextValue) {
    const before = clamp(Math.floor(model.pepperHeld || 0), 0, PEPPER_RUSH_COST);
    const after = clamp(Math.floor(nextValue || 0), 0, PEPPER_RUSH_COST);
    model.pepperHeld = after;

    // No numeric counter is shown. Crossing the ignition threshold is taught
    // by a single glint that runs around the HOT frame instead.
    if (before < PEPPER_RUSH_COST && after >= PEPPER_RUSH_COST) {
      model.pepperFrameFxTimer = PEPPER_FRAME_READY_FX_DURATION;
      if (!model.attractMode) playGameSound("pepper_ready");
    }
  }

  function checkPepperPickup() {
    if (!model.pepper.length) return;
    // Full means full: do not delete a chili, play its SE, or count it unless
    // it can actually enter the held supply and later reach RUSH / makanai.
    if (model.pepperHeld >= PEPPER_RUSH_COST) return;

    for (let i = model.pepper.length - 1; i >= 0; i -= 1) {
      const grain = model.pepper[i];
      // Do not collect a chili while it is still rolling into place. This keeps
      // the arrival readable instead of letting it vanish under the courier.
      if ((grain.spawnAge ?? PEPPER_SPAWN_SETTLE_DURATION) < PEPPER_SPAWN_SETTLE_DURATION * 0.42) continue;
      if (Math.hypot(model.playerGX - grain.gx, model.playerGY - grain.gy) > PEPPER_PICKUP_RADIUS) continue;

      model.pepper.splice(i, 1);
      model.pepperPickupFx.push({
        gx: grain.gx,
        gy: grain.gy,
        age: 0,
        duration: PEPPER_PICKUP_FX_DURATION,
        seed: grain.phase || Math.random() * Math.PI * 2,
      });
      model.pepperPickupFrameFxTimer = PEPPER_PICKUP_FRAME_PULSE_DURATION;
      if (!model.attractMode) playGameSound("pepper_pickup");
      setPepperHeld(model.pepperHeld + 1);
      model.pepperCollected += 1;
      if (model.pepperHeld >= PEPPER_RUSH_COST) break;
    }
  }

  function startDeliveryRound({ pickup = false } = {}) {
    // Remember the actual houses from the previous batch before replacing its
    // targets. Repetition is avoided when possible, but never at the expense
    // of filling the next accepted batch.
    const previousBuildings = new Set(
      model.activeTargets
        .filter((target) => target.buildingC != null && target.buildingR != null)
        .map((target) => cellKey(target.buildingC, target.buildingR))
    );

    const batchPlan = deliveryBatchPlan({ pickup });
    const requestedBatchSize = batchPlan.size;

    model.activeTargets = [];
    // A returning courier does not instantly receive a full HOT bar anymore.
    // During pickup the batch exists visually, but carrying only begins when
    // the short loading beat has actually finished.
    model.carrying = !pickup;
    model.curryHeat = pickup ? 0 : 100;
    model.lastScentCell = "";
    model.aromaEmitTimer = pickup ? 0 : 0.04;
    model.returnGuide = null;
    model.reheatAvailable = true;
    model.reheatDeparted = false;
    model.reheatFxTimer = 0;
    model.reheatFxGain = 0;

    const usedBuildings = new Set();
    const usedPinCells = new Set();
    const housePools = [
      outerDeliveryHouses,
      northInnerDeliveryHouses,
      southInnerDeliveryHouses,
    ];

    // First pass: one house from each route band, avoiding both duplicates in
    // this batch and houses used in the immediately previous batch. The road
    // side is chosen separately, so the same house does not always approach
    // from the same vertical lane.
    for (const pool of housePools) {
      let target = pickDeliveryHouse(
        pool, usedBuildings, previousBuildings, usedPinCells, true
      );
      // If that regional pool is too constrained, allow a previous-batch house
      // before abandoning the route band altogether.
      if (!target) {
        target = pickDeliveryHouse(
          pool, usedBuildings, previousBuildings, usedPinCells, false
        );
      }
      if (!target) continue;
      model.activeTargets.push(target);
      usedBuildings.add(deliveryBuildingKey(target));
      usedPinCells.add(cellKey(target.c, target.r));
    }

    // Final safety fallback: fill any missing orders from every eligible house.
    // Normal service stops at three; a late-shift order surge deliberately
    // continues to five, six, or seven while keeping every building and pin
    // unique within that overloaded pickup.
    while (model.activeTargets.length < requestedBatchSize) {
      const target = pickDeliveryHouse(
        allDeliveryHouses, usedBuildings, previousBuildings, usedPinCells, false
      );
      if (!target) break;
      model.activeTargets.push(target);
      usedBuildings.add(deliveryBuildingKey(target));
      usedPinCells.add(cellKey(target.c, target.r));
    }

    model.dishesLeft = model.activeTargets.length;
    model.currentBatchAcceptedSize = model.activeTargets.length;
    if (batchPlan.bulk) {
      batchPlan.bulk.sizeActual = model.activeTargets.length;
    }

    const curryVisualIds = randomOrderCurryVisualIds(model.activeTargets.length);

    // Visual order choreography. The targets are prepared immediately and a
    // shop pickup introduces them through the phone while movement stays live.
    // Delivery itself only becomes active once the fresh batch is loaded.
    const roundStartBeat = pickup
      ? PICKUP_ORDER_START
      : (model.rounds > 1 ? RETURN_NEW_ORDER_BEAT : 0);
    model.activeTargets.forEach((target, index) => {
      target.curryVisual = curryVisualIds[index] || "butter";
      target.orderSlot = index + 1;
      target.deliveryOrderRank = index + 1;
    });

    assignDeliveryOrderSequence(model.activeTargets);

    model.activeTargets.forEach((target, index) => {
      const sequenceIndex = model.deliveryOrderMode
        ? (target.deliveryOrderRank ?? index + 1)
        : freeDeliveryDisplayRank(target, index);
      target.displaySlot = sequenceIndex;
      target.orderAge = -roundStartBeat - (sequenceIndex - 1) * ORDER_CARD_STAGGER;
      target.flightAge = null;
      target.markerReady = false;
      target.markerPopAge = 0;
    });

    // One short 2–3 grain run per accepted batch. Old grains remain until
    // collected (within a small cap), so the player can decide whether a
    // detour is worth the night-clock cost.
    spawnPepperForBatch();
  }

  function beginPickupLeadin(options = {}) {
    if (model.pickupLeadin || model.nightClosing || model.nightOver) return;

    if (
      !options.skipOrderIntro
      && !model.deliveryOrderMode
      && model.deliveryOrderIntro.pending
      && !model.deliveryOrderIntro.active
    ) {
      model.deliveryOrderIntro.active = true;
      model.deliveryOrderIntro.age = 0;
      model.deliveryOrderIntro.armed = false;
      model.deliveryOrderIntro.startPickupAfter = true;
      model.touchActive = false;
      model.touchId = null;
      model.intentX = 0;
      model.intentY = 0;
      model.runSpeed = 0;
      return;
    }

    model.rounds += 1;
    startDeliveryRound({ pickup: true });
    model.pickupLeadin = { age: 0 };
  }

  function updatePickupLeadin(dt) {
    if (!model.pickupLeadin) return;

    model.pickupLeadin.age += dt;

    const fillAge = model.pickupLeadin.age - PICKUP_SETTLE_DURATION;
    const fillT = clamp(fillAge / PICKUP_HEAT_FILL_DURATION, 0, 1);
    // Fill quickly at first, then settle gently into a full HOT bar. This is
    // the actual carried heat state, not a disconnected display-only value.
    model.curryHeat = 100 * easeOutCubic(fillT);

    if (model.pickupLeadin.age < PICKUP_TOTAL_DURATION) return;

    model.curryHeat = 100;
    model.carrying = true;
    model.aromaEmitTimer = 0.04;
    model.pickupLeadin = null;
    playGameSound("pickup");
  }

  // ----------------------------------------------------------
  // INPUT
  // ----------------------------------------------------------

  // PC movement: Arrow keys, WASD, and numeric keypad 8/2/4/6.
  // The movement model itself remains cardinal-only; when more than one key is
  // held, the most recently pressed direction wins, and releasing it falls
  // back to the previous still-held direction.
  const KEYBOARD_DIRECTIONS = Object.freeze({
    ArrowUp: [0, 1],
    KeyW: [0, 1],
    Numpad8: [0, 1],
    ArrowDown: [0, -1],
    KeyS: [0, -1],
    Numpad2: [0, -1],
    ArrowLeft: [-1, 0],
    KeyA: [-1, 0],
    Numpad4: [-1, 0],
    ArrowRight: [1, 0],
    KeyD: [1, 0],
    Numpad6: [1, 0],
  });

  const keyboardHeldCodes = new Set();
  const keyboardPressOrder = [];

  // PC primary action: Enter / Space advances the same core game flow that a
  // tap/click advances on touch devices. Scene callbacks capture the registered
  // scene instance, so their local age/export state stays authoritative even
  // though SSE deep-merges the scene definitions during app setup.
  let keyboardPrimaryScene = null;
  let keyboardPrimaryAction = null;
  let keyboardPrimaryBusy = false;
  // Unlike touch input, the desktop listener lives outside the registered
  // scene object. Track the real opening gate explicitly; reading playScene.opening
  // here would read the pre-registration template rather than SSE's cloned scene.
  let keyboardPlayOpening = false;

  function keyboardConfirmCode(event) {
    const code = String(event && event.code || "");
    if (code === "Enter" || code === "NumpadEnter" || code === "Space") return code;

    const key = String(event && event.key || "");
    if (key === "Enter") return Number(event && event.location || 0) === 3 ? "NumpadEnter" : "Enter";
    if (key === " " || key === "Spacebar" || key === "Space") return "Space";
    return null;
  }

  function setKeyboardPrimaryAction(sceneName, action) {
    keyboardPrimaryScene = sceneName || null;
    keyboardPrimaryAction = typeof action === "function" ? action : null;
    keyboardPrimaryBusy = false;
  }

  function clearKeyboardPrimaryAction(sceneName = null) {
    if (sceneName && keyboardPrimaryScene !== sceneName) return;
    keyboardPrimaryScene = null;
    keyboardPrimaryAction = null;
    keyboardPrimaryBusy = false;
  }

  function markKeyboardPrimaryBusy(sceneName = null) {
    if (sceneName && keyboardPrimaryScene !== sceneName) return;
    keyboardPrimaryBusy = true;
  }

  function triggerKeyboardPrimaryAction() {
    const sceneName = SSE.app.current();
    if (keyboardPrimaryBusy || !keyboardPrimaryAction || keyboardPrimaryScene !== sceneName) return false;
    const handled = keyboardPrimaryAction() === true;
    if (handled) keyboardPrimaryBusy = true;
    return handled;
  }

  function unlockAudioFromKeyboard() {
    if (SSE && SSE.audio && typeof SSE.audio.unlock === "function") {
      SSE.audio.unlock();
    }
  }

  function gameplayControlActive() {
    return model.touchActive || model.keyboardActive;
  }

  function keyboardCode(event) {
    const code = String(event && event.code || "");
    if (KEYBOARD_DIRECTIONS[code]) return code;

    // Very old / unusual browsers may omit KeyboardEvent.code. Keep a small
    // fallback without turning the top-row number keys into movement keys.
    const key = String(event && event.key || "").toLowerCase();
    const location = Number(event && event.location || 0);
    if (key === "arrowup") return "ArrowUp";
    if (key === "arrowdown") return "ArrowDown";
    if (key === "arrowleft") return "ArrowLeft";
    if (key === "arrowright") return "ArrowRight";
    if (key === "w") return "KeyW";
    if (key === "s") return "KeyS";
    if (key === "a") return "KeyA";
    if (key === "d") return "KeyD";
    if (location === 3 && key === "8") return "Numpad8";
    if (location === 3 && key === "2") return "Numpad2";
    if (location === 3 && key === "4") return "Numpad4";
    if (location === 3 && key === "6") return "Numpad6";
    return null;
  }

  function keyboardTargetIsEditable(target) {
    if (!target || !target.tagName) return false;
    const tag = String(target.tagName).toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || !!target.isContentEditable;
  }

  function syncIntentAfterKeyboardChange() {
    while (keyboardPressOrder.length && !keyboardHeldCodes.has(keyboardPressOrder[keyboardPressOrder.length - 1])) {
      keyboardPressOrder.pop();
    }

    const code = keyboardPressOrder[keyboardPressOrder.length - 1];
    const direction = code ? KEYBOARD_DIRECTIONS[code] : null;

    if (direction) {
      model.keyboardActive = true;
      model.keyboardIntentX = direction[0];
      model.keyboardIntentY = direction[1];
      model.intentX = direction[0];
      model.intentY = direction[1];
      return;
    }

    model.keyboardActive = false;
    model.keyboardIntentX = 0;
    model.keyboardIntentY = 0;

    // If a mouse/finger is still held, hand control straight back to it.
    // Otherwise release movement normally and let the existing deceleration run.
    if (model.touchActive) {
      setIntentFromTouch(model.touchX, model.touchY);
    } else {
      model.intentX = 0;
      model.intentY = 0;
    }
  }

  function clearKeyboardControlState(options = {}) {
    keyboardHeldCodes.clear();
    keyboardPressOrder.length = 0;
    model.keyboardActive = false;
    model.keyboardIntentX = 0;
    model.keyboardIntentY = 0;

    if (model.touchActive) {
      setIntentFromTouch(model.touchX, model.touchY);
    } else {
      model.intentX = 0;
      model.intentY = 0;
    }

    // Blur/pagehide behaves like pointer cancellation: stop speed immediately
    // but deliberately preserve dirX/dirY so returning mid-cell can resume.
    if (options.stopSpeed) model.runSpeed = 0;
  }

  function keyboardGameplayAvailable() {
    return SSE.app.current() === "play"
      && !keyboardPlayOpening
      && !(model.deliveryOrderIntro && model.deliveryOrderIntro.active)
      && !model.nightOver;
  }

  function onGameplayKeyDown(event) {
    if (keyboardTargetIsEditable(event.target)) return;

    const confirmCode = keyboardConfirmCode(event);
    if (confirmCode) {
      // Space must never scroll the host page while the game canvas has focus.
      event.preventDefault();
      unlockAudioFromKeyboard();
      // Holding the key must not skip consecutive dialogue scenes.
      if (!event.repeat) triggerKeyboardPrimaryAction();
      return;
    }

    const code = keyboardCode(event);
    if (!code || !keyboardGameplayAvailable()) return;

    event.preventDefault();
    // A movement key is also a valid user gesture on desktop. This keeps audio
    // recoverable even if a browser suspended its AudioContext after focus loss.
    unlockAudioFromKeyboard();

    if (!keyboardHeldCodes.has(code)) {
      keyboardHeldCodes.add(code);
      const oldIndex = keyboardPressOrder.indexOf(code);
      if (oldIndex >= 0) keyboardPressOrder.splice(oldIndex, 1);
      keyboardPressOrder.push(code);
    }

    syncIntentAfterKeyboardChange();
  }

  function onGameplayKeyUp(event) {
    const code = keyboardCode(event);
    if (!code) return;

    // Prevent page scrolling while a game movement key is being released too.
    if (keyboardHeldCodes.has(code) || SSE.app.current() === "play") {
      event.preventDefault();
    }

    keyboardHeldCodes.delete(code);
    const index = keyboardPressOrder.indexOf(code);
    if (index >= 0) keyboardPressOrder.splice(index, 1);
    syncIntentAfterKeyboardChange();
  }

  function installKeyboardControls() {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;

    window.addEventListener("keydown", onGameplayKeyDown, { passive: false });
    window.addEventListener("keyup", onGameplayKeyUp, { passive: false });

    const cancelKeyboard = () => clearKeyboardControlState({ stopSpeed: true });
    window.addEventListener("blur", cancelKeyboard);
    window.addEventListener("pagehide", cancelKeyboard);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelKeyboard();
    });
  }

  function setIntentFromTouch(x, y) {
    const dx = x - PAD_X;
    const dy = y - PAD_Y;

    if (Math.hypot(dx, dy) < PAD_DEADZONE) {
      model.intentX = 0;
      model.intentY = 0;
      return;
    }

    if (Math.abs(dx) >= Math.abs(dy)) {
      model.intentX = dx >= 0 ? 1 : -1;
      model.intentY = 0;
    } else {
      model.intentX = 0;
      model.intentY = dy >= 0 ? 1 : -1;
    }
  }

  function beginPadTouch(touch) {
    const d = Math.hypot(touch.x - PAD_X, touch.y - PAD_Y);
    if (d > PAD_TOUCH_RADIUS) return false;

    model.touchActive = true;
    model.touchId = touch.id;
    model.touchX = touch.x;
    model.touchY = touch.y;
    if (!model.keyboardActive) setIntentFromTouch(touch.x, touch.y);
    return true;
  }

  function updatePadTouch(touch) {
    if (!model.touchActive || touch.id !== model.touchId) return;
    model.touchX = touch.x;
    model.touchY = touch.y;
    if (!model.keyboardActive) setIntentFromTouch(touch.x, touch.y);
  }

  function endPadTouch(touch) {
    if (!model.touchActive || touch.id !== model.touchId) return;
    model.touchActive = false;
    model.touchId = null;
    if (model.keyboardActive) {
      model.intentX = model.keyboardIntentX;
      model.intentY = model.keyboardIntentY;
    } else {
      model.intentX = 0;
      model.intentY = 0;
    }
    model.touchX = PAD_X;
    model.touchY = PAD_Y;

    // A normal finger lift keeps the intended short deceleration. A cancelled
    // pointer (page hide, app switch, browser navigation) stops speed outright,
    // but deliberately keeps the current rail direction. The courier can be
    // between grid centres when the page loses focus; clearing dirX/dirY there
    // leaves applyTurnReservation unable to restart from that half-cell and the
    // player becomes permanently stuck after returning to the game.
    if (touch.state === CANCELLED) {
      model.runSpeed = 0;
    }
  }

  // ----------------------------------------------------------
  // MOVEMENT
  // ----------------------------------------------------------

  function canMoveFromNode(c, r, dx, dy) {
    return !playerBlocked(c + dx, r + dy);
  }

  function nearNodeForTurn() {
    const c = Math.round(model.playerGX);
    const r = Math.round(model.playerGY);
    return {
      c,
      r,
      nearX: Math.abs(model.playerGX - c) <= TURN_SNAP,
      nearY: Math.abs(model.playerGY - r) <= TURN_SNAP,
    };
  }

  function applyTurnReservation() {
    const ix = model.intentX;
    const iy = model.intentY;
    if (ix === 0 && iy === 0) return;

    // Immediate reverse is allowed on the same rail.
    if (model.dirX !== 0 && ix === -model.dirX && iy === 0) {
      model.dirX = ix;
      model.dirY = 0;
      return;
    }
    if (model.dirY !== 0 && iy === -model.dirY && ix === 0) {
      model.dirX = 0;
      model.dirY = iy;
      return;
    }

    let node = nearNodeForTurn();

    // If a wall/cat stopped us between cell centers, a new perpendicular
    // input may recover to the last open node. This keeps the Codea-like
    // "reserve the next turn" feel instead of trapping the player at a wall.
    if (model.runSpeed === 0 && model.dirX !== 0 && iy !== 0) {
      let c = Math.round(model.playerGX);
      const r = Math.round(model.playerGY);
      if (playerBlocked(c, r)) c -= model.dirX;
      if (inGrid(c, r) && canMoveFromNode(c, r, ix, iy)) {
        model.playerGX = c;
        model.playerGY = r;
        model.dirX = ix;
        model.dirY = iy;
        return;
      }
    }

    if (model.runSpeed === 0 && model.dirY !== 0 && ix !== 0) {
      const c = Math.round(model.playerGX);
      let r = Math.round(model.playerGY);
      if (playerBlocked(c, r)) r -= model.dirY;
      if (inGrid(c, r) && canMoveFromNode(c, r, ix, iy)) {
        model.playerGX = c;
        model.playerGY = r;
        model.dirX = ix;
        model.dirY = iy;
        return;
      }
    }

    // Starting from rest.
    if (model.dirX === 0 && model.dirY === 0) {
      if (node.nearX && node.nearY && canMoveFromNode(node.c, node.r, ix, iy)) {
        model.playerGX = node.c;
        model.playerGY = node.r;
        model.dirX = ix;
        model.dirY = iy;
      }
      return;
    }

    // Same direction needs no turn.
    if (ix === model.dirX && iy === model.dirY) return;

    // Perpendicular turn is taken at the first valid node.
    const turnReady = model.dirX !== 0 ? node.nearX : node.nearY;
    if (!turnReady) return;

    if (canMoveFromNode(node.c, node.r, ix, iy)) {
      model.playerGX = node.c;
      model.playerGY = node.r;
      model.dirX = ix;
      model.dirY = iy;
    }
  }

  function forwardBlockedAtCenter() {
    if (model.dirX !== 0) {
      const c = Math.round(model.playerGX);
      const r = Math.round(model.playerGY);
      if (Math.abs(model.playerGX - c) <= COLLISION_CENTER_EPS) {
        return !canMoveFromNode(c, r, model.dirX, 0);
      }
    }

    if (model.dirY !== 0) {
      const c = Math.round(model.playerGX);
      const r = Math.round(model.playerGY);
      if (Math.abs(model.playerGY - r) <= COLLISION_CENTER_EPS) {
        return !canMoveFromNode(c, r, 0, model.dirY);
      }
    }

    return false;
  }

  function advanceHorizontal(distance) {
    const r = Math.round(model.playerGY);
    model.playerGY = r;

    const currentC = Math.round(model.playerGX);
    if (Math.abs(model.playerGX - currentC) <= COLLISION_CENTER_EPS) {
      model.playerGX = currentC;
      if (!canMoveFromNode(currentC, r, model.dirX, 0)) return false;
    }

    const nextC = model.dirX > 0
      ? Math.floor(model.playerGX + 0.00001) + 1
      : Math.ceil(model.playerGX - 0.00001) - 1;

    const toCenter = Math.abs(nextC - model.playerGX);
    if (distance >= toCenter) {
      // Check the cell we are about to enter at the crossing itself. The
      // previous implementation only checked while exactly on a centre; a
      // fast frame could therefore step through a wall or beyond the board.
      if (playerBlocked(nextC, r)) {
        model.playerGX = model.dirX > 0
          ? Math.floor(model.playerGX + 0.00001)
          : Math.ceil(model.playerGX - 0.00001);
        return false;
      }
      model.playerGX = nextC;
    } else {
      model.playerGX += model.dirX * distance;
    }

    return true;
  }

  function advanceVertical(distance) {
    const c = Math.round(model.playerGX);
    model.playerGX = c;

    const currentR = Math.round(model.playerGY);
    if (Math.abs(model.playerGY - currentR) <= COLLISION_CENTER_EPS) {
      model.playerGY = currentR;
      if (!canMoveFromNode(c, currentR, 0, model.dirY)) return false;
    }

    const nextR = model.dirY > 0
      ? Math.floor(model.playerGY + 0.00001) + 1
      : Math.ceil(model.playerGY - 0.00001) - 1;

    const toCenter = Math.abs(nextR - model.playerGY);
    if (distance >= toCenter) {
      // Same crossing-time guard for vertical movement, including the outer
      // edge of the board (which is represented as a blocked cell).
      if (playerBlocked(c, nextR)) {
        model.playerGY = model.dirY > 0
          ? Math.floor(model.playerGY + 0.00001)
          : Math.ceil(model.playerGY - 0.00001);
        return false;
      }
      model.playerGY = nextR;
    } else {
      model.playerGY += model.dirY * distance;
    }

    return true;
  }

  function advanceAlongRail(distance) {
    if (model.dirX !== 0) return advanceHorizontal(distance);
    if (model.dirY !== 0) return advanceVertical(distance);
    return false;
  }

  function updateBackdoorUsage(previousGX, previousGY) {
    const prevC = Math.round(previousGX);
    const prevR = Math.round(previousGY);
    const currentC = Math.round(model.playerGX);
    const currentR = Math.round(model.playerGY);

    // Entering the doorway from either side arms one transit.
    if (
      currentC === DOOR_COL
      && currentR === DOOR_ROW
      && !(prevC === DOOR_COL && prevR === DOOR_ROW)
    ) {
      if (prevR < DOOR_ROW) model.backdoorTransitSide = -1;
      else if (prevR > DOOR_ROW) model.backdoorTransitSide = 1;
      return;
    }

    // Leaving on the opposite side counts one use. Returning to the side we
    // entered from cancels it, so hovering in the doorway never farms uses.
    if (
      model.backdoorTransitSide !== 0
      && prevC === DOOR_COL
      && prevR === DOOR_ROW
      && currentC === DOOR_COL
      && currentR !== DOOR_ROW
    ) {
      const exitSide = currentR < DOOR_ROW ? -1 : 1;
      if (exitSide === -model.backdoorTransitSide) {
        model.backdoorUses += 1;
      }
      model.backdoorTransitSide = 0;
    }

    // If some collision correction moves us away from the doorway without a
    // normal exit, discard the pending transit safely.
    if (
      model.backdoorTransitSide !== 0
      && currentC !== DOOR_COL
      && currentR !== DOOR_ROW
    ) {
      model.backdoorTransitSide = 0;
    }
  }

  function updateMovement(dt) {
    if (model.bikeStunTimer > 0) {
      model.bikeStunTimer = Math.max(0, model.bikeStunTimer - dt);
      model.runSpeed = 0;
      return;
    }

    applyTurnReservation();

    const wantsRun = gameplayControlActive() && (model.intentX !== 0 || model.intentY !== 0);
    if (wantsRun) {
      model.runSpeed = Math.min(MAX_RUN_SPEED, model.runSpeed + RUN_ACCEL * dt);
    } else {
      model.runSpeed = Math.max(0, model.runSpeed - RELEASE_DECEL * dt);
    }

    // Codea parity for blocking only: walls, closed door, garbage and cats
    // decelerate the player at the lane node instead of letting the center
    // travel halfway into the blocked cell. This is intentionally separate
    // from turn-pre-braking, which remains OFF for Prototype 02.
    if (forwardBlockedAtCenter()) {
      model.runSpeed = Math.max(0, model.runSpeed - WALL_DECEL * dt);
    }

    if (model.runSpeed <= 0.0001 || (model.dirX === 0 && model.dirY === 0)) {
      model.runSpeed = 0;
      return;
    }

    const distance = model.runSpeed * dt;
    const steps = Math.max(1, Math.ceil(distance / MOVE_SUBSTEP));
    const step = distance / steps;

    for (let i = 0; i < steps; i += 1) {
      // Re-check the reserved turn at every lane-center crossing. This is
      // how the Codea prototype avoids frame-rate-dependent missed corners.
      applyTurnReservation();
      if (!advanceAlongRail(step)) break;
    }

    model.playerGX = clamp(model.playerGX, 1, COLS);
    model.playerGY = clamp(model.playerGY, 1, ROWS);
  }

  // ----------------------------------------------------------
  // CURRY / DELIVERY / SCORE
  // ----------------------------------------------------------

  function recordPlayerTrail() {
    const last = model.playerTrail[model.playerTrail.length - 1];
    const gx = model.playerGX;
    const gy = model.playerGY;
    if (!last) {
      model.playerTrail.push({ gx, gy });
      return;
    }

    const dx = gx - last.gx;
    const dy = gy - last.gy;
    if (Math.hypot(dx, dy) < PLAYER_TRAIL_SAMPLE_DISTANCE) return;

    model.playerTrail.push({ gx, gy });
    if (model.playerTrail.length > PLAYER_TRAIL_MAX_POINTS) {
      model.playerTrail.splice(0, model.playerTrail.length - PLAYER_TRAIL_MAX_POINTS);
    }
  }

  function trailPointBehind(distance) {
    const trail = model.playerTrail;
    if (!trail.length) return { gx: model.playerGX, gy: model.playerGY };

    let remain = Math.max(0, distance);
    for (let i = trail.length - 1; i > 0; i -= 1) {
      const a = trail[i];
      const b = trail[i - 1];
      const seg = Math.hypot(a.gx - b.gx, a.gy - b.gy);
      if (seg <= 0.0001) continue;
      if (remain <= seg) {
        const t = remain / seg;
        return {
          gx: a.gx + (b.gx - a.gx) * t,
          gy: a.gy + (b.gy - a.gy) * t,
        };
      }
      remain -= seg;
    }

    return { ...trail[0] };
  }

  function rushPartyCatPosition(index) {
    const gap = PARTY_CAT_GAPS[Math.min(index, PARTY_CAT_GAPS.length - 1)]
      + Math.max(0, index - PARTY_CAT_GAPS.length + 1) * 0.65;
    return trailPointBehind(gap);
  }

  function updateRushPartyCats(dt) {
    if (!masalaRushActive()) return;

    // Masala Rush is a separate cat state. Cats are not using the normal
    // grid AI / tell / commit loop here; they are non-blocking party followers.
    // Update their *actual model coordinates* from the courier trail so they
    // cannot remain logically frozen on the cell where the rush began.
    for (let i = 0; i < model.cats.length; i += 1) {
      const cat = model.cats[i];
      if (!cat.active) continue;

      const target = rushPartyCatPosition(i);
      const followSpeed = 15.0 - Math.min(i, 2) * 1.2;
      cat.c = approachExp(cat.c, target.gx, followSpeed, dt);
      cat.r = approachExp(cat.r, target.gy, followSpeed, dt);

      // Normal movement state must stay completely dormant during the rush.
      cat.intentC = null;
      cat.intentR = null;
      cat.tell = 0;
      cat.timer = 0;
      cat.blink *= 0.72;
    }
  }

  function catSettleCellFromTrail(index, used) {
    const preferred = PARTY_CAT_GAPS[Math.min(index, PARTY_CAT_GAPS.length - 1)];
    const candidates = [];
    for (let extra = 0; extra <= 2.6; extra += 0.18) {
      candidates.push(trailPointBehind(preferred + extra));
    }

    for (const p of candidates) {
      const c = clamp(Math.round(p.gx), 1, COLS);
      const r = clamp(Math.round(p.gy), 1, ROWS);
      const key = cellKey(c, r);
      if (used.has(key)) continue;
      if (staticBlocked(c, r) || garbageAt(c, r)) continue;
      if (c === 5 && r === 1) continue;
      if (activeTargetAt(c, r)) continue;
      if (playerNearCell(c, r, 0.72)) continue;

      // IMPORTANT: party cats are visual followers during Masala Rush, but
      // when the rush ends they become real blockers again. Their landing
      // cell must obey the same BFS safety rule as ordinary cat movement.
      // Without this check a follower could settle beside a destination that
      // was already boxed in by rubbish + the restaurant wall, creating a
      // genuine soft-lock the instant the rush ended.
      if (!routeSafety({ movingCatIndex: index, catC: c, catR: r })) continue;

      used.add(key);
      return { c, r };
    }
    return null;
  }

  function settleRushCats() {
    const used = new Set();
    for (let i = 0; i < model.cats.length; i += 1) {
      const cat = model.cats[i];
      if (!cat.active) continue;
      const cell = catSettleCellFromTrail(i, used);
      if (cell) {
        cat.c = cell.c;
        cat.r = cell.r;
      }
      cat.intentC = null;
      cat.intentR = null;
      cat.tell = 0;
      cat.timer = randomCatTime();
      cat.blink = 1;
      cat.territoryReturnSteps = catTerritoryDistance(i, Math.round(cat.r)) > 0
        ? CAT_TERRITORY.rushReturnSteps
        : 0;
    }
  }

  function masalaRushChargeRequired(deliveries = model.deliveries) {
    return balanceRampValue(MASALA_SOFT_STREAK.thresholdByDeliveries, deliveries);
  }

  function activateMasalaRush(trigger = null) {
    const required = masalaRushChargeRequired();
    const pepperBefore = model.pepperHeld;
    const pepperSpent = Math.min(PEPPER_RUSH_COST, pepperBefore);
    if (trigger && !model.attractMode) {
      model.masalaRushTriggers.push({
        delivery: model.deliveries,
        before: trigger.before,
        after: trigger.after,
        required,
        pepperBefore,
        pepperSpent,
      });
    }
    setPepperHeld(pepperBefore - pepperSpent);
    model.pepperFrameFxTimer = 0;
    model.masalaCharge = 0;
    model.masalaHotReadyFxTimer = 0;
    model.masalaDisplayCharge = required;
    model.masalaRushTimer = MASALA_RUSH_DURATION;
    model.masalaRushAge = 0;
    model.masalaRushCount += 1;
    model.masalaBurstTimer = MASALA_BURST_DURATION;
    playGameSound("rush_start");
    // Stop the ordinary grid AI immediately. From this frame until the rush
    // ends, updateRushPartyCats() owns cat.c / cat.r directly.
    for (const cat of model.cats) {
      if (!cat.active) continue;
      cat.intentC = null;
      cat.intentR = null;
      cat.tell = 0;
      cat.timer = 0;
      cat.blink = 0;
    }
  }

  function addMasalaCharge(kind) {
    if (masalaRushActive()) return;

    const required = masalaRushChargeRequired();
    const before = model.masalaCharge;
    let next = before;

    if (kind === "hot") next += MASALA_SOFT_STREAK.hotGain;
    else if (kind === "warm") next += MASALA_SOFT_STREAK.warmGain;
    else if (kind === "cool") next = Math.max(0, next - MASALA_SOFT_STREAK.coolLoss);
    else if (MASALA_SOFT_STREAK.coldResets) next = 0;

    // Once ready, extra WARM deliveries do not bank an unlimited reserve.
    model.masalaCharge = Math.min(required, Math.max(0, next));
    model.masalaSoftStreakMax = Math.max(model.masalaSoftStreakMax, model.masalaCharge);

    const hasPepper = model.pepperHeld >= PEPPER_RUSH_COST;
    const willIgnite = kind === "hot" && model.masalaCharge >= required && hasPepper;
    const becameHotReady = before < required && model.masalaCharge >= required;

    // Keep the build-up calm. The HOT side reacts strongly only at the exact
    // completion moment, then settles into a static ready mark inside the bar.
    // If this same delivery starts MASALA RUSH, the rush itself is the reward
    // animation and we avoid stacking another flourish on top.
    if (becameHotReady && !willIgnite) {
      model.masalaHotReadyFxTimer = MASALA_HOT_READY_FX_DURATION;
      playGameSound("hot_streak_3");
    }

    // Reaching the threshold on WARM merely primes the rush. A HOT delivery is
    // always required for the actual ignition.
    if (willIgnite) {
      activateMasalaRush({ before, after: model.masalaCharge });
    }
  }

  function updateMasalaRush(dt) {
    const wasActive = model.masalaRushTimer > 0;

    model.masalaDisplayCharge = approachExp(
      model.masalaDisplayCharge,
      model.masalaCharge,
      model.masalaBurstTimer > 0 ? 8.5 : 10.5,
      dt,
    );
    model.masalaBurstTimer = Math.max(0, model.masalaBurstTimer - dt);
    model.masalaHotReadyFxTimer = Math.max(0, model.masalaHotReadyFxTimer - dt);
    if (wasActive) model.masalaRushAge += dt;
    model.masalaRushTimer = Math.max(0, model.masalaRushTimer - dt);

    if (wasActive && model.masalaRushTimer <= 0) settleRushCats();
  }

  function extendMasalaRushOnDelivery() {
    if (!masalaRushActive()) return;
    if (model.deliveries < MASALA_RUSH_EXTEND_UNLOCK_DELIVERIES) return;

    // Long shifts earn a stronger rush: every completed delivery restores one
    // second, but never pushes the timer above a freshly activated rush.
    const before = model.masalaRushTimer;
    model.masalaRushTimer = Math.min(
      MASALA_RUSH_DURATION,
      model.masalaRushTimer + MASALA_RUSH_DELIVERY_BONUS,
    );
    if (model.masalaRushTimer > before + 0.03) {
      playGameSound("rush_extend");
    }
  }

  function applyDeliveryHeat(heat) {
    if (heat >= COMBO_HOT_HEAT) {
      model.combo += 1;
      model.bestCombo = Math.max(model.bestCombo, model.combo);
      return "hot";
    }

    if (heat >= COMBO_BREAK_HEAT) return "warm";

    model.combo = 0;
    if (heat >= COLD_MISS_HEAT) return "cool";
    return "cold";
  }

  function recordDeliveryCharacter(kind, heat) {
    model.heatSum += heat;
    if (kind === "hot") model.hotDeliveries += 1;
    else if (kind === "warm") model.warmDeliveries += 1;
    else if (kind === "cool") model.coolDeliveries += 1;
    else model.coldDeliveries += 1;
  }

  function addDeliverySales() {
    // The job pays by completed order. A hot curry may help combos and Masala
    // Rush, but every customer pays the same ¥1,200.
    const gain = DELIVERY_SALE_PRICE;

    // The title attract demo really completes deliveries, but it must never
    // write fake earnings into the player's persistent record.
    if (model.attractMode) return gain;

    model.sales += gain;
    if (model.sales > model.bestSales) {
      model.bestSales = model.sales;
      if (!distributionTestActive) SSE.storage.set("bestSales", model.bestSales);
    }
    return gain;
  }

  function checkShopReheat() {
    if (!model.carrying || !model.reheatAvailable) return;

    const d = Math.hypot(model.playerGX - 5, model.playerGY - 1);

    // A newly accepted batch starts on the shop tile. The pit stop only becomes
    // available after the courier has genuinely headed out into the town.
    if (!model.reheatDeparted) {
      if (d >= REHEAT_DEPART_RADIUS) model.reheatDeparted = true;
      return;
    }

    if (d > REHEAT_SHOP_RADIUS) return;

    // If the curry is still basically fresh, do nothing and keep the pit stop
    // available for later. This makes discovering the mechanic feel generous.
    if (model.curryHeat > REHEAT_TRIGGER_MAX_HEAT) return;

    const before = model.curryHeat;
    setCurryHeat(Math.min(REHEAT_CAP, model.curryHeat + REHEAT_GAIN));
    const gain = model.curryHeat - before;
    if (gain <= 0.01) return;

    model.reheatAvailable = false;
    model.reheatFxTimer = REHEAT_FX_DURATION;
    model.reheatFxGain = Math.round(gain);
    model.reheatCount += 1;
    playGameSound("reheat");

    // Reheating makes the curry fragrant again. This is the pit-stop tradeoff:
    // HOT comes back, but the shop becomes a strong scent hotspot that can pull
    // cats toward the route. No explicit penalty UI is needed; the town reacts.
    const key = cellKey(5, 1);
    const reheatScent =
      SCENT_ADD_AMOUNT * scentHeatMultiplier(model.curryHeat) * REHEAT_SCENT_BURST_MULT;
    model.scent.set(key, clamp((model.scent.get(key) || 0) + reheatScent, 0, 2.5));
    spawnCarryAroma(scentHeatMultiplier(model.curryHeat) * 1.20, true);
  }

  function targetCanBeDelivered(target) {
    if (target.markerReady) return true;
    if (target.flightAge == null) return false;
    return target.flightAge >= ORDER_ARROW_FLIGHT_DURATION - ORDER_EARLY_DELIVERY_WINDOW;
  }

  function checkDelivery() {
    if (model.pickupLeadin) return;

    if (model.carrying) {
      for (const target of model.activeTargets) {
        if (target.delivered) continue;
        // Let the player claim the destination during the final moment of
        // the pin's flight. By this point the ease-out animation is already
        // visually almost at the destination, so an anticipatory pass should
        // feel successful rather than being rejected by a few frames.
        if (!targetCanBeDelivered(target)) continue;
        if (!playerNearCell(target.c, target.r, 0.31)) continue;

        const orderModeWasActive = model.deliveryOrderMode && model.deliveryOrderSequenceEnforced;
        const expectedTarget = orderModeWasActive ? expectedDeliveryTarget() : null;
        const wrongDeliveryOrder = !!(expectedTarget && expectedTarget !== target);
        const heat = model.curryHeat;

        // The completed order must leave from the position where the card is
        // currently visible. After earlier deliveries, cards may already have
        // packed left, so orderSlot is no longer the card's on-screen position.
        // Preserve the original slot separately only for its colour identity.
        model.orderExitFx.push({
          displaySlot: target.displaySlot ?? target.orderSlot ?? 1,
          colorSlot: target.orderSlot || 1,
          curryVisual: target.curryVisual || "butter",
          layoutCount: phoneOrderLayoutCount(),
          age: 0,
          duration: ORDER_EXIT_DURATION,
        });

        // The destination arrow also gets a short exit instead of vanishing
        // on the same frame as the logical delivery. It tucks down into the
        // destination while the carried dish leaves the lower HUD.
        model.targetExitFx.push({
          c: target.c,
          r: target.r,
          slot: target.orderSlot || 1,
          age: 0,
          duration: TARGET_EXIT_DURATION,
        });

        target.delivered = true;
        model.dishesLeft -= 1;
        const previousDeliveries = model.deliveries;
        model.deliveries += 1;
        model.deliveryCounterFx = {
          from: previousDeliveries,
          to: model.deliveries,
          age: 0,
          duration: DELIVERY_COUNTER_FX_DURATION,
        };
        if (orderModeWasActive) model.deliveryOrderDeliveries += 1;

        const kind = applyDeliveryHeat(heat);
        recordDeliveryCharacter(kind, heat);
        if (wrongDeliveryOrder) applyWrongDeliveryOrderPenalty();

        if (target.buildingC != null && target.buildingR != null) {
          model.deliveredBuildings.set(cellKey(target.buildingC, target.buildingR), {
            pinC: target.c,
            pinR: target.r,
          });
        }

        const previousSales = model.sales;
        const gain = addDeliverySales();
        if (model.sales !== previousSales) {
          model.salesCounterFx = {
            from: previousSales,
            to: model.sales,
            age: 0,
            duration: DELIVERY_COUNTER_FX_DURATION,
          };
        }
        addMasalaCharge(kind);
        extendMasalaRushOnDelivery();
        maybeUnlockDeliveryOrderMode();
        capturePlaytestMilestone();
        playGameSound(`delivery_${kind}`);

        model.deliveryFx = {
          c: target.c,
          r: target.r,
          buildingC: target.buildingC,
          buildingR: target.buildingR,
          slot: target.orderSlot || 1,
          kind,
          gain,
          combo: model.combo,
          timer: 0.64,
          duration: 0.64,
        };

        if (model.dishesLeft <= 0) {
          if (model.currentBulkOrder) {
            model.currentBulkOrder.completedAt = model.deliveries;
            model.currentBulkOrder = null;
          }
          model.carrying = false;
          model.heatBarHoldTimer = HEAT_BAR_LINGER_DURATION;
          // Let the final card leave first, then give the empty terminal one
          // tiny warm flash before the existing return-to-shop choreography.
          model.batchCompleteFxTimer = ORDER_EXIT_DURATION + BATCH_COMPLETE_FLASH_DURATION;
          playGameSound("batch_complete");
          // Every accepted batch is finished before returning. If the three-light
          // night gauge has gone out, this return leads to makanai; otherwise the
          // next batch is physically picked up at the shop.
          model.returnGuide = { age: 0 };
        }
        return;
      }
    } else if (playerNearCell(5, 1, 0.31)) {
      if (model.nightClosing) {
        finishNight();
      } else {
        beginPickupLeadin();
      }
    }
  }

  function makanaiTier(deliveries) {
    let tier = 1;
    for (let i = 1; i < MAKANAI_TIER_THRESHOLDS.length; i += 1) {
      if (deliveries >= MAKANAI_TIER_THRESHOLDS[i]) tier = i + 1;
    }
    return tier;
  }

  function drainNightGaugeAtZeroHeat() {
    if (
      !model.carrying
      || model.nightOver
      || model.nightGaugeHeatZeroRound === model.rounds
    ) {
      return;
    }

    model.nightGaugeHeatZeroRound = model.rounds;
    model.nightGauge = Math.max(0, model.nightGauge - 1);
    model.nightGaugeFxTimer = NIGHT_GAUGE_FX_DURATION;
    playGameSound("night_lost");

    if (model.nightGauge <= 0) {
      if (!model.nightClosing) {
        model.nightClosing = true;
        model.nightEndReason = "night-gauge";
      }
    }
  }

  function setCurryHeat(nextHeat) {
    const before = clamp(model.curryHeat, 0, 100);
    const next = clamp(nextHeat, 0, 100);
    model.curryHeat = next;

    // The night gauge is now causally tied to the visible heat gauge: the
    // instant the bar actually reaches zero, one night light goes out.
    if (before > 0.001 && next <= 0.001) {
      drainNightGaugeAtZeroHeat();
    }

    return model.curryHeat;
  }

  function scentHeatMultiplier(heat = model.curryHeat) {
    if (heat >= COMBO_HOT_HEAT) return BALANCE.scent.heatMultiplier.hot;
    if (heat >= COMBO_BREAK_HEAT) return BALANCE.scent.heatMultiplier.warm;
    if (heat >= COLD_MISS_HEAT) return BALANCE.scent.heatMultiplier.cool;
    return BALANCE.scent.heatMultiplier.cold;
  }

  function spawnCarryAroma(multiplier = scentHeatMultiplier(), burst = false) {
    if (distributionTestActive) return;
    const x = gridX(model.playerGX);
    const y = gridY(model.playerGY);
    const facing = playerFacing();
    const plateSide = (facing === "front" || facing === "left") ? -1 : 1;

    // Most puffs are only one mote. Hot curry occasionally releases a second
    // one, while explicit bursts (reheat / rush) may be a little fuller.
    let particleCount = 1;
    if (burst) particleCount = multiplier > 1.1 ? 3 : 2;
    else if (multiplier >= 1.2 && Math.random() < 0.34) particleCount = 2;

    for (let i = 0; i < particleCount; i += 1) {
      const toneRoll = Math.random();
      const tone = toneRoll < 0.68 ? "amber" : toneRoll < 0.94 ? "curry" : "cream";
      model.aroma.push({
        // Start beside the carried plate, not on the floor. World anchoring then
        // naturally leaves a very short wake when the courier keeps moving.
        x: x + plateSide * (4.2 + Math.random() * 1.8) + (Math.random() - 0.5) * 1.8,
        y: y + 3.8 + Math.random() * 2.6 + i * 1.4,
        vx: (Math.random() - 0.5) * 2.4,
        vy: 13.0 + Math.random() * 6.0,
        age: -i * 0.035,
        life: AROMA_PARTICLE_LIFE + Math.random() * 0.18,
        size: 1.8 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 0.75,
        phase: Math.random() * Math.PI * 2,
        tone,
      });
    }

    if (model.aroma.length > AROMA_MAX_PARTICLES) {
      model.aroma.splice(0, model.aroma.length - AROMA_MAX_PARTICLES);
    }
  }

  function updateHeatAndScent(dt) {
    if (model.carrying) {
      if (!masalaRushActive()) {
        setCurryHeat(model.curryHeat - COLD_HEAT_LOSS_PER_SEC * dt);
      }

      const c = clamp(Math.round(model.playerGX), 1, COLS);
      const r = clamp(Math.round(model.playerGY), 1, ROWS);
      const key = cellKey(c, r);
      if (key !== model.lastScentCell) {
        model.lastScentCell = key;
        const heatScent = scentHeatMultiplier(model.curryHeat);
        const rushScent = masalaRushActive() ? 1.55 : 1.0;
        const scentGain = SCENT_ADD_AMOUNT * heatScent * rushScent;
        model.scent.set(key, clamp((model.scent.get(key) || 0) + scentGain, 0, 2.5));
      }

      // Aroma is a transient air effect, deliberately decoupled from the scent
      // cells above. Moving emits a loose rhythm; standing still only gives an
      // occasional puff so the curry still reads as fragrant without drawing a
      // continuous trail behind the player.
      model.aromaEmitTimer -= dt;
      if (model.aromaEmitTimer <= 0) {
        const heatScent = scentHeatMultiplier(model.curryHeat);
        const moving = model.runSpeed > 0.08;
        spawnCarryAroma(heatScent * (masalaRushActive() ? 1.15 : 1.0));
        const baseInterval = moving ? AROMA_MOVE_INTERVAL : AROMA_IDLE_INTERVAL;
        const heatTempo = clamp(1.08 / Math.max(0.68, heatScent), 0.82, 1.30);
        model.aromaEmitTimer = baseInterval * heatTempo * (0.88 + Math.random() * 0.28);
      }
    } else {
      // Returning to the shop should feel visually clean: no fresh curry aroma.
      model.lastScentCell = "";
      model.aromaEmitTimer = 0;
    }

    for (const [key, value] of model.scent.entries()) {
      const next = value - SCENT_DECAY_PER_SEC * dt;
      if (next <= 0.001) model.scent.delete(key);
      else model.scent.set(key, next);
    }
  }

  // ----------------------------------------------------------
  // CATS
  // ----------------------------------------------------------

  function cellNearGarbage(c, r) {
    return model.garbage.some((g) => distanceManhattan(c, r, g.c, g.r) <= 1);
  }

  function cellNearOtherCat(index, c, r) {
    return model.cats.some((other, i) => {
      if (i === index || !other.active) return false;
      if (distanceManhattan(c, r, other.c, other.r) <= 1) return true;
      if (other.tell > 0 && other.intentC != null && distanceManhattan(c, r, other.intentC, other.intentR) <= 1) return true;
      return false;
    });
  }

  function cellOccupiedByOtherCat(index, c, r) {
    return model.cats.some((other, i) => {
      if (i === index || !other.active) return false;
      if (Math.round(other.c) === c && Math.round(other.r) === r) return true;
      if (other.tell > 0 && other.intentC === c && other.intentR === r) return true;
      return false;
    });
  }

  function catTerritoryHome(index) {
    const homes = CAT_TERRITORY.homeByIndex || [];
    return homes[index] || (index % 2 === 0 ? "lower" : "upper");
  }

  function catTerritoryBand(r) {
    if (r < CAT_TERRITORY.centerMinRow) return "upper";
    if (r > CAT_TERRITORY.centerMaxRow) return "lower";
    return "center";
  }

  function catTerritoryDistance(index, r) {
    const home = catTerritoryHome(index);
    if (home === "upper") {
      return Math.max(0, r - (CAT_TERRITORY.centerMinRow - 1));
    }
    return Math.max(0, (CAT_TERRITORY.centerMaxRow + 1) - r);
  }

  function catTerritoryRegionWeight(index, r) {
    const home = catTerritoryHome(index);
    const band = catTerritoryBand(r);
    let weight = band === home
      ? CAT_TERRITORY.homeWeight
      : band === "center"
        ? CAT_TERRITORY.centerWeight
        : CAT_TERRITORY.awayWeight;

    // The upper-home cat should patrol the upper alley without camping on the
    // restaurant doorstep. Strong curry scent can still pull it there because
    // this penalty is blended away below when the scent field is strong.
    if (home === "upper" && r <= CAT_TERRITORY.shopAvoidRowsMax) {
      weight *= CAT_TERRITORY.shopAvoidWeight;
    }
    return weight;
  }

  function catTerritoryMoveWeight(index, cat, baseR, nextR, scentField) {
    const overrideAt = Math.max(0.001, CAT_TERRITORY.scentOverrideThreshold);
    const lure = clamp(scentField / overrideAt, 0, 1);

    // Normal roaming: own zone 1.0, center 0.7, other zone 0.35 by default.
    // Curry smell progressively erases the border instead of making it a wall.
    const region = catTerritoryRegionWeight(index, nextR);
    let weight = region + (1 - region) * lure;

    const currentDistance = catTerritoryDistance(index, baseR);
    const nextDistance = catTerritoryDistance(index, nextR);
    if (currentDistance > 0) {
      let direction = CAT_TERRITORY.outsideSameWeight;
      if (nextDistance < currentDistance) direction = CAT_TERRITORY.outsideTowardWeight;
      else if (nextDistance > currentDistance) direction = CAT_TERRITORY.outsideAwayWeight;
      // Scent also softens the ordinary homeward pull.
      weight *= direction + (1 - direction) * lure;
    }

    // After MASALA RUSH, make the next few real grid moves actively peel the
    // cats back toward their own halves. This is movement, never teleporting.
    if ((cat.territoryReturnSteps || 0) > 0 && currentDistance > 0) {
      if (nextDistance < currentDistance) weight *= CAT_TERRITORY.rushReturnTowardWeight;
      else if (nextDistance > currentDistance) weight *= CAT_TERRITORY.rushReturnAwayWeight;
      else weight *= CAT_TERRITORY.rushReturnSameWeight;
    }

    return Math.max(0.04, weight);
  }

  function catScentField(c, r, maxDepth = CAT_SCENT_LOOKAHEAD_RADIUS) {
    const queue = [{ c, r, depth: 0 }];
    const visited = new Set([cellKey(c, r)]);
    let strongest = model.scent.get(cellKey(c, r)) || 0;

    for (let head = 0; head < queue.length; head += 1) {
      const node = queue[head];
      const scent = model.scent.get(cellKey(node.c, node.r)) || 0;
      const weighted = scent * Math.pow(CAT_SCENT_LOOKAHEAD_FALLOFF, node.depth);
      if (weighted > strongest) strongest = weighted;

      if (node.depth >= maxDepth) continue;

      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = node.c + dx;
        const nr = node.r + dy;
        const key = cellKey(nc, nr);
        if (visited.has(key) || !inGrid(nc, nr)) continue;
        if (isFixedBlock(nc, nr)) continue;
        if (nc === DOOR_COL && nr === DOOR_ROW) continue;
        if (garbageAt(nc, nr)) continue;

        visited.add(key);
        queue.push({ c: nc, r: nr, depth: node.depth + 1 });
      }
    }

    return strongest;
  }

  function catNearbyScentPull(cat) {
    const c = clamp(Math.round(cat.c), 1, COLS);
    const r = clamp(Math.round(cat.r), 1, ROWS);
    return catScentField(c, r);
  }

  function chooseCatDestination(index, cat) {
    const baseC = clamp(Math.round(cat.c), 1, COLS);
    const baseR = clamp(Math.round(cat.r), 1, ROWS);
    const dirs = shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    const options = [];
    let total = 0;

    for (const [dx, dy] of dirs) {
      const c = baseC + dx;
      const r = baseR + dy;
      if (!inGrid(c, r)) continue;
      if (isFixedBlock(c, r)) continue;
      if (c === DOOR_COL && r === DOOR_ROW) continue;
      if (garbageAt(c, r)) continue;
      if (playerNearCell(c, r, 0.70)) continue;
      if (c === 5 && r === 1) continue;
      if (activeTargetAt(c, r)) continue;
      if (cellOccupiedByOtherCat(index, c, r)) continue;
      if (!routeSafety({ movingCatIndex: index, catC: c, catR: r })) continue;

      const scent = model.scent.get(cellKey(c, r)) || 0;
      const scentField = catScentField(c, r);
      const scentWeight = catScentWeight();

      // Immediate scent still matters most, but a reachable smell a few cells
      // ahead gives this first step a strong pull. Because the lookahead is
      // path-based, cats follow scent around corners instead of through walls.
      let weight = 1
        + scent * scentWeight
        + scentField * scentWeight * 1.35;

      // A soft home-area bias keeps the two cats spread across the alley.
      // Strong scent can override it, so the existing lure mechanic still wins
      // when the player deliberately lays a hot curry trail across the border.
      weight *= catTerritoryMoveWeight(index, cat, baseR, r, Math.max(scent, scentField));

      // These are preferences, not walls. The previous hard "near garbage" /
      // "near other cat" bans could leave a cat with zero legal moves and make
      // it look permanently frozen.
      if (cellNearGarbage(c, r)) weight *= 0.42;
      if (cellNearOtherCat(index, c, r)) weight *= 0.50;
      weight = Math.max(0.08, weight);

      total += weight;
      options.push({ c, r, weight });
    }

    if (!options.length) return null;
    let pick = Math.random() * total;
    for (const option of options) {
      pick -= option.weight;
      if (pick <= 0) return option;
    }
    return options[options.length - 1];
  }

  function catCanCommit(index, cat) {
    if (cat.intentC == null || cat.intentR == null) return false;
    const c = cat.intentC;
    const r = cat.intentR;

    if (isFixedBlock(c, r)) return false;
    if (c === DOOR_COL && r === DOOR_ROW) return false;
    if (garbageAt(c, r)) return false;
    if (playerNearCell(c, r, 0.70)) return false;
    if (activeTargetAt(c, r)) return false;
    if (cellOccupiedByOtherCat(index, c, r)) return false;
    return routeSafety({ movingCatIndex: index, catC: c, catR: r });
  }

  function updateCat(index, cat, dt) {
    if (!cat.active) return;
    cat.blink *= 0.80;

    if (cat.entryDelay > 0) {
      cat.entryDelay = Math.max(0, cat.entryDelay - dt);
      return;
    }

    if (cat.entryTimer > 0) {
      cat.entryTimer = Math.max(0, cat.entryTimer - dt);
      const duration = Math.max(0.001, cat.entryDuration);
      const t = clamp(1 - cat.entryTimer / duration, 0, 1);
      const eased = t * t * (3 - 2 * t);
      cat.c = cat.entryFromC + (cat.entryToC - cat.entryFromC) * eased;
      cat.r = cat.entryFromR + (cat.entryToR - cat.entryFromR) * eased;
      if (Math.abs(cat.entryToC - cat.c) > 0.02) {
        cat.visualMirror = cat.entryToC > cat.c;
      }
      if (cat.entryTimer <= 0) finishCatEntry(cat);
      return;
    }

    if (cat.tell > 0) {
      cat.tell = Math.max(0, cat.tell - dt);
      if (cat.tell <= 0) {
        if (catCanCommit(index, cat)) {
          cat.c = cat.intentC;
          cat.r = cat.intentR;
          if (cat.territoryReturnSteps > 0) cat.territoryReturnSteps -= 1;
        }
        cat.intentC = null;
        cat.intentR = null;
        cat.timer = randomCatTime();
      }
      return;
    }

    cat.timer -= dt;
    if (cat.timer > 0) return;

    const nearbyScent = catNearbyScentPull(cat);
    const stayChance = nearbyScent >= CAT_SCENT_LURE_THRESHOLD
      ? CAT_SCENT_LURED_STAY_CHANCE
      : CAT_STAY_CHANCE;

    if (Math.random() < stayChance) {
      cat.blink = 1;
      cat.timer = randomCatTime();
      return;
    }

    const next = chooseCatDestination(index, cat);
    if (!next) {
      cat.timer = 0.55;
      return;
    }

    cat.intentC = next.c;
    cat.intentR = next.r;
    cat.tell = CAT_TELL_TIME;
    cat.blink = 1;
  }

  function tryActivateSecondCat() {
    const cat = model.cats[1];
    if (cat.active || model.deliveries < BALANCE.cat.secondCatUnlockDeliveries) return;

    const allCandidates = [
      [1, 3], [9, 3], [1, 5], [9, 5],
      [1, 7], [9, 7], [1, 9], [9, 9],
    ];
    const home = catTerritoryHome(1);
    const preferredCandidates = shuffle(
      allCandidates.filter(([, r]) => catTerritoryBand(r) === home)
    );
    const centerCandidates = shuffle(
      allCandidates.filter(([, r]) => catTerritoryBand(r) === "center")
    );
    const fallbackCandidates = shuffle(
      allCandidates.filter(([, r]) => {
        const band = catTerritoryBand(r);
        return band !== home && band !== "center";
      })
    );
    const candidates = [...preferredCandidates, ...centerCandidates, ...fallbackCandidates];

    for (const [c, r] of candidates) {
      if (isFixedBlock(c, r) || garbageAt(c, r) || activeTargetAt(c, r)) continue;
      if (playerNearCell(c, r, 1.0)) continue;
      if (cellNearGarbage(c, r)) continue;
      if (cellNearOtherCat(1, c, r)) continue;
      if (!routeSafety({ movingCatIndex: 1, catC: c, catR: r })) continue;
      beginCatEntry(cat, c, r);
      return;
    }
  }

  // ----------------------------------------------------------
  // GARBAGE
  // ----------------------------------------------------------

  function garbageSpotNearCat(c, r) {
    return model.cats.some((cat) => {
      if (!cat.active) return false;
      if (distanceManhattan(c, r, cat.c, cat.r) <= 1) return true;
      if (cat.tell > 0 && cat.intentC != null && distanceManhattan(c, r, cat.intentC, cat.intentR) <= 1) return true;
      return false;
    });
  }

  function recoverRouteIntegrity() {
    if (masalaRushActive() || routeSafety()) return;

    // First cancel pending cat commits; an intent can temporarily complete a
    // bottleneck even before the cat visually moves.
    for (const cat of model.cats) {
      if (!cat.active) continue;
      cat.intentC = null;
      cat.intentR = null;
      cat.tell = 0;
    }
    if (routeSafety()) return;

    // If rubbish is the remaining cause, remove only the newest bag(s) until
    // the active deliveries and shop are connected again. This is an emergency
    // net, not normal gameplay; valid spawns are already filtered above.
    while (model.garbage.length > 0 && !routeSafety({ ignoreCats: true })) {
      model.garbage.pop();
    }
    if (routeSafety()) return;

    // Cats can still jointly seal a one-cell corridor. Move the offending cat
    // to the nearest route-safe open cell instead of letting the run soft-lock.
    for (let i = 0; i < model.cats.length && !routeSafety(); i += 1) {
      const cat = model.cats[i];
      if (!cat.active) continue;
      const originC = clamp(Math.round(cat.c), 1, COLS);
      const originR = clamp(Math.round(cat.r), 1, ROWS);
      const candidates = [];
      for (let r = 1; r <= ROWS; r += 1) {
        for (let c = 1; c <= COLS; c += 1) {
          if (isFixedBlock(c, r) || garbageAt(c, r)) continue;
          if (c === DOOR_COL && r === DOOR_ROW) continue;
          if (c === 5 && r === 1 || activeTargetAt(c, r)) continue;
          if (playerNearCell(c, r, 0.85)) continue;
          if (cellOccupiedByOtherCat(i, c, r)) continue;
          candidates.push({ c, r, d: distanceManhattan(c, r, originC, originR) });
        }
      }
      candidates.sort((a, b) => a.d - b.d);
      for (const candidate of candidates) {
        if (!routeSafety({ movingCatIndex: i, catC: candidate.c, catR: candidate.r })) continue;
        cat.c = candidate.c;
        cat.r = candidate.r;
        cat.intentC = null;
        cat.intentR = null;
        cat.tell = 0;
        cat.timer = randomCatTime();
        break;
      }
    }
  }

  function trySpawnGarbage() {
    for (const [c, r] of shuffle(dynamicGarbageCandidates)) {
      if (staticBlocked(c, r)) continue;
      if (activeTargetAt(c, r)) continue;
      if (pepperTooClose(c, r, 0.55)) continue;
      if (playerNearCell(c, r, 0.75)) continue;
      if (garbageSpotNearCat(c, r)) continue;
      const extraGarbage = { c, r };
      if (!routeSafety({ extraGarbage })) continue;
      if (model.deliveryOrderMode && model.deliveryOrderSequenceEnforced) {
        const remainingOrder = orderedUndeliveredTargets();
        if (!deliveryOrderSequenceIsSafe(remainingOrder, { extraGarbage })) continue;
      }
      model.garbage.push({
        c,
        r,
        age: 0,
        variant: Math.floor(Math.random() * GARBAGE_SPRITE_FILES.length),
      });
      return true;
    }
    return false;
  }

  function updateGarbage(dt) {
    const cap = garbageCap();
    if (cap > model.garbageCapSeen) {
      model.garbageCapSeen = cap;
      model.garbageTimer = Math.min(model.garbageTimer, 0.8);
    }

    for (const bag of model.garbage) bag.age += dt;

    if (model.garbage.length >= cap) return;
    model.garbageTimer -= dt;
    if (model.garbageTimer <= 0) {
      model.garbageTimer = trySpawnGarbage() ? garbageDelay() : BALANCE.garbage.retryDelaySeconds;
    }
  }

  // ----------------------------------------------------------
  // BIKE
  // ----------------------------------------------------------

  function hitByBike() {
    if (model.bikeHitCooldown > 0) return;

    model.bikeHits += 1;
    model.bikeHitCooldown = 0.80;
    model.runSpeed = 0;
    model.bikeStunTimer = BIKE_STUN_TIME;
    playGameSound("bike_hit");
    model.bikeJumpTimer = BIKE_JUMP_TIME;
    model.bikeImpactTimer = 0.68;

    const hadCombo = model.combo >= 2;
    model.combo = 0;
    if (hadCombo) model.comboShatterTimer = 0.72;

    if (model.carrying) {
      const before = model.curryHeat;
      setCurryHeat(model.curryHeat - bikeHotPenalty());
      model.bikeHeatFxLoss = Math.round(before - model.curryHeat);
      model.bikeHeatFxTimer = 0.75;
    }
  }

  function bikeVisibleOnScreen() {
    if (model.bikePhase !== "ride") return false;
    // This is the single visibility predicate used by both drawing and the
    // warning bell. If it says visible, at least part of the rendered bicycle
    // is allowed into the play viewport; otherwise neither draw nor SE does.
    if (model.bikeGX < 0.3 || model.bikeGX > COLS + 0.7) return false;
    const p = worldToScreen(gridX(model.bikeGX), gridY(BIKE_ROW));
    const marginX = 26;
    const marginY = 24;
    return p.x >= -marginX && p.x <= W + marginX
      && p.y >= CONTROL_H - marginY && p.y <= BOARD_TOP + marginY;
  }

  function maybePlayBikeWarningSound() {
    if (model.bikeWarningSoundPlayed) return;
    if (model.bikeWarningLingerTimer <= 0) return;
    if (!bikeVisibleOnScreen()) return;
    model.bikeWarningSoundPlayed = true;
    if (!model.attractMode) playGameSound("bike_warning");
  }

  function updateBike(dt) {
    model.bikeHitCooldown = Math.max(0, model.bikeHitCooldown - dt);

    if (masalaRushActive()) {
      // RUSH suppresses the warning cue entirely. Do not let a partially
      // overlapping warning survive and ring after the rush ends.
      model.bikeWarningLingerTimer = 0;
      model.bikeWarningSoundPlayed = false;
      if (model.bikePhase === "warning") {
        // No new bicycle commits to the crossing while the rush is active.
        return;
      }

      // A bicycle already on screen simply clears the lane and cannot hit.
      model.bikeGX += bikeSpeed() * 0.78 * dt;
      if (model.bikeGX > COLS + 1) {
        model.bikeGX = 0;
        model.bikePhase = "warning";
        model.bikeWarningTimer = BIKE_WARNING_TIME;
        model.bikeWarningLingerTimer = 0;
        model.bikeWarningSoundPlayed = false;
      }
      return;
    }

    if (model.bikePhase === "warning") {
      model.bikeWarningTimer = Math.max(0, model.bikeWarningTimer - dt);
      if (model.bikeWarningTimer <= 0) {
        model.bikePhase = "ride";
        model.bikeGX = 0;
        model.bikeWarningLingerTimer = BIKE_WARNING_LINGER_TIME;
        model.bikeWarningSoundPlayed = false;
      }
      return;
    }

    model.bikeWarningLingerTimer = Math.max(0, model.bikeWarningLingerTimer - dt);
    const previousGX = model.bikeGX;
    model.bikeGX += bikeSpeed() * dt;
    maybePlayBikeWarningSound();

    // Swept collision: browser frame time can fluctuate more than Codea.
    // Check the whole bicycle segment travelled this frame so a brief frame
    // drop cannot let a fast late-game bike tunnel through the player.
    const dy = Math.abs(BIKE_ROW - model.playerGY);
    const segmentMin = Math.min(previousGX, model.bikeGX) - 0.43;
    const segmentMax = Math.max(previousGX, model.bikeGX) + 0.43;
    const bikeWasOnBoard = model.bikeGX >= 0.5 && previousGX <= COLS + 0.5;

    if (bikeWasOnBoard && dy < 0.34
        && model.playerGX >= segmentMin && model.playerGX <= segmentMax) {
      hitByBike();
    }

    if (model.bikeGX > COLS + 1) {
      model.bikeGX = 0;
      model.bikePhase = "warning";
      model.bikeWarningTimer = BIKE_WARNING_TIME;
      model.bikeWarningLingerTimer = 0;
      model.bikeWarningSoundPlayed = false;
      return;
    }
  }

  // ----------------------------------------------------------
  // DOOR / SMOKE
  // ----------------------------------------------------------

  function updateDoor(dt) {
    model.doorTimer += dt;
    while (model.doorTimer >= DOOR_CYCLE) model.doorTimer -= DOOR_CYCLE;

    const [openStart, openEnd] = doorWindow();
    let wantsOpen = masalaRushActive()
      || (model.doorTimer >= openStart && model.doorTimer <= openEnd);

    if (!wantsOpen && playerNearCell(DOOR_COL, DOOR_ROW, 0.62)) wantsOpen = true;

    const before = model.doorOpen;
    model.doorOpen = wantsOpen;
    if (model.doorOpen && !before) model.doorOpenFx = 0.55;

    if (model.doorOpen && Math.random() < dt * 3.0) {
      const p = cellCenter(DOOR_COL, DOOR_ROW);
      model.smoke.push({
        x: p.x + CELL * 0.28,
        y: p.y + CELL * 0.18,
        vx: 2 + Math.random() * 4,
        vy: 6 + Math.random() * 6,
        age: 0,
        life: 0.8 + Math.random() * 0.5,
      });
    }
  }

  function updateSmoke(dt) {
    for (const p of model.smoke) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    model.smoke = model.smoke.filter((p) => p.age < p.life);
  }

  // ----------------------------------------------------------
  // CAMERA
  // ----------------------------------------------------------

  function cameraViewCenter() {
    return { x: W * 0.5, y: BOARD_Y + BOARD_H * 0.5 };
  }

  function clampCamera(x, y, zoom) {
    const halfW = W / (2 * zoom);
    const halfH = BOARD_H / (2 * zoom);

    // Clamp against a slightly larger visual world than the collision grid.
    // The extra space is scenery only; movement rules remain exactly the same.
    // At an edge the player therefore moves inward on screen just enough to
    // leave room for a pin / +score above or beside the destination.
    const visualLeft = BOARD_X - CAMERA_WORLD_BLEED_X;
    const visualRight = BOARD_X + BOARD_W + CAMERA_WORLD_BLEED_X;
    const visualBottom = BOARD_Y - CAMERA_WORLD_BLEED_BOTTOM;
    const visualTop = BOARD_Y + BOARD_H + CAMERA_WORLD_BLEED_TOP;
    const minX = visualLeft + halfW;
    const maxX = visualRight - halfW;
    const minY = visualBottom + halfH;
    const maxY = visualTop - halfH;

    return {
      x: minX <= maxX ? clamp(x, minX, maxX) : BOARD_X + BOARD_W * 0.5,
      y: minY <= maxY ? clamp(y, minY, maxY) : BOARD_Y + BOARD_H * 0.5,
    };
  }

  function updateCamera(dt) {
    const controlActive = gameplayControlActive();
    const targetZoom = controlActive ? CAMERA_ZOOM_RUN : CAMERA_ZOOM_STOP;
    const zoomSpeed = controlActive ? CAMERA_ZOOM_IN_SPEED : CAMERA_ZOOM_OUT_SPEED;
    model.cameraZoom = approachExp(model.cameraZoom, targetZoom, zoomSpeed, dt);

    const target = clampCamera(gridX(model.playerGX), gridY(model.playerGY), model.cameraZoom);
    const dead = CELL * CAMERA_DEADZONE;

    if (Math.abs(target.x - model.cameraX) > dead) {
      model.cameraX = approachExp(model.cameraX, target.x, CAMERA_FOLLOW_SPEED, dt);
    }
    if (Math.abs(target.y - model.cameraY) > dead) {
      model.cameraY = approachExp(model.cameraY, target.y, CAMERA_FOLLOW_SPEED, dt);
    }
  }

  function beginWorldCamera(viewOverride = null) {
    const view = viewOverride || cameraViewCenter();
    pushMatrix();
    translate(view.x, view.y);
    scale(model.cameraZoom);
    translate(-model.cameraX, -model.cameraY);
  }

  function endWorldCamera() {
    popMatrix();
  }

  function worldToScreen(x, y) {
    const view = cameraViewCenter();
    return {
      x: view.x + (x - model.cameraX) * model.cameraZoom,
      y: view.y + (y - model.cameraY) * model.cameraZoom,
    };
  }

  // ----------------------------------------------------------
  // UPDATE
  // ----------------------------------------------------------

  function updateFx(dt) {
    if (model.deliveryFx) {
      model.deliveryFx.timer -= dt;
      if (model.deliveryFx.timer <= 0) model.deliveryFx = null;
    }

    if (model.deliveryCounterFx) {
      model.deliveryCounterFx.age += dt;
      if (model.deliveryCounterFx.age >= model.deliveryCounterFx.duration) {
        model.deliveryCounterFx = null;
      }
    }

    if (model.salesCounterFx) {
      model.salesCounterFx.age += dt;
      if (model.salesCounterFx.age >= model.salesCounterFx.duration) {
        model.salesCounterFx = null;
      }
    }

    if (model.pepperFrameFxTimer > 0) {
      model.pepperFrameFxTimer = Math.max(0, model.pepperFrameFxTimer - dt);
    }
    if (model.pepperPickupFrameFxTimer > 0) {
      model.pepperPickupFrameFxTimer = Math.max(0, model.pepperPickupFrameFxTimer - dt);
    }

    for (const grain of model.pepper) {
      grain.spawnAge = (grain.spawnAge ?? PEPPER_SPAWN_SETTLE_DURATION) + dt;
    }
    for (const fx of model.pepperPickupFx) fx.age += dt;
    model.pepperPickupFx = model.pepperPickupFx.filter((fx) => fx.age < fx.duration);

    for (const target of model.activeTargets) {
      if (target.delivered) continue;

      target.orderAge = (target.orderAge ?? 0) + dt;

      // Once the order card has slid into the phone and had a tiny beat to
      // register, launch its arrow toward the actual destination.
      const launchAt = ORDER_CARD_IN_DURATION + ORDER_CARD_HOLD;
      if (target.flightAge == null && target.orderAge >= launchAt) {
        target.flightAge = 0;
      }

      if (target.flightAge != null && !target.markerReady) {
        target.flightAge += dt;
        if (target.flightAge >= ORDER_ARROW_FLIGHT_DURATION) {
          target.markerReady = true;
          target.markerPopAge = 0;
        }
      }

      if (target.markerReady && target.markerPopAge < ORDER_MARKER_POP_DURATION) {
        target.markerPopAge += dt;
      }
    }

    for (const fx of model.targetExitFx) fx.age += dt;
    model.targetExitFx = model.targetExitFx.filter((fx) => fx.age < fx.duration);

    for (const fx of model.orderExitFx) fx.age += dt;
    model.orderExitFx = model.orderExitFx.filter((fx) => fx.age < fx.duration);

    if (model.returnGuide) model.returnGuide.age += dt;
    model.batchCompleteFxTimer = Math.max(0, model.batchCompleteFxTimer - dt);

    const activeTargets = packedActiveTargets();
    if (model.orderExitFx.length === 0) {
      activeTargets.forEach((target, index) => {
        const desired = index + 1;
        const current = target.displaySlot ?? target.orderSlot ?? desired;
        const next = approachExp(current, desired, ORDER_SLOT_PACK_SPEED, dt);
        target.displaySlot = Math.abs(next - desired) < 0.01 ? desired : next;
      });
    }

    model.heatBarHoldTimer = Math.max(0, model.heatBarHoldTimer - dt);
    model.doorOpenFx = Math.max(0, model.doorOpenFx - dt);
    model.nightGaugeFxTimer = Math.max(0, model.nightGaugeFxTimer - dt);
    model.reheatFxTimer = Math.max(0, model.reheatFxTimer - dt);
    model.bikeJumpTimer = Math.max(0, model.bikeJumpTimer - dt);
    model.bikeImpactTimer = Math.max(0, model.bikeImpactTimer - dt);
    model.bikeHeatFxTimer = Math.max(0, model.bikeHeatFxTimer - dt);
    model.comboShatterTimer = Math.max(0, model.comboShatterTimer - dt);
    model.deliveryOrderWrongFxTimer = Math.max(0, model.deliveryOrderWrongFxTimer - dt);
    model.deliveryOrderHintTimer = Math.max(0, model.deliveryOrderHintTimer - dt);
    model.deliveryOrderHeatFxTimer = Math.max(0, model.deliveryOrderHeatFxTimer - dt);

    for (const p of model.aroma) {
      p.age += dt;
      if (p.age < 0) continue;
      const t = clamp(p.age / p.life, 0, 1);
      // Rise briskly at first, then loosen into a tiny irregular drift as the
      // wisp expands. This is closer to warm aroma than a floating bubble.
      p.x += (p.vx + p.drift * t) * dt;
      p.y += p.vy * dt;
      p.vx *= Math.max(0, 1 - dt * 2.4);
      p.vy *= Math.max(0, 1 - dt * 0.95);
    }
    model.aroma = model.aroma.filter((p) => p.age < p.life);
  }

  const PLAYTEST_SLOW_FRAME_SECONDS = 1 / 45;

  function samplePlaytestPerformance(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;

    const fps = 1 / dt;
    const bin = Math.max(1, Math.min(120, Math.round(fps)));
    model.performanceFrameCount += 1;
    model.performanceFrameSeconds += dt;
    model.performanceFpsHistogram[bin] += 1;
    if (dt > PLAYTEST_SLOW_FRAME_SECONDS) {
      model.performanceSlowFrames += 1;
    }
  }

  function playtestPerformanceSummary() {
    const frames = Math.max(0, model.performanceFrameCount || 0);
    const seconds = Math.max(0, model.performanceFrameSeconds || 0);
    const averageFps = seconds > 0 ? frames / seconds : 0;

    let lowFps10 = 0;
    if (frames > 0) {
      const target = Math.max(1, Math.ceil(frames * 0.10));
      let seen = 0;
      for (let fps = 1; fps < model.performanceFpsHistogram.length; fps += 1) {
        seen += model.performanceFpsHistogram[fps] || 0;
        if (seen >= target) {
          lowFps10 = fps;
          break;
        }
      }
    }

    return {
      averageFps: Math.round(averageFps * 10) / 10,
      lowFps10,
      frameDropRate: frames > 0 ? model.performanceSlowFrames / frames : 0,
    };
  }

  function shiftClockCanAdvance() {
    if (model.attractMode || model.nightOver) return false;
    if (model.deliveryOrderIntro && model.deliveryOrderIntro.active) return false;
    // Headless / background distribution audits still need elapsed play time
    // to advance for atmosphere and telemetry. Normal gameplay keeps the
    // visibility pause behavior.
    if (!distributionTestActive && typeof document !== "undefined" && document.hidden) return false;
    return true;
  }

  function updateShiftClock(dt) {
    if (!shiftClockCanAdvance()) return;

    samplePlaytestPerformance(dt);
    model.shiftElapsed += dt;
    model.playtestElapsed += dt;

    // Endless service: elapsed time now exists only for atmosphere and local
    // telemetry. The neighbourhood reaches its deepest-night look after the
    // fade duration, but the shop keeps accepting batches until the night gauge
    // is exhausted.
  }


  function updateDistributionTimers(dt) {
    for (const grain of model.pepper) {
      grain.spawnAge = (grain.spawnAge ?? PEPPER_SPAWN_SETTLE_DURATION) + dt;
    }
    for (const target of model.activeTargets) {
      if (target.delivered) continue;
      target.orderAge = (target.orderAge ?? 0) + dt;
      const launchAt = ORDER_CARD_IN_DURATION + ORDER_CARD_HOLD;
      if (target.flightAge == null && target.orderAge >= launchAt) target.flightAge = 0;
      if (target.flightAge != null && !target.markerReady) {
        target.flightAge += dt;
        if (target.flightAge >= ORDER_ARROW_FLIGHT_DURATION) {
          target.markerReady = true;
          target.markerPopAge = 0;
        }
      }
    }
  }

  function updateGameForDistribution(dt) {
    model.time += dt;

    if (model.deliveryOrderIntro && model.deliveryOrderIntro.active) {
      model.deliveryOrderIntro.age += dt;
      return;
    }

    updateShiftClock(dt);
    updateMasalaRush(dt);
    updateDoor(dt);
    updatePickupLeadin(dt);

    const previousGX = model.playerGX;
    const previousGY = model.playerGY;
    updateMovement(dt);
    updateBackdoorUsage(previousGX, previousGY);
    checkPepperPickup();

    recordPlayerTrail();
    if (masalaRushActive()) updateRushPartyCats(dt);
    updateHeatAndScent(dt);
    checkShopReheat();
    updateBike(dt);

    tryActivateSecondCat();
    if (!masalaRushActive()) model.cats.forEach((cat, index) => updateCat(index, cat, dt));
    updateGarbage(dt);
    recoverRouteIntegrity();
    checkDelivery();
    updateDistributionTimers(dt);
  }

  function updateGame(dt) {
    model.time += dt;

    if (model.deliveryOrderIntro && model.deliveryOrderIntro.active) {
      model.deliveryOrderIntro.age += dt;
      updateAmbientWindows(dt);
      updateBirds(dt);
      updateSmoke(dt);
      return;
    }

    updateShiftClock(dt);

    updateMasalaRush(dt);
    updateAmbientWindows(dt);
    updateBirds(dt);
    updateDoor(dt);
    updatePickupLeadin(dt);

    const previousGX = model.playerGX;
    const previousGY = model.playerGY;
    updateMovement(dt);
    updateBackdoorUsage(previousGX, previousGY);
    checkPepperPickup();

    recordPlayerTrail();
    if (masalaRushActive()) updateRushPartyCats(dt);
    updateHeatAndScent(dt);
    checkShopReheat();
    updateBike(dt);

    tryActivateSecondCat();
    if (!masalaRushActive()) {
      model.cats.forEach((cat, index) => updateCat(index, cat, dt));
    }
    updateGarbage(dt);
    recoverRouteIntegrity();

    checkDelivery();
    updateSmoke(dt);
    updateCamera(dt);
    updateFx(dt);
  }

  // ----------------------------------------------------------
  // MAKANAI GENERATOR
  // ----------------------------------------------------------
  // The result is not a style lookup table. Delivery progress opens a wider
  // recipe pool, while play style only nudges the ordinary weights. The longer
  // the player survives, the less predictable the base curry becomes.

  function seededNightUnit(seed, salt) {
    let x = ((seed >>> 0) ^ hashToken(salt)) >>> 0;
    x = (x + 0x6D2B79F5) >>> 0;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }

  function makanaiPepperSpent(result) {
    if (Number.isFinite(result && result.pepperSpent)) {
      return Math.max(0, Math.floor(result.pepperSpent));
    }
    // Compatibility for older result payloads: every MASALA RUSH consumes one
    // full PEPPER ignition charge. This is a cooking-history value, not a score.
    return Math.max(0, Math.floor(result && result.masalaRushCount || 0)) * PEPPER_RUSH_COST;
  }

  function makanaiPepperStory(result, seed) {
    const spent = makanaiPepperSpent(result);
    const left = Math.max(0, Math.floor(result && result.pepperHeld || 0));
    const deliveries = Math.max(0, Math.floor(result && result.deliveries || 0));
    return {
      spent,
      left,
      // Endless runs can spend a lot of PEPPER, but the bowl must still read as
      // curry. Compress cooking history into only three visual states: none,
      // a few roasted flecks after two RUSHes, and the current maximum after
      // roughly five RUSHes.
      roastedLevel: spent >= PEPPER_RUSH_COST * 5
        ? 2
        : (spent >= PEPPER_RUSH_COST * 2 ? 1 : 0),
      // Fresh garnish is deliberately rarer than before. It appears only on a
      // long run with a nearly full leftover pouch, and is still only a small
      // visual accent rather than another score readout.
      freshStyle: deliveries >= 120
        && left >= Math.max(7, Math.ceil(PEPPER_RUSH_COST * 0.75))
        && seededNightUnit(seed, "pepper:fresh-serve") < 0.15
        ? (seededNightUnit(seed, "pepper:fresh-style") < 0.5 ? "whole" : "slices")
        : null,
    };
  }

  function makanaiMetrics(result) {
    const deliveries = Math.max(1, result.deliveries || 0);
    return {
      D: result.deliveries || 0,
      H: (result.hotDeliveries || 0) / deliveries,
      C: (result.coldDeliveries || 0) / deliveries,
      R: result.masalaRushCount || 0,
      B: result.bikeHits || 0,
      U: result.backdoorUses || 0,
      RH: result.reheatCount || 0,
      PU: makanaiPepperSpent(result),
      PL: Math.max(0, Math.floor(result.pepperHeld || 0)),
      NEW: !!result.newBest,
      T: Math.max(0, Number(result.finishElapsedSeconds) || 0),
    };
  }

  const MAKANAI_RECIPES = [
    {
      id: "dal",
      name: { jp: "ダルカレー", en: "DAL CURRY" },
      primaryFeature: "cold",
      unlockAt: 0,
      weight: (m) =>
        1.00
        + (m.C >= 0.25 ? 0.15 : 0)
        + (m.C >= 0.45 ? 0.15 : 0),
    },
    {
      id: "chana",
      name: { jp: "チャナマサラ", en: "CHANA MASALA" },
      primaryFeature: "deliveries",
      unlockAt: 0,
      weight: (m) => {
        const hitRate = m.D > 0 ? m.B / m.D : 0;
        return 1.00
          + (m.D >= 18 && m.C <= 0.25 ? 0.10 : 0)
          + (m.D >= 18 && hitRate <= 0.08 ? 0.10 : 0)
          + (m.H >= 0.35 && m.H < 0.75 ? 0.10 : 0);
      },
    },
    {
      id: "keema",
      name: { jp: "キーマカレー", en: "KEEMA CURRY" },
      primaryFeature: "bike",
      unlockAt: 0,
      weight: (m) => {
        const hitRate = m.D > 0 ? m.B / m.D : 0;
        return 1.00
          + (m.B >= 3 && hitRate >= 0.08 ? 0.15 : 0)
          + (m.B >= 5 && hitRate >= 0.20 ? 0.15 : 0);
      },
    },
    {
      id: "aloo-gobi",
      name: { jp: "アルゴビ", en: "ALOO GOBI" },
      primaryFeature: "reheat",
      unlockAt: 30,
      weight: (m) => {
        const reheatRate = m.D > 0 ? m.RH / m.D : 0;
        return 1.00
          + (m.RH >= 2 && reheatRate >= 0.04 ? 0.15 : 0)
          + (m.RH >= 5 && reheatRate >= 0.08 ? 0.15 : 0);
      },
    },
    {
      id: "saag",
      name: { jp: "サグカレー", en: "SAAG CURRY" },
      primaryFeature: "backdoor",
      unlockAt: 50,
      weight: (m) => {
        const useRate = m.D > 0 ? m.U / m.D : 0;
        return 1.00
          + (m.U >= 4 && useRate >= 0.06 ? 0.15 : 0)
          + (m.U >= 10 && useRate >= 0.18 ? 0.15 : 0);
      },
    },
    {
      id: "chicken",
      name: { jp: "チキンマサラ", en: "CHICKEN MASALA" },
      primaryFeature: "hot",
      unlockAt: 70,
      weight: (m) =>
        1.00
        + (m.H >= 0.60 ? 0.15 : 0)
        + (m.H >= 0.75 ? 0.15 : 0),
    },
    {
      id: "biryani",
      name: { jp: "ビリヤニ", en: "BIRYANI" },
      primaryFeature: "deliveries",
      unlockAt: 100,
      // Biryani is the final ordinary unlock, not the automatic reward for a
      // skilled style. It starts rare at 100 and slowly approaches an ordinary
      // recipe weight only on very long endless runs.
      weight: (m) => {
        if (m.D < 100) return 0;
        if (m.D < 125) return 0.35;
        if (m.D < 150) return 0.50;
        if (m.D < 200) return 0.70;
        return 1.00;
      },
    },
    {
      id: "special-masala",
      name: { jp: "テンチョウノ トクベツマサラ", en: "BOSS'S SPECIAL MASALA" },
      primaryFeature: "completion",
      unlockAt: Number.POSITIVE_INFINITY,
      // Selected only by the separate long-run hidden event below.
      weight: () => 0,
    },
  ];

  function makanaiTraitScores(m) {
    return [
      {
        id: "deliveries",
        label: { jp: "ヨフケノ", en: "LATE-NIGHT" },
        // Endless mode makes five or six minutes ordinary. Reserve YOFUKE for
        // genuinely long nights so it does not become the default prefix after
        // the normal recipe set opens.
        score: (m.D >= 120 || m.T >= 600)
          ? 2 + (m.D >= 180 ? 1 : 0) + (m.D >= 250 || m.T >= 900 ? 1 : 0)
          : 0,
      },
      {
        id: "hot",
        label: { jp: "アツアツ", en: "PIPING HOT" },
        score:
          (m.H >= 0.55 ? 2 : 0)
          + (m.H >= 0.70 ? 1 : 0)
          + (m.H >= 0.85 ? 1 : 0),
      },
      {
        id: "cold",
        label: { jp: "ヤサシメ", en: "MILD" },
        score:
          (m.C >= 0.30 ? 2 : 0)
          + (m.C >= 0.50 ? 1 : 0),
      },
      {
        id: "bike",
        label: { jp: "ドタバタ", en: "CHAOTIC" },
        score: (() => {
          const hitRate = m.D > 0 ? m.B / m.D : 0;
          if (m.B < 3 || hitRate < 0.08) return 0;
          return 2 + (m.B >= 5 && hitRate >= 0.20 ? 1 : 0)
            + (m.B >= 8 && hitRate >= 0.40 ? 1 : 0);
        })(),
      },
      {
        id: "backdoor",
        label: { jp: "ウラミチノ", en: "BACK-ALLEY" },
        score:
          (m.U >= 5 && m.U / Math.max(1, m.D) >= 0.08 ? 2 : 0)
          + (m.U >= 8 && m.U / Math.max(1, m.D) >= 0.20 ? 1 : 0)
          + (m.U >= 12 && m.U / Math.max(1, m.D) >= 0.40 ? 1 : 0),
      },
      {
        id: "rush",
        label: { jp: "トウガラシイリ", en: "CHILI" },
        score:
          (m.PU >= PEPPER_RUSH_COST ? 2 : 0)
          + (m.PU >= PEPPER_RUSH_COST * 2 ? 1 : 0)
          + (m.PU >= PEPPER_RUSH_COST * 4 ? 1 : 0),
      },
    ];
  }

  function chooseMakanaiPrefix(metrics, recipe, seed) {
    const traits = makanaiTraitScores(metrics)
      // The base recipe no longer owns the night's play style. Prefixes are the
      // dedicated place where HOT, bike, backdoor, RUSH and long-run character
      // can remain visible, even when they happen to match the recipe theme.
      .filter((trait) => trait.score >= 2)
      .map((trait) => ({
        ...trait,
        finalScore: trait.score + seededNightUnit(seed, `prefix:${trait.id}`) * 1.20,
      }))
      .sort((a, b) => b.finalScore - a.finalScore);

    return traits.length ? traits[0] : null;
  }

  function chooseMakanaiExtras(metrics, seed) {
    // Extras are intentionally much stricter than the recipe unlocks. Endless
    // scores may grow forever, but the bowl must remain recognisably curry.
    let eggCount = 0;
    if (
      metrics.D >= 120
      && metrics.R >= 4
      && seededNightUnit(seed, "extra:egg:1") < 0.18
    ) {
      eggCount = 1;
    }
    if (
      eggCount >= 1
      && metrics.D >= 200
      && metrics.R >= 8
      && seededNightUnit(seed, "extra:egg:2") < 0.12
    ) {
      eggCount = 2;
    }
    if (
      eggCount >= 2
      && metrics.D >= 300
      && metrics.R >= 12
      && seededNightUnit(seed, "extra:egg:3") < 0.06
    ) {
      eggCount = 3;
    }

    const largeChance = metrics.D >= 260
      ? 0.16
      : (metrics.D >= 180 ? 0.10 : 0);
    const large = largeChance > 0
      && seededNightUnit(seed, "extra:large") < largeChance;

    return { eggCount, large, largeChance };
  }

  function weightedRecipePick(candidates, seed) {
    if (!candidates.length) return null;
    const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    if (total <= 0) return candidates[0];

    const rollUnit = seededNightUnit(seed, "recipe:weighted-pick");
    let cursor = rollUnit * total;
    for (const candidate of candidates) {
      cursor -= candidate.weight;
      if (cursor <= 0) return { ...candidate, rollUnit };
    }
    return { ...candidates[candidates.length - 1], rollUnit };
  }

  function specialMasalaChance(deliveries) {
    if (deliveries < 150) return 0;
    if (deliveries < 200) return 0.03;
    if (deliveries < 250) return 0.05;
    return 0.08;
  }

  function generateMakanai(result) {
    const metrics = makanaiMetrics(result);
    const seed = Number.isFinite(result.nightSeed)
      ? result.nightSeed >>> 0
      : hashToken(
          `${result.sales}:${result.deliveries}:${result.hotDeliveries}:${result.bikeHits}:${result.backdoorUses}`
        );

    const specialRecipe = MAKANAI_RECIPES.find((recipe) => recipe.id === "special-masala");
    const specialChance = specialMasalaChance(metrics.D);
    const specialEligible = specialChance > 0;
    const specialRoll = seededNightUnit(seed, "recipe:special-masala:event");
    const specialWon = !!(specialRecipe && specialEligible && specialRoll < specialChance);

    const candidates = MAKANAI_RECIPES
      .filter((recipe) => recipe.id !== "special-masala" && metrics.D >= recipe.unlockAt)
      .map((recipe) => ({
        recipe,
        weight: Math.max(0.01, Number(recipe.weight(metrics)) || 0),
      }));

    const ordinarySelected = weightedRecipePick(candidates, seed) || {
      recipe: MAKANAI_RECIPES[0],
      weight: 1,
      rollUnit: 0,
    };
    const selected = specialWon
      ? { recipe: specialRecipe, weight: 0, rollUnit: ordinarySelected.rollUnit || 0 }
      : ordinarySelected;

    const prefix = chooseMakanaiPrefix(metrics, selected.recipe, seed);
    const extras = chooseMakanaiExtras(metrics, seed);
    const pepperStory = makanaiPepperStory(result, seed);

    const parts = [];
    if (prefix) parts.push(localizedText(prefix.label));
    parts.push(localizedText(selected.recipe.name));

    return {
      makanai: parts.join(" "),
      makanaiBase: selected.recipe.id,
      makanaiBaseName: localizedText(selected.recipe.name),
      makanaiPrefix: prefix ? prefix.id : null,
      makanaiPrefixLabel: prefix ? localizedText(prefix.label) : "",
      // Keep the legacy single-topping field for old debug/export consumers,
      // but extras are now independent and never appear in the meal name.
      makanaiTopping: extras.large ? "large" : (extras.eggCount > 0 ? "egg" : null),
      makanaiToppingLabel: "",
      makanaiEggCount: extras.eggCount,
      makanaiLarge: extras.large,
      makanaiLargeChance: extras.largeChance,
      makanaiPepperSpent: pepperStory.spent,
      makanaiPepperLeft: pepperStory.left,
      makanaiPepperRoastedLevel: pepperStory.roastedLevel,
      makanaiPepperFreshStyle: pepperStory.freshStyle,
      makanaiMetrics: metrics,
      makanaiWeights: Object.fromEntries(
        candidates.map((candidate) => [
          candidate.recipe.id,
          Number(candidate.weight.toFixed(3)),
        ])
      ),
      makanaiUnlockedRecipes: candidates.map((candidate) => candidate.recipe.id),
      makanaiRecipeRoll: Number((ordinarySelected.rollUnit || 0).toFixed(6)),
      makanaiSpecialEligible: specialEligible,
      makanaiSpecialChance: specialChance,
      makanaiSpecialRoll: Number(specialRoll.toFixed(6)),
      makanaiBiryaniStage: metrics.D >= 200
        ? 4
        : (metrics.D >= 150 ? 3 : (metrics.D >= 125 ? 2 : (metrics.D >= 100 ? 1 : 0))),
    };
  }

  function localizeMakanaiSelection(result) {
    if (!result) return result;

    const recipe = MAKANAI_RECIPES.find((item) => item.id === result.makanaiBase);
    if (!recipe) {
      Object.assign(result, generateMakanai(result));
      return result;
    }

    const metrics = makanaiMetrics(result);
    const prefix = result.makanaiPrefix
      ? makanaiTraitScores(metrics).find((item) => item.id === result.makanaiPrefix)
      : null;

    // Extras are visual only in the endless design. Older in-memory result
    // payloads still map their single topping field into the new independent
    // fields, but the visible meal name is always prefix + curry base.
    if (!Number.isFinite(result.makanaiEggCount)) {
      result.makanaiEggCount = result.makanaiTopping === "egg" ? 1 : 0;
    }
    if (typeof result.makanaiLarge !== "boolean") {
      result.makanaiLarge = result.makanaiTopping === "large";
    }

    const parts = [];
    if (prefix) parts.push(localizedText(prefix.label));
    parts.push(localizedText(recipe.name));

    result.makanai = parts.join(" ");
    result.makanaiBaseName = localizedText(recipe.name);
    result.makanaiPrefixLabel = prefix ? localizedText(prefix.label) : "";
    result.makanaiToppingLabel = "";
    if (!Number.isFinite(result.makanaiPepperSpent) || result.makanaiPepperFreshStyle === undefined) {
      const seed = Number.isFinite(result.nightSeed)
        ? result.nightSeed >>> 0
        : hashToken(`${result.sales}:${result.deliveries}:${result.hotDeliveries}:${result.bikeHits}:${result.backdoorUses}`);
      const pepperStory = makanaiPepperStory(result, seed);
      result.makanaiPepperSpent = pepperStory.spent;
      result.makanaiPepperLeft = pepperStory.left;
      result.makanaiPepperRoastedLevel = pepperStory.roastedLevel;
      result.makanaiPepperFreshStyle = pepperStory.freshStyle;
    }
    return result;
  }

  function savePersonalNightSales(sales) {
    const previous = SSE.storage.get("nightSales", []);
    const values = Array.isArray(previous) ? previous.filter(Number.isFinite) : [];
    const historyBest = values.length ? Math.max(...values) : null;
    const storedBest = Math.max(0, Number(model.sessionPriorBestSales) || 0);
    const priorBest = historyBest == null ? storedBest : Math.max(historyBest, storedBest);
    const hadPriorRecord = priorBest > 0 || values.length > 0;
    const rank = 1 + values.filter((value) => value > sales).length;
    const allTimeBest = Math.max(priorBest, sales);

    values.push(sales);
    SSE.storage.set("nightSales", values.slice(-1000));
    SSE.storage.set("bestSales", allTimeBest);
    model.bestSales = allTimeBest;

    return {
      rank,
      nights: values.length,
      priorBest: hadPriorRecord ? priorBest : null,
      allTimeBest,
      newBest: hadPriorRecord && sales > priorBest,
      firstRecord: !hadPriorRecord,
    };
  }

  function playtestSnapshot(deliveries = model.deliveries) {
    const total = Math.max(0, deliveries);
    return {
      deliveries: total,
      seconds: Math.round(model.playtestElapsed * 10) / 10,
      nightGauge: model.nightGauge,
      hotDeliveries: model.hotDeliveries,
      hotRatio: total > 0 ? model.hotDeliveries / total : 0,
      masalaRushCount: model.masalaRushCount,
      masalaCharge: model.masalaCharge,
      masalaChargeRequired: masalaRushChargeRequired(deliveries),
      masalaSoftStreakMax: model.masalaSoftStreakMax,
      pepperHeld: model.pepperHeld,
      pepperCollected: model.pepperCollected,
      pepperRushCost: PEPPER_RUSH_COST,
      pepperActive: model.pepper.length,
      bikeHits: model.bikeHits,
      reheatCount: model.reheatCount,
      bestCombo: model.bestCombo,
      bulkOrderCount: model.bulkOrderHistory.length,
      nextBulkOrderAt: model.bulkOrderNextAt,
      deliveryOrderMode: model.deliveryOrderMode,
      deliveryOrderUnlockAt: model.deliveryOrderUnlockAt,
      deliveryOrderDeliveries: model.deliveryOrderDeliveries,
      deliveryOrderMistakes: model.deliveryOrderMistakes,
      deliveryOrderPenaltyTotal: model.deliveryOrderPenaltyTotal,
    };
  }

  function capturePlaytestMilestone() {
    if (model.attractMode) return;
    if (!PLAYTEST_MILESTONES.includes(model.deliveries)) return;
    const key = String(model.deliveries);
    if (model.playtestMilestones[key]) return;
    model.playtestMilestones[key] = playtestSnapshot(model.deliveries);
  }

  function readPlaytestRuns() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PLAYTEST_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function savePlaytestRun(result) {
    if (model.attractMode) return;
    try {
      const runs = readPlaytestRuns();
      runs.push({
        recordedAt: new Date().toISOString(),
        build: typeof window !== "undefined" ? window.ROJIURA_BUILD : null,
        deliveries: result.deliveries,
        sales: result.sales,
        seconds: Math.round(model.playtestElapsed * 10) / 10,
        ...playtestPerformanceSummary(),
        devicePixelRatio: typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1,
        renderDpr: typeof window !== "undefined" && window.CodeaLite ? window.CodeaLite.state.dpr : 1,
        frameRateCap: typeof window !== "undefined" && window.CodeaLite ? window.CodeaLite.maxFrameRate : 60,
        ambientFadeSeconds: AMBIENT_FADE_SECONDS,
        finishElapsedSeconds: Math.round(model.shiftElapsed * 10) / 10,
        hotDeliveries: result.hotDeliveries,
        warmDeliveries: result.warmDeliveries,
        coolDeliveries: result.coolDeliveries,
        coldDeliveries: result.coldDeliveries,
        hotRatio: result.hotRatio,
        averageHeat: result.averageHeat,
        masalaRushCount: result.masalaRushCount,
        masalaSoftStreakMax: model.masalaSoftStreakMax,
        masalaRushTriggers: model.masalaRushTriggers.map((entry) => ({ ...entry })),
        rushRule: "soft-streak-plus-pepper-v1",
        pepperHeld: model.pepperHeld,
        pepperCollected: model.pepperCollected,
        pepperSpent: result.pepperSpent,
        pepperRushCost: PEPPER_RUSH_COST,
        coolingPerSecond: COLD_HEAT_LOSS_PER_SEC,
        bulkOrderCount: model.bulkOrderHistory.length,
        bulkOrderHistory: model.bulkOrderHistory.map((entry) => ({ ...entry })),
        deliveryOrderUnlockAt: model.deliveryOrderUnlockAt,
        deliveryOrderDeliveries: model.deliveryOrderDeliveries,
        deliveryOrderMistakes: model.deliveryOrderMistakes,
        deliveryOrderPenaltyTotal: model.deliveryOrderPenaltyTotal,
        deliveryOrderMistakeRate: model.deliveryOrderDeliveries > 0
          ? model.deliveryOrderMistakes / model.deliveryOrderDeliveries
          : 0,
        bikeHits: result.bikeHits,
        nightGauge: result.nightGauge,
        reheatCount: result.reheatCount,
        bestCombo: result.bestCombo,
        nightSeed: Number.isFinite(result.nightSeed) ? (result.nightSeed >>> 0) : null,
        backdoorUses: result.backdoorUses,
        makanaiBase: result.makanaiBase || null,
        makanaiPrefix: result.makanaiPrefix || null,
        makanaiTopping: result.makanaiTopping || null,
        makanaiEggCount: Number(result.makanaiEggCount) || 0,
        makanaiLarge: !!result.makanaiLarge,
        makanaiLargeChance: Number(result.makanaiLargeChance) || 0,
        makanaiPepperSpent: result.makanaiPepperSpent,
        makanaiPepperLeft: result.makanaiPepperLeft,
        makanaiPepperRoastedLevel: result.makanaiPepperRoastedLevel,
        makanaiPepperFreshStyle: result.makanaiPepperFreshStyle || null,
        makanaiMetrics: result.makanaiMetrics ? { ...result.makanaiMetrics } : null,
        makanaiWeights: result.makanaiWeights ? { ...result.makanaiWeights } : null,
        makanaiUnlockedRecipes: Array.isArray(result.makanaiUnlockedRecipes) ? result.makanaiUnlockedRecipes.slice() : [],
        makanaiRecipeRoll: Number.isFinite(result.makanaiRecipeRoll) ? result.makanaiRecipeRoll : null,
        makanaiSpecialEligible: !!result.makanaiSpecialEligible,
        makanaiSpecialChance: Number(result.makanaiSpecialChance) || 0,
        makanaiSpecialRoll: Number.isFinite(result.makanaiSpecialRoll) ? result.makanaiSpecialRoll : null,
        makanaiBiryaniStage: Number(result.makanaiBiryaniStage) || 0,
        endReason: result.endReason || model.nightEndReason || (result.nightGauge <= 0 ? "night-gauge" : "other"),
        milestones: { ...model.playtestMilestones },
      });
      localStorage.setItem(
        PLAYTEST_STORAGE_KEY,
        JSON.stringify(runs.slice(-PLAYTEST_MAX_RUNS))
      );
    } catch (_) {
      // Playtest logging must never interrupt a shift or result screen.
    }
  }

  if (typeof window !== "undefined") {
    window.ROJIURA_PLAYTEST = {
      getRuns: readPlaytestRuns,
      clear() {
        localStorage.removeItem(PLAYTEST_STORAGE_KEY);
      },
      storageKey: PLAYTEST_STORAGE_KEY,
    };
  }

  function finishNight() {
    if (model.nightOver) return;
    model.nightOver = true;
    playGameSound("shift_end");
    model.touchActive = false;
    model.touchId = null;
    clearKeyboardControlState({ stopSpeed: true });
    model.runSpeed = 0;

    const personal = distributionTestActive
      ? { rank: 1, nights: 1, priorBest: null, allTimeBest: model.sales, newBest: false, firstRecord: false }
      : savePersonalNightSales(model.sales);
    const hotRatio = model.deliveries > 0 ? model.hotDeliveries / model.deliveries : 0;
    const averageHeat = model.deliveries > 0 ? model.heatSum / model.deliveries : 0;

    const endReason = model.nightEndReason || (model.nightGauge <= 0 ? "night-gauge" : "other");
    const pepperSpent = model.masalaRushTriggers.reduce(
      (sum, entry) => sum + Math.max(0, Number(entry.pepperSpent) || 0),
      0
    );

    const result = {
      sales: model.sales,
      deliveries: model.deliveries,
      bestCombo: model.bestCombo,
      masalaRushCount: model.masalaRushCount,
      pepperCollected: model.pepperCollected,
      pepperHeld: model.pepperHeld,
      pepperSpent,
      reheatCount: model.reheatCount,
      backdoorUses: model.backdoorUses,
      nightSeed: model.nightSeed,
      hotDeliveries: model.hotDeliveries,
      warmDeliveries: model.warmDeliveries,
      coolDeliveries: model.coolDeliveries,
      coldDeliveries: model.coldDeliveries,
      bikeHits: model.bikeHits,
      deliveryOrderMistakes: model.deliveryOrderMistakes,
      deliveryOrderPenaltyTotal: model.deliveryOrderPenaltyTotal,
      hotRatio,
      averageHeat,
      nightGauge: model.nightGauge,
      nightClosing: model.nightClosing,
      endReason,
      finishElapsedSeconds: Math.round(model.shiftElapsed * 10) / 10,
      makanaiTier: makanaiTier(model.deliveries),
      rank: personal.rank,
      nights: personal.nights,
      bestSales: personal.allTimeBest,
      newBest: personal.newBest,
      firstRecord: personal.firstRecord,
    };

    Object.assign(result, generateMakanai(result));

    if (distributionTestActive) {
      distributionLastResult = { ...result };
      return;
    }

    savePlaytestRun(result);

    trackGameAnalytics("Masala Night End", {
      endReason: result.endReason,
      newBest: result.newBest,
    });
    SSE.app.replace("makanaiLeadin", result, { duration: "quick" });
  }


  // ----------------------------------------------------------
  // DISTRIBUTION AUDIT — REAL GAME LOOP AUTOPLAY
  // ----------------------------------------------------------
  // Debug-only tooling used by distribution-debug.html. Each simulated night
  // drives the same movement, collision, temperature, order, PEPPER, RUSH,
  // reheat, bike, cat, garbage, clock and result code as the real game. The
  // only bypasses are presentation/persistence side effects.

  const DISTRIBUTION_PROFILES = Object.freeze({
    balanced: {
      label: "BALANCED",
      pepperChance: 0.32,
      reheatThreshold: 58,
      pauseChance: 0.012,
      pauseMin: 0.18,
      pauseMax: 0.55,
      avoidPepper: false,
      randomTarget: false,
      obeyOrder: true,
      doorPenalty: 3.5,
      bikeCaution: true,
    },
    delivery: {
      label: "DELIVERY FIRST",
      pepperChance: 0.05,
      reheatThreshold: 52,
      pauseChance: 0.004,
      pauseMin: 0.10,
      pauseMax: 0.30,
      avoidPepper: false,
      randomTarget: false,
      obeyOrder: true,
      doorPenalty: 5.0,
      bikeCaution: true,
    },
    pepper: {
      label: "PEPPER SEEKER",
      pepperChance: 1.00,
      reheatThreshold: 52,
      pauseChance: 0.008,
      pauseMin: 0.10,
      pauseMax: 0.30,
      avoidPepper: false,
      randomTarget: false,
      obeyOrder: true,
      doorPenalty: 2.0,
      bikeCaution: true,
    },
    avoidPepper: {
      label: "PEPPER AVOIDER",
      pepperChance: 0,
      reheatThreshold: 52,
      pauseChance: 0.010,
      pauseMin: 0.10,
      pauseMax: 0.30,
      avoidPepper: true,
      randomTarget: false,
      obeyOrder: true,
      doorPenalty: 4.0,
      bikeCaution: true,
    },
    hot: {
      label: "HOT CAREFUL",
      pepperChance: 0.22,
      reheatThreshold: 68,
      pauseChance: 0.004,
      pauseMin: 0.10,
      pauseMax: 0.28,
      avoidPepper: false,
      randomTarget: false,
      obeyOrder: true,
      doorPenalty: 2.0,
      bikeCaution: true,
    },
    relaxed: {
      label: "RELAXED",
      pepperChance: 0.24,
      reheatThreshold: 46,
      pauseChance: 0.085,
      pauseMin: 0.35,
      pauseMax: 1.20,
      avoidPepper: false,
      randomTarget: false,
      obeyOrder: true,
      doorPenalty: 2.0,
      bikeCaution: true,
    },
    sloppy: {
      label: "SLOPPY",
      pepperChance: 0.18,
      reheatThreshold: 32,
      pauseChance: 0.075,
      pauseMin: 0.20,
      pauseMax: 0.85,
      avoidPepper: false,
      randomTarget: true,
      obeyOrder: false,
      doorPenalty: 0,
      bikeCaution: false,
    },
    backdoor: {
      label: "BACKDOOR USER",
      pepperChance: 0.20,
      reheatThreshold: 52,
      pauseChance: 0.008,
      pauseMin: 0.10,
      pauseMax: 0.30,
      avoidPepper: false,
      randomTarget: false,
      obeyOrder: true,
      doorPenalty: -0.35,
      bikeCaution: true,
      waitForDoor: true,
    },
  });

  function distributionSeededRandom(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function distributionPepperCells() {
    const cells = new Set();
    for (const grain of model.pepper) {
      cells.add(cellKey(clamp(Math.round(grain.gx), 1, COLS), clamp(Math.round(grain.gy), 1, ROWS)));
    }
    return cells;
  }

  function distributionFindFirstStep(startC, startR, goals, profile) {
    if (!goals.length) return null;

    const goalKeys = new Set(goals.map((g) => cellKey(g.c, g.r)));
    const startKey = cellKey(startC, startR);
    if (goalKeys.has(startKey)) return { c: startC, r: startR };

    const pepperCells = distributionPepperCells();
    const dist = new Map([[startKey, 0]]);
    const parent = new Map();
    const open = [{ c: startC, r: startR, cost: 0 }];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let foundKey = null;

    while (open.length) {
      open.sort((a, b) => a.cost - b.cost);
      const cur = open.shift();
      const curKey = cellKey(cur.c, cur.r);
      if (cur.cost !== dist.get(curKey)) continue;

      if (goalKeys.has(curKey)) {
        foundKey = curKey;
        break;
      }

      for (const [dx, dy] of dirs) {
        const c = cur.c + dx;
        const r = cur.r + dy;
        if (!inGrid(c, r)) continue;
        if (isFixedBlock(c, r)) continue;
        if (garbageAt(c, r)) continue;

        const key = cellKey(c, r);
        let stepCost = 1;
        if (!masalaRushActive() && catAt(c, r)) stepCost += 3.0;
        if (c === DOOR_COL && r === DOOR_ROW) {
          stepCost += Number(profile.doorPenalty) || 0;
          if (!model.doorOpen) stepCost += profile.waitForDoor ? 0.8 : 2.8;
          stepCost = Math.max(0.35, stepCost);
        }
        if (profile.avoidPepper) {
          if (pepperCells.has(key)) stepCost += 12;
          else {
            for (const pk of pepperCells) {
              const p = parseCellKey(pk);
              if (Math.abs(p.c - c) + Math.abs(p.r - r) === 1) {
                stepCost += 2.5;
                break;
              }
            }
          }
        }

        const nextCost = cur.cost + stepCost;
        if (nextCost >= (dist.get(key) ?? Infinity)) continue;
        dist.set(key, nextCost);
        parent.set(key, curKey);
        open.push({ c, r, cost: nextCost });
      }
    }

    if (!foundKey) return null;
    let cursorKey = foundKey;
    let previousKey = parent.get(cursorKey);
    while (previousKey && previousKey !== startKey) {
      cursorKey = previousKey;
      previousKey = parent.get(cursorKey);
    }
    const step = parseCellKey(cursorKey);
    return Number.isFinite(step.c) && Number.isFinite(step.r) ? step : null;
  }

  function distributionLiveTargetGoals(profile, rng) {
    const live = model.activeTargets.filter((target) => !target.delivered && targetCanBeDelivered(target));
    if (!live.length) return [];

    if (model.deliveryOrderMode && model.deliveryOrderSequenceEnforced && profile.obeyOrder) {
      const expected = expectedDeliveryTarget();
      if (expected && !expected.delivered && targetCanBeDelivered(expected)) {
        return [{ c: expected.c, r: expected.r }];
      }
    }

    if (profile.randomTarget && live.length > 1) {
      const target = live[Math.floor(rng() * live.length)];
      return [{ c: target.c, r: target.r }];
    }

    return live.map((target) => ({ c: target.c, r: target.r }));
  }

  function distributionPepperGoals() {
    return model.pepper.map((grain) => ({
      c: clamp(Math.round(grain.gx), 1, COLS),
      r: clamp(Math.round(grain.gy), 1, ROWS),
    }));
  }

  function distributionSetIntent(profile, state, rng, dt) {
    if (model.nightOver) return;

    if (model.deliveryOrderIntro && model.deliveryOrderIntro.active) {
      model.touchActive = false;
      model.intentX = 0;
      model.intentY = 0;
      return;
    }

    if (model.pickupLeadin) {
      model.touchActive = false;
      model.intentX = 0;
      model.intentY = 0;
      return;
    }

    if (state.pauseTimer > 0) {
      state.pauseTimer = Math.max(0, state.pauseTimer - dt);
      model.touchActive = false;
      model.intentX = 0;
      model.intentY = 0;
      return;
    }

    const node = nearNodeForTurn();
    if (!(node.nearX && node.nearY)) {
      model.touchActive = model.dirX !== 0 || model.dirY !== 0;
      return;
    }

    const c = clamp(node.c, 1, COLS);
    const r = clamp(node.r, 1, ROWS);
    const nodeKey = cellKey(c, r);

    // nearNodeForTurn() remains true for several frames while leaving a cell.
    // Keep the decision already made instead of running a fresh path search on
    // every one of those frames. Re-plan only after reaching a different node,
    // or when the current decision is to stand still.
    if (state.lastControlNode === nodeKey && (model.intentX !== 0 || model.intentY !== 0)) {
      model.touchActive = true;
      return;
    }

    if (state.lastPauseNode !== nodeKey) {
      state.lastPauseNode = nodeKey;
      if (rng() < profile.pauseChance) {
        state.pauseTimer = profile.pauseMin + rng() * (profile.pauseMax - profile.pauseMin);
        model.touchActive = false;
        model.intentX = 0;
        model.intentY = 0;
        return;
      }
    }

    state.lastControlNode = nodeKey;
    let goals = [];

    if (!model.carrying) {
      goals = [{ c: 5, r: 1 }];
    } else if (
      profile.reheatThreshold > 0
      && model.reheatAvailable
      && model.reheatDeparted
      && model.curryHeat <= profile.reheatThreshold
    ) {
      goals = [{ c: 5, r: 1 }];
    } else {
      const pepperGoals = model.pepperHeld < PEPPER_RUSH_COST ? distributionPepperGoals() : [];
      const liveTargets = distributionLiveTargetGoals(profile, rng);

      let seekPepper = false;
      if (pepperGoals.length && profile.pepperChance > 0) {
        if (profile.pepperChance >= 1) {
          seekPepper = true;
        } else {
          // Re-roll only at lane nodes. This approximates a player noticing a
          // nearby ingredient and deciding whether the detour feels worth it.
          seekPepper = rng() < profile.pepperChance;
        }
      }
      goals = seekPepper ? pepperGoals : liveTargets;
    }

    if (!goals.length) {
      model.touchActive = false;
      model.intentX = 0;
      model.intentY = 0;
      return;
    }

    const next = distributionFindFirstStep(c, r, goals, profile);
    if (!next) {
      model.touchActive = false;
      model.intentX = 0;
      model.intentY = 0;
      model.runSpeed = Math.min(model.runSpeed, MAX_RUN_SPEED * 0.25);
      return;
    }

    const dx = next.c - c;
    const dy = next.r - r;

    // Careful profiles respect the bicycle as a moving hazard instead of
    // blindly pathfinding through the crossing. Wait one intersection away
    // while the visible bike is close to the intended crossing column.
    if (
      profile.bikeCaution
      && model.bikePhase === "ride"
      && next.r === BIKE_ROW
      && r !== BIKE_ROW
      && Math.abs(model.bikeGX - c) < 2.35
    ) {
      state.lastControlNode = "";
      model.touchActive = false;
      model.intentX = 0;
      model.intentY = 0;
      model.runSpeed = Math.max(0, model.runSpeed - RELEASE_DECEL * dt);
      return;
    }

    if (dx === 0 && dy === 0) {
      model.touchActive = false;
      model.intentX = 0;
      model.intentY = 0;
      return;
    }

    model.touchActive = true;
    model.intentX = Math.sign(dx);
    model.intentY = Math.sign(dy);
  }

  function dismissDeliveryOrderIntro() {
    if (!model.deliveryOrderIntro || !model.deliveryOrderIntro.active) return;
    if (model.deliveryOrderIntro.age < DELIVERY_ORDER_INTRO_MIN_TAP_TIME) return;
    const startPickupAfter = !!model.deliveryOrderIntro.startPickupAfter;
    model.deliveryOrderIntro.active = false;
    model.deliveryOrderIntro.armed = false;
    model.deliveryOrderIntro.startPickupAfter = false;
    activateDeliveryOrderMode();
    if (startPickupAfter) beginPickupLeadin({ skipOrderIntro: true });
  }

  function distributionCompactResult(result, profileId, seed, steps, failed = false) {
    return {
      profile: profileId,
      seed: seed >>> 0,
      failed: !!failed,
      steps,
      deliveries: result ? result.deliveries : model.deliveries,
      sales: result ? result.sales : model.sales,
      hotDeliveries: result ? result.hotDeliveries : model.hotDeliveries,
      warmDeliveries: result ? result.warmDeliveries : model.warmDeliveries,
      coolDeliveries: result ? result.coolDeliveries : model.coolDeliveries,
      coldDeliveries: result ? result.coldDeliveries : model.coldDeliveries,
      hotRatio: result ? result.hotRatio : (model.deliveries ? model.hotDeliveries / model.deliveries : 0),
      averageHeat: result ? result.averageHeat : (model.deliveries ? model.heatSum / model.deliveries : 0),
      masalaRushCount: result ? result.masalaRushCount : model.masalaRushCount,
      pepperCollected: result ? result.pepperCollected : model.pepperCollected,
      pepperSpent: result ? result.pepperSpent : model.masalaRushTriggers.reduce((sum, entry) => sum + (Number(entry.pepperSpent) || 0), 0),
      pepperHeld: result ? result.pepperHeld : model.pepperHeld,
      bikeHits: result ? result.bikeHits : model.bikeHits,
      backdoorUses: result ? result.backdoorUses : model.backdoorUses,
      reheatCount: result ? result.reheatCount : model.reheatCount,
      deliveryOrderMistakes: result ? result.deliveryOrderMistakes : model.deliveryOrderMistakes,
      nightGauge: result ? result.nightGauge : model.nightGauge,
      endReason: result ? result.endReason : (model.nightEndReason || "timeout"),
      finishElapsedSeconds: result ? result.finishElapsedSeconds : Math.round(model.shiftElapsed * 10) / 10,
      makanai: result ? result.makanai : null,
      makanaiBase: result ? result.makanaiBase : null,
      makanaiPrefix: result ? result.makanaiPrefix : null,
      makanaiTopping: result ? result.makanaiTopping : null,
      makanaiEggCount: result ? (Number(result.makanaiEggCount) || 0) : 0,
      makanaiLarge: result ? !!result.makanaiLarge : false,
      makanaiPepperRoastedLevel: result ? result.makanaiPepperRoastedLevel : 0,
      makanaiPepperFreshStyle: result ? result.makanaiPepperFreshStyle : null,
      makanaiSpecialEligible: result ? !!result.makanaiSpecialEligible : false,
      makanaiSpecialChance: result ? result.makanaiSpecialChance : 0,
      makanaiSpecialRoll: result ? result.makanaiSpecialRoll : null,
      makanaiBiryaniStage: result ? result.makanaiBiryaniStage : 0,
      debugGX: failed ? Number(model.playerGX.toFixed(3)) : null,
      debugGY: failed ? Number(model.playerGY.toFixed(3)) : null,
      debugCarrying: failed ? !!model.carrying : null,
      debugDishesLeft: failed ? model.dishesLeft : null,
      debugLiveTargets: failed ? model.activeTargets.filter((target) => !target.delivered).length : null,
    };
  }

  function runDistributionNight(profileId = "balanced", seed = 1, options = {}) {
    const profile = DISTRIBUTION_PROFILES[profileId] || DISTRIBUTION_PROFILES.balanced;
    const dt = clamp(Number(options.dt) || 0.06, 1 / 120, 0.10);
    const maxSteps = Math.max(1000, Math.floor(Number(options.maxSteps) || 24000));
    const originalRandom = Math.random;
    const rng = distributionSeededRandom(seed);
    const state = {
      pauseTimer: 0,
      lastPauseNode: "",
      lastControlNode: "",
      stuckTimer: 0,
      lastGX: 5,
      lastGY: 1,
    };

    distributionTestActive = true;
    distributionLastResult = null;
    Math.random = rng;

    try {
      resetSession();
      model.attractMode = false;
      model.nightSeed = seed >>> 0;
      model.bestSales = 0;
      model.sessionPriorBestSales = 0;

      let steps = 0;
      while (!model.nightOver && steps < maxSteps) {
        distributionSetIntent(profile, state, rng, dt);
        updateGameForDistribution(dt);
        dismissDeliveryOrderIntro();

        const moved = Math.hypot(model.playerGX - state.lastGX, model.playerGY - state.lastGY);
        if (model.touchActive && moved < 0.0005) state.stuckTimer += dt;
        else state.stuckTimer = 0;
        if (state.stuckTimer >= 0.42) {
          // Dynamic cats, rubbish and the timed door can invalidate a route
          // after the courier already left an intersection. A human can back
          // away; the audit bot returns to the safe side of that lane segment
          // and replans instead of hammering the obstacle forever.
          const oldDirX = model.dirX;
          const oldDirY = model.dirY;
          if (oldDirX > 0) model.playerGX = Math.floor(model.playerGX + 0.00001);
          else if (oldDirX < 0) model.playerGX = Math.ceil(model.playerGX - 0.00001);
          else model.playerGX = Math.round(model.playerGX);
          if (oldDirY > 0) model.playerGY = Math.floor(model.playerGY + 0.00001);
          else if (oldDirY < 0) model.playerGY = Math.ceil(model.playerGY - 0.00001);
          else model.playerGY = Math.round(model.playerGY);
          model.playerGX = clamp(model.playerGX, 1, COLS);
          model.playerGY = clamp(model.playerGY, 1, ROWS);
          model.dirX = 0;
          model.dirY = 0;
          state.lastControlNode = "";
          model.touchActive = false;
          model.intentX = 0;
          model.intentY = 0;
          model.runSpeed = 0;
          state.stuckTimer = 0;
        }
        state.lastGX = model.playerGX;
        state.lastGY = model.playerGY;
        steps += 1;
      }

      return distributionCompactResult(
        distributionLastResult,
        profileId,
        seed,
        steps,
        !model.nightOver
      );
    } finally {
      Math.random = originalRandom;
      distributionTestActive = false;
    }
  }

  function distributionSyntheticResult(seed) {
    const rng = distributionSeededRandom(seed);
    const deliveries = 8 + Math.floor(rng() * 313);
    const hotRatio = rng();
    const coldRatio = Math.min(0.42, rng() * (1 - hotRatio) * 0.65);
    const hotDeliveries = Math.floor(deliveries * hotRatio);
    const coldDeliveries = Math.floor(deliveries * coldRatio);
    const remainder = Math.max(0, deliveries - hotDeliveries - coldDeliveries);
    const warmDeliveries = Math.floor(remainder * (0.35 + rng() * 0.45));
    const coolDeliveries = Math.max(0, remainder - warmDeliveries);
    const rushes = Math.floor(rng() * 16);
    const pepperHeld = Math.floor(rng() * PEPPER_RUSH_COST);

    const result = {
      sales: deliveries * DELIVERY_SALE_PRICE,
      deliveries,
      hotDeliveries,
      warmDeliveries,
      coolDeliveries,
      coldDeliveries,
      masalaRushCount: rushes,
      pepperSpent: rushes * PEPPER_RUSH_COST,
      pepperHeld,
      bikeHits: Math.floor(rng() * Math.max(2, deliveries * 0.16)),
      backdoorUses: Math.floor(rng() * Math.max(2, deliveries * 0.13)),
      reheatCount: Math.floor(rng() * Math.max(2, deliveries * 0.08)),
      nightSeed: seed >>> 0,
      newBest: rng() < 0.08,
      endReason: "night-gauge",
    };
    Object.assign(result, generateMakanai(result));
    return distributionCompactResult(result, "generator", seed, 0, false);
  }

  if (typeof window !== "undefined") {
    window.ROJIURA_DISTRIBUTION_TEST = {
      build: ROJIURA_BUILD,
      profiles: Object.fromEntries(
        Object.entries(DISTRIBUTION_PROFILES).map(([id, profile]) => [id, profile.label])
      ),
      runNight: runDistributionNight,
      generateOnly(seed = 1) {
        return distributionSyntheticResult(seed);
      },
    };
  }

  // ----------------------------------------------------------
  // DRAW — COLORS
  // ----------------------------------------------------------

  // Eight spice-derived colors anchor the visual vocabulary. Transient effects
  // may interpolate between them, but the town itself avoids a separate
  // monochrome "night palette" that would flatten the scene.
  const SPICE = {
    deepClove: [30, 22, 19],       // deepest night / outline
    cinnamon: [91, 52, 37],        // walls / wood / warm shadow
    cuminSand: [164, 109, 62],      // worn plaster / ledges / skin
    naanCream: [239, 216, 171],     // paper / plates / strongest light
    turmeric: [226, 159, 43],       // lamps / routes / active heat
    tandoori: [194, 81, 42],        // curry / warm fabric / secondary accent
    chili: [166, 45, 36],           // courier / one or two street accents
    cardamom: [91, 111, 58],        // plants / rubbish / cool counterpoint
  };

  const C = {
    // First-pass contrast palette.
    // Building / window spice colors intentionally remain unchanged.
    night: [15, 10, 5],            // #0F0A05
    control: [31, 20, 13],         // #1F140D
    uiBorder: [74, 53, 39],        // #4A3527
    padBg: [50, 34, 26],           // #32221A
    padArrow: [158, 122, 94],      // #9E7A5E

    grid: [38, 27, 23],
    road: [23, 16, 11],            // #17100B — deeper night road
    roadSeam: [7, 5, 4],           // dark joints kept legible on the deeper road
    roadDot: SPICE.cuminSand,

    building: SPICE.cinnamon,
    buildingTop: SPICE.cuminSand,
    windowDark: SPICE.deepClove,
    windowLight: SPICE.turmeric,
    metal: [131, 104, 77],

    cream: SPICE.naanCream,
    dim: SPICE.cuminSand,
    curry: SPICE.tandoori,
    amber: SPICE.turmeric,

    // Slightly brighter courier red. The authored PNG is not recolored;
    // this applies to code-drawn courier/accent uses only.
    chili: [183, 48, 34],          // #B73022

    cat: SPICE.cuminSand,
    catEye: SPICE.naanCream,
    garbage: SPICE.cardamom,
    bike: SPICE.naanCream,

    ticketPaper: [237, 226, 202],  // #EDE2CA
    ticketText: [44, 30, 22],      // #2C1E16
    ticketSubtext: [110, 98, 88],  // #6E6258
    accent: [244, 208, 63],        // #F4D03F
  };

  // Building details use only two snapped widths. Keeping this vocabulary
  // explicit prevents the small facade marks from drifting into vector-like
  // fractional strokes as the pseudo-3D scale changes by row.
  const PIXEL_EDGE = 2;
  const PIXEL_DETAIL = 1;

  // The courier is authored as a tiny 18×19px sprite.  The source PNGs are
  // kept in direction-sized groups so the runtime can animate only the
  // direction the player is actually travelling in.  Side views intentionally
  // use a two-frame loop; the front/back views carry the stronger motion.
  const PLAYER_SPRITE_FILES = {
    front: [
      "assets/player/player-front-01.png",
      "assets/player/player-front-02.png",
      "assets/player/player-front-03.png",
    ],
    back: [
      "assets/player/player-back-01.png",
      "assets/player/player-back-02.png",
      "assets/player/player-back-03.png",
    ],
    right: [
      "assets/player/player-right-01.png",
      "assets/player/player-right-02.png",
    ],
    left: [
      "assets/player/player-left-01.png",
      "assets/player/player-left-02.png",
    ],
  };

  const playerSprites = {
    front: [],
    back: [],
    right: [],
    left: [],
  };

  const PLAYER_SPRITE_W = 26;
  const PLAYER_SPRITE_H = 27;
  const PLAYER_SPRITE_FRAME_RATE = 8.5;

  // Dynamic garbage uses three authored 72×72 canvases with softer silhouettes.
  // Keep the shared canvas at one game size so the single bag and paired-bag
  // variants preserve their intended relative proportions.
  const GARBAGE_SPRITE_FILES = [
    "assets/garbage/garbage-01.png",
    "assets/garbage/garbage-02.png",
    "assets/garbage/garbage-03.png",
  ];
  const garbageSprites = [];
  const GARBAGE_SPRITE_SIZE = 24;
  const GARBAGE_GROUND_Y = -8;

  const BIKE_SPRITE_FILE = "assets/bike/bike-01.png";
  let bikeSprite = null;
  const BIKE_SPRITE_H = 22;
  const BIKE_GROUND_Y = -9;

  // Result-screen naan is code-drawn, just like the makanai curry.
  // Keeping it as a separate renderer makes future sales-based stacking easy
  // without introducing another authored PNG dependency.
  function loadGarbageSprites() {
    if (typeof Image !== "function") return;

    for (const src of GARBAGE_SPRITE_FILES) {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      garbageSprites.push(image);
    }
  }

  function loadBikeSprite() {
    if (typeof Image !== "function") return;

    bikeSprite = new Image();
    bikeSprite.decoding = "async";
    bikeSprite.src = BIKE_SPRITE_FILE;
  }

  function loadPlayerSprites() {
    if (typeof Image !== "function") return;

    Object.entries(PLAYER_SPRITE_FILES).forEach(([direction, files]) => {
      playerSprites[direction] = files.map((src) => {
        const image = new Image();
        image.decoding = "async";
        image.src = src;
        return image;
      });
    });
  }

  function playerFacing() {
    if (model.dirX > 0) return "right";
    if (model.dirX < 0) return "left";
    if (model.dirY > 0) return "back";
    return "front";
  }

  function currentPlayerSprite() {
    const direction = playerFacing();
    const frames = playerSprites[direction];
    if (!frames || !frames.length) return null;

    const moving = model.runSpeed > 0.08;
    const frameIndex = moving
      ? Math.floor(model.time * PLAYER_SPRITE_FRAME_RATE) % frames.length
      : 0;
    const image = frames[frameIndex];
    if (!image || !image.complete || !image.naturalWidth) return null;

    return { direction, image };
  }

  function drawPlayerSprite(p) {
    const sprite = currentPlayerSprite();
    if (!sprite) return false;

    // Left and right are authored separately.  Do not mirror the left set:
    // doing so makes the courier face backwards while walking left.
    const flip = false;
    const baseline = p.bodyY - 8.5;

    withCanvasContext((ctx) => {
      ctx.imageSmoothingEnabled = false;
      // Codea Lite uses a y-up world transform. Flip the image around its
      // *top* edge, not the feet, so the sprite grows upward from the ground
      // anchor instead of being drawn below it.
      ctx.translate(p.x, baseline + PLAYER_SPRITE_H);
      ctx.scale(flip ? -1 : 1, -1);
      ctx.drawImage(
        sprite.image,
        -PLAYER_SPRITE_W * 0.5,
        0,
        PLAYER_SPRITE_W,
        PLAYER_SPRITE_H
      );
    });

    return true;
  }

  function rgba(color, alpha = 255) {
    return [color[0], color[1], color[2], alpha];
  }

  // ----------------------------------------------------------
  // DRAW — WORLD
  // ----------------------------------------------------------

  function drawWorldContinuation() {
    // The playable grid is only the current alley section, not the edge of the
    // town. The world surface continues farther north than the collision grid
    // so scenery above row 11 can live in the same camera/world coordinates.
    const bleedX = CELL * 2;
    const bleedBottom = CELL * 2;
    const bleedTop = CELL * 3;
    const left = BOARD_X - bleedX;
    const bottom = BOARD_Y - bleedBottom;
    const width = BOARD_W + bleedX * 2;
    const height = BOARD_H + bleedBottom + bleedTop;

    noStroke();
    fill(...rgba(C.road));
    rect(left, bottom, width, height);

    // Keep the continuation surface plain. Decorative dash marks and tiny
    // speckles made the playfield read like a framed board, so the spillover
    // pavement is now intentionally quiet.
  }

  function drawFloorCell(c, r) {
    const p = cellCenter(c, r);
    noStroke();
    fill(...rgba(C.road));
    // Let the road read as one continuous surface. The old 0.98 inset left a
    // dark line around every tile, which made the town feel like a board.
    rect(p.x - CELL * 0.498, p.y - CELL * 0.498, CELL * 0.996, CELL * 0.996);

    // Keep the road surface calm. The previous neighbour shadows ringed each
    // building with a thin outline, so building depth is now handled by the
    // building renderers themselves instead of the road tiles.

    // Sparse stone / brick joints. These are deterministic from the grid
    // coordinates, deliberately incomplete, and darker than the road itself:
    // texture rather than a visible tile pattern.
    const seamSeed = (c * 17 + r * 29) % 13;
    if (seamSeed < 7) {
      const yOffsets = [-9, -6, -3, 3, 6, 9, 1];
      const xOffsets = [-12, -8, -4, 2, 6, -10, 4];
      const widths = [12, 9, 14, 10, 8, 13, 11];
      const y = Math.round(p.y + yOffsets[seamSeed]);
      const x = Math.round(p.x + xOffsets[seamSeed]);
      const w = widths[seamSeed];

      fill(...rgba(C.roadSeam, 205));
      rect(x, y, w, 1);

      // Only some seams get a short perpendicular joint, preventing the road
      // from turning into a regular RPG-style brick grid.
      if (seamSeed === 0 || seamSeed === 3 || seamSeed === 5) {
        const jointX = seamSeed === 3 ? x + w - 2 : x + Math.floor(w * 0.55);
        rect(jointX, y - 3, 1, 4);
      }
    }
  }

  function townDeliveryReactionProfile(kind) {
    // HOT gets a deliberately larger cartoon response. Warm preserves the
    // restrained motion used before, while cooler deliveries taper down so
    // the town itself communicates how satisfying that handoff felt.
    if (kind === "hot") {
      return { duration: 0.42, squashX: 1.105, squashY: 0.895, stretchX: 0.965, stretchY: 1.125 };
    }
    if (kind === "warm") {
      return { duration: 0.34, squashX: 1.050, squashY: 0.950, stretchX: 0.985, stretchY: 1.060 };
    }
    if (kind === "cool") {
      return { duration: 0.28, squashX: 1.024, squashY: 0.978, stretchX: 0.995, stretchY: 1.030 };
    }
    return { duration: 0.22, squashX: 1.008, squashY: 0.995, stretchX: 0.998, stretchY: 1.010 };
  }

  function townDeliveryReactionForBuilding(c, r) {
    const fx = model.deliveryFx;
    if (!fx || fx.timer <= 0) return { sx: 1, sy: 1 };

    const building = destinationBuildingForTarget({
      c: fx.c,
      r: fx.r,
      buildingC: fx.buildingC,
      buildingR: fx.buildingR,
      orderSlot: fx.slot || 1,
    });
    if (!building || building[0] !== c || building[1] !== r) {
      return { sx: 1, sy: 1 };
    }

    const profile = townDeliveryReactionProfile(fx.kind);
    const elapsed = fx.duration - fx.timer;
    const t = clamp(elapsed / profile.duration, 0, 1);
    if (t >= 1) return { sx: 1, sy: 1 };

    // Squash -> stretch -> settle. HOT is intentionally obvious enough to
    // read while moving, without changing the collision box underneath.
    if (t < 0.30) {
      const q = easeOutCubic(t / 0.30);
      return { sx: lerp(1, profile.squashX, q), sy: lerp(1, profile.squashY, q) };
    }
    if (t < 0.62) {
      const q = easeOutCubic((t - 0.30) / 0.32);
      return {
        sx: lerp(profile.squashX, profile.stretchX, q),
        sy: lerp(profile.squashY, profile.stretchY, q),
      };
    }
    const q = easeOutCubic((t - 0.62) / 0.38);
    return { sx: lerp(profile.stretchX, 1, q), sy: lerp(profile.stretchY, 1, q) };
  }

  function townRushReactionForBuilding(c, r) {
    if (!masalaRushActive()) return { sx: 1, sy: 1 };

    const d = Math.hypot(model.playerGX - c, model.playerGY - r);
    if (d >= TOWN_RUSH_REACT_RADIUS) return { sx: 1, sy: 1 };

    const proximity = 1 - d / TOWN_RUSH_REACT_RADIUS;
    const wave = Math.sin(model.time * 7.2 - d * 1.35);
    const amount = wave * TOWN_RUSH_REACT_AMOUNT * proximity;
    return { sx: 1 + amount, sy: 1 - amount * 0.78 };
  }

  function townBuildingScale(c, r) {
    const delivery = townDeliveryReactionForBuilding(c, r);
    const rush = townRushReactionForBuilding(c, r);
    return { sx: delivery.sx * rush.sx, sy: delivery.sy * rush.sy };
  }

  function shopPickupReactionScale() {
    if (!model.pickupLeadin) return { sx: 1, sy: 1 };

    const t = clamp(model.pickupLeadin.age / PICKUP_TOTAL_DURATION, 0, 1);
    if (t < 0.28) {
      const q = easeOutCubic(t / 0.28);
      return { sx: lerp(1, 1.06, q), sy: lerp(1, 0.955, q) };
    }
    if (t < 0.68) {
      const q = easeOutCubic((t - 0.28) / 0.40);
      return { sx: lerp(1.06, 0.985, q), sy: lerp(0.955, 1.055, q) };
    }
    const q = easeOutCubic((t - 0.68) / 0.32);
    return { sx: lerp(0.985, 1, q), sy: lerp(1.055, 1, q) };
  }

  function deliveredBuildingLight(c, r) {
    return model.deliveredBuildings && model.deliveredBuildings.get(cellKey(c, r));
  }

  function deliveredBuildingRole(c, r) {
    const variant = ((c / 2) + (r / 2) * 3) % 4;
    const residential = ((c / 2) + (r / 2)) % 3 === 0;
    return residential ? "home" : ["kitchen", "warehouse", "workshop", "notice"][variant];
  }

  function drawDeliveredBuildingLight(p, c, r, z = 1) {
    const delivered = deliveredBuildingLight(c, r);
    if (!delivered) return;

    // Delivered houses now keep a natural room light rather than an external
    // marker bar. The street can go to sleep while a few windows still feel
    // warm inside.
    const role = deliveredBuildingRole(c, r);
    const bodyBottom = CELL * ({
      home: 0.34,
      kitchen: 0.38,
      warehouse: 0.34,
      workshop: 0.38,
      notice: 0.33,
    }[role] || 0.34) * z;
    const openingBottom = p.y - bodyBottom;

    noStroke();
    if (role === "home") {
      const doorSide = (c / 2 + r / 2) % 2 === 0 ? -1 : 1;
      const doorX = p.x + doorSide * 5 * z;
      const windowX = p.x - doorSide * 6 * z;
      fill(...rgba(C.metal, 170));
      rect(windowX - 4 * z, p.y - z, 8 * z, 7 * z);
      fill(...rgba(C.windowLight, 205));
      rect(windowX - 3 * z, p.y, 6 * z, 5 * z);
      fill(...rgba(C.cream, 96));
      rect(windowX - z, p.y, 2 * z, 5 * z);
      fill(...rgba(C.amber, 130));
      rect(doorX - 3 * z, openingBottom + 1 * z, 6 * z, 1.5 * z);
    } else if (role === "kitchen") {
      fill(...rgba(C.amber, 195));
      rect(p.x - 5 * z, openingBottom + 5 * z, 10 * z, PIXEL_EDGE);
      fill(...rgba(C.windowLight, 130));
      rect(p.x - 4 * z, openingBottom + 3.5 * z, 8 * z, 1.5 * z);
    } else if (role === "warehouse") {
      fill(...rgba(C.amber, 120));
      rect(p.x - 7 * z, openingBottom + 1 * z, 14 * z, 2 * z);
      fill(...rgba(C.windowLight, 92));
      rect(p.x - z, openingBottom + 1 * z, 2 * z, 16 * z);
    } else if (role === "workshop") {
      fill(...rgba(C.windowLight, 215));
      rect(p.x - 4 * z, p.y - 4 * z, 8 * z, 12 * z);
      fill(...rgba(C.cream, 88));
      rect(p.x - 3 * z, p.y + 1 * z, 6 * z, 2 * z);
      fill(...rgba(C.buildingTop, 162));
      rect(p.x - z, p.y - 4 * z, 2 * z, 12 * z);
    } else {
      fill(...rgba(C.cream, 182));
      rect(p.x - 6 * z, p.y - 4 * z, 10 * z, 7 * z);
      fill(...rgba(C.amber, 96));
      rect(p.x + 6 * z, openingBottom + 1 * z, 4 * z, 10 * z);
    }
  }

  function drawDeliveredBuildingLightsPass() {
    if (!model.deliveredBuildings || model.deliveredBuildings.size === 0) return;

    for (const key of model.deliveredBuildings.keys()) {
      const { c, r } = parseCellKey(key);
      if (!inGrid(c, r)) continue;
      const p = cellCenter(c, r);
      const depthT = clamp((r - 1) / Math.max(1, ROWS - 1), 0, 1);
      const z = 1.04 - depthT * 0.09;
      const reactiveScale = townBuildingScale(c, r);
      pushMatrix();
      translate(p.x, p.y);
      scale(reactiveScale.sx, reactiveScale.sy);
      translate(-p.x, -p.y);
      drawDeliveredBuildingLight(p, c, r, z);
      popMatrix();
    }
  }

  function drawFixedBlock(c, r, forcedRole = null) {
    const p = cellCenter(c, r);
    const reactiveScale = townBuildingScale(c, r);
    pushMatrix();
    translate(p.x, p.y);
    scale(reactiveScale.sx, reactiveScale.sy);
    translate(-p.x, -p.y);
    // Fixed blocks use even coordinates, so deriving the variant directly
    // from c/r would only produce even remainders. Compress the coordinates
    // first so all four facade symbols actually appear on the board.
    const variant = ((c / 2) + (r / 2) * 3) % 4;
    // A few fixed cells are homes rather than storefronts. The remaining
    // cells are deliberately assigned building roles instead of being treated
    // as one generic box with four interchangeable icons.
    const residential = ((c / 2) + (r / 2)) % 3 === 0;
    const role = forcedRole || (residential
      ? "home"
      : ["kitchen", "warehouse", "workshop", "notice"][variant]);

    const metrics = {
      home:       { halfW: 0.41, bodyBottom: 0.34, bodyHeight: 0.63, roof: 0.27 },
      kitchen:    { halfW: 0.47, bodyBottom: 0.38, bodyHeight: 0.68, roof: 0.30 },
      warehouse:  { halfW: 0.43, bodyBottom: 0.34, bodyHeight: 0.61, roof: 0.25 },
      workshop:   { halfW: 0.42, bodyBottom: 0.38, bodyHeight: 0.73, roof: 0.33 },
      notice:     { halfW: 0.39, bodyBottom: 0.33, bodyHeight: 0.58, roof: 0.24 },
    }[role];

    // A restrained depth cue: nearer rows are a little larger than distant
    // rows. The collision grid remains unchanged; this only shapes the view.
    const depthT = clamp((r - 1) / Math.max(1, ROWS - 1), 0, 1);
    const z = 1.04 - depthT * 0.09;
    const halfW = CELL * metrics.halfW * z;
    const bodyBottom = CELL * metrics.bodyBottom * z;
    const bodyHeight = CELL * metrics.bodyHeight * z;
    const roofY = p.y + CELL * metrics.roof * z;

    noStroke();
    // Broader footing shadow: read as contact with the road, not as a thin
    // outline around the whole block.
    fill(...rgba(C.roadSeam, 170));
    rect(p.x - halfW - 3, p.y - bodyBottom - 2, halfW * 2 + 9, 3);
    fill(...rgba(C.roadSeam, 205));
    rect(p.x - halfW - 5, p.y - bodyBottom - 5, halfW * 2 + 12, 4);

    // Inset wall face. Its narrower width leaves a readable side edge inside
    // the blocked cell and gives every facade a common architectural grammar.
    fill(...rgba(C.building));
    rect(p.x - halfW, p.y - bodyBottom, halfW * 2, bodyHeight);

    // One broader dark side and one warm side imply a fixed light direction
    // without surrounding the whole facade with an even outline.
    fill(...rgba(C.roadSeam, 132));
    rect(p.x - halfW, p.y - bodyBottom, 3, bodyHeight);
    fill(...rgba(C.buildingTop, 40));
    rect(p.x + halfW - 2, p.y - bodyBottom + 2, 2, bodyHeight - 4);

    // Worn plaster patch behind the opening, kept broad and quiet. The notice
    // hut keeps a flatter face so its board becomes the main identifier.
    if ((r / 2) % 2 === 0 && role !== "notice") {
      fill(...rgba(C.buildingTop, role === "home" ? 24 : 38));
      rect(p.x - halfW + 3, p.y - bodyBottom + 4, halfW * 2 - 6, bodyHeight * 0.62);
    }

    // Each non-residential building gets a roof profile of its own. These are
    // small silhouette changes, not added texture, so the roles remain clear
    // even when the player is moving quickly past them.
    fill(...rgba(C.windowDark, 225));
    const roofOverhang = role === "home" ? 2 : role === "warehouse" ? 2 : 3;
    rect(p.x - halfW - roofOverhang, roofY, halfW * 2 + roofOverhang * 2, 3);
    fill(...rgba(C.buildingTop, role === "home" ? 125 : role === "warehouse" ? 145 : 195));
    const roofInset = role === "home" ? 4 : role === "notice" ? 3 : 1;
    rect(p.x - halfW + roofInset, roofY + 3, halfW * 2 - roofInset * 2, 2);
    fill(...rgba(C.windowDark, role === "home" ? 170 : 120));
    if (role === "home") {
      rect(p.x - 3 * z, roofY + 5, 6 * z, 1);
    } else if (role === "kitchen") {
      rect(p.x + halfW * 0.28, roofY + 5, 4 * z, 4 * z);
      fill(...rgba(C.metal, 150));
      rect(p.x + halfW * 0.28 - 1, roofY + 9, 6 * z, 1.5 * z);
    } else if (role === "warehouse") {
      rect(p.x - 5 * z, roofY + 5, 10 * z, 1);
    } else if (role === "workshop") {
      rect(p.x - halfW * 0.34, roofY + 5, 3 * z, 6 * z);
      fill(...rgba(C.buildingTop, 145));
      rect(p.x - halfW * 0.34 + 1, roofY + 5, 1 * z, 6 * z);
    } else {
      rect(p.x - 4 * z, roofY + 5, 8 * z, 1);
    }

    // Lower sill separates the facade from the walking surface.
    fill(...rgba(C.windowDark, 120));
    rect(p.x - halfW + 2, p.y - bodyBottom, halfW * 2 - 4, 2);

    if (role === "home") {
      // Homes use a narrow ground-to-wall door plus a small, dim window. The
      // offset openings prevent them from reading as another shop display.
      const doorSide = (c / 2 + r / 2) % 2 === 0 ? -1 : 1;
      const doorX = p.x + doorSide * 5 * z;
      const windowX = p.x - doorSide * 6 * z;
      const openingBottom = p.y - bodyBottom;

      fill(...rgba(C.windowDark, 225));
      rect(doorX - 4 * z, openingBottom, 8 * z, 17 * z);
      fill(...rgba(C.buildingTop, 125));
      rect(doorX - 5 * z, openingBottom, PIXEL_EDGE, 18 * z);
      rect(doorX + 3.5 * z, openingBottom, PIXEL_EDGE, 18 * z);
      fill(...rgba(C.metal, 150));
      rect(
        doorX + doorSide * 2 * z - 0.75 * z,
        openingBottom + 8 * z - 0.75 * z,
        1.5 * z,
        1.5 * z
      );

      const homeWindowAwake = townWindowAwake(`home-${c}-${r}`);
      const homeWindowGlow = homeWindowAwake
        && (masalaRushActive() ? masalaRushBlink(`home-${c}-${r}`, -0.10) : true);
      fill(...rgba(C.windowDark, 220));
      rect(windowX - 5 * z, p.y - 2 * z, 10 * z, 9 * z);
      fill(...rgba(C.metal, homeWindowGlow ? 150 : 92));
      rect(windowX - 4 * z, p.y - z, 8 * z, 7 * z);
      fill(...rgba(homeWindowGlow ? C.windowLight : C.windowDark, homeWindowGlow ? 165 : 62));
      rect(windowX - 3 * z, p.y, 6 * z, 5 * z);
      fill(...rgba(C.buildingTop, homeWindowGlow ? 140 : 72));
      rect(windowX - z, p.y, 2 * z, 5 * z);
    } else if (role === "kitchen") {
      // Kitchen / prep room: the vent and low service hatch make the food
      // function readable without turning it into a second storefront.
      const openingBottom = p.y - bodyBottom;
      // Replace the former circle-and-bar mark with a square vent grille.
      // Every bar is either one or two logical pixels wide.
      fill(...rgba(C.metal, 185));
      rect(p.x - 8 * z, p.y - 6 * z, 16 * z, 9 * z);
      fill(...rgba(C.windowDark, 225));
      rect(p.x - 6 * z, p.y - 4 * z, 12 * z, 5 * z);
      fill(...rgba(C.metal, 155));
      rect(p.x - 5 * z, p.y - 3 * z, 10 * z, PIXEL_DETAIL);
      rect(p.x - 5 * z, p.y - 1 * z, 10 * z, PIXEL_DETAIL);
      rect(p.x - 5 * z, p.y + 1 * z, 10 * z, PIXEL_DETAIL);
      fill(...rgba(C.windowDark, 180));
      rect(p.x - 8 * z, p.y - 6 * z, 16 * z, PIXEL_EDGE);
      fill(...rgba(C.windowDark, 225));
      rect(p.x - 8 * z, openingBottom + 1 * z, 16 * z, 7 * z);
      const kitchenGlow = townWindowAwake(`kitchen-${c}-${r}`);
      fill(...rgba(kitchenGlow ? C.amber : C.windowDark, kitchenGlow ? 165 : 66));
      rect(p.x - 5 * z, openingBottom + 5 * z, 10 * z, PIXEL_EDGE);
    } else if (role === "warehouse") {
      // Warehouse: a closed double door and a low threshold say “storage”,
      // not “customer entrance”.
      const openingBottom = p.y - bodyBottom;
      fill(...rgba(C.windowDark, 235));
      rect(p.x - 10 * z, openingBottom, 20 * z, 18 * z);
      fill(...rgba(C.buildingTop, 145));
      rect(p.x - 11 * z, openingBottom, 2 * z, 20 * z);
      rect(p.x + 9 * z, openingBottom, 2 * z, 20 * z);
      rect(p.x - z, openingBottom + 1 * z, 2 * z, 17 * z);
      fill(...rgba(C.metal, 175));
      rect(p.x - 4 * z, openingBottom + 9 * z, 2 * z, 2 * z);
      rect(p.x + 2 * z, openingBottom + 9 * z, 2 * z, 2 * z);
      fill(...rgba(C.buildingTop, 120));
      rect(p.x - 7 * z, openingBottom - 2 * z, 14 * z, 2 * z);
    } else if (role === "workshop") {
      // Workshop: a tall narrow window and a short side pipe imply a room
      // where someone is working, without a shop sign.
      const workshopGlow = townWindowAwake(`workshop-${c}-${r}`);
      fill(...rgba(C.windowDark));
      rect(p.x - 6 * z, p.y - 7 * z, 12 * z, 18 * z);
      fill(...rgba(workshopGlow ? C.windowLight : C.windowDark, workshopGlow ? 185 : 58));
      rect(p.x - 4 * z, p.y - 4 * z, 8 * z, 12 * z);
      fill(...rgba(workshopGlow ? C.cream : C.buildingTop, workshopGlow ? 72 : 34));
      rect(p.x - 3 * z, p.y + 1 * z, 6 * z, 2 * z);
      fill(...rgba(C.buildingTop, workshopGlow ? 155 : 88));
      rect(p.x - z, p.y - 4 * z, 2 * z, 12 * z);
      fill(...rgba(C.metal, 155));
      rect(p.x + 8 * z, p.y - 5 * z, 2 * z, 10 * z);
      rect(p.x + 8 * z, p.y + 5 * z, 4 * z, 2 * z);
    } else {
      // Notice hut / alley office: the board is part of the facade, with a
      // small side entrance so it reads as a public utility rather than a
      // poster pasted onto an ordinary shop.
      const openingBottom = p.y - bodyBottom;
      fill(...rgba(C.windowDark, 220));
      rect(p.x + 6 * z, openingBottom, 6 * z, 14 * z);
      fill(...rgba(C.buildingTop, 125));
      rect(p.x + 5 * z, openingBottom, PIXEL_EDGE, 16 * z);
      fill(...rgba(C.buildingTop, 185));
      rect(p.x - 8 * z, p.y - 7 * z, 14 * z, 13 * z);
      fill(...rgba(C.windowDark, 150));
      rect(p.x - 8 * z, p.y - 7 * z, 14 * z, PIXEL_EDGE);
      rect(p.x - 8 * z, p.y + 5 * z, 14 * z, PIXEL_DETAIL);
      fill(...rgba(C.cream, 145));
      rect(p.x - 6 * z, p.y - 4 * z, 10 * z, 7 * z);
      fill(...rgba(C.building, 180));
      rect(p.x - 4 * z, p.y - 1 * z, 6 * z, PIXEL_DETAIL);
      rect(p.x - 4 * z, p.y + 2 * z, 5 * z, PIXEL_DETAIL);
      fill(...rgba(C.chili, 205));
      rect(p.x - 4 * z, p.y - 3 * z, 2 * z, PIXEL_EDGE);
    }

    // One small plant stays attached to the same facade as before; it is an
    // environmental accent, not part of the building-role classification.
    if (c === 8 && r === 4) {
      const plantX = p.x + 8;
      const plantY = p.y - 7;
      fill(...rgba(C.windowDark, 115));
      rect(plantX - 5, plantY - 8, 15, 3);
      fill(...rgba(C.buildingTop, 215));
      rect(plantX - 3, plantY - 7, 8, 5);
      fill(...rgba(C.garbage, 245));
      rect(plantX - 7, plantY - 3, 5, 7);
      rect(plantX - 2, plantY, 5, 7);
      rect(plantX + 3, plantY - 2, 5, 8);
      fill(...rgba(C.buildingTop, 150));
      rect(plantX - 6, plantY + 1, 2, 3);
      rect(plantX + 4, plantY + 1, 2, 4);
    }

    popMatrix();
  }

  function drawRestaurant() {
    const first = cellCenter(2, DOOR_ROW);
    const last = cellCenter(8, DOOR_ROW);
    const left = first.x - CELL * 0.50;
    const right = last.x + CELL * 0.50;
    const bodyBottom = first.y - CELL * 0.49;
    const bodyTop = first.y + CELL * 0.30;
    const roofY = first.y + CELL * 0.47;

    for (let c = 2; c <= 8; c += 1) {
      const p = cellCenter(c, DOOR_ROW);
      noStroke();
      fill(...rgba(C.building));
      rect(p.x - CELL * 0.50, p.y - CELL * 0.49, CELL, CELL * 0.98);
      fill(...rgba(C.buildingTop, 185));
      rect(p.x - CELL * 0.50, bodyTop, CELL, PIXEL_EDGE);
      fill(...rgba(C.windowDark, 115));
      rect(p.x - CELL * 0.50, bodyBottom, CELL, PIXEL_EDGE);

      if (c === DOOR_COL) {
        drawDoor(p.x, p.y);
      } else if (c === 3) {
        // A framed menu/service panel, not a loose white sheet.
        fill(...rgba(C.windowDark, 200));
        rect(p.x - 9, p.y - 7, 18, 14);
        fill(...rgba(C.buildingTop, 175));
        rect(p.x - 7, p.y - 5, 14, 10);
        fill(...rgba(C.cream, 145));
        rect(p.x - 5, p.y - 3, 10, 6);
        fill(...rgba(C.chili, 210));
        rect(p.x - 4, p.y - 1, 6, PIXEL_DETAIL);
      } else if (c === 7) {
        // Square kitchen vent: the same grille grammar used by the small
        // kitchen buildings, scaled to the longer shared facade.
        fill(...rgba(C.metal, 190));
        rect(p.x - 8, p.y - 6, 16, 11);
        fill(...rgba(C.windowDark, 220));
        rect(p.x - 6, p.y - 4, 12, 7);
        fill(...rgba(C.metal, 150));
        rect(p.x - 5, p.y - 2, 10, PIXEL_DETAIL);
        rect(p.x - 5, p.y, 10, PIXEL_DETAIL);
      } else {
        // Quiet side modules: shutters/windows with a consistent 2px frame.
        fill(...rgba(C.windowDark, 180));
        rect(p.x - 8, p.y - 6, 16, 12);
        fill(...rgba(C.metal, 145));
        rect(p.x - 6, p.y - 4, 12, 8);
        fill(...rgba(C.buildingTop, 95));
        rect(p.x - 5, p.y - 1, 10, PIXEL_DETAIL);
      }
    }

    // One continuous two-step roofline turns the row into a single place. The
    // two-pixel cap and one-pixel highlight match the small-building grammar.
    noStroke();
    fill(...rgba(C.windowDark));
    rect(left - 2, roofY, right - left + 4, 3);
    fill(...rgba(C.buildingTop, 220));
    rect(left + 5, roofY - 3, right - left - 10, PIXEL_EDGE);
    fill(...rgba(C.windowDark, 145));
    rect(left + 18, roofY - 4, right - left - 36, PIXEL_DETAIL);

    // Two quiet lamps frame the door. They are visual landmarks, not targets.
    for (const c of [2, 8]) {
      const p = cellCenter(c, DOOR_ROW);
      fill(...rgba(C.amber, 165));
      rect(p.x - 2, p.y + 6, 4, 5);
      fill(...rgba(C.cream, 85));
      rect(p.x - 3, p.y + 4, 6, PIXEL_DETAIL);
    }
  }

  function drawDoor(x, y) {
    noStroke();
    if (model.doorOpen) {
      // An open doorway is the same colour as the walkable road.  The side
      // jambs and header keep its architectural shape, but the missing sill
      // makes the route read as continuous rather than blocked.
      fill(...rgba(C.windowDark));
      rect(x - 10, y - 15, 20, 26);
      fill(...rgba(C.road));
      rect(x - 8, y - 13, 16, 24);
      fill(...rgba(C.buildingTop, 180));
      rect(x - 10, y - 15, PIXEL_EDGE, 26);
      rect(x + 8, y - 15, PIXEL_EDGE, 26);
      rect(x - 8, y - 15, 16, PIXEL_EDGE);

      // Double doors are swung outward to both sides. In the small-scale view
      // this deliberately reads as □■□: two solid leaves at the edges and a
      // clear road-colour opening in the centre. Neither leaf crosses the
      // doorway, so the route remains visibly open.
      fill(...rgba(C.windowDark));
      rect(x - 18, y - 15, 8, 26);
      rect(x + 10, y - 15, 8, 26);
      fill(...rgba(C.building));
      rect(x - 16, y - 13, 6, 24);
      rect(x + 10, y - 13, 6, 24);
      fill(...rgba(C.buildingTop, 210));
      rect(x - 16, y - 13, 6, PIXEL_DETAIL);
      rect(x + 10, y - 13, 6, PIXEL_DETAIL);
      fill(...rgba(C.metal, 180));
      rect(x - 11, y - 9, PIXEL_DETAIL, 18);
      rect(x + 10, y - 9, PIXEL_DETAIL, 18);

      // A restrained warm pixel marks the lit interior without obscuring the
      // road-colour opening that communicates passability.
      const pulse = model.doorOpenFx > 0 ? model.doorOpenFx / 0.55 : 0;
      fill(...rgba(C.amber, 40 + pulse * 55));
      rect(x - 4, y - 11, 8, PIXEL_DETAIL);
    } else {
      // A closed door remains part of the facade: its panel uses exactly the
      // building colour, while the dark frame, centre seam, and handle make
      // the entrance symbol legible without suggesting an open route.
      fill(...rgba(C.windowDark));
      rect(x - 10, y - 15, 20, 26);
      fill(...rgba(C.building));
      rect(x - 8, y - 13, 16, 24);
      fill(...rgba(C.buildingTop, 130));
      rect(x - 8, y - 13, 16, PIXEL_DETAIL);
      fill(...rgba(C.windowDark, 165));
      rect(x - 1, y - 11, PIXEL_DETAIL, 20);
      rect(x - 8, y + 9, 16, PIXEL_EDGE);
      fill(...rgba(C.metal, 180));
      rect(x + 4, y - 2, PIXEL_DETAIL, PIXEL_DETAIL);
    }
  }

  function shopReheatCueActive() {
    return !!(
      model.carrying
      && model.reheatAvailable
      && model.reheatDeparted
      && model.curryHeat <= REHEAT_TRIGGER_MAX_HEAT
      && !model.nightOver
    );
  }

  function drawShop() {
    const p = cellCenter(5, 1);
    const pickupScale = shopPickupReactionScale();
    const rushScale = townRushReactionForBuilding(5, 1);
    const shopSX = pickupScale.sx * rushScale.sx;
    const shopSY = pickupScale.sy * rushScale.sy;
    const reheatCueActive = shopReheatCueActive();
    const reheatCuePulse = reheatCueActive
      ? 0.5 + 0.5 * Math.sin(model.time * 5.1)
      : 0;

    pushMatrix();
    translate(p.x, p.y);
    scale(shopSX, shopSY);
    translate(-p.x, -p.y);

    // Departure shop: this is the player's home base, so it is the one small
    // building allowed to break the ordinary facade rhythm.  The silhouette,
    // open entrance and food sign must still read when the courier stands in
    // front of it at the start of a round.
    noStroke();

    // Broader stepped footing shadow keeps the shop planted on the road and
    // adds depth without ringing the whole facade with a box outline.
    fill(...rgba(C.roadSeam, 172));
    rect(p.x - 25, p.y - 18, 52, 3);
    fill(...rgba(C.roadSeam, 205));
    rect(p.x - 27, p.y - 22, 56, 5);

    // Main wall face. Keep the same cinnamon / cumin construction as the town
    // so the shop is special by hierarchy, not by becoming a different biome.
    // The backing shadow is slightly shifted so it mostly reads on the left and
    // below, instead of forming a thin border on all four sides.
    fill(...rgba(C.roadSeam, 145));
    rect(p.x - 22, p.y - 15, 44, 31);
    fill(...rgba(C.building));
    rect(p.x - 20, p.y - 14, 40, 31);
    fill(...rgba(C.roadSeam, 140));
    rect(p.x - 20, p.y - 14, 3, 31);
    fill(...rgba(C.buildingTop, 58));
    rect(p.x + 18, p.y - 12, PIXEL_EDGE, 27);

    // Distinctive stepped roof: broader and one level taller than ordinary
    // houses, with a turmeric fascia that remains recognizable from a distance.
    fill(...rgba(C.roadSeam, 225));
    rect(p.x - 25, p.y + 17, 50, 3);
    fill(...rgba(C.buildingTop, 225));
    rect(p.x - 21, p.y + 20, 42, PIXEL_EDGE);
    fill(...rgba(C.roadSeam, 165));
    rect(p.x - 15, p.y + 22, 30, PIXEL_DETAIL);
    fill(...rgba(C.amber, 205));
    rect(p.x - 18, p.y + 14, 36, PIXEL_EDGE);

    // Central doorway uses the road colour, so the start point looks like a
    // place the courier has actually stepped out of.  The 2px frame remains
    // visible on both sides even when the character sprite overlaps the centre.
    fill(...rgba(C.windowDark, 235));
    rect(p.x - 9, p.y - 15, 18, 21);
    fill(...rgba(C.road));
    rect(p.x - 7, p.y - 13, 14, 19);
    fill(...rgba(C.buildingTop, 175));
    rect(p.x - 9, p.y - 15, PIXEL_EDGE, 21);
    rect(p.x + 7, p.y - 15, PIXEL_EDGE, 21);
    rect(p.x - 7, p.y + 4, 14, PIXEL_EDGE);

    // A broader striped awning makes the entrance legible as a storefront.
    // Chili appears only as one small panel so the courier remains the main red.
    fill(...rgba(C.roadSeam, 205));
    rect(p.x - 15, p.y + 6, 30, PIXEL_EDGE);
    fill(...rgba(C.amber, 235));
    rect(p.x - 17, p.y + 8, 34, 5);
    fill(...rgba(C.curry, 225));
    rect(p.x - 12, p.y + 8, 5, 5);
    rect(p.x - 2, p.y + 8, 5, 5);
    fill(...rgba(C.chili, 220));
    rect(p.x + 8, p.y + 8, 5, 5);

    // Left service window: warm, but kept below the destination-arrow contrast.
    fill(...rgba(C.windowDark, 225));
    rect(p.x - 19, p.y - 5, 9, 10);
    fill(...rgba(C.windowLight, 165 + reheatCuePulse * 58));
    rect(p.x - 17, p.y - 3, 5, 6);
    fill(...rgba(C.buildingTop, 145));
    rect(p.x - 15, p.y - 3, PIXEL_DETAIL, 6);

    // Food sign on the right.  The cream panel plus tiny curry bowl is the
    // strongest static landmark in the alley and stays visible beside the
    // player's sprite instead of hiding directly behind it.
    fill(...rgba(C.windowDark, 235));
    rect(p.x + 11, p.y - 5, 10, 12);
    fill(...rgba(C.cream, 240));
    rect(p.x + 13, p.y - 3, 6, 8);
    fill(...rgba(C.curry, 235));
    rect(p.x + 13.5, p.y - 1, 5, 2);
    rect(p.x + 14.5, p.y + 1, 3, 1);
    fill(...rgba(C.amber, 205));
    rect(p.x + 14, p.y + 3, 4, PIXEL_DETAIL);

    // Two tiny lamps frame the storefront without competing with the large
    // delivery arrow.  Their position also widens the shop's visual footprint.
    fill(...rgba(C.amber, 165 + reheatCuePulse * 62));
    rect(p.x - 21, p.y + 5, 3, 4);
    rect(p.x + 18, p.y + 5, 3, 4);
    fill(...rgba(C.cream, 70 + reheatCuePulse * 92));
    rect(p.x - 22, p.y + 4, 5, PIXEL_DETAIL);
    rect(p.x + 17, p.y + 4, 5, PIXEL_DETAIL);

    if (model.reheatFxTimer > 0) {
      const life = clamp(model.reheatFxTimer / REHEAT_FX_DURATION, 0, 1);
      const progress = 1 - life;

      drawPixelPopBurst(
        p.x,
        p.y - 2,
        C.amber,
        life,
        4 + Math.round(progress * 7)
      );

      // Tiny stove flash is a stepped block, not a soft oval.
      const flashW = 5 + Math.round(progress * 4);
      drawPixelDot(
        p.x - flashW * 0.5,
        p.y - 8,
        flashW,
        2,
        C.cream,
        170 * life
      );
      drawPixelDot(
        p.x - 2,
        p.y - 6,
        4,
        1,
        C.amber,
        120 * life
      );
    }
    popMatrix();
  }

  function returnPhoneIconCenter() {
    return {
      x: ORDER_GROUP_LEFT + ORDER_GROUP_W * 0.5,
      // Returning home is the next job, so the shop lives in the same upper
      // row that normally holds delivery cards. The lower status row remains.
      y: PHONE_CARD_Y,
    };
  }

  function returnPhoneBuzzOffset() {
    if (!model.returnGuide) return 0;
    const age = model.returnGuide.age;
    if (age < RETURN_BUZZ_START || age >= RETURN_ICON_START) return 0;

    const t = clamp((age - RETURN_BUZZ_START) / RETURN_BUZZ_DURATION, 0, 1);
    // One short tactile-looking buzz: quick oscillation, rapidly damped.
    return Math.sin(t * Math.PI * 4.0) * (1 - t) * 2.4;
  }

  function returnShopIconVisible() {
    return !!model.returnGuide
      && !model.carrying
      && packedActiveTargets().length === 0
      && model.returnGuide.age >= RETURN_ICON_START;
  }

  function drawReturnShopIcon() {
    if (!returnShopIconVisible()) return;

    const age = model.returnGuide.age;
    const t = clamp((age - RETURN_ICON_START) / RETURN_ICON_POP_DURATION, 0, 1);
    const alpha = clamp(t / 0.18, 0, 1);
    const center = returnPhoneIconCenter();

    // Only the existing shop glyph is animated: it slides in, grows slightly
    // past full size, then settles. No card, meter, label, or extra frame.
    const x = center.x + (1 - easeOutCubic(t)) * RETURN_SHOP_ICON_SLIDE;
    const popT = clamp(t / 0.72, 0, 1);
    const settleT = t > 0.72 ? clamp((t - 0.72) / 0.28, 0, 1) : 0;
    const scaleIn = t < 0.72
      ? lerp(0.72, 1.20, easeOutBack(popT))
      : lerp(1.20, 1.00, easeOutCubic(settleT));

    drawShopGlyph(x, center.y, alpha, scaleIn);

    // One brief "shuin" pass across the icon itself. Keep it tiny so the
    // reward beat never becomes a new UI component.
    const shineAge = age - RETURN_ICON_START - RETURN_SHOP_ICON_SHINE_DELAY;
    if (shineAge >= 0) {
      const shineT = clamp(shineAge / RETURN_SHOP_ICON_SHINE_DURATION, 0, 1);
      if (shineT < 1) {
        const localX = lerp(-10, 10, easeOutCubic(shineT));
        const shineAlpha = Math.sin(Math.PI * shineT) * 190 * alpha;
        pushMatrix();
        translate(x + localX * scaleIn, center.y);
        noStroke();
        fill(...rgba(C.cream, shineAlpha));
        rect(-0.8, -6 * scaleIn, 1.6, 12 * scaleIn);
        popMatrix();
      }
    }
  }

  function drawShopGlyph(x, y, alpha = 1, scaleIn = 1) {
    pushMatrix();
    translate(x, y);
    scale(scaleIn);

    noStroke();
    fill(...rgba(C.cream, 235 * alpha));
    rect(-8, -5, 16, 10);
    fill(...rgba(C.building, 235 * alpha));
    rect(-3, -5, 6, 7);

    // Small warm awning: reads as “the shop” rather than a generic home.
    fill(...rgba(C.amber, 245 * alpha));
    rect(-10, 4, 20, 3);
    fill(...rgba(C.curry, 225 * alpha));
    rect(-7, 4, 4, 3);
    rect(3, 4, 4, 3);
    fill(...rgba(C.windowDark, 215 * alpha));
    rect(-6, 4, 2, 3);
    rect(1, 4, 2, 3);
    rect(8, 4, 2, 3);

    popMatrix();
  }

  function returnGuideDestination() {
    const shop = cellCenter(5, 1);
    const shopScreen = worldToScreen(shop.x, shop.y);

    const left = RETURN_GUIDE_EDGE_MARGIN;
    const right = W - RETURN_GUIDE_EDGE_MARGIN;
    const bottom = CONTROL_H + 18;
    const top = BOARD_TOP - 18;

    const visible = shopScreen.x >= left && shopScreen.x <= right
      && shopScreen.y >= bottom && shopScreen.y <= top;

    if (visible) {
      return {
        x: shopScreen.x,
        y: shopScreen.y,
        shopX: shopScreen.x,
        shopY: shopScreen.y,
        visible: true,
        side: null,
      };
    }

    // Intersect the ray from the world-view center toward the shop with the
    // visible play-field edge. This means the guide moves continuously from
    // the edge onto the real shop as the camera brings it into view.
    const center = cameraViewCenter();
    const dx = shopScreen.x - center.x;
    const dy = shopScreen.y - center.y;
    let bestT = 1;
    let side = "bottom";

    const candidates = [];
    if (dx > 0.0001) candidates.push({ t: (right - center.x) / dx, side: "right" });
    else if (dx < -0.0001) candidates.push({ t: (left - center.x) / dx, side: "left" });
    if (dy > 0.0001) candidates.push({ t: (top - center.y) / dy, side: "top" });
    else if (dy < -0.0001) candidates.push({ t: (bottom - center.y) / dy, side: "bottom" });

    for (const candidate of candidates) {
      if (candidate.t >= 0 && candidate.t <= bestT) {
        bestT = candidate.t;
        side = candidate.side;
      }
    }

    const t = clamp(bestT, 0, 1);
    return {
      x: center.x + dx * t,
      y: center.y + dy * t,
      shopX: shopScreen.x,
      shopY: shopScreen.y,
      visible: false,
      side,
    };
  }

  function drawVectorArrow(x, y, dx, dy, alpha = 1, scaleIn = 1) {
    drawPixelVectorArrow(x, y, dx, dy, alpha, scaleIn);
  }


  function drawReturnGuideChevron(side, alpha = 1, scaleIn = 1) {
    const d = Math.max(2, Math.round(3 * scaleIn));
    const size = Math.max(1, Math.round(2 * scaleIn));
    const a = 225 * alpha;

    if (side === "left") {
      drawPixelDot(-d, -1, size, size, C.cream, a);
      drawPixelDot(0, d - 1, size, size, C.cream, a);
      drawPixelDot(0, -d - 1, size, size, C.cream, a);
    } else if (side === "right") {
      drawPixelDot(d - size, -1, size, size, C.cream, a);
      drawPixelDot(-1, d - 1, size, size, C.cream, a);
      drawPixelDot(-1, -d - 1, size, size, C.cream, a);
    } else if (side === "top") {
      drawPixelDot(-1, d - size, size, size, C.cream, a);
      drawPixelDot(-d - 1, -1, size, size, C.cream, a);
      drawPixelDot(d - 1, -1, size, size, C.cream, a);
    } else {
      drawPixelDot(-1, -d, size, size, C.cream, a);
      drawPixelDot(-d - 1, 0, size, size, C.cream, a);
      drawPixelDot(d - 1, 0, size, size, C.cream, a);
    }
  }


  function drawReturnGuideBadge(dest, alpha = 1, scaleIn = 1) {
    const side = dest.side || "bottom";
    const pulse = 0.5 + 0.5 * Math.sin(model.time * 4.4);

    pushMatrix();
    translate(dest.x, dest.y);
    scale(scaleIn);

    const outerW = 30;
    const outerH = 18;
    const offsetX = side === "left" ? 5 : side === "right" ? -5 : 0;
    const offsetY = side === "bottom" ? 4 : side === "top" ? -4 : 0;
    translate(offsetX, offsetY);

    noStroke();
    fill(...rgba(C.windowDark, (82 + pulse * 28) * alpha));
    rect(-outerW * 0.5 + 1, -outerH * 0.5 - 1, outerW, outerH);
    fill(...rgba(C.cream, 220 * alpha));
    rect(-outerW * 0.5, -outerH * 0.5, outerW, outerH);
    fill(...rgba(C.control, 230 * alpha));
    rect(-outerW * 0.5 + 2, -outerH * 0.5 + 2, outerW - 4, outerH - 4);

    // Accent strip: clear enough for a map UI, still matching the game's shop.
    fill(...rgba(C.amber, 235 * alpha));
    rect(-outerW * 0.5 + 2, outerH * 0.5 - 5, outerW - 4, 3);
    fill(...rgba(C.curry, 215 * alpha));
    rect(-outerW * 0.5 + 5, outerH * 0.5 - 5, 5, 3);
    rect(outerW * 0.5 - 10, outerH * 0.5 - 5, 5, 3);

    drawShopGlyph(-4, -1, alpha, 0.68);

    // Outer pointer: the badge acts like a compact map-app callout.
    const chevronX = side === "left" ? -outerW * 0.5 - 6
      : side === "right" ? outerW * 0.5 + 6
      : 0;
    const chevronY = side === "bottom" ? -outerH * 0.5 - 6
      : side === "top" ? outerH * 0.5 + 6
      : 0;
    if (side === "left" || side === "right") {
      pushMatrix();
      translate(chevronX, 0);
      drawReturnGuideChevron(side, alpha, 1.05);
      popMatrix();
    } else {
      pushMatrix();
      translate(0, chevronY);
      drawReturnGuideChevron(side, alpha, 1.05);
      popMatrix();
    }

    // Gentle route hint: a few square dots instead of a continuous line.
    const hintAlpha = (96 + pulse * 55) * alpha;
    if (side === "left") {
      drawPixelDot(-outerW * 0.5 - 2, 0, 2, 1, C.amber, hintAlpha);
    } else if (side === "right") {
      drawPixelDot(outerW * 0.5, 0, 2, 1, C.amber, hintAlpha);
    } else if (side === "top") {
      drawPixelDot(-1, outerH * 0.5, 1, 2, C.amber, hintAlpha);
    } else {
      drawPixelDot(-1, -outerH * 0.5 - 2, 1, 2, C.amber, hintAlpha);
    }

    popMatrix();
  }

  function drawReturnGuideMarker(dest, alpha = 1, scaleIn = 1) {
    if (dest.visible) return;

    // When the restaurant is off screen, show a compact edge badge instead of
    // a floating in-world marker. The shape is explicit enough for map-style
    // UIs, but its awning and colour grammar still belong to this game.
    drawReturnGuideBadge(dest, alpha, scaleIn);
  }

  function drawReturnGuide() {
    if (!model.returnGuide || model.nightOver) return;
    const age = model.returnGuide.age;
    if (age < RETURN_FLIGHT_START) return;

    const flightT = clamp((age - RETURN_FLIGHT_START) / RETURN_ARROW_FLIGHT_DURATION, 0, 1);
    const eased = easeOutCubic(flightT);
    const source = returnPhoneIconCenter();
    const dest = returnGuideDestination();

    // Once the actual restaurant is back inside the play field, the edge guide
    // becomes redundant and gets out of the way completely.
    if (dest.visible) return;

    if (flightT < 1) {
      const x = source.x + (dest.x - source.x) * eased;
      const yLinear = source.y + (dest.y - source.y) * eased;
      const arc = Math.sin(Math.PI * flightT) * 24;
      const y = yLinear + arc;
      const alpha = clamp(flightT / 0.10, 0, 1);
      const dx = dest.shopX - x;
      const dy = dest.shopY - y;

      const prevT = Math.max(0, flightT - 0.07);
      const prevE = easeOutCubic(prevT);
      const px = source.x + (dest.x - source.x) * prevE;
      const py = source.y + (dest.y - source.y) * prevE + Math.sin(Math.PI * prevT) * 24;
      drawPixelTrailSegment(
        px,
        py,
        x,
        y,
        C.amber,
        70 * alpha,
        3,
        1
      );

      drawVectorArrow(x, y, dx, dy, alpha, 0.95);
    } else {
      const settle = clamp((age - RETURN_FLIGHT_START - RETURN_ARROW_FLIGHT_DURATION) / 0.18, 0, 1);
      const pop = 0.82 + 0.18 * easeOutBack(settle);
      drawReturnGuideMarker(dest, 1, pop);
    }
  }

  function drawDestinationPinShape(color, alpha = 1, iconScale = 1) {
    pushMatrix();
    scale(iconScale);

    // Pixel-built map pin: more like a delivery destination than a generic
    // game arrow, while staying legible against the dark street.
    noStroke();
    fill(...rgba(color, 245 * alpha));
    rect(-5, 1, 10, 7);
    rect(-4, -2, 8, 3);
    rect(-2, -5, 4, 3);
    rect(-1, -7, 2, 2);

    // One tiny cream centre gives all three colours the same readable symbol
    // without turning each marker into a multicolour badge.
    fill(...rgba(C.cream, 205 * alpha));
    rect(-1.5, 3, 3, 3);
    popMatrix();
  }

  // ----------------------------------------------------------
  // PIXEL EFFECT PRIMITIVES
  // ----------------------------------------------------------
  // Keep small effects in the same visual language as the map:
  // no smooth ellipses, no hairline vectors, no anti-aliased rings.
  function drawPixelDot(x, y, w, h, color, alpha = 255) {
    noStroke();
    fill(...rgba(color, alpha));
    rect(
      Math.round(x),
      Math.round(y),
      Math.max(1, Math.round(w)),
      Math.max(1, Math.round(h))
    );
  }

  function drawPixelShadowCue(x, y, color, alpha = 1, scaleIn = 1) {
    const spread = Math.max(3, Math.round(6 * scaleIn));
    const inner = Math.max(2, spread - 2);

    // Four stepped rows make a low, flattened pixel shadow/ring.
    drawPixelDot(x - inner, y + 1, inner * 2, 1, color, 25 * alpha);
    drawPixelDot(x - spread, y, spread * 2, 1, color, 48 * alpha);
    drawPixelDot(x - spread + 1, y - 1, (spread - 1) * 2, 1, color, 62 * alpha);
    drawPixelDot(x - inner, y - 2, inner * 2, 1, color, 28 * alpha);
  }

  function drawPixelPopBurst(x, y, color, alpha = 1, spread = 4) {
    const d = Math.max(3, Math.round(spread));
    const aMain = 120 * alpha;
    const aSub = 72 * alpha;

    // Cardinal 2x2 chunks.
    drawPixelDot(x - 1, y + d, 2, 2, color, aMain);
    drawPixelDot(x - 1, y - d - 1, 2, 2, color, aMain);
    drawPixelDot(x - d - 1, y - 1, 2, 2, color, aMain);
    drawPixelDot(x + d, y - 1, 2, 2, color, aMain);

    // Four diagonal single-pixel sparks.
    const diag = Math.max(2, d - 2);
    drawPixelDot(x - diag, y + diag, 1, 1, color, aSub);
    drawPixelDot(x + diag, y + diag, 1, 1, color, aSub);
    drawPixelDot(x - diag, y - diag, 1, 1, color, aSub);
    drawPixelDot(x + diag, y - diag, 1, 1, color, aSub);
  }

  function drawPixelSteamPuff(x, y, color, alpha = 255, flip = 1, blockSize = 3) {
    const rightLeaning = flip >= 0;
    const chunk = Math.max(2, Math.round(blockSize));
    const stepX = chunk - 1;
    const stepY = chunk - 1;

    // One steam glyph is a single chunky zig-zag made from three touching
    // square blocks. The whole glyph flips left/right like < > rather than
    // breaking into separate drifting dots.
    const leftX = x - stepX;
    const rightX = x;
    const y0 = y;
    const y1 = y + stepY;
    const y2 = y + stepY * 2;

    if (rightLeaning) {
      drawPixelDot(leftX, y0, chunk, chunk, color, alpha);
      drawPixelDot(rightX, y1, chunk, chunk, color, alpha * 0.92);
      drawPixelDot(leftX, y2, chunk, chunk, color, alpha * 0.84);
    } else {
      drawPixelDot(rightX, y0, chunk, chunk, color, alpha);
      drawPixelDot(leftX, y1, chunk, chunk, color, alpha * 0.92);
      drawPixelDot(rightX, y2, chunk, chunk, color, alpha * 0.84);
    }
  }

  function drawPixelStampOutline(w, h, color, alpha = 1) {
    const iw = Math.max(20, Math.round(w));
    const ih = Math.max(13, Math.round(h));
    const left = -Math.floor(iw * 0.5);
    const bottom = -Math.floor(ih * 0.5);
    const a = 178 * alpha;

    // Stepped octagonal outline, one pixel thick.
    drawPixelDot(left + 4, bottom + ih - 1, iw - 8, 1, color, a);
    drawPixelDot(left + 4, bottom, iw - 8, 1, color, a);

    drawPixelDot(left + 2, bottom + ih - 2, 2, 1, color, a);
    drawPixelDot(left + 1, bottom + ih - 3, 1, 1, color, a);
    drawPixelDot(left + 2, bottom + 1, 2, 1, color, a);
    drawPixelDot(left + 1, bottom + 2, 1, 1, color, a);

    drawPixelDot(left + iw - 4, bottom + ih - 2, 2, 1, color, a);
    drawPixelDot(left + iw - 2, bottom + ih - 3, 1, 1, color, a);
    drawPixelDot(left + iw - 4, bottom + 1, 2, 1, color, a);
    drawPixelDot(left + iw - 2, bottom + 2, 1, 1, color, a);

    drawPixelDot(left, bottom + 3, 1, ih - 6, color, a);
    drawPixelDot(left + iw - 1, bottom + 3, 1, ih - 6, color, a);
  }

  function drawPixelOctagonFill(
    cx,
    cy,
    w,
    h,
    color,
    alpha = 255,
    corner = 3
  ) {
    const left = Math.round(cx - w * 0.5);
    const bottom = Math.round(cy - h * 0.5);
    const iw = Math.max(4, Math.round(w));
    const ih = Math.max(4, Math.round(h));
    const c = Math.max(
      1,
      Math.min(
        Math.round(corner),
        Math.floor(iw * 0.24),
        Math.floor(ih * 0.24)
      )
    );

    noStroke();
    fill(...rgba(color, alpha));

    // Three stacked rectangular bands create a stepped octagonal silhouette.
    rect(left + c, bottom, iw - c * 2, c);
    rect(left, bottom + c, iw, ih - c * 2);
    rect(left + c, bottom + ih - c, iw - c * 2, c);
  }

  function drawPixelOctagonOutline(
    cx,
    cy,
    w,
    h,
    color,
    alpha = 255,
    thickness = 1,
    corner = 3,
    innerColor = null,
    innerAlpha = 255
  ) {
    drawPixelOctagonFill(cx, cy, w, h, color, alpha, corner);

    const innerW = Math.max(2, w - thickness * 2);
    const innerH = Math.max(2, h - thickness * 2);
    const innerCorner = Math.max(1, corner - thickness);

    if (innerColor) {
      drawPixelOctagonFill(
        cx,
        cy,
        innerW,
        innerH,
        innerColor,
        innerAlpha,
        innerCorner
      );
    } else {
      // When used only as a glow/ring, repaint the centre with the nearest
      // terminal background colour instead of using a smooth vector stroke.
      drawPixelOctagonFill(
        cx,
        cy,
        innerW,
        innerH,
        C.control,
        255,
        innerCorner
      );
    }
  }

  function drawPixelPadArrow(direction, cx, cy, color, alpha = 255) {
    const dot = 2;

    if (direction === "up") {
      drawPixelDot(cx - 1, cy + 3, dot, dot, color, alpha);
      drawPixelDot(cx - 3, cy + 1, dot, dot, color, alpha);
      drawPixelDot(cx + 1, cy + 1, dot, dot, color, alpha);
    } else if (direction === "down") {
      drawPixelDot(cx - 1, cy - 4, dot, dot, color, alpha);
      drawPixelDot(cx - 3, cy - 2, dot, dot, color, alpha);
      drawPixelDot(cx + 1, cy - 2, dot, dot, color, alpha);
    } else if (direction === "left") {
      drawPixelDot(cx - 4, cy - 1, dot, dot, color, alpha);
      drawPixelDot(cx - 2, cy + 1, dot, dot, color, alpha);
      drawPixelDot(cx - 2, cy - 3, dot, dot, color, alpha);
    } else if (direction === "right") {
      drawPixelDot(cx + 2, cy - 1, dot, dot, color, alpha);
      drawPixelDot(cx, cy + 1, dot, dot, color, alpha);
      drawPixelDot(cx, cy - 3, dot, dot, color, alpha);
    }
  }

  function drawPixelChevronDown(cx, cy, color, alpha = 255) {
    drawPixelDot(cx - 4, cy + 2, 2, 2, color, alpha);
    drawPixelDot(cx + 2, cy + 2, 2, 2, color, alpha);
    drawPixelDot(cx - 1, cy - 1, 2, 2, color, alpha);
  }

  function drawPixelTrailSegment(
    x0,
    y0,
    x1,
    y1,
    color,
    alpha = 255,
    step = 3,
    size = 1
  ) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);

    if (len < 0.01) {
      drawPixelDot(x0, y0, size, size, color, alpha);
      return;
    }

    const count = Math.max(1, Math.floor(len / Math.max(1, step)));
    for (let i = 0; i <= count; i += 1) {
      const t = i / count;
      drawPixelDot(
        x0 + dx * t - size * 0.5,
        y0 + dy * t - size * 0.5,
        size,
        size,
        color,
        alpha
      );
    }
  }

  function drawPixelVectorArrow(x, y, dx, dy, alpha = 1, scaleIn = 1) {
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;

    const shaft = 9 * scaleIn;
    const headBack = 3.5 * scaleIn;
    const headSide = 3.0 * scaleIn;
    const dotSize = Math.max(1, Math.round(1.5 * scaleIn));

    const sx = x - ux * shaft * 0.45;
    const sy = y - uy * shaft * 0.45;
    const tx = x + ux * shaft * 0.55;
    const ty = y + uy * shaft * 0.55;

    drawPixelTrailSegment(
      sx,
      sy,
      tx,
      ty,
      C.amber,
      230 * alpha,
      2.7 * scaleIn,
      dotSize
    );

    // Two square head clusters, not anti-aliased diagonal strokes.
    drawPixelDot(
      tx - ux * headBack + px * headSide - dotSize * 0.5,
      ty - uy * headBack + py * headSide - dotSize * 0.5,
      dotSize,
      dotSize,
      C.amber,
      230 * alpha
    );
    drawPixelDot(
      tx - ux * headBack - px * headSide - dotSize * 0.5,
      ty - uy * headBack - py * headSide - dotSize * 0.5,
      dotSize,
      dotSize,
      C.amber,
      230 * alpha
    );
  }

  function drawPixelWheel(cx, cy, color, alpha = 255) {
    // 9x9 wheel outline built from short orthogonal pixel runs.
    drawPixelDot(cx - 2, cy + 4, 5, 1, color, alpha);
    drawPixelDot(cx - 2, cy - 4, 5, 1, color, alpha);
    drawPixelDot(cx - 4, cy - 2, 1, 5, color, alpha);
    drawPixelDot(cx + 4, cy - 2, 1, 5, color, alpha);

    drawPixelDot(cx - 3, cy + 3, 2, 1, color, alpha);
    drawPixelDot(cx + 2, cy + 3, 2, 1, color, alpha);
    drawPixelDot(cx - 3, cy - 3, 2, 1, color, alpha);
    drawPixelDot(cx + 2, cy - 3, 2, 1, color, alpha);
  }

  function drawDestinationGroundCue(x, y, color, alpha = 1, scaleIn = 1) {
    drawPixelShadowCue(x, y - 1, color, alpha, scaleIn);
  }

  function destinationBuildingForTarget(target) {
    // New targets carry an explicit house identity. Keep the old diagonal
    // fallback only for debug/legacy states so a stale saved frame cannot break
    // rendering while the live game always uses the house-first assignment.
    if (target && target.buildingC != null && target.buildingR != null) {
      return [target.buildingC, target.buildingR];
    }
    const candidates = [
      [target.c - 1, target.r + 1],
      [target.c + 1, target.r + 1],
      [target.c - 1, target.r - 1],
      [target.c + 1, target.r - 1],
    ].filter(([c, r]) => inGrid(c, r) && c % 2 === 0 && r % 2 === 0);
    if (!candidates.length) return null;
    return candidates[(Math.max(1, target.orderSlot || 1) - 1) % candidates.length];
  }

  function drawDestinationBuildingCues() {
    for (const target of model.activeTargets) {
      if (target.delivered || !target.markerReady) continue;
      const building = destinationBuildingForTarget(target);
      if (!building) continue;
      const [bc, br] = building;
      const p = cellCenter(bc, br);
      const color = deliverySlotColor(target.orderSlot);
      const popT = clamp((target.markerPopAge ?? ORDER_MARKER_POP_DURATION) / ORDER_MARKER_POP_DURATION, 0, 1);
      const alpha = clamp(popT / 0.35, 0, 1);

      // A tiny lit threshold/window accent sits on the facade side facing the
      // road pin. Horizontal pins get a vertical accent, while above/below pins
      // retain the small horizontal accent used before.
      const dc = target.c - bc;
      const dr = target.r - br;
      noStroke();
      if (Math.abs(dc) > Math.abs(dr)) {
        const facingX = dc > 0 ? 8 : -11;
        fill(...rgba(color, 72 * alpha));
        rect(p.x + facingX, p.y - 6, 3, 12);
        fill(...rgba(C.cream, 42 * alpha));
        rect(p.x + facingX + 1, p.y - 4, 1, 8);
      } else {
        const facingY = dr >= 0 ? 8 : -8;
        fill(...rgba(color, 72 * alpha));
        rect(p.x - 6, p.y + facingY, 12, 3);
        fill(...rgba(C.cream, 42 * alpha));
        rect(p.x - 4, p.y + facingY + 1, 8, 1);
      }
    }
  }

  function drawTarget(target, index) {
    if (!target.markerReady) return;

    const base = cellCenter(target.c, target.r);
    const color = deliverySlotColor(target.orderSlot);
    const popT = clamp((target.markerPopAge ?? ORDER_MARKER_POP_DURATION) / ORDER_MARKER_POP_DURATION, 0, 1);
    const pop = easeOutBack(popT);
    const isExpected = model.deliveryOrderMode
      && model.deliveryOrderSequenceEnforced
      && expectedDeliveryTarget() === target;
    const focusPulse = isExpected ? 0.5 + 0.5 * Math.sin(model.time * 5.2 + index * 0.4) : 0;
    const iconScale = (0.72 + 0.28 * pop) * (isExpected ? 1.06 + focusPulse * 0.08 : 1);
    const alpha = clamp(popT / 0.35, 0, 1);
    const settledBob = popT >= 1
      ? Math.sin(model.time * 3.2 + index * 0.7) * (isExpected ? 1.7 : 0.65)
      : 0;
    const focusLift = isExpected ? 1.5 + focusPulse * 1.6 : 0;
    const y = base.y + TARGET_ARROW_REST_Y + settledBob + focusLift;

    drawDestinationGroundCue(
      base.x,
      base.y,
      color,
      alpha,
      (0.76 + 0.24 * pop) * (isExpected ? 1.05 + focusPulse * 0.08 : 1)
    );

    pushMatrix();
    translate(base.x, y);
    drawDestinationPinShape(color, alpha, iconScale);
    popMatrix();

    // Arrival cue stays in the same pixel vocabulary as the pin itself.
    if (popT < 1) {
      const life = 1 - popT;
      const spread = 3 + Math.round(popT * 5);
      drawPixelPopBurst(base.x, base.y - 1, color, life, spread);
    }
  }

  function drawTargetExitFx() {
    for (const fx of model.targetExitFx) {
      const p = cellCenter(fx.c, fx.r);
      const t = clamp(fx.age / fx.duration, 0, 1);
      const sink = easeInCubic(t);
      const alpha = 1 - t * t;
      const iconScale = 1 - 0.52 * t;
      const y = p.y + TARGET_ARROW_REST_Y - TARGET_EXIT_DISTANCE * sink;
      const color = deliverySlotColor(fx.slot || 1);

      drawDestinationGroundCue(p.x, p.y, color, alpha, 1 - 0.3 * t);

      pushMatrix();
      translate(p.x, y);
      drawDestinationPinShape(color, alpha, iconScale);
      popMatrix();
    }
  }

  function drawGarbage() {
    for (const g of model.garbage) {
      const p = cellCenter(g.c, g.r);
      const appear = clamp(g.age / 0.25, 0, 1);
      const pop = 0.74 + 0.26 * easeOutCubic(appear);
      const sprite = garbageSprites[g.variant ?? 0];

      // New bags do not simply fade in: they drop in from a little above and
      // land with a compact "thud".
      let lift = 0;
      let squashX = 1;
      let squashY = 1;
      if (g.age < 0.15) {
        const t = g.age / 0.15;
        lift = lerp(14, 0, easeInCubic(t));
      } else if (g.age < 0.26) {
        const t = (g.age - 0.15) / 0.11;
        const impact = Math.sin(t * Math.PI);
        lift = -impact * 1.2;
        squashX = 1 + impact * 0.12;
        squashY = 1 - impact * 0.16;
      } else if (g.age < 0.34) {
        const t = (g.age - 0.26) / 0.08;
        lift = Math.sin(t * Math.PI) * 1.2;
      }

      // Authored sprite gets a low pixel shadow only.
      drawPixelShadowCue(
        p.x,
        p.y + GARBAGE_GROUND_Y,
        C.windowDark,
        0.78 * appear,
        1.28 * pop * (1 + (squashX - 1) * 0.42)
      );

      if (sprite && sprite.complete && sprite.naturalWidth) {
        const size = GARBAGE_SPRITE_SIZE * pop;
        const sizeX = size * squashX;
        const sizeY = size * squashY;
        const groundY = p.y + GARBAGE_GROUND_Y + lift;
        withCanvasContext((ctx) => {
          ctx.imageSmoothingEnabled = false;
          ctx.globalAlpha *= appear;
          // Codea Lite world space is y-up. Flip from the image's bottom edge
          // so all three source canvases share the same ground anchor.
          ctx.translate(p.x, groundY + sizeY);
          ctx.scale(1, -1);
          ctx.drawImage(sprite, -sizeX * 0.5, 0, sizeX, sizeY);
        });
        continue;
      }

      // Loading fallback is also a tiny pixel bag, never an ellipse.
      const a = 220 * appear;
      const w = Math.max(8, Math.round(13 * pop * squashX));
      const bodyH = Math.max(7, Math.round(7 * squashY));
      const topH = Math.max(2, Math.round(2 * squashY));
      const baseY = p.y + lift;
      noStroke();
      fill(...rgba(C.dim, a));
      rect(p.x - w * 0.5 + 2, baseY - 7, w - 4, topH);
      rect(p.x - w * 0.5, baseY - 4, w, bodyH);
      rect(p.x - w * 0.5 + 2, baseY + 4, w - 4, topH);

      fill(...rgba(C.cream, 190 * appear));
      rect(p.x - 2, baseY + 7, 4, 2);
    }
  }

  const CAT_SPRITE_PIXEL_SIZE = 1;

  // Cat appearance variants share the exact same 0101 animation frames.
  // Only the indexed body color changes, so every new animation state
  // automatically works for all cats.
  const CAT_VARIANTS = Object.freeze([
    { id: "brown",  body: [164, 109, 62], outline: null },
    { id: "gray",   body: [126, 120, 108], outline: null },
    { id: "black",  body: [49, 43, 38], outline: [167, 142, 116] },
    { id: "cream",  body: [215, 188, 139], outline: null },
  ]);

  function randomCatVariant(excludeId = null) {
    const choices = excludeId
      ? CAT_VARIANTS.filter((variant) => variant.id !== excludeId)
      : CAT_VARIANTS;
    const pool = choices.length ? choices : CAT_VARIANTS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function catVariantBody(cat) {
    const variant = CAT_VARIANTS.find((item) => item.id === cat.variant);
    return variant ? variant.body : C.cat;
  }

  function catVariantOutline(cat) {
    const variant = CAT_VARIANTS.find((item) => item.id === cat.variant);
    return variant && variant.outline ? variant.outline : C.roadSeam;
  }

  function drawIndexedPixelFrame(frame, palette, centerX, groundY, pixelSize = 1, mirror = false) {
    if (!frame || !frame.length) return;
    const rows = frame.length;
    const cols = frame[0].length;
    const w = cols * pixelSize;

    noStroke();
    for (let row = 0; row < rows; row += 1) {
      const sourceRow = frame[row];
      for (let col = 0; col < cols; col += 1) {
        const index = sourceRow[col];
        if (!index) continue;
        const color = palette[index];
        if (!color) continue;

        const drawCol = mirror ? cols - 1 - col : col;
        const x = Math.round(centerX - w * 0.5 + drawCol * pixelSize);
        // 0101 rows are top-down. Game world coordinates are y-up, so anchor
        // the last row at groundY and build upward.
        const y = Math.round(groundY + (rows - 1 - row) * pixelSize);
        fill(...rgba(color));
        rect(x, y, pixelSize, pixelSize);
      }
    }
  }

  function catVisualFrame(cat, index) {
    const api = typeof window !== "undefined" ? window.RojiuraCatSprite : null;
    if (!api || !api.frames) return null;

    if (masalaRushActive()) {
      return api.frames.rush || api.frames.walk1;
    }

    if (cat.entryTimer > 0) {
      const phase = Math.floor((model.time + index * 0.09) / CAT_WALK_FRAME_TIME) % 2;
      return phase === 0 ? api.frames.walk1 : api.frames.walk2;
    }

    if (cat.tell > 0 && cat.intentC != null && cat.intentR != null) {
      const elapsed = CAT_TELL_TIME - cat.tell;

      // Briefly sniff toward the chosen direction before the walk begins.
      if (elapsed < CAT_MOVE_PREP_TIME) {
        return api.frames.sniff || api.frames.idle1;
      }

      const walkAge = elapsed - CAT_MOVE_PREP_TIME;
      const phase = Math.floor(walkAge / CAT_WALK_FRAME_TIME) % 2;
      return phase === 0 ? api.frames.walk1 : api.frames.walk2;
    }

    // Idle is intentionally not a constant tail wag. Most of the time the cat
    // stays on idle1, with a short idle2 tail movement every few seconds.
    const idleCycle = (model.time + index * 0.73) % 2.45;
    return idleCycle >= 1.88 && idleCycle < 2.30
      ? api.frames.idle2
      : api.frames.idle1;
  }

  function catVisualMirror(cat, index) {
    if (masalaRushActive()) {
      // Rush excitement reads as a playful left/right flip of the same tall pose.
      return Math.floor((model.time + index * 0.12) / 0.16) % 2 === 1;
    }
    if (cat.entryTimer > 0 && cat.entryToC != null && Math.abs(cat.entryToC - cat.c) > 0.02) {
      cat.visualMirror = cat.entryToC > cat.c;
    } else if (cat.intentC != null && Math.abs(cat.intentC - cat.c) > 0.02) {
      cat.visualMirror = cat.intentC > cat.c;
    } else if (cat.visualMirror == null) {
      // Give multiple cats a little visual variety before either has moved.
      cat.visualMirror = index % 2 === 1;
    }
    return !!cat.visualMirror;
  }

  function drawCat(cat, index) {
    if (!cat.active) return;

    let c = cat.c;
    let r = cat.r;
    if (
      !masalaRushActive()
      && cat.tell > 0
      && cat.intentC != null
      && cat.intentR != null
    ) {
      const elapsed = CAT_TELL_TIME - cat.tell;
      const travelDuration = Math.max(0.01, CAT_TELL_TIME - CAT_MOVE_PREP_TIME);
      const rawTravel = clamp(
        (elapsed - CAT_MOVE_PREP_TIME) / travelDuration,
        0,
        1
      );
      const travel = rawTravel * rawTravel * (3 - 2 * rawTravel);
      c += (cat.intentC - cat.c) * travel;
      r += (cat.intentR - cat.r) * travel;
    }
    if (masalaRushActive()) {
      r += Math.sin(model.time * 8.0 + index * 1.4) * 0.018;
    }

    const p = cellCenter(c, r);
    const garbageJump = masalaRushActive()
      ? masalaGarbageJumpAmountAt(c, r)
      : 0;
    const jumpOffset = garbageJump * CELL * MASALA_GARBAGE_JUMP_HEIGHT;

    // During Masala Rush the cats follow the same rubbish-jump grammar as the
    // courier: body lifts, while the shadow stays planted on the road.
    drawPixelShadowCue(
      p.x,
      p.y - 8,
      C.windowDark,
      0.95 - garbageJump * 0.24,
      1.35 - garbageJump * 0.18
    );

    const catApi = typeof window !== "undefined" ? window.RojiuraCatSprite : null;
    const catFrame = catVisualFrame(cat, index);
    if (catApi && catFrame) {
      drawIndexedPixelFrame(
        catFrame,
        {
          1: catVariantOutline(cat),
          13: catVariantBody(cat),
        },
        p.x,
        p.y - 8 + jumpOffset,
        CAT_SPRITE_PIXEL_SIZE,
        catVisualMirror(cat, index)
      );
    }

  }

  function drawRushCatSparkles() {
    if (!masalaRushActive()) return;

    for (let i = 0; i < model.cats.length; i += 1) {
      const cat = model.cats[i];
      if (!cat.active) continue;

      const party = rushPartyCatPosition(i);
      const p = cellCenter(party.gx, party.gy);
      const pulse = 0.5 + 0.5 * Math.sin(model.time * 6.4 + i * 1.7);

      const s1 = pulse > 0.55 ? 2 : 1;
      drawPixelDot(
        p.x + 7,
        p.y + 7,
        s1,
        s1,
        C.amber,
        55 + pulse * 100
      );
      drawPixelDot(
        p.x + 10,
        p.y + 11,
        1,
        1,
        C.amber,
        45 + pulse * 85
      );
    }
  }

  function drawMasalaRushAura() {
    if (!masalaRushActive() && model.masalaBurstTimer <= 0) return;

    const p = playerVisualPosition();
    const pulse = 0.5 + 0.5 * Math.sin(model.time * 9.0);

    // No ellipse under the courier: use a low stepped pixel cue.
    drawPixelShadowCue(
      p.x,
      p.groundY - 1,
      C.amber,
      0.58 + pulse * 0.50,
      1.15
    );

    // Eight fixed pixel positions. Their brightness cycles rather than
    // physically orbiting on a smooth circular path.
    const motes = [
      [-12,  1], [-9,  8], [-2, 11], [8, 9],
      [ 12,  2], [ 9, -6], [ 1, -9], [-9, -6],
    ];
    for (let i = 0; i < motes.length; i += 1) {
      const [dx, dy] = motes[i];
      const phase = 0.5 + 0.5 * Math.sin(model.time * 8.0 + i * 0.9);
      const size = phase > 0.66 ? 2 : 1;
      drawPixelDot(
        p.x + dx,
        p.bodyY + dy,
        size,
        size,
        C.amber,
        65 + phase * 130
      );
    }

    // Trigger burst expands as discrete pixel clusters, never as a ring.
    if (model.masalaBurstTimer > 0) {
      const t = 1 - model.masalaBurstTimer / MASALA_BURST_DURATION;
      const alpha = 1 - t;
      const spread = 4 + Math.round(t * 11);

      drawPixelPopBurst(p.x, p.groundY + 1, C.cream, alpha, spread);
      drawPixelPopBurst(
        p.x,
        p.groundY + 1,
        C.amber,
        alpha * 0.62,
        Math.max(3, spread - 3)
      );
    }
  }

  function drawBike() {
    if (!bikeVisibleOnScreen()) return;

    const x = gridX(model.bikeGX);
    const y = gridY(BIKE_ROW);

    drawPixelShadowCue(
      x,
      y + BIKE_GROUND_Y,
      C.windowDark,
      0.95,
      1.65
    );

    if (bikeSprite && bikeSprite.complete && bikeSprite.naturalWidth) {
      const height = BIKE_SPRITE_H;
      const width = height * (bikeSprite.naturalWidth / bikeSprite.naturalHeight);
      const groundY = y + BIKE_GROUND_Y;
      withCanvasContext((ctx) => {
        ctx.imageSmoothingEnabled = false;
        // Codea Lite world space is y-up. Flip from the image's bottom edge so
        // the wheel line stays pinned to the road.
        ctx.translate(x, groundY + height);
        ctx.scale(1, -1);
        ctx.drawImage(bikeSprite, -width * 0.5, 0, width, height);
      });
      return;
    }

    // Loading fallback: wheels and frame are all square-pixel constructions.
    drawPixelWheel(x - 7, y - 4, C.bike, 245);
    drawPixelWheel(x + 7, y - 4, C.bike, 245);

    drawPixelTrailSegment(x - 7, y - 4, x, y + 2, C.bike, 245, 2, 1);
    drawPixelTrailSegment(x, y + 2, x + 7, y - 4, C.bike, 245, 2, 1);
    drawPixelTrailSegment(x - 7, y - 4, x + 7, y - 4, C.bike, 225, 2, 1);
    drawPixelTrailSegment(x, y + 2, x + 4, y + 8, C.bike, 245, 2, 1);

    drawPixelDot(x + 2, y + 8, 5, 1, C.bike, 245);
    drawPixelDot(x - 2, y + 1, 4, 2, C.bike, 245);
  }

  function bikeJumpAmount() {
    if (model.bikeJumpTimer <= 0) return 0;
    const progress = 1 - model.bikeJumpTimer / BIKE_JUMP_TIME;
    return Math.sin(clamp(progress, 0, 1) * Math.PI);
  }

  function masalaGarbageJumpAmountAt(gx, gy) {
    if (!masalaRushActive() || !model.garbage.length) return 0;

    let jump = 0;
    for (const garbage of model.garbage) {
      const dx = gx - garbage.c;
      const dy = gy - garbage.r;
      const d = Math.hypot(dx, dy);
      if (d >= MASALA_GARBAGE_JUMP_RADIUS) continue;

      // Zero at the edge of the rubbish cell's approach, highest directly
      // over it, then smoothly back down after crossing.
      const t = 1 - d / MASALA_GARBAGE_JUMP_RADIUS;
      jump = Math.max(jump, Math.sin(t * Math.PI * 0.5));
    }

    return jump;
  }

  function masalaGarbageJumpAmount() {
    return masalaGarbageJumpAmountAt(model.playerGX, model.playerGY);
  }

  function playerVisualPosition() {
    const x = gridX(model.playerGX);
    const groundY = gridY(model.playerGY);
    const runRatio = model.runSpeed / MAX_RUN_SPEED;
    // Keep the same small vertical cadence for every direction. Previously
    // the side views happened to reveal the bob while the front/back frames
    // looked static; tying it to the sprite cadence makes the walk feel like
    // one character rather than four separate animations.
    const bob = Math.sin(model.time * PLAYER_SPRITE_FRAME_RATE * Math.PI)
      * 1.25 * runRatio;
    const bikeJump = bikeJumpAmount();
    const garbageJump = masalaGarbageJumpAmount();
    const jump = Math.max(bikeJump, garbageJump);
    const jumpOffset = Math.max(
      bikeJump * CELL * BIKE_JUMP_HEIGHT,
      garbageJump * CELL * MASALA_GARBAGE_JUMP_HEIGHT
    );

    return {
      x,
      groundY,
      bodyY: groundY + bob + jumpOffset,
      jump,
      garbageJump,
    };
  }

  function drawPlayer() {
    const p = playerVisualPosition();

    drawPixelShadowCue(
      p.x,
      p.groundY - 7,
      C.windowDark,
      (85 - p.jump * 25) / 85,
      0.78 - p.jump * 0.12
    );

    const spriteDrawn = drawPlayerSprite(p);

    if (!spriteDrawn) {
      // Chili belongs to the courier: a moving accent against the still town.
      fill(...rgba(C.chili));
      rect(p.x - 3.5, p.bodyY - 5, 7, 10);
      drawPixelOctagonFill(
        p.x,
        p.bodyY + 7,
        7,
        7,
        C.buildingTop,
        255,
        2
      );
    }

    if (model.carrying) {
      const heat = clamp(model.curryHeat, 0, 100);
      const displayHeat = heat;
      const heatRatio = displayHeat / 100;
      const facing = playerFacing();
      const plateSide = spriteDrawn
        ? (facing === "front" || facing === "left" ? -1 : 1)
        : 1;

      // The plate itself quietly loses saturation as it cools. More important,
      // the steam count steps down with the same thresholds used by gameplay.
      if (!spriteDrawn) {
        fill(...rgba(C.cream));
        rect(p.x, p.bodyY, 9, 3);
        rect(p.x + 2, p.bodyY + 3, 5, 1);

        fill(
          C.building[0] + (C.curry[0] - C.building[0]) * heatRatio,
          C.building[1] + (C.curry[1] - C.building[1]) * heatRatio,
          C.building[2] + (C.curry[2] - C.building[2]) * heatRatio,
          255
        );
        rect(p.x + 2, p.bodyY + 1, 5, 2);
      }

      const steamCount = heat >= 70 ? 3 : heat >= 40 ? 2 : heat >= 30 ? 1 : 0;
      for (let i = 0; i < steamCount; i += 1) {
        const phase = (model.time * 0.95 + i * 0.31) % 1;
        const alpha = Math.sin(phase * Math.PI) * (70 + heatRatio * 80);
        const sx = Math.round(p.x + plateSide * (3 + i * 2.2));
        const sy = Math.round(p.bodyY + 4 + phase * 6);
        drawPixelSteamPuff(
          sx,
          sy,
          C.cream,
          alpha,
          plateSide >= 0 ? 1 : -1
        );
      }
    }

    drawReheatFx(p, spriteDrawn);
    drawSweat(p);
    drawBikeImpact(p);
  }

  function drawReheatFx(p, spriteDrawn = false) {
    if (model.reheatFxTimer <= 0) return;
    const life = clamp(model.reheatFxTimer / REHEAT_FX_DURATION, 0, 1);
    const progress = 1 - life;

    // A compact pixel "boff" of heat at the plate.
    const facing = playerFacing();
    const plateSide = spriteDrawn
      ? (facing === "front" || facing === "left" ? -1 : 1)
      : 1;

    const burstSpread = 3 + Math.round(progress * 7);
    drawPixelPopBurst(
      p.x + plateSide * 4,
      p.bodyY + 1,
      C.amber,
      life,
      burstSpread
    );

    for (let i = 0; i < 3; i += 1) {
      const phase = clamp(progress * 1.25 - i * 0.12, 0, 1);
      if (phase <= 0 || phase >= 1) continue;
      const alpha = Math.sin(phase * Math.PI) * 155;
      const sx = Math.round(p.x + plateSide * (1 + i * 3));
      const sy = Math.round(p.bodyY + 5 + phase * 11);
      drawPixelSteamPuff(
        sx,
        sy,
        C.cream,
        alpha,
        plateSide >= 0 ? 1 : -1
      );
    }
  }

  function drawSweat(p) {
    if (!model.carrying || model.curryHeat >= 40) return;

    const urgency = model.curryHeat < 30 ? 1 : 0;
    const count = urgency ? 2 : 1;

    for (let i = 0; i < count; i += 1) {
      const phase = i === 0 ? 0 : 0.48;
      const side = i === 0 ? 1 : -1;
      const t = (model.time * (1.75 + urgency * 1.15) + phase) % 1;
      if (t > 0.72) continue;

      const life = 1 - t / 0.72;
      const travel = t / 0.72;
      const x = p.x + side * CELL * (0.14 + 0.12 * travel);
      const y = p.bodyY + CELL * (0.28 + 0.08 * travel - 0.12 * travel * travel);

      // Tiny two-cell sweat drop.
      drawPixelDot(x, y, 2, 2, C.cream, 185 * life);
      drawPixelDot(x + side, y - 2, 1, 1, C.cream, 130 * life);
    }
  }

  function drawBikeImpact(p) {
    if (model.bikeImpactTimer <= 0) return;

    const life = model.bikeImpactTimer / 0.68;
    const progress = 1 - life;
    const spread = 5 + Math.round(progress * 12);

    drawPixelPopBurst(
      p.x,
      p.bodyY,
      C.cream,
      life,
      spread
    );
  }

  function drawSmoke() {
    for (const p of model.smoke) {
      const life = 1 - p.age / p.life;
      const size = Math.max(1, Math.round(2 + p.age * 2.2));

      // Smoke breaks into square clusters rather than soft circular blobs.
      drawPixelDot(
        p.x - size * 0.5,
        p.y - size * 0.5,
        size,
        size,
        C.cream,
        42 * life
      );

      if (size >= 3) {
        drawPixelDot(
          p.x + size * 0.5,
          p.y + size * 0.35,
          Math.max(1, size - 2),
          Math.max(1, size - 2),
          C.cream,
          24 * life
        );
      }
    }
  }


  // Scent remains in the simulation for cat behaviour, but it has no direct
  // ground rendering. The only player-facing scent cue is drawCarryAroma().

  function drawCarryAroma() {
    for (const p of model.aroma) {
      if (p.age < 0) continue;

      const t = clamp(p.age / p.life, 0, 1);
      const appear = clamp(t / 0.10, 0, 1);
      const dissolve = Math.pow(1 - t, 1.55);
      const fade = appear * dissolve;
      const color =
        p.tone === "cream"
          ? C.cream
          : p.tone === "curry"
            ? C.curry
            : C.amber;
      const alpha = (p.tone === "cream" ? 82 : 104) * fade;

      const curl = Math.sin(p.phase + p.age * 8.5) * 1.2 * (1 - t);
      const baseSize = Math.max(1, Math.round(p.size * (0.52 + t * 0.35)));

      // Three discrete pixels climb and sidestep like a scent wisp.
      drawPixelDot(
        p.x + curl - baseSize * 0.5,
        p.y - baseSize * 0.5,
        baseSize,
        baseSize,
        color,
        alpha
      );

      if (t > 0.14) {
        drawPixelDot(
          p.x - 1 + curl * 0.5,
          p.y + 3 + t * 2,
          Math.max(1, baseSize - 1),
          Math.max(1, baseSize - 1),
          color,
          alpha * 0.62
        );
      }

      if (t > 0.34 && t < 0.82) {
        drawPixelDot(
          p.x + 1 - curl * 0.25,
          p.y + 6 + t * 3,
          1,
          1,
          color,
          alpha * 0.42
        );
      }
    }
  }


  // ----------------------------------------------------------
  // SHARED PIXEL FONT — LATIN + KATAKANA + NUMERALS
  // ----------------------------------------------------------
  // Digits deliberately retain the original 3x5 score shapes. Latin and
  // Katakana use a related 5x7 construction so every piece of visible game
  // text belongs to the same low-resolution world instead of falling back to
  // a system font. English can therefore use the exact same renderer later.
  const PIXEL_FONT_GLYPHS = {
    " ": ["00"],
    "+": ["010", "010", "111", "010", "010"],
    "-": ["000", "000", "111", "000", "000"],
    "¥": ["101", "101", "010", "111", "010"],
    "/": ["001", "001", "010", "100", "100"],
    "×": ["101", "101", "010", "101", "101"],
    "!": ["1", "1", "1", "1", "0", "1", "0"],
    "！": ["1", "1", "1", "1", "0", "1", "0"],
    "'": ["1", "1", "0", "0", "0", "0", "0"],
    "?": ["111", "001", "001", "010", "010", "000", "010"],
    ".": ["0", "0", "0", "0", "0", "1", "0"],
    ",": ["0", "0", "0", "0", "0", "1", "1"],
    ":": ["0", "1", "0", "0", "1", "0", "0"],
    "・": ["0", "0", "0", "1", "0", "0", "0"],
    "ー": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],

    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"],
    "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"],

    "A": ["01110","10001","10001","11111","10001","10001","10001"],
    "B": ["11110","10001","10001","11110","10001","10001","11110"],
    "C": ["01111","10000","10000","10000","10000","10000","01111"],
    "D": ["11110","10001","10001","10001","10001","10001","11110"],
    "E": ["11111","10000","10000","11110","10000","10000","11111"],
    "F": ["11111","10000","10000","11110","10000","10000","10000"],
    "G": ["01111","10000","10000","10111","10001","10001","01111"],
    "H": ["10001","10001","10001","11111","10001","10001","10001"],
    "I": ["11111","00100","00100","00100","00100","00100","11111"],
    "J": ["00111","00010","00010","00010","10010","10010","01100"],
    "K": ["10001","10010","10100","11000","10100","10010","10001"],
    "L": ["10000","10000","10000","10000","10000","10000","11111"],
    "M": ["10001","11011","10101","10101","10001","10001","10001"],
    "N": ["10001","11001","10101","10011","10001","10001","10001"],
    "O": ["01110","10001","10001","10001","10001","10001","01110"],
    "P": ["11110","10001","10001","11110","10000","10000","10000"],
    "Q": ["01110","10001","10001","10001","10101","10010","01101"],
    "R": ["11110","10001","10001","11110","10100","10010","10001"],
    "S": ["01111","10000","10000","01110","00001","00001","11110"],
    "T": ["11111","00100","00100","00100","00100","00100","00100"],
    "U": ["10001","10001","10001","10001","10001","10001","01110"],
    "V": ["10001","10001","10001","10001","10001","01010","00100"],
    "W": ["10001","10001","10001","10101","10101","10101","01010"],
    "X": ["10001","10001","01010","00100","01010","10001","10001"],
    "Y": ["10001","10001","01010","00100","00100","00100","00100"],
    "Z": ["11111","00001","00010","00100","01000","10000","11111"],

    // Katakana. The deliberately chunky diagonals echo the 3x5 score digits.
    "ア": ['11111','00001','00110','00100','00100','01000','10000'],
    "イ": ["00010","00100","01000","10100","00100","00100","00100"],
    "ウ": ["00100","11111","10001","00001","00010","00100","11000"],
    "エ": ["11111","00100","00100","00100","00100","00100","11111"],
    "オ": ['00010','00010','11111','00010','00110','01010','10010'],
    "カ": ["01000","11110","01010","01010","10010","10010","00100"],
    "キ": ['00100','11111','00100','11111','00100','00100','00100'],
    "ク": ["01000","01111","10001","00010","00100","01000","10000"],
    "ケ": ['01000','01111','01010','10010','00010','00100','01000'],
    "コ": ["11111","00001","00001","00001","00001","00001","11111"],
    "サ": ["01010","11111","01010","01010","00010","00100","11000"],
    "シ": ['00000','11001','00001','11001','00001','00010','11100'],
    "ス": ["11110","00010","00100","01000","10100","10010","10001"],
    "セ": ["01000","11111","01001","01010","01100","01000","00111"],
    "ソ": ['00000','10000','01001','00010','00100','01000','00000'],
    "タ": ['01000','11110','10010','01010','00100','01000','10000'],
    "チ": ['00011','11100','00100','11111','00100','01000','10000'],
    "ツ": ['10100','10100','00001','00001','00010','00100','11000'],
    "テ": ["11111","00000","11111","00100","00100","01000","10000"],
    "ト": ["10000","10000","11100","10010","10001","10000","10000"],
    "ナ": ["00100","11111","00100","00100","01000","01000","10000"],
    "ニ": ["00000","11111","00000","00000","00000","00000","11111"],
    "ヌ": ['00000','11111','00001','01010','00100','01010','10001'],
    "ネ": ["00100","11111","00010","01100","10100","00110","00101"],
    "ノ": ["00001","00001","00010","00100","01000","10000","00000"],
    "ハ": ["01010","01010","01010","10001","10001","10001","00000"],
    "ヒ": ['10000','10000','11111','10000','10000','10001','01110'],
    "フ": ["11111","00001","00010","00100","01000","10000","00000"],
    "ヘ": ['00000','00000','00100','01010','10010','00001','00001'],
    "ホ": ["00100","11111","00100","10101","10101","00100","00100"],
    "マ": ["11111","00001","01010","00100","00100","00010","00001"],
    "ミ": ["11100","00011","00000","11100","00011","00000","11111"],
    "ム": ["00100","00100","01000","01000","10001","11111","00001"],
    "メ": ['00000','00001','00001','01010','00100','01010','10001'],
    "モ": ["11111","00100","00100","11111","00100","00100","00011"],
    "ヤ": ["01000","11111","01001","01010","01100","01000","01000"],
    "ユ": ["00000","11110","00010","00010","00010","00010","11111"],
    "ヨ": ["11111","00001","11111","00001","00001","00001","11111"],
    "ラ": ["11111","00000","11111","00001","00010","00100","11000"],
    "リ": ["10001","10001","10001","10001","00010","00100","11000"],
    "ル": ['00000','00100','10100','10100','10101','10110','10100'],
    "レ": ["10000","10000","10000","10001","10010","10100","11000"],
    "ロ": ["11111","10001","10001","10001","10001","10001","11111"],
    "ワ": ["11111","10001","00001","00010","00100","01000","10000"],
    "ヲ": ["11111","00001","11111","00001","00010","00100","11000"],
    "ン": ['10000','01001','00001','00001','00010','00100','11000'],

    "ァ": ['00000','01110','00010','00110','00100','01000','00000'],
    "ィ": ["00000","00010","00100","01000","00100","00100","00000"],
    "ゥ": ["00000","00100","01110","01010","00010","00100","00000"],
    "ェ": ["00000","00000","01110","00100","00100","01110","00000"],
    "ォ": ["00000","00100","01110","00110","01100","00100","00000"],
    "ャ": ['00000','00000','00100','01111','00101','00100','00100'],
    "ュ": ["00000","00000","01100","00100","00100","01110","00000"],
    "ョ": ["00000","00000","01110","00010","01110","00010","01110"],
    "ッ": ['00000','00000','10100','00001','00010','00100','01000'],
  };

  const PIXEL_KATAKANA_MARKS = {
    "ガ": ["カ", "dakuten"], "ギ": ["キ", "dakuten"], "グ": ["ク", "dakuten"], "ゲ": ["ケ", "dakuten"], "ゴ": ["コ", "dakuten"],
    "ザ": ["サ", "dakuten"], "ジ": ["シ", "dakuten"], "ズ": ["ス", "dakuten"], "ゼ": ["セ", "dakuten"], "ゾ": ["ソ", "dakuten"],
    "ダ": ["タ", "dakuten"], "ヂ": ["チ", "dakuten"], "ヅ": ["ツ", "dakuten"], "デ": ["テ", "dakuten"], "ド": ["ト", "dakuten"],
    "バ": ["ハ", "dakuten"], "ビ": ["ヒ", "dakuten"], "ブ": ["フ", "dakuten"], "ベ": ["ヘ", "dakuten"], "ボ": ["ホ", "dakuten"],
    "パ": ["ハ", "handakuten"], "ピ": ["ヒ", "handakuten"], "プ": ["フ", "handakuten"], "ペ": ["ヘ", "handakuten"], "ポ": ["ホ", "handakuten"],
    "ヴ": ["ウ", "dakuten"],
  };

  function pixelFontGlyph(ch) {
    const direct = PIXEL_FONT_GLYPHS[ch] || PIXEL_FONT_GLYPHS[String(ch).toUpperCase()];
    if (direct) return { rows: direct, width: direct[0].length };

    const marked = PIXEL_KATAKANA_MARKS[ch];
    if (!marked) return { rows: PIXEL_FONT_GLYPHS["?"], width: 3 };

    const base = PIXEL_FONT_GLYPHS[marked[0]];
    const rows = base.map((row) => row + "00");
    if (marked[1] === "dakuten") {
      rows[0] = rows[0].slice(0, 5) + "10";
      rows[1] = rows[1].slice(0, 5) + "01";
    } else {
      rows[0] = rows[0].slice(0, 5) + "01";
      rows[1] = rows[1].slice(0, 5) + "10";
      rows[2] = rows[2].slice(0, 5) + "01";
    }
    return { rows, width: 7 };
  }

  function pixelTextWidth(textValue, pixel = 1.8, tracking = 1) {
    const chars = Array.from(String(textValue));
    if (!chars.length) return 0;
    let width = 0;
    chars.forEach((ch, index) => {
      width += pixelFontGlyph(ch).width * pixel;
      if (index < chars.length - 1) width += tracking * pixel;
    });
    return width;
  }

  function fitPixelSize(textValue, desiredPixel, maxWidth, tracking = 1, minPixel = 0.72) {
    const naturalWidth = pixelTextWidth(textValue, desiredPixel, tracking);
    if (naturalWidth <= maxWidth || naturalWidth <= 0) return desiredPixel;
    return Math.max(minPixel, desiredPixel * (maxWidth / naturalWidth));
  }

  const PIXEL_MONO_CELL = 7;

  function pixelMonoTextWidth(textValue, pixel = 1.8) {
    const chars = Array.from(String(textValue));
    if (!chars.length) return 0;
    return chars.length * PIXEL_MONO_CELL * pixel;
  }

  function fitPixelMonoSize(textValue, desiredPixel, maxWidth, minPixel = 0.72) {
    const naturalWidth = pixelMonoTextWidth(textValue, desiredPixel);
    if (naturalWidth <= maxWidth || naturalWidth <= 0) return desiredPixel;
    return Math.max(minPixel, desiredPixel * (maxWidth / naturalWidth));
  }

  function drawPixelTextMono(textValue, x, y, color, alpha = 1, pixel = 1.8, align = "center") {
    const chars = Array.from(String(textValue));
    const totalW = pixelMonoTextWidth(textValue, pixel);
    let cursorX = align === "left" ? x : align === "right" ? x - totalW : x - totalW * 0.5;

    noStroke();
    fill(...rgba(color, 235 * alpha));

    for (const ch of chars) {
      const glyph = pixelFontGlyph(ch);
      const rows = glyph.rows;

      // Center narrower 3x5 digits / symbols inside the same 7-column cell.
      const offsetX = Math.max(0, (PIXEL_MONO_CELL - glyph.width) * 0.5) * pixel;

      for (let row = 0; row < rows.length; row += 1) {
        for (let col = 0; col < rows[row].length; col += 1) {
          if (rows[row][col] !== "1") continue;
          rect(
            cursorX + offsetX + col * pixel,
            y + (rows.length - 1 - row) * pixel,
            pixel,
            pixel
          );
        }
      }

      cursorX += PIXEL_MONO_CELL * pixel;
    }
  }

  function drawPixelText(textValue, x, y, color, alpha = 1, pixel = 1.8, align = "center", tracking = 1) {
    const chars = Array.from(String(textValue));
    const totalW = pixelTextWidth(textValue, pixel, tracking);
    let cursorX = align === "left" ? x : align === "right" ? x - totalW : x - totalW * 0.5;

    noStroke();
    fill(...rgba(color, 235 * alpha));

    for (let i = 0; i < chars.length; i += 1) {
      const glyph = pixelFontGlyph(chars[i]);
      const rows = glyph.rows;
      for (let row = 0; row < rows.length; row += 1) {
        for (let col = 0; col < rows[row].length; col += 1) {
          if (rows[row][col] !== "1") continue;
          rect(cursorX + col * pixel, y + (rows.length - 1 - row) * pixel, pixel, pixel);
        }
      }
      cursorX += glyph.width * pixel + (i < chars.length - 1 ? tracking * pixel : 0);
    }
  }

  // Compatibility wrappers keep the original score sizing and call sites.
  function pixelScoreWidth(textValue, pixel = 1.8) {
    return pixelTextWidth(textValue, pixel, 1);
  }

  function drawPixelScore(textValue, x, y, color, alpha = 1, pixel = 1.8) {
    drawPixelText(textValue, x, y, color, alpha, pixel, "center", 1);
  }

  // ----------------------------------------------------------
  // FONT DEBUG / GLYPH AUDIT
  // ----------------------------------------------------------
  // The little system-font label under each cell exists ONLY in this debug
  // scene. It is a reference label so malformed custom glyphs can be identified
  // unambiguously; normal game scenes continue to use the custom pixel font only.
  const FONT_DEBUG_PAGES = [
    {
      title: "USER REVISED",
      chars: Array.from("オキシヌメルャエケソチヘ"),
    },
    {
      title: "KATAKANA",
      chars: Array.from(
        "アイウエオ" +
        "カキクケコ" +
        "サシスセソ" +
        "タチツテト" +
        "ナニヌネノ" +
        "ハヒフヘホ" +
        "マミムメモ" +
        "ヤユヨ" +
        "ラリルレロ" +
        "ワヲン" +
        "ァィゥェォャュョッー"
      ),
    },
    {
      title: "DAKUTEN / MARKS",
      chars: Array.from(
        "ガギグゲゴ" +
        "ザジズゼゾ" +
        "ダヂヅデド" +
        "バビブベボ" +
        "パピプペポ" +
        "ヴ" +
        "・！？ー×+-/¥.,:'?"
      ),
    },
    {
      title: "LATIN / NUMBERS",
      chars: Array.from(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
        "0123456789" +
        "!?+-/×¥.,:'"
      ),
    },
  ];

  function drawFontDebugCell(ch, x, y, cellW, cellH) {
    const glyph = pixelFontGlyph(ch);
    const pixel = 3.15;
    const glyphH = glyph.rows.length * pixel;
    const glyphY = y - glyphH * 0.5 + 5;

    noFill();
    stroke(...rgba(C.buildingTop, 42));
    strokeWidth(1);
    rect(x - cellW * 0.5 + 2, y - cellH * 0.5 + 2, cellW - 4, cellH - 4);
    noStroke();

    drawPixelText(ch, x, glyphY, C.cream, 1, pixel, "center", 1);

    // Debug-only intended-character label.
    textAlign(CENTER);
    fontSize(9);
    fill(...rgba(C.buildingTop, 225));
    text(ch, x, y - cellH * 0.5 + 8);
  }

  function drawFontDebugPage(pageIndex) {
    background(...C.night);

    const page = FONT_DEBUG_PAGES[pageIndex];
    const cols = 8;
    const marginX = 12;
    const cellW = (W - marginX * 2) / cols;
    const cellH = 57;
    const firstY = H - 96;

    drawPixelText(
      `FONT DEBUG ${pageIndex + 1}/${FONT_DEBUG_PAGES.length}`,
      W * 0.5,
      H - 37,
      C.cream,
      0.95,
      1.25,
      "center",
      1
    );

    // Debug-only plain label: remains readable even if the custom Latin font is broken.
    textAlign(CENTER);
    fontSize(11);
    fill(...rgba(C.buildingTop, 220));
    text(page.title, W * 0.5, H - 62);

    page.chars.forEach((ch, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = marginX + cellW * (col + 0.5);
      const y = firstY - row * cellH;
      drawFontDebugCell(ch, x, y, cellW, cellH);
    });

    textAlign(LEFT);
    fontSize(9);
    fill(...rgba(C.buildingTop, 185));
    text("← PREV", 12, 18);

    textAlign(RIGHT);
    text("NEXT →", W - 12, 18);

    textAlign(CENTER);
    fill(...rgba(C.buildingTop, 145));
    text("画面左半分 / 右半分をタップ", W * 0.5, 36);
  }

  const fontDebugScene = {
    opaque: true,
    page: 0,

    enter() {
      this.page = 0;
    },

    update() {},

    draw() {
      drawFontDebugPage(this.page);
    },

    touch(touch) {
      if (touch.state !== ENDED) return true;

      if (touch.x < W * 0.5) {
        this.page = (this.page - 1 + FONT_DEBUG_PAGES.length) % FONT_DEBUG_PAGES.length;
      } else {
        this.page = (this.page + 1) % FONT_DEBUG_PAGES.length;
      }
      return true;
    },
  };


  function drawDeliveryFx() {
    if (model.attractMode) return;
    const fx = model.deliveryFx;
    if (!fx) return;
    const p = cellCenter(fx.c, fx.r);
    const life = clamp(fx.timer / fx.duration, 0, 1);
    const progress = 1 - life;
    const rise = progress * 6;
    const alpha = progress < 0.70 ? 1 : clamp((1 - progress) / 0.30, 0, 1);
    const color = deliverySlotColor(fx.slot || 1);

    // Delivery feedback stays deliberately quiet: one crisp +1200 confirmation
    // in the completed order colour. The permanent terminal total below carries
    // the ¥ mark, so no extra money label is added here.
    drawPixelScore(fx.gain > 0 ? `+${fx.gain}` : "0", p.x, p.y + 10 + rise, color, alpha, 1.8);
  }

  function drawChiliPixelSprite(cx, cy, alpha = 1, scaleAmount = 1) {
    pushMatrix();
    translate(Math.round(cx), Math.round(cy));
    scale(scaleAmount);

    noStroke();
    fill(95, 126, 58, 245 * alpha);
    rect(3, 3, 2, 2);
    rect(2, 2, 2, 2);

    fill(120, 53, 38, 248 * alpha);
    rect(0, 0, 4, 2);
    rect(-2, -2, 5, 2);
    rect(-4, -4, 5, 2);
    rect(-6, -6, 4, 2);
    rect(-7, -7, 2, 1);

    fill(198, 83, 56, 248 * alpha);
    rect(1, 1, 2, 1);
    rect(-1, -1, 3, 1);
    rect(-3, -3, 3, 1);
    rect(-5, -5, 2, 1);

    fill(226, 159, 43, 180 * alpha);
    rect(-2, -2, 2, 1);
    rect(-4, -4, 2, 1);
    popMatrix();
  }

  function drawPepperGrainWorld(grain) {
    const spawnAge = grain.spawnAge ?? PEPPER_SPAWN_SETTLE_DURATION;
    if (spawnAge < 0) return;

    const t = clamp(spawnAge / PEPPER_SPAWN_SETTLE_DURATION, 0, 1);
    const settle = easeOutBack(t);
    const gx = grain.gx + (grain.spawnDx || 0) * (1 - settle);
    const gy = grain.gy + (grain.spawnDy || 0) * (1 - settle);
    const x = gridX(gx);
    const y = gridY(gy);
    const hop = t < 1 ? Math.sin(Math.PI * t) * 3.2 : 0;

    // A tiny ground shadow arrives first, then the chili skims and bounces once
    // into its grid cell. No sparkle or coin-like float: it should feel like a
    // dry ingredient being moved by the alley, not an item spawning from UI.
    noStroke();
    fill(76, 45, 28, 110 * clamp(t * 1.7, 0, 1));
    rect(Math.round(gridX(grain.gx) - 5), Math.round(gridY(grain.gy) + 5), 8, 1);
    drawChiliPixelSprite(x, y - hop, clamp(0.45 + t * 0.55, 0, 1), 0.92 + t * 0.08);
  }

  function drawPepperPickupFx() {
    for (const fx of model.pepperPickupFx) {
      const t = clamp(fx.age / fx.duration, 0, 1);
      const x = gridX(fx.gx);
      const y = gridY(fx.gy);
      const lift = Math.sin(Math.PI * clamp(t / 0.72, 0, 1)) * 5 + t * 2.2;
      const chiliAlpha = 1 - clamp((t - 0.28) / 0.42, 0, 1);
      const chiliScale = 1 - clamp(t / 0.72, 0, 1) * 0.28;

      if (chiliAlpha > 0.02) {
        drawChiliPixelSprite(x, y - lift, chiliAlpha, chiliScale);
      }

      // Three dry crumbs flick away after contact: more "kasa / pari" than
      // glitter. They are deliberately angular, warm and very short-lived.
      const crumbT = clamp((t - 0.10) / 0.90, 0, 1);
      if (crumbT > 0) {
        const fade = 1 - crumbT;
        const side = Math.sin(fx.seed || 0) >= 0 ? 1 : -1;
        const crumbs = [
          { dx: -4 * side, dy: -5, c: [198, 83, 56] },
          { dx:  3 * side, dy: -7, c: [226, 159, 43] },
          { dx:  6 * side, dy: -2, c: [120, 53, 38] },
        ];
        noStroke();
        for (let i = 0; i < crumbs.length; i += 1) {
          const crumb = crumbs[i];
          const drift = crumbT * (0.7 + i * 0.22);
          fill(crumb.c[0], crumb.c[1], crumb.c[2], 210 * fade);
          rect(
            Math.round(x + crumb.dx * drift),
            Math.round(y + crumb.dy * drift - crumbT * 2),
            i === 1 ? 2 : 1,
            1
          );
        }
      }
    }
  }

  function drawPepper() {
    for (const grain of model.pepper) drawPepperGrainWorld(grain);
    drawPepperPickupFx();
  }

  function drawWorld(viewOverride = null) {
    beginWorldCamera(viewOverride);

    // Draw scenery beyond the collision grid first. When the camera gives an
    // edge marker breathing room, the alley now appears to continue offscreen.
    drawWorldContinuation();
    drawUpperResidentialWorld();
    drawSideAlleyWorld();

    for (let r = 1; r <= ROWS; r += 1) {
      for (let c = 1; c <= COLS; c += 1) {
        drawFloorCell(c, r);
      }
    }

    for (let r = 1; r <= ROWS; r += 1) {
      for (let c = 1; c <= COLS; c += 1) {
        if (c % 2 === 0 && r % 2 === 0) drawFixedBlock(c, r);
      }
    }

    // Let the town itself fall into darkness before drawing the working curry
    // shop and active gameplay cues. Delivered-house lights are redrawn above
    // this pass so the courier's trail through the night remains visible.
    drawNightTownShade();
    drawDeliveredBuildingLightsPass();
    drawPepper();

    drawDestinationBuildingCues();
    drawRestaurant();
    drawGarbage();
    drawShop();
    drawBirds();

    model.activeTargets.forEach((target, i) => {
      if (!target.delivered) drawTarget(target, i);
    });
    drawTargetExitFx();

    drawBike();
    model.cats.forEach(drawCat);
    drawRushCatSparkles();
    drawSmoke();
    drawDeliveryFx();
    drawCarryAroma();
    drawMasalaRushAura();
    drawPlayer();

    // A much lighter final veil changes the hour of the whole scene without
    // muddying the fixed HUD/terminal, which is drawn after drawWorld().
    drawNightWorldVeil();

    endWorldCamera();
  }


  // ----------------------------------------------------------
  // TITLE — ATTRACT DEMO
  // ----------------------------------------------------------

  function setupTitleDemo(scene) {
    // Start from exactly the same board state as a real shift.
    resetSession();
    model.attractMode = true;

    // The demo uses real targets, real cats, rubbish, the door, the bike and
    // the real movement/collision code. Only the accounting HUD is omitted.
    scene.lastGoalKey = "";

    // There is no phone on the title screen, so expose the first three pins
    // immediately instead of waiting for an invisible phone-to-map animation.
    for (const target of model.activeTargets) {
      target.orderAge = 99;
      target.flightAge = ORDER_ARROW_FLIGHT_DURATION;
      target.markerReady = true;
      target.markerPopAge = ORDER_MARKER_POP_DURATION;
    }

    model.cameraZoom = TITLE_DEMO_ZOOM;
    model.cameraX = gridX(model.playerGX);
    model.cameraY = gridY(model.playerGY);
  }

  function titleDemoGoals() {
    if (!model.carrying) return [{ c: 5, r: 1 }];

    const goals = model.activeTargets
      .filter((target) => !target.delivered && target.markerReady)
      .map((target) => ({ c: target.c, r: target.r }));

    return goals;
  }

  function titleDemoFindFirstStep(startC, startR, goals) {
    if (!goals.length) return null;

    const goalKeys = new Set(goals.map((g) => cellKey(g.c, g.r)));
    const startKey = cellKey(startC, startR);
    if (goalKeys.has(startKey)) return { c: startC, r: startR };

    const queue = [{ c: startC, r: startR }];
    const seen = new Set([startKey]);
    const parent = new Map();
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let found = null;

    while (queue.length) {
      const cur = queue.shift();

      for (const [dx, dy] of dirs) {
        const c = cur.c + dx;
        const r = cur.r + dy;
        if (!inGrid(c, r)) continue;

        const key = cellKey(c, r);
        if (seen.has(key)) continue;

        // Plan through the timed center door because it is temporary topology.
        // The real movement code still blocks the courier while the door is
        // actually closed, so the demo approaches it and waits naturally.
        if (isFixedBlock(c, r)) continue;
        if (garbageAt(c, r)) continue;
        if (!masalaRushActive() && catAt(c, r)) continue;

        seen.add(key);
        parent.set(key, cellKey(cur.c, cur.r));

        if (goalKeys.has(key)) {
          found = { c, r };
          queue.length = 0;
          break;
        }

        queue.push({ c, r });
      }
    }

    if (!found) return null;

    let cursorKey = cellKey(found.c, found.r);
    let previousKey = parent.get(cursorKey);

    while (previousKey && previousKey !== startKey) {
      cursorKey = previousKey;
      previousKey = parent.get(cursorKey);
    }

    const step = parseCellKey(cursorKey);
    if (!Number.isFinite(step.c) || !Number.isFinite(step.r)) return null;
    return step;
  }

  function updateTitleAutoControl() {
    // Only change direction at a lane node. Between nodes, keep the current
    // reserved direction and let updateMovement() handle substeps/collision.
    const node = nearNodeForTurn();
    if (!(node.nearX && node.nearY)) {
      model.touchActive = model.dirX !== 0 || model.dirY !== 0;
      return;
    }

    const c = clamp(node.c, 1, COLS);
    const r = clamp(node.r, 1, ROWS);
    const goals = titleDemoGoals();
    const next = titleDemoFindFirstStep(c, r, goals);

    if (!next) {
      // A moving cat or a closed door may temporarily remove every route.
      // Stop at the node and recalculate next frame instead of cheating through.
      model.touchActive = false;
      model.intentX = 0;
      model.intentY = 0;
      model.runSpeed = Math.min(model.runSpeed, MAX_RUN_SPEED * 0.25);
      return;
    }

    const dx = next.c - c;
    const dy = next.r - r;

    if (dx === 0 && dy === 0) {
      model.touchActive = false;
      model.intentX = 0;
      model.intentY = 0;
      return;
    }

    model.touchActive = true;
    model.intentX = Math.sign(dx);
    model.intentY = Math.sign(dy);
  }

  function exposeTitleDemoPins() {
    // New rounds are created by the real delivery loop. Because the title has
    // no terminal HUD, make their map pins available immediately.
    for (const target of model.activeTargets) {
      if (target.delivered) continue;
      target.orderAge = Math.max(target.orderAge ?? 0, 99);
      target.flightAge = ORDER_ARROW_FLIGHT_DURATION;
      target.markerReady = true;
      target.markerPopAge = ORDER_MARKER_POP_DURATION;
    }
  }

  function updateTitleDemo(scene, dt) {
    // Keep the attract loop alive indefinitely without introducing a fake
    // result/restart layer. Temperature/economy are invisible here; collision,
    // delivery and moving obstacles are the real game.
    model.curryHeat = 100;
    model.nightGauge = NIGHT_GAUGE_MAX;
    model.nightClosing = false;

    exposeTitleDemoPins();
    updateTitleAutoControl();

    // This is the actual game update. The courier can be stopped by walls,
    // rubbish, cats and the door; standing on a pin completes that delivery.
    updateGame(dt);

    // A new batch may have been accepted at the shop on this frame.
    exposeTitleDemoPins();

    // The gameplay camera is calculated for the smaller play window. Reframe
    // the same camera target for the full-screen attract presentation only.
    const targetX = gridX(model.playerGX);
    const targetY = gridY(model.playerGY);
    model.cameraZoom = approachExp(model.cameraZoom, TITLE_DEMO_ZOOM, 2.2, dt);
    model.cameraX = approachExp(model.cameraX, targetX, 1.55, dt);
    model.cameraY = approachExp(model.cameraY, targetY, 1.35, dt);

    const visualLeft = BOARD_X - CAMERA_WORLD_BLEED_X;
    const visualRight = BOARD_X + BOARD_W + CAMERA_WORLD_BLEED_X;
    const visualBottom = BOARD_Y - CAMERA_WORLD_BLEED_BOTTOM;
    const visualTop = BOARD_Y + BOARD_H + CAMERA_WORLD_BLEED_TOP;
    const halfW = W / (2 * model.cameraZoom);
    const halfH = H / (2 * model.cameraZoom);

    const minX = visualLeft + halfW;
    const maxX = visualRight - halfW;
    const minY = visualBottom + halfH;
    const maxY = visualTop - halfH;

    model.cameraX = minX <= maxX
      ? clamp(model.cameraX, minX, maxX)
      : (visualLeft + visualRight) * 0.5;
    model.cameraY = minY <= maxY
      ? clamp(model.cameraY, minY, maxY)
      : (visualBottom + visualTop) * 0.5;
  }

  function drawTitleLanguageToggle() {
    const x = TITLE_LANG_X;
    const y = TITLE_LANG_Y;
    const w = TITLE_LANG_W;
    const h = TITLE_LANG_H;
    const half = w * 0.5;
    const jpActive = SSE.i18n.language !== "en";

    noStroke();
    fill(12, 9, 8, 205);
    rect(x, y, w, h);

    fill(...rgba(C.amber, 205));
    rect(jpActive ? x + 2 : x + half, y + 2, half - 2, h - 4);

    drawPixelText(
      "JP",
      x + half * 0.5,
      y + 6,
      jpActive ? C.night : C.buildingTop,
      jpActive ? 1 : 0.82,
      1.12,
      "center",
      1
    );
    drawPixelText(
      "EN",
      x + half + half * 0.5,
      y + 6,
      jpActive ? C.buildingTop : C.night,
      jpActive ? 0.82 : 1,
      1.12,
      "center",
      1
    );
  }

  function titleLanguageChoice(touch) {
    if (!touch) return null;
    const pad = 7;
    const inside = touch.x >= TITLE_LANG_X - pad
      && touch.x <= TITLE_LANG_X + TITLE_LANG_W + pad
      && touch.y >= TITLE_LANG_Y - pad
      && touch.y <= TITLE_LANG_Y + TITLE_LANG_H + pad;
    if (!inside) return null;

    const midpoint = TITLE_LANG_X + TITLE_LANG_W * 0.5;
    return touch.x < midpoint ? "jp" : "en";
  }

  function titleLanguageHit(touch) {
    return titleLanguageChoice(touch) !== null;
  }

  function selectInterfaceLanguage(language, source = "title") {
    const selected = language === "en" ? "en" : "jp";
    const changed = SSE.i18n.language !== selected;
    SSE.i18n.set(selected);
    syncDocumentLanguage();
    if (changed) {
      trackGameAnalytics("Masala Language", { selected, source });
    }
    return selected;
  }

  function currentSoundLevel() {
    const sound = typeof window !== "undefined" ? window.RojiuraSound : null;
    return sound && typeof sound.getLevel === "function" ? sound.getLevel() : 3;
  }

  function drawTitleSoundToggle() {
    const x = TITLE_SOUND_X;
    const y = TITLE_SOUND_Y;
    const w = TITLE_SOUND_W;
    const h = TITLE_SOUND_H;
    const level = currentSoundLevel();

    noStroke();
    fill(12, 9, 8, 205);
    rect(x, y, w, h);

    // A literal pixel speaker replaces the old rising bars, which could read
    // as cellular / radio signal strength. The cone stays fixed; only the
    // outward sound waves change with volume.
    const iconY = y + 6;
    const speakerColor = level > 0 ? C.amber : C.buildingTop;
    fill(...rgba(speakerColor, level > 0 ? 230 : 150));

    // Speaker box + widening cone.
    rect(x + 6, iconY + 4, 4, 4);
    rect(x + 10, iconY + 3, 2, 6);
    rect(x + 12, iconY + 2, 2, 8);
    rect(x + 14, iconY + 1, 2, 10);

    if (level === 0) {
      // Mute is intentionally explicit: speaker + pixel X.
      fill(...rgba(C.chili, 225));
      rect(x + 22, iconY + 2, 2, 2);
      rect(x + 24, iconY + 4, 2, 2);
      rect(x + 26, iconY + 6, 2, 2);
      rect(x + 26, iconY + 2, 2, 2);
      rect(x + 24, iconY + 4, 2, 2);
      rect(x + 22, iconY + 6, 2, 2);
      return;
    }

    const waveColor = C.amber;

    // Wave 1 — compact, unmistakably detached from the cone.
    if (level >= 1) {
      fill(...rgba(waveColor, 230));
      rect(x + 21, iconY + 3, 2, 2);
      rect(x + 23, iconY + 5, 2, 2);
      rect(x + 21, iconY + 7, 2, 2);
    }

    // Wave 2 — a larger outward parenthesis.
    if (level >= 2) {
      fill(...rgba(waveColor, 220));
      rect(x + 28, iconY + 1, 2, 2);
      rect(x + 30, iconY + 3, 2, 2);
      rect(x + 32, iconY + 5, 2, 2);
      rect(x + 30, iconY + 7, 2, 2);
      rect(x + 28, iconY + 9, 2, 2);
    }

    // Wave 3 — widest arc for MAX. Keep it pixel-stepped rather than smooth
    // so the icon belongs to the same Famicom-like visual language.
    if (level >= 3) {
      fill(...rgba(waveColor, 210));
      rect(x + 37, iconY, 2, 2);
      rect(x + 39, iconY + 2, 2, 2);
      rect(x + 41, iconY + 4, 2, 4);
      rect(x + 39, iconY + 8, 2, 2);
      rect(x + 37, iconY + 10, 2, 2);
    }
  }

  function titleSoundHit(touch) {
    if (!touch) return false;
    const pad = 8;
    return touch.x >= TITLE_SOUND_X - pad
      && touch.x <= TITLE_SOUND_X + TITLE_SOUND_W + pad
      && touch.y >= TITLE_SOUND_Y - pad
      && touch.y <= TITLE_SOUND_Y + TITLE_SOUND_H + pad;
  }

  function titleSettingsGuardHit(touch) {
    if (!touch) return false;
    const pad = 14;
    const nearSound = touch.x >= TITLE_SOUND_X - pad
      && touch.x <= TITLE_SOUND_X + TITLE_SOUND_W + pad
      && touch.y >= TITLE_SOUND_Y - pad
      && touch.y <= TITLE_SOUND_Y + TITLE_SOUND_H + pad;
    const nearLanguage = touch.x >= TITLE_LANG_X - pad
      && touch.x <= TITLE_LANG_X + TITLE_LANG_W + pad
      && touch.y >= TITLE_LANG_Y - pad
      && touch.y <= TITLE_LANG_Y + TITLE_LANG_H + pad;
    return nearSound || nearLanguage;
  }

  function cycleSoundLevel() {
    const sound = typeof window !== "undefined" ? window.RojiuraSound : null;
    if (!sound || typeof sound.cycleLevel !== "function") return;
    const selected = sound.cycleLevel();
  }

  function drawTitleOverlay(age) {
    const t = clamp((age - TITLE_LOGO_DELAY) / TITLE_LOGO_IN, 0, 1);
    if (t <= 0) return;

    const eased = easeOutBack(t);
    const alpha = clamp(t / 0.38, 0, 1);
    const titleY = H - 110 + (1 - eased) * 7;
    const bandH = 108;

    // Strong horizontal black band: the town keeps moving behind it, but the
    // enlarged bitmap title still reads instantly on a phone.
    noStroke();
    fill(12, 9, 8, 216 * alpha);
    rect(0, titleY - 53, W, bandH);

    const titleName = SSE.i18n.t("title.name");
    const titleNamePixel = fitPixelSize(titleName, 4.45, W - 34, 1, 2.45);
    drawPixelText(titleName, W * 0.5, titleY + 5, C.cream, alpha, titleNamePixel, "center", 1);

    noStroke();
    fill(...rgba(C.amber, 235 * alpha));
    rect(W * 0.5 - 62, titleY - 10, 124, 3);

    const titleSub = SSE.i18n.t("title.sub");
    const titleSubPixel = fitPixelSize(titleSub, 1.72, W - 42, 1, 1.05);
    drawPixelText(titleSub, W * 0.5, titleY - 39, C.buildingTop, alpha * 0.92, titleSubPixel, "center", 1);

    if (age >= TITLE_START_DELAY) {
      const pulse = 0.62 + 0.38 * Math.sin((age - TITLE_START_DELAY) * 2.7);
      const startText = SSE.i18n.t("title.start");
      const startPixel = fitPixelSize(startText, 2.18, W - 42, 1, 1.25);
      drawPixelText(startText, W * 0.5, H * 0.48, C.cream, (160 + 80 * pulse) / 255, startPixel, "center", 1);
    }
  }

  function drawTitleDemo(age) {
    background(...C.night);

    // Same town and gameplay state; only the terminal/pad are omitted.
    drawWorld({ x: W * 0.5, y: H * 0.5 });

    // Slight wash keeps the demo atmospheric without hiding moving details.
    noStroke();
    fill(18, 14, 12, 20);
    rect(0, 0, W, H);

    drawTitleOverlay(age);
    drawTitleSoundToggle();
    drawTitleLanguageToggle();
  }

  // ----------------------------------------------------------
  // DRAW — HUD / CONTROL
  // ----------------------------------------------------------

  function formatScore(value) {
    return Math.floor(value || 0).toLocaleString("en-US");
  }

  function drawUpperPipe(x, yBottom, yTop, branchY = 0, branchDir = 1, branchLen = 0) {
    noStroke();
    fill(...rgba(C.windowDark, 215));
    rect(x - 2, yBottom, 4, yTop - yBottom);
    fill(...rgba(C.metal, 155));
    rect(x - 1, yBottom, 2, yTop - yBottom);

    if (branchLen > 0) {
      const left = branchDir < 0 ? x - branchLen : x;
      fill(...rgba(C.windowDark, 215));
      rect(left, branchY - 2, branchLen, 4);
      fill(...rgba(C.metal, 155));
      rect(left, branchY - 1, branchLen, 2);
    }
  }

  function drawUpperLaundry(x, y) {
    noStroke();
    fill(...rgba(C.windowDark, 165));
    rect(x, y, 54, 1.5);

    fill(...rgba(C.cream, 205));
    rect(x + 5, y - 9, 9, 8);
    fill(...rgba(C.buildingTop, 105));
    rect(x + 8, y - 9, 2, 8);

    fill(...rgba(C.chili, 210));
    rect(x + 20, y - 11, 8, 10);
    fill(...rgba(C.windowDark, 110));
    rect(x + 23, y - 11, 2, 10);

    fill(...rgba(C.garbage, 208));
    rect(x + 34, y - 10, 10, 9);
    fill(...rgba(C.windowDark, 108));
    rect(x + 38, y - 10, 2, 9);
  }

  function drawUpperResidentialWindowWorld(x, y, lit = false, narrow = false, ambientId = null) {
    const w = narrow ? 15 : 19;
    const h = narrow ? 13 : 15;
    const glowId = ambientId || `upper-${Math.round(x)}-${Math.round(y)}`;
    const glow = ambientId
      ? displayWindowLit(ambientId, lit)
      : (masalaRushActive() ? masalaRushBlink(glowId, -0.06) : lit);

    noStroke();
    fill(...rgba(C.windowDark, 232));
    rect(x, y, w, h);
    fill(...rgba(C.metal, 142));
    rect(x + 1, y + 1, w - 2, h - 2);
    fill(...rgba(glow ? C.windowLight : C.windowDark, glow ? (masalaRushActive() ? 205 : 160) : (masalaRushActive() ? 54 : 74)));
    rect(x + 3, y + 3, w - 6, h - 6);
    fill(...rgba(C.buildingTop, glow ? (masalaRushActive() ? 140 : 124) : 92));
    rect(x + Math.floor(w * 0.5) - 1, y + 3, 2, h - 6);

    // Small sill only; no roof/top bar, because the facade itself continues
    // farther north beyond the camera.
    fill(...rgba(C.windowDark, 112));
    rect(x - 1, y - 2, w + 2, 2);
  }

  function drawUpperResidentialWorld() {
    // The north edge is not another walkable grid row. It is the face of a
    // residential block that continues upward beyond the camera. This keeps
    // the extension in the same world/camera while making the non-playable
    // boundary visually architectural rather than an invisible wall.
    const wallBottom = BOARD_TOP - 3;
    const wallTop = BOARD_TOP + TOP_RESIDENTIAL_WALL_HEIGHT;
    const wallLeft = BOARD_X - CELL * 1.55;
    const wallRight = BOARD_X + BOARD_W + CELL * 1.55;
    const wallW = wallRight - wallLeft;
    const wallH = wallTop - wallBottom;

    noStroke();
    fill(...rgba(C.building, 246));
    rect(wallLeft, wallBottom, wallW, wallH);

    // Broad, slightly different facade sections break the old horizontal-strip
    // feeling. None of these sections has a top edge or roof line.
    const sections = [
      { x: wallLeft,              w: CELL * 2.35, warm: 18 },
      { x: wallLeft + CELL*2.35,  w: CELL * 2.95, warm: 8  },
      { x: wallLeft + CELL*5.30,  w: CELL * 2.15, warm: 16 },
      { x: wallLeft + CELL*7.45,  w: wallW - CELL*7.45, warm: 10 },
    ];

    sections.forEach((s) => {
      fill(...rgba(C.buildingTop, s.warm));
      rect(s.x + 2, wallBottom + 4, s.w - 4, wallH - 8);
    });

    // Uneven ground-level shadow fragments make the facade sit against the
    // alley without recreating the continuous black band from the previous
    // version.
    fill(...rgba(C.roadSeam, 170));
    rect(wallLeft + 8, wallBottom, CELL * 1.3, 2);
    rect(wallLeft + CELL * 3.15, wallBottom + 1, CELL * 1.7, 2);
    rect(wallLeft + CELL * 6.55, wallBottom, CELL * 1.15, 2);
    rect(wallRight - CELL * 1.8, wallBottom + 1, CELL * 1.35, 2);

    // Short slab / balcony fragments hint at separate storeys without drawing
    // a full-width line that would feel like a stage border again.
    const floor1Y = wallBottom + 24;
    const floor2Y = wallBottom + 52;
    fill(...rgba(C.roadSeam, 128));
    rect(wallLeft + CELL * 0.20, floor1Y, CELL * 1.55, 2);
    rect(wallLeft + CELL * 2.55, floor1Y + 1, CELL * 1.85, 2);
    rect(wallLeft + CELL * 5.85, floor1Y, CELL * 1.35, 2);
    rect(wallRight - CELL * 1.70, floor1Y + 1, CELL * 1.15, 2);
    rect(wallLeft + CELL * 1.15, floor2Y, CELL * 1.35, 2);
    rect(wallLeft + CELL * 4.25, floor2Y + 1, CELL * 1.55, 2);
    rect(wallRight - CELL * 2.40, floor2Y, CELL * 1.45, 2);

    fill(...rgba(C.buildingTop, 54));
    rect(wallLeft + CELL * 0.24, floor1Y + 2, CELL * 1.45, 1.5);
    rect(wallLeft + CELL * 2.62, floor1Y + 3, CELL * 1.72, 1.5);
    rect(wallLeft + CELL * 5.92, floor1Y + 2, CELL * 1.24, 1.5);
    rect(wallLeft + CELL * 1.22, floor2Y + 2, CELL * 1.26, 1.5);
    rect(wallLeft + CELL * 4.32, floor2Y + 3, CELL * 1.42, 1.5);

    // Lower-storey windows are deliberately close to the alley edge so the
    // player sees inhabited wall surface as soon as the camera reaches north.
    drawUpperResidentialWindowWorld(BOARD_X - 7,             wallBottom + 9,  true,  true,  "north-1");
    drawUpperResidentialWindowWorld(BOARD_X + CELL * 1.70,   wallBottom + 9,  false, false, "north-2");
    drawUpperResidentialWindowWorld(BOARD_X + CELL * 3.55,   wallBottom + 9,  true,  false, "north-3");
    drawUpperResidentialWindowWorld(BOARD_X + CELL * 5.40,   wallBottom + 9,  false, true,  "north-4");
    drawUpperResidentialWindowWorld(BOARD_X + CELL * 7.20,   wallBottom + 9,  true,  false, "north-5");

    // Upper fragments continue past the reachable camera window. Their partial
    // appearance is intentional: the building keeps going even when the camera
    // cannot show the whole floor.
    drawUpperResidentialWindowWorld(BOARD_X + CELL * 1.10, wallBottom + 37, false, false, "north-6");
    drawUpperResidentialWindowWorld(BOARD_X + CELL * 2.75, wallBottom + 37, true,  true,  "north-7");
    drawUpperResidentialWindowWorld(BOARD_X + CELL * 4.95, wallBottom + 37, false, false, "north-8");
    drawUpperResidentialWindowWorld(BOARD_X + CELL * 7.15, wallBottom + 37, false, true,  "north-9");

    // A tiny third-storey hint near the top keeps the wall from reading as a
    // single giant panel, while still leaving the uppermost structure mostly
    // outside the camera.
    drawUpperResidentialWindowWorld(BOARD_X + CELL * 2.95, wallBottom + 65, true, true, "north-10");
    drawUpperResidentialWindowWorld(BOARD_X + CELL * 5.95, wallBottom + 65, false, true, "north-11");

    // Laundry remains, but the very thin upper pipes were removed because they
    // read like stray 1px guide lines above the houses.
    drawUpperLaundry(BOARD_X + CELL * 4.02, wallBottom + 34);

    // Tiny balcony plants: enough life to suggest residents, but attached to
    // the facade so they cannot be mistaken for reachable street props.
    noStroke();
    fill(...rgba(C.windowDark, 128));
    rect(BOARD_X + CELL * 1.0, wallBottom + 29, 11, 3);
    fill(...rgba(C.garbage, 195));
    rect(BOARD_X + CELL * 1.05, wallBottom + 32, 3, 5);
    rect(BOARD_X + CELL * 1.18, wallBottom + 31, 3, 6);

    fill(...rgba(C.windowDark, 128));
    rect(BOARD_X + CELL * 7.45, wallBottom + 27, 11, 3);
    fill(...rgba(C.garbage, 185));
    rect(BOARD_X + CELL * 7.50, wallBottom + 30, 3, 5);
    rect(BOARD_X + CELL * 7.63, wallBottom + 29, 3, 6);
  }

  function drawSideFacadeSlice(x, y, w, h, warm = 12) {
    noStroke();
    fill(...rgba(C.building, 238));
    rect(x, y, w, h);
    fill(...rgba(C.buildingTop, warm));
    rect(x + 2, y + 4, w - 4, h - 8);
    fill(...rgba(C.roadSeam, 112));
    rect(x + 3, y + 8, 1.5, h - 16);
  }

  function drawSidePlant(x, y) {
    noStroke();
    fill(...rgba(C.windowDark, 138));
    rect(x, y, 10, 4);
    fill(...rgba(C.garbage, 198));
    rect(x + 1, y + 4, 3, 5);
    rect(x + 4, y + 3, 3, 6);
    rect(x + 7, y + 4, 2, 5);
  }

  function drawSideCardboardStack(x, y) {
    noStroke();
    fill(...rgba(C.buildingTop, 182));
    // Two boxes on separate vertical levels with a visible gap.
    rect(x, y, 11, 7);
    rect(x + 5, y + 10, 9, 7);
    fill(...rgba(C.windowDark, 110));
    rect(x + 1, y + 5, 9, 1.5);
    rect(x + 6, y + 15, 7, 1.5);
    fill(...rgba(C.metal, 110));
    rect(x + 3, y + 6, 2, 1);
    rect(x + 9, y + 16, 2, 1);
  }

  function drawSideHangingSign(x, y, facing = -1) {
    noStroke();
    fill(...rgba(C.windowDark, 170));
    if (facing < 0) {
      rect(x - 12, y + 11, 12, 2);
      rect(x - 2, y, 2, 13);
      fill(...rgba(C.chili, 205));
      rect(x - 13, y + 3, 10, 8);
      fill(...rgba(C.cream, 205));
      rect(x - 10, y + 5, 4, 2);
    } else {
      rect(x, y + 11, 12, 2);
      rect(x, y, 2, 13);
      fill(...rgba(C.chili, 205));
      rect(x + 3, y + 3, 10, 8);
      fill(...rgba(C.cream, 205));
      rect(x + 6, y + 5, 4, 2);
    }
  }

  function drawSideVendingMachine(x, y) {
    const topGlow = masalaRushActive() ? masalaRushBlink("vending-top", -0.12) : true;
    const trayGlow = masalaRushActive() ? masalaRushBlink("vending-tray", 0.08) : true;

    noStroke();
    fill(...rgba(C.windowDark, 200));
    rect(x, y, 16, 26);
    fill(...rgba(C.metal, 155));
    rect(x + 1, y + 1, 14, 24);

    // Product window.
    fill(...rgba(topGlow ? C.windowLight : C.windowDark, topGlow ? 198 : 82));
    rect(x + 3, y + 4, 10, 8);
    fill(...rgba(C.windowDark, 96));
    rect(x + 4, y + 5, 8, 6);

    // Tiny drink rows: simple vertical 2-dot columns make the machine read as
    // stocked with cans/bottles instead of being just a glowing box.
    fill(...rgba(C.cream, 220));
    rect(x + 4, y + 5, 2, 4);
    fill(...rgba(C.amber, 220));
    rect(x + 7, y + 5, 2, 4);
    fill(...rgba(C.garbage, 210));
    rect(x + 10, y + 5, 2, 4);
    fill(...rgba(C.windowDark, 138));
    rect(x + 4, y + 10, 8, 1);

    // Collection tray.
    fill(...rgba(trayGlow ? C.cream : C.windowDark, trayGlow ? 208 : 96));
    rect(x + 3, y + 15, 10, 7);
    fill(...rgba(C.windowDark, 132));
    rect(x + 5, y + 17, 6, 2);

    // Payment / base accent.
    fill(...rgba(C.chili, 180));
    rect(x + 5, y + 23, 6, 1.5);
  }

  function drawSideAlleyWorld() {
    // Left and right are not hard stage borders; they are glimpses into the
    // surrounding alley network. Keep the details world-space and mostly cut
    // off so the camera implies more town without turning these edges into
    // new walkable rows.
    const sideInset = 16;
    const leftShift = sideInset;
    const rightShift = -sideInset;

    // Left side: quieter residential spillover.
    drawSideFacadeSlice(BOARD_X - CELL * 1.90 + leftShift, BOARD_Y + CELL * 2.15, CELL * 0.92, CELL * 2.55, 18);
    drawSideFacadeSlice(BOARD_X - CELL * 1.70 + leftShift, BOARD_Y + CELL * 6.00, CELL * 0.76, CELL * 1.85, 8);
    drawUpperResidentialWindowWorld(BOARD_X - CELL * 1.74 + leftShift, BOARD_Y + CELL * 4.18, true, true, "left-1");
    drawUpperResidentialWindowWorld(BOARD_X - CELL * 1.60 + leftShift, BOARD_Y + CELL * 7.12, false, true, "left-2");
    drawUpperPipe(BOARD_X - CELL * 1.02 + leftShift, BOARD_Y + CELL * 2.05, BOARD_Y + CELL * 8.20,
      BOARD_Y + CELL * 6.65, 1, 11);
    drawSidePlant(BOARD_X - CELL * 1.22 + leftShift, BOARD_Y + CELL * 6.52);
    drawSideCardboardStack(BOARD_X - CELL * 1.52 + leftShift, BOARD_Y + CELL * 0.92);

    // Right side: a slightly more commercial edge with a sign and a vending
    // machine slice, so the town feels mixed-use rather than purely housing.
    drawSideFacadeSlice(BOARD_X + BOARD_W + CELL * 0.90 + rightShift, BOARD_Y + CELL * 1.95, CELL * 0.94, CELL * 2.65, 10);
    drawSideFacadeSlice(BOARD_X + BOARD_W + CELL * 1.04 + rightShift, BOARD_Y + CELL * 6.20, CELL * 0.82, CELL * 1.70, 16);
    drawUpperResidentialWindowWorld(BOARD_X + BOARD_W + CELL * 1.06 + rightShift, BOARD_Y + CELL * 4.18, false, true, "right-1");
    drawUpperResidentialWindowWorld(BOARD_X + BOARD_W + CELL * 1.10 + rightShift, BOARD_Y + CELL * 7.12, true, true, "right-2");
    drawUpperPipe(BOARD_X + BOARD_W + CELL * 1.76 + rightShift, BOARD_Y + CELL * 2.00, BOARD_Y + CELL * 8.10,
      BOARD_Y + CELL * 6.30, -1, 10);
    drawSideHangingSign(BOARD_X + BOARD_W + CELL * 0.78 + rightShift, BOARD_Y + CELL * 5.70, -1);
    drawSideVendingMachine(BOARD_X + BOARD_W + CELL * 0.74 + rightShift, BOARD_Y + CELL * 4.70);
    drawSidePlant(BOARD_X + BOARD_W + CELL * 0.96 + rightShift, BOARD_Y + CELL * 1.80);
    drawSideCardboardStack(BOARD_X + BOARD_W + CELL * 0.98 + rightShift, BOARD_Y + CELL * 0.72);
  }

  function drawBird(bird) {
    const pixel = 2;
    const snapBird = (value) => Math.round(value / pixel) * pixel;
    const x = snapBird(bird.x);
    const y = snapBird(bird.y + Math.sin(model.time * 2 + bird.phase) * bird.amplitude);
    const wingOffset = Math.sin(model.time * 12 + bird.phase) <= 0 ? 0 : pixel;

    pushMatrix();
    translate(x, y);
    if (bird.dir < 0) scale(-1, 1);

    noStroke();
    fill(...rgba(C.buildingTop, 225));

    // DotWeather-style three-cell bird. Wings alternate between a straight
    // three-pixel bar and a shallow V while the whole bird drifts gently up
    // and down on a much slower sine wave.
    rect(0, 0, pixel, pixel);
    rect(-pixel, wingOffset, pixel, pixel);
    rect(pixel, wingOffset, pixel, pixel);

    popMatrix();
  }

  function drawBirds() {
    model.birds.forEach(drawBird);
  }

  function drawTopHUD() {
    // Intentionally empty. The town extension now lives in world space rather
    // than being composited as a screen-fixed top strip.
  }

  function packedActiveTargets() {
    return orderedUndeliveredTargets();
  }

  function visiblePackedActiveTargets() {
    return packedActiveTargets().filter((target) => (target.orderAge ?? -1) >= 0);
  }

  function phoneOrderLayoutCount() {
    const visible = visiblePackedActiveTargets();
    if (!visible.length) return Math.min(NORMAL_BATCH_SIZE, Math.max(1, packedActiveTargets().length || NORMAL_BATCH_SIZE));

    // During a card exit, remaining cards keep their old display slots for a
    // beat and then slide left. Using the largest live display slot makes the
    // squeeze relax smoothly instead of snapping from seven columns to six.
    return Math.max(1, ...visible.map((target, index) =>
      target.displaySlot ?? target.orderSlot ?? (index + 1)
    ));
  }

  function phoneCardMetrics(layoutCount = NORMAL_BATCH_SIZE) {
    const count = Math.max(1, Number(layoutCount) || NORMAL_BATCH_SIZE);
    if (count <= NORMAL_BATCH_SIZE) {
      return { cardW: PHONE_CARD_W, gap: PHONE_CARD_GAP, count };
    }

    // Four or more orders must fit inside exactly the same terminal width.
    // Keep a tiny gap so every ticket remains individually readable; width
    // continuously expands again as the overloaded batch is delivered down.
    const gap = 3;
    const cardW = Math.max(18, (ORDER_GROUP_W - gap * (count - 1)) / count);
    return { cardW, gap, count };
  }

  function phoneCardCenter(slot, layoutCount = phoneOrderLayoutCount()) {
    const metrics = phoneCardMetrics(layoutCount);
    return {
      x: ORDER_GROUP_LEFT + metrics.cardW * 0.5 + (slot - 1) * (metrics.cardW + metrics.gap),
      y: PHONE_CARD_Y,
    };
  }

  function packedDisplaySlotForTarget(target) {
    const list = packedActiveTargets();
    const idx = list.indexOf(target);
    return idx >= 0 ? idx + 1 : null;
  }

  // Code-drawn curry variants used only by the order terminal. The result
  // screen keeps its own makanai selection logic. Three unique-looking bowls
  // are drawn from this pool for each accepted batch.
  const ORDER_CURRY_VISUALS = Object.freeze([
    { id: "butter", palette: "butterChicken", toppings: "butterChicken" },
    { id: "dal", palette: "dal", toppings: "dal" },
    { id: "chana", palette: "chana", toppings: "chana" },
    { id: "keema", palette: "keema", toppings: "keema" },
    { id: "saag", palette: "saag", toppings: "sparse" },
    { id: "aloo-gobi", palette: "alooGobi", toppings: "alooGobi" },
  ]);

  function orderCurryVisual(id) {
    return ORDER_CURRY_VISUALS.find((visual) => visual.id === id)
      || ORDER_CURRY_VISUALS[0];
  }

  function randomOrderCurryVisualIds(count) {
    const ids = ORDER_CURRY_VISUALS.map((visual) => visual.id);
    const result = [];
    while (result.length < count) {
      result.push(...shuffle(ids));
    }
    return result.slice(0, count);
  }

  function drawMiniCurry(x, y, maxW, maxH, visualId, alpha = 1) {
    const iconApi =
      typeof window !== "undefined"
        ? window.RojiuraMakanaiIcon
        : null;

    if (!iconApi || typeof iconApi.draw !== "function") return false;

    const visual = orderCurryVisual(visualId);
    const logicalW = iconApi.width;
    const logicalH = iconApi.height;

    // Normal three-order cards stay on whole logical pixels. Overloaded cards
    // can become narrower than the 32px source icon, so allow one fractional
    // scale only there rather than cropping or changing the curry's aspect ratio.
    const fit = Math.min(maxW / logicalW, maxH / logicalH);
    const pixelSize = fit >= 1 ? Math.max(1, Math.floor(fit)) : Math.max(0.50, fit);
    const drawW = logicalW * pixelSize;
    const drawH = logicalH * pixelSize;

    withCanvasContext((ctx) => {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = alpha;

      // Codea Lite is y-up; the icon renderer is ordinary canvas y-down.
      ctx.translate(x - drawW * 0.5, y + drawH * 0.5);
      ctx.scale(1, -1);
      iconApi.draw(ctx, 0, 0, {
        pixelSize,
        palette: visual.palette,
        toppings: visual.toppings,
        size: "normal",
        egg: false,
      });
      ctx.restore();
    });

    return true;
  }

  function drawOrderCard(
    displaySlot,
    colorSlot,
    visualId,
    alpha = 1,
    xOffset = 0,
    yOffset = 0,
    scaleIn = 1,
    layoutCount = phoneOrderLayoutCount(),
    focus = 0,
    dim = 0
  ) {
    const metrics = phoneCardMetrics(layoutCount);
    const p = phoneCardCenter(displaySlot, layoutCount);
    const baseColor = deliverySlotColor(colorSlot);
    const focusT = clamp(focus, 0, 1);
    const dimT = clamp(dim, 0, 1);
    const color = [
      lerp(baseColor[0], 255, focusT * 0.24),
      lerp(baseColor[1], 248, focusT * 0.18),
      lerp(baseColor[2], 224, focusT * 0.12),
    ];
    const cardAlpha = alpha * lerp(1, 0.52, dimT * 0.9);
    pushMatrix();
    translate(p.x + xOffset, p.y + yOffset);
    scale(scaleIn);

    // The physical phone never grows. Four or more orders simply get narrower
    // inside the same activity window, then breathe back out as deliveries
    // reduce the queue toward the normal three-card layout.
    noFill();
    stroke(...rgba(color, 244 * cardAlpha));
    strokeWidth(metrics.cardW < 28 ? 1 : 2);
    rect(-metrics.cardW * 0.5, -PHONE_CARD_H * 0.5, metrics.cardW, PHONE_CARD_H);
    if (focusT > 0.01) {
      stroke(...rgba(C.cream, 70 * focusT * alpha));
      strokeWidth(1);
      rect(-metrics.cardW * 0.5 - 1, -PHONE_CARD_H * 0.5 - 1, metrics.cardW + 2, PHONE_CARD_H + 2);
    }
    noStroke();
    fill(...rgba(color, 244 * cardAlpha));
    const stripeH = metrics.cardW < 26 ? 3 : 4;
    rect(-metrics.cardW * 0.5 + 1, PHONE_CARD_H * 0.5 - 5, Math.max(2, metrics.cardW - 2), stripeH);

    const iconMaxW = Math.max(8, metrics.cardW - PHONE_CARD_ICON_INSET * 2);
    const iconMaxH = PHONE_CARD_H - PHONE_CARD_ICON_INSET * 2;
    drawMiniCurry(0, -1, iconMaxW, iconMaxH, visualId, cardAlpha);

    popMatrix();
  }

  function drawOrderExitFx() {
    for (const fx of model.orderExitFx) {
      const t = clamp(fx.age / fx.duration, 0, 1);
      const eased = easeOutCubic(t);
      const alpha = 1 - t * t;
      const xOffset = -ORDER_EXIT_DISTANCE * eased;
      const scaleIn = 1 - 0.05 * eased;
      drawOrderCard(
        fx.displaySlot ?? fx.colorSlot ?? 1,
        fx.colorSlot || 1,
        fx.curryVisual || "butter",
        alpha,
        xOffset,
        0,
        scaleIn,
        fx.layoutCount ?? phoneOrderLayoutCount()
      );
    }
  }

  function drawMakanaiPreview() {
    const x = PHONE_X - 10;
    const y = PHONE_Y + 25;
    const tier = makanaiTier(Math.max(3, model.deliveries));
    const pulse =
      model.nightClosing && !model.carrying
        ? 1 + Math.sin(model.time * 5.0) * 0.05
        : 1;

    pushMatrix();
    translate(x, y);
    scale(pulse);

    // Tiny pixel plate: dark outline, cream dish, curry and rice blocks.
    noStroke();
    fill(78, 69, 61, 235);
    rect(-11, -4, 22, 7);
    rect(-9, 3, 18, 2);

    fill(221, 210, 190, 235);
    rect(-9, -2, 18, 5);
    rect(-7, 3, 14, 1);

    // Curry side.
    fill(170, 97, 47, 240);
    rect(0, -1, 7 + Math.min(4, tier), 4);
    rect(2, 3, 5 + Math.min(2, tier), 1);

    // Rice side.
    fill(235, 226, 207, 235);
    rect(-7, -1, 7 + Math.min(3, tier), 4);
    rect(-5, 3, 4 + Math.min(2, tier), 1);

    // Each tier adds one square accompaniment.
    if (tier >= 2) {
      drawPixelDot(-8, -6, 3, 2, [151, 57, 48], 225);
    }
    if (tier >= 3) {
      drawPixelDot(7, -6, 4, 3, [206, 145, 64], 230);
    }
    if (tier >= 4) {
      drawPixelDot(8, 5, 5, 2, [201, 192, 169], 225);
    }
    if (tier >= 5) {
      drawPixelDot(2, -7, 8, 2, [118, 76, 45], 225);
    }
    if (tier >= 6) {
      drawPixelDot(-1, 6, 4, 2, [225, 158, 62], 230);
    }

    popMatrix();
  }

  function drawMasalaBottle() {
    const x = PHONE_X + PHONE_W + 9;
    const y = PHONE_Y + 25;
    const ratio = clamp(model.masalaDisplayCharge / masalaRushChargeRequired(), 0, 1);
    const active = masalaRushActive();
    const pulse = 0.5 + 0.5 * Math.sin(model.time * 8.5);

    // A tiny spice vial clipped to the phone: part meter, part physical prop.
    noStroke();
    fill(75, 68, 61, 235);
    rect(x - 4, y - 11, 8, 20);
    fill(28, 26, 24, 255);
    rect(x - 2.5, y + 9, 5, 4);

    const fillH = 16 * ratio;
    if (fillH > 0.2) {
      fill(218, 139, 51, 210 + 35 * ratio);
      rect(x - 2.5, y - 8, 5, fillH);
    }

    if (active) {
      const glowW = 14 + Math.round(pulse * 4);
      const glowH = 28 + Math.round(pulse * 4);

      // Pixel halo: a stepped frame around the vial, never a smooth ellipse.
      drawPixelOctagonOutline(
        x,
        y,
        glowW,
        glowH,
        C.amber,
        72 + pulse * 110,
        1,
        2,
        [73, 49, 36],
        0
      );

      // Small corner sparks keep the active state alive without a vector ring.
      if (pulse > 0.62) {
        drawPixelDot(x - 9, y + 7, 1, 2, C.amber, 105);
        drawPixelDot(x + 8, y - 6, 1, 2, C.amber, 85);
      }
    }

    // When the bottle fills, the cap visibly pops instead of the meter simply
    // resetting to zero. This is the trigger beat for the rush.
    if (model.masalaBurstTimer > 0) {
      const t = 1 - model.masalaBurstTimer / MASALA_BURST_DURATION;
      const alpha = 1 - t;
      const capY = y + 11 + t * 12;
      fill(52, 45, 39, 240 * alpha);
      rect(x - 3, capY, 6, 3);

      const spread = 3 + Math.round(t * 9);
      drawPixelPopBurst(
        x,
        y + 1,
        C.amber,
        alpha,
        spread
      );
    }
  }

  function drawNightLightIcon(cx, cy, alive, alpha = 1) {
    const casing = alive ? [112, 78, 48] : [58, 48, 43];
    const glass = alive ? [226, 159, 43] : [48, 40, 37];
    const glow = alive ? [239, 216, 171] : [67, 58, 53];

    noStroke();

    // Tiny shop-lantern silhouette: cap, warm window, and foot. At this scale
    // it reads as a small light rather than another abstract meter segment.
    fill(...rgba(casing, 230 * alpha));
    rect(cx - 3, cy + 5, 6, 2);
    rect(cx - 5, cy + 2, 10, 3);

    fill(...rgba(glass, (alive ? 235 : 155) * alpha));
    rect(cx - 4, cy - 4, 8, 6);

    fill(...rgba(glow, (alive ? 220 : 80) * alpha));
    rect(cx - 2, cy - 2, 4, 3);

    fill(...rgba(casing, 220 * alpha));
    rect(cx - 5, cy - 6, 10, 2);
  }

  function drawLeftNightGauge() {
    const iconW = 10;
    const gap = 4;
    const startX = LEFT_NIGHT_GAUGE_X;
    const centerY = LEFT_NIGHT_GAUGE_Y + 1;

    for (let i = 0; i < NIGHT_GAUGE_MAX; i += 1) {
      const alive = i < model.nightGauge;
      const cx = startX + iconW * 0.5 + i * (iconW + gap);
      drawNightLightIcon(cx, centerY, alive, 1);
    }

    if (model.nightGaugeFxTimer > 0) {
      const life = model.nightGaugeFxTimer / NIGHT_GAUGE_FX_DURATION;
      const lostIndex = clamp(model.nightGauge, 0, NIGHT_GAUGE_MAX - 1);
      const xFx = startX + iconW * 0.5 + lostIndex * (iconW + gap);
      const spread = (1 - life) * 5;

      // A light does not simply disappear: it gives one small warm flicker as
      // it goes out, making the heat-zero -> night-loss relationship readable.
      noFill();
      stroke(226, 159, 43, 165 * life);
      strokeWidth(1);
      rect(
        xFx - 6 - spread,
        centerY - 8 - spread,
        12 + spread * 2,
        16 + spread * 2
      );
      noStroke();
    }
  }

  function drawPixelScoreRight(textValue, rightX, y, color, alpha = 1, pixel = 1.8) {
    const totalW = pixelScoreWidth(textValue, pixel);
    drawPixelScore(textValue, rightX - totalW * 0.5, y, color, alpha, pixel);
  }

  function drawTerminalMechanicalCounter(fx, currentValue, rightX, y, pixel) {
    if (!fx) {
      drawPixelScoreRight(Math.floor(currentValue || 0), rightX, y, C.cream, 1, pixel);
      return;
    }

    const t = clamp(fx.age / fx.duration, 0, 1);
    const switchAt = 0.46;
    const impact = Math.sin(Math.PI * clamp((t - 0.34) / 0.42, 0, 1));
    const jitter = impact > 0.05 ? (Math.floor(t * 54) % 2 === 0 ? -1 : 1) * impact : 0;

    // Split-flap / mechanical counter beat: the old number drops away and
    // the new value lands with a tiny physical knock. No seam-flash overlay.
    if (t < switchAt) {
      const p = clamp(t / switchAt, 0, 1);
      drawPixelScoreRight(fx.from, rightX + jitter, y - easeInCubic(p) * 7, C.cream, 1 - p * 0.55, pixel);
    } else {
      const p = clamp((t - switchAt) / (1 - switchAt), 0, 1);
      const settle = easeOutCubic(p);
      drawPixelScoreRight(fx.to, rightX + jitter, y + (1 - settle) * 8, C.cream, 0.62 + settle * 0.38, pixel);
    }
  }

  function drawTerminalDeliveryCounter() {
    drawTerminalMechanicalCounter(
      model.deliveryCounterFx,
      model.deliveries,
      STATUS_INFO_RIGHT_X,
      STATUS_INFO_Y_TOP - 8,
      2.2
    );
  }

  function drawTerminalSalesCounter() {
    drawTerminalMechanicalCounter(
      model.salesCounterFx,
      model.sales,
      STATUS_INFO_RIGHT_X,
      STATUS_INFO_Y_BOTTOM,
      2.6
    );
  }

  function drawTerminalRightInfo() {
    // Top row = jobs completed. Bottom row = tonight's sales.
    // Pin and ¥ act as the only labels; no SCORE/SALES text is needed here.
    const pinColor = deliverySlotColor(2);
    const labelX = STATUS_INFO_X + 6;

    pushMatrix();
    translate(labelX, STATUS_INFO_Y_TOP - 3);
    drawDestinationPinShape(pinColor, 1, 0.92);
    popMatrix();

    drawPixelScore("¥", labelX, STATUS_INFO_Y_BOTTOM, pinColor, 1, 1.9);
    drawTerminalDeliveryCounter();
    drawTerminalSalesCounter();
  }

  function drawTerminalDivider() {
    noStroke();
    fill(64, 53, 48, 210);
    rect(TERMINAL_DIVIDER_X, TERMINAL_SCREEN_Y + 7, 1, TERMINAL_SCREEN_H - 14);
  }

  function drawPepperFrameShine(x, y, w, h, t) {
    const p = clamp(t, 0, 1);
    const perimeter = Math.max(1, 2 * (w + h));
    let d = p * perimeter;
    let sx = x;
    let sy = y;
    let horizontal = true;

    if (d <= w) {
      sx = x + d;
      sy = y;
      horizontal = true;
    } else if ((d -= w) <= h) {
      sx = x + w;
      sy = y + d;
      horizontal = false;
    } else if ((d -= h) <= w) {
      sx = x + w - d;
      sy = y + h;
      horizontal = true;
    } else {
      d -= w;
      sx = x;
      sy = y + h - d;
      horizontal = false;
    }

    const pulse = Math.sin(Math.PI * p);
    noStroke();
    fill(...rgba(C.cream, 120 + pulse * 120));
    if (horizontal) {
      rect(Math.round(sx - 4), Math.round(sy - 1), 8, 2);
      fill(...rgba(C.amber, 95 + pulse * 110));
      rect(Math.round(sx - 1), Math.round(sy - 2), 3, 4);
    } else {
      rect(Math.round(sx - 1), Math.round(sy - 4), 2, 8);
      fill(...rgba(C.amber, 95 + pulse * 110));
      rect(Math.round(sx - 2), Math.round(sy - 1), 4, 3);
    }
  }

  function drawHeatSteamIcon(cx, cy, heat, hotReady = false, hotReadyFxT = null) {
    const h = clamp(heat, 0, 100);
    const barColor = heatBarColor(h);
    const curryAlpha = h > 0 ? 230 : 78;

    noStroke();

    // Clearer heat symbol: one larger front-facing bowl on the same pixel grid.
    // The bowl always represents the temperature area. HOT readiness is shown
    // by steam that belongs to this existing icon, rather than by a detached
    // notch or dot inside the bar.
    fill(56, 42, 33, 235);
    rect(cx - 7, cy - 5, 14, 2);
    rect(cx - 6, cy - 7, 12, 2);
    rect(cx - 4, cy - 9, 8, 2);

    fill(239, 216, 171, 240);
    rect(cx - 6, cy - 4, 12, 4);
    rect(cx - 5, cy, 10, 2);

    fill(barColor[0], barColor[1], barColor[2], curryAlpha);
    rect(cx - 5, cy - 3, 10, 2);
    rect(cx - 4, cy - 1, 8, 1);

    // Small side handles keep it reading as a dish even without steam.
    fill(214, 167, 100, 220);
    rect(cx - 8, cy - 3, 1, 2);
    rect(cx + 7, cy - 3, 1, 2);

    if (!hotReady) return;

    // HOT completion follows the same hierarchy as the rest of the game:
    // a short, clear event when the condition is earned, then a quiet static
    // state. No continuous pulsing or travelling light remains afterward.
    if (hotReadyFxT !== null) {
      const t = clamp(hotReadyFxT, 0, 1);
      const offsets = [
        { x: -3, delay: 0.00, flip: 1 },
        { x:  2, delay: 0.10, flip: -1 },
        { x:  0, delay: 0.22, flip: 1 },
      ];

      for (const puff of offsets) {
        const local = clamp((t - puff.delay) / 0.62, 0, 1);
        if (local <= 0 || local >= 1) continue;
        const alpha = Math.sin(local * Math.PI) * 205;
        const rise = Math.round(local * 5);
        drawPixelSteamPuff(
          cx + puff.x,
          cy + 3 + rise,
          C.cream,
          alpha,
          puff.flip,
          2
        );
      }
      return;
    }

    // Ready state: two tiny fixed steam glyphs are enough to make the icon's
    // meaning readable while keeping the terminal calm.
    drawPixelSteamPuff(cx - 2, cy + 3, C.cream, 150, 1, 2);
    drawPixelSteamPuff(cx + 3, cy + 4, C.cream, 118, -1, 2);
  }

  function drawBatchCompletePhoneFx() {
    if (model.batchCompleteFxTimer <= 0) return;
    if (model.batchCompleteFxTimer > BATCH_COMPLETE_FLASH_DURATION) return;

    const life = clamp(model.batchCompleteFxTimer / BATCH_COMPLETE_FLASH_DURATION, 0, 1);
    const pulse = Math.sin(Math.PI * (1 - life));
    const alpha = 70 + pulse * 145;

    noFill();
    stroke(...rgba(C.amber, alpha));
    strokeWidth(1);
    rect(
      TERMINAL_SCREEN_X - 1,
      TERMINAL_SCREEN_Y - 1,
      TERMINAL_SCREEN_W + 2,
      TERMINAL_SCREEN_H + 2
    );
    noStroke();
  }

  function drawDeliveryOrderWrongFx() {
    if (model.deliveryOrderWrongFxTimer <= 0) return;

    const life = clamp(model.deliveryOrderWrongFxTimer / DELIVERY_ORDER_WRONG_FX_DURATION, 0, 1);
    const appear = clamp((1 - life) / 0.16, 0, 1);
    const alpha = Math.min(1, appear * 1.4) * Math.min(1, life * 2.3);
    const text = SSE.i18n.t("orderMode.wrong");
    const centerX = ORDER_GROUP_LEFT + ORDER_GROUP_W * 0.5;
    const centerY = PHONE_CARD_Y - 4;

    // Wrong-order feedback temporarily replaces the curry-card row itself.
    // This keeps the correction exactly where the player was looking instead
    // of opening a second speech bubble elsewhere on the terminal.
    const pixel = fitPixelSize(text, 1.72, ORDER_GROUP_W - 18, 1, 1.28);
    drawPixelText(text, centerX, centerY, C.chili, alpha, pixel, "center", 1);
  }

  function drawPhone() {
    const buzzX = returnPhoneBuzzOffset();

    pushMatrix();
    translate(buzzX, 0);

    if (model.nightOver) {
      popMatrix();
      return;
    }

    const heat = clamp(model.curryHeat, 0, 100);
    const activeTargets = packedActiveTargets();
    const activeCount = activeTargets.length;
    const wrongOrderFxActive = model.deliveryOrderWrongFxTimer > 0;
    const expectedTarget = model.deliveryOrderMode && model.deliveryOrderSequenceEnforced
      ? expectedDeliveryTarget()
      : null;
    const hintRemaining = Math.min(DELIVERY_ORDER_HINT_DURATION, model.deliveryOrderHintTimer);
    const hintProgress = hintRemaining > 0
      ? 1 - hintRemaining / DELIVERY_ORDER_HINT_DURATION
      : 1;
    const hintPop = hintRemaining > 0 ? Math.sin(Math.PI * clamp(hintProgress, 0, 1)) : 0;

    // Top row: only the three color/curry tabs, packed left when done. Each
    // order keeps its own colour while its display position slides left. During
    // a wrong-order correction, the cards disappear briefly and the boss's
    // short "チガウヨ！" occupies this exact row instead.
    if (!wrongOrderFxActive) {
      activeTargets.forEach((target, idx) => {
        const age = target.orderAge ?? 0;
        if (age < 0) return;
        const t = clamp(age / ORDER_CARD_IN_DURATION, 0, 1);
        const eased = easeOutCubic(t);
        const xOffset = (1 - eased) * 24;
        const alpha = clamp(t / 0.45, 0, 1);
        const displaySlot = target.displaySlot ?? (idx + 1);
        const colorSlot = target.orderSlot || (idx + 1);
        const correctionPop = target === expectedTarget ? hintPop : 0;
        const sequenceFocus = expectedTarget && target === expectedTarget
          ? 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(model.time * 5.6))
          : 0;
        const sequenceDim = expectedTarget && target !== expectedTarget
          ? 0.22
          : 0;
        const focusLift = sequenceFocus > 0 ? 1.4 + sequenceFocus * 1.3 : 0;
        drawOrderCard(
          displaySlot,
          colorSlot,
          target.curryVisual || "butter",
          alpha,
          xOffset,
          correctionPop * 1.6 + focusLift,
          (0.96 + 0.04 * eased) * (1 + correctionPop * 0.035 + sequenceFocus * 0.025),
          phoneOrderLayoutCount(),
          sequenceFocus,
          sequenceDim
        );
      });
    }

    const showReturnShopIcon = returnShopIconVisible();
    const returningEmpty = !!model.returnGuide
      && !model.carrying
      && activeCount === 0;

    if (!wrongOrderFxActive) drawOrderExitFx();
    if (!wrongOrderFxActive && showReturnShopIcon) drawReturnShopIcon();
    drawTerminalDivider();
    drawTerminalRightInfo();
    // The lamps are part of the persistent lower status row, including the
    // empty-handed walk back to the shop.
    drawLeftNightGauge();

    if (model.carrying || activeCount > 0 || model.heatBarHoldTimer > 0 || returningEmpty) {
      // Middle row: one continuous temperature bar inside one square frame.
      // It is intentionally lower than the order slots and has no background
      // guide line behind the upper row.
      const frameX = HEAT_FRAME_X;
      const frameY = HEAT_FRAME_Y;
      const frameW = HEAT_FRAME_W;
      const frameH = HEAT_FRAME_H;
      const innerPad = 3;
      const innerX = frameX + innerPad;
      const innerY = frameY + innerPad;
      const innerW = frameW - innerPad * 2;
      const innerH = frameH - innerPad * 2;
      // No curry is being carried on the return leg. Keep the bowl, frame,
      // and lamps visible, but show the temperature track as empty.
      const displayHeat = returningEmpty ? 0 : heat;
      const heatRatio = displayHeat / 100;
      const hotReadyFxActive = model.masalaHotReadyFxTimer > 0;
      const hotReadyFxT = hotReadyFxActive
        ? 1 - model.masalaHotReadyFxTimer / MASALA_HOT_READY_FX_DURATION
        : 0;
      const rushRequired = masalaRushChargeRequired();
      const rushPrimed = !masalaRushActive() && model.masalaCharge >= rushRequired;

      // Strict visual ownership:
      // - HOT completion lives INSIDE the bar.
      // - PEPPER progress owns the OUTER frame.
      // Both stay quiet between events; only completion moments animate.
      drawHeatSteamIcon(
        HEAT_ICON_X,
        frameY + frameH * 0.5,
        displayHeat,
        rushPrimed,
        hotReadyFxActive ? hotReadyFxT : null
      );

      // PEPPER progress is the only persistent meaning of the outer border.
      const pepperRatio = clamp(model.pepperHeld / PEPPER_RUSH_COST, 0, 1);
      const pepperReady = model.pepperHeld >= PEPPER_RUSH_COST;
      const pepperFrameBase = [86, 70, 62];
      const pepperFrameBuilding = [184, 76, 54];
      const pepperFrameReady = [224, 108, 60];
      // Progress stays subdued. The ninth chili gets a clearly brighter but
      // completely static frame so 8/9 remains readable after the glint ends.
      const buildingRatio = Math.min(1, pepperRatio / (8 / PEPPER_RUSH_COST));
      const pepperFrameColor = pepperReady
        ? pepperFrameReady
        : [
            lerp(pepperFrameBase[0], pepperFrameBuilding[0], buildingRatio),
            lerp(pepperFrameBase[1], pepperFrameBuilding[1], buildingRatio),
            lerp(pepperFrameBase[2], pepperFrameBuilding[2], buildingRatio),
          ];
      noFill();
      stroke(pepperFrameColor[0], pepperFrameColor[1], pepperFrameColor[2], 255);
      strokeWidth(pepperRatio >= 0.67 ? 2 : 1);
      rect(frameX, frameY, frameW, frameH);

      // Every chili gives the PEPPER frame one tiny, fixed-position tick. The
      // full perimeter glint remains reserved for reaching the RUSH threshold.
      if (model.pepperPickupFrameFxTimer > 0) {
        const life = model.pepperPickupFrameFxTimer / PEPPER_PICKUP_FRAME_PULSE_DURATION;
        stroke(198, 83, 56, 55 + life * 95);
        strokeWidth(1);
        rect(frameX, frameY, frameW, frameH);
      }
      noStroke();

      fill(48, 39, 36, 235);
      rect(innerX, innerY, innerW, innerH);

      const fillW = innerW * heatRatio;
      if (fillW > 0.25) {
        const barColor = heatBarColor(displayHeat);
        fill(barColor[0], barColor[1], barColor[2], 245);
        rect(innerX, innerY, fillW, innerH);

      }

      // HOT-ready feedback now belongs entirely to the bowl icon above.
      // The temperature bar remains a pure temperature display with no
      // detached readiness dots, notches, flashes, or travelling highlights.

      if (model.pepperFrameFxTimer > 0) {
        const shineT = 1 - model.pepperFrameFxTimer / PEPPER_FRAME_READY_FX_DURATION;
        drawPepperFrameShine(frameX - 1, frameY - 1, frameW + 2, frameH + 2, shineT);
      }

      // Reheat is also HOT-side feedback, so keep it inside the bar instead of
      // borrowing PEPPER's outer frame.
      if (model.reheatFxTimer > 0) {
        const life = model.reheatFxTimer / REHEAT_FX_DURATION;
        const progress = 1 - life;
        const flashW = Math.max(4, innerW * 0.16);
        const flashX = innerX - flashW + (innerW + flashW) * progress;
        const clippedX = Math.max(innerX, flashX);
        const clippedW = Math.max(0, Math.min(innerX + innerW, flashX + flashW) - clippedX);
        if (clippedW > 0.25) {
          fill(...rgba(C.cream, 55 + 135 * life));
          rect(clippedX, innerY, clippedW, innerH);
        }
      }

      // Fresh pickup finishes with one tiny internal warm blink. The outer
      // frame is intentionally untouched so its meaning remains PEPPER only.
      if (model.pickupLeadin) {
        const readyAt = PICKUP_SETTLE_DURATION + PICKUP_HEAT_FILL_DURATION;
        const readyAge = model.pickupLeadin.age - readyAt;
        const readyDuration = Math.max(0.01, PICKUP_TOTAL_DURATION - readyAt);
        if (readyAge >= 0 && readyAge < readyDuration) {
          const readyLife = 1 - readyAge / readyDuration;
          fill(...rgba(C.amber, 36 + 72 * readyLife));
          rect(innerX, innerY, innerW, innerH);
        }
      }

      if (model.bikeHeatFxTimer > 0 && model.bikeHeatFxLoss > 0) {
        const life = model.bikeHeatFxTimer / 0.75;
        drawPixelText(`-${model.bikeHeatFxLoss}`, frameX + frameW, frameY - 10 + (1 - life) * 7, C.chili, 0.80 * life, 1.45, "right", 1);
      }
      if (model.deliveryOrderHeatFxTimer > 0 && model.deliveryOrderHeatFxLoss > 0) {
        const life = model.deliveryOrderHeatFxTimer / DELIVERY_ORDER_HEAT_FX_DURATION;
        drawPixelText(`-${model.deliveryOrderHeatFxLoss}`, frameX + frameW, frameY - 10 + (1 - life) * 7, C.chili, 0.82 * life, 1.45, "right", 1);
      }
    }

    drawBatchCompletePhoneFx();
    drawDeliveryOrderWrongFx();
    popMatrix();
  }

  function drawOrderArrowFlights() {
    for (const target of model.activeTargets) {
      if (target.delivered || target.markerReady || target.flightAge == null) continue;

      const t = clamp(target.flightAge / ORDER_ARROW_FLIGHT_DURATION, 0, 1);
      const eased = easeOutCubic(t);
      const sourceSlot = target.displaySlot ?? packedDisplaySlotForTarget(target) ?? (target.orderSlot || 1);
      const source = phoneCardCenter(sourceSlot);
      const base = cellCenter(target.c, target.r);
      const dest = worldToScreen(base.x, base.y + TARGET_ARROW_REST_Y);

      const x = source.x + (dest.x - source.x) * eased;
      const yLinear = source.y + (dest.y - source.y) * eased;
      const arc = Math.sin(Math.PI * t) * 25;
      const y = yLinear + arc;
      const alpha = clamp(t / 0.12, 0, 1) * clamp((1 - t) / 0.08, 0, 1);
      const iconScale = 0.66 + 0.22 * Math.sin(Math.PI * t);

      // A short trail makes the causal movement readable without adding text.
      const prevT = Math.max(0, t - 0.075);
      const prevE = easeOutCubic(prevT);
      const px = source.x + (dest.x - source.x) * prevE;
      const py = source.y + (dest.y - source.y) * prevE + Math.sin(Math.PI * prevT) * 25;
      const color = deliverySlotColor(target.orderSlot);
      drawPixelTrailSegment(
        px,
        py,
        x,
        y,
        color,
        75 * alpha,
        3,
        1
      );

      pushMatrix();
      translate(x, y);
      drawDestinationPinShape(color, alpha, iconScale);
      popMatrix();
    }
  }

  function drawTerminalChassis() {
    const screenX = TERMINAL_SCREEN_X;
    const screenY = TERMINAL_SCREEN_Y;
    const screenW = TERMINAL_SCREEN_W;
    const screenH = TERMINAL_SCREEN_H;
    const termX = TERMINAL_BODY_X;
    const termY = 8;
    const termW = TERMINAL_BODY_W;
    const termH = CONTROL_H - 12;
    const termCX = termX + termW * 0.5;
    const termCY = termY + termH * 0.5;
    const screenCX = screenX + screenW * 0.5;
    const screenCY = screenY + screenH * 0.5;

    // Keep the device simple: depth comes from a few stacked pixel planes,
    // not from added buttons or decorative hardware.
    drawPixelOctagonFill(
      termCX,
      termCY - 2,
      termW,
      termH,
      [23, 15, 11],
      255,
      8
    );

    drawPixelOctagonFill(
      termCX,
      termCY,
      termW,
      termH,
      [70, 47, 35],
      255,
      8
    );

    drawPixelOctagonFill(
      termCX,
      termCY + 1,
      termW - 8,
      termH - 8,
      [78, 52, 38],
      255,
      6
    );

    // One calm highlight and one grounded shadow are enough to make the shell
    // feel like a physical object without turning it into a busy gadget.
    noStroke();
    fill(117, 79, 55, 118);
    rect(termX + 13, termY + termH - 9, termW - 26, 2);
    fill(35, 23, 18, 160);
    rect(termX + 13, termY + 6, termW - 26, 3);

    // Recessed display: dark bezel, thin intermediate lip, then the screen.
    drawPixelOctagonFill(
      screenCX,
      screenCY,
      screenW + 10,
      screenH + 10,
      [38, 25, 19],
      255,
      5
    );
    drawPixelOctagonFill(
      screenCX,
      screenCY,
      screenW + 4,
      screenH + 4,
      C.uiBorder,
      150,
      3
    );
    drawPixelOctagonFill(
      screenCX,
      screenCY,
      screenW,
      screenH,
      C.night,
      248,
      2
    );

    fill(...rgba(C.uiBorder, 72));
    rect(screenX + 3, screenY + 3, screenW - 6, 1);
    rect(screenX + 3, screenY + 3, 1, screenH - 6);

    // A single shallow slit is the only decorative device detail.
    fill(40, 27, 21, 220);
    rect(termX + termW - 46, termY + termH - 11, 20, 2);
    fill(118, 78, 53, 88);
    rect(termX + termW - 44, termY + termH - 8, 12, 1);
  }

  function drawBriefingTerminal(age, textGroup = "briefing", messageAt = BRIEFING_MESSAGE_AT, messageIn = BRIEFING_MESSAGE_IN) {
    noStroke();
    fill(...rgba(C.control));
    rect(0, 0, W, CONTROL_H);
    fill(...rgba(C.uiBorder, 220));
    rect(0, CONTROL_H - 1, W, 1);

    const screenX = TERMINAL_SCREEN_X;
    const screenY = TERMINAL_SCREEN_Y;
    const screenW = TERMINAL_SCREEN_W;
    const screenH = TERMINAL_SCREEN_H;
    drawTerminalChassis();

    // Keep the familiar fixed pad body visible, but with a clearer
    // deep-night -> UI -> pad contrast ladder.
    drawPixelOctagonFill(PAD_X, PAD_Y + 2, 112, 34, C.night, 245, 7);
    drawPixelOctagonFill(PAD_X, PAD_Y, 96, 96, C.control, 250, 11);
    drawPixelOctagonFill(PAD_X, PAD_Y, 82, 82, C.padBg, 255, 9);
    drawPixelOctagonFill(PAD_X, PAD_Y, 68, 68, C.control, 255, 8);

    const t = clamp((age - messageAt) / messageIn, 0, 1);
    if (t <= 0) return;

    const eased = easeOutBack(t);
    const alpha = clamp(t / 0.45, 0, 1);
    const bubbleW = Math.min(218, screenW - 92);
    const bubbleH = 56;
    const bubbleX = screenX + 16 + (1 - eased) * 22;
    const bubbleY = screenY + (screenH - bubbleH) * 0.5;

    // LINE-like incoming message, translated into the game's square/pixel
    // grammar. Keep the sender just above the bubble, but fully inside the
    // terminal screen.
    const senderText = SSE.i18n.t(`${textGroup}.sender`);
    const senderPixel = fitPixelSize(senderText, 1.32, bubbleW, 1, 1.0);
    drawPixelText(senderText, bubbleX, bubbleY + bubbleH + 1, C.cream, alpha * 0.92, senderPixel, "left", 1);

    noStroke();
    fill(250, 246, 236, 248 * alpha);
    rect(bubbleX, bubbleY, bubbleW, bubbleH);

    // Speech tail: left edge, near the upper-left corner.
    // It points outward horizontally rather than sticking out of the top edge.
    const tailY = bubbleY + bubbleH - 12;
    rect(bubbleX - 4, tailY, 6, 7);
    rect(bubbleX - 7, tailY + 2, 4, 3);

    const line1 = SSE.i18n.t(`${textGroup}.line1`);
    const line2 = SSE.i18n.t(`${textGroup}.line2`);
    const messageMaxW = bubbleW - 22;
    const line1Pixel = fitPixelSize(line1, 1.48, messageMaxW, 1, 1.02);
    const line2Pixel = fitPixelSize(line2, 1.48, messageMaxW, 1, 1.02);
    drawPixelText(line1, bubbleX + 9, bubbleY + 32, C.windowDark, alpha * 0.99, line1Pixel, "left", 1);
    drawPixelText(line2, bubbleX + 9, bubbleY + 11, C.windowDark, alpha * 0.99, line2Pixel, "left", 1);

    // Tiny pixel chevron only; no vector line and no extra label/button.
    if (t >= 0.98) {
      const pulse = 0.45 + 0.55 * Math.sin(model.time * 4.0);
      const cx = bubbleX + bubbleW - 12;
      const cy = bubbleY + 8;
      drawPixelChevronDown(
        cx,
        cy,
        C.buildingTop,
        (110 + 80 * pulse) * alpha
      );
    }
  }

  function briefingTerminalOffset(age) {
    const t = clamp(age / BRIEFING_TERMINAL_IN, 0, 1);
    return lerp(-CONTROL_H - 18, 0, easeOutBack(t));
  }

  function drawBriefingScene(age) {
    background(...C.night);
    drawWorld();

    const terminalY = briefingTerminalOffset(age);
    pushMatrix();
    translate(0, terminalY);

    drawBriefingTerminal(age);
    drawPad();

    // One very short "incoming" flash after the terminal has landed.
    if (age >= BRIEFING_BEEP_AT && age < BRIEFING_BEEP_AT + 0.12) {
      const t = (age - BRIEFING_BEEP_AT) / 0.12;
      const a = Math.sin(t * Math.PI) * 125;
      noFill();
      stroke(...rgba(C.amber, a));
      strokeWidth(1);
      rect(TERMINAL_SCREEN_X - 2, TERMINAL_SCREEN_Y - 2, TERMINAL_SCREEN_W + 4, TERMINAL_SCREEN_H + 4);
      noStroke();
    }

    popMatrix();
  }

  function drawBottomStatus() {
    if (model.deliveryOrderIntro && model.deliveryOrderIntro.active) {
      drawBriefingTerminal(
        model.deliveryOrderIntro.age,
        "orderMode",
        0,
        DELIVERY_ORDER_INTRO_MESSAGE_IN
      );
      return;
    }

    noStroke();
    fill(...rgba(C.control));
    rect(0, 0, W, CONTROL_H);
    fill(...rgba(C.uiBorder, 220));
    rect(0, CONTROL_H - 1, W, 1);

    const screenX = TERMINAL_SCREEN_X;
    const screenY = TERMINAL_SCREEN_Y;
    const screenW = TERMINAL_SCREEN_W;
    const screenH = TERMINAL_SCREEN_H;
    // Start over: plain body, one deep information panel, fixed pad below.
    drawTerminalChassis();

    // Pixel-built base behind the fixed pad location.
    drawPixelOctagonFill(PAD_X, PAD_Y + 2, 112, 34, C.night, 245, 7);
    drawPixelOctagonFill(PAD_X, PAD_Y, 96, 96, C.control, 250, 11);
    drawPixelOctagonFill(PAD_X, PAD_Y, 82, 82, C.padBg, 255, 9);
    drawPixelOctagonFill(PAD_X, PAD_Y, 68, 68, C.control, 255, 8);

    drawPhone();
  }

  function drawPad() {
    const controlActive = gameplayControlActive();
    const inputX = model.keyboardActive
      ? PAD_X + model.keyboardIntentX * PAD_MAX_RANGE
      : model.touchX;
    const inputY = model.keyboardActive
      ? PAD_Y + model.keyboardIntentY * PAD_MAX_RANGE
      : model.touchY;
    const dxRaw = inputX - PAD_X;
    const dyRaw = inputY - PAD_Y;
    const len = Math.hypot(dxRaw, dyRaw);
    const s = len > PAD_MAX_RANGE && len > 0 ? PAD_MAX_RANGE / len : 1;
    const dx = dxRaw * s;
    const dy = dyRaw * s;
    const knobRange = 8;
    const knobScale = PAD_MAX_RANGE > 0 ? knobRange / PAD_MAX_RANGE : 0;
    const knobX = controlActive ? PAD_X + dx * knobScale : PAD_X;
    const knobY = controlActive ? PAD_Y + dy * knobScale : PAD_Y;

    // The control keeps its round-ish tactile silhouette, but every contour
    // is now a stepped pixel octagon.
    drawPixelOctagonFill(
      PAD_X,
      PAD_Y,
      PAD_RADIUS * 2,
      PAD_RADIUS * 2,
      C.padBg,
      255,
      7
    );
    drawPixelOctagonFill(
      PAD_X,
      PAD_Y,
      PAD_RADIUS * 2 - 8,
      PAD_RADIUS * 2 - 8,
      C.control,
      255,
      6
    );

    const arrowDist = PAD_RADIUS - 9;
    const arrowAlpha = 170;

    drawPixelPadArrow(
      "up",
      PAD_X,
      PAD_Y + arrowDist,
      C.padArrow,
      arrowAlpha
    );
    drawPixelPadArrow(
      "down",
      PAD_X,
      PAD_Y - arrowDist,
      C.padArrow,
      arrowAlpha
    );
    drawPixelPadArrow(
      "left",
      PAD_X - arrowDist,
      PAD_Y,
      C.padArrow,
      arrowAlpha
    );
    drawPixelPadArrow(
      "right",
      PAD_X + arrowDist,
      PAD_Y,
      C.padArrow,
      arrowAlpha
    );

    if (controlActive) {
      // Active state = one blocky guide frame around the resting centre.
      drawPixelOctagonOutline(
        PAD_X,
        PAD_Y,
        28,
        28,
        C.cream,
        65,
        1,
        4,
        C.control,
        255
      );
    }

    // Thumb nub: two stepped blocks plus one square highlight.
    drawPixelOctagonFill(
      knobX,
      knobY,
      18,
      18,
      [126, 97, 72],
      controlActive ? 235 : 215,
      4
    );
    drawPixelOctagonFill(
      knobX,
      knobY,
      12,
      12,
      [86, 64, 50],
      255,
      3
    );
    drawPixelDot(
      knobX - 3,
      knobY + 2,
      3,
      3,
      C.cream,
      controlActive ? 180 : 120
    );

    noStroke();
  }

  function drawBikeWarning() {
    const preWarning = model.bikePhase === "warning";
    const overlapWarning = model.bikePhase === "ride" && model.bikeWarningLingerTimer > 0;
    if (
      model.nightOver
      || masalaRushActive()
      || (!preWarning && !overlapWarning)
    ) {
      return;
    }

    const bikeWorld = cellCenter(1, BIKE_ROW);
    const screen = worldToScreen(bikeWorld.x, bikeWorld.y);
    const y = clamp(screen.y, CONTROL_H + 20, BOARD_TOP - 16);

    let alpha = 0;
    if (preWarning) {
      const progress = 1 - model.bikeWarningTimer / BIKE_WARNING_TIME;
      const reveal = clamp((progress - 0.06) / 0.34, 0, 1);
      const soften = 1 - clamp((progress - 0.88) / 0.12, 0, 1);
      const flashPhase = clamp((progress - 0.14) / 0.55, 0, 1);
      const singleFlash = Math.sin(Math.PI * flashPhase);
      alpha = Math.min(245, (150 + singleFlash * 105) * reveal * soften);
    } else {
      // Keep the marker for a few retro-game frames after the bicycle enters.
      // The warning bell is allowed only during this overlap, when both the
      // marker and the bicycle itself are visible on screen.
      alpha = 215 * clamp(model.bikeWarningLingerTimer / BIKE_WARNING_LINGER_TIME, 0, 1);
    }
    if (alpha <= 1) return;

    // Three compact stepped trails: continuous square dots, no gaps.
    drawPixelDot(5, y + 5, 2, 1, C.cream, alpha);
    drawPixelDot(7, y + 6, 2, 1, C.cream, alpha);
    drawPixelDot(9, y + 6, 2, 1, C.cream, alpha);
    drawPixelDot(11, y + 7, 2, 1, C.cream, alpha);

    drawPixelDot(7, y, 2, 1, C.cream, alpha);
    drawPixelDot(9, y, 2, 1, C.cream, alpha);
    drawPixelDot(11, y + 1, 2, 1, C.cream, alpha);
    drawPixelDot(13, y + 1, 2, 1, C.cream, alpha);

    drawPixelDot(5, y - 5, 2, 1, C.cream, alpha);
    drawPixelDot(7, y - 6, 2, 1, C.cream, alpha);
    drawPixelDot(9, y - 6, 2, 1, C.cream, alpha);
    drawPixelDot(11, y - 7, 2, 1, C.cream, alpha);
  }

  function drawMasalaRushScreenFx() {
    if (!masalaRushActive()) return;

    const elapsed = model.masalaRushAge;
    const enterDur = 0.52;
    const holdDur = 1.20;
    const exitDur = 0.62;
    const totalDur = enterDur + holdDur + exitDur;
    if (elapsed >= totalDur) return;

    const startX = W + 180;
    const centerX = W * 0.5;
    const endX = -180;
    let x = centerX;

    if (elapsed < enterDur) {
      x = lerp(startX, centerX, easeOutCubic(elapsed / enterDur));
    } else if (elapsed < enterDur + holdDur) {
      x = centerX;
    } else {
      x = lerp(centerX, endX, easeInCubic((elapsed - enterDur - holdDur) / exitDur));
    }

    const pulse = 0.5 + 0.5 * Math.sin(model.time * 10.5);
    const y = CONTROL_H + (BOARD_TOP - CONTROL_H) * 0.50;

    drawPixelText("MASALA RUSH", x + 2, y - 2, C.windowDark, 0.82, 2.25, "center", 1);
    drawPixelText("MASALA RUSH", x, y, C.cream, 0.90, 2.25, "center", 1);

    noStroke();
    fill(...rgba(C.amber, 135 + pulse * 65));
    rect(x - 84, y - 16, 168, 2);
  }

  function drawGame() {
    background(...C.night);
    drawWorld();

    const orderIntroActive = !!(model.deliveryOrderIntro && model.deliveryOrderIntro.active);
    if (!orderIntroActive) {
      drawMasalaRushScreenFx();
      drawTopHUD();
      drawOrderArrowFlights();
      drawReturnGuide();
    }

    drawBottomStatus();
    drawPad();
    if (!orderIntroActive) drawBikeWarning();
  }

  // ----------------------------------------------------------
  // RESULT — TONIGHT'S MAKANAI
  // ----------------------------------------------------------

  function drawResultSteam(cx, cy, result, age) {
    if (age < 0.40) return;

    const heat = clamp(
      result.hotRatio * 0.75 + result.averageHeat / 400,
      0.18,
      1.0
    );
    const steamColor = [238, 228, 208];
    const count = heat >= 0.70 ? 3 : heat >= 0.36 ? 2 : 1;
    const spacing = count === 1 ? 0 : count === 2 ? 18 : 18;
    const rise = 46;
    const cycle = 1.32;
    const baseY = cy + 20;
    const xStart = cx - ((count - 1) * spacing) * 0.5;

    for (let i = 0; i < count; i += 1) {
      const phase = ((age - 0.40) / cycle + i * 0.23) % 1;
      const alpha = (0.55 + 0.45 * Math.sin(phase * Math.PI)) * (86 + heat * 74);
      const x = Math.round(xStart + i * spacing);
      const y = Math.round(baseY + phase * rise);
      const flip = Math.floor((age - 0.40) * 5.2 + i) % 2 === 0 ? 1 : -1;

      drawPixelSteamPuff(
        x,
        y,
        steamColor,
        alpha,
        flip,
        4
      );
    }
  }

  const MAKANAI_ICON_VISUALS = Object.freeze({
    dal: {
      palette: "dal",
      toppings: "dal",
    },
    chana: {
      palette: "chana",
      toppings: "chana",
    },
    keema: {
      palette: "keema",
      toppings: "keema",
    },
    chicken: {
      palette: "butterChicken",
      toppings: "butterChicken",
    },
    saag: {
      palette: "saag",
      toppings: "sparse",
    },
    "aloo-gobi": {
      palette: "alooGobi",
      toppings: "alooGobi",
    },
    biryani: {
      palette: "biryani",
      toppings: "biryani",
    },
    "special-masala": {
      palette: "special",
      toppings: "special",
    },
  });

  function makanaiIconVisual(result) {
    return MAKANAI_ICON_VISUALS[result.makanaiBase]
      || MAKANAI_ICON_VISUALS.chicken;
  }

  function drawMakanaiIconAt(cx, cy, result, age, pixelSize = 6) {
    const iconApi =
      typeof window !== "undefined"
      ? window.RojiuraMakanaiIcon
      : null;

    // This screen intentionally has no substitute illustration. If the
    // generated-icon module is missing, leave the meal area empty rather
    // than silently bringing the old diner plate back.
    if (!iconApi || typeof iconApi.draw !== "function") {
      return;
    }

    const px = pixelSize;
    const iconW = iconApi.width * px;
    const iconH = iconApi.height * px;
    const visual = makanaiIconVisual(result);

    // Large is now an independent visual bonus. It never changes the meal
    // name and can coexist with the rare egg bonuses.
    const servingSize = result.makanaiLarge ? "large" : "normal";

    withCanvasContext((ctx) => {
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // Codea Lite presents a y-up logical canvas. The icon renderer uses
      // ordinary canvas y-down coordinates, so flip once around its top edge.
      ctx.translate(cx - iconW * 0.5, cy + iconH * 0.5);
      ctx.scale(1, -1);

      iconApi.draw(ctx, 0, 0, {
        pixelSize: px,
        palette: visual.palette,
        toppings: visual.toppings,
        size: servingSize,
        eggCount: Math.max(0, Math.min(3, Math.floor(result.makanaiEggCount || 0))),
        roastedChili: result.makanaiPepperRoastedLevel || 0,
        freshChili: result.makanaiPepperFreshStyle || null,
      });

      ctx.restore();
    });

    // Steam remains tied to how the night actually went, not to recipe type.
    drawResultSteam(cx, cy + 22 * (px / 6), result, age);
  }

  function makanaiNaanCount(masalaRushCount) {
    const rushes = Math.max(0, Math.floor(Number(masalaRushCount) || 0));
    return rushes * NAAN_PER_MASALA_RUSH;
  }

  function drawMakanaiNaan(result, age) {
    const naanApi =
      typeof window !== "undefined"
        ? window.RojiuraNaanIcon
        : null;

    if (!naanApi || typeof naanApi.draw !== "function") {
      return;
    }

    const t = easeOutBack(clamp((age - 0.10) / 0.58, 0, 1));
    const px = 4;
    const w = naanApi.width * px;
    const h = naanApi.height * px;
    const alpha = clamp((age - 0.04) / 0.28, 0, 1);
    const count = makanaiNaanCount(result && result.masalaRushCount);

    const piecesPerColumn =
      Math.floor(
        (NAAN_STACK_TOP_CY - NAAN_STACK_BASE_CY) /
          NAAN_STACK_RISE
      ) + 1;

    const baseCx =
      W * 0.5 +
      92 +
      (1 - t) * 190;

    // Build every piece first, then draw the higher/back pieces before the
    // lower/front pieces. That keeps the pile reading as a stack rather than
    // a set of stickers pasted over one another.
    const pieces = [];
    const xJitterPattern = [0, -2, 1, -1, 2];

    for (let i = 0; i < count; i += 1) {
      const column = Math.floor(i / piecesPerColumn);
      const row = i % piecesPerColumn;

      pieces.push({
        column,
        row,
        cx:
          baseCx -
          column * NAAN_STACK_COLUMN_SHIFT_X +
          xJitterPattern[i % xJitterPattern.length],
        cy:
          NAAN_STACK_BASE_CY +
          row * NAAN_STACK_RISE -
          (1 - t) * 12,
      });
    }

    pieces.sort((a, b) => {
      if (a.column !== b.column) {
        // Columns closer to the curry sit farther back.
        return b.column - a.column;
      }
      // Highest naan first; lower naan overlaps it like a physical pile.
      return b.row - a.row;
    });

    withCanvasContext((ctx) => {
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      for (const piece of pieces) {
        ctx.save();

        // Both the curry and naan renderers use ordinary y-down canvas space,
        // so flip once against Codea Lite's y-up logical coordinates.
        ctx.translate(
          piece.cx - w * 0.5,
          piece.cy + h * 0.5
        );
        ctx.scale(1, -1);

        naanApi.draw(ctx, 0, 0, {
          pixelSize: px,
          alpha,
        });

        ctx.restore();
      }

      ctx.restore();
    });
  }

  function drawMakanaiPlate(result, age) {
    const t = easeOutBack(clamp((age - 0.08) / 0.58, 0, 1));
    const cx = W * 0.5 + (1 - t) * 210;
    const cy = 343 - (1 - t) * 14;
    drawMakanaiIconAt(cx, cy, result, age, 6);
  }

  function resultMealNameLayout(textValue, desiredPixel, firstMaxWidth, fullMaxWidth) {
    const text = String(textValue || "").trim();
    const oneLinePixel = fitPixelMonoSize(text, desiredPixel, firstMaxWidth, 0.86);
    const isEnglish = SSE.i18n.language === "en";

    // Short names stay on one line. Long English combinations keep a readable
    // pixel size and wrap at word boundaries instead of shrinking into the stamp.
    if (!isEnglish || oneLinePixel >= 1.24 || !text.includes(" ")) {
      return { lines: [text], pixel: oneLinePixel };
    }

    const words = text.split(/\s+/).filter(Boolean);
    let best = null;
    const minPixel = 0.92;
    for (let pixel = desiredPixel; pixel >= minPixel; pixel -= 0.04) {
      let candidate = null;
      for (let split = 1; split < words.length; split += 1) {
        const first = words.slice(0, split).join(" ");
        const second = words.slice(split).join(" ");
        const firstW = pixelMonoTextWidth(first, pixel);
        const secondW = pixelMonoTextWidth(second, pixel);
        if (firstW > firstMaxWidth || secondW > fullMaxWidth) continue;
        const balance = Math.abs((firstW / firstMaxWidth) - (secondW / fullMaxWidth));
        if (!candidate || balance < candidate.balance) {
          candidate = { lines: [first, second], pixel, balance };
        }
      }
      if (candidate) {
        best = candidate;
        break;
      }
    }

    if (best) return { lines: best.lines, pixel: best.pixel };
    return { lines: [text], pixel: fitPixelMonoSize(text, desiredPixel, firstMaxWidth, 0.72) };
  }

  function drawResultTicket(result, age) {
    const t = easeOutCubic(clamp((age - 0.58) / 0.34, 0, 1));
    const x = 180 - (1 - t) * 180;
    const y = resultTypo("ticketY");
    const w = 308;
    const h = 150;

    pushMatrix();
    translate(x, y);
    rotate(-0.42 + Math.sin(result.sales * 0.001) * 0.28);

    noStroke();
    fill(...rgba(C.ticketPaper, 247));
    rect(-w * 0.5, -h * 0.5, w, h);

    fill(...rgba(C.ticketText, 42));
    for (let px = -w * 0.5 + 10; px < w * 0.5 - 7; px += 14) {
      rect(px, h * 0.5 - 5, 7, 1);
    }

    const ink = C.ticketText;
    const subInk = C.ticketSubtext;
    const warmInk = [126, 77, 45];

    // Fixed two-column grid. The visual rhythm comes from equal-width glyph
    // cells and repeated x anchors rather than many different font sizes.
    const left = -w * 0.5 + 18;
    const right = w * 0.5 - 18;
    let rowLabel = 29;
    let rowValue = -2;
    let rowDelivery = -35;
    const rowSecondary = -60;

    // Meal name. When a record stamp is present, reserve its right-hand
    // footprint. Long English combinations wrap to a second line instead of
    // becoming tiny or running under NEW RECORD.
    const hasRecordStamp = !!(result.newBest || result.firstRecord);
    const recordStampPixel = 1.10;
    const recordStampText = hasRecordStamp ? SSE.i18n.t("result.newBest") : "";
    const recordStampW = hasRecordStamp
      ? pixelMonoTextWidth(recordStampText, recordStampPixel) + 12
      : 0;
    const mealFirstMaxWidth = hasRecordStamp
      ? Math.max(132, (right - recordStampW - 8) - left)
      : w - 36;
    const mealFullMaxWidth = w - 36;
    const mealLayout = resultMealNameLayout(
      result.makanai,
      resultTypo("mealName"),
      mealFirstMaxWidth,
      mealFullMaxWidth
    );

    if (mealLayout.lines.length === 1) {
      drawPixelTextMono(mealLayout.lines[0], left, 54, ink, 0.86, mealLayout.pixel, "left");
    } else {
      drawPixelTextMono(mealLayout.lines[0], left, 56, ink, 0.86, mealLayout.pixel, "left");
      drawPixelTextMono(mealLayout.lines[1], left, 40, ink, 0.86, mealLayout.pixel, "left");
      rowLabel = 20;
      rowValue = -7;
      rowDelivery = -37;
    }

    // Tonight's sales.
    drawPixelTextMono(
      SSE.i18n.t("result.score"),
      left,
      rowLabel,
      subInk,
      0.84,
      resultTypo("salesLabel"),
      "left"
    );

    const salesText = `¥${formatScore(result.sales)}`;
    drawPixelText(
      salesText,
      left,
      rowValue,
      ink,
      1.0,
      fitPixelSize(salesText, resultTypo("salesValue"), 170, 1, 1.15),
      "left",
      1
    );

    // Delivery count: label, number, and ケン all sit on the same fixed rhythm.
    const deliveryLabel = SSE.i18n.t("result.deliveries");
    const deliveryNumberText = `${result.deliveries}`;
    const countSuffix = SSE.i18n.t("result.countSuffix");

    drawPixelTextMono(
      deliveryLabel,
      left,
      rowDelivery,
      subInk,
      0.84,
      resultTypo("deliveryLabel"),
      "left"
    );

    const deliveryNumberLabelWidth = pixelMonoTextWidth(
      deliveryLabel,
      resultTypo("deliveryLabel")
    );
    const deliveryNumberX = left + deliveryNumberLabelWidth + 12;
    const deliveryNumberPixel = resultTypo("deliveryNumber");
    drawPixelText(
      deliveryNumberText,
      deliveryNumberX,
      rowDelivery,
      ink,
      0.96,
      deliveryNumberPixel,
      "left",
      1
    );

    if (countSuffix) {
      const numberWidth = pixelTextWidth(deliveryNumberText, deliveryNumberPixel, 1);
      drawPixelTextMono(
        countSuffix,
        deliveryNumberX + numberWidth + 5,
        rowDelivery,
        ink,
        0.92,
        Math.min(resultTypo("deliverySuffix"), resultTypo("deliveryNumber") * 0.68),
        "left"
      );
    }

    // Past record: same layout language, but the number itself is deliberately
    // one size quieter so the eye reads "tonight -> history".
    const bestSales = Number.isFinite(result.bestSales)
      ? result.bestSales
      : result.sales;
    const bestLabel = SSE.i18n.t("result.allTimeBest");
    const bestSalesText = `¥${formatScore(bestSales)}`;

    drawPixelTextMono(
      bestLabel,
      right,
      rowLabel,
      subInk,
      0.80,
      fitPixelMonoSize(bestLabel, resultTypo("bestLabel"), 116, 0.82),
      "right"
    );
    drawPixelText(
      bestSalesText,
      right,
      rowValue,
      warmInk,
      0.92,
      fitPixelSize(bestSalesText, resultTypo("bestValue"), 126, 1, 0.9),
      "right",
      1
    );

    // PEPPER is intentionally not scored on the ticket. It is an ingredient
    // in the route-to-RUSH, while the result keeps only the actual outcomes.
    const hotText = `${SSE.i18n.t("result.hot")} ${result.hotDeliveries}/${result.deliveries}`;
    const rushText = `${SSE.i18n.t("result.rush")} ×${result.masalaRushCount}`;

    drawPixelTextMono(
      hotText,
      left,
      rowSecondary,
      subInk,
      0.80,
      fitPixelMonoSize(hotText, resultTypo("secondary"), 112, 0.64),
      "left"
    );
    drawPixelTextMono(
      rushText,
      right,
      rowSecondary,
      subInk,
      0.80,
      fitPixelMonoSize(rushText, resultTypo("secondary"), 100, 0.64),
      "right"
    );

    // New-record stamp uses a stepped pixel frame instead of a smooth oval.
    if (hasRecordStamp) {
      const stampText = recordStampText;
      const stampPixel = recordStampPixel;
      const stampW = recordStampW;
      const stampH = 17;

      pushMatrix();
      // Keep the record stamp clear of the meal title row.
      translate(right - stampW * 0.5 + 2, 68);
      rotate(5);

      drawPixelStampOutline(
        stampW,
        stampH,
        C.chili,
        0.92
      );

      drawPixelTextMono(
        stampText,
        0,
        -3,
        C.chili,
        0.88,
        stampPixel,
        "center"
      );
      popMatrix();
    }

    popMatrix();
  }

  function drawMakanaiLeadinScene(age, result = null) {
    // Keep the courier in the same alley and use the same terminal that opened
    // the shift. The only change is an incoming message from the boss; the
    // makanai itself stays hidden until the result screen.
    background(...C.night);
    drawWorld();
    drawTopHUD();

    const messageGroup = "leadin";
    drawBriefingTerminal(
      age,
      messageGroup,
      MAKANAI_LEADIN_MESSAGE_AT,
      MAKANAI_LEADIN_MESSAGE_IN
    );
    drawPad();

    // A tiny incoming flash makes the message feel received rather than like a
    // separate menu screen.
    if (
      age >= MAKANAI_LEADIN_MESSAGE_AT - 0.08
      && age < MAKANAI_LEADIN_MESSAGE_AT + 0.08
    ) {
      const t = (age - (MAKANAI_LEADIN_MESSAGE_AT - 0.08)) / 0.16;
      const a = Math.sin(clamp(t, 0, 1) * Math.PI) * 125;
      noFill();
      stroke(...rgba(C.amber, a));
      strokeWidth(1);
      rect(
        TERMINAL_SCREEN_X - 2,
        TERMINAL_SCREEN_Y - 2,
        TERMINAL_SCREEN_W + 4,
        TERMINAL_SCREEN_H + 4
      );
      noStroke();
    }
  }

  function drawMakanaiResult(result, age, options = {}) {
    const showPrompt = options.showPrompt !== false;
    // A quiet counter replaces the gameplay board completely. The curry is
    // finally allowed to become the largest object on screen.
    background(...C.night);
    noStroke();
    fill(...rgba(C.road));
    rect(0, 220, W, H - 220);
    // Keep the result counter compact: the brown result panel ends above
    // the save/share controls, leaving those controls on the night background.
    fill(73, 50, 35, 255);
    rect(0, RESULT_PANEL_BOTTOM_Y, W, RESULT_PANEL_TOP_Y - RESULT_PANEL_BOTTOM_Y);
    fill(92, 61, 40, 80);
    rect(0, 224, W, 6);

    const titleLife = clamp((age - 0.18) / 0.45, 0, 1);
    const resultBrand = SSE.i18n.t("title.name");
    const resultTitle = SSE.i18n.t("result.title");
    drawPixelText(
      resultBrand,
      W * 0.5,
      H - 36,
      [190, 172, 149],
      0.86 * titleLife,
      fitPixelSize(resultBrand, resultTypo("brand"), W - 48, 1, 1.25),
      "center",
      1
    );
    drawPixelText(
      resultTitle,
      W * 0.5,
      H - 86,
      [235, 220, 196],
      0.98 * titleLife,
      fitPixelSize(resultTitle, resultTypo("title"), W - 32, 1, 1.95),
      "center",
      1
    );

    drawMakanaiNaan(result, age);
    drawMakanaiPlate(result, age);
    drawResultTicket(result, age);

    // Always restore the independent footer after the tilted ticket. This is
    // part of the result composition itself, so exported images also keep the
    // brown panel compact even while SAVE/SHARE controls are hidden.
    noStroke();
    fill(...rgba(C.night));
    rect(0, 0, W, RESULT_PANEL_BOTTOM_Y);

    if (showPrompt && age > RESULT_MIN_TAP_TIME) {
      const pulse = 0.62 + 0.38 * Math.sin((age - RESULT_MIN_TAP_TIME) * 2.4);
      const againText = SSE.i18n.t("result.again");
      drawPixelText(
        againText,
        W * 0.5,
        48,
        [196, 179, 155],
        (155 + pulse * 45) / 255,
        fitPixelSize(againText, resultTypo("again") * 0.78, W - 42, 1, 0.88),
        "center",
        1
      );
    }
  }

  function drawResultActionButton(x, y, w, h, label) {
    noStroke();
    fill(31, 22, 17, 218);
    rect(x, y, w, h);

    fill(...rgba(C.ticketPaper, 42));
    rect(x + 2, y + 2, w - 4, 1);
    rect(x + 2, y + h - 3, w - 4, 1);
    rect(x + 2, y + 2, 1, h - 4);
    rect(x + w - 3, y + 2, 1, h - 4);

    drawPixelTextMono(
      label,
      x + w * 0.5,
      y + 7,
      C.cream,
      0.88,
      fitPixelMonoSize(label, 1.18, w - 14, 0.82),
      "center"
    );
  }

  function drawResultActions(age) {
    if (age <= RESULT_MIN_TAP_TIME) return;

    // The action buttons live on the independent night-colour footer below
    // the brown result panel. The footer surface itself is drawn by the result
    // scene so it remains correct even when controls are hidden for export.
    drawResultActionButton(
      RESULT_SAVE_X,
      RESULT_ACTION_Y,
      RESULT_ACTION_W,
      RESULT_ACTION_H,
      SSE.i18n.t("result.save")
    );
    drawResultActionButton(
      RESULT_SHARE_X,
      RESULT_ACTION_Y,
      RESULT_ACTION_W,
      RESULT_ACTION_H,
      SSE.i18n.t("result.share")
    );
  }

  function resultActionHit(touch, x) {
    return touch.x >= x - RESULT_ACTION_HIT_PAD_X
      && touch.x <= x + RESULT_ACTION_W + RESULT_ACTION_HIT_PAD_X
      && touch.y >= RESULT_ACTION_Y - RESULT_ACTION_HIT_PAD_Y
      && touch.y <= RESULT_ACTION_Y + RESULT_ACTION_H + RESULT_ACTION_HIT_PAD_Y;
  }

  function resultExportFileName() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `rojiura-masala-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.png`;
  }

  function resultShareText(result) {
    const makanaiName = String(result && result.makanai ? result.makanai : "").trim();
    if (SSE.i18n.language === "en") {
      return makanaiName
        ? `Tonight's makanai was “${makanaiName}”.\n\n#路地裏マサラ`
        : `Tonight's makanai.\n\n#路地裏マサラ`;
    }
    return makanaiName
      ? `今夜のまかないは「${makanaiName}」でした。\n\n#路地裏マサラ`
      : `今夜のまかない。\n\n#路地裏マサラ`;
  }

  // ----------------------------------------------------------
  // YUMANIWA SHARE BRIDGE
  // ----------------------------------------------------------
  // When the game runs inside Yumaniwa Town, a Web Share call made directly
  // from the nested work frame can lose the browser's user-gesture permission.
  // Match Midnight Cola's bridge protocol: probe the top page, and hand the
  // result image to the town when its share panel is available. Standalone
  // builds keep using the ordinary Web Share / download path below.
  const YUMANIWA_WORK_ID = "rojiura-masala";
  let yumaniwaShareBridgeReady = false;
  let yumaniwaShareBridgeInstalled = false;

  function installYumaniwaShareBridge() {
    if (
      yumaniwaShareBridgeInstalled
      || typeof window === "undefined"
      || !window.top
      || window.top === window
    ) {
      return;
    }

    yumaniwaShareBridgeInstalled = true;

    window.addEventListener("message", (event) => {
      const data = event && event.data ? event.data : null;
      if (!data || typeof data !== "object") return;

      if (
        data.type === "yumaniwa:share-bridge-ready"
        && (!data.workId || data.workId === YUMANIWA_WORK_ID)
      ) {
        yumaniwaShareBridgeReady = true;
        return;
      }

      // The town reports completion through this message. There is no status
      // toast on Masala yet, but accepting it keeps the bridge protocol fully
      // compatible and lets future UI feedback be added without changing host
      // integration again.
      if (
        data.type === "yumaniwa:share-result-status"
        && (!data.workId || data.workId === YUMANIWA_WORK_ID)
      ) {
        if (data.status === "ready") yumaniwaShareBridgeReady = true;
      }
    });

    const sendProbe = () => {
      try {
        window.top.postMessage({
          type: "yumaniwa:share-bridge-probe",
          version: 1,
          workId: YUMANIWA_WORK_ID,
        }, "*");
      } catch (_error) {
        // Outside Yumaniwa there is no host response; standalone sharing stays
        // available through the normal fallback below.
      }
    };

    sendProbe();
    [350, 1200, 2800].forEach((delay) => window.setTimeout(sendProbe, delay));
  }

  function resultBlobToFile(blob, fileName) {
    if (!blob) return null;
    if (typeof File === "function") {
      return new File([blob], fileName, { type: blob.type || "image/png" });
    }
    try {
      blob.name = fileName;
    } catch (_error) {}
    return blob;
  }

  function sendResultToYumaniwa(file, shareText, shareTitle) {
    if (
      !yumaniwaShareBridgeReady
      || !file
      || typeof window === "undefined"
      || !window.top
      || window.top === window
    ) {
      return false;
    }

    const message = {
      type: "yumaniwa:share-result",
      version: 1,
      workId: YUMANIWA_WORK_ID,
      title: shareTitle,
      text: shareText,
      fileName: file.name || "rojiura-masala.png",
      mimeType: file.type || "image/png",
      file,
    };

    try {
      window.top.postMessage(message, "*");
      return true;
    } catch (_error) {
      // Some WebViews cannot structured-clone File. Fall back to the same
      // data-URL transport used by Midnight Cola.
      if (typeof FileReader === "undefined") return false;
      try {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            window.top.postMessage({
              type: "yumaniwa:share-result",
              version: 1,
              workId: YUMANIWA_WORK_ID,
              title: shareTitle,
              text: shareText,
              fileName: file.name || "rojiura-masala.png",
              mimeType: file.type || "image/png",
              dataUrl: reader.result,
            }, "*");
          } catch (_postError) {}
        };
        reader.readAsDataURL(file);
        return true;
      } catch (_readerError) {
        return false;
      }
    }
  }

  installYumaniwaShareBridge();

  function captureResultImageBlob(result, age) {
    // Draw the export composition synchronously, but through the exact same
    // logical viewport transform / clipping used by the normal engine frame.
    // SSE.share then crops that logical viewport regardless of device aspect.
    SSE.viewport.update(false);
    SSE.viewport.begin();
    try {
      drawMakanaiResult(result, age, { showPrompt: false });
    } finally {
      SSE.viewport.end();
    }
    return SSE.share.blob({
      pixelRatio: 2,
      smoothing: false,
      type: "image/png",
    });
  }

  async function saveResultImage(result, capturedBlob = null) {
    const blob = capturedBlob || await SSE.share.blob({
      pixelRatio: 2,
      smoothing: false,
      type: "image/png",
    });
    if (!blob || typeof document === "undefined" || typeof URL === "undefined") {
      return { ok: false, reason: "save-unavailable" };
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = resultExportFileName();
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    return { ok: true, method: "download" };
  }

  async function shareResultImage(result, capturedBlob = null) {
    const fileName = resultExportFileName();
    const shareTitle = "";
    const shareText = resultShareText(result);
    const blob = capturedBlob || await SSE.share.blob({
      pixelRatio: 2,
      smoothing: false,
      type: "image/png",
    });

    if (!blob) return { ok: false, reason: "capture-unavailable" };

    const file = resultBlobToFile(blob, fileName);

    // Yumaniwa Town: hand the file to the top-level share panel. The second
    // tap on that panel satisfies Safari's user-gesture requirement.
    if (sendResultToYumaniwa(file, shareText, shareTitle)) {
      return { ok: true, method: "yumaniwa-bridge" };
    }

    // Standalone / non-Yumaniwa fallback.
    try {
      if (
        file
        && typeof navigator !== "undefined"
        && typeof navigator.share === "function"
        && (
          typeof navigator.canShare !== "function"
          || navigator.canShare({ files: [file] })
        )
      ) {
        await navigator.share({
          files: [file],
          text: shareText,
        });
        return { ok: true, method: "share" };
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        return { ok: false, reason: "cancelled" };
      }
    }

    // Final fallback mirrors SAVE so desktop / restricted browsers still
    // produce the PNG instead of failing silently.
    if (typeof document === "undefined" || typeof URL === "undefined") {
      return { ok: false, reason: "download-unavailable" };
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    return { ok: true, method: "download" };
  }



  // ----------------------------------------------------------
  // SCENES
  // ----------------------------------------------------------

  const titleScene = {
    opaque: true,
    age: 0,
    enter() {
      this.age = 0;
      setKeyboardPrimaryAction("title", () => {
        if (this.age < 0.35) return false;
        SSE.app.replace("briefing", null, { duration: "quick" });
        return true;
      });
      // Normal BGM belongs to the whole night, not only the play scene.
      // Browser autoplay rules may keep the AudioContext suspended until the
      // first touch, but keeping the desired mode active means it begins as
      // soon as audio is unlocked instead of waiting for gameplay.
      setGameBgm("normal");
      syncDocumentLanguage();
      setupTitleDemo(this);
    },

    update(dt) {
      this.age += dt;
      // Reassert the mode while the title is open so a decoded MP3 can replace
      // the procedural fallback immediately when it becomes ready.
      setGameBgm("normal");
      updateTitleDemo(this, dt);
    },

    draw() {
      drawTitleDemo(this.age);
    },

    leave() {
      clearKeyboardPrimaryAction("title");
    },

    touch(touch) {
      if (touch.state !== ENDED) return true;

      if (titleSoundHit(touch)) {
        cycleSoundLevel();
        return true;
      }

      const languageChoice = titleLanguageChoice(touch);
      if (languageChoice) {
        selectInterfaceLanguage(languageChoice, "title");
        return true;
      }

      // Near misses around the settings controls must never start the game.
      if (titleSettingsGuardHit(touch)) return true;

      if (this.age >= 0.35) {
        markKeyboardPrimaryBusy("title");
        SSE.app.replace("briefing", null, { duration: "quick" });
      }
      return true;
    },
  };

  const briefingScene = {
    opaque: true,
    age: 0,
    source: "title",

    enter(context) {
      this.age = 0;
      setKeyboardPrimaryAction("briefing", () => {
        if (this.age < BRIEFING_MESSAGE_AT + 0.18) return false;
        SSE.app.replace("play", { fromBriefing: true, source: this.source }, { duration: "quick" });
        return true;
      });
      // Keep the same normal loop running across title -> briefing -> play.
      // Do not restart from the head between these presentation scenes.
      setGameBgm("normal");
      this.source = context && context.payload && context.payload.source
        ? context.payload.source
        : "title";

      // Preserve the camera position from the attract demo. The actual shift
      // state is reset underneath it, so after the message the gameplay camera
      // has a short, visible catch-up to the waiting courier at the shop.
      const inheritedCamera = {
        x: model.cameraX,
        y: model.cameraY,
        zoom: model.cameraZoom,
      };

      resetSession();
      // The first carried batch is visibly loaded after the briefing rather
      // than appearing magically at full heat. Gameplay still starts only once
      // the fill animation is complete.
      model.curryHeat = 0;

      model.cameraX = inheritedCamera.x;
      model.cameraY = inheritedCamera.y;
      model.cameraZoom = inheritedCamera.zoom;

      // Keep the first three orders completely dormant. They are released only
      // after the message is dismissed, the camera catches the courier, and one
      // extra beat has passed.
      for (const target of model.activeTargets) {
        target.orderAge = -999;
        target.flightAge = null;
        target.markerReady = false;
        target.markerPopAge = 0;
      }

      model.touchActive = false;
      model.intentX = 0;
      model.intentY = 0;
      model.runSpeed = 0;
    },

    update(dt) {
      this.age += dt;
      setGameBgm("normal");

      // Let only the town ambience breathe during the message. The shift itself
      // has not started yet, so the player, cats, bike, garbage and heat stay put.
      model.time += dt;
      updateAmbientWindows(dt);
      updateBirds(dt);
      updateSmoke(dt);

    },

    draw() {
      drawBriefingScene(this.age);
    },

    leave() {
      clearKeyboardPrimaryAction("briefing");
    },

    touch(touch) {
      if (touch.state === ENDED && this.age >= BRIEFING_MESSAGE_AT + 0.18) {
        markKeyboardPrimaryBusy("briefing");
        SSE.app.replace("play", { fromBriefing: true, source: this.source }, { duration: "quick" });
      }
      return true;
    },
  };

  const playScene = {
    opaque: true,
    opening: false,
    openingBeat: 0,
    openingHeatFillAge: 0,
    ordersReleased: false,

    enter(context) {
      setGameBgm("normal");
      setKeyboardPrimaryAction("play", () => {
        if (!model.deliveryOrderIntro || !model.deliveryOrderIntro.active) return false;
        if (model.deliveryOrderIntro.age < DELIVERY_ORDER_INTRO_MIN_TAP_TIME) return false;
        dismissDeliveryOrderIntro();
        return true;
      });
      const fromBriefing = !!(context && context.payload && context.payload.fromBriefing);
      const source = context && context.payload && context.payload.source
        ? context.payload.source
        : (fromBriefing ? "title" : "again");
      trackGameAnalytics("Masala Game Start", { source });

      if (!fromBriefing) {
        resetSession();
        this.opening = false;
        keyboardPlayOpening = false;
        this.openingHeatFillAge = GAME_OPENING_HEAT_FILL_DURATION;
        this.ordersReleased = true;
        return;
      }

      // Briefing already created the real first shift. Keep that same model and
      // camera so the transition does not snap. The terminal is now in place;
      // the camera catches up first, then the orders arrive.
      this.opening = true;
      keyboardPlayOpening = true;
      this.openingBeat = 0;
      this.openingHeatFillAge = 0;
      this.ordersReleased = false;
      model.curryHeat = 0;

      model.touchActive = false;
      model.touchId = null;
      clearKeyboardControlState({ stopSpeed: true });
      model.runSpeed = 0;
    },

    leave() {
      keyboardPlayOpening = false;
      clearKeyboardControlState({ stopSpeed: true });
      clearKeyboardPrimaryAction("play");
    },

    update(dt) {
      if (!this.opening) {
        updateGame(dt);
        setGameBgm(masalaRushActive() ? "rush" : "normal");
        return;
      }

      setGameBgm("normal");

      // Opening beat: keep the town alive, but do not start the job systems yet.
      model.time += dt;
      updateAmbientWindows(dt);
      updateBirds(dt);
      updateDoor(dt);
      updateSmoke(dt);

      // Opening-only camera catch-up. Do not use updateCamera() here:
      // gameplay camera has a deliberate deadzone, so it can stop several
      // pixels short of the shop and never satisfy the opening's tighter
      // "camera arrived" condition.
      model.cameraZoom = approachExp(
        model.cameraZoom,
        CAMERA_ZOOM_STOP,
        GAME_OPENING_CAMERA_ZOOM_SPEED,
        dt
      );

      const target = clampCamera(
        gridX(model.playerGX),
        gridY(model.playerGY),
        model.cameraZoom
      );

      model.cameraX = approachExp(
        model.cameraX,
        target.x,
        GAME_OPENING_CAMERA_FOLLOW_SPEED,
        dt
      );
      model.cameraY = approachExp(
        model.cameraY,
        target.y,
        GAME_OPENING_CAMERA_FOLLOW_SPEED,
        dt
      );

      const cameraReady =
        Math.abs(model.cameraX - target.x) <= GAME_OPENING_CAMERA_EPS
        && Math.abs(model.cameraY - target.y) <= GAME_OPENING_CAMERA_EPS
        && Math.abs(model.cameraZoom - CAMERA_ZOOM_STOP) <= GAME_OPENING_ZOOM_EPS;

      if (!cameraReady) {
        this.openingBeat = 0;
        this.openingHeatFillAge = 0;
        model.curryHeat = 0;
        return;
      }

      this.openingBeat += dt;
      this.openingHeatFillAge += dt;
      const heatFillT = clamp(this.openingHeatFillAge / GAME_OPENING_HEAT_FILL_DURATION, 0, 1);
      model.curryHeat = 100 * easeOutCubic(heatFillT);

      if (
        !this.ordersReleased
        && this.openingBeat >= GAME_OPENING_ORDER_BEAT
        && heatFillT >= 1
      ) {
        this.ordersReleased = true;
        model.curryHeat = 100;

        model.activeTargets.forEach((target, index) => {
          const displayRank = model.deliveryOrderMode
            ? (target.deliveryOrderRank ?? index + 1)
            : freeDeliveryDisplayRank(target, index);
          target.orderAge = -(displayRank - 1) * ORDER_CARD_STAGGER;
          target.flightAge = null;
          target.markerReady = false;
          target.markerPopAge = 0;
          target.displaySlot = displayRank;
        });

        this.opening = false;
        keyboardPlayOpening = false;
      }
    },

    draw() {
      drawGame();
    },

    touch(touch) {
      if (model.deliveryOrderIntro && model.deliveryOrderIntro.active) {
        if (touch.state === BEGAN) {
          model.deliveryOrderIntro.armed = true;
        } else if (
          touch.state === ENDED
          && model.deliveryOrderIntro.armed
          && model.deliveryOrderIntro.age >= DELIVERY_ORDER_INTRO_MIN_TAP_TIME
        ) {
          markKeyboardPrimaryBusy("play");
          dismissDeliveryOrderIntro();
        }
        return true;
      }

      // Do not let movement begin before the opening orders are released.
      if (this.opening) return true;

      if (touch.state === BEGAN) {
        beginPadTouch(touch);
      } else if (touch.state === MOVING) {
        updatePadTouch(touch);
      } else if (touch.state === ENDED || touch.state === CANCELLED) {
        endPadTouch(touch);
      }
      return true;
    },
  };

  const RESULT_DEBUG_PRESETS = [
    {
      debugLabel: "ダル / ヤサシメ",
      sales: 18000, deliveries: 15, bestCombo: 4, masalaRushCount: 0,
      pepperHeld: 0, pepperSpent: 0, reheatCount: 0, backdoorUses: 0,
      nightSeed: 21001, hotDeliveries: 5, warmDeliveries: 4, coolDeliveries: 3,
      coldDeliveries: 3, bikeHits: 0, averageHeat: 52, nightGauge: 0,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 2,
      rank: 4, nights: 7, bestSales: 61200, newBest: false, firstRecord: false,
      debugForce: { base: "dal", prefix: "cold", topping: null, roastedLevel: 0, freshStyle: null },
    },
    {
      debugLabel: "チャナ / ヨフケ / オオモリ",
      sales: 90000, deliveries: 75, bestCombo: 21, masalaRushCount: 1,
      pepperHeld: 0, pepperSpent: 9, reheatCount: 2, backdoorUses: 3,
      nightSeed: 21002, hotDeliveries: 61, warmDeliveries: 10, coolDeliveries: 4,
      coldDeliveries: 0, bikeHits: 1, averageHeat: 80, nightGauge: 1,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 6,
      rank: 2, nights: 10, bestSales: 108000, newBest: false, firstRecord: false,
      debugForce: { base: "chana", prefix: "deliveries", topping: "large", roastedLevel: 1, freshStyle: null },
    },
    {
      debugLabel: "キーマ / ドタバタ / タマゴ",
      sales: 45600, deliveries: 38, bestCombo: 8, masalaRushCount: 1,
      pepperHeld: 0, pepperSpent: 9, reheatCount: 1, backdoorUses: 2,
      nightSeed: 21003, hotDeliveries: 23, warmDeliveries: 8, coolDeliveries: 5,
      coldDeliveries: 2, bikeHits: 7, averageHeat: 67, nightGauge: 0,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 4,
      rank: 3, nights: 8, bestSales: 61200, newBest: false, firstRecord: false,
      debugForce: { base: "keema", prefix: "bike", topping: "egg", roastedLevel: 1, freshStyle: null },
    },
    {
      debugLabel: "チキン / アツアツ",
      sales: 64800, deliveries: 54, bestCombo: 24, masalaRushCount: 2,
      pepperHeld: 0, pepperSpent: 18, reheatCount: 1, backdoorUses: 2,
      nightSeed: 21004, hotDeliveries: 50, warmDeliveries: 4, coolDeliveries: 0,
      coldDeliveries: 0, bikeHits: 0, averageHeat: 88, nightGauge: 2,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 5,
      rank: 1, nights: 12, bestSales: 64800, newBest: true, firstRecord: false,
      debugForce: { base: "chicken", prefix: "hot", topping: null, roastedLevel: 2, freshStyle: null },
    },
    {
      debugLabel: "サグ / ウラミチノ",
      sales: 60000, deliveries: 50, bestCombo: 15, masalaRushCount: 1,
      pepperHeld: 0, pepperSpent: 9, reheatCount: 2, backdoorUses: 11,
      nightSeed: 21005, hotDeliveries: 35, warmDeliveries: 11, coolDeliveries: 3,
      coldDeliveries: 1, bikeHits: 1, averageHeat: 73, nightGauge: 1,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 5,
      rank: 2, nights: 9, bestSales: 72000, newBest: false, firstRecord: false,
      debugForce: { base: "saag", prefix: "backdoor", topping: null, roastedLevel: 1, freshStyle: null },
    },
    {
      debugLabel: "アルゴビ / 再加熱多め",
      sales: 50400, deliveries: 42, bestCombo: 10, masalaRushCount: 0,
      pepperHeld: 4, pepperSpent: 0, reheatCount: 7, backdoorUses: 2,
      nightSeed: 21006, hotDeliveries: 24, warmDeliveries: 13, coolDeliveries: 4,
      coldDeliveries: 1, bikeHits: 1, averageHeat: 70, nightGauge: 1,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 5,
      rank: 3, nights: 6, bestSales: 61200, newBest: false, firstRecord: false,
      debugForce: { base: "aloo-gobi", prefix: null, topping: null, roastedLevel: 0, freshStyle: "whole" },
    },
    {
      debugLabel: "ビリヤニ / ヨフケ / NEW",
      sales: 130800, deliveries: 109, bestCombo: 31, masalaRushCount: 3,
      pepperHeld: 0, pepperSpent: 27, reheatCount: 3, backdoorUses: 5,
      nightSeed: 21007, hotDeliveries: 84, warmDeliveries: 18, coolDeliveries: 6,
      coldDeliveries: 1, bikeHits: 2, averageHeat: 79, nightGauge: 1,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 6,
      rank: 1, nights: 18, bestSales: 130800, newBest: true, firstRecord: false,
      debugForce: { base: "biryani", prefix: "deliveries", topping: "large", roastedLevel: 2, freshStyle: null },
    },
    {
      debugLabel: "店長特別 / 長時間",
      sales: 124800, deliveries: 104, bestCombo: 28, masalaRushCount: 4,
      pepperHeld: 0, pepperSpent: 36, reheatCount: 6, backdoorUses: 12,
      nightSeed: 21008, hotDeliveries: 79, warmDeliveries: 17, coolDeliveries: 6,
      coldDeliveries: 2, bikeHits: 4, averageHeat: 78, nightGauge: 1,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 6,
      rank: 1, nights: 14, bestSales: 124800, newBest: true, firstRecord: false,
      debugForce: { base: "special-masala", prefix: null, topping: null, roastedLevel: 2, freshStyle: null },
    },
    {
      debugLabel: "唐辛子使用 / 使い切り",
      sales: 72000, deliveries: 60, bestCombo: 20, masalaRushCount: 2,
      pepperHeld: 0, pepperSpent: 18, reheatCount: 2, backdoorUses: 4,
      nightSeed: 21009, hotDeliveries: 45, warmDeliveries: 11, coolDeliveries: 3,
      coldDeliveries: 1, bikeHits: 2, averageHeat: 76, nightGauge: 1,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 6,
      rank: 2, nights: 11, bestSales: 84000, newBest: false, firstRecord: false,
      debugForce: { base: "chicken", prefix: "rush", topping: null, roastedLevel: 1, freshStyle: null },
    },
    {
      debugLabel: "唐辛子使用 / 余り1本",
      sales: 75600, deliveries: 63, bestCombo: 19, masalaRushCount: 2,
      pepperHeld: 3, pepperSpent: 18, reheatCount: 2, backdoorUses: 3,
      nightSeed: 21010, hotDeliveries: 46, warmDeliveries: 12, coolDeliveries: 4,
      coldDeliveries: 1, bikeHits: 2, averageHeat: 75, nightGauge: 1,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 6,
      rank: 2, nights: 12, bestSales: 84000, newBest: false, firstRecord: false,
      debugForce: { base: "chicken", prefix: "rush", topping: null, roastedLevel: 1, freshStyle: "whole" },
    },
    {
      debugLabel: "唐辛子余り / 輪切り",
      sales: 46800, deliveries: 39, bestCombo: 9, masalaRushCount: 0,
      pepperHeld: 7, pepperSpent: 0, reheatCount: 2, backdoorUses: 2,
      nightSeed: 21011, hotDeliveries: 24, warmDeliveries: 10, coolDeliveries: 4,
      coldDeliveries: 1, bikeHits: 1, averageHeat: 68, nightGauge: 0,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 4,
      rank: 3, nights: 8, bestSales: 61200, newBest: false, firstRecord: false,
      debugForce: { base: "aloo-gobi", prefix: null, topping: null, roastedLevel: 0, freshStyle: "slices" },
    },
    {
      debugLabel: "唐辛子使用+余り / タマゴ",
      sales: 81600, deliveries: 68, bestCombo: 18, masalaRushCount: 3,
      pepperHeld: 5, pepperSpent: 27, reheatCount: 3, backdoorUses: 4,
      nightSeed: 21012, hotDeliveries: 51, warmDeliveries: 12, coolDeliveries: 4,
      coldDeliveries: 1, bikeHits: 2, averageHeat: 77, nightGauge: 1,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 6,
      rank: 2, nights: 13, bestSales: 90000, newBest: false, firstRecord: false,
      debugForce: { base: "chana", prefix: "rush", topping: "egg", roastedLevel: 2, freshStyle: "slices" },
    },
    {
      debugLabel: "初回記録 / シンプル",
      sales: 32400, deliveries: 27, bestCombo: 7, masalaRushCount: 0,
      pepperHeld: 2, pepperSpent: 0, reheatCount: 1, backdoorUses: 1,
      nightSeed: 21013, hotDeliveries: 18, warmDeliveries: 6, coolDeliveries: 2,
      coldDeliveries: 1, bikeHits: 0, averageHeat: 71, nightGauge: 0,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 3,
      rank: 1, nights: 1, bestSales: 32400, newBest: false, firstRecord: true,
      debugForce: { base: "chana", prefix: null, topping: null, roastedLevel: 0, freshStyle: "whole" },
    },
    {
      debugLabel: "長い名前 / 唐辛子+大盛り",
      sales: 136800, deliveries: 114, bestCombo: 34, masalaRushCount: 4,
      pepperHeld: 6, pepperSpent: 36, reheatCount: 4, backdoorUses: 7,
      nightSeed: 21014, hotDeliveries: 88, warmDeliveries: 18, coolDeliveries: 6,
      coldDeliveries: 2, bikeHits: 3, averageHeat: 80, nightGauge: 1,
      nightClosing: true, endReason: "night-gauge", makanaiTier: 6,
      rank: 1, nights: 20, bestSales: 136800, newBest: true, firstRecord: false,
      debugForce: { base: "biryani", prefix: "rush", topping: "large", roastedLevel: 2, freshStyle: "slices" },
    },
  ];

  function applyResultDebugForce(result, force) {
    if (!force) return result;

    const recipe = MAKANAI_RECIPES.find((item) => item.id === force.base);
    const metrics = makanaiMetrics(result);
    const prefix = force.prefix
      ? makanaiTraitScores(metrics).find((item) => item.id === force.prefix)
      : null;
    if (recipe) {
      result.makanaiBase = recipe.id;
      result.makanaiBaseName = localizedText(recipe.name);
    }
    result.makanaiPrefix = prefix ? prefix.id : null;
    result.makanaiPrefixLabel = prefix ? localizedText(prefix.label) : "";
    result.makanaiTopping = force.topping || null;
    result.makanaiToppingLabel = "";
    result.makanaiEggCount = force.topping === "egg" ? 1 : 0;
    result.makanaiLarge = force.topping === "large";
    result.makanaiPepperRoastedLevel = force.roastedLevel || 0;
    result.makanaiPepperFreshStyle = force.freshStyle || null;
    result.makanaiPepperLeft = force.freshStyle ? Math.max(1, result.pepperHeld || 1) : 0;
    result.makanaiPepperSpent = force.roastedLevel ? Math.max(PEPPER_RUSH_COST, result.pepperSpent || 0) : 0;

    const parts = [];
    if (result.makanaiPrefixLabel) parts.push(result.makanaiPrefixLabel);
    if (result.makanaiBaseName) parts.push(result.makanaiBaseName);
    result.makanai = parts.join(" ");
    return result;
  }

  function preparedResultDebugPreset(index) {
    const source = RESULT_DEBUG_PRESETS[index];
    const { debugForce, debugLabel, ...payload } = source;
    const result = { ...payload, debugLabel };
    Object.assign(result, generateMakanai(result));
    return applyResultDebugForce(result, debugForce);
  }

  // createApp deep-merges scene definitions, so debug controls must not keep
  // their index only on the pre-registration scene object. This tiny shared
  // state is closed over by both the registered scene copy and the HTML API.
  const resultDebugState = { preset: 0 };

  function setResultDebugPreset(index) {
    const count = RESULT_DEBUG_PRESETS.length;
    resultDebugState.preset = ((Math.floor(index) % count) + count) % count;
  }

  const resultDebugScene = {
    opaque: true,
    age: 2.6,

    enter() {
      setGameBgm("off");
      setResultDebugPreset(0);
      this.age = 2.6;
    },

    setPreset(index) {
      setResultDebugPreset(index);
      this.age = 2.6;
    },

    update(dt) {
      this.age += dt;
    },

    draw() {
      const result = preparedResultDebugPreset(resultDebugState.preset);
      drawMakanaiResult(result, this.age);
      drawResultActions(this.age);

      // Debug-only navigation marker. Not part of the actual result design.
      textAlign(CENTER);
      fontSize(9);
      fill(...rgba(C.buildingTop, 185));
      text(
        `${resultDebugState.preset + 1}/${RESULT_DEBUG_PRESETS.length}  ${result.debugLabel || "RESULT DEBUG"}`,
        W * 0.5,
        8
      );
    },

    touch(touch) {
      if (touch.state !== ENDED) return true;
      if (touch.x < W * 0.5) {
        setResultDebugPreset(resultDebugState.preset - 1);
      } else {
        setResultDebugPreset(resultDebugState.preset + 1);
      }
      this.age = 2.6;
      return true;
    },
  };

  if (typeof window !== "undefined" && RESULT_DEBUG_MODE) {
    window.ROJIURA_RESULT_DEBUG_API = {
      count: () => RESULT_DEBUG_PRESETS.length,
      labels: () => RESULT_DEBUG_PRESETS.map((item) => item.debugLabel || "RESULT"),
      getIndex: () => resultDebugState.preset,
      setIndex: (index) => setResultDebugPreset(index),
      next: () => setResultDebugPreset(resultDebugState.preset + 1),
      prev: () => setResultDebugPreset(resultDebugState.preset - 1),
      random: () => {
        if (RESULT_DEBUG_PRESETS.length <= 1) return;
        let next = resultDebugState.preset;
        while (next === resultDebugState.preset) {
          next = Math.floor(Math.random() * RESULT_DEBUG_PRESETS.length);
        }
        setResultDebugPreset(next);
      },
    };
  }

  const makanaiLeadinScene = {
    opaque: true,
    age: 0,
    result: null,
    finished: false,
    cameraTargetX: 0,
    cameraTargetY: 0,

    enter(context) {
      this.age = 0;
      setGameBgm("off");
      this.finished = false;
      setKeyboardPrimaryAction("makanaiLeadin", () => {
        if (this.age < MAKANAI_LEADIN_MIN_TAP_TIME || this.finished) return false;
        this.goNext();
        return true;
      });
      this.result = context && context.payload
        ? context.payload
        : null;
      syncDocumentLanguage();

      model.touchActive = false;
      model.touchId = null;
      model.intentX = 0;
      model.intentY = 0;
      model.runSpeed = 0;

      // Ease the view back into the restaurant instead of freezing the play
      // board in place. This keeps the end-of-shift message feeling like a
      // camera beat rather than a stall.
      const target = clampCamera(
        gridX(5),
        // Bias a little more toward the storefront so the restaurant itself
        // becomes the visual subject before the terminal message appears.
        gridY(1) + 14,
        MAKANAI_LEADIN_CAMERA_ZOOM
      );
      this.cameraTargetX = target.x;
      this.cameraTargetY = target.y;
    },

    goNext() {
      if (this.finished) return;
      this.finished = true;
      markKeyboardPrimaryBusy("makanaiLeadin");
      SSE.app.replace("result", this.result, { duration: "quick" });
    },

    update(dt) {
      this.age += dt;

      // The shift is over, but the alley should still feel alive while the
      // player reads the boss's message. No gameplay systems advance here.
      model.time += dt;
      updateAmbientWindows(dt);
      updateBirds(dt);
      updateSmoke(dt);

      model.cameraZoom = approachExp(
        model.cameraZoom,
        MAKANAI_LEADIN_CAMERA_ZOOM,
        MAKANAI_LEADIN_CAMERA_ZOOM_SPEED,
        dt
      );
      model.cameraX = approachExp(
        model.cameraX,
        this.cameraTargetX,
        MAKANAI_LEADIN_CAMERA_FOLLOW_SPEED,
        dt
      );
      model.cameraY = approachExp(
        model.cameraY,
        this.cameraTargetY,
        MAKANAI_LEADIN_CAMERA_FOLLOW_SPEED,
        dt
      );
    },

    draw() {
      drawMakanaiLeadinScene(this.age, this.result);
    },

    leave() {
      clearKeyboardPrimaryAction("makanaiLeadin");
    },

    touch(touch) {
      if (touch.state === ENDED && this.age >= MAKANAI_LEADIN_MIN_TAP_TIME) {
        this.goNext();
      }
      return true;
    },
  };

  const resultScene = {
    opaque: true,
    result: null,
    age: 0,
    exportBusy: false,

    enter(context) {
      this.age = 0;
      setGameBgm("off");
      this.exportBusy = false;
      setKeyboardPrimaryAction("result", () => {
        if (this.exportBusy || this.age < RESULT_MIN_TAP_TIME) return false;
        SSE.app.replace("briefing", { source: "again" }, { duration: "quick" });
        return true;
      });
      this.result = context && context.payload ? context.payload : {
        sales: model.sales,
        deliveries: model.deliveries,
        bestCombo: model.bestCombo,
        masalaRushCount: model.masalaRushCount,
        reheatCount: model.reheatCount,
        backdoorUses: model.backdoorUses || 0,
        nightSeed: model.nightSeed || 1,
        hotDeliveries: model.hotDeliveries,
        warmDeliveries: model.warmDeliveries,
        coolDeliveries: model.coolDeliveries,
        coldDeliveries: model.coldDeliveries,
        bikeHits: model.bikeHits,
        hotRatio: model.deliveries ? model.hotDeliveries / model.deliveries : 0,
        averageHeat: model.deliveries ? model.heatSum / model.deliveries : 0,
        nightGauge: model.nightGauge,
        nightClosing: model.nightClosing,
        endReason: model.nightEndReason || (model.nightGauge <= 0 ? "night-gauge" : "other"),
        makanaiTier: makanaiTier(model.deliveries || 3),
        rank: 1,
        nights: 1,
        bestSales: model.bestSales || model.sales,
        newBest: false,
        firstRecord: true,
        makanai: "",
      };

      if (!this.result.makanai) {
        Object.assign(this.result, generateMakanai(this.result));
      }
      localizeMakanaiSelection(this.result);
    },

    update(dt) {
      this.age += dt;
    },

    draw() {
      drawMakanaiResult(this.result, this.age, { showPrompt: !this.exportBusy });
      if (!this.exportBusy) {
        drawResultActions(this.age);
        drawTitleLanguageToggle();
      }
    },

    leave() {
      clearKeyboardPrimaryAction("result");
    },

    async exportImage(mode) {
      if (this.exportBusy) return;
      this.exportBusy = true;
      try {
        const blob = await captureResultImageBlob(this.result, this.age);
        let outcome;
        if (mode === "save") {
          outcome = await saveResultImage(this.result, blob);
        } else {
          outcome = await shareResultImage(this.result, blob);
        }
        trackGameAnalytics(
          mode === "save" ? "Masala Result Save" : "Masala Result Share",
          {
            success: !!(outcome && outcome.ok),
            method: outcome && (outcome.method || outcome.reason) || "unknown",
          }
        );
      } finally {
        this.exportBusy = false;
      }
    },

    touch(touch) {
      if (touch.state !== ENDED) return true;
      // All result controls are inert while the export composition is active.
      if (this.exportBusy) return true;

      const languageChoice = titleLanguageChoice(touch);
      if (languageChoice) {
        selectInterfaceLanguage(languageChoice, "result");
        localizeMakanaiSelection(this.result);
        return true;
      }

      if (this.age < RESULT_MIN_TAP_TIME) return true;

      if (resultActionHit(touch, RESULT_SAVE_X)) {
        void this.exportImage("save");
        return true;
      }

      if (resultActionHit(touch, RESULT_SHARE_X)) {
        void this.exportImage("share");
        return true;
      }

      if (!this.exportBusy) {
        markKeyboardPrimaryBusy("result");
        SSE.app.replace("briefing", { source: "again" }, { duration: "quick" });
      }
      return true;
    },
  };

  // Begin loading authored prop / player art as soon as the app script is evaluated.
  // Until the PNGs are ready, their draw routines keep compact code-art fallbacks.
  loadGarbageSprites();
  loadBikeSprite();
  loadPlayerSprites();

  // ----------------------------------------------------------
  // APP
  // ----------------------------------------------------------

  SSE.createApp({
    id: "rojiura-masala",
    logicalWidth: W,
    logicalHeight: H,
    initialScene: FONT_DEBUG_MODE
      ? "fontDebug"
      : RESULT_DEBUG_MODE
        ? "resultDebug"
        : "title",
    outerBackground: "nightDeep",
    sceneBackground: "night",
    debug: true,

    i18n: {
      defaultLanguage: "jp",
      text: TEXT,
    },

    audio: (typeof window !== "undefined" && window.RojiuraSound)
      ? window.RojiuraSound.audioConfig
      : {},

    analytics: {
      enabled: true,
      provider: (typeof window !== "undefined" && window.RojiuraAnalytics)
        ? window.RojiuraAnalytics.provider
        : undefined,
    },

    // Host-ready notification for Yumaniwa Town. This is harmless in the
    // standalone build and lets the town know the embedded work has rendered.
    bridge: { workId: "rojiura-masala" },

    scenes: {
      title: titleScene,
      briefing: briefingScene,
      play: playScene,
      makanaiLeadin: makanaiLeadinScene,
      result: resultScene,
      resultDebug: resultDebugScene,
      fontDebug: fontDebugScene,
    },
  });

  installKeyboardControls();
})();
