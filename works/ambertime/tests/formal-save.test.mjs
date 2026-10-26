import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import * as S from '../placement-save.mjs';
import {mapNoticeBaseline,mapProgress} from '../world-map-view.mjs';
const fixture=name=>JSON.parse(fs.readFileSync(new URL('./fixtures/'+name,import.meta.url),'utf8'));
const legacy=D.restoreDistillery(fixture('placement-legacy-main.json').after);
const trial=D.restoreDistillery(fixture('placement-established-six.json').raw);
const envelope=(game,paused=true,elapsed=200)=>JSON.stringify({version:2,game:JSON.parse(D.serializeDistillery(game)),userPaused:paused,elapsed},null,1);
const legacyRaw=envelope(legacy),trialRaw=envelope(trial,false,300);
const options={restore:D.restoreDistillery,monthMs:6000,stepMs:100,prepare:D.enableStage4,adopt:D.adoptPlacement,serialize:D.serializeDistillery};
function storage(entries={}){return {values:new Map(Object.entries(entries)),writes:[],getItem(key){return this.values.has(key)?this.values.get(key):null;},setItem(key,value){this.writes.push([key,value]);this.values.set(key,value);}};}
const both=()=>storage({[S.LEGACY_SAVE_KEY]:legacyRaw,[S.PLACEMENT_SAVE_KEY]:trialRaw,unrelated:'keep'});
const source=(store,id='legacy')=>S.formalSources(store,options).find(s=>s.id===id);
function originalBytes(store){assert.equal(store.values.get(S.LEGACY_SAVE_KEY),legacyRaw);assert.equal(store.values.get(S.PLACEMENT_SAVE_KEY),trialRaw);assert.equal(store.values.get('unrelated'),'keep');assert(!store.writes.some(([key])=>[S.LEGACY_SAVE_KEY,S.PLACEMENT_SAVE_KEY,'unrelated'].includes(key)));}
const read=text=>S.readSession(text,{...options,enabled:true});
function facts(game){const s=structuredClone(game);delete s.placement;delete s.operations;return s;}
test('source discovery returns both independent native records without selection, merging or writes',()=>{
 const store=both(),list=S.formalSources(store,options);assert.deepEqual(list.map(s=>s.id),['legacy','placement']);assert.equal(list[0].raw,legacyRaw);assert.equal(list[1].raw,trialRaw);assert.deepEqual(list[0].session.game,legacy);assert.deepEqual(list[1].session.game,trial);assert(list.every(s=>s.error===null));assert.equal(store.getItem(S.FORMAL_SAVE_KEY),null);assert.deepEqual(store.writes,[]);originalBytes(store);
 const invalid=storage({[S.LEGACY_SAVE_KEY]:'{broken',[S.PLACEMENT_SAVE_KEY]:envelope(legacy)}),bad=S.formalSources(invalid,options);assert.equal(bad.length,2);assert(bad.every(s=>s.error&&s.session===null));assert.deepEqual(invalid.writes,[]);
});
test('explicit legacy listed and hand copies preserve all prior facts and clock state, leaving both sources exact',()=>{
 for(const policy of ['listed','hand']){const store=both(),before=source(store),result=S.copyToFormal(store,before,{...options,policy}),session=read(result.text);assert.equal(result.mapCopied,false);assert.equal(store.getItem(S.FORMAL_SAVE_KEY),result.text);assert.equal(session.userPaused,true);assert.equal(session.elapsed,200);assert.deepEqual(facts(session.game),facts(legacy));assert.deepEqual(session.game.operations.slice(0,-1),legacy.operations);assert.equal(session.game.operations.at(-1).key,'adopt-placement');assert.equal(session.game.operations.at(-1).value.policy,policy);for(const p of legacy.core.products)assert.equal(D.placementInventory(session.game,p.id).retail,policy==='listed'&&legacy.productsById[p.id]?.listed?D.placementInventory(legacy,p.id).available:0);originalBytes(store);assert.deepEqual(store.writes,[[S.FORMAL_SAVE_KEY,result.text]]);}
});
test('trial selection copies the exact source text including whitespace without prepare, adoption or serialization',()=>{
 const store=both(),never=()=>{throw Error('trial must remain verbatim');},result=S.copyToFormal(store,source(store,'placement'),{...options,prepare:never,adopt:never,serialize:never});assert.equal(result.text,trialRaw);assert.deepEqual(read(result.text),{game:trial,userPaused:false,elapsed:300});assert.deepEqual(store.writes,[[S.FORMAL_SAVE_KEY,trialRaw]]);originalBytes(store);
});
test('valid or corrupt existing formal destinations are never overwritten or replaced by a source',()=>{
 for(const destination of [trialRaw,'{corrupt','']){const store=both();store.values.set(S.FORMAL_SAVE_KEY,destination);assert.throws(()=>S.copyToFormal(store,source(store),options),/上書きせず/);assert.equal(store.getItem(S.FORMAL_SAVE_KEY),destination);assert.deepEqual(store.writes,[]);originalBytes(store);}
});
test('a source changed since preview blocks copying and preserves the newer source bytes',()=>{
 const store=both(),selected=source(store);store.values.set(S.LEGACY_SAVE_KEY,'newer source canary');assert.throws(()=>S.copyToFormal(store,selected,options),/元の記録が別の画面/);assert.equal(store.getItem(S.LEGACY_SAVE_KEY),'newer source canary');assert.equal(store.getItem(S.PLACEMENT_SAVE_KEY),trialRaw);assert.equal(store.getItem(S.FORMAL_SAVE_KEY),null);assert.deepEqual(store.writes,[]);
});
test('a concurrent destination writer during validation is protected by the final conditional write',()=>{
 const store=both(),selected=source(store);assert.throws(()=>S.copyToFormal(store,selected,{...options,adopt:(s,p)=>{store.values.set(S.FORMAL_SAVE_KEY,'other tab');return D.adoptPlacement(s,p);}}),/別の画面/);assert.equal(store.getItem(S.FORMAL_SAVE_KEY),'other tab');assert.deepEqual(store.writes,[]);originalBytes(store);
});
test('quota failure rejects before returning live state or changing either original',()=>{
 const store=both(),selected=source(store);store.setItem=()=>{throw Error('quota');};let live='unchanged';assert.throws(()=>{const result=S.copyToFormal(store,selected,options);live=read(result.text);},/quota/);assert.equal(live,'unchanged');assert.equal(store.getItem(S.FORMAL_SAVE_KEY),null);originalBytes(store);
});
test('failed readback rejects even when destination was written; callers receive no successful live state',()=>{
 const store=both(),selected=source(store),normalGet=store.getItem;let live='unchanged';store.getItem=function(key){if(key===S.FORMAL_SAVE_KEY&&this.values.has(key))return 'concurrent readback';return normalGet.call(this,key);};assert.throws(()=>{const result=S.copyToFormal(store,selected,options);live=read(result.text);},/保存を確認/);assert.equal(live,'unchanged');assert.equal(store.writes.length,1);assert.equal(store.writes[0][0],S.FORMAL_SAVE_KEY);assert.doesNotThrow(()=>read(store.values.get(S.FORMAL_SAVE_KEY)));originalBytes(store);
});
test('invalid source selection, envelope, policy, native facts or candidate mode rejects without writes',()=>{
 const cases=[()=>null,()=>({id:'unknown',key:S.LEGACY_SAVE_KEY,raw:legacyRaw}),()=>({id:'legacy',key:S.PLACEMENT_SAVE_KEY,raw:legacyRaw}),()=>({id:'legacy',key:S.LEGACY_SAVE_KEY,raw:'broken'}),()=>({id:'legacy',key:S.LEGACY_SAVE_KEY,raw:trialRaw})];for(const make of cases){const store=both();assert.throws(()=>S.copyToFormal(store,make(),options));assert.deepEqual(store.writes,[]);originalBytes(store);}
 for(const policy of ['bad','',null,1]){const store=both();assert.throws(()=>S.copyToFormal(store,source(store),{...options,policy}));assert.deepEqual(store.writes,[]);originalBytes(store);}
 const store=both(),selected=source(store),bad=JSON.parse(legacyRaw);bad.game.core.cash++;assert.throws(()=>S.copyToFormal(store,{...selected,raw:JSON.stringify(bad)},options));assert.throws(()=>S.copyToFormal(store,selected,{...options,adopt:s=>s}));assert.deepEqual(store.writes,[]);originalBytes(store);
});
test('version1 and version2 map metadata copy verbatim and retain compatible notice baselines',()=>{
 for(const meta of [{version:1,shown:2},{version:2,shown:2,announced:3}]){const store=both(),key=S.LEGACY_SAVE_KEY+'.map-reveal.v1',destination=S.FORMAL_SAVE_KEY+'.map-reveal.v1',raw=JSON.stringify(meta);store.values.set(key,raw);const result=S.copyToFormal(store,source(store),options);assert.equal(result.mapCopied,true);assert.equal(store.getItem(key),raw);assert.equal(store.getItem(destination),raw);assert.deepEqual(mapNoticeBaseline(mapProgress(read(result.text).game),JSON.parse(store.getItem(destination)),true),{shown:2,announced:meta.announced??2});originalBytes(store);}
});
test('invalid or existing map metadata is left intact; optional metadata failure cannot damage game sources',()=>{
 const destination=S.FORMAL_SAVE_KEY+'.map-reveal.v1',key=S.LEGACY_SAVE_KEY+'.map-reveal.v1';for(const raw of ['broken',JSON.stringify({version:9,shown:2}),JSON.stringify({version:2,shown:2,announced:7})]){const store=both();store.values.set(key,raw);const result=S.copyToFormal(store,source(store),options);assert.equal(result.mapCopied,false);assert.equal(store.getItem(key),raw);assert.equal(store.getItem(destination),null);originalBytes(store);}
 const store=both(),raw=JSON.stringify({version:1,shown:2});store.values.set(key,raw);store.values.set(destination,'destination metadata canary');assert.equal(S.copyToFormal(store,source(store),options).mapCopied,false);assert.equal(store.getItem(destination),'destination metadata canary');originalBytes(store);
 const failing=both(),normalSet=failing.setItem;failing.values.set(key,raw);failing.setItem=function(k,v){if(k===destination)throw Error('metadata quota');normalSet.call(this,k,v);};const result=S.copyToFormal(failing,source(failing),options);assert.equal(result.mapCopied,false);assert.equal(failing.getItem(S.FORMAL_SAVE_KEY),result.text);assert.equal(failing.getItem(key),raw);originalBytes(failing);
});

test('an older pre-stage4 v20 session copies explicitly with only connection and adoption boundaries appended',()=>{
 const before=D.preStage4State(legacy);assert.equal(before.version,20);assert.equal(D.stage4Mode(before),false);
 const raw=envelope(before,false,400),store=storage({[S.LEGACY_SAVE_KEY]:raw,[S.PLACEMENT_SAVE_KEY]:trialRaw,unrelated:'keep'}),selected=source(store);
 const result=S.copyToFormal(store,selected,{...options,policy:'hand'}),session=read(result.text),after=session.game;
 assert.equal(store.getItem(S.LEGACY_SAVE_KEY),raw);assert.equal(store.getItem(S.PLACEMENT_SAVE_KEY),trialRaw);assert.equal(store.getItem('unrelated'),'keep');assert.equal(store.getItem(S.FORMAL_SAVE_KEY),result.text);assert.deepEqual(store.writes,[[S.FORMAL_SAVE_KEY,result.text]]);
 assert.deepEqual(after.core,before.core);assert.equal(after.core.cash,before.core.cash);assert.deepEqual(after.operations.slice(0,before.operations.length),before.operations);assert.deepEqual(after.operations.slice(before.operations.length).map(op=>op.key),['enable-stage4','adopt-placement']);
 assert.equal(after.operations.at(-1).value.policy,'hand');assert.equal(session.userPaused,false);assert.equal(session.elapsed,400);assert.equal(D.stage4Mode(after),true);assert.equal(D.placementMode(after),true);
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`,gameRaw=D.serializeDistillery(after);
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:gameRaw,encoding:'utf8',maxBuffer:4e6}),gameRaw);
});
