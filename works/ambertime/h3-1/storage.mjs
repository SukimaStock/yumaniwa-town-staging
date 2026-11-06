// Research-only representations. No formal save, runtime observer or UI imports.
// Metadata/anchor normalization below was recovered after executor loss:
// the saved version needs a fresh test run.
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';

const clone = value => JSON.parse(JSON.stringify(value));
const pos = e => e.replayOrdinal ?? e.ordinal ?? e.position ?? 0;
const order = (a,b) => a.month-b.month || a.operationIndex-b.operationIndex || pos(a)-pos(b) || a.id.localeCompare(b.id);
const world = new Set(['shop-start','delivery','sale','reaction','arrival','inquiry','visit']);
const useful = e => world.has(e.kind) || ['bottling','fill','handover'].includes(e.kind);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function smallFact(event) {
  const fact = {id:event.id,kind:event.kind,month:event.month,operationIndex:event.operationIndex,
    position:pos(event),generationId:event.generationId,ids:clone(event.ids ?? {}),
    label:event.label,scene:clone(event.scene ?? {}),
    proof:{record:event.evidence?.record,sourceId:event.evidence?.sourceId}};
  for (const key of ['sourceChain','saleReceiptId','inheritedCaskIds','inheritedShopIds']) {
    if (event.evidence?.[key] != null) fact.proof[key] = clone(event.evidence[key]);
  }
  return fact;
}

export function causalWitness(event, events) {
  if (!['inquiry','visit'].includes(event.kind)) return null;
  const chain = event.evidence?.sourceChain ?? event.proof?.sourceChain;
  if (!Array.isArray(chain)) return null;
  const arrivals = new Map(events.filter(e=>e.kind==='arrival').map(e=>[e.ids?.townEventId,e]));
  const arrival = chain.map(id=>arrivals.get(id)).filter(source=>source &&
    source.ids?.townReleaseId != null && source.ids.townReleaseId===event.ids?.townReleaseId &&
    order(source,event)<=0).at(-1);
  return arrival ? {kind:'recorded-source-chain',from:arrival.id,to:event.id,
    sourceTownEventId:arrival.ids.townEventId,townReleaseId:arrival.ids.townReleaseId,
    sourcePosition:[arrival.month,arrival.operationIndex,pos(arrival)],
    targetPosition:[event.month,event.operationIndex,pos(event)]} : null;
}

function subjects(event) {
  const ids = event.ids ?? {}, out=[];
  if (ids.shopId != null) out.push('shop:'+ids.shopId);
  if (ids.regionId != null) out.push('region:'+ids.regionId);
  if (ids.brandId != null && ['bottling','delivery','reaction'].includes(event.kind)) out.push('brand:'+ids.brandId);
  if (event.kind==='delivery' && ids.shopId!=null && ids.brandId!=null && ids.releaseId!=null) {
    out.push('shop-brand-release:'+JSON.stringify([ids.shopId,ids.brandId,ids.releaseId]));
  }
  return out;
}

function originLedger(events) {
  const fills = new Map(events.filter(e=>e.kind==='fill').map(e=>[e.ids.caskId,e]));
  return events.filter(e=>e.kind==='bottling').map(e=>{
    const fill=fills.get(e.ids.caskId);
    return {eventId:e.id,releaseId:e.ids.releaseId,productId:e.ids.productId,brandId:e.ids.brandId,
      caskId:e.ids.caskId,month:e.month,operationIndex:e.operationIndex,position:pos(e),generationId:e.generationId,
      ...(fill && order(fill,e)<=0 ? {origin:{eventId:fill.id,month:fill.month,operationIndex:fill.operationIndex,
        position:pos(fill),generationId:fill.generationId,batchId:fill.ids.batchId}} : {origin:null})};
  });
}

function frozenEdition(record,edition) {
  const snapshot=record.recallSnapshots.find(s=>s.handoverId===edition.handoverId);
  if (!snapshot) throw new Error('Unknown handover');
  const allowed=new Set(snapshot.eventIds), byId=new Map(record.events.map(e=>[e.id,e]));
  const candidateEvents=snapshot.eventIds.map(id=>byId.get(id));
  return {handoverId:edition.handoverId,cutoff:clone(snapshot.cutoff),seedGeneration:snapshot.seedGeneration,
    seed:edition.seed ?? null,editionVersion:edition.version ?? 'H3-1-research',
    scenes:edition.scenes.map(scene=>{
      const supplied=scene.event;
      if (!supplied || !allowed.has(supplied.id)) throw new Error('Scene outside frozen boundary');
      const event=byId.get(supplied.id);
      if (JSON.stringify(smallFact(supplied))!==JSON.stringify(smallFact(event))) {
        throw new Error('Scene semantic fact differs from frozen source');
      }
      const sourceFacts=new Map();
      const links=(scene.links ?? []).map(link=>{
        const source=byId.get(link.sourceId);
        if (!source || !allowed.has(source.id) || order(source,event)>=0) {
          throw new Error('Missing or future frozen link source');
        }
        if (link.sourceMonth!==source.month || link.sourceGeneration!==source.generationId ||
            link.crossGeneration!==(source.generationId<event.generationId)) {
          throw new Error('Frozen link provenance differs from source');
        }
        const same=(key)=>source.ids?.[key]!=null && source.ids[key]===event.ids?.[key];
        let valid=false;
        switch(link.type) {
          case '再登場':
            valid=(same('shopId') || same('regionId')) &&
              (event.kind!=='delivery' || source.kind==='delivery');
            break;
          case '確認済み口コミ経路':
            valid=Boolean(causalWitness(event,[source]));
            break;
          case '先代の樽':
            valid=event.kind==='bottling' && source.kind==='fill' && same('caskId') && link.crossGeneration;
            break;
          case '先代の発売':
            valid=world.has(event.kind) && source.kind==='bottling' && same('releaseId') &&
              (event.ids?.productId==null || same('productId')) && link.crossGeneration;
            break;
          case '同じ銘柄の別発売':
            valid=event.kind==='delivery' && source.kind==='delivery' && same('shopId') && same('brandId') &&
              source.ids.releaseId!==event.ids.releaseId && link.crossGeneration;
            break;
        }
        if (!valid || link.causal!==(link.type==='確認済み口コミ経路')) {
          throw new Error('Frozen link identity or causal evidence mismatch');
        }
        sourceFacts.set(source.id,smallFact(source));
        return clone(link);
      });
      return {fact:smallFact(event),sentence:scene.sentence ?? null,
        illustration:clone(scene.illustration ?? null),links,sourceFacts:[...sourceFacts.values()],
        witness:causalWitness(event,candidateEvents)};
    })};
}

export function buildStorage(record,editions=[]) {
  const events=[...record.events].sort(order);
  const common={sourceSha256:record.sourceSha256,gameSeed:record.seed,elapsedMonths:record.elapsedMonths};
  const {events:ignoredEvents,recallSnapshots:ignoredSnapshots,...metadata}=record;
  const method1={schema:'h31-h2-retained/1',metadata:clone(metadata),events:clone(events),snapshots:clone(record.recallSnapshots ?? [])};
  const selectedFacts=events.filter(useful),kept=new Set(selectedFacts.map(e=>e.id));
  const method2={schema:'h31-small-facts/1',...common,facts:selectedFacts.map(smallFact),
    snapshots:clone(record.recallSnapshots ?? []).map(s=>({...s,eventIds:s.eventIds.filter(id=>kept.has(id)),
      ordinalOverrides:Object.fromEntries(Object.entries(s.ordinalOverrides ?? {}).filter(([id])=>kept.has(id)))})),
    origins:originLedger(events)};
  const completed=editions.map(edition=>frozenEdition(record,edition));
  const lastSnapshot=completed.at(-1)?.cutoff;
  const active=selectedFacts.filter(e=>!lastSnapshot || order(e,{...lastSnapshot,id:'\uffff'})>0);
  const anchors=new Map();
  for (const event of selectedFacts) {
    for (const key of subjects(event)) {
      const group=key+'/'+event.kind;
      const prior=anchors.get(group);
      anchors.set(group,{subject:key,kind:event.kind,first:prior?.first ?? smallFact(event),last:smallFact(event)});
    }
  }
  const witnesses=active.map(e=>causalWitness(e,events)).filter(Boolean);
  const anchorFacts=[...anchors.values()].flatMap(a=>[a.first,a.last]);
  for(const fact of anchorFacts) {
    const witness=causalWitness(fact,events);
    if(witness) witnesses.push(witness);
  }
  const retainedWitnesses=[...new Map(witnesses.map(w=>[w.to,w])).values()];
  const byId=new Map(events.map(e=>[e.id,e]));
  // A future active visit may point to an arrival pruned from the main pool.
  // Preserve its actual body, generation and place, rather than an orphan ID.
  const witnessFacts=[...new Map(retainedWitnesses.map(w=>[w.from,smallFact(byId.get(w.from))])).values()];
  const bottledCasks=new Set(events.filter(e=>e.kind==='bottling').map(e=>e.ids.caskId));
  const pendingOrigins=events.filter(e=>e.kind==='fill' && !bottledCasks.has(e.ids.caskId)).map(smallFact);
  const method3={schema:'h31-generation-frozen/1',...common,completed,active:active.map(smallFact),
    anchors:[...anchors.values()].map(a=>({subject:a.subject,kind:a.kind,firstId:a.first.id,lastId:a.last.id})),
    anchorFacts:[...new Map(anchorFacts.map(f=>[f.id,f])).values()],origins:originLedger(events),
    witnesses:retainedWitnesses,witnessFacts,pendingOrigins};
  return {method1,method2,method3};
}

function measure(build) {
  build();
  const samples=[];
  let result;
  for(let i=0;i<7;i++) {const start=performance.now();result=build();samples.push(performance.now()-start);}
  samples.sort((a,b)=>a-b);
  return {result,medianMs:samples[3],minMs:samples[0],maxMs:samples.at(-1)};
}

export function compareStorage(record,editions=[]) {
  const built=buildStorage(record,editions);
  const buildTime=measure(()=>buildStorage(record,editions));
  const methods=Object.entries(built).map(([method,representation])=>{
    const encoded=JSON.stringify(representation),parse=measure(()=>JSON.parse(encoded)),serial=measure(()=>JSON.stringify(representation));
    const facts=method==='method1'?representation.events.length:method==='method2'?representation.facts.length:
      representation.active.length+representation.completed.reduce((n,e)=>n+e.scenes.length,0);
    return {method,bytes:Buffer.byteLength(encoded),retainedFacts:facts,
      anchors:representation.anchors?.length ?? 0,anchorFacts:representation.anchorFacts?.length ?? 0,
      witnessFacts:representation.witnessFacts?.length ?? 0,pendingOrigins:representation.pendingOrigins?.length ?? 0,origins:representation.origins?.length ?? 0,
      witnessFacts:representation.witnessFacts?.length ?? 0,
      pendingOrigins:representation.pendingOrigins?.length ?? 0,
      frozenScenes:representation.completed?.reduce((n,e)=>n+e.scenes.length,0) ?? 0,
      activeCandidates:representation.active?.length ?? null,
      serializeMedianMs:serial.medianMs,parseMedianMs:parse.medianMs};
  });
  const mapped=measure(()=>record.events.filter(useful).map(smallFact));
  return {methods,allThreeBuildMedianMs:buildTime.medianMs,
    compactMappingMedianMs:mapped.medianMs,compactMappingPerInputUs:mapped.medianMs*1000/Math.max(record.events.length,1),
    measurement:'Node, seven warm repeats; JSON UTF-8, excludes formal save, replay, storage I/O and full live event collection',
    limitations:['Input is published retained C-3 facts, not the complete uncompressed event stream.',
      'Method 2 preserves all useful input facts; this is a conservative upper envelope, not an online significance selector.',
      'Method 3 supports first/latest recurrence and frozen playback; arbitrary discarded historical middle events cannot be reselected.',
      'Origin ledger is conservative; integration may reference existing formal releases instead of duplicating it.',
      'No browser quota, atomic storage or monthly frame-time claim is made from pure Node measurements.']};
}

// Pure failure experiment. Browser integration must place game and recall in
// ONE existing atomic commit unit, then finalize in-memory state and UI.
export function encodeEnvelope(game,recall) {
  const payload={game:clone(game),recall:clone(recall)};
  return JSON.stringify({schema:'h31-transaction-experiment/1',payload,digest:digest(payload)});
}
export function decodeEnvelope(text) {
  const data=JSON.parse(text);
  if(data.schema!=='h31-transaction-experiment/1' || digest(data.payload)!==data.digest) throw new Error('Invalid transaction envelope');
  return data.payload;
}
export function transact(previousText,nextGame,nextRecall,write) {
  const previous=decodeEnvelope(previousText),candidate=encodeEnvelope(nextGame,nextRecall);
  try { write(candidate); return {committed:true,text:candidate,value:decodeEnvelope(candidate)}; }
  catch(error) { return {committed:false,text:previousText,value:previous,error:String(error.message)}; }
}
