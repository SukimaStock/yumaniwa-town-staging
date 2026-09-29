// One owner for tap movement and accepted trigger activation. No global replacement.
(function () {
    'use strict';
    var request = null;
    var EDGE_WARP_TAP_DEPTH = 2;

    function cancel() { request = null; }
    function canInteract() {
        return canControlTownPlayer();
    }
    function begin(path, tile, arrival) {
        request = { sceneId: currentScene, path: path, pathIndex: 0, arrival: arrival };
        tapMarkerPos = { x: tile.x, y: tile.y };
        tapMarkerTimer = 60;
        completeIfArrived();
        updateInteractionHint();
        return true;
    }
    function requestGroundMove(x, y) {
        cancel();
        if (!canInteract() || !isWalkableTile(x, y)) return false;
        var start = getPlayerTile();
        var path = findPath(start.x, start.y, x, y);
        return path ? begin(path, {x:x, y:y}, {type:'none'}) : false;
    }
    function requestTrigger(id) {
        cancel();
        if (!canInteract()) return false;
        var trigger = getTownTriggerById(id);
        if (!trigger || trigger.enabled === false) return false;
        var approach = isPlayerNearTrigger(trigger) ? {tile:getPlayerTile(), path:[]} : findApproachTileForTrigger(trigger);
        return approach ? begin(approach.path, approach.tile, {type:'trigger', triggerId:id}) : false;
    }
    function requestEdgeWarp(candidate) {
        cancel();
        if (!canInteract() || !candidate || !candidate.tile || !candidate.side) return false;
        var start = getPlayerTile(), tile = candidate.tile;
        if (!isWalkableTile(tile.x, tile.y)) return false;
        var path = findPath(start.x, start.y, tile.x, tile.y);
        return path ? begin(path, tile, {type:'edgeWarp', side:candidate.side}) : false;
    }
    function requestTap(x, y) {
        cancel();
        if (!canInteract()) return false;
        var trigger = getTapPartTriggerAtTile(x, y) ||
            getDirectTapTriggerCandidate(x, y, getTapManagedTriggerIds());
        // A selected but unreachable trigger must not fall through to another action.
        if (trigger) return requestTrigger(trigger.id);
        var edge = getEdgeWarpTapCandidate(x, y);
        return edge ? requestEdgeWarp(edge) : requestGroundMove(x, y);
    }
    function completeIfArrived() {
        if (!request || request.pathIndex < request.path.length) return false;
        var done = request;
        cancel(); // Consume before activation/scene change can re-enter.
        if (done.sceneId !== currentScene || !canInteract()) return false;
        if (done.arrival.type === 'trigger') return activateTrigger(done.arrival.triggerId);
        if (done.arrival.type === 'edgeWarp') return tryTownEdgeWarp(done.arrival.side);
        return true;
    }
    function update() {
        if (!request) return false;
        if (request.sceneId !== currentScene || !canInteract()) { cancel(); return false; }
        var target = request.path[request.pathIndex];
        if (!target) { completeIfArrived(); return false; }
        if (!isWalkableTile(target.x, target.y)) { cancel(); return false; }
        var hitbox = getPlayerHitbox(player.x, player.y);
        var dx = target.x * TILE_SIZE + TILE_SIZE / 2 - (hitbox.x + hitbox.w / 2);
        var dy = target.y * TILE_SIZE + TILE_SIZE / 2 - (hitbox.y + hitbox.h / 2);
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.speed) {
            player.x += dx; player.y += dy;
            request.pathIndex++;
            completeIfArrived();
            return true;
        }
        var moveX = dx / dist * player.speed, moveY = dy / dist * player.speed;
        player.dir = Math.abs(moveX) > Math.abs(moveY) ?
            (moveX > 0 ? 'right' : 'left') : (moveY > 0 ? 'down' : 'up');
        var oldX = player.x, oldY = player.y;
        if (!checkCollision(player.x + moveX, player.y)) player.x += moveX;
        if (!checkCollision(player.x, player.y + moveY)) player.y += moveY;
        if (player.x === oldX && player.y === oldY) cancel();
        return true;
    }
    function activateTrigger(id) {
        cancel();
        if (!canInteract()) return false;
        var trigger = getTownTriggerById(id);
        if (!trigger || trigger.enabled === false || !isPlayerNearTrigger(trigger)) return false;
        var sceneId = currentScene;
        faceTrigger(trigger);
        var payload = trigger;
        if (trigger.id === 'station_ghost_npc_trigger' && window.YUMANIWA_GHOST_NPC) {
            payload = window.YUMANIWA_GHOST_NPC.prepareActivation(trigger);
        }
        var accepted = dispatchTrigger(payload);
        if (accepted) {
            if (window.YumaniwaMemory) window.YumaniwaMemory.onTriggerActivated(trigger);
            if (window.YUMANIWA_TRIGGER_ANALYTICS) window.YUMANIWA_TRIGGER_ANALYTICS.onTriggerActivated(trigger, sceneId);
        }
        return accepted;
    }
    function handleAction() {
        cancel();
        if (isEditMode) return false;
        if (isMessageOpen) {
            var target = pendingWarp;
            closeMessage(); // Clearing confirmation is separate from cancelling movement.
            return target ? changeSceneWithTownFade(target) : true;
        }
        if (!canInteract()) return false;
        var trigger = getNearbyTrigger();
        return trigger ? activateTrigger(trigger.id) : false;
    }

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

        if (!changeScene(target)) return false;

        // 通常の施設メニューは intro を挟まず、選択肢を直接見せる。
        // 湯間庭新報と展示ガイドは openDestination() が選んだ専用viewをそのまま使う。
        if (
            !isTownScene(target) &&
            target !== "shinpo_board" &&
            target !== "leisure_catalog"
        ) {
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

    function getTapTargetSpec(part) {
        if (!part || !Object.prototype.hasOwnProperty.call(part, "tap")) return null;

        // Dedicated direct-tap geometry is owned by the placement itself.
        // tap:false or { enabled:false } is an explicit opt-out and must
        // never fall through to another registry or trigger-area fallback.
        if (
            part.tap === false ||
            !part.tap ||
            typeof part.tap !== "object" ||
            part.tap.enabled === false
        ) {
            return null;
        }

        return part.tap;
    }

    function getTapManagedTriggerIds() {
        var managed = {};
        if (typeof getActiveTownParts !== "function") return managed;

        var parts = getActiveTownParts();
        if (!parts || !parts.length) return managed;

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (
                !part ||
                part.enabled === false ||
                !Object.prototype.hasOwnProperty.call(part, "tap")
            ) {
                continue;
            }

            var interaction = part.interaction;
            if (!interaction || interaction.enabled === false || !interaction.triggerId) continue;

            // Any explicit tap policy owns direct tapping for this trigger.
            // A rectangle enables the dedicated target; tap:false (or
            // enabled:false) keeps the trigger out of the broad area fallback.
            managed[String(interaction.triggerId)] = true;
        }

        return managed;
    }

    function getTapPartTriggerAtTile(tileX, tileY) {
        if (typeof getActiveTownParts !== "function") return null;

        var parts = getActiveTownParts();
        if (!parts || !parts.length) return null;

        // canvas入力はタイル単位なので、そのタイル中心が専用tap矩形に入った時だけ反応する。
        var pointX = tileX + 0.5;
        var pointY = tileY + 0.5;
        var best = null;

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (!part || part.enabled === false) continue;

            var tap = getTapTargetSpec(part);
            if (!tap) continue;

            var interaction = part.interaction;
            if (!interaction || interaction.enabled === false || !interaction.triggerId) continue;

            var x = Number(part.x);
            var y = Number(part.y);
            var w = Number(part.w);
            var h = Number(part.h);
            var tapX = Number(tap.x);
            var tapY = Number(tap.y);
            var tapW = Number(tap.w);
            var tapH = Number(tap.h);

            if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) {
                continue;
            }

            if (!isFinite(tapX)) tapX = 0;
            if (!isFinite(tapY)) tapY = 0;
            if (!isFinite(tapW) || tapW <= 0) continue;
            if (!isFinite(tapH) || tapH <= 0) continue;

            var left = x + tapX * w;
            var top = y + tapY * h;
            var right = left + tapW * w;
            var bottom = top + tapH * h;

            if (
                pointX < left ||
                pointX >= right ||
                pointY < top ||
                pointY >= bottom
            ) {
                continue;
            }

            var trigger = getTownTriggerById(String(interaction.triggerId));
            if (!trigger || trigger.enabled === false) continue;

            // tap矩形が重なった場合は、描画上手前になりやすい footY が大きい方を優先する。
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

    function getDirectTapTriggerCandidate(tileX, tileY, skippedIds) {
        var best = null;
        var bestScore = Infinity;

        for (var i = 0; i < triggers.length; i++) {
            var t = triggers[i];
            if (!t || !t.area || t.enabled === false) continue;
            if (skippedIds && skippedIds[t.id]) continue;

            // 専用tapを持たない従来triggerだけは、これまでのtapPadding仕様を維持する。
            var padding = (typeof t.tapPadding === "number") ? t.tapPadding : 2;

            if (!isTileInsideRectWithPadding(tileX, tileY, t.area, padding)) continue;

            var score = getTileDistanceToTriggerCenter(tileX, tileY, t);

            if (isTileInsideRectWithPadding(tileX, tileY, t.area, 0)) {
                score -= 4;
            }

            if (score < bestScore) {
                bestScore = score;
                best = t;
            }
        }

        return best;
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

    function dispatchTrigger(trigger) {
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

        // Confirmation outlives movement: keep it separate from the request.
        // 説明を読んだあとにもう一度操作して移動する。
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
    }

    window.YUMANIWA_TOWN_INTERACTION = {
        requestGroundMove: requestGroundMove, requestTrigger: requestTrigger,
        requestEdgeWarp: requestEdgeWarp, requestTap: requestTap,
        update: update, cancel: cancel, activateTrigger: activateTrigger, handleAction: handleAction,
        isMoving: function () { return !!request && request.pathIndex < request.path.length; },
        getRequest: function () { return request ? JSON.parse(JSON.stringify(request)) : null; }
    };
})();
