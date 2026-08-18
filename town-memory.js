// ==========================================
// 湯間庭町 / 記憶システム v1
// 町での足取りを端末内だけに保存する。
// 数字はUIに出さず、NPCの会話などから少しだけにじませる。
// ==========================================
(function () {
    'use strict';

    var STORAGE_KEY = 'yumaniwa_town_memory_v1';
    var VERSION = 1;
    var MAX_VISIT_DAYS = 30;
    var MAX_NPC_DAYS = 30;
    var MAX_RECENT_TOPICS = 3;

    function todayKey() {
        var now = new Date();
        var y = now.getFullYear();
        var m = String(now.getMonth() + 1).padStart(2, '0');
        var d = String(now.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    function dayNumber(key) {
        if (!key || typeof key !== 'string') return null;
        var parts = key.split('-').map(Number);
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
        return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
    }

    function daysBetween(fromKey, toKey) {
        var a = dayNumber(fromKey);
        var b = dayNumber(toKey || todayKey());
        if (a === null || b === null) return null;
        return Math.max(0, b - a);
    }

    function defaultNpcState() {
        return {
            firstMetDay: null,
            lastMetDay: null,
            metDays: 0,
            recentMetDays: [],
            recentTopics: [],
            consumedEvents: {},
            workMentions: {}
        };
    }

    function defaultState() {
        return {
            version: VERSION,
            town: {
                firstVisitDay: null,
                lastVisitDay: null,
                visitDays: 0,
                recentVisitDays: [],
                flags: {
                    feedbackBoxSeen: false,
                    updateHistorySeen: false
                }
            },
            works: {},
            npcs: {
                ghost: defaultNpcState()
            }
        };
    }

    function normalizeState(raw) {
        var state = raw && typeof raw === 'object' ? raw : defaultState();
        state.version = VERSION;
        state.town = state.town && typeof state.town === 'object' ? state.town : defaultState().town;
        state.town.recentVisitDays = Array.isArray(state.town.recentVisitDays) ? state.town.recentVisitDays : [];
        state.town.flags = state.town.flags && typeof state.town.flags === 'object' ? state.town.flags : {};
        if (typeof state.town.flags.feedbackBoxSeen !== 'boolean') state.town.flags.feedbackBoxSeen = false;
        if (typeof state.town.flags.updateHistorySeen !== 'boolean') state.town.flags.updateHistorySeen = false;
        state.works = state.works && typeof state.works === 'object' ? state.works : {};
        state.npcs = state.npcs && typeof state.npcs === 'object' ? state.npcs : {};

        if (!state.npcs.ghost || typeof state.npcs.ghost !== 'object') {
            state.npcs.ghost = defaultNpcState();
        }

        Object.keys(state.npcs).forEach(function (npcId) {
            var npc = state.npcs[npcId];
            var base = defaultNpcState();
            Object.keys(base).forEach(function (key) {
                if (typeof npc[key] === 'undefined' || npc[key] === null) npc[key] = base[key];
            });
            npc.recentMetDays = Array.isArray(npc.recentMetDays) ? npc.recentMetDays : [];
            npc.recentTopics = Array.isArray(npc.recentTopics) ? npc.recentTopics : [];
            npc.consumedEvents = npc.consumedEvents && typeof npc.consumedEvents === 'object' ? npc.consumedEvents : {};
            npc.workMentions = npc.workMentions && typeof npc.workMentions === 'object' ? npc.workMentions : {};
        });

        return state;
    }

    function loadState() {
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            return normalizeState(raw ? JSON.parse(raw) : defaultState());
        } catch (err) {
            return defaultState();
        }
    }

    var state = loadState();

    function saveState() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            return true;
        } catch (err) {
            return false;
        }
    }

    function clone(value) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (err) {
            return value;
        }
    }

    function uniquePush(list, value, limit) {
        var out = Array.isArray(list) ? list.filter(function (item) { return item !== value; }) : [];
        out.push(value);
        if (out.length > limit) out = out.slice(out.length - limit);
        return out;
    }

    function ensureNpc(npcId) {
        if (!state.npcs[npcId]) state.npcs[npcId] = defaultNpcState();
        return state.npcs[npcId];
    }

    function registerTownVisit() {
        var today = todayKey();
        var town = state.town;
        if (!town.firstVisitDay) town.firstVisitDay = today;
        if (town.recentVisitDays.indexOf(today) === -1) {
            town.visitDays = Number(town.visitDays || 0) + 1;
            town.recentVisitDays = uniquePush(town.recentVisitDays, today, MAX_VISIT_DAYS);
        }
        town.lastVisitDay = today;
        saveState();
    }

    function recordFlag(flagName, value) {
        state.town.flags[flagName] = value !== false;
        saveState();
    }

    function hasFlag(flagName) {
        return !!state.town.flags[flagName];
    }

    function recordWorkOpen(workId) {
        if (!workId) return;
        var today = todayKey();
        var item = state.works[workId] || {
            opened: 0,
            firstOpenedDay: today,
            lastOpenedDay: today
        };
        item.opened = Number(item.opened || 0) + 1;
        if (!item.firstOpenedDay) item.firstOpenedDay = today;
        item.lastOpenedDay = today;
        state.works[workId] = item;
        saveState();
    }

    function recordNpcMeet(npcId) {
        var today = todayKey();
        var npc = ensureNpc(npcId);
        if (!npc.firstMetDay) npc.firstMetDay = today;
        if (npc.recentMetDays.indexOf(today) === -1) {
            npc.metDays = Number(npc.metDays || 0) + 1;
            npc.recentMetDays = uniquePush(npc.recentMetDays, today, MAX_NPC_DAYS);
        }
        npc.lastMetDay = today;
        saveState();
        return clone(npc);
    }

    function pushNpcTopic(npcId, topic) {
        if (!topic) return;
        var npc = ensureNpc(npcId);
        npc.recentTopics = uniquePush(npc.recentTopics, topic, MAX_RECENT_TOPICS);
        saveState();
    }

    function topicRecentlyUsed(npcId, topic) {
        var npc = ensureNpc(npcId);
        return npc.recentTopics.indexOf(topic) !== -1;
    }

    function consumeNpcEvent(npcId, eventId) {
        if (!eventId) return;
        var npc = ensureNpc(npcId);
        npc.consumedEvents[eventId] = todayKey();
        saveState();
    }

    function isNpcEventConsumed(npcId, eventId) {
        var npc = ensureNpc(npcId);
        return !!npc.consumedEvents[eventId];
    }

    function markWorkMention(npcId, workId) {
        if (!workId) return;
        var npc = ensureNpc(npcId);
        npc.workMentions[workId] = todayKey();
        saveState();
    }

    function getRecentWorkCandidates(maxAgeDays) {
        var ageLimit = typeof maxAgeDays === 'number' ? maxAgeDays : 7;
        var npc = ensureNpc('ghost');
        var items = [];

        Object.keys(state.works).forEach(function (workId) {
            var work = state.works[workId];
            var age = daysBetween(work.lastOpenedDay, todayKey());
            if (age === null || age > ageLimit) return;
            var mentionDay = npc.workMentions[workId] || null;
            items.push({
                id: workId,
                opened: Number(work.opened || 0),
                lastOpenedDay: work.lastOpenedDay,
                daysAgo: age,
                lastMentionDay: mentionDay,
                mentionDaysAgo: mentionDay ? daysBetween(mentionDay, todayKey()) : null
            });
        });

        items.sort(function (a, b) {
            if (a.daysAgo !== b.daysAgo) return a.daysAgo - b.daysAgo;
            return b.opened - a.opened;
        });
        return items;
    }

    function relationshipStage(npcId, effectiveMetDays) {
        var npc = ensureNpc(npcId);
        var days = typeof effectiveMetDays === 'number' ? effectiveMetDays : Number(npc.metDays || 0);
        if (days >= 5) return 'regular';
        if (days >= 2) return 'familiar';
        return 'stranger';
    }

    window.YumaniwaMemory = {
        version: VERSION,
        storageKey: STORAGE_KEY,
        today: todayKey,
        daysBetween: daysBetween,
        daysSince: function (dayKey) { return daysBetween(dayKey, todayKey()); },
        getState: function () { return clone(state); },
        getTownSnapshot: function () { return clone(state.town); },
        getNpcSnapshot: function (npcId) { return clone(ensureNpc(npcId)); },
        getWorkSnapshot: function (workId) { return clone(state.works[workId] || null); },
        registerTownVisit: registerTownVisit,
        recordFlag: recordFlag,
        hasFlag: hasFlag,
        recordWorkOpen: recordWorkOpen,
        recordNpcMeet: recordNpcMeet,
        pushNpcTopic: pushNpcTopic,
        topicRecentlyUsed: topicRecentlyUsed,
        consumeNpcEvent: consumeNpcEvent,
        isNpcEventConsumed: isNpcEventConsumed,
        markWorkMention: markWorkMention,
        getRecentWorkCandidates: getRecentWorkCandidates,
        relationshipStage: relationshipStage
    };

    // このページを開いた日を一度だけ町の訪問として残す。
    registerTownVisit();

    // 作品を町の共通プレイヤーで開いた時だけ足取りを残す。
    if (!window.__YUMANIWA_MEMORY_WORK_WRAPPED__ && typeof window.launchWork === 'function') {
        var baseLaunchWork = window.launchWork;
        window.launchWork = function (work) {
            if (work && work.id) recordWorkOpen(String(work.id));
            return baseLaunchWork.apply(this, arguments);
        };
        window.__YUMANIWA_MEMORY_WORK_WRAPPED__ = true;
    }

    // 町の小物を実際に調べた事実だけ記録する。
    if (!window.__YUMANIWA_MEMORY_TRIGGER_WRAPPED__ && typeof window.activateTownTrigger === 'function') {
        var baseActivateTownTrigger = window.activateTownTrigger;
        window.activateTownTrigger = function (trigger) {
            if (trigger && trigger.id === 'town_feedback_box_trigger') {
                recordFlag('feedbackBoxSeen', true);
            }
            if (trigger && trigger.id === 'town_update_history_sign') {
                recordFlag('updateHistorySeen', true);
            }
            return baseActivateTownTrigger.apply(this, arguments);
        };
        window.__YUMANIWA_MEMORY_TRIGGER_WRAPPED__ = true;
    }
})();
