// Public-operation long play, plus read-only history and storage observations.
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
const round=n=>Math.round(n*100)/100||0;
const hash=x=>createHash('sha256').update(x).digest('hex');

export function buildLongGame(months=480,{seed=1,onCheckpoint=()=>{}}={}){
 let s=D.newBottleDistillery(seed),fills=0;
 const targets=new Map(),cuts=new Map(),brands=new Map(),listAt=new Map();
 function bottle(id){
  const cut=cuts.get(id),brandId=brands.get(cut);
  s=D.bottleBranded(s,id,brandId?{brandId}:{name:{40:'朝霞',65:'川霧',90:'石蔵'}[cut]});
  const r=s.releases.at(-1);brands.set(cut,r.brandId);
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
  if(s.still.phase==='ready'&&s.core.casks.length<(s.core.month<36?2:4)&&D.canStart(s).ok)s=D.startDistillation(s);
  if(s.still.phase==='distilling'){
   const cut=[40,65,90][fills%3];s=D.distillStep(s);
   if(s.still.distillation.progress===cut)s=D.fillBarrel(D.stopDistillation(s),fills%2?'refill':'bourbon');
   if(s.still.phase==='ready'){
    fills++;const c=s.core.casks.at(-1);targets.set(c.id,s.core.month<36?6:[12,24,36,24][(fills-1)%4]);cuts.set(c.id,cut);
    const term=s.trade.relationship?.terms[0];
    if(s.core.month>=36&&fills%4===0&&term&&s.trade.relationship.status==='active'&&D.contractCandidates(s,term).some(x=>x.id===c.id))s=D.assignCask(s,c.id,term.id);
   }
  }
  assert(s.core.casks.length<=4);
  if(tick%(P.monthMs/P.distillStepMs)===0){
   policy();const stored=s.core.products.filter(p=>p.stock&&!s.productsById[p.id]?.listed).map(p=>p.id);
   s=D.tickDistillery(s);
   assert.equal(round(s.core.cash-1600-s.core.totals.revenue+s.core.totals.costs+s.core.totals.upkeep),0);
   for(const id of stored){const r=s.releases.find(r=>r.productId===id);if(r)assert.equal(r.sold,0);}
   for(const p of s.core.products){assert(p.stock>=0);assert.equal(p.stock+p.sold,p.originalStock);}
   if([120,240,480].includes(s.core.month)){policy();onCheckpoint(s,{fills});}
  }
 }
 policy();assert.equal(s.core.month,months,'Actual completed game months');return s;
}

async function main(){
 const {buildDistilleryHistory}=await import('../distillery-history.mjs');
 const out=process.env.AMBER_OUT?new URL('file://'+process.env.AMBER_OUT+'/'):new URL('../design/history/',import.meta.url);
 const rows=[],previous=new Map(),base='ab73d863ed3bb529769d3ff952b24bbdc01de636';
 const protectedFiles=['model.mjs','economy.mjs','parameters.mjs','economy-parameters.mjs','partner-parameters.mjs','aroma-extraction.mjs','brand-reputation.mjs'];
 const chemistry=Object.fromEntries(protectedFiles.map(f=>[f,hash(fs.readFileSync(new URL('../'+f,import.meta.url)))]));
 assert.deepEqual(chemistry,Object.fromEntries(protectedFiles.map(f=>[f,hash(execFileSync('git',['show',base+':works/ambertime/'+f],{cwd:new URL('../../../',import.meta.url)}))])));
 const seed=1;
 const s=buildLongGame(480,{seed,onCheckpoint(game,{fills}){
  const raw=D.serializeDistillery(game),wrapper=JSON.stringify({version:2,game:JSON.parse(raw),userPaused:false,elapsed:0});
  if(process.env.AMBER_HISTORY_CHECKPOINT_DIR){fs.mkdirSync(process.env.AMBER_HISTORY_CHECKPOINT_DIR,{recursive:true});fs.writeFileSync(resolve(process.env.AMBER_HISTORY_CHECKPOINT_DIR,game.core.month+'.json'),raw);}
  const started=performance.now(),memoryBefore=process.memoryUsage().heapUsed;
  const facts=buildDistilleryHistory(game),buildMs=performance.now()-started,heapDelta=process.memoryUsage().heapUsed-memoryBefore;
  assert.equal(D.serializeDistillery(game),raw,'History is read-only');
  assert.equal(new Set(facts.events.map(e=>e.id)).size,facts.events.length,'Unique historical event IDs');
  for(const e of facts.events){assert(Number.isInteger(e.month)&&e.month>=0&&e.month<=game.core.month,'No future or invalid dates');}
  const current=new Map(facts.events.map(e=>[e.id,{id:e.id,month:e.month,type:e.type??e.kind}]));
  for(const [id,e]of previous)assert.deepEqual(current.get(id),e,'Earlier stable history persists: '+id);
  for(const [id,e]of current)previous.set(id,e);
  const child=`import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};import {buildDistilleryHistory} from ${JSON.stringify(new URL('../distillery-history.mjs',import.meta.url).href)};import fs from 'node:fs';const raw=fs.readFileSync(0,'utf8');const start=performance.now();const s=D.restoreDistillery(raw);const restoredMs=performance.now()-start;const historyStart=performance.now();const history=buildDistilleryHistory(s);process.stdout.write(JSON.stringify({raw:D.serializeDistillery(s),history,restoredMs,historyMs:performance.now()-historyStart}));`;
  const cold=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',child],{input:raw,maxBuffer:32e6}));
  assert.equal(cold.raw,raw,'Cold strict restore');assert.deepEqual(cold.history,JSON.parse(JSON.stringify(facts)),'History JSON after cold restore');
  const row={seed,months:game.core.month,years:game.core.month/12,fills,brands:game.brands.length,brandLimit:D.RETAIL_BRANDS.maxBrands,brandsRemaining:D.RETAIL_BRANDS.maxBrands-game.brands.length,releases:game.releases.length,operations:game.operations.length,operationLimit:P.maxOperations,operationsRemaining:P.maxOperations-game.operations.length,releaseLimit:D.RETAIL_BRANDS.maxReleases,releasesRemaining:D.RETAIL_BRANDS.maxReleases-game.releases.length,shopDeliveries:game.shop.deliveries.length,deliveryLimit:S.SHOP.maxDeliveries,deliveriesRemaining:S.SHOP.maxDeliveries-game.shop.deliveries.length,departmentAdoptions:game.department.adoptions.length,retailSold:game.releases.reduce((n,r)=>n+r.sold,0),wholesaleShipments:facts.events.filter(e=>e.kind==='wholesale-shipment').length,specialAccepted:facts.events.filter(e=>e.kind==='special-order-accepted').length,specialFulfilled:facts.events.filter(e=>e.kind==='special-order-fulfilled').length,specialUnmet:facts.events.filter(e=>e.kind==='special-order-unmet').length,relationshipDeliveries:game.trade.relationship?.deliveries??0,completedOrders:game.trade.relationship?.completedOrders??0,storedProducts:game.core.products.filter(p=>p.stock&&!game.productsById[p.id]?.listed).length,rawCodeUnits:raw.length,rawUtf8Bytes:Buffer.byteLength(raw,'utf8'),rawUtf16Bytes:raw.length*2,wrapperCodeUnits:wrapper.length,wrapperUtf8Bytes:Buffer.byteLength(wrapper,'utf8'),wrapperUtf16Bytes:wrapper.length*2,restoreCodeUnitLimitExclusive:P.maxSaveBytes*4+16384,restoreRemainingCodeUnits:P.maxSaveBytes*4+16384-raw.length,events:facts.events.length,historyJsonUtf8Bytes:Buffer.byteLength(JSON.stringify(facts),'utf8'),buildMs:round(buildMs),heapDeltaBytes:heapDelta,coldRestoreMs:round(cold.restoredMs),coldHistoryMs:round(cold.historyMs),stateSha256:hash(raw),historySha256:hash(JSON.stringify(facts)),stableEarlierEventsPreserved:true,historyReadOnly:true,coldRestoreEqual:true};
  rows.push(row);console.error(JSON.stringify(row));
 }});
 const continued=D.tickDistillery(s);assert.equal(continued.core.month,481,'Play continues after final history view');
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(new URL('long-results.json',out),JSON.stringify({method:{base,seed,checkpoints:[120,240,480],chemistry,policy:'Three cut-based brands, cuts40/65/90, alternating bourbon/refill, bootstrap2casks6months untilmonth36 then4casks12/24/36/24months. Everythirdrelease retained6months. Public shop offers accepted; store allocation prioritizesdepartment/supermarket/town frommonth48. Initial wholesale offers accepted only for harbour; everyfourthcask eligible for normal wholesale; specialorders accepted and assigned where possible, unmetorders use ordinarywholesale. No injected game state.',limits:'One deterministic policy/seed, no guaranteed longevity beyond observed480months. UTF16 estimates payload only; browserquota implementation and otherlocalStoragekeys vary. Heap delta includes GC/runtime noise; not retained-memory measurement. Build and replay timing is machine-specific.'},continuation:{beforeMonth:s.core.month,afterMonth:continued.core.month},checkpoints:rows},null,2)+'\n');
 const keys=Object.keys(rows[0]),cell=x=>'"'+String(x??'').replaceAll('"','""')+'"';fs.writeFileSync(new URL('long-checkpoints.csv',out),keys.map(cell).join(',')+'\n'+rows.map(r=>keys.map(k=>cell(r[k])).join(',')).join('\n')+'\n');
 if(process.env.AMBER_HISTORY_SAVE)fs.writeFileSync(process.env.AMBER_HISTORY_SAVE,D.serializeDistillery(s));
 console.log(JSON.stringify(rows,null,2));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))await main();
