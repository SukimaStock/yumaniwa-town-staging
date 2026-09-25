(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const DB_NAME = 'yumaniwa-map-factory-v02';
  const STORE_NAME = 'assets';
  const STATE_KEY = 'yumaniwa-map-factory-v02-state';
  const BACKUP_FORMAT = 'yumaniwa-map-factory-backup';
  const BACKUP_VERSION = 2;

  function artifactMeta(kind, createdAt, dependencies, nextStep) {
    return {
      schema: 'sukimastock-artifact/1',
      kind,
      producer: { tool: 'map-factory', version: '0.9' },
      createdAt,
      dependencies,
      nextStep
    };
  }

  const TYPES = ['base', 'noren', 'sign', 'lantern', 'board', 'special'];
  const PART_TYPES = TYPES.filter((type) => type !== 'base');
  const SINGLE_PART_TYPES = ['noren', 'sign', 'lantern', 'board'];
  const DRAW_ORDER = ['noren', 'sign', 'lantern', 'board'];

  const SLOT = {
    noren:   { x: 0.50, y: 0.42, maxW: 0.56, maxH: 0.30, anchor: 'top-center' },
    sign:    { x: 0.84, y: 0.44, maxW: 0.18, maxH: 0.25, anchor: 'center' },
    lantern: { x: 0.80, y: 0.58, maxW: 0.13, maxH: 0.19, anchor: 'center' },
    board:   { x: 0.76, y: 0.88, maxW: 0.21, maxH: 0.24, anchor: 'bottom-center' },
    special: { x: 0.23, y: 0.88, maxW: 0.29, maxH: 0.25, anchor: 'bottom-center' }
  };

  const LABELS = {
    base: 'BASE',
    noren: 'NOREN',
    sign: 'SIGN',
    lantern: 'LANTERN',
    board: 'BOARD',
    special: 'SPECIAL'
  };

  const KIT_PRESETS = {
    'identity-kit-v1': {
      name: 'Identity Kit Sheet v1',
      maxDistance: 0.11,
      slots: {
        base: [
          { x: 0.130, y: 0.190 },
          { x: 0.405, y: 0.190 }
        ],
        noren: [
          { x: 0.630, y: 0.140 },
          { x: 0.770, y: 0.140 },
          { x: 0.910, y: 0.140 },
          { x: 0.630, y: 0.300 },
          { x: 0.770, y: 0.300 },
          { x: 0.910, y: 0.300 }
        ],
        sign: [
          { x: 0.065, y: 0.490 },
          { x: 0.153, y: 0.490 },
          { x: 0.244, y: 0.490 },
          { x: 0.325, y: 0.490 },
          { x: 0.403, y: 0.490 },
          { x: 0.500, y: 0.490 }
        ],
        lantern: [
          { x: 0.607, y: 0.490 },
          { x: 0.675, y: 0.490 },
          { x: 0.737, y: 0.490 },
          { x: 0.808, y: 0.490 },
          { x: 0.880, y: 0.490 },
          { x: 0.950, y: 0.490 }
        ],
        board: [
          { x: 0.104, y: 0.695 },
          { x: 0.235, y: 0.695 },
          { x: 0.366, y: 0.695 },
          { x: 0.498, y: 0.695 },
          { x: 0.626, y: 0.695 },
          { x: 0.770, y: 0.695 }
        ],
        special: [
          { x: 0.097, y: 0.890 },
          { x: 0.253, y: 0.890 },
          { x: 0.401, y: 0.890 },
          { x: 0.557, y: 0.890 },
          { x: 0.742, y: 0.890 },
          { x: 0.920, y: 0.840 }
        ]
      }
    },

    // Generic source sheets for Yumaniwa props / exhibits.
    // These intentionally register every detected object as SPECIAL so that
    // Map Factory can be used as a neutral cutout station before Cleaner.
    'object-grid-2x2': {
      name: 'Object Sheet 2×2',
      candidateLabel: 'OBJECT',
      maxDistance: 0.25,
      slots: {
        special: [
          { x: 0.25, y: 0.25 },
          { x: 0.75, y: 0.25 },
          { x: 0.25, y: 0.75 },
          { x: 0.75, y: 0.75 }
        ]
      }
    },

    'object-row-3': {
      name: 'Object Row 3',
      candidateLabel: 'OBJECT',
      maxDistance: 0.24,
      slots: {
        special: [
          { x: 1 / 6, y: 0.50 },
          { x: 0.50, y: 0.50 },
          { x: 5 / 6, y: 0.50 }
        ]
      }
    }
  };

  const els = {
    canvas: $('previewCanvas'),
    empty: $('previewEmpty'),
    shelves: {
      base: $('baseShelf'),
      noren: $('norenShelf'),
      sign: $('signShelf'),
      lantern: $('lanternShelf'),
      board: $('boardShelf'),
      special: $('specialShelf')
    },
    assetCount: $('assetCount'),
    batchCount: $('batchCount'),
    batchList: $('batchList'),
    exportBackup: $('exportBackupBtn'),
    restoreBackup: $('restoreBackupBtn'),
    backupFile: $('backupFileInput'),
    backupStatus: $('backupStatus'),
    backupDownload: $('backupDownloadLink'),
    backupShare: $('backupShareBtn'),
    compositionSlotList: $('compositionSlotList'),
    partSelectionBox: $('partSelectionBox'),
    specialTools: $('specialTools'),
    specialActiveLabel: $('specialActiveLabel'),
    specialCount: $('specialCount'),
    specialInstanceList: $('specialInstanceList'),
    specialBackward: $('specialBackwardBtn'),
    specialForward: $('specialForwardBtn'),
    specialDuplicate: $('specialDuplicateBtn'),
    specialRemove: $('specialRemoveBtn'),
    comboStrip: $('comboStrip'),
    adjustType: $('adjustType'),
    scale: $('partScale'),
    x: $('partX'),
    y: $('partY'),
    scaleValue: $('scaleValue'),
    xValue: $('xValue'),
    yValue: $('yValue'),
    resetAdjust: $('resetAdjustBtn'),
    clearComposition: $('clearCompositionBtn'),
    exportPng: $('exportPngBtn'),
    exportJson: $('exportJsonBtn'),

    importMode: $('importMode'),
    pairTypeField: $('pairTypeField'),
    kitPresetField: $('kitPresetField'),
    importType: $('importType'),
    kitPreset: $('kitPreset'),
    sourceInput: $('sourceFileInput'),
    registerImport: $('registerImportBtn'),
    sourceStatus: $('sourceStatus'),

    detectedPair: $('detectedPair'),
    detectedA: $('detectedA'),
    detectedB: $('detectedB'),
    detectedAMeta: $('detectedAMeta'),
    detectedBMeta: $('detectedBMeta'),

    kitPreview: $('kitPreview'),
    kitPreviewSummary: $('kitPreviewSummary'),
    kitGroups: $('kitGroups'),
    selectAllKit: $('selectAllKitBtn'),
    clearKitSelection: $('clearKitSelectionBtn'),

    togglePrompt: $('togglePromptBtn'),
    promptPanel: $('promptPanel'),
    promptMode: $('promptMode'),
    promptTypeField: $('promptTypeField'),
    promptType: $('promptType'),
    identity: $('identitySelect'),
    promptOutput: $('promptOutput'),
    copyPrompt: $('copyPromptBtn')
  };

  const ctx = els.canvas.getContext('2d');
  const imageCache = new Map();
  const assetObjectUrls = new Map();
  const candidateObjectUrls = new Set();

  let db = null;
  let renderToken = 0;
  let previewHitRegions = [];
  let backupObjectUrl = null;
  let backupFile = null;

  function blankSelected() {
    return {
      base: null,
      noren: null,
      sign: null,
      lantern: null,
      board: null,
      special: null
    };
  }

  function blankAdjustments() {
    return Object.fromEntries(SINGLE_PART_TYPES.map((type) => [
      type,
      { scale: 100, x: 0, y: 0 }
    ]));
  }

  const state = {
    assets: [],
    selected: blankSelected(),
    adjustments: blankAdjustments(),
    specials: [],
    activeSpecialId: null,
    adjustType: 'noren',
    compositions: [],
    activeCompositionId: null,
    detected: null
  };

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function createSpecialId() {
    return 'special_instance_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function cloneSelected(source) {
    const result = { ...blankSelected(), ...(source || {}) };
    result.special = null;
    return result;
  }

  function cloneAdjustments(source) {
    const result = blankAdjustments();

    SINGLE_PART_TYPES.forEach((type) => {
      if (!source || !source[type]) return;

      result[type] = {
        scale: Number(source[type].scale ?? 100),
        x: Number(source[type].x ?? 0),
        y: Number(source[type].y ?? 0)
      };
    });

    return result;
  }

  function cloneSpecials(source) {
    if (!Array.isArray(source)) return [];

    return source
      .filter((item) => item && item.assetId)
      .map((item) => ({
        instanceId: item.instanceId || createSpecialId(),
        assetId: item.assetId,
        scale: Number(item.scale ?? 100),
        x: Number(item.x ?? 0),
        y: Number(item.y ?? 0)
      }));
  }

  function legacySpecialsFromSource(source) {
    if (!source) return [];

    if (Array.isArray(source.specials)) {
      return cloneSpecials(source.specials);
    }

    const legacyAssetId = source.selected && typeof source.selected.special === 'string'
      ? source.selected.special
      : null;

    if (!legacyAssetId) return [];

    const legacyAdjustment =
      source.adjustments && source.adjustments.special
        ? source.adjustments.special
        : { scale: 100, x: 0, y: 0 };

    return [{
      instanceId: createSpecialId(),
      assetId: legacyAssetId,
      scale: Number(legacyAdjustment.scale ?? 100),
      x: Number(legacyAdjustment.x ?? 0),
      y: Number(legacyAdjustment.y ?? 0)
    }];
  }

  function getActiveSpecial() {
    return state.specials.find((item) => item.instanceId === state.activeSpecialId) || null;
  }

  function normalizeActiveSpecialId(specials, preferredId) {
    if (!specials.length) return null;
    if (preferredId && specials.some((item) => item.instanceId === preferredId)) return preferredId;
    return specials[specials.length - 1].instanceId;
  }

  function makeCompositionSlot(index, source) {
    const selected = source ? cloneSelected(source.selected) : blankSelected();
    const adjustments = source ? cloneAdjustments(source.adjustments) : blankAdjustments();
    const specials = source ? legacySpecialsFromSource(source) : [];
    const activeSpecialId = normalizeActiveSpecialId(specials, source && source.activeSpecialId);
    const rawAdjustType = source && PART_TYPES.includes(source.adjustType)
      ? source.adjustType
      : 'noren';
    const adjustType = rawAdjustType === 'special' && !activeSpecialId ? 'noren' : rawAdjustType;

    return {
      id: 'composition_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      name: 'SHOP ' + pad2(index + 1),
      selected,
      adjustments,
      specials,
      activeSpecialId,
      adjustType
    };
  }

  function getActiveComposition() {
    return state.compositions.find((slot) => slot.id === state.activeCompositionId) || null;
  }

  function snapshotCurrentComposition() {
    const slot = getActiveComposition();
    if (!slot) return;

    slot.selected = cloneSelected(state.selected);
    slot.adjustments = cloneAdjustments(state.adjustments);
    slot.specials = cloneSpecials(state.specials);
    slot.activeSpecialId = normalizeActiveSpecialId(slot.specials, state.activeSpecialId);
    slot.adjustType = PART_TYPES.includes(state.adjustType) ? state.adjustType : 'noren';
  }

  function applyComposition(slot) {
    if (!slot) return;

    state.selected = cloneSelected(slot.selected);
    state.adjustments = cloneAdjustments(slot.adjustments);
    state.specials = cloneSpecials(slot.specials);
    state.activeSpecialId = normalizeActiveSpecialId(state.specials, slot.activeSpecialId);
    state.adjustType = PART_TYPES.includes(slot.adjustType) ? slot.adjustType : 'noren';

    if (state.adjustType === 'special' && !state.activeSpecialId) {
      state.adjustType = 'noren';
    }
  }

  function persistState() {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      selected: state.selected,
      adjustments: state.adjustments,
      specials: state.specials,
      activeSpecialId: state.activeSpecialId,
      adjustType: state.adjustType,
      compositions: state.compositions,
      activeCompositionId: state.activeCompositionId
    }));
  }

  function saveState() {
    snapshotCurrentComposition();
    persistState();
  }

  function loadSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');

      if (saved.selected) {
        state.selected = cloneSelected(saved.selected);
      }

      if (saved.adjustments) {
        if (typeof saved.adjustments.scale === 'number') {
          state.adjustments.noren = {
            scale: saved.adjustments.scale,
            x: Number(saved.adjustments.x || 0),
            y: Number(saved.adjustments.y || 0)
          };
        } else {
          state.adjustments = cloneAdjustments(saved.adjustments);
        }
      }

      state.specials = cloneSpecials(saved.specials);
      if (!state.specials.length && saved.selected && typeof saved.selected.special === 'string') {
        state.specials = legacySpecialsFromSource(saved);
      }
      state.activeSpecialId = normalizeActiveSpecialId(state.specials, saved.activeSpecialId);

      if (PART_TYPES.includes(saved.adjustType)) {
        state.adjustType = saved.adjustType;
      }

      if (Array.isArray(saved.compositions) && saved.compositions.length) {
        state.compositions = saved.compositions.map((slot, index) => {
          const specials = legacySpecialsFromSource(slot);
          const activeSpecialId = normalizeActiveSpecialId(specials, slot.activeSpecialId);
          let adjustType = PART_TYPES.includes(slot.adjustType) ? slot.adjustType : 'noren';

          if (adjustType === 'special' && !activeSpecialId) adjustType = 'noren';

          return {
            id: slot.id || ('composition_legacy_' + index),
            name: slot.name || ('SHOP ' + pad2(index + 1)),
            selected: cloneSelected(slot.selected),
            adjustments: cloneAdjustments(slot.adjustments),
            specials,
            activeSpecialId,
            adjustType
          };
        });

        state.activeCompositionId =
          state.compositions.some((slot) => slot.id === saved.activeCompositionId)
            ? saved.activeCompositionId
            : state.compositions[0].id;

        applyComposition(getActiveComposition());
      } else {
        const slot = makeCompositionSlot(0, {
          selected: state.selected,
          adjustments: state.adjustments,
          specials: state.specials,
          activeSpecialId: state.activeSpecialId,
          adjustType: state.adjustType
        });

        state.compositions = [slot];
        state.activeCompositionId = slot.id;
        applyComposition(slot);
      }
    } catch (_) {
      const slot = makeCompositionSlot(0);
      state.compositions = [slot];
      state.activeCompositionId = slot.id;
      applyComposition(slot);
    }
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const nextDb = request.result;
        if (!nextDb.objectStoreNames.contains(STORE_NAME)) {
          const store = nextDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function dbGetAll() {
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  function dbPutMany(assets) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      assets.forEach((asset) => store.put(asset));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Asset transaction aborted'));
    });
  }

  function dbDelete(id) {
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  function dbDeleteMany(ids) {
    return new Promise((resolve, reject) => {
      if (!ids.length) {
        resolve();
        return;
      }

      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      ids.forEach((id) => store.delete(id));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Batch delete aborted'));
    });
  }

  function dbReplaceAll(assets) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      assets.forEach((asset) => store.put(asset));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Restore transaction aborted'));
    });
  }

  function byType(type) {
    return state.assets
      .filter((asset) => asset.type === type)
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }

  function assetById(id) {
    return state.assets.find((asset) => asset.id === id) || null;
  }

  function assetUrl(asset) {
    if (!asset.blob) return asset.dataUrl; // Legacy data remains displayable if migration cannot be saved.
    if (!assetObjectUrls.has(asset.id)) assetObjectUrls.set(asset.id, URL.createObjectURL(asset.blob));
    return assetObjectUrls.get(asset.id);
  }

  function releaseAssetUrls(ids) {
    for (const id of ids) {
      const url = assetObjectUrls.get(id);
      if (url) URL.revokeObjectURL(url);
      assetObjectUrls.delete(id);
    }
    imageCache.clear();
  }

  function releaseCandidates() {
    for (const url of candidateObjectUrls) URL.revokeObjectURL(url);
    candidateObjectUrls.clear();
  }

  function candidateUrl(blob) {
    const url = URL.createObjectURL(blob);
    candidateObjectUrls.add(url);
    return url;
  }

  function dataUrlToBlob(dataUrl) {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
    if (!match) throw new Error('旧バックアップの画像形式が不正です。');
    const raw = atob(match[2]);
    const buffer = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buffer[i] = raw.charCodeAt(i);
    return new Blob([buffer], { type: match[1] });
  }

  function convertLegacyAsset(asset) {
    if (asset.blob instanceof Blob) return asset;
    const { dataUrl, ...metadata } = asset;
    return { ...metadata, blob: dataUrlToBlob(dataUrl) };
  }

  function loadImage(src) {
    if (imageCache.has(src)) return imageCache.get(src);

    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });

    imageCache.set(src, promise);
    return promise;
  }

  function currentAdjustment() {
    if (state.adjustType === 'special') {
      return getActiveSpecial();
    }

    return state.adjustments[state.adjustType] || null;
  }

  function renderSpecialTools() {
    const hasSpecials = state.specials.length > 0;
    els.specialTools.classList.toggle('hidden', !hasSpecials);
    els.specialCount.textContent = String(state.specials.length);
    els.specialInstanceList.innerHTML = '';

    const active = getActiveSpecial();
    const activeIndex = active
      ? state.specials.findIndex((item) => item.instanceId === active.instanceId)
      : -1;

    state.specials.forEach((instance, index) => {
      const asset = assetById(instance.assetId);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className =
        'special-instance-chip' +
        (instance.instanceId === state.activeSpecialId ? ' active' : '');

      const order = document.createElement('strong');
      order.textContent = 'S' + (index + 1);

      const label = document.createElement('span');
      label.textContent = asset ? asset.label : 'SPECIAL';

      chip.append(order, label);
      chip.addEventListener('click', () => selectSpecialInstance(instance.instanceId));
      els.specialInstanceList.appendChild(chip);
    });

    els.specialActiveLabel.textContent = active
      ? ((assetById(active.assetId) && assetById(active.assetId).label) || 'SPECIAL')
      : 'SPECIAL';

    const disabled = !active;
    els.specialBackward.disabled = disabled || activeIndex <= 0;
    els.specialForward.disabled = disabled || activeIndex < 0 || activeIndex >= state.specials.length - 1;
    els.specialDuplicate.disabled = disabled;
    els.specialRemove.disabled = disabled;
  }

  function syncControls() {
    els.adjustType.value = state.adjustType;

    const adjustment = currentAdjustment();
    const disabled = !adjustment;

    els.scale.disabled = disabled;
    els.x.disabled = disabled;
    els.y.disabled = disabled;
    els.resetAdjust.disabled = disabled;

    els.x.min = state.adjustType === 'special' ? '-35' : '-35';
    els.x.max = state.adjustType === 'special' ? '65' : '35';

    const scale = adjustment ? Number(adjustment.scale ?? 100) : 100;
    const x = adjustment ? Number(adjustment.x ?? 0) : 0;
    const y = adjustment ? Number(adjustment.y ?? 0) : 0;

    els.scale.value = String(scale);
    els.x.value = String(x);
    els.y.value = String(y);
    els.scaleValue.textContent = scale + '%';
    els.xValue.textContent = String(x);
    els.yValue.textContent = String(y);

    renderSpecialTools();
  }

  function setAdjustType(type, instanceId) {
    if (!PART_TYPES.includes(type)) return;

    if (type === 'special') {
      state.activeSpecialId = normalizeActiveSpecialId(
        state.specials,
        instanceId || state.activeSpecialId
      );
    }

    state.adjustType = type;
    saveState();
    syncControls();
  }

  function specialDefaultOffset(index) {
    const offsets = [0, 14, 28, 42, 56, -14, 7, 21, 35, 49];
    return offsets[index % offsets.length];
  }

  function addSpecialAsset(assetId) {
    const asset = assetById(assetId);
    if (!asset || asset.type !== 'special') return;

    const instance = {
      instanceId: createSpecialId(),
      assetId,
      scale: 100,
      x: specialDefaultOffset(state.specials.length),
      y: 0
    };

    state.specials.push(instance);
    state.activeSpecialId = instance.instanceId;
    state.adjustType = 'special';
    saveState();
    renderAll();
  }

  function selectSpecialInstance(instanceId) {
    if (!state.specials.some((item) => item.instanceId === instanceId)) return;

    state.activeSpecialId = instanceId;
    state.adjustType = 'special';
    saveState();
    syncControls();
    updatePartSelectionBox();
    renderShelves();
  }

  function moveActiveSpecial(direction) {
    const active = getActiveSpecial();
    if (!active) return;

    const index = state.specials.findIndex((item) => item.instanceId === active.instanceId);
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= state.specials.length) return;

    [state.specials[index], state.specials[nextIndex]] =
      [state.specials[nextIndex], state.specials[index]];

    saveState();
    renderAll();
  }

  function duplicateActiveSpecial() {
    const active = getActiveSpecial();
    if (!active) return;

    const copy = {
      instanceId: createSpecialId(),
      assetId: active.assetId,
      scale: active.scale,
      x: Math.max(-35, Math.min(65, Number(active.x) + 7)),
      y: Number(active.y)
    };

    const index = state.specials.findIndex((item) => item.instanceId === active.instanceId);
    state.specials.splice(index + 1, 0, copy);
    state.activeSpecialId = copy.instanceId;
    state.adjustType = 'special';

    saveState();
    renderAll();
  }

  function removeActiveSpecial() {
    const active = getActiveSpecial();
    if (!active) return;

    const index = state.specials.findIndex((item) => item.instanceId === active.instanceId);
    state.specials.splice(index, 1);

    const next =
      state.specials[Math.min(index, state.specials.length - 1)] ||
      state.specials[state.specials.length - 1] ||
      null;

    state.activeSpecialId = next ? next.instanceId : null;

    if (!next) {
      state.adjustType = 'noren';
    }

    saveState();
    renderAll();
  }

  function renderCompositionSlots() {
    els.compositionSlotList.innerHTML = '';

    state.compositions.forEach((slot, index) => {
      const item = document.createElement('div');
      item.className = 'composition-slot' + (slot.id === state.activeCompositionId ? ' active' : '');
      item.setAttribute('role', 'button');
      item.tabIndex = 0;
      item.title = '作業台 ' + (index + 1) + ' に切り替え';

      const label = document.createElement('span');
      label.textContent = pad2(index + 1);

      item.addEventListener('click', () => switchComposition(slot.id));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          switchComposition(slot.id);
        }
      });

      if (state.compositions.length > 1) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'slot-delete';
        remove.textContent = '×';
        remove.setAttribute('aria-label', '作業台 ' + (index + 1) + ' を削除');
        remove.addEventListener('click', (event) => {
          event.stopPropagation();
          deleteCompositionSlot(slot.id);
        });
        item.append(label, remove);
      } else {
        item.append(label);
      }

      els.compositionSlotList.appendChild(item);
    });

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'composition-slot-add';
    add.textContent = '+';
    add.title = '現在の構成を複製して新しい作業台を追加';
    add.addEventListener('click', addCompositionSlot);
    els.compositionSlotList.appendChild(add);
  }

  function switchComposition(id) {
    if (id === state.activeCompositionId) return;

    snapshotCurrentComposition();

    const next = state.compositions.find((slot) => slot.id === id);
    if (!next) return;

    state.activeCompositionId = id;
    applyComposition(next);
    persistState();
    renderAll();
  }

  function addCompositionSlot() {
    snapshotCurrentComposition();

    const current = getActiveComposition();
    const slot = makeCompositionSlot(state.compositions.length, current || {
      selected: state.selected,
      adjustments: state.adjustments,
      specials: state.specials,
      activeSpecialId: state.activeSpecialId,
      adjustType: state.adjustType
    });

    state.compositions.push(slot);
    state.activeCompositionId = slot.id;
    applyComposition(slot);
    persistState();
    renderAll();
  }

  function deleteCompositionSlot(id) {
    if (state.compositions.length <= 1) return;

    const index = state.compositions.findIndex((slot) => slot.id === id);
    if (index < 0) return;

    if (!window.confirm('この作業台を削除しますか？')) return;

    snapshotCurrentComposition();
    const wasActive = state.activeCompositionId === id;
    state.compositions.splice(index, 1);

    if (wasActive) {
      const next = state.compositions[Math.min(index, state.compositions.length - 1)];
      state.activeCompositionId = next.id;
      applyComposition(next);
    }

    state.compositions.forEach((slot, slotIndex) => {
      slot.name = 'SHOP ' + pad2(slotIndex + 1);
    });

    persistState();
    renderAll();
  }

  function removeAssetIdsFromCompositions(idSet) {
    state.compositions.forEach((slot) => {
      TYPES.forEach((type) => {
        if (slot.selected[type] && idSet.has(slot.selected[type])) {
          slot.selected[type] = null;
        }
      });

      slot.specials = cloneSpecials(slot.specials).filter(
        (instance) => !idSet.has(instance.assetId)
      );
      slot.activeSpecialId = normalizeActiveSpecialId(slot.specials, slot.activeSpecialId);

      if (slot.adjustType === 'special' && !slot.activeSpecialId) {
        slot.adjustType = 'noren';
      }
    });

    state.specials = state.specials.filter(
      (instance) => !idSet.has(instance.assetId)
    );
    state.activeSpecialId = normalizeActiveSpecialId(state.specials, state.activeSpecialId);

    if (state.adjustType === 'special' && !state.activeSpecialId) {
      state.adjustType = 'noren';
    }
  }

  function makeAssetCard(asset) {
    const wrap = document.createElement('div');
    wrap.className = 'asset-item';

    const activeSpecial = getActiveSpecial();
    const isActive = asset.type === 'special'
      ? Boolean(activeSpecial && activeSpecial.assetId === asset.id)
      : state.selected[asset.type] === asset.id;

    const button = document.createElement('button');
    button.className = 'asset-select' + (isActive ? ' active' : '');
    button.type = 'button';

    const image = document.createElement('img');
    image.className = 'asset-thumb';
    image.src = assetUrl(asset);
    image.alt = '';

    const caption = document.createElement('span');
    caption.className = 'asset-caption';

    const strong = document.createElement('strong');
    strong.textContent = asset.label;

    const size = document.createElement('span');

    if (asset.type === 'special') {
      const count = state.specials.filter((instance) => instance.assetId === asset.id).length;

      if (count > 0) {
        size.className = 'asset-count';
        size.textContent = '配置 ×' + count;
      } else {
        size.textContent = '＋ 追加';
      }
    } else {
      size.textContent = asset.width + '×' + asset.height;
    }

    caption.append(strong, size);
    button.append(image, caption);

    button.addEventListener('click', () => {
      if (asset.type === 'special') {
        addSpecialAsset(asset.id);
        return;
      }

      const active = state.selected[asset.type] === asset.id;

      if (asset.type !== 'base' && active) {
        state.selected[asset.type] = null;
      } else {
        state.selected[asset.type] = asset.id;
      }

      if (asset.type !== 'base') setAdjustType(asset.type);
      saveState();
      renderAll();
    });

    const exportAsset = document.createElement('button');
    exportAsset.className = 'export-asset';
    exportAsset.type = 'button';
    exportAsset.textContent = 'PNG';
    exportAsset.title = 'Dot Cleaner用に素材をPNG保存';
    exportAsset.setAttribute('aria-label', 'Dot Cleaner用に ' + asset.label + ' をPNG保存');
    exportAsset.addEventListener('click', async (event) => {
      event.stopPropagation();
      exportAsset.disabled = true;
      exportAsset.textContent = '…';
      try {
        await exportAssetPng(asset);
        exportAsset.textContent = '保存';
      } catch (error) {
        console.error('Asset PNG export failed', error);
        exportAsset.textContent = '失敗';
      } finally {
        setTimeout(() => { exportAsset.textContent = 'PNG'; exportAsset.disabled = false; }, 1800);
      }
    });

    const remove = document.createElement('button');
    remove.className = 'delete-asset';
    remove.type = 'button';
    remove.setAttribute('aria-label', asset.label + ' を削除');
    remove.textContent = '×';

    remove.addEventListener('click', async (event) => {
      event.stopPropagation();

      if (!window.confirm(asset.label + ' を部品棚から削除しますか？')) return;

      await dbDelete(asset.id);
      releaseAssetUrls([asset.id]);
      state.assets = state.assets.filter((item) => item.id !== asset.id);

      const removedIds = new Set([asset.id]);
      removeAssetIdsFromCompositions(removedIds);

      if (state.selected[asset.type] === asset.id) {
        state.selected[asset.type] = null;
      }

      saveState();
      renderAll();
    });

    wrap.append(button, exportAsset, remove);
    return wrap;
  }

  function renderShelf(type) {
    const element = els.shelves[type];
    const assets = byType(type);
    element.innerHTML = '';

    if (!assets.length) {
      const empty = document.createElement('div');
      empty.className = 'asset-empty';
      empty.textContent = LABELS[type] + 'をまだ仕入れていません';
      element.appendChild(empty);
      return;
    }

    assets.forEach((asset) => element.appendChild(makeAssetCard(asset)));
  }

  function renderShelves() {
    TYPES.forEach(renderShelf);
    els.assetCount.textContent = String(state.assets.length);
  }

  function getAssetBatchKey(asset) {
    if (asset.sourceBatchId) return asset.sourceBatchId;

    const sourceFile = asset.sourceFile || 'unknown-source';
    const createdAt = asset.createdAt || asset.id;
    const sourceKind = asset.sourceKind || 'legacy';

    return [sourceKind, sourceFile, createdAt].join('::');
  }

  function getImportBatches() {
    const grouped = new Map();

    state.assets.forEach((asset) => {
      const key = getAssetBatchKey(asset);

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          sourceFile: asset.sourceFile || 'Unknown source',
          sourceKind: asset.sourceKind || 'legacy',
          sourcePreset: asset.sourcePreset || null,
          createdAt: asset.createdAt || '',
          assets: []
        });
      }

      grouped.get(key).assets.push(asset);
    });

    return Array.from(grouped.values()).sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  }

  function formatBatchKind(batch) {
    if (batch.sourceKind === 'kit-sheet') return 'KIT';
    if (batch.sourceKind === 'pair') return 'PAIR';
    return 'IMPORT';
  }

  async function deleteImportBatch(batch) {
    const count = batch.assets.length;
    const message =
      '「' + batch.sourceFile + '」から読み込んだ ' + count +
      ' 個のパーツをまとめて削除しますか？\n\nこの操作は元に戻せません。';

    if (!window.confirm(message)) return;

    const ids = batch.assets.map((asset) => asset.id);
    const idSet = new Set(ids);

    await dbDeleteMany(ids);

    state.assets = state.assets.filter((asset) => !idSet.has(asset.id));
    removeAssetIdsFromCompositions(idSet);

    TYPES.forEach((type) => {
      if (state.selected[type] && idSet.has(state.selected[type])) {
        state.selected[type] = null;
      }
    });

    releaseAssetUrls(ids);
    saveState();
    renderAll();

    els.sourceStatus.textContent =
      batch.sourceFile + ' から読み込んだ ' + count + ' 個のパーツを削除しました。';
  }

  function renderBatches() {
    const batches = getImportBatches();
    els.batchCount.textContent = String(batches.length);
    els.batchList.innerHTML = '';

    if (!batches.length) {
      const empty = document.createElement('div');
      empty.className = 'batch-empty';
      empty.textContent = '読み込んだ素材はまだありません';
      els.batchList.appendChild(empty);
      return;
    }

    batches.forEach((batch) => {
      const item = document.createElement('div');
      item.className = 'batch-item';

      const main = document.createElement('div');
      main.className = 'batch-item-main';

      const info = document.createElement('div');
      info.style.minWidth = '0';

      const file = document.createElement('div');
      file.className = 'batch-file';
      file.textContent = batch.sourceFile;

      const meta = document.createElement('div');
      meta.className = 'batch-meta';
      meta.textContent =
        formatBatchKind(batch) + ' · ' + batch.assets.length + ' parts' +
        (batch.sourcePreset ? ' · ' + batch.sourcePreset : '');

      info.append(file, meta);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'batch-delete';
      remove.textContent = '一括削除';
      remove.addEventListener('click', () => deleteImportBatch(batch));

      main.append(info, remove);

      const types = document.createElement('div');
      types.className = 'batch-types';

      TYPES.forEach((type) => {
        const count = batch.assets.filter((asset) => asset.type === type).length;
        if (!count) return;

        const chip = document.createElement('span');
        chip.className = 'batch-type-chip';
        chip.textContent = LABELS[type] + ' ×' + count;
        types.appendChild(chip);
      });

      item.append(main, types);
      els.batchList.appendChild(item);
    });
  }

  function renderCombos() {
    const bases = byType('base').slice(0, 2);
    const norens = byType('noren').slice(0, 2);
    els.comboStrip.innerHTML = '';

    if (!bases.length) return;

    if (!norens.length) {
      bases.forEach((base, baseIndex) => {
        const chip = document.createElement('button');
        chip.className = 'combo-chip' + (state.selected.base === base.id ? ' active' : '');
        chip.textContent = 'BASE ' + (baseIndex + 1);

        chip.addEventListener('click', () => {
          state.selected.base = base.id;
          saveState();
          renderAll();
        });

        els.comboStrip.appendChild(chip);
      });

      return;
    }

    bases.forEach((base, baseIndex) => {
      norens.forEach((noren, norenIndex) => {
        const chip = document.createElement('button');
        const active = state.selected.base === base.id && state.selected.noren === noren.id;
        chip.className = 'combo-chip' + (active ? ' active' : '');
        chip.textContent = 'B' + (baseIndex + 1) + ' / N' + (norenIndex + 1);

        chip.addEventListener('click', () => {
          state.selected.base = base.id;
          state.selected.noren = noren.id;
          saveState();
          renderAll();
        });

        els.comboStrip.appendChild(chip);
      });
    });
  }

  function getPartRect(type, image, baseBox) {
    const slot = SLOT[type];
    const adjustment = state.adjustments[type];
    const userScale = adjustment.scale / 100;

    const targetW = baseBox.w * slot.maxW * userScale;
    const targetH = baseBox.h * slot.maxH * userScale;
    const scale = Math.min(targetW / image.width, targetH / image.height);
    const w = image.width * scale;
    const h = image.height * scale;

    const offsetX = (adjustment.x / 100) * baseBox.w;
    const offsetY = (adjustment.y / 100) * baseBox.h;
    const anchorX = baseBox.x + baseBox.w * slot.x + offsetX;
    const anchorY = baseBox.y + baseBox.h * slot.y + offsetY;

    let x = anchorX - w / 2;
    let y = anchorY - h / 2;

    if (slot.anchor === 'top-center') y = anchorY;
    if (slot.anchor === 'bottom-center') y = anchorY - h;

    return { x, y, w, h };
  }

  function getSpecialRect(instance, image, baseBox) {
    const slot = SLOT.special;
    const userScale = Number(instance.scale ?? 100) / 100;

    const targetW = baseBox.w * slot.maxW * userScale;
    const targetH = baseBox.h * slot.maxH * userScale;
    const scale = Math.min(targetW / image.width, targetH / image.height);
    const w = image.width * scale;
    const h = image.height * scale;

    const offsetX = (Number(instance.x ?? 0) / 100) * baseBox.w;
    const offsetY = (Number(instance.y ?? 0) / 100) * baseBox.h;
    const anchorX = baseBox.x + baseBox.w * slot.x + offsetX;
    const anchorY = baseBox.y + baseBox.h * slot.y + offsetY;

    return {
      x: anchorX - w / 2,
      y: anchorY - h,
      w,
      h
    };
  }

  async function renderPreview() {
    const token = ++renderToken;
    previewHitRegions = [];
    els.partSelectionBox.classList.add('hidden');

    ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
    ctx.imageSmoothingEnabled = false;

    const baseAsset = assetById(state.selected.base);

    els.empty.classList.toggle('hidden', Boolean(baseAsset));
    els.exportPng.disabled = !baseAsset;
    els.exportJson.disabled = !baseAsset;

    if (!baseAsset) return;

    try {
      const baseImage = await loadImage(assetUrl(baseAsset));
      if (token !== renderToken) return;

      const maxBaseW = 590;
      const maxBaseH = 530;
      const baseScale = Math.min(maxBaseW / baseImage.width, maxBaseH / baseImage.height);

      const baseBox = {
        w: baseImage.width * baseScale,
        h: baseImage.height * baseScale
      };

      baseBox.x = (els.canvas.width - baseBox.w) / 2;
      baseBox.y = 635 - baseBox.h;

      ctx.drawImage(
        baseImage,
        Math.round(baseBox.x),
        Math.round(baseBox.y),
        Math.round(baseBox.w),
        Math.round(baseBox.h)
      );

      for (const instance of state.specials) {
        const asset = assetById(instance.assetId);
        if (!asset) continue;

        const image = await loadImage(assetUrl(asset));
        if (token !== renderToken) return;

        const rect = getSpecialRect(instance, image, baseBox);

        ctx.drawImage(
          image,
          Math.round(rect.x),
          Math.round(rect.y),
          Math.round(rect.w),
          Math.round(rect.h)
        );

        previewHitRegions.push({
          type: 'special',
          instanceId: instance.instanceId,
          x: rect.x,
          y: rect.y,
          w: rect.w,
          h: rect.h
        });
      }

      for (const type of DRAW_ORDER) {
        const asset = assetById(state.selected[type]);
        if (!asset) continue;

        const image = await loadImage(assetUrl(asset));
        if (token !== renderToken) return;

        const rect = getPartRect(type, image, baseBox);

        ctx.drawImage(
          image,
          Math.round(rect.x),
          Math.round(rect.y),
          Math.round(rect.w),
          Math.round(rect.h)
        );

        previewHitRegions.push({
          type,
          x: rect.x,
          y: rect.y,
          w: rect.w,
          h: rect.h
        });
      }

      updatePartSelectionBox();
    } catch (error) {
      console.error('Preview render failed', error);
    }
  }

  function updatePartSelectionBox() {
    const region = state.adjustType === 'special'
      ? previewHitRegions.find(
          (item) =>
            item.type === 'special' &&
            item.instanceId === state.activeSpecialId
        )
      : previewHitRegions.find((item) => item.type === state.adjustType);

    const hasTarget = state.adjustType === 'special'
      ? Boolean(getActiveSpecial())
      : Boolean(state.selected[state.adjustType]);

    if (!region || !hasTarget) {
      els.partSelectionBox.classList.add('hidden');
      return;
    }

    els.partSelectionBox.style.left = (region.x / els.canvas.width * 100) + '%';
    els.partSelectionBox.style.top = (region.y / els.canvas.height * 100) + '%';
    els.partSelectionBox.style.width = (region.w / els.canvas.width * 100) + '%';
    els.partSelectionBox.style.height = (region.h / els.canvas.height * 100) + '%';
    els.partSelectionBox.classList.remove('hidden');
  }

  function handleCanvasPartSelection(event) {
    if (!previewHitRegions.length) return;

    const bounds = els.canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * (els.canvas.width / bounds.width);
    const y = (event.clientY - bounds.top) * (els.canvas.height / bounds.height);

    for (let index = previewHitRegions.length - 1; index >= 0; index--) {
      const region = previewHitRegions[index];

      if (
        x >= region.x &&
        x <= region.x + region.w &&
        y >= region.y &&
        y <= region.y + region.h
      ) {
        setAdjustType(region.type, region.instanceId || null);
        updatePartSelectionBox();
        return;
      }
    }
  }

  function renderAll() {
    renderCompositionSlots();
    renderShelves();
    renderBatches();
    renderCombos();
    syncControls();
    renderPreview();
  }

  function averageCornerColor(data, width, height) {
    const sample = Math.max(4, Math.min(16, Math.floor(Math.min(width, height) * 0.03)));
    const points = [
      [0, 0],
      [width - sample, 0],
      [0, height - sample],
      [width - sample, height - sample]
    ];

    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;

    points.forEach(([sx, sy]) => {
      for (let y = sy; y < sy + sample; y += 2) {
        for (let x = sx; x < sx + sample; x += 2) {
          const i = (y * width + x) * 4;
          if (data[i + 3] < 20) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n++;
        }
      }
    });

    if (!n) return [255, 255, 255];
    return [r / n, g / n, b / n];
  }

  function colorDistance(data, index, bg) {
    const dr = data[index] - bg[0];
    const dg = data[index + 1] - bg[1];
    const db = data[index + 2] - bg[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function canvasHasTransparency(data, width, height) {
    const total = width * height;
    const step = Math.max(1, Math.floor(total / 50000));
    let transparent = 0;
    let sampled = 0;

    for (let p = 0; p < total; p += step) {
      sampled++;
      if (data[p * 4 + 3] < 100) transparent++;
    }

    return sampled > 0 && transparent / sampled > 0.002;
  }

  function cleanupCrop(canvas) {
    const cropCtx = canvas.getContext('2d', { willReadFrequently: true });
    const width = canvas.width;
    const height = canvas.height;
    const imageData = cropCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const bg = averageCornerColor(data, width, height);
    const hasTransparency = canvasHasTransparency(data, width, height);

    if (hasTransparency) return canvas;

    for (let i = 0; i < data.length; i += 4) {
      const distance = colorDistance(data, i, bg);

      if (distance <= 18) {
        data[i + 3] = 0;
      } else if (distance < 38) {
        data[i + 3] = Math.round(data[i + 3] * ((distance - 18) / 20));
      }
    }

    cropCtx.putImageData(imageData, 0, 0);
    return canvas;
  }

  async function cropImage(image, x0, y0, x1, y1, removeBackground) {
    const sx = Math.max(0, Math.floor(x0));
    const sy = Math.max(0, Math.floor(y0));
    const ex = Math.min(image.width, Math.ceil(x1));
    const ey = Math.min(image.height, Math.ceil(y1));
    const width = Math.max(1, ex - sx);
    const height = Math.max(1, ey - sy);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const cropCtx = canvas.getContext('2d', { willReadFrequently: true });
    cropCtx.drawImage(image, sx, sy, width, height, 0, 0, width, height);

    if (removeBackground) cleanupCrop(canvas);

    const blob = await new Promise((resolve, reject) => canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error('画像を保存できません。')), 'image/png'
    ));
    return { blob, width, height };
  }

  function extractVariant(image, startX, endX) {
    const width = Math.max(1, endX - startX);
    const height = image.height;

    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;

    const sourceCtx = source.getContext('2d', { willReadFrequently: true });
    sourceCtx.drawImage(image, startX, 0, width, height, 0, 0, width, height);

    const imageData = sourceCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const bg = averageCornerColor(data, width, height);
    const hasTransparency = canvasHasTransparency(data, width, height);

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    const threshold = 27;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const foreground = hasTransparency
          ? data[i + 3] > 22
          : data[i + 3] > 22 && colorDistance(data, i, bg) > threshold;

        if (!foreground) continue;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) {
      minX = 0;
      minY = 0;
      maxX = width - 1;
      maxY = height - 1;
    }

    const pad = Math.max(4, Math.floor(Math.max(width, height) * 0.015));

    return cropImage(
      image,
      startX + minX - pad,
      minY - pad,
      startX + maxX + 1 + pad,
      maxY + 1 + pad,
      true
    );
  }

  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('画像を開けません。')); };
      image.src = url;
    });
  }

  function buildKitSlotList(preset) {
    const list = [];

    TYPES.forEach((type) => {
      (preset.slots[type] || []).forEach((slot, index) => {
        list.push({
          type,
          slotIndex: index,
          x: slot.x,
          y: slot.y
        });
      });
    });

    return list;
  }

  function detectConnectedComponents(image) {
    const maxDimension = 900;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const detectCtx = canvas.getContext('2d', { willReadFrequently: true });
    detectCtx.drawImage(image, 0, 0, width, height);

    const imageData = detectCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const bg = averageCornerColor(data, width, height);
    const hasTransparency = canvasHasTransparency(data, width, height);
    const total = width * height;
    const mask = new Uint8Array(total);
    const threshold = 32;

    for (let p = 0; p < total; p++) {
      const i = p * 4;
      const foreground = hasTransparency
        ? data[i + 3] > 26
        : data[i + 3] > 26 && colorDistance(data, i, bg) > threshold;

      mask[p] = foreground ? 1 : 0;
    }

    const stack = new Int32Array(total);
    const components = [];
    const minArea = Math.max(8, Math.floor(total * 0.000015));

    for (let p = 0; p < total; p++) {
      if (!mask[p]) continue;

      let top = 0;
      stack[top++] = p;
      mask[p] = 0;

      let area = 0;
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;

      while (top > 0) {
        const current = stack[--top];
        const y = Math.floor(current / width);
        const x = current - y * width;

        area++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        if (x > 0) {
          const next = current - 1;
          if (mask[next]) {
            mask[next] = 0;
            stack[top++] = next;
          }
        }

        if (x + 1 < width) {
          const next = current + 1;
          if (mask[next]) {
            mask[next] = 0;
            stack[top++] = next;
          }
        }

        if (y > 0) {
          const next = current - width;
          if (mask[next]) {
            mask[next] = 0;
            stack[top++] = next;
          }
        }

        if (y + 1 < height) {
          const next = current + width;
          if (mask[next]) {
            mask[next] = 0;
            stack[top++] = next;
          }
        }
      }

      if (area < minArea) continue;

      components.push({
        area,
        minX,
        minY,
        maxX: maxX + 1,
        maxY: maxY + 1,
        cx: ((minX + maxX + 1) / 2) / width,
        cy: ((minY + maxY + 1) / 2) / height
      });
    }

    return {
      width,
      height,
      scaleX: image.width / width,
      scaleY: image.height / height,
      components
    };
  }

  function assignComponentsToKitSlots(detection, preset) {
    const slots = buildKitSlotList(preset);
    const groups = new Map();

    slots.forEach((slot) => {
      groups.set(slot.type + ':' + slot.slotIndex, {
        ...slot,
        components: []
      });
    });

    detection.components.forEach((component) => {
      let best = null;
      let bestDistance = Infinity;

      slots.forEach((slot) => {
        const dx = component.cx - slot.x;
        const dy = component.cy - slot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < bestDistance) {
          bestDistance = distance;
          best = slot;
        }
      });

      if (!best || bestDistance > preset.maxDistance) return;

      const key = best.type + ':' + best.slotIndex;
      groups.get(key).components.push(component);
    });

    return Array.from(groups.values());
  }

  async function makeCandidateFromGroup(image, detection, group, fileName, presetId) {
    if (!group.components.length) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let area = 0;

    group.components.forEach((component) => {
      minX = Math.min(minX, component.minX);
      minY = Math.min(minY, component.minY);
      maxX = Math.max(maxX, component.maxX);
      maxY = Math.max(maxY, component.maxY);
      area += component.area;
    });

    const rawW = maxX - minX;
    const rawH = maxY - minY;
    const padDetect = Math.max(4, Math.round(Math.max(rawW, rawH) * 0.035));

    minX = Math.max(0, minX - padDetect);
    minY = Math.max(0, minY - padDetect);
    maxX = Math.min(detection.width, maxX + padDetect);
    maxY = Math.min(detection.height, maxY + padDetect);

    const fullX0 = minX * detection.scaleX;
    const fullY0 = minY * detection.scaleY;
    const fullX1 = maxX * detection.scaleX;
    const fullY1 = maxY * detection.scaleY;

    const crop = await cropImage(image, fullX0, fullY0, fullX1, fullY1, true);

    return {
      type: group.type,
      slotIndex: group.slotIndex,
      label: ((KIT_PRESETS[presetId] && KIT_PRESETS[presetId].candidateLabel) || LABELS[group.type]) + ' ' + pad2(group.slotIndex + 1),
      blob: crop.blob,
      width: crop.width,
      height: crop.height,
      sourceKind: 'kit-sheet',
      sourcePreset: presetId,
      sourceFile: fileName,
      enabled: true,
      componentCount: group.components.length,
      area
    };
  }

  async function analyzePair(file) {
    const image = await fileToImage(file);
    const middle = Math.floor(image.width / 2);
    const [a, b] = await Promise.all([extractVariant(image, 0, middle), extractVariant(image, middle, image.width)]);

    state.detected = {
      kind: 'pair',
      fileName: file.name,
      sourceWidth: image.width,
      sourceHeight: image.height,
      variants: [a, b]
    };

    els.detectedA.src = candidateUrl(a.blob);
    els.detectedB.src = candidateUrl(b.blob);
    els.detectedAMeta.textContent = a.width + ' × ' + a.height + ' px';
    els.detectedBMeta.textContent = b.width + ' × ' + b.height + ' px';
    els.detectedPair.classList.remove('hidden');

    els.sourceStatus.textContent =
      file.name + ' / ' + image.width + '×' + image.height +
      ' → 左右2案を自動切り出ししました。';

    updateRegisterButton();
  }

  async function analyzeKit(file) {
    const image = await fileToImage(file);
    const presetId = els.kitPreset.value;
    const preset = KIT_PRESETS[presetId];

    if (!preset) throw new Error('Unknown kit preset');

    els.sourceStatus.textContent = 'Kit Sheetを解析しています…';

    const detection = detectConnectedComponents(image);
    const groups = assignComponentsToKitSlots(detection, preset);
    const candidates = [];
    for (const group of groups) {
      const candidate = await makeCandidateFromGroup(image, detection, group, file.name, presetId);
      if (candidate) candidates.push(candidate);
    }
    candidates.sort((a, b) => {
        const typeDiff = TYPES.indexOf(a.type) - TYPES.indexOf(b.type);
        if (typeDiff) return typeDiff;
        return a.slotIndex - b.slotIndex;
      });

    state.detected = {
      kind: 'kit',
      fileName: file.name,
      sourceWidth: image.width,
      sourceHeight: image.height,
      presetId,
      candidates
    };

    renderKitPreview();

    const expected = buildKitSlotList(preset).length;
    els.sourceStatus.textContent =
      file.name + ' / ' + image.width + '×' + image.height +
      ' → ' + candidates.length + ' / ' + expected + ' assets を検出しました。';

    updateRegisterButton();
  }

  async function analyzeSource(file) {
    releaseCandidates();
    state.detected = null;
    els.registerImport.disabled = true;
    els.detectedPair.classList.add('hidden');
    els.kitPreview.classList.add('hidden');
    els.sourceStatus.textContent = '画像を解析しています…';

    try {
      if (els.importMode.value === 'kit') {
        await analyzeKit(file);
      } else {
        await analyzePair(file);
      }
    } catch (error) {
      console.error(error);
      state.detected = null;
      els.sourceStatus.textContent = '画像を解析できませんでした。PNG / JPEG / WebP とシート形式を確認してください。';
      updateRegisterButton();
    }
  }

  function getExpectedCount(type, preset) {
    return (preset.slots[type] || []).length;
  }

  function renderKitPreview() {
    if (!state.detected || state.detected.kind !== 'kit') {
      els.kitPreview.classList.add('hidden');
      return;
    }

    const preset = KIT_PRESETS[state.detected.presetId];
    els.kitGroups.innerHTML = '';

    TYPES.forEach((type) => {
      const candidates = state.detected.candidates.filter((candidate) => candidate.type === type);
      const expected = getExpectedCount(type, preset);

      const section = document.createElement('section');
      section.className = 'kit-group';

      const head = document.createElement('div');
      head.className = 'kit-group-head';

      const title = document.createElement('strong');
      title.textContent = LABELS[type];

      const count = document.createElement('span');
      count.className = 'kit-count ' + (candidates.length === expected ? 'ok' : 'warn');
      count.textContent = candidates.length + ' / ' + expected;

      head.append(title, count);

      const grid = document.createElement('div');
      grid.className = 'kit-assets';

      candidates.forEach((candidate) => {
        const card = document.createElement('div');
        card.className = 'kit-candidate';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = candidate.enabled;
        checkbox.id = 'kit_' + type + '_' + candidate.slotIndex;

        const label = document.createElement('label');
        label.setAttribute('for', checkbox.id);

        const image = document.createElement('img');
        image.src = candidate.previewUrl || (candidate.previewUrl = candidateUrl(candidate.blob));
        image.alt = '';

        const info = document.createElement('div');
        info.className = 'kit-candidate-info';

        const strong = document.createElement('strong');
        strong.textContent = candidate.label;

        const meta = document.createElement('span');
        meta.textContent = candidate.width + '×' + candidate.height;

        info.append(strong, meta);
        label.append(image, info);

        checkbox.addEventListener('change', () => {
          candidate.enabled = checkbox.checked;
          updateKitSummary();
          updateRegisterButton();
        });

        card.append(checkbox, label);
        grid.appendChild(card);
      });

      section.append(head, grid);
      els.kitGroups.appendChild(section);
    });

    els.kitPreview.classList.remove('hidden');
    updateKitSummary();
  }

  function updateKitSummary() {
    if (!state.detected || state.detected.kind !== 'kit') return;

    const selected = state.detected.candidates.filter((candidate) => candidate.enabled).length;
    const total = state.detected.candidates.length;

    els.kitPreviewSummary.textContent =
      selected + ' selected / ' + total + ' detected';

    updateRegisterButton();
  }

  function updateRegisterButton() {
    if (!state.detected) {
      els.registerImport.disabled = true;
      els.registerImport.textContent = '棚へ登録';
      return;
    }

    if (state.detected.kind === 'pair') {
      els.registerImport.disabled = false;
      els.registerImport.textContent = 'A / B を棚へ登録';
      return;
    }

    const selected = state.detected.candidates.filter((candidate) => candidate.enabled).length;
    els.registerImport.disabled = selected === 0;
    els.registerImport.textContent = selected ? '選択した' + selected + '個を棚へ登録' : '棚へ登録';
  }

  async function registerDetectedPair() {
    if (!state.detected || state.detected.kind !== 'pair') return;

    const type = els.importType.value;
    const existing = byType(type).length;
    const pairNumber = Math.floor(existing / 2) + 1;
    const prefix = LABELS[type];
    const timestamp = Date.now();
    const createdAt = new Date().toISOString();
    const sourceBatchId = 'pair_' + timestamp;

    const assets = state.detected.variants.map((variant, index) => ({
      id: type + '_' + timestamp + '_' + (index === 0 ? 'a' : 'b'),
      type,
      variant: index === 0 ? 'A' : 'B',
      label: prefix + ' ' + pad2(pairNumber) + (index === 0 ? 'A' : 'B'),
      blob: variant.blob,
      width: variant.width,
      height: variant.height,
      sourceKind: 'pair',
      sourceBatchId,
      sourceFile: state.detected.fileName,
      sourceWidth: state.detected.sourceWidth,
      sourceHeight: state.detected.sourceHeight,
      createdAt
    }));

    await dbPutMany(assets);

    state.assets.push(...assets);

    if (type !== 'special') {
      state.selected[type] = assets[0].id;

      if (type !== 'base') setAdjustType(type);
    }

    saveState();
    renderAll();

    els.sourceStatus.textContent =
      assets[0].label + ' / ' + assets[1].label + ' を部品棚へ登録しました。';

    state.detected = null;
    releaseCandidates();
    els.detectedPair.classList.add('hidden');
    els.sourceInput.value = '';
  }

  async function registerDetectedKit() {
    if (!state.detected || state.detected.kind !== 'kit') return;

    const chosen = state.detected.candidates.filter((candidate) => candidate.enabled);
    if (!chosen.length) return;

    const timestamp = Date.now();
    const createdAt = new Date().toISOString();
    const sourceBatchId = 'kit_' + timestamp;
    const running = Object.fromEntries(TYPES.map((type) => [type, byType(type).length]));
    const addedByType = Object.fromEntries(TYPES.map((type) => [type, []]));

    const assets = chosen.map((candidate, index) => {
      running[candidate.type] += 1;

      return {
        id: candidate.type + '_kit_' + timestamp + '_' + pad2(index + 1),
        type: candidate.type,
        variant: null,
        label: LABELS[candidate.type] + ' ' + pad2(running[candidate.type]),
        blob: candidate.blob,
        width: candidate.width,
        height: candidate.height,
        sourceKind: 'kit-sheet',
        sourceBatchId,
        sourcePreset: candidate.sourcePreset,
        sourceFile: candidate.sourceFile,
        sourceSlotIndex: candidate.slotIndex,
        sourceWidth: state.detected.sourceWidth,
        sourceHeight: state.detected.sourceHeight,
        createdAt
      };
    });

    await dbPutMany(assets);
    assets.forEach((asset) => addedByType[asset.type].push(asset));

    state.assets.push(...assets);

    if (!state.selected.base && addedByType.base.length) {
      state.selected.base = addedByType.base[0].id;
    }

    if (!state.selected.noren && addedByType.noren.length) {
      state.selected.noren = addedByType.noren[0].id;
    }

    saveState();
    renderAll();

    els.sourceStatus.textContent =
      assets.length + '個のKit素材を部品棚へ登録しました。棚からクリックして切り貼りできます。';

    state.detected = null;
    releaseCandidates();
    els.kitPreview.classList.add('hidden');
    els.sourceInput.value = '';
  }

  async function registerCurrentImport() {
    if (!state.detected) return;

    els.registerImport.disabled = true;
    const before = els.registerImport.textContent;
    els.registerImport.textContent = '登録中…';

    try {
      if (state.detected.kind === 'kit') {
        await registerDetectedKit();
      } else {
        await registerDetectedPair();
      }
    } catch (error) {
      console.error(error);
      els.sourceStatus.textContent = '登録に失敗しました。ブラウザのストレージ設定を確認してください。';
    } finally {
      els.registerImport.textContent = before;
      updateRegisterButton();
    }
  }

  function syncImportMode() {
    releaseCandidates();
    const isKit = els.importMode.value === 'kit';

    els.pairTypeField.classList.toggle('hidden', isKit);
    els.kitPresetField.classList.toggle('hidden', !isKit);
    els.detectedPair.classList.add('hidden');
    els.kitPreview.classList.add('hidden');

    state.detected = null;
    els.sourceInput.value = '';
    const preset = KIT_PRESETS[els.kitPreset.value];
    els.sourceStatus.textContent = isKit
      ? ((preset ? preset.name : 'Sheet') + ' の画像を選んでください。')
      : '左右2案の画像を選んでください。';

    updateRegisterButton();
  }

  function setAllKitCandidates(enabled) {
    if (!state.detected || state.detected.kind !== 'kit') return;

    state.detected.candidates.forEach((candidate) => {
      candidate.enabled = enabled;
    });

    renderKitPreview();
  }

  function updateAdjustments() {
    const adjustment = currentAdjustment();
    if (!adjustment) return;

    adjustment.scale = Number(els.scale.value);
    adjustment.x = Number(els.x.value);
    adjustment.y = Number(els.y.value);

    saveState();
    syncControls();
    renderPreview();
  }

  function resetCurrentAdjustment() {
    const adjustment = currentAdjustment();
    if (!adjustment) return;

    adjustment.scale = 100;
    adjustment.x = 0;
    adjustment.y = 0;

    saveState();
    syncControls();
    renderPreview();
  }

  function resetAllAdjustments() {
    state.adjustments = blankAdjustments();

    state.specials.forEach((instance) => {
      instance.scale = 100;
      instance.x = 0;
      instance.y = 0;
    });

    saveState();
    syncControls();
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportAssetPng(asset) {
    let blob = asset.blob instanceof Blob ? asset.blob : dataUrlToBlob(asset.dataUrl);
    if (blob.type !== 'image/png') {
      const image = await loadImage(assetUrl({ ...asset, blob }));
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d').drawImage(image, 0, 0);
      blob = await new Promise((resolve, reject) => canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error('PNGを作成できません。')), 'image/png'
      ));
    }
    const label = String(asset.label || asset.type).replace(/[\\/:*?"<>|]+/g, '-').trim() || asset.type;
    downloadBlob(blob, label + '-' + asset.id + '.png');
  }

  function exportDraftPng() {
    if (!state.selected.base) return;

    els.canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'yumaniwa-shop-draft.png');
    }, 'image/png');
  }

  function exportRecipeJson() {
    const base = assetById(state.selected.base);
    if (!base) return;

    const parts = {};

    SINGLE_PART_TYPES.forEach((type) => {
      const asset = assetById(state.selected[type]);

      parts[type] = asset ? {
        id: asset.id,
        label: asset.label,
        sourceFile: asset.sourceFile,
        sourceKind: asset.sourceKind || null,
        sourcePreset: asset.sourcePreset || null
      } : null;
    });

    const specials = state.specials.map((instance, index) => {
      const asset = assetById(instance.assetId);

      return {
        instanceId: instance.instanceId,
        assetId: instance.assetId,
        label: asset ? asset.label : 'SPECIAL',
        sourceFile: asset ? asset.sourceFile : null,
        sourceKind: asset ? (asset.sourceKind || null) : null,
        sourcePreset: asset ? (asset.sourcePreset || null) : null,
        scale: Number(instance.scale),
        x: Number(instance.x),
        y: Number(instance.y),
        z: index
      };
    });

    const createdAt = new Date().toISOString();
    const referencedIds = [base.id, ...Object.values(parts).filter(Boolean).map((part) => part.id), ...specials.map((item) => item.assetId)];
    const dependencies = [...new Set(referencedIds)].map((id) => ({ kind: 'map-factory-asset', id }));
    const recipe = {
      version: 'yumaniwa-asset-0.7',
      createdAt,
      artifact: artifactMeta('map-composition', createdAt, dependencies, 'dot-cleanup'),
      base: {
        id: base.id,
        label: base.label,
        sourceFile: base.sourceFile,
        sourceKind: base.sourceKind || null,
        sourcePreset: base.sourcePreset || null
      },
      parts,
      specials,
      adjustments: JSON.parse(JSON.stringify(state.adjustments)),
      note: 'Draft composition before native pixel normalization.'
    };

    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'yumaniwa-shop-recipe.json');
  }

  function jsonBlob(value) {
    return new Blob([JSON.stringify(value)], { type: 'application/json' });
  }

  function imageExtension(blob) {
    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[blob.type];
    if (!extension) throw new Error('対応していない画像形式です。');
    return extension;
  }

  function clearPreparedBackup() {
    if (backupObjectUrl) URL.revokeObjectURL(backupObjectUrl);
    backupObjectUrl = null;
    backupFile = null;
    els.backupDownload.classList.add('hidden');
    els.backupShare.classList.add('hidden');
  }

  async function exportFullBackup() {
    els.exportBackup.disabled = true;
    els.restoreBackup.disabled = true;
    clearPreparedBackup();
    try {
      saveState();
      const createdAt = new Date().toISOString();
      const selectedAssets = [...state.assets];
      const entries = [];
      const records = selectedAssets.map((asset, index) => {
        const blob = asset.blob instanceof Blob ? asset.blob : dataUrlToBlob(asset.dataUrl);
        const file = 'assets/asset_' + String(index + 1).padStart(4, '0') + '.' + imageExtension(blob);
        const { blob: ignoredBlob, dataUrl: ignoredDataUrl, ...metadata } = asset;
        entries.push({ name: file, blob });
        return { ...metadata, file };
      });
      const manifest = {
        schema: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt, assetCount: records.length,
        artifact: artifactMeta('map-factory-backup', createdAt, [], 'map-factory-restore')
      };
      const data = { assets: records, state: JSON.parse(localStorage.getItem(STATE_KEY) || 'null') };
      els.backupStatus.textContent = 'バックアップを作成中… 画像 0 / ' + records.length;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const zip = await window.MapFactoryZip.create([
        { name: 'manifest.json', blob: jsonBlob(manifest) },
        { name: 'data.json', blob: jsonBlob(data) }, ...entries
      ], async (done) => {
        if (done > 2) {
          els.backupStatus.textContent = 'バックアップを作成中… 画像 ' + (done - 2) + ' / ' + records.length;
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      });
      const stamp = createdAt.slice(0, 16).replace(/[-:T]/g, '');
      const fileName = 'yumaniwa-map-factory-backup-' + stamp.slice(0, 8) + '-' + stamp.slice(8) + '.zip';
      backupFile = new File([zip], fileName, { type: 'application/zip' });
      backupObjectUrl = URL.createObjectURL(backupFile);
      els.backupDownload.href = backupObjectUrl;
      els.backupDownload.download = fileName;
      els.backupDownload.classList.remove('hidden');
      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [backupFile] })) {
        els.backupShare.classList.remove('hidden');
      }
      els.backupStatus.textContent = 'バックアップを作成しました ' + (zip.size / 1048576).toFixed(1) + ' MB。下の「ZIPを保存」をタップしてください。';
    } catch (error) {
      console.error('Backup export failed', error);
      els.backupStatus.textContent = error.message || 'バックアップの作成に失敗しました。';
    } finally {
      els.exportBackup.disabled = false;
      els.restoreBackup.disabled = false;
    }
  }

  function validateBackupState(saved) {
    if (saved !== null && (!saved || typeof saved !== 'object' || Array.isArray(saved))) throw new Error('バックアップの作業状態が不正です。');
    if (!saved) return;
    const verifySlot = (slot) => {
      if (!slot || typeof slot !== 'object' || Array.isArray(slot)) throw new Error('WORK SLOTの内容が不正です。');
      if (slot.selected !== undefined && (!slot.selected || typeof slot.selected !== 'object' || Array.isArray(slot.selected))) throw new Error('WORK SLOTの選択内容が不正です。');
      if (slot.specials !== undefined && !Array.isArray(slot.specials)) throw new Error('WORK SLOTのSPECIAL配置が不正です。');
    };
    verifySlot(saved);
    if (saved.compositions !== undefined && (!Array.isArray(saved.compositions) || saved.compositions.length > 100)) throw new Error('WORK SLOT一覧が不正です。');
    (saved.compositions || []).forEach(verifySlot);
  }

  function validateAssetRecords(records) {
    if (!Array.isArray(records) || records.length > 10000) throw new Error('バックアップの素材一覧が不正です。');
    const ids = new Set();
    for (const asset of records) {
      if (!asset || typeof asset !== 'object' || Array.isArray(asset) || typeof asset.id !== 'string' || !asset.id || ids.has(asset.id)) throw new Error('素材IDが空か重複しています。');
      if (!TYPES.includes(asset.type) || !Number.isFinite(asset.width) || asset.width <= 0 || !Number.isFinite(asset.height) || asset.height <= 0) throw new Error('素材の種類または画像サイズが不正です。');
      ids.add(asset.id);
    }
  }

  function validateStateReferences(saved, assets) {
    if (!saved) return;
    const types = new Map(assets.map((asset) => [asset.id, asset.type]));
    const checkSlot = (slot) => {
      for (const type of TYPES) {
        const id = slot.selected && slot.selected[type];
        if (id != null && types.get(id) !== type) throw new Error('選択中の素材がバックアップ内にありません。');
      }
      const ids = new Set();
      for (const special of slot.specials || []) {
        if (!special || types.get(special.assetId) !== 'special' ||
            (special.instanceId && ids.has(special.instanceId))) throw new Error('SPECIAL配置の素材参照が不正です。');
        if (special.instanceId) ids.add(special.instanceId);
      }
      if (slot.activeSpecialId && !ids.has(slot.activeSpecialId)) throw new Error('選択中のSPECIAL配置がありません。');
    };
    checkSlot(saved);
    const slotIds = new Set();
    for (const slot of saved.compositions || []) {
      checkSlot(slot);
      if (slot.id && slotIds.has(slot.id)) throw new Error('WORK SLOTのIDが重複しています。');
      if (slot.id) slotIds.add(slot.id);
    }
    if (saved.activeCompositionId && (saved.compositions || []).length && !slotIds.has(saved.activeCompositionId)) throw new Error('選択中のWORK SLOTがありません。');
  }

  async function verifyImage(blob, width, height) {
    if (blob.size === 0 || blob.size > 256 * 1024 * 1024) throw new Error('画像データのサイズが不正です。');
    const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    if (!({ 'image/png': png, 'image/jpeg': jpg, 'image/webp': webp })[blob.type]) throw new Error('画像ファイルの内容と拡張子が一致しません。');
    const image = await fileToImage(blob);
    if (image.width !== width || image.height !== height) throw new Error('画像の寸法がバックアップと一致しません。');
  }

  async function readBackup(file) {
    if (/\.json$/i.test(file.name)) {
      const backup = JSON.parse(await file.text());
      if (!backup || backup.format !== BACKUP_FORMAT || backup.version !== 1) throw new Error('対応していない旧JSONバックアップです。');
      validateBackupState(backup.state);
      validateAssetRecords(backup.assets);
      const assets = backup.assets.map((asset) => convertLegacyAsset(asset));
      for (const asset of assets) await verifyImage(asset.blob, asset.width, asset.height);
      validateStateReferences(backup.state, assets);
      return { state: backup.state, assets };
    }
    if (!/\.zip$/i.test(file.name)) throw new Error('ZIPまたは旧JSONバックアップを選んでください。');
    const files = await window.MapFactoryZip.read(file);
    if (!files.has('manifest.json') || !files.has('data.json')) throw new Error('manifest.jsonまたはdata.jsonがありません。');
    const manifest = JSON.parse(await files.get('manifest.json').text());
    if (!manifest || manifest.schema !== BACKUP_FORMAT || manifest.version !== BACKUP_VERSION || !Number.isInteger(manifest.assetCount)) throw new Error('対応していないZIPバックアップです。');
    const data = JSON.parse(await files.get('data.json').text());
    validateBackupState(data.state);
    validateAssetRecords(data.assets);
    if (manifest.assetCount !== data.assets.length || files.size !== data.assets.length + 2) throw new Error('ZIP内の素材数が一致しません。');
    const used = new Set();
    const assets = [];
    for (const record of data.assets) {
      const { file: path, ...metadata } = record;
      if (typeof path !== 'string' || !/^assets\/asset_[0-9]+\.(png|jpg|webp)$/.test(path) || used.has(path) || !files.has(path) || 'dataUrl' in metadata || 'blob' in metadata) throw new Error('必要な画像ファイルがありません。');
      used.add(path);
      const type = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[path.split('.').pop()];
      const blob = new Blob([files.get(path)], { type });
      await verifyImage(blob, record.width, record.height);
      assets.push({ ...metadata, blob });
    }
    validateStateReferences(data.state, assets);
    return { state: data.state, assets };
  }

  async function restoreFullBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    els.exportBackup.disabled = true;
    els.restoreBackup.disabled = true;
    els.backupStatus.textContent = 'バックアップを検証中…';
    try {
      const backup = await readBackup(file);
      if (!window.confirm('現在の部品棚と作業状態を置き換えて、' + backup.assets.length + '個の素材を復元します。復元前に現在のバックアップを保存しましたか？')) {
        els.backupStatus.textContent = '復元をキャンセルしました。'; return;
      }
      const previousState = localStorage.getItem(STATE_KEY);
      try {
        if (backup.state === null) localStorage.removeItem(STATE_KEY);
        else localStorage.setItem(STATE_KEY, JSON.stringify(backup.state));
        await dbReplaceAll(backup.assets);
      } catch (error) {
        if (previousState === null) localStorage.removeItem(STATE_KEY); else localStorage.setItem(STATE_KEY, previousState);
        throw error;
      }
      releaseAssetUrls(state.assets.map((asset) => asset.id));
      state.assets = backup.assets;
      loadSavedState();
      normalizeCompositionReferences();
      saveState();
      renderAll();
      els.backupStatus.textContent = backup.assets.length + '個の素材と作業状態を復元しました。';
    } catch (error) {
      console.error('Backup restore failed', error);
      els.backupStatus.textContent = error instanceof SyntaxError ? 'JSONを読み取れません。バックアップファイルを確認してください。' : (error.message || '復元に失敗しました。');
    } finally {
      event.target.value = '';
      els.exportBackup.disabled = false;
      els.restoreBackup.disabled = false;
    }
  }

  function normalizeCompositionReferences() {
    const validAssetIds = new Set(state.assets.map((asset) => asset.id));
    state.compositions.forEach((slot) => {
      TYPES.forEach((type) => { if (slot.selected[type] && !validAssetIds.has(slot.selected[type])) slot.selected[type] = null; });
      slot.specials = cloneSpecials(slot.specials).filter((instance) => validAssetIds.has(instance.assetId));
      slot.activeSpecialId = normalizeActiveSpecialId(slot.specials, slot.activeSpecialId);
      if (slot.adjustType === 'special' && !slot.activeSpecialId) slot.adjustType = 'noren';
    });
    applyComposition(getActiveComposition());
  }

  function syncPromptMode() {
    const mode = els.promptMode.value;
    const isKit = mode === 'kit';

    els.promptTypeField.classList.toggle('hidden', isKit);

    if (isKit) {
      els.identity.disabled = false;

      if (els.identity.value === 'neutral') {
        els.identity.value = 'craft-cola';
      }
    }

    buildPrompt();
  }

  function buildPrompt() {
    const mode = els.promptMode.value;
    let identityId = els.identity.value;

    if (mode === 'kit') {
      const master = window.YUMANIWA_KIT_MASTER || '';
      const identities = window.YUMANIWA_KIT_IDENTITIES || {};

      if (!identities[identityId]) {
        identityId = 'craft-cola';
        els.identity.value = identityId;
      }

      els.identity.disabled = false;

      const identity = identities[identityId] || { text: '' };

      els.promptOutput.value =
        master + (identity.text ? '\n\n\n' + identity.text : '');

      return;
    }

    const masters = window.YUMANIWA_SOURCE_MASTERS || {};
    const identities = window.YUMANIWA_IDENTITIES || {};
    const type = els.promptType.value;

    if (type === 'base') {
      identityId = 'neutral';
      els.identity.value = 'neutral';
      els.identity.disabled = true;
    } else {
      els.identity.disabled = false;
    }

    const master = masters[type] || '';
    const identity = identities[identityId] || identities.neutral || { text: '' };

    els.promptOutput.value =
      master + (identity.text ? '\n\n\n' + identity.text : '');
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(els.promptOutput.value);
      const before = els.copyPrompt.textContent;
      els.copyPrompt.textContent = 'Copied';

      setTimeout(() => {
        els.copyPrompt.textContent = before;
      }, 1200);
    } catch (_) {
      els.promptOutput.select();
      document.execCommand('copy');
    }
  }

  function bindEvents() {
    els.canvas.addEventListener('click', handleCanvasPartSelection);

    els.importMode.addEventListener('change', syncImportMode);

    els.kitPreset.addEventListener('change', () => {
      const file = els.sourceInput.files && els.sourceInput.files[0];

      if (els.importMode.value === 'kit' && file) {
        analyzeSource(file);
        return;
      }

      if (els.importMode.value === 'kit') {
        const preset = KIT_PRESETS[els.kitPreset.value];
        els.sourceStatus.textContent =
          (preset ? preset.name : 'Sheet') + ' の画像を選んでください。';
      }
    });

    els.sourceInput.addEventListener('change', () => {
      const file = els.sourceInput.files && els.sourceInput.files[0];
      if (file) analyzeSource(file);
    });

    els.registerImport.addEventListener('click', registerCurrentImport);
    els.selectAllKit.addEventListener('click', () => setAllKitCandidates(true));
    els.clearKitSelection.addEventListener('click', () => setAllKitCandidates(false));

    els.adjustType.addEventListener('change', () => {
      setAdjustType(els.adjustType.value);
    });

    [els.scale, els.x, els.y].forEach((input) => {
      input.addEventListener('input', updateAdjustments);
    });

    els.resetAdjust.addEventListener('click', resetCurrentAdjustment);

    els.specialBackward.addEventListener('click', () => moveActiveSpecial(-1));
    els.specialForward.addEventListener('click', () => moveActiveSpecial(1));
    els.specialDuplicate.addEventListener('click', duplicateActiveSpecial);
    els.specialRemove.addEventListener('click', removeActiveSpecial);

    els.clearComposition.addEventListener('click', () => {
      state.selected = blankSelected();
      state.adjustments = blankAdjustments();
      state.specials = [];
      state.activeSpecialId = null;
      state.adjustType = 'noren';
      saveState();
      renderAll();
    });

    els.exportPng.addEventListener('click', exportDraftPng);
    els.exportBackup.addEventListener('click', exportFullBackup);
    els.restoreBackup.addEventListener('click', () => els.backupFile.click());
    els.backupFile.addEventListener('change', restoreFullBackup);
    els.backupShare.addEventListener('click', () => {
      if (!backupFile) return;
      navigator.share({ files: [backupFile], title: 'Map Factory backup' }).catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Backup share failed', error);
          els.backupStatus.textContent = '共有できませんでした。「ZIPを保存」をお試しください。';
        }
      });
    });
    window.addEventListener('pagehide', clearPreparedBackup);
    els.exportJson.addEventListener('click', exportRecipeJson);

    els.togglePrompt.addEventListener('click', () => {
      const opening = els.promptPanel.classList.contains('hidden');
      els.promptPanel.classList.toggle('hidden');
      els.togglePrompt.textContent = opening ? 'Promptを閉じる' : 'Promptを開く';

      if (opening) buildPrompt();
    });

    els.promptMode.addEventListener('change', syncPromptMode);
    els.promptType.addEventListener('change', buildPrompt);
    els.identity.addEventListener('change', buildPrompt);
    els.copyPrompt.addEventListener('click', copyPrompt);
  }

  async function init() {
    loadSavedState();
    syncControls();
    bindEvents();
    syncPromptMode();
    syncImportMode();

    try {
      db = await openDatabase();
      state.assets = await dbGetAll();
      const legacy = state.assets.filter((asset) => !(asset.blob instanceof Blob) && typeof asset.dataUrl === 'string');
      if (legacy.length) {
        try {
          const migrated = legacy.map(convertLegacyAsset);
          await dbPutMany(migrated);
          const byId = new Map(migrated.map((asset) => [asset.id, asset]));
          state.assets = state.assets.map((asset) => byId.get(asset.id) || asset);
        } catch (error) {
          console.error('Legacy asset migration failed; old assets are still readable', error);
          els.backupStatus.textContent = '一部の素材をBlob形式に移行できませんでした。バックアップは作成できます。';
        }
      }
      els.exportBackup.disabled = false;
      els.restoreBackup.disabled = false;

      normalizeCompositionReferences();
      saveState();
      renderAll();
    } catch (error) {
      console.error('IndexedDB unavailable', error);
      els.sourceStatus.textContent =
        '部品棚を開けませんでした。ブラウザのストレージ設定を確認してください。';
      renderAll();
    }
  }

  init();
})();
