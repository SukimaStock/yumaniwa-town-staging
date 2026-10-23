// Focused outcome/replay comparison against the immutable pre-0.25.1 runtime.
// Run: AMBERTIME_BASE_ROOT=/path/to/base node works/ambertime/tests/performance-0251-compat.mjs
// Native browser timing is deliberately a separate experiment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as current from '../partner-orders.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const baseRoot=process.env.AMBERTIME_BASE_ROOT??path.resolve(root,'../ambertime-opt');
const baseSha='c662e09fdf486c22b8012fb4e9e119c350f4af1e';
const source='works/ambertime/partner-orders.mjs';
assert.equal(fs.readFileSync(path.join(baseRoot,source),'utf8'),execFileSync('git',['show',baseSha+':'+source],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024}),'baseline partner-orders must be the immutable pre-change source');
const baseline=await import(pathToFileURL(path.join(baseRoot,source)).href);
const hash=s=>createHash('sha256').update(s).digest('hex');
const results=[];let assertions=0;
function pair(name,initial){
 let a=initial(baseline),b=initial(current),steps=0;
 const check=()=>{assert.equal(JSON.stringify(b),JSON.stringify(a),name+' state after '+steps);assertions++;};check();
 return {
  get state(){return b;},
  op(key,...args){a=baseline[key](a,...args);b=current[key](b,...args);steps++;check();return this;},
  to(position){while(b.still.distillation.progress<position)this.op('distillStep');return this;},
  month(n=1){for(let i=0;i<n;i++){for(let guard=0;b.decisions.length;guard++){assert(guard<20);const d=b.decisions[0],choice=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');assert(choice);this.op('chooseDistillery',d.caskId,choice.id);}if(b.trade.offer)this.op('declineOffer');const month=b.core.month;this.op('tickDistillery',month);assert.equal(b.core.month,month+1);}return this;},
  cold(){const old=baseline.serializeDistillery(a),now=current.serializeDistillery(b);assert.equal(now,old,name+' save bytes');a=baseline.restoreDistillery(old);b=current.restoreDistillery(old);assert.equal(current.serializeDistillery(b),old,name+' baseline save resumed');assert.equal(baseline.serializeDistillery(current.restoreDistillery(now)),now,name+' old reader accepts new save');steps++;check();return this;},
  done(extra={}){this.cold();results.push({name,operations:steps,month:b.core.month,sha256:hash(JSON.stringify(b)),...extra});return this;}
 };
}
for(const seed of [42,43,20261021])for(const recipe of [
 {malt:'plain',ferment:'long',start:12,end:40,type:'refill'},
 {malt:'plain',ferment:'short',start:35,end:65,type:'bourbon'},
 {malt:'peat',ferment:'long',start:63,end:89,type:'refill'}
]){
 const p=pair('manual-'+seed+'-'+recipe.start+'-'+recipe.end,D=>D.newConnectedDistillery(seed));
 p.op('selectFlavorCards',{malt:recipe.malt,ferment:recipe.ferment}).op('startRangeDistillation').to(recipe.start).cold().op('beginCollection').to(recipe.end).cold().op('stopDistillation').cold();
 const spirit=structuredClone(p.state.core.spirit);
 p.op('fillBarrel',recipe.type).month(12).cold().op('bottleBranded',p.state.core.casks[0].id,{}).op('setSalePrice','low',p.state.result.productId).op('listBottles',p.state.result.productId).month(3).done({seed,recipe,spirit});
}
// Legacy public entry point retains the existing easy employment contract; the
// later connected adapter is enabled only after the ordinary recorded hire.
for(const seed of [42,43]){
 const p=pair('automatic-'+seed,D=>D.newFreeAgingDistillery(seed));
 p.op('startDistillation').to(65).op('stopDistillation').op('fillBarrel','refill').month().op('hireStaff').op('enableStage4');
 const id=p.state.core.casks[0].id;
 p.op('reserveStaff',id,'three').cold().op('beginUsual').to(31).cold();
 let guard=0;while(p.state.usual.reservation?.status==='active'){assert(++guard<100);p.op('distillStep');if(guard%5===0)p.cold();}
 p.cold().month().op('cancelUsual').done({seed,delegatedCasks:p.state.core.casks.length});
}
// Existing monthly bottling policy: retail depletion, one refill, no same-month
// sale of the refill. Compare the whole state, including wages and receipts.
{
 const p=pair('automatic-bottling',D=>D.newMonthlyTimingDistillery(42));
 p.op('startDistillation').to(65).op('stopDistillation').op('fillBarrel','refill').month(12);
 const id=p.state.core.casks[0].id;
 p.op('bottleBranded',id,{},1).op('hireBottlingStaff').op('bottleBranded',id,{},10).op('setSalePrice','low',p.state.result.productId).op('listBottles',p.state.result.productId).op('reserveBottling',id,{mode:'stock',threshold:5,count:10}).op('enableStage4').month().cold();
 assert.equal(p.state.automation.lastBottlings.length,1);const refill=p.state.automation.lastBottlings[0];assert.equal(refill.count,10);assert.equal(p.state.core.products.find(x=>x.id===refill.productId).sold,0);
 p.month(2).done({refill});
}
// Captured legal save with approved shop and sufficient stock. Adapter is the
// unchanged main external connection; monthly receipts/town events are compared.
{
 const legacy=JSON.parse(fs.readFileSync(new URL('./fixtures/shop-demand-legacy.json',import.meta.url),'utf8')).before;
 const p=pair('automatic-delivery-reputation',D=>D.enableStage4(D.enableShopDemand(D.restoreDistillery(legacy))));
 const before=p.state.shop.deliveries.length;p.month().cold();assert(p.state.shop.deliveries.length>before,'real automatic shipment occurred');
 p.month(12);assert(p.state.labConnection.town.shipments.length>0,'actual receipts reached town adapter');p.done({newDeliveries:p.state.shop.deliveries.length-before,townConnected:!!p.state.labConnection?.town,townShipments:p.state.labConnection.town.shipments.length,townEvents:p.state.labConnection.town.events.length});
}
// Old save inputs exercise migration/restore independently from the live-state
// checkpoints, including legacy staff/automation/order variants.
for(const name of ['v09-initial','partial-legacy','shop-demand-legacy','bottling-roles-legacy','staff-progression-v20','monthly-timing-v20','delegation-v20']){
 const value=JSON.parse(fs.readFileSync(new URL('./fixtures/'+name+'.json',import.meta.url),'utf8'));
 const texts=[];function collect(x){if(typeof x==='string'&&x.startsWith('{')){try{const parsed=JSON.parse(x);if(parsed.version&&parsed.rules)texts.push(x);}catch{}}else if(x&&typeof x==='object'){if(x.version&&x.rules)texts.push(JSON.stringify(x));else for(const child of Object.values(x))collect(child);}}collect(value);
 let count=0;for(const text of texts){const old=baseline.serializeDistillery(baseline.restoreDistillery(text));assert.equal(current.serializeDistillery(current.restoreDistillery(text)),old,name+' legacy roundtrip');count++;assertions++;}assert(count>0,name+' input found');results.push({name:'legacy-'+name,cases:count});
}
// Same mutable object must not acquire identity-based trust after validation.
// Failed validation must not poison a later legitimate branch/checkpoint.
{
 let s=current.startRangeDistillation(current.newConnectedDistillery(42));
 while(s.still.distillation.progress<15)s=current.distillStep(s);const earlier=structuredClone(s);current.validateDistillery(s);
 while(s.still.distillation.progress<40)s=current.distillStep(s);current.validateDistillery(s);
 const edits=[x=>x.core.cash+=1,x=>x.still.distillation.litres+=.5,x=>x.core.spirit.character+=.01,x=>x.operations[0].key='forged',x=>x.still.distillation.progress--];
 for(const edit of edits){const bad=structuredClone(s);current.validateDistillery(bad);edit(bad);assert.throws(()=>current.serializeDistillery(bad));current.validateDistillery(s);assertions++;}
 assert.equal(current.serializeDistillery(earlier),baseline.serializeDistillery(baseline.restoreDistillery(JSON.stringify(earlier))),'valid earlier progress survives newer cache');
 const branches=[20,30].map(position=>{let branch=structuredClone(earlier);while(branch.still.distillation.progress<position)branch=current.distillStep(branch);branch=current.beginCollection(branch);while(branch.still.distillation.progress<50)branch=current.distillStep(branch);return branch;});
 for(const branch of [branches[0],branches[1],branches[0]]){const raw=current.serializeDistillery(branch);assert.equal(baseline.serializeDistillery(baseline.restoreDistillery(raw)),raw,'branch replay agrees with old validator');assertions++;}
 results.push({name:'strict-mutation-rollback-branch',rejectedEdits:edits.length,branches:branches.length});
}
console.log(JSON.stringify({baselineSha:baseSha,baselineSourceSha256:hash(fs.readFileSync(path.join(baseRoot,source))),assertions,results},null,2));
