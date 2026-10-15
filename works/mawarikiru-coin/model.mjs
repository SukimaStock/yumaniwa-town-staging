export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function createCoin() { return { elapsed: 0, duration: 0, direction: 1, phase: 0 }; }
export function flick(coin, distance, milliseconds, direction = 1) {
  if (!Number.isFinite(distance) || !Number.isFinite(milliseconds) || distance < 7) return false;
  const speed = distance / Math.max(30, milliseconds);
  coin.duration = 4.6 + 4.4 * clamp(speed / 1.2, 0, 1);
  coin.elapsed = 0;
  coin.direction = direction < 0 ? -1 : 1;
  coin.phase = (coin.phase + 1.17) % (Math.PI * 2);
  return true;
}
export function step(coin, seconds) {
  if (Number.isFinite(seconds)) coin.elapsed = Math.min(coin.duration, coin.elapsed + Math.max(0, seconds));
  return pose(coin);
}
export function pose(coin) {
  const p = coin.duration ? clamp(coin.elapsed / coin.duration, 0, 1) : 1;
  if (p === 1) return { tilt: 0, yaw: coin.phase + coin.direction * (coin.duration * 5.8 + (coin.duration ? 26 : 0)), spin: coin.phase + coin.direction * coin.duration * 17 * .54, active: false, progress: 1 };
  // An authored Euler-disk-like envelope, not rigid-body physics.
  const tail = clamp((p - .66) / .34, 0, 1);
  const tilt = 1.22 * Math.pow(1 - p, 1.18) * (1 + .25 * tail * Math.sin(70 * tail + 55 * tail * tail));
  const yaw = coin.phase + coin.direction * (coin.elapsed * 5.8 + 26 * Math.pow(p, 6));
  const spin = coin.phase + coin.direction * coin.duration * 17 * (p - .46 * p * p);
  return { tilt, yaw, spin, active: true, progress: p };
}
