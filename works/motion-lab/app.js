(function (root) {
  'use strict';
  const { catalog, defaults, normalize } = root.MotionCatalog;
  const get = id => document.getElementById(id);
  const models = { slime: root.MotionSlime, puddle: root.MotionPuddle, firefly: root.MotionFirefly };
  const parameters = Object.fromEntries(catalog.map(e => [e.id, defaults(e.id)]));
  const seeds = Object.fromEntries(catalog.map(e => [e.id, seed()]));
  let fireflyMode = 'sweet';
  let backend; try { backend = root.localStorage; } catch (_) { backend = null; }
  const shelf = new root.MotionStorage.Shelf(backend);
  let current = 'slime', pending = null, runner = null, statusTimer;
  function seed() { const a = new Uint32Array(1); if (root.crypto?.getRandomValues) return root.crypto.getRandomValues(a)[0]; return Math.floor(Math.random() * 4294967296); }
  function element(tag, text, className) { const e = document.createElement(tag); if (text != null) e.textContent = text; if (className) e.className = className; return e; }
  function announce(text) {
    get('status').textContent = text; root.clearTimeout(statusTimer);
    statusTimer = root.setTimeout(() => { get('status').textContent = ''; }, 7000);
    const dialog = document.querySelector('dialog[open]');
    if (dialog) { let message = dialog.querySelector('.dialog-message'); if (!message) { message = element('p', '', 'dialog-message storage-warning'); message.setAttribute('role', 'status'); dialog.append(message); } message.textContent = text; }
  }
  function openDialog(id) { runner?.clearInput(); const dialog = get(id); dialog.querySelector('.dialog-message')?.remove(); dialog.showModal(); }
  function syncShelf() {
    get('specimen-count').textContent = String(shelf.specimens.length);
    get('storage-warning').hidden = !shelf.error; get('storage-warning').textContent = shelf.error;
    get('export').disabled = shelf.specimens.length === 0;
  }
  function renderParameters() {
    const entry = catalog.find(e => e.id === current), container = get('parameters'); container.replaceChildren();
    for (const p of entry.parameters) {
      const block = element('div', null, 'parameter'), heading = element('div', null, 'parameter-heading');
      const label = element('label', p.label); label.htmlFor = 'parameter-' + p.key;
      const output = element('output', String(parameters[current][p.key])); output.htmlFor = label.htmlFor;
      const input = element('input'); Object.assign(input, { id: label.htmlFor, type: 'range', min: p.min, max: p.max, step: p.step, value: parameters[current][p.key] });
      const hint = element('p', p.hint); hint.id = label.htmlFor + '-hint'; input.setAttribute('aria-describedby', hint.id);
      input.addEventListener('input', () => {
        parameters[current] = normalize(current, { ...parameters[current], [p.key]: Number(input.value) });
        output.textContent = String(parameters[current][p.key]); runner.setParameters(parameters[current]); get('restored-label').hidden = true;
      });
      heading.append(label, output); block.append(heading, input, hint); container.append(block);
    }
  }
  function setMode(mode) {
    if (current === 'firefly' && runner.model) { runner.model.mode = mode; fireflyMode = mode; }
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  }
  function select(id, restored = null) {
    const entry = catalog.find(e => e.id === id); current = id;
    if (restored) { parameters[id] = { ...restored.parameters }; seeds[id] = restored.seed; if (id === 'firefly') fireflyMode = restored.interactionMode; }
    runner.select(id, models[id], parameters[id], seeds[id]);
    document.querySelectorAll('[data-experiment]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.experiment === id)));
    get('stage-number').textContent = 'STUDY / ' + entry.number;
    get('stage-title').replaceChildren(document.createTextNode(entry.verb + ' '), element('span', entry.title));
    get('stage').setAttribute('aria-label', entry.title + 'の実験台。' + entry.hint + ' ' + entry.pcHint);
    get('hint').textContent = entry.hint; get('pc-hint').textContent = entry.pcHint;
    get('firefly-mode').hidden = id !== 'firefly'; setMode(fireflyMode); renderParameters();
    get('restored-label').hidden = !restored; get('restored-label').textContent = restored ? '復元：' + (restored.title || entry.verb + 'の標本') : '';
  }
  function renderSpecimens() {
    syncShelf(); const container = get('specimens'); container.replaceChildren();
    if (!shelf.specimens.length) { container.append(element('p', 'まだ、空っぽです。\n気になる動きを「標本に残す」で置いてみてください。', 'empty')); return; }
    for (const specimen of [...shelf.specimens].reverse()) {
      const entry = catalog.find(e => e.id === specimen.experiment), card = element('article', null, 'specimen');
      card.append(element('p', `${entry.title} · ${new Date(specimen.savedAt).toLocaleDateString('ja-JP')}`, 'eyebrow'), element('h3', specimen.title || entry.verb + 'の標本'));
      if (specimen.memo) card.append(element('p', specimen.memo, 'memo'));
      card.append(element('p', entry.parameters.map(p => p.label + ' ' + specimen.parameters[p.key]).join(' ／ '), 'values'));
      const row = element('div', null, 'row'), restore = element('button', 'この動きに戻る', 'primary'), remove = element('button', '削除', 'quiet');
      restore.addEventListener('click', () => { select(specimen.experiment, specimen); get('shelf-dialog').close(); get('stage').focus({ preventScroll: true }); announce('標本の設定に戻しました。'); });
      remove.setAttribute('aria-label', (specimen.title || entry.verb + 'の標本') + 'を削除');
      remove.addEventListener('click', () => {
        if (remove.dataset.confirm !== 'yes') { remove.dataset.confirm = 'yes'; remove.textContent = '削除する'; return; }
        shelf.remove(specimen.id); renderSpecimens(); announce(shelf.error || '標本を削除しました。');
      });
      row.append(restore, remove); card.append(row); container.append(card);
    }
  }
  function renderSources() {
    for (const entry of catalog) {
      const card = element('article', null, 'source-card');
      card.append(element('p', entry.file, 'eyebrow'), element('h3', entry.title), element('p', '取り出した動き：' + entry.motion, 'muted'), element('p', '変えられるもの：' + entry.parameters.map(p => p.label).join('、'), 'muted'), element('p', entry.difference, 'difference'));
      const actions = element('div', null, 'source-actions'), link = element('a', 'Google Driveの原作 ↗'), button = element('button', 'この実験を開く');
      link.href = entry.source; link.target = '_blank'; link.rel = 'noopener noreferrer';
      button.addEventListener('click', () => { select(entry.id); get('sources-dialog').close(); get('stage').focus({ preventScroll: true }); });
      actions.append(link, button); card.append(actions); get('sources').append(card);
    }
  }
  function bootError(error) {
    get('stage-error').hidden = false; get('stage-error').textContent = '実験台を開けませんでした。ページを再読み込みしてください。';
    console.error('Motion Lab', error); get('open-save').disabled = true;
  }
  try { runner = new root.MotionRunner.Runner(get('stage'), { onError: bootError }); }
  catch (error) { bootError(error); return; }
  for (const entry of catalog) {
    const button = element('button'); button.dataset.experiment = entry.id; button.setAttribute('aria-pressed', String(entry.id === current));
    button.append(element('span', entry.number, 'study-no'), element('span', entry.verb, 'verb'), element('span', entry.title, 'original'));
    button.addEventListener('click', () => select(entry.id)); get('experiments').append(button);
  }
  select('slime'); runner.start(); syncShelf(); renderSources();
  get('replay').addEventListener('click', () => { runner.replay(); setMode(fireflyMode); announce('動きのはじめに戻しました。調整値はそのままです。'); });
  get('reset').addEventListener('click', () => { parameters[current] = defaults(current); runner.setParameters(parameters[current]); runner.replay(); setMode('sweet'); renderParameters(); get('restored-label').hidden = true; announce('初期設定に戻しました。'); });
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  get('open-save').addEventListener('click', () => {
    pending = { experiment: current, parameters: { ...parameters[current] }, seed: seeds[current], interactionMode: current === 'firefly' ? fireflyMode : 'sweet' };
    get('save-form').reset(); get('save-description').textContent = catalog.find(e => e.id === current).title + 'の、今の設定。'; openDialog('save-dialog');
  });
  get('save-form').addEventListener('submit', event => {
    event.preventDefault(); const entry = catalog.find(e => e.id === pending.experiment);
    try {
      const record = { ...pending, id: root.crypto?.randomUUID ? root.crypto.randomUUID() : 's-' + Date.now() + '-' + seed(), source: entry.source, programVersion: entry.version, savedAt: new Date().toISOString(), title: get('specimen-title').value.trim(), memo: get('specimen-memo').value.trim() };
      shelf.add(record); syncShelf(); get('save-dialog').close(); announce(shelf.error || '小さな発見を、標本棚に残しました。');
    } catch (error) { announce(error.message); }
  });
  get('open-shelf').addEventListener('click', () => { renderSpecimens(); openDialog('shelf-dialog'); });
  get('open-sources').addEventListener('click', () => openDialog('sources-dialog'));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => get(button.dataset.close).close()));
  get('export').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([shelf.export()], { type: 'application/json' })), link = element('a');
    link.href = url; link.download = 'motion-lab-specimens.json'; document.body.append(link); link.click(); link.remove();
    root.setTimeout(() => URL.revokeObjectURL(url), 1000); announce('標本を書き出しました。');
  });
  get('import').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { if (file.size > 1000000) throw new Error('ファイルが大きすぎます。'); const result = shelf.import(await file.text()); renderSpecimens(); announce(shelf.error || `${result.added}件を取り込みました。${result.skipped ? '重複する' + result.skipped + '件はそのままです。' : ''}`); }
    catch (error) { announce(error.message); } finally { event.target.value = ''; }
  });
  const compact = root.matchMedia('(max-width: 850px), (max-height: 520px)'), tuning = get('tuning');
  const adapt = () => { tuning.open = !compact.matches; }; adapt(); compact.addEventListener('change', adapt);
  get('close-tuning').addEventListener('click', () => { tuning.open = false; tuning.querySelector('summary').focus(); });
  tuning.addEventListener('toggle', () => runner.clearInput());
  root.MotionLab = Object.freeze({ snapshot: () => ({ experiment: current, parameters: { ...parameters[current] }, seed: seeds[current], state: runner.model.snapshot(), specimens: shelf.specimens.length, persistent: shelf.persistent, width: runner.width, height: runner.height, hidden: runner.hidden }) });
})(window);
