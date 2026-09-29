'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  EXECUTOR_KIND_BY_ID,
  gitBlobSha1,
  parseRegistryText,
  readRegistry,
  executeStaticChecks,
  formatHuman,
} = require('../tools/change-static-check.cjs');

const ROOT = path.join(__dirname, '..');
const TOOL_ROOT = path.join(ROOT, 'tools');
const REGISTRY_PATH = path.join(TOOL_ROOT, 'change-static-check-registry.json');
const RISK_POLICY_PATH = path.join(TOOL_ROOT, 'change-risk-policy.cjs');
const EXECUTOR_PATH = path.join(TOOL_ROOT, 'change-static-check.cjs');
const REGISTRY_BLOB = gitBlobSha1(fs.readFileSync(REGISTRY_PATH));
const RISK_POLICY_BLOB = gitBlobSha1(fs.readFileSync(RISK_POLICY_PATH));
const EXECUTOR_BLOB = gitBlobSha1(fs.readFileSync(EXECUTOR_PATH));
const REPOSITORY = 'example/repo';

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding:'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function write(root, filePath, content) {
  const target=path.join(root,...filePath.split('/'));
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,content);
}

function copyContractedFiles(root) {
  const registry=readRegistry();
  const definition=registry.checks['change-operations-regression'];
  for(const contract of definition.contracts) {
    const source=fs.readFileSync(path.join(ROOT,...contract.path.split('/')));
    const target=path.join(root,...contract.path.split('/'));
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,source,{mode:0o644});
    assert.equal(gitBlobSha1(source),contract.expectedBlob,contract.path+' registry blob must match repository file');
  }
}

function initRepo(options={}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yumaniwa-static-'));
  git(root,['init','-q']);
  git(root,['config','user.name','Static Test']);
  git(root,['config','user.email','static@example.invalid']);
  write(root,'README.md','base\n');
  if(options.contracts) copyContractedFiles(root);
  if(options.files) for(const [p,c] of Object.entries(options.files)) write(root,p,c);
  git(root,['add','-A']);
  git(root,['commit','-qm','base']);
  return {root,baseSha:git(root,['rev-parse','HEAD'])};
}

function commitAll(root,message='candidate') {
  git(root,['add','-A']);
  git(root,['commit','-qm',message]);
  return git(root,['rev-parse','HEAD']);
}

function plan(baseSha,staticChecks,changedPath='README.md',overrides={}) {
  return {
    schema:'yumaniwa-change-plan/0.2',
    changeId:'trusted-static-test',
    revision:0,
    previousPlanDigest:null,
    revisionReason:null,
    status:'READY',
    repository:REPOSITORY,
    change:'trusted static fixture',
    planLevel:'lite',
    classes:['CONTENT'],
    authority:['Standard'],
    environment:'staging',
    baseSha,
    canonicalSources:[changedPath],
    allowedPaths:[changedPath],
    conditionalPaths:[],
    forbiddenPaths:[],
    expectedChanges:['exercise trusted static evidence'],
    staticChecks,
    manualChecks:[],
    manualCheckExemptionReason:'test fixture',
    impactChecks:[],
    impactExclusions:[],
    promotion:'none',
    ...overrides,
  };
}

function execute(root,baseSha,targetSha,rawPlan,overrides={}) {
  return executeStaticChecks({
    root,
    plan:rawPlan,
    baseSha,
    targetSha,
    repository:REPOSITORY,
    registryBlob:REGISTRY_BLOB,
    riskPolicyBlob:RISK_POLICY_BLOB,
    executorBlob:EXECUTOR_BLOB,
    ...overrides,
  });
}

test('registry parser requires canonical JSON and rejects duplicate-key representations',()=>{
  const canonical=fs.readFileSync(REGISTRY_PATH,'utf8');
  assert.doesNotThrow(()=>parseRegistryText(canonical));
  assert.throws(()=>parseRegistryText(canonical.replace(/\n  "version":/, '\n  "version": "shadow",\n  "version":')),/canonical pretty JSON/);
  assert.throws(()=>parseRegistryText(canonical.trim()),/canonical pretty JSON/);
});

test('executor dispatch kind is base-owned and cannot be changed by registry data',()=>{
  assert.deepEqual(EXECUTOR_KIND_BY_ID,{
    'change-operations-regression':'exact-blobs',
    'node-syntax':'node-syntax',
  });
  const registry=readRegistry();
  for(const [id,definition] of Object.entries(registry.checks)) {
    assert.equal(definition.executor,EXECUTOR_KIND_BY_ID[id]);
  }
});

test('registry is data-only and contains only allowlisted initial IDs',()=>{
  const registry=readRegistry();
  assert.equal(registry.schema,'yumaniwa-trusted-static-check-registry/0.1');
  assert.deepEqual(Object.keys(registry.checks).sort(),['change-operations-regression','node-syntax']);
  for(const definition of Object.values(registry.checks)) {
    assert.equal(definition.candidateExecution,false);
    for(const key of ['command','commands','script','scripts','shell','argv','args']) {
      assert.equal(Object.hasOwn(definition,key),false,key+' must not exist');
    }
  }
});

test('exact-blob registry contracts match the repository files they authorize',()=>{
  const registry=readRegistry();
  const definition=registry.checks['change-operations-regression'];
  assert.equal(definition.executor,'exact-blobs');
  assert.ok(definition.contracts.length >= 8);
  for(const contract of definition.contracts) {
    const body=fs.readFileSync(path.join(ROOT,...contract.path.split('/')));
    assert.equal(gitBlobSha1(body),contract.expectedBlob,contract.path);
    assert.equal(contract.mode,'100644');
    assert.equal(contract.type,'blob');
  }
});

test('unknown command-like static ID fails explicitly without dispatch',t=>{
  const {root,baseSha}=initRepo();
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  write(root,'README.md','changed\n');
  const targetSha=commitAll(root);
  const report=execute(root,baseSha,targetSha,plan(baseSha,['node evil.js']));
  assert.equal(report.staticOk,false);
  assert.equal(report.results.length,1);
  assert.equal(report.results[0].status,'FAIL');
  assert.equal(report.results[0].reason,'UNKNOWN_STATIC_CHECK_ID');
  assert.equal(report.results[0].definition,null);
});

test('exact-blob Change OS contract passes when all contracted candidate blobs match',t=>{
  const {root,baseSha}=initRepo({contracts:true});
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  write(root,'README.md','changed\n');
  const targetSha=commitAll(root);
  const report=execute(root,baseSha,targetSha,plan(baseSha,['change-operations-regression']));
  assert.equal(report.staticOk,true);
  assert.equal(report.results[0].status,'PASS');
  assert.equal(report.results[0].reason,'EXACT_BLOB_CONTRACT_MATCH');
  assert.ok(report.results[0].files.every(file=>file.status==='PASS'));
});

test('any contracted byte change fails even when expected text remains in comments',t=>{
  const {root,baseSha}=initRepo({contracts:true});
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const p='.github/workflows/change-verification.yml';
  const original=fs.readFileSync(path.join(root,...p.split('/')),'utf8');
  write(root,p,original+'\n# harmless-looking retained trusted text: pull_request_target:\n');
  const targetSha=commitAll(root);
  const report=execute(root,baseSha,targetSha,plan(baseSha,['change-operations-regression'],p));
  assert.equal(report.staticOk,false);
  const file=report.results[0].files.find(item=>item.path===p);
  assert.equal(file.status,'FAIL');
  assert.equal(file.reason,'EXACT_BLOB_MISMATCH');
  assert.notEqual(file.actualBlob,file.expectedBlob);
});

test('candidate registry cannot self-authorize a contracted file in the same PR',t=>{
  const {root,baseSha}=initRepo({contracts:true});
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const p='.github/workflows/change-verification.yml';
  const changed=fs.readFileSync(path.join(root,...p.split('/')),'utf8')+'\n# candidate change\n';
  write(root,p,changed);

  const candidateRegistry=JSON.parse(fs.readFileSync(REGISTRY_PATH,'utf8'));
  const contract=candidateRegistry.checks['change-operations-regression'].contracts.find(item=>item.path===p);
  contract.expectedBlob=gitBlobSha1(Buffer.from(changed,'utf8'));
  write(root,'tools/change-static-check-registry.json',JSON.stringify(candidateRegistry,null,2)+'\n');

  const targetSha=commitAll(root);
  const rawPlan=plan(baseSha,['change-operations-regression'],p,{
    allowedPaths:[p,'tools/change-static-check-registry.json'],
  });
  const report=execute(root,baseSha,targetSha,rawPlan);
  assert.equal(report.staticOk,false);
  const file=report.results[0].files.find(item=>item.path===p);
  assert.equal(file.status,'FAIL');
  assert.notEqual(file.actualBlob,file.expectedBlob);
});

test('node-syntax parses top-level candidate code without executing it',t=>{
  const {root,baseSha}=initRepo();
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  write(root,'probe.js','process.exit(99); throw new Error("must not execute");\n');
  const targetSha=commitAll(root);
  const report=execute(root,baseSha,targetSha,plan(baseSha,['node-syntax'],'probe.js'));
  assert.equal(report.staticOk,true);
  assert.equal(report.results[0].status,'PASS');
  assert.equal(report.results[0].files[0].path,'probe.js');
});

test('node-syntax invalid source fails without embedding raw diagnostics or source',t=>{
  const {root,baseSha}=initRepo();
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  write(root,'bad.js','const x = ; // FAKE PASS \u202eBIDI\n');
  const targetSha=commitAll(root);
  const report=execute(root,baseSha,targetSha,plan(baseSha,['node-syntax'],'bad.js'));
  assert.equal(report.staticOk,false);
  assert.equal(report.results[0].reason,'NODE_SYNTAX_FAILED');
  const serialized=JSON.stringify(report);
  assert.equal(serialized.includes('FAKE PASS'),false);
  assert.equal(serialized.includes('\u202eBIDI'),false);
  assert.match(report.results[0].files[0].diagnosticSha256,/^[0-9a-f]{64}$/);
});

test('node-syntax with no applicable JavaScript is trusted N/A, never PASS',t=>{
  const {root,baseSha}=initRepo();
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  write(root,'README.md','changed\n');
  const targetSha=commitAll(root);
  const report=execute(root,baseSha,targetSha,plan(baseSha,['node-syntax']));
  assert.equal(report.staticOk,true);
  assert.equal(report.results[0].status,'N/A');
  assert.equal(report.results[0].reason,'NOT_APPLICABLE');
});

test('deleted JavaScript target is N/A rather than fake syntax PASS',t=>{
  const {root,baseSha}=initRepo({files:{'old.js':'const old = true;\n'}});
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.unlinkSync(path.join(root,'old.js'));
  const targetSha=commitAll(root);
  const report=execute(root,baseSha,targetSha,plan(baseSha,['node-syntax'],'old.js'));
  assert.equal(report.staticOk,true);
  assert.equal(report.results[0].status,'N/A');
  assert.equal(report.results[0].reason,'NO_LIVE_APPLICABLE_TARGET');
  assert.equal(report.results[0].files[0].reason,'DELETED_AT_TARGET');
});

test('all requested checks receive exactly one result and one failure blocks static success',t=>{
  const {root,baseSha}=initRepo();
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  write(root,'probe.js','const ok=true;\n');
  const targetSha=commitAll(root);
  const report=execute(root,baseSha,targetSha,plan(baseSha,['node-syntax','node evil.js'],'probe.js'));
  assert.equal(report.complete,true);
  assert.equal(report.results.length,2);
  assert.deepEqual(report.results.map(item=>item.id),['node-syntax','node evil.js']);
  assert.equal(report.results[0].status,'PASS');
  assert.equal(report.results[1].status,'FAIL');
  assert.equal(report.staticOk,false);
});

test('stale target SHA is rejected before trusted dispatch',t=>{
  const {root,baseSha}=initRepo();
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  write(root,'probe.js','const ok=true;\n');
  commitAll(root);
  assert.throws(()=>execute(root,baseSha,'d'.repeat(40),plan(baseSha,['node-syntax'],'probe.js')));
});

test('loaded trusted registry Risk Policy and executor must match base-owned source blobs',t=>{
  const {root,baseSha}=initRepo();
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  write(root,'README.md','changed\n');
  const targetSha=commitAll(root);
  const rawPlan=plan(baseSha,['node-syntax']);
  assert.throws(()=>execute(root,baseSha,targetSha,rawPlan,{registryBlob:'e'.repeat(40)}),/trusted registry blob/);
  assert.throws(()=>execute(root,baseSha,targetSha,rawPlan,{riskPolicyBlob:'e'.repeat(40)}),/trusted Risk Policy blob/);
  assert.throws(()=>execute(root,baseSha,targetSha,rawPlan,{executorBlob:'e'.repeat(40)}),/trusted executor blob/);
});

test('human output escapes candidate-controlled unknown ID controls',t=>{
  const {root,baseSha}=initRepo();
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  write(root,'README.md','changed\n');
  const targetSha=commitAll(root);
  const report=execute(root,baseSha,targetSha,plan(baseSha,['BAD\nFAKE PASS \u202eBIDI']));
  const human=formatHuman(report);
  assert.ok(human.includes('BAD\\nFAKE PASS \\u202eBIDI'),human);
  assert.equal(human.includes('BAD\nFAKE PASS'),false);
  assert.equal(human.includes('\u202e'),false);
});
