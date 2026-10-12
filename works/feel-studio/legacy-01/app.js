(function (root) {
  'use strict';
  function mount(doc, host, modules = {}) {
    const registry = modules.registry || host.FeelRegistry;
    const Session = modules.Session || host.FeelSession.Session;
    const Bench = modules.Bench || host.FeelBench.Bench;
    const Runner = modules.Runner || host.MotionRunner.Runner;
    const $ = id => doc.getElementById(id), panel = $('panel');
    let backend = null; try { backend = host.localStorage; } catch (_) { /* browser refuses storage */ }
    const requested = host.URLSearchParams ? new host.URLSearchParams(host.location?.search || '').get('prototype') : null;
    const prototypeId = modules.prototypeId || requested || doc.body.dataset.prototype || registry.all()[0].id;
    const session = new Session(prototypeId, backend);
    let bench, runner, previousFocus = null, hints = true;
    const donors = {};
    const partNames = { drive: '動き', bounce: '跳ね方', stop: '止まり方' };
    function status(message) { $('status').textContent = message; $('panel-status').textContent = message; }
    function guard(fn) {
      return async (...args) => { try { await fn(...args); } catch (error) { status(error.message || '操作を完了できませんでした。'); } };
    }
    function closePanel() {
      if (panel.open) panel.close();
      previousFocus?.focus?.({ preventScroll: true }); previousFocus = null;
    }
    function openPanel(name, title) {
      previousFocus = doc.activeElement; runner?.clearInput();
      for (const id of ['tools', 'save', 'shelf', 'handoff', 'help']) $(id + '-panel').hidden = id !== name;
      $('panel-title').textContent = title; $('panel-status').textContent = '';
      if (name === 'tools') renderTools();
      if (name === 'shelf') renderShelf();
      if (name === 'save') $('save-name').value = '';
      if (name === 'handoff') renderHandoff();
      if (!panel.open) panel.showModal();
    }
    function visibleScene() {
      if (bench.mode === 'replay') session.setSpec({ ...session.spec(), world: bench.spec.world }, true);
    }
    function refresh() {
      const record = session.record(session.selectedId);
      $('prototype-title').textContent = session.entry.title;
      $('current-title').textContent = record.title + (session.dirty() ? ' · 調整中' : '');
      for (const button of doc.querySelectorAll('[data-variant]')) {
        button.setAttribute('aria-pressed', String(button.dataset.variant === session.selectedId));
        const preset = session.entry.presets.find(p => p.id === button.dataset.variant);
        button.setAttribute('aria-label', preset.id + ' · ' + preset.title);
        const label = button.querySelector?.('span'); if (label) label.textContent = preset.title;
      }
      $('edit').setAttribute('aria-pressed', String(bench.editing));
      $('edit').textContent = bench.editing ? '試す' : '台を整える';
      $('shelf-count').textContent = session.snapshots.length ? '保存 ' + session.snapshots.length + '案' : '保存した案';
      $('storage-warning').hidden = !session.error; $('storage-warning').textContent = session.error;
      $('mode-label').hidden = bench.mode === 'live' && !bench.editing;
      $('mode-label').textContent = bench.editing ? '台を整える' : bench.mode === 'record' ? '指を記録中 · 最大6秒' : '同じ指の動き · 記録時の台';
      $('bench-hint').hidden = !hints && !bench.editing && bench.mode === 'live';
      $('bench-hint').textContent = bench.editing ? '始の印・地形の点・力のつまみを動かす' :
        bench.mode === 'record' ? (bench.waiting ? '指を動かし始めると記録します' : '動かして、離してみる') :
        bench.mode === 'replay' ? 'A / B / Cを切り替えて同じ軌跡を再生' :
        session.spec().components.drive === 'bristle' ? '円盤の近くから、指をゆっくり動かす' : '指で動かして、離してみる';
    }
    function renderTools() {
      const list = $('component-selectors'); list.replaceChildren();
      for (const key of Object.keys(session.entry.choices)) {
        const label = doc.createElement('label'); label.className = 'component';
        const span = doc.createElement('span'); span.textContent = partNames[key] || key;
        const select = doc.createElement('select'); select.id = 'part-' + key;
        for (const record of session.records()) {
          const option = doc.createElement('option'), draft = session.draft(record.id);
          option.value = record.id;
          option.textContent = record.title + ' / ' + session.entry.choices[key][draft.spec.components[key]];
          select.append(option);
        }
        select.value = donors[key] && session.records().some(r => r.id === donors[key]) ? donors[key] : session.selectedId;
        donors[key] = select.value; select.addEventListener('change', () => { donors[key] = select.value; });
        label.append(span, select); list.append(label);
      }
      $('record').textContent = bench.mode === 'record' ? 'ここまでを残す' : '指を録る';
      $('replay').disabled = !session.tape;
      $('input-limit').textContent = session.entry.inputMeaning;
      $('tape-info').textContent = session.tape ? (session.tape.frames.length / 120).toFixed(2) + '秒の記録があります。再生中の切り替えは、同じ開始位置と台から。' : '指を動かし始めてから、最大6秒を録ります。';
      const adopted = session.decisions.adoptedId ? session.record(session.decisions.adoptedId).title : '未決定';
      $('decision-info').textContent = '採用：' + adopted + ' / 残す：' +
        (session.decisions.keepIds.map(id => session.record(id).title).join('、') || '指定なし');
      $('keep').textContent = session.decisions.keepIds.includes(session.selectedId) && !session.dirty() ? '残す指定を外す' : '今の案も残しておく';
      $('undo').disabled = !session.history.length;
    }
    function switchTo(id) {
      if (bench.mode === 'record') bench.finishRecord();
      runner.clearInput(); session.select(id); bench.load(); hints = true; refresh();
      status(bench.mode === 'replay' ? '同じ指の記録を、この案で再生しています。' : session.record(id).title + '。同じ開始位置から試せます。');
    }
    function renderShelf() {
      const list = $('shelf-list'); list.replaceChildren();
      if (!session.snapshots.length) {
        const p = doc.createElement('p'); p.className = 'shelf-empty'; p.textContent = '気に入ったら「案を残す」。'; list.append(p); return;
      }
      for (const record of [...session.snapshots].reverse()) {
        const row = doc.createElement('div'), button = doc.createElement('button'), small = doc.createElement('small');
        row.className = 'shelf-entry'; button.textContent = record.title;
        small.textContent = session.entry.describe(record.spec) +
          (record.id === session.decisions.adoptedId ? ' · 採用' : '') +
          (session.decisions.keepIds.includes(record.id) ? ' · 残す' : '') +
          (session.drafts[record.id] && JSON.stringify(session.drafts[record.id].spec) !== JSON.stringify(record.spec) ? ' · 調整中' : '');
        button.append(small); button.addEventListener('click', guard(() => { switchTo(record.id); closePanel(); }));
        row.append(button); list.append(row);
      }
    }
    function renderHandoff() {
      for (const key of ['comment', 'locks', 'request']) $(key).value = session.decisions[key];
      $('summary-preview').textContent = session.summary(); $('copy-fallback').hidden = true;
    }
    function updateNotes() {
      session.setNotes(Object.fromEntries(['comment', 'locks', 'request'].map(key => [key, $(key).value])));
      $('summary-preview').textContent = session.summary(); refresh();
    }
    async function copy(value) {
      try { await host.navigator.clipboard.writeText(value); status('コピーしました。ChatGPT / Workへ貼り付けられます。'); }
      catch (_) {
        const target = $('copy-fallback'); target.hidden = false; target.value = value;
        target.focus(); target.select(); status('下の内容を選択してコピーしてください。');
      }
    }
    async function download() {
      updateNotes(); const value = session.export(), name = 'feel-studio-' + new Date().toISOString().slice(0, 10) + '.json';
      const blob = new host.Blob([value], { type: 'application/json' });
      if (host.File && host.navigator.canShare) {
        const file = new host.File([blob], name, { type: 'application/json' });
        if (host.navigator.canShare({ files: [file] })) {
          try { await host.navigator.share({ files: [file], title: 'Feel Studioの案' }); status('共有・保存先へ渡しました。'); return; }
          catch (error) { if (error.name === 'AbortError') { status('保存・共有をキャンセルしました。'); return; } }
        }
      }
      const url = host.URL.createObjectURL(blob), link = doc.createElement('a');
      link.href = url; link.download = name; doc.body.append(link); link.click(); link.remove();
      host.setTimeout(() => host.URL.revokeObjectURL(url), 60000);
      status('JSONを保存しました。保存先はブラウザのダウンロードをご確認ください。');
    }
    const SelectedModel = class extends Bench {
      constructor(width, height) {
        super(width, height, session, event => {
          if (!bench) return;
          if (event === 'recorded') status('指の動きを残しました。「再生する」で各案に適用できます。');
          if (event === 'replayed') status('再生が終わりました。別の案を選ぶと最初から再生します。');
          if (event !== 'edited') refresh();
        });
      }
    };
    runner = new Runner($('canvas'), { host, document: doc, onError: error => status('実験台でエラーが起きました：' + error.message) });
    runner.select(session.entry.id, SelectedModel, {}, 0); bench = runner.model;
    runner.start(); refresh();
    for (const button of doc.querySelectorAll('[data-variant]')) button.addEventListener('click', guard(() => switchTo(button.dataset.variant)));
    $('canvas').addEventListener('pointerdown', () => { hints = false; refresh(); });
    $('panel-close').addEventListener('click', closePanel);
    panel.addEventListener('cancel', () => { host.setTimeout(() => previousFocus?.focus?.({ preventScroll: true }), 0); });
    $('help-open').addEventListener('click', () => openPanel('help', 'この机の使い方'));
    $('tools-open').addEventListener('click', () => openPanel('tools', '比べる・組む'));
    $('shelf-open').addEventListener('click', () => openPanel('shelf', '残した案'));
    $('save-open').addEventListener('click', () => openPanel('save', '新しい案を残す'));
    $('handoff-open').addEventListener('click', guard(() => openPanel('handoff', 'AIへ渡す')));
    $('retry').addEventListener('click', guard(() => { runner.clearInput(); bench.reset(); refresh(); status('同じ開始位置へ戻りました。'); }));
    $('edit').addEventListener('click', guard(() => {
      runner.clearInput(); bench.setEditing(!bench.editing); refresh();
      status(bench.editing ? '点をつかんで動かしてください。終わったら「試す」。' : '整えた台で、すぐ試せます。');
    }));
    $('save').addEventListener('click', guard(() => {
      visibleScene(); const record = session.save($('save-name').value);
      runner.clearInput(); bench.load(); refresh(); closePanel(); status(record.title + 'を残しました。元の案にも戻れます。');
    }));
    $('record').addEventListener('click', guard(() => {
      if (bench.mode === 'record') bench.finishRecord();
      else { runner.clearInput(); bench.record(); }
      refresh(); closePanel(); status('記録したい動きを指で試してください。最大6秒です。');
    }));
    $('replay').addEventListener('click', guard(() => { runner.clearInput(); bench.replay(); refresh(); closePanel(); status('同じ指の記録を再生します。A / B / Cで切り替えられます。'); }));
    $('live').addEventListener('click', guard(() => { runner.clearInput(); bench.live(); refresh(); closePanel(); status('自分の指で試せます。'); }));
    $('compose').addEventListener('click', guard(() => {
      visibleScene(); const record = session.compose(donors);
      runner.clearInput(); bench.mode = 'live'; bench.editing = false; bench.load();
      refresh(); closePanel(); status(record.title + 'を作りました。選んだ部分が実際に動いています。');
    }));
    $('adopt').addEventListener('click', guard(() => {
      visibleScene(); const record = session.adopt(); runner.clearInput(); bench.load(); refresh(); renderTools();
      status(record.title + 'の設定を採用として残しました。');
    }));
    $('keep').addEventListener('click', guard(() => { visibleScene(); session.keep(); runner.clearInput(); bench.load(); refresh(); renderTools(); status('残す案の指定を更新しました。'); }));
    $('undo').addEventListener('click', guard(() => { runner.clearInput(); bench.mode = 'live'; session.undo(); bench.load(); refresh(); renderTools(); status('直前の調整へ戻りました。'); }));
    $('restore').addEventListener('click', guard(() => { runner.clearInput(); bench.mode = 'live'; session.restoreSelected(); bench.load(); refresh(); renderTools(); status('この案の保存時の設定と台へ戻りました。'); }));
    for (const key of ['comment', 'locks', 'request']) $(key).addEventListener('input', guard(updateNotes));
    $('copy-summary').addEventListener('click', guard(() => { updateNotes(); return copy(session.summary()); }));
    $('copy-json').addEventListener('click', guard(() => { updateNotes(); return copy(session.export()); }));
    $('download').addEventListener('click', guard(download));
    $('import').addEventListener('change', guard(async () => {
      const file = $('import').files?.[0]; if (!file) return;
      try {
        if (file.size > 4000000) throw new Error('JSONが大きすぎます。');
        const added = session.import(await file.text());
        runner.clearInput(); bench.mode = 'live'; bench.editing = false; bench.load(); refresh(); renderHandoff();
        status(added + '案を追加し、JSONの作業中の台へ戻りました。既存の保存案も残っています。');
      } finally { $('import').value = ''; }
    }));
    return { session, runner, bench, switchTo };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { mount };
  else {
    root.FeelStudioApp = { mount };
    try { root.FeelStudio = mount(root.document, root); }
    catch (error) {
      const status = root.document.getElementById('status'); if (status) status.textContent = '実験台を起動できませんでした：' + error.message;
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
