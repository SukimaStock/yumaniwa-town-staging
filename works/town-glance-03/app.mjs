// Fictional fixed data. No sensors, location, scores, storage or network calls.
const places = [
  {name:'ひだまりカフェ', category:'カフェ', address:'川沿い通り 12', x:214, y:145},
  {name:'こもれび書店', category:'本屋', address:'公園通り 8', x:320, y:224},
];
const $ = id => document.getElementById(id);
const svg = $('map'), area = $('gesture-area');
let round = 0, phase = 'ready', activePointer = null;
const you = {x:180, y:280};
function mapPoint(event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX; point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}
function positionOrigin() {
  const point = svg.createSVGPoint(); point.x = you.x; point.y = you.y;
  const screen = point.matrixTransform(svg.getScreenCTM());
  const bounds = area.getBoundingClientRect();
  $('origin').style.left = `${screen.x - bounds.left}px`;
  $('origin').style.top = `${screen.y - bounds.top}px`;
}
function clearGesture() {
  activePointer = null;
  $('guess-line').hidden = true;
}
function setPhase(next) {
  clearGesture(); phase = next; document.body.dataset.phase = phase;
  const predicting = phase === 'predict';
  area.hidden = !predicting; $('prompt').hidden = !predicting; $('skip').hidden = !predicting;
  $('action').hidden = predicting || phase === 'done';
  if (predicting) positionOrigin();
}
function showPlace() {
  const place = places[round];
  $('name').textContent = place.name; $('category').textContent = place.category; $('address').textContent = place.address;
}
function reveal(keyboard = false) {
  if (phase !== 'predict') return;
  const p = places[round];
  // The guessed vector is discarded; the map is the only answer.
  const g = document.createElementNS(svg.namespaceURI, 'g');
  g.setAttribute('class', 'pin'); g.setAttribute('transform', `translate(${p.x} ${p.y})`);
  const dot = document.createElementNS(svg.namespaceURI, 'circle'); dot.setAttribute('r', '8');
  const label = document.createElementNS(svg.namespaceURI, 'text');
  label.setAttribute('class', 'pin-label'); label.setAttribute('y', round === 0 ? '-25' : '28');
  label.setAttribute('text-anchor', round === 0 ? 'middle' : 'end'); label.textContent = p.name;
  g.append(dot, label); $('destination-pins').append(g);
  $('map-title').textContent = `架空の街。YOU、まちの駅、中央公園と、${p.name}の場所。`;
  $('status').textContent = `${p.name}の場所`;
  setPhase(round === 0 ? 'confirmed' : 'done');
  $('action').textContent = 'もう一つの場所を見る';
  // A skip/keyboard button is hidden on confirmation; don't strand keyboard focus.
  if (keyboard && round === 0) $('action').focus({preventScroll:true});
  else if (keyboard) { $('name').tabIndex = -1; $('name').focus({preventScroll:true}); }
}
$('action').addEventListener('click', event => {
  if (phase === 'confirmed') {
    round = 1; $('destination-pins').firstElementChild.classList.add('previous');
    showPlace(); $('status').textContent = ''; setPhase('predict'); if (event.detail === 0) $('skip').focus({preventScroll:true});
  } else if (phase === 'ready') { setPhase('predict'); if (event.detail === 0) $('skip').focus({preventScroll:true}); }
});
$('skip').addEventListener('click', event => reveal(event.detail === 0));
window.addEventListener('pointerdown', event => { if (event.pointerType === 'touch' && !event.isPrimary) clearGesture(); }, true);
area.addEventListener('pointerdown', event => {
  if (phase !== 'predict') return;
  // Multi-touch cancels instead of accidentally submitting a guess.
  if (activePointer !== null) { clearGesture(); return; }
  if (!event.isPrimary || event.button !== 0) return;
  const pt = mapPoint(event);
  const origin = svg.createSVGPoint(); origin.x = you.x; origin.y = you.y;
  const center = origin.matrixTransform(svg.getScreenCTM());
  if (Math.hypot(event.clientX - center.x, event.clientY - center.y) > 44) return;
  activePointer = event.pointerId;
  $('guess-path').setAttribute('d', `M${you.x} ${you.y} L${pt.x} ${pt.y}`);
});
window.addEventListener('pointermove', event => {
  if (event.pointerId !== activePointer) return;
  const pt = mapPoint(event); $('guess-line').hidden = false;
  $('guess-path').setAttribute('d', `M${you.x} ${you.y} L${pt.x} ${pt.y}`);
  $('guess-end').setAttribute('cx', pt.x); $('guess-end').setAttribute('cy', pt.y);
});
window.addEventListener('pointerup', event => {
  if (event.pointerId !== activePointer) return;
  const point = svg.createSVGPoint(); point.x = you.x; point.y = you.y;
  const center = point.matrixTransform(svg.getScreenCTM());
  const distance = Math.hypot(event.clientX - center.x, event.clientY - center.y);
  // Let native touchend/capture cleanup finish before hiding its target.
  activePointer = null; $('guess-line').hidden = true;
  if (distance >= 24) requestAnimationFrame(() => reveal());
});
window.addEventListener('pointercancel', clearGesture);
area.addEventListener('lostpointercapture', () => { activePointer = null; $('guess-line').hidden = true; });
window.addEventListener('blur', clearGesture);
window.addEventListener('resize', () => { clearGesture(); if (phase === 'predict') positionOrigin(); });
setPhase('ready');
