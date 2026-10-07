# ORBIT Web v2.3.3 — LUMA RANGE TUNING

## Scope

This build changes only the LUMA relay reachability rule identified by the Phase 12 foundation audit. Flight speed, steering, fuel cost, RESTORE costs, SERA/VOX positions, MiniMap, landing/takeoff, Echo order, and HOME checkpoint behavior are unchanged from v2.3.2.

## Design rule

LUMA remains a **soft route-bending tool**, not a hard exploration gate.

- Any LUMA can still be found, approached, landed on, and shown on the MiniMap.
- Each LUMA is assigned a relay tier from its distance to HOME, using the existing RESTORE safe-radius bands.
- A LUMA refuels only when its relay tier is at or below the current RESTORE level.
- A farther LUMA remains present but its relay is dormant; landing there shows `LUMA RELAY · SIGNAL TOO WEAK` and does not consume its stored fuel.
- Using working relays in the current range band can still let a skilled player stretch into the **next** story ring. The rule therefore preserves sequence-breaking without allowing a chain of far relays to reset the tank indefinitely.

Fixed LUMA tiers are authored explicitly:

- L:01 → tier 1
- L:02 → tier 2
- L:03 / L:04 → tier 3
- L:05 → tier 4
- L:06 → tier 5

Procedural LUMA uses the same distance-band rule, so an accidental generated chain cannot bypass the authored progression structure.

## Validation

Static syntax validation: `node --check sketch.js` — PASS.

A deterministic relay-graph check using the game atlas seed, actual SERA positions, current fuel capacities, and distance fuel cost confirmed:

- RESTORE Lv1 can still make round trips into the Lv2 SERA ring using working early LUMA.
- RESTORE Lv2 can still reach the Lv3 ring.
- RESTORE Lv3 can still reach the Lv4 ring.
- RESTORE Lv4 can still reach the Lv5 ring.
- The previous audit's Lv1 → far Lv5 routes no longer work because the relays used by those chains are tier 3–5 and therefore dormant at Lv1.
- The old S:11 route relied on fixed L:03 (tier 3) and procedural relays in tiers 3 and 5.
- The old S:12 route began with a procedural relay only 13 units beyond the tier-2 radius, which correctly becomes tier 3 and is dormant at Lv1.

Two-tier-ahead discoveries may still be possible in favorable geometry. That remains acceptable as a risky sequence break; the important constraint is that three- and four-tier relay chains no longer function from the early game.
