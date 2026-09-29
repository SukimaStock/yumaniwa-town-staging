'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { TextDecoder } = require('node:util');
const {
  validatePlan,
  collectChangedPaths,
  escapeHumanText,
} = require('./change-scope-guard.cjs');
const {
  REGISTRY_SCHEMA,
  REGISTRY_VERSION,
  getStaticCheckDefinition,
} = require('./change-static-check-registry.cjs');

const REPORT_SCHEMA = 'yumaniwa-trusted-static-check-report/0.1';
const MAX_GIT_OUTPUT = 64 * 1024 * 1024;
const UTF8 = new TextDecoder('utf-8', { fatal: true });

function runProcess(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    input: options.input,
    encoding: options.encoding === undefined ? null : options.encoding,
    maxBuffer: MAX_GIT_OUTPUT,
    shell: false,
    env: options.env || process.env,
  });
  if (result.error) throw result.error;
  return result;
}

function requireSha(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/i.test(value)) {
    throw new Error(label + ' must be a full 40-character commit SHA');
  }
  return value.toLowerCase();
}

function decodeUtf8(buffer, label) {
  try {
    return UTF8.decode(buffer);
  } catch {
    throw new Error(label + ' is not valid UTF-8');
  }
}

function collectTreeEntries(root, headSha) {
  const proc = runProcess('git', ['-C', root, 'ls-tree', '-rz', '--full-tree', headSha]);
  if (proc.status !== 0) throw new Error('git ls-tree failed for exact target SHA');
  const out = proc.stdout || Buffer.alloc(0);
  const entries = new Map();
  let start = 0;
  for (let i = 0; i <= out.length; i += 1) {
    if (i !== out.length && out[i] !== 0) continue;
    if (i === start) {
      start = i + 1;
      continue;
    }
    const record = out.subarray(start, i);
    start = i + 1;
    const tab = record.indexOf(9);
    if (tab < 0) throw new Error('git ls-tree returned malformed record');
    const meta = record.subarray(0, tab).toString('ascii');
    const match = /^(\d+) ([a-z]+) ([0-9a-f]{40})$/.exec(meta);
    if (!match) throw new Error('git ls-tree returned malformed metadata');
    const filePath = decodeUtf8(record.subarray(tab + 1), 'candidate Git path');
    if (entries.has(filePath)) throw new Error('duplicate Git tree path');
    entries.set(filePath, {
      mode: match[1],
      type: match[2],
      oid: match[3],
    });
  }
  return entries;
}

function readBlob(root, entry) {
  if (!entry || entry.type !== 'blob') throw new Error('requested candidate path is not a Git blob');
  const proc = runProcess('git', ['-C', root, 'cat-file', 'blob', entry.oid]);
  if (proc.status !== 0) throw new Error('git cat-file failed for candidate blob');
  return proc.stdout || Buffer.alloc(0);
}

function readTextBlob(root, tree, filePath) {
  const entry = tree.get(filePath);
  if (!entry) return { ok: false, reason: 'MISSING_PATH', path: filePath };
  if (!['100644', '100755'].includes(entry.mode) || entry.type !== 'blob') {
    return { ok: false, reason: 'NON_REGULAR_BLOB', path: filePath, mode: entry.mode, type: entry.type };
  }
  let text;
  try {
    text = decodeUtf8(readBlob(root, entry), 'candidate blob');
  } catch (error) {
    return { ok: false, reason: 'INVALID_UTF8', path: filePath, detail: error.message };
  }
  return { ok: true, path: filePath, entry, text };
}

function runTextContract(definition, context) {
  const details = [];
  let failed = false;
  for (const requirement of definition.requirements || []) {
    const loaded = readTextBlob(context.root, context.tree, requirement.path);
    if (!loaded.ok) {
      failed = true;
      details.push({
        path: requirement.path,
        status: 'FAIL',
        reason: loaded.reason,
      });
      continue;
    }
    const missing = [];
    for (const literal of requirement.contains || []) {
      if (!loaded.text.includes(literal)) missing.push(literal);
    }
    if (missing.length) failed = true;
    details.push({
      path: requirement.path,
      blob: loaded.entry.oid,
      status: missing.length ? 'FAIL' : 'PASS',
      requiredLiteralCount: (requirement.contains || []).length,
      missingLiteralCount: missing.length,
      missingLiteralDigests: missing.map(value => crypto.createHash('sha256').update(value, 'utf8').digest('hex')),
    });
  }
  return {
    status: failed ? 'FAIL' : 'PASS',
    exitCode: failed ? 1 : 0,
    reason: failed ? 'STATIC_CONTRACT_MISMATCH' : 'STATIC_CONTRACT_MATCH',
    details,
  };
}

function runNodeSyntax(definition, context) {
  const extensions = new Set(definition.extensions || []);
  const targets = context.changedPaths.filter(filePath => extensions.has(path.posix.extname(filePath)) && context.tree.has(filePath));
  if (targets.length === 0) {
    return {
      status: 'FAIL',
      exitCode: 1,
      reason: 'NO_APPLICABLE_CHANGED_JAVASCRIPT',
      checkedFiles: [],
    };
  }

  const checkedFiles = [];
  let failed = false;
  for (const filePath of targets) {
    const loaded = readTextBlob(context.root, context.tree, filePath);
    if (!loaded.ok) {
      failed = true;
      checkedFiles.push({ path: filePath, status: 'FAIL', reason: loaded.reason });
      continue;
    }
    const proc = runProcess(process.execPath, ['--check', '-'], {
      input: loaded.text,
      encoding: 'utf8',
    });
    const exitCode = Number.isInteger(proc.status) ? proc.status : 2;
    const stderr = typeof proc.stderr === 'string' ? proc.stderr : '';
    if (exitCode !== 0) failed = true;
    checkedFiles.push({
      path: filePath,
      blob: loaded.entry.oid,
      status: exitCode === 0 ? 'PASS' : 'FAIL',
      exitCode,
      diagnosticBytes: Buffer.byteLength(stderr, 'utf8'),
      diagnosticSha256: stderr ? crypto.createHash('sha256').update(stderr, 'utf8').digest('hex') : null,
    });
  }

  return {
    status: failed ? 'FAIL' : 'PASS',
    exitCode: failed ? 1 : 0,
    reason: failed ? 'NODE_SYNTAX_FAILED' : 'NODE_SYNTAX_PASSED',
    checkedFiles,
  };
}

const EXECUTORS = Object.freeze({
  'text-contract': runTextContract,
  'node-syntax': runNodeSyntax,
});

function executeStaticChecks(options) {
  const root = path.resolve(options.root || process.cwd());
  const baseSha = requireSha(options.baseSha, 'base SHA');
  const targetSha = requireSha(options.targetSha, 'target SHA');
  const normalized = validatePlan(options.plan, { allowLegacy: false });
  if (!normalized.ok) throw new Error('invalid change plan: ' + normalized.errors.join('; '));
  const plan = normalized.plan;
  if (plan.baseSha !== baseSha) throw new Error('locked Plan baseSha does not match trusted base SHA');

  const diff = collectChangedPaths(root, baseSha, targetSha);
  if (diff.headSha.toLowerCase() !== targetSha) throw new Error('resolved candidate SHA does not match exact target SHA');
  const tree = collectTreeEntries(root, targetSha);
  const context = { root, baseSha, targetSha, changedPaths: diff.paths, tree };
  const results = [];

  for (const id of plan.staticChecks || []) {
    const definition = getStaticCheckDefinition(id);
    if (!definition) {
      results.push({
        id,
        status: 'FAIL',
        exitCode: 2,
        reason: 'UNKNOWN_STATIC_CHECK_ID',
        definition: null,
      });
      continue;
    }
    const executor = EXECUTORS[definition.kind];
    if (!executor) {
      results.push({
        id,
        status: 'FAIL',
        exitCode: 2,
        reason: 'UNAVAILABLE_TRUSTED_EXECUTOR',
        definition: {
          version: definition.definitionVersion,
          kind: definition.kind,
          candidateExecution: Boolean(definition.candidateExecution),
        },
      });
      continue;
    }
    let outcome;
    try {
      outcome = executor(definition, context);
    } catch (error) {
      outcome = { status: 'FAIL', exitCode: 2, reason: 'TRUSTED_EXECUTOR_ERROR', error: error.message };
    }
    results.push({
      id,
      status: outcome.status,
      exitCode: outcome.exitCode,
      reason: outcome.reason,
      definition: {
        version: definition.definitionVersion,
        kind: definition.kind,
        candidateExecution: Boolean(definition.candidateExecution),
      },
      details: outcome.details,
      checkedFiles: outcome.checkedFiles,
      error: outcome.error,
    });
  }

  const complete = results.length === (plan.staticChecks || []).length;
  const staticOk = complete && results.length > 0 && results.every(item => item.status === 'PASS' && item.exitCode === 0);
  return {
    schema: REPORT_SCHEMA,
    repository: plan.repository,
    changeId: plan.changeId,
    baseSha,
    targetSha,
    changedPaths: diff.paths,
    registry: {
      schema: REGISTRY_SCHEMA,
      version: REGISTRY_VERSION,
      sourcePath: 'tools/change-static-check-registry.cjs',
      sourceBlob: options.registryBlob || null,
    },
    requestedChecks: [...(plan.staticChecks || [])],
    results,
    complete,
    staticOk,
    exitCode: staticOk ? 0 : 1,
  };
}

function readPlan(planPath) {
  if (!planPath) throw new Error('--plan is required');
  const source = planPath === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(path.resolve(planPath), 'utf8');
  try {
    return JSON.parse(source);
  } catch {
    throw new Error('plan JSON parse failed');
  }
}

function parseArgs(argv) {
  const options = { root: process.cwd(), plan: null, baseSha: null, targetSha: null, registryBlob: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (['--root', '--plan', '--base', '--head', '--registry-blob'].includes(arg)) {
      const value = argv[++i];
      if (!value) throw new Error(arg + ' requires a value');
      if (arg === '--root') options.root = value;
      if (arg === '--plan') options.plan = value;
      if (arg === '--base') options.baseSha = value;
      if (arg === '--head') options.targetSha = value;
      if (arg === '--registry-blob') options.registryBlob = value;
    } else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error('unknown argument: ' + arg);
  }
  return options;
}

function usage() {
  return [
    'Usage:',
    '  node tools/change-static-check.cjs --plan <plan.json|-> --root <candidate-repo> --base <sha> --head <sha> [--registry-blob <sha>] [--json]',
    '',
    'Executes only base-owned trusted static check definitions against exact candidate Git data.',
    'Candidate-provided commands, scripts, workflows, and tests are never executed.',
  ].join('\n');
}

function formatHuman(report) {
  const lines = [];
  lines.push('YUMANIWA TRUSTED STATIC CHECK v0.1');
  lines.push('Base:   ' + report.baseSha);
  lines.push('Target: ' + report.targetSha);
  lines.push('Registry: ' + report.registry.version);
  lines.push('');
  for (const item of report.results) {
    lines.push(item.status + ' ' + escapeHumanText(item.id) + ' — ' + escapeHumanText(item.reason));
  }
  lines.push('');
  lines.push('Trusted static: ' + (report.staticOk ? 'PASS' : 'STOP'));
  return lines.join('\n');
}

function runCli(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(usage() + '\n');
      return 0;
    }
    const plan = readPlan(options.plan);
    const report = executeStaticChecks({
      root: options.root,
      plan,
      baseSha: options.baseSha,
      targetSha: options.targetSha,
      registryBlob: options.registryBlob,
    });
    process.stdout.write((options.json ? JSON.stringify(report, null, 2) : formatHuman(report)) + '\n');
    return report.exitCode;
  } catch (error) {
    process.stderr.write('Trusted Static Check error: ' + escapeHumanText(error.message) + '\n');
    if (!options || options.help !== true) process.stderr.write(usage() + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  REPORT_SCHEMA,
  collectTreeEntries,
  readTextBlob,
  runTextContract,
  runNodeSyntax,
  executeStaticChecks,
  formatHuman,
  runCli,
};
