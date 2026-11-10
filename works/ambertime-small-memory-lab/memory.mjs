import {shopRemark,shopRemarkFacts,classifyShopRemark,SHOP_REMARK_TEXT} from '../ambertime/shop-remarks.mjs';
import {dialogueCandidates,dialogueShopName} from '../ambertime/shop-dialogue.mjs';
import {SHOP_DIALOGUE_TEXT} from '../ambertime/shop-dialogue-text.mjs';
import {mapProgress} from '../ambertime/world-map-view.mjs';
import {NODES} from '../ambertime/town-connection.mjs';
import {selectC,selectionSeed} from '../ambertime/recall/selection.mjs';
import {packageFamily} from '../ambertime/release-package.mjs';
const copy=structuredClone;
const shopOf=d=>d.shopId??'town-liquor';
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
export const measure=value=>new TextEncoder().encode(JSON.stringify(value)).byteLength;
function editions(source){return source.generations.completed.map(g=>{
 const events=source.recallFacts.filter(e=>e.month<g.endedMonth),boundary={id:'handover:'+g.id,month:g.endedMonth,operationIndex:Math.max(-1,...events.map(e=>e.operationIndex))+1,ordinal:0,generationId:g.id,ids:{toGeneration:g.id+1}};
 const scenes=selectC({events,current:events.filter(e=>e.generationId===g.id),boundary,startMonth:g.startedMonth,seed:selectionSeed(source.seed,boundary)});
 return {generation:g.id,startMonth:g.startedMonth,endedMonth:g.endedMonth,scenes};
});}
function regions(source){return NODES.map(n=>{
 const events=source.labConnection.town.events.filter(e=>(e.type==='visit'?e.from:e.to)===n.id),arrivals=events.filter(e=>e.type==='arrival'&&e.channel!=='direct'),node=source.labConnection.town.nodes[n.id]??{};
 const e=[...events.filter(e=>['inquiry','visit','trade'].includes(e.type)),...arrivals].sort((a,b)=>a.month-b.month||a.id.localeCompare(b.id)).at(-1);
 return {id:n.id,name:n.name,level:n.level,awareness:node.awareness??0,interest:node.interest??0,root:node.root??0,firstArrivalMonth:arrivals[0]?.month??null,lastEvent:e?{kind:e.type,month:e.month,releaseId:e.mainReleaseId??null}:null,inquiry:events.some(e=>e.type==='inquiry'),visit:events.some(e=>e.type==='visit'),trading:!!node.trading};
});}
function catalog(source){return source.releases.map(r=>({id:r.id,productId:r.productId,brandId:r.brandId,name:source.brands.find(b=>b.id===r.brandId)?.name??'記録なし',bottledMonth:r.bottledMonth,age:r.age,profile:copy(r.profile??null),brand:copy(source.brands.find(b=>b.id===r.brandId)??{}),sourceGeneration:r.sourceGeneration??null,recipe:copy(r.recipe??null)}));}
function ledger(source){return {releases:catalog(source),recent:source.recallFacts.filter(e=>['bottling','delivery'].includes(e.kind)).slice(-8).map(e=>({kind:e.kind,month:e.month,releaseId:e.ids.releaseId,shopId:e.ids.shopId??null,count:e.ids.count})),milestones:source.recallFacts.filter(e=>e.kind==='shop-start'||['inquiry','visit'].includes(e.kind)).map(e=>({kind:e.kind,month:e.month,shopId:e.ids.shopId??null,regionId:e.ids.regionId??null,releaseId:e.ids.releaseId??null})),generations:copy([...source.generations.completed,source.generations.active])};}
function memoryText(shopId,rows){return rows.map(c=>({...c,text:SHOP_DIALOGUE_TEXT[shopId]?.memory[c.key]??''}));}
export function currentView(source){const p=mapProgress(source);return {month:source.core.month,shops:source.shop.relations.map(rel=>{
 const shopId=shopOf(rel),r=shopRemark(source,shopId,rel.brandId),d=source.shop.deliveries.filter(d=>shopOf(d)===shopId&&d.brandId===rel.brandId);
 return {shopId,brandId:rel.brandId,name:dialogueShopName(shopId),remark:r.text,remarkKey:r.key,startMonth:rel.startedMonth,lastMonth:r.facts.lastDeliveryMonth,deliveryCount:d.length,deliveryMonthCount:r.facts.deliveryMonthCount,bottles:r.facts.deliveryBottles,memories:memoryText(shopId,dialogueCandidates(source,source.core.month,shopId).memory)};
 }),map:{...p,activeShops:[...p.activeShops],regions:regions(source)},ledger:ledger(source),recalls:editions(source),details:{deliveries:copy(source.shop.deliveries),arrivals:copy(source.labConnection.town.arrivals),attempts:copy(source.labConnection.town.attempts),candidateCount:source.recallFacts.length,ledgerEvents:source.recallFacts.map(e=>({kind:e.kind,month:e.month,releaseId:e.ids.releaseId??null,shopId:e.ids.shopId??null,regionId:e.ids.regionId??null,count:e.ids.count??null}))},limits:['現行の実関数へ合成状態を入力。実プレイの再現性は検証対象外。']};}
// Extraction is the sole full-source access boundary. Returned JSON has no references or readers.
export function extractMemory(source){
 const book=ledger(source),now=source.core.month;
 const shops=source.shop.relations.map(rel=>{
  const shopId=shopOf(rel),facts=shopRemarkFacts(source,shopId,rel.brandId),deliveries=source.shop.deliveries.filter(d=>shopOf(d)===shopId&&d.brandId===rel.brandId&&d.count>0&&d.month<now);
  const releaseIds=[...new Set(deliveries.map(d=>d.releaseId))];
  // One first/representative old release per shop, not every historical delivery group.
  const representativeId=releaseIds.find(id=>book.releases.some(r=>r.id===id))??null;
  const rows=deliveries.filter(d=>d.releaseId===representativeId),months=[...new Set(rows.map(d=>d.month))].sort((a,b)=>a-b);
  const {deliveryMonths,...compactFacts}=facts;
  return {shopId,brandId:rel.brandId,startMonth:rel.startedMonth,facts:compactFacts,deliveryCount:source.shop.deliveries.filter(d=>shopOf(d)===shopId&&d.brandId===rel.brandId&&d.count>0&&d.month<=now).length,representative:representativeId===null?null:{releaseId:representativeId,firstMonth:months[0],lastMonth:months.at(-1),previousMonth:months.at(-2)??null}};
 });
 const p=mapProgress(source);
 const recalls=editions(source).map(e=>({...e,scenes:e.scenes.map(s=>({month:s.month,sentence:s.sentence,eventId:s.eventId,event:{kind:s.event.kind,ids:copy(s.event.ids)},links:copy(s.links)}))}));
 // Frozen episodes already contain their wording; future views never re-run selection.
 const anchors=Object.values(Object.fromEntries(source.recallFacts.filter(e=>e.ids.shopId||e.ids.regionId).map(e=>[(e.ids.shopId?'shop:'+e.ids.shopId:'region:'+e.ids.regionId),e]).reverse())).map(e=>({kind:e.kind,month:e.month,generationId:e.generationId,shopId:e.ids.shopId??null,regionId:e.ids.regionId??null,releaseId:e.ids.releaseId??null}));
 const selectedProfileIds=new Set([source.releases.at(-1)?.id,...shops.map(s=>s.representative?.releaseId)]);
 book.releases=book.releases.map(r=>({...r,profile:selectedProfileIds.has(r.id)?r.profile:null,recipe:selectedProfileIds.has(r.id)?r.recipe:null}));
 // First contact of each kind and latest special fact; repeated contacts are omitted.
 const keep=new Map();for(const e of book.milestones){const key=e.kind+':'+(e.shopId??e.regionId);if(!keep.has(key))keep.set(key,e);}if(book.milestones.length)keep.set('latest',book.milestones.at(-1));book.milestones=[...new Map([...keep.values()].map(e=>[JSON.stringify(e),e])).values()];
 return freeze({version:1,synthetic:true,month:now,shops,map:{bottled:p.bottled,firstSale:p.firstSale,activeShops:[...p.activeShops],regions:regions(source)},ledger:book,recalls,anchors});
}
export function compactView(memory){
 const m=copy(memory),regions=m.map.regions,reached={town:false,near:false,national:false,overseas:false};
 const groups={'町':'town','周辺地域':'near','全国':'national','海外':'overseas'};for(const r of regions)if(r.firstArrivalMonth!==null)reached[groups[r.level]]=true;
 const overseasContact=regions.some(r=>r.level==='海外'&&(r.inquiry||r.visit));
 let max=m.map.firstSale?2:1;if(reached.town)max=3;if(reached.near)max=4;if(reached.national||reached.overseas)max=5;if(overseasContact)max=6;
 return {month:m.month,shops:m.shops.map(s=>{
 const key=classifyShopRemark(s.facts),representative=s.representative,r=m.ledger.releases.find(r=>r.id===representative?.releaseId),memories=[];
 if(r&&representative&&m.month-r.bottledMonth>=24&&m.month-representative.firstMonth>=24&&packageFamily(r.profile)){
  const base={releaseId:r.id,productId:r.productId,brandId:r.brandId};memories.push({...base,key:'remember'},{...base,key:'years'});
  if(packageFamily(r.profile)==='smoke'&&s.shopId==='town-liquor')memories.push({...base,key:'blue'});
  if(representative.previousMonth!==null&&m.month-representative.lastMonth<=3&&representative.lastMonth-representative.previousMonth>=12)memories.push({...base,key:'return'});
 }
 return {shopId:s.shopId,brandId:s.brandId,name:dialogueShopName(s.shopId),remark:SHOP_REMARK_TEXT[s.shopId]?.[key]??'',remarkKey:key,startMonth:s.startMonth,lastMonth:s.facts.lastDeliveryMonth,deliveryCount:s.deliveryCount,deliveryMonthCount:s.facts.deliveryMonthCount,bottles:s.facts.deliveryBottles,memories:memoryText(s.shopId,memories)};
 }),map:{...m.map,max,reached,overseasContact},ledger:m.ledger,recalls:m.recalls,details:{candidateCount:null},limits:['店が思い出せる酒は代表の1発売回。全ての過去の酒への台詞は残らない。','味・製法を残さない発売回は日付とIDで識別できるが、パッケージの復元や製法の再利用はできない。','納品の各明細、口コミの全経路、選外の回想候補は表示できない。']};
}
