// ==========================================
// 湯間庭町 / 開発モード トリガーID自動採番
// 新規トリガー作成時に new_trigger を使わず、
// シーンごとの一意なIDを自動発行する。
// ==========================================
(function () {
    'use strict';

    function sanitizeSceneId(value) {
        var id = String(value || 'scene')
            .replace(/_map$/i, '')
            .replace(/[^A-Za-z0-9_]+/g, '_')
            .replace(/^_+|_+$/g, '');
        return id || 'scene';
    }

    function triggerIdExists(id) {
        var needle = String(id || '');
        if (!needle) return false;

        if (Array.isArray(window.triggers)) {
            for (var i = 0; i < window.triggers.length; i++) {
                var trigger = window.triggers[i];
                if (trigger && String(trigger.id || '') === needle) return true;
            }
        }

        var templates = window.townPartTriggerTemplates;
        if (templates && Object.prototype.hasOwnProperty.call(templates, needle)) {
            return true;
        }

        return false;
    }

    function makeAutoTriggerId() {
        var base = sanitizeSceneId(window.currentScene) + '_trigger';
        var index = 1;
        var candidate = base + '_' + index;

        while (triggerIdExists(candidate)) {
            index += 1;
            candidate = base + '_' + index;
        }

        return candidate;
    }

    var baseGetTriggerFormValues = window.getTriggerFormValues;
    if (typeof baseGetTriggerFormValues !== 'function') return;

    window.getTriggerFormValues = function (area) {
        var values = baseGetTriggerFormValues.apply(this, arguments) || {};
        var id = String(values.id || '').trim();
        var isCreating = typeof window.editingTriggerIndex !== 'number' || window.editingTriggerIndex < 0;

        if (
            isCreating &&
            (!id || id === 'new_trigger' || triggerIdExists(id))
        ) {
            id = makeAutoTriggerId();
            values.id = id;

            var idInput = document.getElementById('trigger-id');
            if (idInput) idInput.value = id;
        }

        return values;
    };

    function prepareIdField() {
        var input = document.getElementById('trigger-id');
        if (!input) return;

        if (input.value === 'new_trigger') input.value = '';
        input.placeholder = '自動';
        input.autocomplete = 'off';
    }

    prepareIdField();
    window.addEventListener('load', prepareIdField);
})();
