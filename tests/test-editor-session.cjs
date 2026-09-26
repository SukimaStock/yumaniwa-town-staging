// Run: node tests/test-editor-session.cjs. No dependencies or repository writes.
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
// Legacy movement uses this implicit global; declare it for strict-mode instrumentation.
c.tapMoveRequestedWarpSide=null;
c.window=c;vm.createContext(c);
for(const file of ['data/world-objects.js','data/station-plaza.js','data/works.js','data/notes.js','data/places.js',
    'data/town-maps.js','town-scene-validation.js','town-editor-session.js','main.js','developer-access.js',
    'town-editor-upgrade.js','town-interaction-flow.js','data/ghost-dialogue.js','town-ghost-npc.js',
    'town-editor-spatial.js','town-editor-safe-export.js']) {
    // Strict mode makes any attempted write into deep-frozen canonical data fail.
    vm.runInContext('"use strict";\n'+fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
}
const api=c.YUMANIWA_EDITOR_SESSION;
const clone=v=>JSON.parse(JSON.stringify(v));
const run=code=>vm.runInContext(code,c);
const el=id=>{const e=document.getElementById(id);assert(e,'control '+id);return e;};
const click=id=>el(id).click();
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
function empty(){assert.equal(api.isDirty(),false);assert.deepEqual(clone(c.YUMANIWA_EDITOR_BUILD_DIFF().changes),{props:[],triggers:[],collision:null,areaZones:null});}
// Add synthetic future authored metadata before validation/freeze.
const canonical=c.TOWN_SCENE_MAPS;
canonical.station_plaza.props[0].future={nested:{keep:['a',{b:2}]}};
canonical.station_plaza.props[0].collision.future={keep:true};
canonical.station_plaza.triggers[1].future={nested:[{keep:true}]};
canonical.station_plaza.areaZones[0].future={keep:[1,2]};
canonical.station_plaza.areaZones[0].area.future={keep:true};
assert(c.validateTownSceneRegistry().ok);
api.freeze(canonical);
const original=JSON.stringify(canonical);
// Rendering/network are outside this state test; lifecycle and editor handlers remain real.
c.loadTownSceneBackground=def=>{c.activeTownSceneDef=def;};
c.updateInteractionHint=()=>{};c.updateControlVisibility=()=>{};c.showMessage=text=>{message=text;};
c.applyTownSceneDefinition('station_plaza','default');
c.setupEditorEvents();
check('runtime ghost conversation cannot mutate canonical',()=>{
    const trigger=c.triggers.find(t=>t.id==='station_ghost_npc_trigger');
    c.activateTownTrigger(trigger);assert.notEqual(message,'……');assert.equal(trigger.text,'……');
    assert.equal(JSON.stringify(canonical),original);
});
check('first open snapshots canonical synchronously, four globals view one draft',()=>{
    el('editor-panel').style.display='none';c.toggleDebugMode();
    const s=api.current();assert(s);assert.notEqual(s.baseline,canonical.station_plaza);
    assert.deepEqual(clone(s.baseline),clone(canonical.station_plaza));
    assert.equal(c.activeTownSceneDef,s.draft);assert.equal(c.triggers,s.draft.triggers);
    assert.equal(c.areaZones,s.draft.areaZones);assert.equal(c.baseCollisionGrid,s.draft.fixedCollisionGrid);
    assert.equal(s.draft.passableRects,undefined);assert(Object.isFrozen(s.baseline.props[0].future.nested));empty();
});
let baseline=api.current().baseline;
const baselineText=JSON.stringify(baseline);
check('prop nudge and Undo affect draft only, restore empty diff',()=>{
    c.editingPartIndex=0;c.nudgeSelectedPart(1,0);
    assert(api.isDirty());assert.equal(c.YUMANIWA_EDITOR_BUILD_DIFF().changes.props.length,1);
    assert.equal(JSON.stringify(canonical),original);click('btn-editor-undo');empty();
    assert.deepEqual(clone(api.current().draft.props[0].future),clone(baseline.props[0].future));
});
check('trigger A -> close -> reopen -> B retains canonical before',()=>{
    c.applyTriggerValues(1,{...clone(c.triggers[1]),text:'A'});
    click('btn-close-editor');assert.equal(c.triggers[1].text,'A');
    c.toggleDebugMode();assert.equal(api.current().baseline,baseline);
    c.applyTriggerValues(1,{...clone(c.triggers[1]),text:'B'});
    const d=c.YUMANIWA_EDITOR_BUILD_DIFF().changes.triggers.find(t=>t.id===baseline.triggers[1].id);
    assert.equal(d.before.text,baseline.triggers[1].text);assert.equal(d.after.text,'B');
    assert.deepEqual(clone(d.after.future),clone(baseline.triggers[1].future));
    assert.equal(JSON.stringify(canonical),original);
});
check('export is pure, deterministic, never advances baseline',()=>{
    const draft=JSON.stringify(api.current().draft);
    assert.equal(c.buildFullStationPlazaExportCode(),c.buildFullStationPlazaExportCode());
    c.showExportModal();click('btn-copy-export');assert(copied.includes('yumaniwa-editor-diff-v1'));
    assert.equal(api.current().baseline,baseline);assert.equal(JSON.stringify(baseline),baselineText);
    assert.equal(JSON.stringify(api.current().draft),draft);assert(api.isDirty());
});
check('dirty scene transition rejected without losing session',()=>{
    const s=api.current();const content=JSON.stringify(s);
    assert.equal(c.changeTownScene('tomogushi_alley_map','default'),false);
    assert.equal(c.changeSceneWithTownFade('tomogushi_alley_map','default'),false);
    assert.equal(c.applyTownSceneDefinition('tomogushi_alley_map','default'),false);
    assert.equal(api.current(),s);assert.equal(JSON.stringify(s),content);assert.equal(c.currentScene,'station_plaza');
});
check('discard resets draft and old undo; subsequent ghost conversation exports nothing',()=>{
    c.discardTownEditorChanges();empty();assert.equal(c.editHistory.length,0);
    assert.equal(api.current().baseline,baseline);
    c.activateTownTrigger(c.triggers.find(t=>t.id==='station_ghost_npc_trigger'));empty();
});
check('fixed collision edit and Undo stay in the one grid',()=>{
    c.editTarget='blockedPoints';const before=c.baseCollisionGrid[10][10];assert.notEqual(before,2);
    c.handleEditorTap(10,10);assert.equal(api.current().draft.fixedCollisionGrid[10][10],2);
    assert(c.YUMANIWA_EDITOR_BUILD_DIFF().changes.collision);assert.equal(JSON.stringify(canonical),original);
    click('btn-editor-undo');empty();assert.equal(c.baseCollisionGrid,api.current().draft.fixedCollisionGrid);
});
check('spatial trigger area control edits actual draft trigger, Undo restores it',()=>{
    c.editTarget='triggers';c.selectExistingTriggerForEdit(1);
    const before=clone(c.triggers[1].area);
    document.querySelector('[data-trigger-dx="1"]').click();
    assert.equal(c.triggers[1].area.x,before.x+1);
    assert.equal(c.triggers,api.current().draft.triggers);assert(!('triggerArea' in c.getActiveTownParts()[0]));
    assert.equal(JSON.stringify(canonical),original);click('btn-editor-undo');empty();
});
check('areaZone form edits draft; metadata and Undo preserved',()=>{
    c.editTarget='areaZones';c.YUMANIWA_SPATIAL_EDITOR.handleAreaZoneTap(10,10);
    el('area-zone-title').value='Phase 2';click('btn-update-area-zone');
    assert.equal(api.current().draft.areaZones[0].title,'Phase 2');
    assert(c.YUMANIWA_EDITOR_BUILD_DIFF().changes.areaZones);
    assert.deepEqual(clone(c.areaZones[0].future),clone(baseline.areaZones[0].future));
    assert.deepEqual(clone(c.areaZones[0].area.future),{keep:true});
    assert.equal(JSON.stringify(canonical),original);click('btn-editor-undo');empty();
});
check('metadata readers cannot supplement draft, unknown nested fields survive',()=>{
    const before=JSON.stringify(api.current().draft);
    c.getActiveTownParts().forEach(c.getTownPartMetadataView);c.refreshTownPartDerivedData();c.selectTownPart(0);
    assert.equal(JSON.stringify(api.current().draft),before);empty();
    const view=c.getTownPartMetadataView({id:'future',objectId:'bench_wood_01',x:1,y:1,w:2,h:2});
    assert(view.collision);assert(view.interaction);
});
check('invalid after is blocked, without changing baseline or draft',()=>{
    api.current().draft.props[0].w=-1;
    const before=JSON.stringify(api.current());
    assert.throws(()=>c.YUMANIWA_EDITOR_BUILD_DIFF(),/書き出せない変更/);
    assert.equal(JSON.stringify(api.current()),before);assert(api.isDirty());c.discardTownEditorChanges();empty();
});
check('part action UI writes the same trigger; duplication and Undo preserve fields',()=>{
    c.editTarget='props';c.selectTownPart(0);
    el('part-action-kind').value='message';el('part-action-text').value='edited action';
    el('part-action-text').dispatch('change');
    const id=c.getSelectedTownPart().interaction.triggerId;
    assert.equal(c.findTownPartTrigger(id).text,'edited action');
    assert.equal(c.YUMANIWA_EDITOR_BUILD_DIFF().changes.triggers.find(t=>t.id===id).after.text,'edited action');
    click('btn-editor-undo');empty();c.selectTownPart(0);
    c.duplicateSelectedPart();const copy=c.getSelectedTownPart();
    assert.notEqual(copy.interaction.triggerId,baseline.props[0].interaction.triggerId);
    assert.equal(c.findTownPartTrigger(copy.interaction.triggerId).text,baseline.triggers.find(t=>t.id===baseline.props[0].interaction.triggerId).text);
    assert.deepEqual(clone(copy.future),clone(baseline.props[0].future));
    const changes=c.YUMANIWA_EDITOR_BUILD_DIFF().changes;
    assert.equal(changes.props[0].op,'add');assert.equal(changes.triggers[0].op,'add');
    click('btn-editor-undo');empty();
});
check('closing a dirty editor keeps props, trigger, grid and zone views',()=>{
    const s=api.current();s.draft.props[0].x+=0.0625;s.draft.triggers[1].text='preview';
    s.draft.fixedCollisionGrid[10][10]=2;s.draft.areaZones[0].title='preview zone';
    const text=JSON.stringify(s.draft);click('btn-close-editor');
    assert.equal(c.getActiveTownParts(),s.draft.props);assert.equal(c.triggers,s.draft.triggers);
    assert.equal(c.areaZones,s.draft.areaZones);assert.equal(c.baseCollisionGrid,s.draft.fixedCollisionGrid);
    assert.equal(JSON.stringify(s.draft),text);c.toggleDebugMode();assert.equal(api.current(),s);
    assert.equal(JSON.stringify(s.draft),text);c.discardTownEditorChanges();empty();
});
check('destination visits are allowed and return to the same dirty town draft',()=>{
    const s=api.current();s.draft.props[0].x+=0.0625;
    const saved=c.openDestination;c.openDestination=()=>{};
    assert(c.changeScene('test_menu'));assert.equal(api.current(),s);
    assert(c.changeTownScene('station_plaza','default'));assert.equal(api.current(),s);
    assert.equal(c.activeTownSceneDef,s.draft);assert(api.isDirty());c.openDestination=saved;
    c.discardTownEditorChanges();empty();
});
check('manual reversal and key order changes have no semantic diff',()=>{
    const s=api.current();s.draft.props[0].x+=0.0625;assert(api.isDirty());
    s.draft.props[0].x=baseline.props[0].x;empty();
    const trigger=s.draft.triggers[1];s.draft.triggers[1]=Object.fromEntries(Object.entries(trigger).reverse());empty();
});
check('invalid grid is dirty and cannot export',()=>{
    api.current().draft.fixedCollisionGrid[10][10]=3;assert(api.isDirty());
    assert.throws(()=>c.YUMANIWA_EDITOR_BUILD_DIFF(),/Invalid Editor fixed collision grid/);
    c.discardTownEditorChanges();empty();
});
check('a clean scene transition ends old session and clears its history',()=>{
    assert.equal(c.changeTownScene('tomogushi_alley_map','default'),true);
    assert.equal(api.current(),null);assert.equal(c.editHistory.length,0);
    assert.equal(c.isEditMode,false);assert.equal(el('editor-panel').style.display,'none');
    c.openTownEditorSession();assert.equal(api.current().sceneId,'tomogushi_alley_map');
    assert.notEqual(api.current().baseline,baseline);empty();
    click('btn-editor-undo');assert.equal(JSON.stringify(canonical),original);
});
check('all current scenes can open without dirty data',()=>{
    for(const id of Object.keys(canonical)){
        assert(c.changeTownScene(id,'default'));c.openTownEditorSession();empty();
        assert.equal(JSON.stringify(canonical),original);
    }
});
check('future fixed-collision annotations are retained or fail closed on grid edits',()=>{
    const annotated=clone(canonical.station_plaza);
    annotated.blockedRects[0].future={nested:{keep:true}};
    const getDefinition=c.getTownSceneDefinition;
    c.getTownSceneDefinition=id=>id==='station_plaza'?annotated:getDefinition(id);
    c.changeTownScene('station_plaza','default');c.openTownEditorSession();empty();
    assert.deepEqual(clone(api.snapshot().blockedRects[0].future),{nested:{keep:true}});
    api.current().draft.fixedCollisionGrid[10][10]=2;assert(api.isDirty());
    assert.throws(()=>c.YUMANIWA_EDITOR_BUILD_DIFF(),/metadata needs an explicit serialization rule/);
    c.discardTownEditorChanges();empty();api.end();c.getTownSceneDefinition=getDefinition;
});
console.log(`${checks} Editor session regression groups passed; canonical deep-frozen under strict mode.`);

if (process.argv.includes('--desk-export')) {
    c.changeTownScene('tomogushi_alley_map','default');c.openTownEditorSession();
    const s=api.current();s.draft.props[0].x+=0.0625;
    s.draft.props[0].futureMetadata={nested:{keep:[1,{value:'future'}]}};
    s.draft.triggers[0].text='Phase 2 roundtrip';
    s.draft.fixedCollisionGrid[1][1]=s.draft.fixedCollisionGrid[1][1]===2 ? 1 : 2;
    s.draft.areaZones[0].title='Phase 2 zone';
    console.log(JSON.stringify({manifest:c.YUMANIWA_EDITOR_BUILD_DIFF(),after:api.snapshot()}));
}
