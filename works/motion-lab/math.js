(function (root) {
  'use strict';
  const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
  const follow = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));
  function random(seed) {
    let n = seed >>> 0;
    return () => { n += 0x6D2B79F5; let t = Math.imul(n ^ n >>> 15, 1 | n); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const api = { clamp, follow, random };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MotionMath = api;
})(typeof window !== 'undefined' ? window : globalThis);
