'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');
const lifecycle = require('../tools/work-lifecycle.cjs');
const { validate } = require('../tools/release-validator.cjs');
const ROOT = path.resolve(__dirname, '..');
const registry = works => ({ schema: lifecycle.SCHEMA, defaults: { status: 'active', environment: 'staging' }, works });
const row = (status = 'active') => ({ id: 'test-work', path: 'works/test-work', title: 'Test', status,
  ...(status === 'candidate' ? { candidateDecision: 'Owner: make candidate' } : {}),
  ...(status === 'released' ? { releaseEvidence: 'Verified production SHA' } : {}),
  ...(status === 'frozen' ? { archive: 'works/test-work/ARCHIVE.md', theme: 'Touch', freezeDecision: 'Owner: freeze' } : {}) });
function temp(t) { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'work-lifecycle-')); t.after(() => fs.rmSync(root, { recursive: true, force: true })); return root; }
function put(root, file, content) { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), content); }
function writeRegistry(root, value) { put(root, lifecycle.FILE, JSON.stringify(value)); }
function git(root, ...args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
function diffFixture(t, status = 'frozen') {
  const root = temp(t); git(root, 'init'); git(root, 'config', 'user.name', 'Fixture'); git(root, 'config', 'user.email', 'fixture@example.invalid');
  writeRegistry(root, registry([row(status)])); put(root, 'works/test-work/index.html', '<title>Preserved</title>'); put(root, 'works/test-work/ARCHIVE.md', 'Old exploration');
  git(root, 'add', '.'); git(root, 'commit', '-m', 'base'); return { root, base: git(root, 'rev-parse', 'HEAD') };
}
function commit(root) { git(root, 'add', '.'); git(root, 'commit', '-m', 'candidate'); }

test('new/unknown works default active/staging, including unregistered folders', t => {
  const root = temp(t); put(root, 'works/new-work/index.html', '<title>new</title>'); writeRegistry(root, registry([]));
  assert.equal(lifecycle.statusFor(lifecycle.readRegistry(root), 'new-work'), 'active');
  assert.deepEqual(lifecycle.listWorks(root, registry([])), [{ id: 'new-work', path: 'works/new-work', title: 'new-work', status: 'active', environment: 'staging', implicitDefault: true }]);
  assert.throws(() => lifecycle.assertPromotion(registry([]), ['new-work'], 'Owner publish'), /only candidate/);
});
test('promotion denies active/frozen/released; candidate still needs separate instruction', () => {
  for (const status of ['active', 'frozen', 'released']) assert.throws(() => lifecycle.assertPromotion(registry([row(status)]), ['test-work'], 'Owner publish'), /only candidate/);
  const candidate = registry([row('candidate')]);
  assert.throws(() => lifecycle.assertPromotion(candidate, ['test-work'], ''), /separate explicit/);
  assert.throws(() => lifecycle.assertPromotion(candidate, ['test-work'], 'Owner: make candidate'), /cannot be reused/);
  assert.doesNotThrow(() => lifecycle.assertPromotion(candidate, ['test-work'], 'Owner separately requests production'));
  assert.throws(() => lifecycle.assertPublication(candidate, ['test-work']), /--promote/);
  assert.doesNotThrow(() => lifecycle.assertPublication(candidate, ['test-work'], ['test-work'], 'Owner publish'));
  assert.doesNotThrow(() => lifecycle.assertPublication(registry([row('released')]), ['test-work']));
  assert.throws(() => lifecycle.assertPublication(candidate, ['other'], ['test-work'], 'Owner publish'), /must be in/);
});
test('schema rejects malformed/default-changed/unknown/duplicate/path escaping and missing decisions', () => {
  for (const value of [null, { ...registry([]), defaults: { status: 'candidate', environment: 'production' } }, registry([{ ...row(), status: 'open' }]), registry([row(), row()]), registry([{ ...row(), path: 'works/../production' }]), registry([{ ...row('candidate'), candidateDecision: '' }]), registry([{ ...row('frozen'), archive: '../ARCHIVE.md' }]), registry([{ ...row('released'), releaseEvidence: '' }])]) assert.throws(() => lifecycle.validateRegistry(value));
});
test('production snapshot rejects hidden/unregistered/frozen work payloads and LAB/archive, retains shared template', t => {
  const root = temp(t), data = registry([row('released')]);
  put(root, 'works/test-work/index.html', '<title>release</title>'); put(root, 'works/_template/index.html', '<title>shared template</title>');
  assert.doesNotThrow(() => lifecycle.assertProductionSnapshot(root, data, ['test-work']));
  put(root, 'works/forgotten-prototype/index.html', 'hidden prototype');
  assert.throws(() => lifecycle.assertProductionSnapshot(root, data, ['test-work']), /staging-only/);
  fs.rmSync(path.join(root, 'works/forgotten-prototype'), { recursive: true });
  put(root, 'works/test-work/ARCHIVE.md', 'old exploration');
  assert.throws(() => lifecycle.assertProductionSnapshot(root, data, ['test-work']), /ARCHIVE/);
  fs.rmSync(path.join(root, 'works/test-work/ARCHIVE.md')); put(root, 'lab/index.html', 'LAB');
  assert.throws(() => lifecycle.assertProductionSnapshot(root, data, ['test-work']), /LAB is staging-only/);
});
test('frozen body edits, deletions and renames denied; archive text can be corrected', t => {
  for (const operation of ['edit', 'delete', 'rename', 'archive']) {
    const { root, base } = diffFixture(t);
    if (operation === 'edit') put(root, 'works/test-work/index.html', 'changed game');
    if (operation === 'delete') fs.rmSync(path.join(root, 'works/test-work/index.html'));
    if (operation === 'rename') fs.renameSync(path.join(root, 'works/test-work/index.html'), path.join(root, 'works/test-work/moved.html'));
    if (operation === 'archive') put(root, 'works/test-work/ARCHIVE.md', 'Corrected record');
    commit(root);
    if (operation === 'archive') assert.doesNotThrow(() => lifecycle.checkDiff(root, base));
    else assert.throws(() => lifecycle.checkDiff(root, base), /frozen runtime/);
  }
});
test('frozen resumption requires fresh explicit decision and active state', t => {
  for (const status of ['active', 'candidate']) {
    const { root, base } = diffFixture(t); writeRegistry(root, registry([row(status)])); commit(root);
    assert.throws(() => lifecycle.checkDiff(root, base), /frozen can only resume/);
  }
  const { root, base } = diffFixture(t); writeRegistry(root, registry([{ ...row(), resumeDecision: 'Owner: resume this work 2026-10-06' }])); put(root, 'works/test-work/index.html', 'resumed game'); commit(root);
  assert.doesNotThrow(() => lifecycle.checkDiff(root, base));
});
test('lifecycle transitions require decisions, and released is never a default', t => {
  const { root, base } = diffFixture(t, 'active'); writeRegistry(root, registry([row('candidate')])); commit(root); assert.doesNotThrow(() => lifecycle.checkDiff(root, base));
  const candidateBase = git(root, 'rev-parse', 'HEAD'); writeRegistry(root, registry([row('released')])); commit(root); assert.throws(() => lifecycle.checkDiff(root, candidateBase), /separate productionInstruction/);
  writeRegistry(root, registry([{ ...row('released'), productionInstruction: 'Owner: publish', releaseEvidence: 'Production exact SHA and verified URL' }])); commit(root); assert.doesNotThrow(() => lifecycle.checkDiff(root, candidateBase));
  const other = diffFixture(t, 'active'); writeRegistry(other.root, registry([row('released')])); commit(other.root); assert.throws(() => lifecycle.checkDiff(other.root, other.base), /invalid transition/);
});
test('registry/archives produce exact static LAB with six preserved playable links', () => {
  const data = lifecycle.readRegistry(ROOT), frozen = data.works.filter(work => work.status === 'frozen');
  assert.equal(frozen.length, 6);
  const html = lifecycle.renderLab(ROOT, data); assert.equal(html, fs.readFileSync(path.join(ROOT, 'lab/index.html'), 'utf8'));
  for (const work of frozen) { assert.ok(html.includes('href="../' + work.path + '/"')); assert.ok(html.includes('id="' + work.id + '"')); }
  assert.match(html, /noindex,nofollow/); assert.ok(!html.includes('<script'));
  const escaped = lifecycle.renderLab(ROOT, { ...data, works: data.works.map(w => ({ ...w, title: '<img onerror="x">' })) }); assert.ok(!escaped.includes('<img onerror='));
});
test('production validator fails closed for active/frozen/missing registry, despite explicit publication set', t => {
  const root = temp(t); put(root, 'data/works.js', 'var WORKS = [];');
  for (const status of ['active', 'frozen', 'candidate']) {
    writeRegistry(root, registry([row(status)]));
    const result = validate({ root, env: 'production', ids: ['test-work'], published: ['test-work'] });
    assert.ok(result.results.some(r => r.check === 'lifecycle.publication' && r.status === 'FAIL'));
  }
  fs.rmSync(path.join(root, lifecycle.FILE));
  assert.ok(validate({ root, env: 'production', ids: ['test-work'], published: ['test-work'] }).results.some(r => r.check === 'lifecycle.publication' && r.status === 'FAIL'));
});
test('production generator rejects before writing any files; staging generation stays compatible', t => {
  const root = temp(t); const generator = path.join(ROOT, 'tools/generate-work-search-pages.cjs');
  for (const status of ['active', 'frozen', 'candidate', 'released']) {
    writeRegistry(root, registry([row(status)]));
    const result = spawnSync(process.execPath, [generator, '--env', 'production', '--published', 'test-work', '--write'], { cwd: root, encoding: 'utf8' });
    assert.notEqual(result.status, 0); assert.ok(!fs.existsSync(path.join(root, 'w'))); assert.ok(!fs.existsSync(path.join(root, 'sitemap.xml')));
    assert.match(result.stderr, /production instruction|production generation|publication requires/);
  }
  const data = lifecycle.readRegistry(ROOT);
  const result = spawnSync(process.execPath, [generator, '--env', 'staging', '--published', data.works.filter(w => w.status === 'released').map(w => w.id).join(','), '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
