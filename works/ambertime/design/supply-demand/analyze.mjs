// Offline audit: imports the shipping main model, never reads or writes player saves.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import * as D from '../../partner-orders.mjs';
import {PARAMETERS as C} from '../../parameters.mjs';
import {PARALLEL_PARAMETERS as P,ECONOMY_PARAMETERS as E} from '../../economy-parameters.mjs';
import {ageCask} from '../../model.mjs';
const directory=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(directory,'../..');
const round=n=>Math.round(n*100)/100,hash=b=>createHash('sha256').update(b).digest('hex');
const base='8ca00c91bac36104e11f24a44a142df0588a8237',seed=42;
function sources(){return Object.fromEntries(fs.readdirSync(root).filter(p=>p.endsWith('.mjs')).sort().map(p=>[p,hash(fs.readFileSync(path.join(root,p)))]));}
function stock(s){return s.core.products.reduce((n,p)=>n+p.stock,0);}
function balance(s){
 assert(Math.abs(s.core.cash-(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep))<1e-7);
 assert(s.core.casks.length<=4);assert.equal(s.brands.length,1);assert.equal(s.brands[0].name,'AmberTime');
 for(const p of s.core.products)assert.equal(p.originalStock,p.stock+p.sold);
 assert.equal(s.core.totals.bottlesSold,s.releases.reduce((n,r)=>n+r.sold+(r.delivered??0),0));
 assert(Math.abs(s.core.totals.revenue-s.releases.reduce((n,r)=>n+r.revenue,0)-s.shop.deliveries.reduce((n,r)=>n+r.revenue,0))<1e-6);
 for(const x of s.core.lastMonth.sales.filter(x=>!x.channel&&x.sold>0)){const p=s.core.products.find(p=>p.id===x.id);assert(p.bottledMonth<s.core.month);assert(s.productsById[p.id].listedMonth<s.core.month);}
 for(const d of s.automation.lastShipments??[]){const p=s.core.products.find(p=>p.id===d.productId);assert(p.bottledMonth<d.month);assert(s.productsById[p.id].listedMonth<d.month);}
}
function decisions(s){
 for(let i=0;s.decisions.length;i++){assert(i<30);const d=s.decisions[0];if(d.eventId==='funds')return {s,stopped:'funds'};const option=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');if(!option)return {s,stopped:d.eventId};s=D.chooseDistillery(s,d.caskId,option.id);}
 if(s.trade.offer)s=D.declineOffer(s);return {s,stopped:null};
}
function fill(s,progress,type){s=D.startDistillation(s);while(s.still.distillation.progress<progress)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),type);}
function advance(s,n){for(let i=0;i<n;i++){const clean=decisions(s);assert(!clean.stopped,clean.stopped);s=clean.s;const m=s.core.month;s=D.tickDistillery(s);assert.equal(s.core.month,m+1);}return decisions(s).s;}
function sell(s,id,tier='standard'){return D.listBottles(D.setSalePrice(s,tier,id),id);}
function exact(s){const text=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(text)),text);return hash(text);}
function supply(){const rows=[];for(const type of Object.keys(C.casks))for(const progress of [30,65,99]){
 const initial=fill(D.newMonthlyTimingDistillery(seed),progress,type),c=initial.core.casks[0];
 for(const months of [6,12,24,36]){const s=advance(initial,months),a=s.core.casks[0],q=D.quote(s,a.id);let direct=structuredClone(c);for(let i=0;i<months;i++)direct=ageCask(direct);assert.equal(a.litres,direct.litres);assert.equal(q.count,Math.floor((a.litres+1e-9)/.7));
 const reference40=40*(a.litres/c.initialLitres),count40=Math.floor((reference40+1e-9)/.7);
 rows.push({type,progress,months,initialLitres:c.initialLitres,evaporationVariation:c.variation.evaporation,litres:a.litres,evaporated:c.initialLitres-a.litres,bottles:q.count,bottlingCost:q.cost,residual:a.litres-q.count*.7,annualBottlesAt1_2_4:[1,2,4].map(n=>q.count*n),requiredMeanCasksAt1_2_4:[1,2,4].map(n=>n*months/12),reference40:{litres:reference40,bottles:count40,evaporated:40-reference40,annualBottlesAt1_2_4:[1,2,4].map(n=>n*count40)}});
 }}return rows;}
function demand(){const rows=[];for(const type of Object.keys(C.casks))for(const progress of [30,65,99])for(const age of [0,6,12,24,36]){
 let initial=fill(D.newMonthlyTimingDistillery(seed),progress,type);initial=advance(initial,age);const cid=initial.core.casks[0].id;initial=D.bottleBranded(initial,cid,{});const pid=initial.result.productId;
 for(const tier of ['low','standard','high']){let s=sell(initial,pid,tier);const p=s.core.products.find(p=>p.id===pid),monthly=[];for(let m=1;m<=60&&s.core.products.find(p=>p.id===pid).stock>0;m++){s=advance(s,1);monthly.push(s.core.lastMonth.bottles);}balance(s);const young=p.age<P.youngDemandMonths,expected=Math.floor(Math.min(p.originalStock,24,(young?4:10+6*p.character)*(.8+.2*p.character)*Math.exp(2.8*(1-p.price/D.marketValue(p))))+1e-9);assert.equal(monthly[0],expected);rows.push({type,progress,age,tier,bottledMonth:initial.core.month,initialBottles:p.originalStock,price:p.price,marketValue:D.marketValue(p),profile:{roughness:p.roughness,character:p.character,wood:p.wood},monthlySales:monthly,sold:p.originalStock-s.core.products.find(p=>p.id===pid).stock,selloutMonths:s.core.products.find(p=>p.id===pid).stock===0?monthly.length:null,firstSaleMonth:initial.core.month+1,finalCash:s.core.cash,revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep});}
 }return rows;}
function scenario(config){
 let s=D.newMonthlyTimingDistillery(seed),source=null,stopped=null,starts=0,attempts=0,failedCash=0,failedCapacity=0,otherRefusals=0,firstListed=null,autoSalary=0,bootstrapped=false,extractionTicks=0,maxCasks=0;
 const partialTaken=new Set(),reserved=new Set(),monthly=[],refusals=[],filled=new Map(),sellouts=new Map(),approvals=[],months=72;
 function listNew(){for(const p of s.core.products)if(!s.productsById[p.id].listed){s=sell(s,p.id);firstListed??=s.core.month;}}
 function policy(){
  maxCasks=Math.max(maxCasks,s.core.casks.length);
  const clean=decisions(s);s=clean.s;if(clean.stopped){stopped=clean.stopped;return;}
  for(const c of [...s.core.casks]){
   filled.set(c.id,{id:c.id,filledMonth:c.filledMonth,initialLitres:c.initialLitres,type:c.type});source??=c.id;
   if(config.automatic){
    if(!bootstrapped&&c.age>=config.age){s=D.bottleBranded(s,c.id,{},1);listNew();const hire=D.staffStatus(s);if(!hire.canHire){stopped='hire-budget';refusals.push({kind:'hire',month:s.core.month,reason:hire.reason});return;}s=D.hireStaff(s);const bh=D.bottlingStaffStatus(s);assert(bh.canHire,bh.reason);s=D.hireBottlingStaff(s);bootstrapped=true;}
    if(bootstrapped&&D.currentCask(s,c.id)&&c.age>=config.age&&!reserved.has(c.id)){s=D.reserveBottling(s,c.id,{mode:'stock',threshold:5,count:10});reserved.add(c.id);}
   }else if(config.partial&&c.age>=6&&!partialTaken.has(c.id)){s=D.bottleBranded(s,c.id,{},10);partialTaken.add(c.id);listNew();}
   else if(c.age>=config.age){s=D.bottleBranded(s,c.id,{});listNew();}
  }
  if(s.shop.offer){const o=s.shop.offer;if(config.stores&&o.shopId!=='department'){s=D.acceptShop(s,o.shopId,o.id);approvals.push({month:s.core.month,shopId:o.shopId});}else s=D.declineShop(s,o.shopId,o.id);}
 }
 for(let m=0;m<months;m++){
  assert.equal(s.core.month,m);policy();if(stopped)break;
  if(m%(12/config.perYear)===0){attempts++;const check=D.canStart(s);if(check.ok){
    if(config.automatic&&bootstrapped){s=D.reserveStaff(s,source,'once');const q=D.canBeginUsual(s);if(q.ok){s=D.beginUsual(s);starts++;autoSalary+=12;}else throw Error(q.reason);}
    else {s=D.startDistillation(s);starts++;}
   }else{const reason=check.reason;if(reason.includes('£'))failedCash++;else if(reason.includes('4樽')||reason.includes('商品'))failedCapacity++;else otherRefusals++;refusals.push({kind:'start',month:m,reason});}}
  for(let tick=0;tick<60;tick++){
   if(s.still.phase!=='distilling')break;
   const auto=s.usual.reservation?.status==='active';s=D.distillStep(s);extractionTicks++;
   if(!auto&&s.still.distillation.progress>=65){s=D.fillBarrel(D.stopDistillation(s),'refill');policy();if(stopped)break;}
   else if(auto&&s.still.phase==='ready'){policy();if(stopped)break;}
  }
  if(stopped)break;
  const before=s.core.month;s=D.tickDistillery(s);if(s.core.month!==before+1){stopped=s.decisions.some(d=>d.eventId==='funds')?'funds':'clock-stalled';break;}
  listNew();maxCasks=Math.max(maxCasks,s.core.casks.length);balance(s);
  const retail=s.core.lastMonth.sales.filter(x=>!x.channel).reduce((n,x)=>n+x.sold,0),ships=s.automation.lastShipments??[];
  assert.equal(retail+ships.reduce((n,d)=>n+d.count,0),s.core.lastMonth.bottles);
  for(const p of s.core.products)if(p.stock===0&&!sellouts.has(p.id))sellouts.set(p.id,s.core.month);
  monthly.push({month:s.core.month,cash:s.core.cash,casks:s.core.casks.length,stock:stock(s),started:starts,filled:filled.size,bottled:s.releases.reduce((n,r)=>n+r.bottles,0),retail,liquor:ships.filter(x=>x.shopId==='town-liquor').reduce((n,x)=>n+x.count,0),supermarket:ships.filter(x=>x.shopId==='supermarket').reduce((n,x)=>n+x.count,0),revenue:s.core.lastMonth.revenue,upkeep:s.core.lastMonth.upkeep,costs:s.core.totals.costs,automaticBottlingSalary:s.automation.lastBottlings.reduce((n,x)=>n+(x.salary??0),0)});
 }
 const byYear=[];for(let y=0;y<6;y++){const a=monthly.filter(r=>r.month>y*12&&r.month<=(y+1)*12),releases=s.releases.filter(r=>(r.bottledMonth>y*12||y===0&&r.bottledMonth===0)&&r.bottledMonth<=(y+1)*12);byYear.push({year:y+1,completedMonths:a.length,starts:s.operations.filter(o=>['start','start-usual'].includes(o.key)).length===0?0:null,fills:[...filled.values()].filter(c=>c.filledMonth>=y*12&&c.filledMonth<(y+1)*12).length,bottled:releases.reduce((n,r)=>n+r.bottles,0),retail:a.reduce((n,r)=>n+r.retail,0),stores:a.reduce((n,r)=>n+r.liquor+r.supermarket,0),endCash:a.at(-1)?.cash??null,endStock:a.at(-1)?.stock??null});}
 // Starts count is measured from cumulative successful actions, not attempted schedule slots.
 for(let y=0;y<6;y++){const end=monthly.filter(r=>r.month<=(y+1)*12).at(-1)?.started??0,prev=monthly.filter(r=>r.month<=y*12).at(-1)?.started??0;byYear[y].starts=end-prev;}
 const products=s.releases.map(r=>({id:r.productId,caskId:r.caskId,bottledMonth:r.bottledMonth,age:r.age,bottles:r.bottles,retail:r.sold,delivered:r.delivered??0,revenue:r.revenue,selloutMonth:sellouts.get(r.productId)??null,selloutMonths:sellouts.has(r.productId)?sellouts.get(r.productId)-r.bottledMonth:null}));
 balance(s);const text=exact(s),bottled=products.reduce((n,r)=>n+r.bottles,0),retail=s.releases.reduce((n,r)=>n+r.sold,0),stores=s.shop.deliveries.reduce((n,r)=>n+r.count,0);assert.equal(bottled,retail+stores+stock(s));
 return {config,completedMonths:s.core.month,stopReason:stopped,fundStopEpisodes:stopped==='funds'?1:0,hiringStopEpisodes:stopped==='hire-budget'?1:0,cashStopEpisodes:['funds','hire-budget'].includes(stopped)?1:0,scheduledStarts:attempts,successfulStarts:starts,actualFills:filled.size,maxSimultaneousCasks:maxCasks,annualizedFills:round(filled.size*12/Math.max(s.core.month,1)),refusals:{cash:failedCash,capacity:failedCapacity,other:otherRefusals,details:refusals},bottled,retail,stores,stock:stock(s),stockoutMonths:monthly.filter(r=>r.stock===0).length,operatingStockoutMonths:monthly.filter(r=>firstListed!==null&&r.month>firstListed&&r.stock===0).length,firstListedMonth:firstListed,finalCash:s.core.cash,revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep,hireCosts:bootstrapped?60:0,distillationSalary:autoSalary,bottlingSalary:monthly.reduce((n,r)=>n+r.automaticBottlingSalary,0),extractionTicks,approvals,products,byYear,monthly,finalStateSha256:text};
}
function partialExamples(){const rows=[];for(const type of Object.keys(C.casks))for(const portion of [false,true]){let s=fill(D.newMonthlyTimingDistillery(seed),65,type),cid=s.core.casks[0].id;const monthly=[];for(let m=0;m<36;m++){s=decisions(s).s;if(portion&&m===12){s=D.bottleBranded(s,cid,{},20);s=sell(s,s.result.productId);}if(m===24){s=D.bottleBranded(s,cid,{});s=sell(s,s.result.productId);}s=D.tickDistillery(s);balance(s);monthly.push({month:s.core.month,cash:s.core.cash,stock:stock(s),litres:D.currentCask(s,cid)?.litres??0,revenue:s.core.lastMonth.revenue,bottles:s.core.lastMonth.bottles});}rows.push({type,policy:portion?'20 at12, remainder24':'all at24',releases:s.releases.map(r=>({age:r.age,bottles:r.bottles,month:r.bottledMonth,retail:r.sold,price:s.core.products.find(p=>p.id===r.productId).price})),finalCash:s.core.cash,revenue:s.core.totals.revenue,costs:s.core.totals.costs,upkeep:s.core.totals.upkeep,monthly,finalStateSha256:exact(s)});}return rows;}
function main(){const hashes=sources();for(const [p,h] of Object.entries(hashes))assert.equal(h,hash(execFileSync('git',['show',base+':works/ambertime/'+p],{cwd:path.resolve(root,'../..'),maxBuffer:8e6})),p+' differs from audit base');const result={method:{base,seed,months:72,clock:{monthMs:P.monthMs,distillStepMs:P.distillStepMs,stepsPerMonth:60},model:'Current shipping partner-orders.newMonthlyTimingDistillery; no Lab engine; no state injection or save-data file access.',supply:'Single legal fill at month0, age through actual tickDistillery; chemistry independently checked with ageCask. Reference40 is proportional analysis only, never a playable mutated state.',demand:'One fresh first release; no prior reputation or approved stores. Each tier shares exact bottled initial state. Up to60 sale months; reject shop offers. Extraction wall-clock excluded from this isolated profile comparison.',policy:'New game; one AmberTime brand; scheduled starts at months divisible by12/perYear. Starts refused by current model are skipped and reported; no extra income, rescue, loans or early cash-recovery bottling. Manual extraction65/refill consumes65 model steps,60 per monthly boundary. At target age full bottling and standard listing. Partial takes10 at6, remainder24. Automatic first fill/manual1 at age6 unlock both paid staff, thereafter scheduled once commissions and stock-linked10/threshold5 reservations from age6. All monthly cask decisions choose wait/last; funds decision stops. If scheduled fast production makes hiring unaffordable at first bottling, the intended automation arm stops as hire-budget (no invented funds or fallback policy). Retail-only declines all shop offers; stores arm approves liquor/supermarket and declines department to isolate recurring normal channels. Stockouts measured at settlement boundary incl startup and after first listing separately; sellout duration is last sale month minus bottling month.',limitations:'Fixed deterministic policies, not optimized play. Occupancy limits can invalidate planned annual rates; actual finite cash stops retained. 40L is a requested reference, while actual legal maximum is39.77L. No physical/UI/fun verdict.',sourceSha256:hashes},supply:supply(),partialExamples:partialExamples(),demand:demand(),runs:[]};
 const configs=[];for(const perYear of [1,2,4])for(const age of [0,6,12,24,36])for(const stores of [false,true])configs.push({perYear,age,stores,partial:false,automatic:false});
 for(const stores of [false,true]){configs.push({perYear:2,age:24,stores,partial:true,automatic:false});configs.push({perYear:2,age:6,stores,partial:false,automatic:true});configs.push({perYear:4,age:6,stores,partial:false,automatic:true});}
 for(const config of configs){const run=scenario(config);result.runs.push(run);console.error(JSON.stringify({config,months:run.completedMonths,cash:run.finalCash,bottled:run.bottled,retail:run.retail,stores:run.stores,stop:run.stopReason}));}
 const replay=scenario(configs[0]);assert.deepEqual(replay,result.runs[0]);assert.deepEqual(sources(),hashes);result.checks={accountingAndInventory:true,fourCasks:true,nextMonthSalesAndShipment:true,saveReplayAllStrategyFinals:true,repeatFirstStrategyExact:true,sourceHashesMatchBaseAndUnchanged:true,counts:{supply:result.supply.length,demand:result.demand.length,strategies:result.runs.length}};
 const output=JSON.stringify(result)+'\n';if(process.argv.includes('--check'))assert.equal(fs.readFileSync(path.join(directory,'results.json'),'utf8'),output,'Reproduction differs from saved result');else fs.writeFileSync(path.join(directory,'results.json'),output);console.log(JSON.stringify(result.checks));}
main();
