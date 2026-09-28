'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeImpactPlan } = require('../tools/change-impact-check.cjs');
const { createLock } = require('../tools/change-plan-lock.cjs');
const {
  normalizeRecord,
  evaluateMechanicalChecks,
  evaluateHumanAttestations,
  evaluateVerification,
} = require('../tools/change-verification-check.cjs');

const NOW = Date.parse('2026-09-28T07:00:00Z');
const VERIFIED = 'b'.repeat(40);

function plan(overrides={}) {
  return {
    schema:'yumaniwa-change-plan/0.2',
    changeId:'test-verification',
    revision:0,
    previousPlanDigest:null,
    revisionReason:null,
    status:'READY',
    repository:'example/test',
    change:'test verification',
    planLevel:'lite',
    classes:['CONTENT'],
    authority:['Standard'],
    environment:'staging',
    baseSha:'a'.repeat(40),
    canonicalSources:['README.md'],
    allowedPaths:['README.md'],
    conditionalPaths:[],
    forbiddenPaths:['main.js'],
    expectedChanges:['update README'],
    staticChecks:['node-syntax'],
    manualChecks:['owner review'],
    impactChecks:[],
    impactExclusions:[],
    promotion:'none',
    ...overrides,
  };
}

function normPlan(overrides={}) {
  const r=normalizeImpactPlan(plan(overrides),{allowLegacy:false});
  assert.equal(r.ok,true,r.errors && r.errors.join('\n'));
  return r.plan;
}

function record(p,digest,overrides={}) {
  return {
    schema:'yumaniwa-verification-record/0.3',
    changeId:p.changeId,
    planDigest:digest,
    planRevision:p.revision,
    repository:p.repository,
    change:p.change,
    environment:'staging',
    baseSha:p.baseSha,
    verifiedSha:VERIFIED,
    recordedAt:'2026-09-28T06:30:00Z',
    recordedBy:'ChatGPT',
    conditionalAcknowledgements:[],
    humanAttestations:[{
      id:'owner review',
      status:'pass',
      performedBy:'Owner',
      recordedBy:'ChatGPT',
      observedSha:VERIFIED,
      device:'iPhone',
      attestationRef:'chat:owner-confirmation',
      attestedAt:'2026-09-28T06:20:00Z'
    }],
    ...overrides,
  };
}

function mechanical(overrides={}) {
  return {
    verifiedSha:VERIFIED,
    mechanicalState:'PASS',
    runner:{provenanceDigest:'f'.repeat(64)},
    checks:[{
      id:'node-syntax',
      status:'pass',
      detail:'no changed JavaScript-family files require node --check',
      executions:[]
    }],
    ...overrides,
  };
}

const repoPass={ok:true,expected:'example/test',actual:'example/test',remote:'https://github.com/example/test.git'};
const provenancePass={ok:true,errors:[]};

test('v0.3 record requires structured SHA-bound human attestation',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const r=normalizeRecord(record(p,lock.planDigest),p,lock.planDigest,{now:NOW});
  assert.equal(r.ok,true,r.errors && r.errors.join('\n'));
  assert.equal(r.record.humanAttestations[0].observedSha,VERIFIED);
});

test('legacy free-form evidence fields cannot satisfy v0.3',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const raw=record(p,lock.planDigest,{
    staticChecks:[{id:'node-syntax',status:'pass',evidence:'not actually run'}]
  });
  const r=normalizeRecord(raw,p,lock.planDigest,{now:NOW});
  assert.equal(r.ok,false);
  assert.match(r.errors.join('\n'),/legacy free-form evidence/);
});

test('legacy v0.2 record is rejected for trusted verification',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const raw=record(p,lock.planDigest,{schema:'yumaniwa-verification-record/0.2'});
  const r=normalizeRecord(raw,p,lock.planDigest,{now:NOW});
  assert.equal(r.ok,false);
  assert.match(r.errors.join('\n'),/legacy Verification Record/);
});

test('future record and attestation timestamps are rejected',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const raw=record(p,lock.planDigest,{
    recordedAt:'2099-01-01T00:00:00Z',
    humanAttestations:[{
      id:'owner review',
      status:'pass',
      performedBy:'Owner',
      recordedBy:'ChatGPT',
      observedSha:VERIFIED,
      device:'iPhone',
      attestationRef:'chat:x',
      attestedAt:'2099-01-01T00:00:00Z'
    }]
  });
  const r=normalizeRecord(raw,p,lock.planDigest,{now:NOW});
  assert.equal(r.ok,false);
  assert.match(r.errors.join('\n'),/must not be in the future/);
});

test('mechanical checks must be measured and planned',()=>{
  let r=evaluateMechanicalChecks(['node-syntax'],mechanical());
  assert.ok(r.some(x=>x.status==='PASS'&&x.check==='mechanical.measured'));

  r=evaluateMechanicalChecks(['node-syntax'],mechanical({checks:[]}));
  assert.ok(r.some(x=>x.status==='UNVERIFIED'&&x.check==='mechanical.missing'));

  r=evaluateMechanicalChecks(['node-syntax'],mechanical({
    checks:[{id:'node-syntax',status:'pass',detail:'fake',executions:[{exitCode:1,error:null}]}]
  }));
  assert.ok(r.some(x=>x.status==='FAIL'&&x.check==='mechanical.exit'));

  r=evaluateMechanicalChecks([],mechanical());
  assert.ok(r.some(x=>x.status==='FAIL'&&x.check==='mechanical.unplanned'));
});

test('human attestation must target exact verified SHA',()=>{
  const entries=[{
    id:'owner review',
    status:'pass',
    performedBy:'Owner',
    recordedBy:'ChatGPT',
    observedSha:'c'.repeat(40),
    device:'iPhone',
    attestationRef:'chat:x',
    attestedAt:'2026-09-28T06:20:00Z'
  }];
  const r=evaluateHumanAttestations(['owner review'],entries,VERIFIED);
  assert.ok(r.some(x=>x.status==='FAIL'&&x.check==='human.sha'));
});

test('measured mechanical PASS plus exact human attestation can reach VERIFIED',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const n=normalizeRecord(record(p,lock.planDigest),p,lock.planDigest,{now:NOW});
  assert.equal(n.ok,true,n.errors&&n.errors.join('\n'));

  const v=evaluateVerification(
    p,
    n.record,
    {headSha:VERIFIED,paths:['README.md'],target:'HEAD'},
    repoPass,
    mechanical(),
    provenancePass
  );
  assert.equal(v.mechanicalState,'VERIFIED');
  assert.equal(v.humanState,'VERIFIED');
  assert.equal(v.verificationState,'VERIFIED');
});

test('manual unverified remains visibly separate from mechanical PASS',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const raw=record(p,lock.planDigest,{
    humanAttestations:[{
      id:'owner review',
      status:'unverified',
      performedBy:'Owner',
      recordedBy:'ChatGPT',
      observedSha:VERIFIED,
      device:'iPhone',
      attestationRef:'chat:pending',
      attestedAt:'2026-09-28T06:20:00Z'
    }]
  });
  const n=normalizeRecord(raw,p,lock.planDigest,{now:NOW});
  assert.equal(n.ok,true,n.errors&&n.errors.join('\n'));

  const v=evaluateVerification(
    p,
    n.record,
    {headSha:VERIFIED,paths:['README.md'],target:'HEAD'},
    repoPass,
    mechanical(),
    provenancePass
  );
  assert.equal(v.mechanicalState,'VERIFIED');
  assert.equal(v.humanState,'UNVERIFIED');
  assert.equal(v.verificationState,'UNVERIFIED');
});

test('mechanical target SHA mismatch blocks overall verification',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const n=normalizeRecord(record(p,lock.planDigest),p,lock.planDigest,{now:NOW});
  const v=evaluateVerification(
    p,
    n.record,
    {headSha:VERIFIED,paths:['README.md'],target:'HEAD'},
    repoPass,
    mechanical({verifiedSha:'c'.repeat(40)}),
    provenancePass
  );
  assert.equal(v.verificationState,'UNVERIFIED');
  assert.ok(v.results.some(x=>x.check==='mechanical.sha'&&x.status==='FAIL'));
});
