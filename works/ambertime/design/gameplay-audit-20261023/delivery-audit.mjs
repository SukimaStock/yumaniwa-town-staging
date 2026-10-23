// Audit only. Imports unchanged production functions; never imported by the game.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as D from '../../partner-orders.mjs';
import {normalShopOrders,planShopFulfillment} from '../../shop-demand.mjs';
import {automaticEvents,noticeText} from '../../event-notices.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const rows=[],runs=[],edges=[],seeds=[42,43,44],sum=(a,k)=>a.reduce((n,x)=>n+(x[k]??0),0),stock=s=>sum(s.core.products,'stock');
const inventory=s=>s.core.products.filter(p=>p.stock>0).map(p=>({id:p.id,stock:p.stock,listed:s.productsById[p.id]?.listed}));
function clean(s){let stop=null;for(let i=0;s.decisions.length;i++){assert(i<30);const d=s.decisions[0];if(d.eventId==='funds')return {s,stop:'funds'};const o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');if(!o)return {s,stop:d.eventId};s=D.chooseDistillery(s,d.caskId,o.id);}if(s.trade.offer)s=D.declineOffer(s);if(s.shop.offer){const o=s.shop.offer;s=o.shopId==='department'?D.declineShop(s,o.shopId,o.id):D.acceptShop(s,o.shopId,o.id);}return {s,stop};}
function fill(s,{malt='plain',ferment='long',start=35,end=65}={}){s=D.selectFlavorCards(s,{malt,ferment});s=D.startRangeDistillation(s);while(s.still.distillation.progress<start)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<end)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),'refill');}
function record(scope,scenario,seed,before,after,orders,prePlans){
 const ships=after.automation?.lastShipments??[],retail=(after.core.lastMonth?.sales??[]).filter(x=>!x.channel).reduce((n,x)=>n+x.sold,0);
 for(const o of orders){const result=after.shopDemand.lastOrders.find(x=>x.shopId===o.shopId),lines=ships.filter(x=>x.shopId===o.shopId);if(!result)continue;
  rows.push({scope,scenario,seed,month:after.core.month,shopId:o.shopId,requested:result.requested,profileProductId:o.profileProductId,actualShipments:lines.map(x=>({productId:x.productId,releaseId:x.releaseId,count:x.count})),shipped:result.shipped,unmet:result.unmet,reason:result.reason,stockBefore:stock(before),stockAfter:stock(after),inventoryBefore:inventory(before),inventoryAfter:inventory(after),preSettlementPlanned:prePlans.find(x=>x.shopId===o.shopId)?.planned??0,retailSold:retail,catalogDiffers:lines.some(x=>x.productId!==o.profileProductId),notice:noticeText(automaticEvents(before,after))});
 }
}
function career(seed,tier){let s=D.newConnectedDistillery(seed),stop=null;const scenario='annual-12m-'+tier,startRows=rows.length,approvals=[],bottlings=[],refusals=[];
 for(let m=0;m<120;m++){
  let c=clean(s);s=c.s;if(c.stop){stop=c.stop;break;}
  for(const barrel of [...s.core.casks])if(barrel.age>=12){const q=D.quote(s,barrel.id);if(q.count>0){s=D.bottleBranded(s,barrel.id,{});const p=s.result.productId;s=D.listBottles(D.setSalePrice(s,tier,p),p);bottlings.push({month:m,productId:p,count:q.count});}}
  c=clean(s);s=c.s;if(c.stop){stop=c.stop;break;}
  if(m%12===0){const q=D.canStart(s);if(q.ok)s=fill(s);else refusals.push({month:m,reason:q.reason});}
  const known=s.shop.relations.map(r=>r.shopId);for(const id of known)if(!approvals.some(x=>x.shopId===id))approvals.push({month:m,shopId:id});
  const before=s,orders=normalShopOrders(s,m+1,s.shopDemand.mode),prePlans=orders.map(o=>planShopFulfillment(s,m+1,o));s=D.tickDistillery(s);
  if(s.core.month!==m+1){stop=s.decisions.some(x=>x.eventId==='funds')?'funds':'clock-stalled';break;}
  record('public-model-career',scenario,seed,before,s,orders,prePlans);
  for(const o of s.shopDemand.lastOrders){assert.equal(o.requested,o.shipped+o.unmet);assert(o.shipped<=o.requested);}
  assert(s.automation.lastShipments.filter(x=>x.shopId==='supermarket').every(x=>x.count>=10));
 }
 const rr=rows.slice(startRows),raw=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);
 runs.push({scope:'public-model-career',scenario,seed,months:s.core.month,stop,bottlings,approvals,refusals,requested:sum(rr,'requested'),shipped:sum(rr,'shipped'),unmet:sum(rr,'unmet'),retail:sum(s.releases,'sold'),remainingStock:stock(s),catalogMismatchMonths:rr.filter(r=>r.catalogDiffers).length,preSettlementLossMonths:rr.filter(r=>r.preSettlementPlanned>r.shipped&&r.requested>0).length,reasons:counts(rr.map(r=>r.reason)),finalCash:s.core.cash});
}
function counts(xs){return Object.fromEntries([...new Set(xs)].sort().map(k=>[k,xs.filter(x=>x===k).length]));}
const legacy=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/shop-demand-legacy.json'),'utf8'));
const componentCases=[{name:'enough',stock:50},{name:'low9',stock:9},{name:'threshold10',stock:10},{name:'split5+5',stock:5,second:5},{name:'split6+14',stock:6,second:14},{name:'different-flavors',stock:50,second:50,different:true},{name:'department-hold5',stock:20,hold:5},{name:'stored',stock:50,stored:true},{name:'bottling-month',stock:50,sameMonth:true},{name:'young',stock:50,young:true}];
function component(seed,config){const s=JSON.parse(legacy.before);s.seed=seed;s.core.month=16;s.core.products.forEach(p=>p.stock=0);s.shop.deliveries=[];s.shop.relations=[{shopId:'town-liquor',brandId:1,startedMonth:15},{shopId:'supermarket',brandId:1,startedMonth:15}];const p=s.core.products.at(-1),r=s.releases.at(-1);p.stock=config.stock;p.age=r.age=config.young?0:12;p.bottledMonth=r.bottledMonth=16;s.productsById[p.id].listedMonth=16;r.profile.roughness=p.roughness=.2;r.profile.character=p.character=.85;r.listed=!config.stored;s.productsById[p.id].listed=!config.stored;
 if(config.second!==undefined){const q={...structuredClone(p),id:99,stock:config.second},t={...structuredClone(r),id:99,productId:99};if(config.different){q.roughness=t.profile.roughness=.9;q.character=t.profile.character=.1;q.wood=t.profile.wood=.8;}s.core.products.push(q);s.releases.push(t);s.productsById[99]={...s.productsById[p.id]};}
 const startRows=rows.length;
 for(let month=config.sameMonth?16:17;month<(config.sameMonth?16:17)+12;month++){
  const before=structuredClone(s),orders=normalShopOrders(s,month),plans=[];s.core.month=month;
  for(const o of orders){const plan=planShopFulfillment(s,month,o,{heldCounts:config.hold?{[p.id]:config.hold}:{}});plans.push(plan);for(const line of plan.shipments){const item=s.core.products.find(x=>x.id===line.productId);assert(item.stock>=line.count);item.stock-=line.count;const release=s.releases.find(x=>x.productId===line.productId);s.shop.deliveries.push({id:s.shop.deliveries.length+1,shopId:o.shopId,month,productId:line.productId,releaseId:release.id,count:line.count});}
   rows.push({scope:'component-input-not-saveable',scenario:config.name,seed,month,shopId:o.shopId,requested:o.count,profileProductId:o.profileProductId,actualShipments:plan.shipments.map(x=>({productId:x.productId,count:x.count})),shipped:plan.planned,unmet:plan.unmet,reason:plan.reason,stockBefore:stock(before),stockAfter:stock(s),inventoryBefore:inventory(before),inventoryAfter:inventory(s),preSettlementPlanned:plan.planned,retailSold:0,catalogDiffers:plan.shipments.some(x=>x.productId!==o.profileProductId),held:config.hold??0});
  }
 }
 const rr=rows.slice(startRows);runs.push({scope:'component-input-not-saveable',scenario:config.name,seed,months:12,requested:sum(rr,'requested'),shipped:sum(rr,'shipped'),unmet:sum(rr,'unmet'),remainingStock:stock(s),catalogMismatchMonths:rr.filter(r=>r.catalogDiffers).length,reasons:counts(rr.map(r=>r.reason))});
}
// Exact minimum-lot/reservation boundaries independent of random demand.
for(const stocks of [[9],[10],[5,5],[6,14],[20]]){const s=JSON.parse(legacy.before),p=s.core.products.at(-1),r=s.releases.at(-1);s.shop.relations.push({shopId:'supermarket',brandId:1,startedMonth:16});p.age=r.age=12;p.stock=stocks[0];r.profile.roughness=p.roughness=.2;for(let i=1;i<stocks.length;i++){s.core.products.push({...p,id:99+i,stock:stocks[i]});s.releases.push({...structuredClone(r),id:99+i,productId:99+i});s.productsById[99+i]={...s.productsById[p.id]};}const order={shopId:'supermarket',month:17,count:20};const plan=planShopFulfillment(s,17,order);edges.push({stocks,requested:20,planned:plan.planned,unmet:plan.unmet,reason:plan.reason,shipments:plan.shipments});if(stocks.length===1&&stocks[0]===20){const held=planShopFulfillment(s,17,order,{heldCounts:{[p.id]:5}});edges.push({stocks,held:5,requested:20,planned:held.planned,unmet:held.unmet,reason:held.reason,shipments:held.shipments});}}
function auditUi(){
 const data=D.enableShopDemand(D.restoreDistillery(legacy.before)),source=fs.readFileSync(path.join(root,'shop-app.mjs'),'utf8');
 const code=source.slice(source.indexOf('function stockistProducts('),source.indexOf('function departmentOfferInventory(')),sandbox={game:data,D,shopOffers:()=>[],status:null};
 vm.runInNewContext(code+';status=stockistStatus("town-liquor");',sandbox);
 const after=D.tickDistillery(data),order=after.shopDemand.lastOrders.find(o=>o.shopId==='town-liquor');
 assert.equal(sandbox.status,'現在は納品不可');assert(order.shipped>0);
 const uiSource=fs.readFileSync(path.join(root,'shop-app.mjs'),'utf8'),ledgerSource=fs.readFileSync(path.join(root,'shop-ledger.mjs'),'utf8');
 return {lawfulLegacyDemandBoundary:{beforeMonth:data.core.month,stock:inventory(data),displayedStatus:sandbox.status,manualQuote:D.shopQuote(data,8,'town-liquor'),nextMonthOrder:order,nextMonthShipments:after.automation.lastShipments},unmetDisplay:{shopOrderLedgerReferenceCount:[...uiSource.matchAll(/shopOrderLedger\(/g)].length,liveShopLedgerReadsLastOrders:ledgerSource.includes('lastOrders'),quietEventBranch:'workPreferences.version1 emits shipping count only; no orders/unmet/reason event'}};
}
const uiChecks=auditUi();
if(process.argv.includes('--ui-only')){const p=path.join(here,'delivery-results.json'),saved=JSON.parse(fs.readFileSync(p,'utf8'));saved.uiChecks=uiChecks;fs.writeFileSync(p,JSON.stringify(saved,null,2)+'\n');console.log(JSON.stringify(uiChecks));process.exit(0);}
for(const seed of seeds){for(const config of componentCases)component(seed,config);for(const tier of ['standard','high'])career(seed,tier);}
const result={method:{runtimeSha:'2a1a172fa67ef7bda3cad82c9070c8946353b3f6',seeds,careerMonths:120,careerPolicy:'One full-range manual batch/year; collect35-65;refill;full bottling at12months;list standard/high;accept ordinary shop offers and decline department;no injected funds/stock/relations in careers. Component fixtures deliberately mutate old test data and are NOT certified game saves. No gameplay files changed.',components:'10 edge-stock/catalog conditions per seed;12 consecutive projected months;ordinary shipping oldest-first with native planShopFulfillment;no retail step. Reserved5 remains held as an explicit fixture, not settled.',orderProductSemantics:'profileProductId is the catalog profile used for store-wide demand, NOT a named-product order. Different actual product is recorded, not automatically classified as bug.',sources:Object.fromEntries(['shop-demand.mjs','shop-model.mjs','partner-orders.mjs','event-notices.mjs','shop-app.mjs'].map(p=>[p,hash(p)]))},rowCount:rows.length,runs,edges,uiChecks,aggregate:{publicRequested:sum(runs.filter(x=>x.scope==='public-model-career'),'requested'),publicShipped:sum(runs.filter(x=>x.scope==='public-model-career'),'shipped'),publicUnmet:sum(runs.filter(x=>x.scope==='public-model-career'),'unmet'),publicReasons:counts(rows.filter(r=>r.scope==='public-model-career').map(r=>r.reason))},examples:{catalogMismatch:rows.filter(r=>r.catalogDiffers).slice(0,8),retailCompetition:rows.filter(r=>r.scope==='public-model-career'&&r.preSettlementPlanned>r.shipped&&r.requested>0).slice(0,8),unmet:rows.filter(r=>r.scope==='public-model-career'&&r.unmet>0).slice(0,8)}};
const columns=['scope','scenario','seed','month','shopId','requested','profileProductId','actualShipments','shipped','unmet','reason','stockBefore','stockAfter','inventoryBefore','inventoryAfter','preSettlementPlanned','retailSold','catalogDiffers','notice','held'];
const csv=v=>'"'+String(typeof v==='object'?JSON.stringify(v):v??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(here,'delivery-monthly.csv'),columns.join(',')+'\n'+rows.map(r=>columns.map(c=>csv(r[c])).join(',')).join('\n')+'\n');fs.writeFileSync(path.join(here,'delivery-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({rows:result.rowCount,aggregate:result.aggregate,publicRuns:result.runs.filter(r=>r.scope==='public-model-career'),edges}));
