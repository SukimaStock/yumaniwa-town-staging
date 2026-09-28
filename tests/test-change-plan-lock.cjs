'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  createLock,
  verifyLock,
  computePlanDigest,
} = require('../tools/change-plan-lock.cjs');

function plan(overrides={}) {
  return {
    schema:'yumaniwa-change-plan/0.2',
    changeId:'lock-test',
    revision:0,
    previousPlanDigest:null,
    revisionReason:null,
    status:'READY',
    repository:'example/test',
    change:'lock test',
    planLevel:'lite',
    classes:['CONTENT'],
    authority:['Standard'],
    environment:'staging',
    baseSha:'a'.repeat(40),
    canonicalSources:['README.md'],
    allowedPaths:['README.md'],
    conditionalPaths:[],
    forbiddenPaths:['main.js'],
    expectedChanges:['edit README'],
    staticChecks:['syntax'],
    manualChecks:['owner review'],
    impactChecks:[],
    impactExclusions:[],
    promotion:'none',
    ...overrides,
  };
}

test('lock digest is deterministic and verifies',()=>{
  const p=plan();
  const a=createLock(p);
  const b=createLock({...p});
  assert.equal(a.planDigest,b.planDigest);
  assert.equal(a.planDigest,computePlanDigest(p));
  const checked=verifyLock(a);
  assert.equal(checked.ok,true,checked.errors.join('\n'));
});

test('tampering locked Plan invalidates digest',()=>{
  const lock=createLock(plan());
  lock.plan.change='tampered but still structurally valid';
  const checked=verifyLock(lock);
  assert.equal(checked.ok,false);
  assert.match(checked.errors.join('\n'),/planDigest mismatch/);
});

test('legacy v0.1 Plan cannot become trusted lock',()=>{
  const p=plan({schema:'yumaniwa-change-plan/0.1'});
  assert.throws(()=>createLock(p),/invalid v0\.2 change plan/);
});

test('revision must keep base and link previous digest',()=>{
  const first=createLock(plan());
  const nextPlan=plan({
    revision:1,
    previousPlanDigest:first.planDigest,
    revisionReason:'scope expands before implementation',
    allowedPaths:['README.md','docs/note.md']
  });
  const next=createLock(nextPlan);
  let checked=verifyLock(next,first);
  assert.equal(checked.ok,true,checked.errors.join('\n'));

  const rewritten=createLock({
    ...nextPlan,
    baseSha:'b'.repeat(40),
    previousPlanDigest:first.planDigest
  });
  checked=verifyLock(rewritten,first);
  assert.equal(checked.ok,false);
  assert.match(checked.errors.join('\n'),/keep baseSha/);
});

test('revision cannot silently drop previous digest',()=>{
  const first=createLock(plan());
  assert.throws(()=>createLock(plan({
    revision:1,
    previousPlanDigest:null,
    revisionReason:'change'
  })),/previousPlanDigest/);
});
