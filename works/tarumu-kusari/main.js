'use strict';
(() => {
  const scene = document.querySelector('#scene');
  const handle = document.querySelector('#handle');
  const weight = document.querySelector('#weight');
  const links = document.querySelector('#links');
  const ns = 'http://www.w3.org/2000/svg';
  const count = 7, play = 14, limit = 160;
  let pull = 0, weightOffset = 0, drag = null;
  const rings = Array.from({ length: count }, (_, i) => {
    const g = document.createElementNS(ns, 'g');
    // Two strokes make each closed link readable without textures or assets.
    for (const [stroke, width] of [['#202a23', 7], ['url(#metal)', 4]]) {
      const ring = document.createElementNS(ns, 'rect');
      ring.setAttribute('x', '-9'); ring.setAttribute('y', '-20');
      ring.setAttribute('width', '18'); ring.setAttribute('height', '40');
      ring.setAttribute('rx', '9'); ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', stroke); ring.setAttribute('stroke-width', width);
      g.append(ring);
    }
    // Distal links are painted first; grasped end is in front.
    links.prepend(g);
    return g;
  });
  function render() {
    let y = 321 + pull;
    const taken = pull - weightOffset;
    rings.forEach((ring, i) => {
      const extension = Math.max(0, Math.min(play, taken - i * play));
      const slack = 1 - extension / play;
      const gap = 16 + extension;
      ring.setAttribute('transform', `translate(${180 + (i % 2 ? -1 : 1) * 7 * slack} ${y - gap / 2}) rotate(${(i % 2 ? -1 : 1) * 24 * slack})`);
      y -= gap;
    });
    weight.setAttribute('transform', `translate(0 ${weightOffset})`);
    handle.setAttribute('transform', `translate(180 ${340 + pull})`);
    handle.setAttribute('aria-valuemin', String(Math.round(weightOffset)));
    handle.setAttribute('aria-valuenow', String(Math.round(pull)));
    handle.setAttribute('aria-valuetext', taken >= count * play ? '鎖が張り、重りが動く' : '鎖にたるみがある');
  }
  function move(value) {
    pull = Math.max(weightOffset, Math.min(limit, value));
    // The weight rests until every link has used its play. On reversal it
    // stays put: the grasped end immediately gives that play back.
    weightOffset = Math.max(weightOffset, pull - count * play);
    render();
  }
  function localY(event) {
    const matrix = scene.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()).y : null;
  }
  function stop() {
    const old = drag;
    drag = null;
    handle.classList.remove('dragging');
    handle.querySelector('.hit').setAttribute('fill', 'transparent');
    if (old && handle.hasPointerCapture(old.id)) handle.releasePointerCapture(old.id);
  }
  handle.addEventListener('pointerdown', event => {
    if (drag || !event.isPrimary || event.button !== 0) return;
    const y = localY(event);
    if (y === null) return;
    event.preventDefault();
    drag = { id: event.pointerId, y, pull };
    handle.setPointerCapture(event.pointerId);
    handle.classList.add('dragging');
    handle.focus({ preventScroll: true });
    // Contact response is immediate; there is no dead zone or delayed tween.
    handle.querySelector('.hit').setAttribute('fill', '#d7b9830c');
  });
  handle.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const y = localY(event);
    if (y !== null) move(drag.pull + y - drag.y);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    handle.addEventListener(type, event => {
      if (drag && drag.id !== event.pointerId) return;
      stop();
      handle.querySelector('.hit').setAttribute('fill', 'transparent');
    });
  }
  handle.addEventListener('keydown', event => {
    const steps = { ArrowDown: 4, ArrowUp: -4, ArrowRight: 4, ArrowLeft: -4, PageDown: 14, PageUp: -14 };
    if (event.key in steps) { event.preventDefault(); stop(); move(pull + steps[event.key]); }
    else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); stop(); move(event.key === 'Home' ? weightOffset : limit);
    } else if (event.key === 'Escape') stop();
  });
  document.querySelector('#reset').addEventListener('click', () => { stop(); pull = weightOffset = 0; render(); });
  for (const type of ['blur', 'pagehide', 'resize']) window.addEventListener(type, stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  render();
})();
