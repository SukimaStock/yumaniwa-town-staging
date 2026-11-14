import {readRelease} from './model.mjs';
// Independent read boundary; never creates fake deliveries or writes a formal save.
import {shopRemarkFacts,classifyShopRemark,SHOP_REMARK_TEXT} from '../../ambertime/shop-remarks.mjs';
import {dialogueCandidates,dialoguePolicyBoundary,shopDialogueHistory} from '../../ambertime/shop-dialogue.mjs';
import {SHOP_DIALOGUE_TEXT} from '../../ambertime/shop-dialogue-text.mjs';
import {packageFamily,packageArt} from '../../ambertime/release-package.mjs';
import {releasePriceTier} from '../../ambertime/brand-identity.mjs';
import {readCompletedRecalls} from '../../ambertime/recall/collector.mjs?perf=v06';
import {buildReleaseLedger} from '../../ambertime/ledger-view.mjs?consignment=night-stage4-v01&v=0.63-ledger&delivery=regional-delivery-v01&perf=v06';
import {currentView} from '../../ambertime-small-memory-lab/memory.mjs?consignment=night-stage4-v01&perf=v06';
const copy=x=>structuredClone(x), shopOf=d=>d.shopId??'town-liquor';
export const ADAPTER_SHOPS=['town-liquor','supermarket','bar','department'];
export function remarkFromStoreFacts(facts){const key=classifyShopRemark(facts);return {key,text:SHOP_REMARK_TEXT[facts.shopId]?.[key]??''};}
const distinct=rows=>[...new Set(rows.map(d=>d.month))].sort((a,b)=>a-b);
const aggregate=rows=>{const months=distinct(rows);return {count:rows.length,firstMonth:months[0]??null,lastMonth:months.at(-1)??null,previousMonth:months.at(-2)??null};};
export function extractReadModel(source){
 const month=source.core.month,boundary=dialoguePolicyBoundary(source),priorReleases=source.releases.filter(r=>r.bottledMonth<month),releaseById=new Map(priorReleases.map(r=>[r.id,r]));
 const shops=ADAPTER_SHOPS.map(shopId=>{
  const all=(source.shop?.deliveries??[]).filter(d=>shopOf(d)===shopId&&d.count>0&&Number.isInteger(d.month)&&d.month<month);
  let eligible=all;
  if(shopId==='supermarket'||shopId==='department')eligible=eligible.filter(d=>{const r=releaseById.get(d.releaseId);return r&&r.brandId===d.brandId&&r.productId===d.productId;});
  if(shopId==='supermarket')eligible=eligible.filter(d=>Number.isInteger(source.storeMarket?.startedMonth)&&source.storeMarket.startedMonth>=0&&d.month>source.storeMarket.startedMonth);
  if(shopId==='department'){
   const adopted=new Map((source.department?.adoptions??[]).filter(a=>a.count===5).map(a=>[a.deliveryId,a]));
   eligible=eligible.filter(d=>{const a=adopted.get(d.id);return d.count===5&&a&&['selectionId','projectId','brandId','releaseId','sourceReleaseId','month','count'].every(k=>a[k]!==undefined&&a[k]===d[k]);});
  }
  const facts=shopRemarkFacts(source,shopId,1);delete facts.deliveryMonths;
  const brandFacts=(source.brands??[]).map(b=>{const f=shopRemarkFacts(source,shopId,b.id);delete f.deliveryMonths;return f;});
  return {shopId,facts,brandFacts,related:(source.shop?.relations??[]).some(r=>shopOf(r)===shopId&&r.startedMonth<month),eligible:aggregate(eligible),byRelease:priorReleases.map(r=>({releaseId:r.id,...aggregate(eligible.filter(d=>d.releaseId===r.id&&d.brandId===r.brandId&&d.productId===r.productId))})).filter(r=>r.count),barEnabled:source.alleyBar?.version===1&&Number.isInteger(source.alleyBar.boundaryMonth)&&source.alleyBar.boundaryMonth<month};
 });
 const releases=source.releases.map(r=>({id:r.id,productId:r.productId,brandId:r.brandId,bottledMonth:r.bottledMonth,age:r.age,profile:copy(r.profile??null),brand:copy(source.brands.find(b=>b.id===r.brandId)??{}),priceTier:releasePriceTier(source,r.productId),sourceGeneration:r.sourceGeneration??null,recipe:copy(r.recipe??null),name:source.brands.find(b=>b.id===r.brandId)?.name??'記録なし'}));
 const chosen=shopDialogueHistory(source),lastText={};for(const d of chosen)lastText[d.shopId+':'+d.key]=d.month;
 // Reuse B's existing ledger/map/edition projections at the import boundary only.
 const b=currentView(source),ledger={recent:copy(b.ledger.recent),milestones:copy(b.ledger.milestones),generations:copy(b.ledger.generations)},nativeLedger=extractNativeLedgerFacts(source),frozen=source.frozenRecalls?copy(source.frozenRecalls):{version:'recall/1',completed:copy(b.recalls)};
 return {version:'internal-read/1',synthetic:true,month,boundary:Number.isFinite(boundary)?boundary:null,shops,releases,map:copy({...b.map,activeShops:[...b.map.activeShops]}),ledger,nativeLedger,frozen,chosenDialogue:copy(chosen),cooldowns:{lastMonth:chosen.at(-1)?.month??null,lastMemoryMonth:chosen.filter(d=>d.kind==='memory').at(-1)?.month??null,lastText},limits:['選出台詞は本人の既読を証明しない。','現在月の候補比較。次の月は更新済みの月初契約が必要。','B案の合成確定場面を利用。現行全候補と新しい次世代選出の同値は未証明。']};
}
export function candidatesFromReadModel(model,shopId){
 const s=model.shops.find(s=>s.shopId===shopId),month=model.month,releases=model.releases.filter(r=>r.bottledMonth<month),empty={daily:[],memory:[]};if(!s)return empty;
 const additional=shopId==='supermarket'||shopId==='department';
 if(additional&&month<=(model.boundary??Infinity)||shopId==='bar'&&!s.barEnabled)return empty;
 if(shopId==='department'?!s.eligible.count:shopId==='bar'?!s.related:!s.related&&!s.eligible.count)return empty;
 const recent=s.eligible.lastMonth!==null&&month-s.eligible.lastMonth<=3;
 let daily=shopId==='bar'?[{key:'almond'},{key:'smoke'},{key:'aging'}]:shopId==='supermarket'?[{key:'evening'},{key:'home'}]:shopId==='department'?[{key:'gift'},{key:'flavor'},{key:'next'}]:[{key:'highball'}];
 if(shopId==='bar'){if(recent)daily.push({key:'aroma'},{key:'good'});}
 else if(shopId==='town-liquor'){if(releases.some(r=>month-r.bottledMonth<=3))daily.push({key:'new'});if(recent)daily.push({key:'sold'},{key:'lighter'});if(s.eligible.count&&month-s.eligible.lastMonth>=12)daily.push({key:'gap'});}
 else {if(recent)daily.push({key:shopId==='supermarket'?'sold':'five'});if(shopId==='supermarket'&&s.eligible.count&&month-s.eligible.lastMonth>=12)daily.push({key:'gap'});}
 const memory=[];
 for(const r of releases){const d=s.byRelease.find(d=>d.releaseId===r.id);if(!d||month-r.bottledMonth<24||month-d.firstMonth<24||!packageFamily(r.profile))continue;
 const base={releaseId:r.id,productId:r.productId,brandId:r.brandId};memory.push({...base,key:'remember'},{...base,key:'years'});
 if(!additional&&packageFamily(r.profile)==='smoke')memory.push({...base,key:'blue'});
 if(shopId==='department')memory.push({...base,key:'box'});else if(d.previousMonth!==null&&month-d.lastMonth<=3&&d.lastMonth-d.previousMonth>=12)memory.push({...base,key:'return'});
 }
 return {daily,memory};
}
export function readCompact(model){
 const shops=model.shops.map(s=>{const key=classifyShopRemark(s.facts),candidates=candidatesFromReadModel(model,s.shopId);return {shopId:s.shopId,key,text:SHOP_REMARK_TEXT[s.shopId]?.[key]??'',candidates,texts:{daily:candidates.daily.map(c=>({...c,text:SHOP_DIALOGUE_TEXT[s.shopId]?.daily[c.key]??''})),memory:candidates.memory.map(c=>({...c,text:SHOP_DIALOGUE_TEXT[s.shopId]?.memory[c.key]??''}))}};});
 return {shops,brandRemarks:model.shops.flatMap(s=>s.brandFacts.map(f=>({shopId:s.shopId,brandId:f.brandId,...remarkFromStoreFacts(f)}))),packages:model.releases.map(r=>({id:r.id,art:packageArt(r.profile,r.brand,r.priceTier),missingProfile:!packageFamily(r.profile)})),map:copy(model.map),ledger:{releases:model.releases.map(r=>({id:r.id,productId:r.productId,brandId:r.brandId,name:r.name,bottledMonth:r.bottledMonth,age:r.age,profile:copy(r.profile),brand:copy(r.brand),sourceGeneration:r.sourceGeneration,recipe:copy(r.recipe)})),...copy(model.ledger)},nativeLedger:readNativeLedger(model.nativeLedger),recalls:readCompletedRecalls(model.frozen),chosenDialogue:copy(model.chosenDialogue),limits:copy(model.limits)};
}
export function compareReadModels(source){
 const model=extractReadModel(source),compact=readCompact(JSON.parse(JSON.stringify(model))),b=currentView(source),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const checks=[];
 for(const s of compact.shops){const facts=shopRemarkFacts(source,s.shopId,1);checks.push({name:s.shopId+':remark',equal:s.key===classifyShopRemark(facts)},{name:s.shopId+':candidates',equal:equal(s.candidates,dialogueCandidates(source,source.core.month,s.shopId))});}
 for(const r of compact.brandRemarks)checks.push({name:r.shopId+':brand-'+r.brandId+':remark',equal:equal({key:r.key,text:r.text},remarkFromStoreFacts(shopRemarkFacts(source,r.shopId,r.brandId)))});
 checks.push({name:'native-ledger',equal:equal(compact.nativeLedger,buildReleaseLedger(source).entries.filter(r=>r.kind==='release').map(nativeFields))});
 checks.push({name:'package',equal:compact.packages.every((p,i)=>p.art===packageArt(source.releases[i].profile,source.brands.find(b=>b.id===source.releases[i].brandId),releasePriceTier(source,source.releases[i].productId)))},{name:'map',equal:equal(compact.map,{...b.map,activeShops:[...b.map.activeShops]})},{name:'ledger',equal:equal(compact.ledger,b.ledger)},{name:'frozen-recalls',equal:equal(compact.recalls,source.frozenRecalls?readCompletedRecalls(source.frozenRecalls):b.recalls)},{name:'chosen-dialogue',equal:equal(compact.chosenDialogue,shopDialogueHistory(source))});
 return {checks,allEqual:checks.every(c=>c.equal),missing:compact.packages.filter(p=>p.missingProfile).map(p=>({releaseId:p.id,kind:'profile-unavailable'})),limits:compact.limits,model,compact};
}

// Exact, smaller contract for release ledger counts; absent coverage stays unknown.
const nativeFields=r=>({releaseId:r.releaseId,productId:r.productId,bottles:r.bottles,stock:r.stock,status:r.status,listed:r.listed,retail:r.retail,deliveries:r.deliveries,deliveryComplete:r.deliveryComplete});
function extractNativeLedgerFacts(source){
 return source.releases.map(r=>{const p=source.core?.products?.find(p=>p.id===r.productId),record=source.records?.filter(x=>x.productId===r.productId).at(-1),rows=(source.shop?.deliveries??[]).filter(d=>d.productId===r.productId),sum=k=>rows.some(d=>!Number.isFinite(d[k]))?null:rows.reduce((n,d)=>n+(k==='revenue'?Math.round(d[k]*100):d[k]),0)/(k==='revenue'?100:1);return {releaseId:r.id,productId:r.productId,bottles:r.bottles??record?.bottles??null,stock:p?.stock??null,sourceSoldOut:r.status==='sold-out',listed:p?source.productsById?.[p.id]?.listed??r.listed??null:r.listed??null,retail:{count:r.sold??record?.sold??null,revenue:r.revenue??record?.revenue??null},mirror:{count:r.delivered??record?.delivered??null,revenue:r.deliveryRevenue??record?.deliveryRevenue??null},deliveryRows:rows.length,totals:{count:sum('count'),revenue:sum('revenue')}};});
}
export function readNativeLedger(facts){return facts.map(f=>{const deliveries=f.deliveryRows?f.totals:f.mirror,hasMirror=f.mirror.count!==null||f.mirror.revenue!==null,deliveryComplete=f.deliveryRows?deliveries.count!==null&&deliveries.revenue!==null&&f.mirror.count===deliveries.count&&f.mirror.revenue===deliveries.revenue:hasMirror&&f.mirror.count!==null&&f.mirror.revenue!==null,stock=f.stock??(f.sourceSoldOut?0:null);return {releaseId:f.releaseId,productId:f.productId,bottles:f.bottles,stock,status:stock===0?'sold-out':f.listed===true?'selling':f.listed===false?'stored':null,listed:f.listed,retail:copy(f.retail),deliveries:copy(deliveries),deliveryComplete};});}
// Monthly closed boundary: all source transactions are strictly before view month.
// Additional shop proof contracts are not silently invented from aggregates.
export function bridgeFromCore(core,{month=core.month+1,barEnabled=null,boundary=0}={}){
 if(!Number.isInteger(month)||month<=core.month)throw Error('Read month must follow the closed transaction month');
 const missing=[];if(barEnabled===null)missing.push({shopId:'bar',kind:'bar-activation-boundary-unavailable'});const releases=Object.values(core.identities).map(i=>{const d=core.wines[i.wineId]?.descriptor;if(!d){missing.push({releaseId:i.releaseId,kind:'wine-descriptor-unavailable'});return null;}return {id:i.releaseId,productId:i.productId,brandId:i.brandId,bottledMonth:i.bottledMonth,age:d.age,profile:copy(d.profile??null),brand:copy(d.brand??{}),priceTier:d.priceTier??'standard'};}).filter(Boolean);
 const records=Object.values(core.stores),brandIds=[...new Set([...releases.map(r=>r.brandId),...records.map(s=>s.brandId)])];
 const shops=ADAPTER_SHOPS.map(shopId=>{
  const rows=records.filter(s=>s.shopId===shopId),eligibleRows=rows.filter(s=>s.delivery.bottles>0);
  const brandFacts=brandIds.map(brandId=>{const s=rows.find(s=>s.brandId===brandId),last=s?.delivery.lastMonth??null;return {shopId,brandId,month,related:Number.isInteger(s?.startedMonth)&&s.startedMonth<=month,startedMonth:Number.isInteger(s?.startedMonth)&&s.startedMonth<=month?s.startedMonth:null,relationshipMonths:Number.isInteger(s?.startedMonth)&&s.startedMonth<=month?month-s.startedMonth:0,deliveryBottles:s?.delivery.bottles??0,deliveryMonthCount:s?.delivery.months??0,lastDeliveryMonth:last,gapMonths:last===null?null:month-last,hasCurrentOffer:false,hasUnapprovedInterest:false,hasPendingFive:false,hasReceivedFive:false,adoptionCount:0};});
  const proven=shopId==='town-liquor'||shopId==='bar';if(!proven&&rows.length)missing.push({shopId,kind:shopId==='department'?'adoption-and-pending-proof-unavailable':'store-market-boundary-proof-unavailable'});
  const byRelease=proven?rows.flatMap(s=>Object.entries(s.perRelease).map(([id,d])=>{const r=releases.find(r=>String(r.id)===id&&r.brandId===s.brandId);return r?{releaseId:r.id,count:d.bottles,firstMonth:d.firstMonth,lastMonth:d.lastMonths.at(-1)??null,previousMonth:d.lastMonths.at(-2)??null}:null;}).filter(Boolean)):[];
  const last=eligibleRows.length?Math.max(...eligibleRows.map(s=>s.delivery.lastMonth)):null;
  return {shopId,brandFacts,facts:brandFacts.find(f=>f.brandId===1)??{shopId,deliveryMonthCount:0,gapMonths:null},related:proven&&rows.some(s=>s.startedMonth!==null&&s.startedMonth<month),eligible:{count:proven?eligibleRows.reduce((n,s)=>n+s.delivery.bottles,0):0,lastMonth:proven?last:null},byRelease,barEnabled};
 });
 const contract={month,boundary,shops,releases};
 const nativeLedger=Object.keys(core.identities).map(id=>{const r=readRelease(core,id),live=core.releases[id],stock=live?.stock??0,listed=live?.listed??r.listed??false;return {releaseId:r.id,productId:r.productId,bottles:r.bottles,stock,status:stock===0?'sold-out':listed?'selling':'stored',listed,retail:{count:r.sold,revenue:r.revenue},deliveries:{count:r.delivered,revenue:r.deliveryRevenue},deliveryComplete:true};});
 return {view:{nativeLedger,recalls:copy(Object.values(core.recalls)),shops:shops.map(s=>({shopId:s.shopId,candidates:candidatesFromReadModel(contract,s.shopId)})),brandRemarks:shops.filter(s=>s.shopId!=='department').flatMap(s=>s.brandFacts.map(f=>({shopId:s.shopId,brandId:f.brandId,...remarkFromStoreFacts(f)}))),packages:releases.map(r=>({id:r.id,art:packageArt(r.profile,r.brand,r.priceTier)}))},missing:[...missing,{kind:'chosen-historical-dialogue-not-in-core'},{kind:'map-and-current-recall-candidates-not-in-core'}],contract};
}
