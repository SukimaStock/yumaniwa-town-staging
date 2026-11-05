import {buildEdition} from './edition-d.mjs';
import {compactFacts} from './facts-compact.mjs';

const replayPosition = event => event.replayOrdinal ?? event.ordinal;
const order = (left,right) => left.month-right.month ||
  (left.operationIndex ?? -1)-(right.operationIndex ?? -1) ||
  replayPosition(left)-replayPosition(right);
const reputation = event => event.scene?.kind === 'reputation';
const encounterKey = event => JSON.stringify([event.kind,event.ids?.regionId]);
const beforeBoundary = (event,boundary) => event.month<=boundary.month &&
  (boundary.operationIndex === null || (event.operationIndex == null
    ? event.month<boundary.month
    : event.operationIndex<boundary.operationIndex ||
      event.operationIndex===boundary.operationIndex && replayPosition(event)<=replayPosition(boundary)));

function uniqueFacts(events) {
  const byId = new Map(), issues = [];
  for (const event of events ?? []) {
    if (!event || typeof event.id !== 'string' || !event.id ||
      !Number.isInteger(event.month) || event.month<0 ||
      !Number.isInteger(replayPosition(event)) || replayPosition(event)<0 ||
      event.operationIndex != null && (!Number.isInteger(event.operationIndex) || event.operationIndex<0)) {
      issues.push({id:event?.id ?? null,reason:'事実の識別子または再生位置が不完全'});
      continue;
    }
    const prior = byId.get(event.id);
    if (prior && JSON.stringify(prior)!==JSON.stringify(event)) {
      throw new Error('同じイベントIDに異なる事実があります。'+event.id);
    }
    if (prior) issues.push({id:event.id,reason:'同じ事実の重複'});
    else byId.set(event.id,event);
  }
  return {events:[...byId.values()].sort(order),issues};
}

// The selector identifies an outgoing generation, while seedGeneration identifies
// the incoming generation. Callers cannot override the seed independently.
export function resolveRecallBoundary(events,horizon,options={}) {
  if (horizon==='anniversary') {
    if (!Number.isInteger(options.month) || options.month<0) return null;
    return {handoverId:null,seedGeneration:null,cutoff:{month:options.month,operationIndex:null,ordinal:null}};
  }
  if (horizon!=='handover') return null;
  const handovers = events.filter(event=>event.kind==='handover' && Number.isInteger(event.operationIndex)).sort(order);
  const boundary = handovers.find(event=>
    (options.handoverId == null || options.handoverId===event.id) &&
    (options.targetGeneration == null || options.targetGeneration===event.generationId));
  if (!boundary || !Number.isInteger(boundary.ids?.toGeneration)) {
    if (options.handoverId != null || options.targetGeneration != null) throw new Error('指定した世代交代がありません。');
    return null;
  }
  return {handoverId:boundary.id,seedGeneration:boundary.ids.toGeneration,
    cutoff:{month:boundary.month,operationIndex:boundary.operationIndex,replayOrdinal:replayPosition(boundary)}};
}

function recordedArrival(event,arrivals,issues) {
  const chain = event.evidence?.sourceChain;
  if (!Array.isArray(chain)) {
    issues.push({id:event.id,reason:'参照経路の記録不足'});
    return null;
  }
  // Internal town records are deliberately absent from the displayable facts.
  // Only an existing, earlier arrival of the same release can acquire a link.
  const source = chain.findLast(id=>arrivals.has(id));
  if (!source) return null;
  const arrival = arrivals.get(source);
  if (order(arrival,event)>0 || arrival.ids?.townReleaseId!==event.ids?.townReleaseId) {
    issues.push({id:event.id,reason:'参照先の時点または発売が不一致'});
    return null;
  }
  return arrival;
}

// C-3 applies only after the recall boundary has been fixed. The full raw event
// input is required; an already-retained facts-d record is not an equivalent input.
export function prepareHistoricalCandidates(rawRecord,horizon,options={}) {
  if (rawRecord.factStage!=='uncompressed') throw new Error('候補保持前の事実資料が必要です。');
  if (!Number.isSafeInteger(rawRecord.seed)) throw new Error('元のゲームseedが必要です。');
  const {events,issues} = uniqueFacts(rawRecord.events);
  const resolved = resolveRecallBoundary(events,horizon,{...options,month:rawRecord.elapsedMonths});
  if (!resolved) return {record:null,cutoff:null,handoverId:null,seedGeneration:null,issues};
  const prefix = events.filter(event=>beforeBoundary(event,resolved.cutoff));
  const arrivals = new Map(prefix.filter(event=>event.kind==='arrival')
    .map(event=>[event.ids?.townEventId,event]));
  const sources = new Map(prefix.filter(event=>['inquiry','visit'].includes(event.kind))
    .map(event=>[event.id,recordedArrival(event,arrivals,issues)]));
  // compactFacts supplies the unchanged baseline retention and historical seed
  // ordinals. Validate its link inputs separately without changing source evidence.
  const compactInput = prefix.map(event=>({
    ...event,evidence:{...event.evidence,sourceChain:sources.has(event.id)
      ? (sources.get(event.id) ? [sources.get(event.id).ids.townEventId] : [])
      : event.evidence?.sourceChain ?? []},
  }));
  const baseline = compactFacts(compactInput,[]).events;
  const kept = new Set(baseline.map(event=>event.id));
  const generations = new Set(), encounters = new Set();
  for (const event of prefix.filter(reputation)) {
    const group = encounterKey(event);
    const generation = JSON.stringify([group,event.generationId]);
    if (encounters.has(group) && event.generationId != null && !generations.has(generation)) kept.add(event.id);
    encounters.add(group);
    generations.add(generation);
  }
  for (const event of prefix) {
    const arrival = kept.has(event.id) && sources.get(event.id);
    if (arrival) kept.add(arrival.id);
  }
  const compactById = new Map(baseline.map(event=>[event.id,event]));
  const candidates = prefix.filter(event=>kept.has(event.id)).map(event=>({
    ...event,ordinal:compactById.get(event.id)?.ordinal ?? event.ordinal,
    replayOrdinal:replayPosition(event),
  }));
  const boundary = resolved.handoverId && candidates.find(event=>event.id===resolved.handoverId);
  const cutoff = {...resolved.cutoff,ordinal:boundary ? boundary.ordinal : null};
  return {...resolved,cutoff,issues,record:{...rawRecord,factStage:'candidates',events:candidates}};
}

export function buildHistoricalChronicle(rawRecord,horizon,options={}) {
  const prepared = prepareHistoricalCandidates(rawRecord,horizon,options);
  if (!prepared.record) return {...prepared,frames:[],omitted:[],audit:null};
  const {record,...metadata} = prepared;
  const editionOptions = {...(options.definitions ? {definitions:options.definitions} : {}),
    ...(prepared.seedGeneration != null ? {targetGeneration:prepared.seedGeneration} : {})};
  return {...metadata,...buildEdition(record,prepared.cutoff,editionOptions)};
}
