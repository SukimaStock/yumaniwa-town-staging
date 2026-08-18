// ==========================================
// 湯間庭町 / 開発モード安全書き出し
// 実行時に追加・上書きされたパーツを丸ごと正本へ混ぜず、
// 開発モードを開いてから実際に変更した差分だけを書き出す。
// ==========================================
(function () {
    'use strict';

    var editorBaseline = null;
    var baselineCaptureToken = 0;

    function clone(value) {
        if (value === undefined) return undefined;
        return JSON.parse(JSON.stringify(value));
    }

    function same(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    function getSceneSource(sceneId) {
        return sceneId === 'station_plaza'
            ? 'data/station-plaza.js'
            : 'data/town-maps.js';
    }

    function getPartSource(sceneId, part) {
        var id = String((part && part.id) || '');

        if (id === 'station_update_history_signboard') return 'town-update-sign.js';
        if (id === 'station_feedback_box_placeholder') return 'town-feedback-box.js';
        if (id === 'station_ghost_npc') return 'town-ghost-npc.js';

        if (
            id === 'yakitori_yumado_shop' ||
            id === 'common_temporary_storefront' ||
            id === 'no_entry_sign' ||
            (sceneId === 'yumado_street_map' && id === 'standing_signboard')
        ) {
            return 'data/town-runtime-fixes.js';
        }

        return getSceneSource(sceneId);
    }

    function getTriggerSource(sceneId, trigger) {
        var id = String((trigger && trigger.id) || '');

        if (id === 'town_update_history_sign') return 'town-update-sign.js';
        if (id === 'town_feedback_box_trigger') return 'town-feedback-box.js';
        if (id === 'station_ghost_npc_trigger') return 'town-ghost-npc.js';

        return getSceneSource(sceneId);
    }

    function listById(items) {
        var result = {};
        var source = Array.isArray(items) ? items : [];

        for (var i = 0; i < source.length; i++) {
            var item = source[i];
            if (!item || !item.id) continue;
            result[String(item.id)] = item;
        }

        return result;
    }

    function diffById(beforeItems, afterItems, sourceResolver, sceneId) {
        var before = listById(beforeItems);
        var after = listById(afterItems);
        var ids = {};
        var changes = [];
        var id;

        for (id in before) {
            if (Object.prototype.hasOwnProperty.call(before, id)) ids[id] = true;
        }
        for (id in after) {
            if (Object.prototype.hasOwnProperty.call(after, id)) ids[id] = true;
        }

        for (id in ids) {
            if (!Object.prototype.hasOwnProperty.call(ids, id)) continue;

            var beforeItem = before[id];
            var afterItem = after[id];
            var resolverItem = afterItem || beforeItem || { id: id };
            var source = sourceResolver(sceneId, resolverItem);

            if (!beforeItem && afterItem) {
                changes.push({
                    op: 'add',
                    id: id,
                    source: source,
                    after: clone(afterItem)
                });
                continue;
            }

            if (beforeItem && !afterItem) {
                changes.push({
                    op: 'delete',
                    id: id,
                    source: source,
                    before: clone(beforeItem)
                });
                continue;
            }

            if (!same(beforeItem, afterItem)) {
                changes.push({
                    op: 'update',
                    id: id,
                    source: source,
                    before: clone(beforeItem),
                    after: clone(afterItem)
                });
            }
        }

        return changes;
    }

    function getCurrentCollisionData() {
        if (typeof window.buildExportCollisionData !== 'function') return null;
        return clone(window.buildExportCollisionData());
    }

    function getCurrentParts() {
        if (typeof window.getActiveTownParts !== 'function') return [];
        return clone(window.getActiveTownParts());
    }

    function getCurrentTriggers() {
        return clone(Array.isArray(window.triggers) ? window.triggers : []);
    }

    function getCurrentAreaZones() {
        return clone(Array.isArray(window.areaZones) ? window.areaZones : []);
    }

    function getEditHistoryLength() {
        return Array.isArray(window.editHistory) ? window.editHistory.length : 0;
    }

    function hasGridEditSinceBaseline(baseline) {
        if (!baseline || !Array.isArray(window.editHistory)) return false;

        var start = Math.max(0, Number(baseline.historyLength) || 0);
        for (var i = start; i < window.editHistory.length; i++) {
            var entry = window.editHistory[i];
            if (entry && entry.type === 'grid') return true;
        }

        return false;
    }

    function captureBaselineNow() {
        if (!window.currentScene) return;

        editorBaseline = {
            sceneId: window.currentScene,
            parts: getCurrentParts(),
            triggers: getCurrentTriggers(),
            collision: getCurrentCollisionData(),
            areaZones: getCurrentAreaZones(),
            historyLength: getEditHistoryLength()
        };
    }

    function scheduleBaselineCapture(force) {
        if (!force && window.editorHasUnsavedChanges && editorBaseline) return;

        baselineCaptureToken += 1;
        var token = baselineCaptureToken;

        // おばけ等の実行時アニメーションが編集モード用の基準位置へ戻った後に記録する。
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                if (token !== baselineCaptureToken) return;
                if (!window.isEditMode) return;
                captureBaselineNow();
            });
        });
    }

    function buildChangeManifest() {
        var sceneId = window.currentScene || 'station_plaza';

        if (!editorBaseline || editorBaseline.sceneId !== sceneId) {
            captureBaselineNow();
        }

        var baseline = editorBaseline || {
            sceneId: sceneId,
            parts: [],
            triggers: [],
            collision: null,
            areaZones: [],
            historyLength: getEditHistoryLength()
        };

        var currentParts = getCurrentParts();
        var currentTriggers = getCurrentTriggers();
        var currentCollision = getCurrentCollisionData();
        var currentAreaZones = getCurrentAreaZones();

        var partChanges = diffById(
            baseline.parts,
            currentParts,
            getPartSource,
            sceneId
        );

        var triggerChanges = diffById(
            baseline.triggers,
            currentTriggers,
            getTriggerSource,
            sceneId
        );

        // パーツの移動・拡縮後には、そのパーツ由来のcollisionが
        // 一時的にグリッドへ反映されることがある。
        // 固定地形の編集履歴（type: grid）が実際に増えた時だけ
        // collision差分として扱う。
        var collisionWasEdited = hasGridEditSinceBaseline(baseline);
        var collisionChange = (
            collisionWasEdited &&
            !same(baseline.collision, currentCollision)
        )
            ? {
                source: getSceneSource(sceneId),
                before: clone(baseline.collision),
                after: clone(currentCollision)
            }
            : null;

        var areaZonesChange = same(baseline.areaZones, currentAreaZones)
            ? null
            : {
                source: getSceneSource(sceneId),
                before: clone(baseline.areaZones),
                after: clone(currentAreaZones)
            };

        return {
            format: 'yumaniwa-editor-diff-v1',
            scene: sceneId,
            title: window.activeTownSceneDef && window.activeTownSceneDef.title
                ? window.activeTownSceneDef.title
                : sceneId,
            note: '開発モードを開いてから変更した内容だけです。before/afterを確認し、sourceに示した正本へ反映してください。',
            changes: {
                props: partChanges,
                triggers: triggerChanges,
                collision: collisionChange,
                areaZones: areaZonesChange
            }
        };
    }

    function manifestHasChanges(manifest) {
        if (!manifest || !manifest.changes) return false;
        return !!(
            (manifest.changes.props && manifest.changes.props.length) ||
            (manifest.changes.triggers && manifest.changes.triggers.length) ||
            manifest.changes.collision ||
            manifest.changes.areaZones
        );
    }

    function buildSafeExportText() {
        var manifest = buildChangeManifest();
        var lines = [
            '// ==========================================',
            '// 湯間庭町 / 開発モード変更差分',
            '// 完全版ではなく、この編集セッションで触った箇所だけを書き出します。',
            '// ==========================================',
            '',
            JSON.stringify(manifest, null, 4),
            ''
        ];

        return lines.join('\n');
    }

    function showSafeExportModal() {
        var textarea = document.getElementById('export-textarea');
        if (!textarea) return;

        var manifest = buildChangeManifest();
        textarea.value = [
            '// ==========================================',
            '// 湯間庭町 / 開発モード変更差分',
            '// 完全版ではなく、この編集セッションで触った箇所だけを書き出します。',
            '// ==========================================',
            '',
            JSON.stringify(manifest, null, 4),
            ''
        ].join('\n');

        var modal = document.getElementById('export-modal');
        if (modal) modal.style.display = 'flex';

        var copyButton = document.getElementById('btn-copy-export');
        if (copyButton) copyButton.innerText = '変更差分をコピー';

        if (typeof window.updateEditorStatus === 'function') {
            window.updateEditorStatus(
                manifestHasChanges(manifest)
                    ? '変更した箇所だけを書き出しています'
                    : 'この編集セッションでは、まだ変更がありません'
            );
        }
    }

    function updateExportUiLabels() {
        var modal = document.getElementById('export-modal');
        var header = modal ? modal.querySelector('.export-header strong') : null;
        var exportButton = document.getElementById('btn-editor-export');

        if (header) header.textContent = '変更内容を書き出す';
        if (exportButton) exportButton.textContent = '変更を書き出す';
    }

    var baseToggleDebugMode = window.toggleDebugMode;
    if (typeof baseToggleDebugMode === 'function') {
        window.toggleDebugMode = function () {
            var result = baseToggleDebugMode.apply(this, arguments);

            if (window.isEditMode) {
                scheduleBaselineCapture(!window.editorHasUnsavedChanges || !editorBaseline);
            }

            return result;
        };
    }

    var baseMarkEditorExportCopied = window.markEditorExportCopied;
    if (typeof baseMarkEditorExportCopied === 'function') {
        window.markEditorExportCopied = function () {
            var result = baseMarkEditorExportCopied.apply(this, arguments);

            // コピー後は、そこを新しい基準にする。
            // 初期ロード時は編集モードではないので基準を作らない。
            if (window.isEditMode) {
                captureBaselineNow();
            }

            return result;
        };
    }

    window.buildFullStationPlazaExportCode = buildSafeExportText;
    window.showExportModal = showSafeExportModal;
    window.YUMANIWA_EDITOR_CAPTURE_BASELINE = captureBaselineNow;
    window.YUMANIWA_EDITOR_BUILD_DIFF = buildChangeManifest;

    updateExportUiLabels();
    window.addEventListener('load', updateExportUiLabels);
})();
