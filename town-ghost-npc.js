// ==========================================
// 湯間庭町 / 駅前のおばけNPC
// ベンチ横に常駐し、町とプレイヤーの足取りを少しだけ覚えている。
// ==========================================
(function () {
    'use strict';

    var maps = window.TOWN_SCENE_MAPS;
    var station = maps && maps.station_plaza;
    if (!station) return;

    var TRIGGER_ID = 'station_ghost_npc_trigger';
    var PROP_ID = 'station_ghost_npc';
    var NPC_ID = 'ghost';
    var memory = window.YumaniwaMemory || null;
    var dialogue = window.GHOST_DIALOGUE || {};
    var lastLine = '';

    function pickLine(lines) {
        var pool = Array.isArray(lines) ? lines.filter(function (line) {
            return typeof line === 'string' && line.trim();
        }) : [];

        if (!pool.length) return '今日は静かだね。';
        if (pool.length === 1) {
            lastLine = pool[0];
            return pool[0];
        }

        var candidates = pool.filter(function (line) { return line !== lastLine; });
        if (!candidates.length) candidates = pool;
        var chosen = candidates[Math.floor(Math.random() * candidates.length)];
        lastLine = chosen;
        return chosen;
    }

    function pickRecentWorkLine() {
        if (!memory || typeof memory.getRecentWorkCandidates !== 'function') return null;
        var candidates = memory.getRecentWorkCandidates(7).filter(function (item) {
            if (!item || !dialogue.works || !dialogue.works[item.id]) return false;
            if (item.mentionDaysAgo !== null && item.mentionDaysAgo < 3) return false;
            if (memory.topicRecentlyUsed(NPC_ID, 'work:' + item.id)) return false;
            return true;
        });

        if (!candidates.length) return null;

        // 最近の足取りを優先しつつ、同じ作品ばかりにならないよう上位3件から選ぶ。
        var shortList = candidates.slice(0, 3);
        var selected = shortList[Math.floor(Math.random() * shortList.length)];
        return {
            workId: selected.id,
            topic: 'work:' + selected.id,
            line: pickLine(dialogue.works[selected.id])
        };
    }

    function getTalkMode(topic) {
        if (topic === 'first_meet') return 'first_meet';
        if (topic === 'ambient') return 'ambient';
        if (topic === 'same_day') return 'same_day';
        if (topic === 'familiar' || topic === 'regular') return 'relationship';
        return 'memory';
    }

    function getMemoryKind(topic) {
        if (topic === 'feedback_box') return 'feedback_box';
        if (topic === 'long_absence') return 'long_absence';
        if (topic === 'familiar' || topic === 'regular') return 'relationship';
        if (String(topic || '').indexOf('work:') === 0) return 'work';
        return '';
    }

    function trackGhostTalk(topic, mentionedWorkId) {
        if (typeof window.trackYumaniwaEvent !== 'function') return;

        var relationship = 'stranger';
        if (memory && typeof memory.relationshipStage === 'function') {
            relationship = memory.relationshipStage(NPC_ID);
        }

        var mode = getTalkMode(topic);
        var memoryKind = getMemoryKind(topic);

        window.trackYumaniwaEvent('Ghost Talk', {
            scene: 'station_plaza',
            mode: mode,
            relationship: relationship
        });

        // 記憶が会話へにじんだ時だけ別イベントにする。
        // 台詞本文や個人識別情報は送らない。
        if (memoryKind) {
            var props = {
                kind: memoryKind,
                relationship: relationship
            };
            if (memoryKind === 'work' && mentionedWorkId) {
                props.work = mentionedWorkId;
            }
            window.trackYumaniwaEvent('Ghost Memory Reaction', props);
        }
    }

    function chooseGhostLine() {
        // 記憶機能が読めない環境でも、NPC自体は従来どおり使える。
        if (!memory) {
            var fallbackLine = pickLine(dialogue.firstMeet || ['最近、赤い箱が置かれたんだけど、なんだろう…']);
            if (typeof window.trackYumaniwaEvent === 'function') {
                window.trackYumaniwaEvent('Ghost Talk', {
                    scene: 'station_plaza',
                    mode: 'fallback',
                    relationship: 'unknown'
                });
            }
            return fallbackLine;
        }

        var today = memory.today();
        var before = memory.getNpcSnapshot(NPC_ID);
        var metDays = Number(before.metDays || 0);
        var isFirstMeet = metDays === 0;
        var metToday = before.lastMetDay === today;
        var daysAway = before.lastMetDay ? memory.daysSince(before.lastMetDay) : null;
        var topic = 'ambient';
        var line = '';
        var mentionedWorkId = null;

        // 初対面より先に赤い箱を見つけた人には、その事実だけを静かに拾う。
        if (isFirstMeet) {
            if (memory.hasFlag('feedbackBoxSeen')) {
                topic = 'feedback_box';
                line = pickLine(dialogue.firstMeetAfterFeedback || dialogue.events && dialogue.events.feedbackBox);
                memory.consumeNpcEvent(NPC_ID, 'feedbackBoxSeen');
            } else {
                topic = 'first_meet';
                line = pickLine(dialogue.firstMeet);
            }
        }
        // 初対面の「赤い箱」が後からつながる、v1の最初の記憶イベント。
        else if (
            memory.hasFlag('feedbackBoxSeen') &&
            !memory.isNpcEventConsumed(NPC_ID, 'feedbackBoxSeen')
        ) {
            topic = 'feedback_box';
            line = pickLine(dialogue.events && dialogue.events.feedbackBox);
            memory.consumeNpcEvent(NPC_ID, 'feedbackBoxSeen');
        }
        // 来なかったことは責めず、久しぶりという事実だけを返す。
        else if (!metToday && daysAway !== null && daysAway >= 7) {
            topic = 'long_absence';
            line = pickLine(dialogue.longAbsence);
        }
        else {
            // 同日連打で関係が進まないことを、軽い一言で自然に見せる。
            if (metToday && Math.random() < 0.55) {
                topic = 'same_day';
                line = pickLine(dialogue.sameDay);
            }

            // 記憶は毎回見せない。知っていても黙っている余白を残す。
            if (!line && Math.random() < 0.33) {
                var workLine = pickRecentWorkLine();
                if (workLine) {
                    topic = workLine.topic;
                    line = workLine.line;
                    mentionedWorkId = workLine.workId;
                }
            }

            // 別日に会った時だけ、ときどき距離の変化を感じる言葉を混ぜる。
            if (!line && !metToday && Math.random() < 0.35) {
                var effectiveMetDays = metDays + 1;
                var stage = memory.relationshipStage(NPC_ID, effectiveMetDays);
                if (stage === 'regular') {
                    topic = 'regular';
                    line = pickLine(dialogue.regular);
                } else if (stage === 'familiar') {
                    topic = 'familiar';
                    line = pickLine(dialogue.familiar);
                }
            }

            // 普段はただ町のことを話す。記憶を毎回証明しない。
            if (!line) {
                topic = 'ambient';
                line = pickLine(dialogue.ambient);
            }
        }

        memory.recordNpcMeet(NPC_ID);
        memory.pushNpcTopic(NPC_ID, topic);
        if (mentionedWorkId) memory.markWorkMention(NPC_ID, mentionedWorkId);
        trackGhostTalk(topic, mentionedWorkId);

        return line || '今日は静かだね。';
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

    // 右側ベンチの横。配置値はEditor/Deskが直接読めるliteralを正本とする。
    var trigger = {
        id: 'station_ghost_npc_trigger',
        label: '？？？',
        actionLabel: '話す',
        type: 'inspect',
        text: '……',
        area: { x: 20, y: 8, w: 2, h: 2 },
        tapPadding: 0
    };

    var prop = {
        id: 'station_ghost_npc',
        objectId: 'station_ghost_npc_01',
        x: 19.54375,
        y: 7.6375,
        w: 2.3125,
        h: 2.3125,
        footY: 9.95,
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
            triggerId: 'station_ghost_npc_trigger',
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

    // inspect の既存処理は変えず、このNPCだけ話しかける直前に会話を決める。
    var baseActivateTownTrigger = window.activateTownTrigger;
    if (typeof baseActivateTownTrigger === 'function') {
        window.activateTownTrigger = function (targetTrigger) {
            if (targetTrigger && targetTrigger.id === TRIGGER_ID) {
                // A conversation is a transient activation payload, not scene data.
                var args = Array.prototype.slice.call(arguments);
                args[0] = Object.assign({}, targetTrigger, { text: chooseGhostLine() });
                return baseActivateTownTrigger.apply(this, args);
            }
            return baseActivateTownTrigger.apply(this, arguments);
        };
    }

    // 浮遊は配置座標を書き換えず、描画時のオフセットだけで表現する。
    // これによりEditorの y / footY とdiff baselineは常にcanonical値のまま。
    var FLOAT_AMPLITUDE_TILES = 1.25 / 16;
    var FLOAT_PERIOD_MS = 2600;
    var startTime = (window.performance && performance.now) ? performance.now() : Date.now();

    window.YUMANIWA_TOWN_PROP_RENDER_OFFSETS =
        window.YUMANIWA_TOWN_PROP_RENDER_OFFSETS || {};

    window.YUMANIWA_TOWN_PROP_RENDER_OFFSETS[PROP_ID] = function () {
        if (window.isEditMode || window.debugMode) return 0;

        var currentTime = (window.performance && performance.now)
            ? performance.now()
            : Date.now();
        var phase = ((currentTime - startTime) % FLOAT_PERIOD_MS) / FLOAT_PERIOD_MS;
        return Math.sin(phase * Math.PI * 2) * FLOAT_AMPLITUDE_TILES;
    };
})();