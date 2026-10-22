'use strict';
(() => {
  const svg = document.querySelector('#scene');
  const knob = document.querySelector('#knob');
  const dial = document.querySelector('#dial');
  const platform = document.querySelector('#platform');
  const threads = document.querySelector('#threads');
  const ns = 'http://www.w3.org/2000/svg';
  const pitch = 8;
  const maximum = 144;
  let height = 48;
  let pointer = null;
  let angle = null;
  for (let i = 0; i < 34; i++) {
    const line = document.createElementNS(ns, 'path');
    threads.append(line);
  }
  function render() {
    // Positive clockwise rotation raises the carriage. One turn = one thread pitch.
    const degrees = height / pitch * 360;
    dial.setAttribute('transform', `rotate(${degrees} 180 423)`);
    platform.setAttribute('transform', `translate(0 ${48 - height})`);
    [...threads.children].forEach((line, i) => {
      const y = 147 + i * pitch - height % pitch;
      line.setAttribute('d', `M169 ${y + 5} L191 ${y - 5}`);
    });
    knob.setAttribute('aria-valuenow', String(+height.toFixed(3)));
    knob.setAttribute('aria-valuetext', `高さ ${Math.round(height / maximum * 100)}%`);
  }
  function turn(delta) {
    height = Math.max(0, Math.min(maximum, height + delta / (2 * Math.PI) * pitch));
    render();
  }
  function pointAngle(event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const x = point.x - 180, y = point.y - 423;
    // Crossing the center has no reliable angle; reacquire without a jump.
    return Math.hypot(x, y) < 14 ? null : Math.atan2(y, x);
  }
  function stop() {
    const previous = pointer;
    pointer = null;
    angle = null;
    knob.classList.remove('dragging');
    if (previous !== null && knob.hasPointerCapture(previous)) knob.releasePointerCapture(previous);
  }
  knob.addEventListener('pointerdown', event => {
    if (pointer !== null || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    knob.focus({preventScroll: true});
    pointer = event.pointerId;
    angle = pointAngle(event);
    knob.setPointerCapture(pointer);
    knob.classList.add('dragging');
  });
  knob.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    const next = pointAngle(event);
    if (next !== null && angle !== null) {
      const delta = next - angle;
      turn(Math.atan2(Math.sin(delta), Math.cos(delta)));
    }
    angle = next;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    knob.addEventListener(type, event => { if (event.pointerId === pointer) stop(); });
  }
  knob.addEventListener('keydown', event => {
    const steps = {ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 8, PageDown: -8};
    if (!(event.key in steps) && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    stop();
    if (event.key === 'Home') height = 0;
    else if (event.key === 'End') height = maximum;
    else height = Math.max(0, Math.min(maximum, height + steps[event.key]));
    render();
  });
  window.addEventListener('blur', stop);
  window.addEventListener('resize', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  render();
})();
