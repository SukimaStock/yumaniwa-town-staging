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

const HUMAN_ATTESTATION_SCHEMA = 'yumaniwa-trusted-human-attestation/0.1';
const HUMAN_ATTESTATION_PREFIX = '/yumaniwa-attest-manual ';

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function gitBlobSha1(buffer) {
  const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const header = Buffer.from('blob ' + body.length + '\0', 'utf8');
  return crypto.createHash('sha1').update(header).update(body).digest('hex');
}

function isFullSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
}

function isNonemptyString(value) {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function exactStringArray(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!value.every(isNonemptyString)) return null;
  if (new Set(value).size !== value.length) return null;
  return [...value];
}

function sameStringSet(left, right) {
  if (left.length !== right.length) return false;
  const set = new Set(right);
  return left.every(value => set.has(value));
}

function validateTrustedPrMetadata(pr, repository, errors) {
  if (!pr || typeof pr !== 'object' || Array.isArray(pr)) {
    errors.push('PR_METADATA_INVALID');
    return;
  }
  const keys = ['number','repository','baseRepo','headRepo','baseRef','baseSha','headSha'];
  if (Object.keys(pr).sort().join('\n') !== keys.sort().join('\n')) errors.push('PR_METADATA_FIELDS_INVALID');
  if (!Number.isInteger(pr.number) || pr.number < 1) errors.push('PR_NUMBER_INVALID');
  if (pr.repository !== repository) errors.push('PR_REPOSITORY_MISMATCH');
  if (pr.baseRepo !== repository || pr.headRepo !== repository) errors.push('PR_MUST_BE_SAME_REPOSITORY');
  if (!isNonemptyString(pr.baseRef)) errors.push('PR_BASE_REF_INVALID');
  if (!isFullSha(pr.baseSha)) errors.push('PR_BASE_SHA_INVALID');
  if (!isFullSha(pr.headSha)) errors.push('PR_HEAD_SHA_INVALID');
}

function evaluateHumanAttestation(event, plan, planDigest, pr, options = {}) {
  const errors = [];
  const repository = typeof options.repository === 'string' ? options.repository : '';
  const trustedToolBlob = typeof options.toolBlob === 'string' ? options.toolBlob.toLowerCase() : '';
  const body = event && event.comment && typeof event.comment.body === 'string' ? event.comment.body : '';
  const bodySha256 = sha256Hex(Buffer.from(body, 'utf8'));

  if (!repository) errors.push('TRUSTED_REPOSITORY_MISSING');
  validateTrustedPrMetadata(pr, repository, errors);

  if (!event || event.action !== 'created') errors.push('EVENT_NOT_CREATED_COMMENT');
  if (!event || !event.issue || !event.issue.pull_request) errors.push('EVENT_NOT_PULL_REQUEST_COMMENT');
  if (!event || !event.repository || event.repository.full_name !== repository) errors.push('EVENT_REPOSITORY_MISMATCH');
  if (!plan || plan.repository !== repository) errors.push('PLAN_REPOSITORY_MISMATCH');

  if (event && event.issue && pr && event.issue.number !== pr.number) errors.push('PR_NUMBER_MISMATCH');
  if (event && event.repository && pr && pr.baseRef !== event.repository.default_branch) {
    errors.push('PR_BASE_NOT_DEFAULT_BRANCH');
  }
  if (plan && pr && plan.baseSha !== pr.baseSha) errors.push('PLAN_BASE_SHA_MISMATCH');

  const commentUser = event && event.comment && event.comment.user && typeof event.comment.user === 'object'
    ? event.comment.user : {};
  const sender = event && event.sender && typeof event.sender === 'object' ? event.sender : {};
  const repositoryOwner = event && event.repository && event.repository.owner &&
    typeof event.repository.owner === 'object' ? event.repository.owner : {};
  if (commentUser.type !== 'User' || sender.type !== 'User') errors.push('ATTESTER_MUST_BE_HUMAN_USER');
  if (!isNonemptyString(commentUser.login) || !isNonemptyString(sender.login) || commentUser.login !== sender.login) {
    errors.push('ATTESTER_LOGIN_MISMATCH');
  }
  if (!Number.isInteger(commentUser.id) || !Number.isInteger(sender.id) || commentUser.id !== sender.id) {
    errors.push('ATTESTER_ID_MISMATCH');
  }
  if (repositoryOwner.type !== 'User' || !isNonemptyString(repositoryOwner.login) || !Number.isInteger(repositoryOwner.id)) {
    errors.push('REPOSITORY_OWNER_IDENTITY_INVALID');
  } else {
    if (commentUser.login !== repositoryOwner.login) errors.push('ATTESTER_NOT_REPOSITORY_OWNER_LOGIN');
    if (commentUser.id !== repositoryOwner.id) errors.push('ATTESTER_NOT_REPOSITORY_OWNER_ID');
  }
  const association = event && event.comment && event.comment.author_association;

  let payload = null;
  if (!body.startsWith(HUMAN_ATTESTATION_PREFIX)) {
    errors.push('ATTESTATION_PREFIX_MISMATCH');
  } else {
    const payloadText = body.slice(HUMAN_ATTESTATION_PREFIX.length).trim();
    try {
      payload = JSON.parse(payloadText);
    } catch {
      errors.push('ATTESTATION_JSON_INVALID');
    }
  }

  let checks = [];
  let note = '';
  if (payload !== null) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      errors.push('ATTESTATION_PAYLOAD_NOT_OBJECT');
    } else {
      const allowedKeys = ['checks','note','sha'];
      const actualKeys = Object.keys(payload).sort();
      if (actualKeys.length < 2 || actualKeys.some(key => !allowedKeys.includes(key))) {
        errors.push('ATTESTATION_FIELDS_INVALID');
      }
      if (!isFullSha(payload.sha)) {
        errors.push('ATTESTATION_SHA_INVALID');
      } else if (pr && isFullSha(pr.headSha) && payload.sha.toLowerCase() !== pr.headSha.toLowerCase()) {
        errors.push('ATTESTATION_SHA_STALE');
      }

      const normalizedChecks = exactStringArray(payload.checks);
      if (!normalizedChecks) {
        errors.push('ATTESTATION_CHECKS_INVALID');
      } else {
        checks = normalizedChecks;
      }

      if (payload.note !== undefined) {
        if (typeof payload.note !== 'string' || Buffer.byteLength(payload.note, 'utf8') > 4096) {
          errors.push('ATTESTATION_NOTE_INVALID');
        } else {
          note = payload.note;
        }
      }
    }
  }

  const requiredChecks = plan && Array.isArray(plan.manualChecks) ? [...plan.manualChecks] : [];
  if (requiredChecks.length === 0) {
    errors.push('PLAN_HAS_NO_MANUAL_CHECKS');
  } else if (checks.length) {
    if (!sameStringSet(checks, requiredChecks)) {
      const required = new Set(requiredChecks);
      const attested = new Set(checks);
      if (checks.some(id => !required.has(id))) errors.push('ATTESTATION_UNPLANNED_CHECK');
      if (requiredChecks.some(id => !attested.has(id))) errors.push('ATTESTATION_MISSING_CHECK');
      if (!errors.includes('ATTESTATION_UNPLANNED_CHECK') && !errors.includes('ATTESTATION_MISSING_CHECK')) {
        errors.push('ATTESTATION_CHECK_SET_MISMATCH');
      }
    }
  }

  if (!isFullSha(trustedToolBlob)) {
    errors.push('TRUSTED_TOOL_BLOB_INVALID');
  } else if (trustedToolBlob !== gitBlobSha1(fs.readFileSync(__filename))) {
    errors.push('TRUSTED_TOOL_BLOB_MISMATCH');
  }

  const validCreatedAt = event && event.comment && typeof event.comment.created_at === 'string' &&
    Number.isFinite(Date.parse(event.comment.created_at));
  if (!validCreatedAt) errors.push('COMMENT_CREATED_AT_INVALID');
  if (!event || !event.comment || !Number.isInteger(event.comment.id) || event.comment.id < 1) {
    errors.push('COMMENT_ID_INVALID');
  }

  return {
    schema:HUMAN_ATTESTATION_SCHEMA,
    repository,
    prNumber:pr && Number.isInteger(pr.number) ? pr.number : null,
    baseSha:pr && isFullSha(pr.baseSha) ? pr.baseSha.toLowerCase() : null,
    targetSha:pr && isFullSha(pr.headSha) ? pr.headSha.toLowerCase() : null,
    plan:{
      changeId:plan && typeof plan.changeId === 'string' ? plan.changeId : null,
      revision:plan && Number.isInteger(plan.revision) ? plan.revision : null,
      digest:planDigest,
      manualChecks:requiredChecks,
    },
    attester:{
      login:isNonemptyString(commentUser.login) ? commentUser.login : null,
      id:Number.isInteger(commentUser.id) ? commentUser.id : null,
      type:commentUser.type || null,
      authorAssociation:association || null,
      repositoryOwnerLogin:isNonemptyString(repositoryOwner.login) ? repositoryOwner.login : null,
      repositoryOwnerId:Number.isInteger(repositoryOwner.id) ? repositoryOwner.id : null,
    },
    comment:{
      id:event && event.comment && Number.isInteger(event.comment.id) ? event.comment.id : null,
      createdAt:validCreatedAt ? event.comment.created_at : null,
      htmlUrl:event && event.comment && typeof event.comment.html_url === 'string' ? event.comment.html_url : null,
      bodyBytes:Buffer.byteLength(body, 'utf8'),
      bodySha256,
    },
    attestation:{
      checks,
      noteBytes:Buffer.byteLength(note, 'utf8'),
      noteSha256:note ? sha256Hex(Buffer.from(note, 'utf8')) : null,
      complete:errors.length === 0,
    },
    trustedSources:{
      verifier:{path:'tools/change-verification-check.cjs',blob:isFullSha(trustedToolBlob) ? trustedToolBlob : null},
    },
    validation:{
      status:errors.length ? 'FAIL' : 'PASS',
      errors,
    },
    attestationState:errors.length ? 'REJECTED' : 'ATTESTED',
    verificationState:'UNVERIFIED',
    limitation:'C3-3 authenticated human attestation only; final Verification Record integration and VERIFIED are intentionally not implemented.',
    exitCode:errors.length ? 1 : 0,
  };
}

function parseAttestationArgs(argv) {
  const options={lock:null,event:null,pr:null,repository:null,toolBlob:null,json:false};
  for(let i=0;i<argv.length;i+=1){
    const arg=argv[i];
    if(arg==='--json') options.json=true;
    else if(['--lock','--event','--pr','--repository','--tool-blob'].includes(arg)){
      const value=argv[++i];
      if(!value) throw new Error(arg+' requires a value');
      if(arg==='--tool-blob') options.toolBlob=value;
      else options[arg.slice(2)]=value;
    } else if(arg==='--help'||arg==='-h') options.help=true;
    else throw new Error('unknown attestation argument');
  }
  return options;
}

function attestationUsage() {
  return [
    'Usage:',
    '  node tools/change-verification-check.cjs attest --lock <plan-lock.json> --event <github-event.json> --pr <trusted-pr.json> --repository <owner/name> --tool-blob <sha> [--json]',
    '',
    'Validates one GitHub-authenticated manual attestation against the immutable Plan Lock and exact current PR head.',
  ].join('\n');
}

function runAttestationCli(argv) {
  let options;
  try {
    options=parseAttestationArgs(argv);
    if(options.help){process.stdout.write(attestationUsage()+'\n');return 0;}
    for(const key of ['lock','event','pr','repository','toolBlob']) {
      if(!options[key]) throw new Error('required attestation argument missing');
    }

    const rawLock=readJson(options.lock,'lock');
    const lockCheck=verifyLock(rawLock,null);
    if(!lockCheck.ok) throw new Error('invalid Plan Lock');
    const normalizedPlan=normalizeImpactPlan(lockCheck.plan,{allowLegacy:false});
    if(!normalizedPlan.ok) throw new Error('invalid locked Change Plan');

    const event=readJson(options.event,'event');
    const pr=readJson(options.pr,'pr');
    const report=evaluateHumanAttestation(
      event,
      normalizedPlan.plan,
      lockCheck.planDigest,
      pr,
      {repository:options.repository,toolBlob:options.toolBlob}
    );
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    return report.exitCode;
  } catch {
    process.stderr.write('Human Attestation error: trusted input validation failed.\n');
    if(options && options.help!==true) process.stderr.write(attestationUsage()+'\n');
    return 2;
  }
}

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
  if(argv[0]==='attest') return runAttestationCli(argv.slice(1));
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
  HUMAN_ATTESTATION_SCHEMA,
  HUMAN_ATTESTATION_PREFIX,
  gitBlobSha1,
  evaluateHumanAttestation,
  runAttestationCli,
  normalizeRecord,
  evaluateEvidence,
  evaluateVerification,
  runCli,
};
