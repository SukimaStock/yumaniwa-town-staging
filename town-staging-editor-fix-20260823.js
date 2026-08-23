// ==========================================
// 湯間庭町 / staging editor follow-up 2026-08-23
// - パーツ削除を上部に表示
// - 調べる場所を矢印で移動
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

    function moveLinkedInteraction(part, dxTiles, dyTiles) {
        if (!part || !part.interaction) return;
        if (typeof window.ensureTownPartMetadata === 'function') {
            window.ensureTownPartMetadata(part);
        }
        var rect = typeof window.getPartRectPixels === 'function'
            ? window.getPartRectPixels(part)
            : null;
        if (!rect) return;

        var tile = Number(window.TILE_SIZE) || 16;
        var spec = part.interaction;
        var w = Math.max(1, Number(spec.w || 0.001) * rect.w);
        var h = Math.max(1, Number(spec.h || 0.001) * rect.h);
        var x = Number(spec.x || 0) * rect.w + dxTiles * tile;
        var y = Number(spec.y || 0) * rect.h + dyTiles * tile;
        x = Math.max(0, Math.min(rect.w - w, x));
        y = Math.max(0, Math.min(rect.h - h, y));

        spec.x = x / rect.w;
        spec.y = y / rect.h;
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
        var linked = linkedPartsForTrigger(triggerId);

        if (linked.length) {
            if (typeof window.pushTownPartHistory === 'function') {
                window.pushTownPartHistory();
            } else if (typeof window.markEditorDirty === 'function') {
                window.markEditorDirty();
            }
            for (var i = 0; i < linked.length; i++) {
                moveLinkedInteraction(linked[i], dxTiles, dyTiles);
            }
            if (typeof window.refreshTownPartDerivedData === 'function') {
                window.refreshTownPartDerivedData();
            }
            window.editingTriggerIndex = findTriggerIndexById(triggerId);
        } else {
            if (typeof window.markEditorDirty === 'function') window.markEditorDirty();
            if (Array.isArray(window.editHistory) && typeof window.cloneTriggers === 'function') {
                window.editHistory.push({ type: 'triggers', prev: window.cloneTriggers() });
            }

            var mapW = Number(window.MAP_WIDTH) || 24;
            var mapH = Number(window.MAP_HEIGHT) || 24;
            trigger.area.x = Math.max(0, Math.min(mapW - trigger.area.w, trigger.area.x + dxTiles));
            trigger.area.y = Math.max(0, Math.min(mapH - trigger.area.h, trigger.area.y + dyTiles));
        }

        syncTriggersToScene();
        setTriggerFormFromCurrent();
        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus('調べる場所を' + (Math.abs(dxTiles) + Math.abs(dyTiles)) + 'マス移動しました');
        }
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

        // パーツに紐づいたトリガーは、リンクを切らないと syncTownPartTriggers() が再生成する。
        for (var i = 0; i < linked.length; i++) {
            linked[i].interaction.enabled = false;
            linked[i].interaction.triggerId = '';
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
            '</div>';

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
        enhanceEditor();
        window.setTimeout(enhanceEditor, 100);
    });
})();
