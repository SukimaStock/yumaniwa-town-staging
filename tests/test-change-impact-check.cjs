'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const impact = require('../tools/change-impact-check.cjs');

function basePlan(overrides={}) {
  return {
    schema:'yumaniwa-change-plan/0.1',
    change:'test impact',
    planLevel:'standard',
    classes:['WORK'],
    environment:'staging',
    baseSha:'a'.repeat(40),
    canonicalSources:['data/works.js'],
    allowedPaths:['data/works.js'],
    conditionalPaths:[],
    forbiddenPaths:['main.js'],
    expectedChanges:['update work metadata'],
    staticChecks:['release validator'],
    manualChecks:['venue menu'],
    impactChecks:[],
    impactExclusions:[],
    promotion:'none',
    ...overrides,
  };
}

function normalized(overrides={}) {
  const r=impact.normalizeImpactPlan(basePlan(overrides));
  assert.equal(r.ok,true,r.errors && r.errors.join('\n'));
  return r.plan;
}

function git(cwd,args){
  const r=spawnSync('git',['-C',cwd,...args],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  return r.stdout.trim();
}

function tempRepo(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yumaniwa-impact-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  git(root,['init','-q']);
  git(root,['config','user.email','test@example.com']);
  git(root,['config','user.name','Test']);
  fs.mkdirSync(path.join(root,'data'),{recursive:true});
  fs.writeFileSync(path.join(root,'data/works.js'),'one\n');
  fs.writeFileSync(path.join(root,'data/town-maps.js'),'map\n');
  fs.writeFileSync(path.join(root,'README.md'),'readme\n');
  git(root,['add','.']);git(root,['commit','-qm','base']);
  return {root,base:git(root,['rev-parse','HEAD'])};
}

test('works.js derives all registered work impacts',()=>{
  const d=impact.deriveRequiredImpacts(['data/works.js']);
  const ids=d.requirements.map(x=>x.id);
  for(const id of [
    'works.venue-menu',
    'works.direct-route',
    'works.search-share',
    'works.analytics-id',
    'works.town-awareness',
    'works.release-validator'
  ]) assert.ok(ids.includes(id),id);
  assert.deepEqual(d.coveredPaths,['data/works.js']);
});

test('scene data union is deduplicated across town maps and station plaza',()=>{
  const d=impact.deriveRequiredImpacts(['data/town-maps.js','data/station-plaza.js']);
  const ids=d.requirements.map(x=>x.id);
  assert.equal(ids.filter(id=>id==='scene.validation').length,1);
  const scene=d.requirements.find(x=>x.id==='scene.validation');
  assert.deepEqual(scene.paths,['data/station-plaza.js','data/town-maps.js']);
});

test('missing required impact declarations fail',()=>{
  const plan=normalized();
  const r=impact.evaluateImpact(plan,['data/works.js']);
  assert.equal(r.exitCode,1);
  assert.ok(r.results.some(x=>x.status==='FAIL'&&x.check==='impact.missing'));
});

test('declared impacts pass',()=>{
  const d=impact.deriveRequiredImpacts(['data/works.js']);
  const plan=normalized({impactChecks:d.requirements.map(x=>x.id)});
  const r=impact.evaluateImpact(plan,['data/works.js']);
  assert.equal(r.exitCode,0);
  assert.ok(r.results.every(x=>!['FAIL'].includes(x.status)));
});

test('impact can be excluded only with a reason and reports N/A',()=>{
  const d=impact.deriveRequiredImpacts(['data/ghost-dialogue.js']);
  const [first,...rest]=d.requirements;
  const plan=normalized({
    planLevel:'lite',
    classes:['CONTENT'],
    canonicalSources:['data/ghost-dialogue.js'],
    allowedPaths:['data/ghost-dialogue.js'],
    impactChecks:rest.map(x=>x.id),
    impactExclusions:[{id:first.id,reason:'work id is unchanged; wording only'}]
  });
  const r=impact.evaluateImpact(plan,['data/ghost-dialogue.js']);
  assert.equal(r.exitCode,0);
  assert.ok(r.results.some(x=>x.status==='N/A'&&x.impact===first.id));
});

test('invalid exclusion reason and checked/excluded conflict are rejected',()=>{
  let r=impact.normalizeImpactPlan(basePlan({
    impactExclusions:[{id:'works.analytics-id',reason:''}]
  }));
  assert.equal(r.ok,false);
  assert.match(r.errors.join('\n'),/reason must be nonempty/);

  r=impact.normalizeImpactPlan(basePlan({
    impactChecks:['works.analytics-id'],
    impactExclusions:[{id:'works.analytics-id',reason:'no'}]
  }));
  assert.equal(r.ok,false);
  assert.match(r.errors.join('\n'),/both checked and excluded/);
});

test('unmapped files are informational and do not fail',()=>{
  const plan=normalized();
  const r=impact.evaluateImpact(plan,['README.md']);
  assert.equal(r.exitCode,0);
  assert.deepEqual(r.uncoveredPaths,['README.md']);
  assert.ok(r.results.some(x=>x.status==='INFO'&&x.check==='impact.no-rule'));
});

test('unknown custom impact declaration warns but does not satisfy registered impact',()=>{
  const plan=normalized({impactChecks:['custom.note']});
  const r=impact.evaluateImpact(plan,['data/works.js']);
  assert.equal(r.exitCode,1);
  assert.ok(r.results.some(x=>x.status==='WARNING'&&x.check==='impact.unknown-declaration'));
  assert.ok(r.results.some(x=>x.status==='FAIL'&&x.check==='impact.missing'));
});

test('CLI passes when all derived impacts are acknowledged',t=>{
  const {root,base}=tempRepo(t);
  fs.writeFileSync(path.join(root,'data/works.js'),'two\n');
  const required=impact.deriveRequiredImpacts(['data/works.js']).requirements.map(x=>x.id);
  const plan=basePlan({baseSha:base,impactChecks:required});
  const p=path.join(os.tmpdir(),'yumaniwa-impact-plan-'+process.pid+'-'+Date.now()+'.json');
  t.after(()=>fs.rmSync(p,{force:true}));
  fs.writeFileSync(p,JSON.stringify(plan));
  const tool=path.join(__dirname,'..','tools','change-impact-check.cjs');
  const r=spawnSync(process.execPath,[tool,'--root',root,'--plan',p],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);
  assert.match(r.stdout,/Impact: PASS/);
});

test('CLI exits 1 for missing impacts and 2 for invalid plan',t=>{
  const {root,base}=tempRepo(t);
  fs.writeFileSync(path.join(root,'data/works.js'),'two\n');
  const tool=path.join(__dirname,'..','tools','change-impact-check.cjs');
  const p=path.join(os.tmpdir(),'yumaniwa-impact-plan-'+process.pid+'-'+Date.now()+'.json');
  t.after(()=>fs.rmSync(p,{force:true}));
  fs.writeFileSync(p,JSON.stringify(basePlan({baseSha:base})));
  let r=spawnSync(process.execPath,[tool,'--root',root,'--plan',p],{encoding:'utf8'});
  assert.equal(r.status,1,r.stdout+r.stderr);
  assert.match(r.stdout,/impact\.missing/);

  fs.writeFileSync(p,'{}');
  r=spawnSync(process.execPath,[tool,'--root',root,'--plan',p],{encoding:'utf8'});
  assert.equal(r.status,2,r.stdout+r.stderr);
});
