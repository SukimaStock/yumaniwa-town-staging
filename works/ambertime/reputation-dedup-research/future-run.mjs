// H1-B1 isolated future branches. All game operations call unchanged public APIs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as D from '../partner-orders.mjs';
import * as T from '../experiments/town-simulation/v01/model.mjs';
import {mapProgress,mapIntroduction} from '../world-map-view.mjs';
import {encode,decode} from './adapter.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const raw=value=>JSON.stringify(value);
const townOf=s=>s.labConnection.town;
function summary(s){const town=townOf(s),counts={};for(const e of town.events)counts[e.type]=(counts[e.type]??0)+1;return {month:s.core?.month??town.month,generation:s.generations?.active?.id??town.generation,events:town.events.length,arrivals:town.arrivals.length,counts,stateSha256:sha(raw(s))};}
function branch(name,initial,scope){
 const states=Object.fromEntries(['A','B','C'].map(v=>[v,JSON.parse(decode(encode(raw(initial),v)))])),steps=[];
 return {get state(){return states.A;},step(label,fn){
  const before=raw(states.A),beforeIds=new Set(townOf(states.A).events.map(e=>e.id)),results={};
  for(const v of ['A','B','C']){const wire=encode(raw(states[v]),v),restored=JSON.parse(decode(wire));assert.equal(raw(restored),before,'pre-operation mismatch '+name+':'+label+':'+v);states[v]=fn(restored);results[v]=raw(states[v]);assert.equal(decode(encode(results[v],v)),results[v],'post-operation codec mismatch');}
  assert.equal(results.B,results.A,'future B mismatch '+name+':'+label);assert.equal(results.C,results.A,'future C mismatch '+name+':'+label);
  const after=townOf(states.A),newEvents=after.events.filter(e=>!beforeIds.has(e.id));
  const ids=new Set(after.events.map(e=>e.id));assert.equal(ids.size,after.events.length);assert.deepEqual(after.arrivals.map(e=>e.id),after.events.filter(e=>e.type==='arrival').map(e=>e.id));
  for(const e of newEvents)if(e.sourceId)assert(ids.has(e.sourceId),'missing source after operation');
  steps.push({label,stateSha256:sha(results.A),month:states.A.core?.month??after.month,newEventCount:newEvents.length,newArrivals:newEvents.filter(e=>e.type==='arrival').length,newInquiries:newEvents.filter(e=>e.type==='inquiry').length,operationsAdded:states.A.operations?states.A.operations.length-JSON.parse(before).operations.length:null});
 },finish(){return {name,scope,steps,final:summary(states.A),allVariantsExact:true};}};
}
export function runShortFuture(){const cases=[];
 // Existing complete formal fixture provides a real inventory, existing stockist,
 // and correct operation history. No arbitrary game fields are changed.
 const fixtureRaw=JSON.parse(readFileSync(new URL('../tests/fixtures/placement-established-six.json',import.meta.url))).raw;
 const delivery=branch('formal-stockist-delivery',D.restoreDistillery(fixtureRaw),'full formal game');
 const beforeShipments=townOf(delivery.state).shipments.length,beforeDeliveries=delivery.state.shop.deliveries.length;
 delivery.step('deliver-one',s=>D.deliverShop(s,5,1,'town-liquor'));
 assert.equal(delivery.state.shop.deliveries.length,beforeDeliveries+1);assert.equal(townOf(delivery.state).shipments.length,beforeShipments+1);
 for(let n=1;n<=6;n++)delivery.step('month-'+n,D.tickDistillery);
 assert(D.serializeDistillery(delivery.state));cases.push(delivery.finish());
 // A public-model career naturally reaches funds-stalled generation review.
 // No clocks, cash or generation fields are assigned directly.
 const generation=branch('formal-generation-seed42',D.newMarketRulesDistillery(42),'full formal game');
 for(let n=0;n<390&&D.generationStatus(generation.state).phase!=='review';n++){
  const before=raw(generation.state);generation.step('monthly-or-stall-'+n,D.tickDistillery);assert.notEqual(raw(generation.state),before,'unexpected stuck generation career');
 }
 const status=D.generationStatus(generation.state);assert.equal(status.phase,'review');generation.step('notice-generation',s=>D.noticeGeneration(s,status.id));generation.step('handover-generation',s=>D.handoverGeneration(s,status.id));assert.equal(generation.state.generations.active.id,2);assert.equal(generation.state.generations.completed.length,1);assert(D.serializeDistillery(generation.state));cases.push(generation.finish());
 // Standalone town component: actual external reaction model with three seeds
 // and two distinct product profiles/labels. This is not full-game economics.
 for(const seed of [42,314159,20261105]){
  const town=T.createExternal({seed}),c=branch('town-seed-'+seed,{version:20,labConnection:{town}},'town component only; synthetic v20 wrapper for codec');
  for(const [id,key] of [[1,'standard'],[2,'long']])c.step('register-product-'+id,s=>{T.registerExternalRelease(townOf(s),{externalId:id,product:{...T.PRODUCTS[key],label:'B1銘柄'+id,specimenId:'b1-'+id,productId:id},count:720});return s;});
  for(let month=1;month<=96;month++){
   c.step('month-'+month,s=>{T.advanceExternal(townOf(s),month);return s;});
   if(month%3===0)c.step('receipt-'+month,s=>{T.receiveExternal(townOf(s),{receiptId:'b1:'+month,releaseId:month%6===0?2:1,to:'town',count:6});return s;});
  }
  const count=summary(c.state).counts;assert(count.arrival>0);assert(count.inquiry>0,'seed must actually generate inquiry');assert(new Set(townOf(c.state).arrivals.map(e=>e.mainReleaseId)).size===2,'both products must arrive');cases.push(c.finish());
 }
 return {fixtureSha256:sha(fixtureRaw),cases};
}
export function runLongFuture(saves){const report=readFileSync(new URL('../chronicle-lab/H24.md',import.meta.url),'utf8'),labels={local:'地元密着',wide:'広域展開',mixed:'混合'},cases=[];
 for(const id of Object.keys(labels))for(const month of [360,720,1080,1200]){
  const text=readFileSync(saves+'/'+id+'-'+month+'.json','utf8'),match=[...report.matchAll(/\| (地元密着|広域展開|混合) \| (30|60|90|100) \| (\d+) \|.*?`([a-f0-9]{64})`/g)].find(r=>r[1]===labels[id]&&+r[2]*12===month);assert(match);assert.equal(sha(text),match[4]);
  const c=branch(id+'-'+month,JSON.parse(text),'full game exact H24 save; parsed previously verified state, no repeated cold replay');c.step('next-month',D.tickDistillery);assert.equal(c.state.core.month,month+1);const map=mapProgress(c.state),introductions=[1,2,3,4,5,6].map(stage=>mapIntroduction(c.state,stage));cases.push({...c.finish(),inputSha256:sha(text),map:{...map,activeShops:[...map.activeShops]},introductions});
 }
 return cases;
}
export function fingerprint(){return sha(['future-run.mjs','adapter.mjs'].map(f=>readFileSync(new URL(f,import.meta.url),'utf8')).join('\n'));}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){const [saves,output]=process.argv.slice(2);assert(output,'future-run.mjs <save-directory|short> <scratch-output.json>');const start=fingerprint(),short=runShortFuture(),long=saves==='short'?[]:runLongFuture(saves);assert.equal(fingerprint(),start);writeFileSync(output,JSON.stringify({schema:'ambertime-h1-b1-future/1',baseSha:'fcc14b249733b6cccd598bcd2e567e64848bcd7f',node:process.version,codeFingerprint:start,short,long,limitations:['Codec expands into unchanged formal or town state before each unchanged public operation. Compact live state is never passed to product model.','Short formal scenarios use genuine public operations and validate at end; standalone town scenarios do not simulate full game economics.','Long exact H24 states use prior verified JSON parsed inputs, not a new complete cold replay for every branch.','No iPhone Safari or live UI/clock testing.']},null,2)+'\n');console.log(JSON.stringify({short:short.cases.map(c=>({name:c.name,steps:c.steps.length,...c.final})),long:long.length}));}
