import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {runScenario,runTailScenario,makeCommands} from './scenarios.mjs';
import * as incremental from './model.mjs';
import {createCheckpoint,restore,POLICY} from './persistence.mjs';
const tailOnly=process.argv.includes('--tail-only');
const outputPath=fileURLToPath(new URL('./results.json',import.meta.url));
const rows=[];
if(!tailOnly)for(const months of [12,360,1200])for(const seed of [1,42,781])for(const pattern of ['focused','distributed','gap']){
 const heapBefore=process.memoryUsage().heapUsed;const {result}=await runScenario({months,seed,pattern});const heapAfter=process.memoryUsage().heapUsed;
 rows.push({...result,heapBefore,heapAfter,heapDelta:heapAfter-heapBefore});
 console.log(`${months}m seed=${seed} ${pattern}: old=${result.oldMs.toFixed(1)}ms incremental=${result.newMs.toFixed(1)}ms parity=true`);
}
const report=tailOnly?JSON.parse(await readFile(outputPath,'utf8')):{environment:{node:process.version,platform:process.platform,arch:process.arch,createdAt:new Date().toISOString()},scope:'Synthetic confirmed operations, not 100 years of the formal game',method:{timing:'Per-command performance.now; JSON byte accounting and equality checks excluded from timed windows. Alternating old/new operations; serialization may influence GC/cache.',legacyCopiedModelBytes:'Sum of UTF8 JSON sizes before each command; these scenarios do not invoke nested legacy clone operations. Excludes descriptor/input/read payload copying.',incrementalCopiedBytes:'copiedPayloadBytes is owned input/read JSON payload only. shallowIndexEntriesCopied and shallowPropertiesCopied count copied references/properties separately, not measured allocator bytes.',memory:'Process heap samples include both models, workload, serialization temporaries, restore and GC; negative delta possible. Not isolated model resident or peak memory.',remainingCost:'registerRelease scans identities and all descriptors; distinct releases retain O(N) index spreads and O(N²) aggregate descriptor comparisons. Not bounded memory.',restore:'Full checkpoint JSON roundtrip and integrity restore; tail fault/replay covered in separate persistence tests.'},rows};
if(tailOnly){
 for(const row of report.rows){
  let model=incremental.createModel();for(const command of makeCommands(row))model=incremental.applyCommand(model,command);
  const bytes=new TextEncoder().encode(JSON.stringify(model)).length;if(bytes!==row.jsonBytes)throw Error('Refresh model size mismatch');
  const binding={revision:row.commands,sourceFingerprint:'a'.repeat(64),policyVersion:POLICY};
  let start=performance.now();const cp=await createCheckpoint(model,binding);row.checkpointMs=performance.now()-start;
  start=performance.now();const restored=await restore(JSON.parse(JSON.stringify(cp)),binding);row.restoreMs=performance.now()-start;
  if(incremental.canonical(restored.model)!==incremental.canonical(model))throw Error('Refreshed restore mismatch');
  row.checkpointBytes=new TextEncoder().encode(JSON.stringify(cp)).length;
  console.log(`storage refresh ${row.months}m seed=${row.seed} ${row.pattern}: parity=true`);
 }
 report.method.storageRefresh='Checkpoint/restore fields refreshed using final persistence validator and deterministically regenerated incremental models; JSON sizes rechecked. Update measurements retained unchanged.';
}
report.tailRows=[];
for(const months of [12,360,1200]){const result=await runTailScenario({months,seed:42,pattern:'focused'});report.tailRows.push(result);console.log(`tail ${months}m: append=${result.appendMs.toFixed(1)}ms restore=${result.restoreMs.toFixed(1)}ms parity=true`);}
report.method.tail='One bulk tail entry after empty checkpoint; not monthly append. appendTail validates/replays and copies the existing chain; repeated growing appends can be O(N²), no speedup claim.';
report.method.recalculations='Incremental counter covers descriptor comparisons and metric updates. Legacy uses identical searches/formulas with no cache; its equivalent count is inferred from exact operations, not separately instrumented.';
await writeFile(outputPath,JSON.stringify(report,null,2)+'\n');
