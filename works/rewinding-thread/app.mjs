import { ThreadMotion } from './motion.mjs';
const motion = new ThreadMotion();
const svg = document.querySelector('#tool'), knob = document.querySelector('#knob');
const reel = document.querySelector('#reel'), thread = document.querySelector('#thread');
const shadow = document.querySelector('#thread-shadow');
let pointer = null, offset = 0, frame = 0, previous = 0;
function render() {
  const y = 280 + motion.length;
  knob.setAttribute('transform', `translate(210 ${y})`);
  knob.setAttribute('aria-valuenow', String(Math.round(motion.length)));
  knob.toggleAttribute('data-held', motion.held);
  reel.setAttribute('transform', `rotate(${motion.angle} 160 200)`);
  const line = `M 210 200 V ${y - 17}`;
  thread.setAttribute('d', line); shadow.setAttribute('d', line);
}
function tick(now) {
  frame = 0;
  motion.step(Math.min((now - previous) / 1000, 0.05));
  previous = now; render();
  if (!motion.held && motion.length > 0) frame = requestAnimationFrame(tick);
}
function release() {
  const old = pointer; pointer = null;
  motion.release();
  if (old !== null && knob.hasPointerCapture(old)) knob.releasePointerCapture(old);
  render();
  if (!frame && motion.length > 0) { previous = performance.now(); frame = requestAnimationFrame(tick); }
}
function localY(event) {
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse()).y;
}
knob.addEventListener('pointerdown', event => {
  if (pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault();
  cancelAnimationFrame(frame); frame = 0;
  pointer = event.pointerId; motion.grab();
  offset = localY(event) - (280 + motion.length);
  knob.setPointerCapture(pointer); render();
});
knob.addEventListener('pointermove', event => {
  if (event.pointerId !== pointer) return;
  motion.pull(localY(event) - offset - 280); render();
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  knob.addEventListener(name, event => { if (event.pointerId === pointer) release(); });
}
knob.addEventListener('keydown', event => {
  if (pointer !== null || !['ArrowDown', 'ArrowUp', ' ', 'Escape'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Escape' || event.key === ' ') return release();
  cancelAnimationFrame(frame); frame = 0;
  motion.grab(); motion.pull(motion.length + (event.key === 'ArrowDown' ? 12 : -12)); render();
});
knob.addEventListener('keyup', event => { if (pointer === null && ['ArrowDown', 'ArrowUp'].includes(event.key)) release(); });
knob.addEventListener('blur', () => { if (pointer === null) release(); });
window.addEventListener('blur', release);
// Resizing changes the coordinate mapping: release ownership rather than jump on the next move.
window.addEventListener('resize', release);
document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
render();
