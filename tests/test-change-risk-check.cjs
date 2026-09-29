'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  classifyRiskPath,
} = require('../tools/change-risk-policy.cjs');
const {
  evaluateRiskPlan,
  parseGitHubRepo,
  verifyRepositoryIdentity,
  collectExecutablePaths,
} = require('../tools/change-risk-check.cjs');
const {
  deriveRequiredImpacts,
  evaluateImpact,
} = require('../tools/change-impact-check.cjs');

function fullSystem(overrides={}) {
  return {
    schema:'yumaniwa-change-plan/0.2',
    changeId:'risk-test',
    revision:0,
    previousPlanDigest:null,
    revisionReason:null,
    status:'READY',
    repository:'example/test',
    change:'risk test',
    planLevel:'full',
    classes:['SYSTEM'],
    authority:['HQ Review'],
    environment:'staging',
    baseSha:'a'.repeat(40),
    canonicalSources:['main.js'],
    allowedPaths:['main.js'],
    conditionalPaths:[],
    forbiddenPaths:[],
    expectedChanges:['change shared runtime'],
    ownerDecisions:[],
    hqDecisions:['Use existing shared runtime contract'],
    rulesApplied:[],
    staticChecks:['node-syntax','change-operations-regression'],
    manualChecks:[],
    manualCheckExemptionReason:'test fixture',
    impactChecks:['runtime.shared','runtime.regression','runtime.rollback'],
    impactExclusions:[],
    rollback:'revert commit',
    outOfScope:[],
    promotion:'none',
    unverified:[],
    problem:'shared runtime needs a controlled change',
    currentContract:'main.js is shared runtime',
    whyExistingIsInsufficient:'test fixture requires a change',
    design:'make one bounded shared runtime change',
    alternativesRejected:['runtime patch elsewhere'],
    migration:'none',
    compatibility:'preserve current behavior',
    boundaryCases:['existing scene'],
    testPlan:['run regression tests'],
    promotionRisk:'staging only',
    ...overrides,
  };
}

function liteContent(overrides={}) {
  return {
    ...fullSystem(),
    planLevel:'lite',
    classes:['CONTENT'],
    authority:['Standard'],
    canonicalSources:['README.md'],
    allowedPaths:['README.md'],
    expectedChanges:['wording only'],
    staticChecks:['syntax'],
    impactChecks:[],
    hqDecisions:[],
    problem:undefined,
    currentContract:undefined,
    whyExistingIsInsufficient:undefined,
    design:undefined,
    alternativesRejected:undefined,
    migration:undefined,
    compatibility:undefined,
    boundaryCases:undefined,
    testPlan:undefined,
    rollback:undefined,
    promotionRisk:undefined,
    ...overrides,
  };
}

function git(cwd,args){
  const r=spawnSync('git',['-C',cwd,...args],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  return r.stdout.trim();
}

test('shared runtime cannot be disguised as CONTENT Lite',()=>{
  const plan=liteContent({
    canonicalSources:['main.js'],
    allowedPaths:['main.js']
  });
  const r=evaluateRiskPlan(plan,['main.js']);
  assert.equal(r.riskOk,false);
  assert.ok(r.results.some(x=>x.check==='risk.plan-level'&&x.status==='FAIL'));
  assert.ok(r.results.some(x=>x.check==='risk.class'&&x.status==='FAIL'));
  assert.ok(r.results.some(x=>x.check==='risk.authority'&&x.status==='FAIL'));
});

test('correct shared runtime Full Plan satisfies path risk floor',()=>{
  const r=evaluateRiskPlan(fullSystem(),['main.js']);
  assert.equal(r.riskOk,true,r.results.filter(x=>x.status==='FAIL').map(x=>x.detail).join('\n'));
});

test('new root JavaScript is high-risk instead of INFO-only',()=>{
  const profile=classifyRiskPath('new-helper.js');
  assert.equal(profile.id,'unknown-code');
  const d=deriveRequiredImpacts(['new-helper.js']);
  assert.deepEqual(d.uncoveredPaths,[]);
  assert.ok(d.requirements.some(x=>x.id==='risk.high-risk-review'&&x.core));
});

test('known domain data remains eligible for lightweight domain flow',()=>{
  assert.equal(classifyRiskPath('data/ghost-dialogue.js'),null);
  const d=deriveRequiredImpacts(['data/ghost-dialogue.js']);
  assert.ok(d.requirements.some(x=>x.id==='ghost.runtime'));
  assert.ok(!d.requirements.some(x=>x.id==='risk.high-risk-review'));
});

test('python and script paths cannot fall through as INFO-only',()=>{
  assert.equal(classifyRiskPath('engine/build.py').id,'unknown-code');
  assert.equal(classifyRiskPath('tools/YumaniwaDesk.py').id,'unknown-code');
  assert.equal(classifyRiskPath('works/orbit/patcher.py').id,'work-runtime');
  assert.equal(classifyRiskPath('scripts/release').id,'unknown-code');

  const d=deriveRequiredImpacts(['engine/build.py']);
  assert.deepEqual(d.uncoveredPaths,[]);
  assert.ok(d.requirements.some(x=>x.id==='risk.high-risk-review'&&x.core));
});

test('work runtime and assets get bounded fallback profiles',()=>{
  assert.equal(classifyRiskPath('works/orbit/index.html').id,'work-runtime');
  assert.equal(classifyRiskPath('assets/maps/objects/shop.png').id,'asset');
});

test('unknown source formats default to high-risk while known content stays lightweight',()=>{
  assert.equal(classifyRiskPath('src/main.go').id,'unknown-code');
  assert.equal(classifyRiskPath('src/App.vue').id,'unknown-code');
  assert.equal(classifyRiskPath('src/App.svelte').id,'unknown-code');
  assert.equal(classifyRiskPath('docker/Dockerfile').id,'unknown-code');
  assert.equal(classifyRiskPath('.github/actions/gate/action.yml').id,'os');
  assert.equal(classifyRiskPath('notes/readme.md'),null);
  assert.equal(classifyRiskPath('README.md'),null);
  assert.equal(classifyRiskPath('.change-plans/example-change/r0.lock.json'),null);
  assert.equal(classifyRiskPath('.change-plans/example-change/r0.lock.json',{executable:true}).id,'unknown-code');
  assert.equal(classifyRiskPath('.change-plans/example-change/run',{executable:true}).id,'unknown-code');
  assert.equal(classifyRiskPath('.change-plans/example-change/extra.json').id,'unknown-code');
  assert.equal(classifyRiskPath('README.md',{executable:true}).id,'unknown-code');
  assert.equal(classifyRiskPath('assets/run.sh').id,'unknown-code');
  assert.equal(classifyRiskPath('assets/plugin.wasm').id,'unknown-code');
  assert.equal(classifyRiskPath('assets/image.png').id,'asset');
  assert.equal(classifyRiskPath('assets/font.woff2').id,'asset');
  assert.equal(classifyRiskPath('works/demo/App.vue').id,'work-runtime');
  assert.equal(classifyRiskPath('future.unknown-source').id,'unknown-code');
});

test('Git executable mode forces an extensionless changed file into the risk floor',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yumaniwa-risk-exec-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  git(root,['init','-q']);
  git(root,['config','user.email','test@example.com']);
  git(root,['config','user.name','Risk Test']);
  fs.writeFileSync(path.join(root,'README.md'),'base\n');
  git(root,['add','README.md']);
  git(root,['commit','-qm','base']);
  const base=git(root,['rev-parse','HEAD']);

  fs.writeFileSync(path.join(root,'run'),'#!/bin/sh\necho ok\n');
  fs.chmodSync(path.join(root,'run'),0o755);
  git(root,['add','run']);
  git(root,['commit','-qm','add executable']);
  const head=git(root,['rev-parse','HEAD']);

  const executablePaths=collectExecutablePaths(root,base,head,['run']);
  assert.deepEqual(executablePaths,['run']);

  const r=evaluateRiskPlan(liteContent({
    canonicalSources:['run'],
    allowedPaths:['run']
  }),['run'],{executablePaths});
  assert.equal(r.riskOk,false);
  assert.ok(r.results.some(x=>x.profile==='unknown-code'&&x.check==='risk.plan-level'&&x.status==='FAIL'));
});

test('worktree executable mode is detected before commit',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yumaniwa-risk-worktree-exec-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  git(root,['init','-q']);
  git(root,['config','user.email','test@example.com']);
  git(root,['config','user.name','Risk Test']);
  fs.writeFileSync(path.join(root,'README.md'),'base\n');
  git(root,['add','README.md']);
  git(root,['commit','-qm','base']);
  const base=git(root,['rev-parse','HEAD']);

  fs.writeFileSync(path.join(root,'scratch'),'#!/bin/sh\necho worktree\n');
  fs.chmodSync(path.join(root,'scratch'),0o755);

  const executablePaths=collectExecutablePaths(
    root,
    base,
    base,
    ['scratch'],
    {includeWorktree:true}
  );
  assert.deepEqual(executablePaths,['scratch']);
});

test('core impacts cannot be excluded and all-risk exclusion cannot pass',()=>{
  const p=fullSystem({
    impactChecks:[],
    impactExclusions:[
      {id:'runtime.shared',reason:'x'},
      {id:'runtime.regression',reason:'x'},
      {id:'runtime.rollback',reason:'x'}
    ]
  });
  const risk=evaluateRiskPlan(p,['main.js']);
  assert.equal(risk.riskOk,false);
  assert.ok(risk.results.some(x=>x.check==='risk.core-impact-excluded'));
  assert.ok(risk.results.some(x=>x.check==='risk.all-impacts-excluded'));

  const impact=evaluateImpact(p,['main.js']);
  assert.equal(impact.impactOk,false);
  assert.ok(impact.results.some(x=>x.check==='impact.core-exclusion'));
});

test('repository identity parser handles https and ssh GitHub remotes',()=>{
  assert.equal(parseGitHubRepo('https://github.com/example/test.git'),'example/test');
  assert.equal(parseGitHubRepo('git@github.com:example/test.git'),'example/test');
  assert.equal(parseGitHubRepo('https://example.com/example/test.git'),null);
});

test('repository mismatch is detected from origin',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yumaniwa-risk-repo-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  git(root,['init','-q']);
  git(root,['remote','add','origin','https://github.com/example/other.git']);
  const r=verifyRepositoryIdentity(root,'example/test');
  assert.equal(r.ok,false);
  assert.equal(r.actual,'example/other');
});


test('executable mode lookup treats Git pathspec-magic filenames as literal paths',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yumaniwa-risk-pathspec-'));
  git(root,['init']);
  git(root,['config','user.email','test@example.com']);
  git(root,['config','user.name','Test User']);
  git(root,['commit','--allow-empty','-m','base']);
  const base=git(root,['rev-parse','HEAD']);

  const specialPaths=[
    ':(literal)docs/payload.md',
    ':docs/short.md',
  ];
  for (const filePath of specialPaths) {
    const absolute=path.join(root,...filePath.split('/'));
    fs.mkdirSync(path.dirname(absolute),{recursive:true});
    fs.writeFileSync(absolute,'#!/bin/sh\\necho pathspec-bypass\\n');
    fs.chmodSync(absolute,0o755);
  }
  git(root,['add','--all']);
  git(root,['commit','-m','add executable special paths']);
  const head=git(root,['rev-parse','HEAD']);

  const executablePaths=collectExecutablePaths(root,base,head,specialPaths);
  assert.deepEqual(executablePaths,[...specialPaths].sort());

  const risk=evaluateRiskPlan(
    liteContent({
      canonicalSources:specialPaths,
      allowedPaths:specialPaths,
    }),
    specialPaths,
    {executablePaths}
  );
  assert.equal(risk.riskOk,false);
  assert.ok(risk.profiles.some(item=>item.id==='unknown-code'&&item.paths.includes(':(literal)docs/payload.md')));
  assert.ok(risk.profiles.some(item=>item.id==='unknown-code'&&item.paths.includes(':docs/short.md')));

  const impacts=deriveRequiredImpacts(specialPaths,{executablePaths});
  assert.ok(impacts.requirements.some(item=>item.id==='risk.high-risk-review'));
  assert.ok(impacts.requirements.some(item=>item.id==='runtime.regression'));
});


test('literal backslash Git path does not alias known domain data in Risk or Impact',()=>{
  const literal='data\\works.js';
  const profile=classifyRiskPath(literal);
  assert.equal(profile.id,'unknown-code');

  const impacts=deriveRequiredImpacts([literal]);
  assert.deepEqual(impacts.uncoveredPaths,[]);
  assert.ok(impacts.requirements.some(x=>x.id==='risk.high-risk-review'&&x.core));
  assert.ok(impacts.requirements.some(x=>x.id==='runtime.regression'));
});


test('Risk human output routes details through escapeHumanText',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','tools','change-risk-check.cjs'),'utf8');
  assert.ok(source.includes("escapeHumanText(item.detail)"));
  assert.ok(source.includes("escapeHumanText(error.message)"));
});
