(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const DB_NAME = 'yumaniwa-map-factory-v02';
  const STORE_NAME = 'assets';
  const STATE_KEY = 'yumaniwa-map-factory-v02-state';

  const TYPES = ['base', 'noren', 'sign', 'lantern', 'board', 'special'];
  const PART_TYPES = TYPES.filter((type) => type !== 'base');
  const DRAW_ORDER = ['special', 'noren', 'sign', 'lantern', 'board'];

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

  let db = null;
  let renderToken = 0;

  function blankSelected() {
    return Object.fromEntries(TYPES.map((type) => [type, null]));
  }

  function blankAdjustments() {
    return Object.fromEntries(PART_TYPES.map((type) => [
      type,
      { scale: 100, x: 0, y: 0 }
    ]));
  }

  const state = {
    assets: [],
    selected: blankSelected(),
    adjustments: blankAdjustments(),
    adjustType: 'noren',
    detected: null
  };

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function loadSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
      if (saved.selected) state.selected = { ...state.selected, ...saved.selected };

      if (saved.adjustments) {
        if (typeof saved.adjustments.scale === 'number') {
          state.adjustments.noren = {
            scale: saved.adjustments.scale,
            x: Number(saved.adjustments.x || 0),
            y: Number(saved.adjustments.y || 0)
          };
        } else {
          PART_TYPES.forEach((type) => {
            if (saved.adjustments[type]) {
              state.adjustments[type] = {
                ...state.adjustments[type],
                ...saved.adjustments[type]
              };
            }
          });
        }
      }

      if (PART_TYPES.includes(saved.adjustType)) state.adjustType = saved.adjustType;
    } catch (_) {}
  }

  function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      selected: state.selected,
      adjustments: state.adjustments,
      adjustType: state.adjustType
    }));
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

  function dbPut(asset) {
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(asset);
      request.onsuccess = () => resolve(asset);
      request.onerror = () => reject(request.error);
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

  function byType(type) {
    return state.assets
      .filter((asset) => asset.type === type)
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }

  function assetById(id) {
    return state.assets.find((asset) => asset.id === id) || null;
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
    return state.adjustments[state.adjustType];
  }

  function syncControls() {
    els.adjustType.value = state.adjustType;
    const adjustment = currentAdjustment();
    els.scale.value = String(adjustment.scale);
    els.x.value = String(adjustment.x);
    els.y.value = String(adjustment.y);
    els.scaleValue.textContent = adjustment.scale + '%';
    els.xValue.textContent = String(adjustment.x);
    els.yValue.textContent = String(adjustment.y);
  }

  function setAdjustType(type) {
    if (!PART_TYPES.includes(type)) return;
    state.adjustType = type;
    saveState();
    syncControls();
  }

  function makeAssetCard(asset) {
    const wrap = document.createElement('div');
    wrap.className = 'asset-item';

    const button = document.createElement('button');
    button.className = 'asset-select' + (state.selected[asset.type] === asset.id ? ' active' : '');
    button.type = 'button';

    const image = document.createElement('img');
    image.className = 'asset-thumb';
    image.src = asset.dataUrl;
    image.alt = '';

    const caption = document.createElement('span');
    caption.className = 'asset-caption';

    const strong = document.createElement('strong');
    strong.textContent = asset.label;

    const size = document.createElement('span');
    size.textContent = asset.width + '×' + asset.height;

    caption.append(strong, size);
    button.append(image, caption);

    button.addEventListener('click', () => {
      const isActive = state.selected[asset.type] === asset.id;

      if (asset.type !== 'base' && isActive) {
        state.selected[asset.type] = null;
      } else {
        state.selected[asset.type] = asset.id;
      }

      if (asset.type !== 'base') setAdjustType(asset.type);
      saveState();
      renderAll();
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
      state.assets = state.assets.filter((item) => item.id !== asset.id);

      if (state.selected[asset.type] === asset.id) {
        state.selected[asset.type] = null;
      }

      saveState();
      renderAll();
    });

    wrap.append(button, remove);
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

    TYPES.forEach((type) => {
      if (state.selected[type] && idSet.has(state.selected[type])) {
        state.selected[type] = null;
      }
    });

    imageCache.clear();
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

  async function renderPreview() {
    const token = ++renderToken;
    ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
    ctx.imageSmoothingEnabled = false;

    const baseAsset = assetById(state.selected.base);

    els.empty.classList.toggle('hidden', Boolean(baseAsset));
    els.exportPng.disabled = !baseAsset;
    els.exportJson.disabled = !baseAsset;

    if (!baseAsset) return;

    try {
      const baseImage = await loadImage(baseAsset.dataUrl);
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

      for (const type of DRAW_ORDER) {
        const asset = assetById(state.selected[type]);
        if (!asset) continue;

        const image = await loadImage(asset.dataUrl);
        if (token !== renderToken) return;

        const rect = getPartRect(type, image, baseBox);

        ctx.drawImage(
          image,
          Math.round(rect.x),
          Math.round(rect.y),
          Math.round(rect.w),
          Math.round(rect.h)
        );
      }
    } catch (error) {
      console.error('Preview render failed', error);
    }
  }

  function renderAll() {
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

  function cropImage(image, x0, y0, x1, y1, removeBackground) {
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

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width,
      height
    };
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
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);

      reader.onload = () => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = reader.result;
      };

      reader.readAsDataURL(file);
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

  function makeCandidateFromGroup(image, detection, group, fileName, presetId) {
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

    const crop = cropImage(image, fullX0, fullY0, fullX1, fullY1, true);

    return {
      type: group.type,
      slotIndex: group.slotIndex,
      label: LABELS[group.type] + ' ' + pad2(group.slotIndex + 1),
      dataUrl: crop.dataUrl,
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
    const a = extractVariant(image, 0, middle);
    const b = extractVariant(image, middle, image.width);

    state.detected = {
      kind: 'pair',
      fileName: file.name,
      sourceWidth: image.width,
      sourceHeight: image.height,
      variants: [a, b]
    };

    els.detectedA.src = a.dataUrl;
    els.detectedB.src = b.dataUrl;
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
    const candidates = groups
      .map((group) => makeCandidateFromGroup(image, detection, group, file.name, presetId))
      .filter(Boolean)
      .sort((a, b) => {
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
        image.src = candidate.dataUrl;
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
      dataUrl: variant.dataUrl,
      width: variant.width,
      height: variant.height,
      sourceKind: 'pair',
      sourceBatchId,
      sourceFile: state.detected.fileName,
      sourceWidth: state.detected.sourceWidth,
      sourceHeight: state.detected.sourceHeight,
      createdAt
    }));

    for (const asset of assets) await dbPut(asset);

    state.assets.push(...assets);
    state.selected[type] = assets[0].id;

    if (type !== 'base') setAdjustType(type);

    saveState();
    renderAll();

    els.sourceStatus.textContent =
      assets[0].label + ' / ' + assets[1].label + ' を部品棚へ登録しました。';

    state.detected = null;
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
        dataUrl: candidate.dataUrl,
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

    for (const asset of assets) {
      await dbPut(asset);
      addedByType[asset.type].push(asset);
    }

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
    const isKit = els.importMode.value === 'kit';

    els.pairTypeField.classList.toggle('hidden', isKit);
    els.kitPresetField.classList.toggle('hidden', !isKit);
    els.detectedPair.classList.add('hidden');
    els.kitPreview.classList.add('hidden');

    state.detected = null;
    els.sourceInput.value = '';
    els.sourceStatus.textContent = isKit
      ? 'Identity Kit Sheet v1 を選んでください。1枚から6カテゴリをまとめて仕入れます。'
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
    adjustment.scale = Number(els.scale.value);
    adjustment.x = Number(els.x.value);
    adjustment.y = Number(els.y.value);

    saveState();
    syncControls();
    renderPreview();
  }

  function resetCurrentAdjustment() {
    state.adjustments[state.adjustType] = { scale: 100, x: 0, y: 0 };
    saveState();
    syncControls();
    renderPreview();
  }

  function resetAllAdjustments() {
    state.adjustments = blankAdjustments();
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

    PART_TYPES.forEach((type) => {
      const asset = assetById(state.selected[type]);

      parts[type] = asset ? {
        id: asset.id,
        label: asset.label,
        sourceFile: asset.sourceFile,
        sourceKind: asset.sourceKind || null,
        sourcePreset: asset.sourcePreset || null
      } : null;
    });

    const recipe = {
      version: 'yumaniwa-asset-0.5',
      createdAt: new Date().toISOString(),
      base: {
        id: base.id,
        label: base.label,
        sourceFile: base.sourceFile,
        sourceKind: base.sourceKind || null,
        sourcePreset: base.sourcePreset || null
      },
      parts,
      adjustments: JSON.parse(JSON.stringify(state.adjustments)),
      note: 'Draft composition before native pixel normalization.'
    };

    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'yumaniwa-shop-recipe.json');
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
    els.importMode.addEventListener('change', syncImportMode);

    els.sourceInput.addEventListener('change', () => {
      const file = els.sourceInput.files && els.sourceInput.files[0];
      if (file) analyzeSource(file);
    });

    els.registerImport.addEventListener('click', registerCurrentImport);
    els.selectAllKit.addEventListener('click', () => setAllKitCandidates(true));
    els.clearKitSelection.addEventListener('click', () => setAllKitCandidates(false));

    els.adjustType.addEventListener('change', () => {
      state.adjustType = els.adjustType.value;
      saveState();
      syncControls();
    });

    [els.scale, els.x, els.y].forEach((input) => {
      input.addEventListener('input', updateAdjustments);
    });

    els.resetAdjust.addEventListener('click', resetCurrentAdjustment);

    els.clearComposition.addEventListener('click', () => {
      state.selected = blankSelected();
      resetAllAdjustments();
      saveState();
      renderAll();
    });

    els.exportPng.addEventListener('click', exportDraftPng);
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

      TYPES.forEach((type) => {
        if (state.selected[type] && !assetById(state.selected[type])) {
          state.selected[type] = null;
        }
      });

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