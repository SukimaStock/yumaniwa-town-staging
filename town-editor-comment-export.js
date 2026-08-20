// ==========================================
// 湯間庭町 / 開発モード コメント書き出し補完
// パーツ編集UIで設定した表示名・ボタン・コメント等を
// yumaniwa-editor-diff-v1 の triggers 差分へ確実に含める。
// ==========================================
(function () {
    'use strict';

    var triggerBaseline = null;
    var baselineSceneId = null;

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

    function getTriggerSource(sceneId, trigger) {
        var id = String((trigger && trigger.id) || '');
        if (id === 'town_update_history_sign') return 'town-update-sign.js';
        if (id === 'town_feedback_box_trigger') return 'town-feedback-box.js';
        if (id === 'station_ghost_npc_trigger') return 'town-ghost-npc.js';
        return getSceneSource(sceneId);
    }

    function mergeOwn(target, source, skipArea) {
        if (!source) return target;
        for (var key in source) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
            if (skipArea && key === 'area') continue;
            target[key] = clone(source[key]);
        }
        return target;
    }

    function getParts() {
        if (typeof window.getActiveTownParts !== 'function') return [];
        return clone(window.getActiveTownParts());
    }

    function getPartArea(part, runtimeTrigger, template) {
        if (runtimeTrigger && runtimeTrigger.area) return clone(runtimeTrigger.area);
        if (template && template.area) return clone(template.area);

        if (typeof window.getTownPartTriggerArea === 'function') {
            try {
                var area = window.getTownPartTriggerArea(part);
                if (area) return clone(area);
            } catch (error) {
                console.warn('[Yumaniwa editor] trigger area export fallback failed', error);
            }
        }
        return null;
    }

    function getTriggersForExport() {
        var runtime = clone(Array.isArray(window.triggers) ? window.triggers : []);
        var byId = {};
        var order = [];
        var i;

        for (i = 0; i < runtime.length; i++) {
            var trigger = runtime[i];
            if (!trigger || !trigger.id) continue;
            var id = String(trigger.id);
            byId[id] = trigger;
            order.push(id);
        }

        var templates = window.townPartTriggerTemplates || {};
        var parts = getParts();

        for (i = 0; i < parts.length; i++) {
            var part = parts[i];
            var interaction = part && part.interaction;
            if (!interaction || interaction.enabled === false || !interaction.triggerId) continue;

            var triggerId = String(interaction.triggerId);
            var template = templates[triggerId];
            if (!template) continue;

            var existing = byId[triggerId] || null;
            var merged = clone(existing || {});
            mergeOwn(merged, template, true);
            merged.id = triggerId;

            var area = getPartArea(part, existing, template);
            if (area) merged.area = area;

            if (!existing) order.push(triggerId);
            byId[triggerId] = merged;
        }

        var result = [];
        var seen = {};
        for (i = 0; i < order.length; i++) {
            var nextId = order[i];
            if (seen[nextId] || !byId[nextId]) continue;
            seen[nextId] = true;
            result.push(clone(byId[nextId]));
        }
        return result;
    }

    function mapById(items) {
        var result = {};
        var source = Array.isArray(items) ? items : [];
        for (var i = 0; i < source.length; i++) {
            var item = source[i];
            if (item && item.id) result[String(item.id)] = item;
        }
        return result;
    }

    function diffTriggers(beforeItems, afterItems, sceneId) {
        var before = mapById(beforeItems);
        var after = mapById(afterItems);
        var ids = {};
        var changes = [];
        var id;

        for (id in before) if (Object.prototype.hasOwnProperty.call(before, id)) ids[id] = true;
        for (id in after) if (Object.prototype.hasOwnProperty.call(after, id)) ids[id] = true;

        for (id in ids) {
            if (!Object.prototype.hasOwnProperty.call(ids, id)) continue;
            var beforeItem = before[id];
            var afterItem = after[id];
            if (same(beforeItem, afterItem)) continue;

            var change = {
                op: beforeItem ? (afterItem ? 'update' : 'delete') : 'add',
                id: id,
                source: getTriggerSource(sceneId, afterItem || beforeItem || { id: id })
            };
            if (beforeItem) change.before = clone(beforeItem);
            if (afterItem) change.after = clone(afterItem);
            changes.push(change);
        }

        return changes;
    }

    function captureTriggerBaseline() {
        baselineSceneId = window.currentScene || 'station_plaza';
        triggerBaseline = getTriggersForExport();
    }

    function flushPendingPartActionEdit() {
        var active = document.activeElement;
        if (active && active.closest && active.closest('#part-action-editor')) {
            active.blur();
        }
    }

    function mergeTriggerChanges(baseChanges, extraChanges) {
        var merged = [];
        var indexById = {};
        var i;

        baseChanges = Array.isArray(baseChanges) ? baseChanges : [];
        extraChanges = Array.isArray(extraChanges) ? extraChanges : [];

        for (i = 0; i < baseChanges.length; i++) {
            var base = clone(baseChanges[i]);
            indexById[String(base.id)] = merged.length;
            merged.push(base);
        }

        for (i = 0; i < extraChanges.length; i++) {
            var extra = clone(extraChanges[i]);
            var id = String(extra.id);
            if (Object.prototype.hasOwnProperty.call(indexById, id)) {
                merged[indexById[id]] = extra;
            } else {
                indexById[id] = merged.length;
                merged.push(extra);
            }
        }

        return merged;
    }

    var baseBuildDiff = window.YUMANIWA_EDITOR_BUILD_DIFF;

    function buildDiffWithPartComments() {
        flushPendingPartActionEdit();

        var sceneId = window.currentScene || 'station_plaza';
        if (!triggerBaseline || baselineSceneId !== sceneId) {
            captureTriggerBaseline();
        }

        var manifest = typeof baseBuildDiff === 'function'
            ? baseBuildDiff()
            : {
                format: 'yumaniwa-editor-diff-v1',
                scene: sceneId,
                title: sceneId,
                changes: { props: [], triggers: [], collision: null, areaZones: null }
            };

        manifest = clone(manifest);
        manifest.changes = manifest.changes || {};

        var triggerChanges = diffTriggers(
            triggerBaseline || [],
            getTriggersForExport(),
            sceneId
        );

        manifest.changes.triggers = mergeTriggerChanges(
            manifest.changes.triggers,
            triggerChanges
        );

        manifest.note = '開発モードを開いてから変更した内容だけです。パーツに割り当てた表示名・ボタン・コメント等もtriggersへ含まれます。before/afterを確認し、sourceに示した正本へ反映してください。';
        return manifest;
    }

    function hasChanges(manifest) {
        var c = manifest && manifest.changes;
        return !!(c && (
            (c.props && c.props.length) ||
            (c.triggers && c.triggers.length) ||
            c.collision ||
            c.areaZones
        ));
    }

    function buildExportText() {
        var manifest = buildDiffWithPartComments();
        return [
            '// ==========================================',
            '// 湯間庭町 / 開発モード変更差分',
            '// 完全版ではなく、この編集セッションで触った箇所だけを書き出します。',
            '// パーツの表示名・ボタン・コメントも triggers に含みます。',
            '// ==========================================',
            '',
            JSON.stringify(manifest, null, 4),
            ''
        ].join('\n');
    }

    function showExportModal() {
        var textarea = document.getElementById('export-textarea');
        if (!textarea) return;

        var manifest = buildDiffWithPartComments();
        textarea.value = [
            '// ==========================================',
            '// 湯間庭町 / 開発モード変更差分',
            '// 完全版ではなく、この編集セッションで触った箇所だけを書き出します。',
            '// パーツの表示名・ボタン・コメントも triggers に含みます。',
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
                hasChanges(manifest)
                    ? '位置・サイズ・コメント等の変更だけを書き出しています'
                    : 'この編集セッションでは、まだ変更がありません'
            );
        }
    }

    function bindDirtyTracking() {
        if (window.__yumaniwaPartActionDirtyTrackingReady) return;
        window.__yumaniwaPartActionDirtyTrackingReady = true;

        document.addEventListener('change', function (event) {
            var target = event && event.target;
            if (!target || !target.closest || !target.closest('#part-action-editor')) return;
            if (typeof window.markEditorDirty === 'function') window.markEditorDirty();
        });
    }

    var baseToggleDebugMode = window.toggleDebugMode;
    if (typeof baseToggleDebugMode === 'function') {
        window.toggleDebugMode = function () {
            var result = baseToggleDebugMode.apply(this, arguments);
            if (window.isEditMode) captureTriggerBaseline();
            return result;
        };
    }

    var baseMarkEditorExportCopied = window.markEditorExportCopied;
    if (typeof baseMarkEditorExportCopied === 'function') {
        window.markEditorExportCopied = function () {
            var result = baseMarkEditorExportCopied.apply(this, arguments);
            if (window.isEditMode) captureTriggerBaseline();
            return result;
        };
    }

    window.YUMANIWA_EDITOR_BUILD_DIFF = buildDiffWithPartComments;
    window.YUMANIWA_EDITOR_GET_TRIGGERS_FOR_EXPORT = getTriggersForExport;
    window.buildFullStationPlazaExportCode = buildExportText;
    window.showExportModal = showExportModal;

    bindDirtyTracking();
})();
