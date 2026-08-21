// 湯間庭町 / 開発機能の公開環境ゲート
// staging は常時ON、本番は ?dev=1 のときだけONにする。
(function () {
    var params = new URLSearchParams(window.location.search || "");
    var path = window.location.pathname || "";
    var isStaging =
        path === "/yumaniwa-town-staging" ||
        path.indexOf("/yumaniwa-town-staging/") === 0;

    var enabled = isStaging || params.get("dev") === "1";

    if (typeof DEV_MODE_ENABLED !== "undefined") {
        DEV_MODE_ENABLED = enabled;
    }

    // レジャーセンターで開発モードから確定した「調べる」コメントを
    // staging のシーン定義へ反映する。
    function applyLeisureCenterInteractionDraft() {
        var maps = window.TOWN_SCENE_MAPS;
        var leisure = maps && maps.leisure_center_map;
        if (!leisure) return;

        if (!Array.isArray(leisure.triggers)) leisure.triggers = [];

        function upsertTrigger(trigger) {
            for (var i = 0; i < leisure.triggers.length; i++) {
                if (leisure.triggers[i] && leisure.triggers[i].id === trigger.id) {
                    leisure.triggers[i] = trigger;
                    return;
                }
            }
            leisure.triggers.push(trigger);
        }

        // 旧エディタの仮IDが残っている場合だけ除去する。
        leisure.triggers = leisure.triggers.filter(function (trigger) {
            return !trigger || trigger.id !== 'new_trigger';
        });

        upsertTrigger({
            id: 'Panf',
            label: 'パンフレット',
            actionLabel: '調べる',
            area: { x: 15, y: 3, w: 2, h: 1 },
            type: 'inspect',
            target: '',
            text: '「ご自由にお持ちください」と書かれている'
        });

        upsertTrigger({
            id: 'Uketsuke',
            label: '受付端末',
            actionLabel: '調べる',
            area: { x: 8, y: 3, w: 2, h: 1 },
            type: 'inspect',
            target: '',
            text: '「湯窓レジャーセンターへようこそ」と音声が流れている'
        });

        upsertTrigger({
            id: 'Poster',
            label: '掲示板',
            actionLabel: '調べる',
            area: { x: 3, y: 3, w: 2, h: 1 },
            type: 'inspect',
            target: '',
            text: '催し物のポスターが貼られているようだ'
        });

        upsertTrigger({
            id: 'Annai',
            label: '案内板',
            actionLabel: '調べる',
            area: { x: 7, y: 16, w: 1, h: 1 },
            type: 'inspect',
            target: '',
            text: '展示ガイドはこちら→'
        });
    }

    // 最新の開発モード差分：掲示スタンドの位置・サイズ。
    // town-runtime-fixes.js が後から旧値を適用するため、ロード完了時にも再適用する。
    function applyLeisureBulletinBoardDraft() {
        var maps = window.TOWN_SCENE_MAPS;
        var leisure = maps && maps.leisure_center_map;
        if (!leisure || !Array.isArray(leisure.props)) return;

        for (var i = 0; i < leisure.props.length; i++) {
            var prop = leisure.props[i];
            if (!prop || prop.id !== 'station_leisureBulletinBoard_4') continue;

            prop.x = 2.375;
            prop.y = 0.5625;
            prop.w = 3.25;
            prop.h = 3.25;
            prop.footY = 3.8125;
            return;
        }
    }

    if (enabled) {
        applyLeisureCenterInteractionDraft();
        applyLeisureBulletinBoardDraft();

        // このスクリプトより後に読み込まれる runtime-fixes の上書き後に再適用する。
        window.setTimeout(applyLeisureBulletinBoardDraft, 0);
        window.addEventListener('load', applyLeisureBulletinBoardDraft);
    }

    if (!enabled || typeof window.getTriggerFormValues !== 'function') return;

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
        return !!(
            templates &&
            Object.prototype.hasOwnProperty.call(templates, needle)
        );
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
    window.getTriggerFormValues = function () {
        var values = baseGetTriggerFormValues.apply(this, arguments) || {};
        var id = String(values.id || '').trim();
        var isCreating =
            typeof window.editingTriggerIndex !== 'number' ||
            window.editingTriggerIndex < 0;

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
