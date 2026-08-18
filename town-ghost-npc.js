// ==========================================
// 湯間庭町 / 駅前のおばけNPC
// ベンチ横に常駐し、町のことを一言だけ話す。
// セリフは GHOST_NPC_LINES に追加するだけで増やせる。
// ==========================================
(function () {
    'use strict';

    var maps = window.TOWN_SCENE_MAPS;
    var station = maps && maps.station_plaza;
    if (!station) return;

    var TRIGGER_ID = 'station_ghost_npc_trigger';
    var PROP_ID = 'station_ghost_npc';

    // 今後ここへセリフを足していく。
    // 2件以上になったら、話しかけるたびにランダムで選ぶ。
    window.GHOST_NPC_LINES = window.GHOST_NPC_LINES || [
        '最近、赤い箱が置かれたんだけど、なんだろう…'
    ];

    var lastLineIndex = -1;

    function pickGhostLine() {
        var lines = Array.isArray(window.GHOST_NPC_LINES)
            ? window.GHOST_NPC_LINES.filter(function (line) {
                return typeof line === 'string' && line.trim();
            })
            : [];

        if (lines.length === 0) {
            return '今日は静かだね。';
        }

        if (lines.length === 1) {
            lastLineIndex = 0;
            return lines[0];
        }

        var nextIndex = Math.floor(Math.random() * lines.length);
        if (nextIndex === lastLineIndex) {
            nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (lines.length - 1))) % lines.length;
        }

        lastLineIndex = nextIndex;
        return lines[nextIndex];
    }

    function upsertById(items, item) {
        if (!Array.isArray(items) || !item || !item.id) return;

        for (var i = 0; i < items.length; i++) {
            if (items[i] && items[i].id === item.id) {
                items[i] = item;
                return;
            }
        }

        items.push(item);
    }

    // 右側ベンチの横。到着地点からは見えず、ほかの案内物とも距離がある位置。
    var baseX = 19.45;
    var baseY = 7.45;
    var propW = 2.5;
    var propH = 2.5;
    var baseFootY = baseY + propH;

    var trigger = {
        id: TRIGGER_ID,
        label: '？？？',
        actionLabel: '話す',
        type: 'inspect',
        text: pickGhostLine(),
        area: { x: 20, y: 8, w: 2, h: 2 },
        tapPadding: 0
    };

    var prop = {
        id: PROP_ID,
        src: 'assets/maps/props/station-plaza/station-ghost-npc.png?v=20260817-1',
        x: baseX,
        y: baseY,
        w: propW,
        h: propH,
        footY: baseFootY,
        enabled: true,
        collision: {
            enabled: false,
            x: 0.24,
            y: 0.72,
            w: 0.52,
            h: 0.20
        },
        interaction: {
            enabled: true,
            triggerId: TRIGGER_ID,
            x: 0.12,
            y: 0.12,
            w: 0.76,
            h: 0.78
        },
        tap: {
            enabled: true,
            x: 0.10,
            y: 0.10,
            w: 0.80,
            h: 0.82
        }
    };

    station.triggers = Array.isArray(station.triggers) ? station.triggers : [];
    station.props = Array.isArray(station.props) ? station.props : [];
    upsertById(station.triggers, trigger);
    upsertById(station.props, prop);

    // 初回表示中の駅前にも即時反映する。
    if (Array.isArray(window.triggers)) upsertById(window.triggers, trigger);
    if (Array.isArray(window.stationPlazaProps)) upsertById(window.stationPlazaProps, prop);

    if (window.activeTownSceneDef && window.currentScene === 'station_plaza') {
        window.activeTownSceneDef.triggers = Array.isArray(window.activeTownSceneDef.triggers)
            ? window.activeTownSceneDef.triggers
            : [];
        window.activeTownSceneDef.props = Array.isArray(window.activeTownSceneDef.props)
            ? window.activeTownSceneDef.props
            : [];
        upsertById(window.activeTownSceneDef.triggers, trigger);
        upsertById(window.activeTownSceneDef.props, prop);
    }

    // inspect の既存処理は変えず、このNPCだけ話しかける直前にセリフを選び直す。
    var baseActivateTownTrigger = window.activateTownTrigger;
    if (typeof baseActivateTownTrigger === 'function') {
        window.activateTownTrigger = function (targetTrigger) {
            if (targetTrigger && targetTrigger.id === TRIGGER_ID) {
                targetTrigger.text = pickGhostLine();
            }
            return baseActivateTownTrigger(targetTrigger);
        };
    }

    // ほんの少しだけ上下に浮かせる。
    // prop の座標はタイル単位なので、約1.25pxぶんだけ揺らす。
    var FLOAT_AMPLITUDE_TILES = 1.25 / 16;
    var FLOAT_PERIOD_MS = 2600;
    var startTime = (window.performance && performance.now) ? performance.now() : Date.now();

    function animateGhost(now) {
        var currentTime = typeof now === 'number' ? now : Date.now();
        var offset = 0;

        // 開発中は位置を書き出しやすいよう、基準位置で止める。
        if (!window.isEditMode && !window.debugMode) {
            var phase = ((currentTime - startTime) % FLOAT_PERIOD_MS) / FLOAT_PERIOD_MS;
            offset = Math.sin(phase * Math.PI * 2) * FLOAT_AMPLITUDE_TILES;
        }

        prop.y = baseY + offset;
        prop.footY = baseFootY + offset;

        window.requestAnimationFrame(animateGhost);
    }

    if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(animateGhost);
    }
})();
