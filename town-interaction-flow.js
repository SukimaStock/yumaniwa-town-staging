(function() {
    // 湯間庭町の共通操作ルール。
    // RPGらしい歩行や発見の手触りは残しつつ、対象を「使う」操作は1回にまとめる。

    var tapAutoActionTrigger = null;

    // main.js の既存移動処理はそのまま使い、到着後の自動実行だけをこの層で足す。
    var baseStartTapMoveTo = window.startTapMoveTo;
    var baseStartTapMoveToTrigger = window.startTapMoveToTrigger;
    var baseUpdateTapMove = window.updateTapMove;
    var baseCancelTapMove = window.cancelTapMove;

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

    function finishTapAutoActionIfReady() {
        var trigger = tapAutoActionTrigger;
        if (!trigger) return false;

        if (tapMoveTargetTile || tapMoveTargetTrigger) {
            return false;
        }

        // 通常は到着時に tapFocusedTrigger が設定される。
        // すでに対象の近くをタップした場合も、その場で使えるようにする。
        if (tapFocusedTrigger !== trigger && !isPlayerNearTrigger(trigger)) {
            return false;
        }

        // 実行先の処理内で cancelTapMove() が呼ばれても二重実行しないよう、先に予約を消す。
        tapAutoActionTrigger = null;
        if (tapFocusedTrigger === trigger) {
            tapFocusedTrigger = null;
        }

        window.activateTownTrigger(trigger);
        return true;
    }

    // 対象をタップした時だけ「到着後に使う」を予約する。
    // trigger のタップ範囲そのものはまだ変更しない（建物画像全体タップは次段階）。
    window.startTapMoveToTrigger = function(trigger) {
        tapAutoActionTrigger = trigger || null;

        var started = baseStartTapMoveToTrigger(trigger);
        if (!started) {
            tapAutoActionTrigger = null;
            return false;
        }

        // すでに十分近い場合は歩行を挟まず、そのタップでそのまま使う。
        finishTapAutoActionIfReady();
        return true;
    };

    // 歩き切ったフレームで、そのまま対象を使う。
    window.updateTapMove = function() {
        var moved = baseUpdateTapMove();
        finishTapAutoActionIfReady();
        return moved;
    };

    // 地面をタップしたら「そこへ歩く」だけに戻す。
    // 自動実行中に別の地面を選んだ場合も、前の予約はここでキャンセルされる。
    window.startTapMoveTo = function(tileX, tileY) {
        tapAutoActionTrigger = null;
        return baseStartTapMoveTo(tileX, tileY);
    };

    // 十字キー・シーン遷移・メッセージ表示など、既存の cancelTapMove() を使う操作は
    // すべて自動実行予約も一緒に解除する。
    window.cancelTapMove = function() {
        tapAutoActionTrigger = null;
        return baseCancelTapMove.apply(this, arguments);
    };

    // 十字キー・操作ボタン側も、すべて同じ「使う」処理へ集約する。
    window.handleAction = function() {
        var trigger = getNearbyTrigger();
        if (!trigger) return;

        window.activateTownTrigger(trigger);
    };
})();
