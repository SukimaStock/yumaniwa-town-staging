(() => {
  'use strict';
  const svg = document.querySelector('svg');
  const cloth = document.querySelector('#cloth');
  const seams = document.querySelector('#seams');
  const teeth = document.querySelector('#teeth');
  const slider = document.querySelector('#slider');
  const pull = document.querySelector('#pull');
  const handle = document.querySelector('#handle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const TOP = 82, BOTTOM = 482, PITCH = 10;
  let position = 312, raw = position, active = null, lastY = 0;
  let swing = 0, startSwing = 0, startTime = 0, frame = 0;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  // Monotone periodic displacement: a small catch per tooth, never a jump.
  const detent = n => n - .85 * Math.sin((n - TOP) * Math.PI * 2 / PITCH);
  function inverse(n) {
    let lo = TOP, hi = BOTTOM;
    for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (detent(mid) < n) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  function spread(y) {
    const distance = Math.max(0, position - 14 - y);
    return 69 * (1 - Math.exp(-distance / 110));
  }
  function edge(side, y, offset = 0) { return 180 + side * (7 + spread(y) + offset); }
  function points(side, offset = 0) {
    const out = [];
    for (let y = 62; y <= 502; y += 5) out.push(`${edge(side,y,offset).toFixed(2)} ${y}`);
    return out;
  }
  function locateHandle() {
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const p = new DOMPoint(180, position + 20).matrixTransform(matrix);
    const box = handle.parentElement.getBoundingClientRect();
    handle.style.left = `${p.x - box.left}px`;
    handle.style.top = `${p.y - box.top}px`;
  }
  function draw() {
    cloth.innerHTML = [-1,1].map(side => {
      const pts = points(side), outer = side < 0 ? 42 : 318;
      const d = `M${outer} 62 L${pts.join(' L')} L${outer} 502 Z`;
      return `<path d="${d}" fill="${side < 0 ? '#929c88' : '#9da58f'}"/><path d="${d}" fill="url(#weave)"/>`;
    }).join('');
    seams.innerHTML = [-1,1].map(side => `<path d="M${points(side,12).join(' L')}"/>`).join('');
    let marks = '';
    for (let y = TOP; y <= BOTTOM; y += PITCH) {
      for (const side of [-1,1]) {
        const ty = y + (side === 1 ? PITCH / 2 : 0);
        const x = edge(side,ty);
        const left = side < 0 ? x - 3 : x - 11;
        marks += `<rect x="${left.toFixed(2)}" y="${ty}" width="14" height="4.4" rx="1.7" fill="url(#metal)" stroke="#817d67" stroke-width=".55"/>`;
      }
    }
    teeth.innerHTML = marks;
    slider.setAttribute('transform', `translate(180 ${position})`);
    const value = Math.round((BOTTOM - position) / (BOTTOM - TOP) * 100);
    handle.setAttribute('aria-valuenow', value);
    handle.setAttribute('aria-valuetext', `${value}% 閉じています`);
    locateHandle();
  }
  function setSwing(value) {
    swing = reduced.matches ? 0 : value;
    pull.setAttribute('transform', `rotate(${swing})`);
  }
  function stopAnimation() { cancelAnimationFrame(frame); frame = 0; }
  function settle(time) {
    const seconds = (time - startTime) / 1000;
    setSwing(startSwing * Math.exp(-7 * seconds) * Math.cos(19 * seconds));
    if (seconds < .8 && !reduced.matches) frame = requestAnimationFrame(settle);
    else { setSwing(0); frame = 0; }
  }
  function end() {
    if (active === null) return;
    const id = active; active = null;
    if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
    handle.removeAttribute('data-held');
    stopAnimation(); startSwing = swing; startTime = performance.now();
    if (!reduced.matches) frame = requestAnimationFrame(settle);
    else setSwing(0);
  }
  function localY(event) {
    return new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse()).y;
  }
  handle.addEventListener('pointerdown', event => {
    if (active !== null || !event.isPrimary || event.button !== 0) return;
    event.preventDefault(); stopAnimation();
    active = event.pointerId; lastY = localY(event); raw = inverse(position);
    handle.setPointerCapture(active); handle.setAttribute('data-held','');
    setSwing(-5); // Contact response without changing the closure position.
  });
  handle.addEventListener('pointermove', event => {
    if (event.pointerId !== active) return;
    const y = localY(event), delta = y - lastY; lastY = y;
    raw = clamp(raw + delta, TOP, BOTTOM); position = detent(raw);
    setSwing(clamp(delta * .9, -11, 11)); draw();
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) {
    handle.addEventListener(type, event => { if (event.pointerId === active) end(); });
  }
  window.addEventListener('blur',end);
  document.addEventListener('visibilitychange',() => { if (document.hidden) end(); });
  window.addEventListener('resize',() => { end(); locateHandle(); });
  new ResizeObserver(() => { end(); locateHandle(); }).observe(svg);
  reduced.addEventListener('change',() => { stopAnimation(); setSwing(0); });
  handle.addEventListener('keydown',event => {
    const changes = {ArrowUp:-PITCH,ArrowRight:-PITCH,ArrowDown:PITCH,ArrowLeft:PITCH,PageUp:-PITCH*5,PageDown:PITCH*5};
    if (!(event.key in changes) && !['Home','End'].includes(event.key)) return;
    event.preventDefault(); end(); stopAnimation(); setSwing(0);
    position = event.key === 'Home' ? BOTTOM : event.key === 'End' ? TOP : clamp(position + changes[event.key],TOP,BOTTOM);
    raw = inverse(position); draw();
  });
  draw();
})();
