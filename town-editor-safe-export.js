// ==========================================
// 湯間庭町 / 開発モード安全書き出し
// 単一sessionの不変baselineとdraftだけを比較する。runtimeから再取得しない。
// ==========================================
(function () {
    'use strict';

    var sessionApi = window.YUMANIWA_EDITOR_SESSION;
    var clone = sessionApi.clone;
    var same = sessionApi.same;

    function getSceneSource(sceneId) {
        return sceneId === 'station_plaza'
            ? 'data/station-plaza.js'
            : 'data/town-maps.js';
    }

    function getPartSource(sceneId, part) {
        var id = String((part && part.id) || '');

        if (id === 'station_ghost_npc') return 'town-ghost-npc.js';

        // Town placement is canonical in station-plaza.js / town-maps.js.
        // runtime-fixes.js must never be an editor-diff destination.
        return getSceneSource(sceneId);
    }

    function getTriggerSource(sceneId, trigger) {
        var id = String((trigger && trigger.id) || '');

        if (id === 'station_ghost_npc_trigger') return 'town-ghost-npc.js';

        return getSceneSource(sceneId);
    }

    function listById(items) {
        var result = Object.create(null);
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
        var ids = Object.create(null);
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

    function buildChangeManifest() {
        var session = sessionApi.current();
        if (!session) throw new Error('Editor sessionを開いてください');
        var baseline = session.baseline;
        var after = sessionApi.snapshot();
        var validation = window.YUMANIWA_SCENE_VALIDATION.validateSceneData(
            after, window.YUMANIWA_WORLD_OBJECTS.objects);
        if (!validation.ok) throw new Error('書き出せない変更: ' + validation.errors.join('; '));
        var sceneId = session.sceneId;
        function collision(scene) {
            return { passableRects: clone(scene.passableRects), blockedRects: clone(scene.blockedRects),
                blockedPoints: clone(scene.blockedPoints) };
        }
        var beforeCollision = collision(baseline), afterCollision = collision(after);
        return {
            format: 'yumaniwa-editor-diff-v1', scene: sceneId, title: baseline.title,
            note: '正本からの累積変更です。コピーではbaselineを更新しません。',
            changes: {
                props: diffById(baseline.props, after.props, getPartSource, sceneId),
                triggers: diffById(baseline.triggers, after.triggers, getTriggerSource, sceneId),
                collision: same(beforeCollision, afterCollision) ? null : {
                    source: getSceneSource(sceneId), before: beforeCollision, after: afterCollision },
                areaZones: same(baseline.areaZones, after.areaZones) ? null : {
                    source: getSceneSource(sceneId), before: clone(baseline.areaZones), after: clone(after.areaZones) }
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

        var manifest;
        try { manifest = buildChangeManifest(); }
        catch (error) {
            textarea.value = '';
            window.updateEditorStatus(error.message);
            window.alert(error.message);
            return;
        }
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

    window.buildFullStationPlazaExportCode = buildSafeExportText;
    window.showExportModal = showSafeExportModal;
    window.YUMANIWA_EDITOR_BUILD_DIFF = buildChangeManifest;

    updateExportUiLabels();
    window.addEventListener('load', updateExportUiLabels);
})();
