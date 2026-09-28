'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCHEMA = 'yumaniwa-change-plan/0.2';
const LEGACY_SCHEMA = 'yumaniwa-change-plan/0.1';
const PLAN_LEVEL = { lite: 0, standard: 1, full: 2 };
const CLASS_MIN_LEVEL = {
  CONTENT: 0,
  PLACEMENT: 0,
  ASSET: 1,
  WORK: 1,
  SYSTEM: 2,
  WORLD: 2,
};
const AUTHORITY_VALUES = new Set(['Standard', 'Rule', 'Skill', 'Rule / Skill', 'HQ Review', 'Owner Decision']);

function normalizePath(value) {
  if (typeof value !== 'string') return '';
  let normalized = value.trim().replace(/\\/g, '/');
  normalized = normalized.replace(/^\.\//, '');
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.endsWith('/') && normalized !== '/') {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function isUnsafePattern(pattern) {
  if (!pattern) return true;
  if (pattern.startsWith('/') || /^[A-Za-z]:\//.test(pattern)) return true;
  if (pattern.split('/').includes('..')) return true;
  if (pattern.startsWith('**/')) return true;
  return ['.', '*', '**', '**/*', '*/**'].includes(pattern);
}

function escapeRegexChar(char) {
  return /[\\^$+?.()|{}\[\]]/.test(char) ? '\\' + char : char;
}

function globToRegExp(pattern) {
  const source = normalizePath(pattern);
  let out = '^';
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '*') {
      if (source[i + 1] === '*') {
        i += 1;
        if (source[i + 1] === '/') {
          i += 1;
          out += '(?:.*/)?';
        } else {
          out += '.*';
        }
      } else {
        out += '[^/]*';
      }
    } else if (ch === '?') {
      out += '[^/]';
    } else {
      out += escapeRegexChar(ch);
    }
  }
  out += '$';
  return new RegExp(out);
}

function matches(pattern, filePath) {
  if (typeof filePath !== 'string') return false;
  return globToRegExp(pattern).test(filePath);
}

function requireStringArray(plan, key, errors, options = {}) {
  const value = plan[key];
  if (!Array.isArray(value)) {
    errors.push(key + ' must be an array');
    return [];
  }
  const normalized = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !entry.trim()) {
      errors.push(key + ' must contain only nonempty strings');
      continue;
    }
    normalized.push(options.paths ? normalizePath(entry) : entry.trim());
  }
  if (options.nonempty && normalized.length === 0) {
    errors.push(key + ' must not be empty');
  }
  if (new Set(normalized).size !== normalized.length) {
    errors.push(key + ' must not contain duplicates');
  }
  return normalized;
}

function requireNonemptyString(plan, key, errors) {
  const value = plan[key];
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(key + ' must be nonempty');
    return '';
  }
  return value.trim();
}

function normalizeAuthority(value, errors) {
  let items = [];
  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === 'string' && value.trim()) {
    items = [value];
  } else {
    errors.push('authority must be a nonempty string or array');
    return [];
  }
  const out = [];
  for (const entry of items) {
    if (typeof entry !== 'string' || !entry.trim()) {
      errors.push('authority must contain only nonempty strings');
      continue;
    }
    const v = entry.trim();
    if (!AUTHORITY_VALUES.has(v)) errors.push('unknown authority: ' + v);
    out.push(v);
  }
  if (!out.length) errors.push('authority must not be empty');
  if (new Set(out).size !== out.length) errors.push('authority must not contain duplicates');
  return out;
}

function validatePlan(input, options = {}) {
  const allowLegacy = options.allowLegacy !== false;
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['plan must be a JSON object'] };
  }
  const plan = { ...input };
  const legacy = plan.schema === LEGACY_SCHEMA;
  if (plan.schema !== SCHEMA && !(allowLegacy && legacy)) {
    errors.push('schema must equal ' + SCHEMA + (allowLegacy ? ' or legacy ' + LEGACY_SCHEMA : ''));
  }

  const change = requireNonemptyString(plan, 'change', errors);
  if (!Object.hasOwn(PLAN_LEVEL, plan.planLevel)) errors.push('planLevel must be lite, standard, or full');
  if (!['staging', 'staging-production'].includes(plan.environment)) errors.push('environment must be staging or staging-production');
  if (typeof plan.baseSha !== 'string' || !/^[0-9a-f]{40}$/i.test(plan.baseSha)) errors.push('baseSha must be a full 40-character commit SHA');

  const classes = requireStringArray(plan, 'classes', errors, { nonempty: true });
  for (const className of classes) {
    if (!Object.hasOwn(CLASS_MIN_LEVEL, className)) errors.push('unknown change class: ' + className);
  }
  if (Object.hasOwn(PLAN_LEVEL, plan.planLevel)) {
    const required = classes.reduce((level, className) => Math.max(level, CLASS_MIN_LEVEL[className] ?? 0), 0);
    if (PLAN_LEVEL[plan.planLevel] < required) {
      errors.push('planLevel ' + plan.planLevel + ' is too light for classes: ' + classes.join(', '));
    }
  }

  const canonicalSources = requireStringArray(plan, 'canonicalSources', errors, { nonempty: true, paths: true });
  const allowedPaths = requireStringArray(plan, 'allowedPaths', errors, { nonempty: true, paths: true });
  const forbiddenPaths = requireStringArray(plan, 'forbiddenPaths', errors, { paths: true });
  const expectedChanges = requireStringArray(plan, 'expectedChanges', errors, { nonempty: true });
  const staticChecks = requireStringArray(plan, 'staticChecks', errors);
  const manualChecks = requireStringArray(plan, 'manualChecks', errors);
  const promotion = requireNonemptyString(plan, 'promotion', errors);

  for (const [key, patterns] of [['allowedPaths', allowedPaths], ['forbiddenPaths', forbiddenPaths]]) {
    for (const pattern of patterns) {
      if (isUnsafePattern(pattern)) errors.push(key + ' contains unsafe/broad path pattern: ' + pattern);
    }
  }

  let conditionalPaths = [];
  if (!Array.isArray(plan.conditionalPaths)) {
    errors.push('conditionalPaths must be an array');
  } else {
    conditionalPaths = plan.conditionalPaths.map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push('conditionalPaths[' + index + '] must be an object');
        return null;
      }
      const p = normalizePath(entry.path);
      if (!p || isUnsafePattern(p)) errors.push('conditionalPaths[' + index + '].path is invalid or too broad');
      if (typeof entry.condition !== 'string' || !entry.condition.trim()) errors.push('conditionalPaths[' + index + '].condition must be nonempty');
      return { path: p, condition: typeof entry.condition === 'string' ? entry.condition.trim() : '' };
    }).filter(Boolean);
  }
  if (new Set(conditionalPaths.map(x => x.path)).size !== conditionalPaths.length) {
    errors.push('conditionalPaths must not contain duplicate patterns');
  }

  const allowedSet = new Set(allowedPaths);
  const forbiddenSet = new Set(forbiddenPaths);
  const conditionalSet = new Set(conditionalPaths.map(x => x.path));
  for (const pattern of allowedSet) {
    if (forbiddenSet.has(pattern)) errors.push('pattern appears in both allowedPaths and forbiddenPaths: ' + pattern);
    if (conditionalSet.has(pattern)) errors.push('pattern appears in both allowedPaths and conditionalPaths: ' + pattern);
  }
  for (const pattern of forbiddenSet) {
    if (conditionalSet.has(pattern)) errors.push('pattern appears in both forbiddenPaths and conditionalPaths: ' + pattern);
  }

  let authority = [];
  let v02 = {};
  if (!legacy) {
    const changeId = requireNonemptyString(plan, 'changeId', errors);
    if (changeId && !/^[a-z0-9][a-z0-9-]{2,80}$/.test(changeId)) {
      errors.push('changeId must be a lowercase slug');
    }
    if (!Number.isInteger(plan.revision) || plan.revision < 0) errors.push('revision must be an integer >= 0');
    if (plan.revision === 0) {
      if (plan.previousPlanDigest !== null && plan.previousPlanDigest !== undefined) errors.push('revision 0 must not have previousPlanDigest');
      if (plan.revisionReason !== null && plan.revisionReason !== undefined && String(plan.revisionReason).trim()) errors.push('revision 0 must not have revisionReason');
    } else if (Number.isInteger(plan.revision) && plan.revision > 0) {
      if (typeof plan.previousPlanDigest !== 'string' || !/^[0-9a-f]{64}$/i.test(plan.previousPlanDigest)) {
        errors.push('revision > 0 requires previousPlanDigest');
      }
      requireNonemptyString(plan, 'revisionReason', errors);
    }
    if (plan.status !== 'READY') errors.push('status must equal READY');
    const repository = requireNonemptyString(plan, 'repository', errors);
    if (repository && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) errors.push('repository must be owner/name');
    authority = normalizeAuthority(plan.authority, errors);

    if (staticChecks.length === 0 && !(typeof plan.staticCheckExemptionReason === 'string' && plan.staticCheckExemptionReason.trim())) {
      errors.push('staticChecks must not be empty without staticCheckExemptionReason');
    }
    if (manualChecks.length === 0 && !(typeof plan.manualCheckExemptionReason === 'string' && plan.manualCheckExemptionReason.trim())) {
      errors.push('manualChecks must not be empty without manualCheckExemptionReason');
    }

    if (plan.planLevel === 'full') {
      if (!authority.includes('HQ Review')) errors.push('full plan requires HQ Review authority');
      const hqDecisions = requireStringArray(plan, 'hqDecisions', errors, { nonempty: true });
      const alternativesRejected = requireStringArray(plan, 'alternativesRejected', errors, { nonempty: true });
      const boundaryCases = requireStringArray(plan, 'boundaryCases', errors, { nonempty: true });
      const testPlan = requireStringArray(plan, 'testPlan', errors, { nonempty: true });
      const problem = requireNonemptyString(plan, 'problem', errors);
      const currentContract = requireNonemptyString(plan, 'currentContract', errors);
      const whyExistingIsInsufficient = requireNonemptyString(plan, 'whyExistingIsInsufficient', errors);
      const design = requireNonemptyString(plan, 'design', errors);
      const migration = requireNonemptyString(plan, 'migration', errors);
      const compatibility = requireNonemptyString(plan, 'compatibility', errors);
      const rollback = requireNonemptyString(plan, 'rollback', errors);
      const promotionRisk = requireNonemptyString(plan, 'promotionRisk', errors);
      if (staticChecks.length === 0) errors.push('full plan requires at least one staticCheck');
      v02 = {
        changeId,
        repository,
        hqDecisions,
        alternativesRejected,
        boundaryCases,
        testPlan,
        problem,
        currentContract,
        whyExistingIsInsufficient,
        design,
        migration,
        compatibility,
        rollback,
        promotionRisk,
      };
    } else {
      v02 = {
        changeId,
        repository,
      };
    }
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    legacy,
    plan: {
      ...plan,
      ...v02,
      change,
      classes,
      authority: legacy ? plan.authority : authority,
      canonicalSources,
      allowedPaths,
      forbiddenPaths,
      conditionalPaths,
      expectedChanges,
      staticChecks,
      manualChecks,
      promotion,
      baseSha: plan.baseSha.toLowerCase(),
    },
  };
}

function evaluateScope(plan, changedPaths, acknowledgedConditional = []) {
  const ack = new Set(acknowledgedConditional.map(normalizePath));
  const conditionalPatterns = new Set(plan.conditionalPaths.map(x => x.path));
  for (const pattern of ack) {
    if (!conditionalPatterns.has(pattern)) {
      const err = new Error('conditional acknowledgement is not declared in plan: ' + pattern);
      err.code = 'INVALID_ACK';
      throw err;
    }
  }

  const results = [];
  const uniquePaths = [...new Set((changedPaths || []).filter(filePath => typeof filePath === 'string' && filePath.length > 0))].sort();
  for (const filePath of uniquePaths) {
    const forbidden = plan.forbiddenPaths.find(pattern => matches(pattern, filePath));
    if (forbidden) {
      results.push({ status: 'FAIL', path: filePath, check: 'scope.forbidden', pattern: forbidden, detail: 'changed path matches forbiddenPaths' });
      continue;
    }
    const conditional = plan.conditionalPaths.find(entry => matches(entry.path, filePath));
    if (conditional) {
      if (ack.has(conditional.path)) {
        results.push({ status: 'PASS', path: filePath, check: 'scope.conditional', pattern: conditional.path, detail: 'conditional path explicitly acknowledged: ' + conditional.condition });
      } else {
        results.push({ status: 'SCOPE_REVIEW_REQUIRED', path: filePath, check: 'scope.conditional', pattern: conditional.path, detail: conditional.condition });
      }
      continue;
    }
    const allowed = plan.allowedPaths.find(pattern => matches(pattern, filePath));
    if (allowed) {
      results.push({ status: 'PASS', path: filePath, check: 'scope.allowed', pattern: allowed, detail: 'changed path is within allowedPaths' });
      continue;
    }
    results.push({ status: 'FAIL', path: filePath, check: 'scope.out-of-scope', pattern: null, detail: 'changed path is not allowed by the plan' });
  }

  if (uniquePaths.length === 0) {
    results.push({ status: 'PASS', path: null, check: 'scope.no-changes', pattern: null, detail: 'no changed paths relative to baseSha' });
  }

  const exitCode = results.some(item => item.status === 'FAIL' || item.status === 'SCOPE_REVIEW_REQUIRED') ? 1 : 0;
  return { changedPaths: uniquePaths, results, exitCode, scopeOk: exitCode === 0 };
}

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error((result.stderr || result.stdout || 'git failed').trim());
    error.status = result.status;
    throw error;
  }
  return result.stdout;
}

function parseNameStatus(source) {
  const fields = source.split('\0');
  const paths = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (!status) continue;
    if (/^[RC]/.test(status)) {
      const before = fields[index++];
      const after = fields[index++];
      if (typeof before === 'string' && before.length > 0) paths.push(before);
      if (typeof after === 'string' && after.length > 0) paths.push(after);
    } else {
      const filePath = fields[index++];
      if (typeof filePath === 'string' && filePath.length > 0) paths.push(filePath);
    }
  }
  return paths;
}

function collectChangedPaths(root, baseSha, headRef) {
  const repoRoot = path.resolve(root);
  git(repoRoot, ['rev-parse', '--show-toplevel']);
  git(repoRoot, ['cat-file', '-e', baseSha + '^{commit}']);
  const currentHead = git(repoRoot, ['rev-parse', 'HEAD']).trim();
  if (headRef) {
    git(repoRoot, ['cat-file', '-e', headRef + '^{commit}']);
    const ancestor = spawnSync('git', ['-C', repoRoot, 'merge-base', '--is-ancestor', baseSha, headRef], { encoding: 'utf8' });
    if (ancestor.status !== 0) throw new Error('baseSha is not an ancestor of head: ' + headRef);
    return {
      target: headRef,
      headSha: git(repoRoot, ['rev-parse', headRef]).trim(),
      paths: parseNameStatus(git(repoRoot, ['diff', '--name-status', '-z', '--find-renames', baseSha, headRef, '--'])),
    };
  }

  const ancestor = spawnSync('git', ['-C', repoRoot, 'merge-base', '--is-ancestor', baseSha, currentHead], { encoding: 'utf8' });
  if (ancestor.status !== 0) throw new Error('baseSha is not an ancestor of current HEAD');
  const paths = parseNameStatus(git(repoRoot, ['diff', '--name-status', '-z', '--find-renames', baseSha, '--']));
  const untracked = git(repoRoot, ['ls-files', '-z', '--others', '--exclude-standard']).split('\0').filter(filePath => filePath.length > 0);
  return { target: 'worktree', headSha: currentHead, paths: [...paths, ...untracked] };
}

function parseArgs(argv) {
  const options = { root: process.cwd(), plan: null, head: null, json: false, conditionalOk: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--root' || arg === '--plan' || arg === '--head' || arg === '--conditional-ok') {
      const value = argv[++i];
      if (!value) throw new Error(arg + ' requires a value');
      if (arg === '--root') options.root = value;
      else if (arg === '--plan') options.plan = value;
      else if (arg === '--head') options.head = value;
      else options.conditionalOk.push(value);
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
    '  node tools/change-scope-guard.cjs --plan <plan.json|-> [--root <repo>] [--head <ref>] [--conditional-ok <declared-pattern>] [--json]',
    '',
    'Without --head, compares baseSha to the current worktree and includes untracked files.',
    'With --head, compares baseSha to that commit/ref.',
    'A changed conditional path requires an explicit --conditional-ok for its declared plan pattern.',
  ].join('\n');
}

function readPlan(planPath) {
  if (!planPath) throw new Error('--plan is required');
  const source = planPath === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(path.resolve(planPath), 'utf8');
  let parsed;
  try { parsed = JSON.parse(source); }
  catch (error) { throw new Error('plan JSON parse failed: ' + error.message); }
  const checked = validatePlan(parsed);
  if (!checked.ok) throw new Error('invalid change plan:\n- ' + checked.errors.join('\n- '));
  return checked.plan;
}

function formatHuman(report) {
  const lines = [];
  lines.push('YUMANIWA SCOPE GUARD v0.2');
  lines.push('Change: ' + report.change);
  lines.push('Base:   ' + report.baseSha);
  lines.push('Target: ' + report.target + ' (' + report.headSha + ')');
  lines.push('Changed paths: ' + report.changedPaths.length);
  lines.push('');
  for (const item of report.results) {
    const suffix = item.path ? ' ' + item.path : '';
    const pattern = item.pattern ? ' [' + item.pattern + ']' : '';
    lines.push(item.status + ' ' + item.check + suffix + pattern + ' — ' + item.detail);
  }
  lines.push('');
  lines.push('Scope: ' + (report.scopeOk ? 'PASS' : 'STOP'));
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
    const plan = readPlan(options.plan);
    const diff = collectChangedPaths(options.root, plan.baseSha, options.head);
    const evaluated = evaluateScope(plan, diff.paths, options.conditionalOk);
    const report = {
      schema: 'yumaniwa-scope-guard-report/0.2',
      change: plan.change,
      planLevel: plan.planLevel,
      classes: plan.classes,
      baseSha: plan.baseSha,
      target: diff.target,
      headSha: diff.headSha,
      changedPaths: evaluated.changedPaths,
      results: evaluated.results,
      scopeOk: evaluated.scopeOk,
      exitCode: evaluated.exitCode,
    };
    process.stdout.write((options.json ? JSON.stringify(report, null, 2) : formatHuman(report)) + '\n');
    return evaluated.exitCode;
  } catch (error) {
    process.stderr.write('Scope Guard error: ' + error.message + '\n');
    if (options && options.help !== true) process.stderr.write(usage() + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  SCHEMA,
  LEGACY_SCHEMA,
  normalizePath,
  globToRegExp,
  matches,
  validatePlan,
  evaluateScope,
  parseNameStatus,
  collectChangedPaths,
  runCli,
};
