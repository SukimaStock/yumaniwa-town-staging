'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  collectChangedPaths,
  evaluateScope,
} = require('./change-scope-guard.cjs');
const {
  normalizeImpactPlan,
  evaluateImpact,
} = require('./change-impact-check.cjs');
const {
  verifyLock,
} = require('./change-plan-lock.cjs');
const {
  evaluateRiskPlan,
  verifyRepositoryIdentity,
  collectExecutablePaths,
} = require('./change-risk-check.cjs');

const RECORD_SCHEMA = 'yumaniwa-verification-record/0.2';
const LEGACY_RECORD_SCHEMA = 'yumaniwa-verification-record/0.1';
const CHECK_STATUSES = new Set(['pass', 'fail', 'unverified']);
const HUMAN_ATTESTATION_REQUEST_SCHEMA = 'yumaniwa-human-attestation-request/0.1';
const HUMAN_ATTESTATION_SCHEMA = 'yumaniwa-authenticated-human-attestation/0.1';
const HUMAN_ATTESTATION_PREFIX = '/yumaniwa-attest-v0.1\n';
const HUMAN_ATTESTATION_STATUSES = new Set(['pass', 'fail']);
const HUMAN_ATTESTATION_PERMISSIONS = new Set(['write', 'maintain', 'admin']);
const HUMAN_ATTESTATION_UNSAFE = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const HUMAN_EVIDENCE_MAX_LENGTH = 1000;
const HUMAN_CHECK_ID_MAX_LENGTH = 200;

function readJson(sourcePath, label) {
  if (!sourcePath) throw new Error('--' + label + ' is required');
  const source = sourcePath === '-'
    ? fs.readFileSync(0, 'utf8')
    : fs.readFileSync(path.resolve(sourcePath), 'utf8');
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(label + ' JSON parse failed: ' + error.message);
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function exactKeys(object, keys) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key,index)=>key===expected[index]);
}

function safeHumanText(value, maxLength) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim() &&
    !HUMAN_ATTESTATION_UNSAFE.test(value);
}

function normalizeHumanAttestationRequest(raw, plan, targetSha) {
  const errors=[];
  if (!exactKeys(raw,['schema','targetSha','checks'])) {
    errors.push('REQUEST_FIELDS_INVALID');
    return {ok:false,errors,request:null};
  }
  if (raw.schema!==HUMAN_ATTESTATION_REQUEST_SCHEMA) errors.push('REQUEST_SCHEMA_INVALID');
  if (typeof raw.targetSha!=='string' || !/^[0-9a-f]{40}$/.test(raw.targetSha)) {
    errors.push('TARGET_SHA_INVALID');
  } else if (raw.targetSha!==targetSha) {
    errors.push('TARGET_SHA_STALE');
  }
  if (!Array.isArray(raw.checks) || raw.checks.length===0 || raw.checks.length>50) {
    errors.push('CHECKS_INVALID');
  }

  const allowed=new Set(plan.manualChecks || []);
  const seen=new Set();
  const checks=[];
  if (Array.isArray(raw.checks)) {
    for (const entry of raw.checks) {
      if (!exactKeys(entry,['id','status','evidence'])) {
        errors.push('CHECK_FIELDS_INVALID');
        continue;
      }
      if (!safeHumanText(entry.id,HUMAN_CHECK_ID_MAX_LENGTH)) {
        errors.push('CHECK_ID_INVALID');
        continue;
      }
      if (seen.has(entry.id)) {
        errors.push('CHECK_ID_DUPLICATE');
        continue;
      }
      seen.add(entry.id);
      if (!allowed.has(entry.id)) errors.push('CHECK_ID_UNPLANNED');
      if (!HUMAN_ATTESTATION_STATUSES.has(entry.status)) errors.push('CHECK_STATUS_INVALID');
      if (!safeHumanText(entry.evidence,HUMAN_EVIDENCE_MAX_LENGTH)) errors.push('CHECK_EVIDENCE_INVALID');
      checks.push({id:entry.id,status:entry.status,evidence:entry.evidence});
    }
  }

  const request={
    schema:HUMAN_ATTESTATION_REQUEST_SCHEMA,
    targetSha:typeof raw.targetSha==='string' ? raw.targetSha : '',
    checks,
  };
  return {ok:errors.length===0,errors:[...new Set(errors)],request};
}

function parseHumanAttestationComment(body, plan, targetSha) {
  const bodyHash=sha256(Buffer.from(typeof body==='string' ? body : '', 'utf8'));
  if (typeof body!=='string' || body.includes('\r') || !body.startsWith(HUMAN_ATTESTATION_PREFIX)) {
    return {ok:false,errors:['COMMENT_FORMAT_INVALID'],request:null,bodySha256:bodyHash};
  }
  const jsonText=body.slice(HUMAN_ATTESTATION_PREFIX.length);
  if (!jsonText || jsonText.includes('\n')) {
    return {ok:false,errors:['COMMENT_FORMAT_INVALID'],request:null,bodySha256:bodyHash};
  }

  let raw;
  try {
    raw=JSON.parse(jsonText);
  } catch {
    return {ok:false,errors:['COMMENT_JSON_INVALID'],request:null,bodySha256:bodyHash};
  }

  const normalized=normalizeHumanAttestationRequest(raw,plan,targetSha);
  if (!normalized.ok) return {...normalized,bodySha256:bodyHash};

  const canonical=JSON.stringify(normalized.request);
  if (jsonText!==canonical) {
    return {ok:false,errors:['COMMENT_JSON_NONCANONICAL'],request:null,bodySha256:bodyHash};
  }
  return {...normalized,bodySha256:bodyHash};
}

function createAuthenticatedHumanAttestation(rawLock, body, context) {
  const errors=[];
  const lockCheck=verifyLock(rawLock,null);
  if (!lockCheck.ok) {
    return {
      schema:HUMAN_ATTESTATION_SCHEMA,
      authenticationState:'REJECTED',
      checkState:'REJECTED',
      errors:['PLAN_LOCK_INVALID'],
    };
  }
  const normalizedPlan=normalizeImpactPlan(lockCheck.plan,{allowLegacy:false});
  if (!normalizedPlan.ok) {
    return {
      schema:HUMAN_ATTESTATION_SCHEMA,
      authenticationState:'REJECTED',
      checkState:'REJECTED',
      errors:['PLAN_INVALID'],
    };
  }
  const plan=normalizedPlan.plan;

  if (!context || typeof context!=='object' || Array.isArray(context)) {
    return {
      schema:HUMAN_ATTESTATION_SCHEMA,
      authenticationState:'REJECTED',
      checkState:'REJECTED',
      errors:['CONTEXT_INVALID'],
    };
  }

  const repository=typeof context.repository==='string' ? context.repository : '';
  const baseSha=typeof context.baseSha==='string' ? context.baseSha.toLowerCase() : '';
  const targetSha=typeof context.targetSha==='string' ? context.targetSha.toLowerCase() : '';
  const login=typeof context.commentUserLogin==='string' ? context.commentUserLogin : '';
  const actor=typeof context.actor==='string' ? context.actor : '';
  const triggeringActor=typeof context.triggeringActor==='string' ? context.triggeringActor : '';
  const permission=typeof context.repositoryPermission==='string' ? context.repositoryPermission : '';
  const userType=typeof context.commentUserType==='string' ? context.commentUserType : '';
  const authorAssociation=typeof context.authorAssociation==='string' ? context.authorAssociation : '';

  if (repository!==plan.repository) errors.push('REPOSITORY_MISMATCH');
  if (!/^[0-9a-f]{40}$/.test(baseSha) || baseSha!==plan.baseSha) errors.push('BASE_SHA_MISMATCH');
  if (!/^[0-9a-f]{40}$/.test(targetSha)) errors.push('TARGET_SHA_INVALID');
  if (!Number.isInteger(context.prNumber) || context.prNumber<1) errors.push('PR_NUMBER_INVALID');
  if (!Number.isInteger(context.commentId) || context.commentId<1) errors.push('COMMENT_ID_INVALID');
  if (typeof context.commentCreatedAt!=='string' || !Number.isFinite(Date.parse(context.commentCreatedAt))) {
    errors.push('COMMENT_CREATED_AT_INVALID');
  }
  if (typeof context.commentUpdatedAt!=='string' || !Number.isFinite(Date.parse(context.commentUpdatedAt))) {
    errors.push('COMMENT_UPDATED_AT_INVALID');
  }
  if (context.commentCreatedAt!==context.commentUpdatedAt) errors.push('COMMENT_ALREADY_EDITED');
  if (!safeHumanText(login,100) || !safeHumanText(actor,100)) errors.push('ACTOR_INVALID');
  if (login!==actor) errors.push('ACTOR_COMMENTER_MISMATCH');
  if (userType!=='User') errors.push('COMMENTER_NOT_HUMAN_USER');
  if (!HUMAN_ATTESTATION_PERMISSIONS.has(permission)) errors.push('REPOSITORY_PERMISSION_INSUFFICIENT');

  const parsed=parseHumanAttestationComment(body,plan,targetSha);
  errors.push(...parsed.errors);

  const authenticationState=errors.length===0 ? 'AUTHENTICATED' : 'REJECTED';
  const checks=authenticationState==='AUTHENTICATED' ? parsed.request.checks : [];
  const checkState=authenticationState==='AUTHENTICATED'
    ? (checks.some(check=>check.status==='fail') ? 'FAIL' : 'PASS')
    : 'REJECTED';

  return {
    schema:HUMAN_ATTESTATION_SCHEMA,
    authenticationState,
    checkState,
    repository:plan.repository,
    changeId:plan.changeId,
    planDigest:lockCheck.planDigest,
    planRevision:plan.revision,
    baseSha:plan.baseSha,
    targetSha:/^[0-9a-f]{40}$/.test(targetSha) ? targetSha : null,
    checks,
    attester:{
      login:safeHumanText(login,100) ? login : null,
      id:Number.isInteger(context.commentUserId) ? context.commentUserId : null,
      type:userType || null,
      authorAssociation:authorAssociation || null,
      repositoryPermission:permission || null,
    },
    comment:{
      id:Number.isInteger(context.commentId) ? context.commentId : null,
      createdAt:typeof context.commentCreatedAt==='string' ? context.commentCreatedAt : null,
      updatedAt:typeof context.commentUpdatedAt==='string' ? context.commentUpdatedAt : null,
      bodySha256:parsed.bodySha256,
    },
    eventActor:{
      actor:safeHumanText(actor,100) ? actor : null,
      triggeringActor:safeHumanText(triggeringActor,100) ? triggeringActor : null,
    },
    errors:[...new Set(errors)],
    verificationState:'UNVERIFIED',
    limitation:'C3-3 authenticated human attestation only; final evidence integration and VERIFIED are not implemented.',
  };
}

function normalizeCheckEntries(value, key, errors) {
  if (!Array.isArray(value)) {
    errors.push(key + ' must be an array');
    return [];
  }
  const out = [];
  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(key + '[' + index + '] must be an object');
      continue;
    }
    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    const status = typeof entry.status === 'string' ? entry.status.trim() : '';
    const evidence = typeof entry.evidence === 'string' ? entry.evidence.trim() : '';
    if (!id) errors.push(key + '[' + index + '].id must be nonempty');
    if (!CHECK_STATUSES.has(status)) errors.push(key + '[' + index + '].status must be pass, fail, or unverified');
    if (!evidence) errors.push(key + '[' + index + '].evidence must be nonempty');
    if (id) out.push({ id, status, evidence });
  }
  const ids = out.map(item => item.id);
  if (new Set(ids).size !== ids.length) errors.push(key + ' must not contain duplicate ids');
  return out;
}

function normalizeConditionalAcknowledgements(value, plan, errors) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push('conditionalAcknowledgements must be an array');
    return [];
  }
  const declared = new Set((plan.conditionalPaths || []).map(item => item.path));
  const out = [];
  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push('conditionalAcknowledgements[' + index + '] must be an object');
      continue;
    }
    const p = typeof entry.path === 'string' ? entry.path.trim().replace(/\\/g, '/') : '';
    const reason = typeof entry.reason === 'string' ? entry.reason.trim() : '';
    if (!p) errors.push('conditionalAcknowledgements[' + index + '].path must be nonempty');
    if (!reason) errors.push('conditionalAcknowledgements[' + index + '].reason must be nonempty');
    if (p && !declared.has(p)) errors.push('conditional acknowledgement is not declared in Plan: ' + p);
    if (p) out.push({ path: p, reason });
  }
  const ids = out.map(item => item.path);
  if (new Set(ids).size !== ids.length) errors.push('conditionalAcknowledgements must not contain duplicate paths');
  return out;
}

function normalizeRecord(raw, plan, planDigest, options = {}) {
  const errors = [];
  const allowLegacy = options.allowLegacy === true;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['record must be a JSON object'] };
  }

  const legacy = raw.schema === LEGACY_RECORD_SCHEMA;
  if (raw.schema !== RECORD_SCHEMA && !(allowLegacy && legacy)) {
    errors.push('schema must equal ' + RECORD_SCHEMA);
  }

  if (!legacy) {
    if (raw.changeId !== plan.changeId) errors.push('record changeId must equal locked Plan changeId');
    if (raw.planDigest !== planDigest) errors.push('record planDigest must equal locked Plan digest');
    if (raw.repository !== plan.repository) errors.push('record repository must equal locked Plan repository');
    if (raw.planRevision !== plan.revision) errors.push('record planRevision must equal locked Plan revision');
  }

  if (raw.change !== plan.change) errors.push('record change must exactly match locked Change Plan');
  if (raw.environment !== 'staging') errors.push('environment must equal staging');
  if (raw.baseSha !== plan.baseSha) errors.push('record baseSha must equal locked Change Plan baseSha');
  if (typeof raw.verifiedSha !== 'string' || !/^[0-9a-f]{40}$/i.test(raw.verifiedSha)) {
    errors.push('verifiedSha must be a full 40-character commit SHA');
  }
  if (typeof raw.recordedAt !== 'string' || !raw.recordedAt.trim() || !Number.isFinite(Date.parse(raw.recordedAt))) {
    errors.push('recordedAt must be a valid date/time string');
  }
  if (typeof raw.recordedBy !== 'string' || !raw.recordedBy.trim()) {
    errors.push('recordedBy must be nonempty');
  }
  if (raw.notes !== undefined && typeof raw.notes !== 'string') {
    errors.push('notes must be a string when present');
  }

  const conditionalAcknowledgements = normalizeConditionalAcknowledgements(
    raw.conditionalAcknowledgements || [],
    plan,
    errors
  );
  const staticChecks = normalizeCheckEntries(raw.staticChecks, 'staticChecks', errors);
  const impactChecks = normalizeCheckEntries(raw.impactChecks, 'impactChecks', errors);
  const manualChecks = normalizeCheckEntries(raw.manualChecks, 'manualChecks', errors);

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    legacy,
    record: {
      ...raw,
      verifiedSha: raw.verifiedSha.toLowerCase(),
      recordedAt: raw.recordedAt.trim(),
      recordedBy: raw.recordedBy.trim(),
      conditionalAcknowledgements,
      staticChecks,
      impactChecks,
      manualChecks,
      notes: typeof raw.notes === 'string' ? raw.notes.trim() : '',
    },
  };
}

function evaluateEvidence(requiredIds, entries, kind) {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const required = new Set(requiredIds);
  const results = [];

  for (const id of requiredIds) {
    const entry = byId.get(id);
    if (!entry) {
      results.push({status:'UNVERIFIED',check:'verification.missing',kind,id,detail:'required check has no Verification Record entry'});
      continue;
    }
    if (entry.status === 'pass') {
      results.push({status:'PASS',check:'verification.evidence',kind,id,detail:entry.evidence});
    } else if (entry.status === 'fail') {
      results.push({status:'FAIL',check:'verification.failed',kind,id,detail:entry.evidence});
    } else {
      results.push({status:'UNVERIFIED',check:'verification.unverified',kind,id,detail:entry.evidence});
    }
  }

  for (const entry of entries) {
    if (!required.has(entry.id)) {
      results.push({
        status:'FAIL',
        check:'verification.unplanned',
        kind,
        id:entry.id,
        detail:'entry is not declared in the locked Change Plan check list; revise Plan before implementation or report it separately',
      });
    }
  }
  return results;
}

function evaluateVerification(plan, record, diff, repositoryCheck, options = {}) {
  const results = [];

  results.push(repositoryCheck.ok
    ? {status:'PASS',check:'verification.repository',kind:'git',id:repositoryCheck.actual,detail:'repository identity matches locked Plan'}
    : {status:'FAIL',check:'verification.repository',kind:'git',id:repositoryCheck.actual || '',detail:'expected '+repositoryCheck.expected+' but found '+repositoryCheck.actual});

  if (record.verifiedSha === diff.headSha.toLowerCase()) {
    results.push({status:'PASS',check:'verification.sha',kind:'git',id:record.verifiedSha,detail:'record verifiedSha matches requested Git target'});
  } else {
    results.push({status:'FAIL',check:'verification.sha',kind:'git',id:record.verifiedSha,detail:'record verifiedSha does not match requested Git target '+diff.headSha});
  }

  try {
    const scope = evaluateScope(plan,diff.paths,record.conditionalAcknowledgements.map(item => item.path));
    for (const item of scope.results) {
      results.push({
        status:item.status === 'PASS' ? 'PASS' : 'FAIL',
        check:'gate.' + item.check,
        kind:'scope',
        id:item.path || item.pattern || '',
        detail:item.detail,
      });
    }
  } catch (error) {
    results.push({status:'FAIL',check:'gate.scope-error',kind:'scope',id:'',detail:error.message});
  }

  const risk = evaluateRiskPlan(plan,diff.paths,{executablePaths:options.executablePaths || []});
  for (const item of risk.results) {
    results.push({
      status:item.status,
      check:'gate.' + item.check,
      kind:'risk',
      id:item.impact || item.profile || '',
      detail:item.detail,
    });
  }

  const impact = evaluateImpact(plan,diff.paths,{executablePaths:options.executablePaths || []});
  for (const item of impact.results) {
    results.push({
      status:item.status === 'FAIL' ? 'FAIL' : item.status,
      check:'gate.' + item.check,
      kind:'impact',
      id:item.impact || '',
      detail:item.detail,
    });
  }

  results.push(...evaluateEvidence(plan.staticChecks || [],record.staticChecks,'static'));
  results.push(...evaluateEvidence(plan.impactChecks || [],record.impactChecks,'impact-evidence'));
  results.push(...evaluateEvidence(plan.manualChecks || [],record.manualChecks,'manual'));

  const blocking = results.some(item =>
    item.status === 'FAIL' ||
    item.status === 'UNVERIFIED' ||
    item.status === 'SCOPE_REVIEW_REQUIRED'
  );

  return {
    results,
    verificationState:blocking ? 'UNVERIFIED' : 'VERIFIED',
    exitCode:blocking ? 1 : 0,
  };
}

function parseArgs(argv) {
  const options={root:process.cwd(),lock:null,previousLock:null,record:null,head:'HEAD',json:false};
  for(let i=0;i<argv.length;i+=1){
    const arg=argv[i];
    if(arg==='--json') options.json=true;
    else if(arg==='--root'||arg==='--lock'||arg==='--previous-lock'||arg==='--record'||arg==='--head'){
      const value=argv[++i];
      if(!value) throw new Error(arg+' requires a value');
      if(arg==='--previous-lock') options.previousLock=value;
      else options[arg.slice(2)]=value;
    } else if(arg==='--help'||arg==='-h') options.help=true;
    else throw new Error('unknown argument: '+arg);
  }
  return options;
}

function usage() {
  return [
    'Usage:',
    '  node tools/change-verification-check.cjs --lock <plan-lock.json> --record <record.json> [--previous-lock <previous-lock.json>] [--root <repo>] [--head <ref>] [--json]',
    '',
    'Trusted v0.2 verification reads the Plan only from a verified Plan Lock.',
    'The Record must reference the exact Plan digest/revision/repository.',
  ].join('\n');
}

function formatHuman(report) {
  const lines=[];
  lines.push('YUMANIWA CHANGE VERIFICATION v0.2');
  lines.push('Change:   '+report.change);
  lines.push('Plan:     '+report.planDigest+' r'+report.planRevision);
  lines.push('Base:     '+report.baseSha);
  lines.push('Verified: '+report.verifiedSha);
  lines.push('Target:   '+report.target+' ('+report.headSha+')');
  lines.push('Recorded: '+report.recordedAt+' by '+report.recordedBy);
  lines.push('');
  for(const item of report.results){
    const id=item.id ? ' '+item.id : '';
    lines.push(item.status+' '+item.check+' ['+item.kind+']'+id+' — '+item.detail);
  }
  lines.push('');
  lines.push('Verification: '+report.verificationState);
  return lines.join('\n');
}

function runCli(argv=process.argv.slice(2)) {
  let options;
  try {
    options=parseArgs(argv);
    if(options.help){process.stdout.write(usage()+'\n');return 0;}
    if(!options.lock) throw new Error('--lock is required');
    if(!options.record) throw new Error('--record is required');

    const rawLock=readJson(options.lock,'lock');
    const previous=options.previousLock ? readJson(options.previousLock,'previous lock') : null;
    const lockCheck=verifyLock(rawLock,previous);
    if(!lockCheck.ok) throw new Error('invalid Plan Lock:\n- '+lockCheck.errors.join('\n- '));

    const normalizedPlan=normalizeImpactPlan(lockCheck.plan,{allowLegacy:false});
    if(!normalizedPlan.ok) throw new Error('invalid locked Change Plan:\n- '+normalizedPlan.errors.join('\n- '));
    const plan=normalizedPlan.plan;

    const rawRecord=readJson(options.record,'record');
    const normalizedRecord=normalizeRecord(rawRecord,plan,lockCheck.planDigest);
    if(!normalizedRecord.ok) throw new Error('invalid verification record:\n- '+normalizedRecord.errors.join('\n- '));
    const record=normalizedRecord.record;

    const repositoryCheck=verifyRepositoryIdentity(options.root,plan.repository);
    const diff=collectChangedPaths(options.root,plan.baseSha,options.head || 'HEAD');
    const executablePaths=collectExecutablePaths(
      options.root,
      plan.baseSha,
      diff.headSha,
      diff.paths,
      {includeWorktree:diff.target==='worktree'}
    );
    const evaluated=evaluateVerification(plan,record,diff,repositoryCheck,{executablePaths});

    const report={
      schema:'yumaniwa-change-verification-report/0.2',
      change:plan.change,
      changeId:plan.changeId,
      planDigest:lockCheck.planDigest,
      planRevision:plan.revision,
      repository:plan.repository,
      planLevel:plan.planLevel,
      classes:plan.classes,
      baseSha:plan.baseSha,
      verifiedSha:record.verifiedSha,
      target:diff.target,
      headSha:diff.headSha,
      changedPaths:[...new Set(diff.paths)].sort(),
      executablePaths,
      recordedAt:record.recordedAt,
      recordedBy:record.recordedBy,
      results:evaluated.results,
      verificationState:evaluated.verificationState,
      exitCode:evaluated.exitCode,
    };

    process.stdout.write((options.json?JSON.stringify(report,null,2):formatHuman(report))+'\n');
    return evaluated.exitCode;
  } catch(error) {
    process.stderr.write('Verification error: '+error.message+'\n');
    if(options && options.help!==true) process.stderr.write(usage()+'\n');
    return 2;
  }
}

if(require.main===module) process.exitCode=runCli();

module.exports={
  RECORD_SCHEMA,
  LEGACY_RECORD_SCHEMA,
  HUMAN_ATTESTATION_REQUEST_SCHEMA,
  HUMAN_ATTESTATION_SCHEMA,
  HUMAN_ATTESTATION_PREFIX,
  normalizeHumanAttestationRequest,
  parseHumanAttestationComment,
  createAuthenticatedHumanAttestation,
  normalizeRecord,
  evaluateEvidence,
  evaluateVerification,
  runCli,
};
