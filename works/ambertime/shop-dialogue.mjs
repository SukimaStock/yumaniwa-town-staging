import {SHOP_DIALOGUE_TEXT} from './shop-dialogue-text.mjs?v=dialogue-v02-1';
import {packageFamily} from './release-package.mjs?v=package-c1l-1';
// Presentation policy v1. Changing it reinterprets derived dialogue; keep it stable.
// One global opportunity, not one roll per store. Only town liquor is implemented.
export const DIALOGUE_POLICY=Object.freeze({version:1,opportunityEvery:12,minGap:9,sameTextGap:36,memoryGap:36,memoryAge:24,memoryShare:4,returnGap:12});
const SHOP='town-liquor',text=SHOP_DIALOGUE_TEXT[SHOP];
const hash=value=>{let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);return (h^(h>>>16))>>>0;};
const shopOf=d=>d.shopId??SHOP;
// Only prior-month immutable facts: later operations in the same month cannot
// reroll a letter. Neither allocations, revenue totals nor live RNG are inputs.
export function dialogueCandidates(state,month=state?.core?.month??0){
 const deliveries=(state.shop?.deliveries??[]).filter(d=>shopOf(d)===SHOP&&d.count>0&&Number.isInteger(d.month)&&d.month<month);
 const related=(state.shop?.relations??[]).some(r=>shopOf(r)===SHOP&&r.startedMonth<month);
 if(!related&&!deliveries.length)return {daily:[],memory:[]};
 const releases=(state.releases??[]).filter(r=>r.bottledMonth<month);
 const byRelease=new Map();for(const d of deliveries){const rows=byRelease.get(d.releaseId)??[];rows.push(d);byRelease.set(d.releaseId,rows);}
 const daily=[{key:'highball'}];
 if(releases.some(r=>month-r.bottledMonth<=3))daily.push({key:'new'});
 const recent=deliveries.filter(d=>month-d.month<=3);
 if(recent.length)daily.push({key:'sold'},{key:'lighter'});
 if(deliveries.length&&month-Math.max(...deliveries.map(d=>d.month))>=12)daily.push({key:'gap'});
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
export function shopDialogueHistory(state){
 const result=[],lastText=new Map();let last=-Infinity,lastMemory=-Infinity;
 const now=state?.core?.month;if(!Number.isInteger(now)||now<1)return result;
 const seed=state.seed??0;
 for(let month=1;month<=now;month++){
  if(month-last<DIALOGUE_POLICY.minGap||hash(`shop-dialogue-v1:opportunity:${seed}:${month}`)%DIALOGUE_POLICY.opportunityEvery!==0)continue;
  const candidates=dialogueCandidates(state,month);
  const eligible=(kind)=>candidates[kind].filter(c=>month-(lastText.get(c.key)??-Infinity)>=DIALOGUE_POLICY.sameTextGap);
  const memories=eligible('memory'),daily=eligible('daily');
  const kind=memories.length&&month-lastMemory>=DIALOGUE_POLICY.memoryGap&&hash(`shop-dialogue-v1:kind:${seed}:${month}`)%DIALOGUE_POLICY.memoryShare===0?'memory':'daily';
  const choices=kind==='memory'?memories:daily;if(!choices.length)continue;
  // Equal deterministic rank per release/text; no weighting by money or count.
  const chosen=[...choices].sort((a,b)=>hash(`${seed}:${month}:${a.key}:${a.releaseId??''}`)-hash(`${seed}:${month}:${b.key}:${b.releaseId??''}`)||String(a.releaseId??'').localeCompare(String(b.releaseId??'')))[0];
  result.push({id:`shop-dialogue-v1:${seed}:${month}`,shopId:SHOP,month,kind,...chosen,text:text[kind][chosen.key]});
  last=month;lastText.set(chosen.key,month);if(kind==='memory')lastMemory=month;
 }
 return result;
}
export const latestShopDialogue=(state,shopId=SHOP)=>shopId===SHOP?shopDialogueHistory(state).at(-1)??null:null;
// Cache only the read-only result for this exact immutable game object.
export function createDialogueProjection(){let source=null,value=null;return {read(state){if(state!==source){source=state;value=latestShopDialogue(state);}return value;},reset(){source=null;value=null;}};}
