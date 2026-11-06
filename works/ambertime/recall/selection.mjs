import {firstDeliveryIds,recallSentence} from './caption.mjs';
import {monthLabel} from '../model.mjs';
// C selection and seed are fixed to the reviewed H3-1 / H3-2 edition.
const editionVersion='D1.1';
export const selectionSourceSha256='4c3e11af2be1e911235225f2cb7d266a85f471d07d630537ceacedf73a29a3b4';
export const position=e=>e.replayOrdinal??e.ordinal;
export const order=(a,b)=>a.month-b.month||a.operationIndex-b.operationIndex||position(a)-position(b)||a.id.localeCompare(b.id);
export const world=e=>['shop-start','delivery','sale','reaction','arrival','inquiry','visit'].includes(e.kind);
export const category=e=>['shop-start','delivery'].includes(e.kind)?'店':['sale','reaction'].includes(e.kind)?'人':['arrival','inquiry','visit'].includes(e.kind)?'地域':'蒸留所';
export const before=(e,b)=>e.month<=b.month&&(e.operationIndex<b.operationIndex||e.operationIndex===b.operationIndex&&position(e)<=position(b));
const subject=e=>e.ids.shopId?'shop:'+e.ids.shopId:e.ids.regionId?'region:'+e.ids.regionId:null;
const stableRank=(id,seed)=>{let h=seed>>>0;for(const c of id)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
export function linksFor(event,events){
 const prior=events.filter(e=>order(e,event)<0),links=[];
 const add=(source,type,causal=false)=>{if(source)links.push({sourceId:source.id,type,causal,sourceMonth:source.month,sourceGeneration:source.generationId,crossGeneration:source.generationId<event.generationId});};
 const key=subject(event);
 if(key){
  const first=prior.filter(e=>subject(e)===key&&(event.kind!=='delivery'||e.kind==='delivery'))[0];
  if(first&&(first.generationId<event.generationId||event.month-first.month>=120))add(first,'再登場');
 }
 if(['inquiry','visit'].includes(event.kind))add(prior.filter(e=>e.kind==='arrival'&&e.ids.townReleaseId===event.ids.townReleaseId&&event.evidence?.sourceChain?.includes(e.ids.townEventId)).at(-1),'確認済み口コミ経路',true);
 if(event.kind==='bottling'){
  const fill=prior.find(e=>e.kind==='fill'&&e.ids.caskId===event.ids.caskId);
  if(fill?.generationId<event.generationId)add(fill,'先代の樽');
 }
 if(world(event)&&event.ids.releaseId!=null){
  const release=prior.find(e=>e.kind==='bottling'&&e.ids.releaseId===event.ids.releaseId&&(event.ids.productId==null||e.ids.productId===event.ids.productId));
  if(release?.generationId<event.generationId)add(release,'先代の発売');
 }
 if(event.kind==='delivery')add(prior.find(e=>e.kind==='delivery'&&e.ids.shopId===event.ids.shopId&&e.ids.brandId===event.ids.brandId&&e.ids.releaseId!==event.ids.releaseId&&e.generationId<event.generationId),'同じ銘柄の別発売');
 return links;
}
function sentence(event,links,events){
 const original=recallSentence(event,firstDeliveryIds({coverage:{complete:true,fromMonth:0},events}));
 const date=monthLabel(event.month)+'、',place=event.scene?.entity?.name,brand=event.scene?.bottle?.name;
 if(event.kind==='delivery'&&place&&brand){
  const recurrent=links.find(l=>l.type==='再登場');
  const era=recurrent?.sourceGeneration===event.generationId-1?'先代':recurrent?.sourceGeneration===1?'初代':'第'+recurrent?.sourceGeneration+'世代';
  return date+(recurrent?.crossGeneration?era+'の頃に酒を届けた':'')+place+'に『'+brand+'』が届いた。';
 }
 const inherited=links.find(l=>l.type==='先代の樽');
 if(event.kind==='bottling'&&inherited){
  const era=inherited.sourceGeneration===event.generationId-1?'先代':'第'+inherited.sourceGeneration+'世代';
  return date+era+'が樽に詰めた『'+(brand??'ウイスキー')+'』を瓶詰めした。';
 }
 return original;
}
function scene(event,ctx,selected,reason){
 const links=linksFor(event,ctx.events),ids=new Set(selected.map(e=>e.id));
 return {event,number:selected.findIndex(e=>e.id===event.id)+1,month:event.month,sentence:sentence(event,links,ctx.events),category:category(event),eventId:event.id,reason,links:links.map(l=>({...l,role:ids.has(l.sourceId)?'主場面間':'背景参照'})),illustration:{location:event.scene?.entity?.name??'蒸留所',bottle:event.scene?.bottle??null,action:({delivery:'店に瓶が届く',arrival:'地域の店先で酒の話が交わされる',inquiry:'蒸留所に問い合わせが届く',visit:'蒸留所の入口に訪問者',reaction:'自家販売の客と瓶',bottling:'貯蔵庫の樽と瓶',handover:'蒸留所の入口'})[event.kind]??event.label}};
}
const baseWeight={delivery:8,'shop-start':8,arrival:5,inquiry:7,visit:8,reaction:7,sale:2,bottling:2};
function select(ctx,seed){
 const candidates=ctx.current.filter(e=>world(e)||e.kind==='bottling'&&linksFor(e,ctx.events).some(l=>l.type==='先代の樽'));
 const selected=[],reason=new Map(),links=new Map(candidates.map(e=>[e.id,linksFor(e,ctx.events)]));
 const span=Math.max(1,ctx.boundary.month-ctx.startMonth),band=e=>Math.min(2,Math.floor(3*(e.month-ctx.startMonth)/span)),rank=e=>stableRank(e.id,seed);
 {
  const pairs=candidates.flatMap(e=>links.get(e.id).filter(l=>l.causal).flatMap(l=>{
   const source=candidates.find(s=>s.id===l.sourceId);
   return source?[{source,event:e,gain:8+Math.min(6,(e.month-source.month)/24)+({全国:3,海外:4}[e.ids.level]??0)}]:[];
  })).sort((a,b)=>b.gain-a.gain||rank(a.event)-rank(b.event));
  if(pairs[0])for(const e of [pairs[0].source,pairs[0].event]){selected.push(e);reason.set(e.id,'同じ発売・記録済み参照経路の2場面');}
 }
 while(selected.length<6){
  const ranked=candidates.filter(e=>!selected.includes(e)).map(e=>{
   const ls=links.get(e.id),sameKind=selected.filter(s=>s.kind===e.kind).length,sameSubject=subject(e)&&selected.some(s=>subject(s)===subject(e));
   let gain=(baseWeight[e.kind]??0)+(selected.some(s=>category(s)===category(e))?0:5)+(selected.some(s=>band(s)===band(e))?0:5)-sameKind*7-(sameSubject?3:0);
   gain+=ls.some(l=>l.crossGeneration)?8:0;
   gain+=ls.some(l=>l.type==='先代の樽')?9:0;
   gain+=ls.some(l=>selected.some(s=>s.id===l.sourceId))?4:0;
   return {e,gain};
  }).sort((a,b)=>b.gain-a.gain||rank(a.e)-rank(b.e));
  if(!ranked.length||ranked[0].gain<6)break;
  const {e}=ranked[0];selected.push(e);reason.set(e.id,links.get(e.id).some(l=>l.crossGeneration)?'過去世代との事実上のつながり':'世界の出来事と時期を補う');
 }
 selected.sort(order);return {selected,reason};
}

export function selectionSeed(gameSeed,boundary){
 const text=JSON.stringify([gameSeed,boundary.ids.toGeneration,boundary.operationIndex,boundary.month,position(boundary),editionVersion]);let h=2166136261;
 for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return h>>>0;
}
export function selectC({events,current,boundary,startMonth,seed}){
 if(events.some(e=>!before(e,boundary)))throw Error('Future fact in selection');
 const ctx={events:[...events].sort(order),current:[...current].sort(order),boundary,startMonth};
 const {selected,reason}=select(ctx,seed);
 return selected.map(e=>scene(e,ctx,selected,reason.get(e.id)));
}
