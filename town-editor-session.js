// One Editor session. Canonical definitions are inputs, never write targets.
(function (root) {
    'use strict';
    var session = null;
    var generation = 0;
    var historyFields = ['props', 'triggers', 'areaZones', 'fixedCollisionGrid'];
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function freeze(value) {
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            Object.keys(value).forEach(function (key) { freeze(value[key]); });
            Object.freeze(value);
        }
        return value;
    }
    function stable(value) {
        if (Array.isArray(value)) return value.map(stable);
        if (value && typeof value === 'object') {
            var result = Object.create(null);
            Object.keys(value).sort().forEach(function (key) { result[key] = stable(value[key]); });
            return result;
        }
        return value;
    }
    function same(a, b) { return JSON.stringify(stable(a)) === JSON.stringify(stable(b)); }
    function gridFromScene(scene) {
        var grid = [];
        for (var y = 0; y < scene.mapHeight; y++) grid.push(Array(scene.mapWidth).fill(0));
        ['passableRects', 'blockedRects'].forEach(function (key, i) {
            scene[key].forEach(function (r) {
                for (var y = r.y; y < r.y + r.h; y++) {
                    for (var x = r.x; x < r.x + r.w; x++) grid[y][x] = i + 1;
                }
            });
        });
        scene.blockedPoints.forEach(function (p) { grid[p.y][p.x] = 2; });
        return grid;
    }
    function makeDraft(baseline) {
        var draft = clone(baseline);
        delete draft.passableRects;
        delete draft.blockedRects;
        delete draft.blockedPoints;
        draft.fixedCollisionGrid = gridFromScene(baseline);
        return draft;
    }
    function open(sceneId) {
        if (session) {
            if (session.sceneId !== sceneId) throw new Error('Editor session belongs to another scene');
            return session;
        }
        var canonical = root.getTownSceneDefinition(sceneId);
        var check = root.validateTownSceneDefinition(sceneId, canonical, root.TOWN_SCENE_MAPS);
        if (!check.ok) throw new Error(check.errors.join('; '));
        freeze(canonical);
        session = { sceneId: sceneId, baseline: freeze(clone(canonical)), draft: makeDraft(canonical), history: [] };
        generation++;
        // The baseline reference, as well as its contents, is immutable.
        Object.defineProperty(session, 'baseline', { writable: false, configurable: false });
        return session;
    }
    function snapshot() {
        if (!session) throw new Error('No Editor session');
        var result = clone(session.draft);
        var grid = session.draft.fixedCollisionGrid;
        if (!Array.isArray(grid) || grid.length !== result.mapHeight || grid.some(function (row) {
            return !Array.isArray(row) || row.length !== result.mapWidth || row.some(function (cell) {
                return cell !== 0 && cell !== 1 && cell !== 2;
            });
        })) throw new Error('Invalid Editor fixed collision grid');
        delete result.fixedCollisionGrid;
        var unchanged = same(session.draft.fixedCollisionGrid, gridFromScene(session.baseline));
        // Grid serialization cannot safely assign future rectangle annotations
        // to newly split/merged rectangles. Never silently discard such fields.
        if (!unchanged) {
            ['passableRects', 'blockedRects', 'blockedPoints'].forEach(function (key) {
                var fields = key === 'blockedPoints' ? ['x', 'y'] : ['x', 'y', 'w', 'h'];
                if (session.baseline[key].some(function (entry) {
                    return Object.keys(entry).some(function (field) { return fields.indexOf(field) === -1; });
                })) throw new Error('Fixed collision metadata needs an explicit serialization rule: ' + key);
            });
        }
        var collision = unchanged ? session.baseline : root.getEditorCollisionData(session.draft.fixedCollisionGrid);
        ['passableRects', 'blockedRects', 'blockedPoints'].forEach(function (key) { result[key] = clone(collision[key]); });
        return result;
    }
    function comparable(scene) {
        var result = clone(scene);
        ['props', 'triggers'].forEach(function (key) {
            result[key].sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
        });
        return result;
    }
    function isDirty() { return !!session && !same(comparable(makeDraft(session.baseline)), comparable(session.draft)); }
    function discard() {
        if (session) {
            session.draft = makeDraft(session.baseline);
            session.history.length = 0;
            generation++; // Invalidate an unfinished gesture captured before discard.
        }
        return session;
    }
    // History contains authored draft data only, never baseline or runtime views.
    function captureHistory() {
        if (!session) throw new Error('No Editor session');
        var state = {};
        historyFields.forEach(function (key) { state[key] = clone(session.draft[key]); });
        return freeze({ generation: generation, state: state });
    }
    function recordHistory(before) {
        if (!session) throw new Error('No Editor session');
        var entry = before || captureHistory();
        if (entry.generation !== generation) throw new Error('Stale Editor history snapshot');
        session.history.push(entry);
    }
    function undo() {
        if (!session || !session.history.length) return false;
        var entry = session.history[session.history.length - 1];
        if (entry.generation !== generation) throw new Error('Stale Editor history snapshot');
        var restored = clone(entry.state);
        historyFields.forEach(function (key) { session.draft[key] = restored[key]; });
        session.history.pop();
        return true;
    }
    root.YUMANIWA_EDITOR_SESSION = {
        current: function () { return session; }, open: open, discard: discard,
        end: function () { if (isDirty()) throw new Error('Discard changes before ending Editor session'); if (session) session.history.length = 0; session = null; },
        canLeave: function (sceneId) { return !session || session.sceneId === sceneId || !isDirty(); },
        captureHistory: captureHistory, recordHistory: recordHistory, undo: undo,
        snapshot: snapshot, isDirty: isDirty, clone: clone, same: same, freeze: freeze, gridFromScene: gridFromScene
    };
})(window);
