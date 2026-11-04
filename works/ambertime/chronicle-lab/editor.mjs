import {buildEdition} from './edition-d.mjs';

// The editor only reads the prepared history. It never calls model replay.
const routineKinds = new Set(['delivery','bottling','fill','distillation','sale']);
const sceneKinds = new Set(['shop-start','handover','hire','delegation','automation',
  'arrival','inquiry','visit','reaction']);
const passageSpan = 24;
const returnSpan = 36;

const ordinal = event => event.ordinal ?? 0;
const chronological = (left,right) =>
  left.month-right.month ||
  (left.operationIndex ?? -1)-(right.operationIndex ?? -1) ||
  ordinal(left)-ordinal(right);

function visibleAt(event,cutoff) {
  if (!Number.isInteger(event.month) || event.month > cutoff.month) return false;
  if (cutoff.operationIndex === null) return true;
  if (!Number.isInteger(event.operationIndex)) return event.month < cutoff.month;
  return event.operationIndex < cutoff.operationIndex ||
    event.operationIndex === cutoff.operationIndex && ordinal(event) <= cutoff.ordinal;
}

function entityKey(event) {
  if (event.ids?.shopId != null) return `shop:${event.ids.shopId}`;
  if (event.kind === 'bottling' && event.ids?.brandId != null) return `brand:${event.ids.brandId}`;
  return null;
}

function milestoneKey(event) {
  const {kind,ids} = event;
  if (kind === 'delivery') return `delivery:${ids?.shopId ?? '?'}`;
  if (kind === 'bottling') return `bottling:${ids?.brandId ?? '?'}`;
  return kind;
}

const sceneKey = event => {
  const {kind,entity,bottle,caskType} = event.scene ?? {};
  return JSON.stringify([kind,entity?.id,bottle?.id,caskType]);
};

function frameFor(event,reason) {
  return {id:event.id,type:'scene',events:[event],startMonth:event.month,endMonth:event.month,
    scene:event.scene,reason};
}

export function buildChronicle(record,horizon,mode,options={}) {
  const cutoffEvent = record?.events?.filter(event => event.kind === 'handover' &&
    Number.isInteger(event.month) && Number.isInteger(event.operationIndex) &&
    (options.targetGeneration == null || event.generationId === options.targetGeneration)).sort(chronological)[0];
  const cutoff = horizon === 'handover' && cutoffEvent
    ? {month:cutoffEvent.month,operationIndex:cutoffEvent.operationIndex,ordinal:ordinal(cutoffEvent)}
    : horizon === 'anniversary' && Number.isInteger(record?.elapsedMonths)
      ? {month:record.elapsedMonths,operationIndex:null,ordinal:null} : null;
  if (mode === 'd' && cutoff) {
    const replayCutoff = horizon === 'handover' && cutoffEvent.replayOrdinal != null
      ? {...cutoff,replayOrdinal:cutoffEvent.replayOrdinal} : cutoff;
    return {cutoff,...buildEdition(record,replayCutoff,options)};
  }
  const frames = [], omitted = [];
  if (!cutoff || !['a','b','c'].includes(mode)) return {cutoff,frames,omitted};
  const displayed = new Set();
  const events = (record.events ?? []).filter(event => visibleAt(event,cutoff)).sort(chronological).filter(event => {
    let reason;
    if (displayed.has(event.id)) reason = '同じ記録IDの重複';
    else if (!routineKinds.has(event.kind) && !sceneKinds.has(event.kind)) reason = '補助記録';
    if (reason) omitted.push({id:event.id,kind:event.kind,reason});
    else displayed.add(event.id);
    return !reason;
  });
  if (mode === 'a') return {cutoff,frames:events.map(event => frameFor(event,'一定のテンポ')),omitted};

  const lastDelivery = new Map();
  for (const event of events) {
    if (event.kind === 'delivery') lastDelivery.set(entityKey(event),event);
  }
  const first = new Set();
  const focused = new Map();
  const firstGeneration = new Map();
  let passage = [];
  let lastIndependent = -1;
  function flush() {
    if (!passage.length) return;
    const start = passage[0], end = passage.at(-1);
    const sameSubject = passage.every(event => sceneKey(event) === sceneKey(start));
    frames.push({id:start.id,type:'passage',events:passage,startMonth:start.month,endMonth:end.month,
      scene:sameSubject ? start.scene : {kind:'distillery',entity:{name:'蒸留所'}},reason:'近い時期の作業を記録順にまとめた'});
    passage = [];
  }
  for (const [index,event] of events.entries()) {
    const identity = entityKey(event);
    const prior = identity && focused.get(identity);
    const milestone = milestoneKey(event);
    const elapsed = prior ? event.month-prior.event.month : 0;
    const originalGeneration = firstGeneration.get(identity);
    const closingReturn = horizon === 'anniversary' && lastDelivery.get(identity) === event &&
      originalGeneration != null && event.generationId != null && event.generationId !== originalGeneration;
    const successor = event.generationId != null && prior?.event.generationId != null &&
      event.generationId !== prior.event.generationId;
    const returning = prior && lastIndependent > prior.index && (elapsed >= returnSpan || successor);
    const age = event.kind === 'bottling' ? event.ids?.age : 0;
    // Each newly completed year of long maturation can stand on its own once.
    const ageMilestone = age >= 36 ? `age:${Math.floor(age/12)}` : null;
    let reason;
    if (sceneKinds.has(event.kind)) reason = '出来事の区切り';
    else if (event.kind !== 'sale' && !first.has(milestone)) reason = '確認できる最初の出来事';
    else if (ageMilestone && !first.has(ageMilestone)) reason = '長期熟成の瓶詰め';
    else if (mode === 'c' && prior && closingReturn) reason = '回想時点に近い後継世代の納品';
    else if (mode === 'c' && returning) reason = '別の出来事を経た再登場';

    first.add(milestone);
    if (ageMilestone) first.add(ageMilestone);
    if (reason) {
      flush();
      const frame = frameFor(event,reason);
      if (mode === 'c' && prior && (closingReturn || returning)) frame.returnOf = prior.event.id;
      frames.push(frame);
      if (identity) {
        focused.set(identity,{event,index});
        if (!firstGeneration.has(identity) && event.generationId != null) firstGeneration.set(identity,event.generationId);
      }
      lastIndependent = index;
      continue;
    }

    if (passage.length && (event.month-passage[0].month >= passageSpan ||
        event.generationId !== passage[0].generationId)) flush();
    passage.push(event);
  }
  flush();
  return {cutoff,frames,omitted};
}
