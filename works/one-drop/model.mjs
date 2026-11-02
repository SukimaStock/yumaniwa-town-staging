export const clamp = v => Math.max(0, Math.min(1, v));
export function createState() {
 return { target: 0, press: 0, volume: 0, neck: 0, spent: false, fall: null, ripple: 1, drops: 0 };
}
// One drop per squeeze; releasing below the reset point refills the tip.
export function step(s, dt) {
 dt = Math.min(.04, Math.max(0, dt));
 s.press += (s.target - s.press) * (1 - Math.exp(-25 * dt));
 if (s.press < .16) s.spent = false;
 const desired = s.spent ? .018 : s.press;
 s.volume += (desired - s.volume) * (1 - Math.exp(-21 * dt));
 if (!s.spent && s.volume > .89) s.neck = Math.min(1, s.neck + dt / .18);
 else s.neck = Math.max(0, s.neck - dt * 18);
 if (s.neck >= 1 && !s.fall) {
  s.fall = { y: 362, vy: 12, age: 0 };
  s.drops++; s.spent = true; s.volume = .018; s.neck = 0;
 }
 if (s.fall) {
  s.fall.age += dt; s.fall.vy += 650 * dt; s.fall.y += s.fall.vy * dt;
  if (s.fall.y >= 454) { s.fall = null; s.ripple = 0; }
 }
 s.ripple = Math.min(1, s.ripple + dt / .8);
 return s;
}
export function dropShape(volume, neck) {
 const r = 2 + 14 * Math.cbrt(Math.max(0, volume));
 const n = neck * 19, y = 326, cy = y + r * 1.15 + n;
 const w = Math.max(.6, 3.4 * (1 - neck));
 return { r, cy, path: `M${180-w} ${y} C${180-w} ${y+8+n},${180-r} ${cy-r*.9},${180-r} ${cy} C${180-r} ${cy+r*1.35},${180+r} ${cy+r*1.35},${180+r} ${cy} C${180+r} ${cy-r*.9},${180+w} ${y+8+n},${180+w} ${y}Z` };
}
