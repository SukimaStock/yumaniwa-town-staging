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
  HUMAN_ATTESTATION_PREFIX,
  gitBlobSha1,
  evaluateHumanAttestation,
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


function attestationFixture(overrides={}) {
  const baseSha='a'.repeat(40);
  const headSha='b'.repeat(40);
  const p=normPlan({baseSha,manualChecks:['owner review','visual smoke']});
  const lock=createLock(p);
  const payload={
    sha:headSha,
    checks:['owner review','visual smoke'],
    note:'checked exact candidate',
    ...(overrides.payload||{}),
  };
  const event={
    action:'created',
    issue:{number:42,pull_request:{url:'https://api.github.com/repos/example/test/pulls/42'}},
    repository:{full_name:'example/test',default_branch:'main'},
    comment:{
      id:987,
      body:HUMAN_ATTESTATION_PREFIX+JSON.stringify(payload),
      created_at:'2026-09-29T08:10:00Z',
      html_url:'https://github.com/example/test/pull/42#issuecomment-987',
      author_association:'OWNER',
      user:{login:'alice',id:123,type:'User'},
    },
    sender:{login:'alice',id:123,type:'User'},
    ...(overrides.event||{}),
  };
  if(overrides.comment) event.comment={...event.comment,...overrides.comment};
  if(overrides.commentUser) event.comment.user={...event.comment.user,...overrides.commentUser};
  if(overrides.sender) event.sender={...event.sender,...overrides.sender};
  if(overrides.repository) event.repository={...event.repository,...overrides.repository};

  const pr={
    number:42,
    repository:'example/test',
    baseRepo:'example/test',
    headRepo:'example/test',
    baseRef:'main',
    baseSha,
    headSha,
    ...(overrides.pr||{}),
  };

  const toolPath=path.join(__dirname,'..','tools','change-verification-check.cjs');
  const toolBlob=gitBlobSha1(fs.readFileSync(toolPath));
  return {p,lock,event,pr,toolBlob,toolPath};
}

function evaluateAttestationFixture(overrides={}) {
  const f=attestationFixture(overrides);
  const report=evaluateHumanAttestation(
    f.event,
    f.p,
    f.lock.planDigest,
    f.pr,
    {repository:'example/test',toolBlob:overrides.toolBlob||f.toolBlob}
  );
  return {...f,report};
}

test('authenticated human attestation binds exact GitHub identity PR head Plan and complete manual checks',()=>{
  const {report,toolBlob}=evaluateAttestationFixture();
  assert.equal(report.validation.status,'PASS');
  assert.equal(report.attestationState,'ATTESTED');
  assert.equal(report.attestation.complete,true);
  assert.equal(report.verificationState,'UNVERIFIED');
  assert.equal(report.targetSha,'b'.repeat(40));
  assert.equal(report.attester.login,'alice');
  assert.equal(report.attester.id,123);
  assert.equal(report.attester.authorAssociation,'OWNER');
  assert.deepEqual(report.attestation.checks,['owner review','visual smoke']);
  assert.match(report.comment.bodySha256,/^[0-9a-f]{64}$/);
  assert.match(report.attestation.noteSha256,/^[0-9a-f]{64}$/);
  assert.equal(report.trustedSources.verifier.blob,toolBlob);
  assert.equal(Object.hasOwn(report.comment,'body'),false);
  assert.equal(Object.hasOwn(report.attestation,'note'),false);
});

test('human attestation rejects bot and GitHub identity mismatch',()=>{
  let report=evaluateAttestationFixture({commentUser:{type:'Bot'},sender:{type:'Bot'}}).report;
  assert.equal(report.validation.status,'FAIL');
  assert.ok(report.validation.errors.includes('ATTESTER_MUST_BE_HUMAN_USER'));

  report=evaluateAttestationFixture({sender:{login:'mallory'}}).report;
  assert.equal(report.validation.status,'FAIL');
  assert.ok(report.validation.errors.includes('ATTESTER_LOGIN_MISMATCH'));

  report=evaluateAttestationFixture({sender:{id:999}}).report;
  assert.equal(report.validation.status,'FAIL');
  assert.ok(report.validation.errors.includes('ATTESTER_ID_MISMATCH'));
});

test('human attestation rejects unaffiliated author fork PR and non-default base',()=>{
  let report=evaluateAttestationFixture({comment:{author_association:'NONE'}}).report;
  assert.ok(report.validation.errors.includes('ATTESTER_NOT_REPOSITORY_ASSOCIATED'));

  report=evaluateAttestationFixture({pr:{headRepo:'example/fork'}}).report;
  assert.ok(report.validation.errors.includes('PR_MUST_BE_SAME_REPOSITORY'));

  report=evaluateAttestationFixture({pr:{baseRef:'feature'}}).report;
  assert.ok(report.validation.errors.includes('PR_BASE_NOT_DEFAULT_BRANCH'));
});

test('human attestation rejects stale head SHA missing extra and duplicate manual checks',()=>{
  let report=evaluateAttestationFixture({payload:{sha:'c'.repeat(40)}}).report;
  assert.ok(report.validation.errors.includes('ATTESTATION_SHA_STALE'));

  report=evaluateAttestationFixture({payload:{checks:['owner review']}}).report;
  assert.ok(report.validation.errors.includes('ATTESTATION_MISSING_CHECK'));

  report=evaluateAttestationFixture({payload:{checks:['owner review','visual smoke','surprise']}}).report;
  assert.ok(report.validation.errors.includes('ATTESTATION_UNPLANNED_CHECK'));

  report=evaluateAttestationFixture({payload:{checks:['owner review','owner review']}}).report;
  assert.ok(report.validation.errors.includes('ATTESTATION_CHECKS_INVALID'));
});

test('human attestation rejects malformed payload unknown fields and Plan without manual checks',()=>{
  let f=attestationFixture();
  f.event.comment.body=HUMAN_ATTESTATION_PREFIX+'{not-json';
  let report=evaluateHumanAttestation(f.event,f.p,f.lock.planDigest,f.pr,{repository:'example/test',toolBlob:f.toolBlob});
  assert.ok(report.validation.errors.includes('ATTESTATION_JSON_INVALID'));

  report=evaluateAttestationFixture({payload:{unexpected:true}}).report;
  assert.ok(report.validation.errors.includes('ATTESTATION_FIELDS_INVALID'));

  f=attestationFixture();
  const noManual=normPlan({baseSha:f.p.baseSha,manualChecks:[],manualCheckExemptionReason:'none required'});
  const noManualLock=createLock(noManual);
  report=evaluateHumanAttestation(f.event,noManual,noManualLock.planDigest,f.pr,{repository:'example/test',toolBlob:f.toolBlob});
  assert.ok(report.validation.errors.includes('PLAN_HAS_NO_MANUAL_CHECKS'));
});

test('human attestation rejects tampered trusted verifier source blob',()=>{
  const {report}=evaluateAttestationFixture({toolBlob:'d'.repeat(40)});
  assert.ok(report.validation.errors.includes('TRUSTED_TOOL_BLOB_MISMATCH'));
  assert.equal(report.attestationState,'REJECTED');
});

test('attest CLI emits machine evidence and keeps final verification UNVERIFIED',t=>{
  const f=attestationFixture();
  const lockPath=path.join(os.tmpdir(),'yumaniwa-attest-lock-'+process.pid+'-'+Date.now()+'.json');
  const eventPath=path.join(os.tmpdir(),'yumaniwa-attest-event-'+process.pid+'-'+Date.now()+'.json');
  const prPath=path.join(os.tmpdir(),'yumaniwa-attest-pr-'+process.pid+'-'+Date.now()+'.json');
  t.after(()=>{
    fs.rmSync(lockPath,{force:true});
    fs.rmSync(eventPath,{force:true});
    fs.rmSync(prPath,{force:true});
  });
  fs.writeFileSync(lockPath,JSON.stringify(f.lock));
  fs.writeFileSync(eventPath,JSON.stringify(f.event));
  fs.writeFileSync(prPath,JSON.stringify(f.pr));

  const r=spawnSync(process.execPath,[
    f.toolPath,'attest',
    '--lock',lockPath,
    '--event',eventPath,
    '--pr',prPath,
    '--repository','example/test',
    '--tool-blob',f.toolBlob,
    '--json'
  ],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);
  const report=JSON.parse(r.stdout);
  assert.equal(report.attestationState,'ATTESTED');
  assert.equal(report.validation.status,'PASS');
  assert.equal(report.verificationState,'UNVERIFIED');
});

test('attest CLI rejects stale exact head without echoing raw comment body to stderr',t=>{
  const f=attestationFixture({payload:{sha:'c'.repeat(40),note:'FAKE PASS \\u202eBIDI'}});
  const lockPath=path.join(os.tmpdir(),'yumaniwa-attest-lock-stale-'+process.pid+'-'+Date.now()+'.json');
  const eventPath=path.join(os.tmpdir(),'yumaniwa-attest-event-stale-'+process.pid+'-'+Date.now()+'.json');
  const prPath=path.join(os.tmpdir(),'yumaniwa-attest-pr-stale-'+process.pid+'-'+Date.now()+'.json');
  t.after(()=>{
    fs.rmSync(lockPath,{force:true});
    fs.rmSync(eventPath,{force:true});
    fs.rmSync(prPath,{force:true});
  });
  fs.writeFileSync(lockPath,JSON.stringify(f.lock));
  fs.writeFileSync(eventPath,JSON.stringify(f.event));
  fs.writeFileSync(prPath,JSON.stringify(f.pr));

  const r=spawnSync(process.execPath,[
    f.toolPath,'attest',
    '--lock',lockPath,
    '--event',eventPath,
    '--pr',prPath,
    '--repository','example/test',
    '--tool-blob',f.toolBlob,
    '--json'
  ],{encoding:'utf8'});
  assert.equal(r.status,1,r.stdout+r.stderr);
  const report=JSON.parse(r.stdout);
  assert.ok(report.validation.errors.includes('ATTESTATION_SHA_STALE'));
  assert.equal(r.stderr.includes('FAKE PASS'),false);
  assert.equal(r.stderr.includes('\u202e'),false);
});
