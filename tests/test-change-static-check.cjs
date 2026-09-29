'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  REGISTRY_SCHEMA,
  CHECKS,
  getStaticCheckDefinition,
} = require('../tools/change-static-check-registry.cjs');
const {
  executeStaticChecks,
} = require('../tools/change-static-check.cjs');

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'git failed');
  return result.stdout.trim();
}

function write(root, filePath, content) {
  const target = path.join(root, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function initRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yumaniwa-static-'));
  git(root, ['init', '-q']);
  git(root, ['config', 'user.name', 'Test']);
  git(root, ['config', 'user.email', 'test@example.invalid']);
  write(root, 'README.md', 'base\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-qm', 'base']);
  return { root, baseSha: git(root, ['rev-parse', 'HEAD']) };
}

function commitAll(root, message = 'candidate') {
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', message]);
  return git(root, ['rev-parse', 'HEAD']);
}

function plan(baseSha, staticChecks, overrides = {}) {
  return {
    schema: 'yumaniwa-change-plan/0.2',
    changeId: 'static-test-change',
    revision: 0,
    previousPlanDigest: null,
    revisionReason: null,
    status: 'READY',
    repository: 'example/repo',
    change: 'static test',
    planLevel: 'lite',
    classes: ['CONTENT'],
    authority: ['Standard'],
    environment: 'staging',
    baseSha,
    canonicalSources: ['README.md'],
    allowedPaths: ['README.md', 'probe.js', 'bad.js', '.github/workflows/change-pr-gate.yml', '.github/workflows/change-verification.yml', 'tools/change-risk-policy.cjs'],
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

test('registry exposes only fixed data definitions and no candidate command field', () => {
  assert.equal(REGISTRY_SCHEMA, 'yumaniwa-trusted-static-check-registry/0.1');
  assert.deepEqual(Object.keys(CHECKS).sort(), ['change-operations-regression', 'node-syntax']);
  for (const definition of Object.values(CHECKS)) {
    assert.equal(definition.candidateExecution, false);
    assert.equal(Object.hasOwn(definition, 'command'), false);
    assert.equal(Object.hasOwn(definition, 'script'), false);
  }
});

test('unknown command-like static check ID fails explicitly without execution', () => {
  const { root, baseSha } = initRepo();
  write(root, 'probe.js', 'throw new Error("candidate code must not run")\n');
  const targetSha = commitAll(root);
  const report = executeStaticChecks({ root, plan: plan(baseSha, ['node evil.js']), baseSha, targetSha });
  assert.equal(report.staticOk, false);
  assert.equal(report.results.length, 1);
  assert.equal(report.results[0].reason, 'UNKNOWN_STATIC_CHECK_ID');
  assert.equal(report.results[0].exitCode, 2);
});

test('node-syntax parses exact candidate Git blob without executing top-level code', () => {
  const { root, baseSha } = initRepo();
  write(root, 'probe.js', 'throw new Error("would fail if executed")\n');
  const targetSha = commitAll(root);
  const report = executeStaticChecks({ root, plan: plan(baseSha, ['node-syntax']), baseSha, targetSha });
  assert.equal(report.staticOk, true);
  assert.equal(report.results[0].status, 'PASS');
  assert.equal(report.results[0].checkedFiles.length, 1);
  assert.equal(report.results[0].checkedFiles[0].path, 'probe.js');
});

test('node-syntax fails on invalid syntax without exposing raw candidate diagnostics in evidence', () => {
  const { root, baseSha } = initRepo();
  write(root, 'bad.js', 'const x = ; // FAKE PASS \\u202eBIDI\n');
  const targetSha = commitAll(root);
  const report = executeStaticChecks({ root, plan: plan(baseSha, ['node-syntax']), baseSha, targetSha });
  assert.equal(report.staticOk, false);
  assert.equal(report.results[0].reason, 'NODE_SYNTAX_FAILED');
  const file = report.results[0].checkedFiles[0];
  assert.equal(file.status, 'FAIL');
  assert.match(file.diagnosticSha256, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(report).includes('FAKE PASS'), false);
});

test('node-syntax cannot PASS when no changed JavaScript is applicable', () => {
  const { root, baseSha } = initRepo();
  write(root, 'README.md', 'changed\n');
  const targetSha = commitAll(root);
  const report = executeStaticChecks({ root, plan: plan(baseSha, ['node-syntax']), baseSha, targetSha });
  assert.equal(report.staticOk, false);
  assert.equal(report.results[0].reason, 'NO_APPLICABLE_CHANGED_JAVASCRIPT');
});

test('change-operations-regression reads fixed candidate blobs as text and does not execute them', () => {
  const { root, baseSha } = initRepo();
  const definition = getStaticCheckDefinition('change-operations-regression');
  for (const requirement of definition.requirements) {
    write(root, requirement.path, requirement.contains.join('\n') + '\n');
  }
  const targetSha = commitAll(root);
  const report = executeStaticChecks({ root, plan: plan(baseSha, ['change-operations-regression']), baseSha, targetSha });
  assert.equal(report.staticOk, true);
  assert.equal(report.results[0].status, 'PASS');
  assert.ok(report.results[0].details.every(item => item.status === 'PASS'));
});

test('all requested checks receive a result and one unknown ID blocks overall PASS', () => {
  const { root, baseSha } = initRepo();
  write(root, 'probe.js', 'const ok = true;\n');
  const targetSha = commitAll(root);
  const report = executeStaticChecks({ root, plan: plan(baseSha, ['node-syntax', 'node evil.js']), baseSha, targetSha });
  assert.equal(report.results.length, 2);
  assert.deepEqual(report.results.map(item => item.id), ['node-syntax', 'node evil.js']);
  assert.equal(report.complete, true);
  assert.equal(report.staticOk, false);
});

test('exact target SHA mismatch or stale target is rejected before trusted execution', () => {
  const { root, baseSha } = initRepo();
  write(root, 'probe.js', 'const ok = true;\n');
  commitAll(root);
  assert.throws(() => executeStaticChecks({
    root,
    plan: plan(baseSha, ['node-syntax']),
    baseSha,
    targetSha: 'd'.repeat(40),
  }));
});
