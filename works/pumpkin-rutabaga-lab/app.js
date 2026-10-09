(function (root) {
  'use strict';
  const P = root.FruitLabPhysics, W = 1000, H = 760;
  let settings = P.defaults(), state = P.create('pumpkin', settings), pointer = null;
  let touchAxis = 0, panel = false, ui, lastSound = -10, lastFeel = '';
  const feelings = { pumpkin: 'するする、ころころ', rutabaga: 'ぽん、ぽよん', handoff: 'ころころ、から、ぽよん。' };
  const hints = {
    pumpkin: '画面の左・右を押す。切り返して、勢いをつくる。',
    rutabaga: '左・右で方向。着地に合わせて押し直すと、ぽよん。',
    handoff: '右へ転がして、勢いを渡す。そのまま左右で、ぽよん。',
  };
  function release() {
    pointer = null; touchAxis = 0; P.clearInput(state);
    root.SSE.input.reset(); root.CodeaLite?.clearPointers();
  }
  function reset(mode = state.mode) {
    release(); state = P.create(mode, settings); lastSound = -10; sync();
  }
  function sync() {
    if (!ui) return;
    const feel = state.mode === 'handoff' && state.handoffs ? '勢いが、ぽよんに変わった。' : feelings[state.mode];
    if (feel !== lastFeel) { ui.feel.textContent = feel; lastFeel = feel; }
    ui.hint.textContent = hints[state.mode];
    for (const button of ui.modes) button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
  }
  function playEvents(events) {
    if (!root.SSE.audio.enabled) return;
    // Coalesce contacts and boosts in one frame; strongest event wins.
    const rank = { roll: 0, land: 1, handoff: 2, boost: 3 };
    const e = events.reduce((best, item) => !best || rank[item.type] > rank[best.type] ? item : best, null);
    if (!e || state.time - lastSound < (e.type === 'roll' ? .6 : .13)) return;
    if (e.type === 'land' && e.strength < 65) return;
    lastSound = state.time;
    const heavy = e.kind === 'pumpkin' || e.type === 'boost';
    root.SSE.audio.tone({ frequency: heavy ? 100 : 240, endFrequency: heavy ? 65 : 130,
      duration: e.type === 'roll' ? .028 : .06,
      volume: root.SSE.audio.baseline().reference.se.soft * (e.type === 'roll' ? .16 : .45), type: 'sine' });
  }
  const scene = {
    opaque: true,
    update(dt) {
      if (root.SSE.input.actionPressed('reset')) { reset(); return; }
      if (panel) return;
      const keyAxis = Number(root.SSE.input.action('right')) - Number(root.SSE.input.action('left'));
      P.input(state, pointer !== null ? touchAxis : keyAxis);
      playEvents(P.update(state, dt)); sync();
    },
    draw() {
      root.background(241, 231, 212);
      root.withCanvasContext(c => root.FruitLabDraw(c, state));
    },
    touch(t) {
      if (panel) return true;
      if (t.state === root.BEGAN) { pointer = t.id; touchAxis = t.x < W / 2 ? -1 : 1; }
      else if (t.id === pointer && t.state === root.MOVING) touchAxis = t.x < W / 2 ? -1 : 1;
      else if (t.id === pointer && (t.state === root.ENDED || t.state === root.CANCELLED)) {
        pointer = null; touchAxis = 0;
        if (t.state === root.CANCELLED) P.clearInput(state);
      }
      if (t.state !== root.CANCELLED) P.input(state, touchAxis);
      return true;
    },
  };
  root.SSE.createApp({
    id: 'pumpkin-rutabaga-lab', logicalWidth: W, logicalHeight: H, frameRate: 60,
    initialScene: 'lab', pointerMode: 'primary', debug: false, outerBackground: '#f1e7d4',
    keyboard: { bindings: { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], reset: ['KeyR'] } },
    audio: root.SSE.audio.withBaseline({ storageKey: 'pumpkin-rutabaga-lab.sound' }),
    devtools: { enabled: false }, analytics: { enabled: false }, lifecycle: { pauseOnBlur: true, onPause: release, onResume: release },
    scenes: { lab: scene },
    setup() {
      const doc = root.document, byId = id => doc.getElementById(id);
      ui = { modes: [...doc.querySelectorAll('[data-mode]')], feel: byId('feel'), hint: byId('hint') };
      for (const button of ui.modes) button.addEventListener('click', () => reset(button.dataset.mode));
      byId('reset').addEventListener('click', () => reset());
      const sound = byId('sound');
      function syncSound() { sound.textContent = root.SSE.audio.enabled ? 'SOUND ON' : 'SOUND OFF'; sound.setAttribute('aria-pressed', String(root.SSE.audio.enabled)); }
      sound.addEventListener('click', () => { root.SSE.audio.setEnabled(!root.SSE.audio.enabled); root.SSE.audio.unlock(); syncSound(); });
      syncSound();
      const tune = byId('tune'), tuning = byId('tuning');
      function toggle(open) { release(); panel = open; tuning.hidden = !open; tune.setAttribute('aria-expanded', String(open)); if (!open) tune.focus({ preventScroll: true }); }
      tune.addEventListener('click', () => toggle(!panel)); byId('close-tune').addEventListener('click', () => toggle(false));
      root.addEventListener('keydown', e => { if (e.key === 'Escape' && panel) toggle(false); });
      root.addEventListener('resize', release); root.addEventListener('blur', release);
      // Native controls must not leave a held canvas direction running underneath.
      for (const element of [doc.querySelector('header'), doc.querySelector('footer'), tuning]) element.addEventListener('pointerdown', release);
      const controls = [];
      for (const [group, values] of Object.entries(P.PARAMETERS)) {
        const fieldset = doc.createElement('fieldset'), legend = doc.createElement('legend'); legend.textContent = group.toUpperCase(); fieldset.appendChild(legend);
        for (const [key, def] of Object.entries(values)) {
          const label = doc.createElement('label'), title = doc.createElement('span'), output = doc.createElement('output'), slider = doc.createElement('input');
          title.textContent = def[0]; slider.type = 'range'; slider.min = def[2]; slider.max = def[3]; slider.step = def[4]; slider.value = settings[group][key];
          slider.id = `${group}-${key}`; label.htmlFor = slider.id; output.setAttribute('for', slider.id); output.textContent = slider.value;
          slider.addEventListener('input', () => { P.setParameter(settings, group, key, slider.value); output.textContent = String(settings[group][key]); });
          label.append(title, output, slider); fieldset.appendChild(label); controls.push({ group, key, slider, output });
        }
        byId('sliders').appendChild(fieldset);
      }
      byId('defaults').addEventListener('click', () => {
        settings = P.defaults(); state.settings = settings;
        for (const { group, key, slider, output } of controls) { slider.value = settings[group][key]; output.textContent = slider.value; }
      });
      sync();
    },
  });
  // Optional read-only probe for the executable browser drill, never a game controller.
  if (new URLSearchParams(root.location.search).get('dev') === '1') root.FruitLabProbe = () => ({ ...P.snapshot(state), panel, pointer, settings: JSON.parse(JSON.stringify(settings)) });
})(typeof window !== 'undefined' ? window : globalThis);
