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

const RECORD_SCHEMA = 'yumaniwa-verification-record/0.1';
const CHECK_STATUSES = new Set(['pass', 'fail', 'unverified']);

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

function normalizeRecord(raw, plan) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['record must be a JSON object'] };
  }

  if (raw.schema !== RECORD_SCHEMA) errors.push('schema must equal ' + RECORD_SCHEMA);
  if (raw.change !== plan.change) errors.push('record change must exactly match Change Plan');
  if (raw.environment !== 'staging') errors.push('environment must equal staging');
  if (raw.baseSha !== plan.baseSha) errors.push('record baseSha must equal Change Plan baseSha');
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
      results.push({
        status: 'UNVERIFIED',
        check: 'verification.missing',
        kind,
        id,
        detail: 'required check has no Verification Record entry',
      });
      continue;
    }
    if (entry.status === 'pass') {
      results.push({
        status: 'PASS',
        check: 'verification.evidence',
        kind,
        id,
        detail: entry.evidence,
      });
    } else if (entry.status === 'fail') {
      results.push({
        status: 'FAIL',
        check: 'verification.failed',
        kind,
        id,
        detail: entry.evidence,
      });
    } else {
      results.push({
        status: 'UNVERIFIED',
        check: 'verification.unverified',
        kind,
        id,
        detail: entry.evidence,
      });
    }
  }

  for (const entry of entries) {
    if (!required.has(entry.id)) {
      results.push({
        status: 'FAIL',
        check: 'verification.unplanned',
        kind,
        id: entry.id,
        detail: 'entry is not declared in the matching Change Plan check list; use Plan revision or notes/additional reporting instead',
      });
    }
  }
  return results;
}

function evaluateVerification(plan, record, diff) {
  const results = [];

  if (record.verifiedSha === diff.headSha.toLowerCase()) {
    results.push({
      status: 'PASS',
      check: 'verification.sha',
      kind: 'git',
      id: record.verifiedSha,
      detail: 'record verifiedSha matches requested Git target',
    });
  } else {
    results.push({
      status: 'FAIL',
      check: 'verification.sha',
      kind: 'git',
      id: record.verifiedSha,
      detail: 'record verifiedSha does not match requested Git target ' + diff.headSha,
    });
  }

  let scope;
  try {
    scope = evaluateScope(
      plan,
      diff.paths,
      record.conditionalAcknowledgements.map(item => item.path)
    );
    for (const item of scope.results) {
      results.push({
        status: item.status === 'PASS' ? 'PASS' : 'FAIL',
        check: 'gate.' + item.check,
        kind: 'scope',
        id: item.path || item.pattern || '',
        detail: item.detail,
      });
    }
  } catch (error) {
    results.push({
      status: 'FAIL',
      check: 'gate.scope-error',
      kind: 'scope',
      id: '',
      detail: error.message,
    });
  }

  const impact = evaluateImpact(plan, diff.paths);
  for (const item of impact.results) {
    if (item.status === 'PASS' || item.status === 'N/A' || item.status === 'INFO' || item.status === 'WARNING') {
      results.push({
        status: item.status,
        check: 'gate.' + item.check,
        kind: 'impact',
        id: item.impact || '',
        detail: item.detail,
      });
    } else {
      results.push({
        status: 'FAIL',
        check: 'gate.' + item.check,
        kind: 'impact',
        id: item.impact || '',
        detail: item.detail,
      });
    }
  }

  results.push(...evaluateEvidence(plan.staticChecks || [], record.staticChecks, 'static'));
  results.push(...evaluateEvidence(plan.impactChecks || [], record.impactChecks, 'impact-evidence'));
  results.push(...evaluateEvidence(plan.manualChecks || [], record.manualChecks, 'manual'));

  const blocking = results.some(item =>
    item.status === 'FAIL' ||
    item.status === 'UNVERIFIED' ||
    item.status === 'SCOPE_REVIEW_REQUIRED'
  );

  return {
    results,
    verificationState: blocking ? 'UNVERIFIED' : 'VERIFIED',
    exitCode: blocking ? 1 : 0,
  };
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    plan: null,
    record: null,
    head: 'HEAD',
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--root' || arg === '--plan' || arg === '--record' || arg === '--head') {
      const value = argv[++i];
      if (!value) throw new Error(arg + ' requires a value');
      if (arg === '--root') options.root = value;
      if (arg === '--plan') options.plan = value;
      if (arg === '--record') options.record = value;
      if (arg === '--head') options.head = value;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  return options;
}

function usage() {
  return [
    'Usage:',
    '  node tools/change-verification-check.cjs --plan <plan.json> --record <record.json> [--root <repo>] [--head <ref>] [--json]',
    '',
    'Re-runs scope and impact gates for baseSha -> verified target, then checks static/impact/manual evidence completeness.',
    'The record verifiedSha must match the requested Git target exactly.',
  ].join('\n');
}

function formatHuman(report) {
  const lines = [];
  lines.push('YUMANIWA CHANGE VERIFICATION v0.1');
  lines.push('Change:   ' + report.change);
  lines.push('Base:     ' + report.baseSha);
  lines.push('Verified: ' + report.verifiedSha);
  lines.push('Target:   ' + report.target + ' (' + report.headSha + ')');
  lines.push('Recorded: ' + report.recordedAt + ' by ' + report.recordedBy);
  lines.push('');
  for (const item of report.results) {
    const id = item.id ? ' ' + item.id : '';
    lines.push(item.status + ' ' + item.check + ' [' + item.kind + ']' + id + ' — ' + item.detail);
  }
  lines.push('');
  lines.push('Verification: ' + report.verificationState);
  return lines.join('\n');
}

function runCli(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(usage() + '\n');
      return 0;
    }

    const rawPlan = readJson(options.plan, 'plan');
    const normalizedPlan = normalizeImpactPlan(rawPlan);
    if (!normalizedPlan.ok) {
      throw new Error('invalid change plan:\n- ' + normalizedPlan.errors.join('\n- '));
    }
    const plan = normalizedPlan.plan;

    const rawRecord = readJson(options.record, 'record');
    const normalizedRecord = normalizeRecord(rawRecord, plan);
    if (!normalizedRecord.ok) {
      throw new Error('invalid verification record:\n- ' + normalizedRecord.errors.join('\n- '));
    }
    const record = normalizedRecord.record;

    const diff = collectChangedPaths(options.root, plan.baseSha, options.head || 'HEAD');
    const evaluated = evaluateVerification(plan, record, diff);

    const report = {
      schema: 'yumaniwa-change-verification-report/0.1',
      change: plan.change,
      planLevel: plan.planLevel,
      classes: plan.classes,
      baseSha: plan.baseSha,
      verifiedSha: record.verifiedSha,
      target: diff.target,
      headSha: diff.headSha,
      changedPaths: [...new Set(diff.paths)].sort(),
      recordedAt: record.recordedAt,
      recordedBy: record.recordedBy,
      results: evaluated.results,
      verificationState: evaluated.verificationState,
      exitCode: evaluated.exitCode,
    };

    process.stdout.write((options.json ? JSON.stringify(report, null, 2) : formatHuman(report)) + '\n');
    return evaluated.exitCode;
  } catch (error) {
    process.stderr.write('Verification error: ' + error.message + '\n');
    if (options && options.help !== true) process.stderr.write(usage() + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  RECORD_SCHEMA,
  normalizeRecord,
  evaluateEvidence,
  evaluateVerification,
  runCli,
};
