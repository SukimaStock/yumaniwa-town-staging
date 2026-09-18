// ==========================================
// 湯間庭町 / 開発モード 空間編集補助 2026-08-23
// - パーツ削除を上部に表示
// - 調べる場所を矢印で移動・サイズ変更
// - パーツ連動の調べる場所もマップ上で独立移動可能
// - 調べる場所削除後の復活を防止
// - 通行可能/不可エリアを scene 正本へ同期し、復活を防止
// ==========================================
(function () {
    'use strict';

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function currentParts() {
        if (typeof window.getActiveTownParts === 'function') return window.getActiveTownParts();
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

    function findTriggerIndexById(id) {
        var list = Array.isArray(window.triggers) ? window.triggers : [];
        for (var i = 0; i < list.length; i++) {
            if (list[i] && String(list[i].id) === String(id)) return i;
        }
        return -1;
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

    function syncTriggersToScene() {
        var source = Array.isArray(window.triggers) ? clone(window.triggers) : [];
        var sceneId = window.currentScene;
        var def = window.activeTownSceneDef;
        if (def) def.triggers = clone(source);
        if (window.TOWN_SCENE_MAPS && sceneId && window.TOWN_SCENE_MAPS[sceneId]) {
            window.TOWN_SCENE_MAPS[sceneId].triggers = clone(source);
        }
    }

    function syncCollisionToScene() {
        if (typeof window.buildExportCollisionData !== 'function') return;
        var data = window.buildExportCollisionData();
        if (!data) return;

        var passable = clone(data.passableRects || []);
        var blockedRects = clone(data.blockedRects || []);
        var blockedPoints = clone(data.blockedPoints || []);
        var sceneId = window.currentScene;
        var def = window.activeTownSceneDef;

        window.passableRects = clone(passable);
        window.blockedRects = clone(blockedRects);
        window.blockedPoints = clone(blockedPoints);

        if (def) {
            def.passableRects = clone(passable);
            def.blockedRects = clone(blockedRects);
            def.blockedPoints = clone(blockedPoints);
        }

        if (window.TOWN_SCENE_MAPS && sceneId && window.TOWN_SCENE_MAPS[sceneId]) {
            window.TOWN_SCENE_MAPS[sceneId].passableRects = clone(passable);
            window.TOWN_SCENE_MAPS[sceneId].blockedRects = clone(blockedRects);
            window.TOWN_SCENE_MAPS[sceneId].blockedPoints = clone(blockedPoints);
        }
    }

    // --------------------------------------------------
    // パーツ連動トリガーの絶対座標化
    // --------------------------------------------------
    var baseGetTownPartTriggerArea = typeof window.getTownPartTriggerArea === 'function'
        ? window.getTownPartTriggerArea
        : null;
    var baseGetTownPartInteractionRectPixels = typeof window.getTownPartInteractionRectPixels === 'function'
        ? window.getTownPartInteractionRectPixels
        : null;

    function seedAbsoluteTriggerAreas() {
        if (!baseGetTownPartTriggerArea) return;
        var parts = currentParts();
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (!part || !part.interaction || part.interaction.enabled === false || !part.interaction.triggerId) continue;
            if (part.triggerArea) {
                part.triggerArea = clampArea(part.triggerArea);
                continue;
            }
            var derived = baseGetTownPartTriggerArea(part);
            if (derived) part.triggerArea = clampArea(derived);
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

    function setLinkedTriggerArea(triggerId, area) {
        var linked = linkedPartsForTrigger(triggerId);
        var nextArea = clampArea(area);
        for (var i = 0; i < linked.length; i++) linked[i].triggerArea = clone(nextArea);
        return linked.length;
    }

    function updateTriggerMoveUi() {
        var box = document.getElementById('trigger-quick-move');
        if (!box) return;
        var valid = Array.isArray(window.triggers) &&
            Number(window.editingTriggerIndex) >= 0 &&
            Number(window.editingTriggerIndex) < window.triggers.length;
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
        label.textContent = a ? ('範囲: x=' + a.x + ' y=' + a.y + ' / ' + a.w + '×' + a.h) : '範囲: なし';
    }

    function refreshTriggerForm() {
        var index = Number(window.editingTriggerIndex);
        var valid = Array.isArray(window.triggers) && index >= 0 && index < window.triggers.length;
        if (valid && typeof window.setTriggerFormValues === 'function') {
            window.setTriggerFormValues(window.triggers[index]);
        }
        updateTriggerMoveUi();
    }

    function recordTriggerHistory(linked) {
        if (linked && linked.length && typeof window.pushTownPartHistory === 'function') {
            window.pushTownPartHistory();
            return;
        }
        if (typeof window.markEditorDirty === 'function') window.markEditorDirty();
        if (Array.isArray(window.editHistory) && typeof window.cloneTriggers === 'function') {
            window.editHistory.push({ type: 'triggers', prev: window.cloneTriggers() });
        }
    }

    function moveSelectedTrigger(dx, dy) {
        var list = Array.isArray(window.triggers) ? window.triggers : [];
        var index = Number(window.editingTriggerIndex);
        if (!(index >= 0 && index < list.length)) {
            if (typeof window.updateEditorStatus === 'function') window.updateEditorStatus('先に調べる場所をタップして選択してください');
            return;
        }
        var trigger = list[index];
        if (!trigger || !trigger.area) return;
        var id = String(trigger.id || '');
        var linked = linkedPartsForTrigger(id);
        recordTriggerHistory(linked);

        var nextArea = clampArea({
            x: Number(trigger.area.x || 0) + dx,
            y: Number(trigger.area.y || 0) + dy,
            w: Number(trigger.area.w || 1),
            h: Number(trigger.area.h || 1)
        });
        trigger.area = clone(nextArea);
        setLinkedTriggerArea(id, nextArea);

        if (linked.length && typeof window.refreshTownPartDerivedData === 'function') {
            window.refreshTownPartDerivedData();
            window.editingTriggerIndex = findTriggerIndexById(id);
        }
        syncTriggersToScene();
        refreshTriggerForm();
        if (typeof window.updateEditorStatus === 'function') window.updateEditorStatus('調べる場所を1マス移動しました');
    }

    function resizeSelectedTrigger(delta) {
        var list = Array.isArray(window.triggers) ? window.triggers : [];
        var index = Number(window.editingTriggerIndex);
        if (!(index >= 0 && index < list.length)) return;
        var trigger = list[index];
        if (!trigger || !trigger.area) return;
        var id = String(trigger.id || '');
        var linked = linkedPartsForTrigger(id);
        recordTriggerHistory(linked);

        var nextArea = clampArea({
            x: trigger.area.x,
            y: trigger.area.y,
            w: Number(trigger.area.w || 1) + delta,
            h: Number(trigger.area.h || 1) + delta
        });
        trigger.area = clone(nextArea);
        setLinkedTriggerArea(id, nextArea);

        if (linked.length && typeof window.refreshTownPartDerivedData === 'function') {
            window.refreshTownPartDerivedData();
            window.editingTriggerIndex = findTriggerIndexById(id);
        }
        syncTriggersToScene();
        refreshTriggerForm();
        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus(delta > 0 ? '調べる場所を広げました' : '調べる場所を狭めました');
        }
    }

    function deleteSelectedTriggerStrong() {
        var list = Array.isArray(window.triggers) ? window.triggers : [];
        var index = Number(window.editingTriggerIndex);
        if (!(index >= 0 && index < list.length)) {
            if (typeof window.updateEditorStatus === 'function') window.updateEditorStatus('削除する調べる場所を先に選択してください');
            return;
        }

        var trigger = list[index];
        var id = trigger ? String(trigger.id || '') : '';
        var name = trigger ? (trigger.label || trigger.id || '調べる場所') : '調べる場所';
        if (!window.confirm('「' + name + '」を削除しますか？')) return;

        var linked = linkedPartsForTrigger(id);
        recordTriggerHistory(linked);
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

        if (window.townPartManagedTriggerIds) delete window.townPartManagedTriggerIds[id];
        if (typeof window.refreshTownPartDerivedData === 'function') window.refreshTownPartDerivedData();
        syncTriggersToScene();
        updateTriggerMoveUi();
        if (typeof window.updateEditorStatus === 'function') window.updateEditorStatus('調べる場所を削除しました');
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
            '</div>';

        var deleteButton = document.getElementById('btn-delete-trigger');
        form.insertBefore(box, deleteButton || null);

        var moveButtons = box.querySelectorAll('[data-trigger-dx],[data-trigger-dy]');
        for (var i = 0; i < moveButtons.length; i++) {
            moveButtons[i].addEventListener('click', function (e) {
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
                resizeSelectedTrigger(Number(this.getAttribute('data-trigger-resize') || 0));
            });
        }
        if (deleteButton) deleteButton.textContent = '選択中の調べる場所を削除';
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
        var selected = typeof window.getSelectedTownPart === 'function' ? window.getSelectedTownPart() : null;
        button.disabled = !selected;
    }

    function enhanceEditor() {
        var targetSelect = document.getElementById('edit-target');
        if (targetSelect) {
            var triggerOption = targetSelect.querySelector('option[value="triggers"]');
            if (triggerOption) triggerOption.textContent = '調べる場所（単独）';
        }
        ensureTriggerMoveControls();
        ensureTopPartDelete();
        updateTopPartDelete();
        updateTriggerMoveUi();
        seedAbsoluteTriggerAreas();
    }

    // 既存関数を安全に拡張する。
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

    if (typeof window.handleEditorTap === 'function') {
        var baseHandleEditorTap = window.handleEditorTap;
        window.handleEditorTap = function () {
            var targetBefore = window.editTarget;
            var result = baseHandleEditorTap.apply(this, arguments);
            if (targetBefore === 'passableRects' || targetBefore === 'blockedRects' || targetBefore === 'blockedPoints') {
                syncCollisionToScene();
            }
            return result;
        };
    }

    window.addEventListener('load', function () {
        enhanceEditor();
        window.setTimeout(enhanceEditor, 100);

        var undo = document.getElementById('btn-editor-undo');
        if (undo && undo.dataset.collisionSyncReady !== 'true') {
            undo.dataset.collisionSyncReady = 'true';
            undo.addEventListener('click', function () {
                window.setTimeout(function () {
                    syncCollisionToScene();
                    syncTriggersToScene();
                }, 0);
            });
        }
    });
})();
