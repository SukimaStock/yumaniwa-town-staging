import {SHOP_DIALOGUE_TEXT} from './shop-dialogue-text.mjs?v=all-stores-s2-1';
import {packageFamily} from './release-package.mjs?v=package-c1l-1';
// Presentation policy v1. Changing it reinterprets derived dialogue; keep it stable.
// One global opportunity, not one roll per store. Legacy months retain v1.
export const DIALOGUE_POLICY=Object.freeze({version:1,opportunityEvery:12,minGap:9,sameTextGap:36,memoryGap:36,memoryAge:24,memoryShare:4,returnGap:12});
const SHOP='town-liquor';
export const dialogueShopName=id=>({'town-liquor':'町の酒店',bar:'路地裏のバー',supermarket:'町のスーパー',department:'町のデパート'}[id]??'取扱店');
export const DIALOGUE_V2_SPEAKERS=Object.freeze([SHOP,SHOP,'supermarket','supermarket','bar','department']);
export function dialoguePolicyBoundary(state){
 const value=state?.operations?.find(op=>op.key==='enable-shop-dialogue')?.value;
 return value?.version===2&&Number.isInteger(value.boundaryMonth)&&value.boundaryMonth>=0&&value.boundaryMonth<=(state?.core?.month??-1)?value.boundaryMonth:Infinity;
}
const hash=value=>{let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);return (h^(h>>>16))>>>0;};
const shopOf=d=>d.shopId??SHOP;
// Only prior-month immutable facts: later operations in the same month cannot
// reroll a letter. Neither allocations, revenue totals nor live RNG are inputs.
export function dialogueCandidates(state,month=state?.core?.month??0,shopId=SHOP,boundary=dialoguePolicyBoundary(state)){
 if(shopId==='supermarket'||shopId==='department')return additionalShopCandidates(state,month,shopId,boundary);
 if(!SHOP_DIALOGUE_TEXT[shopId]||shopId==='bar'&&!(state.alleyBar?.version===1&&Number.isInteger(state.alleyBar.boundaryMonth)&&state.alleyBar.boundaryMonth<month))return {daily:[],memory:[]};
 const deliveries=(state.shop?.deliveries??[]).filter(d=>shopOf(d)===shopId&&d.count>0&&Number.isInteger(d.month)&&d.month<month);
 const related=(state.shop?.relations??[]).some(r=>shopOf(r)===shopId&&r.startedMonth<month);
 if(shopId==='bar'&&!related||!related&&!deliveries.length)return {daily:[],memory:[]};
 const releases=(state.releases??[]).filter(r=>r.bottledMonth<month);
 const byRelease=new Map();for(const d of deliveries){const rows=byRelease.get(d.releaseId)??[];rows.push(d);byRelease.set(d.releaseId,rows);}
 const recent=deliveries.filter(d=>month-d.month<=3);
 const daily=shopId==='bar'?[{key:'almond'},{key:'smoke'},{key:'aging'}]:[{key:'highball'}];
 if(shopId==='bar'){
  if(recent.length)daily.push({key:'aroma'},{key:'good'});
 }else{
  if(releases.some(r=>month-r.bottledMonth<=3))daily.push({key:'new'});
  if(recent.length)daily.push({key:'sold'},{key:'lighter'});
  if(deliveries.length&&month-Math.max(...deliveries.map(d=>d.month))>=12)daily.push({key:'gap'});
 }
 const memory=[];
 for(const release of releases){
  const sold=(byRelease.get(release.id)??[]).filter(d=>d.productId===release.productId&&d.brandId===release.brandId);
  if(!sold.length||month-release.bottledMonth<DIALOGUE_POLICY.memoryAge||month-Math.min(...sold.map(d=>d.month))<DIALOGUE_POLICY.memoryAge||!packageFamily(release.profile))continue;
  const base={releaseId:release.id,productId:release.productId,brandId:release.brandId};
  memory.push({...base,key:'remember'},{...base,key:'years'});
  if(packageFamily(release.profile)==='smoke')memory.push({...base,key:'blue'});
  const ordered=[...new Set(sold.map(d=>d.month))].sort((a,b)=>a-b);
  if(ordered.length>1&&month-ordered.at(-1)<=3&&ordered.at(-1)-ordered.at(-2)>=DIALOGUE_POLICY.returnGap)memory.push({...base,key:'return'});
 }
 return {daily,memory};
}
// New voices use proven facts; legacy v1 candidates above remain byte-stable.
function additionalShopCandidates(state,month,shopId,boundary){
 const empty={daily:[],memory:[]};if(month<=boundary)return empty;
 const releases=(state.releases??[]).filter(r=>r.bottledMonth<month);
 const releaseById=new Map(releases.map(r=>[r.id,r]));
 const matching=d=>{const r=releaseById.get(d.releaseId);return r&&r.brandId===d.brandId&&r.productId===d.productId;};
 let deliveries=(state.shop?.deliveries??[]).filter(d=>d.shopId===shopId&&Number.isInteger(d.month)&&d.month<month&&d.count>0&&matching(d));
 if(shopId==='supermarket'){
  const start=state.storeMarket?.startedMonth;
  deliveries=Number.isInteger(start)&&start>=0?deliveries.filter(d=>d.month>start):[];
 }else{
  const adoptions=new Map((state.department?.adoptions??[]).filter(a=>a.count===5).map(a=>[a.deliveryId,a]));
  deliveries=deliveries.filter(d=>{const a=adoptions.get(d.id);return d.count===5&&a&&['selectionId','projectId','brandId','releaseId','sourceReleaseId','month','count'].every(k=>a[k]!==undefined&&a[k]===d[k]);});
 }
 const related=(state.shop?.relations??[]).some(r=>r.shopId===shopId&&Number.isInteger(r.startedMonth)&&r.startedMonth<month);
 // A department interest or an accepted-but-unfulfilled selection is not a delivery.
 if(shopId==='department'?!deliveries.length:!related&&!deliveries.length)return empty;
 const recent=deliveries.filter(d=>month-d.month<=3);
 const daily=shopId==='supermarket'?[{key:'evening'},{key:'home'}]:[{key:'gift'},{key:'flavor'},{key:'next'}];
 if(recent.length)daily.push({key:shopId==='supermarket'?'sold':'five'});
 if(shopId==='supermarket'&&deliveries.length&&month-Math.max(...deliveries.map(d=>d.month))>=12)daily.push({key:'gap'});
 const memory=[];
 for(const release of releases){
  const sold=deliveries.filter(d=>d.releaseId===release.id);
  if(!sold.length||month-release.bottledMonth<DIALOGUE_POLICY.memoryAge||month-Math.min(...sold.map(d=>d.month))<DIALOGUE_POLICY.memoryAge||!packageFamily(release.profile))continue;
  const base={releaseId:release.id,productId:release.productId,brandId:release.brandId};
  memory.push({...base,key:'remember'},{...base,key:'years'});
  if(shopId==='department')memory.push({...base,key:'box'});
  else{
   const ordered=[...new Set(sold.map(d=>d.month))].sort((a,b)=>a-b);
   if(ordered.length>1&&month-ordered.at(-1)<=3&&ordered.at(-1)-ordered.at(-2)>=DIALOGUE_POLICY.returnGap)memory.push({...base,key:'return'});
  }
 }
 return {daily,memory};
}
export function shopDialogueHistory(state){
 const result=[],lastText=new Map();let last=-Infinity,lastMemory=-Infinity;
 const now=state?.core?.month;if(!Number.isInteger(now)||now<1)return result;
 const seed=state.seed??0,boundary=dialoguePolicyBoundary(state);
 for(let month=1;month<=now;month++){
  if(month-last<DIALOGUE_POLICY.minGap||hash(`shop-dialogue-v1:opportunity:${seed}:${month}`)%DIALOGUE_POLICY.opportunityEvery!==0)continue;
  const bar=dialogueCandidates(state,month,'bar',boundary);
  // v1 keeps two town slots to one bar slot. v2 uses the fixed six-slot list.
  // An ineligible slot stays silent; stores never add another opportunity.
  const v2=month>boundary;
  const shopId=v2?DIALOGUE_V2_SPEAKERS[hash(`shop-dialogue-v2:speaker:${seed}:${month}`)%DIALOGUE_V2_SPEAKERS.length]:bar.daily.length&&hash(`shop-dialogue-v1:speaker:${seed}:${month}`)%3===0?'bar':SHOP;
  const candidates=shopId==='bar'?bar:dialogueCandidates(state,month,shopId,boundary);
  const text=SHOP_DIALOGUE_TEXT[shopId];
  const eligible=(kind)=>candidates[kind].filter(c=>month-(lastText.get(shopId+':'+c.key)??-Infinity)>=DIALOGUE_POLICY.sameTextGap);
  const memories=eligible('memory'),daily=eligible('daily');
  const kind=memories.length&&month-lastMemory>=DIALOGUE_POLICY.memoryGap&&hash(`shop-dialogue-v1:kind:${seed}:${month}`)%DIALOGUE_POLICY.memoryShare===0?'memory':'daily';
  const choices=kind==='memory'?memories:daily;if(!choices.length)continue;
  // Equal deterministic rank per release/text; no weighting by money or count.
  const chosen=[...choices].sort((a,b)=>hash(`${seed}:${month}:${a.key}:${a.releaseId??''}`)-hash(`${seed}:${month}:${b.key}:${b.releaseId??''}`)||String(a.releaseId??'').localeCompare(String(b.releaseId??'')))[0];
  result.push({id:`shop-dialogue-v${v2?2:1}:${seed}:${month}`,shopId,month,kind,...chosen,text:text[kind][chosen.key]});
  last=month;lastText.set(shopId+':'+chosen.key,month);if(kind==='memory')lastMemory=month;
 }
 return result;
}
export const latestShopDialogue=(state,shopId=SHOP)=>shopDialogueHistory(state).filter(entry=>entry.shopId===shopId).at(-1)??null;
// Cache all stores once for this exact immutable game object. No saved state.
// Omitting shopId reads the latest global notice; specifying it reads that store.
export function createDialogueProjection(){let source=null,value=[];return {read(state,shopId){if(state!==source){source=state;value=shopDialogueHistory(state);}return (shopId===undefined?value:value.filter(entry=>entry.shopId===shopId)).at(-1)??null;},reset(){source=null;value=[];}};}
