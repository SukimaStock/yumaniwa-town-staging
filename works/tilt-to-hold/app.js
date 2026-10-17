'use strict';
(() => {
  const area = document.querySelector('.apparatus');
  const ring = document.querySelector('#ring');
  const tilt = document.querySelector('#tilt');
  const handle = document.querySelector('#handle');
  const status = document.querySelector('#state');
  let y = 85, angle = 10, speed = 0, held = true, pointer = null, lastY = 0;
  let previous = null;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function setAngle(value) {
    angle = clamp(value, -18, 18);
    if (Math.abs(angle) >= 7) held = true;
    else if (Math.abs(angle) <= 4) held = false;
    if (held) speed = 0;
    paint();
  }
  function paint() {
    ring.setAttribute('transform', `translate(164 ${y})`);
    tilt.setAttribute('transform', `rotate(${angle})`);
    const box = area.getBoundingClientRect();
    const scale = Math.min(box.width / 360, box.height / 560);
    const rad = angle * Math.PI / 180;
    handle.style.left = `${(box.width - 360 * scale) / 2 + (164 + 72 * Math.cos(rad)) * scale}px`;
    handle.style.top = `${(box.height - 560 * scale) / 2 + (y + 72 * Math.sin(rad)) * scale}px`;
    const state = y >= 488 ? '下についた' : held ? 'とまる' : 'すべる';
    if (status.textContent !== state) status.textContent = state;
    handle.setAttribute('aria-valuenow', String(Math.round(angle)));
    handle.setAttribute('aria-valuetext', `${Math.round(angle)}度、${state}。上下矢印で傾き変更、左右矢印で水平`);
  }
  function release(stop = false) {
    const id = pointer; pointer = null;
    if (id !== null && handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
    if (stop) setAngle(angle < 0 ? -10 : 10);
  }
  handle.addEventListener('pointerdown', e => {
    if (pointer !== null || !e.isPrimary || e.button !== 0) return;
    pointer = e.pointerId; lastY = e.clientY;
    handle.setPointerCapture(pointer); e.preventDefault();
  });
  handle.addEventListener('pointermove', e => {
    if (e.pointerId !== pointer) return;
    // Relative finger travel changes angle, never ring height. Regrabbing has no jump.
    setAngle(angle + (e.clientY - lastY) * .28);
    lastY = e.clientY;
  });
  handle.addEventListener('pointerup', e => { if (e.pointerId === pointer) release(); });
  handle.addEventListener('pointercancel', e => { if (e.pointerId === pointer) release(true); });
  handle.addEventListener('lostpointercapture', e => { if (e.pointerId === pointer) release(true); });
  handle.addEventListener('keydown', e => {
    if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','Escape'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'Escape') release(true);
    else if (e.key === 'Home') reset();
    else setAngle(e.key === 'ArrowUp' ? angle - 1 : e.key === 'ArrowDown' ? angle + 1 : 0);
  });
  function reset() { release(); y = 85; speed = 0; setAngle(10); }
  document.querySelector('#reset').addEventListener('click', reset);
  window.addEventListener('blur', () => release(true));
  document.addEventListener('visibilitychange', () => { previous = null; if (document.hidden) release(true); });
  window.addEventListener('resize', () => { release(true); paint(); });
  function frame(now) {
    const dt = previous === null ? 0 : Math.min((now - previous) / 1000, .04);
    previous = now;
    if (!held && !document.hidden && y < 488) {
      speed = Math.min(70, speed + 95 * dt);
      y = Math.min(488, y + speed * dt);
      if (y === 488) speed = 0;
      paint();
    }
    requestAnimationFrame(frame);
  }
  paint(); requestAnimationFrame(frame);
})();
