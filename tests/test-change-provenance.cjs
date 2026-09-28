'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  computeProvenance,
  evaluateTrustedSnapshot,
} = require('../tools/change-provenance.cjs');

function git(cwd,args){
  const r=spawnSync('git',['-C',cwd,...args],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  return r.stdout.trim();
}

function tempRepo(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yumaniwa-prov-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  git(root,['init','-q']);
  git(root,['config','user.email','test@example.com']);
  git(root,['config','user.name','Test']);
  fs.writeFileSync(path.join(root,'a.txt'),'a\n');
  fs.writeFileSync(path.join(root,'b.txt'),'b\n');
  git(root,['add','.']);
  git(root,['commit','-qm','base']);
  return {root,head:git(root,['rev-parse','HEAD'])};
}

test('provenance captures clean commit, tree and deterministic file digest bundle',t=>{
  const {root,head}=tempRepo(t);
  const a=computeProvenance(root,{files:['a.txt','b.txt']});
  const b=computeProvenance(root,{files:['b.txt','a.txt']});
  assert.equal(a.clean,true);
  assert.equal(a.headSha,head);
  assert.equal(a.bundleDigest,b.bundleDigest);
  assert.equal(a.missingFiles.length,0);
  const checked=evaluateTrustedSnapshot(a,head);
  assert.equal(checked.ok,true,checked.errors.join('\n'));
});

test('dirty tracked and untracked trusted checkout is rejected',t=>{
  const {root,head}=tempRepo(t);
  fs.writeFileSync(path.join(root,'a.txt'),'changed\n');
  let snapshot=computeProvenance(root,{files:['a.txt']});
  let checked=evaluateTrustedSnapshot(snapshot,head);
  assert.equal(checked.ok,false);
  assert.match(checked.errors.join('\n'),/dirty/);

  git(root,['checkout','--','a.txt']);
  fs.writeFileSync(path.join(root,'untracked.txt'),'x\n');
  snapshot=computeProvenance(root,{files:['a.txt']});
  checked=evaluateTrustedSnapshot(snapshot,head);
  assert.equal(checked.ok,false);
  assert.match(checked.errors.join('\n'),/dirty/);
});

test('wrong trusted HEAD and missing provenance file are rejected',t=>{
  const {root,head}=tempRepo(t);
  const snapshot=computeProvenance(root,{files:['a.txt','missing.txt']});
  const checked=evaluateTrustedSnapshot(snapshot,'b'.repeat(40));
  assert.equal(checked.ok,false);
  assert.match(checked.errors.join('\n'),/does not equal locked baseSha/);
  assert.match(checked.errors.join('\n'),/missing/);
  assert.notEqual(head,'b'.repeat(40));
});
