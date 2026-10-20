import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {extractionMaximum,bottleChoices,defaultBottleCount,releaseLabel} from '../ui-details.mjs';
import * as D from '../partner-orders.mjs';
import {ageCask} from '../model.mjs';
import {aromaPreview} from '../aroma-extraction.mjs';
import {createCaskSerials} from '../cask-serials.mjs';
import {automaticEvents,noticeText} from '../event-notices.mjs';
import {fill,advance} from './brands-helpers.mjs';
function cold(s){const raw=D.serializeDistillery(s),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:4e6}),raw);return D.restoreDistillery(raw);}

test('five-bottle choices respect remaining quantity and affordability, including short remainders',()=>{
 for(const [max,affordable,want]of [[23,23,[5,10,15,20,23]],[20,20,[5,10,15,20]],[23,12,[5,10]],[23,9,[5]],[23,4,[4]],[4,4,[4]],[4,3,[3]],[1,9,[1]],[0,0,[]],[12,0,[]],[12,-1,[]],[8,20,[5,8]],[8.9,8.9,[5,8]],[NaN,20,[]],[20,Infinity,[]]])assert.deepEqual(bottleChoices(max,affordable),want,`${max}/${affordable}`);
 for(let max=0;max<=57;max++)for(let affordable=0;affordable<=60;affordable++){
  const choices=bottleChoices(max,affordable);assert.deepEqual(choices,[...new Set(choices)].sort((a,b)=>a-b));for(const n of choices)assert(Number.isInteger(n)&&n>0&&n<=max&&n<=affordable);if(max>0&&affordable>=max)assert(choices.includes(max));
 }
});

test('remembered bottle selection stays legal or moves down to an available choice',()=>{
 for(const [previous,max,affordable,want]of [[15,23,23,15],[23,23,23,23],[14,23,23,10],[23,23,12,10],[1,23,23,5],[2,23,4,4],[99,23,23,23],[undefined,23,23,5],[null,23,23,5],[NaN,23,23,5],[10,0,0,null]])assert.equal(defaultBottleCount(previous,max,affordable),want);
});

test('release labels use bottling date and disambiguate all same-month casks and local repeated portions',()=>{
 // Synthetic display projection only: deliberately shuffled IDs prove local ordinal is independent of row order.
 const state={core:{month:50},releases:[{id:12,productId:102,caskId:40,bottledMonth:13},{id:11,productId:101,caskId:20,bottledMonth:13},{id:10,productId:100,caskId:20,bottledMonth:13},{id:13,productId:103,caskId:20,bottledMonth:14}],records:[],shop:{deliveries:[{productId:100,month:48}]}};
 const serials=new Map([[20,1],[40,2]]),before=JSON.stringify(state);
 assert.equal(releaseLabel(state,100,serials),'2027年2月 · たる No.1 · 1回目');assert.equal(releaseLabel(state,101,serials),'2027年2月 · たる No.1 · 2回目');assert.equal(releaseLabel(state,102,serials),'2027年2月 · たる No.2');assert.equal(releaseLabel(state,103,serials),'2027年3月');assert.equal(JSON.stringify(state),before);assert.deepEqual([...serials],[[20,1],[40,2]]);assert.equal(releaseLabel(state,100),'2027年2月 · たる No.? · 1回目');
});

test('missing release falls back to actual record bottling date only, never delivery or event date',()=>{
 const state={core:{month:100},releases:[],records:[{productId:4,bottledMonth:0,month:90},{productId:5,bottledMonth:15}],shop:{deliveries:[{productId:4,month:90},{productId:6,month:91}]},events:[{productId:6,month:92}]};
 assert.equal(releaseLabel(state,4),'2026年1月');assert.equal(releaseLabel(state,5),'2027年4月');assert.equal(releaseLabel(state,6),'発売日不明');assert.equal(releaseLabel({},6),'発売日不明');
});

test('lawful paid partial/full bottling labels leave saved IDs, quantities, costs and cold-restored bytes exact',()=>{
 let s=fill(D.newStaffExperienceDistillery(42),{progress:65});s=advance(s,1);s=fill(s,{progress:65});const [first,second]=s.core.casks.map(c=>c.id),costs=s.core.totals.costs,cash=s.core.cash;
 s=D.bottleBranded(s,first,{},5);const p1=s.result.productId;s=D.bottleBranded(s,first,{},10);const p2=s.result.productId;const all=D.quote(s,second).count;s=D.bottleBranded(s,second,{},all);const p3=s.result.productId;
 assert.equal(s.core.totals.costs,costs+(15+all)*3);assert.equal(s.core.cash,cash-(15+all)*3);assert.deepEqual(s.core.products.map(p=>p.originalStock),[5,10,all]);
 const raw=D.serializeDistillery(s),identities=s.releases.map(r=>[r.id,r.productId,r.caskId]),serials=createCaskSerials()(s),labels=[p1,p2,p3].map(id=>releaseLabel(s,id,serials));
 assert.deepEqual(labels,['2026年2月 · たる No.1 · 1回目','2026年2月 · たる No.1 · 2回目','2026年2月 · たる No.2']);assert.deepEqual(s.releases.map(r=>[r.id,r.productId,r.caskId]),identities);assert.equal(D.serializeDistillery(s),raw);
 const restored=cold(s);assert.deepEqual([p1,p2,p3].map(id=>releaseLabel(restored,id,createCaskSerials()(restored))),labels);assert.equal(D.serializeDistillery(restored),raw);
});

test('display maximum remains the actual legal99 endpoint without inventing a100 recipe',()=>{
 assert.equal(extractionMaximum,99);let s=D.startDistillation(D.newStaffExperienceDistillery(42));for(let i=0;i<120;i++)s=D.distillStep(s);assert.equal(s.still.phase,'distilling');assert.equal(s.still.distillation.progress,extractionMaximum);assert.equal(s.still.distillation.litres,39.77);assert.throws(()=>aromaPreview(100));s=D.stopDistillation(s);assert.equal(s.still.phase,'filling');assert.equal(s.still.distillation.progress,99);cold(s);
});

test('cooling stays a once-only unchanged paid-game action that slows wood, evaporation and softening without stopping age',()=>{
 let s=fill(D.newStaffExperienceDistillery(42),{progress:65,type:'bourbon'}),id=s.core.casks[0].id,normal=s.core.casks[0],cash=s.core.cash,costs=s.core.totals.costs;s=D.careForCask(s,id);assert.equal(s.core.cash,cash);assert.equal(s.core.totals.costs,costs);assert.equal(s.core.casks[0].age,0);assert.equal(D.canCare(s,id),false);assert.throws(()=>D.careForCask(s,id));const warmNext=ageCask(normal),coldNext=ageCask(s.core.casks[0]);assert.equal(warmNext.age,1);assert.equal(coldNext.age,1);assert(coldNext.wood<warmNext.wood);assert(coldNext.litres>warmNext.litres);assert(coldNext.roughness>warmNext.roughness);assert.equal(coldNext.character,warmNext.character);cold(s);
});


test('a real sold-out notice uses the actual release date without changing either saved state',()=>{
 let s=fill(D.newStaffExperienceDistillery(42),{progress:65});s=D.bottleBranded(s,s.core.casks[0].id,{},5);const pid=s.result.productId;s=D.listBottles(D.setSalePrice(s,'low',pid),pid);let soldOut=false;
 for(let month=0;month<8;month++){
  const before=s,after=D.tickDistillery(before);assert.equal(after.core.month,before.core.month+1);const beforeRaw=D.serializeDistillery(before),afterRaw=D.serializeDistillery(after),serials=createCaskSerials()(after);
  const events=automaticEvents(before,after,id=>'たる No.'+serials.get(id),id=>releaseLabel(after,id,serials)),event=events.find(e=>e.id==='sold-out:'+pid);
  assert.equal(D.serializeDistillery(before),beforeRaw);assert.equal(D.serializeDistillery(after),afterRaw);s=after;
  if(event){assert(before.core.products.find(p=>p.id===pid).stock>0);assert.equal(after.core.products.find(p=>p.id===pid).stock,0);const label=releaseLabel(after,pid,serials);assert.equal(event.releaseLabel,label);assert.equal(noticeText(events),label+' 完売');assert.doesNotMatch(noticeText(events),/発売\d/);soldOut=true;cold(after);break;}
 }
 assert(soldOut,'five lawfully listed bottles sell out within the finite bound');
});
