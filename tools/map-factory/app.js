(() => {
  'use strict';

  const STORAGE_KEY = 'yumaniwa-map-factory-v01';
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
        selectedImage: './references/craft-cola-double-reference.jpg',
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
