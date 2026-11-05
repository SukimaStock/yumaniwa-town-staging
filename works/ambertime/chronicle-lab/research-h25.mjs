// Offline raw-fact preparation and a replay-free consumer for verification.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {buildEdition} from './edition-d.mjs';
import {buildChronicle} from './editor.mjs';
import {firstDeliveryIds,recallSentence} from './caption.mjs';
import {prepareHistoricalCandidates,buildHistoricalChronicle} from './recall-boundary.mjs';

export function prepareRecallArchive(rawRecord) {
  const selections = [null,...rawRecord.events.filter(event=>event.kind==='handover')];
  const shared = new Map();
  const snapshots = selections.map(handover=>{
    const horizon = handover ? 'handover' : 'anniversary';
    const selector = handover ? {handoverId:handover.id} : {};
    const prepared = prepareHistoricalCandidates(rawRecord,horizon,selector);
    assert.ok(prepared.record);
    const ordinalOverrides = {};
    for (const event of prepared.record.events) {
      if (!shared.has(event.id)) shared.set(event.id,event);
      if (shared.get(event.id).ordinal !== event.ordinal) ordinalOverrides[event.id] = event.ordinal;
    }
    return {horizon,handoverId:prepared.handoverId,cutoff:prepared.cutoff,
      seedGeneration:prepared.seedGeneration,eventIds:prepared.record.events.map(event=>event.id),ordinalOverrides};
  });
  const {events,...metadata} = rawRecord;
  return {schema:'ambertime-recall-candidates/1',metadata:{...metadata,factStage:'candidates'},events:[...shared.values()],snapshots};
}

export function readRecallArchive(archive,handoverId=null) {
  assert.equal(archive.schema,'ambertime-recall-candidates/1');
  const snapshot = archive.snapshots.find(row=>row.handoverId===handoverId);
  assert.ok(snapshot,'Unknown prepared recall');
  const byId = new Map(archive.events.map(event=>[event.id,event]));
  assert.equal(byId.size,archive.events.length);
  assert.equal(new Set(snapshot.eventIds).size,snapshot.eventIds.length,'Duplicate candidate membership');
  const events = snapshot.eventIds.map(id=>{
    const event = byId.get(id);
    assert.ok(event,'Missing prepared fact '+id);
    return Object.hasOwn(snapshot.ordinalOverrides,id) ? {...event,ordinal:snapshot.ordinalOverrides[id]} : event;
  });
  const record = {...archive.metadata,events};
  return {record,...snapshot,result:buildEdition(record,snapshot.cutoff,
    snapshot.seedGeneration == null ? {} : {targetGeneration:snapshot.seedGeneration})};
}

export function compareRecall(rawRecord,legacyRecord) {
  globalThis.gc?.();
  const heapBefore = process.memoryUsage().heapUsed;
  const archiveStart = performance.now();
  const archive = prepareRecallArchive(rawRecord);
  const prepareMs = performance.now()-archiveStart;
  const heapDelta = process.memoryUsage().heapUsed-heapBefore;
  const firsts = firstDeliveryIds(rawRecord);
  const boundaries = rawRecord.events.filter(event=>event.kind==='handover');
  const comparisons = boundaries.map(boundary=>{
    const selector = {handoverId:boundary.id};
    const strict = buildHistoricalChronicle(rawRecord,'handover',selector);
    const legacy = buildChronicle(legacyRecord,'handover','d',
      boundary.generationId===1 ? {} : {targetGeneration:boundary.generationId});
    const prepared = prepareHistoricalCandidates(rawRecord,'handover',selector);
    const ids = prepared.record.events.map(event=>event.id);
    const ordinal = event=>event.replayOrdinal ?? event.ordinal;
    const visible = event=>event.month<=strict.cutoff.month &&
      (event.operationIndex<strict.cutoff.operationIndex ||
        event.operationIndex===strict.cutoff.operationIndex && ordinal(event)<=strict.cutoff.replayOrdinal);
    const legacyCandidates = legacyRecord.events.filter(visible).map(event=>event.id);
    const missing = legacyCandidates.filter(id=>!ids.includes(id));
    const byId = new Map(rawRecord.events.map(event=>[event.id,event]));
    const futureReferences = missing.map(id=>{
      const event = byId.get(id);
      return {id,month:event.month,references:rawRecord.events.filter(row=>!visible(row) &&
        ['inquiry','visit'].includes(row.kind) && row.evidence.sourceChain.includes(event.ids.townEventId))
        .map(row=>({id:row.id,month:row.month}))};
    });
    const asOfOldSeed = buildEdition(prepared.record,prepared.cutoff,{targetGeneration:legacy.audit.targetGeneration});
    assert.equal(asOfOldSeed.audit.seed,legacy.audit.seed);
    const priorCanonical = buildEdition(legacyRecord,strict.cutoff,{targetGeneration:strict.seedGeneration});
    const start = performance.now();
    const fromArchive = readRecallArchive(archive,boundary.id);
    const editMs = performance.now()-start;
    assert.deepEqual(fromArchive.result.frames,strict.frames);
    assert.deepEqual(fromArchive.result.audit,strict.audit);
    assert.deepEqual(strict,buildHistoricalChronicle(rawRecord,'handover',selector));
    assert.deepEqual(strict,buildHistoricalChronicle(rawRecord,'handover',{targetGeneration:boundary.generationId}));
    if(boundary.generationId===1) assert.deepEqual(strict,buildHistoricalChronicle(rawRecord,'handover'));
    const prefix = {...rawRecord,elapsedMonths:boundary.month,lastOperationIndex:boundary.operationIndex,
      events:rawRecord.events.filter(visible)};
    const justAfter = buildHistoricalChronicle(prefix,'handover',selector);
    assert.deepEqual(justAfter.frames,strict.frames);
    assert.deepEqual(justAfter.audit,strict.audit);
    return {handoverId:boundary.id,cutoff:strict.cutoff,legacyCutoff:legacy.cutoff,
      seed:strict.audit.seed,legacySeed:legacy.audit.seed,
      legacyCandidates,strictCandidates:ids,futureReferences,
      legacySelected:legacy.audit.selectedIds,asOfOldSeedSelected:asOfOldSeed.audit.selectedIds,canonicalLegacySelected:priorCanonical.audit.selectedIds,
      strictSelected:strict.audit.selectedIds,required:strict.audit.requiredIds,
      editMs,scenes:strict.frames.map(frame=>({id:frame.id,sentence:recallSentence(frame.events[0],firsts),
        generation:frame.events[0].generationId,reason:frame.reason,evidence:frame.events[0].evidence}))};
  });
  const anniversary = buildHistoricalChronicle(rawRecord,'anniversary');
  const oldAnniversary = buildChronicle(legacyRecord,'anniversary','d');
  assert.deepEqual(anniversary.frames,oldAnniversary.frames);
  assert.deepEqual(anniversary.audit,oldAnniversary.audit);
  return {id:rawRecord.id,anniversaryIds:anniversary.audit.selectedIds,heapDelta,month:rawRecord.elapsedMonths,sourceSha256:rawRecord.sourceSha256,
    rawCount:rawRecord.events.length,rawBytes:Buffer.byteLength(JSON.stringify(rawRecord)),
    archiveBytes:Buffer.byteLength(JSON.stringify(archive)),sharedEvents:archive.events.length,
    snapshotMemberships:archive.snapshots.reduce((sum,row)=>sum+row.eventIds.length,0),
    prepareMs,comparisons};
}

if(process.argv[1] && pathToFileURL(process.argv[1]).href===import.meta.url) {
  const [rawPath,legacyPath] = process.argv.slice(2);
  const raw = JSON.parse(readFileSync(rawPath,'utf8')).record;
  if(legacyPath==='--archive') console.log(JSON.stringify(prepareRecallArchive(raw)));
  else {
    const legacy = JSON.parse(readFileSync(legacyPath,'utf8')).record;
    assert.equal(raw.sourceSha256,legacy.sourceSha256);
    console.log(JSON.stringify(compareRecall(raw,legacy)));
  }
}
