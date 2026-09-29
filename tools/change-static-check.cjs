'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { TextDecoder } = require('node:util');
const {
  validatePlan,
  collectChangedPaths,
  escapeHumanText,
} = require('./change-scope-guard.cjs');
const {
  STATIC_CHECK_REQUIREMENTS,
  staticCheckApplicablePaths,
} = require('./change-risk-policy.cjs');
const {
  evaluateChangeOsContract,
} = require('./change-os-contract.cjs');

const REPORT_SCHEMA = 'yumaniwa-trusted-static-check-report/0.1';
const REGISTRY_PATH = path.join(__dirname, 'change-static-check-registry.json');
const RISK_POLICY_PATH = path.join(__dirname, 'change-risk-policy.cjs');
const CHANGE_OS_CONTRACT_PATH = path.join(__dirname, 'change-os-contract.json');
const REGISTRY_SCHEMA = 'yumaniwa-trusted-static-check-registry/0.1';
const MAX_GIT_OUTPUT = 64 * 1024 * 1024;
const UTF8 = new TextDecoder('utf-8', { fatal: true });
const CHECK_ID_RE = /^[a-z0-9][a-z0-9-]{2,80}$/;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function gitBlobSha1(buffer) {
  const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const header = Buffer.from('blob ' + body.length + '\0', 'utf8');
  return crypto.createHash('sha1').update(header).update(body).digest('hex');
}

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

function readRegistry() {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    throw new Error('trusted static registry JSON parse failed');
  }
  if (!parsed || parsed.schema !== REGISTRY_SCHEMA) {
    throw new Error('trusted static registry schema mismatch');
  }
  if (typeof parsed.version !== 'string' || !parsed.version.trim()) {
    throw new Error('trusted static registry version is required');
  }
  if (!parsed.checks || typeof parsed.checks !== 'object' || Array.isArray(parsed.checks)) {
    throw new Error('trusted static registry checks must be an object');
  }

  const allowedExecutors = new Set(['change-os-contract', 'node-syntax']);
  for (const [id, definition] of Object.entries(parsed.checks)) {
    if (!CHECK_ID_RE.test(id)) throw new Error('trusted static registry contains invalid check id');
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
      throw new Error('trusted static registry definition must be an object');
    }
    if (typeof definition.definitionVersion !== 'string' || !definition.definitionVersion.trim()) {
      throw new Error('trusted static registry definitionVersion is required');
    }
    if (!allowedExecutors.has(definition.executor)) {
      throw new Error('trusted static registry executor kind is not allowlisted');
    }
    if (definition.candidateExecution !== false) {
      throw new Error('trusted static registry must declare candidateExecution=false');
    }
    for (const forbidden of ['command', 'commands', 'script', 'scripts', 'shell', 'argv', 'args']) {
      if (Object.hasOwn(definition, forbidden)) {
        throw new Error('trusted static registry definition contains forbidden command field');
      }
    }
    if (!STATIC_CHECK_REQUIREMENTS[id]) {
      throw new Error('trusted static registry check lacks trusted Risk Policy applicability');
    }
    if (definition.executor === 'text-contract') {
      if (!Array.isArray(definition.requirements) || definition.requirements.length === 0) {
        throw new Error('text-contract definition requires requirements');
      }
      for (const requirement of definition.requirements) {
        if (!requirement || typeof requirement.path !== 'string' || !requirement.path) {
          throw new Error('text-contract requirement path is required');
        }
        if (!Array.isArray(requirement.contains) || requirement.contains.length === 0 ||
            requirement.contains.some(value => typeof value !== 'string' || value.length === 0)) {
          throw new Error('text-contract requirement contains must be nonempty strings');
        }
      }
    }
  }
  return parsed;
}

function collectTreeEntries(root, targetSha) {
  const proc = runProcess('git', ['-C', root, 'ls-tree', '-r', '-z', '--full-tree', targetSha]);
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
    if (entries.has(filePath)) throw new Error('duplicate candidate Git tree path');
    entries.set(filePath, { mode: match[1], type: match[2], oid: match[3] });
  }
  return entries;
}

function readBlob(root, entry) {
  if (!entry || entry.type !== 'blob') throw new Error('candidate entry is not a Git blob');
  const proc = runProcess('git', ['-C', root, 'cat-file', 'blob', entry.oid]);
  if (proc.status !== 0) throw new Error('git cat-file failed for candidate blob');
  return proc.stdout || Buffer.alloc(0);
}

function readTextBlob(root, tree, filePath) {
  const entry = tree.get(filePath);
  if (!entry) return { ok: false, reason: 'MISSING_AT_TARGET' };
  if (!['100644', '100755'].includes(entry.mode) || entry.type !== 'blob') {
    return { ok: false, reason: 'NON_REGULAR_BLOB', mode: entry.mode, type: entry.type };
  }
  try {
    return { ok: true, entry, text: decodeUtf8(readBlob(root, entry), 'candidate blob') };
  } catch (error) {
    return { ok: false, reason: 'INVALID_UTF8', diagnosticSha256: sha256(Buffer.from(error.message, 'utf8')) };
  }
}

function runChangeOsContract(definition, context) {
  const outcome = evaluateChangeOsContract({
    root: context.root,
    baseSha: context.baseSha,
    targetSha: context.targetSha,
  });
  return {
    status: outcome.ok ? 'PASS' : 'FAIL',
    exitCode: outcome.ok ? 0 : 1,
    reason: outcome.ok ? 'CHANGE_OS_CONTRACT_MATCH' : 'CHANGE_OS_CONTRACT_MISMATCH',
    files: outcome.files,
    contract: {
      version: outcome.contractVersion,
      policy: outcome.contractPolicy,
      sourcePath: 'tools/change-os-contract.json',
      sourceBlob: gitBlobSha1(fs.readFileSync(CHANGE_OS_CONTRACT_PATH)),
    },
  };
}

function safeSyntaxExtension(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.mjs')) return '.mjs';
  if (lower.endsWith('.cjs')) return '.cjs';
  return '.js';
}

function runNodeSyntax(definition, context, applicablePaths) {
  const files = [];
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'yumaniwa-static-syntax-'));
  let applicableLiveCount = 0;
  let failed = false;
  try {
    for (let index = 0; index < applicablePaths.length; index += 1) {
      const filePath = applicablePaths[index];
      const entry = context.tree.get(filePath);
      if (!entry) {
        files.push({ path: filePath, status: 'N/A', exitCode: 0, reason: 'DELETED_AT_TARGET' });
        continue;
      }
      if (!['100644', '100755'].includes(entry.mode) || entry.type !== 'blob') {
        failed = true;
        files.push({
          path: filePath,
          status: 'FAIL',
          exitCode: 1,
          reason: 'NON_REGULAR_BLOB',
          mode: entry.mode,
          type: entry.type,
        });
        continue;
      }
      const source = readBlob(context.root, entry);
      const extension = safeSyntaxExtension(filePath);
      const tempFile = path.join(tempRoot, 'candidate-' + index + extension);
      fs.writeFileSync(tempFile, source, { mode: 0o600 });
      const proc = runProcess(process.execPath, ['--check', tempFile], { encoding: 'utf8' });
      const exitCode = Number.isInteger(proc.status) ? proc.status : 2;
      const stderr = typeof proc.stderr === 'string' ? proc.stderr : '';
      applicableLiveCount += 1;
      if (exitCode !== 0) failed = true;
      files.push({
        path: filePath,
        blob: entry.oid,
        status: exitCode === 0 ? 'PASS' : 'FAIL',
        exitCode,
        reason: exitCode === 0 ? 'NODE_SYNTAX_PASSED' : 'NODE_SYNTAX_FAILED',
        diagnosticBytes: Buffer.byteLength(stderr, 'utf8'),
        diagnosticSha256: stderr ? sha256(Buffer.from(stderr, 'utf8')) : null,
      });
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  if (failed) {
    return { status: 'FAIL', exitCode: 1, reason: 'NODE_SYNTAX_FAILED', files };
  }
  if (applicableLiveCount === 0) {
    return { status: 'N/A', exitCode: 0, reason: 'NO_LIVE_APPLICABLE_TARGET', files };
  }
  return { status: 'PASS', exitCode: 0, reason: 'NODE_SYNTAX_PASSED', files };
}

const EXECUTORS = Object.freeze({
  'change-os-contract': runChangeOsContract,
  'node-syntax': runNodeSyntax,
});

function executeStaticChecks(options) {
  const root = path.resolve(options.root || process.cwd());
  const baseSha = requireSha(options.baseSha, 'base SHA');
  const targetSha = requireSha(options.targetSha, 'target SHA');
  const expectedRepository = typeof options.repository === 'string' ? options.repository : '';
  if (!expectedRepository) throw new Error('repository is required');

  const normalized = validatePlan(options.plan, { allowLegacy: false });
  if (!normalized.ok) throw new Error('invalid change plan: ' + normalized.errors.join('; '));
  const plan = normalized.plan;
  if (plan.repository !== expectedRepository) throw new Error('locked Plan repository does not match trusted repository');
  if (plan.baseSha !== baseSha) throw new Error('locked Plan baseSha does not match trusted base SHA');

  const diff = collectChangedPaths(root, baseSha, targetSha);
  if (diff.headSha.toLowerCase() !== targetSha) throw new Error('resolved candidate SHA does not match exact target SHA');

  const registry = readRegistry();
  const registryBlob = requireSha(options.registryBlob, 'registry blob');
  const riskPolicyBlob = requireSha(options.riskPolicyBlob, 'risk policy blob');
  const actualRegistryBlob = gitBlobSha1(fs.readFileSync(REGISTRY_PATH));
  const actualRiskPolicyBlob = gitBlobSha1(fs.readFileSync(RISK_POLICY_PATH));
  if (registryBlob !== actualRegistryBlob) throw new Error('trusted registry blob does not match loaded registry');
  if (riskPolicyBlob !== actualRiskPolicyBlob) throw new Error('trusted Risk Policy blob does not match loaded applicability source');
  const tree = collectTreeEntries(root, targetSha);
  const context = { root, baseSha, targetSha, tree, changedPaths: diff.paths };
  const results = [];

  for (const id of plan.staticChecks || []) {
    const definition = registry.checks[id];
    if (!definition) {
      results.push({
        id,
        status: 'FAIL',
        exitCode: 2,
        reason: 'UNKNOWN_STATIC_CHECK_ID',
        applicability: { status: 'UNKNOWN', paths: [] },
        definition: null,
      });
      continue;
    }

    const requirement = STATIC_CHECK_REQUIREMENTS[id];
    if (!requirement) {
      results.push({
        id,
        status: 'FAIL',
        exitCode: 2,
        reason: 'MISSING_TRUSTED_APPLICABILITY',
        applicability: { status: 'UNKNOWN', paths: [] },
        definition: {
          version: definition.definitionVersion,
          executor: definition.executor,
          candidateExecution: false,
          applicabilitySource: definition.applicabilitySource,
          applicabilitySourceBlob: riskPolicyBlob,
        },
      });
      continue;
    }

    const applicablePaths = staticCheckApplicablePaths(requirement, diff.paths);
    if (applicablePaths.length === 0) {
      results.push({
        id,
        status: 'N/A',
        exitCode: 0,
        reason: 'NOT_APPLICABLE',
        applicability: { status: 'N/A', paths: [] },
        definition: {
          version: definition.definitionVersion,
          executor: definition.executor,
          candidateExecution: false,
          applicabilitySource: definition.applicabilitySource,
          applicabilitySourceBlob: riskPolicyBlob,
        },
      });
      continue;
    }

    const executor = EXECUTORS[definition.executor];
    if (!executor) {
      results.push({
        id,
        status: 'FAIL',
        exitCode: 2,
        reason: 'UNAVAILABLE_TRUSTED_EXECUTOR',
        applicability: { status: 'APPLICABLE', paths: applicablePaths },
        definition: {
          version: definition.definitionVersion,
          executor: definition.executor,
          candidateExecution: false,
          applicabilitySource: definition.applicabilitySource,
          applicabilitySourceBlob: riskPolicyBlob,
        },
      });
      continue;
    }

    let outcome;
    try {
      outcome = executor(definition, context, applicablePaths);
    } catch (error) {
      outcome = {
        status: 'FAIL',
        exitCode: 2,
        reason: 'TRUSTED_EXECUTOR_ERROR',
        diagnosticSha256: sha256(Buffer.from(String(error && error.message || error), 'utf8')),
      };
    }
    results.push({
      id,
      status: outcome.status,
      exitCode: outcome.exitCode,
      reason: outcome.reason,
      applicability: { status: 'APPLICABLE', paths: applicablePaths },
      definition: {
        version: definition.definitionVersion,
        executor: definition.executor,
        candidateExecution: false,
        applicabilitySource: definition.applicabilitySource,
        applicabilitySourceBlob: riskPolicyBlob,
      },
      files: outcome.files || [],
      contract: outcome.contract || null,
      diagnosticSha256: outcome.diagnosticSha256 || null,
    });
  }

  const requestedChecks = [...(plan.staticChecks || [])];
  const complete = results.length === requestedChecks.length;
  const staticOk = complete && results.every(result => result.status === 'PASS' || result.status === 'N/A');

  return {
    schema: REPORT_SCHEMA,
    repository: expectedRepository,
    changeId: plan.changeId,
    baseSha,
    targetSha,
    registry: {
      schema: registry.schema,
      version: registry.version,
      sourcePath: 'tools/change-static-check-registry.json',
      sourceBlob: registryBlob,
    },
    applicabilitySource: {
      path: 'tools/change-risk-policy.cjs',
      sourceBlob: riskPolicyBlob,
    },
    requestedChecks,
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
  const options = {
    root: process.cwd(),
    plan: null,
    baseSha: null,
    targetSha: null,
    repository: null,
    registryBlob: null,
    riskPolicyBlob: null,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (['--root', '--plan', '--base', '--head', '--repository', '--registry-blob', '--risk-policy-blob'].includes(arg)) {
      const value = argv[++i];
      if (!value) throw new Error(arg + ' requires a value');
      if (arg === '--root') options.root = value;
      if (arg === '--plan') options.plan = value;
      if (arg === '--base') options.baseSha = value;
      if (arg === '--head') options.targetSha = value;
      if (arg === '--repository') options.repository = value;
      if (arg === '--registry-blob') options.registryBlob = value;
      if (arg === '--risk-policy-blob') options.riskPolicyBlob = value;
    } else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error('unknown argument: ' + arg);
  }
  return options;
}

function usage() {
  return [
    'Usage:',
    '  node tools/change-static-check.cjs --plan <plan.json|-> --root <candidate-repo> --base <sha> --head <sha> --repository <owner/name> --registry-blob <sha> --risk-policy-blob <sha> [--json]',
    '',
    'Runs only base-owned allowlisted static definitions against exact candidate Git data.',
    'Candidate commands, modules, tests, and workflows are never executed.',
  ].join('\n');
}

function formatHuman(report) {
  const lines = [];
  lines.push('YUMANIWA TRUSTED STATIC CHECK v0.1');
  lines.push('Base:   ' + report.baseSha);
  lines.push('Target: ' + report.targetSha);
  lines.push('Registry: ' + escapeHumanText(report.registry.version));
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
      repository: options.repository,
      registryBlob: options.registryBlob,
      riskPolicyBlob: options.riskPolicyBlob,
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
  REGISTRY_SCHEMA,
  gitBlobSha1,
  readRegistry,
  collectTreeEntries,
  readTextBlob,
  runChangeOsContract,
  runNodeSyntax,
  executeStaticChecks,
  formatHuman,
  runCli,
};
