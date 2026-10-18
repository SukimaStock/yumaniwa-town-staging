// Reproducible candidate comparison and actual public-operation generations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import * as D from '../partner-orders.mjs';
import * as S from '../shop-model.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
import {buildLongGame} from './history-simulate.mjs';
import {buildDistilleryHistory} from '../distillery-history.mjs';
const round=n=>Math.round(n*100)/100||0;
const hash=x=>createHash('sha256').update(x).digest('hex');
const base='55030ccb1f764bcf63ad4373a12aac9130095388';
const output=()=>process.env.AMBER_OUT?new URL('file://'+process.env.AMBER_OUT+'/'):new URL('../design/generations/',import.meta.url);
function csv(name,rows){const keys=[...new Set(rows.flatMap(Object.keys))],cell=x=>'"'+String(x==null?'':typeof x==='object'?JSON.stringify(x):x).replaceAll('"','""')+'"';fs.writeFileSync(new URL(name,output()),keys.map(cell).join(',')+'\n'+rows.map(r=>keys.map(k=>cell(r[k])).join(',')).join('\n')+'\n');}

export function compareGenerationCandidates(state){
 const before=D.serializeDistillery(state),facts=buildDistilleryHistory(state),firstBrands=new Map();
 for(const r of state.releases)firstBrands.set(r.brandId,Math.min(firstBrands.get(r.brandId)??Infinity,r.bottledMonth));
 const relations=new Map(state.shop.relations.map(r=>[(r.shopId??'town-liquor')+':'+r.brandId,r.startedMonth]));
 const triggers=facts.events.flatMap(e=>{
  const reasons=[];
  if(e.kind==='bottling'&&e.rerelease&&e.month-(firstBrands.get(e.brandId)??Infinity)>=120)reasons.push('brand-rerelease-10yr');
  if(e.kind==='bottling'&&e.age>=36)reasons.push('bottling-36mo');
  if(['shop-delivery','department-adoption'].includes(e.kind)&&e.month-(relations.get(e.shopId+':'+e.brandId)??Infinity)>=120)reasons.push('store-relationship-10yr-delivery');
  return reasons.map(reason=>({id:e.id,month:e.month,reason,kind:e.kind,brandId:e.brandId,releaseId:e.releaseId,age:e.age,shopId:e.shopId}));
 });
 const rows=[[25,30],[25,35],[30,35]].map(([late,deadline])=>{
  const first=triggers.find(e=>e.month>=late*12&&e.month<=deadline*12);
  return {lateYears:late,deadlineYears:deadline,graceMonths:12,lateActiveMinutes:late*12*P.monthMs/60000,deadlineActiveMinutes:deadline*12*P.monthMs/60000,graceActiveSeconds:12*P.monthMs/1000,firstObservedTriggerMonth:first?.month??null,firstObservedTriggerReason:first?.reason??null,firstObservedTriggerId:first?.id??null,wouldUseDeadlineOnSource:!first};
 });
 assert.equal(D.serializeDistillery(state),before);
 return {method:{base,sourceVersion:state.version,sourceMonths:state.core.month,sourceSeed:state.seed,sourceSha256:hash(before),scope:'Offline chronology only. No proposed generation state is injected into the old play. Per-brand/shop relationship age uses existing startedMonth. Raw clock excludes all UI pauses and human decision time.',adopted:{lateYears:25,deadlineYears:30,graceMonths:12},reason:'This policy already offers a meaningful old-brand rerelease at year25, without requiring a particular flavour or long maturation. A year35 deadline only lengthens the fallback wait; later generation pacing needs human playtesting.',limits:'One pre-generation 40-year policy/seed. These observations do not predict all strategies or prove enjoyment. Fullslots, queuedusual and obligations require separate state-boundary tests. A12monthgrace cannot guarantee a sparecask or maturewhisky.'},candidates:rows,firstByReason:Object.fromEntries([300,360].map(month=>[month,Object.fromEntries(['brand-rerelease-10yr','bottling-36mo','store-relationship-10yr-delivery'].map(reason=>[reason,triggers.find(e=>e.month>=month&&e.reason===reason)??null]))])),triggers};
}

export function buildGenerationGame(months=1440,{seed=1,onCheckpoint=()=>{},onBottling=()=>{}}={}){
 let s=D.newGenerationDistillery(seed),fills=0;
 const transitions=[],finalFillIds=new Set(),finalStarts=new Map();
 const targets=new Map(),cuts=new Map(),brands=new Map(),listAt=new Map();
 function bottle(id){
  const cut=cuts.get(id),brandId=brands.get(cut);
  s=D.bottleBranded(s,id,brandId?{brandId}:{name:{40:'朝霞',65:'川霧',90:'石蔵'}[cut]});
  const r=s.releases.at(-1);brands.set(cut,r.brandId);onBottling(r);
  s=D.setSalePrice(s,'standard',r.productId);
  if(s.core.month>=36&&r.id%3===0)listAt.set(r.productId,s.core.month+6);
  else s=D.listBottles(s,r.productId);
 }
 function policy(){
  for(let guard=0;guard<100;guard++){
   if(s.decisions.length){
    const d=s.decisions[0],c=D.currentCask(s,d.caskId);
    if(d.eventId==='order-unmet'){s=D.chooseDistillery(s,c.id,'order-wholesale');continue;}
    if(d.eventId==='funds'){
     if(D.contractFor(s,c.id))s=D.cancelContract(s,c.id);
     bottle(c.id);continue;
    }
    if(!D.contractFor(s,c.id)&&c.age>=targets.get(c.id)){bottle(c.id);continue;}
    const o=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');
    assert(o,'Unhandled decision '+d.eventId);s=D.chooseDistillery(s,c.id,o.id);continue;
   }
   if(s.trade.offer){
    // A real accepted harbour relationship allows the special-order route.
    s=s.trade.offer.kind==='initial'&&s.trade.offer.partner!=='港の仕入れ店'?D.declineOffer(s):D.acceptOffer(s);continue;
   }
   const generation=D.generationStatus(s);
   if(generation.needsNotice){s=D.noticeGeneration(s,generation.id);continue;}
   if(generation.phase==='review'){
    const before=JSON.stringify({core:s.core,brands:s.brands,releases:s.releases,shop:s.shop,department:s.department,trade:s.trade,usual:s.usual,still:s.still});
    s=D.handoverGeneration(s,generation.id);
    assert.equal(JSON.stringify({core:s.core,brands:s.brands,releases:s.releases,shop:s.shop,department:s.department,trade:s.trade,usual:s.usual,still:s.still}),before,'Handover preserves the estate');
    const record=s.generations.completed.at(-1);transitions.push(structuredClone(record));
    assert(record.endedMonth-record.startedMonth>=300);
    assert(record.endedMonth<=record.fixedMonth+12);
    if(record.lastCaskId!==null){assert.equal(finalStarts.get(record.id),1,'Exactly one ordinary manual final start');assert(!finalFillIds.has(record.lastCaskId));finalFillIds.add(record.lastCaskId);assert.equal(record.lastStatus,'filled');}
    continue;
   }
   for(const [id,month]of listAt){
    const p=s.core.products.find(p=>p.id===id);
    if(!p||!p.stock){listAt.delete(id);continue;}
    if(s.core.month>=month){s=D.listBottles(s,id);listAt.delete(id);}
   }
   const due=s.core.casks.find(c=>!D.contractFor(s,c.id)&&c.age>=targets.get(c.id));
   if(due){bottle(due.id);continue;}
   if(s.shop.offer){s=D.acceptShop(s,s.shop.offer.shopId,s.shop.offer.id);continue;}
   const orderCandidate=D.orderCandidates(s)[0];
   if(orderCandidate){s=D.assignOrder(s,orderCandidate.id);continue;}
   if(s.core.month>=48){
    let delivered=false;
    for(const shop of [...S.SHOPS].reverse()){
     const p=s.core.products.find(p=>{
      const r=s.releases.find(r=>r.productId===p.id);
      return r&&r.bottledMonth+2<=s.core.month&&(p.age<24||shop.id==='department'||s.shop.relations.some(r=>r.shopId==='department'))&&D.shopQuote(s,p.id,shop.id).ok;
     });
     if(!p)continue;
     const q=D.shopQuote(s,p.id,shop.id);s=D.deliverShop(s,p.id,q.quantities.at(-1),shop.id,q.selectionId);delivered=true;break;
    }
    if(delivered)continue;
   }
   return;
  }
  throw Error('Unresolved policy loop');
 }
 for(let tick=1;tick<=months*P.monthMs/P.distillStepMs;tick++){
  policy();
  if(s.still.phase==='ready'&&s.core.casks.length<(s.core.month<36?2:4)&&D.canStart(s).ok){const g=D.generationStatus(s);s=D.startDistillation(s);if(g.phase==='last-batch')finalStarts.set(g.id,(finalStarts.get(g.id)??0)+1);}
  if(s.still.phase==='distilling'){
   const cut=[40,65,90][fills%3];s=D.distillStep(s);
   if(s.still.distillation.progress===cut)s=D.fillBarrel(D.stopDistillation(s),fills%2?'refill':'bourbon');
   if(s.still.phase==='ready'){
    fills++;const c=s.core.casks.at(-1);targets.set(c.id,s.core.month<36?6:[12,24,36,24][(fills-1)%4]);cuts.set(c.id,cut);
    const term=s.trade.relationship?.terms[0];
    if(D.generationStatus(s).phase==='working'&&s.core.month>=36&&fills%4===0&&term&&s.trade.relationship.status==='active'&&D.contractCandidates(s,term).some(x=>x.id===c.id))s=D.assignCask(s,c.id,term.id);
   }
  }
  assert(s.core.casks.length<=4);
  if(tick%(P.monthMs/P.distillStepMs)===0){
   policy();const stored=s.core.products.filter(p=>p.stock&&!s.productsById[p.id]?.listed).map(p=>p.id);
   const beforeRecordIds=new Set(s.records.map(r=>r.productId));s=D.tickDistillery(s);for(const r of s.records)if(!beforeRecordIds.has(r.productId))onBottling(r);
   assert.equal(round(s.core.cash-1600-s.core.totals.revenue+s.core.totals.costs+s.core.totals.upkeep),0);
   for(const id of stored){const r=s.releases.find(r=>r.productId===id);if(r)assert.equal(r.sold,0);}
   for(const p of s.core.products){assert(p.stock>=0);assert.equal(p.stock+p.sold,p.originalStock);}
   if(s.core.month%120===0){policy();onCheckpoint(s,{fills,transitions:structuredClone(transitions)});}
  }
 }
 policy();assert.equal(s.core.month,months,'Actual completed game months');return s;
}


async function runLongComparison(){
 const seeds=process.env.AMBER_SEEDS?process.env.AMBER_SEEDS.split(',').map(Number):[1,2],months=Number(process.env.AMBER_MONTHS??1440),rows=[],transitions=[],checkpoints=[];
 const protectedFiles=['model.mjs','economy.mjs','parameters.mjs','economy-parameters.mjs','partner-parameters.mjs','aroma-extraction.mjs','brand-reputation.mjs'];
 const chemistry=Object.fromEntries(protectedFiles.map(f=>[f,hash(fs.readFileSync(new URL('../'+f,import.meta.url)))]));
 assert.deepEqual(chemistry,Object.fromEntries(protectedFiles.map(f=>[f,hash(execFileSync('git',['show',base+':works/ambertime/'+f],{cwd:new URL('../../../',import.meta.url)}))])));
 for(const seed of seeds){
  const started=performance.now(),completedCasks=new Set();
  const s=buildGenerationGame(months,{seed,onBottling(record){completedCasks.add(record.caskId);},onCheckpoint(game,{fills}){
   const row={seed,month:game.core.month,fills,activeGeneration:game.generations.active.id,phase:game.generations.active.phase,completed:game.generations.completed.length,casks:game.core.casks.length,brands:game.brands.length,releases:game.releases.length,deliveries:game.shop.deliveries.length,operations:game.operations.length,cash:game.core.cash};checkpoints.push(row);console.error(JSON.stringify(row));
  }});
  const playMs=performance.now()-started,raw=D.serializeDistillery(s);
  if(process.env.AMBER_GENERATION_SAVE_DIR){fs.mkdirSync(process.env.AMBER_GENERATION_SAVE_DIR,{recursive:true});fs.writeFileSync(resolve(process.env.AMBER_GENERATION_SAVE_DIR,seed+'.json'),raw);}
  if(months>=1200)assert(s.generations.completed.length>=3,'First to second to third to further generations');
  const child=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};const raw=fs.readFileSync(0,'utf8');const start=performance.now();const s=D.restoreDistillery(raw);process.stdout.write(JSON.stringify({raw:D.serializeDistillery(s),ms:performance.now()-start}));`;
  const cold=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',child],{input:raw,maxBuffer:32e6}));assert.equal(cold.raw,raw);
  const projectedStart=performance.now(),facts=seed===Number(process.env.AMBER_HISTORY_SEED??seeds[0])?buildDistilleryHistory(s):null,projectionMs=facts?performance.now()-projectedStart:null;
  if(facts){assert.equal(D.serializeDistillery(s),raw);assert.equal(new Set(facts.events.map(e=>e.id)).size,facts.events.length);for(const e of facts.events)assert(e.month>=0&&e.month<=months);}
  for(const r of s.generations.completed){transitions.push({seed,...r});if(r.lastCaskId!==null){const provenance=D.finalBatchProvenance(s,r.lastCaskId);assert.equal(provenance.id,r.id);assert(s.core.casks.some(c=>c.id===r.lastCaskId)||s.releases.some(x=>x.caskId===r.lastCaskId)||completedCasks.has(r.lastCaskId),'Final cask remains or has an actual bottling record');}}
  const row={seed,months,years:months/12,completedGenerations:s.generations.completed.length,activeGeneration:s.generations.active.id,activePhase:s.generations.active.phase,lastStatuses:s.generations.completed.map(r=>r.lastStatus),handoverMonths:s.generations.completed.map(r=>r.endedMonth),brands:s.brands.length,releases:s.releases.length,shopRelations:s.shop.relations.length,shopDeliveries:s.shop.deliveries.length,departmentAdoptions:s.department.adoptions.length,wholesaleDeliveries:s.trade.relationship?.deliveries??0,specialCompleted:s.trade.relationship?.completedOrders??0,cash:s.core.cash,operations:s.operations.length,operationsRemaining:P.maxOperations-s.operations.length,releasesRemaining:D.RETAIL_BRANDS.maxReleases-s.releases.length,deliveriesRemaining:S.SHOP.maxDeliveries-s.shop.deliveries.length,rawCodeUnits:raw.length,utf8Bytes:Buffer.byteLength(raw,'utf8'),utf16Bytes:raw.length*2,restoreExclusiveCodeUnitLimit:P.maxSaveBytes*4+16384,restoreRemainingCodeUnits:P.maxSaveBytes*4+16384-raw.length,playMs:round(playMs),coldRestoreMs:round(cold.ms),historyMs:projectionMs===null?null:round(projectionMs),historyEvents:facts?.events.length??null,stateSha256:hash(raw),estatePreservedAtEveryHandover:true,coldReplayEqual:true};rows.push(row);console.error(JSON.stringify(row));
 }
 const result={method:{base,seeds,months,chemistry,policy:'Public manualcuts40/65/90, bourbon/refill alternating, same3brands, bootstrap2casks6months untilmonth36 then4casks12/24/36/24months. Everythirdrelease held6months; standardselfsales and shops; harbourwholesale/specialorders accepted. Generationnotices acknowledged; one lastmanualstart atfirstnaturalfreeslot, ordinaryfill then exactIDhandover. No inventedstock/funds, no forcedassetdisposal. Otherstateboundaries covered in tests.',limits:'Two seeds of one deterministic productionpolicy, not a guarantee for allstrategies or unlimitedsave. Longhistory projected only once onfirstseed; secondseed coldreplay still strict. Timing machine-specific; rawclock excludes all UI pauses.'},runs:rows,transitions,checkpoints};
 fs.writeFileSync(new URL('long-results.json',output()),JSON.stringify(result,null,2)+'\n');csv('long-runs.csv',rows);csv('long-transitions.csv',transitions);csv('long-checkpoints.csv',checkpoints);console.log(JSON.stringify(rows,null,2));
}

async function main(){
 fs.mkdirSync(output(),{recursive:true});
 if(!process.env.AMBER_SKIP_COMPARISON){
  const source=process.env.AMBER_COMPARISON_SAVE?D.restoreDistillery(fs.readFileSync(process.env.AMBER_COMPARISON_SAVE,'utf8')):buildLongGame(480);
  const comparison=compareGenerationCandidates(source);fs.writeFileSync(new URL('comparison-results.json',output()),JSON.stringify(comparison,null,2)+'\n');csv('comparison-candidates.csv',comparison.candidates);csv('comparison-events.csv',comparison.triggers);console.error(JSON.stringify(comparison.candidates));
 }
 if(process.env.AMBER_COMPARE_ONLY)return;
 await runLongComparison();
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))await main();
