'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { verifyLock } = require('./change-plan-lock.cjs');
const { collectChangedPaths } = require('./change-scope-guard.cjs');
const { verifyRepositoryIdentity } = require('./change-risk-check.cjs');
const { getStaticCheck } = require('./change-static-checks.cjs');
const {
  computeProvenance,
  evaluateTrustedSnapshot,
  ciContext,
} = require('./change-provenance.cjs');

const EVIDENCE_SCHEMA = 'yumaniwa-mechanical-evidence/0.3';

function readJson(filePath, label) {
  const source = fs.readFileSync(path.resolve(filePath), 'utf8');
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(label + ' JSON parse failed: ' + error.message);
  }
}

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || 'git failed').trim());
  return result.stdout.trim();
}

function hashText(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function safeChildEnv() {
  const keep = [
    'PATH', 'HOME', 'USERPROFILE', 'TMPDIR', 'TMP', 'TEMP',
    'LANG', 'LC_ALL', 'SystemRoot', 'ComSpec', 'PATHEXT',
  ];
  const env = { CI: 'true' };
  for (const key of keep) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return env;
}

function measuredSpawn(command, args, cwd) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: safeChildEnv(),
    maxBuffer: 16 * 1024 * 1024,
  });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  return {
    argv: [command, ...args],
    exitCode: Number.isInteger(result.status) ? result.status : null,
    signal: result.signal || null,
    error: result.error ? String(result.error.message || result.error) : null,
    durationMs: Date.now() - started,
    stdoutSha256: hashText(stdout),
    stderrSha256: hashText(stderr),
    combinedSha256: hashText(stdout + '\n---stderr---\n' + stderr),
  };
}

function listTrustedChangeTests(trustedRoot, mode) {
  const testsDir = path.join(trustedRoot, 'tests');
  const names = fs.readdirSync(testsDir)
    .filter(name => /^test-change-.*\.cjs$/.test(name))
    .sort();
  if (mode === 'trusted-evidence-regression') {
    return names.filter(name =>
      /(?:provenance|evidence-runner|verification-check)/.test(name)
    );
  }
  return names;
}

function copyOverlayFiles(trustedRoot, targetRoot, mode) {
  const overlay = fs.mkdtempSync(path.join(os.tmpdir(), 'yumaniwa-change-evidence-'));
  const testsDir = path.join(overlay, 'tests');
  const toolsDir = path.join(overlay, 'tools');
  fs.mkdirSync(testsDir, { recursive: true });
  fs.mkdirSync(toolsDir, { recursive: true });

  const trustedTests = listTrustedChangeTests(trustedRoot, mode);
  for (const name of trustedTests) {
    fs.copyFileSync(path.join(trustedRoot, 'tests', name), path.join(testsDir, name));
  }

  const targetToolNames = fs.readdirSync(path.join(targetRoot, 'tools'))
    .filter(name => /^change-.*\.cjs$/.test(name))
    .sort();
  for (const name of targetToolNames) {
    fs.copyFileSync(path.join(targetRoot, 'tools', name), path.join(toolsDir, name));
  }

  return {
    overlay,
    tests: trustedTests.map(name => 'tests/' + name),
    tools: targetToolNames.map(name => 'tools/' + name),
  };
}

function runNodeSyntax(plan, targetRoot, headRef) {
  const diff = collectChangedPaths(targetRoot, plan.baseSha, headRef);
  const files = [...new Set(diff.paths)]
    .filter(file => /\.(?:js|cjs|mjs)$/i.test(file))
    .filter(file => fs.existsSync(path.join(targetRoot, file)))
    .sort();

  const executions = files.map(file =>
    measuredSpawn(process.execPath, ['--check', path.resolve(targetRoot, file)], targetRoot)
  );
  const failed = executions.some(item => item.exitCode !== 0 || item.error);
  return {
    status: failed ? 'fail' : 'pass',
    detail: files.length
      ? 'node --check measured for ' + files.length + ' changed JavaScript file(s)'
      : 'no changed JavaScript-family files require node --check',
    files,
    executions,
  };
}

function runTrustedRegression(trustedRoot, targetRoot, mode) {
  let overlayInfo;
  try {
    overlayInfo = copyOverlayFiles(trustedRoot, targetRoot, mode);
    if (!overlayInfo.tests.length) {
      return {
        status: 'fail',
        detail: 'trusted base contains no matching regression tests for ' + mode,
        files: [],
        executions: [],
      };
    }
    const execution = measuredSpawn(
      process.execPath,
      ['--test', ...overlayInfo.tests],
      overlayInfo.overlay
    );
    const failed = execution.exitCode !== 0 || execution.error;
    return {
      status: failed ? 'fail' : 'pass',
      detail: 'trusted base tests executed against candidate Change OS tools',
      files: [...overlayInfo.tests, ...overlayInfo.tools],
      executions: [execution],
    };
  } finally {
    if (overlayInfo && overlayInfo.overlay) {
      fs.rmSync(overlayInfo.overlay, { recursive: true, force: true });
    }
  }
}

function runStaticCheck(id, plan, trustedRoot, targetRoot, headRef) {
  const definition = getStaticCheck(id);
  if (!definition) {
    return {
      id,
      mode: 'unknown',
      status: 'fail',
      detail: 'static check ID is not registered in trusted base',
      files: [],
      executions: [],
    };
  }

  let result;
  if (definition.mode === 'node-syntax-diff') {
    result = runNodeSyntax(plan, targetRoot, headRef);
  } else if (
    definition.mode === 'trusted-change-regression' ||
    definition.mode === 'trusted-evidence-regression'
  ) {
    result = runTrustedRegression(trustedRoot, targetRoot, definition.mode);
  } else {
    result = {
      status: 'fail',
      detail: 'unsupported trusted static check mode: ' + definition.mode,
      files: [],
      executions: [],
    };
  }

  return {
    id,
    mode: definition.mode,
    description: definition.description,
    ...result,
  };
}

function buildMechanicalEvidence(options) {
  const trustedRoot = path.resolve(options.trustedRoot || path.join(__dirname, '..'));
  const targetRoot = path.resolve(options.root || process.cwd());
  const rawLock = readJson(options.lock, 'lock');
  const lockCheck = verifyLock(rawLock, options.previousLock ? readJson(options.previousLock, 'previous lock') : null);
  if (!lockCheck.ok) throw new Error('invalid Plan Lock:\n- ' + lockCheck.errors.join('\n- '));
  const plan = lockCheck.plan;

  const provenance = computeProvenance(trustedRoot);
  const trusted = evaluateTrustedSnapshot(provenance, plan.baseSha);
  if (!trusted.ok) throw new Error('untrusted Change OS snapshot:\n- ' + trusted.errors.join('\n- '));

  const repoCheck = verifyRepositoryIdentity(targetRoot, plan.repository);
  if (!repoCheck.ok) {
    throw new Error('target repository mismatch: expected ' + repoCheck.expected + ' but found ' + repoCheck.actual);
  }

  const headRef = options.head || 'HEAD';
  const verifiedSha = git(targetRoot, ['rev-parse', headRef]).toLowerCase();
  const verifiedTreeSha = git(targetRoot, ['rev-parse', headRef + '^{tree}']).toLowerCase();
  const ancestor = spawnSync('git', ['-C', targetRoot, 'merge-base', '--is-ancestor', plan.baseSha, verifiedSha], { encoding: 'utf8' });
  if (ancestor.status !== 0) throw new Error('locked baseSha is not an ancestor of verified target');

  const ci = ciContext(verifiedSha);
  if (ci.provider === 'github-actions' && ci.targetShaFromEnv && !ci.targetShaMatchesEnv) {
    throw new Error('YUMANIWA_TARGET_SHA does not match verified target');
  }

  const checks = (plan.staticChecks || []).map(id =>
    runStaticCheck(id, plan, trustedRoot, targetRoot, headRef)
  );
  const mechanicalState = checks.every(item => item.status === 'pass') ? 'PASS' : 'FAIL';

  return {
    schema: EVIDENCE_SCHEMA,
    changeId: plan.changeId,
    planDigest: lockCheck.planDigest,
    planRevision: plan.revision,
    repository: plan.repository,
    baseSha: plan.baseSha,
    verifiedSha,
    verifiedTreeSha,
    generatedAt: new Date().toISOString(),
    runner: {
      osSourceSha: provenance.headSha,
      osTreeSha: provenance.treeSha,
      clean: provenance.clean,
      provenanceDigest: provenance.bundleDigest,
      provenanceFiles: provenance.files,
      ci,
    },
    checks,
    mechanicalState,
    exitCode: mechanicalState === 'PASS' ? 0 : 1,
  };
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    trustedRoot: path.join(__dirname, '..'),
    lock: null,
    previousLock: null,
    head: 'HEAD',
    output: null,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (
      arg === '--root' ||
      arg === '--trusted-root' ||
      arg === '--lock' ||
      arg === '--previous-lock' ||
      arg === '--head' ||
      arg === '--output'
    ) {
      const value = argv[++i];
      if (!value) throw new Error(arg + ' requires a value');
      if (arg === '--previous-lock') options.previousLock = value;
      else if (arg === '--trusted-root') options.trustedRoot = value;
      else options[arg.slice(2)] = value;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  return options;
}

function usage() {
  return [
    'Usage:',
    '  node tools/change-evidence-runner.cjs --lock <plan-lock.json> --root <target-checkout>',
    '    [--trusted-root <locked-base-checkout>] [--head <ref>] [--output <report.json>] [--json]',
    '',
    'Runs registered static checks from a clean trusted Change OS checkout whose HEAD equals the locked baseSha.',
    'Static PASS is measured from command exit codes; free-form evidence text is not accepted as a substitute.',
  ].join('\n');
}

function formatHuman(report) {
  const lines = [];
  lines.push('YUMANIWA MECHANICAL EVIDENCE v0.3');
  lines.push('Target: ' + report.verifiedSha);
  lines.push('Tree:   ' + report.verifiedTreeSha);
  lines.push('OS:     ' + report.runner.osSourceSha);
  lines.push('OS provenance: ' + report.runner.provenanceDigest);
  lines.push('');
  for (const item of report.checks) {
    lines.push(item.status.toUpperCase() + ' ' + item.id + ' [' + item.mode + '] — ' + item.detail);
  }
  lines.push('');
  lines.push('Mechanical: ' + report.mechanicalState);
  if (report.runner.ci.logRef) lines.push('CI: ' + report.runner.ci.logRef);
  return lines.join('\n');
}

function runCli(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(usage() + '\n');
      return 0;
    }
    if (!options.lock) throw new Error('--lock is required');
    const report = buildMechanicalEvidence(options);
    const serialized = JSON.stringify(report, null, 2) + '\n';
    if (options.output) fs.writeFileSync(path.resolve(options.output), serialized);
    process.stdout.write((options.json ? serialized.trimEnd() : formatHuman(report)) + '\n');
    return report.exitCode;
  } catch (error) {
    process.stderr.write('Evidence runner error: ' + error.message + '\n');
    process.stderr.write(usage() + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  EVIDENCE_SCHEMA,
  safeChildEnv,
  measuredSpawn,
  listTrustedChangeTests,
  copyOverlayFiles,
  runNodeSyntax,
  runTrustedRegression,
  runStaticCheck,
  buildMechanicalEvidence,
  runCli,
};
