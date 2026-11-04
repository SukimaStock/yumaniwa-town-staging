import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {buildChronicle} from './editor.mjs';
import {eventDefinitions} from './edition-d.mjs';
import {firstDeliveryIds,recallSentence} from './caption.mjs';
import {withReputationCandidates} from './facts-d.mjs';

const order = (a,b) => a.month-b.month || a.operationIndex-b.operationIndex ||
  (a.replayOrdinal ?? a.ordinal)-(b.replayOrdinal ?? b.ordinal);
const tally = (rows,key) => Object.groupBy(rows,key);
const counts = (rows,key) => Object.fromEntries(Object.entries(tally(rows,key)).map(([k,group])=>[k,group.length]));
const signatures = result => result.frames.map(frame=>frame.id);
const read = path => JSON.parse(readFileSync(path,'utf8'));

export function auditRecord(record) {
  const handovers = record.events.filter(event=>event.kind==='handover').sort(order);
  const firsts = firstDeliveryIds(record);
  const byId = new Map(record.events.map(event=>[event.id,event]));
  assert.equal(byId.size,record.events.length,'duplicate candidate');
  for (const [index,event] of handovers.entries()) {
    assert.equal(event.generationId,event.ids.fromGeneration);
    assert.equal(event.ids.fromGeneration,index+1);
    assert.equal(event.ids.toGeneration,index+2);
    assert.equal(event.operationKey,'generation-handover');
  }
  for (const event of record.events) {
    assert.ok(event.evidence?.sourceId != null,event.id);
    const prior = handovers.findLast(item=>item.operationIndex<event.operationIndex);
    if (event.generationId != null) assert.equal(event.generationId,prior?.ids.toGeneration ?? 1,event.id);
  }
  return [null,...handovers].map(boundary=>{
    const horizon = boundary ? 'handover' : 'anniversary';
    const target = boundary ? {targetGeneration:boundary.generationId} : {};
    // Match the public default for the first handover; later handovers need a selector.
    const options = boundary?.generationId === 1 ? {} : target;
    const cutoffMonth = boundary?.month ?? record.elapsedMonths;
    const isVisible = event => event.month<=cutoffMonth &&
      (!boundary || (event.operationIndex == null ? event.month<cutoffMonth :
        event.operationIndex<boundary.operationIndex ||
        event.operationIndex===boundary.operationIndex && order(event,boundary)<=0));
    const visible = record.events.filter(isVisible).sort(order);
    const firstBottle = visible.find(event=>event.kind==='bottling');
    global.gc?.();
    const heap = process.memoryUsage().heapUsed;
    const start = performance.now();
    const edit = buildChronicle(record,horizon,'d',options);
    const elapsedMs = performance.now()-start;
    const heapDelta = process.memoryUsage().heapUsed-heap;
    assert.deepEqual(edit,buildChronicle(record,horizon,'d',options));
    const explicit = boundary?.generationId === 1 ? buildChronicle(record,horizon,'d',target) : edit;
    assert.deepEqual(explicit.cutoff,edit.cutoff);
    assert.deepEqual(explicit.audit.requiredIds,edit.audit.requiredIds);
    assert.deepEqual(edit.audit.requiredIds,[firstBottle,...handovers.filter(isVisible)].filter(Boolean).map(event=>event.id));
    assert.ok(edit.frames.every(frame=>isVisible(frame.events[0])));
    if (boundary) {
      assert.equal(edit.frames.at(-1)?.id,boundary.id);
      assert.equal(edit.cutoff.ordinal,boundary.ordinal);
    }
    const events = edit.frames.map(frame=>frame.events[0]);
    assert.ok(events.every((event,index)=>index===0 || order(events[index-1],event)<=0));
    const scores = new Map(edit.audit.selected.map(row=>[row.id,row]));
    for (const event of events) {
      for (const link of scores.get(event.id).links.filter(link=>link.kind==='記録された口コミの参照経路')) {
        const source = byId.get(link.id);
        assert.equal(source.ids.townReleaseId,event.ids.townReleaseId);
        assert.ok(event.evidence.sourceChain.includes(source.ids.townEventId));
        assert.ok(isVisible(source) && order(source,event)<=0);
      }
    }
    return {
      cutoff:edit.cutoff,seed:edit.audit.seed,boundary:boundary?.id ?? null,
      position:boundary?.replayOrdinal ?? null,required:edit.audit.requiredIds,
      generationSeed:edit.audit.targetGeneration,explicitSeed:explicit.audit.seed,
      range:visible.length ? [visible[0].id,visible.at(-1).id] : [],
      candidates:visible.length,candidateKinds:counts(visible,event=>event.kind),
      candidateGenerations:counts(visible,event=>event.generationId),
      frames:events.length,generations:counts(events,event=>event.generationId),
      decade:counts(events,event=>Math.floor(event.month/120)),
      kinds:counts(events,event=>event.kind),
      families:counts(events,event=>eventDefinitions[event.kind].family),
      regions:counts(events.filter(event=>event.ids.regionId),event=>event.ids.regionId),
      largestGap:Math.max(0,...events.slice(1).map((event,index)=>event.month-events[index].month)),
      endGap:cutoffMonth-(events.at(-1)?.month ?? 0),
      elapsedMs,heapDelta,
      scenes:edit.frames.map((frame,index)=>{
        const event = events[index];
        return {id:event.id,month:event.month,operationIndex:event.operationIndex,generation:event.generationId,
          kind:event.kind,ids:event.ids,reason:frame.reason,
          sentence:recallSentence(event,firsts),evidence:event.evidence,returnOf:frame.returnOf,
          links:scores.get(event.id).links,score:scores.get(event.id).score,components:scores.get(event.id).components};
      }),
    };
  });
}

export function publicBaseline() {
  const records = read(new URL('./facts.json',import.meta.url));
  const supplements = read(new URL('./facts-d.json',import.meta.url));
  return Object.fromEntries(Object.entries(records).map(([id,record])=>[id,
    Object.fromEntries(['handover','anniversary'].map(horizon=>{
      const legacy = Object.fromEntries(['a','b','c'].map(mode=>[mode,signatures(buildChronicle(record,horizon,mode))]));
      const edit = buildChronicle(withReputationCandidates(record,supplements[id]),horizon,'d');
      return [horizon,{legacy,d:signatures(edit),seed:edit.audit.seed}];
    }))]));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [path] = process.argv.slice(2);
  if (path === '--baseline') console.log(JSON.stringify(publicBaseline()));
  else {
    const {record,metrics} = read(path);
    console.log(JSON.stringify({id:record.id,month:record.elapsedMonths,sha256:record.sourceSha256,
      bytes:Buffer.byteLength(JSON.stringify(record)),metrics,editions:auditRecord(record)}));
  }
}
