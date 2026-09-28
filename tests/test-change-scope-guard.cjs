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

test('v0.2 Full Plan requires READY identity, HQ decision and design fields',()=>{
  const base={
    schema:'yumaniwa-change-plan/0.2',
    changeId:'full-contract-test',
    revision:0,
    previousPlanDigest:null,
    revisionReason:null,
    status:'READY',
    repository:'example/test',
    change:'full contract',
    planLevel:'full',
    classes:['SYSTEM'],
    authority:['HQ Review'],
    environment:'staging',
    baseSha:'a'.repeat(40),
    canonicalSources:['main.js'],
    allowedPaths:['main.js'],
    conditionalPaths:[],
    forbiddenPaths:[],
    expectedChanges:['bounded shared change'],
    staticChecks:['node-syntax'],
    manualChecks:[],
    manualCheckExemptionReason:'no UI in fixture',
    impactChecks:['runtime.shared'],
    impactExclusions:[],
    hqDecisions:['preserve shared source of truth'],
    alternativesRejected:['runtime patch'],
    boundaryCases:['existing scene'],
    testPlan:['regression'],
    problem:'shared runtime needs a change',
    currentContract:'main.js is shared',
    whyExistingIsInsufficient:'fixture reason',
    design:'bounded change',
    migration:'none',
    compatibility:'preserve behavior',
    rollback:'revert',
    promotionRisk:'staging only',
    promotion:'none'
  };
  let result=guard.validatePlan(base,{allowLegacy:false});
  assert.equal(result.ok,true,result.errors&&result.errors.join('\n'));

  result=guard.validatePlan({...base,hqDecisions:[]},{allowLegacy:false});
  assert.equal(result.ok,false);
  assert.match(result.errors.join('\n'),/hqDecisions/);

  result=guard.validatePlan({...base,design:''},{allowLegacy:false});
  assert.equal(result.ok,false);
  assert.match(result.errors.join('\n'),/design/);

  result=guard.validatePlan({...base,staticChecks:[]},{allowLegacy:false});
  assert.equal(result.ok,false);
  assert.match(result.errors.join('\n'),/staticChecks/);
});

test('v0.2 Plan requires READY state and repository identity field',()=>{
  const p={
    schema:'yumaniwa-change-plan/0.2',
    changeId:'ready-test',
    revision:0,
    previousPlanDigest:null,
    revisionReason:null,
    status:'DRAFT',
    repository:'example/test',
    change:'ready test',
    planLevel:'lite',
    classes:['CONTENT'],
    authority:['Standard'],
    environment:'staging',
    baseSha:'a'.repeat(40),
    canonicalSources:['README.md'],
    allowedPaths:['README.md'],
    conditionalPaths:[],
    forbiddenPaths:[],
    expectedChanges:['wording'],
    staticChecks:['syntax'],
    manualChecks:['review'],
    promotion:'none'
  };
  let result=guard.validatePlan(p,{allowLegacy:false});
  assert.equal(result.ok,false);
  assert.match(result.errors.join('\n'),/status must equal READY/);

  result=guard.validatePlan({...p,status:'READY',repository:''},{allowLegacy:false});
  assert.equal(result.ok,false);
  assert.match(result.errors.join('\n'),/repository/);
});



test('Scope preserves Git path identity instead of trimming or rewriting it',()=>{
  const plan=okPlan({allowedPaths:['docs/alias.md','docs/back/slash.md']});
  let r=guard.evaluateScope(plan,[' docs/alias.md']);
  assert.equal(r.exitCode,1);
  assert.equal(r.results[0].check,'scope.out-of-scope');
  assert.equal(r.results[0].path,' docs/alias.md');

  r=guard.evaluateScope(plan,['docs/back\\slash.md']);
  assert.equal(r.exitCode,1);
  assert.equal(r.results[0].check,'scope.out-of-scope');
  assert.equal(r.results[0].path,'docs/back\\slash.md');
});

test('collectChangedPaths preserves unusual committed Git filenames with NUL parsing',t=>{
  const {root,base}=tempRepo(t);
  const names=[
    ' docs/alias.md',
    'docs/日本語.md',
    'docs/tab\tname.md',
    'docs/line\nname.md',
    'docs/back\\slash.md',
    'docs/"quote".md',
  ];
  for(const name of names){
    const absolute=path.join(root,...name.split('/'));
    fs.mkdirSync(path.dirname(absolute),{recursive:true});
    fs.writeFileSync(absolute,'x\n');
  }
  git(root,['add','--all']);
  git(root,['commit','-qm','unusual paths']);

  const r=guard.collectChangedPaths(root,base,'HEAD');
  assert.deepEqual([...r.paths].sort(),[...names].sort());
});

test('worktree untracked collection preserves unusual Git filenames with NUL parsing',t=>{
  const {root,base}=tempRepo(t);
  const names=[
    ' untracked.txt',
    'docs/untracked\tname.txt',
    'docs/untracked\nname.txt',
    'docs/untracked\\name.txt',
  ];
  for(const name of names){
    const absolute=path.join(root,...name.split('/'));
    fs.mkdirSync(path.dirname(absolute),{recursive:true});
    fs.writeFileSync(absolute,'x\n');
  }

  const r=guard.collectChangedPaths(root,base,null);
  for(const name of names) assert.ok(r.paths.includes(name),'missing literal path '+JSON.stringify(name));
});


test('recursive globs match newline-containing Git paths',()=>{
  assert.equal(guard.matches('data/**','data/line\nname.js'),true);
  assert.equal(guard.matches('assets/**/a.png','assets/line\nsegment/a.png'),true);
  assert.equal(guard.matches('assets/*.png','assets/line\nname.png'),true);
});

test('newline-containing path cannot bypass recursive forbidden scope',()=>{
  const plan=okPlan({
    canonicalSources:['data/line\nname.js'],
    allowedPaths:['data/*.js'],
    forbiddenPaths:['data/**'],
  });
  const r=guard.evaluateScope(plan,['data/line\nname.js']);
  assert.equal(r.exitCode,1);
  assert.equal(r.results[0].status,'FAIL');
  assert.equal(r.results[0].check,'scope.forbidden');
  assert.equal(r.results[0].pattern,'data/**');
});
