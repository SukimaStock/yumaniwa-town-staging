'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROVENANCE_SCHEMA = 'yumaniwa-change-os-provenance/0.3';

const TRUSTED_OS_FILES = Object.freeze([
  'tools/change-plan-lock.cjs',
  'tools/change-scope-guard.cjs',
  'tools/change-risk-policy.cjs',
  'tools/change-risk-check.cjs',
  'tools/change-impact-rules.cjs',
  'tools/change-impact-check.cjs',
  'tools/change-static-checks.cjs',
  'tools/change-evidence-runner.cjs',
  'tools/change-verification-check.cjs',
  'tools/change-provenance.cjs',
]);

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'git failed').trim());
  }
  return result.stdout;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fileDigest(root, relativePath) {
  const full = path.resolve(root, relativePath);
  const data = fs.readFileSync(full);
  return sha256(data);
}

function parsePorcelain(source) {
  return source.split(/\r?\n/).filter(Boolean);
}

function computeProvenance(root, options = {}) {
  const repoRoot = path.resolve(root || process.cwd());
  git(repoRoot, ['rev-parse', '--show-toplevel']);
  const headSha = git(repoRoot, ['rev-parse', 'HEAD']).trim().toLowerCase();
  const treeSha = git(repoRoot, ['rev-parse', 'HEAD^{tree}']).trim().toLowerCase();
  const dirtyEntries = parsePorcelain(git(repoRoot, ['status', '--porcelain=v1', '--untracked-files=all']));

  const files = options.files || TRUSTED_OS_FILES;
  const fileDigests = {};
  const missingFiles = [];
  for (const relativePath of [...files].sort()) {
    const normalized = relativePath.replace(/\\/g, '/');
    try {
      fileDigests[normalized] = fileDigest(repoRoot, normalized);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        missingFiles.push(normalized);
      } else {
        throw error;
      }
    }
  }

  const bundleSource = Object.entries(fileDigests)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, digest]) => file + ':' + digest)
    .join('\n');

  return {
    schema: PROVENANCE_SCHEMA,
    root: repoRoot,
    headSha,
    treeSha,
    clean: dirtyEntries.length === 0,
    dirtyEntries,
    missingFiles,
    files: fileDigests,
    bundleDigest: sha256(Buffer.from(bundleSource, 'utf8')),
  };
}

function evaluateTrustedSnapshot(snapshot, expectedSha) {
  const errors = [];
  const expected = String(expectedSha || '').trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expected)) errors.push('expectedSha must be a full commit SHA');
  if (snapshot.headSha !== expected) {
    errors.push('trusted OS HEAD ' + snapshot.headSha + ' does not equal locked baseSha ' + expected);
  }
  if (!snapshot.clean) {
    errors.push('trusted OS checkout is dirty: ' + snapshot.dirtyEntries.join(' | '));
  }
  if (snapshot.missingFiles.length) {
    errors.push('trusted OS provenance files missing: ' + snapshot.missingFiles.join(', '));
  }
  return {
    ok: errors.length === 0,
    errors,
  };
}

function ciContext(targetSha) {
  const runId = String(process.env.GITHUB_RUN_ID || '').trim();
  const server = String(process.env.GITHUB_SERVER_URL || 'https://github.com').replace(/\/+$/, '');
  const repository = String(process.env.GITHUB_REPOSITORY || '').trim();
  const targetFromEnv = String(process.env.YUMANIWA_TARGET_SHA || '').trim().toLowerCase();
  const target = String(targetSha || '').trim().toLowerCase();
  const enabled = Boolean(runId);

  return {
    provider: enabled ? 'github-actions' : 'local',
    runId: runId || null,
    runAttempt: String(process.env.GITHUB_RUN_ATTEMPT || '').trim() || null,
    job: String(process.env.GITHUB_JOB || '').trim() || null,
    workflow: String(process.env.GITHUB_WORKFLOW || '').trim() || null,
    eventName: String(process.env.GITHUB_EVENT_NAME || '').trim() || null,
    repository: repository || null,
    targetSha: target,
    targetShaFromEnv: targetFromEnv || null,
    targetShaMatchesEnv: targetFromEnv ? targetFromEnv === target : null,
    logRef: enabled && repository
      ? server + '/' + repository + '/actions/runs/' + runId
      : null,
  };
}

function parseArgs(argv) {
  const options = { root: process.cwd(), expectedSha: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--root' || arg === '--expected-sha') {
      const value = argv[++i];
      if (!value) throw new Error(arg + ' requires a value');
      if (arg === '--root') options.root = value;
      else options.expectedSha = value;
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
    '  node tools/change-provenance.cjs --root <trusted-os-checkout> --expected-sha <locked-base-sha> [--json]',
    '',
    'Checks that the trusted Change OS checkout is clean, on the locked base SHA,',
    'and records content digests for the checker/rule implementation.',
  ].join('\n');
}

function runCli(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(usage() + '\n');
      return 0;
    }
    if (!options.expectedSha) throw new Error('--expected-sha is required');
    const snapshot = computeProvenance(options.root);
    const evaluated = evaluateTrustedSnapshot(snapshot, options.expectedSha);
    const report = { ...snapshot, trusted: evaluated.ok, errors: evaluated.errors };
    process.stdout.write((options.json ? JSON.stringify(report, null, 2) : [
      'YUMANIWA CHANGE OS PROVENANCE v0.3',
      'HEAD: ' + snapshot.headSha,
      'Tree: ' + snapshot.treeSha,
      'Clean: ' + snapshot.clean,
      'Bundle: ' + snapshot.bundleDigest,
      'Trusted: ' + evaluated.ok,
      ...(evaluated.errors.map(x => 'ERROR: ' + x)),
    ].join('\n')) + '\n');
    return evaluated.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write('Provenance error: ' + error.message + '\n');
    process.stderr.write(usage() + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  PROVENANCE_SCHEMA,
  TRUSTED_OS_FILES,
  git,
  sha256,
  fileDigest,
  computeProvenance,
  evaluateTrustedSnapshot,
  ciContext,
  runCli,
};
