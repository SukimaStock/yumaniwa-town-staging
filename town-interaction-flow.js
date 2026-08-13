(function() {
    // 湯間庭町の共通操作ルール。
    // RPGらしい歩行や発見の手触りは残しつつ、対象を「使う」操作は1回にまとめる。

    function openTownMenuDirectly(trigger) {
        if (!trigger || !trigger.target) {
            showMessage((trigger && trigger.text) || "この場所は、まだ準備中です。");
            return false;
        }

        var target = trigger.target;

        if (!(window.DESTINATIONS && window.DESTINATIONS[target]) && !isTownScene(target)) {
            showMessage(trigger.text || "この場所は、まだ準備中です。");
            return false;
        }

        changeScene(target);

        // 通常の施設メニューは intro を挟まず、選択肢を直接見せる。
        // 湯間庭新報は openDestination() が note_rack を直接開く既存仕様をそのまま使う。
        if (!isTownScene(target) && target !== "shinpo_board") {
            destinationViewMode = "menu";
            renderDestination();
        }

        return true;
    }

    window.activateTownTrigger = function(trigger) {
        if (!trigger) return false;

        if (trigger.id === "tourist_map") {
            openStationGuideMap();
            return true;
        }

        if (trigger.type === "work") {
            var work = trigger.workId ? getWorkById(trigger.workId) : null;

            if (work) {
                launchWork(work);
            } else {
                showMessage(trigger.text || "この作品は、まだ準備中です。");
            }

            return true;
        }

        if (trigger.type === "inspect") {
            showMessage(trigger.text);
            return true;
        }

        if (trigger.type === "menu") {
            return openTownMenuDirectly(trigger);
        }

        // warp は今回の変更対象外。
        // 従来どおり、説明を読んだあとにもう一度操作して移動する。
        if (trigger.type === "warp") {
            var actionName = trigger.actionLabel || "調べる";
            showMessage(
                trigger.text +
                "<br><span style='font-size:14px; color:#aaa;'>(もう一度「" +
                actionName +
                "」で開く)</span>"
            );
            pendingWarp = trigger.target;
            return true;
        }

        return false;
    };

    // 十字キー・操作ボタン側も、すべて同じ「使う」処理へ集約する。
    window.handleAction = function() {
        var trigger = getNearbyTrigger();
        if (!trigger) return;

        window.activateTownTrigger(trigger);
    };
})();
