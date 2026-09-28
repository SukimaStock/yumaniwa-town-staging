'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  normalizeImpactPlan,
} = require('../tools/change-impact-check.cjs');
const {
  normalizeRecord,
  evaluateEvidence,
  evaluateVerification,
} = require('../tools/change-verification-check.cjs');

function git(cwd,args){
  const r=spawnSync('git',['-C',cwd,...args],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  return r.stdout.trim();
}

function tempRepo(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yumaniwa-verify-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  git(root,['init','-q']);
  git(root,['config','user.email','test@example.com']);
  git(root,['config','user.name','Test']);
  fs.writeFileSync(path.join(root,'README.md'),'one\n');
  fs.writeFileSync(path.join(root,'index.html'),'one\n');
  fs.mkdirSync(path.join(root,'data'),{recursive:true});
  fs.writeFileSync(path.join(root,'data/ghost-dialogue.js'),'one\n');
  git(root,['add','.']);
  git(root,['commit','-qm','base']);
  return {root,base:git(root,['rev-parse','HEAD'])};
}

function plan(overrides={}) {
  return {
    schema:'yumaniwa-change-plan/0.1',
    change:'test verification',
    planLevel:'lite',
    classes:['CONTENT'],
    environment:'staging',
    baseSha:'a'.repeat(40),
    canonicalSources:['README.md'],
    allowedPaths:['README.md'],
    conditionalPaths:[],
    forbiddenPaths:['main.js'],
    expectedChanges:['update README'],
    staticChecks:['syntax'],
    manualChecks:['owner review'],
    impactChecks:[],
    impactExclusions:[],
    promotion:'none',
    ...overrides,
  };
}

function normPlan(overrides={}) {
  const r=normalizeImpactPlan(plan(overrides));
  assert.equal(r.ok,true,r.errors && r.errors.join('\n'));
  return r.plan;
}

function record(p,verifiedSha,overrides={}) {
  return {
    schema:'yumaniwa-verification-record/0.1',
    change:p.change,
    environment:'staging',
    baseSha:p.baseSha,
    verifiedSha,
    recordedAt:'2026-09-28T12:34:56Z',
    recordedBy:'Test',
    conditionalAcknowledgements:[],
    staticChecks:[{id:'syntax',status:'pass',evidence:'node --check'}],
    impactChecks:[],
    manualChecks:[{id:'owner review',status:'pass',evidence:'Owner reviewed target SHA'}],
    ...overrides,
  };
}

test('valid record normalizes against Plan',()=>{
  const p=normPlan();
  const r=normalizeRecord(record(p,'b'.repeat(40)),p);
  assert.equal(r.ok,true,r.errors && r.errors.join('\n'));
});

test('record must match Plan change and base SHA',()=>{
  const p=normPlan();
  let r=normalizeRecord(record(p,'b'.repeat(40),{change:'other'}),p);
  assert.equal(r.ok,false);
  assert.match(r.errors.join('\n'),/change must exactly match/);
  r=normalizeRecord(record(p,'b'.repeat(40),{baseSha:'c'.repeat(40)}),p);
  assert.equal(r.ok,false);
  assert.match(r.errors.join('\n'),/baseSha/);
});

test('manual unverified keeps verification UNVERIFIED',()=>{
  const p=normPlan();
  const raw=record(p,'b'.repeat(40),{
    manualChecks:[{id:'owner review',status:'unverified',evidence:'Owner check pending'}]
  });
  const n=normalizeRecord(raw,p);
  assert.equal(n.ok,true);
  const v=evaluateVerification(p,n.record,{headSha:'b'.repeat(40),paths:['README.md'],target:'HEAD'});
  assert.equal(v.verificationState,'UNVERIFIED');
  assert.ok(v.results.some(x=>x.status==='UNVERIFIED'&&x.kind==='manual'));
});

test('missing and failed evidence both block verification',()=>{
  let r=evaluateEvidence(['a','b'],[{id:'a',status:'fail',evidence:'test failed'}],'static');
  assert.ok(r.some(x=>x.status==='FAIL'&&x.id==='a'));
  assert.ok(r.some(x=>x.status==='UNVERIFIED'&&x.id==='b'));
});

test('unplanned evidence entry is rejected as blocking evidence',()=>{
  const r=evaluateEvidence(['a'],[
    {id:'a',status:'pass',evidence:'ok'},
    {id:'typo',status:'pass',evidence:'ok'}
  ],'static');
  assert.ok(r.some(x=>x.status==='FAIL'&&x.check==='verification.unplanned'));
});

test('impact evidence is required separately from Impact declaration',()=>{
  const p=normPlan({
    canonicalSources:['data/ghost-dialogue.js'],
    allowedPaths:['data/ghost-dialogue.js'],
    expectedChanges:['change dialogue'],
    impactChecks:['ghost.runtime','ghost.work-id']
  });
  const raw=record(p,'b'.repeat(40),{
    impactChecks:[{id:'ghost.runtime',status:'pass',evidence:'dialogue loaded'}]
  });
  const n=normalizeRecord(raw,p);
  assert.equal(n.ok,true);
  const v=evaluateVerification(p,n.record,{
    headSha:'b'.repeat(40),
    paths:['data/ghost-dialogue.js'],
    target:'HEAD'
  });
  assert.equal(v.verificationState,'UNVERIFIED');
  assert.ok(v.results.some(x=>x.kind==='impact-evidence'&&x.id==='ghost.work-id'&&x.status==='UNVERIFIED'));
});

test('conditional changed path needs reasoned acknowledgement in Record',()=>{
  const p=normPlan({
    allowedPaths:['README.md'],
    conditionalPaths:[{path:'index.html',condition:'cache fingerprint required'}]
  });
  let raw=record(p,'b'.repeat(40));
  let n=normalizeRecord(raw,p);
  assert.equal(n.ok,true);
  let v=evaluateVerification(p,n.record,{headSha:'b'.repeat(40),paths:['index.html'],target:'HEAD'});
  assert.equal(v.verificationState,'UNVERIFIED');
  assert.ok(v.results.some(x=>x.check==='gate.scope.conditional'&&x.status==='FAIL'));

  raw=record(p,'b'.repeat(40),{
    conditionalAcknowledgements:[{path:'index.html',reason:'cache fingerprint changed'}]
  });
  n=normalizeRecord(raw,p);
  assert.equal(n.ok,true);
  v=evaluateVerification(p,n.record,{headSha:'b'.repeat(40),paths:['index.html'],target:'HEAD'});
  assert.equal(v.verificationState,'VERIFIED');
});

test('conditional acknowledgement requires a declared path and reason',()=>{
  const p=normPlan({
    conditionalPaths:[{path:'index.html',condition:'cache fingerprint required'}]
  });
  let r=normalizeRecord(record(p,'b'.repeat(40),{
    conditionalAcknowledgements:[{path:'index.html',reason:''}]
  }),p);
  assert.equal(r.ok,false);
  assert.match(r.errors.join('\n'),/reason must be nonempty/);

  r=normalizeRecord(record(p,'b'.repeat(40),{
    conditionalAcknowledgements:[{path:'other.html',reason:'x'}]
  }),p);
  assert.equal(r.ok,false);
  assert.match(r.errors.join('\n'),/not declared in Plan/);
});

test('record SHA mismatch blocks verification',()=>{
  const p=normPlan();
  const n=normalizeRecord(record(p,'b'.repeat(40)),p);
  const v=evaluateVerification(p,n.record,{headSha:'c'.repeat(40),paths:['README.md'],target:'HEAD'});
  assert.equal(v.verificationState,'UNVERIFIED');
  assert.ok(v.results.some(x=>x.check==='verification.sha'&&x.status==='FAIL'));
});

test('CLI verifies exact committed SHA and rejects stale Record',t=>{
  const {root,base}=tempRepo(t);
  fs.writeFileSync(path.join(root,'README.md'),'two\n');
  git(root,['add','README.md']);
  git(root,['commit','-qm','change']);
  const verified=git(root,['rev-parse','HEAD']);

  const p=plan({baseSha:base});
  const rec=record(p,verified);
  const planPath=path.join(os.tmpdir(),'yumaniwa-plan-'+process.pid+'-'+Date.now()+'.json');
  const recordPath=path.join(os.tmpdir(),'yumaniwa-record-'+process.pid+'-'+Date.now()+'.json');
  t.after(()=>{fs.rmSync(planPath,{force:true});fs.rmSync(recordPath,{force:true});});
  fs.writeFileSync(planPath,JSON.stringify(p));
  fs.writeFileSync(recordPath,JSON.stringify(rec));

  const tool=path.join(__dirname,'..','tools','change-verification-check.cjs');
  let r=spawnSync(process.execPath,[tool,'--root',root,'--plan',planPath,'--record',recordPath,'--head','HEAD'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);
  assert.match(r.stdout,/Verification: VERIFIED/);

  fs.writeFileSync(path.join(root,'index.html'),'two\n');
  git(root,['add','index.html']);
  git(root,['commit','-qm','later']);
  r=spawnSync(process.execPath,[tool,'--root',root,'--plan',planPath,'--record',recordPath,'--head','HEAD'],{encoding:'utf8'});
  assert.equal(r.status,1,r.stdout+r.stderr);
  assert.match(r.stdout,/verification\.sha/);
});

test('CLI invalid Record exits 2',t=>{
  const {root,base}=tempRepo(t);
  const p=plan({baseSha:base});
  const planPath=path.join(os.tmpdir(),'yumaniwa-plan-bad-'+process.pid+'-'+Date.now()+'.json');
  const recordPath=path.join(os.tmpdir(),'yumaniwa-record-bad-'+process.pid+'-'+Date.now()+'.json');
  t.after(()=>{fs.rmSync(planPath,{force:true});fs.rmSync(recordPath,{force:true});});
  fs.writeFileSync(planPath,JSON.stringify(p));
  fs.writeFileSync(recordPath,'{}');
  const r=spawnSync(process.execPath,[
    path.join(__dirname,'..','tools','change-verification-check.cjs'),
    '--root',root,
    '--plan',planPath,
    '--record',recordPath
  ],{encoding:'utf8'});
  assert.equal(r.status,2,r.stdout+r.stderr);
});
