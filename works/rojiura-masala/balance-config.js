// ROJIURA MASALA — balance tuning only
// ------------------------------------------------------------
// This file is intentionally data-only. Fine-tuning patches should change
// values here instead of editing gameplay logic in sketch.js.
//
// Ramp format: { at: deliveryCount, value: ... }
// The last entry whose `at` is <= current deliveries is used.
(function (global) {
  "use strict";

  global.ROJIURA_BALANCE = Object.freeze({
    heat: Object.freeze({
      coolingPerSecond: 6.8,
      hotThreshold: 70,
      comboBreakThreshold: 40,
      coldMissThreshold: 30,
    }),

    night: Object.freeze({
      gaugeMax: 3,
      // The run is endless while the three-light night gauge survives.
      // This duration now controls only the town's gradual late-night fade;
      // reaching it never closes the shop or ends the run.
      ambientFadeSeconds: 420,
    }),

    reheat: Object.freeze({
      gain: 24,
      cap: 80,
      triggerMaxHeat: 79.5,
      shopRadius: 0.31,
      departRadius: 0.72,
    }),

    scent: Object.freeze({
      addAmount: 0.62,
      decayPerSecond: 0.05,
      reheatBurstMultiplier: 1.45,
      heatMultiplier: Object.freeze({
        hot: 1.30,
        warm: 1.00,
        cool: 0.75,
        cold: 0.50,
      }),
    }),

    rush: Object.freeze({
      // Soft streak: HOT/WARM build momentum, COOL erodes it, COLD clears it.
      // Reaching the threshold is not enough by itself; the triggering delivery
      // must be HOT so MASALA RUSH still feels earned rather than time-based.
      softStreak: Object.freeze({
        hotGain: 2,
        warmGain: 1,
        coolLoss: 2,
        coldResets: true,
        thresholdByDeliveries: Object.freeze([
          Object.freeze({ at: 0, value: 11 }),
          Object.freeze({ at: 40, value: 9 }),
          Object.freeze({ at: 80, value: 8 }),
        ]),
      }),
      durationSeconds: 10.8,
      extendUnlockDeliveries: 18,
      deliveryBonusSeconds: 1.0,
    }),

    pepper: Object.freeze({
      // Short chili runs appear only while there is room in one RUSH charge.
      // Held + street chilies are capped together, so a full courier never
      // leaves a growing field of uncollectable PEPPER behind. Progress stays
      // off the score HUD and lives on the temperature frame's outer border.
      rushCost: 9,
      clusterSize: Object.freeze([2, 3]),
      maxActive: 9,
      pickupRadius: 0.34,
    }),

    bike: Object.freeze({
      speedByDeliveries: Object.freeze([
        Object.freeze({ at: 0, value: 2.8 }),
        Object.freeze({ at: 12, value: 3.3 }),
        Object.freeze({ at: 21, value: 3.9 }),
        Object.freeze({ at: 30, value: 4.6 }),
        Object.freeze({ at: 39, value: 5.2 }),
        Object.freeze({ at: 48, value: 5.8 }),
        Object.freeze({ at: 57, value: 6.3 }),
      ]),
      heatPenaltyByDeliveries: Object.freeze([
        Object.freeze({ at: 0, value: 20 }),
        Object.freeze({ at: 30, value: 25 }),
        Object.freeze({ at: 60, value: 30 }),
        Object.freeze({ at: 90, value: 35 }),
      ]),
      warningSeconds: 0.65,
      stunSeconds: 0.58,
    }),

    garbage: Object.freeze({
      capByDeliveries: Object.freeze([
        Object.freeze({ at: 0, value: 0 }),
        Object.freeze({ at: 9, value: 1 }),
        Object.freeze({ at: 18, value: 2 }),
        Object.freeze({ at: 27, value: 3 }),
        Object.freeze({ at: 36, value: 4 }),
        Object.freeze({ at: 48, value: 5 }),
      ]),
      spawnDelayByDeliveries: Object.freeze([
        Object.freeze({ at: 0, value: 3.5 }),
        Object.freeze({ at: 18, value: 3.0 }),
        Object.freeze({ at: 27, value: 2.7 }),
        Object.freeze({ at: 36, value: 2.4 }),
        Object.freeze({ at: 48, value: 2.1 }),
      ]),
      retryDelaySeconds: 1.0,
    }),

    cat: Object.freeze({
      secondCatUnlockDeliveries: 30,
      moveTimingByDeliveries: Object.freeze([
        Object.freeze({ at: 0, value: Object.freeze([0.95, 1.65]) }),
        Object.freeze({ at: 12, value: Object.freeze([0.80, 1.40]) }),
        Object.freeze({ at: 21, value: Object.freeze([0.68, 1.20]) }),
        Object.freeze({ at: 30, value: Object.freeze([0.56, 1.02]) }),
        Object.freeze({ at: 48, value: Object.freeze([0.48, 0.92]) }),
      ]),
      scentWeightByDeliveries: Object.freeze([
        Object.freeze({ at: 0, value: 1.8 }),
        Object.freeze({ at: 12, value: 3.0 }),
        Object.freeze({ at: 21, value: 4.5 }),
        Object.freeze({ at: 30, value: 6.2 }),
        Object.freeze({ at: 48, value: 7.8 }),
      ]),
      stayChance: 0.22,
      scentLookaheadRadius: 3,
      scentLookaheadFalloff: 0.70,
      scentLureThreshold: 0.20,
      scentLuredStayChance: 0.06,

      // Soft territory bias. The first cat keeps its existing lower spawn and
      // the second cat keeps its existing upper spawn; these are preferences,
      // not collision walls. Strong curry scent can override them.
      territory: Object.freeze({
        homeByIndex: Object.freeze(["lower", "upper"]),
        centerMinRow: 5,
        centerMaxRow: 7,
        homeWeight: 1.00,
        centerWeight: 0.70,
        awayWeight: 0.35,
        scentOverrideThreshold: 1.20,
        outsideTowardWeight: 1.35,
        outsideSameWeight: 0.90,
        outsideAwayWeight: 0.72,
        shopAvoidRowsMax: 3,
        shopAvoidWeight: 0.45,
        rushReturnSteps: 5,
        rushReturnTowardWeight: 2.20,
        rushReturnSameWeight: 0.75,
        rushReturnAwayWeight: 0.30,
      }),
    }),

    door: Object.freeze({
      cycleSeconds: 7.0,
      openWindowByDeliveries: Object.freeze([
        Object.freeze({ at: 0, value: Object.freeze([3.0, 6.4]) }),
        Object.freeze({ at: 4, value: Object.freeze([3.2, 6.4]) }),
        Object.freeze({ at: 7, value: Object.freeze([3.4, 6.3]) }),
        Object.freeze({ at: 10, value: Object.freeze([3.6, 6.2]) }),
        Object.freeze({ at: 13, value: Object.freeze([3.8, 6.1]) }),
      ]),
    }),

    orders: Object.freeze({
      normalBatchSize: 3,
      // Late-shift order surges begin after 60 completed deliveries. The next
      // surge is armed every 30 deliveries and starts on the next shop pickup.
      bulkStartDeliveries: 60,
      bulkIntervalDeliveries: 30,
      bulkBatchSizes: Object.freeze([5, 6, 6, 7]),

      // 100+ deliveries: the colour cards become a required delivery sequence.
      // Nearby stops are preferred, with some variation among the three easiest
      // choices so the route feels sensible without becoming identical every time.
      sequenceUnlockDeliveries: 100,
      sequenceNearbyChoiceWeights: Object.freeze([0.68, 0.24, 0.08]),
      wrongOrderHeatPenalty: 15,
    }),

    economy: Object.freeze({
      deliverySalePrice: 1200,
      // Result naan now mirrors MASALA RUSH count one-for-one.
      naanPerMasalaRush: 1,
      makanaiTierThresholds: Object.freeze([9, 12, 18, 24, 30, 42]),
    }),
  });
})(typeof window !== "undefined" ? window : globalThis);
