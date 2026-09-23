(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const DB_NAME = 'yumaniwa-map-factory-v02';
  const STORE_NAME = 'assets';
  const STATE_KEY = 'yumaniwa-map-factory-v02-state';

  const els = {
    canvas: $('previewCanvas'),
    empty: $('previewEmpty'),
    baseShelf: $('baseShelf'),
    norenShelf: $('norenShelf'),
    assetCount: $('assetCount'),
    comboStrip: $('comboStrip'),
    scale: $('norenScale'),
    x: $('norenX'),
    y: $('norenY'),
    scaleValue: $('scaleValue'),
    xValue: $('xValue'),
    yValue: $('yValue'),
    resetAdjust: $('resetAdjustBtn'),
    clearComposition: $('clearCompositionBtn'),
    exportPng: $('exportPngBtn'),
    exportJson: $('exportJsonBtn'),
    importType: $('importType'),
    sourceInput: $('sourceFileInput'),
    registerBoth: $('registerBothBtn'),
    sourceStatus: $('sourceStatus'),
    detectedPair: $('detectedPair'),
    detectedA: $('detectedA'),
    detectedB: $('detectedB'),
    detectedAMeta: $('detectedAMeta'),
    detectedBMeta: $('detectedBMeta'),
    togglePrompt: $('togglePromptBtn'),
    promptPanel: $('promptPanel'),
    promptType: $('promptType'),
    identity: $('identitySelect'),
    promptOutput: $('promptOutput'),
    copyPrompt: $('copyPromptBtn')
  };

  const ctx = els.canvas.getContext('2d');
  const imageCache = new Map();

  let db = null;
  let renderToken = 0;

  const state = {
    assets: [],
    selected: { base: null, noren: null },
    adjustments: { scale: 100, x: 0, y: 0 },
    detected: null
  };

  function loadSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
      if (saved.selected) state.selected = { ...state.selected, ...saved.selected };
      if (saved.adjustments) state.adjustments = { ...state.adjustments, ...saved.adjustments };
    } catch (_) {}
  }

  function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      selected: state.selected,
      adjustments: state.adjustments
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

  function syncControls() {
    els.scale.value = String(state.adjustments.scale);
    els.x.value = String(state.adjustments.x);
    els.y.value = String(state.adjustments.y);
    els.scaleValue.value = state.adjustments.scale + '%';
    els.scaleValue.textContent = state.adjustments.scale + '%';
    els.xValue.value = String(state.adjustments.x);
    els.xValue.textContent = String(state.adjustments.x);
    els.yValue.value = String(state.adjustments.y);
    els.yValue.textContent = String(state.adjustments.y);
  }

  function makeAssetCard(asset) {
    const wrap = document.createElement('div');
    wrap.className = 'asset-item';

    const button = document.createElement('button');
    button.className = 'asset-select' + (state.selected[asset.type] === asset.id ? ' active' : '');
    button.type = 'button';
    button.innerHTML = `
      <img class="asset-thumb" src="${asset.dataUrl}" alt="">
      <span class="asset-caption">
        <strong>${asset.label}</strong>
        <span>${asset.width}×${asset.height}</span>
      </span>
    `;
    button.addEventListener('click', () => {
      state.selected[asset.type] = asset.id;
      saveState();
      renderShelves();
      renderCombos();
      renderPreview();
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
      if (state.selected[asset.type] === asset.id) state.selected[asset.type] = null;
      saveState();
      renderAll();
    });

    wrap.append(button, remove);
    return wrap;
  }

  function renderShelf(type, element) {
    const assets = byType(type);
    element.innerHTML = '';
    if (!assets.length) {
      const empty = document.createElement('div');
      empty.className = 'asset-empty';
      empty.textContent = type === 'base'
        ? 'BASEをまだ仕入れていません'
        : 'NORENをまだ仕入れていません';
      element.appendChild(empty);
      return;
    }
    assets.forEach((asset) => element.appendChild(makeAssetCard(asset)));
  }

  function renderShelves() {
    renderShelf('base', els.baseShelf);
    renderShelf('noren', els.norenShelf);
    els.assetCount.textContent = String(state.assets.length);
  }

  function renderCombos() {
    const bases = byType('base').slice(0, 2);
    const norens = byType('noren').slice(0, 2);
    els.comboStrip.innerHTML = '';

    if (!bases.length) return;

    if (!norens.length) {
      bases.forEach((base, baseIndex) => {
        const chip = document.createElement('button');
        chip.className = 'combo-chip' + (state.selected.base === base.id && !state.selected.noren ? ' active' : '');
        chip.textContent = 'B' + (baseIndex + 1);
        chip.addEventListener('click', () => {
          state.selected.base = base.id;
          state.selected.noren = null;
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

  async function renderPreview() {
    const token = ++renderToken;
    ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
    ctx.imageSmoothingEnabled = false;

    const baseAsset = assetById(state.selected.base);
    const norenAsset = assetById(state.selected.noren);

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
      const baseW = baseImage.width * baseScale;
      const baseH = baseImage.height * baseScale;
      const baseX = (els.canvas.width - baseW) / 2;
      const baseY = 635 - baseH;

      ctx.drawImage(baseImage, Math.round(baseX), Math.round(baseY), Math.round(baseW), Math.round(baseH));

      if (!norenAsset) return;

      const norenImage = await loadImage(norenAsset.dataUrl);
      if (token !== renderToken) return;

      const userScale = state.adjustments.scale / 100;
      const targetW = baseW * 0.56 * userScale;
      const targetH = baseH * 0.30 * userScale;
      const norenScale = Math.min(targetW / norenImage.width, targetH / norenImage.height);
      const norenW = norenImage.width * norenScale;
      const norenH = norenImage.height * norenScale;

      const offsetX = (state.adjustments.x / 100) * baseW;
      const offsetY = (state.adjustments.y / 100) * baseH;
      const norenX = baseX + baseW * 0.5 - norenW * 0.5 + offsetX;
      const norenY = baseY + baseH * 0.42 + offsetY;

      ctx.drawImage(norenImage, Math.round(norenX), Math.round(norenY), Math.round(norenW), Math.round(norenH));
    } catch (error) {
      console.error('Preview render failed', error);
    }
  }

  function renderAll() {
    renderShelves();
    renderCombos();
    syncControls();
    renderPreview();
  }

  function averageCornerColor(data, width, height) {
    const sample = Math.max(4, Math.min(14, Math.floor(Math.min(width, height) * 0.03)));
    const points = [
      [0, 0],
      [width - sample, 0],
      [0, height - sample],
      [width - sample, height - sample]
    ];
    let r = 0, g = 0, b = 0, n = 0;
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

    let transparentPixels = 0;
    const sampleStep = Math.max(1, Math.floor((width * height) / 50000));
    for (let p = 0; p < width * height; p += sampleStep) {
      if (data[p * 4 + 3] < 100) transparentPixels++;
    }
    const sampled = Math.ceil((width * height) / sampleStep);
    const hasTransparency = transparentPixels / sampled > 0.002;

    let minX = width, minY = height, maxX = -1, maxY = -1;
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
      minX = 0; minY = 0; maxX = width - 1; maxY = height - 1;
    }

    const pad = Math.max(4, Math.floor(Math.max(width, height) * 0.015));
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const crop = document.createElement('canvas');
    crop.width = cropW;
    crop.height = cropH;
    const cropCtx = crop.getContext('2d', { willReadFrequently: true });
    cropCtx.drawImage(source, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    if (!hasTransparency) {
      const cropData = cropCtx.getImageData(0, 0, cropW, cropH);
      const pixels = cropData.data;
      for (let i = 0; i < pixels.length; i += 4) {
        const distance = colorDistance(pixels, i, bg);
        if (distance <= 18) {
          pixels[i + 3] = 0;
        } else if (distance < 38) {
          pixels[i + 3] = Math.round(pixels[i + 3] * ((distance - 18) / 20));
        }
      }
      cropCtx.putImageData(cropData, 0, 0);
    }

    return {
      dataUrl: crop.toDataURL('image/png'),
      width: cropW,
      height: cropH
    };
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

  async function analyzeSource(file) {
    els.registerBoth.disabled = true;
    els.sourceStatus.textContent = '画像を解析しています…';
    els.detectedPair.classList.add('hidden');

    try {
      const image = await fileToImage(file);
      const middle = Math.floor(image.width / 2);
      const a = extractVariant(image, 0, middle);
      const b = extractVariant(image, middle, image.width);

      state.detected = {
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
      els.registerBoth.disabled = false;
      els.sourceStatus.textContent =
        file.name + ' / ' + image.width + '×' + image.height +
        ' → 左右2案を自動切り出ししました。';
    } catch (error) {
      console.error(error);
      state.detected = null;
      els.sourceStatus.textContent = '画像を読み込めませんでした。PNG / JPEG / WebP を確認してください。';
    }
  }

  async function registerDetectedPair() {
    if (!state.detected) return;
    const type = els.importType.value;
    const existing = byType(type).length;
    const pairNumber = Math.floor(existing / 2) + 1;
    const prefix = type.toUpperCase();
    const timestamp = Date.now();
    const createdAt = new Date().toISOString();

    const assets = state.detected.variants.map((variant, index) => ({
      id: type + '_' + timestamp + '_' + (index === 0 ? 'a' : 'b'),
      type,
      variant: index === 0 ? 'A' : 'B',
      label: prefix + ' ' + String(pairNumber).padStart(2, '0') + (index === 0 ? 'A' : 'B'),
      dataUrl: variant.dataUrl,
      width: variant.width,
      height: variant.height,
      sourceFile: state.detected.fileName,
      sourceWidth: state.detected.sourceWidth,
      sourceHeight: state.detected.sourceHeight,
      createdAt
    }));

    els.registerBoth.disabled = true;
    els.registerBoth.textContent = '登録中…';

    try {
      for (const asset of assets) await dbPut(asset);
      state.assets.push(...assets);
      state.selected[type] = assets[0].id;
      saveState();
      renderAll();
      els.sourceStatus.textContent = assets[0].label + ' / ' + assets[1].label + ' を部品棚へ登録しました。';
    } catch (error) {
      console.error(error);
      els.sourceStatus.textContent = '登録に失敗しました。ブラウザのストレージ設定を確認してください。';
    } finally {
      els.registerBoth.disabled = false;
      els.registerBoth.textContent = 'A / B を棚へ登録';
    }
  }

  function updateAdjustments() {
    state.adjustments.scale = Number(els.scale.value);
    state.adjustments.x = Number(els.x.value);
    state.adjustments.y = Number(els.y.value);
    saveState();
    syncControls();
    renderPreview();
  }

  function resetAdjustments() {
    state.adjustments = { scale: 100, x: 0, y: 0 };
    saveState();
    syncControls();
    renderPreview();
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
    const noren = assetById(state.selected.noren);
    if (!base) return;

    const recipe = {
      version: 'yumaniwa-asset-0.2',
      createdAt: new Date().toISOString(),
      base: base ? {
        id: base.id,
        label: base.label,
        sourceFile: base.sourceFile
      } : null,
      parts: {
        noren: noren ? {
          id: noren.id,
          label: noren.label,
          sourceFile: noren.sourceFile
        } : null
      },
      adjustments: {
        noren: { ...state.adjustments }
      },
      note: 'Draft composition before native pixel normalization.'
    };

    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'yumaniwa-shop-recipe.json');
  }

  function buildPrompt() {
    const masters = window.YUMANIWA_SOURCE_MASTERS || {};
    const identities = window.YUMANIWA_IDENTITIES || {};
    const type = els.promptType.value;
    let identityId = els.identity.value;

    if (type === 'base') {
      identityId = 'neutral';
      els.identity.value = 'neutral';
      els.identity.disabled = true;
    } else {
      els.identity.disabled = false;
    }

    const master = masters[type] || '';
    const identity = identities[identityId] || identities.neutral || { text: '' };
    els.promptOutput.value = master + (identity.text ? '\n\n\n' + identity.text : '');
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(els.promptOutput.value);
      const before = els.copyPrompt.textContent;
      els.copyPrompt.textContent = 'Copied';
      setTimeout(() => { els.copyPrompt.textContent = before; }, 1200);
    } catch (_) {
      els.promptOutput.select();
      document.execCommand('copy');
    }
  }

  function bindEvents() {
    els.sourceInput.addEventListener('change', () => {
      const file = els.sourceInput.files && els.sourceInput.files[0];
      if (file) analyzeSource(file);
    });

    els.registerBoth.addEventListener('click', registerDetectedPair);

    [els.scale, els.x, els.y].forEach((input) => {
      input.addEventListener('input', updateAdjustments);
    });

    els.resetAdjust.addEventListener('click', resetAdjustments);

    els.clearComposition.addEventListener('click', () => {
      state.selected = { base: null, noren: null };
      resetAdjustments();
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

    els.promptType.addEventListener('change', buildPrompt);
    els.identity.addEventListener('change', buildPrompt);
    els.copyPrompt.addEventListener('click', copyPrompt);
  }

  async function init() {
    loadSavedState();
    syncControls();
    bindEvents();
    buildPrompt();

    try {
      db = await openDatabase();
      state.assets = await dbGetAll();

      if (state.selected.base && !assetById(state.selected.base)) state.selected.base = null;
      if (state.selected.noren && !assetById(state.selected.noren)) state.selected.noren = null;

      saveState();
      renderAll();
    } catch (error) {
      console.error('IndexedDB unavailable', error);
      els.sourceStatus.textContent = '部品棚を開けませんでした。ブラウザのストレージ設定を確認してください。';
      renderAll();
    }
  }

  init();
})();