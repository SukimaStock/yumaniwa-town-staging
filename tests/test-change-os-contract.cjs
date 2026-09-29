'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  SELF_PATHS,
  readContract,
  evaluateProtectedEntry,
  evaluateChangeOsContract,
} = require('../tools/change-os-contract.cjs');

const REPO_ROOT = path.join(__dirname, '..');

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout.trim();
}

function copyRepoFile(root, filePath) {
  const src = path.join(REPO_ROOT, ...filePath.split('/'));
  const dst = path.join(root, ...filePath.split('/'));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function write(root, filePath, content) {
  const dst = path.join(root, ...filePath.split('/'));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, content);
}

function initFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yumaniwa-os-contract-'));
  git(root, ['init', '-q']);
  git(root, ['config', 'user.name', 'Contract Test']);
  git(root, ['config', 'user.email', 'contract@example.invalid']);

  const contract = readContract();
  for (const filePath of SELF_PATHS) copyRepoFile(root, filePath);
  for (const [filePath, rule] of Object.entries(contract.protectedFiles)) {
    const src = path.join(REPO_ROOT, ...filePath.split('/'));
    if (fs.existsSync(src)) {
      copyRepoFile(root, filePath);
    } else {
      assert.equal(rule.presence, 'sticky-optional', filePath + ' missing but not optional');
    }
  }
  write(root, 'README.md', 'base\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', 'base']);
  return { root, baseSha: git(root, ['rev-parse', 'HEAD']) };
}

function commitAll(root, message = 'candidate') {
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', message]);
  return git(root, ['rev-parse', 'HEAD']);
}

test('contract accepts unchanged approved security files', t => {
  const { root, baseSha } = initFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'README.md', 'candidate\n');
  const targetSha = commitAll(root);
  const report = evaluateChangeOsContract({ root, baseSha, targetSha });
  assert.equal(report.ok, true, report.files.filter(x => x.status === 'FAIL').map(x => x.path + ':' + x.reason).join('\n'));
  assert.ok(report.files.some(x => x.status === 'N/A' && x.reason === 'OPTIONAL_PATH_ABSENT'));
});

test('comment-only replacement cannot spoof an approved workflow blob', t => {
  const { root, baseSha } = initFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filePath = '.github/workflows/change-verification.yml';
  fs.appendFileSync(path.join(root, ...filePath.split('/')), '\n# pull_request_target: trusted-mechanical-evidence FAKE PASS\n');
  const targetSha = commitAll(root);
  const report = evaluateChangeOsContract({ root, baseSha, targetSha });
  const item = report.files.find(x => x.path === filePath);
  assert.equal(report.ok, false);
  assert.equal(item.status, 'FAIL');
  assert.equal(item.reason, 'TARGET_BLOB_NOT_PREAPPROVED');
});

test('dead-string substitution cannot spoof an approved Risk Policy blob', t => {
  const { root, baseSha } = initFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filePath = 'tools/change-risk-policy.cjs';
  fs.appendFileSync(path.join(root, ...filePath.split('/')), '\nconst dead = "STATIC_CHECK_REQUIREMENTS node-syntax change-operations-regression";\n');
  const targetSha = commitAll(root);
  const report = evaluateChangeOsContract({ root, baseSha, targetSha });
  const item = report.files.find(x => x.path === filePath);
  assert.equal(report.ok, false);
  assert.equal(item.reason, 'TARGET_BLOB_NOT_PREAPPROVED');
});

test('required protected file deletion fails', t => {
  const { root, baseSha } = initFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filePath = 'tools/change-impact-check.cjs';
  fs.unlinkSync(path.join(root, ...filePath.split('/')));
  const targetSha = commitAll(root);
  const report = evaluateChangeOsContract({ root, baseSha, targetSha });
  const item = report.files.find(x => x.path === filePath);
  assert.equal(item.status, 'FAIL');
  assert.equal(item.reason, 'REQUIRED_PATH_MISSING');
});

test('protected file symlink is rejected even if its text target looks legitimate', t => {
  const { root, baseSha } = initFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filePath = 'tools/change-risk-check.cjs';
  const absolute = path.join(root, ...filePath.split('/'));
  fs.unlinkSync(absolute);
  fs.symlinkSync('../change-scope-guard.cjs', absolute);
  const targetSha = commitAll(root);
  const report = evaluateChangeOsContract({ root, baseSha, targetSha });
  const item = report.files.find(x => x.path === filePath);
  assert.equal(item.status, 'FAIL');
  assert.equal(item.reason, 'TARGET_NOT_REGULAR_NONEXECUTABLE_BLOB');
});

test('protected executable mode is rejected', t => {
  const { root, baseSha } = initFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filePath = 'tools/change-plan-lock.cjs';
  fs.chmodSync(path.join(root, ...filePath.split('/')), 0o755);
  const targetSha = commitAll(root);
  const report = evaluateChangeOsContract({ root, baseSha, targetSha });
  const item = report.files.find(x => x.path === filePath);
  assert.equal(item.status, 'FAIL');
  assert.equal(item.reason, 'TARGET_NOT_REGULAR_NONEXECUTABLE_BLOB');
});

test('contract file cannot self-authorize its own modification', t => {
  const { root, baseSha } = initFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filePath = 'tools/change-os-contract.json';
  const candidate = JSON.parse(fs.readFileSync(path.join(root, ...filePath.split('/')), 'utf8'));
  candidate.version = 'candidate-self-authorized';
  fs.writeFileSync(path.join(root, ...filePath.split('/')), JSON.stringify(candidate, null, 2) + '\n');
  const targetSha = commitAll(root);
  const report = evaluateChangeOsContract({ root, baseSha, targetSha });
  const item = report.files.find(x => x.path === filePath);
  assert.equal(item.status, 'FAIL');
  assert.equal(item.reason, 'SELF_MODIFICATION_FORBIDDEN');
});

test('verifier code cannot modify itself', t => {
  const { root, baseSha } = initFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filePath = 'tools/change-os-contract.cjs';
  fs.appendFileSync(path.join(root, ...filePath.split('/')), '\n// candidate override\n');
  const targetSha = commitAll(root);
  const report = evaluateChangeOsContract({ root, baseSha, targetSha });
  const item = report.files.find(x => x.path === filePath);
  assert.equal(item.status, 'FAIL');
  assert.equal(item.reason, 'SELF_MODIFICATION_FORBIDDEN');
});

test('sticky optional is absent only before first trusted appearance', () => {
  const approved = 'a'.repeat(40);
  const rule = { presence: 'sticky-optional', allowedBlobs: [approved] };
  assert.equal(
    evaluateProtectedEntry('tools/future.cjs', rule, undefined, undefined).status,
    'N/A'
  );
  const baseEntry = { mode: '100644', type: 'blob', oid: approved };
  const deleted = evaluateProtectedEntry('tools/future.cjs', rule, baseEntry, undefined);
  assert.equal(deleted.status, 'FAIL');
  assert.equal(deleted.reason, 'STICKY_PATH_DELETED');
});

test('only an explicitly preapproved target blob can perform initial sticky addition', () => {
  const approved = 'a'.repeat(40);
  const rule = { presence: 'sticky-optional', allowedBlobs: [approved] };
  const good = evaluateProtectedEntry(
    'tools/future.cjs',
    rule,
    undefined,
    { mode: '100644', type: 'blob', oid: approved }
  );
  assert.equal(good.status, 'PASS');
  assert.equal(good.reason, 'PREAPPROVED_TARGET_BLOB');

  const bad = evaluateProtectedEntry(
    'tools/future.cjs',
    rule,
    undefined,
    { mode: '100644', type: 'blob', oid: 'b'.repeat(40) }
  );
  assert.equal(bad.status, 'FAIL');
  assert.equal(bad.reason, 'TARGET_BLOB_NOT_PREAPPROVED');
});

test('stale or nonexistent exact target SHA is rejected before evaluation', t => {
  const { root, baseSha } = initFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(
    () => evaluateChangeOsContract({ root, baseSha, targetSha: 'd'.repeat(40) }),
    /git command failed/
  );
});
