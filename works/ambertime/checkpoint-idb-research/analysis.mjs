/** H1-A4 read-only analysis of pinned H1-A2/A3 observations; no game replay. */
import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function input(relative) {
  const bytes = await readFile(path.join(root, relative));
  return { value: JSON.parse(bytes), provenance: { path: relative, sha256: sha(bytes) } };
}
export async function analyze({ browserResultsPath } = {}) {
  const a2 = await input('works/ambertime/checkpoint-research/results.json');
  const a3 = await input('works/ambertime/checkpoint-persistence/results.json');
  if (!a2.value.complete || a3.value.status !== 'complete') throw Error('incomplete research inputs');
  const schedules = a3.value.long.map(condition => {
    const rows = condition.rows.map(r => ({ policy: r.policy, kind: 'H1-A3 observed, one sample', checkpointCount: r.checkpointCount,
      finalTailOperations: r.tailOperations, finalTailMonths: r.tailMonths, finalBundleBytes: r.bytes,
      coldTotalMs: r.cold.totalMs, finalCaptureMs: r.captureMs, finalWriteMs: r.writeMs,
      cumulativeWrittenBytes: null, physicalIndexedDBBytes: null }));
    const annual = condition.rows.find(r => r.policy === 'annual');
    const bounded = condition.rows.find(r => r.policy === 'operations64');
    rows.push({ policy: 'annual-or-64-operations', kind: 'design bound, not executed or timed',
      checkpointCount: null, checkpointCountUpperBound: annual.checkpointCount + bounded.checkpointCount,
      maximumTailOperationsExclusive: 64, maximumTailMonths: 12,
      boundAssumptions: 'Trigger after every operation when either threshold is met; includes final pending tail. Operation duration/work is not bounded.',
      coldTotalMs: null, cumulativeWrittenBytes: null, physicalIndexedDBBytes: null });
    return { id: condition.id, sourceHash: condition.sourceHash, schedules: rows };
  });
  const prefixGrowth = a2.value.results.map(r => {
    const p = r.policies.find(p => p.policy === 'annual');
    return { id: r.id, finalMonth: r.month, checkpointMonth: p.checkpointMonth,
      sourceHash: r.sourceHash, collectorPrefixBytes: p.projectionPrefixBytes,
      interpretation: 'H1-A2 offline collector prefix; final-save-bound, not future-neutral archive or physical IndexedDB allocation' };
  });
  const history = a3.value.materials.map(m => ({ id: m.id, sourceHash: m.sourceHash,
    boundaries: m.boundaries.map(b => ({ handoverId: b.handoverId, month: b.month,
      nextIndex: b.nextIndex, candidates: b.candidates, collectorBytes: b.collectorBytes,
      materialDigest: b.materialDigest, immediateEqualsLater: b.immediateEqualsLater, publishedEqual: b.publishedEqual })),
    interpretation: 'collectorBytes is the growing continuation collector, not the serialized frozen-candidate archive size; do not sum to claim unique storage' }));
  if (history.reduce((n,m) => n+m.boundaries.length,0) !== 9 || history.some(m => m.boundaries.some(b => !b.immediateEqualsLater || !b.publishedEqual))) throw Error('nine historical boundary baseline not verified');
  let browserEvidence = null;
  if (browserResultsPath) { const bytes = await readFile(browserResultsPath); browserEvidence = { path: browserResultsPath, sha256: sha(bytes), result: JSON.parse(bytes) }; }
  return { schema: 'ambertime-h1-a4-analysis/1', sources: [a2.provenance,a3.provenance], schedules, prefixGrowth, history,
    retentionPolicies: [
      { policy: 'A', dailyCheckpointCount: 1 },
      { policy: 'B', dailyCheckpointCount: 2 },
      { policy: 'C', dailyCheckpointCount: 2, immutableGenerationHistory: true },
      { policy: 'D', dailyCheckpointCount: 'N', separateLastKnownGood: true }
    ].map(p => ({ ...p, protectHistoryInEveryPolicy: true, protectOriginalPrefixAndBackup: true, physicalIndexedDBBytes: null, cumulativeWrittenBytes: null })),
    browserEvidence, limits: [
      'No new replay or browser storage measurement in this analysis. Browser measurements must come from the browser suite.',
      'Latest checkpoint byte size times frequency is not cumulative written bytes: earlier states and tails differ.',
      'A bounded count of checkpoints does not bound collector, town state, immutable history, or full original-save bytes.',
      'H1-A3 local integrity and creator verification do not implement authenticated correctness or independent full-prefix validation on every load.',
      'H1-A2 warm timings are not used as cold estimates; H1-A3 one-sample timings have uncontrolled OS cache and concurrent host contention.'
    ] };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [output, browserResultsPath] = process.argv.slice(2);
  const result = JSON.stringify(await analyze({ browserResultsPath }), null, 2) + '\n';
  if (output) { await writeFile(output+'.tmp',result); await rename(output+'.tmp',output); }
  else process.stdout.write(result);
}
