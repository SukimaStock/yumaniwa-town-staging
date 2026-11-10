// node profile.mjs --root REPOSITORY --fixture RAW_OR_V8_JSON --output RESULT_JSON
// Runs unmodified control and temporary instrumented copy in SEQUENTIAL fresh
// processes. Do not run beside another benchmark. --mode control|instrumented
// selects one; the default is both. No runtime file or source fixture is edited.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {instrumentCopy, installTimers} from './instrument.mjs';

const self = fileURLToPath(import.meta.url);
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]?.startsWith('--') ? true : all[index + 1] ?? true]);
  return pairs;
}, []));
const root = path.resolve(args.root ?? path.join(path.dirname(self), '../../../..'));
if (!args.fixture) throw Error('--fixture is required');
const fixture = path.resolve(args.fixture);
const hash = value => createHash('sha256').update(value).digest('hex');
const measure = action => { const start = performance.now(); const result = action(); return {result, milliseconds: performance.now() - start}; };

async function worker() {
  const timers = args.instrumented ? installTimers() : null;
  const read = measure(() => fs.readFileSync(fixture, 'utf8'));
  const parse = measure(() => JSON.parse(read.result));
  const isFormal = parse.result.version === 8 && Object.hasOwn(parse.result, 'game');
  const moduleUrl = relative => pathToFileURL(path.join(root, 'works/ambertime', relative)).href;
  // Imports finish before restoration begins, matching PR907's model timing.
  const imports = performance.now();
  const D = await import(moduleUrl('partner-orders.mjs') + '?world=world-network-v01');
  const S = await import(moduleUrl('development-save.mjs'));
  const {PARALLEL_PARAMETERS: P} = await import(moduleUrl('economy-parameters.mjs'));
  const importMilliseconds = performance.now() - imports;
  const options = {enabled: true, serialize: D.serializeDistillery, restore: D.restoreDistillery, monthMs: P.monthMs, stepMs: P.distillStepMs};
  const restore = () => isFormal ? S.readSession(read.result, options) : D.restoreDistillery(read.result);
  function phase(action) {
    timers?.reset();
    const before = process.memoryUsage();
    const measured = measure(action);
    return {result: measured.result, milliseconds: measured.milliseconds, memoryBefore: before, memoryAfter: process.memoryUsage(), timers: timers?.snapshot() ?? null};
  }
  const cold = phase(restore);
  const warm = phase(restore);
  const game = isFormal ? cold.result.game : cold.result;
  const generation = phase(() => isFormal ? S.serializeSession(game, cold.result, options) : D.serializeDistillery(game));
  const exact = generation.result === read.result;
  if (!exact) throw Error('Roundtrip differs from fixture');
  // Results/measurements contain no full game state.
  for (const value of [cold, warm, generation]) delete value.result;
  const report = {
    schema: 'ambertime-stage7-profile-worker/1', instrumented: !!args.instrumented,
    fixture: {sha256: hash(read.result), bytes: Buffer.byteLength(read.result), codeUnits: read.result.length, formalV8: isFormal, month: game.core.month, operations: game.operations.length, releases: game.releases?.length},
    environment: {node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemoryBytes: os.totalmem()},
    fileReadMilliseconds: read.milliseconds, independentJsonParseMilliseconds: parse.milliseconds, moduleImportMilliseconds: importMilliseconds,
    coldRestore: cold, sameProcessRestore: warm, generationAndValidation: generation, exactRoundtrip: exact,
    peakRssProcessBytes: process.resourceUsage().maxRSS * 1024,
    conditions: ['Imports and independent envelope parse precede cold timer; no model game was previously constructed/restored.', 'Cold and warm restoration are consecutive. Generation follows warm restoration and uses its cache.', 'Raw generation is serializeDistillery; formal generation is serializeSession including official reader roundtrip.', 'Inclusive nested timers overlap: never sum them. Exclusive is time outside other instrumented scopes, not pure CPU.', 'Global clone timing includes every structuredClone call in the process during each phase.', 'Memory snapshots are boundary RSS/heap observations; maxRSS is process lifetime high-water, not per-phase peak.', 'Instrumented wall time includes measurement overhead; use unmodified control for performance conclusions.'],
  };
  timers?.dispose();
  process.stdout.write(JSON.stringify(report));
}

if (args.worker) await worker();
else {
  if (!['both', 'control', 'instrumented'].includes(args.mode ?? 'both')) throw Error('Invalid --mode');
  const mode = args.mode ?? 'both';
  const report = {schema: 'ambertime-stage7-profile/1', measuredAt: new Date().toISOString(), sourceRoot: root, fixture, runs: {}};
  for (const kind of ['control', 'instrumented'].filter(kind => mode === 'both' || mode === kind)) {
    let temporary;
    try {
      const selectedRoot = kind === 'instrumented' ? (temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'amber-stage7-profile-'))) : root;
      if (temporary) report.instrumentedFiles = instrumentCopy(root, temporary);
      const command = [self, '--worker', '--root', selectedRoot, '--fixture', fixture];
      if (temporary) command.push('--instrumented');
      report.runs[kind] = JSON.parse(execFileSync(process.execPath, command, {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: Number(args.timeout ?? 900000)}));
    } finally { if (temporary) fs.rmSync(temporary, {recursive: true, force: true}); }
  }
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args.output) fs.writeFileSync(path.resolve(args.output), output);
  else process.stdout.write(output);
}
