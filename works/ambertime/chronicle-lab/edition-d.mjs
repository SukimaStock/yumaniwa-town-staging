export const editionVersion = 'D1.1';

// Subjects define identity for firsts, returns and repetition. A relationship
// only acquires a causal label from a recorded source chain.
export const eventDefinitions = Object.freeze({
  distillation: {family:'production', weight:4, first:true},
  fill: {family:'production', weight:4, first:true},
  bottling: {family:'production', weight:5, first:true, subject:'brandId', returns:true, maturation:true},
  'shop-start': {family:'trade', weight:8, subject:'shopId', stateChange:true},
  delivery: {family:'trade', weight:4, first:true, subject:'shopId', returns:true, successorWeight:8},
  sale: {family:'daily', weight:3},
  reaction: {family:'daily', weight:5},
  arrival: {family:'reputation', weight:4, first:true, firstBy:'level', subject:'regionId', reach:true, returns:true},
  inquiry: {family:'reputation', weight:5, first:true, firstBy:'level', subject:'regionId', reach:true, returns:true, townSource:true},
  visit: {family:'reputation', weight:4, first:true, firstBy:'level', subject:'regionId', reach:true, returns:true, townSource:true},
  hire: {family:'work', weight:7, subject:'roleId', stateChange:true},
  delegation: {family:'work', weight:5, subject:'roleId', first:true},
  automation: {family:'work', weight:6, subject:'roleId', stateChange:true},
  handover: {family:'generation', weight:8, stateChange:true},
});

const ordinal = event => event.ordinal ?? 0;
const replayOrdinal = event => event.replayOrdinal ?? ordinal(event);
const chronological = (a,b) => a.month-b.month ||
  (a.operationIndex ?? -1)-(b.operationIndex ?? -1) || replayOrdinal(a)-replayOrdinal(b) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const subject = (event, key) => event.ids?.[key] == null ? null : key+':'+event.ids[key];
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const sourceId = value => nonempty(value) || Number.isSafeInteger(value);

function visibleAt(event,cutoff) {
  if (event.month > cutoff.month) return false;
  if (!Number.isInteger(cutoff.operationIndex)) return true;
  if (!Number.isInteger(event.operationIndex)) return event.month < cutoff.month;
  return event.operationIndex < cutoff.operationIndex ||
    event.operationIndex === cutoff.operationIndex && replayOrdinal(event) <= replayOrdinal(cutoff);
}

function collectFacts(record,cutoff,definitions) {
  const events = [], omitted = [], seen = new Set();
  const ordered = (record.events ?? []).filter(event => event && typeof event === 'object').sort(chronological);
  const firstBottling = ordered.find(event => event.kind === 'bottling' &&
    Number.isInteger(event.month) && visibleAt(event,cutoff));
  for (const event of ordered) {
    const definition = Object.hasOwn(definitions,event.kind) && definitions[event.kind];
    let reason;
    if (!Number.isInteger(event.month) || event.month < 0) reason = '年月の記録不足';
    else if (!visibleAt(event,cutoff)) reason = '回想時点より後';
    else if (!nonempty(event.id) || !nonempty(event.label) ||
      !nonempty(event.evidence?.record) || !sourceId(event.evidence?.sourceId)) reason = '表示または根拠の記録不足';
    else if (seen.has(event.id)) reason = '同じ記録IDの重複';
    else if (!definition || !nonempty(definition.family) || !Number.isFinite(definition.weight)) reason = '未登録の出来事';
    if (reason) omitted.push({id:event.id,kind:event.kind,reason});
    else {
      seen.add(event.id);
      events.push(event);
    }
  }
  return {events,omitted,firstBottlingId:events.includes(firstBottling) ? firstBottling.id : null};
}

function featuresFor(events,definitions) {
  const counts = new Map(), keys = new Set();
  for (const {kind} of events) counts.set(kind,(counts.get(kind) ?? 0)+1);
  return events.map(event => {
    const rule = definitions[event.kind];
    const identity = subject(event,rule.subject);
    const key = event.kind+'/'+(subject(event,rule.firstBy ?? rule.subject) ?? '');
    const ids = event.ids ?? {};
    const features = {importance:rule.weight};
    if (rule.first && !keys.has(key)) features.first = 4;
    if (rule.stateChange) features.stateChange = 2;
    if (counts.get(event.kind) <= 3) features.rarity = 1.5;
    if (event.agency === 'manual') features.manual = 1.25;
    if (rule.maturation && ids.age >= 36) features.maturation = 4+Math.min(ids.age-36,48)/12;
    if (rule.reach) features.reach = ({町:0,周辺地域:1,全国:2,海外:3})[ids.level] ?? 0;
    keys.add(key);
    return {event,rule,identity,features,base:Object.values(features).reduce((sum,value) => sum+value,0),links:[]};
  });
}

function connectFacts(candidates) {
  const firstBySubject = new Map(), previousBySubject = new Map(), firstDelivery = new Map(), latestReturn = new Map();
  for (const candidate of candidates) {
    if (candidate.rule.returns && candidate.identity) latestReturn.set(candidate.identity,candidate);
  }
  const fills = new Map(), arrivals = new Map();
  for (const candidate of candidates) {
    const {event,rule,identity} = candidate;
    const ids = event.ids ?? {};
    const earliest = firstBySubject.get(identity);
    const first = event.kind === 'delivery' ? firstDelivery.get(identity) ?? earliest : earliest;
    const previous = previousBySubject.get(identity);
    const link = (prior,kind,weight) => {
      if (prior) candidate.links.push({id:prior.event.id,kind,weight});
    };
    if (rule.returns && first) {
      const otherGeneration = Number.isInteger(first.event.generationId) &&
        Number.isInteger(event.generationId) && event.generationId > first.event.generationId;
      const sincePrevious = event.month-(previous?.event.month ?? first.event.month);
      if (otherGeneration || sincePrevious >= 36 || event.month-first.event.month >= 60) {
        link(first,otherGeneration ? '同じ対象・世代を越えた記録' : '同じ対象の以前の記録',otherGeneration ? 6 : 2);
        if (otherGeneration && latestReturn.get(identity) === candidate) {
          const bonus = rule.successorWeight ?? 4;
          candidate.features.latestSuccessorReturn = bonus;
          candidate.base += bonus;
        }
      } else if (event.kind === 'delivery' && !firstDelivery.has(identity) && earliest?.event.kind === 'shop-start') {
        link(earliest,'同じ店舗の取引開始',3);
      }
    }
    if (event.kind === 'bottling' && ids.age >= 36) link(fills.get(ids.caskId),'同じ樽ID',3);
    if (rule.townSource && ids.townReleaseId != null) {
      const chain = Array.isArray(event.evidence.sourceChain) ? event.evidence.sourceChain : [];
      const prior = chain.map(id => arrivals.get(id)).filter(item => item &&
        item.event.ids.townReleaseId === ids.townReleaseId).at(-1);
      link(prior,'記録された口コミの参照経路',5);
    }
    candidate.links.sort((a,b) => b.weight-a.weight);
    if (identity && !earliest) firstBySubject.set(identity,candidate);
    if (identity && event.kind === 'delivery' && !firstDelivery.has(identity)) firstDelivery.set(identity,candidate);
    if (identity) previousBySubject.set(identity,candidate);
    if (event.kind === 'fill' && ids.caskId != null) fills.set(ids.caskId,candidate);
    if (event.kind === 'arrival' && ids.townEventId != null) arrivals.set(ids.townEventId,candidate);
  }
}

function hash(value) {
  let state = 2166136261;
  for (let i=0; i<value.length; i++) state = Math.imul(state ^ value.charCodeAt(i),16777619);
  return state >>> 0;
}

function editionRandom(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(state,1664525)+1013904223) >>> 0;
    return state/4294967296;
  };
}

const familyPressure = {reputation:1.25};
const increment = (map,key) => map.set(key,(map.get(key) ?? 0)+1);
const period = month => Math.floor(month/48)*48;
const roundScore = value => Math.round(value*100)/100;

function selectFacts(candidates,seed,firstBottlingId) {
  const random = editionRandom(seed);
  const selected = new Map(), familyCounts = new Map(), periodCounts = new Map();
  const identityCounts = new Map(), kindCounts = new Map(), rounds = [];
  const byId = new Map(candidates.map(candidate => [candidate.event.id,candidate]));
  function remember(candidate,reason,details={}) {
    const {event,rule,identity} = candidate;
    selected.set(event.id,{reason,...details});
    increment(familyCounts,rule.family);
    increment(periodCounts,period(event.month));
    increment(kindCounts,event.kind);
    if (identity) increment(identityCounts,identity);
  }

  const firstBottling = byId.get(firstBottlingId);
  if (firstBottling) remember(firstBottling,'記録上の最初の瓶詰め');
  for (const candidate of candidates) {
    if (candidate.event.kind === 'handover') remember(candidate,'世代交代の節目');
  }
  const requiredIds = [...selected.keys()];

  function evaluate(candidate) {
    const {event,rule,identity,base,links} = candidate;
    // Similar deliveries within one generation should not fill the recollection
    // just because time passed. A new brand or succeeding generation is distinct.
    const similar = event.kind === 'delivery'
      ? [...selected.keys()].map(id => byId.get(id)).filter(row => row &&
        row.event.kind === 'delivery' && row.identity === identity &&
        row.event.generationId === event.generationId &&
        row.event.ids?.brandId === event.ids?.brandId)
      : [];
    const nearby = similar.some(row => Math.abs(row.event.month-event.month) < 60);
    const family = familyCounts.get(rule.family) ?? 0;
    const age = periodCounts.get(period(event.month)) ?? 0;
    const repetition = identityCounts.get(identity) ?? 0;
    const kind = kindCounts.get(event.kind) ?? 0;
    const components = {
      base, family:family ? -family*(familyPressure[rule.family] ?? .72) : 3.5,
      period:age ? -age*.55 : 5.5, repetition:-repetition*.6, kind:-kind*.7,
      sameStory:-Math.min(similar.length,3)*2.8-(nearby ? 1.8 : 0),
      load:-(3.9+selected.size*.11+selected.size**2*.0035),
    };
    const effectiveWeight = row => row.weight*(selected.has(row.id) ? 1 : .65);
    const link = links.reduce((best,row) => !best || effectiveWeight(row)>effectiveWeight(best) ? row : best,null);
    const support = link && !selected.has(link.id) ? byId.get(link.id) : null;
    components.connection = link ? (support ? link.weight*.65 : link.weight) : 0;
    const score = Object.values(components).reduce((sum,value) => sum+value,0);
    return {candidate,score,components,link,support};
  }

  for (;;) {
    const choices = candidates.filter(({event}) => !selected.has(event.id))
      .map(evaluate).filter(choice => choice.score > 0);
    if (!choices.length) break;
    const weights = choices.map(({score}) => score**2);
    const total = weights.reduce((sum,weight) => sum+weight,0);
    const draw = random();
    let needle = draw*total;
    const drawIndex = weights.findIndex(weight => (needle-=weight) < 0);
    const winnerIndex = drawIndex < 0 ? choices.length-1 : drawIndex;
    const {candidate,score,components,link,support} = choices[winnerIndex];
    const details = {score:roundScore(score),components:Object.fromEntries(
      Object.entries(components).map(([key,value]) => [key,roundScore(value)]))};
    remember(candidate,'評価に基づく抽選',details);
    const round = {id:candidate.event.id,draw,weight:roundScore(weights[winnerIndex]),
      totalWeight:roundScore(total),pool:choices.length,...details};
    if (link) round.link = link;
    if (support) {
      const origin = evaluate(support);
      if (origin.score+link.weight > 0 && (link.weight >= 3 || score >= 3)) {
        remember(support,'後年の出来事に対応する起点',{selectedFor:candidate.event.id,score:roundScore(origin.score)});
        round.originId = support.event.id;
      }
    }
    rounds.push(round);
  }

  const omitted = candidates.filter(({event}) => !selected.has(event.id)).map(candidate => ({
    id:candidate.event.id,kind:candidate.event.kind,reason:'追加の価値と閲覧負担を比較',
    score:roundScore(evaluate(candidate).score),
  }));
  return {selected,omitted,requiredIds,rounds,
    familyCounts:Object.fromEntries(familyCounts),periodCounts:Object.fromEntries([...periodCounts].sort(([a],[b]) => a-b))};
}

export function buildEdition(record,cutoff,{targetGeneration,definitions=eventDefinitions}={}) {
  const empty = {frames:[],omitted:[],audit:null};
  if (!cutoff || !Number.isInteger(cutoff.month)) return empty;
  const {events,omitted:excluded,firstBottlingId} = collectFacts(record,cutoff,definitions);
  const candidates = featuresFor(events,definitions);
  connectFacts(candidates);
  const operationIndex = cutoff.operationIndex ?? record.lastOperationIndex ??
    events.reduce((index,event) => Math.max(index,event.operationIndex ?? -1),-1);
  const latestHandover = events.findLast(event => event.kind === 'handover');
  const generation = targetGeneration ?? latestHandover?.ids?.toGeneration ??
    events.findLast(event => Number.isInteger(event.generationId))?.generationId ?? null;
  const seed = hash(JSON.stringify([record.seed ?? record.sourceSha256 ?? record.id ?? null,
    generation,operationIndex,cutoff.month,ordinal(cutoff),editionVersion]));
  const {selected,omitted,requiredIds,rounds,familyCounts,periodCounts} = selectFacts(candidates,seed,firstBottlingId);
  const frames = candidates.filter(({event}) => selected.has(event.id)).map(({event,links}) => {
    const match = links.find(link => selected.has(link.id));
    return {id:event.id,type:'scene',events:[event],startMonth:event.month,endMonth:event.month,
      scene:event.scene,reason:selected.get(event.id).reason,...(match ? {returnOf:match.id} : {})};
  });
  const selectedIds = frames.map(frame => frame.id);
  return {frames,omitted:[...excluded,...omitted],audit:{
    version:editionVersion, seed, targetGeneration:generation, operationIndex, selectedIds,
    requiredIds,rounds,familyCounts,periodCounts,
    selected: candidates.filter(({event}) => selected.has(event.id)).map(({event,rule,features,links}) =>
      ({id:event.id,family:rule.family,features,links,...selected.get(event.id)})),
  }};
}
