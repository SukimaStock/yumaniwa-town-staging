import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {buildCaskLedger} from '../cask-ledger.mjs';
import {buildReleaseLedger} from '../ledger-view.mjs';
import {fill,advance,resolve} from './brands-helpers.mjs';

const bare=()=>({core:{casks:[],archive:[],products:[]},records:[],releases:[],notesById:{},recipeBook:{entries:[],selectedId:null}});
const cask=(id,values={})=>({id,batchId:id+100,type:'refill',filledMonth:0,age:6,litres:80,initialLitres:100,roughness:.2,character:.6,wood:.3,cut:.5,history:[],...values});
const facts={coverage:{complete:true,fromMonth:0},casks:[],manualSources:[]};
function project(s){
 const ids=[...s.core.casks,...s.core.archive,...s.records,...(s.releases??[])].map(c=>c.caskId??c.id);
 const f=D.nearbyComparisonFacts(s,{caskIds:[...new Set(ids)],productIds:[...new Set([...(s.releases??[]),...s.records].map(r=>r.productId))],includeManualSources:true});
 return buildCaskLedger(s,{facts:f,replay:cb=>D.replayDistilleryOperations(s,cb)});
}

test('partial snapshots merge by cask identity without losing same-age distinct original prose',()=>{
 const s=bare(),one={age:3,profile:{litres:90},text:['原文。']},two={...one,text:['別の原文。']},ob={age:3,eventId:'care',text:'そのまま'};
 s.records=[{caskId:1,productId:11,samples:[one],choices:[],observations:[ob]},{caskId:1,productId:12,samples:[one,two],observations:[ob,{...ob,text:'別の観察'}]}];
 s.notesById[1]={samples:[one,two],choices:[],observations:[ob]};s.core.casks=[cask(1)];
 s.releases=[{id:1,productId:11,caskId:1},{id:2,productId:12,caskId:1}];
 const raw=JSON.stringify(s),view=buildCaskLedger(s,{facts}),item=view.casks[0];
 assert.deepEqual(item.samples,[one,two]);assert.equal(item.observations.length,2);assert.equal(item.status,'aging');
 assert.deepEqual(item.releaseKeys,['release:1','release:2']);assert.equal(item.litres,80);assert.equal(item.initialProfile,null);
 assert.equal(item.volumeHistory.filter(x=>x.source==='sample').length,1,'identical volume evidence is one point despite distinct prose');
 item.samples[0].text[0]='changed';assert.equal(JSON.stringify(s),raw);
});

test('saved recipes and unsaved manual sources remain separate; latest manual is not the automatic usual recipe',()=>{
 const s=bare();s.recipeBook={entries:[{id:'recipe-1',name:'固定名',type:'bourbon',stopAt:35,source:{caskId:1,batchId:101,filledMonth:0}}],selectedId:'recipe-1'};
 s.usual={recipe:{type:'refill',stopAt:99}};
 const f={...facts,manualSources:[{caskId:1,type:'bourbon',stopAt:35},{caskId:2,type:'refill',stopAt:65,filledMonth:6}]};
 const v=buildCaskLedger(s,{facts:f});assert.equal(v.recipes.latestManual.caskId,2);assert.equal(v.recipes.latestManual.stopAt,65);
 assert.equal(v.recipes.saved[0].name,'固定名');assert.equal(v.recipes.saved[0].selected,true);assert.deepEqual(v.recipes.unsaved.map(x=>x.caskId),[2]);assert.equal(v.casks.length,2);
 const legacy=buildCaskLedger(s).casks[0];assert.equal(legacy.type,'bourbon');assert.equal(legacy.stopAt,35);assert.equal(legacy.batchId,101);assert.equal(legacy.filledMonth,0);assert.equal(legacy.initialProfile,null);
});

test('missing legacy fields stay null, explicitly empty histories stay empty, release-only source is retained',()=>{
 const s=bare();s.records=[{caskId:1,productId:11}];s.releases=[{id:2,caskId:2,productId:12,age:12,profile:{roughness:.2}}];s.core.archive=[cask(3,{endedMonth:9,endReason:'原文',history:[]})];
 const v=buildCaskLedger(s,{facts:{coverage:{complete:false,fromMonth:9}}});
 const one=v.casks.find(c=>c.caskId===1),two=v.casks.find(c=>c.caskId===2),three=v.casks.find(c=>c.caskId===3);
 assert.equal(one.samples,null);assert.equal(one.profile,null);assert.equal(one.age,null);assert.equal(one.litres,null);assert.equal(one.status,null);assert.equal(one.filledMonth,null);
 assert.equal(two.age,12);assert.deepEqual(two.profile,{roughness:.2});assert.equal(two.litres,null);assert.deepEqual(two.releaseKeys,['release:2']);
 assert.equal(three.status,'ended');assert.deepEqual(three.history,[]);assert.equal(three.endReason,'原文');assert.equal(v.coverage.complete,false);
});

test('one injected replay captures original fill profile and notes; only current release keys are linked',()=>{
 const s=bare(),start={...bare(),core:{casks:[cask(1,{age:0,litres:100,wood:0})],archive:[],products:[]}},end={...bare(),core:{casks:[],archive:[cask(1,{bottledMonth:6})],products:[]},records:[{caskId:1,productId:99,samples:[{age:6,text:['古い記録']}]}]};let calls=0;
 const v=buildCaskLedger(s,{facts,replay:observer=>{calls++;observer({operation:{key:'fill'},before:{...bare(),still:{distillation:{progress:55}}},after:start});observer({operation:{key:'bottle'},before:start,after:end});}});
 assert.equal(calls,1);assert.equal(v.casks[0].initialProfile.wood,0);assert.equal(v.casks[0].stopAt,55);assert.deepEqual(v.casks[0].samples,[{age:6,text:['古い記録']}]);assert.deepEqual(v.casks[0].releaseKeys,[]);assert.equal(v.casks[0].status,'bottled');
});

test('volume points use original event snapshots, not monthly ticks, and prefer explicit sample month',()=>{
 const s=bare(),sample={age:3,type:'refill',profile:{roughness:.2,character:.6,wood:.3,litres:90},text:['試飲']};
 const start={...bare(),core:{casks:[cask(1,{age:0,litres:100})],archive:[]}},after={...bare(),core:{month:3,casks:[cask(1,{age:3,litres:90})],archive:[]},notesById:{1:{samples:[sample]}}};
 const v=buildCaskLedger(s,{facts,replay:cb=>{cb({operation:{key:'fill'},before:bare(),after:start});cb({operation:{key:'month'},before:start,after});cb({operation:{key:'sample',value:1},before:after,after});}});
 assert.deepEqual(v.casks[0].volumeHistory.map(x=>[x.source,x.month,x.litres]),[['fill',0,100],['sample',3,90]]);
});

test('real partial bottling preserves the live parent and links each current release without writes',()=>{
 let s=fill(D.newBrandIdentityDistillery(42));const first=s.core.casks[0],id=first.id,initial={roughness:first.roughness,character:first.character,wood:first.wood,litres:first.litres};s=advance(s,3);s=D.sampleDistillery(s,id);s=D.endTasting(s);s=D.careForCask(s,id);s=D.bottleBranded(s,id,{name:'小さな川',bottle:'round',label:'cream'},5);
 s=advance(s,3);s=D.sampleDistillery(s,id);s=D.endTasting(s);s=D.bottleBranded(s,id,{brandId:1},3);
 const raw=D.serializeDistillery(s),view=project(s),item=view.casks.find(c=>c.caskId===id);
 assert.equal(item.status,'aging');assert.deepEqual(item.samples.map(x=>x.age),[3,6]);assert.equal(item.samples.length,s.notesById[id].samples.length);
 assert.deepEqual(item.releaseKeys,buildReleaseLedger(s).entries.map(x=>x.key));assert.deepEqual(item.initialProfile,initial);assert.equal(item.volumeHistory.some(x=>x.source==='care'&&x.month===3),true);
 assert.equal(D.serializeDistillery(s),raw);assert.deepEqual(project(D.restoreDistillery(raw)),view);
});

test('real replay recovers tasting notes pruned from records; cold restore yields the same detached projection',()=>{
 let s=D.newRecipeDistillery(42),firstId,original;
 for(let i=0;i<13;i++){
  s=resolve(s);if(s.generations.active.phase==='review')s=D.handoverGeneration(s,s.generations.active.id);
  s=fill(s,{progress:65});const id=s.core.casks.at(-1).id;
  s=advance(s,6);if(i===0){firstId=id;s=D.sampleDistillery(s,id);original=structuredClone(s.notesById[id].samples);s=D.endTasting(s);}
  s=D.bottleBranded(s,id,i?{brandId:1}:{name:'川霧'});s=D.setSalePrice(s,'low',s.result.productId);s=D.listBottles(s,s.result.productId);
  if(s.generations.active.phase==='review')s=D.handoverGeneration(s,s.generations.active.id);s=advance(s,6);
 }
 assert.equal(s.records.some(r=>r.caskId===firstId),false);assert.equal(s.notesById[firstId],undefined);
 const raw=D.serializeDistillery(s),view=project(s),old=view.casks.find(c=>c.caskId===firstId);
 assert.deepEqual(old.samples,original);assert.equal(old.status,'bottled');assert.equal(view.recipes.unsaved.some(r=>r.caskId===firstId),true);assert.equal(D.serializeDistillery(s),raw);
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};import {buildCaskLedger} from ${JSON.stringify(new URL('../cask-ledger.mjs',import.meta.url).href)};const s=D.restoreDistillery(fs.readFileSync(0,'utf8'));const f=D.nearbyComparisonFacts(s,{includeManualSources:true,caskIds:[...s.core.casks,...s.core.archive,...s.records,...s.releases].map(c=>c.caskId??c.id)});process.stdout.write(JSON.stringify(buildCaskLedger(s,{facts:f,replay:cb=>D.replayDistilleryOperations(s,cb)})));`;
 const cold=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:8e6}));assert.deepEqual(cold,view);
});

test('real migrated save preserves origin limitations rather than inventing old tasting notes',()=>{
 const s=D.restoreDistillery(fs.readFileSync(new URL('./fixtures/v09-due.json',import.meta.url),'utf8')),raw=D.serializeDistillery(s),view=project(s);
 assert.equal(view.coverage.complete,false);assert.equal(view.coverage.fromMonth,37);assert.equal(view.coverage.replayed,true);assert.equal(D.serializeDistillery(s),raw);
 for(const item of view.casks)if(item.samples===null)assert.equal(item.initialProfile,null);
});
