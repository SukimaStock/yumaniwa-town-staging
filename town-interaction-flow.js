(function() {
    // 湯間庭町の共通操作ルール。
    // RPGらしい歩行や発見の手触りは残しつつ、対象を「使う」操作は1回にまとめる。

    var tapAutoActionTrigger = null;
    var tapAutoWarpSide = null;
    var EDGE_WARP_TAP_DEPTH = 2;

    // main.js の既存移動処理はそのまま使い、到着後の自動実行と
    // 「見えている物をそのまま触れる」ためのタップ判定だけをこの層で足す。
    var baseStartTapMoveTo = window.startTapMoveTo;
    var baseStartTapMoveToTrigger = window.startTapMoveToTrigger;
    var baseStartTapMoveToNearbyTrigger = window.startTapMoveToNearbyTrigger;
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

    function getTownTriggerById(triggerId) {
        if (!triggerId || !window.triggers) return null;

        for (var i = 0; i < triggers.length; i++) {
            if (triggers[i] && triggers[i].id === triggerId) {
                return triggers[i];
            }
        }

        return null;
    }

    function getInteractivePartTriggerAtTile(tileX, tileY) {
        if (typeof getActiveTownParts !== "function") return null;

        var parts = getActiveTownParts();
        if (!parts || !parts.length) return null;

        // 既存canvas入力はタイル単位なので、そのタイルの中心点で画像矩形を判定する。
        // collision / interaction の矩形はここでは使わない。
        var pointX = tileX + 0.5;
        var pointY = tileY + 0.5;
        var best = null;

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (!part || part.enabled === false) continue;

            var interaction = part.interaction;
            if (!interaction || interaction.enabled === false || !interaction.triggerId) continue;

            var x = Number(part.x);
            var y = Number(part.y);
            var w = Number(part.w);
            var h = Number(part.h);

            if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) {
                continue;
            }

            if (
                pointX < x ||
                pointX >= x + w ||
                pointY < y ||
                pointY >= y + h
            ) {
                continue;
            }

            var trigger = getTownTriggerById(String(interaction.triggerId));
            if (!trigger) continue;

            // 画像が重なった場合は、描画上手前になりやすい footY が大きい方を優先する。
            var footY = (typeof part.footY === "number") ? part.footY : y + h;

            if (
                !best ||
                footY > best.footY ||
                (footY === best.footY && i > best.index)
            ) {
                best = {
                    trigger: trigger,
                    footY: footY,
                    index: i
                };
            }
        }

        return best ? best.trigger : null;
    }

    function getEdgeWarpTapCandidate(tileX, tileY) {
        if (!activeTownSceneDef || !activeTownSceneDef.edgeWarps || !activeTownSceneDef.edgeWarps.length) {
            return null;
        }

        var startTile = getPlayerTile();
        var best = null;
        var warps = activeTownSceneDef.edgeWarps;

        for (var i = 0; i < warps.length; i++) {
            var warp = warps[i];
            if (!warp || !warp.side) continue;

            var min = Math.max(0, Math.floor(Number(warp.min) || 0));
            var max = Math.floor(Number(warp.max));
            if (!isFinite(max)) max = min;

            var tappedAlongExit = false;
            var tapCross = 0;

            if (warp.side === "left") {
                tappedAlongExit = tileX < EDGE_WARP_TAP_DEPTH && tileY >= min && tileY <= max;
                tapCross = tileY;
            } else if (warp.side === "right") {
                tappedAlongExit = tileX >= MAP_WIDTH - EDGE_WARP_TAP_DEPTH && tileY >= min && tileY <= max;
                tapCross = tileY;
            } else if (warp.side === "up") {
                tappedAlongExit = tileY < EDGE_WARP_TAP_DEPTH && tileX >= min && tileX <= max;
                tapCross = tileX;
            } else if (warp.side === "down") {
                tappedAlongExit = tileY >= MAP_HEIGHT - EDGE_WARP_TAP_DEPTH && tileX >= min && tileX <= max;
                tapCross = tileX;
            }

            if (!tappedAlongExit) continue;

            // 出口幅の中から、現在地から実際に歩いて到達できる最寄りの端タイルを探す。
            for (var n = min; n <= max; n++) {
                var goalX = 0;
                var goalY = 0;

                if (warp.side === "left") {
                    goalX = 0;
                    goalY = n;
                } else if (warp.side === "right") {
                    goalX = MAP_WIDTH - 1;
                    goalY = n;
                } else if (warp.side === "up") {
                    goalX = n;
                    goalY = 0;
                } else if (warp.side === "down") {
                    goalX = n;
                    goalY = MAP_HEIGHT - 1;
                } else {
                    continue;
                }

                if (!isWalkableTile(goalX, goalY)) continue;

                var path = findPath(startTile.x, startTile.y, goalX, goalY);
                if (!path) continue;

                // 基本は歩行距離を優先し、同程度ならタップした位置に近い出口を選ぶ。
                var score = path.length * 10 + Math.abs(n - tapCross);

                if (!best || score < best.score) {
                    best = {
                        side: warp.side,
                        tile: { x: goalX, y: goalY },
                        score: score
                    };
                }
            }
        }

        return best;
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

    function finishTapAutoWarpIfReady() {
        var side = tapAutoWarpSide;
        if (!side) return false;

        if (tapMoveTargetTile || tapMoveTargetTrigger) {
            return false;
        }

        // tryTownEdgeWarp() 内で cancelTapMove() が呼ばれるので、先に予約だけ外す。
        tapAutoWarpSide = null;
        return tryTownEdgeWarp(side);
    }

    function startTapMoveToEdgeWarp(candidate) {
        if (!candidate || !candidate.side || !candidate.tile) return false;

        tapAutoActionTrigger = null;
        tapAutoWarpSide = candidate.side;

        // wrapper版 startTapMoveTo() は出口予約を消すため、ここだけ既存本体を直接使う。
        var started = baseStartTapMoveTo(candidate.tile.x, candidate.tile.y);
        if (!started) {
            tapAutoWarpSide = null;
            return false;
        }

        // すでに出口タイルにいる場合も、そのタップでそのまま移動する。
        finishTapAutoWarpIfReady();
        return true;
    }

    // 対象をタップした時だけ「到着後に使う」を予約する。
    window.startTapMoveToTrigger = function(trigger) {
        tapAutoWarpSide = null;
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

    // 優先順位は「触れる物 → 既存trigger → 出口 → 地面」。
    // 出口はマップ外周2タイル以内かつ、その方向に実在する edgeWarp の範囲だけ反応する。
    window.startTapMoveToNearbyTrigger = function(tileX, tileY) {
        var partTrigger = getInteractivePartTriggerAtTile(tileX, tileY);

        if (partTrigger) {
            return window.startTapMoveToTrigger(partTrigger);
        }

        if (baseStartTapMoveToNearbyTrigger(tileX, tileY)) {
            return true;
        }

        var edgeCandidate = getEdgeWarpTapCandidate(tileX, tileY);
        if (edgeCandidate) {
            return startTapMoveToEdgeWarp(edgeCandidate);
        }

        return false;
    };

    // 歩き切ったフレームで、そのまま対象を使う／隣エリアへ抜ける。
    window.updateTapMove = function() {
        var moved = baseUpdateTapMove();

        if (!finishTapAutoActionIfReady()) {
            finishTapAutoWarpIfReady();
        }

        return moved;
    };

    // 地面をタップしたら「そこへ歩く」だけに戻す。
    // 自動実行中に別の地面を選んだ場合も、前の予約はここでキャンセルされる。
    window.startTapMoveTo = function(tileX, tileY) {
        tapAutoActionTrigger = null;
        tapAutoWarpSide = null;
        return baseStartTapMoveTo(tileX, tileY);
    };

    // 十字キー・シーン遷移・メッセージ表示など、既存の cancelTapMove() を使う操作は
    // すべて自動実行予約も一緒に解除する。
    window.cancelTapMove = function() {
        tapAutoActionTrigger = null;
        tapAutoWarpSide = null;
        return baseCancelTapMove.apply(this, arguments);
    };

    // 十字キー・操作ボタン側も、すべて同じ「使う」処理へ集約する。
    window.handleAction = function() {
        var trigger = getNearbyTrigger();
        if (!trigger) return;

        window.activateTownTrigger(trigger);
    };
})();
