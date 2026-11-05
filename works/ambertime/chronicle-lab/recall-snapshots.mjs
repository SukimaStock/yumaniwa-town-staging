import {buildEdition} from './edition-d.mjs';
import {prepareHistoricalCandidates} from './recall-boundary.mjs';

const position = event => event.replayOrdinal ?? event.ordinal;
const invalid = () => { throw new Error('回想時点の資料と元記録が一致しません。'); };

// Called offline with the complete pre-retention facts. Shared event bodies stay
// in the existing record; snapshots only contain membership and ordinal deltas.
export function prepareRecallSnapshots(rawRecord,sharedRecord) {
  if (rawRecord.sourceSha256 !== sharedRecord.sourceSha256) invalid();
  const shared = new Map(sharedRecord.events.map(event=>[event.id,event]));
  const snapshots = rawRecord.events.filter(event=>event.kind==='handover').map(handover=>{
    const prepared = prepareHistoricalCandidates(rawRecord,'handover',{handoverId:handover.id});
    const ordinalOverrides = {};
    for (const event of prepared.record.events) {
      const prior = shared.get(event.id);
      if (!prior || prior.month!==event.month || prior.operationIndex!==event.operationIndex ||
        position(prior)!==position(event)) invalid();
      if (prior.ordinal!==event.ordinal) ordinalOverrides[event.id] = event.ordinal;
    }
    return {handoverId:handover.id,cutoff:prepared.cutoff,seedGeneration:prepared.seedGeneration,
      eventIds:prepared.record.events.map(event=>event.id),ordinalOverrides};
  });
  return {schema:'ambertime-recall-snapshots/1',sourceSha256:rawRecord.sourceSha256,snapshots};
}

export function withRecallSnapshots(record,supplement) {
  if (supplement?.schema!=='ambertime-recall-snapshots/1' ||
    record.sourceSha256!==supplement.sourceSha256 || !Array.isArray(supplement.snapshots)) invalid();
  const events = new Map(record.events.map(event=>[event.id,event]));
  if (events.size!==record.events.length) invalid();
  const seen = new Set();
  for (const snapshot of supplement.snapshots) {
    const boundary = events.get(snapshot.handoverId);
    if (!boundary || boundary.kind!=='handover' || seen.has(boundary.id) ||
      snapshot.seedGeneration!==boundary.ids.toGeneration ||
      snapshot.cutoff?.month!==boundary.month ||
      snapshot.cutoff.operationIndex!==boundary.operationIndex ||
      snapshot.cutoff.replayOrdinal!==position(boundary) ||
      !Array.isArray(snapshot.eventIds) || new Set(snapshot.eventIds).size!==snapshot.eventIds.length) invalid();
    seen.add(boundary.id);
    if (!snapshot.eventIds.includes(boundary.id) ||
      snapshot.eventIds.at(-1)!==boundary.id) invalid();
    for (const id of snapshot.eventIds) {
      const event = events.get(id);
      if (!event || event.month>boundary.month ||
        event.operationIndex>boundary.operationIndex ||
        event.operationIndex===boundary.operationIndex && position(event)>position(boundary)) invalid();
    }
    for (const [id,ordinal] of Object.entries(snapshot.ordinalOverrides ?? {})) {
      if (!snapshot.eventIds.includes(id) || !Number.isInteger(ordinal) || ordinal<0) invalid();
    }
    if (snapshot.cutoff.ordinal!==(snapshot.ordinalOverrides?.[boundary.id] ?? boundary.ordinal)) invalid();
  }
  if (record.events.filter(event=>event.kind==='handover').length!==seen.size) invalid();
  return {...record,recallSnapshots:supplement.snapshots};
}

export function buildSnapshotChronicle(record,options={}) {
  const target = record.recallSnapshots.find(snapshot=>{
    const handover = record.events.find(event=>event.id===snapshot.handoverId);
    return (options.handoverId==null || snapshot.handoverId===options.handoverId) &&
      (options.targetGeneration==null || handover.generationId===options.targetGeneration);
  });
  if (!target) throw new Error('指定した世代交代がありません。');
  const byId = new Map(record.events.map(event=>[event.id,event]));
  const events = target.eventIds.map(id=>{
    const event = byId.get(id);
    return Object.hasOwn(target.ordinalOverrides ?? {},id) ? {...event,ordinal:target.ordinalOverrides[id]} : event;
  });
  const cutoff = {month:target.cutoff.month,operationIndex:target.cutoff.operationIndex,ordinal:target.cutoff.ordinal};
  return {cutoff,...buildEdition({...record,events},target.cutoff,{
    ...(options.definitions ? {definitions:options.definitions} : {}),targetGeneration:target.seedGeneration,
  })};
}
