(() => {
  'use strict';

  const STORAGE_KEY = 'yumaniwa-map-factory-v01';
  const REFERENCE_IMAGES = {
    craftColaDouble: 'data:image/jpeg;base64,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'
  };
  const MASTERS = window.YUMANIWA_MAP_FACTORY_MASTERS || {};
  const DEFAULT_MASTER_ID = window.YUMANIWA_MAP_FACTORY_DEFAULT_MASTER || 'alley-shop-double';

  const seedRecipes = [
    {
      id: 'craft-cola-double-reference',
      name: 'クラフトコーラ屋（2軒並び・参照版）',
      type: 'alley_shop',
      status: 'reference',
      generationMode: 'double_variation',
      pairStrategy: 'same_shop_variations',
      master: { id: 'alley-shop-double', version: 1 },
      description: '灯串横丁のクラフトコーラ屋を2軒並びで生成し、1軒あたりの情報量を落としてレトロなドット絵感を強める。',
      variables: {
        shopType: 'small craft-cola shops',
        mainColor: 'dark brown wooden facades, deep charcoal roofs, faded dark red noren, small beige accents, warm amber light',
        sign: 'one simple hanging bottle sign per shop, using a very simple bottle-shaped emblem or abstract cola symbol',
        lighting: 'one small warm lantern or entrance light per shop, restrained amber light',
        props: 'at most 2 simple cola bottles and 1 simple spice jar per shop, no labels, no clutter'
      },
      output: { gameWidthTiles: 4.5, gameHeightTiles: 6 },
      manualAdjustment: 'Preserve the noren and hanging signs as the main identity. Keep both shops compact, narrow, slightly vertical, low-color, and visually quiet.',
      notes: '現在の最良結果。2軒並びにすることで1軒あたりの見かけサイズと情報量が下がり、Singleより灯串横丁の既存店に近いドット絵感が出た。2案を同時比較できるのも有効。今後の灯串店舗はDouble Variationを優先して試す。',
      result: {
        selectedImage: REFERENCE_IMAGES.craftColaDouble,
        caption: 'Double Variation v1 の基準例。2軒並びで密度を落とす方法が最も安定した。'
      },
      createdAt: '2026-09-22T20:08:00+02:00',
      updatedAt: '2026-09-22T20:08:00+02:00',
      parentId: null
    },
    {
      id: 'craft-cola',
      name: 'クラフトコーラ屋',
      type: 'alley_shop',
      status: 'good',
      generationMode: 'single',
      pairStrategy: 'none',
      master: { id: 'alley-shop-single', version: 5 },
      description: '灯串横丁にある小さなクラフトコーラ店',
      variables: {
        shopType: 'small craft-cola shop',
        mainColor: 'dark brown wooden facade, deep charcoal roof, faded dark red noren, warm amber light',
        sign: 'one simple hanging bottle sign',
        lighting: 'one warm lantern or small entrance light',
        props: 'at most 2 simple cola bottles and 1 simple spice jar'
      },
      output: { gameWidthTiles: 4.5, gameHeightTiles: 6 },
      manualAdjustment: 'Keep the storefront narrow and slightly vertical. Preserve the noren and hanging sign. Keep the detail level low.',
      notes: 'Single v5で方向性は良好。ただしDouble Variationの方がドット絵感と比較性で良かったため、現在は補助Recipe。',
      result: { selectedImage: '', caption: '' },
      createdAt: '2026-09-22T19:00:00+02:00',
      updatedAt: '2026-09-22T20:08:00+02:00',
      parentId: null
    }
  ];

  const $ = (id) => document.getElementById(id);
  const els = {
    grid: $('assetGrid'),
    editor: $('editorPanel'),
    masterPanel: $('masterPanel'),
    editorTitle: $('editorTitle'),
    name: $('nameInput'),
    status: $('statusInput'),
    generationMode: $('generationModeInput'),
    pairStrategy: $('pairStrategyInput'),
    baseRecipeLabel: $('baseRecipeLabel'),
    description: $('descriptionInput'),
    shopType: $('shopTypeInput'),
    mainColor: $('mainColorInput'),
    sign: $('signInput'),
    lighting: $('lightingInput'),
    props: $('propsInput'),
    width: $('gameWidthInput'),
    height: $('gameHeightInput'),
    manual: $('manualInput'),
    notes: $('notesInput'),
    prompt: $('promptOutput'),
    promptMasterLabel: $('promptMasterLabel'),
    masterPrompt: $('masterPromptOutput'),
    masterPanelTitle: $('masterPanelTitle'),
    masterPanelDescription: $('masterPanelDescription'),
    referencePreview: $('referencePreview'),
    referenceImage: $('referenceImage'),
    referenceCaption: $('referenceCaption')
  };

  let currentFilter = 'all';
  let editingId = null;
  let state = loadState();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeRecipe(recipe) {
    const r = clone(recipe);
    r.generationMode = r.generationMode || ((r.master && r.master.id === 'alley-shop-double') ? 'double_variation' : 'single');
    r.pairStrategy = r.pairStrategy || (r.generationMode === 'double_variation' ? 'same_shop_variations' : 'none');
    r.variables = Object.assign({ shopType:'', mainColor:'', sign:'', lighting:'', props:'' }, r.variables || {});
    r.output = Object.assign({ gameWidthTiles:4.5, gameHeightTiles:6 }, r.output || {});
    r.result = Object.assign({ selectedImage:'', caption:'' }, r.result || {});
    syncMaster(r);
    return r;
  }

  function migrateState(candidate) {
    const migrated = candidate && Array.isArray(candidate.recipes) ? candidate : { recipes: [] };
    migrated.recipes = migrated.recipes.map(normalizeRecipe);

    seedRecipes.forEach((seed) => {
      const index = migrated.recipes.findIndex((r) => r.id === seed.id);
      if (index === -1) {
        migrated.recipes.unshift(clone(seed));
      } else if (seed.id === 'craft-cola-double-reference') {
        migrated.recipes[index] = clone(seed);
      }
    });

    return migrated;
  }

  function loadState() {
    let stored = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch (_) {}
    const migrated = migrateState(stored);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    } catch (_) {}
    return migrated;
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (c) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    })[c]);
  }

  function masterIdForMode(mode) {
    return mode === 'single' ? 'alley-shop-single' : 'alley-shop-double';
  }

  function syncMaster(recipe) {
    const id = masterIdForMode(recipe.generationMode || 'double_variation');
    const master = MASTERS[id] || MASTERS[DEFAULT_MASTER_ID];
    recipe.master = { id: master.id, version: master.version };
    recipe.pairStrategy = recipe.generationMode === 'double_variation' ? 'same_shop_variations' : 'none';
    return master;
  }

  function getMaster(recipe) {
    const id = recipe?.master?.id || masterIdForMode(recipe?.generationMode);
    return MASTERS[id] || MASTERS[DEFAULT_MASTER_ID];
  }

  function buildPrompt(recipe) {
    const master = getMaster(recipe);
    const values = {
      shopType: recipe.variables.shopType || '(not specified)',
      description: recipe.description || '(not specified)',
      mainColor: recipe.variables.mainColor || '(not specified)',
      sign: recipe.variables.sign || '(not specified)',
      lighting: recipe.variables.lighting || '(not specified)',
      props: recipe.variables.props || '(none)',
      manualAdjustment: recipe.manualAdjustment || 'None. Follow the master recipe.'
    };
    return master.prompt.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? '');
  }

  function masterLabel(master) {
    return `${master.name} v${master.version}`;
  }

  function render() {
    const visible = state.recipes.filter((r) => currentFilter === 'all' ? r.status !== 'archived' : r.status === currentFilter);
    els.grid.innerHTML = visible.length ? visible.map((r) => {
      const master = getMaster(r);
      const thumb = r.result?.selectedImage
        ? `<img class="asset-thumb" src="${escapeHtml(r.result.selectedImage)}" alt="${escapeHtml(r.name)}">`
        : '';
      return `
        <article class="asset-card">
          <button class="card-button" data-open="${escapeHtml(r.id)}">
            ${thumb}
            <div class="asset-card-body">
              <span class="badge ${r.status === 'reference' ? 'reference' : ''}">${escapeHtml(r.status)}</span>
              <h3>${escapeHtml(r.name)}</h3>
              <p class="muted">${escapeHtml(r.description)}</p>
              <div class="asset-meta">
                <small class="muted">${escapeHtml(masterLabel(master))}</small>
                <small class="muted">${Number(r.output.gameWidthTiles || 0)}×${Number(r.output.gameHeightTiles || 0)} tiles</small>
              </div>
            </div>
          </button>
        </article>
      `;
    }).join('') : '<div class="empty">まだRecipeがありません。</div>';

    document.querySelectorAll('[data-open]').forEach((button) => {
      button.addEventListener('click', () => openRecipe(button.dataset.open));
    });
  }

  function blankRecipe() {
    const recipe = {
      id: '',
      name: '',
      type: 'alley_shop',
      status: 'draft',
      generationMode: 'double_variation',
      pairStrategy: 'same_shop_variations',
      master: { id: DEFAULT_MASTER_ID, version: MASTERS[DEFAULT_MASTER_ID]?.version || 1 },
      description: '',
      variables: { shopType:'', mainColor:'', sign:'', lighting:'', props:'' },
      output: { gameWidthTiles: 4.5, gameHeightTiles: 6 },
      manualAdjustment: '',
      notes: '',
      result: { selectedImage:'', caption:'' },
      prompt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentId: null
    };
    syncMaster(recipe);
    return recipe;
  }

  function slugify(value) {
    const base = String(value || '').trim().toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9\-\u3040-\u30ff\u3400-\u9fff]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return base || 'asset-' + Date.now();
  }

  function uniqueId(base) {
    let id = base;
    let n = 2;
    while (state.recipes.some((r) => r.id === id)) id = base + '-' + n++;
    return id;
  }

  function collectForm() {
    const original = editingId ? state.recipes.find((r) => r.id === editingId) : null;
    const recipe = original ? clone(original) : blankRecipe();

    recipe.name = els.name.value.trim();
    recipe.status = els.status.value;
    recipe.generationMode = els.generationMode.value;
    recipe.pairStrategy = recipe.generationMode === 'double_variation' ? 'same_shop_variations' : 'none';
    syncMaster(recipe);
    recipe.description = els.description.value.trim();
    recipe.variables.shopType = els.shopType.value.trim();
    recipe.variables.mainColor = els.mainColor.value.trim();
    recipe.variables.sign = els.sign.value.trim();
    recipe.variables.lighting = els.lighting.value.trim();
    recipe.variables.props = els.props.value.trim();
    recipe.output.gameWidthTiles = Number(els.width.value) || 4.5;
    recipe.output.gameHeightTiles = Number(els.height.value) || 6;
    recipe.manualAdjustment = els.manual.value.trim();
    recipe.notes = els.notes.value.trim();
    recipe.updatedAt = new Date().toISOString();
    recipe.prompt = buildPrompt(recipe);

    if (!recipe.id) recipe.id = uniqueId(slugify(recipe.name));
    return recipe;
  }

  function updateModeUI(recipe) {
    const master = syncMaster(recipe);
    els.pairStrategy.value = recipe.pairStrategy;
    els.pairStrategy.disabled = recipe.generationMode !== 'double_variation';
    els.baseRecipeLabel.textContent = masterLabel(master);
    els.promptMasterLabel.textContent = masterLabel(master);
  }

  function fillForm(recipe) {
    const r = normalizeRecipe(recipe);
    els.name.value = r.name || '';
    els.status.value = r.status || 'draft';
    els.generationMode.value = r.generationMode || 'double_variation';
    els.pairStrategy.value = r.pairStrategy || 'same_shop_variations';
    els.description.value = r.description || '';
    els.shopType.value = r.variables.shopType || '';
    els.mainColor.value = r.variables.mainColor || '';
    els.sign.value = r.variables.sign || '';
    els.lighting.value = r.variables.lighting || '';
    els.props.value = r.variables.props || '';
    els.width.value = r.output.gameWidthTiles ?? 4.5;
    els.height.value = r.output.gameHeightTiles ?? 6;
    els.manual.value = r.manualAdjustment || '';
    els.notes.value = r.notes || '';
    els.prompt.value = buildPrompt(r);
    updateModeUI(r);

    if (r.result.selectedImage) {
      els.referenceImage.src = r.result.selectedImage;
      els.referenceImage.alt = r.name;
      els.referenceCaption.textContent = r.result.caption || r.notes || '';
      els.referencePreview.classList.remove('hidden');
    } else {
      els.referenceImage.removeAttribute('src');
      els.referenceCaption.textContent = '';
      els.referencePreview.classList.add('hidden');
    }
  }

  function openEditor(recipe, title) {
    els.editor.classList.remove('hidden');
    els.editor.setAttribute('aria-hidden','false');
    els.masterPanel.classList.add('hidden');
    els.editorTitle.textContent = title || recipe.name || 'New asset';
    fillForm(recipe);
    els.editor.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function openRecipe(id) {
    const recipe = state.recipes.find((r) => r.id === id);
    if (!recipe) return;
    editingId = id;
    openEditor(recipe, recipe.name);
  }

  function newRecipe() {
    editingId = null;
    openEditor(blankRecipe(), 'New asset');
  }

  function closeEditor() {
    els.editor.classList.add('hidden');
    els.editor.setAttribute('aria-hidden','true');
    editingId = null;
  }

  function saveRecipe() {
    const recipe = collectForm();
    if (!recipe.name) {
      els.name.focus();
      return;
    }
    const index = state.recipes.findIndex((r) => r.id === editingId);
    if (index >= 0) state.recipes[index] = recipe;
    else state.recipes.unshift(recipe);
    editingId = recipe.id;
    persist();
    fillForm(recipe);
    render();
    els.editorTitle.textContent = recipe.name;
  }

  function deriveRecipe() {
    const source = collectForm();
    const copy = clone(source);
    copy.id = '';
    copy.name = source.name ? source.name.replace(/（2軒並び・参照版）/g,'') + ' 派生' : '';
    copy.status = 'draft';
    copy.parentId = source.id || editingId || null;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    copy.notes = '';
    copy.manualAdjustment = '';
    copy.result = { selectedImage:'', caption:'' };
    editingId = null;
    openEditor(copy, 'Derived asset');
  }

  function exportRecipe() {
    const recipe = collectForm();
    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (recipe.id || slugify(recipe.name)) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function copyPrompt() {
    const recipe = collectForm();
    const prompt = buildPrompt(recipe);
    els.prompt.value = prompt;
    try {
      await navigator.clipboard.writeText(prompt);
      $('copyPromptBtn').textContent = 'Copied';
      setTimeout(() => $('copyPromptBtn').textContent = 'Copy', 900);
    } catch (_) {
      els.prompt.focus();
      els.prompt.select();
    }
  }

  function refreshPromptFromForm() {
    const recipe = collectForm();
    updateModeUI(recipe);
    els.prompt.value = buildPrompt(recipe);
  }

  function openMaster(id) {
    const master = MASTERS[id];
    if (!master) return;
    els.masterPanelTitle.textContent = masterLabel(master);
    els.masterPanelDescription.textContent = master.description || '';
    els.masterPrompt.value = master.prompt;
    els.masterPanel.classList.remove('hidden');
    els.masterPanel.setAttribute('aria-hidden','false');
    els.editor.classList.add('hidden');
    els.masterPanel.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  $('newRecipeBtn').addEventListener('click', newRecipe);
  $('closeEditorBtn').addEventListener('click', closeEditor);
  $('saveRecipeBtn').addEventListener('click', saveRecipe);
  $('deriveBtn').addEventListener('click', deriveRecipe);
  $('exportBtn').addEventListener('click', exportRecipe);
  $('copyPromptBtn').addEventListener('click', copyPrompt);
  $('buildPromptBtn').addEventListener('click', refreshPromptFromForm);

  document.querySelectorAll('[data-master-open]').forEach((button) => {
    button.addEventListener('click', () => openMaster(button.dataset.masterOpen));
  });

  $('closeMasterBtn').addEventListener('click', () => {
    els.masterPanel.classList.add('hidden');
    els.masterPanel.setAttribute('aria-hidden','true');
  });

  document.querySelectorAll('.filter').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      currentFilter = button.dataset.filter;
      render();
    });
  });

  els.generationMode.addEventListener('change', refreshPromptFromForm);

  ['descriptionInput','shopTypeInput','mainColorInput','signInput','lightingInput','propsInput','manualInput'].forEach((id) => {
    $(id).addEventListener('input', refreshPromptFromForm);
  });

  render();
})();
