(function (root) {
  'use strict';
  const P = root.FruitLabPhysics, World = root.FruitLabWorld, Courses = root.FruitLabCourses, Timing = root.FruitLabTiming, W = 1000, H = 760;
  function defaults() { const settings = P.defaults(); settings.world = Object.fromEntries(Object.entries(World.PARAMETERS).map(([k,v]) => [k,v[1]])); return settings; }
  let settings = defaults(), state = P.create('pumpkin', settings), pointer = null;
  let touchAxis = 0, panel = false, ui, lastSound = -10, lastFeel = '';
  const feelings = { pumpkin: 'するする、ころころ', rutabaga: 'ぽん、ぽよん', handoff: 'ころころ、から、ぽよん。', world: 'ころころ、スポン、ぽよん。' };
  const hints = {
    pumpkin: '画面の左・右を押す。切り返して、勢いをつくる。',
    rutabaga: '左・右で方向。着地に合わせて押し直すと、ぽよん。',
    handoff: '右へ転がして、勢いを渡す。そのまま左右で、ぽよん。',
    world: '右へ滑り、頭を押す。地下では押し直して、天井へぽよん。',
  };
  let trial=null, completed=[], resetCounts={world:0,world2:0,world4:0};
  const now=()=>root.performance.now(), mode=()=>state.course?.id||state.mode;
  function measurements(){return {current:Timing.snapshot(trial),completed:JSON.parse(JSON.stringify(completed)),resetCounts:{...resetCounts}};}
  function measure(playing=true){
    if(trial&&Timing.tick(trial,now(),state,playing)){
      completed.push(Timing.snapshot(trial));if(completed.length>12)completed.shift();
      root.console.log('WORLD LOOP trial',completed.at(-1));
    }
    if(ui?.metrics&&(panel||trial?.complete))ui.metrics.textContent=Timing.text(trial,completed,resetCounts);
  }
  function release() {
    Timing.checkpoint(trial,now());
    pointer = null; touchAxis = 0; P.clearInput(state);
    root.SSE.input.reset(); root.CodeaLite?.clearPointers();
  }
  function reset(selected = mode(), countReset = true) {
    release();
    if(countReset&&selected in resetCounts)resetCounts[selected]++;
    state=selected==='world'?World.create(settings):selected==='world2'||selected==='world4'?World.createCourse(Courses.get(selected),settings):P.create(selected,settings);
    trial=state.mode==='world'?Timing.begin(selected,now(),resetCounts[selected],settings):null;
    if(ui&&state.mode==='world')ui.course.value=selected;
    lastSound=-10;sync();measure(false);
  }
  function sync() {
    if (!ui) return;
    const feel = state.mode === 'world' ? (state.finished ? 'ひと区切り。RESETで、もう一度。' : ({ surface: feelings.world, underground: 'スポッ。次は、天井を突き上げる。', return: 'スポン！地上で、ころころ。', underground2: 'スポッ。もう一度、地下でぽよん。', finish: 'スポン！地上で、ころころ。' })[state.phase]) : state.mode === 'handoff' && state.handoffs ? '勢いが、ぽよんに変わった。' : feelings[state.mode];
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
      if (panel) { measure(false); return; }
      const keyAxis = Number(root.SSE.input.action('right')) - Number(root.SSE.input.action('left'));
      P.input(state, pointer !== null ? touchAxis : keyAxis);
      playEvents(state.mode === 'world' ? World.update(state, dt) : P.update(state, dt)); measure(); sync();
    },
    draw() {
      root.background(241, 231, 212);
      root.withCanvasContext(c => state.mode === 'world' ? root.FruitLabWorldDraw(c, state) : root.FruitLabDraw(c, state));
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
      ui = { modes: [...doc.querySelectorAll('[data-mode]')], feel: byId('feel'), hint: byId('hint'), course: byId('world-course'), metrics: byId('measurements') };
      for (const button of ui.modes) button.addEventListener('click', () => reset(button.dataset.mode==='world'?ui.course.value:button.dataset.mode,false));
      ui.course.addEventListener('change',()=>reset(ui.course.value,false));
      byId('reset').addEventListener('click', () => reset());
      const sound = byId('sound');
      function syncSound() { sound.textContent = root.SSE.audio.enabled ? 'SOUND ON' : 'SOUND OFF'; sound.setAttribute('aria-pressed', String(root.SSE.audio.enabled)); }
      sound.addEventListener('click', () => { root.SSE.audio.setEnabled(!root.SSE.audio.enabled); root.SSE.audio.unlock(); syncSound(); });
      syncSound();
      const tune = byId('tune'), tuning = byId('tuning');
      function toggle(open) { release(); panel = open; tuning.hidden = !open; tune.setAttribute('aria-expanded', String(open)); measure(false); if (!open) tune.focus({ preventScroll: true }); }
      tune.addEventListener('click', () => toggle(!panel)); byId('close-tune').addEventListener('click', () => toggle(false));
      root.addEventListener('keydown', e => { if (e.key === 'Escape' && panel) toggle(false); });
      root.addEventListener('resize', release); root.addEventListener('blur', release);
      // Native controls must not leave a held canvas direction running underneath.
      for (const element of [doc.querySelector('header'), doc.querySelector('footer'), tuning]) element.addEventListener('pointerdown', release);
      const controls = [];
      for (const [group, values] of Object.entries({ ...P.PARAMETERS, world: World.PARAMETERS })) {
        const fieldset = doc.createElement('fieldset'), legend = doc.createElement('legend'); legend.textContent = group.toUpperCase(); fieldset.appendChild(legend);
        for (const [key, def] of Object.entries(values)) {
          const label = doc.createElement('label'), title = doc.createElement('span'), output = doc.createElement('output'), slider = doc.createElement('input');
          title.textContent = def[0]; slider.type = 'range'; slider.min = def[2]; slider.max = def[3]; slider.step = def[4]; slider.value = settings[group][key];
          slider.id = `${group}-${key}`; label.htmlFor = slider.id; output.setAttribute('for', slider.id); output.textContent = slider.value;
          slider.addEventListener('input', () => { const before=settings[group][key]; if (group === 'world') settings.world[key] = Math.max(def[2], Math.min(def[3], Number(slider.value) || def[1])); else P.setParameter(settings, group, key, slider.value); if(trial&&before!==settings[group][key])trial.tuningChanged=true; output.textContent = String(settings[group][key]); });
          label.append(title, output, slider); fieldset.appendChild(label); controls.push({ group, key, slider, output });
        }
        byId('sliders').appendChild(fieldset);
      }
      byId('defaults').addEventListener('click', () => {
        const initial=defaults();if(trial&&JSON.stringify(initial)!==JSON.stringify(settings))trial.tuningChanged=true;
        settings = initial; state.settings = settings;
        for (const { group, key, slider, output } of controls) { slider.value = settings[group][key]; output.textContent = slider.value; }
      });
      sync();
    },
  });
  root.FruitLabMeasurements=measurements;
  // Optional read-only probe for the executable browser drill, never a game controller.
  if (new URLSearchParams(root.location.search).get('dev') === '1') root.FruitLabProbe = () => ({ ...P.snapshot(state), course:state.course?.id||null, finished:!!state.finished, finishedAt:state.finishedAt??null, measurements:measurements(), panel, pointer, settings: JSON.parse(JSON.stringify(settings)) });
})(typeof window !== 'undefined' ? window : globalThis);
