import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {initializeHistoryRecord,advanceHistoryRecord,assertHistoryRecord,historyRecordView} from '../history-record.mjs';
import {buildGenerationSummaries} from '../generation-summary.mjs';
function trace(initial=D.newMarketRulesDistillery(42)){let game=initial,record=initializeHistoryRecord(game);return {get game(){return game;},get record(){return record;},step(fn){const before=game,next=fn(game),snapshot=JSON.stringify(next);record=advanceHistoryRecord(before,next,record);game=next;assert.equal(JSON.stringify(next),snapshot);return next;}};}
function fill(t,type='refill'){t.step(D.startRangeDistillation);t.step(D.beginCollection);while(t.game.still.distillation.progress<65)t.step(D.distillStep);t.step(D.stopDistillation);t.step(s=>D.fillBarrel(s,type));}
function compare(t){assert.deepEqual(historyRecordView(t.game,t.record).generations,buildGenerationSummaries(t.game));}
test('fresh history records first completed distillation once and all same-month releases without regular fill/sample/month events',()=>{
 const t=trace();assert.equal(t.record.events.length,1);fill(t,'bourbon');t.step(s=>D.sampleDistillery(s,s.core.casks[0].id));t.step(D.endTasting);
 t.step(D.tickDistillery);t.step(s=>D.bottleBranded(s,s.core.casks[0].id,{name:'川霧'},1));t.step(s=>D.bottleBranded(s,s.core.casks[0].id,{brandId:1}));
 const events=t.record.events;assert.equal(events.filter(e=>e.kind==='distillation').length,1);const releases=events.filter(e=>e.kind==='bottling');assert.equal(releases.length,2);assert(releases[0].firstRelease);assert(!releases[1].firstRelease);assert(releases[0].longestAge);assert(!releases[1].longestAge);assert(releases[0].order<releases[1].order);assert.equal(releases[0].month,releases[1].month);assert(!events.some(e=>['fill','sample','month'].includes(e.kind)));compare(t);
 const frozen=JSON.stringify(events);assert.deepEqual(historyRecordView(t.game,JSON.parse(JSON.stringify(t.record))).events,events);assert.equal(JSON.stringify(events),frozen);
});
test('incremental observations preserve official formal state, generation totals and saved event identity',()=>{
 const t=trace();fill(t);for(let i=0;i<6;i++)t.step(D.tickDistillery);t.step(s=>D.bottleBranded(s,s.core.casks[0].id,{name:'川霧'}));t.step(s=>D.listBottles(s,s.result.productId));const prior=JSON.stringify(t.record.events);for(let i=0;i<6;i++)t.step(D.tickDistillery);compare(t);assert.equal(JSON.stringify(t.record.events.slice(0,JSON.parse(prior).length)),prior);assert.deepEqual(D.restoreDistillery(D.serializeDistillery(t.game)),t.game);
 const bad=structuredClone(t.record);bad.events.push(bad.events[0]);assert.throws(()=>assertHistoryRecord(t.game,bad));const changed=structuredClone(t.record);changed.events.find(e=>e.kind==='bottling').caskId=999;assert.throws(()=>assertHistoryRecord(t.game,changed));
});
function synthetic(){const game={seed:42,origin:null,operations:[],core:{month:0,casks:[],archive:[],products:[],cash:100,totals:{bottlesSold:0}},releases:[],brands:[],shop:{relations:[],deliveries:[]},generations:{completed:[],active:{id:1,startedMonth:0,lastStatus:null,lastCaskId:null,lastBatchId:null}},trade:{history:[]},labConnection:{town:{events:[]}}};let record=initializeHistoryRecord(game),current=game;return {get game(){return current;},get record(){return record;},step(fn){const after=structuredClone(current);fn(after);after.operations.push({key:'test'});record=advanceHistoryRecord(current,after,record);current=after;}};}
test('positive delivery continuity requires at least one receipt per12months and resets across gaps',()=>{
 const t=synthetic();t.step(s=>{s.shop.relations.push({shopId:'town-liquor',brandId:1,startedMonth:0});s.shop.deliveries.push({id:1,shopId:'town-liquor',brandId:1,month:0,count:1});});
 for(let m=12;m<=120;m+=12)t.step(s=>{s.core.month=m;s.shop.deliveries.push({id:s.shop.deliveries.length+1,shopId:'town-liquor',brandId:1,month:m,count:1});});
 assert.equal(t.record.events.filter(e=>e.kind==='shop-start').length,1);assert.equal(t.record.events.filter(e=>e.kind==='shop-anniversary').length,1);assert.equal(t.record.events.at(-1).years,10);
 t.step(s=>{s.core.month=300;s.shop.deliveries.push({id:12,shopId:'town-liquor',brandId:1,month:300,count:1});});assert.equal(t.record.events.filter(e=>e.kind==='shop-anniversary').length,1);
});
test('region firsts and long-absent replies retain minimal real ancestor evidence and never infer a return from silence alone',()=>{
 const t=synthetic();t.step(s=>{s.labConnection.town.events.push({id:'e1',type:'shipment',month:0,sourceId:null,releaseId:1,to:'town'},{id:'e2',type:'arrival',month:0,sourceId:'e1',to:'near-wide',releaseId:1,mainReleaseId:1},{id:'e3',type:'inquiry',month:0,sourceId:'e2',to:'near-wide',mainReleaseId:1});});
 assert.equal(t.record.events.filter(e=>e.kind==='region-reached').length,1);assert.equal(t.record.evidence.length,3);
 t.step(s=>{s.core.month=12;s.labConnection.town.events.push({id:'e4',type:'inquiry',month:12,sourceId:'e2',to:'near-wide',mainReleaseId:1});});assert.equal(t.record.events.filter(e=>e.kind==='inquiry').length,1);
 t.step(s=>{s.core.month=132;});assert.equal(t.record.events.filter(e=>e.kind==='inquiry').length,1);
 t.step(s=>s.labConnection.town.events.push({id:'e5',type:'inquiry',month:132,sourceId:'e2',to:'near-wide',mainReleaseId:1}));assert.equal(t.record.events.at(-1).afterMonths,120);assert(!t.record.events.at(-1).first);assert(!t.record.evidence.some(e=>e.id==='e4'));
});
test('handover freezes predecessor estate and totals; a successor cannot rewrite previous events',()=>{
 const t=synthetic();t.step(s=>{s.core.month=360;s.generations.completed.push({...s.generations.active,endedMonth:360,lastStatus:'not-made',reason:'tenure-limit',trigger:{kind:'tenure-limit',month:360}});s.generations.active={id:2,startedMonth:360,lastStatus:null,lastCaskId:null,lastBatchId:null};});
 const row=structuredClone(t.record.generations[0]),event=structuredClone(t.record.events.at(-1));t.step(s=>{s.core.month=361;s.core.cash=99;s.core.totals.bottlesSold=3;});assert.deepEqual(t.record.generations[0],row);assert.deepEqual(t.record.events.find(e=>e.id===event.id),event);assert.equal(t.record.generations[1].totals.sold,3);
});
test('ordinary predecessor cask keeps its creation generation through successor release and two handovers',()=>{
 const t=synthetic();t.step(s=>{s.core.casks.push({id:9,batchId:4,filledMonth:0,age:0});});
 const handover=s=>{const id=s.generations.active.id;s.generations.completed.push({...s.generations.active,endedMonth:s.core.month,lastStatus:'not-made',reason:'tenure-limit',trigger:{kind:'tenure-limit',month:s.core.month}});s.generations.active={id:id+1,startedMonth:s.core.month,lastStatus:null,lastCaskId:null,lastBatchId:null};};
 t.step(s=>{s.core.month=360;handover(s);});
 t.step(s=>{s.core.products.push({id:8,originalStock:10,age:360});s.releases.push({id:1,productId:8,caskId:9,brandId:1,bottledMonth:360,age:360,bottles:10});s.core.archive.push({...s.core.casks[0],bottledMonth:360});s.core.casks=[];});
 const e=t.record.events.find(e=>e.kind==='bottling');assert.equal(e.generationNumber,2);assert.equal(e.sourceGeneration,1);assert.equal(t.record.caskOrigins.length,0);const frozen=structuredClone(t.record.generations.slice(0,1));
 t.step(s=>{s.core.month=720;handover(s);});assert.equal(t.record.events.filter(e=>e.kind==='generation-handover').length,2);assert.equal(t.record.generations[2].startedMonth,720);assert.deepEqual(t.record.generations.slice(0,1),frozen);
});
test('a completed extraction before a batched month is dated at completion, not the later save month',()=>{
 const t=trace();t.step(D.startRangeDistillation);t.step(D.beginCollection);while(t.game.still.distillation.progress<24)t.step(D.distillStep);
 const month=t.game.core.month;t.step(s=>D.tickDistillery(D.stopDistillation(s)));const e=t.record.events.find(e=>e.kind==='distillation');assert.equal(e.month,month);assert.equal(t.game.operations[e.operationIndex].key,'stop');
});
test('department acceptance is distinct from a proven adoption, and special order shipment/result deduplicate',()=>{
 const t=synthetic();t.step(s=>{s.shop.relations.push({brandId:1,shopId:'department',startedMonth:0});s.department={adoptions:[],interests:[{pendingDelivery:{count:5}}]};});assert.equal(t.record.events.filter(e=>e.kind==='department-adoption').length,0);
 t.step(s=>{s.core.month=1;s.shop.deliveries.push({id:1,brandId:1,shopId:'department',productId:8,releaseId:4,month:1,count:5,revenue:100});s.department.adoptions.push({deliveryId:1,brandId:1,releaseId:4,month:1,count:5,projectId:'special',projectName:'特選',selectionId:'pick1'});s.core.totals.bottlesSold=5;});
 assert.equal(t.record.events.filter(e=>e.kind==='department-adoption').length,1);assert.equal(t.record.generations[0].totals.sold,5);assert.equal(t.record.relationships[0].adoptions,1);
 t.step(s=>{s.trade.history.push({kind:'shipped',orderId:7,productId:8,caskId:9,month:1,outcome:'fulfilled',bottles:5},{kind:'order-fulfilled',orderId:7,caskId:9,month:1});});
 assert.equal(t.record.events.filter(e=>e.kind==='special-order-fulfilled').length,1);const count=t.record.events.length;t.step(()=>{});assert.equal(t.record.events.length,count);
});
test('unknown event kinds and changed town evidence are rejected',()=>{
 const t=synthetic();t.step(s=>{s.labConnection.town.events.push({id:'e1',type:'arrival',month:0,sourceId:null,to:'national-food',mainReleaseId:1});});
 for(const change of [r=>{r.events[1].kind='invented';},r=>{r.evidence[0].to='overseas-craft';},r=>{r.events[1].sourceEventId='e999';},r=>{r.events[1].regionId='overseas-craft';}]){const bad=structuredClone(t.record);change(bad);assert.throws(()=>assertHistoryRecord(t.game,bad));}
});
test('lawful monthly automatic bottling records one release and preserves exact generation summary',()=>{
 const t=trace(D.newFreeAgingDistillery(42));t.step(D.startDistillation);while(t.game.still.distillation.progress<65)t.step(D.distillStep);t.step(D.stopDistillation);t.step(s=>D.fillBarrel(s,'refill'));const id=t.game.core.casks[0].id;
 t.step(s=>D.bottleBranded(s,id,{},1));t.step(D.hireBottlingStaff);t.step(s=>D.reserveBottling(s,id,{mode:'age',age:1,count:10}));const before=t.record.events.filter(e=>e.kind==='bottling').length;
 t.step(D.tickDistillery);assert.equal(t.game.automation.lastBottlings[0].count,10);assert.equal(t.record.events.filter(e=>e.kind==='bottling').length,before+1);assert.equal(t.record.events.at(-1).count,10);assert.equal(t.record.events.at(-1).month,t.game.core.month);compare(t);
});
