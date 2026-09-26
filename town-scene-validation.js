// Shared persisted-data contract. Pure: no scene repair, normalization or globals read.
// Python counterpart: validate_scene_data() in tools/YumaniwaDesk.py.
(function (root) {
    'use strict';
    function record(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    function number(value) { return typeof value === 'number' && isFinite(value); }
    function integer(value) { return number(value) && Math.floor(value) === value; }
    function identifier(value) {
        return typeof value === 'string' && value.length > 0 && value.trim() === value;
    }
    function validateSceneData(scene, objects) {
        var errors = [];
        function error(path, code) { errors.push(path + ':' + code); }
        if (!record(scene)) return { ok: false, errors: ['scene:object'] };
        var width = scene.mapWidth, height = scene.mapHeight;
        if (!integer(width) || width <= 0) error('mapWidth', 'positive_integer');
        if (!integer(height) || height <= 0) error('mapHeight', 'positive_integer');
        if (errors.length) return { ok: false, errors: errors };
        function list(key) {
            if (!Array.isArray(scene[key])) { error(key, 'array'); return []; }
            return scene[key];
        }
        function rect(value, path, bounds, cells) {
            if (!record(value)) { error(path, 'rectangle'); return; }
            var keys = ['x', 'y', 'w', 'h'];
            var valid = true;
            keys.forEach(function (key) {
                if (!(cells ? integer(value[key]) : number(value[key]))) {
                    error(path + '.' + key, cells ? 'integer' : 'number'); valid = false;
                }
            });
            if (!valid) return;
            if (value.w <= 0 || value.h <= 0) error(path, 'positive_size');
            if (bounds && (value.x < 0 || value.y < 0 || value.x + value.w > width || value.y + value.h > height)) {
                error(path, 'bounds');
            }
        }
        function ids(items, name) {
            var seen = Object.create(null);
            items.forEach(function (item, i) {
                var path = name + '[' + i + ']';
                if (!record(item)) { error(path, 'object'); return; }
                if (!identifier(item.id)) { error(path + '.id', 'identifier'); return; }
                if (seen[item.id]) error(path + '.id', 'duplicate');
                seen[item.id] = true;
            });
            return seen;
        }
        ['passableRects', 'blockedRects'].forEach(function (key) {
            list(key).forEach(function (value, i) { rect(value, key + '[' + i + ']', true, true); });
        });
        list('blockedPoints').forEach(function (point, i) {
            var path = 'blockedPoints[' + i + ']';
            if (!record(point) || !integer(point.x) || !integer(point.y)) { error(path, 'integer_point'); return; }
            if (point.x < 0 || point.y < 0 || point.x >= width || point.y >= height) error(path, 'bounds');
        });
        var zones = list('areaZones');
        ids(zones, 'areaZones');
        zones.forEach(function (zone, i) { rect(zone && zone.area, 'areaZones[' + i + '].area', true, false); });
        var triggers = list('triggers');
        var triggerIds = ids(triggers, 'triggers');
        triggers.forEach(function (trigger, i) { rect(trigger && trigger.area, 'triggers[' + i + '].area', true, false); });
        var props = list('props');
        ids(props, 'props');
        props.forEach(function (prop, i) {
            var path = 'props[' + i + ']';
            if (!record(prop)) return;
            // Negative/fractional coordinates and image overhang are intentional.
            rect(prop, path, false, false);
            if (Object.prototype.hasOwnProperty.call(prop, 'footY') && !number(prop.footY)) error(path + '.footY', 'number');
            if (Object.prototype.hasOwnProperty.call(prop, 'src')) error(path + '.src', 'forbidden');
            if (!identifier(prop.objectId)) error(path + '.objectId', 'identifier');
            else if (!objects || !Object.prototype.hasOwnProperty.call(objects, prop.objectId) || !record(objects[prop.objectId]) ||
                typeof objects[prop.objectId].src !== 'string' || !objects[prop.objectId].src.trim()) error(path + '.objectId', 'world_object');
            ['collision', 'interaction', 'tap'].forEach(function (key) {
                if (!Object.prototype.hasOwnProperty.call(prop, key)) return;
                var value = prop[key];
                if (key === 'tap' && value === false) return;
                if (!(key === 'tap' && record(value) && value.enabled === false &&
                    !['x', 'y', 'w', 'h'].some(function (k) { return Object.prototype.hasOwnProperty.call(value, k); }))) {
                    rect(value, path + '.' + key, false, false);
                }
                if (record(value) && Object.prototype.hasOwnProperty.call(value, 'enabled') && typeof value.enabled !== 'boolean') error(path + '.' + key + '.enabled', 'boolean');
            });
            if (Object.prototype.hasOwnProperty.call(prop, 'enabled') && typeof prop.enabled !== 'boolean') error(path + '.enabled', 'boolean');
            var interaction = prop.interaction;
            if (record(interaction)) {
                var id = interaction.triggerId;
                if (id !== undefined && id !== '' && !identifier(id)) error(path + '.interaction.triggerId', 'identifier');
                if (interaction.enabled !== false && !identifier(id)) error(path + '.interaction.triggerId', 'required');
                // Disabled links may retain their former ID (Editor role=none).
                if (interaction.enabled !== false && identifier(id) && !triggerIds[id]) error(path + '.interaction.triggerId', 'missing_trigger');
            }
        });
        return { ok: errors.length === 0, errors: errors };
    }
    var api = { validateSceneData: validateSceneData };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.YUMANIWA_SCENE_VALIDATION = api;
})(typeof window !== 'undefined' ? window : globalThis);
