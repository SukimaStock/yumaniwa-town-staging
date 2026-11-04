import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {buildChronicle} from './editor.mjs';
import {firstDeliveryIds,recallSentence} from './caption.mjs';

const file = name => new URL(name,import.meta.url);
const baseline = JSON.parse(readFileSync(file('./facts.json'),'utf8'));
const generator = file('./facts-generate.mjs');
const source = readFileSync(generator,'utf8');
const boundary = 'return compactFacts(events,state.labConnection?.town.events ?? []);';
assert.equal(source.split(boundary).length,2,'Offline extraction seam changed');
const temporary = mkdtempSync(join(tmpdir(),'ambertime-h23a-'));
const replay = join(temporary,'replay.mjs');
const content = source.replace(/from '([.][^']+)'/gu,(_,path) => 'from '+JSON.stringify(new URL(path,generator).href))
  .replaceAll('import.meta.url',JSON.stringify(generator.href))
  .replace(boundary,`const operations = new Map();
  return {
    events: events.map(event => {
      const ordinal = operations.get(event.operationIndex) ?? 0;
      operations.set(event.operationIndex,ordinal+1);
      return {...event,ordinal};
    }),
    omitted: compactFacts(events,state.labConnection?.town.events ?? []).omitted,
  };`);
writeFileSync(replay,content);
const execute = promisify(execFile);
const directory = process.argv[2] ? resolve(process.argv[2]) : '-';
const started = performance.now();
let raw;
try {
  raw = Object.assign({},...await Promise.all(Object.keys(baseline).map(async id => {
    const {stdout} = await execute(process.execPath,[replay,directory,id],{maxBuffer:16*1024*1024});
    return JSON.parse(stdout);
  })));
} finally {
  rmSync(temporary,{recursive:true,force:true});
}
const replayMs = performance.now()-started;

const reputation = event => event.scene?.kind === 'reputation';
const key = event => JSON.stringify([event.kind,event.ids?.regionId]);
const sumBy = (events,field) => {
  const counts = {};
  for (const event of events) {
    const key = field(event) ?? 'unknown';
    counts[key] = (counts[key] ?? 0)+1;
  }
  return counts;
};
function candidateC(events,kept) {
  const last = new Map(), seenGeneration = new Set(), first = new Map();
  const choices = new Map();
  const sourceArrivals = new Set();
  const arrivals = new Map(events.filter(event=>event.kind==='arrival').map(event=>[event.ids.townEventId,event]));
  const reasons = {};
  for (const event of events.filter(reputation)) {
    const group = key(event);
    const generation = JSON.stringify([group,event.generationId]);
    const prior = last.get(group);
    const origin = first.get(group);
    const reasonsHere = [];
    if (kept.has(event.id)) reasonsHere.push('baseline');
    if (prior && event.month-prior.month >= 60) reasonsHere.push('quiet60');
    if (prior && event.generationId != null && !seenGeneration.has(generation)) reasonsHere.push('newGeneration');
    // Distinct releases only qualify with a sustained interval from the previous
    // newly retained point. Do not retain every release from a frequent region.
    const picked = choices.get(group) ?? origin;
    if (picked && event.month-picked.month >= 120 && event.ids.townReleaseId != null &&
        picked.ids.townReleaseId != null && event.ids.townReleaseId !== picked.ids.townReleaseId) reasonsHere.push('release120');
    if (reasonsHere.length) {
      reasons[event.id] = reasonsHere;
      choices.set(group,event);
      if (event.kind !== 'arrival') {
        const arrival = event.evidence.sourceChain?.findLast(id=>arrivals.has(id));
        if (arrival) sourceArrivals.add(arrivals.get(arrival).id);
      }
    }
    if (!origin) first.set(group,event);
    last.set(group,event);
    seenGeneration.add(generation);
  }
  for (const id of sourceArrivals) (reasons[id] ??= []).push('recordedAntecedent');
  return {events:events.filter(event=>!reputation(event) || Object.hasOwn(reasons,event.id)),reasons};
}

function audit(events,firstIds) {
  const compact = event => ({id:event.id,kind:event.kind,month:event.month,operationIndex:event.operationIndex,
    generation:event.generationId,region:event.ids.regionId,release:event.ids.townReleaseId,chain:event.evidence.sourceChain});
  const summaries = events.map(event => {
    return {...compact(event),repeat:!firstIds.has(event.id)};
  });
  return {
    kind:sumBy(summaries,event=>event.kind),
    firstRepeat:sumBy(summaries,event=>event.repeat ? 'repeat' : 'first'),
    generation:sumBy(summaries,event=>event.generation),
    decade:sumBy(summaries,event=>Math.floor(event.month/120)),
    region:sumBy(summaries,event=>event.region),
    release:sumBy(summaries,event=>event.release),
    withChain:sumBy(summaries,event=>event.chain?.length>1?'chain':'none'),
    events:summaries,
  };
}

const timing = [];
const result = {};
for (const [id,full] of Object.entries(raw)) {
  const A = baseline[id];
  const all = new Map();
  for (const event of full.events) {
    assert.ok(event.id && event.evidence?.sourceId);
    assert.equal(all.has(event.id),false,'duplicate ID');
    all.set(event.id,event);
  }
  for (const {ordinal,...event} of A.events) {
    const {ordinal:fullOrdinal,...rawEvent} = all.get(event.id);
    assert.deepEqual(rawEvent,event);
  }
  const aIds = new Set(A.events.map(event=>event.id));
  const aRep = full.events.filter(event=>reputation(event)&&aIds.has(event.id));
  const bRep = full.events.filter(reputation);
  const firstByGroup = new Map();
  for (const event of bRep) if (!firstByGroup.has(key(event))) firstByGroup.set(key(event),event.id);
  const firstIds = new Set(firstByGroup.values());
  const c = candidateC(full.events,aIds);
  assert.deepEqual(full.events.filter(event=>aIds.has(event.id)).map(event=>event.id),A.events.map(event=>event.id));
  assert.deepEqual(c.events.map(event=>event.id),full.events.filter(event=>c.events.includes(event)).map(event=>event.id));
  const orderByOperation = new Map();
  for (const event of bRep) {
    const previous = orderByOperation.get(event.operationIndex);
    if (previous) assert.ok(event.evidence.townOrdinal>previous.evidence.townOrdinal,'same-op persisted town order');
    orderByOperation.set(event.operationIndex,event);
  }
  result[id] = {omitted:A.omitted,reputation:{source:audit(bRep,firstIds),retained:audit(aRep,firstIds),
    dropped:audit(bRep.filter(event=>!aIds.has(event.id)),firstIds)},cReasons:c.reasons,comparison:{}};
  for (const [method,record] of Object.entries({A,B:full,C:{...full,events:c.events}})) {
    const firsts = firstDeliveryIds(record);
    result[id].comparison[method] = {};
    for (const horizon of ['handover','anniversary']) {
      global.gc?.();
      const memoryBefore = process.memoryUsage().heapUsed;
      const start = performance.now();
      const edit = buildChronicle(record,horizon,'d');
      const elapsedMs = performance.now()-start;
      const heapDelta = process.memoryUsage().heapUsed-memoryBefore;
      assert.deepEqual(buildChronicle(record,horizon,'d'),edit);
      const {cutoff} = edit;
      const base = buildChronicle(A,horizon,'d');
      assert.deepEqual(cutoff,base.cutoff,'candidate-only comparison must preserve cutoff');
      assert.equal(edit.audit.seed,base.audit.seed,'candidate-only comparison must preserve seed');
      const candidates = record.events.filter(event=>event.month<=cutoff.month &&
        (cutoff.operationIndex===null || event.operationIndex<cutoff.operationIndex ||
          event.operationIndex===cutoff.operationIndex && event.ordinal<=cutoff.ordinal));
      const selected = edit.frames.flatMap(frame=>frame.events);
      const candidateIds = new Set(candidates.map(event=>event.id));
      assert.ok(selected.every(event=>candidateIds.has(event.id)));
      const reputationSelected = selected.filter(reputation);
      timing.push({id,method,horizon,elapsedMs,heapDelta});
      result[id].comparison[method][horizon] = {
        candidateCount:candidates.length,reputationCandidates:candidates.filter(reputation).length,
        reputationByGeneration:sumBy(candidates.filter(reputation),event=>event.generationId),
        frames:edit.frames.length,kind:sumBy(selected,event=>event.kind),
        decade:sumBy(selected,event=>Math.floor(event.month/120)),generation:sumBy(selected,event=>event.generationId),
        reputationRegion:sumBy(reputationSelected,event=>event.ids.regionId),reputationCount:reputationSelected.length,
        cutoff,seed:edit.audit.seed,examples:selected.map(event=>({id:event.id,kind:event.kind,month:event.month,operationIndex:event.operationIndex,
          generation:event.generationId,region:event.ids.regionId,release:event.ids.townReleaseId,
          chain:event.evidence.sourceChain,caption:recallSentence(event,firsts)})),
      };
    }
  }
}
console.log(JSON.stringify({replayMs,timing,result},null,2));
