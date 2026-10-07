# ORBIT Web v2.1 — Faint Signal

## Phase 10: Guidance without navigation

The 12-Echo story exposed a late-game exploration problem: after the nearby SERA planets, searching could become blind collection rather than drifting with curiosity.

### Added
- A faint screen-edge signal points only in the *general direction* of the nearest undiscovered SERA.
- It is not an arrow and never shows distance, planet name, or a target icon.
- Signal appears intermittently (~6.2 s interval, ~1.25 s pulse).
- No signal is shown for nearby targets (quiet radius 1150 world units).
- Long-range search is limited to deterministic Atlas sectors within the configured lookahead and 7600-unit maximum distance.
- Atlas lookahead uses uncached sector generation so unseen planets are not added to persistent mutable state.

### Suppressed during
- landing / landed / takeoff / rescue
- Echo memory playback
- final return sequence
- after ECHO 12/12

### Preserved
- accepted Web drift physics
- landing assist and high-speed bounce
- launch speed 330
- BASE Lv1–5 costs
- Echo 01–12 story and finale
- save schema v2

### Intent
The player should feel “something is out there in this direction,” not “the game has given me a waypoint.”
