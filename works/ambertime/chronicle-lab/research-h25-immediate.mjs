// Create independent formal saves immediately after recorded handover operations.
// No event is inserted; the snapshots come from the public operation replay.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {replayDistilleryOperations,serializeDistillery,restoreDistillery} from '../partner-orders.mjs';
import {prepareHistoricalCandidates,buildHistoricalChronicle} from './recall-boundary.mjs';

const execute = promisify(execFile);
const hash = text=>createHash('sha256').update(text).digest('hex');
const [scenario,sourcePath,directory,longRawPath] = process.argv.slice(2);
assert.ok(scenario && sourcePath && directory && longRawPath,
  'Usage: node research-h25-immediate.mjs <scenario> <100-year-save> <output-dir> <100-year-raw>');
mkdirSync(directory,{recursive:true});
const text = readFileSync(sourcePath,'utf8');
const source = JSON.parse(text);
const longRecord = JSON.parse(readFileSync(longRawPath,'utf8')).record;
assert.equal(longRecord.sourceSha256,hash(text));
const completed = source.generations.completed.length;
assert.ok(completed>0);
const snapshots = [];
const finished = {};
const replayStart = performance.now();
try {
  replayDistilleryOperations(source,({index,operation,after})=>{
    if (operation?.key!=='generation-handover') return;
    // Keep model serialization order, including operations and origin positions.
    const state = Object.fromEntries(Object.keys(source).map(key=>[key,
      key==='operations' ? source.operations.slice(0,index+1) : key==='origin' ? source.origin : after[key],
    ]));
    assert.equal(state.generations.completed.at(-1).id,operation.value.id);
    assert.equal(state.operations.at(-1).key,'generation-handover');
    snapshots.push({state,index,generation:operation.value.id});
    if (snapshots.length===completed) throw finished;
  });
} catch(error) {
  if (error!==finished) throw error;
}
assert.equal(snapshots.length,completed);
assert.equal(JSON.stringify(source),text);
const replayMs = performance.now()-replayStart;
const generator = fileURLToPath(new URL('./research-h25-generate.mjs',import.meta.url));
const results = [];
for (const {state,index,generation} of snapshots) {
  const stem = resolve(directory,`${scenario}-handover-${generation}`);
  const validateStart = performance.now();
  const raw = serializeDistillery(state);
  writeFileSync(stem+'.json',raw);
  const restored = restoreDistillery(readFileSync(stem+'.json','utf8'));
  assert.equal(serializeDistillery(restored),raw,'Formal restore changed the independent save');
  const validateMs = performance.now()-validateStart;
  const extractStart = performance.now();
  const {stdout} = await execute(process.execPath,['--expose-gc',generator,stem+'.json',scenario],{maxBuffer:32*1024*1024});
  writeFileSync(stem+'.raw.json',stdout);
  const extractMs = performance.now()-extractStart;
  const immediateRecord = JSON.parse(stdout).record;
  const selector = {handoverId:'handover:'+generation};
  const immediate = buildHistoricalChronicle(immediateRecord,'handover',selector);
  const later = buildHistoricalChronicle(longRecord,'handover',selector);
  const candidates = prepareHistoricalCandidates(immediateRecord,'handover',selector);
  const laterCandidates = prepareHistoricalCandidates(longRecord,'handover',selector);
  assert.deepEqual(candidates.record.events,laterCandidates.record.events,'Immediate and later candidates differ');
  assert.deepEqual(immediate.frames,later.frames,'Immediate and later scenes differ');
  assert.deepEqual(immediate.audit,later.audit,'Immediate and later seeds or audit differ');
  assert.deepEqual(immediate.cutoff,later.cutoff);
  assert.equal(immediate.frames.at(-1).id,selector.handoverId);
  assert.equal(immediateRecord.lastOperationIndex,index);
  const result = {scenario,generation,month:state.core.month,operationIndex:index,
    sourceSha256:hash(text),immediateSha256:hash(raw),bytes:Buffer.byteLength(raw),
    replayMs,validateMs,extractMs,candidates:candidates.record.events.length,
    scenes:immediate.frames.length,seed:immediate.audit.seed,
    selectedIds:immediate.audit.selectedIds,cutoff:immediate.cutoff,
    equalCandidates:true,equalScenes:true,equalAudit:true,
    extractionMetrics:JSON.parse(stdout).metrics};
  results.push(result);
  writeFileSync(resolve(directory,scenario+'-results.json'),JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(result));
}

assert.equal(JSON.stringify(source),text,'Immediate-save validation must preserve the source career');
