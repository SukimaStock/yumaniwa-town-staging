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
  createLock,
} = require('../tools/change-plan-lock.cjs');
const {
  HUMAN_ATTESTATION_REQUEST_SCHEMA,
  HUMAN_ATTESTATION_PREFIX,
  parseHumanAttestationComment,
  createAuthenticatedHumanAttestation,
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
  git(root,['remote','add','origin','https://github.com/example/test.git']);
  fs.writeFileSync(path.join(root,'README.md'),'one\n');
  fs.writeFileSync(path.join(root,'meta.txt'),'one\n');
  fs.mkdirSync(path.join(root,'data'),{recursive:true});
  fs.writeFileSync(path.join(root,'data/ghost-dialogue.js'),'one\n');
  git(root,['add','.']);
  git(root,['commit','-qm','base']);
  return {root,base:git(root,['rev-parse','HEAD'])};
}

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
    staticChecks:['syntax'],
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

function record(p,digest,verifiedSha,overrides={}) {
  return {
    schema:'yumaniwa-verification-record/0.2',
    changeId:p.changeId,
    planDigest:digest,
    planRevision:p.revision,
    repository:p.repository,
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

const repoPass={ok:true,expected:'example/test',actual:'example/test',remote:'https://github.com/example/test.git'};

test('valid v0.2 record normalizes only with locked Plan digest',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const r=normalizeRecord(record(p,lock.planDigest,'b'.repeat(40)),p,lock.planDigest);
  assert.equal(r.ok,true,r.errors && r.errors.join('\n'));
});

test('record must match Plan digest, change and base SHA',()=>{
  const p=normPlan();
  const lock=createLock(p);
  let r=normalizeRecord(record(p,'0'.repeat(64),'b'.repeat(40)),p,lock.planDigest);
  assert.equal(r.ok,false);
  assert.match(r.errors.join('\n'),/planDigest/);

  r=normalizeRecord(record(p,lock.planDigest,'b'.repeat(40),{change:'other'}),p,lock.planDigest);
  assert.equal(r.ok,false);
  assert.match(r.errors.join('\n'),/change must exactly match/);

  r=normalizeRecord(record(p,lock.planDigest,'b'.repeat(40),{baseSha:'c'.repeat(40)}),p,lock.planDigest);
  assert.equal(r.ok,false);
  assert.match(r.errors.join('\n'),/baseSha/);
});

test('manual unverified keeps verification UNVERIFIED',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const raw=record(p,lock.planDigest,'b'.repeat(40),{
    manualChecks:[{id:'owner review',status:'unverified',evidence:'Owner check pending'}]
  });
  const n=normalizeRecord(raw,p,lock.planDigest);
  assert.equal(n.ok,true);
  const v=evaluateVerification(p,n.record,{headSha:'b'.repeat(40),paths:['README.md'],target:'HEAD'},repoPass);
  assert.equal(v.verificationState,'UNVERIFIED');
  assert.ok(v.results.some(x=>x.status==='UNVERIFIED'&&x.kind==='manual'));
});

test('missing and failed evidence both block verification',()=>{
  const r=evaluateEvidence(['a','b'],[{id:'a',status:'fail',evidence:'test failed'}],'static');
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
  const lock=createLock(p);
  const raw=record(p,lock.planDigest,'b'.repeat(40),{
    impactChecks:[{id:'ghost.runtime',status:'pass',evidence:'dialogue loaded'}]
  });
  const n=normalizeRecord(raw,p,lock.planDigest);
  assert.equal(n.ok,true);
  const v=evaluateVerification(p,n.record,{
    headSha:'b'.repeat(40),
    paths:['data/ghost-dialogue.js'],
    target:'HEAD'
  },repoPass);
  assert.equal(v.verificationState,'UNVERIFIED');
  assert.ok(v.results.some(x=>x.kind==='impact-evidence'&&x.id==='ghost.work-id'&&x.status==='UNVERIFIED'));
});

test('conditional changed path needs reasoned acknowledgement in Record',()=>{
  const p=normPlan({
    allowedPaths:['README.md'],
    conditionalPaths:[{path:'meta.txt',condition:'metadata fingerprint required'}]
  });
  const lock=createLock(p);
  let raw=record(p,lock.planDigest,'b'.repeat(40));
  let n=normalizeRecord(raw,p,lock.planDigest);
  assert.equal(n.ok,true);
  let v=evaluateVerification(p,n.record,{headSha:'b'.repeat(40),paths:['meta.txt'],target:'HEAD'},repoPass);
  assert.equal(v.verificationState,'UNVERIFIED');
  assert.ok(v.results.some(x=>x.check==='gate.scope.conditional'&&x.status==='FAIL'));

  raw=record(p,lock.planDigest,'b'.repeat(40),{
    conditionalAcknowledgements:[{path:'meta.txt',reason:'metadata fingerprint changed'}]
  });
  n=normalizeRecord(raw,p,lock.planDigest);
  assert.equal(n.ok,true);
  v=evaluateVerification(p,n.record,{headSha:'b'.repeat(40),paths:['meta.txt'],target:'HEAD'},repoPass);
  assert.equal(v.verificationState,'VERIFIED');
});

test('record SHA mismatch blocks verification',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const n=normalizeRecord(record(p,lock.planDigest,'b'.repeat(40)),p,lock.planDigest);
  const v=evaluateVerification(p,n.record,{headSha:'c'.repeat(40),paths:['README.md'],target:'HEAD'},repoPass);
  assert.equal(v.verificationState,'UNVERIFIED');
  assert.ok(v.results.some(x=>x.check==='verification.sha'&&x.status==='FAIL'));
});

test('repository mismatch blocks verification',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const n=normalizeRecord(record(p,lock.planDigest,'b'.repeat(40)),p,lock.planDigest);
  const bad={ok:false,expected:'example/test',actual:'example/other',remote:'https://github.com/example/other.git'};
  const v=evaluateVerification(p,n.record,{headSha:'b'.repeat(40),paths:['README.md'],target:'HEAD'},bad);
  assert.equal(v.verificationState,'UNVERIFIED');
  assert.ok(v.results.some(x=>x.check==='verification.repository'&&x.status==='FAIL'));
});

test('CLI verifies exact locked Plan and rejects stale Record',t=>{
  const {root,base}=tempRepo(t);
  fs.writeFileSync(path.join(root,'README.md'),'two\n');
  git(root,['add','README.md']);
  git(root,['commit','-qm','change']);
  const verified=git(root,['rev-parse','HEAD']);

  const p=plan({baseSha:base});
  const lock=createLock(p);
  const rec=record(p,lock.planDigest,verified);
  const lockPath=path.join(os.tmpdir(),'yumaniwa-lock-'+process.pid+'-'+Date.now()+'.json');
  const recordPath=path.join(os.tmpdir(),'yumaniwa-record-'+process.pid+'-'+Date.now()+'.json');
  t.after(()=>{fs.rmSync(lockPath,{force:true});fs.rmSync(recordPath,{force:true});});
  fs.writeFileSync(lockPath,JSON.stringify(lock));
  fs.writeFileSync(recordPath,JSON.stringify(rec));

  const tool=path.join(__dirname,'..','tools','change-verification-check.cjs');
  let r=spawnSync(process.execPath,[tool,'--root',root,'--lock',lockPath,'--record',recordPath,'--head','HEAD'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);
  assert.match(r.stdout,/Verification: VERIFIED/);

  fs.writeFileSync(path.join(root,'meta.txt'),'two\n');
  git(root,['add','meta.txt']);
  git(root,['commit','-qm','later']);
  r=spawnSync(process.execPath,[tool,'--root',root,'--lock',lockPath,'--record',recordPath,'--head','HEAD'],{encoding:'utf8'});
  assert.equal(r.status,1,r.stdout+r.stderr);
  assert.match(r.stdout,/verification\.sha/);
});

test('CLI preserves executable-bit risk floor during Verification',t=>{
  const {root,base}=tempRepo(t);
  fs.chmodSync(path.join(root,'README.md'),0o755);
  git(root,['add','README.md']);
  git(root,['commit','-qm','make readme executable']);
  const verified=git(root,['rev-parse','HEAD']);

  const p=plan({baseSha:base});
  const lock=createLock(p);
  const rec=record(p,lock.planDigest,verified);
  const lockPath=path.join(os.tmpdir(),'yumaniwa-lock-exec-'+process.pid+'-'+Date.now()+'.json');
  const recordPath=path.join(os.tmpdir(),'yumaniwa-record-exec-'+process.pid+'-'+Date.now()+'.json');
  t.after(()=>{fs.rmSync(lockPath,{force:true});fs.rmSync(recordPath,{force:true});});
  fs.writeFileSync(lockPath,JSON.stringify(lock));
  fs.writeFileSync(recordPath,JSON.stringify(rec));

  const tool=path.join(__dirname,'..','tools','change-verification-check.cjs');
  const r=spawnSync(process.execPath,[tool,'--root',root,'--lock',lockPath,'--record',recordPath,'--head','HEAD'],{encoding:'utf8'});
  assert.equal(r.status,1,r.stdout+r.stderr);
  assert.match(r.stdout,/unknown-code/);
  assert.match(r.stdout,/Verification: UNVERIFIED/);
});

test('CLI rejects mutable Plan substitute and invalid Record',t=>{
  const {root,base}=tempRepo(t);
  const p=plan({baseSha:base});
  const lock=createLock(p);
  const lockPath=path.join(os.tmpdir(),'yumaniwa-lock-bad-'+process.pid+'-'+Date.now()+'.json');
  const recordPath=path.join(os.tmpdir(),'yumaniwa-record-bad-'+process.pid+'-'+Date.now()+'.json');
  t.after(()=>{fs.rmSync(lockPath,{force:true});fs.rmSync(recordPath,{force:true});});

  const tampered=JSON.parse(JSON.stringify(lock));
  tampered.plan.allowedPaths=['main.js'];
  fs.writeFileSync(lockPath,JSON.stringify(tampered));
  fs.writeFileSync(recordPath,'{}');
  const r=spawnSync(process.execPath,[
    path.join(__dirname,'..','tools','change-verification-check.cjs'),
    '--root',root,
    '--lock',lockPath,
    '--record',recordPath
  ],{encoding:'utf8'});
  assert.equal(r.status,2,r.stdout+r.stderr);
  assert.match(r.stderr,/Plan Lock/);
});


function attestationBody(targetSha,checks=[{id:'owner review',status:'pass',evidence:'Reviewed exact target on iPhone Safari'}]) {
  return HUMAN_ATTESTATION_PREFIX + JSON.stringify({
    schema:HUMAN_ATTESTATION_REQUEST_SCHEMA,
    targetSha,
    checks,
  });
}

function attestationContext(overrides={}) {
  return {
    repository:'example/test',
    baseSha:'a'.repeat(40),
    targetSha:'b'.repeat(40),
    prNumber:123,
    commentId:456,
    commentCreatedAt:'2026-09-29T06:00:00Z',
    commentUpdatedAt:'2026-09-29T06:00:00Z',
    commentUserLogin:'human-owner',
    commentUserId:789,
    commentUserType:'User',
    authorAssociation:'OWNER',
    repositoryPermission:'admin',
    actor:'human-owner',
    triggeringActor:'human-owner',
    ...overrides,
  };
}

test('authenticated human attestation binds exact Plan digest target SHA identity and permission',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const result=createAuthenticatedHumanAttestation(
    lock,
    attestationBody('b'.repeat(40)),
    attestationContext()
  );
  assert.equal(result.authenticationState,'AUTHENTICATED');
  assert.equal(result.checkState,'PASS');
  assert.equal(result.planDigest,lock.planDigest);
  assert.equal(result.baseSha,'a'.repeat(40));
  assert.equal(result.targetSha,'b'.repeat(40));
  assert.deepEqual(result.checks,[{
    id:'owner review',
    status:'pass',
    evidence:'Reviewed exact target on iPhone Safari',
  }]);
  assert.equal(result.attester.login,'human-owner');
  assert.equal(result.attester.id,789);
  assert.equal(result.attester.type,'User');
  assert.equal(result.attester.repositoryPermission,'admin');
  assert.equal(result.comment.id,456);
  assert.match(result.comment.bodySha256,/^[0-9a-f]{64}$/);
  assert.equal(result.verificationState,'UNVERIFIED');
});

test('authenticated human FAIL is valid identity evidence without becoming PASS',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const result=createAuthenticatedHumanAttestation(
    lock,
    attestationBody('b'.repeat(40),[{id:'owner review',status:'fail',evidence:'Tap target did not respond'}]),
    attestationContext({repositoryPermission:'write'})
  );
  assert.equal(result.authenticationState,'AUTHENTICATED');
  assert.equal(result.checkState,'FAIL');
  assert.equal(result.checks[0].status,'fail');
  assert.equal(result.verificationState,'UNVERIFIED');
});

test('stale target SHA and unknown or duplicate manual check IDs are rejected',()=>{
  const p=normPlan();
  const lock=createLock(p);

  let result=createAuthenticatedHumanAttestation(
    lock,
    attestationBody('c'.repeat(40)),
    attestationContext()
  );
  assert.equal(result.authenticationState,'REJECTED');
  assert.ok(result.errors.includes('TARGET_SHA_STALE'));
  assert.deepEqual(result.checks,[]);

  result=createAuthenticatedHumanAttestation(
    lock,
    attestationBody('b'.repeat(40),[{id:'not planned',status:'pass',evidence:'Looks fine'}]),
    attestationContext()
  );
  assert.equal(result.authenticationState,'REJECTED');
  assert.ok(result.errors.includes('CHECK_ID_UNPLANNED'));

  result=createAuthenticatedHumanAttestation(
    lock,
    attestationBody('b'.repeat(40),[
      {id:'owner review',status:'pass',evidence:'First'},
      {id:'owner review',status:'pass',evidence:'Second'},
    ]),
    attestationContext()
  );
  assert.equal(result.authenticationState,'REJECTED');
  assert.ok(result.errors.includes('CHECK_ID_DUPLICATE'));
});

test('human attestation rejects bot actor mismatch and insufficient repository permission',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const body=attestationBody('b'.repeat(40));

  let result=createAuthenticatedHumanAttestation(
    lock,body,attestationContext({commentUserType:'Bot'})
  );
  assert.equal(result.authenticationState,'REJECTED');
  assert.ok(result.errors.includes('COMMENTER_NOT_HUMAN_USER'));

  result=createAuthenticatedHumanAttestation(
    lock,body,attestationContext({actor:'different-user'})
  );
  assert.equal(result.authenticationState,'REJECTED');
  assert.ok(result.errors.includes('ACTOR_COMMENTER_MISMATCH'));

  for(const permission of ['read','triage','']) {
    result=createAuthenticatedHumanAttestation(
      lock,body,attestationContext({repositoryPermission:permission})
    );
    assert.equal(result.authenticationState,'REJECTED');
    assert.ok(result.errors.includes('REPOSITORY_PERMISSION_INSUFFICIENT'));
  }

  for(const permission of ['write','maintain','admin']) {
    result=createAuthenticatedHumanAttestation(
      lock,body,attestationContext({repositoryPermission:permission})
    );
    assert.equal(result.authenticationState,'AUTHENTICATED');
  }
});

test('attestation comment JSON is strict canonical one-line data',()=>{
  const p=normPlan();
  const target='b'.repeat(40);
  const canonical=attestationBody(target);
  assert.equal(parseHumanAttestationComment(canonical,p,target).ok,true);

  const raw=JSON.parse(canonical.slice(HUMAN_ATTESTATION_PREFIX.length));
  const pretty=HUMAN_ATTESTATION_PREFIX+JSON.stringify(raw,null,2);
  let parsed=parseHumanAttestationComment(pretty,p,target);
  assert.equal(parsed.ok,false);
  assert.ok(parsed.errors.includes('COMMENT_FORMAT_INVALID'));

  const reordered=HUMAN_ATTESTATION_PREFIX+JSON.stringify({
    targetSha:target,
    schema:HUMAN_ATTESTATION_REQUEST_SCHEMA,
    checks:raw.checks,
  });
  parsed=parseHumanAttestationComment(reordered,p,target);
  assert.equal(parsed.ok,false);
  assert.ok(parsed.errors.includes('COMMENT_JSON_NONCANONICAL'));

  const duplicate=HUMAN_ATTESTATION_PREFIX+
    '{"schema":"'+HUMAN_ATTESTATION_REQUEST_SCHEMA+'","targetSha":"'+target+'","targetSha":"'+target+'","checks":[{"id":"owner review","status":"pass","evidence":"ok"}]}';
  parsed=parseHumanAttestationComment(duplicate,p,target);
  assert.equal(parsed.ok,false);
  assert.ok(parsed.errors.includes('COMMENT_JSON_NONCANONICAL'));
});

test('attestation rejects control bidi multiline and oversized evidence without echoing raw payload',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const badEvidence=[
    'BAD\nFAKE PASS',
    'BAD\u202eBIDI',
    'x'.repeat(1001),
  ];

  for(const evidence of badEvidence) {
    const body=attestationBody('b'.repeat(40),[{id:'owner review',status:'pass',evidence}]);
    const result=createAuthenticatedHumanAttestation(lock,body,attestationContext());
    assert.equal(result.authenticationState,'REJECTED');
    assert.ok(result.errors.includes('CHECK_EVIDENCE_INVALID'));
    const serialized=JSON.stringify(result);
    assert.equal(serialized.includes('FAKE PASS'),false);
    assert.equal(serialized.includes('\u202e'),false);
    assert.equal(serialized.includes('x'.repeat(100)),false);
    assert.deepEqual(result.checks,[]);
  }
});

test('edited comment and repository/base identity mismatch are rejected',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const body=attestationBody('b'.repeat(40));

  let result=createAuthenticatedHumanAttestation(
    lock,body,attestationContext({commentUpdatedAt:'2026-09-29T06:01:00Z'})
  );
  assert.equal(result.authenticationState,'REJECTED');
  assert.ok(result.errors.includes('COMMENT_ALREADY_EDITED'));

  result=createAuthenticatedHumanAttestation(
    lock,body,attestationContext({repository:'example/other'})
  );
  assert.equal(result.authenticationState,'REJECTED');
  assert.ok(result.errors.includes('REPOSITORY_MISMATCH'));

  result=createAuthenticatedHumanAttestation(
    lock,body,attestationContext({baseSha:'c'.repeat(40)})
  );
  assert.equal(result.authenticationState,'REJECTED');
  assert.ok(result.errors.includes('BASE_SHA_MISMATCH'));
});

test('attestation core does not change legacy Verification Record integration',()=>{
  const p=normPlan();
  const lock=createLock(p);
  const result=createAuthenticatedHumanAttestation(
    lock,
    attestationBody('b'.repeat(40)),
    attestationContext()
  );
  assert.equal(result.authenticationState,'AUTHENTICATED');
  assert.equal(result.verificationState,'UNVERIFIED');

  const raw=record(p,lock.planDigest,'b'.repeat(40),{
    manualChecks:[{id:'owner review',status:'unverified',evidence:'Trusted artifact exists but v0.3 integration is not implemented'}]
  });
  const normalized=normalizeRecord(raw,p,lock.planDigest);
  assert.equal(normalized.ok,true);
  const verification=evaluateVerification(
    p,
    normalized.record,
    {headSha:'b'.repeat(40),paths:['README.md'],target:'HEAD'},
    repoPass
  );
  assert.equal(verification.verificationState,'UNVERIFIED');
});
