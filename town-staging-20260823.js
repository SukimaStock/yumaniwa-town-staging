// ==========================================
// 湯間庭町 / staging 2026-08-23
// 駅前広場の配置調整 + 開発モード微修正
// ==========================================
(function () {
    'use strict';

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function findById(items, id) {
        var source = Array.isArray(items) ? items : [];
        for (var i = 0; i < source.length; i++) {
            if (source[i] && source[i].id === id) return source[i];
        }
        return null;
    }

    function removeById(items, id) {
        if (!Array.isArray(items)) return;
        for (var i = items.length - 1; i >= 0; i--) {
            if (items[i] && items[i].id === id) items.splice(i, 1);
        }
    }

    function patchPart(items, id, values) {
        var part = findById(items, id);
        if (!part) return;
        for (var key in values) {
            if (Object.prototype.hasOwnProperty.call(values, key)) {
                part[key] = values[key];
            }
        }
    }

    // ------------------------------------------
    // 1. 駅前広場: 今回の開発モード差分を staging に反映
    // ------------------------------------------
    var FINAL_STATION_COLLISION = {
        passableRects: [
            { x: 9, y: 0, w: 6, h: 1 },
            { x: 10, y: 1, w: 4, h: 9 },
            { x: 7, y: 7, w: 3, h: 9 },
            { x: 14, y: 7, w: 3, h: 3 },
            { x: 0, y: 9, w: 7, h: 5 },
            { x: 17, y: 9, w: 7, h: 5 },
            { x: 10, y: 10, w: 3, h: 14 },
            { x: 15, y: 10, w: 2, h: 6 },
            { x: 13, y: 11, w: 2, h: 5 },
            { x: 0, y: 14, w: 1, h: 1 },
            { x: 23, y: 14, w: 1, h: 1 },
            { x: 13, y: 16, w: 1, h: 8 },
            { x: 9, y: 23, w: 1, h: 1 },
            { x: 14, y: 23, w: 1, h: 1 }
        ],
        blockedRects: [
            { x: 0, y: 0, w: 9, h: 7 },
            { x: 15, y: 0, w: 9, h: 7 },
            { x: 9, y: 1, w: 1, h: 6 },
            { x: 14, y: 1, w: 1, h: 6 },
            { x: 0, y: 7, w: 7, h: 2 },
            { x: 17, y: 7, w: 7, h: 2 },
            { x: 13, y: 10, w: 2, h: 1 },
            { x: 1, y: 14, w: 6, h: 10 },
            { x: 17, y: 14, w: 6, h: 10 },
            { x: 0, y: 15, w: 1, h: 9 },
            { x: 23, y: 15, w: 1, h: 9 },
            { x: 7, y: 16, w: 3, h: 7 },
            { x: 14, y: 16, w: 3, h: 7 },
            { x: 7, y: 23, w: 2, h: 1 },
            { x: 15, y: 23, w: 2, h: 1 }
        ],
        blockedPoints: []
    };

    function applyStationPlazaPatch() {
        var maps = window.TOWN_SCENE_MAPS;
        var station = maps && maps.station_plaza;
        if (!station) return;

        station.passableRects = clone(FINAL_STATION_COLLISION.passableRects);
        station.blockedRects = clone(FINAL_STATION_COLLISION.blockedRects);
        station.blockedPoints = [];

        window.passableRects = clone(FINAL_STATION_COLLISION.passableRects);
        window.blockedRects = clone(FINAL_STATION_COLLISION.blockedRects);
        window.blockedPoints = [];

        var props = Array.isArray(station.props)
            ? station.props
            : (Array.isArray(window.stationPlazaProps) ? window.stationPlazaProps : []);
        station.props = props;

        patchPart(props, 'station_notice_board', {
            x: 1.3957145361604741,
            y: 2.765492525451033,
            footY: 9.015492525451034
        });
        patchPart(props, 'station_tourist_map', {
            x: 12.699074074074076,
            y: 7.375,
            footY: 11.125
        });
        patchPart(props, 'station_bench_left', {
            x: 17.817129629629626,
            y: 13.299222406268077,
            footY: 16.73672240626808
        });
        patchPart(props, 'station_bench_right', {
            x: 16.896881747218067,
            y: 5.558154201067677,
            footY: 8.995654201067676
        });
        patchPart(props, 'station_feedback_box_placeholder', {
            x: 9.359674011330714,
            y: 0,
            footY: 3.125
        });
        patchPart(props, 'station_streetLamp_11', {
            x: 0,
            y: 5.797493032549821,
            footY: 8.79749303254982
        });
        patchPart(props, 'station_streetLamp_12', {
            x: 21,
            y: 5.742885313140873,
            footY: 8.742885313140873
        });
        patchPart(props, 'station_update_history_signboard', {
            x: 6.974537037037036,
            y: 14.38894147341852,
            footY: 16.26394147341852
        });

        removeById(station.triggers, 'station_plaza_trigger_1');
        removeById(window.triggers, 'station_plaza_trigger_1');

        window.stationPlazaProps = props;
        if (window.YUMANIWA_STATION_PLAZA_PROPS) {
            window.YUMANIWA_STATION_PLAZA_PROPS.props = props;
        }
    }

    applyStationPlazaPatch();

    // ------------------------------------------
    // 2. 開発モード: 調べる範囲をパーツ画面から1pxずつ動かす
    // ------------------------------------------
    function getSelectedPart() {
        return typeof window.getSelectedTownPart === 'function'
            ? window.getSelectedTownPart()
            : null;
    }

    function getPartRect(part) {
        if (!part) return null;
        if (typeof window.getPartRectPixels === 'function') {
            return window.getPartRectPixels(part);
        }
        var tile = Number(window.TILE_SIZE) || 16;
        return {
            x: Number(part.x || 0) * tile,
            y: Number(part.y || 0) * tile,
            w: Math.max(1, Number(part.w || 1) * tile),
            h: Math.max(1, Number(part.h || 1) * tile)
        };
    }

    function interactionPixels(part) {
        var rect = getPartRect(part);
        if (!part || !rect) return null;
        if (typeof window.ensureTownPartMetadata === 'function') {
            window.ensureTownPartMetadata(part);
        }
        var spec = part.interaction || {};
        return {
            x: Number(spec.x || 0) * rect.w,
            y: Number(spec.y || 0) * rect.h,
            w: Math.max(1, Number(spec.w || 0.001) * rect.w),
            h: Math.max(1, Number(spec.h || 0.001) * rect.h)
        };
    }

    function setInteractionPixels(part, next) {
        var rect = getPartRect(part);
        if (!part || !rect) return;
        if (typeof window.ensureTownPartMetadata === 'function') {
            window.ensureTownPartMetadata(part);
        }

        var w = Math.max(1, Math.min(rect.w, Number(next.w) || 1));
        var h = Math.max(1, Math.min(rect.h, Number(next.h) || 1));
        var x = Math.max(0, Math.min(rect.w - w, Number(next.x) || 0));
        var y = Math.max(0, Math.min(rect.h - h, Number(next.y) || 0));

        part.interaction.x = x / rect.w;
        part.interaction.y = y / rect.h;
        part.interaction.w = w / rect.w;
        part.interaction.h = h / rect.h;

        if (typeof window.refreshTownPartDerivedData === 'function') {
            window.refreshTownPartDerivedData();
        }
    }

    function markPartEdit() {
        if (typeof window.pushTownPartHistory === 'function') {
            window.pushTownPartHistory();
        } else if (typeof window.markEditorDirty === 'function') {
            window.markEditorDirty();
        }
    }

    function updateInteractionRectUi() {
        var part = getSelectedPart();
        var box = document.getElementById('part-interaction-rect-editor');
        if (!box) return;

        var inputs = [
            document.getElementById('part-interaction-x'),
            document.getElementById('part-interaction-y'),
            document.getElementById('part-interaction-w'),
            document.getElementById('part-interaction-h')
        ];
        var buttons = box.querySelectorAll('button');
        var enabled = !!(
            part &&
            part.interaction &&
            part.interaction.enabled !== false &&
            part.interaction.triggerId
        );

        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i]) inputs[i].disabled = !enabled;
        }
        for (var b = 0; b < buttons.length; b++) {
            buttons[b].disabled = !enabled;
        }

        if (!part) {
            for (var e = 0; e < inputs.length; e++) if (inputs[e]) inputs[e].value = '';
            return;
        }

        var px = interactionPixels(part);
        if (!px) return;
        if (inputs[0]) inputs[0].value = Math.round(px.x);
        if (inputs[1]) inputs[1].value = Math.round(px.y);
        if (inputs[2]) inputs[2].value = Math.round(px.w);
        if (inputs[3]) inputs[3].value = Math.round(px.h);
    }

    function applyInteractionRectInputs() {
        var part = getSelectedPart();
        if (!part) return;
        var current = interactionPixels(part);
        if (!current) return;

        var x = Number((document.getElementById('part-interaction-x') || {}).value);
        var y = Number((document.getElementById('part-interaction-y') || {}).value);
        var w = Number((document.getElementById('part-interaction-w') || {}).value);
        var h = Number((document.getElementById('part-interaction-h') || {}).value);
        if (![x, y, w, h].every(isFinite)) {
            updateInteractionRectUi();
            return;
        }

        markPartEdit();
        setInteractionPixels(part, { x: x, y: y, w: w, h: h });
        updateInteractionRectUi();
        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus('黄枠の位置・大きさを更新しました');
        }
    }

    function nudgeInteractionRect(dx, dy) {
        var part = getSelectedPart();
        if (!part) return;
        var current = interactionPixels(part);
        if (!current) return;

        markPartEdit();
        current.x += dx;
        current.y += dy;
        setInteractionPixels(part, current);
        updateInteractionRectUi();
        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus('調べる範囲を1px移動しました');
        }
    }

    function resizeInteractionRect(delta) {
        var part = getSelectedPart();
        if (!part) return;
        var current = interactionPixels(part);
        if (!current) return;

        markPartEdit();
        current.x -= delta / 2;
        current.y -= delta / 2;
        current.w += delta;
        current.h += delta;
        setInteractionPixels(part, current);
        updateInteractionRectUi();
        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus(delta > 0 ? '調べる範囲を広げました' : '調べる範囲を狭めました');
        }
    }

    function enhancePartEditor() {
        var form = document.getElementById('part-form');
        if (!form) return;

        var deleteButton = document.getElementById('btn-part-delete');
        if (deleteButton) {
            deleteButton.textContent = '選択中パーツを削除';
            deleteButton.style.flex = '1 1 100%';
        }

        var triggerEnabled = document.getElementById('part-trigger-enabled');
        if (triggerEnabled && triggerEnabled.parentElement) {
            var label = triggerEnabled.parentElement;
            while (label.childNodes.length > 1) label.removeChild(label.lastChild);
            label.appendChild(document.createTextNode(' 調べる範囲を使う'));
        }

        var targetSelect = document.getElementById('edit-target');
        if (targetSelect) {
            var triggerOption = targetSelect.querySelector('option[value="triggers"]');
            if (triggerOption) triggerOption.textContent = '調べる場所（単独）';
        }

        if (!document.getElementById('part-interaction-rect-editor')) {
            var editor = document.createElement('div');
            editor.id = 'part-interaction-rect-editor';
            editor.innerHTML =
                '<div class="part-editor-section">調べる範囲の位置（黄枠）</div>' +
                '<div class="part-editor-row">' +
                    '<button type="button" data-interaction-dx="-1">← 1px</button>' +
                    '<button type="button" data-interaction-dy="-1">↑ 1px</button>' +
                    '<button type="button" data-interaction-dy="1">↓ 1px</button>' +
                    '<button type="button" data-interaction-dx="1">→ 1px</button>' +
                '</div>' +
                '<div class="part-editor-row">' +
                    '<label>X <input id="part-interaction-x" class="part-editor-number" type="number" step="1"></label>' +
                    '<label>Y <input id="part-interaction-y" class="part-editor-number" type="number" step="1"></label>' +
                '</div>' +
                '<div class="part-editor-row">' +
                    '<label>幅 <input id="part-interaction-w" class="part-editor-number" type="number" min="1" step="1"></label>' +
                    '<label>高さ <input id="part-interaction-h" class="part-editor-number" type="number" min="1" step="1"></label>' +
                '</div>' +
                '<div class="part-editor-row">' +
                    '<button type="button" data-interaction-resize="-2">範囲を狭く</button>' +
                    '<button type="button" data-interaction-resize="2">範囲を広く</button>' +
                '</div>' +
                '<div class="part-editor-note">パーツ本体を動かさず、黄色い「調べる」範囲だけを調整します。</div>';

            var actionEditor = document.getElementById('part-action-editor');
            form.insertBefore(editor, actionEditor || null);

            var rectInputs = editor.querySelectorAll('input');
            for (var i = 0; i < rectInputs.length; i++) {
                rectInputs[i].addEventListener('change', applyInteractionRectInputs);
            }

            var nudgeButtons = editor.querySelectorAll('[data-interaction-dx],[data-interaction-dy]');
            for (var n = 0; n < nudgeButtons.length; n++) {
                nudgeButtons[n].addEventListener('click', function () {
                    nudgeInteractionRect(
                        Number(this.getAttribute('data-interaction-dx') || 0),
                        Number(this.getAttribute('data-interaction-dy') || 0)
                    );
                });
            }

            var resizeButtons = editor.querySelectorAll('[data-interaction-resize]');
            for (var r = 0; r < resizeButtons.length; r++) {
                resizeButtons[r].addEventListener('click', function () {
                    resizeInteractionRect(Number(this.getAttribute('data-interaction-resize') || 0));
                });
            }
        }

        updateInteractionRectUi();
    }

    if (typeof window.ensurePartEditorFields === 'function') {
        var baseEnsurePartEditorFields = window.ensurePartEditorFields;
        window.ensurePartEditorFields = function () {
            var result = baseEnsurePartEditorFields.apply(this, arguments);
            enhancePartEditor();
            return result;
        };
    }

    if (typeof window.updatePartEditorSelectionUi === 'function') {
        var baseUpdatePartEditorSelectionUi = window.updatePartEditorSelectionUi;
        window.updatePartEditorSelectionUi = function () {
            var result = baseUpdatePartEditorSelectionUi.apply(this, arguments);
            enhancePartEditor();
            updateInteractionRectUi();
            return result;
        };
    }

    // ------------------------------------------
    // 3. 開発モード: 固定地形の編集を scene 定義へ即時反映
    //    → パーツ移動や再計算の後に通行不可エリアが復活するのを防ぐ
    // ------------------------------------------
    function persistEditorCollisionToScene() {
        if (!window.isEditMode) return;
        if (typeof window.buildExportCollisionData !== 'function') return;

        var data = window.buildExportCollisionData();
        if (!data) return;

        window.passableRects = clone(data.passableRects || []);
        window.blockedRects = clone(data.blockedRects || []);
        window.blockedPoints = clone(data.blockedPoints || []);

        var def = window.activeTownSceneDef;
        if (def) {
            def.passableRects = clone(data.passableRects || []);
            def.blockedRects = clone(data.blockedRects || []);
            def.blockedPoints = clone(data.blockedPoints || []);
        }

        var maps = window.TOWN_SCENE_MAPS;
        var sceneId = window.currentScene;
        if (maps && sceneId && maps[sceneId]) {
            maps[sceneId].passableRects = clone(data.passableRects || []);
            maps[sceneId].blockedRects = clone(data.blockedRects || []);
            maps[sceneId].blockedPoints = clone(data.blockedPoints || []);
        }
    }

    if (typeof window.rebuildCollisionGridFromBase === 'function') {
        var baseRebuildCollisionGridFromBase = window.rebuildCollisionGridFromBase;
        window.rebuildCollisionGridFromBase = function () {
            var result = baseRebuildCollisionGridFromBase.apply(this, arguments);
            persistEditorCollisionToScene();
            return result;
        };
    }

    window.YUMANIWA_STAGING_20260823 = {
        applyStationPlazaPatch: applyStationPlazaPatch,
        persistEditorCollisionToScene: persistEditorCollisionToScene,
        updateInteractionRectUi: updateInteractionRectUi
    };
})();
