// Offline extraction from the exact saves used by H0 and H1-B.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {simulateScenario} from '../history-lab/scenarios.mjs';
import {observeFacts,sourceChain} from '../memory-lab/connections.mjs';
import {customerComments} from '../player-news.mjs';
import {SHOPS} from '../shop-model.mjs';
import {NODES} from '../town-connection.mjs';
import {compactFacts} from './facts-compact.mjs';

const json = path => JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const histories = json('../history-lab/fixtures.json');
const previous = json('../memory-lab/connections.json');
const shops = new Map(SHOPS.map(({id,name}) => [id,{id,name}]));
const places = new Map(NODES.map(({id,name,level}) => [id,{id,name,level}]));
const distillery = {id:'distillery',name:'蒸留所'};

function extract(state,analysis,uncompressed) {
  const sales = new Map(), caskTypes = new Map(), townOrigins = new Map();
  const facts = observeFacts(state,analysis,({index,operation,before,after}) => {
    for (const cask of after.core.casks) if (!caskTypes.has(cask.id)) caskTypes.set(cask.id,cask.type);
    const town = after.labConnection?.town;
    const oldTown = before?.labConnection?.town;
    for (const row of town?.events.slice(oldTown?.events.length ?? 0) ?? []) {
      townOrigins.set(row.id,{from:row.from,ordinal:townOrigins.size});
    }
    for (const receipt of town?.shipments.slice(oldTown?.shipments.length ?? 0) ?? []) {
      if (!receipt.id.startsWith('retail:')) continue;
      const townReleaseId = receipt.parts.find(part => part.count > 0)?.releaseId;
      const releaseId = town.releases.find(release => release.id === townReleaseId)?.externalId;
      const release = after.releases.find(row => row.id === releaseId);
      if (!release || receipt.count <= 0) continue;
      sales.set(receipt.id,{
        kind:'sale',month:receipt.month,operationIndex:operation ? index : null,
        operationKey:operation?.key ?? null,generationId:before?.generations?.active?.id ?? null,
        agency:operation ? 'automatic' : 'unknown',
        ids:{saleReceiptId:receipt.id,releaseId,brandId:release.brandId,productId:release.productId,count:receipt.count},
        label:`自家販売で${receipt.count}本が売れた。`,
      });
    }
  });
  const events = [];
  const releases = new Map(state.releases.map(row=>[row.id,row]));
  const brands = new Map(state.brands.map(({id,name,bottle,label})=>[id,{id,name,shape:bottle,label}]));

  function add(id,event,scene,record,extra={}) {
    if (!Number.isInteger(event.month) || event.month<0 || event.month>state.core.month) return;
    events.push({id,...event,scene,evidence:{record,sourceId:id.slice(id.indexOf(':')+1),...extra}});
  }

  // These record classes are ordered according to the replay observation phase.
  // Entries from one operation are atomic; persisted list order breaks ties within each class.
  for (const [id,event] of facts.direct) {
    add(`${event.kind}:${id}`,event,{kind:'distillery',entity:distillery},'operations');
  }
  for (const [id,event] of facts.fills) {
    const caskType=caskTypes.get(id);
    add(`fill:${id}`,event,{kind:'production',entity:{id,name:'貯蔵庫'},caskType},'core.casks');
  }
  for (const [id,event] of sales) {
    const bottle=brands.get(event.ids.brandId);
    add(`sale:${id}`,event,{kind:'production',entity:{id:'retail',name:'自家販売'},bottle},'labConnection.town.shipments');
  }
  for (const [id,event] of facts.receipts) {
    const bottle=brands.get(event.ids.brandId);
    add(`delivery:${id}`,event,{kind:'shop',entity:shops.get(event.ids.shopId),bottle},'shop.deliveries');
  }
  for (const [id,event] of facts.releases) {
    const bottle=brands.get(event.ids.brandId);
    const age=event.ids.age, count=event.ids.count;
    const ageLabel=age%12===0?`${age/12}年`:`${age}か月`;
    const label=`${ageLabel}熟成の「${bottle?.name ?? 'ウイスキー'}」を${count}本、瓶詰めした。`;
    add(`bottling:${id}`,{...event,label},{kind:'production',entity:{id:'bottling',name:'瓶詰め'},bottle},'releases',
      {flavorName:releases.get(id)?.flavorName});
  }
  for (const [id,event] of facts.offers) {
    const bottle=brands.get(event.ids.brandId);
    const label=bottle?`「${bottle.name}」を造る蒸留所は${shops.get(event.ids.shopId).name}と取引を始めた。`:event.label;
    add(`shop-start:${id}`,{...event,label},{kind:'shop',entity:shops.get(event.ids.shopId)},'shop.relations');
  }
  for (const [id,event] of facts.handovers) {
    const history=analysis.handovers.find(row=>row.generationId===id && row.month===event.month);
    add(`handover:${id}`,{...event,label:`第${event.ids.toGeneration}世代へ蒸留所が引き継がれた。`},
      {kind:'distillery',entity:distillery},'generations.completed',{inheritedCaskIds:history?.caskIds,inheritedShopIds:history?.shopIds});
  }

  for (const [id,event] of facts.town) {
    const {kind,ids} = event;
    const regionId = kind==='visit' ? townOrigins.get(id)?.from : ids.regionId;
    const place=places.get(regionId);
    if (!place || !['arrival','inquiry','visit'].includes(kind) || (kind==='arrival' && ids.channel==='direct')) continue;
    const label=kind==='visit' ? `${place.name}で銘柄を知った人が蒸留所を訪れた。`:event.label;
    const chain=sourceChain(event,facts.town).map(row=>row.ids.townEventId);
    add(`${kind}:${id}`,{...event,label,ids:{...ids,regionId,level:place.level}},
      {kind:'reputation',entity:place},'labConnection.town.events',{sourceChain:chain,townOrdinal:townOrigins.get(id)?.ordinal});
  }

  for (const comment of customerComments(state)) {
    const sale=sales.get(comment.id.slice('customer:'.length));
    if (!sale || sale.month!==comment.month || sale.ids.releaseId!==comment.releaseId) continue;
    const bottle=brands.get(sale.ids.brandId);
    add(`reaction:${comment.id}`,{...sale,kind:'reaction',label:comment.text},
      {kind:'production',entity:{id:'retail',name:'自家販売のお客さん'},bottle},
      'player-news.customerComments',{saleReceiptId:sale.ids.saleReceiptId});
  }
  events.sort((a,b)=>a.month-b.month || (a.operationIndex ?? -1)-(b.operationIndex ?? -1));
  if (uncompressed) {
    // Position in the extracted replay stream, before any candidate retention.
    // Some operations yield several facts, including several different months.
    const positions = new Map();
    const omitted = compactFacts(events,state.labConnection?.town.events ?? []).omitted;
    return {omitted,events:events.map(event=>{
      const ordinal = positions.get(event.operationIndex) ?? 0;
      positions.set(event.operationIndex,ordinal+1);
      return {...event,ordinal};
    })};
  }
  return compactFacts(events,state.labConnection?.town.events ?? []);
}

const [directory, scenario, mode] = process.argv.slice(2);
const result = {};
for (const {id,label,seed,analysis} of histories.filter(row=>!scenario || row.id===scenario)) {
  const raw = directory && directory !== '-' ? readFileSync(resolve(directory,id+'-360.json'),'utf8') :
    JSON.stringify(simulateScenario(id,360).game);
  const sourceSha256=createHash('sha256').update(raw).digest('hex');
  assert.equal(sourceSha256,previous[id].sourceSha256,id+' exact H0 source');
  const state=JSON.parse(raw);
  assert.equal(state.seed,seed);
  assert.equal(state.core.month,analysis.elapsedMonths);
  assert.equal(state.core.totals.bottlesSold,analysis.totals.sold);
  const {events,omitted}=extract(state,analysis,mode==='--uncompressed');
  const handover=analysis.timeline.find(row=>row.kind==='handover');
  assert.equal(events.find(event=>event.kind==='handover')?.operationIndex,handover.operationIndex);
  const lastOperationIndex=state.operations.length-1;
  result[id]={id,label,sourceSha256,seed:state.seed,lastOperationIndex,elapsedMonths:analysis.elapsedMonths,
    coverage:analysis.coverage,events,omitted};
  assert.equal(JSON.stringify(state),raw,id+' unchanged');
}
assert.ok(Object.keys(result).length,'Unknown H0 scenario');
console.log(JSON.stringify(result));
