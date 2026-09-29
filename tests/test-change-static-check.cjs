'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const registry = require('../tools/change-static-check-registry.cjs');
const {
  gitBlobSha1,
  readRegistry,
  selectExecutionPaths,
  ensureRiskApplicabilityCovered,
  executeStaticChecks,
} = require('../tools/change-static-check.cjs');

const ROOT = path.join(__dirname, '..');
const REGISTRY_BLOB = gitBlobSha1(fs.readFileSync(path.join(ROOT, 'tools', 'change-static-check-registry.cjs')));
const EXECUTOR_BLOB = gitBlobSha1(fs.readFileSync(path.join(ROOT, 'tools', 'change-static-check.cjs')));
const RISK_POLICY_BLOB = gitBlobSha1(fs.readFileSync(path.join(ROOT, 'tools', 'change-risk-policy.cjs')));

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function write(root, filePath, content) {
  const target = path.join(root, ...filePath.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function initRepo(seed = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yumaniwa-static-'));
  git(root, ['init', '-q']);
  git(root, ['config', 'user.name', 'Static Test']);
  git(root, ['config', 'user.email', 'static@example.invalid']);
  git(root, ['remote', 'add', 'origin', 'https://github.com/example/test.git']);
  write(root, 'README.md', 'base\n');
  for (const [filePath, content] of Object.entries(seed)) write(root, filePath, content);
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', 'base']);
  return { root, baseSha: git(root, ['rev-parse', 'HEAD']) };
}

function commitAll(root, message = 'candidate') {
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', message]);
  return git(root, ['rev-parse', 'HEAD']);
}

function plan(baseSha, staticChecks, allowedPaths, overrides = {}) {
  return {
    schema: 'yumaniwa-change-plan/0.2',
    changeId: 'static-test-change',
    revision: 0,
    previousPlanDigest: null,
    revisionReason: null,
    status: 'READY',
    repository: 'example/test',
    change: 'trusted static test',
    planLevel: 'lite',
    classes: ['CONTENT'],
    authority: ['Standard'],
    environment: 'staging',
    baseSha,
    canonicalSources: [allowedPaths[0] || 'README.md'],
    allowedPaths,
    conditionalPaths: [],
    forbiddenPaths: [],
    expectedChanges: ['exercise trusted static executor'],
    staticChecks,
    manualChecks: [],
    manualCheckExemptionReason: 'test fixture',
    impactChecks: [],
    impactExclusions: [],
    promotion: 'none',
    ...overrides,
  };
}

function run(root, baseSha, targetSha, rawPlan, overrides = {}) {
  return executeStaticChecks({
    root,
    plan: rawPlan,
    baseSha,
    targetSha,
    repository: 'example/test',
    registryBlob: REGISTRY_BLOB,
    executorBlob: EXECUTOR_BLOB,
    riskPolicyBlob: RISK_POLICY_BLOB,
    ...overrides,
  });
}

function changeOsContractSeed() {
  const seed = {};
  const definition = registry.getStaticCheckDefinition('change-operations-regression');
  for (const requirement of definition.requirements) {
    const prefix = /\.(?:js|cjs|mjs)$/.test(requirement.path) ? '// ' : '';
    seed[requirement.path] = requirement.contains.map(value => prefix + value).join('\n') + '\n';
  }
  return seed;
}

function seedChangeOsContract(root) {
  for (const [filePath, content] of Object.entries(changeOsContractSeed())) {
    write(root, filePath, content);
  }
}

test('registry is fixed to two inert trusted definitions with no command fields', () => {
  const parsed = readRegistry();
  assert.equal(parsed.schema, 'yumaniwa-trusted-static-check-registry/0.1');
  assert.deepEqual(Object.keys(parsed.checks).sort(), ['change-operations-regression', 'node-syntax']);
  const serialized = JSON.stringify(parsed);
  for (const forbidden of ['"command"', '"commands"', '"script"', '"scripts"', '"shell"', '"argv"', '"args"', '"cwd"', '"env"']) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  for (const definition of Object.values(parsed.checks)) {
    assert.equal(definition.candidateExecution, false);
  }
});

test('unknown command-like static ID fails explicitly and cannot disappear', () => {
  const { root, baseSha } = initRepo();
  write(root, 'probe.js', 'throw new Error("candidate must not execute");\n');
  const targetSha = commitAll(root);
  const report = run(root, baseSha, targetSha, plan(baseSha, ['node evil.js'], ['probe.js']));
  assert.equal(report.staticState, 'FAIL');
  assert.equal(report.staticOk, false);
  assert.equal(report.results.length, 1);
  assert.equal(report.results[0].id, 'node evil.js');
  assert.equal(report.results[0].reason, 'UNKNOWN_STATIC_CHECK_ID');
  assert.equal(report.results[0].exitCode, 2);
});

test('node-syntax parses top-level throwing code without executing it', () => {
  const { root, baseSha } = initRepo();
  write(root, 'nested/deep/probe.js', 'throw new Error("would fail if executed");\n');
  const targetSha = commitAll(root);
  const report = run(root, baseSha, targetSha, plan(baseSha, ['node-syntax'], ['nested/deep/probe.js']));
  assert.equal(report.staticState, 'PASS');
  assert.equal(report.results[0].status, 'PASS');
  assert.equal(report.results[0].files[0].path, 'nested/deep/probe.js');
  assert.equal(report.results[0].files[0].syntaxMode, 'commonjs');
});

test('node-syntax uses trusted module mode for mjs', () => {
  const { root, baseSha } = initRepo();
  write(root, 'module.mjs', 'import fs from "node:fs"; export default fs;\n');
  const targetSha = commitAll(root);
  const report = run(root, baseSha, targetSha, plan(baseSha, ['node-syntax'], ['module.mjs']));
  assert.equal(report.staticState, 'PASS');
  assert.equal(report.results[0].files[0].status, 'PASS');
  assert.equal(report.results[0].files[0].syntaxMode, 'module');
});

test('node-syntax failure stores only hashed diagnostics, not candidate source text', () => {
  const { root, baseSha } = initRepo();
  write(root, 'bad.js', 'const x = ; // FAKE PASS \\u202eBIDI\n');
  const targetSha = commitAll(root);
  const report = run(root, baseSha, targetSha, plan(baseSha, ['node-syntax'], ['bad.js']));
  assert.equal(report.staticState, 'FAIL');
  const file = report.results[0].files[0];
  assert.equal(file.status, 'FAIL');
  assert.match(file.diagnosticSha256, /^[0-9a-f]{64}$/);
  assert.ok(file.diagnosticBytes > 0);
  assert.equal(JSON.stringify(report).includes('FAKE PASS'), false);
});

test('deleted node source is explicit N/A, never PASS', () => {
  const { root, baseSha } = initRepo({ 'gone.js': 'const gone = true;\n' });
  fs.unlinkSync(path.join(root, 'gone.js'));
  const targetSha = commitAll(root);
  const report = run(root, baseSha, targetSha, plan(baseSha, ['node-syntax'], ['gone.js']));
  assert.equal(report.staticState, 'NOT_APPLICABLE');
  assert.equal(report.staticOk, true);
  assert.equal(report.results[0].status, 'N/A');
  assert.equal(report.results[0].reason, 'NO_LIVE_APPLICABLE_TARGET');
  assert.equal(report.results[0].files[0].reason, 'DELETED_AT_TARGET');
});

test('symlink node source is rejected as a non-regular candidate blob', t => {
  const { root, baseSha } = initRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'target.txt', 'not javascript\n');
  fs.symlinkSync('target.txt', path.join(root, 'link.js'));
  const targetSha = commitAll(root);
  const report = run(root, baseSha, targetSha, plan(baseSha, ['node-syntax'], ['target.txt', 'link.js']));
  assert.equal(report.staticState, 'FAIL');
  const file = report.results[0].files.find(item => item.path === 'link.js');
  assert.ok(file);
  assert.equal(file.status, 'FAIL');
  assert.equal(file.reason, 'NON_REGULAR_BLOB');
});

test('change-operations-regression reads exact target blobs as text only', () => {
  const { root, baseSha } = initRepo();
  seedChangeOsContract(root);
  const targetSha = commitAll(root);
  const allowed = [...new Set(registry.getStaticCheckDefinition('change-operations-regression').requirements.map(item => item.path))];
  const report = run(root, baseSha, targetSha, plan(baseSha, ['change-operations-regression'], allowed));
  assert.equal(report.staticState, 'PASS');
  assert.equal(report.results[0].status, 'PASS');
  assert.ok(report.results[0].files.every(item => item.status === 'PASS'));
});

test('missing durable Change OS invariant fails with hashes instead of raw missing literals', () => {
  const { root, baseSha } = initRepo();
  seedChangeOsContract(root);
  write(root, '.github/workflows/change-pr-gate.yml', 'pull_request_target:\n');
  const targetSha = commitAll(root);
  const allowed = [...new Set(registry.getStaticCheckDefinition('change-operations-regression').requirements.map(item => item.path))];
  const report = run(root, baseSha, targetSha, plan(baseSha, ['change-operations-regression'], allowed));
  assert.equal(report.staticState, 'FAIL');
  const file = report.results[0].files.find(item => item.path === '.github/workflows/change-pr-gate.yml');
  assert.ok(file.missingLiteralCount > 0);
  assert.ok(file.missingLiteralSha256.every(value => /^[0-9a-f]{64}$/.test(value)));
});

test('PASS plus trusted N/A is represented as PASS_WITH_NA, not all-PASS', () => {
  const { root, baseSha } = initRepo(changeOsContractSeed());
  write(root, 'README.md', 'changed only as data\n');
  const targetSha = commitAll(root);
  const report = run(
    root,
    baseSha,
    targetSha,
    plan(baseSha, ['change-operations-regression', 'node-syntax'], ['README.md'])
  );
  assert.equal(report.staticState, 'PASS_WITH_NA');
  assert.equal(report.staticOk, true);
  assert.equal(report.results.find(item => item.id === 'change-operations-regression').status, 'PASS');
  assert.equal(report.results.find(item => item.id === 'node-syntax').status, 'N/A');
});

test('all requested IDs receive exactly one result and one failure blocks the report', () => {
  const { root, baseSha } = initRepo();
  write(root, 'probe.js', 'const ok = true;\n');
  const targetSha = commitAll(root);
  const report = run(root, baseSha, targetSha, plan(baseSha, ['node-syntax', 'node evil.js'], ['probe.js']));
  assert.deepEqual(report.results.map(item => item.id), ['node-syntax', 'node evil.js']);
  assert.equal(report.complete, true);
  assert.equal(report.staticState, 'FAIL');
});

test('risk-required applicability must be covered by the trusted execution selector', () => {
  const aligned = ensureRiskApplicabilityCovered('node-syntax', ['a.js'], ['a.js', 'b.js']);
  assert.equal(aligned.ok, true);
  const mismatch = ensureRiskApplicabilityCovered('node-syntax', ['a.js'], ['b.js']);
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.reason, 'TRUSTED_APPLICABILITY_MISMATCH');
  assert.equal(mismatch.missingCount, 1);
  assert.match(mismatch.missingPathDigests[0], /^[0-9a-f]{64}$/);
});

test('selector treats command-like candidate strings only as path data', () => {
  const definition = registry.getStaticCheckDefinition('node-syntax');
  assert.deepEqual(
    selectExecutionPaths(definition, ['node evil.js', 'ok.js', 'x.sh', 'deep/test.cjs', 'module.mjs']),
    ['deep/test.cjs', 'module.mjs', 'node evil.js', 'ok.js']
  );
});

test('stale or nonexistent exact target SHA is rejected before static execution', () => {
  const { root, baseSha } = initRepo();
  write(root, 'probe.js', 'const ok = true;\n');
  commitAll(root);
  assert.throws(() => run(
    root,
    baseSha,
    'd'.repeat(40),
    plan(baseSha, ['node-syntax'], ['probe.js'])
  ));
});

test('locked base mismatch is rejected before static execution', () => {
  const { root, baseSha } = initRepo();
  write(root, 'probe.js', 'const ok = true;\n');
  const targetSha = commitAll(root);
  const rawPlan = plan('a'.repeat(40), ['node-syntax'], ['probe.js']);
  assert.throws(() => run(root, baseSha, targetSha, rawPlan));
});

test('trusted registry, executor, and Risk Policy blob mismatches fail closed', () => {
  const { root, baseSha } = initRepo();
  write(root, 'probe.js', 'const ok = true;\n');
  const targetSha = commitAll(root);
  const rawPlan = plan(baseSha, ['node-syntax'], ['probe.js']);
  assert.throws(() => run(root, baseSha, targetSha, rawPlan, { registryBlob: 'a'.repeat(40) }));
  assert.throws(() => run(root, baseSha, targetSha, rawPlan, { executorBlob: 'b'.repeat(40) }));
  assert.throws(() => run(root, baseSha, targetSha, rawPlan, { riskPolicyBlob: 'c'.repeat(40) }));
});

test('candidate checkout repository identity mismatch fails closed', () => {
  const { root, baseSha } = initRepo();
  git(root, ['remote', 'set-url', 'origin', 'https://github.com/example/other.git']);
  write(root, 'probe.js', 'const ok = true;\n');
  const targetSha = commitAll(root);
  assert.throws(() => run(root, baseSha, targetSha, plan(baseSha, ['node-syntax'], ['probe.js'])));
});
