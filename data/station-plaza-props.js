(function() {
    'use strict';

    var PROP_REV = '20260926-2';
    var propImageCache = {};
    var stationPreloadSources = {};
    var stationPreloadPending = 0;
    var stationPreloadTotal = 0;

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

    function resolveWorldObjectDef(prop) {
        if (!prop || !prop.objectId) return null;

        var library = window.YUMANIWA_WORLD_OBJECTS;
        if (!library) return null;

        return typeof library.get === 'function'
            ? library.get(prop.objectId)
            : (library.objects && library.objects[prop.objectId]) || null;
    }

    function resolvePropSrc(prop) {
        if (!prop || !prop.objectId) return '';

        var objectDef = resolveWorldObjectDef(prop);
        return objectDef && objectDef.src ? objectDef.src : '';
    }

    function getPropRetryDelay(entry) {
        var retryCount = Math.max(0, Number(entry && entry.retryCount) || 0);
        return Math.min(30000, 2000 * Math.pow(2, Math.max(0, retryCount - 1)));
    }

    function shouldRetryPropEntry(entry, options) {
        if (!entry || !entry.error) return false;

        var opts = options || {};
        if (!opts.retryOnError) return false;
        if (opts.forceRetry) return true;

        var errorAt = Math.max(0, Number(entry.errorAt) || 0);
        return Date.now() - errorAt >= getPropRetryDelay(entry);
    }

    function flushPropImageCallbacks(entry, status) {
        if (!entry || !entry.callbacks || !entry.callbacks.length) return;

        var callbacks = entry.callbacks.slice();
        entry.callbacks.length = 0;

        for (var i = 0; i < callbacks.length; i++) {
            if (typeof callbacks[i] !== 'function') continue;
            callbacks[i](entry, status);
        }
    }

    function getPropImage(src, options, callback) {
        if (!src) {
            if (typeof callback === 'function') {
                window.setTimeout(function() {
                    callback(null, 'skipped');
                }, 0);
            }
            return null;
        }

        var opts = options || {};
        var existing = propImageCache[src];
        var retryCount = 0;

        if (existing && shouldRetryPropEntry(existing, opts)) {
            retryCount = Math.max(0, Number(existing.retryCount) || 0) + 1;
            existing = null;
        }

        if (existing) {
            if (typeof callback === 'function') {
                if (existing.loaded || existing.error) {
                    window.setTimeout(function() {
                        callback(
                            existing,
                            existing.loaded ? 'cached' : 'error'
                        );
                    }, 0);
                } else {
                    existing.callbacks = existing.callbacks || [];
                    existing.callbacks.push(callback);
                }
            }
            return existing;
        }

        var image = new Image();
        var priority = opts.priority || 'auto';

        try {
            image.decoding = 'async';
            if (priority && priority !== 'auto') {
                image.fetchPriority = priority;
            }
        } catch (error) {
            // Unsupported browsers use normal Image loading.
        }

        var entry = {
            image: image,
            loaded: false,
            error: false,
            errorAt: 0,
            retryCount: retryCount,
            callbacks: [],
            priority: priority
        };

        if (typeof callback === 'function') {
            entry.callbacks.push(callback);
        }

        propImageCache[src] = entry;
        loadTraceImageStart('town_prop', src);

        image.onload = function() {
            entry.loaded = true;
            entry.error = false;
            entry.errorAt = 0;
            loadTraceImageDone('town_prop', src, 'loaded');
            settleStationPreloadSource(src, 'loaded');
            flushPropImageCallbacks(entry, 'loaded');
        };

        image.onerror = function() {
            entry.loaded = false;
            entry.error = true;
            entry.errorAt = Date.now();
            loadTraceImageDone('town_prop', src, 'error');
            settleStationPreloadSource(src, 'error');
            flushPropImageCallbacks(entry, 'error');
        };

        image.src = src;
        return entry;
    }

    function preloadStationProps() {
        stationPreloadSources = {};
        stationPreloadPending = 0;
        stationPreloadTotal = 0;

        for (var i = 0; i < stationPlazaProps.length; i++) {
            var stationProp = stationPlazaProps[i];
            if (!stationProp || stationProp.enabled === false) continue;

            var source = resolvePropSrc(stationProp);
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
            var preloadProp = stationPlazaProps[p];
            if (!preloadProp || preloadProp.enabled === false) continue;

            var src = resolvePropSrc(preloadProp);
            if (!src || !stationPreloadSources[src]) continue;

            var entry = getPropImage(src);
            if (entry && entry.loaded) settleStationPreloadSource(src, 'cached');
            if (entry && entry.error) settleStationPreloadSource(src, 'error');
        }
    }

    function preloadSceneProps(def, options, callback) {
        var scene = def || null;
        var list = scene && Array.isArray(scene.props) ? scene.props : [];
        var sources = [];
        var seen = {};
        var opts = options || {};

        for (var i = 0; i < list.length; i++) {
            var prop = list[i];
            if (!prop || prop.enabled === false) continue;

            var src = resolvePropSrc(prop);
            if (!src || seen[src]) continue;
            seen[src] = true;
            sources.push(src);
        }

        if (!sources.length) {
            if (typeof callback === 'function') {
                window.setTimeout(function() {
                    callback({ total: 0, loaded: 0, errors: 0 });
                }, 0);
            }
            return;
        }

        var remaining = sources.length;
        var loaded = 0;
        var errors = 0;

        function settle(entry, status) {
            if (status === 'loaded' || status === 'cached') loaded += 1;
            else if (status === 'error') errors += 1;

            remaining -= 1;
            if (remaining > 0) return;

            if (typeof callback === 'function') {
                callback({
                    total: sources.length,
                    loaded: loaded,
                    errors: errors
                });
            }
        }

        for (var s = 0; s < sources.length; s++) {
            getPropImage(
                sources[s],
                {
                    priority: opts.priority || 'auto',
                    retryOnError: opts.retryOnError !== false,
                    forceRetry: !!opts.forceRetry
                },
                settle
            );
        }
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
        var entry = getPropImage(resolvedSrc, {
            retryOnError: true
        });

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

    preloadStationProps();
    installDrawOverride();

    window.YUMANIWA_STATION_PLAZA_PROPS = {
        version: PROP_REV,
        props: stationPlazaProps,
        imageCache: propImageCache,
        resolvePropSrc: resolvePropSrc,
        preloadPropImage: getPropImage,
        preloadSceneProps: preloadSceneProps
    };
})();
