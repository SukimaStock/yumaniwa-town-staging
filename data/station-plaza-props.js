(function() {
    'use strict';

    var PROP_REV = '20260711-1';
    var propImageCache = {};
    var stationPreloadSources = {};
    var stationPreloadPending = 0;
    var stationPreloadTotal = 0;
    var deferredTownPropQueue = [];
    var deferredTownPropScheduled = false;

    function loadTraceMark(name, meta, once) {
        var trace = window.YUMANIWA_LOAD_TRACE;
        if (!trace || !trace.enabled) return;
        if (once && typeof trace.markOnce === 'function') {
            trace.markOnce(name, meta);
            return;
        }
        if (typeof trace.mark === 'function') trace.mark(name, meta);
    }

    function loadTraceImageStart(kind, src) {
        var trace = window.YUMANIWA_LOAD_TRACE;
        if (trace && trace.enabled && typeof trace.imageStart === 'function') {
            trace.imageStart(kind, src);
        }
    }

    function loadTraceImageDone(kind, src, status) {
        var trace = window.YUMANIWA_LOAD_TRACE;
        if (trace && trace.enabled && typeof trace.imageDone === 'function') {
            trace.imageDone(kind, src, status);
        }
    }

    function settleStationPreloadSource(src, status) {
        var state = stationPreloadSources[src];
        if (!state || state.done) return;

        state.done = true;
        state.status = status;
        stationPreloadPending = Math.max(0, stationPreloadPending - 1);

        if (stationPreloadPending === 0) {
            loadTraceMark('station_props_ready', {
                count: stationPreloadTotal
            }, true);
        }
    }

    var stationPlazaProps = Array.isArray(window.stationPlazaProps)
        ? window.stationPlazaProps
        : [];

    function cloneData(data) {
        return JSON.parse(JSON.stringify(data || []));
    }

    function resolveWorldObjectDef(prop) {
        if (!prop || !prop.objectId) return null;

        var library = window.YUMANIWA_WORLD_OBJECTS;
        if (!library) return null;

        return typeof library.get === 'function'
            ? library.get(prop.objectId)
            : (library.objects && library.objects[prop.objectId]) || null;
    }

    function resolvePropSrc(prop) {
        if (!prop) return '';

        var objectDef = resolveWorldObjectDef(prop);

        if (objectDef && objectDef.src) {
            return objectDef.src;
        }

        return prop.src || '';
    }

    function openStationTile16x8(rects) {
        var result = [];

        for (var i = 0; i < rects.length; i++) {
            var item = rects[i];

            if (item && item.x === 16 && item.y === 7 && item.w === 8 && item.h === 2) {
                result.push({ x: 16, y: 7, w: 8, h: 1 });
                result.push({ x: 17, y: 8, w: 7, h: 1 });
                continue;
            }

            result.push(item);
        }

        return result;
    }

    function isReplacedStationPlaceholder(item) {
        if (!item) return false;

        var key = [item.x, item.y, item.w, item.h].join(':');
        var replaced = {
            '1:7:4:2': true,
            '1:6:4:1': true,
            '1:10:1:1': true,
            '4:10:1:1': true,
            '7:8:2:1': true,
            '15:13:2:1': true,
            '11:9:2:2': true,
            '6:10:1:1': true,
            '18:10:1:1': true,
            '6:15:1:1': true,
            '17:15:1:1': true
        };

        return !!replaced[key];
    }

    function installStationPlazaData() {
        var maps = window.TOWN_SCENE_MAPS;
        var def = maps && maps.station_plaza;

        if (!def) return;

        // 開発モードの書き出し結果を、実際に使う町マップ定義へ反映する。
        def.mapWidth = Number(window.MAP_WIDTH) || def.mapWidth || 24;
        def.mapHeight = Number(window.MAP_HEIGHT) || def.mapHeight || 24;
        def.passableRects = cloneData(window.passableRects);
        def.blockedRects = openStationTile16x8(cloneData(window.blockedRects));
        def.blockedPoints = cloneData(window.blockedPoints);
        def.triggers = cloneData(window.triggers);
        def.areaZones = cloneData(window.areaZones);
        def.props = stationPlazaProps;

        // パーツ自身が collision を持つため、旧版で追加していた
        // ベンチ・街灯の固定座標判定はここでは追加しない。
        if (def.decor && def.decor.length) {
            def.decor = def.decor.filter(function(item) {
                return !isReplacedStationPlaceholder(item);
            });
        }
    }

    function getPropImage(src, options) {
        if (!src) return null;
        if (propImageCache[src]) return propImageCache[src];

        var image = new Image();
        var opts = options || {};

        try {
            image.decoding = 'async';
            if (opts.priority && opts.priority !== 'auto') {
                image.fetchPriority = opts.priority;
            }
        } catch (error) {
            // Unsupported browsers use normal Image loading.
        }

        var entry = {
            image: image,
            loaded: false,
            error: false
        };

        image.onload = function() {
            entry.loaded = true;
            entry.error = false;
        };

        image.onerror = function() {
            entry.loaded = false;
            entry.error = true;
        };

        propImageCache[src] = entry;
        loadTraceImageStart('station_prop', src);

        var baseOnload = image.onload;
        var baseOnerror = image.onerror;

        image.onload = function() {
            baseOnload();
            loadTraceImageDone('station_prop', src, 'loaded');
            settleStationPreloadSource(src, 'loaded');
        };

        image.onerror = function() {
            baseOnerror();
            loadTraceImageDone('station_prop', src, 'error');
            settleStationPreloadSource(src, 'error');
        };

        image.src = src;
        return entry;
    }

    function preloadStationProps() {
        stationPreloadSources = {};
        stationPreloadPending = 0;
        stationPreloadTotal = 0;

        for (var i = 0; i < stationPlazaProps.length; i++) {
            var source = resolvePropSrc(stationPlazaProps[i]);
            if (!source || stationPreloadSources[source]) continue;
            stationPreloadSources[source] = { done: false, status: 'pending' };
            stationPreloadPending += 1;
            stationPreloadTotal += 1;
        }

        loadTraceMark('station_props_preload_start', {
            count: stationPreloadTotal
        }, true);

        if (stationPreloadPending === 0) {
            loadTraceMark('station_props_ready', { count: 0 }, true);
            return;
        }

        for (var p = 0; p < stationPlazaProps.length; p++) {
            var src = resolvePropSrc(stationPlazaProps[p]);
            var entry = getPropImage(src);
            if (entry && entry.loaded) settleStationPreloadSource(src, 'cached');
            if (entry && entry.error) settleStationPreloadSource(src, 'error');
        }
    }

    function collectDeferredTownPropSources() {
        var queue = [];
        var seen = {};
        var maps = window.TOWN_SCENE_MAPS;

        if (!maps) return queue;

        for (var sceneId in maps) {
            if (!Object.prototype.hasOwnProperty.call(maps, sceneId)) continue;

            var def = maps[sceneId];
            var props = def && Array.isArray(def.props) ? def.props : [];

            for (var i = 0; i < props.length; i++) {
                var prop = props[i];

                if (!prop || prop.enabled === false) continue;

                var src = resolvePropSrc(prop);

                if (!src || seen[src] || propImageCache[src]) continue;

                seen[src] = true;
                queue.push(src);
            }
        }

        return queue;
    }

    function scheduleDeferredTownPropIdle(callback, delayMs) {
        window.setTimeout(function() {
            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(function() {
                    callback();
                }, { timeout: 2200 });
            } else {
                callback();
            }
        }, Math.max(0, Number(delayMs) || 0));
    }

    function scheduleDeferredTownProps() {
        if (deferredTownPropScheduled) return;
        deferredTownPropScheduled = true;

        deferredTownPropQueue = collectDeferredTownPropSources();

        loadTraceMark('town_props_deferred_start', {
            count: deferredTownPropQueue.length
        }, true);

        function loadNext() {
            if (!deferredTownPropQueue.length) {
                loadTraceMark('town_props_deferred_ready', null, true);
                return;
            }

            var src = deferredTownPropQueue.shift();

            if (!src || propImageCache[src]) {
                scheduleDeferredTownPropIdle(loadNext, 100);
                return;
            }

            getPropImage(src, { priority: 'low' });

            loadTraceMark('town_prop_deferred_requested', {
                src: src,
                remaining: deferredTownPropQueue.length
            });

            scheduleDeferredTownPropIdle(loadNext, 140);
        }

        scheduleDeferredTownPropIdle(loadNext, 500);
    }

    function getActiveProps() {
        var def = window.activeTownSceneDef;

        if (!def || !def.props || !def.props.length) {
            return [];
        }

        return def.props;
    }

    function getTownPropRenderOffsetY(prop) {
        if (!prop || !prop.id) return 0;

        var registry = window.YUMANIWA_TOWN_PROP_RENDER_OFFSETS || {};
        var source = registry[prop.id];
        var value = 0;

        try {
            value = typeof source === 'function' ? Number(source(prop)) : Number(source);
        } catch (error) {
            value = 0;
        }

        return isFinite(value) ? value : 0;
    }

    function drawTownProp(prop) {
        if (!prop || prop.enabled === false) return;

        var resolvedSrc = resolvePropSrc(prop);
        var entry = getPropImage(resolvedSrc);

        // WORLD OBJECT の新規画像がまだ配信されていない / 読み込みに失敗した場合は、
        // インスタンスが保持している旧 src を安全なフォールバックとして描画する。
        // 新規アセットの GitHub Pages 反映待ちでも町から物体を消さない。
        if (
            prop.objectId &&
            prop.src &&
            resolvedSrc !== prop.src &&
            entry &&
            entry.error
        ) {
            loadTraceMark('prop_fallback_requested', {
                id: prop.id || '',
                src: prop.src
            });
            entry = getPropImage(prop.src);
        }

        if (!entry || !entry.loaded || !entry.image) {
            return false;
        }

        var tileSize = window.TILE_SIZE || 16;
        var renderOffsetY = getTownPropRenderOffsetY(prop);
        var dx = Math.round(prop.x * tileSize);
        var dy = Math.round((prop.y + renderOffsetY) * tileSize);
        var dw = Math.round(prop.w * tileSize);
        var dh = Math.round(prop.h * tileSize);

        window.ctx.save();
        window.ctx.imageSmoothingEnabled = false;
        window.ctx.drawImage(entry.image, dx, dy, dw, dh);
        window.ctx.restore();
        return true;
    }

    function drawTownActorsAndProps() {
        var props = getActiveProps();
        var tileSize = window.TILE_SIZE || 16;
        var drawItems = [];
        var drawnPropCount = 0;

        for (var i = 0; i < props.length; i++) {
            var prop = props[i];

            if (!prop || prop.enabled === false) {
                continue;
            }

            var footY = typeof prop.footY === 'number'
                ? prop.footY
                : prop.y + prop.h;
            var renderOffsetY = getTownPropRenderOffsetY(prop);

            drawItems.push({
                kind: 'prop',
                footY: (footY + renderOffsetY) * tileSize,
                order: i,
                prop: prop
            });
        }

        drawItems.push({
            kind: 'player',
            footY: window.player.y + window.player.h,
            order: 10000
        });

        drawItems.sort(function(a, b) {
            if (a.footY !== b.footY) {
                return a.footY - b.footY;
            }

            return a.order - b.order;
        });

        for (var d = 0; d < drawItems.length; d++) {
            var item = drawItems[d];

            if (item.kind === 'prop') {
                if (drawTownProp(item.prop)) drawnPropCount += 1;
            } else {
                window.drawPlayerSprite(window.player.x, window.player.y);
            }
        }

        loadTraceMark('first_town_draw', {
            propCount: props.length,
            drawnPropCount: drawnPropCount
        }, true);

        if (drawnPropCount > 0) {
            loadTraceMark('first_town_draw_with_props', {
                drawnPropCount: drawnPropCount
            }, true);
        }
    }

    function installDrawOverride() {
        var fallbackDraw = window.draw;

        window.draw = function() {
            if (
                !window.ctx ||
                !window.canvas ||
                typeof window.getCamera !== 'function' ||
                typeof window.drawTownSceneBackground !== 'function'
            ) {
                if (typeof fallbackDraw === 'function') {
                    fallbackDraw();
                }
                return;
            }

            window.ctx.clearRect(
                0,
                0,
                window.canvas.width,
                window.canvas.height
            );

            var cam = window.getCamera();

            window.ctx.save();
            window.ctx.scale(cam.zoom, cam.zoom);
            window.ctx.translate(-cam.cameraX, -cam.cameraY);

            window.drawTownSceneBackground(cam);

            if (
                window.tapMarkerTimer > 0 &&
                window.tapMarkerPos &&
                !window.isEditMode &&
                !window.debugMode
            ) {
                window.ctx.beginPath();
                window.ctx.arc(
                    window.tapMarkerPos.x * window.TILE_SIZE + window.TILE_SIZE / 2,
                    window.tapMarkerPos.y * window.TILE_SIZE + window.TILE_SIZE / 2,
                    4,
                    0,
                    Math.PI * 2
                );
                window.ctx.fillStyle =
                    'rgba(255, 255, 255, ' +
                    window.tapMarkerTimer / 60 +
                    ')';
                window.ctx.fill();
            }

            if (
                typeof window.isTownScene === 'function' &&
                window.isTownScene(window.currentScene)
            ) {
                drawTownActorsAndProps();
            }

            if (
                (window.debugMode || window.isEditMode) &&
                typeof window.drawTownDevOverlay === 'function'
            ) {
                window.drawTownDevOverlay(cam);
            }

            if (
                typeof window.isTownScene === 'function' &&
                window.isTownScene(window.currentScene) &&
                (window.debugMode || window.isEditMode) &&
                typeof window.getPlayerHitbox === 'function'
            ) {
                var hitbox = window.getPlayerHitbox(
                    window.player.x,
                    window.player.y
                );

                window.ctx.strokeStyle = '#00ff66';
                window.ctx.lineWidth = 1;
                window.ctx.strokeRect(
                    hitbox.x,
                    hitbox.y,
                    hitbox.w,
                    hitbox.h
                );
            }

            window.ctx.restore();
        };
    }

    installStationPlazaData();
    preloadStationProps();
    installDrawOverride();

    window.addEventListener('yumaniwa:arrival-ready', scheduleDeferredTownProps);

    if (window.YUMANIWA_ARRIVAL_READY) {
        scheduleDeferredTownProps();
    }

    window.YUMANIWA_STATION_PLAZA_PROPS = {
        version: PROP_REV,
        props: stationPlazaProps,
        imageCache: propImageCache,
        resolvePropSrc: resolvePropSrc
    };
})();
