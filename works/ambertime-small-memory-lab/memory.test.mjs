import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios} from './fixture.mjs';
import {extractMemory,currentView,compactView,measure} from './memory.mjs';
import {sceneViews} from '../ambertime/recall/pixel-scene.mjs';
const copy=structuredClone;
for(const scenario of scenarios)test(scenario.id+': native and compact facts agree; source remains unchanged',()=>{
 const source=copy(scenario.source),before=JSON.stringify(source),current=currentView(source),memory=extractMemory(source),small=compactView(memory);
 assert.equal(JSON.stringify(source),before);
 assert.equal(small.map.max,current.map.max);assert.deepEqual(small.map.reached,current.map.reached);assert.deepEqual(small.map.activeShops,current.map.activeShops);
 assert.deepEqual(small.shops.map(s=>[s.remark,s.deliveryMonthCount,s.bottles]),current.shops.map(s=>[s.remark,s.deliveryMonthCount,s.bottles]));
 for(const shop of small.shops)for(const c of shop.memories)assert(current.shops.find(s=>s.shopId===shop.shopId).memories.some(x=>x.releaseId===c.releaseId&&x.key===c.key),'B must not invent eligible dialogue');
 assert.deepEqual(small.recalls.map(e=>e.scenes.map(s=>s.sentence)),current.recalls.map(e=>e.scenes.map(s=>s.sentence)));
 for(const e of small.recalls)assert.equal(sceneViews(e).length,e.scenes.length);
 assert.equal(small.ledger.recent.length,Math.min(8,current.ledger.recent.length));
 assert(measure(memory)<measure(source));
});
test('B view survives destroyed source and JSON roundtrip; owns no complete histories',()=>{
 const s=copy(scenarios[1].source),m=JSON.parse(JSON.stringify(extractMemory(s))),expected=compactView(m);
 for(const k of Object.keys(s))delete s[k];
 assert.deepEqual(compactView(m),expected);assert(!('operations'in m));assert(!('recallFacts'in m));assert(!('events'in m.map));assert(!JSON.stringify(m).includes('synthetic-observation'));
 assert(m.shops.every(s=>!('deliveryMonths'in s.facts)));
});
test('same-month deliveries do not manufacture repeat history',()=>{
 const s=copy(scenarios[0].source);s.shop.deliveries=s.shop.deliveries.filter(d=>d.month===14);s.core.month=15;
 const v=compactView(extractMemory(s));assert.equal(v.shops[0].deliveryCount,2);assert.equal(v.shops[0].deliveryMonthCount,1);assert.equal(v.shops[0].remarkKey,'first');
});
test('old same release returns, while gap and missing profile remain honest',()=>{
 const old=compactView(extractMemory(scenarios[1].source));assert(old.shops[0].memories.some(m=>m.releaseId===1&&m.key==='return'));
 const gap=compactView(extractMemory(scenarios[2].source));assert.equal(gap.shops[0].remarkKey,'gap');assert(!gap.shops[0].memories.length);assert.equal(gap.ledger.releases[0].profile,null);
});
test('map distinguishes overseas rumor from contact; ignores direct arrival',()=>{
 const s=copy(scenarios[1].source);s.labConnection.town.events=s.labConnection.town.events.filter(e=>!['inquiry','visit'].includes(e.type));
 assert.equal(currentView(s).map.max,5);assert.equal(compactView(extractMemory(s)).map.max,5);
 s.labConnection.town.events=s.labConnection.town.events.filter(e=>e.channel==='direct');s.labConnection.town.arrivals=s.labConnection.town.events;
 assert.equal(currentView(s).map.max,2);assert.equal(compactView(extractMemory(s)).map.max,2);
});
test('frozen episodes do not rewrite after later facts, and include cross-generation recurrence',()=>{
 const s=copy(scenarios[1].source),m=extractMemory(s),old=JSON.stringify(m.recalls);
 assert.equal(m.recalls.length,2);assert(m.recalls[1].scenes.some(s=>s.links.some(l=>l.crossGeneration)));
 s.recallFacts.push({...copy(s.recallFacts.at(-1)),id:'future',month:900,generationId:3});
 assert.equal(JSON.stringify(compactView(m).recalls),old);assert(Object.isFrozen(m.recalls[0].scenes));
 assert(!m.recalls.flatMap(e=>e.scenes).some(s=>s.links.some(l=>l.causal)),'same region cannot invent causal route');
});
test('UTF-8 byte measurement is real serialized size',()=>assert.equal(measure({x:'酒'}),11));
test('current-month delivery counts are preserved without making dialogue eligible',()=>{
 const s=copy(scenarios[0].source);s.shop.deliveries.push({id:'now',shopId:'town-liquor',brandId:1,releaseId:1,productId:1,count:2,month:s.core.month});
 const a=currentView(s),b=compactView(extractMemory(s));assert.equal(a.shops[0].deliveryCount,b.shops[0].deliveryCount);assert.deepEqual(a.shops[0].memories,b.shops[0].memories);
});
test('later facts cannot change selection seed or content of earlier editions on extraction',()=>{
 const s=copy(scenarios[1].source),a=extractMemory(s).recalls;
 s.core.month=950;s.recallFacts.push({...copy(s.recallFacts.at(-1)),id:'later',month:900,operationIndex:s.recallFacts.length,generationId:3});s.operations.push({key:'synthetic-later'});
 assert.deepEqual(extractMemory(s).recalls,a);
});
test('region recent event uses date across contact and arrival kinds',()=>{
 const s=copy(scenarios[1].source);s.labConnection.town.events.push({id:'new-arrival',type:'arrival',month:755,to:'overseas-food',channel:'road',mainReleaseId:1});
 const r=compactView(extractMemory(s)).map.regions.find(r=>r.id==='overseas-food');assert.equal(r.lastEvent.month,755);assert.equal(r.lastEvent.kind,'arrival');
});
