'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  gitBlobSha1,
  readRegistry,
  executeStaticChecks,
  formatHuman,
} = require('../tools/change-static-check.cjs');

const TOOL_ROOT = path.join(__dirname, '..', 'tools');
const REGISTRY_FILE = path.join(TOOL_ROOT, 'change-static-check-registry.json');
const RISK_POLICY_FILE = path.join(TOOL_ROOT, 'change-risk-policy.cjs');
const REGISTRY_BLOB = gitBlobSha1(fs.readFileSync(REGISTRY_FILE));
const RISK_POLICY_BLOB = gitBlobSha1(fs.readFileSync(RISK_POLICY_FILE));
const REPOSITORY = 'example/repo';

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout.trim();
}

function write(root, filePath, content) {
  const target = path.join(root, ...filePath.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function initRepo(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yumaniwa-static-'));
  git(root, ['init', '-q']);
  git(root, ['config', 'user.name', 'Static Test']);
  git(root, ['config', 'user.email', 'static@example.invalid']);

  write(root, 'README.md', 'base\n');

  if (options.withContract !== false) {
    const registry = readRegistry();
    const definition = registry.checks['change-operations-regression'];
    for (const requirement of definition.requirements) {
      write(root, requirement.path, requirement.contains.join('\n') + '\n');
    }
  }

  if (options.extraBaseFiles) {
    for (const [filePath, content] of Object.entries(options.extraBaseFiles)) {
      write(root, filePath, content);
    }
  }

  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', 'base']);
  return { root, baseSha: git(root, ['rev-parse', 'HEAD']) };
}

function commitAll(root, message = 'candidate') {
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', message]);
  return git(root, ['rev-parse', 'HEAD']);
}

function plan(baseSha, staticChecks, changedPath = 'README.md', overrides = {}) {
  return {
    schema: 'yumaniwa-change-plan/0.2',
    changeId: 'trusted-static-test',
    revision: 0,
    previousPlanDigest: null,
    revisionReason: null,
    status: 'READY',
    repository: REPOSITORY,
    change: 'trusted static fixture',
    planLevel: 'lite',
    classes: ['CONTENT'],
    authority: ['Standard'],
    environment: 'staging',
    baseSha,
    canonicalSources: [changedPath],
    allowedPaths: [changedPath],
    conditionalPaths: [],
    forbiddenPaths: [],
    expectedChanges: ['exercise trusted static evidence'],
    staticChecks,
    manualChecks: [],
    manualCheckExemptionReason: 'test fixture',
    impactChecks: [],
    impactExclusions: [],
    promotion: 'none',
    ...overrides,
  };
}

function execute(root, baseSha, targetSha, rawPlan, overrides = {}) {
  return executeStaticChecks({
    root,
    plan: rawPlan,
    baseSha,
    targetSha,
    repository: REPOSITORY,
    registryBlob: REGISTRY_BLOB,
    riskPolicyBlob: RISK_POLICY_BLOB,
    ...overrides,
  });
}

test('registry is data-only and exposes no command/script fields', () => {
  const registry = readRegistry();
  assert.equal(registry.schema, 'yumaniwa-trusted-static-check-registry/0.1');
  assert.deepEqual(Object.keys(registry.checks).sort(), ['change-operations-regression', 'node-syntax']);
  for (const definition of Object.values(registry.checks)) {
    assert.equal(definition.candidateExecution, false);
    for (const key of ['command', 'commands', 'script', 'scripts', 'shell', 'argv', 'args']) {
      assert.equal(Object.hasOwn(definition, key), false, key + ' must not exist');
    }
  }
});

test('unknown command-like ID fails explicitly and cannot select an executor', t => {
  const { root, baseSha } = initRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'README.md', 'changed\n');
  const targetSha = commitAll(root);
  const report = execute(root, baseSha, targetSha, plan(baseSha, ['node evil.js']));
  assert.equal(report.staticOk, false);
  assert.equal(report.results.length, 1);
  assert.equal(report.results[0].status, 'FAIL');
  assert.equal(report.results[0].reason, 'UNKNOWN_STATIC_CHECK_ID');
  assert.equal(report.results[0].exitCode, 2);
  assert.equal(report.results[0].definition, null);
});

test('candidate copy of registry cannot authorize an unknown ID', t => {
  const { root, baseSha } = initRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'tools/change-static-check-registry.json', JSON.stringify({
    schema: 'yumaniwa-trusted-static-check-registry/0.1',
    version: 'evil',
    checks: {
      'node evil.js': {
        definitionVersion: '999',
        executor: 'node-syntax',
        candidateExecution: false,
      },
    },
  }));
  const targetSha = commitAll(root);
  const rawPlan = plan(baseSha, ['node evil.js'], 'tools/change-static-check-registry.json');
  const report = execute(root, baseSha, targetSha, rawPlan);
  assert.equal(report.staticOk, false);
  assert.equal(report.results[0].reason, 'UNKNOWN_STATIC_CHECK_ID');
});

test('node-syntax parses top-level candidate code without executing it', t => {
  const { root, baseSha } = initRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'probe.js', 'process.exit(99); throw new Error("must not execute");\n');
  const targetSha = commitAll(root);
  const report = execute(root, baseSha, targetSha, plan(baseSha, ['node-syntax'], 'probe.js'));
  assert.equal(report.staticOk, true);
  assert.equal(report.results[0].status, 'PASS');
  assert.equal(report.results[0].exitCode, 0);
  assert.equal(report.results[0].files.length, 1);
  assert.equal(report.results[0].files[0].path, 'probe.js');
});

test('node-syntax invalid source fails without storing raw diagnostic/source text', t => {
  const { root, baseSha } = initRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'bad.js', 'const x = ; // FAKE PASS ‮BIDI\n');
  const targetSha = commitAll(root);
  const report = execute(root, baseSha, targetSha, plan(baseSha, ['node-syntax'], 'bad.js'));
  assert.equal(report.staticOk, false);
  assert.equal(report.results[0].status, 'FAIL');
  assert.equal(report.results[0].reason, 'NODE_SYNTAX_FAILED');
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes('FAKE PASS'), false);
  assert.equal(serialized.includes('‮'), false);
  assert.match(report.results[0].files[0].diagnosticSha256, /^[0-9a-f]{64}$/);
});

test('node-syntax with no applicable changed JavaScript is trusted N/A, never PASS', t => {
  const { root, baseSha } = initRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'README.md', 'changed\n');
  const targetSha = commitAll(root);
  const report = execute(root, baseSha, targetSha, plan(baseSha, ['node-syntax']));
  assert.equal(report.staticOk, true);
  assert.equal(report.results[0].status, 'N/A');
  assert.equal(report.results[0].reason, 'NOT_APPLICABLE');
  assert.deepEqual(report.results[0].applicability.paths, []);
});

test('deleted JavaScript target is N/A rather than a fake syntax PASS', t => {
  const { root, baseSha } = initRepo({ extraBaseFiles: { 'old.js': 'const old = true;\n' } });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.unlinkSync(path.join(root, 'old.js'));
  const targetSha = commitAll(root);
  const report = execute(root, baseSha, targetSha, plan(baseSha, ['node-syntax'], 'old.js'));
  assert.equal(report.staticOk, true);
  assert.equal(report.results[0].status, 'N/A');
  assert.equal(report.results[0].reason, 'NO_LIVE_APPLICABLE_TARGET');
  assert.equal(report.results[0].files[0].status, 'N/A');
  assert.equal(report.results[0].files[0].reason, 'DELETED_AT_TARGET');
});

test('change-operations-regression passes fixed structural contract on exact target blobs', t => {
  const { root, baseSha } = initRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'README.md', 'changed\n');
  const targetSha = commitAll(root);
  const report = execute(root, baseSha, targetSha, plan(baseSha, ['change-operations-regression']));
  assert.equal(report.staticOk, true);
  assert.equal(report.results[0].status, 'PASS');
  assert.equal(report.results[0].reason, 'STATIC_CONTRACT_MATCH');
  assert.ok(report.results[0].files.every(file => file.status === 'PASS'));
});

test('change-operations-regression fails if a required candidate invariant is removed', t => {
  const { root, baseSha } = initRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, '.github/workflows/change-verification.yml', 'pull_request_target:\n');
  const targetSha = commitAll(root);
  const rawPlan = plan(baseSha, ['change-operations-regression'], '.github/workflows/change-verification.yml');
  const report = execute(root, baseSha, targetSha, rawPlan);
  assert.equal(report.staticOk, false);
  assert.equal(report.results[0].status, 'FAIL');
  assert.equal(report.results[0].reason, 'STATIC_CONTRACT_MISMATCH');
  assert.ok(report.results[0].files.some(file => file.status === 'FAIL'));
});

test('every requested check receives exactly one result and partial success cannot pass', t => {
  const { root, baseSha } = initRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'probe.js', 'const ok = true;\n');
  const targetSha = commitAll(root);
  const rawPlan = plan(baseSha, ['node-syntax', 'node evil.js'], 'probe.js');
  const report = execute(root, baseSha, targetSha, rawPlan);
  assert.equal(report.complete, true);
  assert.equal(report.results.length, 2);
  assert.deepEqual(report.results.map(item => item.id), ['node-syntax', 'node evil.js']);
  assert.equal(report.results[0].status, 'PASS');
  assert.equal(report.results[1].status, 'FAIL');
  assert.equal(report.staticOk, false);
});

test('exact target SHA mismatch is rejected before dispatch', t => {
  const { root, baseSha } = initRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'probe.js', 'const ok = true;\n');
  commitAll(root);
  assert.throws(() => execute(
    root,
    baseSha,
    'd'.repeat(40),
    plan(baseSha, ['node-syntax'], 'probe.js')
  ));
});

test('trusted source blob mismatch is rejected', t => {
  const { root, baseSha } = initRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'README.md', 'changed\n');
  const targetSha = commitAll(root);
  assert.throws(() => execute(root, baseSha, targetSha, plan(baseSha, ['change-operations-regression']), {
    registryBlob: 'e'.repeat(40),
  }), /trusted registry blob/);
  assert.throws(() => execute(root, baseSha, targetSha, plan(baseSha, ['change-operations-regression']), {
    riskPolicyBlob: 'e'.repeat(40),
  }), /trusted Risk Policy blob/);
});

test('human output escapes candidate-controlled unknown ID controls', t => {
  const { root, baseSha } = initRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'README.md', 'changed\n');
  const targetSha = commitAll(root);
  const rawPlan = plan(baseSha, ['BAD\nFAKE PASS ‮BIDI']);
  const report = execute(root, baseSha, targetSha, rawPlan);
  const human = formatHuman(report);
  assert.ok(human.includes('BAD\\nFAKE PASS \\u202eBIDI'), human);
  assert.equal(human.includes('BAD\nFAKE PASS'), false);
  assert.equal(human.includes('‮'), false);
});
