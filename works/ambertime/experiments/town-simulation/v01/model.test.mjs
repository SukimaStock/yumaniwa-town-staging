import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as M from './model.mjs';
import {compare} from './analyze.mjs';
const runs=compare(),node=id=>M.NODES.find(n=>n.id===id);
test('three profiles x two fixed seeds retain exact recorded results and conserved causal logs',()=>{
 const recorded=JSON.parse(readFileSync(new URL('./stage2-results.json',import.meta.url)));
 assert.deepEqual(runs.map(x=>x.result),recorded.runs);
 for(const {state:s}of runs){
  assert.equal(M.validate(s).ok,true);assert.equal(s.month,1200);assert.equal(s.generation,4);assert.ok(s.peakBarrels<=4);
  const events=new Map(s.events.map(e=>[e.id,e]));
  for(const shipment of s.shipments)for(const p of shipment.parts)assert.ok(s.releases[p.releaseId-1].month<shipment.month);
  for(const trade of s.trades){assert.equal(events.get(trade.sourceId).type,'inquiry');assert.ok(events.get(trade.sourceId).month<trade.month);assert.ok(s.shipments.filter(x=>x.to===trade.to).every(x=>x.month>trade.month));}
  assert.ok(!s.events.some(e=>['sale','purchase'].includes(e.type)));
 }
});
test('selected profile is present from first stock; taste has no age/price quality bonus',()=>{
 for(const product of ['standard','young','long']){const s=M.create({product});assert.equal(s.releases[0].kind,product);assert.equal(M.exportLog(s).initialConditions.initialStockAge,M.PRODUCTS[product].age);assert.equal(s.releases[0].product.wood,M.PRODUCTS[product].wood);}
 assert.ok(M.affinity(node('diner'),M.PRODUCTS.young).fit>M.affinity(node('diner'),M.PRODUCTS.long).fit);
 assert.ok(M.affinity(node('department'),M.PRODUCTS.long).fit>M.affinity(node('department'),M.PRODUCTS.young).fit);
 assert.equal(M.affinity(node('town'),M.PRODUCTS.standard).fit,M.affinity(node('town'),{...M.PRODUCTS.standard,age:99,price:999}).fit);
});
test('poor-fit reach cannot manufacture liking, positive sharing, inquiries or handling',()=>{
 for(const {state:s,result:r}of runs){
  assert.ok(r.reachedWithoutLiking.length>0);
  for(const e of s.events.filter(e=>['interest','share','inquiry','trade'].includes(e.type))){const to=e.type==='share'?e.from:e.to;assert.ok(M.affinity(node(to),s.releases[e.releaseId-1].product).fit>=M.MIN_FIT,`${e.id}:${e.type}:${to}`);}
 }
 for(const seed of [20261021,42]){
  const selected=runs.filter(x=>x.state.seed===seed);
  assert.equal(new Set(selected.map(x=>x.result.likedRegions.join('|'))).size,3);
 }
});
test('chance arrivals have short explanations and a traceable original shipment',()=>{
 for(const {state:s,result:r}of runs){
  assert.ok(r.chanceCount>0);assert.ok(r.firstChance.some(e=>e.type==='shipment'));assert.ok(r.firstChance.some(e=>e.type==='rumor'));
  const events=new Map(s.events.map(e=>[e.id,e]));
  for(const a of s.arrivals.filter(e=>e.channel==='chance')){let parent=a;while(parent.type!=='rumor')parent=events.get(parent.sourceId);assert.ok(parent.reason.includes('通じて'));assert.ok(parent.month<a.month);}
 }
 assert.ok(runs.some(({state:s})=>s.arrivals.some(a=>a.channel==='chance'&&node(a.to).level==='海外'&&a.month<360)));
});
test('prior poor-fit shipments do not count toward later relationship continuity',()=>{
 const s=M.create({product:'young'});s.releases.push({...structuredClone(s.releases[0]),id:2,product:{...M.PRODUCTS.long}});
 s.shipments=Array.from({length:30},(_,i)=>({month:i*3,to:'department',count:3,parts:[{releaseId:1,count:3}]}));
 s.shipments.push({month:120,to:'department',count:3,parts:[{releaseId:2,count:3}]});assert.equal(M.relationship(s,'department'),0);
 s.shipments.push({month:123,to:'department',count:3,parts:[{releaseId:2,count:3}]});
 const clean=structuredClone(s);clean.shipments=clean.shipments.slice(-2);
 assert.equal(M.relationship(s,'department'),M.relationship(clean,'department'));
 assert.ok(M.relationship(s,'department')>0&&M.relationship(s,'department')<.02);
});
test('pending and long-memory paths cannot bypass mismatch gate; memory remains bounded',()=>{
 const s=M.create({seed:42,mode:'memory',product:'long'}),sourceId=s.releases[0].eventId;
 s.pending.push({kind:'inquiry',to:'town',releaseId:1,sourceId,due:1,causalKey:'test-inquiry'},{kind:'trade',to:'diner',releaseId:1,sourceId,due:1,causalKey:'test-trade'});
 s.memories.push({id:'m1',sourceId,releaseId:1,to:'town',createdMonth:-30,due:1,fit:.9,retired:false,resurfaced:false});
 M.advance(s,60);assert.equal(s.events.filter(e=>e.type==='inquiry'||e.type==='trade').length,0);assert.ok(s.memories.filter(m=>!m.retired).length<=48);
 for(const e of s.events.filter(e=>e.type==='resurface'))assert.equal(s.events.filter(x=>x.memoryId===e.memoryId).length,1);
});
test('normal news is bounded and factual; all raw events and schema remain available',()=>{
 for(const {state:s,result:r}of runs){
  const news=M.newsEvents(s);assert.ok(news.length<s.events.length/3);assert.ok(news.every(e=>s.events.includes(e)));assert.ok(r.maxNewsPerMonth<=6);
  assert.ok(!news.some(e=>['shipment','release','memory','share'].includes(e.type)));
  const log=M.exportLog(s);assert.equal(log.events.length,s.events.length);assert.equal(log.schema,'ambertime-town-log/1');assert.ok(log.trials.length>0);
  assert.deepEqual(Object.keys(log).sort(),['schema','labVersion','modelVersion','seed','initialConditions','nodeDefinitions','settingsHistory','period','summary','releases','barrelHistory','shipments','events','arrivals','memories','tradeHistory','generations','finalNodes','pending','pendingTransmissions','trials','validation','checksum'].sort());
  assert.match(M.report(s),/消費者への販売は未計算/);
 }
 const s=M.create();assert.equal(M.phaseFor(s.nodes.town),'取扱いが始まっている');
 s.nodes.town.root=.5;assert.notEqual(M.phaseFor(s.nodes.town),'少しずつ定着している');
});
test('exact replay, midrun policies, invalid inputs and100year cap stay intact',()=>{
 const original=runs[0].state;assert.deepEqual(M.exportLog(M.replay(M.exportLog(original))),M.exportLog(original));
 const s=M.create({seed:42});M.advance(s,12);M.setPolicy(s,{product:'long'});M.setPolicy(s,{policy:'local'});M.advance(s,36);M.setPolicy(s,{policy:'mixed',product:'young'});M.advance(s,120);
 assert.deepEqual(M.exportLog(M.replay(M.exportLog(s))),M.exportLog(s));
 for(const seed of [0,-1,1.5,NaN])assert.throws(()=>M.create({seed}));assert.throws(()=>M.advance(s,1201));assert.throws(()=>M.replay({modelVersion:'ambertime-town/0.1.0'}));
 const capped=structuredClone(original),before=JSON.stringify(capped);M.step(capped);assert.equal(JSON.stringify(capped),before);
 const corrupt=structuredClone(original);corrupt.events[1].sourceId='missing';assert.equal(M.validate(corrupt).ok,false);
});
