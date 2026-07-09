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
var DEV_MODE_ENABLED = false;
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

var collisionGrid = [];
var currentAreaId = null;
var areaTitleTimer = null;

var tapMovePath = [];
var tapMoveTargetTile = null;
var tapMarkerTimer = 0;
var tapMarkerPos = null;

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

var STATION_GUIDE_MAP_IMAGE = "assets/station-guide-map.png";
var isStationGuideMapOpen = false;
var stationGuideMapStylesReady = false;
var stationGuideMapEventsReady = false;

var stationGuideMapImageReady = false;
var stationGuideMapImageError = false;
var stationGuideMapRevealTimer = null;

var townArrivalLoadingStartedAt = 0;
var townArrivalLoadingMinMs = 720;
var townArrivalLoadingHideTimer = null;



var STATION_GUIDE_MAP_HOTSPOTS = [
    {
        id: "shinpo",
        label: "湯間庭新報",
        kind: "place",
        target: "shinpo_board",
        rect: { left: 7.3, top: 12.3, width: 19.8, height: 18.9 }
    },
    {
        id: "tomogushi",
        label: "灯串横丁",
        kind: "place",
        target: "tomogushi_alley_map",
        rect: { left: 2.7, top: 40.1, width: 26.9, height: 35.4 }
    },
    {
        id: "yumado",
        label: "湯窓通り",
        kind: "place",
        target: "yumado_street_map",
        rect: { left: 71.6, top: 11.8, width: 24.9, height: 29.5 }
    },
    {
        id: "tourist_info",
        label: "観光案内所",
        kind: "place",
        target: "tourist_info_interior",
        rect: { left: 56.2, top: 22.4, width: 19.0, height: 28.3 }
    },
    {
        id: "leisure_center",
        label: "湯窓レジャーセンター",
        kind: "place",
        target: "leisure_center_map",
        rect: { left: 74.8, top: 43.6, width: 22.5, height: 40.1 }
    },
    {
        id: "station",
        label: "湯間庭駅",
        kind: "message",
        text: "湯間庭駅。\n\nのんびりしたローカル線の小さな駅だ。\nここから、湯気と看板の町歩きが始まる。",
        rect: { left: 33.2, top: 67.2, width: 33.2, height: 28.9 }
    },
    {
        id: "current",
        label: "現在地",
        kind: "close",
        rect: { left: 45.1, top: 41.3, width: 12.7, height: 15.9 }
    },
    {
        id: "onsen",
        label: "湯けむり坂 工事中",
        kind: "message",
        text: "この先、湯けむり坂。\n\n温泉方面は、ただいま工事中です。",
        rect: { left: 41.1, top: 10.1, width: 19.0, height: 17.1 }
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

function playTownRpgFadeTransition(callback) {
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

    window.setTimeout(function() {
        if (typeof callback === "function") {
            callback();
        }

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

function changeSceneWithTownFade(sceneId) {
    playTownRpgFadeTransition(function() {
        changeScene(sceneId);
    });
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

    if (!DESTINATIONS[placeId]) return false;

    changeScene(placeId);

    // 直リンクで来た人には、施設説明よりも選択肢を先に見せる。
    // 新報だけは、既存仕様どおり記事ラックを直接開く。
    if (placeId !== "shinpo_board") {
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

    if (destinationId && DESTINATIONS[destinationId]) {
        changeScene(destinationId);
        destinationViewMode = "menu";
        renderDestination();
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
        currentScene !== "station_plaza"
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
    if (typeof refreshTownContent === 'function') refreshTownContent();
    window.addEventListener('resize', resizeCanvas);

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', resizeCanvas);
        window.visualViewport.addEventListener('scroll', resizeCanvas);
    }

    resizeCanvas();

    initGrid();

    bgImage.onload = function() {
        bgLoaded = true;
        finishTownArrivalLoading();
    };
    bgImage.onerror = function() {
        bgError = true;
        finishTownArrivalLoading();
    };
    bgImage.src = BG_IMAGE_PATH;
    loadPlayerSprites();

    setupEvents();
    setupEditorEvents();
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


function initGrid() {
    collisionGrid = [];
    for (var y = 0; y < MAP_HEIGHT; y++) {
        var row = [];
        for (var x = 0; x < MAP_WIDTH; x++) row.push(0);
        collisionGrid.push(row);
    }
    for(var i=0; i<passableRects.length; i++) {
        var r = passableRects[i];
        for(var cy=r.y; cy<r.y+r.h; cy++) {
            for(var cx=r.x; cx<r.x+r.w; cx++) {
                if(cx>=0 && cx<MAP_WIDTH && cy>=0 && cy<MAP_HEIGHT) collisionGrid[cy][cx] = 1;
            }
        }
    }
    for(var i=0; i<blockedRects.length; i++) {
        var r = blockedRects[i];
        for(var cy=r.y; cy<r.y+r.h; cy++) {
            for(var cx=r.x; cx<r.x+r.w; cx++) {
                if(cx>=0 && cx<MAP_WIDTH && cy>=0 && cy<MAP_HEIGHT) collisionGrid[cy][cx] = 2;
            }
        }
    }
    for(var i=0; i<blockedPoints.length; i++) {
        var p = blockedPoints[i];
        if(p.x>=0 && p.x<MAP_WIDTH && p.y>=0 && p.y<MAP_HEIGHT) collisionGrid[p.y][p.x] = 2;
    }
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
}

function cancelTapMoveForAction() {
    // ヒントや調べるボタンを押す時用。
    // 移動予約だけ止めて、到着後に覚えている対象 tapFocusedTrigger は消さない。
    tapMovePath = [];
    tapMoveTargetTile = null;
    tapMoveTargetTrigger = null;
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
        currentScene !== 'station_plaza' &&
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

    changeScene('station_plaza');
}

function handleRpgMenuKeyboard(e) {
    if (!isDestinationSceneOpen() || isEditMode || debugMode) return false;

    var key = e.key;

    // 新報ラックなど、通常のRPGメニューではない画面では戻る操作だけ受ける。
    if (destinationViewMode === 'note_rack') {
        if (key === 'Escape' || key === 'Backspace' || key === 'ArrowLeft') {
            e.preventDefault();
            e.stopPropagation();
            changeScene('station_plaza');
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

        keys[e.key] = true;
        if (DEV_MODE_ENABLED && (e.key === 'g' || e.key === 'G' || e.key === 'd' || e.key === 'D')) toggleDebugMode();
        if (e.key === 'Escape') {
            if (isWorkPlayerOpen) {
                closeWorkPlayer();
                return;
            }
            closeMessage();
            if (currentScene !== 'station_plaza') changeScene('station_plaza');
            pendingWarp = null;
        }
        if (e.key === 'Enter' || e.key === ' ') handleActionTrigger();
    });
    window.addEventListener('keyup', function(e) { keys[e.key] = false; });

    window.addEventListener("blur", clearDpadInput);
    document.addEventListener("visibilitychange", function() {
        if (document.hidden) clearDpadInput();
    });

    function stopProp(e) { e.stopPropagation(); }

    function bindDpadButton(id, dir) {
        var el = document.getElementById(id);
        if (!el) return;

        function press(e) {
            e.preventDefault();
            e.stopPropagation();

            if (isMessageOpen || isEditMode || debugMode || currentScene !== "station_plaza") return;

            cancelTapMove();
            dpad[dir] = true;
            el.classList.add("pressed");

            if (el.setPointerCapture && e.pointerId !== undefined) {
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

            if (el.releasePointerCapture && e && e.pointerId !== undefined) {
                try {
                    el.releasePointerCapture(e.pointerId);
                } catch (err) {}
            }
        }

        el.addEventListener("pointerdown", press, { passive: false });
        el.addEventListener("pointerup", release, { passive: false });
        el.addEventListener("pointercancel", release, { passive: false });
        el.addEventListener("pointerleave", release, { passive: false });
    }

    bindDpadButton("btn-up", "up");
    bindDpadButton("btn-down", "down");
    bindDpadButton("btn-left", "left");
    bindDpadButton("btn-right", "right");

    var btnAction = document.getElementById('btn-action');
    if (btnAction) {
        var actionFunc = function(e) { 
            e.preventDefault(); 
            e.stopPropagation(); 
            handleActionTrigger(); 
        };
        btnAction.addEventListener('pointerdown', stopProp);
        btnAction.addEventListener('touchstart', actionFunc, {passive: false});
        btnAction.addEventListener('click', actionFunc);
    }

    var btnDebug = document.getElementById('btn-debug-toggle');
    if (DEV_MODE_ENABLED && btnDebug) {
        btnDebug.addEventListener('pointerdown', stopProp);
        btnDebug.addEventListener('touchstart', function(e) { 
            e.preventDefault(); 
            e.stopPropagation(); 
            toggleDebugMode(); 
        }, {passive: false});
        btnDebug.addEventListener('click', function(e) { 
            e.preventDefault(); 
            e.stopPropagation(); 
            toggleDebugMode(); 
        });
    }

    var hintEl = document.getElementById('interaction-hint');
    if (hintEl) {
        hintEl.addEventListener('pointerdown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (!isEditMode && !debugMode) {
                cancelTapMoveForAction();
                handleActionTrigger();
            }
        });
    }

    var sceneContainer = document.getElementById('scene-container');
    if (sceneContainer) {
        sceneContainer.addEventListener('pointerdown', stopProp);
        sceneContainer.addEventListener('touchstart', stopProp, {passive: false});
        setupRpgMenuPointerSelection(sceneContainer);
    }

    // Safariの虫眼鏡・長押し選択を、ゲームCanvas自身で確実に抑止する。
    // 施設メニューや作品プレイヤーのボタンには触れない。
    function suppressCanvasNativeGesture(e) {
        if (e.cancelable) {
            e.preventDefault();
        }
    }

    function applyNativeGestureSuppression(el) {
        if (!el) return;

        el.style.webkitTouchCallout = 'none';
        el.style.webkitUserSelect = 'none';
        el.style.userSelect = 'none';
        el.oncontextmenu = function() {
            return false;
        };

        el.addEventListener('selectstart', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('dragstart', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('contextmenu', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('touchstart', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('touchmove', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('gesturestart', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('gesturechange', suppressCanvasNativeGesture, { passive: false });
        el.addEventListener('gestureend', suppressCanvasNativeGesture, { passive: false });
    }

    // Canvas本体
    applyNativeGestureSuppression(canvas);

    // 十字キー・調べるボタン側でも虫眼鏡を抑止する
    applyNativeGestureSuppression(document.getElementById('mobile-controls'));
    applyNativeGestureSuppression(document.getElementById('dpad'));
    applyNativeGestureSuppression(document.getElementById('btn-action'));

    var dpadButtons = document.querySelectorAll('.dpad-btn');
    dpadButtons.forEach(function(btn) {
        applyNativeGestureSuppression(btn);
    });

    canvas.addEventListener('pointerdown', function(e) {
        e.preventDefault();

        if (isMessageOpen || currentScene !== 'station_plaza') return;

        var tappedTile = getPointerTile(e);
        if (!tappedTile) return;

        var tileX = tappedTile.x;
        var tileY = tappedTile.y;

        if (isEditMode) {
            document.getElementById('clicked-coord').innerText = "タップ: x=" + tileX + ", y=" + tileY;
            handleEditorTap(tileX, tileY);
            return;
        }

        if (debugMode) {
            document.getElementById('clicked-coord').innerText = "タップ: x=" + tileX + ", y=" + tileY;
            currentHoverTile = { x: tileX, y: tileY };
            return;
        }

        if (startTapMoveToNearbyTrigger(tileX, tileY)) {
            return;
        }

        startTapMoveTo(tileX, tileY);
    });

    canvas.addEventListener('pointermove', function(e) {
        e.preventDefault();

        if (!isEditMode || editStep !== 1) return;
        var hoverTile = getPointerTile(e);
        if (!hoverTile) return;

        currentHoverTile = {
            x: hoverTile.x,
            y: hoverTile.y
        };
    });
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

    if (currentScene === 'station_plaza') {
        handleAction();
    }
}


function toggleDebugMode() {
    if (!DEV_MODE_ENABLED) return;

    var panel = document.getElementById('editor-panel');
    var btn = document.getElementById('btn-debug-toggle');
    if (panel.style.display === 'none') {
        panel.style.display = 'flex'; btn.style.display = 'none';
        debugMode = true; isEditMode = true;
        document.getElementById('debug-info').style.display = 'inline-block';
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
function setupEditorEvents() {
    document.getElementById('btn-close-editor').addEventListener('click', function() {
        document.getElementById('editor-panel').style.display = 'none';
        document.getElementById('btn-debug-toggle').style.display = DEV_MODE_ENABLED ? 'block' : 'none';
        isEditMode = false; debugMode = false;
        document.getElementById('debug-info').style.display = 'none';
        editStep = 0; currentHoverTile = null;
        updateInteractionHint();
        updateControlVisibility();
    });

    document.getElementById('edit-target').addEventListener('change', function(e) {
        editTarget = e.target.value; editStep = 0; currentHoverTile = null;
        document.getElementById('trigger-form').style.display = (editTarget === 'triggers') ? 'block' : 'none';
        updateEditorStatus(editTarget + " を編集します");
    });

    document.getElementById('btn-editor-undo').addEventListener('click', function() {
        if (editHistory.length === 0) { updateEditorStatus("Undoする履歴がありません"); return; }
        var last = editHistory.pop();
        if (last.type === 'grid') { collisionGrid = last.prev; }
        else if (last.type === 'triggers') { triggers.pop(); }
        updateEditorStatus("直前の編集を取り消しました");
        editStep = 0; currentHoverTile = null;
    });

    document.getElementById('btn-editor-export').addEventListener('click', showExportModal);
    document.getElementById('btn-close-export').addEventListener('click', function() { document.getElementById('export-modal').style.display = 'none'; });
    var btnCopy = document.getElementById('btn-copy-export');
    btnCopy.addEventListener('click', function() {
        var textarea = document.getElementById('export-textarea');
        textarea.select();
        try { document.execCommand('copy'); btnCopy.innerText = "コピー完了!"; setTimeout(function(){ btnCopy.innerText = "コピーする"; }, 2000); }
        catch(err) { alert("コピーに失敗しました。手動でコピーしてください。"); }
    });
}


function updateEditorStatus(msg) { document.getElementById('editor-status').innerText = msg; }
function copyGrid() { var arr = []; for (var y = 0; y < MAP_HEIGHT; y++) arr.push(collisionGrid[y].slice()); return arr; }

function handleEditorTap(tx, ty) {
    if (editTarget === 'blockedPoints') {
        editHistory.push({ type: 'grid', prev: copyGrid() });
        collisionGrid[ty][tx] = 2; 
        updateEditorStatus("Point追加: (" + tx + ", " + ty + ")");
        return;
    }
    if (editStep === 0) {
        editStartX = tx; editStartY = ty; editStep = 1; currentHoverTile = { x: tx, y: ty };
        updateEditorStatus("終点をタップしてください");
    } else if (editStep === 1) {
        var minX = Math.min(editStartX, tx); var minY = Math.min(editStartY, ty);
        var w = Math.max(editStartX, tx) - minX + 1; var h = Math.max(editStartY, ty) - minY + 1;
        var newRect = { x: minX, y: minY, w: w, h: h };

        if (editTarget === 'passableRects' || editTarget === 'blockedRects') {
            editHistory.push({ type: 'grid', prev: copyGrid() });
            var val = (editTarget === 'passableRects') ? 1 : 2;
            for (var cy = minY; cy < minY + h; cy++) {
                for (var cx = minX; cx < minX + w; cx++) {
                    if (cx >= 0 && cx < MAP_WIDTH && cy >= 0 && cy < MAP_HEIGHT) collisionGrid[cy][cx] = val;
                }
            }
        } else if (editTarget === 'triggers') {
            for (var i = triggers.length - 1; i >= 0; i--) {
                if (triggers[i].area.x === minX && triggers[i].area.y === minY && triggers[i].area.w === w && triggers[i].area.h === h) triggers.splice(i, 1);
            }
            var tType = document.getElementById('trigger-type').value;
            var tId = document.getElementById('trigger-id').value;
            var tText = document.getElementById('trigger-text').value;
            var tTarget = document.getElementById('trigger-target').value;
            triggers.push({ id: tId, label: "新規トリガー", actionLabel: "調べる", area: newRect, type: tType, target: tTarget, text: tText });
            editHistory.push({ type: 'triggers' });
        }
        editStep = 0; currentHoverTile = null; updateEditorStatus("追加完了。次の始点をタップ");
    }
}

function gridToRects(targetValue) {
    var rects = []; var visited = [];
    for (var y = 0; y < MAP_HEIGHT; y++) { var row = []; for (var x = 0; x < MAP_WIDTH; x++) row.push(false); visited.push(row); }
    for (var y = 0; y < MAP_HEIGHT; y++) {
        for (var x = 0; x < MAP_WIDTH; x++) {
            if (collisionGrid[y][x] === targetValue && !visited[y][x]) {
                var w = 0; while (x + w < MAP_WIDTH && collisionGrid[y][x + w] === targetValue && !visited[y][x + w]) w++;
                var h = 1; var canExpand = true;
                while (y + h < MAP_HEIGHT && canExpand) {
                    for (var i = 0; i < w; i++) if (collisionGrid[y + h][x + i] !== targetValue || visited[y + h][x + i]) { canExpand = false; break; }
                    if (canExpand) h++;
                }
                for (var dy = 0; dy < h; dy++) for (var dx = 0; dx < w; dx++) visited[y + dy][x + dx] = true;
                rects.push({ x: x, y: y, w: w, h: h });
            }
        }
    }
    return rects;
}

function showExportModal() {
    var pRects = gridToRects(1); var bAll = gridToRects(2);
    var newBlockedRects = []; var newBlockedPoints = [];
    for(var i=0; i<bAll.length; i++) {
        if(bAll[i].w === 1 && bAll[i].h === 1) newBlockedPoints.push({ x: bAll[i].x, y: bAll[i].y });
        else newBlockedRects.push(bAll[i]);
    }
    var str = "// data/station-plaza.js に貼り付けるエクスポート\n\nvar passableRects = [\n";
    for(var i=0; i<pRects.length; i++) { str += "    { x: " + pRects[i].x + ", y: " + pRects[i].y + ", w: " + pRects[i].w + ", h: " + pRects[i].h + " }"; if(i < pRects.length - 1) str += ","; str += "\n"; }
    str += "];\n\nvar blockedRects = [\n";
    for(var i=0; i<newBlockedRects.length; i++) { str += "    { x: " + newBlockedRects[i].x + ", y: " + newBlockedRects[i].y + ", w: " + newBlockedRects[i].w + ", h: " + newBlockedRects[i].h + " }"; if(i < newBlockedRects.length - 1) str += ","; str += "\n"; }
    str += "];\n\nvar blockedPoints = [\n";
    for(var i=0; i<newBlockedPoints.length; i++) { str += "    { x: " + newBlockedPoints[i].x + ", y: " + newBlockedPoints[i].y + " }"; if(i < newBlockedPoints.length - 1) str += ","; str += "\n"; }
    str += "];\n\nvar triggers = [\n";
    for(var i=0; i<triggers.length; i++) {
        var t = triggers[i];
        str += "    {\n        id: \"" + t.id + "\", label: \"" + (t.label||"") + "\", actionLabel: \"" + (t.actionLabel||"調べる") + "\",\n";
        str += "        area: { x: " + t.area.x + ", y: " + t.area.y + ", w: " + t.area.w + ", h: " + t.area.h + " },\n";
        str += "        type: \"" + t.type + "\",\n"; if (t.target) str += "        target: \"" + t.target + "\",\n"; str += "        text: \"" + t.text + "\"\n    }";
        if(i < triggers.length - 1) str += ","; str += "\n";
    }
    str += "\n];\n\nvar areaZones = [\n";
    for(var i=0; i<areaZones.length; i++) {
        var z = areaZones[i];
        str += "    {\n        id: \"" + z.id + "\", title: \"" + z.title + "\", subtitle: \"" + z.subtitle + "\",\n";
        str += "        area: { x: " + z.area.x + ", y: " + z.area.y + ", w: " + z.area.w + ", h: " + z.area.h + " }\n    }";
        if(i < areaZones.length - 1) str += ","; str += "\n";
    }
    str += "\n];\n";
    document.getElementById('export-textarea').value = str; document.getElementById('export-modal').style.display = 'flex';
}

// ==========================================
// 6. メインループと更新・判定
// ==========================================
function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

function update() {
    if (isMessageOpen || currentScene !== 'station_plaza' || isEditMode) {
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
    var hintEl = document.getElementById('interaction-hint');
    var btnAction = document.getElementById('btn-action');

    if (isEditMode || currentScene !== 'station_plaza') {
        hintEl.classList.remove('visible');
        btnAction.innerText = "調べる";
        return;
    }

    var t = getNearbyTrigger();
    if (t) {
        document.getElementById('interaction-label').innerText = t.label || "";
        document.getElementById('interaction-action').innerText = t.actionLabel || "調べる";
        hintEl.classList.add('visible');
        btnAction.innerText = t.actionLabel || "調べる";
    } else {
        hintEl.classList.remove('visible');
        btnAction.innerText = "調べる";
    }
}

function updateCurrentArea() {
    if (currentScene !== 'station_plaza') return;

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
    var sceneNameMap = { 'station_plaza': '駅前広場' };
    if (DESTINATIONS[currentScene]) sceneNameMap[currentScene] = DESTINATIONS[currentScene].title;
    document.getElementById('scene-name').innerText = sceneNameMap[currentScene] || currentScene;
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

// ★ RPG共通メニューの生成と遷移
window.changeScene = function(sceneId) {
    currentScene = sceneId;
    updateUI();

    var sceneContainer = document.getElementById('scene-container');
    document.getElementById('area-title').classList.remove('visible');
    document.getElementById('interaction-hint').classList.remove('visible');
    var btnAction = document.getElementById('btn-action');
    if (btnAction) {
        btnAction.innerText = "調べる";
    }

    if (sceneId === 'station_plaza') {
        resetDestinationState();
        closeDestinationScene();
        clearDpadInput();
        updateControlVisibility();
        return;
    }

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
    html += '<button class="rpg-menu-item rpg-back" onclick="changeScene(\'station_plaza\')">駅前へ戻る</button>';
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
    var html = '<div class="rpg-window">';
    html += '<div class="rpg-window-header">';
    html += '<div class="rpg-title">' + dest.title + '</div>';
    if (dest.subtitle) html += '<div class="rpg-subtitle">' + dest.subtitle + '</div>';
    html += '</div>';

    if (dest.menuTitle) html += '<div class="rpg-menu-title">' + dest.menuTitle + '</div>';

    html += '<div class="rpg-menu-list">';
    var menuItems = getDestinationMenuItems(dest);
    for (var i = 0; i < menuItems.length; i++) {
        var item = menuItems[i];
        var btnClass = 'rpg-menu-item';
        
        if (item.kind === 'back') {
            btnClass += ' rpg-back';
            html += '<button class="' + btnClass + '" onclick="changeScene(\'station_plaza\')">' + item.label + '</button>';
        } else {
            var label = item.label;
            // 生成済みのメニュー配列を直接渡すことで、
            // works.jsの並びと表示内容を必ず一致させる。
            html += '<button class="' + btnClass + '" onclick="handleDestinationMenuItem(\'' + dest.id + '\', ' + i + ')">' + label + '</button>';
        }
    }
    html += '</div></div>';

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
    html += '<button class="rpg-menu-item rpg-back" onclick="changeScene(\'station_plaza\')">駅前へ戻る</button>';
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
    html += '<button class="shinpo-rack-back" type="button" onclick="changeScene(\'station_plaza\')">駅前へ戻る</button>';
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
            work && work.emptyText ? work.emptyText : "この作品は、まだ準備中です。"
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

    currentWorkId = work.id || null;
    currentFrameSourceUrl = "";
    workPlayerReturnDestinationId = currentDestinationId;
    isWorkPlayerOpen = true;

    // 作品ごとに見せ方を選べるよう、フレームのモードをデータとして保持する。
    // 現在は standard が基本。将来、らくがきだけ控えめな soft 表示にもできる。
    playerLayer.dataset.frameMode = work.frameMode || "standard";

    // 縦長ゲームは、iPadやPCでもiPhone相当の画面として中央に置く。
    // 触れるらくがきは playerLayout 未指定のまま、従来どおり画面全体を使う。
    setWorkPlayerLayout(work, playerLayer);

    title.innerText = getWorkPlayerFrameTitle(work);
    frame.title = work.title || "町内コンテンツ";

    // itch.ioの埋め込みゲームでも、音・全画面・ゲームパッド利用を許可する。
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
        closeButton.setAttribute("aria-label", destinationLabel + "へ戻る");
    }

    setWorkPlayerLoading(true, getWorkOpeningLabel(work));
    frame.src = source;

    playerLayer.classList.add("visible");
    playerLayer.setAttribute("aria-hidden", "false");

    // 上部バーの高さを含めた実際の余白が確定してから、ゲーム画面をフィットさせる。
    window.requestAnimationFrame(updateWorkPlayerLayoutSize);

    clearDpadInput();
    updateControlVisibility();
};

window.closeWorkPlayer = function() {
    if (!isWorkPlayerOpen) return;

    var playerLayer = document.getElementById("work-player");
    var frame = document.getElementById("work-player-frame");

    setWorkPlayerLoading(false);

    if (frame) {
        // iframe を空ページへ戻して、作品側のアニメーション・音・入力を確実に止める。
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

    if (workPlayerReturnDestinationId && DESTINATIONS[workPlayerReturnDestinationId]) {
        currentDestinationId = workPlayerReturnDestinationId;
        destinationViewMode = "menu";
        currentDestinationMessage = "";
        currentDestinationMessageTitle = "";
        renderDestination();
    }

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
        changeScene('station_plaza');
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
            showDestinationMessage(item.label, item.emptyText || "まだ準備中です。");
        }
        return;
    }

    if (item.kind === 'back') {
        changeScene('station_plaza');
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

    if (bgLoaded) ctx.drawImage(bgImage, 0, 0, cam.mapPixelW, cam.mapPixelH);
    else { ctx.fillStyle = '#b0a080'; ctx.fillRect(0, 0, cam.mapPixelW, cam.mapPixelH); }

    if (tapMarkerTimer > 0 && tapMarkerPos && !isEditMode && !debugMode) {
        ctx.beginPath();
        ctx.arc(tapMarkerPos.x * TILE_SIZE + TILE_SIZE / 2, tapMarkerPos.y * TILE_SIZE + TILE_SIZE / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + (tapMarkerTimer / 60) + ")";
        ctx.fill();
    }

    if (debugMode || isEditMode) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 1;
        for (var x = 0; x <= cam.mapPixelW; x += TILE_SIZE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cam.mapPixelH); ctx.stroke(); }
        for (var y = 0; y <= cam.mapPixelH; y += TILE_SIZE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cam.mapPixelW, y); ctx.stroke(); }

        ctx.fillStyle = 'rgba(0, 120, 255, 0.25)';
        for (var y = 0; y < MAP_HEIGHT; y++) {
            for (var x = 0; x < MAP_WIDTH; x++) { if (collisionGrid[y][x] === 1) ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE); }
        }
        ctx.fillStyle = 'rgba(255, 0, 0, 0.35)';
        for (var y = 0; y < MAP_HEIGHT; y++) {
            for (var x = 0; x < MAP_WIDTH; x++) { if (collisionGrid[y][x] === 2) ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE); }
        }

        ctx.fillStyle = 'rgba(255, 230, 0, 0.45)';
        for (var k = 0; k < triggers.length; k++) ctx.fillRect(triggers[k].area.x * TILE_SIZE, triggers[k].area.y * TILE_SIZE, triggers[k].area.w * TILE_SIZE, triggers[k].area.h * TILE_SIZE);

        for (var a = 0; a < areaZones.length; a++) {
            var z = areaZones[a].area;
            ctx.fillStyle = 'rgba(180, 80, 255, 0.20)'; ctx.fillRect(z.x * TILE_SIZE, z.y * TILE_SIZE, z.w * TILE_SIZE, z.h * TILE_SIZE);
            ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.fillText(areaZones[a].title, z.x * TILE_SIZE + 2, z.y * TILE_SIZE + 10);
        }

        if (isEditMode) {
            if (editStep === 1 && currentHoverTile) {
                var minX = Math.min(editStartX, currentHoverTile.x); var minY = Math.min(editStartY, currentHoverTile.y);
                var w = Math.max(editStartX, currentHoverTile.x) - minX + 1; var h = Math.max(editStartY, currentHoverTile.y) - minY + 1;
                ctx.fillStyle = 'rgba(0, 255, 255, 0.4)'; ctx.fillRect(minX * TILE_SIZE, minY * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
            }
            if (currentHoverTile && editStep === 0 && editTarget === 'blockedPoints') {
                ctx.fillStyle = 'rgba(255, 165, 0, 0.7)'; ctx.fillRect(currentHoverTile.x * TILE_SIZE, currentHoverTile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (editStep === 1) {
                ctx.fillStyle = 'rgba(255, 165, 0, 0.7)'; ctx.fillRect(editStartX * TILE_SIZE, editStartY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        } else if (currentHoverTile) {
            ctx.fillStyle = 'rgba(255, 165, 0, 0.7)'; ctx.fillRect(currentHoverTile.x * TILE_SIZE, currentHoverTile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    if (currentScene === 'station_plaza') {
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
