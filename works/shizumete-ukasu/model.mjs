// Displacement in logical pixels from the waterline. Damped spring, not fluid physics.
export const LIMIT = 180;
export function createFloat() { return { y: 0, v: 0, held: false }; }
export function grab(s) { s.held = true; s.v = 0; }
export function drag(s, y) { if (s.held && Number.isFinite(y)) s.y = Math.max(-110, Math.min(LIMIT, y)); }
export function release(s) { s.held = false; s.v = 0; }
export function step(s, elapsed) {
  if (s.held || !Number.isFinite(elapsed) || elapsed <= 0) return;
  // Cap wake-up debt; small fixed-size substeps keep low frame rates stable.
  const dt = Math.min(elapsed, .05), n = Math.ceil(dt * 240), h = dt / n;
  for (let i = 0; i < n; i++) {
    s.v += (-22 * s.y - 2.8 * s.v) * h;
    s.y += s.v * h;
  }
  if (Math.abs(s.y) < .005 && Math.abs(s.v) < .02) { s.y = 0; s.v = 0; }
}
