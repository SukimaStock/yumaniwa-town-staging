import { createFloat, grab, drag, release, step } from './model.mjs';
const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d');
const bob = createFloat();
let width, height, scale, surface, pointer = null, offset = 0, keyHeld = false, previousTime = 0;
let waves = [], needsPaint = true;
function end() {
  const id = pointer; pointer = null; keyHeld = false;
  release(bob); needsPaint = true;
  if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
}
function resize() {
  end();
  width = innerWidth; height = innerHeight;
  scale = Math.min(width / 390, height / 650, 1.35);
  surface = height * .43;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  waves = [];
}
function localY(e) { return (e.clientY - surface) / scale; }
canvas.addEventListener('pointerdown', e => {
  if (pointer !== null || keyHeld || !e.isPrimary || e.button !== 0) return;
  if (Math.hypot((e.clientX - width / 2) / scale, localY(e) - bob.y) > 42) return;
  e.preventDefault(); canvas.focus({preventScroll: true});
  pointer = e.pointerId; offset = localY(e) - bob.y;
  grab(bob); canvas.setPointerCapture(pointer);
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer) return;
  e.preventDefault(); drag(bob, localY(e) - offset);
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, e => { if (e.pointerId === pointer) end(); });
canvas.addEventListener('keydown', e => {
  if (e.code !== 'ArrowDown' || pointer !== null) return;
  e.preventDefault(); if (!keyHeld) { keyHeld = true; grab(bob); }
});
canvas.addEventListener('keyup', e => { if (e.code === 'ArrowDown' && keyHeld) { e.preventDefault(); end(); } });
canvas.addEventListener('blur', end);
window.addEventListener('blur', end);
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { end(); previousTime = 0; });
function ellipse(x, y, rx, ry, color) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
}
function render(dt) {
  const x = width / 2, y = surface + bob.y * scale;
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#18282b'); bg.addColorStop(1, '#233c3d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#335456'; ctx.globalAlpha = .25; ctx.fillRect(0, surface, width, height - surface); ctx.globalAlpha = 1;
  ellipse(x, surface + 3 * scale, (29 + Math.abs(bob.y) * .08) * scale, 4 * scale, '#122c2e');
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const body = ctx.createLinearGradient(-18, 0, 20, 0);
  body.addColorStop(0, '#9a9079'); body.addColorStop(.35, '#e5dbc0'); body.addColorStop(.65, '#d0c6a9'); body.addColorStop(1, '#897e66');
  ellipse(0, 0, 17, 25, body);
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 17, 25, 0, 0, Math.PI * 2); ctx.clip();
  const cap = ctx.createLinearGradient(-17, -24, 17, 0);
  cap.addColorStop(0, '#8f5948'); cap.addColorStop(.4, '#bd8064'); cap.addColorStop(1, '#75483d');
  ctx.fillStyle = cap; ctx.fillRect(-18, -26, 36, 18);
  for (let i = 0; i < 52; i++) {
    const px = ((i * 71) % 33) - 16, py = ((i * 43) % 49) - 24;
    ellipse(px, py, .55, .85, i % 2 ? '#ffffff18' : '#17252225');
  }
  ctx.restore();
  ellipse(-6, -15, 3, 5, '#f5dfb91e');
  ctx.restore();
  // Water tint only on the submerged part of the object; no second physics body.
  ctx.save(); ctx.beginPath(); ctx.rect(0, surface, width, height); ctx.clip();
  ellipse(x, y, 17 * scale, 25 * scale, '#38666977'); ctx.restore();
  ctx.strokeStyle = '#9bb8b33b'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, surface); ctx.lineTo(width, surface); ctx.stroke();
  waves = waves.filter(w => w.age < 2.2);
  for (const w of waves) {
    w.age += dt;
    ctx.strokeStyle = `rgba(171,205,197,${Math.max(0, (1 - w.age / 2.2) * w.strength)})`;
    ctx.beginPath(); ctx.ellipse(x, surface, (22 + w.age * 54) * scale, (2 + w.age * 8) * scale, 0, 0, Math.PI * 2); ctx.stroke();
  }
  canvas.dataset.y = bob.y.toFixed(3);
  canvas.dataset.motion = bob.held ? 'held' : bob.y === 0 && bob.v === 0 ? 'rest' : 'floating';
}
function frame(time) {
  const dt = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0; previousTime = time;
  if (!document.hidden) {
    const active = bob.held || bob.y !== 0 || bob.v !== 0 || waves.length > 0;
    const before = bob.y;
    if (keyHeld) drag(bob, bob.y + dt * 85);
    step(bob, dt);
    if (before * bob.y < 0 && Math.abs(bob.v) > 12) {
      waves.push({age: 0, strength: Math.min(.3, Math.abs(bob.v) / 900)});
      if (waves.length > 8) waves.shift();
    }
    if (active || needsPaint) render(dt);
    needsPaint = false;
  }
  requestAnimationFrame(frame);
}
resize(); render(0); requestAnimationFrame(frame);
