// Diagnostic read boundary. No fake delivery arrays and no writes to native state.
import {ADAPTER_SHOPS,candidatesFromReadModel,remarkFromStoreFacts} from '../../ambertime-strategy-lab/internal/adapters.mjs';
import {shopRemarkFacts} from '../shop-remarks.mjs';
import {dialogueCandidates} from '../shop-dialogue.mjs';
const copy=x=>structuredClone(x),eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),shopOf=d=>d.shopId??'town-liquor';
const empty=()=>({count:0,bottles:0,months:0,firstMonth:null,lastMonth:null,previousMonth:null,five:false});
function add(a,d){a.count++;a.bottles+=d.count;a.five ||= d.count===5;if(a.lastMonth!==d.month){a.months++;a.firstMonth??=d.month;a.previousMonth=a.lastMonth;a.lastMonth=d.month;}}
export function createReader(){return {month:0,receiptCursor:0,operationCursor:0,boundary:null,all:{},eligible:{},closed:{},releases:[],chosen:[],cooldowns:{lastMonth:null,lastMemoryMonth:null,lastText:{}},missing:['Formal future recall collector and town progression remain native.']};}
// Call once per successful native commit. Append-only source is a prerequisite.
export function updateReader(reader,before,next,{chosenDialogue=[]}={}){
 const m=copy(reader),month=next.core.month;
 if(month<m.month||(next.shop?.deliveries??[]).length<m.receiptCursor||next.operations.length<m.operationCursor)throw Error('Reader session reset or source truncation');
 if(month>m.month)m.closed=copy(m.eligible); // Current-month receipts are excluded from dialogue until the next month.
 const newReleases=(next.releases??[]).slice(m.releases.length);
 for(const r of newReleases)m.releases.push({id:r.id,productId:r.productId,brandId:r.brandId,bottledMonth:r.bottledMonth,profile:copy(r.profile??null)});
 for(const op of next.operations.slice(m.operationCursor))if(op.key==='enable-shop-dialogue'&&op.value?.version===2)m.boundary=op.value.boundaryMonth;
 const byId=new Map(m.releases.map(r=>[r.id,r]));
 for(const d of (next.shop?.deliveries??[]).slice(m.receiptCursor)){
  if(!Number.isInteger(d.month)||d.month!==month||!Number.isInteger(d.count)||d.count<=0)throw Error('Reader requires current-month committed receipts');
  const sid=shopOf(d),key=JSON.stringify([sid,d.brandId]);add(m.all[key]??=empty(),d);
  const r=byId.get(d.releaseId),matches=r&&r.brandId===d.brandId&&r.productId===d.productId;
  let eligible=true;
  if(sid==='supermarket')eligible=matches&&Number.isInteger(next.storeMarket?.startedMonth)&&next.storeMarket.startedMonth>=0&&d.month>next.storeMarket.startedMonth;
  if(sid==='department'){const a=next.department?.adoptions?.find(a=>a.deliveryId===d.id&&a.count===5);eligible=matches&&d.count===5&&a&&['selectionId','projectId','brandId','releaseId','sourceReleaseId','month','count'].every(k=>a[k]!==undefined&&a[k]===d[k]);}
  if(eligible){const s=m.eligible[sid]??={total:empty(),byRelease:{}};add(s.total,d);if(matches)add(s.byRelease[d.releaseId]??=empty(),d);}
 }
 // Only actual chosen output supplied by the native projection may enter this log.
 for(const entry of chosenDialogue){if(typeof entry.id!=='string'||!entry.id||!Number.isInteger(entry.month))throw Error('Chosen dialogue identity required');const old=m.chosen.find(x=>x.id===entry.id);if(old){if(!eq(old,entry))throw Error('Chosen dialogue changed');continue;}if(entry.month>month)throw Error('Future dialogue');if(m.cooldowns.lastMonth!==null&&entry.month<=m.cooldowns.lastMonth)throw Error('Chosen dialogue order changed');m.chosen.push(copy(entry));m.cooldowns.lastMonth=entry.month;if(entry.kind==='memory')m.cooldowns.lastMemoryMonth=entry.month;m.cooldowns.lastText[entry.shopId+':'+entry.key]=entry.month;}
 m.month=month;m.receiptCursor=(next.shop?.deliveries??[]).length;m.operationCursor=next.operations.length;
 m.relations=copy(next.shop?.relations??[]);m.brandIds=(next.brands??[]).map(b=>b.id);m.offers=copy([next.shop?.offer,...(next.shop?.pendingOffers??[])].filter(Boolean));m.interests=copy(next.department?.interests??[]);
 m.adoptionCounts=Object.fromEntries(m.brandIds.map(id=>[id,(next.department?.adoptions??[]).filter(a=>a.brandId===id&&a.count===5&&a.month<=month).length]));
 m.barEnabled=next.alleyBar?.version===1&&Number.isInteger(next.alleyBar.boundaryMonth)&&next.alleyBar.boundaryMonth<month;
 return m;
}
export function readReader(m){
 const shops=ADAPTER_SHOPS.map(shopId=>{
  const brandFacts=m.brandIds.map(brandId=>{const a=m.all[JSON.stringify([shopId,brandId])]??empty(),r=m.relations.find(r=>shopOf(r)===shopId&&r.brandId===brandId&&r.startedMonth<=m.month),interests=m.interests.filter(i=>i.brandId===brandId),adoptionCount=shopId==='department'?m.adoptionCounts[brandId]??0:0;return {shopId,brandId,month:m.month,related:!!r,startedMonth:r?.startedMonth??null,relationshipMonths:r?m.month-r.startedMonth:0,deliveryBottles:a.bottles,deliveryMonthCount:a.months,lastDeliveryMonth:a.lastMonth,gapMonths:a.lastMonth===null?null:m.month-a.lastMonth,hasCurrentOffer:m.offers.some(o=>o.shopId===shopId&&o.brandId===brandId),hasUnapprovedInterest:shopId==='department'&&interests.some(i=>!i.pendingDelivery),hasPendingFive:shopId==='department'&&interests.some(i=>i.pendingDelivery?.count===5),hasReceivedFive:shopId==='department'&&(adoptionCount>0||a.five),adoptionCount};});
  const s=m.closed[shopId]??{total:empty(),byRelease:{}};
  return {shopId,brandFacts,related:m.relations.some(r=>shopOf(r)===shopId&&r.startedMonth<m.month),eligible:s.total,byRelease:Object.entries(s.byRelease).map(([id,a])=>({releaseId:m.releases.find(r=>String(r.id)===id)?.id,...a})),barEnabled:m.barEnabled};
 });
 const contract={month:m.month,boundary:m.boundary??Infinity,releases:m.releases,shops};
 return {shops:shops.map(s=>({shopId:s.shopId,candidates:candidatesFromReadModel(contract,s.shopId),remarks:s.brandFacts.map(f=>({brandId:f.brandId,...remarkFromStoreFacts(f)}))})),chosen:copy(m.chosen),cooldowns:copy(m.cooldowns),missing:copy(m.missing)};
}
export function compareReader(reader,native){const view=readReader(reader),checks=[];for(const s of view.shops){checks.push({name:s.shopId+':candidates',equal:eq(s.candidates,dialogueCandidates(native,native.core.month,s.shopId))});for(const r of s.remarks)checks.push({name:s.shopId+':remark:'+r.brandId,equal:eq({key:r.key,text:r.text},remarkFromStoreFacts(shopRemarkFacts(native,s.shopId,r.brandId)))});}return {checks,allEqual:checks.every(x=>x.equal),view};}
