// ==========================================
// 湯間庭町 / Spatial Editor
// areaZones と trigger 範囲編集の正式モジュール。
// main.js の明示的hookから呼ばれ、runtime関数を上書きしない。
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

    var editingAreaZoneIndex = -1;

    function areaZoneList() {
        return Array.isArray(window.areaZones) ? window.areaZones : [];
    }

    function cloneAreaZones() {
        return clone(areaZoneList());
    }

    function areaZonesChanged() {
        // window.areaZones already is the session draft array.
        window.currentAreaId = null;
    }

    function recordAreaZoneHistory() {
        if (typeof window.markEditorDirty === 'function') window.markEditorDirty();
        if (Array.isArray(window.editHistory)) {
            window.editHistory.push({
                type: 'areaZones',
                prev: cloneAreaZones()
            });
        }
    }

    function uniqueAreaZoneId(base) {
        var stem = String(base || 'area').trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'area';
        var used = {};
        var list = areaZoneList();
        for (var i = 0; i < list.length; i++) {
            if (list[i] && list[i].id) used[String(list[i].id)] = true;
        }
        if (!used[stem]) return stem;

        var n = 2;
        while (used[stem + '_' + n]) n++;
        return stem + '_' + n;
    }

    function isAreaZoneIdAvailable(id, exceptIndex) {
        var value = String(id || '').trim();
        if (!value) return false;

        var list = areaZoneList();
        for (var i = 0; i < list.length; i++) {
            if (i === exceptIndex || !list[i]) continue;
            if (String(list[i].id || '') === value) return false;
        }
        return true;
    }

    function getAreaZoneIndexAtTile(tx, ty) {
        var list = areaZoneList();
        for (var i = list.length - 1; i >= 0; i--) {
            var zone = list[i];
            var area = zone && zone.area;
            if (!area) continue;
            if (
                tx >= area.x &&
                tx < area.x + area.w &&
                ty >= area.y &&
                ty < area.y + area.h
            ) {
                return i;
            }
        }
        return -1;
    }

    function setAreaZoneFormValues(zone) {
        var idInput = document.getElementById('area-zone-id');
        var titleInput = document.getElementById('area-zone-title');
        var subtitleInput = document.getElementById('area-zone-subtitle');
        if (!zone) {
            if (idInput) idInput.value = '';
            if (titleInput) titleInput.value = '';
            if (subtitleInput) subtitleInput.value = '';
            return;
        }
        if (idInput) idInput.value = String(zone.id || '');
        if (titleInput) titleInput.value = String(zone.title || '');
        if (subtitleInput) subtitleInput.value = String(zone.subtitle || '');
    }

    function refreshAreaZoneEditor() {
        var form = document.getElementById('area-zone-form');
        if (form) {
            form.style.display = window.editTarget === 'areaZones' ? 'block' : 'none';
        }

        var list = areaZoneList();
        var valid = editingAreaZoneIndex >= 0 && editingAreaZoneIndex < list.length;
        var label = document.getElementById('area-zone-selection');
        var updateButton = document.getElementById('btn-update-area-zone');
        var deleteButton = document.getElementById('btn-delete-area-zone');
        var moveButtons = form ? form.querySelectorAll('[data-area-zone-move],[data-area-zone-resize]') : [];

        if (label) {
            if (!valid) {
                label.textContent = '選択中: なし';
            } else {
                var zone = list[editingAreaZoneIndex];
                var a = zone.area || {};
                label.textContent =
                    '選択中: ' + (zone.title || zone.id || 'area') +
                    ' / x=' + a.x + ' y=' + a.y + ' / ' + a.w + '×' + a.h;
            }
        }

        if (updateButton) updateButton.disabled = !valid;
        if (deleteButton) deleteButton.disabled = !valid;
        for (var i = 0; i < moveButtons.length; i++) {
            moveButtons[i].disabled = !valid;
        }

        if (valid) setAreaZoneFormValues(list[editingAreaZoneIndex]);
    }

    function ensureAreaZoneEditor() {
        var content = document.querySelector('#editor-panel .editor-content');
        if (!content) return;

        var targetSelect = document.getElementById('edit-target');
        if (targetSelect && !targetSelect.querySelector('option[value="areaZones"]')) {
            var option = document.createElement('option');
            option.value = 'areaZones';
            option.textContent = 'エリア名・表示範囲';
            targetSelect.appendChild(option);
        }

        if (document.getElementById('area-zone-form')) {
            refreshAreaZoneEditor();
            return;
        }

        var form = document.createElement('div');
        form.id = 'area-zone-form';
        form.style.display = 'none';
        form.innerHTML =
            '<div class="part-editor-section">エリア表示</div>' +
            '<div id="area-zone-selection" class="part-editor-row">選択中: なし</div>' +
            '<div class="part-editor-row"><label class="part-editor-grow">ID <input id="area-zone-id" type="text" style="width:100%"></label></div>' +
            '<div class="part-editor-row"><label class="part-editor-grow">表示名 <input id="area-zone-title" type="text" style="width:100%"></label></div>' +
            '<div class="part-editor-row"><label class="part-editor-grow">サブタイトル <input id="area-zone-subtitle" type="text" style="width:100%"></label></div>' +
            '<div class="part-editor-row">' +
                '<button type="button" data-area-zone-move="left">←</button>' +
                '<button type="button" data-area-zone-move="up">↑</button>' +
                '<button type="button" data-area-zone-move="down">↓</button>' +
                '<button type="button" data-area-zone-move="right">→</button>' +
            '</div>' +
            '<div class="part-editor-row">' +
                '<button type="button" data-area-zone-resize="-1">狭める</button>' +
                '<button type="button" data-area-zone-resize="1">広げる</button>' +
            '</div>' +
            '<div class="part-editor-row">' +
                '<button id="btn-update-area-zone" type="button">選択中エリアを更新</button>' +
                '<button id="btn-delete-area-zone" type="button" class="part-editor-danger">削除</button>' +
            '</div>' +
            '<div class="part-editor-note">既存範囲をタップで選択。空いている場所は始点→終点の2回タップで新規作成します。</div>';

        var status = document.getElementById('editor-status');
        content.insertBefore(form, status || null);

        form.querySelectorAll('[data-area-zone-move]').forEach(function(button) {
            button.addEventListener('click', function() {
                var dir = button.getAttribute('data-area-zone-move');
                if (dir === 'left') moveSelectedAreaZone(-1, 0);
                if (dir === 'right') moveSelectedAreaZone(1, 0);
                if (dir === 'up') moveSelectedAreaZone(0, -1);
                if (dir === 'down') moveSelectedAreaZone(0, 1);
            });
        });

        form.querySelectorAll('[data-area-zone-resize]').forEach(function(button) {
            button.addEventListener('click', function() {
                resizeSelectedAreaZone(Number(button.getAttribute('data-area-zone-resize')) || 0);
            });
        });

        document.getElementById('btn-update-area-zone').addEventListener('click', updateSelectedAreaZoneFromForm);
        document.getElementById('btn-delete-area-zone').addEventListener('click', deleteSelectedAreaZone);
        refreshAreaZoneEditor();
    }

    function selectAreaZone(index) {
        var list = areaZoneList();
        if (!(index >= 0 && index < list.length)) {
            editingAreaZoneIndex = -1;
            setAreaZoneFormValues(null);
            refreshAreaZoneEditor();
            return false;
        }

        editingAreaZoneIndex = index;
        var zone = list[index];
        var a = clampArea(zone.area || {});

        window.editStep = 1;
        window.editStartX = a.x;
        window.editStartY = a.y;
        window.currentHoverTile = {
            x: a.x + a.w - 1,
            y: a.y + a.h - 1
        };

        setAreaZoneFormValues(zone);
        refreshAreaZoneEditor();
        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus(
                '既存エリアを選択中: ' + (zone.title || zone.id || 'area') +
                ' / 終点タップで範囲変更できます'
            );
        }
        return true;
    }

    function areaZoneFormValues(area, existing, existingIndex) {
        var idInput = document.getElementById('area-zone-id');
        var titleInput = document.getElementById('area-zone-title');
        var subtitleInput = document.getElementById('area-zone-subtitle');
        var current = existing || {};
        var requestedId = String((idInput && idInput.value) || current.id || '').trim();

        if (!requestedId) {
            requestedId = uniqueAreaZoneId('area');
        }

        if (!isAreaZoneIdAvailable(requestedId, Number(existingIndex))) {
            if (typeof window.updateEditorStatus === 'function') {
                window.updateEditorStatus('エリアID「' + requestedId + '」は既に使われています');
            }
            return null;
        }

        return {
            id: requestedId,
            title: String((titleInput && titleInput.value) || current.title || '新しいエリア'),
            subtitle: String((subtitleInput && subtitleInput.value) || current.subtitle || ''),
            area: clampArea(area || current.area || {})
        };
    }

    function applyAreaZoneValues(index, values) {
        var list = areaZoneList();
        if (!(index >= 0 && index < list.length) || !values) return false;
        list[index] = Object.assign({}, list[index], {
            id: String(values.id || uniqueAreaZoneId('area')),
            title: String(values.title || ''),
            subtitle: String(values.subtitle || ''),
            area: Object.assign({}, list[index].area, clampArea(values.area || {}))
        });
        areaZonesChanged();
        return true;
    }

    function updateSelectedAreaZoneFromForm() {
        var list = areaZoneList();
        if (!(editingAreaZoneIndex >= 0 && editingAreaZoneIndex < list.length)) return;

        var values = areaZoneFormValues(
            list[editingAreaZoneIndex].area,
            list[editingAreaZoneIndex],
            editingAreaZoneIndex
        );
        if (!values) return;

        recordAreaZoneHistory();
        applyAreaZoneValues(editingAreaZoneIndex, values);
        refreshAreaZoneEditor();
        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus('エリア名・サブタイトルを更新しました');
        }
    }

    function moveSelectedAreaZone(dx, dy) {
        var list = areaZoneList();
        if (!(editingAreaZoneIndex >= 0 && editingAreaZoneIndex < list.length)) return;
        var zone = list[editingAreaZoneIndex];
        recordAreaZoneHistory();
        zone.area = Object.assign({}, zone.area, clampArea({
            x: Number(zone.area.x || 0) + dx,
            y: Number(zone.area.y || 0) + dy,
            w: Number(zone.area.w || 1),
            h: Number(zone.area.h || 1)
        }));
        areaZonesChanged();
        selectAreaZone(editingAreaZoneIndex);
        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus('エリア範囲を1マス移動しました');
        }
    }

    function resizeSelectedAreaZone(delta) {
        var list = areaZoneList();
        if (!(editingAreaZoneIndex >= 0 && editingAreaZoneIndex < list.length)) return;
        var zone = list[editingAreaZoneIndex];
        recordAreaZoneHistory();
        zone.area = Object.assign({}, zone.area, clampArea({
            x: Number(zone.area.x || 0),
            y: Number(zone.area.y || 0),
            w: Number(zone.area.w || 1) + delta,
            h: Number(zone.area.h || 1) + delta
        }));
        areaZonesChanged();
        selectAreaZone(editingAreaZoneIndex);
        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus(delta > 0 ? 'エリア範囲を広げました' : 'エリア範囲を狭めました');
        }
    }

    function deleteSelectedAreaZone() {
        var list = areaZoneList();
        if (!(editingAreaZoneIndex >= 0 && editingAreaZoneIndex < list.length)) return;
        var zone = list[editingAreaZoneIndex];
        var name = zone.title || zone.id || 'エリア';
        if (!window.confirm('「' + name + '」を削除しますか？')) return;

        recordAreaZoneHistory();
        list.splice(editingAreaZoneIndex, 1);
        editingAreaZoneIndex = -1;
        window.editStep = 0;
        window.currentHoverTile = null;
        areaZonesChanged();
        setAreaZoneFormValues(null);
        refreshAreaZoneEditor();
        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus('エリアを削除しました。Undoで元に戻せます');
        }
    }

    function handleAreaZoneTap(tx, ty) {
        var list = areaZoneList();

        if (window.editStep === 0) {
            var hit = getAreaZoneIndexAtTile(tx, ty);
            if (hit >= 0) {
                selectAreaZone(hit);
                return;
            }

            editingAreaZoneIndex = -1;
            window.editStartX = tx;
            window.editStartY = ty;
            window.editStep = 1;
            window.currentHoverTile = { x: tx, y: ty };
            setAreaZoneFormValues(null);
            refreshAreaZoneEditor();
            if (typeof window.updateEditorStatus === 'function') {
                window.updateEditorStatus('新規エリア範囲の終点をタップしてください');
            }
            return;
        }

        var minX = Math.min(Number(window.editStartX) || 0, tx);
        var minY = Math.min(Number(window.editStartY) || 0, ty);
        var w = Math.max(Number(window.editStartX) || 0, tx) - minX + 1;
        var h = Math.max(Number(window.editStartY) || 0, ty) - minY + 1;
        var area = clampArea({ x: minX, y: minY, w: w, h: h });

        var values;

        if (editingAreaZoneIndex >= 0 && editingAreaZoneIndex < list.length) {
            values = areaZoneFormValues(
                area,
                list[editingAreaZoneIndex],
                editingAreaZoneIndex
            );
            if (!values) return;

            recordAreaZoneHistory();
            applyAreaZoneValues(editingAreaZoneIndex, values);
            if (typeof window.updateEditorStatus === 'function') {
                window.updateEditorStatus('既存エリアの範囲を更新しました');
            }
        } else {
            values = areaZoneFormValues(area, null, -1);
            if (!values) return;

            recordAreaZoneHistory();
            list.push(values);
            areaZonesChanged();
            editingAreaZoneIndex = list.length - 1;
            if (typeof window.updateEditorStatus === 'function') {
                window.updateEditorStatus('新規エリアを追加しました');
            }
        }

        window.editStep = 0;
        window.currentHoverTile = null;
        refreshAreaZoneEditor();
    }

    function clampArea(area) {
        var mapW = Number(window.MAP_WIDTH);
        var mapH = Number(window.MAP_HEIGHT);

        if (
            !isFinite(mapW) ||
            !isFinite(mapH) ||
            mapW <= 0 ||
            mapH <= 0
        ) {
            throw new Error('Spatial editor requires validated map dimensions');
        }

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

    function updateTriggerMoveUi() {
        var box = document.getElementById('trigger-quick-move');
        if (!box) return;
        var valid = Array.isArray(window.triggers) &&
            Number(window.editingTriggerIndex) >= 0 &&
            Number(window.editingTriggerIndex) < window.triggers.length;
        var buttons = box.querySelectorAll('button');
        for (var i = 0; i < buttons.length; i++) buttons[i].disabled = !valid;

        var selectedTrigger = valid ? window.triggers[window.editingTriggerIndex] : null;
        var deleteButton = document.getElementById('btn-delete-trigger');
        if (deleteButton) {
            deleteButton.disabled =
                !valid ||
                (selectedTrigger && String(selectedTrigger.id || '') === 'station_ghost_npc_trigger');
        }

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
        if (typeof window.pushTownTriggerHistory === 'function') {
            window.pushTownTriggerHistory();
            return;
        }
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
        trigger.area = Object.assign({}, trigger.area, nextArea);

        if (linked.length && typeof window.refreshTownPartDerivedData === 'function') {
            window.refreshTownPartDerivedData();
            window.editingTriggerIndex = findTriggerIndexById(id);
        }
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
        trigger.area = Object.assign({}, trigger.area, nextArea);

        if (linked.length && typeof window.refreshTownPartDerivedData === 'function') {
            window.refreshTownPartDerivedData();
            window.editingTriggerIndex = findTriggerIndexById(id);
        }
        refreshTriggerForm();
        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus(delta > 0 ? '調べる場所を広げました' : '調べる場所を狭めました');
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

    function resetAreaZoneSelection() {
        editingAreaZoneIndex = -1;
        setAreaZoneFormValues(null);
        refreshAreaZoneEditor();
    }

    function ensureSpatialEditor() {
        ensureTriggerMoveControls();
        ensureAreaZoneEditor();
        updateTriggerMoveUi();
        refreshAreaZoneEditor();
    }

    function onTargetChanged() {
        resetAreaZoneSelection();
        ensureSpatialEditor();
    }

    function onUndo() {
        areaZonesChanged();
        refreshAreaZoneEditor();
        updateTriggerMoveUi();
    }

    function onTriggerSelectionChanged() {
        ensureTriggerMoveControls();
        updateTriggerMoveUi();
    }

    window.YUMANIWA_SPATIAL_EDITOR = {
        ensure: ensureSpatialEditor,
        onTargetChanged: onTargetChanged,
        onUndo: onUndo,
        onTriggerSelectionChanged: onTriggerSelectionChanged,
        handleAreaZoneTap: handleAreaZoneTap
    };
})();
