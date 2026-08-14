// ==========================================
// 湯間庭町 / 開発ツール拡張
// 町全体で使える共通パーツと、パーツに意味を持たせる編集UIを追加する。
// ==========================================
(function () {
    if (typeof TOWN_PART_CATALOG === 'undefined') return;

    function addCatalogEntry(entry) {
        for (var i = 0; i < TOWN_PART_CATALOG.length; i++) {
            if (TOWN_PART_CATALOG[i] && TOWN_PART_CATALOG[i].key === entry.key) return;
        }
        TOWN_PART_CATALOG.push(entry);
    }

    addCatalogEntry({
        key: 'standingSignboard',
        label: '立て看板（共通）',
        file: '../common/standing-signboard.png',
        w: 2.4,
        h: 3.2,
        collision: { enabled: true, x: 0.18, y: 0.72, w: 0.64, h: 0.28 }
    });

    if (typeof createTownPartFromCatalog === 'function') {
        var baseCreateTownPartFromCatalog = createTownPartFromCatalog;
        createTownPartFromCatalog = function (key, worldX, worldY) {
            var part = baseCreateTownPartFromCatalog(key, worldX, worldY);
            if (part && key === 'standingSignboard') {
                part.id = makeUniquePartId('town_standing_signboard');
                part.interaction = {
                    enabled: false,
                    triggerId: '',
                    x: 0.05,
                    y: 0.20,
                    w: 0.90,
                    h: 0.80
                };
            }
            return part;
        };
    }

    function escapeEditorHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getTriggerForPart(part) {
        if (!part || !part.interaction || !part.interaction.triggerId) return null;
        var id = String(part.interaction.triggerId);
        if (typeof townPartTriggerTemplates !== 'undefined' && townPartTriggerTemplates[id]) {
            return townPartTriggerTemplates[id];
        }
        if (typeof triggers !== 'undefined' && Array.isArray(triggers)) {
            for (var i = 0; i < triggers.length; i++) {
                if (triggers[i] && triggers[i].id === id) return triggers[i];
            }
        }
        return null;
    }

    function buildWorkOptions() {
        var html = '<option value="">作品を選択</option>';
        if (typeof WORKS === 'undefined' || !Array.isArray(WORKS)) return html;
        for (var i = 0; i < WORKS.length; i++) {
            var work = WORKS[i];
            if (!work || !work.id || work.status === 'hidden') continue;
            var suffix = work.status === 'open' ? '' : '（準備中）';
            var title = work.menuTitle || work.frameTitle || work.title || work.id;
            html += '<option value="' + escapeEditorHtml(work.id) + '">' +
                escapeEditorHtml(title + suffix) + '</option>';
        }
        return html;
    }

    function buildPlaceOptions() {
        var items = {};
        if (typeof TOWN_SCENE_MAPS !== 'undefined' && TOWN_SCENE_MAPS) {
            for (var sceneId in TOWN_SCENE_MAPS) {
                if (!Object.prototype.hasOwnProperty.call(TOWN_SCENE_MAPS, sceneId)) continue;
                var scene = TOWN_SCENE_MAPS[sceneId] || {};
                items[sceneId] = scene.title || sceneId;
            }
        }
        if (typeof DESTINATIONS !== 'undefined' && DESTINATIONS) {
            for (var destinationId in DESTINATIONS) {
                if (!Object.prototype.hasOwnProperty.call(DESTINATIONS, destinationId)) continue;
                var destination = DESTINATIONS[destinationId] || {};
                if (!items[destinationId]) items[destinationId] = destination.title || destinationId;
            }
        }
        var html = '<option value="">場所を選択</option>';
        for (var id in items) {
            if (!Object.prototype.hasOwnProperty.call(items, id)) continue;
            html += '<option value="' + escapeEditorHtml(id) + '">' +
                escapeEditorHtml(items[id]) + '</option>';
        }
        return html;
    }

    function ensureTownPartActionStyles() {
        if (document.getElementById('town-part-action-style')) return;
        var style = document.createElement('style');
        style.id = 'town-part-action-style';
        style.textContent =
            '#part-action-editor textarea{width:100%;min-height:58px;resize:vertical;box-sizing:border-box;font:inherit;}' +
            '#part-action-editor select,#part-action-editor input{max-width:100%;box-sizing:border-box;}' +
            '#part-action-editor .part-action-hidden{display:none!important;}';
        document.head.appendChild(style);
    }

    function ensureTownPartActionFields() {
        ensureTownPartActionStyles();
        var form = document.getElementById('part-form');
        if (!form || document.getElementById('part-action-editor')) return;

        var actionEditor = document.createElement('div');
        actionEditor.id = 'part-action-editor';
        actionEditor.innerHTML =
            '<div class="part-editor-section">看板・パーツの役割</div>' +
            '<div class="part-editor-row"><label class="part-editor-grow">動作 ' +
                '<select id="part-action-kind">' +
                    '<option value="none">なし</option>' +
                    '<option value="message">メッセージを表示</option>' +
                    '<option value="work">作品を開く</option>' +
                    '<option value="place">場所を開く</option>' +
                '</select></label></div>' +
            '<div class="part-editor-row"><label class="part-editor-grow">表示名 ' +
                '<input id="part-action-label" type="text" style="width:100%"></label></div>' +
            '<div class="part-editor-row"><label class="part-editor-grow">ボタン表記 ' +
                '<input id="part-action-button-label" type="text" style="width:100%"></label></div>' +
            '<div id="part-action-message-row" class="part-editor-row"><label class="part-editor-grow">メッセージ ' +
                '<textarea id="part-action-text"></textarea></label></div>' +
            '<div id="part-action-work-row" class="part-editor-row part-action-hidden"><label class="part-editor-grow">作品 ' +
                '<select id="part-action-work" style="width:100%">' + buildWorkOptions() + '</select></label></div>' +
            '<div id="part-action-place-row" class="part-editor-row part-action-hidden"><label class="part-editor-grow">場所 ' +
                '<select id="part-action-place" style="width:100%">' + buildPlaceOptions() + '</select></label></div>' +
            '<div class="part-editor-note">立て看板は、同じ見た目のまま案内・作品入口・場所案内として使い回せます。</div>';

        form.appendChild(actionEditor);

        var ids = [
            'part-action-kind', 'part-action-label', 'part-action-button-label',
            'part-action-text', 'part-action-work', 'part-action-place'
        ];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el) el.addEventListener('change', applyTownPartActionInputs);
        }
        updateTownPartActionUi();
    }

    function getActionKindFromTrigger(trigger) {
        if (!trigger) return 'none';
        if (trigger.type === 'work') return 'work';
        if (trigger.type === 'warp' || trigger.type === 'menu') return 'place';
        return 'message';
    }

    function updateTownPartActionVisibility(kind) {
        var messageRow = document.getElementById('part-action-message-row');
        var workRow = document.getElementById('part-action-work-row');
        var placeRow = document.getElementById('part-action-place-row');
        if (messageRow) messageRow.classList.toggle('part-action-hidden', kind === 'none' || kind === 'work');
        if (workRow) workRow.classList.toggle('part-action-hidden', kind !== 'work');
        if (placeRow) placeRow.classList.toggle('part-action-hidden', kind !== 'place');
    }

    function updateTownPartActionUi() {
        var editor = document.getElementById('part-action-editor');
        if (!editor || typeof getSelectedTownPart !== 'function') return;
        var part = getSelectedTownPart();
        var trigger = getTriggerForPart(part);
        var kind = part && part.interaction && part.interaction.enabled !== false
            ? getActionKindFromTrigger(trigger)
            : 'none';

        var kindInput = document.getElementById('part-action-kind');
        var labelInput = document.getElementById('part-action-label');
        var buttonInput = document.getElementById('part-action-button-label');
        var textInput = document.getElementById('part-action-text');
        var workInput = document.getElementById('part-action-work');
        var placeInput = document.getElementById('part-action-place');
        var disabled = !part;
        var inputs = [kindInput, labelInput, buttonInput, textInput, workInput, placeInput];
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i]) inputs[i].disabled = disabled;
        }

        if (kindInput) kindInput.value = kind;
        if (labelInput) labelInput.value = trigger ? String(trigger.label || '') : '';
        if (buttonInput) buttonInput.value = trigger ? String(trigger.actionLabel || '') : '';
        if (textInput) textInput.value = trigger ? String(trigger.text || '') : '';
        if (workInput) workInput.value = trigger && trigger.workId ? String(trigger.workId) : '';
        if (placeInput) placeInput.value = trigger && trigger.target ? String(trigger.target) : '';
        updateTownPartActionVisibility(kind);
    }

    function defaultButtonLabel(kind) {
        if (kind === 'work') return '遊ぶ';
        if (kind === 'place') return '行く';
        if (kind === 'message') return '読む';
        return '調べる';
    }

    function applyTownPartActionInputs() {
        if (typeof getSelectedTownPart !== 'function') return;
        var part = getSelectedTownPart();
        if (!part) return;
        if (typeof ensureTownPartMetadata === 'function') ensureTownPartMetadata(part);

        var kind = String((document.getElementById('part-action-kind') || {}).value || 'none');
        var label = String((document.getElementById('part-action-label') || {}).value || '').trim();
        var actionLabel = String((document.getElementById('part-action-button-label') || {}).value || '').trim();
        var text = String((document.getElementById('part-action-text') || {}).value || '').trim();
        var workId = String((document.getElementById('part-action-work') || {}).value || '').trim();
        var placeId = String((document.getElementById('part-action-place') || {}).value || '').trim();

        if (typeof pushTownPartHistory === 'function') pushTownPartHistory();

        if (kind === 'none') {
            part.interaction.enabled = false;
            if (typeof refreshTownPartDerivedData === 'function') refreshTownPartDerivedData();
            updateTownPartActionVisibility(kind);
            if (typeof updatePartEditorSelectionUi === 'function') updatePartEditorSelectionUi();
            if (typeof updateEditorStatus === 'function') updateEditorStatus('パーツの動作をなしにしました');
            return;
        }

        var triggerId = String(part.interaction.triggerId || '').trim();
        if (!triggerId && typeof makeUniqueTownPartTriggerId === 'function') {
            triggerId = makeUniqueTownPartTriggerId((part.id || 'town_part') + '_trigger');
        }
        part.interaction.enabled = true;
        part.interaction.triggerId = triggerId;

        var template = {
            id: triggerId,
            label: label || (part.id || '立て看板'),
            actionLabel: actionLabel || defaultButtonLabel(kind),
            type: 'inspect',
            text: text || '小さな案内が置かれている。',
            tapPadding: 1
        };
        if (kind === 'work') {
            template.type = 'work';
            template.workId = workId;
            template.text = '';
        } else if (kind === 'place') {
            template.type = 'warp';
            template.target = placeId;
            template.text = text || ((label || 'この先') + 'へ向かいます。');
        }

        if (typeof townPartTriggerTemplates !== 'undefined') {
            townPartTriggerTemplates[triggerId] = template;
        }

        var triggerIdInput = document.getElementById('part-trigger-id');
        var triggerEnabledInput = document.getElementById('part-trigger-enabled');
        if (triggerIdInput) triggerIdInput.value = triggerId;
        if (triggerEnabledInput) triggerEnabledInput.checked = true;

        if (typeof refreshTownPartDerivedData === 'function') refreshTownPartDerivedData();
        updateTownPartActionVisibility(kind);
        if (typeof updatePartEditorSelectionUi === 'function') updatePartEditorSelectionUi();
        if (typeof updateEditorStatus === 'function') updateEditorStatus('パーツの役割を更新しました');
    }

    if (typeof ensurePartEditorFields === 'function') {
        var baseEnsurePartEditorFields = ensurePartEditorFields;
        ensurePartEditorFields = function () {
            baseEnsurePartEditorFields();
            ensureTownPartActionFields();
        };
    }

    if (typeof updatePartEditorSelectionUi === 'function') {
        var baseUpdatePartEditorSelectionUi = updatePartEditorSelectionUi;
        updatePartEditorSelectionUi = function () {
            baseUpdatePartEditorSelectionUi();
            updateTownPartActionUi();
        };
    }

    if (typeof duplicateSelectedPart === 'function') {
        var baseDuplicateSelectedPart = duplicateSelectedPart;
        duplicateSelectedPart = function () {
            var source = typeof getSelectedTownPart === 'function' ? getSelectedTownPart() : null;
            var sourceTrigger = getTriggerForPart(source);
            var sourceCopy = sourceTrigger && typeof cloneTrigger === 'function' ? cloneTrigger(sourceTrigger) : null;
            baseDuplicateSelectedPart();
            var copy = typeof getSelectedTownPart === 'function' ? getSelectedTownPart() : null;
            if (copy && sourceCopy && copy.interaction && copy.interaction.triggerId) {
                sourceCopy.id = copy.interaction.triggerId;
                townPartTriggerTemplates[sourceCopy.id] = sourceCopy;
                if (typeof refreshTownPartDerivedData === 'function') refreshTownPartDerivedData();
                updateTownPartActionUi();
            }
        };
    }
})();
