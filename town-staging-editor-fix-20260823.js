// ==========================================
// 湯間庭町 / staging editor follow-up 2026-08-23
// - パーツ削除を上部に表示
// - 調べる場所を矢印で移動
// - パーツ連動トリガーもマップ上の独立範囲として編集可能
// - パーツ連動トリガー削除後の復活を防止
// ==========================================
(function () {
    'use strict';

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function currentParts() {
        if (typeof window.getActiveTownParts === 'function') {
            return window.getActiveTownParts();
        }
        var def = window.activeTownSceneDef;
        return def && Array.isArray(def.props) ? def.props : [];
    }

    function clampArea(area) {
        var mapW = Number(window.MAP_WIDTH) || 24;
        var mapH = Number(window.MAP_HEIGHT) || 24;
        var source = area || {};
        var w = Math.max(1, Math.min(mapW, Math.round(Number(source.w) || 1)));
        var h = Math.max(1, Math.min(mapH, Math.round(Number(source.h) || 1)));
        var x = Math.max(0, Math.min(mapW - w, Math.round(Number(source.x) || 0)));
        var y = Math.max(0, Math.min(mapH - h, Math.round(Number(source.y) || 0)));
        return { x: x, y: y, w: w, h: h };
    }

    function syncTriggersToScene() {
        var source = Array.isArray(window.triggers) ? clone(window.triggers) : [];
        var sceneId = window.currentScene;
        var def = window.activeTownSceneDef;
        if (def) def.triggers = clone(source);
        if (window.TOWN_SCENE_MAPS && sceneId && window.TOWN_SCENE_MAPS[sceneId]) {
            window.TOWN_SCENE_MAPS[sceneId].triggers = clone(source);
        }
    }

    function findTriggerIndexById(id) {
        var list = Array.isArray(window.triggers) ? window.triggers : [];
        for (var i = 0; i < list.length; i++) {
            if (list[i] && String(list[i].id) === String(id)) return i;
        }
        return -1;
    }

    function findTriggerById(id) {
        var index = findTriggerIndexById(id);
        return index >= 0 ? window.triggers[index] : null;
    }

    function linkedPartsForTrigger(id) {
        var parts = currentParts();
        var result = [];
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (!part || !part.interaction) continue;
            if (String(part.interaction.triggerId || '') === String(id || '')) result.push(part);
        }
        return result;
    }

    // --------------------------------------------------
    // 調べる範囲のモデルを整理する。
    // 従来: part.interaction の相対矩形だけが正本で、パーツ画像内に拘束される。
    // 今回: part.triggerArea があればマップ座標の絶対矩形を正本にする。
    // これにより、看板・おたより・更新記録なども自由に移動できる。
    // --------------------------------------------------
    var baseGetTownPartTriggerArea = typeof window.getTownPartTriggerArea === 'function'
        ? window.getTownPartTriggerArea
        : null;
    var baseGetTownPartInteractionRectPixels = typeof window.getTownPartInteractionRectPixels === 'function'
        ? window.getTownPartInteractionRectPixels
        : null;

    function seedAbsoluteTriggerAreas() {
        var parts = currentParts();
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (!part || !part.interaction || part.interaction.enabled === false || !part.interaction.triggerId) continue;
            if (part.triggerArea) {
                part.triggerArea = clampArea(part.triggerArea);
                continue;
            }

            // まず現在のパーツ位置から従来方式の範囲を求める。
            // staging でパーツを散らした後の位置を初期値にするため。
            var derived = baseGetTownPartTriggerArea
                ? baseGetTownPartTriggerArea(part)
                : null;
            var existing = findTriggerById(part.interaction.triggerId);
            part.triggerArea = clampArea(derived || (existing && existing.area) || { x: 0, y: 0, w: 1, h: 1 });
        }
    }

    if (baseGetTownPartTriggerArea) {
        window.getTownPartTriggerArea = function (part) {
            if (part && part.triggerArea) return clampArea(part.triggerArea);
            return baseGetTownPartTriggerArea.apply(this, arguments);
        };
    }

    if (baseGetTownPartInteractionRectPixels) {
        window.getTownPartInteractionRectPixels = function (part) {
            if (part && part.triggerArea && part.interaction && part.interaction.enabled !== false && part.interaction.triggerId) {
                var tile = Number(window.TILE_SIZE) || 16;
                var a = clampArea(part.triggerArea);
                return {
                    x: a.x * tile,
                    y: a.y * tile,
                    w: a.w * tile,
                    h: a.h * tile
                };
            }
            return baseGetTownPartInteractionRectPixels.apply(this, arguments);
        };
    }

    function updateTriggerMoveUi() {
        var box = document.getElementById('trigger-quick-move');
        if (!box) return;
        var valid = Array.isArray(window.triggers) &&
            window.editingTriggerIndex >= 0 &&
            window.editingTriggerIndex < window.triggers.length;
        var buttons = box.querySelectorAll('button');
        for (var i = 0; i < buttons.length; i++) buttons[i].disabled = !valid;

        var label = document.getElementById('trigger-quick-area-label');
        if (!label) return;
        if (!valid) {
            label.textContent = '範囲: 未選択';
            return;
        }
        var trigger = window.triggers[window.editingTriggerIndex];
        var a = trigger && trigger.area;
        label.textContent = a
            ? ('範囲: x=' + a.x + ' y=' + a.y + ' / ' + a.w + '×' + a.h)
            : '範囲: なし';
    }

    function setTriggerFormFromCurrent() {
        var valid = Array.isArray(window.triggers) &&
            window.editingTriggerIndex >= 0 &&
            window.editingTriggerIndex < window.triggers.length;
        if (!valid) {
            updateTriggerMoveUi();
            return;
        }
        var trigger = window.triggers[window.editingTriggerIndex];
        if (typeof window.setTriggerFormValues === 'function') {
            window.setTriggerFormValues(trigger);
        }
        updateTriggerMoveUi();
    }

    function setLinkedTriggerArea(triggerId, area) {
        var linked = linkedPartsForTrigger(triggerId);
        var nextArea = clampArea(area);
        for (var i = 0; i < linked.length; i++) {
            linked[i].triggerArea = clone(nextArea);
        }
        return linked.length;
    }

    function moveSelectedTrigger(dxTiles, dyTiles) {
        var list = Array.isArray(window.triggers) ? window.triggers : [];
        var index = Number(window.editingTriggerIndex);
        if (!(index >= 0 && index < list.length)) {
            if (typeof window.updateEditorStatus === 'function') {
                window.updateEditorStatus('先に調べる場所をタップして選択してください');
            }
            return;
        }

        var trigger = list[index];
        if (!trigger || !trigger.area) return;
        var triggerId = String(trigger.id || '');
        var nextArea = clampArea({
            x: trigger.area.x + dxTiles,
            y: trigger.area.y + dyTiles,
            w: trigger.area.w,
            h: trigger.area.h
        });
        var linked = linkedPartsForTrigger(triggerId);

        if (linked.length && typeof window.pushTownPartHistory === 'function') {
            window.pushTownPartHistory();
        } else {
            if (typeof window.markEditorDirty === 'function') window.markEditorDirty();
            if (Array.isArray(window.editHistory) && typeof window.cloneTriggers === 'function') {
                window.editHistory.push({ type: 'triggers', prev: window.cloneTriggers() });
            }
        }

        trigger.area = clone(nextArea);
        setLinkedTriggerArea(triggerId, nextArea);

        if (linked.length && typeof window.refreshTownPartDerivedData === 'function') {
            window.refreshTownPartDerivedData();
            window.editingTriggerIndex = findTriggerIndexById(triggerId);
        }

        syncTriggersToScene();
        setTriggerFormFromCurrent();
        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus('調べる場所を1マス移動しました');
        }
    }

    function resizeSelectedTrigger(dw, dh) {
        var list = Array.isArray(window.triggers) ? window.triggers : [];
        var index = Number(window.editingTriggerIndex);
        if (!(index >= 0 && index < list.length)) return;
        var trigger = list[index];
        if (!trigger || !trigger.area) return;

        var triggerId = String(trigger.id || '');
        var linked = linkedPartsForTrigger(triggerId);
        if (linked.length && typeof window.pushTownPartHistory === 'function') {
            window.pushTownPartHistory();
        } else if (typeof window.markEditorDirty === 'function') {
            window.markEditorDirty();
        }

        var nextArea = clampArea({
            x: trigger.area.x,
            y: trigger.area.y,
            w: trigger.area.w + dw,
            h: trigger.area.h + dh
        });
        trigger.area = clone(nextArea);
        setLinkedTriggerArea(triggerId, nextArea);

        if (linked.length && typeof window.refreshTownPartDerivedData === 'function') {
            window.refreshTownPartDerivedData();
            window.editingTriggerIndex = findTriggerIndexById(triggerId);
        }
        syncTriggersToScene();
        setTriggerFormFromCurrent();
    }

    function deleteSelectedTriggerStrong() {
        var list = Array.isArray(window.triggers) ? window.triggers : [];
        var index = Number(window.editingTriggerIndex);
        if (!(index >= 0 && index < list.length)) {
            if (typeof window.updateEditorStatus === 'function') {
                window.updateEditorStatus('削除する調べる場所を先に選択してください');
            }
            return;
        }

        var trigger = list[index];
        var id = trigger ? String(trigger.id || '') : '';
        var name = trigger ? (trigger.label || trigger.id || '調べる場所') : '調べる場所';
        if (!window.confirm('「' + name + '」を削除しますか？')) return;

        var linked = linkedPartsForTrigger(id);
        if (linked.length && typeof window.pushTownPartHistory === 'function') {
            window.pushTownPartHistory();
        } else {
            if (typeof window.markEditorDirty === 'function') window.markEditorDirty();
            if (Array.isArray(window.editHistory) && typeof window.cloneTriggers === 'function') {
                window.editHistory.push({ type: 'triggers', prev: window.cloneTriggers() });
            }
        }

        // パーツとの関連も切る。triggerArea も消して、再生成されない状態にする。
        for (var i = 0; i < linked.length; i++) {
            linked[i].interaction.enabled = false;
            linked[i].interaction.triggerId = '';
            delete linked[i].triggerArea;
        }

        var next = [];
        for (var t = 0; t < list.length; t++) {
            if (!list[t] || String(list[t].id || '') !== id) next.push(list[t]);
        }
        window.triggers = next;
        window.editingTriggerIndex = -1;
        window.editStep = 0;
        window.currentHoverTile = null;

        if (typeof window.refreshTownPartDerivedData === 'function') {
            window.refreshTownPartDerivedData();
        }
        syncTriggersToScene();
        updateTriggerMoveUi();

        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus('調べる場所を削除しました。パーツ連動も解除したので復活しません');
        }
    }

    function ensureTriggerMoveControls() {
        var form = document.getElementById('trigger-form');
        if (!form || document.getElementById('trigger-quick-move')) return;

        var box = document.createElement('div');
        box.id = 'trigger-quick-move';
        box.style.margin = '8px 0 10px';
        box.innerHTML =
            '<div style="font-weight:800;margin:5px 0">選択中の範囲を移動</div>' +
            '<div id="trigger-quick-area-label" style="font-size:12px;opacity:.8;margin-bottom:6px">範囲: 未選択</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
                '<button type="button" data-trigger-dx="-1">← 1マス</button>' +
                '<button type="button" data-trigger-dy="-1">↑ 1マス</button>' +
                '<button type="button" data-trigger-dy="1">↓ 1マス</button>' +
                '<button type="button" data-trigger-dx="1">→ 1マス</button>' +
            '</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' +
                '<button type="button" data-trigger-resize="-1">範囲を小さく</button>' +
                '<button type="button" data-trigger-resize="1">範囲を大きく</button>' +
            '</div>' +
            '<div style="font-size:11px;opacity:.72;margin-top:6px">パーツに紐づく場所も、マップ上で独立して移動できます。</div>';

        var deleteButton = document.getElementById('btn-delete-trigger');
        form.insertBefore(box, deleteButton || null);

        var buttons = box.querySelectorAll('[data-trigger-dx],[data-trigger-dy]');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                moveSelectedTrigger(
                    Number(this.getAttribute('data-trigger-dx') || 0),
                    Number(this.getAttribute('data-trigger-dy') || 0)
                );
            });
        }

        var resizeButtons = box.querySelectorAll('[data-trigger-resize]');
        for (var r = 0; r < resizeButtons.length; r++) {
            resizeButtons[r].addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var d = Number(this.getAttribute('data-trigger-resize') || 0);
                resizeSelectedTrigger(d, d);
            });
        }

        if (deleteButton) {
            deleteButton.textContent = '選択中の調べる場所を削除';
        }
        updateTriggerMoveUi();
    }

    function ensureTopPartDelete() {
        var form = document.getElementById('part-form');
        if (!form || document.getElementById('btn-part-delete-top')) return;
        var selectButton = document.getElementById('btn-part-mode-select');
        var row = selectButton && selectButton.parentElement;
        if (!row) return;

        var button = document.createElement('button');
        button.id = 'btn-part-delete-top';
        button.type = 'button';
        button.textContent = '削除';
        button.className = 'part-editor-danger';
        button.disabled = true;
        button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.deleteSelectedPart === 'function') window.deleteSelectedPart();
        });
        row.appendChild(button);
    }

    function updateTopPartDelete() {
        var button = document.getElementById('btn-part-delete-top');
        if (!button) return;
        var selected = typeof window.getSelectedTownPart === 'function'
            ? window.getSelectedTownPart()
            : null;
        button.disabled = !selected;
    }

    function enhanceEditor() {
        ensureTriggerMoveControls();
        ensureTopPartDelete();
        updateTopPartDelete();
        updateTriggerMoveUi();
    }

    // 既存の削除関数を、連動パーツまで解除する版へ差し替える。
    window.deleteSelectedTrigger = deleteSelectedTriggerStrong;
    window.YUMANIWA_MOVE_SELECTED_TRIGGER = moveSelectedTrigger;

    if (typeof window.ensureTriggerEditorExtraFields === 'function') {
        var baseEnsureTriggerEditorExtraFields = window.ensureTriggerEditorExtraFields;
        window.ensureTriggerEditorExtraFields = function () {
            var result = baseEnsureTriggerEditorExtraFields.apply(this, arguments);
            ensureTriggerMoveControls();
            return result;
        };
    }

    if (typeof window.selectExistingTriggerForEdit === 'function') {
        var baseSelectExistingTriggerForEdit = window.selectExistingTriggerForEdit;
        window.selectExistingTriggerForEdit = function () {
            var result = baseSelectExistingTriggerForEdit.apply(this, arguments);
            ensureTriggerMoveControls();
            updateTriggerMoveUi();
            return result;
        };
    }

    if (typeof window.ensurePartEditorFields === 'function') {
        var baseEnsurePartEditorFields = window.ensurePartEditorFields;
        window.ensurePartEditorFields = function () {
            var result = baseEnsurePartEditorFields.apply(this, arguments);
            ensureTopPartDelete();
            updateTopPartDelete();
            return result;
        };
    }

    if (typeof window.updatePartEditorSelectionUi === 'function') {
        var baseUpdatePartEditorSelectionUi = window.updatePartEditorSelectionUi;
        window.updatePartEditorSelectionUi = function () {
            var result = baseUpdatePartEditorSelectionUi.apply(this, arguments);
            ensureTopPartDelete();
            updateTopPartDelete();
            return result;
        };
    }

    window.addEventListener('load', function () {
        // main.js のシーン初期化後に絶対範囲を作り、同期し直す。
        window.setTimeout(function () {
            seedAbsoluteTriggerAreas();
            if (typeof window.refreshTownPartDerivedData === 'function') {
                window.refreshTownPartDerivedData();
            }
            syncTriggersToScene();
            enhanceEditor();
        }, 0);
        window.setTimeout(enhanceEditor, 150);
    });
})();
