import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {withReputationCandidates} from './facts-d.mjs';
import {buildChronicle} from './editor.mjs';
import {firstDeliveryIds,recallSentence} from './caption.mjs';

const file = name => new URL(name,import.meta.url);
const baseline = JSON.parse(readFileSync(file('./facts.json'),'utf8'));
const generator = fileURLToPath(file('./facts-generate.mjs'));
const execute = promisify(execFile);
const directory = process.argv[2] && process.argv[2] !== '-' ? resolve(process.argv[2]) : '-';
const started = performance.now();
const raw = Object.assign({},...await Promise.all(Object.keys(baseline).map(async id => {
  const {stdout} = await execute(process.execPath,[generator,directory,id,'--uncompressed'],{maxBuffer:16*1024*1024});
  return JSON.parse(stdout);
})));
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
function candidateC(events,kept,{quiet,release}) {
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
    if (quiet && prior && event.month-prior.month >= 60) reasonsHere.push('quiet60');
    if (prior && event.generationId != null && !seenGeneration.has(generation)) reasonsHere.push('newGeneration');
    // Distinct releases only qualify with a sustained interval from the previous
    // newly retained point. Do not retain every release from a frequent region.
    const picked = choices.get(group) ?? origin;
    if (release && picked && event.month-picked.month >= 120 && event.ids.townReleaseId != null &&
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

const timing = [];
const result = {};
const supplements = {};
const output = process.argv[3];
const policies = {C:{quiet:true,release:true},C1:{quiet:false,release:true},C2:{quiet:true,release:false},C3:{quiet:false,release:false}};
assert.ok(!output || output==='--write-d');
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
  const variants = Object.fromEntries(Object.entries(policies)
    .map(([name,conditions])=>[name,candidateC(full.events,aIds,conditions)]));
  assert.deepEqual(full.events.filter(event=>aIds.has(event.id)).map(event=>event.id),A.events.map(event=>event.id));
  result[id] = {};
  const replayOrdinals = Object.fromEntries(A.events.filter(event=>event.ordinal!==all.get(event.id).ordinal)
    .map(event=>[event.id,all.get(event.id).ordinal]));
  for (const [method,{events,reasons}] of Object.entries(variants)) {
    const supplement = {
      events:events.filter(event=>!aIds.has(event.id))
        .map(event=>({...event,replayOrdinal:event.ordinal})),
      replayOrdinals,
      sourceSha256:full.sourceSha256,
    };
    if (method==='C3') supplements[id] = supplement;
    const record = withReputationCandidates(A,supplement);
    const arrivals = new Map(full.events.filter(event=>event.kind==='arrival')
      .map(event=>[event.ids.townEventId,event.id]));
    const retained = new Set(events.map(event=>event.id));
    for (const event of events.filter(event=>['inquiry','visit'].includes(event.kind))) {
      const origin = event.evidence.sourceChain?.findLast(id=>arrivals.has(id));
      if (origin) assert.ok(retained.has(arrivals.get(origin)),'recorded antecedent retained');
    }
    const firsts = firstDeliveryIds(record);
    result[id][method] = {};
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
      const cutoffPosition = horizon==='handover'
        ? all.get(record.events.find(event=>event.kind==='handover').id).ordinal : null;
      const candidates = events.filter(event=>event.month<=cutoff.month &&
        (cutoff.operationIndex===null || event.operationIndex<cutoff.operationIndex ||
          event.operationIndex===cutoff.operationIndex && event.ordinal<=cutoffPosition));
      const selected = edit.frames.flatMap(frame=>frame.events);
      const candidateIds = new Set(candidates.map(event=>event.id));
      assert.ok(selected.every(event=>candidateIds.has(event.id)));
      const reputationSelected = selected.filter(reputation);
      timing.push({id,method,horizon,elapsedMs,heapDelta});
      result[id][method][horizon] = {
        candidateCount:candidates.length,reputationCandidates:candidates.filter(reputation).length,
        reputationByGeneration:sumBy(candidates.filter(reputation),event=>event.generationId),
        frames:edit.frames.length,kind:sumBy(selected,event=>event.kind),
        decade:sumBy(selected,event=>Math.floor(event.month/120)),generation:sumBy(selected,event=>event.generationId),
        reputationRegion:sumBy(reputationSelected,event=>event.ids.regionId),reputationCount:reputationSelected.length,
        cutoff,seed:edit.audit.seed,reasons:sumBy(candidates.flatMap(event=>reasons[event.id] ?? []),reason=>reason),candidateIds:[...candidateIds],examples:selected.map(event=>({id:event.id,kind:event.kind,month:event.month,operationIndex:event.operationIndex,
          generation:event.generationId,region:event.ids.regionId,release:event.ids.townReleaseId,
          chain:event.evidence.sourceChain,caption:recallSentence(event,firsts)})),
      };
    }
  }
}
if (output) writeFileSync(file('./facts-d.json'),JSON.stringify(supplements)+'\n');
console.log(JSON.stringify({replayMs,timing,result},null,2));
