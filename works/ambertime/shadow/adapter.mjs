import {createReadSwitch} from './read-switch.mjs?consignment=night-stage4-v01&perf=v06';
import {compareAchievements} from './achievements.mjs';
// Diagnostic only: never receives a writer and never mutates native state.
import {createReader,updateReader,compareReader} from './readers.mjs?consignment=night-stage4-v01&perf=v06';
import * as M from '../../ambertime-strategy-lab/internal/model.mjs';
const copy=x=>structuredClone(x), cents=n=>Math.round(n*100);
const require=(x,m)=>{if(!x)throw Error(m);};
export function createShadow(native){
 require(native.core.month===0&&!native.core.casks.length&&!native.core.spirit&&native.still.phase==='ready'&&native.operations.every(o=>o.key.startsWith('enable-'))&&!native.releases.length&&!native.shop.deliveries.length&&!native.core.products.length,'fresh-session-required');
 return {caskOrigins:{},core:M.createModel(),reader:updateReader(createReader(),null,native),nativeCursor:{operations:native.operations.length,receipts:0,releases:0,month:0},initialCash:cents(native.core.cash),cash:cents(native.core.cash),commits:0,checks:[],limits:['town and future recall selection remain native','legacy procurement customer sales are unknown']};
}
function descriptor(s,r,origins){return {...copy(r),brand:copy(s.brands.find(b=>b.id===r.brandId)),price:r.price,sourceGeneration:origins[r.caskId]?.generationId??null,manufacturing:copy(origins[r.caskId]??null)};}
function allocations(s,r){const out={};for(const [shop,rows] of Object.entries(s.storeMarket?.byShop??{}))if(rows[r.productId])out[shop]=rows[r.productId];return out;}
export function advanceShadow(shadow,before,next){
 const c=shadow.nativeCursor;
 require(before.operations.length===c.operations&&before.shop.deliveries.length===c.receipts&&before.releases.length===c.releases&&before.core.month===c.month,'session-boundary-mismatch');
 require(next.operations.length>=c.operations&&next.shop.deliveries.length>=c.receipts&&next.releases.length>=c.releases,'append-only-source-required');
 require(next.core.month>=c.month&&next.core.month<=c.month+1,'one-month-boundary-required');
 let core=copy(shadow.core);const caskOrigins=copy(shadow.caskOrigins);
 for(const c of next.core.casks)if(!caskOrigins[c.id])caskOrigins[c.id]={generationId:before.generations?.active?.id??null,filledMonth:next.core.month,batchId:c.batchId};
 const receipts=next.shop.deliveries.slice(c.receipts),newReleases=next.releases.slice(c.releases);
 const events=[];
 for(const r of next.releases){const old=before.releases.find(x=>x.id===r.id),count=(r.sold??0)-(old?.sold??0),revenue=cents(r.revenue??0)-cents(old?.revenue??0);require(count>=0&&revenue>=0,'retail-counter-reversed');if(count)events.push({releaseId:r.id,kind:'retail-sale',count,revenueCents:revenue});}
 // Only an exact monthly sales row proves consumer sell-through. Department is procurement.
 const matched=new Set();for(const d of receipts){const shopId=d.shopId??'town-liquor';let kind='paid-procurement';
 if(shopId!=='department'&&next.core.month>before.core.month&&next.storeMarket){const i=(next.core.lastMonth?.sales??[]).findIndex((x,i)=>!matched.has(i)&&x.channel==='stockist'&&x.shopId===shopId&&x.id===d.productId&&x.sold===d.count&&cents(x.revenue)===cents(d.revenue));if(i>=0){kind='store-sell-through';matched.add(i);}}
 events.push({releaseId:d.releaseId,kind,shopId,count:d.count,revenueCents:cents(d.revenue)});}
 function apply(e){if(e.kind==='store-sell-through'){core=M.assignStock(core,e.releaseId,e.shopId,e.count);}core=M.applyTransaction(core,{...e,status:'completed',month:next.core.month,seq:core.cursor.seq+1});}
 // Release reservations are re-established from the confirmed final state after settlement.
 for(const r of Object.values(core.releases))for(const shop of Object.keys(r.allocations))core=M.assignStock(core,r.id,shop,0);
 for(const e of events.filter(e=>core.identities[e.releaseId]))apply(e);
 for(const r of newReleases){core=M.registerRelease(core,descriptor(next,r,caskOrigins));for(const e of events.filter(e=>e.releaseId===r.id))apply(e);}
 for(const r of next.releases){const live=core.releases[r.id];require(live,'release-missing');live.price=r.price;live.listed=!!r.listed;for(const [shop,n] of Object.entries(allocations(next,r)))core=M.assignStock(core,r.id,shop,n);}
 for(const r of next.shop.relations??[])core=M.setContract(core,r.shopId??'town-liquor',r.brandId,r.startedMonth);
 core=M.setCurrentCasks(core,next.core.casks);core.month=next.core.month;
 const reader=updateReader(shadow.reader,before,next),comparison=compareReader(reader,next);
 const checks=[...comparison.checks];const check=(name,a,b)=>checks.push({name,equal:M.canonical(a)===M.canonical(b)});
 for(const r of next.releases){const x=M.readRelease(core,r.id),p=next.core.products.find(p=>p.id===r.productId);check('release:'+r.id,[x.productId,x.stock,x.sold,x.revenue,x.delivered,x.deliveryRevenue],[r.productId,p?.stock??0,r.sold??0,r.revenue??0,r.delivered??0,r.deliveryRevenue??0]);check('allocation:'+r.id,core.releases[r.id].allocations,allocations(next,r));check('profile:'+r.id,core.wines[x.wineId].descriptor.profile,r.profile);}
 const cash=shadow.cash+cents(next.core.totals.revenue-before.core.totals.revenue)-cents(next.core.totals.costs-before.core.totals.costs)-cents(next.core.totals.upkeep-before.core.totals.upkeep);check('cash',cash,cents(next.core.cash));
 require(checks.every(x=>x.equal),'comparison-mismatch:'+checks.filter(x=>!x.equal).map(x=>x.name).join(','));
 return {...shadow,achievements:compareAchievements(core,next),caskOrigins,core,reader,cash,commits:shadow.commits+1,checks,nativeCursor:{operations:next.operations.length,receipts:next.shop.deliveries.length,releases:next.releases.length,month:next.core.month}};
}
export function createObserver({maxReleases=128,maxOperations=10000,maxReceipts=2048,maxMilliseconds=100,clock=()=>performance.now(),update=advanceShadow,features={}}={}){
 let state=null,status='inactive',error=null,last=null;const timings=[];
 const readerSwitch=createReadSwitch({features,snapshot:()=>({state,status,last,error}),clock});
 return {read:(feature,native,legacy,args)=>readerSwitch.read(feature,native,legacy,args),readReport:()=>readerSwitch.report(),start(native){try{state=createShadow(native);last=native;status='active';error=null;}catch(e){status='stopped';error=e.message;}},recordDialogue(entry){if(status!=='active'||!entry)return;try{state={...state,reader:updateReader(state.reader,last,last,{chosenDialogue:[entry]})};}catch(e){status='stopped';error=e.message;}},reset(){state=null;last=null;status='inactive';error=null;},observe(before,next){if(status!=='active')return;try{require(before===last,'confirmed-state-chain-broken');if(next===last)return;if(next.operations.length>maxOperations||next.shop.deliveries.length>maxReceipts)throw Error('diagnostic-source-budget');if(next.releases.length>maxReleases)throw Error('diagnostic-release-budget');const t=clock(),candidate=update(state,before,next),ms=clock()-t;timings.push(ms);if(timings.length>32)timings.shift();require(ms<=maxMilliseconds,'diagnostic-time-budget');state=candidate;last=next;}catch(e){status='stopped';error=e.message;last=null;}},report(){return {status,error,timings:[...timings],reads:readerSwitch.report(),state:state?copy(state):null};}};
}
