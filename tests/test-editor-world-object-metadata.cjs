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
// Explicitly adopted additions extend the frozen oracle; historical entries stay exact.
const boardAsset={key:'object_nhehgtc',label:'board',objectId:'object_nhehgtc',file:'',w:2,h:2,
    collision:{enabled:false,x:0,y:0,w:1,h:1}};
const expectedAssets=[...oldAssets,boardAsset];
const registry=c.YUMANIWA_WORLD_OBJECTS;
c.loadTownSceneBackground=def=>{c.activeTownSceneDef=def;};
c.updateInteractionHint=()=>{};c.updateControlVisibility=()=>{};
c.applyTownSceneDefinition('station_plaza','default');

test('twelve historical options and adopted board preserve exact order and defaults',()=>{
    assert.equal(oldAssets.length,12);
    assertCatalogMatchesBefore(c.TOWN_PART_CATALOG);
    const defs=clone(registry.getAddableEditorDefinitions());
    assert.equal(defs.length,expectedAssets.length);
    assert.deepEqual(defs.map(d=>d.catalogKey),expectedAssets.map(d=>d.key));
    assert.equal(new Set(defs.map(d=>d.order)).size,expectedAssets.length);
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
test('adopted board uses canonical pixels and objectId placement with Cleaner provenance',()=>{
    const obj=registry.get(boardAsset.objectId);
    assert.equal(obj.category,'sign');
    assert.equal(obj.type,'sign');
    assert.equal(obj.src,'assets/maps/objects/signs/object_nhehgtc.png');
    assert.equal(obj.finalization.status,'final');
    assert.equal(obj.finalization.target,'PROP_M');
    assert.deepEqual(clone(obj.finalization.logicalCanvasPx),[32,32]);
    assert.equal(obj.cleanerMetadata.schema,'yumaniwa-world-object/0.1');
    assert.deepEqual(clone(obj.cleanerMetadata.object),{category:'sign',type:'sign',label:'board',id:'object_nhehgtc'});
    assert.equal(obj.cleanerMetadata.finalization.output.filePixelRatio,3);
    const png=fs.readFileSync(path.join(root,obj.src));
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16),32); assert.equal(png.readUInt32BE(20),32);
    const part=clone(c.createTownPartFromCatalog(boardAsset.key,512,384));
    assert.equal(part.objectId,boardAsset.objectId);
    assert.equal(part.w,2); assert.equal(part.h,2);
    assert.deepEqual(part.collision,boardAsset.collision);
    assert(!('src' in part));
    assert.equal(c.inferTownPartCatalogKey({objectId:boardAsset.objectId}),boardAsset.key);
    assert(!c.getActiveTownParts().some(p=>p.objectId===boardAsset.objectId),'registration does not auto-place');
});
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
test('historical WORLD OBJECT runtime fields and finalization are unchanged',()=>{
    const objects=clone(registry.objects);
    for(const [id,def] of Object.entries(objects)) {
        assert.equal(registry.get(id),registry.objects[id]);
        assert.equal(registry.resolveSrc(id),def.src||'');
        delete def.editor;
    }
    // Exclude only this explicitly tested addition from the pre-migration hash.
    assert(objects.object_nhehgtc);
    delete objects.object_nhehgtc;
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
        meta.order=Math.max(...defs.map(d=>d.order))+1;
        assert.equal(registry.getAddableEditorDefinitions().at(-1).catalogKey,'noticeBoard');
        meta.addable=false;
        assert.equal(registry.getAddableEditorDefinitions().length,expectedAssets.length-1);
    } finally { meta.order=order; meta.addable=true; }
    assert.equal(JSON.stringify(registry.objects),original);
});
test('scene sources and ghost placements stay byte-identical',()=>{
    for(const [file,expected] of Object.entries(fixture.sourceHashes)) {
        // This historical metadata-migration oracle also froze a runtime file.
        // Creation drafts intentionally extend that renderer; its legacy path is
        // covered below without changing any canonical scene/ghost/asset hashes.
        if(file === 'data/station-plaza-props.js') continue;
        assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,file);
    }
});
test('select includes historical options and board; action UI remains independent',()=>{
    c.ensurePartEditorFields();
    const form=document.getElementById('part-form');
    const options=[...form.innerHTML.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].slice(0,expectedAssets.length);
    assert.deepEqual(options.map(m=>({key:m[1],label:m[2]})),expectedAssets.map(d=>({key:d.key,label:d.label})));
    assert.equal(document.getElementById('part-asset-select').options.length,expectedAssets.length);
    assert(document.getElementById('part-action-editor'));
    const upgrade=source('town-editor-upgrade.js');
    assert.equal(hash(upgrade.split('    function escapeEditorHtml')[1]),fixture.upgradeActionsHash);
    for(const dev of [true,false]) {
        const isolated={DEV_MODE_ENABLED:dev};isolated.window=isolated;
        vm.runInNewContext(upgrade,isolated);
        assert.equal(typeof isolated.YUMANIWA_EDITOR_ACTION_UI,dev?'object':'undefined');
    }
});

function assertCatalogMatchesBefore(catalog) {
    assert.deepEqual(clone(catalog.filter(d=>d.addable!==false)),expectedAssets);
}

// Small block reader for these flat declaration rules, not a browser cascade
// evaluator. Keep base selectors distinct from media/supports/nested rules.
function cssRules(css) {
    const clean=css.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\//g,
        token=>token.startsWith('/*')?token.replace(/[^\r\n]/g,' '):token);
    const stack=[],rules=[];
    let start=0;
    for(const token of clean.matchAll(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[{}]/g)) {
        if(token[0]==='{') {
            stack.push({header:clean.slice(start,token.index).trim(),start:token.index+1,nested:false});
            if(stack.length>1) stack[stack.length-2].nested=true;
            start=token.index+1;
        } else if(token[0]==='}') {
            const block=stack.pop();
            assert(block,'balanced CSS blocks');
            if(!block.nested&&!block.header.startsWith('@')) {
                rules.push({selector:block.header,ancestors:stack.map(b=>b.header),body:clean.slice(block.start,token.index),start:block.start,end:token.index});
            }
            start=token.index+1;
        }
    }
    assert.equal(stack.length,0,'balanced CSS blocks');
    return rules;
}
const compact=value=>value.replace(/\s+/g,'').toLowerCase();
const selectorName=value=>value.trim().replace(/\s+/g,' ');
function declarations(css,selector,media=null) {
    const result={};
    for(const rule of cssRules(css)) {
        const inScope=media===null ? rule.ancestors.length===0
            : rule.ancestors.length===1&&compact(rule.ancestors[0])===compact('@media '+media);
        if(!inScope||!rule.selector.split(',').some(s=>selectorName(s)===selector)) continue;
        for(const declaration of rule.body.split(';')) {
            const colon=declaration.indexOf(':');
            if(colon<0) continue;
            const property=declaration.slice(0,colon).trim().toLowerCase();
            const value=compact(declaration.slice(colon+1));
            // Preserve !important precedence for repeated base declarations.
            if(!result[property]?.endsWith('!important')||value.endsWith('!important')) result[property]=value;
        }
    }
    return result;
}
function expectDeclarations(css,selector,expected,media=null) {
    const actual=declarations(css,selector,media);
    for(const [property,value] of Object.entries(expected)) {
        assert.equal(actual[property],compact(value),`${selector} ${property} (${media||'base'})`);
    }
}
function assertPhase1EditorContract(css) {
    expectDeclarations(css,'#editor-panel',{
        position:'absolute',width:'280px','flex-direction':'column',
        top:'max(10px, env(safe-area-inset-top))',right:'max(10px, env(safe-area-inset-right))',
        'max-width':'calc(100vw - max(10px, env(safe-area-inset-left)) - max(10px, env(safe-area-inset-right)) - 4px)',
        'max-height':'calc(100dvh - max(10px, env(safe-area-inset-top)) - max(10px, env(safe-area-inset-bottom)) - 4px)'
    });
    expectDeclarations(css,'.editor-header',{'flex-shrink':'0','flex-wrap':'wrap'});
    expectDeclarations(css,'.editor-header button',{'flex-shrink':'0'});
    expectDeclarations(css,'.editor-content',{
        'min-height':'0','overflow-y':'auto','overscroll-behavior':'contain','touch-action':'pan-y'
    });
}
function assertTownSizingContract(css,fix) {
    expectDeclarations(css,':root',{'--town-screen-ratio-w':'390','--town-screen-ratio-h':'780','--town-screen-max-w':'470px'});
    expectDeclarations(css,'#town-screen',{flex:'0 0 auto'});
    expectDeclarations(fix,'#town-screen',{
        width:'min(100vw, calc(100dvh * var(--town-screen-ratio-w) / var(--town-screen-ratio-h)), var(--town-screen-max-w))',
        height:'auto','max-width':'100vw','max-height':'100dvh',
        'aspect-ratio':'var(--town-screen-ratio-w) / var(--town-screen-ratio-h)'
    });
    const mobile='(max-width: 768px) and (pointer: coarse)';
    expectDeclarations(fix,':root',{'--town-screen-ratio-w':'9','--town-screen-ratio-h':'16'},mobile);
    expectDeclarations(fix,'#town-screen',{
        width:'min(100vw, calc(100dvh * 9 / 16)) !important',
        'aspect-ratio':'9 / 16 !important'
    },mobile);
}
function withoutBaseProperty(css,selector,property) {
    // Mutation helper only: change the existing standalone base block in memory.
    const rule=cssRules(css).find(r=>!r.ancestors.length&&r.selector===selector);
    assert(rule,'mutation target exists');
    const modified=rule.body.replace(new RegExp('(^|;)\\s*'+property+'\\s*:[^;]*;'), '$1');
    assert.notEqual(modified,rule.body,'mutation removed '+property);
    return css.slice(0,rule.start)+modified+css.slice(rule.end);
}

test('Phase 1 base Editor overlay and body scrolling contract',()=>{
    assertPhase1EditorContract(source('style.css'));
});
test('town size remains viewport-based with canonical ratio and existing mobile 9:16 condition',()=>{
    assertTownSizingContract(source('style.css'),source('layout-fix.css'));
});
test('unrelated CSS, formatting/comments and future wide Editor rules are allowed',()=>{
    const css=source('style.css'),fix=source('layout-fix.css');
    const additions='\n.unrelated { color: red; content: "{ harmless }"; }\n'+
        '@media (min-width: 820px) { #editor-panel { position: relative; top: auto; right: auto; } }';
    assertPhase1EditorContract(css+additions);
    assertTownSizingContract(css+additions,fix+'\n.unrelated { color: blue; }');
    assertPhase1EditorContract(css.replace(/(\.editor-content\s*\{[\s\S]*?)overflow-y:\s*auto;/,'$1overflow-y /* explanation */ :\n auto ;'));
});
test('missing overflow-y fails even if another selector or wide media provides it',()=>{
    const broken=withoutBaseProperty(source('style.css'),'.editor-content','overflow-y');
    assert.throws(()=>assertPhase1EditorContract(broken),/\.editor-content overflow-y/);
    assert.throws(()=>assertPhase1EditorContract(broken+'\n.other {overflow-y:auto;}'),/\.editor-content overflow-y/);
    assert.throws(()=>assertPhase1EditorContract(broken+'\n@media(min-width:820px){.editor-content{overflow-y:auto;}}'),/\.editor-content overflow-y/);
});
test('missing panel max-height fails despite other max-height declarations',()=>{
    const broken=withoutBaseProperty(source('style.css'),'#editor-panel','max-height');
    assert.throws(()=>assertPhase1EditorContract(broken),/#editor-panel max-height/);
});
test('metadata mutation still fails the unchanged pre-migration oracle',()=>{
    const modified=clone(c.TOWN_PART_CATALOG);
    modified[0].w+=1;
    assert.throws(()=>assertCatalogMatchesBefore(modified),assert.AssertionError);
});

test('legacy renderer keeps WORLD OBJECT-only source, rounded geometry, offsets and actor order',()=>{
    const calls=[],images=[];
    class LoadedImage {
        set src(value){this.source=value;images.push(this);this.onload();}
    }
    const props=[
        {id:'back',objectId:'back_asset',x:1.03,y:2.03,w:2.03,h:1.03,footY:2.5},
        {id:'front',objectId:'front_asset',x:2,y:3,w:2,h:1,footY:4.5},
        {id:'shifted',objectId:'offset_asset',x:2,y:1,w:1,h:1,footY:2.9},
        {id:'disabled',objectId:'back_asset',x:0,y:0,w:1,h:1,enabled:false},
        {id:'unregistered',objectId:'missing',src:'must-not-load.png',x:0,y:0,w:1,h:1,footY:0}
    ];
    const objects={back_asset:{src:'back.png'},front_asset:{src:'front.png'},offset_asset:{src:'offset.png'}};
    const ctx={save(){calls.push(['save']);},restore(){calls.push(['restore']);},
        drawImage(image,...geometry){calls.push(['image',image.source,...geometry,this.imageSmoothingEnabled]);}};
    const context={Image:LoadedImage,Date,Math,Number,ctx,TILE_SIZE:16,activeTownSceneDef:{props},stationPlazaProps:[],
        YUMANIWA_WORLD_OBJECTS:{get:id=>objects[id]},YUMANIWA_TOWN_PROP_RENDER_OFFSETS:{shifted:.5},
        player:{x:20,y:32,w:16,h:16},drawPlayerSprite(x,y){calls.push(['player',x,y]);},setTimeout};
    context.window=context;
    const original=JSON.stringify(props);props.forEach(Object.freeze);Object.freeze(props);
    vm.runInNewContext(source('data/station-plaza-props.js'),context);
    context.YUMANIWA_STATION_PLAZA_PROPS.drawTownActorsAndProps();
    assert.deepEqual(calls.filter(c=>c[0]!=='save'&&c[0]!=='restore'),[
        ['image','back.png',16,32,32,16,false],['player',20,32],
        ['image','offset.png',32,24,16,16,false],['image','front.png',32,48,32,16,false]
    ]);
    assert.equal(JSON.stringify(props),original);
    assert.deepEqual(images.map(i=>i.source).sort(),['back.png','front.png','offset.png']);
    assert.equal(context.YUMANIWA_STATION_PLAZA_PROPS.resolvePropSrc(props.at(-1)), '');
});
