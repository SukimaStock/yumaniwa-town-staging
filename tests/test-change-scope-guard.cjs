'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const guard = require('../tools/change-scope-guard.cjs');

function basePlan(overrides={}) {
  return {
    schema:'yumaniwa-change-plan/0.1',
    change:'test change',
    planLevel:'lite',
    classes:['CONTENT'],
    environment:'staging',
    baseSha:'a'.repeat(40),
    canonicalSources:['data/ghost-dialogue.js'],
    allowedPaths:['data/ghost-dialogue.js'],
    conditionalPaths:[],
    forbiddenPaths:['main.js'],
    expectedChanges:['change one dialogue line'],
    staticChecks:['syntax'],
    manualChecks:['dialogue renders'],
    promotion:'none',
    ...overrides,
  };
}

function okPlan(overrides={}) {
  const r=guard.validatePlan(basePlan(overrides));
  assert.equal(r.ok,true,r.errors && r.errors.join('\n'));
  return r.plan;
}

function git(cwd,args){
  const r=spawnSync('git',['-C',cwd,...args],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  return r.stdout.trim();
}

function tempRepo(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yumaniwa-scope-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  git(root,['init','-q']);
  git(root,['config','user.email','test@example.com']);
  git(root,['config','user.name','Test']);
  fs.mkdirSync(path.join(root,'data'),{recursive:true});
  fs.writeFileSync(path.join(root,'data/ghost-dialogue.js'),'one\n');
  fs.writeFileSync(path.join(root,'main.js'),'main\n');
  git(root,['add','.']);git(root,['commit','-qm','base']);
  return {root,base:git(root,['rev-parse','HEAD'])};
}

test('allowed exact path passes',()=>{
  const plan=okPlan();
  const r=guard.evaluateScope(plan,['data/ghost-dialogue.js']);
  assert.equal(r.exitCode,0); assert.equal(r.results[0].status,'PASS');
});

test('forbidden path wins and out-of-scope fails',()=>{
  const plan=okPlan({allowedPaths:['data/**']});
  let r=guard.evaluateScope(plan,['main.js']);
  assert.equal(r.exitCode,1); assert.equal(r.results[0].check,'scope.forbidden');
  r=guard.evaluateScope(plan,['style.css']);
  assert.equal(r.exitCode,1); assert.equal(r.results[0].check,'scope.out-of-scope');
});

test('conditional path requires explicit acknowledgement',()=>{
  const plan=okPlan({conditionalPaths:[{path:'index.html',condition:'cache fingerprint required'}]});
  let r=guard.evaluateScope(plan,['index.html']);
  assert.equal(r.exitCode,1); assert.equal(r.results[0].status,'SCOPE_REVIEW_REQUIRED');
  r=guard.evaluateScope(plan,['index.html'],['index.html']);
  assert.equal(r.exitCode,0); assert.equal(r.results[0].status,'PASS');
  assert.throws(()=>guard.evaluateScope(plan,['index.html'],['main.js']),/not declared/);
});

test('glob matching keeps single-star within a segment and double-star recursive',()=>{
  assert.equal(guard.matches('assets/*.png','assets/a.png'),true);
  assert.equal(guard.matches('assets/*.png','assets/x/a.png'),false);
  assert.equal(guard.matches('assets/**','assets/x/a.png'),true);
  assert.equal(guard.matches('assets/**/a.png','assets/a.png'),true);
  assert.equal(guard.matches('assets/**/a.png','assets/x/y/a.png'),true);
});

test('plan validation rejects too-light SYSTEM plan and repo-wide scope',()=>{
  let r=guard.validatePlan(basePlan({classes:['SYSTEM'],planLevel:'lite'}));
  assert.equal(r.ok,false); assert.match(r.errors.join('\n'),/too light/);
  r=guard.validatePlan(basePlan({allowedPaths:['**']}));
  assert.equal(r.ok,false); assert.match(r.errors.join('\n'),/unsafe\/broad/);
  r=guard.validatePlan(basePlan({allowedPaths:['**/*.js']}));
  assert.equal(r.ok,false); assert.match(r.errors.join('\n'),/unsafe\/broad/);
});

test('plan validation rejects contradictory exact patterns and invalid environment',()=>{
  let r=guard.validatePlan(basePlan({allowedPaths:['main.js'],forbiddenPaths:['main.js']}));
  assert.equal(r.ok,false); assert.match(r.errors.join('\n'),/both allowedPaths and forbiddenPaths/);
  r=guard.validatePlan(basePlan({environment:'production'}));
  assert.equal(r.ok,false); assert.match(r.errors.join('\n'),/environment/);
});

test('collectChangedPaths compares base to HEAD commit',t=>{
  const {root,base}=tempRepo(t);
  fs.writeFileSync(path.join(root,'data/ghost-dialogue.js'),'two\n');
  git(root,['add','.']);git(root,['commit','-qm','change']);
  const r=guard.collectChangedPaths(root,base,'HEAD');
  assert.deepEqual(r.paths,['data/ghost-dialogue.js']);
});

test('worktree mode includes untracked files',t=>{
  const {root,base}=tempRepo(t);
  fs.writeFileSync(path.join(root,'extra.txt'),'x\n');
  const r=guard.collectChangedPaths(root,base,null);
  assert.ok(r.paths.includes('extra.txt'));
});

test('CLI exits 0 for allowed diff and 1 for out-of-scope diff',t=>{
  const {root,base}=tempRepo(t);
  const tool=path.join(__dirname,'..','tools','change-scope-guard.cjs');
  const plan=basePlan({baseSha:base});
  const planPath=path.join(root,'plan.json');
  fs.writeFileSync(planPath,JSON.stringify(plan));
  // Ignore plan fixture itself so worktree mode can focus on changed implementation files.
  fs.writeFileSync(path.join(root,'.gitignore'),'plan.json\n');
  git(root,['add','.gitignore']);git(root,['commit','-qm','ignore plan']);
  // Plan base must be the latest committed baseline.
  plan.baseSha=git(root,['rev-parse','HEAD']);
  fs.writeFileSync(planPath,JSON.stringify(plan));

  fs.writeFileSync(path.join(root,'data/ghost-dialogue.js'),'two\n');
  let r=spawnSync(process.execPath,[tool,'--root',root,'--plan',planPath],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);
  assert.match(r.stdout,/Scope: PASS/);

  fs.writeFileSync(path.join(root,'main.js'),'changed\n');
  r=spawnSync(process.execPath,[tool,'--root',root,'--plan',planPath],{encoding:'utf8'});
  assert.equal(r.status,1,r.stdout+r.stderr);
  assert.match(r.stdout,/scope\.forbidden/);
});

test('CLI invalid plan exits 2',t=>{
  const {root}=tempRepo(t);
  const p=path.join(root,'bad.json'); fs.writeFileSync(p,'{}');
  const r=spawnSync(process.execPath,[path.join(__dirname,'..','tools','change-scope-guard.cjs'),'--root',root,'--plan',p],{encoding:'utf8'});
  assert.equal(r.status,2,r.stdout+r.stderr);
});
