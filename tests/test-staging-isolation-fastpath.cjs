'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { classify, validRelative } = require('../tools/staging-isolation-fastpath.cjs');

function git(root, ...args) {
  const run = spawnSync('git', ['-C', root, ...args], {encoding:'utf8'});
  assert.equal(run.status, 0, run.stderr || run.stdout);
  return run.stdout.trim();
}
function file(root, name, body='fixture') {
  const target = path.join(root, name);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, body);
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sukimastock-fastpath-'));
  t.after(()=>fs.rmSync(root, {recursive:true,force:true}));
  git(root,'init','-q');
  git(root,'config','user.email','test@example.invalid');
  git(root,'config','user.name','Fast Path Test');
  file(root,'README.md','existing project');
  file(root,'works/existing/index.html','original game');
  git(root,'add','-A');
  git(root,'commit','-qm','baseline');
  const baseSha = git(root,'rev-parse','HEAD');
  const commit = ()=>{
    git(root,'add','-A');
    git(root,'commit','-qm','candidate');
    return git(root,'rev-parse','HEAD');
  };
  const judge = headSha => classify({root,baseSha,headSha});
  return {root,baseSha,commit,judge};
}

test('accept only a brand-new isolated work with index and ordinary assets',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/index.html','<!doctype html><title>New Game</title>');
  file(f.root,'works/new-game/scripts/main.js','console.log("hello")');
  file(f.root,'works/new-game/assets/splash.png','data');
  const r=f.judge(f.commit());
  assert.deepEqual([r.eligible,r.reason,r.workId,r.files],[true,'ISOLATED_ADDITION','new-game',3]);
  assert.ok(r.totalBytes > 0);
});

test('a missing HTML entry cannot take the easy path',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/readme.txt');
  assert.equal(f.judge(f.commit()).reason,'MISSING_ENTRY');
});

test('existing work modification cannot masquerade as an experiment',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/index.html','changed');
  assert.equal(f.judge(f.commit()).reason,'NOT_ADDITIONS_ONLY');
});

test('new file inside an existing work must use the existing gate',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/new.js');
  assert.equal(f.judge(f.commit()).reason,'WORK_ALREADY_EXISTS');
});

test('mixing a new work with root shared UI rejects the fast path',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/index.html');
  file(f.root,'index.html','a town-wide overlay');
  assert.equal(f.judge(f.commit()).reason,'OUTSIDE_NEW_WORK');
});

test('mixing a new work with a production/lifecycle edit rejects the fast path',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/index.html');
  file(f.root,'data/work-lifecycle.json','{"works":[]}');
  assert.equal(f.judge(f.commit()).reason,'OUTSIDE_NEW_WORK');
});

test('two new work directories in one PR are not silently exempted',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/index.html');
  file(f.root,'works/another-game/index.html');
  assert.equal(f.judge(f.commit()).reason,'MULTIPLE_WORKS');
});

test('deleting existing paths, even with a new work, rejects the fast path',t=>{
  const f=fixture(t);
  fs.unlinkSync(path.join(f.root,'README.md'));
  file(f.root,'works/new-game/index.html');
  assert.equal(f.judge(f.commit()).reason,'NOT_ADDITIONS_ONLY');
});

test('a symlink inside a new work rejects the fast path',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/index.html');
  fs.symlinkSync('../../README.md',path.join(f.root,'works/new-game/link'));
  assert.equal(f.judge(f.commit()).reason,'NON_REGULAR_WORK_FILE');
});

test('executable file mode rejects the fast path',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/index.html');
  file(f.root,'works/new-game/script.sh','#!/bin/sh\ntrue\n');
  fs.chmodSync(path.join(f.root,'works/new-game/script.sh'),0o755);
  assert.equal(f.judge(f.commit()).reason,'NON_REGULAR_WORK_FILE');
});

test('unsafe filename or leading underscore work ID rejects the fast path',t=>{
  const f=fixture(t);
  file(f.root,'works/_new-game/index.html');
  assert.equal(f.judge(f.commit()).reason,'OUTSIDE_NEW_WORK');
});

test('hidden nested directory rejected, no GitHub workflow imitation',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/index.html');
  file(f.root,'works/new-game/.github/workflows/unsafe.yml');
  assert.equal(f.judge(f.commit()).reason,'OUTSIDE_NEW_WORK');
});

test('Unicode and control characters do not exploit path parsing',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/index.html');
  file(f.root,'works/new-game/evil\npath.txt');
  assert.equal(f.judge(f.commit()).reason,'OUTSIDE_NEW_WORK');
});

test('disallow oversized individual input blob',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/index.html');
  const huge = Buffer.alloc(32 * 1024 * 1024 + 1,65);
  file(f.root,'works/new-game/huge.bin',huge);
  assert.equal(f.judge(f.commit()).reason,'BLOB_TOO_LARGE');
});

test('disallow too many files in one PR',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/index.html');
  for(let i=0;i<130;i++)file(f.root,'works/new-game/file-'+i+'.txt');
  assert.equal(f.judge(f.commit()).reason,'TOO_MANY_FILES');
});

test('input commits must be complete exact SHAs with correct ancestry',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/index.html');
  const headSha=f.commit();
  assert.equal(f.judge('HEAD').reason,'INVALID_SHA');
  assert.equal(f.judge(f.baseSha).reason,'INVALID_SHA');
  assert.equal(classify({root:f.root,baseSha:headSha,headSha:f.baseSha}).reason,'BASE_NOT_ANCESTOR');
  assert.equal(classify({root:f.root,baseSha:f.baseSha,headSha:'0'.repeat(40)}).reason,'GIT_OR_INPUT_ERROR');
});

test('no changes never yields eligibility',t=>{
  const f=fixture(t);
  assert.equal(f.judge(f.baseSha).eligible,false);
});

test('relative paths refuse dot segments and backslash escape',()=>{
  for(const value of ['../main.js','a/../b.js','.github/x.yml','a/.hidden','a\\b','']) {
    assert.equal(validRelative(value),false,value);
  }
  assert.equal(validRelative('assets/new-image.png'),true);
});

test('CLI uses deterministic JSON and cannot promote unqualified changes',t=>{
  const f=fixture(t);
  file(f.root,'works/new-game/index.html');
  const head=f.commit();
  const cli=path.join(__dirname,'../tools/staging-isolation-fastpath.cjs');
  const r=spawnSync(process.execPath,[cli,'--root',f.root,'--base',f.baseSha,'--head',head],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  assert.equal(JSON.parse(r.stdout).workId,'new-game');
  const bad=spawnSync(process.execPath,[cli,'--root',f.root,'--base',f.baseSha,'--head','fake'],{encoding:'utf8'});
  assert.equal(bad.status,1);
  assert.equal(JSON.parse(bad.stdout).eligible,false);
});
