'use strict';

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
const { verifyLock } = require('./change-plan-lock.cjs');
const {
  evaluateRiskPlan,
  verifyRepositoryIdentity,
} = require('./change-risk-check.cjs');
const {
  computeProvenance,
  evaluateTrustedSnapshot,
} = require('./change-provenance.cjs');
const {
  buildMechanicalEvidence,
} = require('./change-evidence-runner.cjs');

const RECORD_SCHEMA = 'yumaniwa-verification-record/0.3';
const LEGACY_RECORD_SCHEMAS = new Set([
  'yumaniwa-verification-record/0.1',
  'yumaniwa-verification-record/0.2',
]);
const ATTESTATION_STATUSES = new Set(['pass', 'fail', 'unverified']);
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

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

function normalizeAttestations(value, errors, now = Date.now()) {
  if (!Array.isArray(value)) {
    errors.push('humanAttestations must be an array');
    return [];
  }
  const out = [];
  for (const [index, entry] of value.entries()) {
    const key = 'humanAttestations[' + index + ']';
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(key + ' must be an object');
      continue;
    }
    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    const status = typeof entry.status === 'string' ? entry.status.trim() : '';
    const performedBy = typeof entry.performedBy === 'string' ? entry.performedBy.trim() : '';
    const recordedBy = typeof entry.recordedBy === 'string' ? entry.recordedBy.trim() : '';
    const observedSha = typeof entry.observedSha === 'string' ? entry.observedSha.trim().toLowerCase() : '';
    const device = typeof entry.device === 'string' ? entry.device.trim() : '';
    const attestationRef = typeof entry.attestationRef === 'string' ? entry.attestationRef.trim() : '';
    const attestedAt = typeof entry.attestedAt === 'string' ? entry.attestedAt.trim() : '';

    if (!id) errors.push(key + '.id must be nonempty');
    if (!ATTESTATION_STATUSES.has(status)) errors.push(key + '.status must be pass, fail, or unverified');
    if (!performedBy) errors.push(key + '.performedBy must be nonempty');
    if (!recordedBy) errors.push(key + '.recordedBy must be nonempty');
    if (!/^[0-9a-f]{40}$/.test(observedSha)) errors.push(key + '.observedSha must be a full commit SHA');
    if (!device) errors.push(key + '.device must be nonempty');
    if (!attestationRef) errors.push(key + '.attestationRef must be nonempty');
    const parsed = Date.parse(attestedAt);
    if (!attestedAt || !Number.isFinite(parsed)) {
      errors.push(key + '.attestedAt must be a valid date/time');
    } else if (parsed > now + FUTURE_TOLERANCE_MS) {
      errors.push(key + '.attestedAt must not be in the future');
    }

    if (id) {
      out.push({
        id,
        status,
        performedBy,
        recordedBy,
        observedSha,
        device,
        attestationRef,
        attestedAt,
      });
    }
  }
  const ids = out.map(item => item.id);
  if (new Set(ids).size !== ids.length) errors.push('humanAttestations must not contain duplicate ids');
  return out;
}

function normalizeRecord(raw, plan, planDigest, options = {}) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['record must be a JSON object'] };
  }

  if (raw.schema !== RECORD_SCHEMA) {
    if (LEGACY_RECORD_SCHEMAS.has(raw.schema)) {
      errors.push('legacy Verification Record cannot satisfy trusted v0.3; create a v0.3 human attestation record');
    } else {
      errors.push('schema must equal ' + RECORD_SCHEMA);
    }
  }

  if (raw.changeId !== plan.changeId) errors.push('record changeId must equal locked Plan changeId');
  if (raw.planDigest !== planDigest) errors.push('record planDigest must equal locked Plan digest');
  if (raw.repository !== plan.repository) errors.push('record repository must equal locked Plan repository');
  if (raw.planRevision !== plan.revision) errors.push('record planRevision must equal locked Plan revision');
  if (raw.change !== plan.change) errors.push('record change must exactly match locked Change Plan');
  if (raw.environment !== 'staging') errors.push('environment must equal staging');
  if (raw.baseSha !== plan.baseSha) errors.push('record baseSha must equal locked Change Plan baseSha');
  if (typeof raw.verifiedSha !== 'string' || !/^[0-9a-f]{40}$/i.test(raw.verifiedSha)) {
    errors.push('verifiedSha must be a full 40-character commit SHA');
  }

  const recordedAt = typeof raw.recordedAt === 'string' ? raw.recordedAt.trim() : '';
  const recordedAtMs = Date.parse(recordedAt);
  const now = options.now === undefined ? Date.now() : options.now;
  if (!recordedAt || !Number.isFinite(recordedAtMs)) {
    errors.push('recordedAt must be a valid date/time string');
  } else if (recordedAtMs > now + FUTURE_TOLERANCE_MS) {
    errors.push('recordedAt must not be in the future');
  }
  if (typeof raw.recordedBy !== 'string' || !raw.recordedBy.trim()) {
    errors.push('recordedBy must be nonempty');
  }

  for (const legacyKey of ['staticChecks', 'impactChecks', 'manualChecks']) {
    if (raw[legacyKey] !== undefined) {
      errors.push(legacyKey + ' is legacy free-form evidence and is not accepted in v0.3');
    }
  }

  const conditionalAcknowledgements = normalizeConditionalAcknowledgements(
    raw.conditionalAcknowledgements || [],
    plan,
    errors
  );
  const humanAttestations = normalizeAttestations(raw.humanAttestations || [], errors, now);

  if (raw.notes !== undefined && typeof raw.notes !== 'string') {
    errors.push('notes must be a string when present');
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    record: {
      ...raw,
      verifiedSha: raw.verifiedSha.toLowerCase(),
      recordedAt,
      recordedBy: raw.recordedBy.trim(),
      conditionalAcknowledgements,
      humanAttestations,
      notes: typeof raw.notes === 'string' ? raw.notes.trim() : '',
    },
  };
}

function evaluateMechanicalChecks(requiredIds, mechanical) {
  const results = [];
  const byId = new Map((mechanical.checks || []).map(item => [item.id, item]));
  const required = new Set(requiredIds || []);

  if (mechanical.mechanicalState !== 'PASS') {
    results.push({
      status: 'FAIL',
      check: 'mechanical.state',
      kind: 'mechanical',
      id: '',
      detail: 'mechanical evidence runner did not report PASS',
    });
  }

  for (const id of required) {
    const entry = byId.get(id);
    if (!entry) {
      results.push({
        status: 'UNVERIFIED',
        check: 'mechanical.missing',
        kind: 'mechanical',
        id,
        detail: 'required static check has no runner-measured result',
      });
      continue;
    }
    if (entry.status !== 'pass') {
      results.push({
        status: 'FAIL',
        check: 'mechanical.failed',
        kind: 'mechanical',
        id,
        detail: entry.detail || 'runner-measured check failed',
      });
      continue;
    }
    const badExecution = (entry.executions || []).find(item => item.exitCode !== 0 || item.error);
    if (badExecution) {
      results.push({
        status: 'FAIL',
        check: 'mechanical.exit',
        kind: 'mechanical',
        id,
        detail: 'PASS entry contains a non-zero/error execution',
      });
      continue;
    }
    results.push({
      status: 'PASS',
      check: 'mechanical.measured',
      kind: 'mechanical',
      id,
      detail: entry.detail || 'runner-measured PASS',
    });
  }

  for (const entry of mechanical.checks || []) {
    if (!required.has(entry.id)) {
      results.push({
        status: 'FAIL',
        check: 'mechanical.unplanned',
        kind: 'mechanical',
        id: entry.id || '',
        detail: 'runner produced an unplanned static check result',
      });
    }
  }

  return results;
}

function evaluateHumanAttestations(requiredIds, entries, verifiedSha) {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const required = new Set(requiredIds || []);
  const results = [];

  for (const id of required) {
    const entry = byId.get(id);
    if (!entry) {
      results.push({
        status: 'UNVERIFIED',
        check: 'human.missing',
        kind: 'human',
        id,
        detail: 'required manual check has no human attestation',
      });
      continue;
    }
    if (entry.observedSha !== verifiedSha) {
      results.push({
        status: 'FAIL',
        check: 'human.sha',
        kind: 'human',
        id,
        detail: 'attestation observedSha does not match verifiedSha',
      });
      continue;
    }
    if (entry.status === 'pass') {
      results.push({
        status: 'PASS',
        check: 'human.attested',
        kind: 'human',
        id,
        detail: entry.performedBy + ' attested on ' + entry.device + ' (' + entry.attestationRef + ')',
      });
    } else if (entry.status === 'fail') {
      results.push({
        status: 'FAIL',
        check: 'human.failed',
        kind: 'human',
        id,
        detail: entry.performedBy + ' reported failure (' + entry.attestationRef + ')',
      });
    } else {
      results.push({
        status: 'UNVERIFIED',
        check: 'human.unverified',
        kind: 'human',
        id,
        detail: entry.performedBy + ' has not completed the observation (' + entry.attestationRef + ')',
      });
    }
  }

  for (const entry of entries) {
    if (!required.has(entry.id)) {
      results.push({
        status: 'FAIL',
        check: 'human.unplanned',
        kind: 'human',
        id: entry.id,
        detail: 'attestation is not declared in the locked Plan manualChecks',
      });
    }
  }
  return results;
}

function evaluateVerification(plan, record, diff, repositoryCheck, mechanical, provenanceCheck) {
  const results = [];

  results.push(repositoryCheck.ok
    ? {status:'PASS',check:'verification.repository',kind:'git',id:repositoryCheck.actual,detail:'repository identity matches locked Plan'}
    : {status:'FAIL',check:'verification.repository',kind:'git',id:repositoryCheck.actual || '',detail:'expected '+repositoryCheck.expected+' but found '+repositoryCheck.actual});

  if (record.verifiedSha === diff.headSha.toLowerCase()) {
    results.push({status:'PASS',check:'verification.sha',kind:'git',id:record.verifiedSha,detail:'record verifiedSha matches requested Git target'});
  } else {
    results.push({status:'FAIL',check:'verification.sha',kind:'git',id:record.verifiedSha,detail:'record verifiedSha does not match requested Git target '+diff.headSha});
  }

  if (mechanical.verifiedSha !== diff.headSha.toLowerCase()) {
    results.push({status:'FAIL',check:'mechanical.sha',kind:'mechanical',id:mechanical.verifiedSha,detail:'mechanical target SHA differs from verification target'});
  } else {
    results.push({status:'PASS',check:'mechanical.sha',kind:'mechanical',id:mechanical.verifiedSha,detail:'mechanical evidence targets exact verified SHA'});
  }

  if (provenanceCheck.ok) {
    results.push({
      status:'PASS',
      check:'mechanical.provenance',
      kind:'mechanical',
      id:mechanical.runner.provenanceDigest,
      detail:'checker/rules executed from clean locked-base Change OS snapshot',
    });
  } else {
    for (const detail of provenanceCheck.errors) {
      results.push({status:'FAIL',check:'mechanical.provenance',kind:'mechanical',id:'',detail});
    }
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

  const risk = evaluateRiskPlan(plan,diff.paths);
  for (const item of risk.results) {
    results.push({
      status:item.status,
      check:'gate.' + item.check,
      kind:'risk',
      id:item.impact || item.profile || '',
      detail:item.detail,
    });
  }

  const impact = evaluateImpact(plan,diff.paths);
  for (const item of impact.results) {
    results.push({
      status:item.status === 'FAIL' ? 'FAIL' : item.status,
      check:'gate.' + item.check,
      kind:'impact',
      id:item.impact || '',
      detail:item.detail,
    });
  }

  const mechanicalResults = evaluateMechanicalChecks(plan.staticChecks || [], mechanical);
  const humanResults = evaluateHumanAttestations(plan.manualChecks || [], record.humanAttestations, record.verifiedSha);
  results.push(...mechanicalResults, ...humanResults);

  const mechanicalBlocking = results.some(item =>
    item.kind !== 'human' &&
    (item.status === 'FAIL' || item.status === 'UNVERIFIED' || item.status === 'SCOPE_REVIEW_REQUIRED')
  );
  const humanBlocking = humanResults.some(item =>
    item.status === 'FAIL' || item.status === 'UNVERIFIED'
  );
  const blocking = mechanicalBlocking || humanBlocking;

  return {
    results,
    mechanicalState: mechanicalBlocking ? 'UNVERIFIED' : 'VERIFIED',
    humanState: humanBlocking ? 'UNVERIFIED' : 'VERIFIED',
    verificationState: blocking ? 'UNVERIFIED' : 'VERIFIED',
    exitCode: blocking ? 1 : 0,
  };
}

function parseArgs(argv) {
  const options={root:process.cwd(),lock:null,previousLock:null,record:null,head:'HEAD',mechanicalOutput:null,json:false};
  for(let i=0;i<argv.length;i+=1){
    const arg=argv[i];
    if(arg==='--json') options.json=true;
    else if(arg==='--root'||arg==='--lock'||arg==='--previous-lock'||arg==='--record'||arg==='--head'||arg==='--mechanical-output'){
      const value=argv[++i];
      if(!value) throw new Error(arg+' requires a value');
      if(arg==='--previous-lock') options.previousLock=value;
      else if(arg==='--mechanical-output') options.mechanicalOutput=value;
      else options[arg.slice(2)]=value;
    } else if(arg==='--help'||arg==='-h') options.help=true;
    else throw new Error('unknown argument: '+arg);
  }
  return options;
}

function usage() {
  return [
    'Usage:',
    '  node <trusted-base>/tools/change-verification-check.cjs',
    '    --lock <plan-lock.json> --record <record.json> --root <target-checkout> [--head <ref>]',
    '    [--previous-lock <previous-lock.json>] [--mechanical-output <report.json>] [--json]',
    '',
    'v0.3 re-runs mechanical static checks itself. It must be executed from a clean checkout',
    'whose HEAD equals the locked Plan baseSha. Free-form static PASS strings are not accepted.',
  ].join('\n');
}

function formatHuman(report) {
  const lines=[];
  lines.push('YUMANIWA CHANGE VERIFICATION v0.3');
  lines.push('Change:   '+report.change);
  lines.push('Plan:     '+report.planDigest+' r'+report.planRevision);
  lines.push('Base OS:  '+report.baseSha);
  lines.push('Verified: '+report.verifiedSha);
  lines.push('Target:   '+report.target+' ('+report.headSha+')');
  lines.push('Recorded: '+report.recordedAt+' by '+report.recordedBy);
  lines.push('');
  for(const item of report.results){
    const id=item.id ? ' '+item.id : '';
    lines.push(item.status+' '+item.check+' ['+item.kind+']'+id+' — '+item.detail);
  }
  lines.push('');
  lines.push('Mechanical: '+report.mechanicalState);
  lines.push('Human:      '+report.humanState);
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

    const trustedRoot=path.resolve(__dirname,'..');
    const provenance=computeProvenance(trustedRoot);
    const provenanceCheck=evaluateTrustedSnapshot(provenance,plan.baseSha);
    if(!provenanceCheck.ok) {
      throw new Error('verification checker is not running from trusted locked-base OS:\n- '+provenanceCheck.errors.join('\n- '));
    }

    const repositoryCheck=verifyRepositoryIdentity(options.root,plan.repository);
    const diff=collectChangedPaths(options.root,plan.baseSha,options.head || 'HEAD');

    const mechanical=buildMechanicalEvidence({
      trustedRoot,
      root:options.root,
      lock:options.lock,
      previousLock:options.previousLock,
      head:options.head || 'HEAD',
    });
    if(options.mechanicalOutput) {
      fs.writeFileSync(path.resolve(options.mechanicalOutput),JSON.stringify(mechanical,null,2)+'\n');
    }

    const evaluated=evaluateVerification(plan,record,diff,repositoryCheck,mechanical,provenanceCheck);

    const report={
      schema:'yumaniwa-change-verification-report/0.3',
      change:plan.change,
      changeId:plan.changeId,
      planDigest:lockCheck.planDigest,
      planRevision:plan.revision,
      repository:plan.repository,
      planLevel:plan.planLevel,
      classes:plan.classes,
      baseSha:plan.baseSha,
      verifiedSha:record.verifiedSha,
      verifiedTreeSha:mechanical.verifiedTreeSha,
      target:diff.target,
      headSha:diff.headSha,
      changedPaths:[...new Set(diff.paths)].sort(),
      runnerProvenanceDigest:mechanical.runner.provenanceDigest,
      runnerCi:mechanical.runner.ci,
      recordedAt:record.recordedAt,
      recordedBy:record.recordedBy,
      results:evaluated.results,
      mechanicalState:evaluated.mechanicalState,
      humanState:evaluated.humanState,
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
  LEGACY_RECORD_SCHEMAS,
  FUTURE_TOLERANCE_MS,
  normalizeAttestations,
  normalizeRecord,
  evaluateMechanicalChecks,
  evaluateHumanAttestations,
  evaluateVerification,
  runCli,
};
