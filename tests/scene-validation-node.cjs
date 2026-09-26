// Headless data/validator integration. Never invokes onload or writes repo files.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const c = { console, Date, Math, JSON, setTimeout: () => 0, clearTimeout() {},
    addEventListener() {}, location: { search: '', pathname: '/', hostname: 'localhost' },
    performance: { now: () => 0 }, document: { getElementById: () => null }, Image: function () {} };
c.window = c;
vm.createContext(c);
for (const file of ['data/world-objects.js', 'data/station-plaza.js', 'data/works.js',
    'data/notes.js', 'data/places.js', 'data/town-maps.js', 'town-scene-validation.js',
    'main.js', 'town-interaction-flow.js', 'town-ghost-npc.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, { filename: file });
}
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(index.indexOf('./town-scene-validation.js?') >= 0, 'validator script is required');
assert(index.indexOf('./town-scene-validation.js?') < index.indexOf('./main.js?'));
const scenes = JSON.parse(JSON.stringify(c.TOWN_SCENE_MAPS));
const objects = JSON.parse(JSON.stringify(c.YUMANIWA_WORLD_OBJECTS.objects));
const original = JSON.stringify(c.TOWN_SCENE_MAPS);
for (const [id, scene] of Object.entries(c.TOWN_SCENE_MAPS)) {
    const result = c.validateTownSceneDefinition(id, scene, c.TOWN_SCENE_MAPS);
    assert.equal(result.ok, true, `${id}: ${result.errors.join(';')}`);
}
assert.equal(JSON.stringify(c.TOWN_SCENE_MAPS), original, 'validation must not mutate canonical data');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'scene-validation-cases.json')));
function apply(scene, changes) {
    for (const change of changes) {
        let parent = scene;
        for (const key of change.path.slice(0, -1)) parent = parent[key];
        const key = change.path.at(-1);
        if (change.remove) delete parent[key];
        else parent[key] = change.value;
    }
}
const results = [];
for (const test of fixtures) {
    const scene = JSON.parse(JSON.stringify(scenes[test.scene || 'station_plaza']));
    apply(scene, test.changes);
    const before = JSON.stringify(scene);
    const result = c.YUMANIWA_SCENE_VALIDATION.validateSceneData(scene, objects);
    assert.equal(result.ok, test.ok, test.name + ': ' + result.errors.join(';'));
    assert.equal(c.validateTownSceneDefinition(scene.id, scene, scenes).ok, test.ok, 'runtime entry: ' + test.name);
    assert.equal(JSON.stringify(scene), before, 'pure: ' + test.name);
    results.push({ name: test.name, ...result });
}
// Runtime-only conditions remain enforced by the existing entry point.
const noSpawn = JSON.parse(JSON.stringify(scenes.station_plaza));
delete noSpawn.spawnPoints.default;
assert.equal(c.YUMANIWA_SCENE_VALIDATION.validateSceneData(noSpawn, objects).ok, true);
assert.equal(c.validateTownSceneDefinition(noSpawn.id, noSpawn, scenes).ok, false);
process.stdout.write(JSON.stringify({ scenes, objects, results }));
