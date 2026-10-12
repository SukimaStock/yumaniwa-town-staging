/* Optional presentation. Without JS all rooms, links and archive records remain. */
(function () {
  'use strict';
  const panels = Array.from(document.querySelectorAll('.room-panel'));
  const doors = Array.from(document.querySelectorAll('[data-room-link]'));
  const building = document.getElementById('building');
  const hall = document.getElementById('hall');
  if (!panels.length || !building || !hall) return;
  let lastRoom = '';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function route(scroll) {
    let fragment;
    try { fragment = decodeURIComponent(window.location.hash.slice(1)); }
    catch (_) { fragment = ''; }
    const target = fragment ? document.getElementById(fragment) : null;
    const selected = target && target.closest('.room-panel');
    const roomId = selected ? selected.dataset.room : '';
    panels.forEach(panel => { panel.hidden = panel !== selected; });
    hall.hidden = !!selected;
    document.body.classList.toggle('exploring', !!selected);
    doors.forEach(door => {
      if (door.dataset.roomLink === roomId) door.setAttribute('aria-current', 'location');
      else door.removeAttribute('aria-current');
    });
    document.title = selected ? selected.querySelector('h2').textContent + ' · SukimaStock LAB' : 'SukimaStock LAB';
    if (selected) lastRoom = roomId;
    if (!scroll) return;
    // Wait for hidden sections to leave layout before scrolling to their target.
    window.requestAnimationFrame(() => {
      if (selected) {
        selected.querySelector('h2').focus({ preventScroll: true });
        (target || selected).scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' });
      } else {
        const door = doors.find(item => item.dataset.roomLink === lastRoom);
        (door || building).focus({ preventScroll: true });
        building.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' });
      }
    });
  }
  route(false);
  document.documentElement.classList.add('enhanced');
  window.addEventListener('hashchange', () => route(true));
  // Safari restores this page from its back/forward cache. Keep its scroll position.
  window.addEventListener('pageshow', () => route(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panels.some(panel => !panel.hidden)) {
      window.location.hash = 'building';
    }
  });
  function pause() { document.body.classList.toggle('is-paused', document.hidden); }
  document.addEventListener('visibilitychange', pause);
  pause();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-paused', !entry.isIntersecting));
    });
    document.querySelectorAll('.room, .room-closeup').forEach(item => observer.observe(item));
  }
})();
