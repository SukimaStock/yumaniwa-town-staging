(() => {
  'use strict';
  const SYS = window.YUMANIWA_MAP_FACTORY_SYSTEM;
  if (!SYS) return;
  const byId = (id) => document.getElementById(id);
  const EVAL_KEY = 'yumaniwa-map-factory-evaluations-v1';

  const header = document.querySelector('.topbar');
  if (header && !byId('factoryPlaybook')) {
    const section = document.createElement('section');
    section.id = 'factoryPlaybook';
    section.className = 'system-playbook';
    const labels = (SYS.validation?.categories || []).map((id) => SYS.categoryPresets?.[id]?.label || id).join(' / ');
    const rules = (SYS.operatingRules || []).map((r) => '<li>' + r + '</li>').join('');
    section.innerHTML =
      '<div class="system-playbook-head"><div><p class="eyebrow">FACTORY PLAYBOOK</p><h2>生成の仕組みを残す</h2><p class="muted">Master → Strategy → Category Recipe → Result / Evaluation の4層で管理。</p></div><span class="system-status">Double Variation · 3カテゴリ検証済み</span></div>' +
      '<div class="system-playbook-grid"><div class="system-rule-card"><p class="eyebrow">STANDARD STRATEGY</p><strong>Alley Shop → Double Variation</strong><p class="muted">同カテゴリを2案並べ、1案あたりの情報量を自然に下げつつ比較する。</p><p class="system-validations">' + labels + '</p></div>' +
      '<div class="system-rule-card"><p class="eyebrow">OPERATING RULES</p><ol>' + rules + '</ol></div></div>';
    header.insertAdjacentElement('afterend', section);
    const badge = document.querySelector('.master-card.recommended .badge.reference');
    if (badge) badge.textContent = 'REFERENCE STRATEGY';
  }

  const form = document.querySelector('#editorPanel .form-grid');
  if (form && !byId('systemPresetBox')) {
    const options = Object.entries(SYS.categoryPresets || {}).map(([id,p]) => '<option value="' + id + '">' + p.label + '</option>').join('');
    const box = document.createElement('div');
    box.id = 'systemPresetBox';
    box.className = 'system-preset-box';
    box.innerHTML =
      '<div><p class="eyebrow">CATEGORY RECIPE</p><strong>店種を選んで一括置換</strong><p class="muted">MasterとDouble Variationは固定したまま、中身だけ差し替えます。</p></div>' +
      '<div class="system-preset-actions"><select id="systemPresetSelect"><option value="">店種を選択</option>' + options + '</select><button id="systemApplyPreset" type="button" class="secondary">Presetを適用</button></div>';
    form.insertAdjacentElement('beforebegin', box);
  }

  function fire(id, type) {
    const el = byId(id);
    if (el) el.dispatchEvent(new Event(type || 'input', { bubbles:true }));
  }

  byId('systemApplyPreset')?.addEventListener('click', () => {
    const preset = SYS.categoryPresets?.[byId('systemPresetSelect')?.value];
    if (!preset) return;
    const fields = {
      nameInput: preset.name,
      descriptionInput: preset.description,
      shopTypeInput: preset.variables?.shopType,
      mainColorInput: preset.variables?.mainColor,
      signInput: preset.variables?.sign,
      lightingInput: preset.variables?.lighting,
      propsInput: preset.variables?.props,
      manualInput: preset.manualAdjustment
    };
    Object.entries(fields).forEach(([id,value]) => {
      const el = byId(id);
      if (el) { el.value = value || ''; fire(id); }
    });
    if (byId('generationModeInput')) { byId('generationModeInput').value = 'double_variation'; fire('generationModeInput','change'); }
    if (byId('pairStrategyInput')) byId('pairStrategyInput').value = 'same_shop_variations';
    if (byId('statusInput')) byId('statusInput').value = 'draft';
    byId('buildPromptBtn')?.click();
  });

  const notes = byId('notesInput')?.closest('label');
  if (notes && !byId('systemEvaluation')) {
    const evalBox = document.createElement('div');
    evalBox.id = 'systemEvaluation';
    evalBox.className = 'system-evaluation full';
    evalBox.innerHTML =
      '<div class="system-evaluation-head"><div><p class="eyebrow">RESULT / EVALUATION</p><strong>毎回同じ基準で記録</strong></div><button id="systemSaveEvaluation" type="button" class="secondary">評価を保存</button></div>' +
      '<div class="system-eval-grid">' +
      '<label>統一感<select id="evConsistency"><option value="">未評価</option><option value="good">良い</option><option value="needs_work">要改善</option></select></label>' +
      '<label>灯串らしさ<select id="evTomogushi"><option value="">未評価</option><option value="good">良い</option><option value="needs_work">要改善</option></select></label>' +
      '<label>ドット絵感<select id="evPixel"><option value="">未評価</option><option value="good">良い</option><option value="needs_work">要改善</option></select></label>' +
      '<label>情報量<select id="evDensity"><option value="">未評価</option><option value="too_much">多い</option><option value="just_right">ちょうどいい</option><option value="too_little">少ない</option></select></label>' +
      '<label>比較しやすさ<select id="evCompare"><option value="">未評価</option><option value="high">高い</option><option value="normal">普通</option><option value="low">低い</option></select></label></div>' +
      '<div class="system-eval-notes"><label>次回も残す点<input id="evKeep" type="text"></label><label>次回直す点<input id="evFix" type="text"></label></div><p id="evSaved" class="system-save-note"></p>';
    notes.insertAdjacentElement('beforebegin', evalBox);
  }

  function evalStore() {
    try { return JSON.parse(localStorage.getItem(EVAL_KEY) || '{}'); } catch (_) { return {}; }
  }
  function key() { return (byId('nameInput')?.value || '').trim(); }
  function saveEval() {
    if (!key()) return;
    const s = evalStore();
    s[key()] = {
      consistency: byId('evConsistency')?.value || '',
      tomogushiFeel: byId('evTomogushi')?.value || '',
      pixelReadability: byId('evPixel')?.value || '',
      density: byId('evDensity')?.value || '',
      comparisonUsefulness: byId('evCompare')?.value || '',
      keepNext: byId('evKeep')?.value || '',
      fixNext: byId('evFix')?.value || '',
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(EVAL_KEY, JSON.stringify(s));
    if (byId('evSaved')) byId('evSaved').textContent = '評価を保存しました';
  }
  function loadEval() {
    const d = evalStore()[key()] || {};
    [['evConsistency','consistency'],['evTomogushi','tomogushiFeel'],['evPixel','pixelReadability'],['evDensity','density'],['evCompare','comparisonUsefulness'],['evKeep','keepNext'],['evFix','fixNext']].forEach(([id,p]) => { if (byId(id)) byId(id).value = d[p] || ''; });
  }
  byId('systemSaveEvaluation')?.addEventListener('click', saveEval);
  byId('saveRecipeBtn')?.addEventListener('click', saveEval);
  byId('nameInput')?.addEventListener('change', loadEval);

  const panel = byId('editorPanel');
  if (panel) {
    new MutationObserver(() => {
      if (!panel.classList.contains('hidden')) setTimeout(loadEval, 0);
    }).observe(panel, { attributes:true, attributeFilter:['class'] });
  }
})();