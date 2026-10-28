// Audit only: native sources are copied into an owned temporary directory.
// No game file, browser storage or official save is changed.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const SOURCE_SHA='ea734452823f6162fa08e7671c38fa1a0cf33dc1';

async function main(){
 const src=fileURLToPath(new URL('../../',import.meta.url)),repo=path.resolve(src,'../..');
 const runtime=(await fs.readdir(src)).filter(f=>f.endsWith('.mjs')).map(f=>'works/ambertime/'+f);
 execFileSync('git',['diff','--quiet',SOURCE_SHA,'--',...runtime,'works/ambertime-flavor-lab-v02','works/ambertime/experiments/town-simulation','works/ambertime/experiments/reputation'],{cwd:repo});
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ambertime-market-audit-'));
 const previous=process.env.AUDIT_DEMAND;
 try{
await fs.mkdir(root+'/modules',{recursive:true});
await fs.cp(path.resolve(src,'../ambertime-flavor-lab-v02'),root+'/ambertime-flavor-lab-v02',{recursive:true});
for(const name of ['town-simulation','reputation'])await fs.cp(path.join(src,'experiments',name),path.join(root,'modules/experiments',name),{recursive:true});
for(const f of await fs.readdir(src))if(f.endsWith('.mjs'))await fs.copyFile(path.join(src,f),path.join(root,'modules',f));
let e=await fs.readFile(root+'/modules/economy.mjs','utf8');
assert(e.includes('(retailFactors?.get(p.id)??1)'));e=e.replace('(retailFactors?.get(p.id)??1)','(retailFactors?.get(p.id)??1)*Number(process.env.AUDIT_DEMAND??1)');await fs.writeFile(root+'/modules/economy.mjs',e);
let m=await fs.readFile(root+'/modules/store-market.mjs','utf8');assert(m.includes(')<probability)'));m=m.replace(')<probability)',')<probability*Number(process.env.AUDIT_DEMAND??1))');await fs.writeFile(root+'/modules/store-market.mjs',m);
const D=await import(pathToFileURL(root+'/modules/partner-orders.mjs').href);const round=x=>Math.round(x*100)/100;
function run(seed,cap,age,demand,policy,horizon=72,engine=D){
process.env.AUDIT_DEMAND=String(demand);let s=engine.newStoreMarketDistillery(seed),min=1600,forced=0,blocked=0,reason='',rows=[],starts=0,bottled=0,attempts=0;
function check(){min=Math.min(min,s.core.cash);assert.equal(s.core.cash,round(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep));for(const p of s.core.products){assert.equal(p.stock+p.sold,p.originalStock);const i=engine.storeMarketInventory(s,p.id);assert.equal(i.hand+i.retail+i.assigned+i.held,p.stock);}}
function bottle(id){s=engine.bottleBranded(s,id,{});bottled++;check();}
function resolve(){let n=0;while(s.decisions.length){if(++n>20)throw Error('decision loop');const d=s.decisions[0];if(d.eventId==='funds'){forced++;bottle(d.caskId);}else{const o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');if(o)s=engine.chooseDistillery(s,d.caskId,o.id);else bottle(d.caskId);}}if(s.trade.offer)s=engine.declineOffer(s);let offers=0;while(s.shop.offer){if(++offers>20)throw Error('AUDIT_UNRESOLVED:offer-loop');const o=s.shop.offer;s=policy==='shops'&&o.shopId!=='department'?engine.acceptShop(s,o.shopId,o.id):engine.declineShop(s,o.shopId,o.id);}}
function allocate(){for(const p of s.core.products){let inv=engine.storeMarketInventory(s,p.id);if(inv.hand<1)continue;const shop=policy==='shops'?['town-liquor','supermarket'].find(id=>engine.storeMarketQuote(s,p.id,id).ok):null;if(shop)s=engine.assignStoreProduct(s,{productId:p.id,shopId:shop,count:inv.hand});else s=engine.setMarketRetail(s,{productId:p.id,count:inv.retail+inv.hand});}}
try{for(let t=0;t<horizon;t++){if(++attempts>horizon+40)throw Error('AUDIT_UNRESOLVED:month-attempt-limit');resolve();for(const c of [...s.core.casks])if(c.age>=age)bottle(c.id);resolve();allocate();if(s.core.casks.length<cap&&engine.canStart(s).ok){s=engine.startRangeDistillation(s);s=engine.beginCollection(s);for(let step=0;s.still.distillation.progress<65;step++){if(step>100)throw Error('extraction-no-progress');s=engine.distillStep(s);}s=engine.fillBarrel(engine.stopDistillation(s),'refill');starts++;check();}const before=s.core.month,cash=s.core.cash;s=engine.tickDistillery(s);check();if(s.core.month===before){blocked++;if(s.decisions.some(d=>d.eventId==='funds')){resolve();allocate();t--;continue;}reason=s.generations?.active?.phase==='review'?'generation-review':engine.canStart(s).reason||'month-no-advance';break;}rows.push({month:s.core.month,cash:s.core.cash,net:round(s.core.cash-cash),sold:s.core.lastMonth.bottles,stock:s.core.products.reduce((n,p)=>n+p.stock,0),casks:s.core.casks.length});}}
catch(err){reason='ERROR:'+err.message;}
return {seed,cap,age,demand,policy,months:s.core.month,minCash:min,endCash:s.core.cash,net:round(s.core.cash-1600),stock:s.core.products.reduce((n,p)=>n+p.stock,0),casks:s.core.casks.length,starts,bottled,forced,blocked,canRestart:engine.canStart(s).ok,restartMinimum:engine.canStart(s).minimum,sold:s.core.totals.bottlesSold,relations:s.shop.relations.map(r=>r.shopId).join('|'),reason,monthly:rows};}

 const quick=process.argv.includes('--quick'),results=[];
 for(const seed of quick?[42]:[42,20261015,123456])for(const cap of quick?[1]:[1,2,4])for(const age of quick?[6]:[6,12,24])for(const demand of [1,.5,.25,.125])for(const policy of quick?['retail']:['retail','shops']){
  const r=run(seed,cap,age,demand,policy);results.push(r);if(r.reason.startsWith('ERROR'))throw Error(JSON.stringify(r));
  process.stderr.write(`Completed ${results.length}/${quick?4:216}\n`);
 }
 const original=await import(pathToFileURL(src+'/partner-orders.mjs').href),verification=[];
 const configs=quick?[[42,1,6,1,'retail']]:[[42,1,6,1,'retail'],[20261015,4,24,1,'shops'],[123456,2,12,.125,'shops']];
 for(const c of configs){const a=run(...c),b=run(...c);assert.deepEqual(a,b);if(c[3]===1)assert.deepEqual(a,run(...c,72,original));verification.push({config:c,deterministic:true,originalMatch:c[3]===1?true:null});}
 process.env.AUDIT_DEMAND='1';let s=D.newStoreMarketDistillery(42);s=D.beginCollection(D.startRangeDistillation(s));while(s.still.distillation.progress<65)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'refill');s=D.tickDistillery(s);s=D.bottleBranded(s,s.core.casks[0].id,{});const p=s.core.products.at(-1);s=D.setMarketRetail(s,{productId:p.id,count:p.stock});const young=[];
 for(const multiplier of [1,.5,.25,.125]){process.env.AUDIT_DEMAND=String(multiplier);const a=D.tickDistillery(s);young.push({multiplier,age:p.age,price:p.price,character:p.character,stockBefore:p.stock,monthsAdvanced:a.core.month-s.core.month,sold:a.core.lastMonth.bottles,net:a.core.cash-s.core.cash});}
 const diagnostics=await runFitDiagnostics(repo);
 const representatives=results.filter(r=>r.seed===42&&r.cap===1&&r.age===12&&r.policy==='retail'||r.seed===20261015&&r.cap===4&&r.age===24&&r.policy==='shops'&&[1,.125].includes(r.demand));
 const output={schema:'ambertime-market-balance-audit/1',runtimeSourceSha:SOURCE_SHA,method:'Isolated counterfactual native modules; retail wishes and shop purchase probability multiplied, no official saves written. Planned age can be interrupted by funds recovery. No claim of universal solvency.',quick,horizonMonths:72,runCount:results.length,runs:results.map(({monthly,...r})=>r),trajectories:representatives,verification,youngBoundary:young,diagnostics};
 const i=process.argv.indexOf('--out');if(i>=0){assert(process.argv[i+1],'--out needs path');await fs.writeFile(path.resolve(process.argv[i+1]),JSON.stringify(output,null,2)+'\n');}else process.stdout.write(JSON.stringify(output,null,2)+'\n');
 }finally{if(previous===undefined)delete process.env.AUDIT_DEMAND;else process.env.AUDIT_DEMAND=previous;await fs.rm(root,{recursive:true,force:true});}
}
// Read-only formula/finite-inventory diagnostics. Detached projections are NOT saves.
export async function runFitDiagnostics(sourceRoot){
 const fs=await import('node:fs/promises'),path=await import('node:path'),url=await import('node:url'),cp=await import('node:child_process');
 const repo=path.resolve(sourceRoot),root=path.join(repo,'works/ambertime');
 const load=name=>import(url.pathToFileURL(path.join(root,name)).href);
 const [D,F,E,S,T,Q]=await Promise.all(['partner-orders.mjs','lab-flavor.mjs','economy.mjs','store-market.mjs','town-connection.mjs','shop-demand.mjs'].map(load));
 const raw=JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/placement-established-six.json'),'utf8')).raw;
 const base=D.enableStoreMarket(D.restoreDistillery(raw)),templateProduct=base.core.products.find(p=>p.id===base.result.productId),templateRelease=base.releases.find(r=>r.productId===templateProduct.id);
 const seedCount=128,horizon=36,total=18,samples=[];
 for(const malt of ['plain','peat'])for(const ferment of ['short','long'])for(const cask of ['bourbon','refill'])for(const start of [0,.2,.4,.6,.8])for(const length of [.12,.24,.4]){
  const end=Math.min(1,start+length);if(end-start<.12)continue;
  const choice={malt,ferment,cask:cask==='bourbon'?'first':'refill',start,end};let spirit=F.setFlavorCask(F.attachFlavor({id:1,age:0},choice),cask);
  for(let age=1;age<=72;age++){
   spirit=F.ageFlavor({...spirit,age});if(![12,24,72].includes(age))continue;
   samples.push({choice:{...choice},age,profile:{roughness:spirit.roughness,character:spirit.character,wood:spirit.wood,flavor:structuredClone(spirit.flavor)}});
  }
 }
 function detached(sample,shopId,seed=42,count=18,lots=1){
  if(count%lots)throw Error('Equal integer split required');
  const s=structuredClone(base);s.seed=seed;s.core.seed=seed;s.core.casks=[];s.core.spirit=null;s.notesById={};s.batchesById={};s.shop.deliveries=[];s.shop.relations=[{shopId,brandId:templateRelease.brandId,startedMonth:0}];s.shopDemand.mode='variable';s.storeMarket.byShop={'town-liquor':{},supermarket:{}};s.placement.retailByProduct={};s.productsById={};s.core.products=[];s.releases=[];
  for(let i=0;i<lots;i++){
   const id=templateProduct.id+i,n=count/lots,p={...structuredClone(templateProduct),id,age:sample.age,roughness:sample.profile.roughness,character:sample.profile.character,wood:sample.profile.wood,flavor:structuredClone(sample.profile.flavor),stock:n,originalStock:n,sold:0,revenue:0,lastSold:0,lastRevenue:0,bottledMonth:0};
   const r={...structuredClone(templateRelease),id:templateRelease.id+i,productId:id,bottles:n,bottledMonth:0,age:sample.age,profile:structuredClone(sample.profile),sold:0,delivered:0,revenue:0};
   s.core.products.push(p);s.releases.push(r);s.productsById[id]={listed:true,listedMonth:0,selectedPrice:'standard'};s.storeMarket.byShop[shopId][id]=n;
  }
  s.core.nextId=Math.max(s.core.nextId,...s.core.products.map(p=>p.id+1));
  for(const p of s.core.products)p.price=E.salePrices(s,p.id).standard;
  return s;
 }
 function description(sample,shopId){
  const s=detached(sample,shopId),r=s.releases[0],fit=T.townAffinity(shopId,r).fit,price=Q.normalShopUnitPrice(s,r.productId,shopId),probability=Math.min(.98,Math.max(.08,(.15+.8*fit)*Math.sqrt((shopId==='town-liquor'?16:20)/price)));
  return {choice:sample.choice,age:sample.age,flavor:sample.profile.flavor.label,primary:sample.profile.flavor.primary,axes:{roughness:sample.profile.roughness,character:sample.profile.character,wood:sample.profile.wood},fit,unitPrice:price,probability};
 }
 function storeOutcome(sample,shopId,{count=total,lots=1}={}){
  const meanSold={1:0,3:0,6:0,12:0,36:0},selloutRate={6:0,12:0,36:0},times=[];let firstDemand=0,zeroDemand=0,customerMonths=0;
  for(let seed=1;seed<=seedCount;seed++){
   const s=detached(sample,shopId,seed,count,lots);let sold=0,done=null;
   for(let m=1;m<=horizon;m++){
    const plan=S.planStoreMarketSales(s,base.core.month+m)[0];if(m===1)firstDemand+=plan.requested;customerMonths++;if(plan.requested===0)zeroDemand++;
    for(const line of plan.shipments){const p=s.core.products.find(p=>p.id===line.productId);p.stock-=line.count;s.storeMarket.byShop[shopId][line.productId]-=line.count;sold+=line.count;}
    if(sold===count&&done===null)done=m;
    if(m in meanSold)meanSold[m]+=sold;if(m in selloutRate)selloutRate[m]+=sold===count?1:0;
   }
   times.push(done??Infinity);
  }
  for(const k of Object.keys(meanSold))meanSold[k]/=seedCount;for(const k of Object.keys(selloutRate))selloutRate[k]/=seedCount;
  times.sort((a,b)=>a-b);
  return {stock:count,lotCount:lots,meanSold,selloutRate,medianSelloutMonths:Number.isFinite(times[seedCount/2])?times[seedCount/2]:null,meanFirstMonthDemand:firstDemand/seedCount,zeroDemandMonthFraction:zeroDemand/customerMonths};
 }
 function extremes(shopId,age=null){
  const ranked=samples.filter(x=>age===null||x.age===age).map(sample=>({sample,fit:description(sample,shopId).fit})).sort((a,b)=>a.fit-b.fit);
  return {lowest:ranked[0].sample,highest:ranked.at(-1).sample};
 }
 const fit=[];
 for(const shopId of ['town-liquor','supermarket'])for(const age of [null,12])for(const [match,sample]of Object.entries(extremes(shopId,age))){
  fit.push({shopId,scanAge:age??'12,24,72',match,...description(sample,shopId),...storeOutcome(sample,shopId)});
 }
 const storeSplit=[];
 for(const shopId of ['town-liquor','supermarket']){
  const sample=extremes(shopId,12).lowest;
  for(const lots of [1,2,4,8])storeSplit.push({shopId,...description(sample,shopId),...storeOutcome(sample,shopId,{count:24,lots})});
 }
 const retailSplit=[];
 for(const age of [0,12]){
  const sample=structuredClone(extremes('town-liquor',12).highest);
  // Age0 gets the actual unaged version of the same recipe, not an age-only edit.
  if(age===0){const c=sample.choice;const spirit=F.setFlavorCask(F.attachFlavor({id:1,age:0},c),c.cask==='first'?'bourbon':'refill');sample.age=0;sample.profile={roughness:spirit.roughness,character:spirit.character,wood:spirit.wood,flavor:spirit.flavor};}
  for(const lots of [1,2,4,8]){
   let s=detached(sample,'town-liquor',42,24,lots);const first=s.core.products[0];s.storeMarket.byShop={'town-liquor':{},supermarket:{}};
   // Core monthly validation needs internally valid product chronology; this remains a detached projection.
   s.core.month=120;s.core.lastMonth=null;for(const p of s.core.products){p.bottledMonth=120;p.batchMonth=120-p.age;}
   const price=first.price,monthly=[];
   for(let m=1;m<=3;m++){s=E.economicMonthly(s,s.core.month,null,{eligibleProductIds:s.core.products.map(p=>p.id),heldCounts:{}});monthly.push(s.core.lastMonth.bottles);}
   retailSplit.push({age:sample.age,lotCount:lots,totalStock:24,choice:sample.choice,flavor:sample.profile.flavor.label,character:sample.profile.character,unitPrice:price,monthlySold:monthly,threeMonthSold:monthly.reduce((a,b)=>a+b,0)});
  }
 }
 return {schema:'ambertime-readonly-fit-diagnostics/1',sourceRoot:repo,sourceSha:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),originMainSha:cp.execFileSync('git',['rev-parse','origin/main'],{cwd:repo,encoding:'utf8'}).trim(),node:process.version,fixture:'works/ambertime/tests/fixtures/placement-established-six.json',method:'Detached projection only. Profiles produced by native attachFlavor/setFlavorCask/ageFlavor from valid Lab recipes. Demand calls native store planner; retail calls native economicMonthly without reputation factors. Modified projected state is never validated, serialized as a save, or written to repository. No financial-career conclusions from this diagnostic.',seedPopulation:{first:1,last:seedCount,count:seedCount},horizonMonths:horizon,profileScan:{profiles:samples.length,ages:[12,24,72],malts:['plain','peat'],ferments:['short','long'],casks:['bourbon','refill'],starts:[0,.2,.4,.6,.8],lengths:[.12,.24,.4],endClampedTo:1},fit,storeSplit,retailSplit};
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href)await main();
