'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  safeChildEnv,
  measuredSpawn,
  runNodeSyntax,
  runTrustedRegression,
  runStaticCheck,
  buildMechanicalEvidence,
} = require('../tools/change-evidence-runner.cjs');
const { TRUSTED_OS_FILES } = require('../tools/change-provenance.cjs');
const { createLock } = require('../tools/change-plan-lock.cjs');

function git(cwd,args){
  const r=spawnSync('git',['-C',cwd,...args],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  return r.stdout.trim();
}

function tempRepo(t,prefix='yumaniwa-evidence-'){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),prefix));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  git(root,['init','-q']);
  git(root,['config','user.email','test@example.com']);
  git(root,['config','user.name','Test']);
  return root;
}

test('safe child environment does not forward GitHub tokens or arbitrary secrets',()=>{
  const oldToken=process.env.GITHUB_TOKEN;
  const oldSecret=process.env.MY_SECRET;
  process.env.GITHUB_TOKEN='secret-token';
  process.env.MY_SECRET='secret-value';
  try{
    const env=safeChildEnv();
    assert.equal(env.GITHUB_TOKEN,undefined);
    assert.equal(env.MY_SECRET,undefined);
    assert.equal(env.CI,'true');
  } finally {
    if(oldToken===undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN=oldToken;
    if(oldSecret===undefined) delete process.env.MY_SECRET; else process.env.MY_SECRET=oldSecret;
  }
});

test('measuredSpawn records actual exit code and output digests',()=>{
  const ok=measuredSpawn(process.execPath,['-e','process.stdout.write("ok")'],process.cwd());
  assert.equal(ok.exitCode,0);
  assert.match(ok.stdoutSha256,/^[0-9a-f]{64}$/);

  const bad=measuredSpawn(process.execPath,['-e','process.exit(7)'],process.cwd());
  assert.equal(bad.exitCode,7);
});

test('node-syntax check measures changed JavaScript and fails broken syntax',t=>{
  const root=tempRepo(t);
  fs.writeFileSync(path.join(root,'a.js'),'const x = 1;\n');
  git(root,['add','.']);git(root,['commit','-qm','base']);
  const base=git(root,['rev-parse','HEAD']);
  fs.writeFileSync(path.join(root,'a.js'),'const x = ;\n');

  const plan={baseSha:base};
  const result=runNodeSyntax(plan,root,null);
  assert.equal(result.status,'fail');
  assert.equal(result.files.length,1);
  assert.equal(result.executions[0].exitCode,1);
});

test('trusted regression uses trusted tests against candidate tools',t=>{
  const trusted=tempRepo(t,'yumaniwa-trusted-tests-');
  const target=tempRepo(t,'yumaniwa-target-tools-');
  fs.mkdirSync(path.join(trusted,'tests'),{recursive:true});
  fs.mkdirSync(path.join(target,'tools'),{recursive:true});

  fs.writeFileSync(path.join(trusted,'tests/test-change-mini.cjs'),[
    "'use strict';",
    "const {test}=require('node:test');",
    "const assert=require('node:assert/strict');",
    "const mini=require('../tools/change-mini.cjs');",
    "test('candidate tool contract',()=>assert.equal(mini.value,42));",
    ""
  ].join('\n'));
  fs.writeFileSync(path.join(target,'tools/change-mini.cjs'),"module.exports={value:42};\n");

  let result=runTrustedRegression(trusted,target,'trusted-change-regression');
  assert.equal(result.status,'pass',JSON.stringify(result));

  fs.writeFileSync(path.join(target,'tools/change-mini.cjs'),"module.exports={value:0};\n");
  result=runTrustedRegression(trusted,target,'trusted-change-regression');
  assert.equal(result.status,'fail');
});

test('unknown static check ID fails instead of accepting free-form evidence',()=>{
  const result=runStaticCheck(
    'not-registered',
    {baseSha:'a'.repeat(40)},
    process.cwd(),
    process.cwd(),
    'HEAD'
  );
  assert.equal(result.status,'fail');
  assert.match(result.detail,/not registered/);
});

test('buildMechanicalEvidence binds clean trusted base to exact candidate SHA and measured exit',t=>{
  const sourceRoot=path.resolve(__dirname,'..');
  const trusted=tempRepo(t,'yumaniwa-trusted-integration-');
  fs.mkdirSync(path.join(trusted,'tools'),{recursive:true});
  for(const relative of TRUSTED_OS_FILES){
    const src=path.join(sourceRoot,relative);
    const dst=path.join(trusted,relative);
    fs.mkdirSync(path.dirname(dst),{recursive:true});
    fs.copyFileSync(src,dst);
  }
  fs.writeFileSync(path.join(trusted,'x.js'),'const x = 1;\n');
  git(trusted,['add','.']);
  git(trusted,['commit','-qm','trusted base']);
  const base=git(trusted,['rev-parse','HEAD']);

  const target=path.join(os.tmpdir(),'yumaniwa-target-integration-'+process.pid+'-'+Date.now());
  t.after(()=>fs.rmSync(target,{recursive:true,force:true}));
  let clone=spawnSync('git',['clone','-q',trusted,target],{encoding:'utf8'});
  assert.equal(clone.status,0,clone.stderr||clone.stdout);
  git(target,['config','user.email','test@example.com']);
  git(target,['config','user.name','Test']);
  git(target,['remote','set-url','origin','https://github.com/example/test.git']);
  fs.writeFileSync(path.join(target,'x.js'),'const x = 2;\n');
  git(target,['add','x.js']);
  git(target,['commit','-qm','candidate']);
  const candidate=git(target,['rev-parse','HEAD']);

  const p={
    schema:'yumaniwa-change-plan/0.2',
    changeId:'evidence-integration',
    revision:0,
    previousPlanDigest:null,
    revisionReason:null,
    status:'READY',
    repository:'example/test',
    change:'evidence integration',
    planLevel:'lite',
    classes:['CONTENT'],
    authority:['Standard'],
    environment:'staging',
    baseSha:base,
    canonicalSources:['x.js'],
    allowedPaths:['x.js'],
    conditionalPaths:[],
    forbiddenPaths:[],
    expectedChanges:['update x.js'],
    staticChecks:['node-syntax'],
    manualChecks:[],
    manualCheckExemptionReason:'fixture has no human-visible behavior',
    impactChecks:[],
    impactExclusions:[],
    promotion:'none'
  };
  const lock=createLock(p);
  const lockPath=path.join(os.tmpdir(),'yumaniwa-evidence-lock-'+process.pid+'-'+Date.now()+'.json');
  t.after(()=>fs.rmSync(lockPath,{force:true}));
  fs.writeFileSync(lockPath,JSON.stringify(lock));

  const report=buildMechanicalEvidence({
    trustedRoot:trusted,
    root:target,
    lock:lockPath,
    head:'HEAD'
  });
  assert.equal(report.mechanicalState,'PASS');
  assert.equal(report.runner.osSourceSha,base);
  assert.equal(report.runner.clean,true);
  assert.equal(report.verifiedSha,candidate);
  assert.match(report.verifiedTreeSha,/^[0-9a-f]{40}$/);
  assert.match(report.runner.provenanceDigest,/^[0-9a-f]{64}$/);
  const syntax=report.checks.find(x=>x.id==='node-syntax');
  assert.equal(syntax.status,'pass');
  assert.equal(syntax.executions.length,1);
  assert.equal(syntax.executions[0].exitCode,0);

  fs.writeFileSync(path.join(trusted,'untracked.txt'),'dirty\n');
  assert.throws(()=>buildMechanicalEvidence({
    trustedRoot:trusted,
    root:target,
    lock:lockPath,
    head:'HEAD'
  }),/untrusted Change OS snapshot/);
});

