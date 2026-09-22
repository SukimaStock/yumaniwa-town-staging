(() => {
  'use strict';

  const STORAGE_KEY = 'yumaniwa-map-factory-v01';

  const MASTER = {
    id: 'alley-shop-master',
    type: 'alley_shop',
    name: 'Alley Shop',
    version: 1,
    prompt: `YUMANIWA TOWN / TOMOGUSHI ALLEY SHOP

PURPOSE
A standalone small storefront asset placed inside Tomogushi Alley in Yumaniwa Town.

CAMERA
Front-facing with a subtle elevated game-map perspective.
The storefront must read clearly when displayed at a small in-game scale.

COMPOSITION
One complete independent shop.
Compact silhouette.
Clear ground contact.
Main entrance and shop identity should be understandable at a glance.
Keep the shop visually self-contained so it can be placed as a transparent PNG on an existing map.

WORLD FEEL
A quiet small-town alley at night.
Warm, lived-in, handmade rather than polished or luxurious.
Slightly nostalgic, but not themed like a historical attraction.
The shop should feel like it has been there for years.
Avoid visual noise and exaggerated cuteness.

LIGHTING
Night setting.
Warm and restrained shop lighting.
Do not make the entire asset glow.
Keep enough darker areas so it belongs in a calm alley.

GAME ASSET REQUIREMENTS
Transparent background.
No surrounding street or pavement.
No unrelated neighboring buildings.
No people.
No large scenery behind the shop.
No long cast shadow extending outside the footprint.
Keep the bottom edge easy to align to the map ground.
Readable silhouette at small size.

SHOP
{{shopType}}

DESCRIPTION
{{description}}

MAIN COLOR
{{mainColor}}

SIGN
{{sign}}

SHOP LIGHTING
{{lighting}}

SMALL PROPS
{{props}}

MANUAL ADJUSTMENT
{{manualAdjustment}}`
  };

  const seedRecipes = [
    {
      id: 'craft-cola',
      name: 'クラフトコーラ屋',
      type: 'alley_shop',
      status: 'draft',
      master: { id: MASTER.id, version: MASTER.version },
      description: '灯串横丁にある小さなクラフトコーラ店',
      variables: {
        shopType: 'small craft cola shop',
        mainColor: 'deep brown with muted amber accents',
        sign: 'small handmade shop sign',
        lighting: 'warm, dim, restrained light',
        props: 'cola bottles, spice jars, a few wooden crates'
      },
      output: { gameWidthTiles: 6, gameHeightTiles: 6 },
      manualAdjustment: '',
      notes: '',
      prompt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    masterPrompt: $('masterPromptOutput')
  };

  let currentFilter = 'all';
  let editingId = null;
  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { recipes: seedRecipes };
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (c) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    })[c]);
  }

  function buildPrompt(recipe) {
    const values = {
      shopType: recipe.variables.shopType || '(not specified)',
      description: recipe.description || '(not specified)',
      mainColor: recipe.variables.mainColor || '(not specified)',
      sign: recipe.variables.sign || '(not specified)',
      lighting: recipe.variables.lighting || '(not specified)',
      props: recipe.variables.props || '(none)',
      manualAdjustment: recipe.manualAdjustment || 'None. Follow the master recipe.'
    };
    return MASTER.prompt.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? '');
  }

  function render() {
    const visible = state.recipes.filter((r) => currentFilter === 'all' ? r.status !== 'archived' : r.status === currentFilter);
    els.grid.innerHTML = visible.length ? visible.map((r) => `
      <article class="asset-card">
        <button data-open="${escapeHtml(r.id)}">
          <span class="badge">${escapeHtml(r.status)}</span>
          <h3>${escapeHtml(r.name)}</h3>
          <p class="muted">${escapeHtml(r.description)}</p>
        </button>
        <div class="asset-meta">
          <small class="muted">Alley Shop v${r.master.version}</small>
          <small class="muted">${Number(r.output.gameWidthTiles || 0)}×${Number(r.output.gameHeightTiles || 0)} tiles</small>
        </div>
      </article>
    `).join('') : '<div class="empty">まだRecipeがありません。</div>';

    document.querySelectorAll('[data-open]').forEach((button) => {
      button.addEventListener('click', () => openRecipe(button.dataset.open));
    });
  }

  function blankRecipe() {
    return {
      id: '',
      name: '',
      type: 'alley_shop',
      status: 'draft',
      master: { id: MASTER.id, version: MASTER.version },
      description: '',
      variables: { shopType:'', mainColor:'', sign:'', lighting:'', props:'' },
      output: { gameWidthTiles: 6, gameHeightTiles: 6 },
      manualAdjustment: '',
      notes: '',
      prompt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentId: null
    };
  }

  function slugify(value) {
    const base = String(value || '').trim().toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9\-\u3040-\u30ff\u3400-\u9fff]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return base || 'asset-' + Date.now();
  }

  function collectForm() {
    const original = editingId ? state.recipes.find((r) => r.id === editingId) : null;
    const recipe = original ? JSON.parse(JSON.stringify(original)) : blankRecipe();
    recipe.name = els.name.value.trim();
    recipe.status = els.status.value;
    recipe.description = els.description.value.trim();
    recipe.variables.shopType = els.shopType.value.trim();
    recipe.variables.mainColor = els.mainColor.value.trim();
    recipe.variables.sign = els.sign.value.trim();
    recipe.variables.lighting = els.lighting.value.trim();
    recipe.variables.props = els.props.value.trim();
    recipe.output.gameWidthTiles = Number(els.width.value) || 6;
    recipe.output.gameHeightTiles = Number(els.height.value) || 6;
    recipe.manualAdjustment = els.manual.value.trim();
    recipe.notes = els.notes.value.trim();
    recipe.updatedAt = new Date().toISOString();
    recipe.prompt = buildPrompt(recipe);
    if (!recipe.id) recipe.id = uniqueId(slugify(recipe.name));
    return recipe;
  }

  function uniqueId(base) {
    let id = base;
    let n = 2;
    while (state.recipes.some((r) => r.id === id)) id = base + '-' + n++;
    return id;
  }

  function fillForm(recipe) {
    els.name.value = recipe.name || '';
    els.status.value = recipe.status || 'draft';
    els.description.value = recipe.description || '';
    els.shopType.value = recipe.variables?.shopType || '';
    els.mainColor.value = recipe.variables?.mainColor || '';
    els.sign.value = recipe.variables?.sign || '';
    els.lighting.value = recipe.variables?.lighting || '';
    els.props.value = recipe.variables?.props || '';
    els.width.value = recipe.output?.gameWidthTiles ?? 6;
    els.height.value = recipe.output?.gameHeightTiles ?? 6;
    els.manual.value = recipe.manualAdjustment || '';
    els.notes.value = recipe.notes || '';
    els.prompt.value = buildPrompt(recipe);
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
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = '';
    copy.name = source.name ? source.name + ' 派生' : '';
    copy.status = 'draft';
    copy.parentId = source.id || editingId || null;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    copy.notes = '';
    copy.manualAdjustment = '';
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
    const prompt = buildPrompt(collectForm());
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

  $('newRecipeBtn').addEventListener('click', newRecipe);
  $('closeEditorBtn').addEventListener('click', closeEditor);
  $('saveRecipeBtn').addEventListener('click', saveRecipe);
  $('deriveBtn').addEventListener('click', deriveRecipe);
  $('exportBtn').addEventListener('click', exportRecipe);
  $('copyPromptBtn').addEventListener('click', copyPrompt);
  $('buildPromptBtn').addEventListener('click', () => {
    els.prompt.value = buildPrompt(collectForm());
  });

  $('editMasterBtn').addEventListener('click', () => {
    els.masterPrompt.value = MASTER.prompt;
    els.masterPanel.classList.remove('hidden');
    els.masterPanel.setAttribute('aria-hidden','false');
    els.editor.classList.add('hidden');
    els.masterPanel.scrollIntoView({ behavior:'smooth', block:'start' });
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

  ['descriptionInput','shopTypeInput','mainColorInput','signInput','lightingInput','propsInput','manualInput'].forEach((id) => {
    $(id).addEventListener('input', () => {
      els.prompt.value = buildPrompt(collectForm());
    });
  });

  render();
})();