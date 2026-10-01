// Frozen behavior oracle captured at fixture.baseSha before the metadata migration.
// Node DOM adapter tests real handlers; this is not browser verification.
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), assert=require('node:assert/strict');
const {createDOM}=require('./editor-dom.cjs');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.indexOf('./town-editor-session.js?') >= 0);
assert(html.indexOf('./town-editor-session.js?') < html.indexOf('./main.js?'));
assert(!html.includes('town-editor-comment-export.js'));
const {document,Element}=createDOM(html);
let copied='', alerts=[], message='';
const c={console,Date,Math,JSON,URLSearchParams,document,Image:function(){},
    setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},
    performance:{now:()=>0},location:{search:'?dev=1',pathname:'/yumaniwa-town-staging/',hostname:'localhost'},
    navigator:{clipboard:{writeText:async text=>{copied=text;}}},isSecureContext:true,
    innerWidth:800,innerHeight:600,devicePixelRatio:1,scrollX:0,scrollY:0,
    confirm:()=>true,alert:text=>alerts.push(text),HTMLInputElement:Element,HTMLTextAreaElement:Element,HTMLSelectElement:Element};
c.window=c;vm.createContext(c);
for(const file of ['data/world-objects.js','data/station-plaza.js','data/works.js','data/notes.js','data/places.js',
    'data/town-maps.js','town-scene-validation.js','town-editor-session.js','main.js','developer-access.js',
    'town-editor-upgrade.js','town-interaction-flow.js','town-memory.js','data/ghost-dialogue.js','town-ghost-npc.js',
    'town-editor-spatial.js','town-editor-safe-export.js']) {
    // Strict mode makes any attempted write into deep-frozen canonical data fail.
    vm.runInContext('"use strict";\n'+fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
}
const test=require('node:test'), crypto=require('node:crypto');
const fixture=require('./fixtures/editor-world-object-metadata-before.json');
const clone=value=>JSON.parse(JSON.stringify(value));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const oldAssets=fixture.catalog.filter(d=>d.addable!==false);
const registry=c.YUMANIWA_WORLD_OBJECTS;
c.loadTownSceneBackground=def=>{c.activeTownSceneDef=def;};
c.updateInteractionHint=()=>{};c.updateControlVisibility=()=>{};
c.applyTownSceneDefinition('station_plaza','default');

test('exactly twelve options preserve order, key, label, objectId and every default',()=>{
    assert.equal(oldAssets.length,12);
    assert.deepEqual(clone(c.TOWN_PART_CATALOG.filter(d=>d.addable!==false)),oldAssets);
    const defs=clone(registry.getAddableEditorDefinitions());
    assert.equal(defs.length,12);
    assert.deepEqual(defs.map(d=>d.catalogKey),oldAssets.map(d=>d.key));
    assert.equal(new Set(defs.map(d=>d.order)).size,12);
    assert(!defs.some(d=>d.objectId==='post_box_01'||d.objectId==='leisure_catalog_terminal_01'));
    for(const d of defs) {
        assert(!('src' in d)); assert(!('finalization' in d));
        assert.deepEqual(Object.keys(d.defaults).sort(),['collision','h','w']);
    }
});
for(const expected of fixture.creations) {
    test('creation unchanged: '+expected.key,()=>{
        assert.deepEqual(clone(c.createTownPartFromCatalog(expected.key,512,384)),expected.part);
    });
}
test('implicit/explicit id stems, unknown key fallback and unique ID suffix remain compatible',()=>{
    assert.equal(c.getPartCatalogEntry('unknown-key'),c.TOWN_PART_CATALOG[0]);
    assert.deepEqual(clone(c.createTownPartFromCatalog('unknown-key',512,384)),fixture.creations[0].part);
    for(const d of oldAssets) {
        const actual=c.getPartCatalogEntry(d.key);
        assert.equal(actual.idStem||('station_'+actual.key),d.idStem||('station_'+d.key));
        const part=c.createTownPartFromCatalog(d.key,512,384);
        c.getActiveTownParts().push(part);
        const next=c.createTownPartFromCatalog(d.key,512,384);
        assert.notEqual(next.id,part.id);
        assert(next.id.startsWith((d.idStem||('station_'+d.key))+'_'));
        c.getActiveTownParts().pop();
    }
});
test('three generic non-asset fallback records and existing inference are unchanged',()=>{
    const generics=fixture.catalog.filter(d=>d.addable===false);
    assert.deepEqual(clone(c.TOWN_PART_CATALOG.filter(d=>d.addable===false)),generics);
    for(const d of generics) {
        assert.deepEqual(clone(c.getPartCatalogEntry(d.key)),d);
        assert.equal(c.createTownPartFromCatalog(d.key,512,384),null);
        assert(!registry.getEditorDefinitions().some(e=>e.catalogKey===d.key));
    }
    for(const item of fixture.inferences) {
        assert.equal(c.inferTownPartCatalogKey({objectId:item.objectId}),item.key);
    }
    assert.equal(c.inferTownPartCatalogKey({objectId:'example_shop_01'}),'worldObjectShop');
    assert.equal(c.inferTownPartCatalogKey({objectId:'leisure_exhibit_example'}),'worldObjectExhibit');
    assert.equal(c.inferTownPartCatalogKey({objectId:'post_box_01'}),'worldObjectFacility');
    assert.equal(c.inferTownPartCatalogKey({}),'bench');
});
test('existing placement metadata views are read-only and retain historical fallback',()=>{
    const before=JSON.stringify(c.TOWN_SCENE_MAPS);
    for(const scene of Object.values(c.TOWN_SCENE_MAPS)) {
        for(const part of scene.props||[]) c.getTownPartMetadataView(part);
    }
    assert.equal(JSON.stringify(c.TOWN_SCENE_MAPS),before);
    for(const item of fixture.inferences) {
        const part={id:'existing',objectId:item.objectId,x:1,y:1,w:2,h:2};
        const snapshot=clone(part);
        const old=fixture.catalog.find(d=>d.key===item.key);
        assert.deepEqual(clone(c.getTownPartMetadataView(part).collision),old.collision);
        assert.deepEqual(part,snapshot);
    }
});
test('WORLD OBJECT runtime fields, finalization, get and resolveSrc are unchanged',()=>{
    const objects=clone(registry.objects);
    for(const [id,def] of Object.entries(objects)) {
        assert.equal(registry.get(id),registry.objects[id]);
        assert.equal(registry.resolveSrc(id),def.src||'');
        delete def.editor;
    }
    assert.equal(hash(JSON.stringify(objects)),fixture.worldObjectsHash);
    assert.equal(registry.get('missing-object'),null);
    assert.equal(registry.resolveSrc('missing-object'),'');
    assert.equal(registry.getEditorDefinition('missing-object'),null);
    assert.equal(registry.getEditorDefinition('post_box_01'),null);
});
test('Editor APIs derive fresh ordered copies from literal metadata',()=>{
    const original=JSON.stringify(registry.objects);
    const defs=registry.getAddableEditorDefinitions();
    defs[0].defaults.collision.x=999; defs[0].label='mutated';
    assert.equal(JSON.stringify(registry.objects),original);
    assert.equal(registry.getEditorDefinition('notice_board_01').label,oldAssets[0].label);
    const meta=registry.get('notice_board_01').editor;
    const order=meta.order;
    try {
        meta.order=1000;
        assert.equal(registry.getAddableEditorDefinitions().at(-1).catalogKey,'noticeBoard');
        meta.addable=false;
        assert.equal(registry.getAddableEditorDefinitions().length,11);
    } finally { meta.order=order; meta.addable=true; }
    assert.equal(JSON.stringify(registry.objects),original);
});
test('scene sources, ghost placements and Phase 1 layout stay byte-identical',()=>{
    for(const [file,expected] of Object.entries(fixture.sourceHashes)) {
        assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,file);
    }
});
test('select uses the same twelve options and action UI still loads without catalog dependency',()=>{
    c.ensurePartEditorFields();
    const form=document.getElementById('part-form');
    const options=[...form.innerHTML.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].slice(0,12);
    assert.deepEqual(options.map(m=>({key:m[1],label:m[2]})),oldAssets.map(d=>({key:d.key,label:d.label})));
    assert.equal(document.getElementById('part-asset-select').options.length,12);
    assert(document.getElementById('part-action-editor'));
    const upgrade=source('town-editor-upgrade.js');
    assert.equal(hash(upgrade.split('    function escapeEditorHtml')[1]),fixture.upgradeActionsHash);
    for(const dev of [true,false]) {
        const isolated={DEV_MODE_ENABLED:dev};isolated.window=isolated;
        vm.runInNewContext(upgrade,isolated);
        assert.equal(typeof isolated.YUMANIWA_EDITOR_ACTION_UI,dev?'object':'undefined');
    }
});
