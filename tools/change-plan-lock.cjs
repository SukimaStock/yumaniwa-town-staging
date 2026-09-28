'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { validatePlan, SCHEMA } = require('./change-scope-guard.cjs');

const LOCK_SCHEMA = 'yumaniwa-change-plan-lock/0.2';

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = sortDeep(value[key]);
  return out;
}

function stableStringify(value) {
  return JSON.stringify(sortDeep(value));
}

function normalizePlanForDigest(raw) {
  const checked = validatePlan(raw, { allowLegacy: false });
  if (!checked.ok) {
    const error = new Error('invalid v0.2 change plan:\n- ' + checked.errors.join('\n- '));
    error.code = 'INVALID_PLAN';
    throw error;
  }
  if (checked.plan.schema !== SCHEMA) throw new Error('trusted lock requires ' + SCHEMA);
  return checked.plan;
}

function computePlanDigest(rawPlan) {
  const plan = normalizePlanForDigest(rawPlan);
  return crypto.createHash('sha256').update(stableStringify(plan), 'utf8').digest('hex');
}

function createLock(rawPlan, metadata = {}) {
  const plan = normalizePlanForDigest(rawPlan);
  const planDigest = crypto.createHash('sha256').update(stableStringify(plan), 'utf8').digest('hex');
  return {
    schema: LOCK_SCHEMA,
    planDigest,
    ...metadata,
    plan,
  };
}

function verifyRevision(previousLock, currentLock) {
  const errors = [];
  if (!previousLock) {
    if (currentLock.plan.revision !== 0) errors.push('first lock must use revision 0');
    return errors;
  }
  const previous = verifyLock(previousLock);
  if (!previous.ok) errors.push('previous lock invalid: ' + previous.errors.join('; '));

  const a = previousLock.plan;
  const b = currentLock.plan;
  if (b.changeId !== a.changeId) errors.push('revision must keep changeId');
  if (b.repository !== a.repository) errors.push('revision must keep repository');
  if (b.baseSha !== a.baseSha) errors.push('revision must keep baseSha');
  if (b.revision !== a.revision + 1) errors.push('revision must increment by exactly 1');
  if (b.previousPlanDigest !== previousLock.planDigest) errors.push('previousPlanDigest must reference previous lock digest');
  if (typeof b.revisionReason !== 'string' || !b.revisionReason.trim()) errors.push('revision requires revisionReason');
  return errors;
}

function verifyLock(lock, previousLock = null) {
  const errors = [];
  if (!lock || typeof lock !== 'object' || Array.isArray(lock)) {
    return { ok: false, errors: ['lock must be an object'] };
  }
  if (lock.schema !== LOCK_SCHEMA) errors.push('lock schema must equal ' + LOCK_SCHEMA);
  if (typeof lock.planDigest !== 'string' || !/^[0-9a-f]{64}$/i.test(lock.planDigest)) {
    errors.push('planDigest must be a sha256 hex digest');
  }

  let normalizedPlan = null;
  try {
    normalizedPlan = normalizePlanForDigest(lock.plan);
  } catch (error) {
    errors.push(error.message);
  }

  if (normalizedPlan) {
    const digest = crypto.createHash('sha256').update(stableStringify(normalizedPlan), 'utf8').digest('hex');
    if (lock.planDigest !== digest) {
      errors.push('planDigest mismatch: expected ' + digest + ' from locked plan');
    }
  }

  if (!errors.length && previousLock !== null) {
    errors.push(...verifyRevision(previousLock, lock));
  }
  if (!errors.length && previousLock === null && lock.plan.revision !== 0) {
    errors.push('revision > 0 requires previous lock for verification');
  }

  return {
    ok: errors.length === 0,
    errors,
    plan: normalizedPlan,
    planDigest: lock.planDigest,
  };
}

function readJson(filePath, label) {
  const source = filePath === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(path.resolve(filePath), 'utf8');
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(label + ' JSON parse failed: ' + error.message);
  }
}

function usage() {
  return [
    'Usage:',
    '  node tools/change-plan-lock.cjs create --plan <plan.json>',
    '  node tools/change-plan-lock.cjs verify --lock <lock.json> [--previous <previous-lock.json>]',
    '',
    'create prints a normalized v0.2 lock JSON to stdout.',
    'verify checks digest, Plan readiness and optional revision chain.',
  ].join('\n');
}

function parseArgs(argv) {
  const command = argv[0];
  const options = { command, plan: null, lock: null, previous: null };
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--plan' || arg === '--lock' || arg === '--previous') {
      const value = argv[++i];
      if (!value) throw new Error(arg + ' requires a value');
      options[arg.slice(2)] = value;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  return options;
}

function runCli(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help || !options.command) {
      process.stdout.write(usage() + '\n');
      return 0;
    }
    if (options.command === 'create') {
      if (!options.plan) throw new Error('--plan is required');
      const plan = readJson(options.plan, 'plan');
      const lock = createLock(plan);
      process.stdout.write(JSON.stringify(lock, null, 2) + '\n');
      return 0;
    }
    if (options.command === 'verify') {
      if (!options.lock) throw new Error('--lock is required');
      const lock = readJson(options.lock, 'lock');
      const previous = options.previous ? readJson(options.previous, 'previous lock') : null;
      const checked = verifyLock(lock, previous);
      if (!checked.ok) {
        process.stderr.write('Plan Lock INVALID\n- ' + checked.errors.join('\n- ') + '\n');
        return 1;
      }
      process.stdout.write('Plan Lock PASS ' + checked.planDigest + '\n');
      return 0;
    }
    throw new Error('unknown command: ' + options.command);
  } catch (error) {
    process.stderr.write('Plan Lock error: ' + error.message + '\n');
    process.stderr.write(usage() + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  LOCK_SCHEMA,
  sortDeep,
  stableStringify,
  normalizePlanForDigest,
  computePlanDigest,
  createLock,
  verifyRevision,
  verifyLock,
  runCli,
};
