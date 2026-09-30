/* Staging-only observer. Canonical runtimes own input, rendering and audio. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const put = (id, value) => { const element = $(id); if (element.textContent !== String(value)) element.textContent = value; };
  if (!window.SSE || !window.CodeaLite) {
    put('boot-message', 'Runtimeを読み込めませんでした。ページを再読み込みしてください。');
    return;
  }
  // Tiny PCM fixture, 0.12 seconds / 8 kHz / mono / 16 bit, with quiet envelope.
  function wavURI() {
    const samples = 960, bytes = new Uint8Array(44 + samples * 2), view = new DataView(bytes.buffer);
    const text = (offset, value) => { for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i); };
    text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    text(36, 'data'); view.setUint32(40, samples * 2, true);
    for (let i = 0; i < samples; i++) view.setInt16(44 + i * 2, Math.round(6000 * Math.sin(2 * Math.PI * 440 * i / 8000) * Math.sin(Math.PI * i / samples)), true);
    return 'data:audio/wav;base64,' + btoa(String.fromCharCode(...bytes));
  }
  const wav = wavURI();
  const probe = { taps: 0, held: false, last: 'NONE', pointer: '—', x: null, y: null, spaces: 0, keyboardTested: false, hidden: 0, restores: 0, pageHides: 0, pageShows: 0, setups: 0, draws: 0 };
  const resources = [ ['validBuffer', 'valid-buffer'], ['validMedia', 'valid-media'], ['missing', 'missing'] ];
  const history = Object.fromEntries(resources.map(([name]) => [name, []]));
  function observeResources() {
    for (const [name, id] of resources) {
      const audio = SSE.audio.resourceState(name), asset = SSE.assets.status(name);
      const transition = audio.status + ' / ' + asset;
      if (history[name].at(-1) !== transition) history[name].push(transition);
      history[name] = history[name].slice(-8);
      const reason = audio.reason || SSE.assets.record(name)?.error?.message || 'なし';
      put(id, 'Audio: ' + audio.status + '\nAsset: ' + asset + '\nReason: ' + reason + '\n経過: ' + history[name].join(' → '));
    }
    $('play-buffer').disabled = SSE.assets.status('validBuffer') !== 'ready';
    $('play-media').disabled = SSE.assets.status('validMedia') !== 'ready';
  }
  function renderStatus() {
    put('taps', probe.taps); put('held', probe.held ? 'ON' : 'OFF'); put('last-event', probe.last);
    put('pointer-id', probe.pointer); put('position', probe.x === null ? '—' : Math.round(probe.x) + ', ' + Math.round(probe.y));
    put('focus', document.activeElement?.id || document.activeElement?.tagName || 'none');
    put('space', probe.keyboardTested ? probe.spaces : 'NOT TESTED'); put('setups', probe.setups);
    put('visibility', document.visibilityState); put('hidden-count', probe.hidden); put('restore-count', probe.restores);
    put('page-count', probe.pageHides + ' / ' + probe.pageShows); put('draws', probe.draws);
    put('window-size', window.innerWidth + ' × ' + window.innerHeight);
    put('context-state', SSE.audio.ctx?.state || 'not created'); observeResources();
  }
  SSE.createApp({
    id: 'engine-browser-canary', logicalWidth: window.innerWidth, logicalHeight: window.innerHeight,
    debug: false, devtools: { enabled: false }, analytics: { enabled: false },
    keyboard: { bindings: { count: ['Space'] } }, pointerMode: 'primary',
    audio: { masterVolume: 0.5, storageKey: 'engine-browser-canary:sound',
      sounds: { validBuffer: { file: wav, mode: 'buffer', volume: 0.25 }, missing: { file: './__missing_audio_canary__.wav', mode: 'buffer' } },
      music: { validMedia: { file: wav, loop: false, volume: 0.25 } } },
    assets: { items: { validBuffer: { audioName: 'validBuffer' }, validMedia: { audioName: 'validMedia' }, missing: { audioName: 'missing', required: false } } },
    setup() { probe.setups++; }, initialScene: 'test',
    scenes: { test: {
      update() { if (SSE.input.actionPressed('count')) { probe.keyboardTested = true; probe.spaces++; renderStatus(); } },
      draw() {
        probe.draws++;
        background(16, 26, 37); noStroke();
        const wide = window.innerWidth >= 600 && window.innerWidth > window.innerHeight;
        const cx = window.innerWidth * (wide ? 0.24 : 0.5), cy = window.innerHeight * (wide ? 0.46 : 0.72);
        fill(31, 55, 67); ellipse(cx, cy, 145, 145);
        fill(111, 221, 193); textAlign(CENTER); textSize(wide ? 15 : 18); text('TAP / DRAG HERE', cx, cy + 8);
        fill(181, 200, 214); textSize(12); text('Tap: ' + probe.taps + '  Held: ' + (probe.held ? 'ON' : 'OFF'), cx, cy - 19);
        if (probe.x !== null) { fill(probe.held ? 111 : 94, probe.held ? 221 : 128, 193, 210); ellipse(probe.x, probe.y, 26, 26); }
      },
      touch(touch) {
        probe.last = touch.state; probe.pointer = touch.id; probe.x = touch.x; probe.y = touch.y;
        if (touch.state === BEGAN) { probe.taps++; probe.held = true; }
        if (touch.state === ENDED || touch.state === CANCELLED) probe.held = false;
        renderStatus(); return true;
      }
    } }
  });
  try { CodeaLite.start('canvas'); }
  catch (error) { put('boot-message', '起動失敗: ' + error.message); return; }
  put('engine-version', SSE.VERSION); put('codea-version', CodeaLite.VERSION);
  put('boot-message', '上の領域から順番に確認。結果は人間が判断します。');
  const events = [
    [document, 'visibilitychange', () => { if (document.hidden) probe.hidden++; else probe.restores++; renderStatus(); }],
    [window, 'pagehide', () => { probe.pageHides++; renderStatus(); }],
    [window, 'pageshow', () => { probe.pageShows++; renderStatus(); }],
    [window, 'resize', () => { SSE.viewport.configure(window.innerWidth, window.innerHeight); renderStatus(); }],
    [document, 'focusin', renderStatus], [document, 'focusout', renderStatus]
  ];
  for (const [target, type, listener] of events) target.addEventListener(type, listener);
  function playback(action) {
    // This stays synchronous inside the human click gesture, before any await.
    $('heard').value = 'NOT TESTED';
    try { SSE.audio.unlock(); put('play-request', action() ? '要求済み（聴感は未判定）' : '要求不可（聴感は未判定）'); }
    catch (error) { put('play-request', '再生要求エラー: ' + error.message); }
    renderStatus();
  }
  $('tone').addEventListener('click', () => playback(() => SSE.audio.tone({ frequency: 440, duration: 0.12, volume: 0.06 })));
  $('play-buffer').addEventListener('click', () => playback(() => SSE.audio.play('validBuffer', { force: true })));
  $('play-media').addEventListener('click', () => playback(() => SSE.audio.playMusic('validMedia', { restart: true })));
  async function load(names, button) {
    button.disabled = true;
    try {
      const pending = SSE.assets.preload(names, { retry: true });
      renderStatus(); // Preserve loading even when a data URI finishes very quickly.
      await pending;
    } catch (error) { put('boot-message', '読み込みエラー: ' + error.message); }
    finally { button.disabled = false; renderStatus(); }
  }
  $('load-valid').addEventListener('click', () => load(['validBuffer', 'validMedia'], $('load-valid')));
  $('load-missing').addEventListener('click', () => load(['missing'], $('load-missing')));
  $('reset').addEventListener('click', () => window.location.reload());
  // DOM refresh only. No extra RAF, input wrapper, automatic loads or retries.
  window.setInterval(renderStatus, 250);
  renderStatus();
})();
