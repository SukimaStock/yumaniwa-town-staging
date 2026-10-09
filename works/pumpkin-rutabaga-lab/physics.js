/* Work-local model. Units: pixels, seconds, mass units. Y points upward.
 * Physics circles stay independent from squash, grooves and the irregular skin. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FruitLabPhysics = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const STEP = 1 / 240, G = 720, LIMIT = 475, SPEED = 720;
  const PARAMETERS = {
    pumpkin: {
      mass: ['重さ', 2.4, 1, 5, .1],
      response: ['転がる応答', 850, 300, 1600, 10],
      friction: ['転がり抵抗', .14, .02, .65, .01],
      restitution: ['反発', .08, 0, .25, .01],
      air: ['空中の方向調整', .16, 0, .5, .01],
    },
    rutabaga: {
      mass: ['重さ', 1.5, .7, 3, .1],
      restitution: ['反発', .63, .3, .85, .01],
      boost: ['着地の強化', 230, 60, 420, 10],
      response: ['横方向の応答', 570, 200, 1000, 10],
      air: ['空中の方向調整', .35, .05, .7, .01],
    },
    handoff: {
      inherit: ['勢いの継承', .85, .2, 1.4, .05],
      angle: ['飛び出す角度', 48, 25, 75, 1],
      cap: ['初速の上限', 520, 220, 650, 10],
    },
  };
  function defaults() {
    return Object.fromEntries(Object.entries(PARAMETERS).map(([group, values]) =>
      [group, Object.fromEntries(Object.entries(values).map(([key, def]) => [key, def[1]]))]));
  }
  function setParameter(settings, group, key, value) {
    const def = PARAMETERS[group]?.[key];
    if (!def || !Number.isFinite(Number(value))) return false;
    settings[group][key] = clamp(Number(value), def[2], def[3]);
    return true;
  }
  function terrain(x) { return 100 + .0015 * x * x; }
  function frame(x) {
    const slope = .003 * x, k = Math.hypot(1, slope);
    return { x, y: terrain(x), tx: 1 / k, ty: slope / k, nx: -slope / k, ny: 1 / k };
  }
  // Closest point on the smooth bowl. Contact projection follows its normal,
  // rather than placing a circle vertically over a slope (which causes snags).
  function contact(body) {
    let x = body.x;
    for (let i = 0; i < 8; i++) {
      const slope = .003 * x, y = terrain(x);
      const denominator = 1 + slope * slope + (y - body.y) * .003;
      x -= clamp(((x - body.x) + (y - body.y) * slope) / Math.max(.4, denominator), -65, 65);
    }
    const f = frame(x);
    f.distance = (body.x - f.x) * f.nx + (body.y - f.y) * f.ny;
    return f;
  }
  function body(kind, x, drop = 0) {
    const r = kind === 'pumpkin' ? 36 : 32, f = frame(x);
    return { kind, r, x: f.x + f.nx * r, y: f.y + f.ny * r + drop,
      vx: 0, vy: 0, angle: 0, angular: 0, grounded: drop === 0,
      pulse: 0, stretch: 0, lastBounce: -10, landing: null, safety: false };
  }
  function create(mode = 'pumpkin', settings = defaults()) {
    if (!['pumpkin', 'rutabaga', 'handoff'].includes(mode)) throw new Error('Unknown mode');
    return { mode, settings, time: 0, accumulator: 0, axis: 0, target: 0,
      previousInput: 0, bufferedAt: -10, boostUsed: true, handoffs: 0,
      active: mode === 'rutabaga' ? 'rutabaga' : 'pumpkin',
      pumpkin: body('pumpkin', 0), rutabaga: body('rutabaga', mode === 'handoff' ? 180 : 0, mode === 'rutabaga' ? 100 : 0),
      camera: { x: 0, y: 0, vx: 0, vy: 0 }, events: [], lastRoll: -10 };
  }
  function clearInput(s) {
    s.target = s.previousInput = s.axis = 0;
    s.bufferedAt = -10; s.boostUsed = true; s.accumulator = 0;
  }
  function input(s, axis) {
    const next = clamp(Number(axis) || 0, -1, 1);
    // A new push or reversal arms ONE landing impulse. A held key does not.
    if (Math.abs(next) > .15 && (Math.abs(s.previousInput) <= .15 || Math.sign(next) !== Math.sign(s.previousInput))) {
      s.bufferedAt = s.time; s.boostUsed = false;
    }
    s.target = next; s.previousInput = next;
  }
  function velocityCap(b, max = SPEED) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > max) { b.vx *= max / speed; b.vy *= max / speed; }
  }
  function launch(b, f, normalSpeed, tangentSpeed) {
    b.grounded = false;
    b.vx = f.tx * tangentSpeed + f.nx * normalSpeed;
    b.vy = f.ty * tangentSpeed + f.ny * normalSpeed;
    velocityCap(b); b.pulse = 1;
  }
  function strengthen(s, b, f) {
    const p = s.settings.rutabaga;
    const impulse = p.boost / Math.sqrt(p.mass);
    const vn = Math.max(0, b.vx * f.nx + b.vy * f.ny);
    const vt = b.vx * f.tx + b.vy * f.ty;
    launch(b, f, Math.min(570, vn + impulse), vt);
    s.boostUsed = true; b.landing = null;
    s.events.push({ type: 'boost', kind: b.kind, strength: impulse });
  }
  function integrate(s, b, control, dt, geometry) {
    const findContact = geometry ? geometry.contact : contact, findFrame = geometry ? geometry.frame : frame;
    const p = s.settings[b.kind], f = findContact(b), oldX = b.x;
    b.pulse *= Math.exp(-dt * 10);
    const armed = b.kind === 'rutabaga' && !s.boostUsed && s.time - s.bufferedAt <= .22;
    const late = armed && b.landing && !b.landing.used && s.time - b.landing.at <= .12;
    if (late) { strengthen(s, b, b.landing.frame); }
    if (b.grounded) {
      if (armed) { strengthen(s, b, f); }
      else {
        let v = b.vx * f.tx + b.vy * f.ty;
        const rolling = b.kind === 'pumpkin' ? 1.32 : 1.08;
        v += (-G * f.ty + control * p.response / p.mass * f.tx) * dt / rolling;
        v *= Math.exp(-dt * (b.kind === 'pumpkin' ? p.friction : .22));
        v = clamp(v, -620, 620);
        const next = findFrame(f.x + v * f.tx * dt);
        b.x = next.x + next.nx * b.r; b.y = next.y + next.ny * b.r;
        b.vx = v * next.tx; b.vy = v * next.ty;
      }
    }
    if (!b.grounded) {
      b.vx += control * p.response / p.mass * p.air * dt;
      b.vy -= G * dt; velocityCap(b);
      b.x += b.vx * dt; b.y += b.vy * dt;
      const hit = findContact(b);
      if (hit.distance <= b.r) {
        b.x = hit.x + hit.nx * b.r; b.y = hit.y + hit.ny * b.r;
        const incoming = -(b.vx * hit.nx + b.vy * hit.ny);
        const tangent = (b.vx * hit.tx + b.vy * hit.ty) * (b.kind === 'pumpkin' ? .97 : .96);
        if (incoming > 0) {
          let rebound = incoming * p.restitution;
          if (b.kind === 'rutabaga') {
            rebound *= 1 + .035 * Math.sin(b.angle * 3); // bounded shape feel, deterministic
            if (b.safety) { rebound = Math.max(200, rebound); b.safety = false; }
            b.landing = { at: s.time, frame: hit, used: false };
          }
          launch(b, hit, Math.min(rebound, 530), tangent);
          b.lastBounce = s.time;
          s.events.push({ type: 'land', kind: b.kind, strength: incoming });
          if (armed) strengthen(s, b, hit);
          else if (rebound < 35) { b.grounded = true; b.vx = tangent * hit.tx; b.vy = tangent * hit.ty; }
        }
      }
    }
    if (geometry) geometry.constrain(b);
    else if (Math.abs(b.x) > LIMIT - b.r) {
      b.x = clamp(b.x, -LIMIT + b.r, LIMIT - b.r);
      b.vx = -Math.sign(b.x) * Math.abs(b.vx) * .35;
      // Reproject after the side-wall correction, including simultaneous floor contact.
      const wallFloor = contact(b);
      if (wallFloor.distance < b.r) { b.x = wallFloor.x + wallFloor.nx * b.r; b.y = wallFloor.y + wallFloor.ny * b.r; }
    }
    if (!geometry && b.y > 630 - b.r) { b.y = 630 - b.r; b.vy = Math.min(0, b.vy) * .2; }
    b.angular += ((b.x - oldX) / (b.r * dt) - b.angular) * (1 - Math.exp(-dt * 12));
    b.angular = clamp(b.angular, -16, 16); b.angle += b.angular * dt;
    b.stretch += ((b.grounded ? 0 : clamp(Math.abs(b.vy) / 900, 0, .2)) - b.stretch) * (1 - Math.exp(-dt * 14));
  }
  function handoff(s) {
    const a = s.pumpkin, b = s.rutabaga;
    if (s.mode !== 'handoff' || s.handoffs || Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r + 2) return false;
    const p = s.settings.handoff;
    const speed = Math.hypot(a.vx, a.vy), angle = p.angle * Math.PI / 180;
    const outgoing = clamp(speed * p.inherit, 170, p.cap);
    b.vx = Math.cos(angle) * outgoing; b.vy = Math.sin(angle) * outgoing;
    b.grounded = false; b.safety = true; b.pulse = 1;
    a.vx *= .16; a.vy *= .16;
    s.active = 'rutabaga'; s.handoffs++;
    // Keep the held axis, discard the old pumpkin landing-buffer.
    s.bufferedAt = -10; s.boostUsed = true;
    s.events.push({ type: 'handoff', kind: b.kind, strength: speed });
    return true;
  }
  function substep(s, dt) {
    s.time += dt;
    s.axis += (s.target - s.axis) * (1 - Math.exp(-dt * 12));
    const b = s[s.active];
    integrate(s, b, s.axis, dt);
    if (s.mode === 'handoff' && s.handoffs) integrate(s, s.pumpkin, 0, dt);
    handoff(s);
    if (b.kind === 'pumpkin' && b.grounded && Math.hypot(b.vx, b.vy) > 85 && s.time - s.lastRoll > .65) {
      s.events.push({ type: 'roll', kind: b.kind, strength: Math.hypot(b.vx, b.vy) }); s.lastRoll = s.time;
    }
    // Entire bowl stays visible. Tiny critically damped follow, no switch cut.
    const active = s[s.active], targets = { x: clamp(active.x * .08, -30, 30), y: clamp((active.y - 136) * .025, 0, 12) };
    for (const key of ['x', 'y']) {
      const velocity = 'v' + key;
      s.camera[velocity] += ((targets[key] - s.camera[key]) * 36 - s.camera[velocity] * 12) * dt;
      s.camera[key] += s.camera[velocity] * dt;
    }
  }
  function update(s, dt) {
    s.events.length = 0;
    // Never fast-forward a hidden tab's elapsed time.
    s.accumulator += clamp(Number(dt) || 0, 0, .05);
    while (s.accumulator + 1e-10 >= STEP) { substep(s, STEP); s.accumulator -= STEP; }
    return s.events;
  }
  function snapshot(s) {
    return JSON.parse(JSON.stringify({ mode: s.mode, active: s.active, time: s.time, axis: s.axis,
      handoffs: s.handoffs, pumpkin: s.pumpkin, rutabaga: s.rutabaga, camera: s.camera, ...(s.mode === 'world' ? { phase: s.phase, holes: s.holes.map(h => ({ id: h.id, state: h.state, swaps: h.swaps, occupant: h.occupant.kind, x: h.x, y: h.y })), entities: s.entities } : {}) }));
  }
  return { PARAMETERS, STEP, G, LIMIT, SPEED, defaults, setParameter, terrain, frame, contact, body, create, input, clearInput, update, snapshot, handoff, integrate };
});
