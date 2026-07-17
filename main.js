// ==========================================
// 湯間庭町 / 本体エンジン
// 歩行・入力・描画・画面遷移を担当します。
// 日々の更新では原則として data/ 以下だけを編集してください。
// ==========================================

// ==========================================
// 2. 状態管理・初期化
// ==========================================
var canvas, ctx;
var bgImage = new Image();
var bgLoaded = false;
var bgError = false;

// スプライト番号: 1=下, 2=左, 3=上, 4=右
// 当たり判定は従来どおり player の 16×16 のまま使う。
var PLAYER_SPRITE_PATHS = {
    stand: {
        down: 'assets/stand-1.png',
        left: 'assets/stand-2.png',
        up: 'assets/stand-3.png',
        right: 'assets/stand-4.png'
    },
    walk: {
        down: 'assets/walk-1.png',
        left: 'assets/walk-2.png',
        up: 'assets/walk-3.png',
        right: 'assets/walk-4.png'
    }
};

var playerSprites = {
    stand: { down: null, left: null, up: null, right: null },
    walk: { down: null, left: null, up: null, right: null }
};

// スプライト画像の本来の縦横比を保ったまま描く。
// height を上げると、町の中での人物の存在感も上がる。
var PLAYER_SPRITE_DRAW = { height: 32 };

// 実際に何px歩いたら、stand / walk を切り替えるか。
// さらにゆっくり見せるため、1.5タイルぶん（24px）で切り替える。
var PLAYER_WALK_STEP_PX = 24;


var player = {
    x: PLAYER_START.x * TILE_SIZE,
    y: PLAYER_START.y * TILE_SIZE,
    w: 16,
    h: 16,
    speed: 2,
    dir: 'down',
    isMoving: false,
    walkDistance: 0,
    walkFrame: 0,
    walkWasMoving: false
};
var currentScene = 'station_plaza';
var isMessageOpen = false;
var pendingWarp = null;

// 開発モードを戻すときは、この値だけ true にしてください。
var DEV_MODE_ENABLED = true;
var debugMode = false;
var keys = {};
var dpad = { up: false, down: false, left: false, right: false };

var isEditMode = false;
var editTarget = 'passableRects';
var editStep = 0;
var editStartX = 0;
var editStartY = 0;
var currentHoverTile = null;
var editHistory = [];
var editingTriggerIndex = -1;

// 開発モード / 保存状態・アコーディオン
var editorHasUnsavedChanges = false;
var editorPanelCollapsed = false;

// 開発モード / マップパーツ編集
var editingPartIndex = -1;
var partEditorMode = 'select'; // select | add
var partDragState = null;
var partEditorRatioLock = true;

// パーツ由来の当たり判定と、マップ固定の当たり判定を分離する。
// baseCollisionGrid は固定地形だけ、collisionGrid はパーツ分を重ねた実際の判定。
var baseCollisionGrid = [];
var townPartTriggerTemplates = {};
var townPartManagedTriggerIds = {};

var collisionGrid = [];
var currentAreaId = null;
var areaTitleTimer = null;

var tapMovePath = [];
var tapMoveTargetTile = null;
var tapMarkerTimer = 0;
var tapMarkerPos = null;

var tapMarkerPos = null;

// 画面端タップで予約された出口方向。


//
// PC / モバイル共通の固定ゲーム画面。
// iPhone縦持ちに近い比率を基準にする。
// canvas内部は常にこのサイズで描画し、実画面には比率維持で拡大縮小して表示する。
var GAME_VIEW_W = 390;
var GAME_VIEW_H = 780;

// PCでは 390x780 固定。
// スマホでは横幅いっぱいの表示に合わせ、canvas内部の高さだけ可変にする。
// これにより、横に引き伸ばさずにスマホの横幅を使える。
var currentGameViewH = GAME_VIEW_H;
var MOBILE_FLUID_HEIGHT_MIN = 620;
var MOBILE_FLUID_HEIGHT_MAX = 860;

function isTownMobileFluidViewport() {
    var w = window.innerWidth || 0;
    var hasCoarsePointer = false;

    if (window.matchMedia) {
        hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    }

    var hasTouch = hasCoarsePointer || ((navigator.maxTouchPoints || 0) > 0);

    // iPhone / Android phone を主対象にする。
    // PCでブラウザ幅を狭めた時は、基本的には固定画面のまま扱う。
    return hasTouch && w > 0 && w <= 768;
}

function getCurrentGameViewH() {
    return currentGameViewH || GAME_VIEW_H;
}

function updateCurrentGameViewSizeFromScreen() {
    currentGameViewH = GAME_VIEW_H;

    if (!canvas || !isTownMobileFluidViewport()) {
        return;
    }

    var screen = document.getElementById("town-screen");
    if (!screen) return;

    var rect = screen.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;

    // 表示中の town-screen の比率を、canvas内部解像度へ反映する。
    // 横は 390 固定。高さだけ変えるので、絵は太らない。
    var nextH = Math.round(GAME_VIEW_W * (rect.height / rect.width));

    if (!isFinite(nextH) || nextH <= 0) {
        nextH = GAME_VIEW_H;
    }

    nextH = Math.max(MOBILE_FLUID_HEIGHT_MIN, Math.min(MOBILE_FLUID_HEIGHT_MAX, nextH));
    currentGameViewH = nextH;
}

// 現在のモバイル表示に近い見え方を維持するため、カメラ倍率は固定。
var GAME_CAMERA_ZOOM = 2.5;

//
// PCではゲーム画面が大きくなりすぎないように最大表示倍率を制限する。
// スマホでは従来通り、画面幅・高さに合わせて自然にフィットさせる。
var GAME_DESKTOP_SCALE_BREAKPOINT_W = 700;
var GAME_DESKTOP_MAX_DISPLAY_SCALE = 1.22;

function getTownDisplayScale(rawScale, viewport) {
    var scale = rawScale;

    if (!isFinite(scale) || scale <= 0) {
        scale = 1;
    }

    // 横幅が広い画面だけ、拡大しすぎを止める。
    // 360px * 1.22 = 約439px。
    // PCでは少し見やすく、でも「ドン」と出すぎない大きさ。
    if (viewport && viewport.w >= GAME_DESKTOP_SCALE_BREAKPOINT_W) {
        scale = Math.min(scale, GAME_DESKTOP_MAX_DISPLAY_SCALE);
    }

    return scale;
}

//
// セリフ・メッセージ枠も、ブラウザ幅ではなく湯間庭町のゲーム画面幅に合わせる。
// PCでは少し小ぶりにして、「画面幅いっぱいのWeb UI」に見えないようにする。
var GAME_DIALOG_MOBILE_MARGIN_X = 14;
var GAME_DIALOG_DESKTOP_MARGIN_X = 24;
var GAME_DIALOG_DESKTOP_MAX_W = 390;
var GAME_DIALOG_BOTTOM_GAP = 18;

//
// 駅前案内図は、PCではスマホ幅そのものまでは絞らず、
// ただし 96vw / 1040px のように巨大化しないサイズに抑える。
var STATION_GUIDE_MAP_DESKTOP_MAX_W = 610;
var STATION_GUIDE_MAP_DESKTOP_SCALE_FROM_GAME = 1.38;
var STATION_GUIDE_MAP_MOBILE_MARGIN_X = 10;
var STATION_GUIDE_MAP_DESKTOP_MARGIN_X = 28;
var STATION_GUIDE_MAP_VERTICAL_MARGIN = 22;


var TOWN_DIALOG_SELECTOR = [
    "#message-window",
    "#dialogueBox",
    "#dialogBox",
    "#dialoguePanel",
    "#dialogPanel",
    "#messageBox",
    "#messagePanel",
    "#messageWindow",
    "#talkBox",
    "#talkPanel",
    "#speechBox",
    "#speechPanel",
    "#textBox",
    "#infoBox",
    "#noticeBox",
    "#dialogue",
    ".dialogue-box",
    ".dialog-box",
    ".dialogue-panel",
    ".dialog-panel",
    ".message-box",
    ".message-panel",
    ".message-window",
    ".talk-box",
    ".talk-panel",
    ".speech-box",
    ".speech-panel",
    ".text-box",
    ".info-box",
    ".notice-box",
    ".speech-bubble"
].join(",");


function ensureTownDialogFrameStyle() {
    // レイアウトは style.css の #town-screen / #message-window で管理する。
    // 以前の動的 style 注入は、CSS 管理と競合するため無効化。
}



function updateTownDialogFrameVars(vp, displayLeft, displayTop, displayW, displayH, scale) {
    // セリフ枠は #town-screen 内の absolute 配置に統一。
    // ここでは何もしない。
}


function updateStationGuideMapFrameVars(vp, displayLeft, displayTop, displayW, displayH, scale) {
    // 駅前案内図のサイズは style.css の .station-guide-map-window で管理する。
    // ここでは何もしない。
}





function getTownViewport() {
    var vv = window.visualViewport;

    if (vv) {
        return {
            w: vv.width,
            h: vv.height,
            offsetLeft: vv.offsetLeft || 0,
            offsetTop: vv.offsetTop || 0
        };
    }

    return {
        w: window.innerWidth,
        h: window.innerHeight,
        offsetLeft: 0,
        offsetTop: 0
    };
}

function applyTownPageFrameStyle() {
    // body / #game-container / #town-screen の見た目は style.css に集約。
    // JS から body や canvas の表示サイズを直接変更しない。
}


function applyCanvasDisplaySize() {
    if (!canvas) return;

    // canvas の内部解像度は resizeCanvas() で設定する。
    // PCは390x780固定、スマホは横幅優先で高さだけ可変。
    // 表示サイズ・中央配置・PC上限幅は style.css の #town-screen に任せる。
    canvas.style.removeProperty("position");
    canvas.style.removeProperty("left");
    canvas.style.removeProperty("top");
    canvas.style.removeProperty("width");
    canvas.style.removeProperty("height");
    canvas.style.removeProperty("box-shadow");

    canvas.style.imageRendering = "pixelated";
    canvas.style.touchAction = "none";
    canvas.style.webkitTouchCallout = "none";
    canvas.style.webkitUserSelect = "none";
    canvas.style.userSelect = "none";
}





function getCanvasPointerPoint(e) {
    if (!canvas) return null;

    var rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) {
        return null;
    }

    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

function getPointerTile(e) {
    var point = getCanvasPointerPoint(e);
    if (!point) return null;

    var cam = getCamera();
    var worldX = (point.x / cam.zoom) + cam.cameraX;
    var worldY = (point.y / cam.zoom) + cam.cameraY;
    var tileX = Math.floor(worldX / TILE_SIZE);
    var tileY = Math.floor(worldY / TILE_SIZE);

    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
        return null;
    }

    return {
        x: tileX,
        y: tileY,
        worldX: worldX,
        worldY: worldY
    };
}


var tapMoveTargetTrigger = null;
var tapFocusedTrigger = null;


// ★ 新規追加: RPGメニュー用状態変数
var destinationViewMode = "intro"; // "intro" | "menu" | "message" | "note_rack"
var currentDestinationId = null;
var currentDestinationMessage = "";
var currentDestinationMessageTitle = "";

// PC向けRPGメニュー操作: キーボードだけで選択肢を選べるようにする。
// 表示上の ▶ カーソル位置をここで管理する。
var rpgMenuCursorIndex = 0;

// 町内コンテンツ用: 触れるらくがき・itch.ioゲームを iframe 内で開く共通プレイヤー
var isWorkPlayerOpen = false;
var currentWorkId = null;
var workPlayerReturnDestinationId = null;

var workPlayerReturnDestinationId = null;

// 作品直リンクから町へ入ったかどうか。
// 直リンクで遊び終えた人にだけ、施設内の別作品を案内する。
var isDirectWorkVisit = false;

// 施設メニューへ戻った直後に表示する案内。
var destinationReturnGuideText = "";

// 直前に遊んでいた作品。
var lastClosedWorkId = null;


var workPlayerReturnDestinationId = null;

// お店・看板などを開いた直前の町内位置
var townWindowReturnPoint = null;

function rememberTownWindowReturnPoint() {
    if (!isTownScene(currentScene)) return;

    townWindowReturnPoint = {
        sceneId: currentScene,
        x: player.x,
        y: player.y,
        dir: player.dir || "down"
    };
}

function restoreTownWindowReturnPoint(fallbackSceneId) {
    var point = townWindowReturnPoint;
    townWindowReturnPoint = null;

    if (!point || !isTownScene(point.sceneId)) {
        changeScene(fallbackSceneId || "station_plaza");
        return;
    }

    changeScene(point.sceneId);

    player.x = point.x;
    player.y = point.y;
    player.dir = point.dir || "down";
    player.isMoving = false;
    player.walkDistance = 0;
    player.walkFrame = 0;
    player.walkWasMoving = false;

    cancelTapMove();
    updateInteractionHint();
    updateCurrentArea();
}


// 湯間庭フレームで表示中の元ページ。
// 現在はnote読書室だけが右上の「noteで開く」に使う。
var currentFrameSourceUrl = "";

// 湯間庭新報でカードを開いた履歴だけを、この端末内に保存する。
// 外部の閲覧履歴は使わず、「町の中で何を選んだか」だけでおすすめを作る。
var SHINPO_HISTORY_KEY = "yumaniwa:shinpo-open-history-v1";
var SHINPO_HISTORY_LIMIT = 24;

function getWorkPlayerSource(work) {
    if (!work) return "";

    if (work.launch === "itch_embed") {
        return work.embedUrl || "";
    }

    return work.entry || "";
}

function getWorkPlayerReturnLabel(work) {
    if (work && work.returnLabel) {
        return work.returnLabel;
    }

    if (work && work.venue === "tomogushi_alley") {
        return "灯串横丁";
    }

    if (work && work.venue === "leisure_center") {
        return "湯窓レジャーセンター";
    }

    return "町";
}

function getWorkPlayerFrameTitle(work) {
    if (work && work.frameTitle) {
        return work.frameTitle;
    }

    return (work && work.title) || "湯間庭町";
}

var STATION_GUIDE_MAP_IMAGE = "assets/station-guide-map.png?rev=20260710-final";
var isStationGuideMapOpen = false;
var stationGuideMapStylesReady = false;
var stationGuideMapEventsReady = false;

var stationGuideMapImageReady = false;
var stationGuideMapImageError = false;
var stationGuideMapRevealTimer = null;

var townArrivalLoadingStartedAt = 0;
var townArrivalLoadingMinMs = 720;
var townArrivalLoadingHideTimer = null;

var activeTownSceneDef = null;

function cloneTownData(data) {
    return JSON.parse(JSON.stringify(data || []));
}

function isTownScene(sceneId) {
    return !!(window.TOWN_SCENE_MAPS && window.TOWN_SCENE_MAPS[sceneId]);
}

function getTownSceneDefinition(sceneId) {
    if (!window.TOWN_SCENE_MAPS) return null;
    return window.TOWN_SCENE_MAPS[sceneId] || null;
}

var townSceneBackgroundCache = {};

function flushTownSceneBackgroundCallbacks(entry) {
    if (!entry || !entry.callbacks) return;

    var callbacks = entry.callbacks.slice();
    entry.callbacks.length = 0;

    for (var i = 0; i < callbacks.length; i++) {
        if (typeof callbacks[i] === "function") {
            callbacks[i](entry);
        }
    }
}

function preloadTownSceneBackgroundAsset(path, callback) {
    if (!path) {
        if (typeof callback === "function") {
            window.setTimeout(function() {
                callback({ loaded: true, error: false, image: null, path: "" });
            }, 0);
        }
        return null;
    }

    var entry = townSceneBackgroundCache[path];

    if (entry) {
        if (typeof callback === "function") {
            if (entry.loaded || entry.error) {
                window.setTimeout(function() {
                    callback(entry);
                }, 0);
            } else {
                entry.callbacks.push(callback);
            }
        }

        return entry;
    }

    var image = new Image();

    entry = {
        path: path,
        image: image,
        loaded: false,
        error: false,
        callbacks: []
    };

    if (typeof callback === "function") {
        entry.callbacks.push(callback);
    }

    townSceneBackgroundCache[path] = entry;

    image.onload = function() {
        entry.loaded = true;
        entry.error = false;
        flushTownSceneBackgroundCallbacks(entry);
    };

    image.onerror = function() {
        entry.loaded = false;
        entry.error = true;
        flushTownSceneBackgroundCallbacks(entry);
    };

    image.src = path;

    return entry;
}

function preloadTownSceneBackgrounds() {
    if (!window.TOWN_SCENE_MAPS) return;

    for (var sceneId in window.TOWN_SCENE_MAPS) {
        if (!Object.prototype.hasOwnProperty.call(window.TOWN_SCENE_MAPS, sceneId)) continue;

        var def = window.TOWN_SCENE_MAPS[sceneId];
        if (def && def.backgroundImagePath) {
            preloadTownSceneBackgroundAsset(def.backgroundImagePath);
        }
    }
}

function waitForTownSceneBackground(sceneId, done) {
    var finished = false;

    function finish() {
        if (finished) return;
        finished = true;

        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }

        if (typeof done === "function") {
            done();
        }
    }

    var def = getTownSceneDefinition(sceneId);
    var path = def && def.backgroundImagePath ? def.backgroundImagePath : "";

    if (!path) {
        finish();
        return;
    }

    var entry = preloadTownSceneBackgroundAsset(path, function() {
        finish();
    });

    if (!entry || entry.loaded || entry.error) {
        finish();
        return;
    }

    // 通信やキャッシュの都合で読み込みが詰まった場合でも、暗転したまま固まらないようにする。
    var timeoutId = window.setTimeout(function() {
        finish();
    }, 2200);
}


function loadTownSceneBackground(def) {
    activeTownSceneDef = def || null;
    bgLoaded = false;
    bgError = false;

    var bgPath = def && def.backgroundImagePath ? def.backgroundImagePath : "";

    if (!bgPath) {
        finishTownArrivalLoading();
        return;
    }

    var entry = preloadTownSceneBackgroundAsset(bgPath, function(doneEntry) {
        var currentPath = activeTownSceneDef && activeTownSceneDef.backgroundImagePath
            ? activeTownSceneDef.backgroundImagePath
            : "";

        if (currentPath !== bgPath) return;

        bgLoaded = !!doneEntry.loaded;
        bgError = !!doneEntry.error;

        if (doneEntry.image) {
            bgImage = doneEntry.image;
        }

        finishTownArrivalLoading();
    });

    if (entry && entry.image) {
        bgImage = entry.image;
    }

    if (entry && entry.loaded) {
        bgLoaded = true;
        bgError = false;
        finishTownArrivalLoading();
        return;
    }

    if (entry && entry.error) {
        bgLoaded = false;
        bgError = true;
        finishTownArrivalLoading();
    }
}


function placePlayerAtTownSpawn(def, spawnKey) {
    if (!def) return;

    var spawns = def.spawnPoints || {};
    var spawn = spawns[spawnKey] || spawns.default || { x: 12, y: 12, dir: 'down' };

    player.x = spawn.x * TILE_SIZE;
    player.y = spawn.y * TILE_SIZE;
    player.dir = spawn.dir || 'down';
    player.isMoving = false;
    player.walkDistance = 0;
    player.walkFrame = 0;
    player.walkWasMoving = false;
}

function applyTownSceneDefinition(sceneId, spawnKey) {
    var def = getTownSceneDefinition(sceneId);
    if (!def) return false;

    activeTownSceneDef = def;
    MAP_WIDTH = Number(def.mapWidth) || 24;
    MAP_HEIGHT = Number(def.mapHeight) || 24;
    passableRects = cloneTownData(def.passableRects);
    blockedRects = cloneTownData(def.blockedRects);
    blockedPoints = cloneTownData(def.blockedPoints);
    triggers = cloneTownData(def.triggers);
    areaZones = cloneTownData(def.areaZones);

    // 旧 station-plaza-props.js が足した固定座標の判定は除外し、
    // ここからはパーツ自身の collision 定義で追従させる。
    removeLegacyTownPartCollisionEntries();
    captureTownPartTriggerTemplates(def);
    ensureAllTownPartMetadata();
    syncTownPartTriggers();

    currentAreaId = null;
    tapFocusedTrigger = null;
    pendingWarp = null;
    editingPartIndex = -1;
    partDragState = null;
    cancelTapMove();
    initGrid();
    carveTownEdgeWarpTiles(def);
    loadTownSceneBackground(def);
    placePlayerAtTownSpawn(def, spawnKey || 'default');
    updateUI();
    updateInteractionHint();
    setTimeout(function() { updateCurrentArea(); }, 10);
    return true;
}

function getTownSceneTitle(sceneId) {
    var def = getTownSceneDefinition(sceneId);
    return def ? def.title : sceneId;
}

function drawTownSceneBackground(cam) {
    var def = activeTownSceneDef;

    if (def && def.backgroundImagePath) {
        var entry = preloadTownSceneBackgroundAsset(def.backgroundImagePath);

        if (entry && entry.loaded && entry.image) {
            ctx.drawImage(entry.image, 0, 0, cam.mapPixelW, cam.mapPixelH);
            return;
        }

        if (!entry || !entry.error) {
            // 背景アセットがまだ読めていない間は、仮矩形マップを描かない。
            // これにより、マップ遷移直後に開発中の仮画面が一瞬見えるのを防ぐ。
            ctx.fillStyle = "#050403";
            ctx.fillRect(0, 0, cam.mapPixelW, cam.mapPixelH);
            return;
        }

        // 読み込み失敗時だけ、下の仮描画へフォールバックする。
    }

    if (bgLoaded) {
        ctx.drawImage(bgImage, 0, 0, cam.mapPixelW, cam.mapPixelH);
        return;
    }

    var baseColor = "#b7a385";
    if (def && def.backgroundStyle === "alley") baseColor = "#4f4033";
    if (def && def.backgroundStyle === "leisure") baseColor = "#57565d";
    if (def && def.backgroundStyle === "onsen") baseColor = "#c5b79f";
    if (def && def.backgroundStyle === "street") baseColor = "#d1c2a9";

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, cam.mapPixelW, cam.mapPixelH);

    var grounds = (def && def.groundRects) || [];
    for (var i = 0; i < grounds.length; i++) {
        var g = grounds[i];
        ctx.fillStyle = g.color || "#d9ccb3";
        ctx.fillRect(g.x * TILE_SIZE, g.y * TILE_SIZE, g.w * TILE_SIZE, g.h * TILE_SIZE);
    }

    ctx.strokeStyle = "rgba(105, 84, 60, 0.20)";
    ctx.lineWidth = 1;
    for (var gx = 0; gx <= cam.mapPixelW; gx += TILE_SIZE * 2) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, cam.mapPixelH);
        ctx.stroke();
    }
    for (var gy = 0; gy <= cam.mapPixelH; gy += TILE_SIZE * 2) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(cam.mapPixelW, gy);
        ctx.stroke();
    }

    var decor = (def && def.decor) || [];
    for (var d = 0; d < decor.length; d++) {
        var it = decor[d];
        var px = it.x * TILE_SIZE;
        var py = it.y * TILE_SIZE;
        var pw = it.w * TILE_SIZE;
        var ph = it.h * TILE_SIZE;

        ctx.fillStyle = it.fill || "#7a6650";
        ctx.fillRect(px, py, pw, ph);

        ctx.strokeStyle = it.stroke || "#2d241b";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, Math.max(0, pw - 2), Math.max(0, ph - 2));

        if (it.label) {
            ctx.fillStyle = it.labelColor || "#ffffff";
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(it.label, px + pw / 2, py + ph / 2);
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
        }
    }
}



function carveTownEdgeWarpTiles(def) {
    if (!def || !def.edgeWarps || !collisionGrid || !collisionGrid.length) return;

    for (var i = 0; i < def.edgeWarps.length; i++) {
        var warp = def.edgeWarps[i];
        if (!warp) continue;

        var min = Math.max(0, Number(warp.min) || 0);
        var max = Math.min(
            (warp.side === 'left' || warp.side === 'right') ? MAP_HEIGHT - 1 : MAP_WIDTH - 1,
            Number(warp.max)
        );

        if (!isFinite(max)) max = min;

        // 出口は「画面端の1タイル」だけを基本として通行可能に戻す。
        // 以前は8タイル分を強制通行にしていたため、マップごとの当たり判定を大きく上書きしていた。
        // もっと奥まで出口を確保したい場合だけ、data/town-maps.js の edgeWarps に corridorDepth を指定する。
        var corridorDepth = Number(warp.corridorDepth);

        if (!isFinite(corridorDepth)) {
            corridorDepth = 1;
        }

        corridorDepth = Math.max(0, Math.min(8, Math.floor(corridorDepth)));
        for (var n = min; n <= max; n++) {
            for (var depth = 0; depth < corridorDepth; depth++) {
                var x = 0;
                var y = 0;

                if (warp.side === 'left') {
                    x = depth;
                    y = n;
                } else if (warp.side === 'right') {
                    x = MAP_WIDTH - 1 - depth;
                    y = n;
                } else if (warp.side === 'up') {
                    x = n;
                    y = depth;
                } else if (warp.side === 'down') {
                    x = n;
                    y = MAP_HEIGHT - 1 - depth;
                } else {
                    continue;
                }

                if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                    collisionGrid[y][x] = 1;
                    if (baseCollisionGrid[y]) {
                        baseCollisionGrid[y][x] = 1;
                    }
                }
            }
        }
    }
}

function tryTownEdgeWarp(requestedSide) {
    if (!isTownScene(currentScene) || !activeTownSceneDef || !activeTownSceneDef.edgeWarps || isMessageOpen) return false;

    var tile = getPlayerTile();
    var warps = activeTownSceneDef.edgeWarps;

    for (var i = 0; i < warps.length; i++) {
        var warp = warps[i];
        if (!warp) continue;
        if (requestedSide && warp.side !== requestedSide) continue;

        var hit = false;
        if (warp.side === 'left' && tile.x <= 0 && tile.y >= warp.min && tile.y <= warp.max) hit = true;
        if (warp.side === 'right' && tile.x >= MAP_WIDTH - 1 && tile.y >= warp.min && tile.y <= warp.max) hit = true;
        if (warp.side === 'up' && tile.y <= 0 && tile.x >= warp.min && tile.x <= warp.max) hit = true;
        if (warp.side === 'down' && tile.y >= MAP_HEIGHT - 1 && tile.x >= warp.min && tile.x <= warp.max) hit = true;

        if (hit) {
            clearDpadInput();
            cancelTapMove();
            changeSceneWithTownFade(warp.target, warp.targetSpawn || 'default');
            return true;
        }
    }

    return false;
}


var STATION_GUIDE_MAP_HOTSPOTS = [
    {
        id: "shinpo",
        label: "湯間庭新報",
        kind: "place",
        target: "shinpo_board",
        rect: { left: 22.8, top: 20.6, width: 16.0, height: 11.2 }
    },
    {
        id: "tomogushi",
        label: "灯串横丁",
        kind: "place",
        target: "tomogushi_alley_map",
        rect: { left: 0.0, top: 0.0, width: 24.0, height: 70.0 }
    },
    {
        id: "yumado",
        label: "湯窓通り",
        kind: "place",
        target: "yumado_street_map",
        rect: { left: 63.0, top: 0.0, width: 37.0, height: 56.0 }
    },
    {
        id: "leisure_center",
        label: "湯窓レジャーセンター",
        kind: "place",
        target: "leisure_center_map",
        rect: { left: 74.5, top: 52.5, width: 25.5, height: 36.0 }
    },
    {
        id: "station",
        label: "湯間庭駅",
        kind: "message",
        text: "湯間庭駅。\n\nのんびりしたローカル線の小さな駅だ。\nここから、湯気と看板の町歩きが始まる。",
        rect: { left: 38.0, top: 58.0, width: 27.0, height: 31.0 }
    },
    {
        id: "current",
        label: "現在地",
        kind: "close",
        rect: { left: 42.0, top: 39.0, width: 16.5, height: 15.0 }
    },
    {
        id: "onsen",
        label: "湯けむり坂 工事中",
        kind: "place",
        target: "onsen_slope_map",
        rect: { left: 38.0, top: 0.0, width: 24.0, height: 29.0 }
    }
];

function setupStationGuideMapEvents() {
    if (stationGuideMapEventsReady) return;
    stationGuideMapEventsReady = true;

    window.addEventListener("keydown", function(e) {
        if (!isStationGuideMapOpen) return;

        if (e.key === "Escape") {
            e.preventDefault();
            closeStationGuideMap();
        }
    });
}

function ensureStationGuideMapStyles() {
    // 駅前案内図のベースCSSは style.css に移動。
    // DOM生成側からは、二重注入を避けるため ready フラグだけ立てる。
    stationGuideMapStylesReady = true;
}



function ensureStationGuideMapLoadingStyles() {
    if (document.getElementById("station-guide-map-loading-style")) return;

    var style = document.createElement("style");
    style.id = "station-guide-map-loading-style";
    style.textContent =
        "#station-guide-map-layer .station-guide-map-window{" +
        "opacity:0;transform:translateY(10px) scale(.985);" +
        "pointer-events:none;" +
        "transition:opacity 360ms ease, transform 420ms cubic-bezier(.22,.8,.28,1);" +
        "}" +
        "#station-guide-map-layer.map-ready .station-guide-map-window{" +
        "opacity:1;transform:translateY(0) scale(1);" +
        "pointer-events:auto;" +
        "}" +
        ".station-guide-map-loading{" +
        "position:absolute;inset:0;z-index:4;" +
        "display:flex;align-items:center;justify-content:center;" +
        "box-sizing:border-box;padding:18px;" +
        "opacity:0;pointer-events:none;" +
        "transition:opacity 260ms ease;" +
        "}" +
        "#station-guide-map-layer.map-loading .station-guide-map-loading," +
        "#station-guide-map-layer.map-error .station-guide-map-loading{" +
        "opacity:1;pointer-events:auto;" +
        "}" +
        ".station-guide-map-loading-card{" +
        "min-width:min(82vw,330px);box-sizing:border-box;" +
        "border:3px solid rgba(255,239,200,.68);" +
        "border-radius:18px;" +
        "background:rgba(37,27,20,.95);" +
        "color:#fff4df;" +
        "box-shadow:0 18px 44px rgba(0,0,0,.48);" +
        "padding:22px 18px 18px;" +
        "text-align:center;" +
        "}" +
        ".station-guide-map-loading-mark{" +
        "width:34px;height:34px;margin:0 auto 12px;" +
        "border-radius:50%;" +
        "background:radial-gradient(circle at 50% 45%, #fff0c8 0 22%, #b89153 23% 48%, rgba(255,240,200,.14) 49% 100%);" +
        "box-shadow:0 0 18px rgba(255,224,160,.28);" +
        "animation:stationGuideMapLamp 1.4s ease-in-out infinite;" +
        "}" +
        ".station-guide-map-loading-label{" +
        "font-weight:800;font-size:17px;letter-spacing:.06em;line-height:1.6;" +
        "white-space:pre-line;" +
        "}" +
        ".station-guide-map-loading-dots{" +
        "margin-top:8px;font-weight:900;letter-spacing:.22em;color:#f4dec0;" +
        "}" +
        ".station-guide-map-loading-dots span{" +
        "animation:stationGuideMapDots 1.2s ease-in-out infinite;" +
        "}" +
        ".station-guide-map-loading-dots span:nth-child(2){animation-delay:.18s;}" +
        ".station-guide-map-loading-dots span:nth-child(3){animation-delay:.36s;}" +
        ".station-guide-map-loading-close{" +
        "display:none;margin:14px auto 0;" +
        "appearance:none;-webkit-appearance:none;" +
        "border:2px solid rgba(255,239,200,.56);" +
        "border-radius:999px;" +
        "background:rgba(255,244,223,.12);" +
        "color:#fff4df;" +
        "font-weight:800;font-size:14px;" +
        "padding:9px 14px;" +
        "}" +
        "#station-guide-map-layer.map-error .station-guide-map-loading-close{" +
        "display:block;" +
        "}" +
        "@keyframes stationGuideMapLamp{" +
        "0%,100%{opacity:.72;transform:scale(.96);}" +
        "50%{opacity:1;transform:scale(1.04);}" +
        "}" +
        "@keyframes stationGuideMapDots{" +
        "0%,100%{opacity:.28;}" +
        "50%{opacity:1;}" +
        "}" +
        "@media (max-width:720px){" +
        ".station-guide-map-loading-card{min-width:min(86vw,300px);padding:20px 15px 16px;}" +
        ".station-guide-map-loading-label{font-size:15px;}" +
        ".station-guide-map-loading-mark{width:30px;height:30px;}" +
        "}";

    document.head.appendChild(style);
}

function setupStationGuideMapLoadingLayer(layer) {
    if (!layer || document.getElementById("station-guide-map-loading")) return;

    var loading = document.createElement("div");
    loading.id = "station-guide-map-loading";
    loading.className = "station-guide-map-loading";
    loading.setAttribute("aria-hidden", "false");

    loading.innerHTML =
        '<div class="station-guide-map-loading-card" role="status" aria-live="polite">' +
        '<div class="station-guide-map-loading-mark" aria-hidden="true"></div>' +
        '<div id="station-guide-map-loading-label" class="station-guide-map-loading-label">地図を広げています…</div>' +
        '<div class="station-guide-map-loading-dots" aria-hidden="true"><span>・</span><span>・</span><span>・</span></div>' +
        '<button class="station-guide-map-loading-close" type="button">地図を閉じる</button>' +
        '</div>';

    var closeButton = loading.querySelector(".station-guide-map-loading-close");
    if (closeButton) {
        closeButton.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeStationGuideMap();
        });
    }

    layer.appendChild(loading);
}

function setStationGuideMapLoadingLabel(text) {
    var label = document.getElementById("station-guide-map-loading-label");
    if (label) {
        label.textContent = text || "地図を広げています…";
    }
}

function markStationGuideMapReady() {
    stationGuideMapImageReady = true;
    stationGuideMapImageError = false;

    var layer = document.getElementById("station-guide-map-layer");
    if (!layer) return;

    if (stationGuideMapRevealTimer) {
        window.clearTimeout(stationGuideMapRevealTimer);
    }

    stationGuideMapRevealTimer = window.setTimeout(function() {
        layer.classList.remove("map-loading");
        layer.classList.remove("map-error");
        layer.classList.add("map-ready");
        stationGuideMapRevealTimer = null;
    }, isStationGuideMapOpen ? 160 : 0);
}

function markStationGuideMapError() {
    stationGuideMapImageReady = false;
    stationGuideMapImageError = true;

    var layer = document.getElementById("station-guide-map-layer");
    if (!layer) return;

    if (stationGuideMapRevealTimer) {
        window.clearTimeout(stationGuideMapRevealTimer);
        stationGuideMapRevealTimer = null;
    }

    setStationGuideMapLoadingLabel("地図の紙が少し湿っているようです。\nもう一度開いてみてください。");

    layer.classList.remove("map-ready");
    layer.classList.remove("map-loading");
    layer.classList.add("map-error");
}

function setupStationGuideMapImageLoading(layer) {
    if (!layer || layer.dataset.imageLoadingReady === "true") return;
    layer.dataset.imageLoadingReady = "true";

    var image = layer.querySelector(".station-guide-map-image");
    if (!image) return;

    image.addEventListener("load", function() {
        markStationGuideMapReady();
    });

    image.addEventListener("error", function() {
        markStationGuideMapError();
    });

    if (image.complete) {
        if (image.naturalWidth && image.naturalWidth > 0) {
            markStationGuideMapReady();
        } else {
            markStationGuideMapError();
        }
    }
}

function prepareStationGuideMapOpening(layer) {
    if (!layer) return;

    hideStationGuideMapConfirm();

    if (stationGuideMapRevealTimer) {
        window.clearTimeout(stationGuideMapRevealTimer);
        stationGuideMapRevealTimer = null;
    }

    if (stationGuideMapImageReady) {
        layer.classList.remove("map-loading");
        layer.classList.remove("map-error");
        layer.classList.add("map-ready");
        return;
    }

    if (stationGuideMapImageError) {
        setStationGuideMapLoadingLabel("地図の紙が少し湿っているようです。\nもう一度開いてみてください。");
        layer.classList.remove("map-ready");
        layer.classList.remove("map-loading");
        layer.classList.add("map-error");
        return;
    }

    setStationGuideMapLoadingLabel("地図を広げています…");
    layer.classList.remove("map-ready");
    layer.classList.remove("map-error");
    layer.classList.add("map-loading");

    var image = layer.querySelector(".station-guide-map-image");
    if (image && image.complete && image.naturalWidth && image.naturalWidth > 0) {
        markStationGuideMapReady();
    }
}

function ensureTownLoadingStyles() {
    if (document.getElementById("town-loading-style")) return;

    var style = document.createElement("style");
    style.id = "town-loading-style";
    style.textContent =
        "#town-loading-layer{" +
        "position:fixed;inset:0;z-index:11500;" +
        "display:flex;align-items:center;justify-content:center;" +
        "box-sizing:border-box;padding:24px;" +
        "background:linear-gradient(180deg,#120c09 0%,#1f1711 100%);" +
        "color:#fff4df;opacity:0;pointer-events:none;" +
        "transition:opacity 420ms ease;" +
        "}" +
        "#town-loading-layer.visible{opacity:1;pointer-events:auto;}" +
        ".town-loading-card{" +
        "width:min(82vw,360px);box-sizing:border-box;" +
        "border:3px solid rgba(255,239,200,.68);border-radius:20px;" +
        "background:rgba(37,27,20,.96);" +
        "box-shadow:0 18px 48px rgba(0,0,0,.52);" +
        "padding:24px 18px 20px;text-align:center;" +
        "}" +
        ".town-loading-mark{" +
        "width:38px;height:38px;margin:0 auto 13px;border-radius:50%;" +
        "background:radial-gradient(circle at 50% 45%, #fff0c8 0 20%, #b89153 21% 48%, rgba(255,240,200,.12) 49% 100%);" +
        "box-shadow:0 0 22px rgba(255,224,160,.28);" +
        "animation:townLoadingLamp 1.45s ease-in-out infinite;" +
        "}" +
        ".town-loading-label{" +
        "font-weight:850;font-size:18px;letter-spacing:.06em;line-height:1.6;" +
        "white-space:pre-line;" +
        "}" +
        ".town-loading-dots{margin-top:8px;font-weight:900;letter-spacing:.22em;color:#f4dec0;}" +
        ".town-loading-dots span{animation:townLoadingDots 1.2s ease-in-out infinite;}" +
        ".town-loading-dots span:nth-child(2){animation-delay:.18s;}" +
        ".town-loading-dots span:nth-child(3){animation-delay:.36s;}" +
        "#work-player.is-loading #work-player-frame{opacity:0;}" +
        "#work-player-frame{transition:opacity 360ms ease;}" +
        "@keyframes townLoadingLamp{0%,100%{opacity:.72;transform:scale(.96);}50%{opacity:1;transform:scale(1.04);}}" +
        "@keyframes townLoadingDots{0%,100%{opacity:.28;}50%{opacity:1;}}" +
        "@media (max-width:720px){" +
        ".town-loading-card{width:min(86vw,320px);padding:22px 16px 18px;}" +
        ".town-loading-label{font-size:16px;}" +
        ".town-loading-mark{width:34px;height:34px;}" +
        "}";

    document.head.appendChild(style);
}

function getOrCreateTownLoadingLayer() {
    ensureTownLoadingStyles();

    var existing = document.getElementById("town-loading-layer");
    if (existing) return existing;

    var layer = document.createElement("div");
    layer.id = "town-loading-layer";
    layer.setAttribute("aria-hidden", "true");

    layer.innerHTML =
        '<div class="town-loading-card" role="status" aria-live="polite">' +
        '<div class="town-loading-mark" aria-hidden="true"></div>' +
        '<div id="town-loading-label" class="town-loading-label">湯間庭町に到着しています…</div>' +
        '<div class="town-loading-dots" aria-hidden="true"><span>・</span><span>・</span><span>・</span></div>' +
        '</div>';

    document.body.appendChild(layer);
    return layer;
}

function showTownLoading(label) {
    var layer = getOrCreateTownLoadingLayer();
    var labelEl = document.getElementById("town-loading-label");

    if (labelEl) {
        labelEl.textContent = label || "湯間庭町に到着しています…";
    }

    if (townArrivalLoadingHideTimer) {
        window.clearTimeout(townArrivalLoadingHideTimer);
        townArrivalLoadingHideTimer = null;
    }

    townArrivalLoadingStartedAt = Date.now();

    layer.classList.add("visible");
    layer.setAttribute("aria-hidden", "false");
}

function hideTownLoading() {
    var layer = document.getElementById("town-loading-layer");
    if (!layer) return;

    var elapsed = Date.now() - townArrivalLoadingStartedAt;
    var wait = Math.max(0, townArrivalLoadingMinMs - elapsed);

    if (townArrivalLoadingHideTimer) {
        window.clearTimeout(townArrivalLoadingHideTimer);
    }

    townArrivalLoadingHideTimer = window.setTimeout(function() {
        layer.classList.remove("visible");
        layer.setAttribute("aria-hidden", "true");
        townArrivalLoadingHideTimer = null;
    }, wait);
}

function showTownArrivalLoading() {
    showTownLoading("湯間庭町に到着しています…");
}

function finishTownArrivalLoading() {
    hideTownLoading();
}

function playTownRpgFadeTransition(callback, waitForReady) {
    var oldFade = document.getElementById("town-rpg-fade-transition");
    if (oldFade && oldFade.parentNode) {
        oldFade.parentNode.removeChild(oldFade);
    }

    var fadeOutMs = 400;
    var holdMs = 70;
    var fadeInMs = 460;

    var fade = document.createElement("div");
    fade.id = "town-rpg-fade-transition";
    fade.style.position = "fixed";
    fade.style.left = "0";
    fade.style.top = "0";
    fade.style.right = "0";
    fade.style.bottom = "0";
    fade.style.zIndex = "12000";
    fade.style.background = "#050403";
    fade.style.opacity = "0";
    fade.style.pointerEvents = "auto";
    fade.style.transition = "opacity " + fadeOutMs + "ms cubic-bezier(.22,.8,.28,1)";
    fade.style.willChange = "opacity";

    document.body.appendChild(fade);

    window.requestAnimationFrame(function() {
        window.requestAnimationFrame(function() {
            fade.style.opacity = "1";
        });
    });

    function startFadeIn() {
        window.setTimeout(function() {
            fade.style.transition = "opacity " + fadeInMs + "ms cubic-bezier(.22,.8,.28,1)";
            fade.style.opacity = "0";

            window.setTimeout(function() {
                if (fade && fade.parentNode) {
                    fade.parentNode.removeChild(fade);
                }
            }, fadeInMs + 80);
        }, holdMs);
    }

    window.setTimeout(function() {
        if (typeof callback === "function") {
            callback();
        }

        if (typeof waitForReady === "function") {
            waitForReady(startFadeIn);
        } else {
            startFadeIn();
        }
    }, fadeOutMs + 40);
}


function changeSceneWithTownFade(sceneId, spawnKey) {
    playTownRpgFadeTransition(
        function() {
            changeScene(sceneId, spawnKey);
        },
        function(reveal) {
            waitForTownSceneBackground(sceneId, reveal);
        }
    );
}


function getWorkOpeningLabel(work) {
    if (!work) return "作品を準備しています…";

    if (work.id === "midnight-cola") {
        return "仕込み場を開けています…";
    }

    if (work.id === "yakitori-wars") {
        return "炭火を起こしています…";
    }

    if (work.id === "rainy-window") {
        return "窓辺を準備しています…";
    }

    if (work.kind === "game") {
        return "店先を開けています…";
    }

    if (work.kind === "work") {
        return "筐体を起動しています…";
    }

    return "作品を準備しています…";
}



function getOrCreateStationGuideMapLayer() {
    var existing = document.getElementById("station-guide-map-layer");
    if (existing) return existing;

    ensureStationGuideMapStyles();
    ensureStationGuideMapLoadingStyles();

    var layer = document.createElement("div");
    layer.id = "station-guide-map-layer";
    layer.setAttribute("aria-hidden", "true");

    layer.innerHTML =
        '<div class="station-guide-map-backdrop" aria-hidden="true"></div>' +
        '<div class="station-guide-map-window" role="dialog" aria-modal="true" aria-label="駅前案内図">' +
        '<div class="station-guide-map-image-wrap">' +
        '<img class="station-guide-map-image" src="' + STATION_GUIDE_MAP_IMAGE + '" alt="湯間庭町 駅前案内図">' +
        '<div class="station-guide-map-hotspots" aria-label="行き先"></div>' +
        '<button class="station-guide-map-close" type="button" aria-label="地図を閉じる">閉じる</button>' +
        '<div class="station-guide-map-hint">行き先をタップ</div>' +
        '</div>' +
        '</div>';

    var container = document.getElementById("game-container") || document.body;
    container.appendChild(layer);

    setupStationGuideMapLoadingLayer(layer);
    setupStationGuideMapImageLoading(layer);

    var closeButton = layer.querySelector(".station-guide-map-close");
    if (closeButton) {
        closeButton.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeStationGuideMap();
        });
    }

    var backdrop = layer.querySelector(".station-guide-map-backdrop");
    if (backdrop) {
        backdrop.addEventListener("pointerdown", function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeStationGuideMap();
        });
    }

    var hotspotRoot = layer.querySelector(".station-guide-map-hotspots");
    if (hotspotRoot) {
        for (var i = 0; i < STATION_GUIDE_MAP_HOTSPOTS.length; i++) {
            (function(spot) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "station-guide-map-hotspot";
                btn.setAttribute("aria-label", spot.label);
                btn.dataset.hotspotId = spot.id;

                btn.style.left = spot.rect.left + "%";
                btn.style.top = spot.rect.top + "%";
                btn.style.width = spot.rect.width + "%";
                btn.style.height = spot.rect.height + "%";

                btn.addEventListener("click", function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStationGuideMapHotspot(spot);
                });

                hotspotRoot.appendChild(btn);
            })(STATION_GUIDE_MAP_HOTSPOTS[i]);
        }
    }

    return layer;
}

function openStationGuideMap() {
    setupStationGuideMapEvents();

    if (typeof cancelTapMove === "function") {
        cancelTapMove();
    }

    var layer = getOrCreateStationGuideMapLayer();
    if (!layer) return;

    isStationGuideMapOpen = true;
    prepareStationGuideMapOpening(layer);

    var params = new URLSearchParams(window.location.search || "");
    var debugAllowed =
        params.get("debugMap") === "1" &&
        (
            location.hostname.indexOf("yumaniwa-town-staging") !== -1 ||
            location.search.indexOf("dev=1") !== -1
        );

    layer.dataset.debugHotspots = debugAllowed ? "true" : "false";

    layer.classList.add("visible");
    layer.setAttribute("aria-hidden", "false");

    clearDpadInput();
    updateControlVisibility();

    var closeButton = layer.querySelector(".station-guide-map-close");
    if (closeButton) {
        window.setTimeout(function() {
            closeButton.focus();
        }, 0);
    }
}

function closeStationGuideMap() {
    var layer = document.getElementById("station-guide-map-layer");

    hideStationGuideMapConfirm();

    isStationGuideMapOpen = false;

    if (layer) {
        layer.classList.remove("visible");
        layer.setAttribute("aria-hidden", "true");

        // 次回開く時に、読み込み中・エラー中の見え方が残らないようにする。
        if (!stationGuideMapImageReady) {
            layer.classList.remove("map-ready");
        }
    }

    clearDpadInput();
    updateControlVisibility();
}


function handleStationGuideMapHotspot(spot) {
    if (!spot) return;
    showStationGuideMapConfirm(spot);
}


function ensureStationGuideMapConfirmStyles() {
    if (document.getElementById("station-guide-map-confirm-style")) return;

    var style = document.createElement("style");
    style.id = "station-guide-map-confirm-style";
    style.textContent =
        "#station-guide-map-layer.confirming .station-guide-map-hotspots{" +
        "pointer-events:none;" +
        "}" +
        ".station-guide-map-confirm{" +
        "position:absolute;inset:0;z-index:4;display:none;" +
        "align-items:center;justify-content:center;" +
        "padding:18px;box-sizing:border-box;line-height:1.5;" +
        "background:rgba(12,8,5,.18);" +
        "}" +
        ".station-guide-map-confirm.visible{display:flex;}" +
        ".station-guide-map-confirm-card{" +
        "width:min(86%,360px);box-sizing:border-box;" +
        "border:2px solid rgba(255,239,200,.76);border-radius:16px;" +
        "background:rgba(37,27,20,.94);color:#fff4df;" +
        "box-shadow:0 14px 34px rgba(0,0,0,.48);" +
        "padding:18px 16px 14px;text-align:center;" +
        "}" +
        ".station-guide-map-confirm-title{" +
        "font-weight:800;font-size:18px;letter-spacing:.04em;margin-bottom:8px;" +
        "}" +
        ".station-guide-map-confirm-body{" +
        "font-size:15px;white-space:pre-line;margin-bottom:14px;color:#f4dec0;" +
        "}" +
        ".station-guide-map-confirm-actions{" +
        "display:flex;gap:10px;justify-content:center;align-items:center;" +
        "}" +
        ".station-guide-map-confirm-actions button{" +
        "appearance:none;-webkit-appearance:none;border-radius:999px;" +
        "border:2px solid rgba(255,239,200,.58);" +
        "padding:10px 14px;font-weight:800;font-size:14px;" +
        "background:rgba(255,244,223,.12);color:#fff4df;" +
        "}" +
        ".station-guide-map-confirm-actions button[data-action='confirm']{" +
        "background:#fff0c8;color:#332217;border-color:#fff0c8;" +
        "}" +
        ".station-guide-map-confirm-actions button:focus-visible{" +
        "outline:3px solid rgba(255,245,180,.95);outline-offset:2px;" +
        "}" +
        "@media (max-width:720px){" +
        ".station-guide-map-confirm-card{width:min(90%,320px);padding:16px 13px 13px;}" +
        ".station-guide-map-confirm-title{font-size:16px;}" +
        ".station-guide-map-confirm-body{font-size:13px;}" +
        ".station-guide-map-confirm-actions button{font-size:13px;padding:9px 12px;}" +
        "}";

    document.head.appendChild(style);
}

function getOrCreateStationGuideMapConfirmPanel() {
    ensureStationGuideMapConfirmStyles();

    var layer = getOrCreateStationGuideMapLayer();
    if (!layer) return null;

    var existing = document.getElementById("station-guide-map-confirm");
    if (existing) return existing;

    var wrap = layer.querySelector(".station-guide-map-image-wrap") || layer;
    var panel = document.createElement("div");
    panel.id = "station-guide-map-confirm";
    panel.className = "station-guide-map-confirm";
    panel.setAttribute("aria-hidden", "true");

    panel.innerHTML =
        '<div class="station-guide-map-confirm-card" role="dialog" aria-modal="true" aria-label="移動確認">' +
        '<div class="station-guide-map-confirm-title"></div>' +
        '<div class="station-guide-map-confirm-body"></div>' +
        '<div class="station-guide-map-confirm-actions">' +
        '<button type="button" data-action="confirm">移動する</button>' +
        '<button type="button" data-action="cancel">地図に戻る</button>' +
        '</div>' +
        '</div>';

    panel.addEventListener("pointerdown", function(e) {
        e.stopPropagation();
    });

    var confirmButton = panel.querySelector("button[data-action='confirm']");
    var cancelButton = panel.querySelector("button[data-action='cancel']");

    if (confirmButton) {
        confirmButton.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            confirmStationGuideMapMove();
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            hideStationGuideMapConfirm();
        });
    }

    wrap.appendChild(panel);
    return panel;
}

function getStationGuideMapConfirmText(spot) {
    if (!spot) return "この場所へ移動しますか？";

    if (spot.kind === "message") {
        return spot.text || "この場所は、まだ準備中です。";
    }

    if (spot.kind === "close") {
        return "駅前広場に戻りますか？";
    }

    if (spot.id === "shinpo") {
        return "湯間庭新報を読みますか？";
    }

    return (spot.label || "この場所") + "へ移動しますか？";
}

function getStationGuideMapConfirmActionLabel(spot) {
    if (!spot) return "移動する";

    if (spot.kind === "message") {
        return "";
    }

    if (spot.kind === "close") {
        return "閉じる";
    }

    if (spot.id === "shinpo") {
        return "読む";
    }

    return "移動する";
}

function showStationGuideMapConfirm(spot) {
    if (!spot) return;

    window.pendingStationGuideMapSpot = spot;

    var layer = document.getElementById("station-guide-map-layer");
    var panel = getOrCreateStationGuideMapConfirmPanel();
    if (!panel) return;

    var title = panel.querySelector(".station-guide-map-confirm-title");
    var body = panel.querySelector(".station-guide-map-confirm-body");
    var confirmButton = panel.querySelector("button[data-action='confirm']");
    var cancelButton = panel.querySelector("button[data-action='cancel']");

    if (title) {
        title.textContent = spot.label || "行き先";
    }

    if (body) {
        body.textContent = getStationGuideMapConfirmText(spot);
    }

    var actionLabel = getStationGuideMapConfirmActionLabel(spot);
    if (confirmButton) {
        if (actionLabel) {
            confirmButton.hidden = false;
            confirmButton.textContent = actionLabel;
        } else {
            confirmButton.hidden = true;
        }
    }

    if (cancelButton) {
        cancelButton.textContent = "地図に戻る";
    }

    if (layer) {
        layer.classList.add("confirming");
    }

    panel.classList.add("visible");
    panel.setAttribute("aria-hidden", "false");

    window.setTimeout(function() {
        if (confirmButton && !confirmButton.hidden) {
            confirmButton.focus();
        } else if (cancelButton) {
            cancelButton.focus();
        }
    }, 0);
}

function hideStationGuideMapConfirm() {
    window.pendingStationGuideMapSpot = null;

    var layer = document.getElementById("station-guide-map-layer");
    var panel = document.getElementById("station-guide-map-confirm");

    if (layer) {
        layer.classList.remove("confirming");
    }

    if (panel) {
        panel.classList.remove("visible");
        panel.setAttribute("aria-hidden", "true");
    }
}

function playStationGuideMapDarkTransition(callback) {
    var oldFade = document.getElementById("town-rpg-fade-transition");
    if (oldFade && oldFade.parentNode) {
        oldFade.parentNode.removeChild(oldFade);
    }

    var fadeOutMs = 380;
    var holdMs = 70;
    var fadeInMs = 430;

    var fade = document.createElement("div");
    fade.id = "town-rpg-fade-transition";
    fade.style.position = "fixed";
    fade.style.left = "0";
    fade.style.top = "0";
    fade.style.right = "0";
    fade.style.bottom = "0";
    fade.style.zIndex = "12000";
    fade.style.background = "#050403";
    fade.style.opacity = "0";
    fade.style.pointerEvents = "auto";
    fade.style.transition = "opacity " + fadeOutMs + "ms cubic-bezier(.22,.8,.28,1)";
    fade.style.willChange = "opacity";

    document.body.appendChild(fade);

    // 1. まず、RPGの場面転換のようにゆっくり暗くする。
    window.requestAnimationFrame(function() {
        window.requestAnimationFrame(function() {
            fade.style.opacity = "1";
        });
    });

    window.setTimeout(function() {
        // 2. 真っ黒になってから、地図を閉じて移動先へ切り替える。
        if (typeof callback === "function") {
            callback();
        }

        // 3. 少しだけ黒を保持してから、ゆっくり明るく戻す。
        window.setTimeout(function() {
            fade.style.transition = "opacity " + fadeInMs + "ms cubic-bezier(.22,.8,.28,1)";
            fade.style.opacity = "0";

            window.setTimeout(function() {
                if (fade && fade.parentNode) {
                    fade.parentNode.removeChild(fade);
                }
            }, fadeInMs + 80);
        }, holdMs);
    }, fadeOutMs + 40);
}



function confirmStationGuideMapMove() {
    var spot = window.pendingStationGuideMapSpot;
    if (!spot) return;

    hideStationGuideMapConfirm();

    if (spot.kind === "close") {
        closeStationGuideMap();
        return;
    }

    if (spot.kind === "message") {
        return;
    }

    if (spot.kind === "place" && spot.target) {
        if (!DESTINATIONS[spot.target]) {
            closeStationGuideMap();
            showMessage("この場所は、まだ地図に描かれているだけのようです。");
            return;
        }

        playStationGuideMapDarkTransition(function() {
            closeStationGuideMap();

            changeScene(spot.target);

            // 地図から来た時は、施設説明よりも行き先一覧をすぐ見せる。
            // 湯間庭新報だけは既存仕様の新聞ラックをそのまま開く。
            if (spot.target !== "shinpo_board") {
                destinationViewMode = "menu";
                renderDestination();
            }
        });
    }
}




// ==========================================
// 町内直リンク
// ?work=midnight-cola のように、外から来た人を
// 湯間庭フレーム付きで直接作品へ案内する。
//
// ?place=tomogushi_alley_map のように、施設メニューへ直接入ることもできる。
// ==========================================
function getRouteParam(names) {
    var params = new URLSearchParams(window.location.search || "");

    for (var i = 0; i < names.length; i++) {
        var value = params.get(names[i]);
        if (value) return value;
    }

    return "";
}

function getWorkVenueDestinationId(work) {
    if (!work) return "";

    // 将来、作品ごとに戻り先を細かく指定したくなった場合の逃げ道。
    if (work.destinationId && DESTINATIONS[work.destinationId]) {
        return work.destinationId;
    }

    if (work.venue === "tomogushi_alley") {
        return "tomogushi_alley_map";
    }

    if (work.venue === "leisure_center") {
        return "leisure_center_map";
    }

    return "";
}

function openTownPlaceFromRoute(placeId) {
    if (!placeId) return false;

    if (placeId === "station_plaza") {
        changeScene("station_plaza");
        return true;
    }

    if (!DESTINATIONS[placeId] && !isTownScene(placeId)) return false;

    changeScene(placeId);

    if (!isTownScene(placeId) && placeId !== "shinpo_board") {
        destinationViewMode = "menu";
        renderDestination();
    }

    return true;
}

function openTownWorkFromRoute(workId) {
    if (!workId) return false;

    var work = getWorkById(workId);
    if (!work) return false;

    var destinationId = getWorkVenueDestinationId(work);

    // 外部リンクから直接作品へ来たことを記録する。
    isDirectWorkVisit = true;
    destinationReturnGuideText = "";
    lastClosedWorkId = null;

    if (destinationId && (DESTINATIONS[destinationId] || isTownScene(destinationId))) {
        changeScene(destinationId);

        if (!isTownScene(destinationId)) {
            destinationViewMode = "menu";
            renderDestination();
        }
    }

    launchWork(work);
    return true;
}


function openInitialTownRouteFromUrl() {
    var workId = getRouteParam(["work", "spot"]);
    if (workId && openTownWorkFromRoute(workId)) {
        return;
    }

    var placeId = getRouteParam(["place", "dest", "destination"]);
    if (placeId) {
        openTownPlaceFromRoute(placeId);
    }
}



// 作品ごとに、町のフレーム内での表示器を選ぶ。
// responsive : コンテンツ領域をそのまま使う（触れるらくがき向け）
// phone      : iPhone相当の縦長画面を中央に置く（縦長ゲーム向け）
function getWorkPlayerLayout(work) {
    return (work && work.playerLayout === "phone") ? "phone" : "responsive";
}

function setWorkPlayerLayout(work, playerLayer) {
    if (!playerLayer) return;

    var layout = getWorkPlayerLayout(work);
    playerLayer.dataset.playerLayout = layout;

    // いったん前の作品の表示器設定を消す。
    playerLayer.style.removeProperty("--town-player-render-width");
    playerLayer.style.removeProperty("--town-player-render-height");
    delete playerLayer.dataset.playerWidth;
    delete playerLayer.dataset.playerHeight;

    if (layout !== "phone") return;

    // itch.ioで指定した本来の縦横サイズを基準にする。
    // 画面に収まらない時だけ、縦横比を保ったまま縮小する。
    var width = Number(work && work.playerWidth) || 390;
    var height = Number(work && work.playerHeight) || 844;

    playerLayer.dataset.playerWidth = String(width);
    playerLayer.dataset.playerHeight = String(height);
}

function updateWorkPlayerLayoutSize() {
    var playerLayer = document.getElementById("work-player");
    var content = document.getElementById("work-player-content");

    if (!playerLayer || !content || playerLayer.dataset.playerLayout !== "phone") return;

    var baseWidth = Number(playerLayer.dataset.playerWidth) || 390;
    var baseHeight = Number(playerLayer.dataset.playerHeight) || 844;
    var availableWidth = Math.max(0, content.clientWidth - 24);
    var availableHeight = Math.max(0, content.clientHeight - 24);

    if (!availableWidth || !availableHeight) return;

    var scale = Math.min(1, availableWidth / baseWidth, availableHeight / baseHeight);
    var renderWidth = Math.max(1, Math.floor(baseWidth * scale));
    var renderHeight = Math.max(1, Math.floor(baseHeight * scale));

    playerLayer.style.setProperty("--town-player-render-width", renderWidth + "px");
    playerLayer.style.setProperty("--town-player-render-height", renderHeight + "px");
}


function clearDpadInput() {
    dpad.up = false;
    dpad.down = false;
    dpad.left = false;
    dpad.right = false;

    var ids = ["btn-up", "btn-down", "btn-left", "btn-right"];
    for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) el.classList.remove("pressed");
    }
}

function updateControlVisibility() {
    var controls = document.getElementById("mobile-controls");
    if (!controls) return;

    if (
        isMessageOpen ||
        isEditMode ||
        debugMode ||
        isWorkPlayerOpen ||
        isStationGuideMapOpen ||
        !isTownScene(currentScene)
    ) {
        controls.classList.add("disabled");
    } else {
        controls.classList.remove("disabled");
    }
}



function applyDeveloperModeVisibility() {
    if (DEV_MODE_ENABLED) return;

    var panel = document.getElementById('editor-panel');
    var button = document.getElementById('btn-debug-toggle');
    var info = document.getElementById('debug-info');

    if (panel) panel.style.display = 'none';
    if (button) button.style.display = 'none';
    if (info) info.style.display = 'none';

    debugMode = false;
    isEditMode = false;
}

function setupTouchSelectionGuards() {
    // 町の操作領域だけ、iPhone Safari の長押し選択・虫眼鏡を抑止する。
    // scene-container は除外し、施設メニューの縦スクロールは残す。
    // 作品プレイヤーの「戻る」ボタンは、Safari の click を確実に受け取れるよう除外する。
    var gameTouchSelector =
        "#game-canvas, #mobile-controls, #interaction-hint, " +
        "#message-window, #message-backdrop, #work-player-frame, #work-player-loading";

    function isEditableTarget(target) {
        return (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            (target && target.isContentEditable)
        );
    }

    function isInteractiveControl(target) {
        return !!(
            target &&
            target.closest &&
            target.closest("button, a, input, textarea, select, [role=button]")
        );
    }

    function isGameTouchTarget(target) {
        if (!target || isEditableTarget(target) || isInteractiveControl(target) || !target.closest) return false;
        return !!target.closest(gameTouchSelector);
    }

    function blockNativeGameTouch(e) {
        if (isGameTouchTarget(e.target)) {
            e.preventDefault();
        }
    }

    document.addEventListener("selectstart", blockNativeGameTouch);
    document.addEventListener("dragstart", blockNativeGameTouch);
    document.addEventListener("contextmenu", blockNativeGameTouch);
    document.addEventListener("touchstart", blockNativeGameTouch, { passive: false });
    document.addEventListener("touchmove", blockNativeGameTouch, { passive: false });
}


window.onload = function() {
    showTownArrivalLoading();

    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    applyDeveloperModeVisibility();
    setupTouchSelectionGuards();
    preloadTownSceneBackgrounds();
    if (typeof refreshTownContent === 'function') refreshTownContent();
    window.addEventListener('resize', resizeCanvas);

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', resizeCanvas);
        window.visualViewport.addEventListener('scroll', resizeCanvas);
    }

    resizeCanvas();

    bgImage.onload = function() {
        bgLoaded = true;
        finishTownArrivalLoading();
    };
    bgImage.onerror = function() {
        bgError = true;
        finishTownArrivalLoading();
    };

    if (!applyTownSceneDefinition(currentScene, 'default')) {
        initGrid();
        if (typeof BG_IMAGE_PATH !== 'undefined' && BG_IMAGE_PATH) {
            bgImage.src = BG_IMAGE_PATH;
        } else {
            finishTownArrivalLoading();
        }
    }

    loadPlayerSprites();

    setupEvents();

    ensureTownControlRefreshStyles();
    setupTownInteractionHintControl();
    setupDpadTapShield();

    setupEditorEvents();
    markEditorExportCopied();
    setupMessageLayerEvents();
    setupWorkPlayerEvents();

    // ?work=midnight-cola / ?place=tomogushi_alley_map などの直リンクを処理する。
    // setupWorkPlayerEvents の後に呼ぶことで、戻るボタンや iframe の準備完了後に開ける。
    openInitialTownRouteFromUrl();

    requestAnimationFrame(gameLoop);

    setTimeout(function() {
        updateCurrentArea();
        updateInteractionHint();
    }, 500);
};

function resizeCanvas() {
    applyTownPageFrameStyle();

    updateCurrentGameViewSizeFromScreen();

    canvas.width = GAME_VIEW_W;
    canvas.height = getCurrentGameViewH();

    applyCanvasDisplaySize();

    if (ctx) {
        ctx.imageSmoothingEnabled = false;
    }

    if (typeof updateInteractionHint === "function") {
        updateInteractionHint();
    }
}



function loadPlayerSprites() {
    var poses = ['stand', 'walk'];
    var dirs = ['down', 'left', 'up', 'right'];

    for (var p = 0; p < poses.length; p++) {
        for (var d = 0; d < dirs.length; d++) {
            var pose = poses[p];
            var dir = dirs[d];
            var image = new Image();

            image.src = PLAYER_SPRITE_PATHS[pose][dir];
            playerSprites[pose][dir] = image;
        }
    }
}

function drawFallbackPlayer(px, py) {
    ctx.fillStyle = '#f4c2c2';
    ctx.fillRect(px + 2, py - 8, 12, 12);
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(px, py + 4, 16, 12);
    ctx.fillStyle = '#ffffff';

    if (player.dir === 'down') {
        ctx.fillRect(px + 3, py - 4, 3, 3);
        ctx.fillRect(px + 10, py - 4, 3, 3);
    } else if (player.dir === 'left') {
        ctx.fillRect(px + 1, py - 4, 3, 3);
    } else if (player.dir === 'right') {
        ctx.fillRect(px + 12, py - 4, 3, 3);
    }
}

function updatePlayerWalkAnimation(movedDistance) {
    if (!player.isMoving) {
        player.walkDistance = 0;
        player.walkFrame = 0;
        player.walkWasMoving = false;
        return;
    }

    // 動き始めた最初のフレームから walk を出す。
    if (!player.walkWasMoving) {
        player.walkWasMoving = true;
        player.walkFrame = 1;
        player.walkDistance = 0;
        return;
    }

    player.walkDistance += Math.max(0, movedDistance || 0);

    while (player.walkDistance >= PLAYER_WALK_STEP_PX) {
        player.walkDistance -= PLAYER_WALK_STEP_PX;
        player.walkFrame = player.walkFrame === 0 ? 1 : 0;
    }
}

function getPlayerSpritePose() {
    if (!player.isMoving) return 'stand';
    return player.walkFrame === 1 ? 'walk' : 'stand';
}

function drawPlayerSprite(px, py) {
    var pose = getPlayerSpritePose();
    var sprite = playerSprites[pose] && playerSprites[pose][player.dir];

    if (!sprite || !sprite.complete || !sprite.naturalWidth) {
        drawFallbackPlayer(px, py);
        return;
    }

    // PNGの自然な縦横比を維持する。
    // 正方形PNGなら32×32、縦長PNGなら自然に縦長のまま描かれる。
    var drawH = PLAYER_SPRITE_DRAW.height;
    var sourceRatio = sprite.naturalWidth / sprite.naturalHeight;
    var drawW = Math.round(drawH * sourceRatio);

    // 足元を従来の16pxプレイヤー枠の下端に合わせる。
    var drawX = Math.round(px + (player.w - drawW) / 2);
    var drawY = Math.round(py + player.h - drawH);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
    ctx.restore();
}


function cloneCollisionGrid(source) {
    var copied = [];
    var grid = source || [];

    for (var y = 0; y < grid.length; y++) {
        copied.push(grid[y].slice());
    }

    return copied;
}

function initGrid() {
    baseCollisionGrid = [];

    for (var y = 0; y < MAP_HEIGHT; y++) {
        var row = [];
        for (var x = 0; x < MAP_WIDTH; x++) row.push(0);
        baseCollisionGrid.push(row);
    }

    for (var i = 0; i < passableRects.length; i++) {
        var r = passableRects[i];
        for (var cy = r.y; cy < r.y + r.h; cy++) {
            for (var cx = r.x; cx < r.x + r.w; cx++) {
                if (cx >= 0 && cx < MAP_WIDTH && cy >= 0 && cy < MAP_HEIGHT) {
                    baseCollisionGrid[cy][cx] = 1;
                }
            }
        }
    }

    for (var j = 0; j < blockedRects.length; j++) {
        var blocked = blockedRects[j];
        for (var by = blocked.y; by < blocked.y + blocked.h; by++) {
            for (var bx = blocked.x; bx < blocked.x + blocked.w; bx++) {
                if (bx >= 0 && bx < MAP_WIDTH && by >= 0 && by < MAP_HEIGHT) {
                    baseCollisionGrid[by][bx] = 2;
                }
            }
        }
    }

    for (var p = 0; p < blockedPoints.length; p++) {
        var point = blockedPoints[p];
        if (point.x >= 0 && point.x < MAP_WIDTH && point.y >= 0 && point.y < MAP_HEIGHT) {
            baseCollisionGrid[point.y][point.x] = 2;
        }
    }

    rebuildCollisionGridFromBase();
}

function rebuildCollisionGridFromBase() {
    collisionGrid = cloneCollisionGrid(baseCollisionGrid);
    applyTownPartCollisionToGrid(collisionGrid);
}

function getPlayerTile() {
    var hitbox = getPlayerHitbox(player.x, player.y);
    var cx = hitbox.x + hitbox.w / 2;
    var cy = hitbox.y + hitbox.h / 2;
    return {
        x: Math.floor(cx / TILE_SIZE),
        y: Math.floor(cy / TILE_SIZE)
    };
}

function getTownDevTileText(tile) {
    if (!tile) return "-";
    return "x=" + tile.x + ", y=" + tile.y;
}

function updateTownDevInfo(tile) {
    if (!debugMode && !isEditMode) return;

    var coord = document.getElementById("coord-display");
    if (!coord) return;

    var playerTile = getPlayerTile();
    var sceneTitle = currentScene;
    var def = getTownSceneDefinition(currentScene);

    if (def && def.title) {
        sceneTitle = currentScene + " / " + def.title;
    }

    coord.innerText =
        "map: " + sceneTitle +
        " ｜ player: " + getTownDevTileText(playerTile) +
        " ｜ tile: " + getTownDevTileText(tile || currentHoverTile);
}

function drawTownDevGridLabels(cam) {
    ctx.save();

    ctx.font = "bold 7px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (var x = 0; x < MAP_WIDTH; x++) {
        if (x % 2 !== 0 && x !== MAP_WIDTH - 1) continue;

        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(x * TILE_SIZE + 1, 1, TILE_SIZE - 2, 8);

        ctx.fillStyle = "rgba(255,255,255,0.88)";
        ctx.fillText(String(x), x * TILE_SIZE + TILE_SIZE / 2, 5);
    }

    ctx.textAlign = "left";

    for (var y = 0; y < MAP_HEIGHT; y++) {
        if (y % 2 !== 0 && y !== MAP_HEIGHT - 1) continue;

        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(1, y * TILE_SIZE + 1, 12, TILE_SIZE - 2);

        ctx.fillStyle = "rgba(255,255,255,0.88)";
        ctx.fillText(String(y), 3, y * TILE_SIZE + TILE_SIZE / 2);
    }

    ctx.restore();
}

function drawTownDevTileCallout(tile) {
    if (!tile) return;

    var label = "x=" + tile.x + " y=" + tile.y;
    var px = tile.x * TILE_SIZE;
    var py = tile.y * TILE_SIZE;

    ctx.save();

    ctx.fillStyle = "rgba(255, 165, 0, 0.78)";
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(px + 2, py - 12, Math.max(42, label.length * 6), 11);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, px + 5, py - 6);

    ctx.restore();
}

function drawTownDevOverlay(cam) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 1;

    for (var gx = 0; gx <= cam.mapPixelW; gx += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, cam.mapPixelH);
        ctx.stroke();
    }

    for (var gy = 0; gy <= cam.mapPixelH; gy += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(cam.mapPixelW, gy);
        ctx.stroke();
    }

    // 通行可能エリア
    ctx.fillStyle = "rgba(0, 120, 255, 0.20)";
    for (var y1 = 0; y1 < MAP_HEIGHT; y1++) {
        for (var x1 = 0; x1 < MAP_WIDTH; x1++) {
            if (collisionGrid[y1][x1] === 1) {
                ctx.fillRect(x1 * TILE_SIZE, y1 * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // 通行不可エリア
    ctx.fillStyle = "rgba(255, 0, 0, 0.28)";
    for (var y2 = 0; y2 < MAP_HEIGHT; y2++) {
        for (var x2 = 0; x2 < MAP_WIDTH; x2++) {
            if (collisionGrid[y2][x2] === 2) {
                ctx.fillRect(x2 * TILE_SIZE, y2 * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // 調べる場所
    ctx.fillStyle = "rgba(255, 230, 0, 0.42)";
    for (var k = 0; k < triggers.length; k++) {
        var t = triggers[k];
        if (!t || !t.area) continue;

        ctx.fillRect(
            t.area.x * TILE_SIZE,
            t.area.y * TILE_SIZE,
            t.area.w * TILE_SIZE,
            t.area.h * TILE_SIZE
        );

        ctx.fillStyle = "rgba(0,0,0,0.70)";
        ctx.fillRect(t.area.x * TILE_SIZE + 1, t.area.y * TILE_SIZE + 1, Math.min(72, Math.max(28, String(t.label || t.id || "").length * 7)), 11);

        ctx.fillStyle = "#fff7b0";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(String(t.label || t.id || "trigger"), t.area.x * TILE_SIZE + 4, t.area.y * TILE_SIZE + 6);

        ctx.fillStyle = "rgba(255, 230, 0, 0.42)";
    }

    // エリア名
    for (var a = 0; a < areaZones.length; a++) {
        var z = areaZones[a].area;
        ctx.fillStyle = "rgba(180, 80, 255, 0.16)";
        ctx.fillRect(z.x * TILE_SIZE, z.y * TILE_SIZE, z.w * TILE_SIZE, z.h * TILE_SIZE);

        ctx.fillStyle = "#ffffff";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(areaZones[a].title, z.x * TILE_SIZE + 2, z.y * TILE_SIZE + 10);
    }

    drawTownDevGridLabels(cam);
    drawTownPartEditorOverlay();

    if (isEditMode) {
        if (editStep === 1 && currentHoverTile) {
            var minX = Math.min(editStartX, currentHoverTile.x);
            var minY = Math.min(editStartY, currentHoverTile.y);
            var w = Math.max(editStartX, currentHoverTile.x) - minX + 1;
            var h = Math.max(editStartY, currentHoverTile.y) - minY + 1;

            ctx.fillStyle = "rgba(0, 255, 255, 0.36)";
            ctx.fillRect(minX * TILE_SIZE, minY * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
        }

        if (currentHoverTile && editStep === 0 && editTarget === "blockedPoints") {
            drawTownDevTileCallout(currentHoverTile);
        } else if (editStep === 1) {
            drawTownDevTileCallout({ x: editStartX, y: editStartY });
        }
    } else if (currentHoverTile) {
        drawTownDevTileCallout(currentHoverTile);
    }

    updateTownDevInfo(currentHoverTile);
}


function isWalkableTile(tx, ty) {
    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return false;
    return collisionGrid[ty][tx] === 1;
}

function findPath(startX, startY, goalX, goalY) {
    if (!isWalkableTile(goalX, goalY)) return null;
    if (startX === goalX && startY === goalY) return [];

    var queue = [{ x: startX, y: startY, path: [] }];
    var visited = [];
    for (var y = 0; y < MAP_HEIGHT; y++) {
        var row = [];
        for (var x = 0; x < MAP_WIDTH; x++) row.push(false);
        visited.push(row);
    }
    visited[startY][startX] = true;

    var dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

    while (queue.length > 0) {
        var cur = queue.shift();
        
        if (cur.x === goalX && cur.y === goalY) {
            return cur.path;
        }

        for (var i = 0; i < dirs.length; i++) {
            var nx = cur.x + dirs[i].dx;
            var ny = cur.y + dirs[i].dy;

            if (isWalkableTile(nx, ny) && !visited[ny][nx]) {
                visited[ny][nx] = true;
                var newPath = cur.path.slice();
                newPath.push({ x: nx, y: ny });
                queue.push({ x: nx, y: ny, path: newPath });
            }
        }
    }
    return null;
}

function startTapMoveTo(tileX, tileY) {
    tapMoveTargetTrigger = null;
    tapFocusedTrigger = null;

    if (!isWalkableTile(tileX, tileY)) return false;

    var startTile = getPlayerTile();
    var path = findPath(startTile.x, startTile.y, tileX, tileY);

    if (path) {
        if (path.length > 0) {
            tapMovePath = path;
            tapMoveTargetTile = path[0];
        } else {
            tapMovePath = [];
            tapMoveTargetTile = null;
        }

        tapMarkerPos = { x: tileX, y: tileY };
        tapMarkerTimer = 60;
        updateInteractionHint();
        return true;
    }

    return false;
}


function cancelTapMove() {
    tapMovePath = [];
    tapMoveTargetTile = null;
    tapMoveTargetTrigger = null;
    tapFocusedTrigger = null;
    tapMoveRequestedWarpSide = null;
}


function cancelTapMoveForAction() {
    // ヒントや調べるボタンを押す時用。
    // 到着後に覚えている対象 tapFocusedTrigger は消さない。
    tapMovePath = [];
    tapMoveTargetTile = null;
    tapMoveTargetTrigger = null;
    tapMoveRequestedWarpSide = null;
}



function isTileInsideRectWithPadding(tileX, tileY, rect, padding) {
    if (!rect) return false;

    var p = padding || 0;
    return (
        tileX >= rect.x - p &&
        tileX < rect.x + rect.w + p &&
        tileY >= rect.y - p &&
        tileY < rect.y + rect.h + p
    );
}

function getTriggerCenterTile(trigger) {
    var area = trigger && trigger.area ? trigger.area : { x: 0, y: 0, w: 1, h: 1 };

    return {
        x: area.x + area.w / 2,
        y: area.y + area.h / 2
    };
}

function getTileDistanceToTriggerCenter(tileX, tileY, trigger) {
    var center = getTriggerCenterTile(trigger);
    var dx = (tileX + 0.5) - center.x;
    var dy = (tileY + 0.5) - center.y;

    return Math.sqrt(dx * dx + dy * dy);
}

function getTapTriggerCandidate(tileX, tileY) {
    var best = null;
    var bestScore = Infinity;

    for (var i = 0; i < triggers.length; i++) {
        var t = triggers[i];
        if (!t || !t.area) continue;

        // 建物や札は、正確に1マスを押さなくても反応してほしいので少し広めに見る。
        var padding = (typeof t.tapPadding === "number") ? t.tapPadding : 2;

        if (!isTileInsideRectWithPadding(tileX, tileY, t.area, padding)) continue;

        var score = getTileDistanceToTriggerCenter(tileX, tileY, t);

        // 本来のトリガー範囲を直接押している場合は優先する。
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

function findApproachTileForTrigger(trigger) {
    if (!trigger || !trigger.area) return null;

    var startTile = getPlayerTile();
    var best = null;
    var bestScore = Infinity;

    // まずは対象のすぐ周囲。無理なら少しだけ広げる。
    for (var radius = 1; radius <= 3; radius++) {
        var minX = trigger.area.x - radius;
        var maxX = trigger.area.x + trigger.area.w + radius - 1;
        var minY = trigger.area.y - radius;
        var maxY = trigger.area.y + trigger.area.h + radius - 1;

        for (var y = minY; y <= maxY; y++) {
            for (var x = minX; x <= maxX; x++) {
                if (!isWalkableTile(x, y)) continue;

                var path = findPath(startTile.x, startTile.y, x, y);
                if (!path) continue;

                var distanceToTrigger = getTileDistanceToTriggerCenter(x, y, trigger);
                var pathLength = path.length;

                // 近くて、移動距離も短い場所を選ぶ。
                var score = pathLength * 10 + distanceToTrigger;

                if (score < bestScore) {
                    bestScore = score;
                    best = {
                        tile: { x: x, y: y },
                        path: path
                    };
                }
            }
        }

        if (best) return best;
    }

    return null;
}

function faceTrigger(trigger) {
    if (!trigger || !trigger.area) return;

    var playerTile = getPlayerTile();
    var px = playerTile.x + 0.5;
    var py = playerTile.y + 0.5;

    var left = trigger.area.x;
    var right = trigger.area.x + trigger.area.w;
    var top = trigger.area.y;
    var bottom = trigger.area.y + trigger.area.h;

    var dx = 0;
    var dy = 0;

    // 対象の横幅・縦幅の内側にいる場合は、その軸の差分を0にする。
    // これで掲示板のような横長オブジェクトの下に立った時、横ではなく上を向きやすくなる。
    if (px < left) {
        dx = left - px;
    } else if (px > right) {
        dx = right - px;
    }

    if (py < top) {
        dy = top - py;
    } else if (py > bottom) {
        dy = bottom - py;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
        player.dir = dx > 0 ? "right" : "left";
    } else if (Math.abs(dy) > 0.01) {
        player.dir = dy > 0 ? "down" : "up";
    } else {
        // 完全に重なっているような特殊ケースでは、従来どおり中心を見る。
        var center = getTriggerCenterTile(trigger);
        var cdx = center.x - px;
        var cdy = center.y - py;

        if (Math.abs(cdx) > Math.abs(cdy)) {
            player.dir = cdx > 0 ? "right" : "left";
        } else if (Math.abs(cdy) > 0.01) {
            player.dir = cdy > 0 ? "down" : "up";
        }
    }

    player.isMoving = false;
    player.walkFrame = 0;
    player.walkDistance = 0;
    player.walkWasMoving = false;
}


function isPlayerNearTrigger(trigger) {
    if (!trigger || !trigger.area) return false;

    var tile = getPlayerTile();
    return isTileInsideRectWithPadding(tile.x, tile.y, trigger.area, 2);
}

function startTapMoveToTrigger(trigger) {
    if (!trigger) return false;

    var approach = findApproachTileForTrigger(trigger);
    if (!approach) return false;

    tapFocusedTrigger = null;
    tapMoveTargetTrigger = trigger;
    tapMarkerPos = { x: approach.tile.x, y: approach.tile.y };
    tapMarkerTimer = 60;

    if (approach.path.length === 0) {
        faceTrigger(trigger);
        tapMoveTargetTrigger = null;
        tapFocusedTrigger = trigger;
        updateInteractionHint();
        updateCurrentArea();
        return true;
    }

    tapMovePath = approach.path;
    tapMoveTargetTile = approach.path[0];
    updateInteractionHint();
    return true;
}

function startTapMoveToNearbyTrigger(tileX, tileY) {
    var trigger = getTapTriggerCandidate(tileX, tileY);
    if (!trigger) return false;

    return startTapMoveToTrigger(trigger);
}



function updateTapMove() {
    if (!tapMoveTargetTile) return false;

    var targetPixelX = tapMoveTargetTile.x * TILE_SIZE + TILE_SIZE / 2;
    var targetPixelY = tapMoveTargetTile.y * TILE_SIZE + TILE_SIZE / 2;

    var hitbox = getPlayerHitbox(player.x, player.y);
    var cx = hitbox.x + hitbox.w / 2;
    var cy = hitbox.y + hitbox.h / 2;

    var dx = targetPixelX - cx;
    var dy = targetPixelY - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < player.speed) {
        player.x += dx;
        player.y += dy;
        tapMovePath.shift();
        if (tapMovePath.length > 0) {
            tapMoveTargetTile = tapMovePath[0];
        } else {
            tapMoveTargetTile = null;

            if (tapMoveTargetTrigger) {
                faceTrigger(tapMoveTargetTrigger);
                tapFocusedTrigger = tapMoveTargetTrigger;
                tapMoveTargetTrigger = null;
            }

            updateInteractionHint();
            updateCurrentArea();
        }
        return true;
    }

    var moveX = (dx / dist) * player.speed;
    var moveY = (dy / dist) * player.speed;

    if (Math.abs(moveX) > Math.abs(moveY)) {
        player.dir = moveX > 0 ? "right" : "left";
    } else {
        player.dir = moveY > 0 ? "down" : "up";
    }

    if (!checkCollision(player.x + moveX, player.y)) player.x += moveX;
    if (!checkCollision(player.x, player.y + moveY)) player.y += moveY;
    
    return true;
}

// ==========================================
// 3. カメラ計算
// ==========================================
function getCamera() {
    var zoom = GAME_CAMERA_ZOOM;
    var viewW = GAME_VIEW_W / zoom;
    var viewH = getCurrentGameViewH() / zoom;
    var mapPixelW = MAP_WIDTH * TILE_SIZE;
    var mapPixelH = MAP_HEIGHT * TILE_SIZE;

    var cameraX = (player.x + player.w / 2) - (viewW / 2);
    var cameraY = (player.y + player.h / 2) - (viewH / 2);

    if (viewW > mapPixelW) {
        cameraX = -(viewW - mapPixelW) / 2;
    } else {
        if (cameraX < 0) cameraX = 0;
        if (cameraX > mapPixelW - viewW) cameraX = mapPixelW - viewW;
    }

    if (viewH > mapPixelH) {
        cameraY = -(viewH - mapPixelH) / 2;
    } else {
        if (cameraY < 0) cameraY = 0;
        if (cameraY > mapPixelH - viewH) cameraY = mapPixelH - viewH;
    }

    return {
        zoom: zoom,
        viewW: viewW,
        viewH: viewH,
        cameraX: cameraX,
        cameraY: cameraY,
        mapPixelW: mapPixelW,
        mapPixelH: mapPixelH
    };
}



// ==========================================
// 4-A. PC向けRPGメニュー操作
// ==========================================
function isDestinationSceneOpen() {
    var sceneContainer = document.getElementById('scene-container');
    return !!(
        sceneContainer &&
        sceneContainer.style.display !== 'none' &&
        !isTownScene(currentScene) &&
        !isWorkPlayerOpen &&
        !isStationGuideMapOpen
    );
}

function getRpgMenuButtons() {
    var sceneContainer = document.getElementById('scene-container');
    if (!sceneContainer || sceneContainer.style.display === 'none') return [];

    var nodes = sceneContainer.querySelectorAll('.rpg-menu-item');
    var buttons = [];

    for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (!el.disabled && el.offsetParent !== null) {
            buttons.push(el);
        }
    }

    return buttons;
}

function setRpgMenuCursorIndex(nextIndex, shouldFocus) {
    var buttons = getRpgMenuButtons();
    if (buttons.length === 0) {
        rpgMenuCursorIndex = 0;
        return;
    }

    if (!isFinite(nextIndex)) nextIndex = 0;

    while (nextIndex < 0) nextIndex += buttons.length;
    nextIndex = nextIndex % buttons.length;
    rpgMenuCursorIndex = nextIndex;

    for (var i = 0; i < buttons.length; i++) {
        var selected = i === rpgMenuCursorIndex;
        buttons[i].classList.toggle('rpg-menu-selected', selected);
        buttons[i].setAttribute('aria-selected', selected ? 'true' : 'false');
        buttons[i].setAttribute('tabindex', selected ? '0' : '-1');
    }

    if (shouldFocus && buttons[rpgMenuCursorIndex]) {
        try {
            buttons[rpgMenuCursorIndex].focus({ preventScroll: true });
        } catch (err) {
            buttons[rpgMenuCursorIndex].focus();
        }

        if (buttons[rpgMenuCursorIndex].scrollIntoView) {
            buttons[rpgMenuCursorIndex].scrollIntoView({ block: 'nearest' });
        }
    }
}

function resetRpgMenuCursor() {
    rpgMenuCursorIndex = 0;
    window.requestAnimationFrame(function() {
        setRpgMenuCursorIndex(0, false);
    });
}

function moveRpgMenuCursor(delta) {
    setRpgMenuCursorIndex(rpgMenuCursorIndex + delta, true);
}

function activateRpgMenuCursor() {
    var buttons = getRpgMenuButtons();
    if (buttons.length === 0) return;
    var index = Math.max(0, Math.min(rpgMenuCursorIndex, buttons.length - 1));
    buttons[index].click();
}

function backFromRpgMenu() {
    if (destinationViewMode === 'message') {
        returnDestinationMenu();
        return;
    }

    backToDestinationReturnScene(currentDestinationId);
}

function handleRpgMenuKeyboard(e) {
    if (!isDestinationSceneOpen() || isEditMode || debugMode) return false;

    var key = e.key;

    // 湯間庭新報も、開いた直前の場所へ戻す
    if (destinationViewMode === 'note_rack') {
        if (key === 'Escape' || key === 'Backspace' || key === 'ArrowLeft') {
            e.preventDefault();
            e.stopPropagation();
            backToDestinationReturnScene(currentDestinationId);
            return true;
        }
        return false;
    }

    if (key === 'ArrowUp' || key === 'w' || key === 'W' || key === 'k' || key === 'K') {
        e.preventDefault();
        e.stopPropagation();
        moveRpgMenuCursor(-1);
        return true;
    }

    if (key === 'ArrowDown' || key === 's' || key === 'S' || key === 'j' || key === 'J') {
        e.preventDefault();
        e.stopPropagation();
        moveRpgMenuCursor(1);
        return true;
    }

    if (key === 'Enter' || key === ' ' || key === 'z' || key === 'Z' || key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        activateRpgMenuCursor();
        return true;
    }

    if (key === 'Escape' || key === 'Backspace' || key === 'x' || key === 'X' || key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        backFromRpgMenu();
        return true;
    }

    return false;
}


function setupRpgMenuPointerSelection(sceneContainer) {
    if (!sceneContainer || sceneContainer.dataset.rpgCursorReady === 'true') return;
    sceneContainer.dataset.rpgCursorReady = 'true';

    function selectFromPointer(e) {
        var target = e.target;
        if (!target || !target.closest) return;

        var button = target.closest('.rpg-menu-item');
        if (!button || !sceneContainer.contains(button)) return;

        var buttons = getRpgMenuButtons();
        for (var i = 0; i < buttons.length; i++) {
            if (buttons[i] === button) {
                setRpgMenuCursorIndex(i, false);
                break;
            }
        }
    }

    sceneContainer.addEventListener('pointermove', selectFromPointer);
    sceneContainer.addEventListener('focusin', selectFromPointer);
}

// ==========================================
// 4. 入力イベント
// ==========================================
function setupEvents() {
    window.addEventListener('keydown', function(e) {
        if (handleRpgMenuKeyboard(e)) return;
        if (
            isEditMode &&
            editTarget === 'props' &&
            handlePartEditorKeyboard(e)
        ) {
            return;
        }

        keys[e.key] = true;

        if (
            DEV_MODE_ENABLED &&
            (
                e.key === 'g' ||
                e.key === 'G' ||
                e.key === 'd' ||
                e.key === 'D'
            )
        ) {
            toggleDebugMode();
        }

        if (e.key === 'Escape') {
            if (isWorkPlayerOpen) {
                closeWorkPlayer();
                return;
            }

            closeMessage();

            if (!isTownScene(currentScene)) {
                changeScene('station_plaza');
            }

            pendingWarp = null;
        }

        if (
            e.key === 'Enter' ||
            e.key === ' '
        ) {
            handleActionTrigger();
        }
    });

    window.addEventListener(
        'keyup',
        function(e) {
            keys[e.key] = false;
        }
    );

    window.addEventListener(
        "blur",
        clearDpadInput
    );

    document.addEventListener(
        "visibilitychange",
        function() {
            if (document.hidden) {
                clearDpadInput();
            }
        }
    );

    function stopProp(e) {
        e.stopPropagation();
    }

    function bindDpadButton(id, dir) {
        var el = document.getElementById(id);
        if (!el) return;

        function press(e) {
            e.preventDefault();
            e.stopPropagation();

            if (
                isMessageOpen ||
                isEditMode ||
                debugMode ||
                !isTownScene(currentScene)
            ) {
                return;
            }

            cancelTapMove();
            dpad[dir] = true;
            el.classList.add("pressed");

            if (
                el.setPointerCapture &&
                e.pointerId !== undefined
            ) {
                try {
                    el.setPointerCapture(e.pointerId);
                } catch (err) {}
            }
        }

        function release(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            dpad[dir] = false;
            el.classList.remove("pressed");

            if (
                el.releasePointerCapture &&
                e &&
                e.pointerId !== undefined
            ) {
                try {
                    el.releasePointerCapture(e.pointerId);
                } catch (err) {}
            }
        }

        el.addEventListener(
            "pointerdown",
            press,
            { passive: false }
        );

        el.addEventListener(
            "pointerup",
            release,
            { passive: false }
        );

        el.addEventListener(
            "pointercancel",
            release,
            { passive: false }
        );

        el.addEventListener(
            "lostpointercapture",
            release,
            { passive: false }
        );
    }

    bindDpadButton("btn-up", "up");
    bindDpadButton("btn-down", "down");
    bindDpadButton("btn-left", "left");
    bindDpadButton("btn-right", "right");

    var actionButton =
        document.getElementById("btn-action");

    if (actionButton) {
        var lastActionButtonTime = 0;

        function activateActionButton(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            // pointerupの直後にclickも発生した場合の二重実行を防ぐ。
            var now = Date.now();

            if (now - lastActionButtonTime < 350) {
                return;
            }

            lastActionButtonTime = now;

            // 移動途中で押した場合は移動だけ止め、
            // 到着済みの対象情報は残して調べられるようにする。
            if (typeof cancelTapMoveForAction === "function") {
                cancelTapMoveForAction();
            }

            handleActionTrigger();
        }

        actionButton.addEventListener(
            "pointerup",
            activateActionButton,
            { passive: false }
        );

        // PCや古いブラウザ向けの保険。
        actionButton.addEventListener(
            "click",
            activateActionButton
        );
    }

    function suppressCanvasNativeGesture(e) {
        e.preventDefault();
    }

    function applyNativeGestureSuppression(el) {
        if (!el) return;

        el.addEventListener(
            'selectstart',
            suppressCanvasNativeGesture,
            { passive: false }
        );

        el.addEventListener(
            'dragstart',
            suppressCanvasNativeGesture,
            { passive: false }
        );

        el.addEventListener(
            'contextmenu',
            suppressCanvasNativeGesture,
            { passive: false }
        );

        el.addEventListener(
            'touchstart',
            suppressCanvasNativeGesture,
            { passive: false }
        );

        el.addEventListener(
            'touchmove',
            suppressCanvasNativeGesture,
            { passive: false }
        );

        el.addEventListener(
            'gesturestart',
            suppressCanvasNativeGesture,
            { passive: false }
        );

        el.addEventListener(
            'gesturechange',
            suppressCanvasNativeGesture,
            { passive: false }
        );

        el.addEventListener(
            'gestureend',
            suppressCanvasNativeGesture,
            { passive: false }
        );
    }

    applyNativeGestureSuppression(canvas);
    applyNativeGestureSuppression(
        document.getElementById('mobile-controls')
    );
    applyNativeGestureSuppression(
        document.getElementById('dpad')
    );
    applyNativeGestureSuppression(
        document.getElementById('btn-action')
    );

    var dpadButtons =
        document.querySelectorAll('.dpad-btn');

    dpadButtons.forEach(function(btn) {
        applyNativeGestureSuppression(btn);
    });

    canvas.addEventListener(
        'pointerdown',
        function(e) {
            e.preventDefault();

            if (
                isMessageOpen ||
                !isTownScene(currentScene)
            ) {
                return;
            }

            if (
                isEditMode &&
                editTarget === 'props'
            ) {
                handlePartEditorPointerDown(e);
                return;
            }

            var tappedTile = getPointerTile(e);
            if (!tappedTile) return;

            var tileX = tappedTile.x;
            var tileY = tappedTile.y;

            if (isEditMode) {
                document
                    .getElementById('clicked-coord')
                    .innerText =
                    "タップ: x=" +
                    tileX +
                    ", y=" +
                    tileY;

                currentHoverTile = {
                    x: tileX,
                    y: tileY
                };

                updateTownDevInfo(currentHoverTile);
                handleEditorTap(tileX, tileY);
                return;
            }

            if (debugMode) {
                document
                    .getElementById('clicked-coord')
                    .innerText =
                    "タップ: x=" +
                    tileX +
                    ", y=" +
                    tileY;

                currentHoverTile = {
                    x: tileX,
                    y: tileY
                };

                updateTownDevInfo(currentHoverTile);
                return;
            }

            if (
                startTapMoveToNearbyTrigger(
                    tileX,
                    tileY
                )
            ) {
                return;
            }

            startTapMoveTo(tileX, tileY);
        }
    );

    canvas.addEventListener(
        'pointermove',
        function(e) {
            e.preventDefault();

            if (!debugMode && !isEditMode) {
                return;
            }

            if (
                isEditMode &&
                editTarget === 'props' &&
                partDragState
            ) {
                handlePartEditorPointerMove(e);
                return;
            }

            var hoverTile = getPointerTile(e);
            if (!hoverTile) return;

            currentHoverTile = {
                x: hoverTile.x,
                y: hoverTile.y
            };

            updateTownDevInfo(currentHoverTile);
        }
    );

    canvas.addEventListener(
        'pointerup',
        finishPartEditorDrag
    );

    canvas.addEventListener(
        'pointercancel',
        finishPartEditorDrag
    );

    canvas.addEventListener(
        'lostpointercapture',
        finishPartEditorDrag
    );
}



function setupMessageLayerEvents() {
    var msgWin = document.getElementById('message-window');
    var backdrop = document.getElementById('message-backdrop');

    function handleMessageTap(e) {
        e.preventDefault();
        e.stopPropagation();

        if (pendingWarp) {
            var target = pendingWarp;
            pendingWarp = null;
            closeMessage();
            changeSceneWithTownFade(target);
            return;
        }

        closeMessage();
    }

    if (msgWin) {
        msgWin.addEventListener('pointerdown', handleMessageTap);
    }

    if (backdrop) {
        backdrop.addEventListener('pointerdown', handleMessageTap);
    }
}


function handleActionTrigger() {
    if (isEditMode) return;

    if (isMessageOpen) {
        if (pendingWarp) {
            var target = pendingWarp;
            pendingWarp = null;
            closeMessage();
            changeSceneWithTownFade(target);
            return;
        }
        closeMessage();
        return;
    }

    if (isTownScene(currentScene)) {
        handleAction();
    }
}


function toggleDebugMode() {
    if (!DEV_MODE_ENABLED) return;

    var panel = document.getElementById('editor-panel');
    var btn = document.getElementById('btn-debug-toggle');
    if (panel.style.display === 'none') {
        panel.style.display = 'flex'; btn.style.display = 'none';
        setEditorPanelCollapsed(false);
        debugMode = true; isEditMode = true;
        document.getElementById('debug-info').style.display = 'inline-block';
        ensurePartEditorFields();
        setPartEditorVisible(editTarget === 'props');
        updatePartEditorSelectionUi();
        updateEditorStatus("編集対象を選んでタップしてください");
        document.getElementById('interaction-hint').classList.remove('visible');
        document.getElementById('area-title').classList.remove('visible');
        clearDpadInput();
        updateControlVisibility();
    }
}


// ==========================================
// 5. エディタ機能
// ==========================================

function ensureEditorSafetyUI() {
    var panel = document.getElementById("editor-panel");
    if (!panel || panel.dataset.safetyUiReady === "true") return;

    panel.dataset.safetyUiReady = "true";

    var header = panel.querySelector(".editor-header");
    var content = panel.querySelector(".editor-content");
    var closeButton = document.getElementById("btn-close-editor");

    if (!header || !content) return;

    var title = header.querySelector("strong");
    var status = document.createElement("span");
    status.id = "editor-save-state";
    status.setAttribute("aria-live", "polite");
    status.style.display = "inline-flex";
    status.style.alignItems = "center";
    status.style.marginLeft = "8px";
    status.style.padding = "3px 8px";
    status.style.borderRadius = "999px";
    status.style.fontSize = "11px";
    status.style.fontWeight = "800";
    status.style.whiteSpace = "nowrap";

    var collapseButton = document.createElement("button");
    collapseButton.id = "btn-toggle-editor-collapse";
    collapseButton.type = "button";
    collapseButton.setAttribute("aria-expanded", "true");
    collapseButton.setAttribute("aria-label", "開発ウィンドウを折りたたむ");
    collapseButton.innerText = "−";
    collapseButton.style.marginLeft = "auto";
    collapseButton.style.minWidth = "34px";

    if (title && title.parentNode === header) {
        title.insertAdjacentElement("afterend", status);
    } else {
        header.insertBefore(status, header.firstChild);
    }

    if (closeButton && closeButton.parentNode === header) {
        header.insertBefore(collapseButton, closeButton);
    } else {
        header.appendChild(collapseButton);
    }

    collapseButton.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        setEditorPanelCollapsed(!editorPanelCollapsed);
    });

    header.addEventListener("dblclick", function(e) {
        if (e.target && e.target.closest && e.target.closest("button")) return;
        setEditorPanelCollapsed(!editorPanelCollapsed);
    });

    updateEditorSaveStateUI();
    setEditorPanelCollapsed(false);
}

function setEditorPanelCollapsed(collapsed) {
    var panel = document.getElementById("editor-panel");
    var content = panel ? panel.querySelector(".editor-content") : null;
    var button = document.getElementById("btn-toggle-editor-collapse");

    editorPanelCollapsed = !!collapsed;

    if (panel) {
        panel.classList.toggle("editor-collapsed", editorPanelCollapsed);
        panel.style.height = editorPanelCollapsed ? "auto" : "";
        panel.style.maxHeight = editorPanelCollapsed ? "none" : "";
    }

    if (content) {
        content.style.display = editorPanelCollapsed ? "none" : "";
    }

    if (button) {
        button.innerText = editorPanelCollapsed ? "＋" : "−";
        button.setAttribute("aria-expanded", editorPanelCollapsed ? "false" : "true");
        button.setAttribute(
            "aria-label",
            editorPanelCollapsed
                ? "開発ウィンドウを開く"
                : "開発ウィンドウを折りたたむ"
        );
    }
}

function updateEditorSaveStateUI() {
    var status = document.getElementById("editor-save-state");
    if (!status) return;

    if (editorHasUnsavedChanges) {
        status.innerText = "● 未保存";
        status.style.background = "rgba(165, 64, 48, .92)";
        status.style.color = "#fff7ed";
        status.title = "まだ完全版コードをコピーしていない変更があります";
    } else {
        status.innerText = "✓ コピー済み";
        status.style.background = "rgba(51, 111, 73, .92)";
        status.style.color = "#f3fff6";
        status.title = "現在の編集内容は完全版コードとしてコピー済みです";
    }
}

function markEditorDirty() {
    editorHasUnsavedChanges = true;
    updateEditorSaveStateUI();
}

function markEditorExportCopied() {
    editorHasUnsavedChanges = false;
    updateEditorSaveStateUI();
}

function setupEditorUnsavedGuard() {
    if (window.__yumaniwaEditorUnsavedGuardReady) return;
    window.__yumaniwaEditorUnsavedGuardReady = true;

    window.addEventListener("beforeunload", function(e) {
        if (!editorHasUnsavedChanges) return;

        e.preventDefault();
        e.returnValue = "";
        return "";
    });
}

function setupEditorEvents() {
    ensureEditorSafetyUI();
    setupEditorUnsavedGuard();
    ensureTriggerEditorExtraFields();
    ensurePartEditorFields();

    document.getElementById('btn-close-editor').addEventListener('click', function() {
        document.getElementById('editor-panel').style.display = 'none';
        document.getElementById('btn-debug-toggle').style.display = DEV_MODE_ENABLED ? 'block' : 'none';
        isEditMode = false; debugMode = false;
        document.getElementById('debug-info').style.display = 'none';
        editStep = 0; currentHoverTile = null;
        editingPartIndex = -1;
        partDragState = null;
        refreshTownPartDerivedData();
        updatePartEditorSelectionUi();
        updateInteractionHint();
        updateControlVisibility();
    });

    document.getElementById('edit-target').addEventListener('change', function(e) {
        editTarget = e.target.value;
        editStep = 0;
        currentHoverTile = null;
        editingTriggerIndex = -1;
        partDragState = null;

        document.getElementById('trigger-form').style.display = (editTarget === 'triggers') ? 'block' : 'none';
        setPartEditorVisible(editTarget === 'props');

        if (editTarget === 'triggers') ensureTriggerEditorExtraFields();

        if (editTarget === 'props') {
            updatePartEditorSelectionUi();
            updateEditorStatus("パーツをタップして選択、または「追加」に切り替えて配置します");
        } else {
            editingPartIndex = -1;
            updateEditorStatus(editTarget + " を編集します");
        }
    });

    document.getElementById('btn-editor-undo').addEventListener('click', function() {
        if (editHistory.length === 0) { updateEditorStatus("Undoする履歴がありません"); return; }
        var last = editHistory.pop();
        if (last.type === 'grid') {
            baseCollisionGrid = cloneCollisionGrid(last.prev || []);
            rebuildCollisionGridFromBase();
        }
        else if (last.type === 'triggers') {
            if (last.prev) restoreTriggers(last.prev);
            else triggers.pop();
            editingTriggerIndex = -1;
        }
        else if (last.type === 'props') {
            restoreTownParts(last.prev || []);
            editingPartIndex = -1;
            partDragState = null;
            updatePartEditorSelectionUi();
        }
        markEditorDirty();
        updateEditorStatus("直前の編集を取り消しました");
        editStep = 0; currentHoverTile = null;
    });

    document.getElementById('btn-editor-export').addEventListener('click', showExportModal);
    document.getElementById('btn-close-export').addEventListener('click', function() { document.getElementById('export-modal').style.display = 'none'; });
    var btnCopy = document.getElementById('btn-copy-export');
    btnCopy.addEventListener('click', function() {
        var textarea = document.getElementById('export-textarea');
        var code = textarea ? textarea.value : "";

        function copied() {
            markEditorExportCopied();
            btnCopy.innerText = "コピー完了!";
            setTimeout(function() {
                btnCopy.innerText = "完全版コードをコピー";
            }, 2000);
        }

        function failed() {
            btnCopy.innerText = "コピー失敗";
            setTimeout(function() {
                btnCopy.innerText = "完全版コードをコピー";
            }, 2000);
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code).then(copied).catch(function() {
                if (!textarea) {
                    failed();
                    return;
                }

                textarea.focus();
                textarea.select();

                try {
                    if (document.execCommand("copy")) copied();
                    else failed();
                } catch (err) {
                    failed();
                }
            });
            return;
        }

        if (!textarea) {
            failed();
            return;
        }

        textarea.focus();
        textarea.select();

        try {
            if (document.execCommand("copy")) copied();
            else failed();
        } catch (err) {
            failed();
        }
    });
}

function ensureTriggerEditorExtraFields() {
    var form = document.getElementById("trigger-form");
    if (!form || form.dataset.extraTriggerFieldsReady === "true") return;

    form.dataset.extraTriggerFieldsReady = "true";

    function makeLabel(text, input) {
        var label = document.createElement("label");
        label.appendChild(document.createTextNode(text + " "));
        label.appendChild(input);
        return label;
    }

    var labelInput = document.createElement("input");
    labelInput.id = "trigger-label";
    labelInput.type = "text";
    labelInput.value = "新規トリガー";

    var actionInput = document.createElement("input");
    actionInput.id = "trigger-action-label";
    actionInput.type = "text";
    actionInput.value = "調べる";

    var updateButton = document.createElement("button");
    updateButton.id = "btn-update-trigger";
    updateButton.type = "button";
    updateButton.innerText = "選択中トリガーを更新";

    updateButton.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        updateSelectedTriggerFromForm();
    });

    var deleteButton = document.createElement("button");
    deleteButton.id = "btn-delete-trigger";
    deleteButton.type = "button";
    deleteButton.innerText = "選択中トリガーを削除";
    deleteButton.style.background = "#7f2f2f";
    deleteButton.style.color = "#ffffff";
    deleteButton.style.borderColor = "#b85b5b";

    deleteButton.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        deleteSelectedTrigger();
    });

    form.insertBefore(makeLabel("表示名", labelInput), form.firstChild);
    form.insertBefore(makeLabel("動作名", actionInput), form.children[1] || null);
    form.appendChild(updateButton);
    form.appendChild(deleteButton);
}


// ==========================================
// 5-B. マップパーツ編集
// ==========================================
var TOWN_PART_CATALOG = [
    {
        key: 'noticeBoard',
        label: '横長掲示板',
        file: 'station-notice-board.png',
        w: 5.5,
        h: 3.6,
        collision: { enabled: true, x: 0.06, y: 0.76, w: 0.88, h: 0.22 }
    },
    {
        key: 'touristMap',
        label: '観光案内図',
        file: 'station-tourist-map.png',
        w: 3.4,
        h: 3.6,
        collision: { enabled: true, x: 0.22, y: 0.90, w: 0.56, h: 0.12 }
    },
    {
        key: 'bench',
        label: '木製ベンチ',
        file: 'station-bench.png',
        w: 3.0,
        h: 2.0,
        collision: { enabled: true, x: 0.14, y: 0.72, w: 0.72, h: 0.30 }
    },
    {
        key: 'streetLamp',
        label: 'レトロな街灯',
        file: 'station-street-lamp.png',
        w: 1.02,
        h: 3.4,
        collision: { enabled: true, x: 0.28, y: 0.92, w: 0.44, h: 0.22 }
    },
    {
        key: 'planter',
        label: '植木鉢',
        file: 'station-planter.png',
        w: 1.1,
        h: 1.8,
        collision: { enabled: true, x: 0.14, y: 0.58, w: 0.72, h: 0.42 }
    },
    {
        key: 'directionSign',
        label: '方向案内札',
        file: 'station-direction-sign.png',
        w: 1.4,
        h: 2.4,
        collision: { enabled: true, x: 0.34, y: 0.84, w: 0.32, h: 0.20 }
    },
    {
        key: 'stationBuilding',
        label: '湯間庭駅舎',
        file: 'station-building.png',
        w: 8.6,
        h: 8.5,
        collision: { enabled: true, x: 0.06, y: 0.78, w: 0.88, h: 0.22 }
    }
];

var TOWN_PART_ASSET_BASE = 'assets/maps/props/station-plaza/';

function getActiveTownParts() {
    if (!activeTownSceneDef) return [];

    if (!Array.isArray(activeTownSceneDef.props)) {
        activeTownSceneDef.props = [];
    }

    return activeTownSceneDef.props;
}

function cloneTownPart(part) {
    return JSON.parse(JSON.stringify(part || {}));
}

function cloneTownParts() {
    var parts = getActiveTownParts();
    var copied = [];

    for (var i = 0; i < parts.length; i++) {
        copied.push(cloneTownPart(parts[i]));
    }

    return copied;
}

function restoreTownParts(prev) {
    var parts = getActiveTownParts();
    parts.length = 0;

    for (var i = 0; i < prev.length; i++) {
        parts.push(cloneTownPart(prev[i]));
    }

    refreshTownPartDerivedData();
}

function syncTownPartPublicReference(parts) {
    if (
        currentScene === 'station_plaza' &&
        window.YUMANIWA_STATION_PLAZA_PROPS
    ) {
        window.YUMANIWA_STATION_PLAZA_PROPS.props = parts;
    }
}

function getPartCatalogEntry(key) {
    for (var i = 0; i < TOWN_PART_CATALOG.length; i++) {
        if (TOWN_PART_CATALOG[i].key === key) {
            return TOWN_PART_CATALOG[i];
        }
    }

    return TOWN_PART_CATALOG[0];
}

function inferTownPartCatalogKey(part) {
    var src = String((part && part.src) || '');
    var id = String((part && part.id) || '').toLowerCase();

    if (src.indexOf('station-notice-board') !== -1 || id.indexOf('notice') !== -1) return 'noticeBoard';
    if (src.indexOf('station-tourist-map') !== -1 || id.indexOf('tourist') !== -1) return 'touristMap';
    if (src.indexOf('station-bench') !== -1 || id.indexOf('bench') !== -1) return 'bench';
    if (src.indexOf('station-street-lamp') !== -1 || id.indexOf('lamp') !== -1) return 'streetLamp';
    if (src.indexOf('station-planter') !== -1 || id.indexOf('planter') !== -1) return 'planter';
    if (src.indexOf('station-direction-sign') !== -1 || id.indexOf('direction') !== -1) return 'directionSign';
    if (src.indexOf('station-building') !== -1 || id.indexOf('station_building') !== -1 || id.indexOf('stationbuilding') !== -1) return 'stationBuilding';

    return 'bench';
}

function cloneRelativePartRect(rect) {
    var source = rect || {};
    return {
        enabled: source.enabled !== false,
        x: Number(source.x) || 0,
        y: Number(source.y) || 0,
        w: Math.max(0.001, Number(source.w) || 0.001),
        h: Math.max(0.001, Number(source.h) || 0.001)
    };
}

function getDefaultTownPartInteraction(part, catalogKey) {
    var id = String((part && part.id) || '');

    if (id === 'station_notice_board') {
        return {
            enabled: true,
            triggerId: 'shinpo_board_trigger',
            x: 0.05,
            y: 0.45,
            w: 0.95,
            h: 0.55
        };
    }

    if (id === 'station_tourist_map') {
        return {
            enabled: true,
            triggerId: 'tourist_map',
            x: 0.22,
            y: 0.92,
            w: 0.56,
            h: 0.10
        };
    }

    return {
        enabled: false,
        triggerId: '',
        x: 0,
        y: 0.60,
        w: 1,
        h: 0.40
    };
}

function ensureTownPartMetadata(part) {
    if (!part) return part;

    var catalogKey = part.catalogKey || inferTownPartCatalogKey(part);
    var catalog = getPartCatalogEntry(catalogKey);
    part.catalogKey = catalogKey;

    if (!part.collision || typeof part.collision !== 'object') {
        part.collision = cloneRelativePartRect(catalog.collision);
    } else {
        part.collision = cloneRelativePartRect(part.collision);
    }

    if (!part.interaction || typeof part.interaction !== 'object') {
        part.interaction = getDefaultTownPartInteraction(part, catalogKey);
    } else {
        part.interaction = {
            enabled: part.interaction.enabled !== false,
            triggerId: String(part.interaction.triggerId || ''),
            x: Number(part.interaction.x) || 0,
            y: Number(part.interaction.y) || 0,
            w: Math.max(0.001, Number(part.interaction.w) || 0.001),
            h: Math.max(0.001, Number(part.interaction.h) || 0.001)
        };
    }

    updatePartFootY(part);
    return part;
}

function ensureAllTownPartMetadata() {
    var parts = getActiveTownParts();

    for (var i = 0; i < parts.length; i++) {
        ensureTownPartMetadata(parts[i]);
    }
}

function getPartRelativeRectPixels(part, spec) {
    var rect = getPartRectPixels(part);
    var relative = spec || {};

    return {
        x: rect.x + Number(relative.x || 0) * rect.w,
        y: rect.y + Number(relative.y || 0) * rect.h,
        w: Math.max(1, Number(relative.w || 0) * rect.w),
        h: Math.max(1, Number(relative.h || 0) * rect.h)
    };
}

function getTownPartCollisionRectPixels(part) {
    if (!part || !part.collision || part.collision.enabled === false) return null;
    return getPartRelativeRectPixels(part, part.collision);
}

function getTownPartInteractionRectPixels(part) {
    if (!part || !part.interaction || part.interaction.enabled === false) return null;
    if (!part.interaction.triggerId) return null;
    return getPartRelativeRectPixels(part, part.interaction);
}

function getTilesCoveredByPixelRect(rect) {
    if (!rect) return [];

    var tiles = [];
    var minX = Math.max(0, Math.floor(rect.x / TILE_SIZE));
    var maxX = Math.min(MAP_WIDTH - 1, Math.ceil((rect.x + rect.w) / TILE_SIZE) - 1);
    var minY = Math.max(0, Math.floor(rect.y / TILE_SIZE));
    var maxY = Math.min(MAP_HEIGHT - 1, Math.ceil((rect.y + rect.h) / TILE_SIZE) - 1);

    for (var y = minY; y <= maxY; y++) {
        for (var x = minX; x <= maxX; x++) {
            var centerX = x * TILE_SIZE + TILE_SIZE / 2;
            var centerY = y * TILE_SIZE + TILE_SIZE / 2;

            if (
                centerX >= rect.x &&
                centerX <= rect.x + rect.w &&
                centerY >= rect.y &&
                centerY <= rect.y + rect.h
            ) {
                tiles.push({ x: x, y: y });
            }
        }
    }

    // 細い街灯などで中心点が入らない場合も、中心の1タイルは必ず塞ぐ。
    if (!tiles.length) {
        var fallbackX = Math.floor((rect.x + rect.w / 2) / TILE_SIZE);
        var fallbackY = Math.floor((rect.y + rect.h / 2) / TILE_SIZE);

        if (fallbackX >= 0 && fallbackX < MAP_WIDTH && fallbackY >= 0 && fallbackY < MAP_HEIGHT) {
            tiles.push({ x: fallbackX, y: fallbackY });
        }
    }

    return tiles;
}

function applyTownPartCollisionToGrid(targetGrid) {
    if (!targetGrid || !targetGrid.length) return;

    var parts = getActiveTownParts();

    for (var i = 0; i < parts.length; i++) {
        var part = ensureTownPartMetadata(parts[i]);
        if (!part || part.enabled === false || !part.collision || part.collision.enabled === false) continue;

        var tiles = getTilesCoveredByPixelRect(getTownPartCollisionRectPixels(part));

        for (var t = 0; t < tiles.length; t++) {
            var tile = tiles[t];
            if (targetGrid[tile.y]) {
                targetGrid[tile.y][tile.x] = 2;
            }
        }
    }
}

function rectMatchesTownPartLegacy(rect, target) {
    return !!rect && rect.x === target.x && rect.y === target.y && rect.w === target.w && rect.h === target.h;
}

function pointMatchesTownPartLegacy(point, target) {
    return !!point && point.x === target.x && point.y === target.y;
}

function removeLegacyTownPartCollisionEntries() {
    if (currentScene !== 'station_plaza') return;

    var legacyRects = [
        { x: 7, y: 8, w: 2, h: 1 },
        { x: 15, y: 13, w: 2, h: 1 },
        { x: 11, y: 9, w: 2, h: 1 }
    ];
    var legacyPoints = [
        { x: 6, y: 10 },
        { x: 18, y: 10 }
    ];

    blockedRects = blockedRects.filter(function(rect) {
        for (var i = 0; i < legacyRects.length; i++) {
            if (rectMatchesTownPartLegacy(rect, legacyRects[i])) return false;
        }
        return true;
    });

    blockedPoints = blockedPoints.filter(function(point) {
        for (var i = 0; i < legacyPoints.length; i++) {
            if (pointMatchesTownPartLegacy(point, legacyPoints[i])) return false;
        }
        return true;
    });
}

function captureTownPartTriggerTemplates(def) {
    townPartTriggerTemplates = {};
    townPartManagedTriggerIds = {};

    var source = (def && def.triggers) || [];
    for (var i = 0; i < source.length; i++) {
        var trigger = source[i];
        if (trigger && trigger.id) {
            townPartTriggerTemplates[trigger.id] = cloneTrigger(trigger);
        }
    }
}

function makeUniqueTownPartTriggerId(base) {
    var stem = String(base || 'part_trigger').replace(/[^a-zA-Z0-9_-]/g, '_');
    var candidate = stem;
    var suffix = 2;

    function exists(id) {
        if (townPartTriggerTemplates[id]) return true;
        for (var i = 0; i < triggers.length; i++) {
            if (triggers[i] && triggers[i].id === id) return true;
        }
        return false;
    }

    while (exists(candidate)) {
        candidate = stem + '_' + suffix;
        suffix++;
    }

    return candidate;
}

function getTownPartTriggerArea(part) {
    var rect = getTownPartInteractionRectPixels(part);
    if (!rect) return null;

    var x = Math.max(0, Math.floor(rect.x / TILE_SIZE + 0.0001));
    var y = Math.max(0, Math.floor(rect.y / TILE_SIZE + 0.0001));
    var right = Math.min(MAP_WIDTH, Math.ceil((rect.x + rect.w) / TILE_SIZE - 0.0001));
    var bottom = Math.min(MAP_HEIGHT, Math.ceil((rect.y + rect.h) / TILE_SIZE - 0.0001));

    return {
        x: x,
        y: y,
        w: Math.max(1, right - x),
        h: Math.max(1, bottom - y)
    };
}

function syncTownPartTriggers() {
    var parts = getActiveTownParts();
    var desired = {};

    for (var i = 0; i < parts.length; i++) {
        var part = ensureTownPartMetadata(parts[i]);
        var interaction = part && part.interaction;
        if (!part || part.enabled === false || !interaction || interaction.enabled === false || !interaction.triggerId) continue;

        var triggerId = String(interaction.triggerId);
        var area = getTownPartTriggerArea(part);
        if (!area) continue;

        desired[triggerId] = {
            part: part,
            area: area
        };
        townPartManagedTriggerIds[triggerId] = true;
    }

    // 管理対象なのに対応パーツがなくなったトリガーは、透明な操作範囲を残さない。
    triggers = triggers.filter(function(trigger) {
        return !trigger || !townPartManagedTriggerIds[trigger.id] || !!desired[trigger.id];
    });

    for (var triggerId in desired) {
        if (!Object.prototype.hasOwnProperty.call(desired, triggerId)) continue;

        var index = -1;
        for (var t = 0; t < triggers.length; t++) {
            if (triggers[t] && triggers[t].id === triggerId) {
                index = t;
                break;
            }
        }

        var template = townPartTriggerTemplates[triggerId]
            ? cloneTrigger(townPartTriggerTemplates[triggerId])
            : {
                id: triggerId,
                label: desired[triggerId].part.id || 'パーツ',
                actionLabel: '調べる',
                type: 'inspect',
                text: '町に置かれたパーツです。',
                tapPadding: 1
            };

        template.area = desired[triggerId].area;

        if (index >= 0) {
            triggers[index] = template;
        } else {
            triggers.push(template);
        }
    }
}

function refreshTownPartDerivedData() {
    var parts = getActiveTownParts();
    ensureAllTownPartMetadata();
    syncTownPartPublicReference(parts);
    syncTownPartTriggers();
    rebuildCollisionGridFromBase();
}

function getPartEditorWorldPoint(e) {
    var point = getCanvasPointerPoint(e);
    if (!point) return null;

    var cam = getCamera();

    return {
        x: point.x / cam.zoom + cam.cameraX,
        y: point.y / cam.zoom + cam.cameraY
    };
}

function getPartRectPixels(part) {
    return {
        x: Number(part.x || 0) * TILE_SIZE,
        y: Number(part.y || 0) * TILE_SIZE,
        w: Math.max(1, Number(part.w || 1) * TILE_SIZE),
        h: Math.max(1, Number(part.h || 1) * TILE_SIZE)
    };
}

function getPartIndexAtWorldPoint(worldX, worldY) {
    var parts = getActiveTownParts();
    var candidates = [];

    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (!part || part.enabled === false) continue;

        var rect = getPartRectPixels(part);

        if (
            worldX >= rect.x &&
            worldX <= rect.x + rect.w &&
            worldY >= rect.y &&
            worldY <= rect.y + rect.h
        ) {
            candidates.push({
                index: i,
                footY: (typeof part.footY === 'number' ? part.footY : Number(part.y || 0) + Number(part.h || 0)) * TILE_SIZE
            });
        }
    }

    if (!candidates.length) return -1;

    candidates.sort(function(a, b) {
        if (a.footY !== b.footY) return a.footY - b.footY;
        return a.index - b.index;
    });

    return candidates[candidates.length - 1].index;
}

function clampPartToMap(part) {
    var maxX = Math.max(0, MAP_WIDTH - Number(part.w || 0));
    var maxY = Math.max(0, MAP_HEIGHT - Number(part.h || 0));

    part.x = Math.max(0, Math.min(maxX, Number(part.x || 0)));
    part.y = Math.max(0, Math.min(maxY, Number(part.y || 0)));
    updatePartFootY(part);
}

function updatePartFootY(part) {
    if (!part) return;
    part.footY = Number(part.y || 0) + Number(part.h || 0);
}

function makeUniquePartId(base) {
    var parts = getActiveTownParts();
    var stem = String(base || 'part').replace(/[^a-zA-Z0-9_-]/g, '_');
    var index = parts.length + 1;
    var id = stem + '_' + index;

    function exists(candidate) {
        for (var i = 0; i < parts.length; i++) {
            if (parts[i] && parts[i].id === candidate) return true;
        }
        return false;
    }

    while (exists(id)) {
        index++;
        id = stem + '_' + index;
    }

    return id;
}

function createTownPartFromCatalog(key, worldX, worldY) {
    var catalog = getPartCatalogEntry(key);
    var part = {
        id: makeUniquePartId('station_' + catalog.key),
        src: TOWN_PART_ASSET_BASE + catalog.file + '?rev=editor',
        x: (worldX / TILE_SIZE) - catalog.w / 2,
        y: (worldY / TILE_SIZE) - catalog.h,
        w: catalog.w,
        h: catalog.h,
        footY: 0,
        enabled: true,
        catalogKey: catalog.key,
        collision: cloneRelativePartRect(catalog.collision),
        interaction: getDefaultTownPartInteraction(null, catalog.key)
    };

    clampPartToMap(part);
    ensureTownPartMetadata(part);
    return part;
}

function setPartEditorMode(mode) {
    partEditorMode = mode === 'add' ? 'add' : 'select';

    var selectButton = document.getElementById('btn-part-mode-select');
    var addButton = document.getElementById('btn-part-mode-add');

    if (selectButton) {
        selectButton.classList.toggle('active', partEditorMode === 'select');
    }

    if (addButton) {
        addButton.classList.toggle('active', partEditorMode === 'add');
    }

    updateEditorStatus(
        partEditorMode === 'add'
            ? "追加するパーツを選び、マップ上の置きたい場所をタップしてください"
            : "パーツをタップして選択し、そのままドラッグできます"
    );
}

function setPartEditorVisible(visible) {
    var form = document.getElementById('part-form');
    if (form) form.style.display = visible ? 'block' : 'none';
}

function ensurePartEditorStyles() {
    if (document.getElementById('town-part-editor-style')) return;

    var style = document.createElement('style');
    style.id = 'town-part-editor-style';
    style.textContent =
        '#part-form{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.22);}' +
        '#part-form .part-editor-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0;}' +
        '#part-form button,#part-form select,#part-form input{font:inherit;}' +
        '#part-form button{min-height:32px;padding:5px 9px;border-radius:8px;}' +
        '#part-form button.active{background:#f4dec0;color:#2d2118;font-weight:800;}' +
        '#part-form .part-editor-number{width:66px;box-sizing:border-box;}' +
        '#part-form .part-editor-selected{font-weight:800;color:#fff0c8;word-break:break-all;}' +
        '#part-form .part-editor-danger{background:#6f2e2e;color:#fff;border-color:#b97070;}' +
        '#part-form .part-editor-grow{flex:1;min-width:120px;}' +
        '#part-form .part-editor-section{width:100%;margin-top:5px;padding-top:6px;border-top:1px dashed rgba(255,255,255,.18);font-weight:800;color:#f4dec0;}' +
        '#part-form .part-editor-note{font-size:11px;line-height:1.4;opacity:.75;}';

    document.head.appendChild(style);
}

function ensurePartEditorFields() {
    ensurePartEditorStyles();

    var targetSelect = document.getElementById('edit-target');
    if (targetSelect && !targetSelect.querySelector('option[value="props"]')) {
        var option = document.createElement('option');
        option.value = 'props';
        option.textContent = 'パーツ';
        targetSelect.appendChild(option);
    }

    if (document.getElementById('part-form')) return;

    var editorContent = document.querySelector('#editor-panel .editor-content');
    if (!editorContent) return;

    var form = document.createElement('div');
    form.id = 'part-form';
    form.style.display = 'none';

    var catalogOptions = '';
    for (var i = 0; i < TOWN_PART_CATALOG.length; i++) {
        catalogOptions +=
            '<option value="' + TOWN_PART_CATALOG[i].key + '">' +
            TOWN_PART_CATALOG[i].label +
            '</option>';
    }

    form.innerHTML =
        '<div class="part-editor-row">' +
        '<button id="btn-part-mode-select" type="button">選択・移動</button>' +
        '<button id="btn-part-mode-add" type="button">追加</button>' +
        '</div>' +
        '<div class="part-editor-row">' +
        '<label class="part-editor-grow">追加するパーツ ' +
        '<select id="part-asset-select">' + catalogOptions + '</select></label>' +
        '</div>' +
        '<div class="part-editor-row">選択中: <span id="part-selected-label" class="part-editor-selected">なし</span></div>' +
        '<div class="part-editor-row">' +
        '<label>X <input id="part-x-input" class="part-editor-number" type="number" step="1"></label>' +
        '<label>Y <input id="part-y-input" class="part-editor-number" type="number" step="1"></label>' +
        '</div>' +
        '<div class="part-editor-row">' +
        '<label>幅 <input id="part-w-input" class="part-editor-number" type="number" min="1" step="1"></label>' +
        '<label>高さ <input id="part-h-input" class="part-editor-number" type="number" min="1" step="1"></label>' +
        '</div>' +
        '<div class="part-editor-row">' +
        '<label><input id="part-ratio-lock" type="checkbox" checked> 縦横比固定</label>' +
        '</div>' +
        '<div class="part-editor-row">' +
        '<button type="button" data-part-nudge-x="-1">← 1px</button>' +
        '<button type="button" data-part-nudge-y="-1">↑ 1px</button>' +
        '<button type="button" data-part-nudge-y="1">↓ 1px</button>' +
        '<button type="button" data-part-nudge-x="1">→ 1px</button>' +
        '</div>' +
        '<div class="part-editor-section">当たり判定</div>' +
        '<div class="part-editor-row">' +
        '<label><input id="part-collision-enabled" type="checkbox"> パーツと一緒に移動</label>' +
        '</div>' +
        '<div class="part-editor-row">' +
        '<label>相対X <input id="part-collision-x" class="part-editor-number" type="number" step="1"></label>' +
        '<label>相対Y <input id="part-collision-y" class="part-editor-number" type="number" step="1"></label>' +
        '</div>' +
        '<div class="part-editor-row">' +
        '<label>幅 <input id="part-collision-w" class="part-editor-number" type="number" min="1" step="1"></label>' +
        '<label>高さ <input id="part-collision-h" class="part-editor-number" type="number" min="1" step="1"></label>' +
        '</div>' +
        '<div class="part-editor-section">調べる範囲</div>' +
        '<div class="part-editor-row">' +
        '<label><input id="part-trigger-enabled" type="checkbox"> パーツと一緒に移動</label>' +
        '</div>' +
        '<div class="part-editor-row">' +
        '<label class="part-editor-grow">トリガーID <input id="part-trigger-id" type="text" style="width:100%;box-sizing:border-box"></label>' +
        '</div>' +
        '<div class="part-editor-row">' +
        '<button id="btn-part-smaller" type="button">縮小</button>' +
        '<button id="btn-part-larger" type="button">拡大</button>' +
        '<button id="btn-part-duplicate" type="button">複製</button>' +
        '<button id="btn-part-delete" class="part-editor-danger" type="button">削除</button>' +
        '</div>' +
        '<div class="part-editor-note">ドラッグ・数値変更・拡大縮小に、当たり判定と調べる範囲が追従します。赤が当たり判定、黄が調べる範囲です。</div>';

    var status = document.getElementById('editor-status');
    editorContent.insertBefore(form, status || null);

    document.getElementById('btn-part-mode-select').addEventListener('click', function() {
        setPartEditorMode('select');
    });

    document.getElementById('btn-part-mode-add').addEventListener('click', function() {
        setPartEditorMode('add');
    });

    document.getElementById('part-ratio-lock').addEventListener('change', function(e) {
        partEditorRatioLock = !!e.target.checked;
    });

    var nudgeButtons = form.querySelectorAll('[data-part-nudge-x],[data-part-nudge-y]');
    for (var n = 0; n < nudgeButtons.length; n++) {
        nudgeButtons[n].addEventListener('click', function() {
            nudgeSelectedPart(
                Number(this.getAttribute('data-part-nudge-x') || 0),
                Number(this.getAttribute('data-part-nudge-y') || 0)
            );
        });
    }

    document.getElementById('btn-part-smaller').addEventListener('click', function() {
        resizeSelectedPart(-1);
    });

    document.getElementById('btn-part-larger').addEventListener('click', function() {
        resizeSelectedPart(1);
    });

    document.getElementById('btn-part-duplicate').addEventListener('click', duplicateSelectedPart);
    document.getElementById('btn-part-delete').addEventListener('click', deleteSelectedPart);

    document.getElementById('part-x-input').addEventListener('change', function() {
        applyPartNumberInputs('x');
    });

    document.getElementById('part-y-input').addEventListener('change', function() {
        applyPartNumberInputs('y');
    });

    document.getElementById('part-w-input').addEventListener('change', function() {
        applyPartNumberInputs('w');
    });

    document.getElementById('part-h-input').addEventListener('change', function() {
        applyPartNumberInputs('h');
    });

    var collisionInputIds = [
        'part-collision-enabled',
        'part-collision-x',
        'part-collision-y',
        'part-collision-w',
        'part-collision-h'
    ];
    for (var c = 0; c < collisionInputIds.length; c++) {
        document.getElementById(collisionInputIds[c]).addEventListener('change', applyPartCollisionInputs);
    }

    document.getElementById('part-trigger-enabled').addEventListener('change', applyPartInteractionInputs);
    document.getElementById('part-trigger-id').addEventListener('change', applyPartInteractionInputs);

    setPartEditorMode('select');
    updatePartEditorSelectionUi();
}

function getSelectedTownPart() {
    var parts = getActiveTownParts();

    if (editingPartIndex < 0 || editingPartIndex >= parts.length) {
        return null;
    }

    return parts[editingPartIndex];
}

function selectTownPart(index) {
    var parts = getActiveTownParts();

    if (index < 0 || index >= parts.length) {
        editingPartIndex = -1;
    } else {
        editingPartIndex = index;
    }

    updatePartEditorSelectionUi();
}

function updatePartEditorSelectionUi() {
    var part = getSelectedTownPart();
    var label = document.getElementById('part-selected-label');
    var xInput = document.getElementById('part-x-input');
    var yInput = document.getElementById('part-y-input');
    var wInput = document.getElementById('part-w-input');
    var hInput = document.getElementById('part-h-input');
    var collisionEnabled = document.getElementById('part-collision-enabled');
    var collisionX = document.getElementById('part-collision-x');
    var collisionY = document.getElementById('part-collision-y');
    var collisionW = document.getElementById('part-collision-w');
    var collisionH = document.getElementById('part-collision-h');
    var triggerEnabled = document.getElementById('part-trigger-enabled');
    var triggerId = document.getElementById('part-trigger-id');

    if (part) ensureTownPartMetadata(part);

    if (label) {
        label.textContent = part ? (part.id || '名称なし') : 'なし';
    }

    var disabled = !part;
    var inputs = [
        xInput, yInput, wInput, hInput,
        collisionEnabled, collisionX, collisionY, collisionW, collisionH,
        triggerEnabled, triggerId
    ];

    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i]) inputs[i].disabled = disabled;
    }

    var actionIds = [
        'btn-part-smaller',
        'btn-part-larger',
        'btn-part-duplicate',
        'btn-part-delete'
    ];

    for (var a = 0; a < actionIds.length; a++) {
        var action = document.getElementById(actionIds[a]);
        if (action) action.disabled = disabled;
    }

    if (!part) {
        if (xInput) xInput.value = '';
        if (yInput) yInput.value = '';
        if (wInput) wInput.value = '';
        if (hInput) hInput.value = '';
        if (collisionEnabled) collisionEnabled.checked = false;
        if (collisionX) collisionX.value = '';
        if (collisionY) collisionY.value = '';
        if (collisionW) collisionW.value = '';
        if (collisionH) collisionH.value = '';
        if (triggerEnabled) triggerEnabled.checked = false;
        if (triggerId) triggerId.value = '';
        return;
    }

    var rect = getPartRectPixels(part);
    var collision = part.collision || {};

    if (xInput) xInput.value = Math.round(rect.x);
    if (yInput) yInput.value = Math.round(rect.y);
    if (wInput) wInput.value = Math.round(rect.w);
    if (hInput) hInput.value = Math.round(rect.h);

    if (collisionEnabled) collisionEnabled.checked = collision.enabled !== false;
    if (collisionX) collisionX.value = Math.round(Number(collision.x || 0) * rect.w);
    if (collisionY) collisionY.value = Math.round(Number(collision.y || 0) * rect.h);
    if (collisionW) collisionW.value = Math.max(1, Math.round(Number(collision.w || 0) * rect.w));
    if (collisionH) collisionH.value = Math.max(1, Math.round(Number(collision.h || 0) * rect.h));

    if (triggerEnabled) triggerEnabled.checked = !!(part.interaction && part.interaction.enabled !== false && part.interaction.triggerId);
    if (triggerId) triggerId.value = part.interaction ? String(part.interaction.triggerId || '') : '';
}

function applyPartCollisionInputs() {
    var part = getSelectedTownPart();
    if (!part) return;

    ensureTownPartMetadata(part);

    var rect = getPartRectPixels(part);
    var enabled = document.getElementById('part-collision-enabled');
    var xInput = document.getElementById('part-collision-x');
    var yInput = document.getElementById('part-collision-y');
    var wInput = document.getElementById('part-collision-w');
    var hInput = document.getElementById('part-collision-h');

    var xPx = Number(xInput && xInput.value);
    var yPx = Number(yInput && yInput.value);
    var wPx = Number(wInput && wInput.value);
    var hPx = Number(hInput && hInput.value);

    if (![xPx, yPx, wPx, hPx].every(isFinite)) {
        updatePartEditorSelectionUi();
        return;
    }

    pushTownPartHistory();

    part.collision = {
        enabled: !!(enabled && enabled.checked),
        x: xPx / rect.w,
        y: yPx / rect.h,
        w: Math.max(1, wPx) / rect.w,
        h: Math.max(1, hPx) / rect.h
    };

    refreshTownPartDerivedData();
    updatePartEditorSelectionUi();
    updateEditorStatus('当たり判定を更新しました');
}

function applyPartInteractionInputs() {
    var part = getSelectedTownPart();
    if (!part) return;

    ensureTownPartMetadata(part);

    var enabled = document.getElementById('part-trigger-enabled');
    var idInput = document.getElementById('part-trigger-id');
    var nextId = String((idInput && idInput.value) || '').trim();

    pushTownPartHistory();

    part.interaction.enabled = !!(enabled && enabled.checked && nextId);
    part.interaction.triggerId = nextId;

    refreshTownPartDerivedData();
    updatePartEditorSelectionUi();
    updateEditorStatus('調べる範囲の連動を更新しました');
}

function pushTownPartHistory() {
    markEditorDirty();
    editHistory.push({
        type: 'props',
        prev: cloneTownParts()
    });
}

function applyPartNumberInputs(changedKey) {
    var part = getSelectedTownPart();
    if (!part) return;

    var xInput = document.getElementById('part-x-input');
    var yInput = document.getElementById('part-y-input');
    var wInput = document.getElementById('part-w-input');
    var hInput = document.getElementById('part-h-input');

    var xPx = Number(xInput && xInput.value);
    var yPx = Number(yInput && yInput.value);
    var wPx = Number(wInput && wInput.value);
    var hPx = Number(hInput && hInput.value);

    if (![xPx, yPx, wPx, hPx].every(isFinite)) {
        updatePartEditorSelectionUi();
        return;
    }

    pushTownPartHistory();

    var oldWPx = Math.max(1, part.w * TILE_SIZE);
    var oldHPx = Math.max(1, part.h * TILE_SIZE);
    var ratio = oldWPx / oldHPx;

    part.x = xPx / TILE_SIZE;
    part.y = yPx / TILE_SIZE;

    if (changedKey === 'w' && partEditorRatioLock) {
        part.w = Math.max(1, wPx) / TILE_SIZE;
        part.h = Math.max(1, Math.round(wPx / ratio)) / TILE_SIZE;
    } else if (changedKey === 'h' && partEditorRatioLock) {
        part.h = Math.max(1, hPx) / TILE_SIZE;
        part.w = Math.max(1, Math.round(hPx * ratio)) / TILE_SIZE;
    } else {
        part.w = Math.max(1, wPx) / TILE_SIZE;
        part.h = Math.max(1, hPx) / TILE_SIZE;
    }

    clampPartToMap(part);
    refreshTownPartDerivedData();
    updatePartEditorSelectionUi();
    updateEditorStatus("パーツの数値を更新しました");
}

function nudgeSelectedPart(dxPx, dyPx) {
    var part = getSelectedTownPart();
    if (!part) {
        updateEditorStatus("先にパーツを選択してください");
        return;
    }

    pushTownPartHistory();
    part.x += dxPx / TILE_SIZE;
    part.y += dyPx / TILE_SIZE;
    clampPartToMap(part);
    refreshTownPartDerivedData();
    updatePartEditorSelectionUi();
    updateEditorStatus("1px移動しました");
}

function resizeSelectedPart(deltaPx) {
    var part = getSelectedTownPart();
    if (!part) {
        updateEditorStatus("先にパーツを選択してください");
        return;
    }

    var oldWPx = Math.max(1, part.w * TILE_SIZE);
    var oldHPx = Math.max(1, part.h * TILE_SIZE);
    var newWPx = Math.max(1, oldWPx + deltaPx);
    var newHPx = partEditorRatioLock
        ? Math.max(1, Math.round(oldHPx * (newWPx / oldWPx)))
        : Math.max(1, oldHPx + deltaPx);

    pushTownPartHistory();

    // 足元中央をなるべく維持して拡大縮小する。
    var centerXPx = (part.x + part.w / 2) * TILE_SIZE;
    var footYPx = (part.y + part.h) * TILE_SIZE;

    part.w = newWPx / TILE_SIZE;
    part.h = newHPx / TILE_SIZE;
    part.x = centerXPx / TILE_SIZE - part.w / 2;
    part.y = footYPx / TILE_SIZE - part.h;

    clampPartToMap(part);
    refreshTownPartDerivedData();
    updatePartEditorSelectionUi();
    updateEditorStatus(deltaPx > 0 ? "パーツを拡大しました" : "パーツを縮小しました");
}

function duplicateSelectedPart() {
    var part = getSelectedTownPart();
    if (!part) {
        updateEditorStatus("複製するパーツを選択してください");
        return;
    }

    pushTownPartHistory();

    var copy = cloneTownPart(part);
    copy.id = makeUniquePartId((part.id || 'part') + '_copy');
    copy.x += 8 / TILE_SIZE;
    copy.y += 8 / TILE_SIZE;

    if (copy.interaction && copy.interaction.enabled && copy.interaction.triggerId) {
        copy.interaction.triggerId = makeUniqueTownPartTriggerId(copy.id + '_trigger');
    }

    clampPartToMap(copy);

    var parts = getActiveTownParts();
    parts.push(copy);
    editingPartIndex = parts.length - 1;
    refreshTownPartDerivedData();
    updatePartEditorSelectionUi();
    updateEditorStatus("パーツを複製しました");
}

function deleteSelectedPart() {
    var part = getSelectedTownPart();
    if (!part) {
        updateEditorStatus("削除するパーツを選択してください");
        return;
    }

    var confirmed = window.confirm("「" + (part.id || "選択中のパーツ") + "」を削除しますか？");
    if (!confirmed) return;

    pushTownPartHistory();

    var parts = getActiveTownParts();
    parts.splice(editingPartIndex, 1);
    editingPartIndex = -1;
    refreshTownPartDerivedData();
    updatePartEditorSelectionUi();
    updateEditorStatus("パーツを削除しました");
}

function handlePartEditorPointerDown(e) {
    var world = getPartEditorWorldPoint(e);
    if (!world) return;

    if (partEditorMode === 'add') {
        var select = document.getElementById('part-asset-select');
        var key = select ? select.value : TOWN_PART_CATALOG[0].key;

        pushTownPartHistory();

        var parts = getActiveTownParts();
        var added = createTownPartFromCatalog(key, world.x, world.y);
        parts.push(added);
        editingPartIndex = parts.length - 1;
        refreshTownPartDerivedData();
        setPartEditorMode('select');
        updatePartEditorSelectionUi();
        updateEditorStatus("パーツを追加しました。ドラッグで調整できます");
        return;
    }

    var hitIndex = getPartIndexAtWorldPoint(world.x, world.y);

    if (hitIndex < 0) {
        selectTownPart(-1);
        updateEditorStatus("パーツがない場所です");
        return;
    }

    selectTownPart(hitIndex);

    var part = getSelectedTownPart();
    var rect = getPartRectPixels(part);

    partDragState = {
        pointerId: e.pointerId,
        offsetX: world.x - rect.x,
        offsetY: world.y - rect.y,
        prev: cloneTownParts(),
        moved: false
    };

    if (canvas.setPointerCapture && e.pointerId !== undefined) {
        try {
            canvas.setPointerCapture(e.pointerId);
        } catch (err) {}
    }

    updateEditorStatus("選択中: " + (part.id || "part") + " / ドラッグで移動");
}

function handlePartEditorPointerMove(e) {
    if (!partDragState) return;
    if (
        partDragState.pointerId !== undefined &&
        e.pointerId !== undefined &&
        partDragState.pointerId !== e.pointerId
    ) {
        return;
    }

    var part = getSelectedTownPart();
    var world = getPartEditorWorldPoint(e);
    if (!part || !world) return;

    var nextX = (world.x - partDragState.offsetX) / TILE_SIZE;
    var nextY = (world.y - partDragState.offsetY) / TILE_SIZE;

    if (
        Math.abs(nextX - part.x) > 0.0001 ||
        Math.abs(nextY - part.y) > 0.0001
    ) {
        partDragState.moved = true;
    }

    part.x = nextX;
    part.y = nextY;
    clampPartToMap(part);
    refreshTownPartDerivedData();
    updatePartEditorSelectionUi();
}

function finishPartEditorDrag(e) {
    if (!partDragState) return;

    if (
        e &&
        partDragState.pointerId !== undefined &&
        e.pointerId !== undefined &&
        partDragState.pointerId !== e.pointerId
    ) {
        return;
    }

    var moved = partDragState.moved;
    var prev = partDragState.prev;
    var pointerId = partDragState.pointerId;
    partDragState = null;

    if (moved) {
        markEditorDirty();
    editHistory.push({
            type: 'props',
            prev: prev
        });
        updateEditorStatus("パーツを移動しました");
    }

    if (canvas.releasePointerCapture && pointerId !== undefined) {
        try {
            canvas.releasePointerCapture(pointerId);
        } catch (err) {}
    }
}

function handlePartEditorKeyboard(e) {
    var target = e.target;

    if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
    ) {
        return false;
    }

    var step = e.shiftKey ? 4 : 1;

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudgeSelectedPart(-step, 0);
        return true;
    }

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudgeSelectedPart(step, 0);
        return true;
    }

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        nudgeSelectedPart(0, -step);
        return true;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        nudgeSelectedPart(0, step);
        return true;
    }

    if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        resizeSelectedPart(step);
        return true;
    }

    if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        resizeSelectedPart(-step);
        return true;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedPart();
        return true;
    }

    return false;
}

function drawTownPartEditorOverlay() {
    if (!isEditMode || editTarget !== 'props') return;

    var parts = getActiveTownParts();

    ctx.save();
    ctx.lineWidth = 1;

    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (!part || part.enabled === false) continue;

        var rect = getPartRectPixels(part);
        var selected = i === editingPartIndex;

        ctx.fillStyle = selected
            ? 'rgba(0,255,255,0.13)'
            : 'rgba(255,255,255,0.035)';

        ctx.strokeStyle = selected
            ? 'rgba(0,255,255,0.98)'
            : 'rgba(255,255,255,0.38)';

        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeRect(
            Math.round(rect.x) + 0.5,
            Math.round(rect.y) + 0.5,
            Math.max(1, Math.round(rect.w) - 1),
            Math.max(1, Math.round(rect.h) - 1)
        );

        if (selected) {
            var footY = (typeof part.footY === 'number' ? part.footY : part.y + part.h) * TILE_SIZE;
            var footX = (part.x + part.w / 2) * TILE_SIZE;

            ctx.fillStyle = '#00ffff';
            ctx.fillRect(Math.round(footX) - 2, Math.round(footY) - 2, 5, 5);

            var collisionRect = getTownPartCollisionRectPixels(part);
            if (collisionRect) {
                ctx.fillStyle = 'rgba(255,45,45,0.28)';
                ctx.strokeStyle = 'rgba(255,90,90,0.98)';
                ctx.fillRect(collisionRect.x, collisionRect.y, collisionRect.w, collisionRect.h);
                ctx.strokeRect(collisionRect.x + 0.5, collisionRect.y + 0.5, collisionRect.w, collisionRect.h);

                var collisionTiles = getTilesCoveredByPixelRect(collisionRect);
                for (var ct = 0; ct < collisionTiles.length; ct++) {
                    ctx.fillStyle = 'rgba(255,0,0,0.16)';
                    ctx.fillRect(
                        collisionTiles[ct].x * TILE_SIZE,
                        collisionTiles[ct].y * TILE_SIZE,
                        TILE_SIZE,
                        TILE_SIZE
                    );
                }
            }

            var interactionRect = getTownPartInteractionRectPixels(part);
            if (interactionRect) {
                ctx.fillStyle = 'rgba(255,220,0,0.16)';
                ctx.strokeStyle = 'rgba(255,230,70,0.98)';
                ctx.fillRect(interactionRect.x, interactionRect.y, interactionRect.w, interactionRect.h);
                ctx.strokeRect(interactionRect.x + 0.5, interactionRect.y + 0.5, interactionRect.w, interactionRect.h);
            }

            var label = String(part.id || 'part');
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';

            var labelWidth = Math.max(42, Math.min(150, ctx.measureText(label).width + 8));
            var labelY = Math.max(11, rect.y - 2);

            ctx.fillStyle = 'rgba(0,0,0,0.78)';
            ctx.fillRect(rect.x, labelY - 11, labelWidth, 11);

            ctx.fillStyle = '#dfffff';
            ctx.fillText(label, rect.x + 4, labelY - 1);
        }
    }

    ctx.restore();
}

function cloneTrigger(trigger) {
    var copied = {};
    for (var key in trigger) {
        if (!Object.prototype.hasOwnProperty.call(trigger, key)) continue;

        if (key === "area" && trigger.area) {
            copied.area = {
                x: trigger.area.x,
                y: trigger.area.y,
                w: trigger.area.w,
                h: trigger.area.h
            };
        } else {
            copied[key] = trigger[key];
        }
    }
    return copied;
}

function cloneTriggers() {
    var copied = [];
    for (var i = 0; i < triggers.length; i++) {
        copied.push(cloneTrigger(triggers[i]));
    }
    return copied;
}

function restoreTriggers(prev) {
    triggers = [];
    for (var i = 0; i < prev.length; i++) {
        triggers.push(cloneTrigger(prev[i]));
    }
}

function getTriggerIndexAtTile(tx, ty) {
    for (var i = triggers.length - 1; i >= 0; i--) {
        var t = triggers[i];
        if (!t || !t.area) continue;

        if (
            tx >= t.area.x &&
            tx < t.area.x + t.area.w &&
            ty >= t.area.y &&
            ty < t.area.y + t.area.h
        ) {
            return i;
        }
    }

    return -1;
}

function getTriggerFormValues(area) {
    var idInput = document.getElementById("trigger-id");
    var labelInput = document.getElementById("trigger-label");
    var actionInput = document.getElementById("trigger-action-label");
    var typeInput = document.getElementById("trigger-type");
    var targetInput = document.getElementById("trigger-target");
    var textInput = document.getElementById("trigger-text");

    return {
        id: idInput ? idInput.value : "new_trigger",
        label: labelInput ? labelInput.value : "新規トリガー",
        actionLabel: actionInput ? actionInput.value : "調べる",
        area: area,
        type: typeInput ? typeInput.value : "inspect",
        target: targetInput ? targetInput.value : "",
        text: textInput ? textInput.value : ""
    };
}

function setTriggerFormValues(trigger) {
    if (!trigger) return;

    ensureTriggerEditorExtraFields();

    var idInput = document.getElementById("trigger-id");
    var labelInput = document.getElementById("trigger-label");
    var actionInput = document.getElementById("trigger-action-label");
    var typeInput = document.getElementById("trigger-type");
    var targetInput = document.getElementById("trigger-target");
    var textInput = document.getElementById("trigger-text");

    if (idInput) idInput.value = trigger.id || "";
    if (labelInput) labelInput.value = trigger.label || "";
    if (actionInput) actionInput.value = trigger.actionLabel || "";
    if (typeInput) typeInput.value = trigger.type || "inspect";
    if (targetInput) targetInput.value = trigger.target || "";
    if (textInput) textInput.value = trigger.text || "";
}

function applyTriggerValues(index, values) {
    if (index < 0 || index >= triggers.length || !values) return false;

    triggers[index] = {
        id: values.id || "trigger",
        label: values.label || "トリガー",
        actionLabel: values.actionLabel || "調べる",
        area: values.area || triggers[index].area,
        type: values.type || "inspect",
        target: values.target || "",
        text: values.text || ""
    };

    return true;
}

function selectExistingTriggerForEdit(index) {
    if (index < 0 || index >= triggers.length) return false;

    var trigger = triggers[index];
    if (!trigger || !trigger.area) return false;

    editingTriggerIndex = index;
    editStep = 1;
    editStartX = trigger.area.x;
    editStartY = trigger.area.y;
    currentHoverTile = {
        x: trigger.area.x + trigger.area.w - 1,
        y: trigger.area.y + trigger.area.h - 1
    };

    setTriggerFormValues(trigger);

    updateEditorStatus(
        "既存トリガーを選択中: " +
        (trigger.label || trigger.id || "trigger") +
        " / 内容変更後に「選択中トリガーを更新」、または終点タップで範囲変更"
    );

    return true;
}

function updateSelectedTriggerFromForm() {
    if (editingTriggerIndex < 0 || editingTriggerIndex >= triggers.length) {
        updateEditorStatus("更新する既存トリガーが選択されていません");
        return;
    }

    var current = triggers[editingTriggerIndex];
    if (!current || !current.area) {
        updateEditorStatus("選択中トリガーが見つかりません");
        editingTriggerIndex = -1;
        return;
    }

    markEditorDirty();
    editHistory.push({ type: "triggers", prev: cloneTriggers() });

    applyTriggerValues(editingTriggerIndex, getTriggerFormValues({
        x: current.area.x,
        y: current.area.y,
        w: current.area.w,
        h: current.area.h
    }));

    editStep = 0;
    currentHoverTile = null;
    editingTriggerIndex = -1;

    updateEditorStatus("既存トリガーの内容を更新しました");
}


function deleteSelectedTrigger() {
    if (editingTriggerIndex < 0 || editingTriggerIndex >= triggers.length) {
        updateEditorStatus("削除する既存トリガーが選択されていません");
        return;
    }

    var current = triggers[editingTriggerIndex];
    var triggerName = current
        ? (current.label || current.id || "トリガー")
        : "トリガー";

    if (!window.confirm("「" + triggerName + "」を削除しますか？")) {
        updateEditorStatus("トリガーの削除を取り消しました");
        return;
    }

    markEditorDirty();
    editHistory.push({ type: "triggers", prev: cloneTriggers() });
    triggers.splice(editingTriggerIndex, 1);

    editStep = 0;
    currentHoverTile = null;
    editingTriggerIndex = -1;

    updateEditorStatus("トリガーを削除しました。Undoで元に戻せます");
}



function updateEditorStatus(msg) { document.getElementById('editor-status').innerText = msg; }
function copyGrid() { return cloneCollisionGrid(baseCollisionGrid.length ? baseCollisionGrid : collisionGrid); }

function handleEditorTap(tx, ty) {
    if (editTarget === 'props') {
        return;
    }

    if (editTarget === 'blockedPoints') {
        markEditorDirty();
    editHistory.push({ type: 'grid', prev: copyGrid() });
        if (baseCollisionGrid[ty]) baseCollisionGrid[ty][tx] = 2;
        rebuildCollisionGridFromBase();
        updateEditorStatus("Point追加: (" + tx + ", " + ty + ")");
        return;
    }

    if (editStep === 0) {
        if (editTarget === 'triggers') {
            ensureTriggerEditorExtraFields();

            var hitIndex = getTriggerIndexAtTile(tx, ty);
            if (hitIndex >= 0) {
                selectExistingTriggerForEdit(hitIndex);
                return;
            }

            editingTriggerIndex = -1;
        }

        editStartX = tx;
        editStartY = ty;
        editStep = 1;
        currentHoverTile = { x: tx, y: ty };

        if (editTarget === 'triggers') {
            updateEditorStatus("新規トリガー範囲の終点をタップしてください");
        } else {
            updateEditorStatus("終点をタップしてください");
        }

        return;
    }

    if (editStep === 1) {
        var minX = Math.min(editStartX, tx);
        var minY = Math.min(editStartY, ty);
        var w = Math.max(editStartX, tx) - minX + 1;
        var h = Math.max(editStartY, ty) - minY + 1;
        var newRect = { x: minX, y: minY, w: w, h: h };

        if (editTarget === 'passableRects' || editTarget === 'blockedRects') {
            markEditorDirty();
    editHistory.push({ type: 'grid', prev: copyGrid() });
            var val = (editTarget === 'passableRects') ? 1 : 2;

            for (var cy = minY; cy < minY + h; cy++) {
                for (var cx = minX; cx < minX + w; cx++) {
                    if (cx >= 0 && cx < MAP_WIDTH && cy >= 0 && cy < MAP_HEIGHT) {
                        if (baseCollisionGrid[cy]) baseCollisionGrid[cy][cx] = val;
                    }
                }
            }

            rebuildCollisionGridFromBase();
            editStep = 0;
            currentHoverTile = null;
            updateEditorStatus("追加完了。次の始点をタップ");
            return;
        }

        if (editTarget === 'triggers') {
            ensureTriggerEditorExtraFields();
            markEditorDirty();
    editHistory.push({ type: 'triggers', prev: cloneTriggers() });

            if (editingTriggerIndex >= 0 && editingTriggerIndex < triggers.length) {
                applyTriggerValues(editingTriggerIndex, getTriggerFormValues(newRect));
                updateEditorStatus("既存トリガーの範囲と内容を更新しました");
            } else {
                var values = getTriggerFormValues(newRect);
                triggers.push({
                    id: values.id || "new_trigger",
                    label: values.label || "新規トリガー",
                    actionLabel: values.actionLabel || "調べる",
                    area: values.area,
                    type: values.type || "inspect",
                    target: values.target || "",
                    text: values.text || ""
                });
                updateEditorStatus("新規トリガーを追加しました");
            }

            editStep = 0;
            currentHoverTile = null;
            editingTriggerIndex = -1;
            return;
        }

        editStep = 0;
        currentHoverTile = null;
        updateEditorStatus("追加完了。次の始点をタップ");
    }
}


function gridToRects(targetValue, sourceGrid) {
    var grid = sourceGrid || collisionGrid;
    var rects = []; var visited = [];
    for (var y = 0; y < MAP_HEIGHT; y++) { var row = []; for (var x = 0; x < MAP_WIDTH; x++) row.push(false); visited.push(row); }
    for (var y = 0; y < MAP_HEIGHT; y++) {
        for (var x = 0; x < MAP_WIDTH; x++) {
            if (grid[y][x] === targetValue && !visited[y][x]) {
                var w = 0; while (x + w < MAP_WIDTH && grid[y][x + w] === targetValue && !visited[y][x + w]) w++;
                var h = 1; var canExpand = true;
                while (y + h < MAP_HEIGHT && canExpand) {
                    for (var i = 0; i < w; i++) if (grid[y + h][x + i] !== targetValue || visited[y + h][x + i]) { canExpand = false; break; }
                    if (canExpand) h++;
                }
                for (var dy = 0; dy < h; dy++) for (var dx = 0; dx < w; dx++) visited[y + dy][x + dx] = true;
                rects.push({ x: x, y: y, w: w, h: h });
            }
        }
    }
    return rects;
}

function getTownSceneExportInfo(sceneId) {
    var table = {
        station_plaza: {
            title: "駅前広場",
            fileName: "data/station-plaza.js",
            mode: "station-data"
        },

        tomogushi_alley_map: {
            title: "灯串横丁",
            fileName: "data/town-maps.js",
            mode: "scene-definition"
        },

        leisure_center_map: {
            title: "湯窓レジャーセンター",
            fileName: "data/town-maps.js",
            mode: "scene-definition"
        },

        yumado_street_map: {
            title: "湯窓通り",
            fileName: "data/town-maps.js",
            mode: "scene-definition"
        },

        onsen_slope_map: {
            title: "温泉坂",
            fileName: "data/town-maps.js",
            mode: "scene-definition"
        }
    };

    return table[sceneId] || {
        title: (
            activeTownSceneDef &&
            activeTownSceneDef.title
        ) || sceneId || "町マップ",

        fileName: "data/town-maps.js",
        mode: "scene-definition"
    };
}


function buildExportCollisionData() {
    // 固定地形だけを書き出す。
    // パーツ由来の判定は prop.collision に保持する。
    var exportGrid = baseCollisionGrid.length
        ? baseCollisionGrid
        : collisionGrid;

    var passable = gridToRects(1, exportGrid);
    var blockedAll = gridToRects(2, exportGrid);

    var blockedRectsResult = [];
    var blockedPointsResult = [];

    for (var i = 0; i < blockedAll.length; i++) {
        var rect = blockedAll[i];

        if (rect.w === 1 && rect.h === 1) {
            blockedPointsResult.push({
                x: rect.x,
                y: rect.y
            });
        } else {
            blockedRectsResult.push(rect);
        }
    }

    return {
        passableRects: passable,
        blockedRects: blockedRectsResult,
        blockedPoints: blockedPointsResult
    };
}


function buildStationPlazaExportCode(info, collisionData, exportedParts) {
    var lines = [
        "// ==========================================",
        "// 湯間庭町 / " + info.title + " 編集データ",
        "// 開発モードの「書き出す」で生成した完全版です。",
        "// この内容で " + info.fileName + " を丸ごと置き換えてください。",
        "// ==========================================",
        "",

        "var BG_IMAGE_PATH = " + JSON.stringify(
            (
                activeTownSceneDef &&
                activeTownSceneDef.backgroundImagePath
            ) ||
            "assets/maps/grounds/station-plaza-ground.png"
        ) + ";",

        "var TILE_SIZE = " +
            JSON.stringify(Number(TILE_SIZE) || 16) +
            ";",

        "var MAP_WIDTH = " +
            JSON.stringify(Number(MAP_WIDTH) || 24) +
            ";",

        "var MAP_HEIGHT = " +
            JSON.stringify(Number(MAP_HEIGHT) || 24) +
            ";",

        "var PLAYER_START = " + JSON.stringify({
            x: Math.round(
                (player && player.x ? player.x : 0) /
                (Number(TILE_SIZE) || 16)
            ),

            y: Math.round(
                (player && player.y ? player.y : 0) /
                (Number(TILE_SIZE) || 16)
            )
        }, null, 4) + ";",

        "",

        "var passableRects = " +
            JSON.stringify(
                collisionData.passableRects,
                null,
                4
            ) +
            ";",

        "",

        "var blockedRects = " +
            JSON.stringify(
                collisionData.blockedRects,
                null,
                4
            ) +
            ";",

        "",

        "var blockedPoints = " +
            JSON.stringify(
                collisionData.blockedPoints,
                null,
                4
            ) +
            ";",

        "",

        "var triggers = " +
            JSON.stringify(triggers, null, 4) +
            ";",

        "",

        "var areaZones = " +
            JSON.stringify(areaZones, null, 4) +
            ";",

        "",

        "// マップパーツ。collision と interaction は画像内の相対比率（0〜1）です。",

        "var stationPlazaProps = " +
            JSON.stringify(exportedParts, null, 4) +
            ";",

        ""
    ];

    return lines.join("\n");
}


function buildTownSceneDefinitionExportCode(
    info,
    collisionData,
    exportedParts
) {
    var def = activeTownSceneDef || {};
    var sceneId = currentScene;

    var exportedDefinition = {
        id: sceneId,
        title: def.title || info.title,
        subtitle: def.subtitle || "",

        mapWidth: Number(MAP_WIDTH) || def.mapWidth || 24,
        mapHeight: Number(MAP_HEIGHT) || def.mapHeight || 24,

        backgroundStyle: def.backgroundStyle || "",
        backgroundImagePath: def.backgroundImagePath || "",

        spawnPoints: JSON.parse(JSON.stringify(
            def.spawnPoints || {
                default: {
                    x: Math.round(player.x / TILE_SIZE),
                    y: Math.round(player.y / TILE_SIZE),
                    dir: player.dir || "down"
                }
            }
        )),

        edgeWarps: JSON.parse(JSON.stringify(
            def.edgeWarps || []
        )),

        passableRects: collisionData.passableRects,
        blockedRects: collisionData.blockedRects,
        blockedPoints: collisionData.blockedPoints,

        areaZones: JSON.parse(JSON.stringify(
            areaZones || []
        )),

        triggers: JSON.parse(JSON.stringify(
            triggers || []
        )),

        groundRects: JSON.parse(JSON.stringify(
            def.groundRects || []
        )),

        props: exportedParts,

        decor: JSON.parse(JSON.stringify(
            def.decor || []
        ))
    };

    var json = JSON.stringify(
        exportedDefinition,
        null,
        4
    );

    // JSONをJavaScriptのオブジェクト定義として貼りやすくする。
    var lines = [
        "// ==========================================",
        "// 湯間庭町 / " + info.title + " 編集データ",
        "// 開発モードの「書き出す」で生成しました。",
        "// " + info.fileName + " 内の",
        "// " + sceneId + ": { ... } を以下で置き換えてください。",
        "// ==========================================",
        "",
        sceneId + ": " + json + ",",
        ""
    ];

    return lines.join("\n");
}


function buildFullStationPlazaExportCode() {
    var info = getTownSceneExportInfo(currentScene);
    var collisionData = buildExportCollisionData();
    var exportedParts = cloneTownParts();

    if (info.mode === "station-data") {
        return buildStationPlazaExportCode(
            info,
            collisionData,
            exportedParts
        );
    }

    return buildTownSceneDefinitionExportCode(
        info,
        collisionData,
        exportedParts
    );
}


function showExportModal() {
    var textarea = document.getElementById("export-textarea");
    if (!textarea) return;

    var info = getTownSceneExportInfo(currentScene);

    textarea.value = buildFullStationPlazaExportCode();

    var modal = document.getElementById("export-modal");
    if (modal) {
        modal.style.display = "flex";
    }

    var copyButton = document.getElementById("btn-copy-export");

    if (copyButton) {
        copyButton.innerText =
            info.title + "のコードをコピー";
    }

    updateEditorStatus(
        editorHasUnsavedChanges
            ? info.title +
              "を書き出しています。コピーすると「コピー済み」になります"
            : info.title +
              "の現在の内容はコピー済みです"
    );
}


// ==========================================
// 6. メインループと更新・判定
// ==========================================
function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

function update() {
    if (isMessageOpen || !isTownScene(currentScene) || isEditMode) {
        player.isMoving = false;
        updatePlayerWalkAnimation(0);
        return;
    }

    var dx = 0; var dy = 0;
    var manualInput = false;
    var movedDistance = 0;

    if (keys['ArrowUp'] || keys['w'] || keys['W'] || dpad.up) { dy -= player.speed; manualInput = true; }
    if (keys['ArrowDown'] || keys['s'] || keys['S'] || dpad.down) { dy += player.speed; manualInput = true; }
    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || dpad.left) { dx -= player.speed; manualInput = true; }
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || dpad.right) { dx += player.speed; manualInput = true; }

    if (manualInput) {
        var beforeManualX = player.x;
        var beforeManualY = player.y;

        cancelTapMove();
        
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        player.dir = (Math.abs(dx) > Math.abs(dy)) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');

        if (!checkCollision(player.x + dx, player.y)) player.x += dx;
        if (!checkCollision(player.x, player.y + dy)) player.y += dy;

        if (player.x < 0) player.x = 0;
        if (player.x + player.w > MAP_WIDTH * TILE_SIZE) player.x = MAP_WIDTH * TILE_SIZE - player.w;
        if (player.y < 0) player.y = 0;
        if (player.y + player.h > MAP_HEIGHT * TILE_SIZE) player.y = MAP_HEIGHT * TILE_SIZE - player.h;

        var manualMovedX = player.x - beforeManualX;
        var manualMovedY = player.y - beforeManualY;

        movedDistance = Math.sqrt(
            manualMovedX * manualMovedX +
            manualMovedY * manualMovedY
        );

        // 壁に当たって動いていない時は、足踏みしない。
        player.isMoving = movedDistance > 0.01;
        
        updateUI();
        updateInteractionHint();
        updateCurrentArea();

        var warpSide = null;
        if (player.isMoving) {
            if (player.dir === 'left' && (keys['ArrowLeft'] || keys['a'] || keys['A'] || dpad.left)) warpSide = 'left';
            if (player.dir === 'right' && (keys['ArrowRight'] || keys['d'] || keys['D'] || dpad.right)) warpSide = 'right';
            if (player.dir === 'up' && (keys['ArrowUp'] || keys['w'] || keys['W'] || dpad.up)) warpSide = 'up';
            if (player.dir === 'down' && (keys['ArrowDown'] || keys['s'] || keys['S'] || dpad.down)) warpSide = 'down';
        }
        if (warpSide && tryTownEdgeWarp(warpSide)) return;
    } else {
        // 経路の最初・最後の短い一歩も含め、タップ移動中は歩行アニメを維持する。
        var tapPathWasActive = !!tapMoveTargetTile;
        var beforeTapX = player.x;
        var beforeTapY = player.y;
        var moved = updateTapMove();

        var tapMovedX = player.x - beforeTapX;
        var tapMovedY = player.y - beforeTapY;

        movedDistance = Math.sqrt(
            tapMovedX * tapMovedX +
            tapMovedY * tapMovedY
        );

        var movedThisFrame = movedDistance > 0.01;

        // 経路が続いている間は、タップ移動の歩行ポーズを保つ。
        player.isMoving =
            movedThisFrame ||
            tapPathWasActive ||
            !!tapMoveTargetTile;

        if (moved) {
            updateUI();
            updateInteractionHint();
            updateCurrentArea();
            if (tryTownEdgeWarp()) return;
        }
    }

    updatePlayerWalkAnimation(movedDistance);

    if (tapMarkerTimer > 0) {
        tapMarkerTimer--;
    }
}


function getPlayerHitbox(x, y) { return { x: x + 3, y: y + 10, w: 10, h: 6 }; }

function checkCollision(x, y) {
    var rect = getPlayerHitbox(x, y);
    var points = [
        { x: rect.x, y: rect.y }, { x: rect.x + rect.w - 1, y: rect.y },
        { x: rect.x, y: rect.y + rect.h - 1 }, { x: rect.x + rect.w - 1, y: rect.y + rect.h - 1 }
    ];
    for (var i = 0; i < points.length; i++) {
        var tx = Math.floor(points[i].x / TILE_SIZE); var ty = Math.floor(points[i].y / TILE_SIZE);
        if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return true;
        var val = collisionGrid[ty][tx];
        if (val === 0 || val === 2) return true;
    }
    return false;
}

function isColliding(r1, r2) { return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y; }

function getNearbyTrigger() {
    if (tapFocusedTrigger) {
        if (isPlayerNearTrigger(tapFocusedTrigger)) {
            return tapFocusedTrigger;
        }

        tapFocusedTrigger = null;
    }

    var checkX = player.x;
    var checkY = player.y;
    var checkSize = TILE_SIZE;

    if (player.dir === 'up') checkY -= checkSize;
    if (player.dir === 'down') checkY += checkSize;
    if (player.dir === 'left') checkX -= checkSize;
    if (player.dir === 'right') checkX += checkSize;

    var targetRect = getPlayerHitbox(checkX, checkY);
    var pRect = getPlayerHitbox(player.x, player.y);

    for (var i = 0; i < triggers.length; i++) {
        var t = triggers[i];
        var tr = {
            x: t.area.x * TILE_SIZE,
            y: t.area.y * TILE_SIZE,
            w: t.area.w * TILE_SIZE,
            h: t.area.h * TILE_SIZE
        };

        if (isColliding(targetRect, tr) || isColliding(pRect, tr)) {
            return t;
        }
    }

    return null;
}


function updateInteractionHint() {
    var hintEl =
        document.getElementById("interaction-hint");

    var btnAction =
        document.getElementById("btn-action");

    if (!hintEl) {
        return;
    }

    if (
        isEditMode ||
        !isTownScene(currentScene)
    ) {
        hintEl.classList.remove("visible");
        hintEl.classList.remove("hint-pressed");
        hintEl.setAttribute(
            "aria-hidden",
            "true"
        );

        if (btnAction) {
            btnAction.innerText = "調べる";
        }

        return;
    }

    var t = getNearbyTrigger();

    if (t) {
        var label = t.label || "";
        var actionLabel =
            t.actionLabel || "調べる";

        document
            .getElementById("interaction-label")
            .innerText = label;

        document
            .getElementById("interaction-action")
            .innerText = actionLabel;

        hintEl.classList.add("visible");
        hintEl.setAttribute(
            "aria-hidden",
            "false"
        );

        hintEl.setAttribute(
            "aria-label",
            label
                ? label + "を" + actionLabel
                : actionLabel
        );

        if (btnAction) {
            btnAction.innerText = actionLabel;
        }
    } else {
        hintEl.classList.remove("visible");
        hintEl.classList.remove("hint-pressed");
        hintEl.setAttribute(
            "aria-hidden",
            "true"
        );

        if (btnAction) {
            btnAction.innerText = "調べる";
        }
    }
}


function updateCurrentArea() {
    if (!isTownScene(currentScene)) return;

    var pRect = getPlayerHitbox(player.x, player.y);
    var centerX = pRect.x + pRect.w / 2;
    var centerY = pRect.y + pRect.h / 2;
    var tileX = Math.floor(centerX / TILE_SIZE);
    var tileY = Math.floor(centerY / TILE_SIZE);

    var foundZone = null;
    for (var i = 0; i < areaZones.length; i++) {
        var z = areaZones[i];
        if (tileX >= z.area.x && tileX < z.area.x + z.area.w && tileY >= z.area.y && tileY < z.area.y + z.area.h) {
            foundZone = z;
            break;
        }
    }

    if (foundZone && foundZone.id !== currentAreaId) {
        currentAreaId = foundZone.id;
        showAreaTitle(foundZone);
    }
}

function showAreaTitle(zone) {
    if (isEditMode) return;
    var titleEl = document.getElementById('area-title');
    document.getElementById('area-title-main').innerText = zone.title;
    document.getElementById('area-title-sub').innerText = zone.subtitle;

    titleEl.classList.remove('visible');
    setTimeout(function() { titleEl.classList.add('visible'); }, 50);

    if (areaTitleTimer) clearTimeout(areaTitleTimer);
    areaTitleTimer = setTimeout(function() { titleEl.classList.remove('visible'); }, 2200);
}

function handleAction() {
    var t = getNearbyTrigger();
    if (t) {
        if (t.id === "tourist_map") {
            openStationGuideMap();
            return;
        }

        if (t.type === "work") {
            var work = t.workId ? getWorkById(t.workId) : null;

            if (work) {
                launchWork(work);
            } else {
                showMessage(t.text || "この作品は、まだ準備中です。");
            }

            return;
        }

        if (t.type === "inspect") {
            showMessage(t.text);
        } else if (t.type === "warp" || t.type === "menu") {
            var actionName = t.actionLabel || "調べる";
            showMessage(t.text + "<br><span style='font-size:14px; color:#aaa;'>(もう一度「" + actionName + "」で開く)</span>");
            pendingWarp = t.target;
        }
    }
}



// ==========================================
// 7. UI・シーン・RPGメニュー管理
// ==========================================
function updateUI() {
    var tileX = Math.floor((player.x + player.w/2) / TILE_SIZE);
    var tileY = Math.floor((player.y + player.h/2) / TILE_SIZE);
    var sceneName = currentScene;
    if (isTownScene(currentScene)) sceneName = getTownSceneTitle(currentScene);
    else if (DESTINATIONS[currentScene]) sceneName = DESTINATIONS[currentScene].title;
    document.getElementById('scene-name').innerText = sceneName;
    if (debugMode) document.getElementById('coord-display').innerText = "現在座標: (" + tileX + ", " + tileY + ")";
}

// ★ 追加: テキストフォーマットの共通化
function formatText(text) {
    return String(text || "").replace(/\n/g, "<br>");
}

function showMessage(text) {
    if (typeof cancelTapMove === "function") {
        cancelTapMove();
    }
    var msg = formatText(text);
    var msgWin = document.getElementById('message-window');
    var backdrop = document.getElementById('message-backdrop');

    msgWin.innerHTML = msg;
    msgWin.style.display = 'block';

    if (backdrop) {
        backdrop.style.display = 'block';
    }

    isMessageOpen = true;
    clearDpadInput();
    updateControlVisibility();
}


function closeMessage() { 
    var msgWin = document.getElementById('message-window');
    var backdrop = document.getElementById('message-backdrop');

    msgWin.style.display = 'none';

    if (backdrop) {
        backdrop.style.display = 'none';
    }

    isMessageOpen = false; 
    updateControlVisibility();

    if (typeof updateInteractionHint === "function") {
        updateInteractionHint();
    }
}


function resetDestinationState() {
    currentDestinationId = null;
    destinationViewMode = "intro";
    currentDestinationMessage = "";
    currentDestinationMessageTitle = "";
}

function getDestinationReturnSceneId(destOrId) {
    var dest = (typeof destOrId === "string") ? DESTINATIONS[destOrId] : destOrId;

    if (dest && dest.returnScene && isTownScene(dest.returnScene)) {
        return dest.returnScene;
    }

    return "station_plaza";
}

function getDestinationReturnLabel(destOrId) {
    var dest = (typeof destOrId === "string") ? DESTINATIONS[destOrId] : destOrId;

    if (dest && dest.returnLabel) {
        return dest.returnLabel;
    }

    return "駅前";
}

window.backToDestinationReturnScene = function(destId) {
    restoreTownWindowReturnPoint(
        getDestinationReturnSceneId(destId || currentDestinationId)
    );
};


// ★ RPG共通メニューの生成と遷移
window.changeScene = function(sceneId, spawnKey) {
    // 町内から、お店・看板などの専用画面へ移る直前に位置を保存
    if (isTownScene(currentScene) && !isTownScene(sceneId)) {
        rememberTownWindowReturnPoint();
    }

    currentScene = sceneId;

    var sceneContainer = document.getElementById('scene-container');
    document.getElementById('area-title').classList.remove('visible');
    document.getElementById('interaction-hint').classList.remove('visible');

    var btnAction = document.getElementById('btn-action');
    if (btnAction) {
        btnAction.innerText = "調べる";
    }

    if (isTownScene(sceneId)) {
        resetDestinationState();
        closeDestinationScene();
        applyTownSceneDefinition(sceneId, spawnKey || 'default');
        clearDpadInput();
        updateControlVisibility();
        return;
    }

    updateUI();
    openDestination(sceneId);
    clearDpadInput();
    updateControlVisibility();
};



window.openDestination = function(destId) {
    currentDestinationId = destId;

    // 湯間庭新報は、タイトル一覧を一度挟まずに
    // 記事カードが並ぶ「新聞ラック」を直接開く。
    destinationViewMode = (destId === "shinpo_board") ? "note_rack" : "intro";
    currentDestinationMessage = "";
    currentDestinationMessageTitle = "";
    renderDestination();
};

window.renderDestination = function() {
    var dest = DESTINATIONS[currentDestinationId];
    if (!dest) return;

    var html = "";
    if (destinationViewMode === "intro") {
        html = renderDestinationIntro(dest);
    } else if (destinationViewMode === "menu") {
        html = renderDestinationMenu(dest);
    } else if (destinationViewMode === "message") {
        html = renderDestinationMessage(dest, currentDestinationMessageTitle, currentDestinationMessage);
    } else if (destinationViewMode === "note_rack") {
        html = renderNoteCardRack(dest);
    }

    var sceneContainer = document.getElementById('scene-container');
    sceneContainer.classList.toggle('newspaper-rack', destinationViewMode === "note_rack");
    sceneContainer.innerHTML = html;
    sceneContainer.style.display = 'block';

    if (destinationViewMode !== "note_rack") {
        resetRpgMenuCursor();
    }
};

window.renderDestinationIntro = function(dest) {
    var html = '<div class="rpg-window">';
    html += '<div class="rpg-window-header">';
    html += '<div class="rpg-title">' + dest.title + '</div>';
    if (dest.subtitle) html += '<div class="rpg-subtitle">' + dest.subtitle + '</div>';
    html += '</div>';

    if (dest.description) html += '<p class="rpg-description">' + formatText(dest.description) + '</p>';
    if (dest.flavor) html += '<p class="rpg-flavor">' + formatText(dest.flavor) + '</p>';

    html += '<div class="rpg-menu-list">';
    html += '<button class="rpg-menu-item" onclick="returnDestinationMenu()">つづける</button>';
    html += '<button class="rpg-menu-item rpg-back" onclick="backToDestinationReturnScene(\'' + dest.id + '\')">' + getDestinationReturnLabel(dest) + 'へ戻る</button>';
    html += '</div></div>';

    return html;
};

// 施設メニュー内の作品一覧は、DESTINATIONSに固定で書かず WORKS から組み立てる。
// 既存の最初の作品項目を「差し込み位置」として使うため、
// 作品を追加・公開しただけで同じ施設の一覧に自動で反映される。
function getDestinationMenuItems(dest) {
    var baseItems = (dest && dest.items) ? dest.items : [];
    var result = [];
    var insertedVenues = {};

    for (var i = 0; i < baseItems.length; i++) {
        var item = baseItems[i];
        var work = item && item.workId ? getWorkById(item.workId) : null;
        var venue = work && work.venue ? work.venue : "";

        if (venue) {
            if (!insertedVenues[venue]) {
                var visibleWorks = buildWorkMenuItems(venue);
                for (var w = 0; w < visibleWorks.length; w++) {
                    result.push(visibleWorks[w]);
                }
                insertedVenues[venue] = true;
            }
            // 古い個別の作品項目は、上で生成した一覧に置き換える。
            continue;
        }

        result.push(item);
    }

    return result;
}

window.renderDestinationMenu = function(dest) {
    if (!document.getElementById("destination-work-shelf-style")) {
        var style = document.createElement("style");
        style.id = "destination-work-shelf-style";

        style.textContent =
            ".rpg-menu-item.rpg-work-shelf-item{" +
                "display:block;" +
                "position:relative;" +
                "width:100%;" +
                "box-sizing:border-box;" +
                "text-align:left;" +
                "padding:13px 14px 12px 27px;" +
                "line-height:1.45;" +
            "}" +

            // 既存の選択カーソルがカード左端に出ても、
            // 文字に重ならないよう本文側の余白を確保する。
            ".rpg-menu-item.rpg-work-shelf-item.rpg-menu-selected{" +
                "padding-left:38px;" +
            "}" +

            ".rpg-work-shelf-category{" +
                "display:block;" +
                "margin-bottom:4px;" +
                "font-size:10px;" +
                "font-weight:800;" +
                "letter-spacing:.12em;" +
                "opacity:.68;" +
            "}" +

            ".rpg-work-shelf-title{" +
                "display:block;" +
                "font-size:15px;" +
                "font-weight:800;" +
                "line-height:1.5;" +
            "}" +

            ".rpg-work-shelf-description{" +
                "display:block;" +
                "margin-top:5px;" +
                "font-size:12px;" +
                "font-weight:500;" +
                "line-height:1.55;" +
                "opacity:.78;" +
            "}" +

            ".rpg-work-shelf-played{" +
                "display:inline-block;" +
                "margin-top:7px;" +
                "padding:2px 7px;" +
                "border-radius:999px;" +
                "font-size:10px;" +
                "font-weight:800;" +
                "letter-spacing:.04em;" +
                "background:rgba(255,244,223,.12);" +
                "opacity:.82;" +
            "}" +

            ".rpg-work-shelf-return-guide{" +
                "box-sizing:border-box;" +
                "margin:0 0 16px;" +
                "padding:11px 13px;" +
                "border:2px solid rgba(255,239,200,.34);" +
                "border-radius:12px;" +
                "background:rgba(255,244,223,.07);" +
                "font-size:13px;" +
                "line-height:1.7;" +
                "opacity:.9;" +
            "}" +

            "@media (max-width:720px){" +
                ".rpg-menu-item.rpg-work-shelf-item{" +
                    "padding:12px 12px 11px 27px;" +
                "}" +

                ".rpg-menu-item.rpg-work-shelf-item.rpg-menu-selected{" +
                    "padding-left:38px;" +
                "}" +

                ".rpg-work-shelf-title{" +
                    "font-size:14px;" +
                "}" +

                ".rpg-work-shelf-description{" +
                    "font-size:11px;" +
                "}" +
            "}";

        document.head.appendChild(style);
    }

    var html = '<div class="rpg-window">';

    html += '<div class="rpg-window-header">';
    html += '<div class="rpg-title">' + dest.title + '</div>';

    if (dest.subtitle) {
        html += '<div class="rpg-subtitle">' + dest.subtitle + '</div>';
    }

    html += '</div>';

    if (
        typeof destinationReturnGuideText !== "undefined" &&
        destinationReturnGuideText
    ) {
        html += '<div class="rpg-work-shelf-return-guide">';
        html += formatText(destinationReturnGuideText);
        html += '</div>';
    }

    if (dest.menuTitle) {
        html += '<div class="rpg-menu-title">' + dest.menuTitle + '</div>';
    }

    html += '<div class="rpg-menu-list">';

    var menuItems = getDestinationMenuItems(dest);

    for (var i = 0; i < menuItems.length; i++) {
        var item = menuItems[i];
        if (!item) continue;

        // 「これから増えるゲーム」は表示しない。
        if (
            item.label === "これから増えるゲーム" ||
            item.label === "これから増える作品"
        ) {
            continue;
        }

        if (item.kind === "back") {
            html +=
                '<button type="button" class="rpg-menu-item rpg-back" ' +
                'onclick="backToDestinationReturnScene(\'' +
                dest.id +
                '\')">' +
                item.label +
                '</button>';

            continue;
        }

        var isWorkItem = !!item.workId;
        var buttonClass = "rpg-menu-item";

        if (isWorkItem) {
            buttonClass += " rpg-work-shelf-item";
        }

        html +=
            '<button type="button" class="' +
            buttonClass +
            '" onclick="handleDestinationMenuItem(\'' +
            dest.id +
            "', " +
            i +
            ')">';

        if (isWorkItem) {
            if (item.menuCategory) {
                html +=
                    '<span class="rpg-work-shelf-category">' +
                    item.menuCategory +
                    '</span>';
            }

            html +=
                '<span class="rpg-work-shelf-title">' +
                item.label +
                '</span>';

            if (item.menuDescription) {
                html +=
                    '<span class="rpg-work-shelf-description">' +
                    item.menuDescription +
                    '</span>';
            }

            if (
                typeof lastClosedWorkId !== "undefined" &&
                lastClosedWorkId &&
                item.workId === lastClosedWorkId
            ) {
                html +=
                    '<span class="rpg-work-shelf-played">' +
                    "さっき遊びました" +
                    '</span>';
            }
        } else {
            html += item.label;
        }

        html += '</button>';
    }

    html += '</div>';
    html += '</div>';

    return html;
};





window.renderDestinationMessage = function(dest, title, text) {
    var html = '<div class="rpg-window">';
    html += '<div class="rpg-window-header">';
    html += '<div class="rpg-title">' + title + '</div>';
    html += '</div>';

    html += '<p class="rpg-description">' + formatText(text) + '</p>';

    html += '<div class="rpg-menu-list" style="margin-top: 20px;">';
    html += '<button class="rpg-menu-item" onclick="returnDestinationMenu()">選択肢へ戻る</button>';
    html += '<button class="rpg-menu-item rpg-back" onclick="backToDestinationReturnScene(\'' + dest.id + '\')">' + getDestinationReturnLabel(dest) + 'へ戻る</button>';
    html += '</div></div>';

    return html;
};

window.showDestinationMessage = function(title, text) {
    destinationViewMode = "message";
    currentDestinationMessageTitle = title;
    currentDestinationMessage = text;
    renderDestination();
};

window.returnDestinationMenu = function() {
    destinationViewMode = "menu";
    currentDestinationMessage = "";
    currentDestinationMessageTitle = "";
    renderDestination();
};

function closeDestinationScene() {
    var sceneContainer = document.getElementById('scene-container');
    sceneContainer.classList.remove('newspaper-rack');
    sceneContainer.style.display = 'none';
    sceneContainer.innerHTML = '';
    rpgMenuCursorIndex = 0;
    updateInteractionHint();
    updateCurrentArea();
}


// ==========================================
// 湯間庭新報 / note読書室
// noteは通常ページを直接iframeへ入れず、note公式の埋め込みURLを使う。
// 記事URLの /n/ 以降から埋め込みURLを組み立てるため、日々の更新ではnotes.jsに
// 通常のurlだけ追加すればよい。
function getNoteArticleByUrl(url) {
    var target = String(url || "").split("?")[0].replace(/\/+$/, "");
    if (!target) return null;

    var source = (typeof getVisibleNoteArticles === "function")
        ? getVisibleNoteArticles()
        : (typeof NOTE_ARTICLES !== "undefined" ? NOTE_ARTICLES : []);

    for (var i = 0; i < source.length; i++) {
        var article = source[i];
        var articleUrl = String((article && article.url) || "").split("?")[0].replace(/\/+$/, "");
        if (articleUrl === target) return article;
    }
    return null;
}

function getNoteEmbedUrl(article) {
    if (!article) return "";

    // 将来、note側で専用URLが必要になった場合も、notes.jsの embedUrl を優先できる。
    if (article.embedUrl) return article.embedUrl;

    var url = String(article.url || "");
    var match = url.match(/\/n\/(n[a-z0-9]+)(?:[/?#]|$)/i);
    if (!match) return "";

    return "https://note.com/embed/notes/" + match[1];
}


// 湯間庭新報 / noteカードラック
// すべての記事を棚に並べず、開くたびに四つの役割で選んで見せる。
// 最新は町の現在地、ピックアップとふらりとは毎回入れ替わり、
// おすすめは町内で開いたカードだけを手がかりに決める。
function getSortedNoteArticlesForRack() {
    var source = (typeof getVisibleNoteArticles === "function")
        ? getVisibleNoteArticles()
        : (typeof NOTE_ARTICLES !== "undefined" ? NOTE_ARTICLES : []);

    var articles = [];
    for (var i = 0; i < source.length; i++) {
        if (source[i] && source[i].title && source[i].url) {
            articles.push(source[i]);
        }
    }

    // notes.js の並びに依存せず、新しい記事から見せる。
    articles.sort(function(a, b) {
        var aDate = (typeof getNotePublishDate === "function") ? getNotePublishDate(a) : "";
        var bDate = (typeof getNotePublishDate === "function") ? getNotePublishDate(b) : "";
        return String(bDate).localeCompare(String(aDate));
    });

    return articles;
}

function getNoteRackArticleId(article) {
    return String((article && (article.id || article.url)) || "");
}

function getNoteArticleById(articleId) {
    var id = String(articleId || "");
    if (!id) return null;

    var articles = getSortedNoteArticlesForRack();
    for (var i = 0; i < articles.length; i++) {
        if (getNoteRackArticleId(articles[i]) === id) return articles[i];
    }
    return null;
}

function escapeNoteRackHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeNoteRackJsString(value) {
    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\r/g, "")
        .replace(/\n/g, "");
}

function readShinpoOpenHistory() {
    try {
        var raw = window.localStorage.getItem(SHINPO_HISTORY_KEY);
        var parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function writeShinpoOpenHistory(history) {
    try {
        window.localStorage.setItem(
            SHINPO_HISTORY_KEY,
            JSON.stringify((history || []).slice(0, SHINPO_HISTORY_LIMIT))
        );
    } catch (err) {
        // プライベートブラウズ等で保存できない場合でも、ラック自体は使える。
    }
}

function recordShinpoArticleOpen(article) {
    var id = getNoteRackArticleId(article);
    if (!id) return;

    var history = readShinpoOpenHistory();
    var next = [{ id: id, openedAt: Date.now() }];

    for (var i = 0; i < history.length; i++) {
        if (history[i] && history[i].id && history[i].id !== id) {
            next.push(history[i]);
        }
    }

    writeShinpoOpenHistory(next);
}

function getNoteArticleThemes(article) {
    if (article && Array.isArray(article.themes) && article.themes.length) {
        return article.themes.slice();
    }

    // 日々の更新時にタグ入力を必須にしないため、まずはタイトルから軽く推定する。
    // 将来 notes.js に themes: ["game", "making"] を付ければ、そちらを優先できる。
    var text = String((article && article.title) || "").toLowerCase();
    var themes = [];

    function addTheme(name, words) {
        for (var i = 0; i < words.length; i++) {
            if (text.indexOf(String(words[i]).toLowerCase()) !== -1) {
                if (themes.indexOf(name) === -1) themes.push(name);
                return;
            }
        }
    }

    addTheme("game", ["ゲーム", "ボード", "焼き鳥", "すごろく"]);
    addTheme("app", ["アプリ", "ui", "steamclock", "coffeefactory", "chorddrift", "vectoboy", "vectorboy", "iromix", "dotcleaner"]);
    addTheme("making", ["自作", "作っ", "つく", "作る", "描く", "コード"]);
    addTheme("ai", ["ai", "生成"]);
    addTheme("rakugaki", ["らくがき", "触る", "気持ちいい"]);
    addTheme("time", ["時間", "時計", "カレンダー"]);
    addTheme("thoughts", ["夜", "思い出", "距離感", "残る", "売る", "保存"]);

    if (!themes.length) themes.push("thoughts");
    return themes;
}

function hasCommonNoteTheme(a, b) {
    for (var i = 0; i < a.length; i++) {
        if (b.indexOf(a[i]) !== -1) return true;
    }
    return false;
}

function getUnusedNoteRackArticles(articles, usedIds) {
    var result = [];
    for (var i = 0; i < articles.length; i++) {
        var article = articles[i];
        if (article && !usedIds[getNoteRackArticleId(article)]) {
            result.push(article);
        }
    }
    return result;
}

function pickRandomNoteRackArticle(articles, usedIds) {
    var candidates = getUnusedNoteRackArticles(articles, usedIds || {});
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickRecommendedNoteRackArticle(articles, usedIds) {
    var history = readShinpoOpenHistory();
    if (!history.length) return null;

    var candidates = getUnusedNoteRackArticles(articles, usedIds || {});
    var best = null;
    var bestScore = 0;

    for (var i = 0; i < candidates.length; i++) {
        var candidate = candidates[i];
        var candidateThemes = getNoteArticleThemes(candidate);
        var score = 0;

        for (var h = 0; h < history.length && h < 8; h++) {
            var pastArticle = getNoteArticleById(history[h] && history[h].id);
            if (!pastArticle) continue;

            var weight = 8 - h;
            if (hasCommonNoteTheme(candidateThemes, getNoteArticleThemes(pastArticle))) {
                score += weight * 10;
            }
        }

        // ごく小さな揺らぎを入れ、同点なら毎回同じ一枚に張り付かないようにする。
        score += Math.random() * 0.01;

        if (score > bestScore) {
            bestScore = score;
            best = candidate;
        }
    }

    return bestScore > 0 ? best : null;
}

function buildNoteRackSelection() {
    var articles = getSortedNoteArticlesForRack();
    var slots = [];
    var usedIds = {};

    function add(article, label, kind) {
        if (!article) return false;
        var id = getNoteRackArticleId(article);
        if (!id || usedIds[id]) return false;

        usedIds[id] = true;
        slots.push({ article: article, label: label, kind: kind });
        return true;
    }

    if (!articles.length) return slots;

    // 1. 町の現在地。
    add(articles[0], "最新", "latest");

    // 2. 直近の記事群から一枚。featured / pickup を付ければ、今後はその候補を優先できる。
    var featuredPool = [];
    for (var i = 1; i < articles.length; i++) {
        if (articles[i].featured === true || articles[i].pickup === true) {
            featuredPool.push(articles[i]);
        }
    }
    var recentPool = articles.slice(1, Math.min(articles.length, 10));
    add(pickRandomNoteRackArticle(featuredPool.length ? featuredPool : recentPool, usedIds), "今のピックアップ", "pickup");

    // 3. 古い紙面も含め、毎回ふらりと違う一枚。
    add(pickRandomNoteRackArticle(articles, usedIds), "ふらりと一枚", "random");

    // 4. 町内で開いたカードの傾向から選ぶ。履歴がまだなければ、初めての人向けの一枚。
    var recommended = pickRecommendedNoteRackArticle(articles, usedIds);
    if (recommended) {
        add(recommended, "あなたへの一枚", "recommended");
    } else {
        add(pickRandomNoteRackArticle(articles, usedIds), "はじめましての一枚", "welcome");
    }

    return slots;
}

window.openNoteArticleFromRack = function(articleId) {
    var article = getNoteArticleById(articleId);
    if (!article || !article.url) return;

    recordShinpoArticleOpen(article);

    // カードを選んだ瞬間だけ、正式なnote記事へ進む。
    window.open(article.url, "_blank");
};

function renderNoteRackCard(slot) {
    var article = slot.article;
    var embedUrl = getNoteEmbedUrl(article);
    var title = escapeNoteRackHtml(article.title);
    var date = (typeof getNotePublishDate === "function") ? getNotePublishDate(article) : "";
    var articleId = escapeNoteRackJsString(getNoteRackArticleId(article));
    var slotLabel = escapeNoteRackHtml(slot.label);
    var slotKind = escapeNoteRackHtml(slot.kind || "");
    var html = '';

    // URL形式が例外的な記事だけは、棚の中でタイトル札として残す。
    if (!embedUrl) {
        html += '<article class="note-rack-card note-rack-card-fallback" data-rack-kind="' + slotKind + '">';
        html += '<div class="note-rack-fallback-title">' + title + '</div>';
        if (date) html += '<div class="note-rack-fallback-date">' + escapeNoteRackHtml(date) + '</div>';
        html += '<div class="note-rack-card-footer"><span class="note-rack-card-slot">' + slotLabel + '</span><span class="note-rack-card-cta">noteで読む <span aria-hidden="true">↗</span></span></div>';
        html += '<button class="note-rack-card-open" type="button" aria-label="' + title + 'をnoteで開く" onclick="openNoteArticleFromRack(\'' + articleId + '\')"></button>';
        html += '</article>';
        return html;
    }

    html += '<article class="note-rack-card" data-rack-kind="' + slotKind + '">';
    html += '<iframe class="note-rack-card-frame" title="' + title + ' の紹介" src="' + escapeNoteRackHtml(embedUrl) + '" loading="lazy" scrolling="no" tabindex="-1" aria-hidden="true"></iframe>';
    html += '<div class="note-rack-card-footer"><span class="note-rack-card-slot">' + slotLabel + '</span><span class="note-rack-card-cta">noteで読む <span aria-hidden="true">↗</span></span></div>';
    html += '<button class="note-rack-card-open" type="button" aria-label="' + title + 'をnoteで開く" onclick="openNoteArticleFromRack(\'' + articleId + '\')"></button>';
    html += '</article>';
    return html;
}

window.renderNoteCardRack = function(dest) {
    var slots = buildNoteRackSelection();
    var html = '<div class="shinpo-rack">';

    html += '<div class="shinpo-rack-header">';
    html += '<div class="shinpo-rack-heading">';
    html += '<div class="shinpo-rack-title">' + escapeNoteRackHtml(dest.title || "湯間庭新報") + '</div>';
    if (dest.subtitle) {
        html += '<div class="shinpo-rack-subtitle">' + escapeNoteRackHtml(dest.subtitle) + '</div>';
    }
    html += '</div>';

    // 駅前固定ではなく、掲示板を開いた場所へ戻る
    html += '<button class="shinpo-rack-back" type="button" onclick="backToDestinationReturnScene(\'shinpo_board\')">元の場所へ戻る</button>';
    html += '</div>';

    html += '<p class="shinpo-rack-lead">今日の棚には、少しずつ違う紙面が届いています。</p>';

    if (slots.length === 0) {
        html += '<div class="shinpo-rack-empty">今日はまだ、新しい紙面が届いていません。</div>';
    } else {
        html += '<div class="note-card-rack-list">';
        for (var i = 0; i < slots.length; i++) {
            html += renderNoteRackCard(slots[i]);
        }
        html += '</div>';
    }

    html += '</div>';
    return html;
};


window.openNoteReader = function(article) {
    var embedUrl = getNoteEmbedUrl(article);

    if (!article || !embedUrl) {
        showDestinationMessage(
            article && article.title ? article.title : "読書室",
            "この記事は、まだ読書室に並べる準備中です。"
        );
        return;
    }

    var playerLayer = document.getElementById("work-player");
    var frame = document.getElementById("work-player-frame");
    var title = document.getElementById("work-player-title");
    var returnLabel = document.getElementById("work-player-return-label");
    var sourceButton = document.getElementById("btn-open-frame-source");

    if (!playerLayer || !frame || !title) return;

    if (typeof cancelTapMove === "function") {
        cancelTapMove();
    }

    currentWorkId = null;
    currentFrameSourceUrl = article.url || "";
    workPlayerReturnDestinationId = currentDestinationId;
    isWorkPlayerOpen = true;

    // 読書室は白い紙面に近い背景を使い、ゲームやらくがきとは見せ方を分ける。
    playerLayer.dataset.frameMode = "reader";

    title.innerText = "読書室";
    frame.title = article.title || "湯間庭新報";
    frame.setAttribute("allow", "");
    frame.removeAttribute("allowfullscreen");
    frame.allowFullscreen = false;
    frame.setAttribute("scrolling", "yes");

    if (returnLabel) {
        returnLabel.innerText = "湯間庭新報";
    }

    if (sourceButton) {
        sourceButton.hidden = false;
        sourceButton.setAttribute("aria-label", "noteで全文を開く");
    }

    setWorkPlayerLoading(true, "今日の紙面を開いています…");
    frame.src = embedUrl;

    playerLayer.classList.add("visible");
    playerLayer.setAttribute("aria-hidden", "false");

    clearDpadInput();
    updateControlVisibility();
};

function setWorkPlayerLoading(isLoading, label) {
    var playerLayer = document.getElementById("work-player");
    var loading = document.getElementById("work-player-loading");
    var loadingLabel = document.getElementById("work-player-loading-label");

    if (playerLayer) {
        playerLayer.classList.toggle("is-loading", !!isLoading);
    }

    if (!loading) return;

    if (loadingLabel && label) {
        loadingLabel.innerText = label;
    }

    loading.classList.toggle("visible", !!isLoading);
    loading.setAttribute("aria-hidden", isLoading ? "false" : "true");
}


function setupWorkPlayerEvents() {
    var closeButton = document.getElementById("btn-close-work");
    var sourceButton = document.getElementById("btn-open-frame-source");
    var frame = document.getElementById("work-player-frame");

    if (closeButton) {
        // pointerup と click の両方を受ける。iPhone Safari で click が遅延・欠落しても戻れるようにする。
        var closeFromControl = function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeWorkPlayer();
        };

        closeButton.addEventListener("pointerup", closeFromControl, { passive: false });
        closeButton.addEventListener("click", closeFromControl);
    }

    if (sourceButton) {
        sourceButton.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (currentFrameSourceUrl) {
                window.open(currentFrameSourceUrl, "_blank");
            }
        });
    }

    if (frame) {
        frame.addEventListener("load", function() {
            if (!isWorkPlayerOpen) return;

            // about:blank ではなく、指定した作品が読み込まれた時だけローディングを閉じる。
            if (frame.src && frame.src !== "about:blank") {
                window.setTimeout(function() {
                    if (isWorkPlayerOpen) {
                        setWorkPlayerLoading(false);
                    }
                }, 120);
            }
        });
    }

    window.addEventListener("message", function(e) {
        var frame = document.getElementById("work-player-frame");
        if (!isWorkPlayerOpen || !frame || e.source !== frame.contentWindow) return;

        if (e.data && e.data.type === "yumaniwa:close-work") {
            closeWorkPlayer();
        }
    });
}

window.openWorkPlayer = function(work) {
    var source = getWorkPlayerSource(work);

    if (!work || !source) {
        showDestinationMessage(
            work && work.title ? work.title : "作品",
            work && work.emptyText
                ? work.emptyText
                : "この作品は、まだ準備中です。"
        );
        return;
    }

    var playerLayer = document.getElementById("work-player");
    var frame = document.getElementById("work-player-frame");
    var title = document.getElementById("work-player-title");
    var closeButton = document.getElementById("btn-close-work");
    var returnLabel = document.getElementById("work-player-return-label");
    var sourceButton = document.getElementById("btn-open-frame-source");

    if (!playerLayer || !frame || !title) return;

    if (typeof cancelTapMove === "function") {
        cancelTapMove();
    }

    // 施設メニューから別作品を選んだ時点で、
    // 前の作品についての案内表示は終了する。
    if (!isDirectWorkVisit) {
        destinationReturnGuideText = "";
        lastClosedWorkId = null;
    }

    currentWorkId = work.id || null;
    currentFrameSourceUrl = "";

    workPlayerReturnDestinationId = (
        !isTownScene(currentScene) &&
        currentDestinationId &&
        DESTINATIONS[currentDestinationId]
    )
        ? currentDestinationId
        : null;

    isWorkPlayerOpen = true;

    playerLayer.dataset.frameMode = work.frameMode || "standard";
    setWorkPlayerLayout(work, playerLayer);

    title.innerText = getWorkPlayerFrameTitle(work);
    frame.title = work.title || "町内コンテンツ";

    frame.setAttribute("allow", "autoplay; fullscreen; gamepad");
    frame.setAttribute("allowfullscreen", "");
    frame.allowFullscreen = true;
    frame.setAttribute("scrolling", "no");

    if (sourceButton) {
        sourceButton.hidden = true;
    }

    var destinationLabel = getWorkPlayerReturnLabel(work);

    if (returnLabel) {
        returnLabel.innerText = destinationLabel;
    }

    if (closeButton) {
        closeButton.setAttribute(
            "aria-label",
            destinationLabel + "へ戻る"
        );
    }

    setWorkPlayerLoading(true, getWorkOpeningLabel(work));
    frame.src = source;

    playerLayer.classList.add("visible");
    playerLayer.setAttribute("aria-hidden", "false");

    window.requestAnimationFrame(updateWorkPlayerLayoutSize);

    clearDpadInput();
    updateControlVisibility();
};


window.closeWorkPlayer = function() {
    if (!isWorkPlayerOpen) return;

    var closedWorkId = currentWorkId;

    var playerLayer = document.getElementById("work-player");
    var frame = document.getElementById("work-player-frame");

    setWorkPlayerLoading(false);

    if (frame) {
        frame.src = "about:blank";
    }

    var closeButton = document.getElementById("btn-close-work");
    var returnLabel = document.getElementById("work-player-return-label");
    var title = document.getElementById("work-player-title");
    var sourceButton = document.getElementById("btn-open-frame-source");

    if (returnLabel) {
        returnLabel.innerText = "町";
    }

    if (closeButton) {
        closeButton.setAttribute("aria-label", "町へ戻る");
    }

    if (title) {
        title.innerText = "";
    }

    if (sourceButton) {
        sourceButton.hidden = true;
    }

    if (playerLayer) {
        playerLayer.dataset.frameMode = "standard";
        playerLayer.dataset.playerLayout = "responsive";
        playerLayer.style.removeProperty("--town-player-render-width");
        playerLayer.style.removeProperty("--town-player-render-height");
        delete playerLayer.dataset.playerWidth;
        delete playerLayer.dataset.playerHeight;
        playerLayer.classList.remove("visible");
        playerLayer.setAttribute("aria-hidden", "true");
    }

    isWorkPlayerOpen = false;
    currentWorkId = null;
    currentFrameSourceUrl = "";

    if (
        isDirectWorkVisit &&
        closedWorkId &&
        workPlayerReturnDestinationId
    ) {
        lastClosedWorkId = closedWorkId;

        destinationReturnGuideText =
            "店先に戻ってきました。\n" +
            "ここには、ほかの遊びも並んでいるようです。";
    }

    if (
        workPlayerReturnDestinationId &&
        DESTINATIONS[workPlayerReturnDestinationId]
    ) {
        currentDestinationId = workPlayerReturnDestinationId;
        destinationViewMode = "menu";
        currentDestinationMessage = "";
        currentDestinationMessageTitle = "";
        renderDestination();
    }

    // 直リンク専用案内は、最初の作品を閉じた時だけ。
    isDirectWorkVisit = false;
    workPlayerReturnDestinationId = null;

    clearDpadInput();
    updateControlVisibility();
};


window.launchWork = function(work) {
    if (!work) {
        showDestinationMessage("作品", "作品データが見つかりませんでした。");
        return;
    }

    if (work.status !== "open") {
        showDestinationMessage(
            work.title,
            work.emptyText || "この作品は、まだ準備中です。"
        );
        return;
    }

    var launch = work.launch || (work.url ? "external" : "embedded");

    if (launch === "embedded" || launch === "itch_embed") {
        openWorkPlayer(work);
        return;
    }

    if (launch === "external" && work.url) {
        window.open(work.url, "_blank");
        return;
    }

    showDestinationMessage(
        work.title,
        work.emptyText || "この作品は、まだ準備中です。"
    );
};

window.handleDestinationMenuItem = function(destId, index) {
    var dest = DESTINATIONS[destId];
    if (!dest) return;

    var menuItems = getDestinationMenuItems(dest);
    var item = menuItems[index];
    if (!item) return;

    if (item.kind === 'message') {
        showDestinationMessage(item.label, item.text);
        return;
    }

    if (item.workId) {
        launchWork(getWorkById(item.workId));
        return;
    }

    if (item.kind === 'external') {
        if (item.url && item.url !== "") {
            window.open(item.url, '_blank');
        } else {
            showDestinationMessage(item.label, item.emptyText || "まだ準備中です。");
        }
        return;
    }

    if (item.kind === 'back') {
        backToDestinationReturnScene(destId);
    }
};

window.handleDestinationItem = function(destId, index) {
    var dest = DESTINATIONS[destId];
    if (!dest) return;

    var item = dest.items[index];
    if (!item) return;

    if (item.kind === 'message') {
        showDestinationMessage(item.label, item.text);
        return;
    }

    if (item.workId) {
        launchWork(getWorkById(item.workId));
        return;
    }

    if (item.kind === 'external') {
        if (item.url && item.url !== "") {
            window.open(item.url, '_blank');
        } else {
            showDestinationMessage(
                item.label,
                item.emptyText || "まだ準備中です。"
            );
        }
        return;
    }

    if (item.kind === 'back') {
        backToDestinationReturnScene(destId);
        return;
    }
};


// ==========================================
// 8. 描画処理 (Canvas)
// ==========================================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var cam = getCamera();

    ctx.save();
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.cameraX, -cam.cameraY);

    drawTownSceneBackground(cam);

    if (tapMarkerTimer > 0 && tapMarkerPos && !isEditMode && !debugMode) {
        ctx.beginPath();
        ctx.arc(tapMarkerPos.x * TILE_SIZE + TILE_SIZE / 2, tapMarkerPos.y * TILE_SIZE + TILE_SIZE / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + (tapMarkerTimer / 60) + ")";
        ctx.fill();
    }

    if (debugMode || isEditMode) {
        drawTownDevOverlay(cam);
    }

    if (isTownScene(currentScene)) {
        var px = player.x;
        var py = player.y;

        drawPlayerSprite(px, py);

        if (debugMode || isEditMode) {
            var hitbox = getPlayerHitbox(px, py);
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 1;
            ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
        }
    }
    ctx.restore();
}
