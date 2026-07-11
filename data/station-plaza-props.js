(function() {
    'use strict';

    var PROP_REV = '20260711-1';
    var propImageCache = {};
    var stationPlazaProps = Array.isArray(window.stationPlazaProps)
        ? window.stationPlazaProps
        : [];

    function cloneData(data) {
        return JSON.parse(JSON.stringify(data || []));
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
        def.blockedRects = cloneData(window.blockedRects);
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

    function getPropImage(src) {
        if (!src) return null;
        if (propImageCache[src]) return propImageCache[src];

        var image = new Image();
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
        image.src = src;
        return entry;
    }

    function preloadStationProps() {
        for (var i = 0; i < stationPlazaProps.length; i++) {
            getPropImage(stationPlazaProps[i].src);
        }
    }

    function getActiveProps() {
        var def = window.activeTownSceneDef;

        if (!def || !def.props || !def.props.length) {
            return [];
        }

        return def.props;
    }

    function drawTownProp(prop) {
        if (!prop || prop.enabled === false) return;

        var entry = getPropImage(prop.src);

        if (!entry || !entry.loaded || !entry.image) {
            return;
        }

        var tileSize = window.TILE_SIZE || 16;
        var dx = Math.round(prop.x * tileSize);
        var dy = Math.round(prop.y * tileSize);
        var dw = Math.round(prop.w * tileSize);
        var dh = Math.round(prop.h * tileSize);

        window.ctx.save();
        window.ctx.imageSmoothingEnabled = false;
        window.ctx.drawImage(entry.image, dx, dy, dw, dh);
        window.ctx.restore();
    }

    function drawTownActorsAndProps() {
        var props = getActiveProps();
        var tileSize = window.TILE_SIZE || 16;
        var drawItems = [];

        for (var i = 0; i < props.length; i++) {
            var prop = props[i];

            if (!prop || prop.enabled === false) {
                continue;
            }

            var footY = typeof prop.footY === 'number'
                ? prop.footY
                : prop.y + prop.h;

            drawItems.push({
                kind: 'prop',
                footY: footY * tileSize,
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
                drawTownProp(item.prop);
            } else {
                window.drawPlayerSprite(window.player.x, window.player.y);
            }
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

    window.YUMANIWA_STATION_PLAZA_PROPS = {
        version: PROP_REV,
        props: stationPlazaProps,
        imageCache: propImageCache
    };
})();
