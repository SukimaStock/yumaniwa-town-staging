'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {classify,safeRelative}=require('../tools/staging-contained-change-proof.cjs');
function git(root,...args){
  const r=spawnSync('git',['-C',root,...args],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  return r.stdout.trim();
}
function file(root,p,body){
  const target=path.join(root,p);fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,body);
}
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'contained-fastpath-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  git(root,'init','-q');
  git(root,'config','user.email','test@example.invalid');
  git(root,'config','user.name','Containment QA');
  file(root,'README.md','Protected readme');
  file(root,'index.html','<p>Original town</p>');
  file(root,'engine/core.js','shared engine');
  file(root,'works/existing/index.html','<title>Existing Game</title>\n');
  file(root,'works/existing/game.js','const level=1;\n');
  file(root,'works/other/index.html','<title>Other</title>\n');
  file(root,'data/work-lifecycle.json','{"works":[]}');
  git(root,'add','-A');git(root,'commit','-qm','initial');
  const baseSha=git(root,'rev-parse','HEAD');
  const commit=()=>{
    git(root,'add','-A');git(root,'commit','-qm','change');
    return git(root,'rev-parse','HEAD');
  };
  return {root,baseSha,commit,check:headSha=>classify({root,baseSha,headSha})};
}
test('accept a small one-file existing work update',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/game.js','const level=2;\n');
  const r=f.check(f.commit());
  assert.deepEqual([r.eligible,r.reason,r.workId,r.files,r.restoredPaths],
    [true,'BOUNDED_EXISTING_WORK','existing',1,[]]);
});
test('accept a bounded file addition inside existing work',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/level-02.json','{"map":[1,2,3]}');
  assert.equal(f.check(f.commit()).eligible,true);
});
test('accept small edits to existing work HTML without authorizing town-wide HTML',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/index.html','<title>Existing Game</title>\n<p>one fix</p>');
  assert.equal(f.check(f.commit()).eligible,true);
});
test('detect a byte-exact historical restoration within the same work',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/game.js','const level=9;\n');
  const modifiedBase=f.commit();
  file(f.root,'works/existing/game.js','const level=1;\n');
  const restoredHead=f.commit();
  const r=classify({root:f.root,baseSha:modifiedBase,headSha:restoredHead});
  assert.equal(r.eligible,true);
  assert.deepEqual(r.restoredPaths,['works/existing/game.js']);
});
test('refuse root town UI changes',t=>{
  const f=fixture(t);file(f.root,'index.html','<aside>bad UI</aside>');
  assert.equal(f.check(f.commit()).reason,'OUTSIDE_SINGLE_WORK');
});
test('refuse simultaneous work tweak and shared Engine',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/game.js','const level=2;\n');
  file(f.root,'engine/core.js','changed shared runtime');
  assert.equal(f.check(f.commit()).reason,'OUTSIDE_SINGLE_WORK');
});
test('refuse lifecycle and town directory changes in same PR',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/level.json','{}');
  file(f.root,'data/work-lifecycle.json','{"works":["existing"]}');
  assert.equal(f.check(f.commit()).reason,'OUTSIDE_SINGLE_WORK');
});
test('refuse modification of two works at once',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/game.js','const level=3;\n');
  file(f.root,'works/other/index.html','<title>Altered Other</title>');
  assert.equal(f.check(f.commit()).reason,'MULTIPLE_WORKS');
});
test('refuse new never-before-existing work (handled by separate classifier)',t=>{
  const f=fixture(t);
  file(f.root,'works/new-work/index.html','<title>New</title>');
  assert.equal(f.check(f.commit()).reason,'NOT_AN_EXISTING_WORK');
});
test('refuse deletion of a work asset',t=>{
  const f=fixture(t);fs.unlinkSync(path.join(f.root,'works/existing/game.js'));
  assert.equal(f.check(f.commit()).reason,'UNSAFE_DIFF_ACTION');
});
test('refuse changing a script into a symlink',t=>{
  const f=fixture(t);
  fs.unlinkSync(path.join(f.root,'works/existing/game.js'));
  fs.symlinkSync('../../engine/core.js',path.join(f.root,'works/existing/game.js'));
  assert.equal(f.check(f.commit()).reason,'NON_REGULAR_NEW_FILE');
});
test('refuse changing file permission mode',t=>{
  const f=fixture(t);
  fs.chmodSync(path.join(f.root,'works/existing/game.js'),0o755);
  assert.equal(f.check(f.commit()).reason,'NON_REGULAR_NEW_FILE');
});
test('refuse touching existing packaging scripts even if a tiny change',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/build-itch.py','print(1)\n');
  assert.equal(f.check(f.commit()).reason,'PROTECTED_WORK_FILE');
});
test('refuse modifying work publication manifests and metadata',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/work-meta.js','const v=2;\n');
  assert.equal(f.check(f.commit()).reason,'PROTECTED_WORK_FILE');
});
test('reject more than four files touched in a single work',t=>{
  const f=fixture(t);
  for(let i=0;i<5;i++)file(f.root,'works/existing/level-'+i+'.json','{}');
  assert.equal(f.check(f.commit()).reason,'TOO_MANY_FILES');
});
test('reject broad rewrite of small text file, even within one work',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/game.js',Array.from({length:125},(_,i)=>'const a'+i+'=0;').join('\n'));
  assert.equal(f.check(f.commit()).reason,'BROAD_REWRITE');
});
test('reject a binary replacement of a live work file',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/game.js',Buffer.from([0,1,2,3,4]));
  assert.equal(f.check(f.commit()).reason,'BINARY_MODIFICATION');
});
test('reject oversized newly added files inside work',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/big.bin',Buffer.alloc(2*1024*1024+1));
  assert.equal(f.check(f.commit()).reason,'FILE_TOO_LARGE');
});
test('refuse symlink additions and hidden directories',t=>{
  const f=fixture(t);
  fs.symlinkSync('../../README.md',path.join(f.root,'works/existing/link'));
  assert.equal(f.check(f.commit()).reason,'NON_REGULAR_NEW_FILE');
});
test('reject malicious path and hidden folder names',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/.github/workflows/run.yml','oops');
  assert.equal(f.check(f.commit()).reason,'OUTSIDE_SINGLE_WORK');
});
test('bounded rule never accepts malformed SHA or base=head',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/game.js','const level=3;\n');
  const head=f.commit();
  assert.equal(f.check('HEAD').reason,'INVALID_SHA');
  assert.equal(f.check(f.baseSha).reason,'INVALID_SHA');
  assert.equal(classify({root:f.root,baseSha:head,headSha:f.baseSha}).reason,'BASE_NOT_ANCESTOR');
  assert.equal(classify({root:f.root,baseSha:f.baseSha,headSha:'0'.repeat(40)}).reason,'GIT_OR_INPUT_ERROR');
});
test('CLI result is stable machine-readable evidence, not a runtime permission',t=>{
  const f=fixture(t);
  file(f.root,'works/existing/game.js','const level=7;\n');
  const head=f.commit();
  const command=path.join(__dirname,'../tools/staging-contained-change-proof.cjs');
  const r=spawnSync(process.execPath,[command,'--root',f.root,'--base',f.baseSha,'--head',head],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  assert.equal(JSON.parse(r.stdout).reason,'BOUNDED_EXISTING_WORK');
  const bad=spawnSync(process.execPath,[command,'--root',f.root,'--base',f.baseSha,'--head','HEAD'],{encoding:'utf8'});
  assert.equal(bad.status,1);
  assert.equal(JSON.parse(bad.stdout).eligible,false);
});
test('safe relative names do not include dot, hidden, or traversal segments',()=>{
  for(const value of ['.github/a','a/.env','a/../b','a/./b','a\\b','a/','/root','a b'])
    assert.equal(safeRelative(value),false,value);
  assert.equal(safeRelative('assets/image.png'),true);
});
