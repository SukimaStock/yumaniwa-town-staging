'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  validatePlan,
  collectChangedPaths,
  matches,
} = require('./change-scope-guard.cjs');
const {
  IMPACT_RULES,
  allImpactDefinitions,
} = require('./change-impact-rules.cjs');

function readJsonPlan(planPath) {
  if (!planPath) throw new Error('--plan is required');
  const source = planPath === '-'
    ? fs.readFileSync(0, 'utf8')
    : fs.readFileSync(path.resolve(planPath), 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error('plan JSON parse failed: ' + error.message);
  }
  return parsed;
}

function stringArray(value, key, errors) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push(key + ' must be an array');
    return [];
  }
  const out = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !entry.trim()) {
      errors.push(key + ' must contain only nonempty strings');
    } else {
      out.push(entry.trim());
    }
  }
  if (new Set(out).size !== out.length) errors.push(key + ' must not contain duplicates');
  return out;
}

function normalizeImpactPlan(raw) {
  const core = validatePlan(raw);
  if (!core.ok) return { ok: false, errors: core.errors };

  const errors = [];
  const impactChecks = stringArray(raw.impactChecks, 'impactChecks', errors);
  const impactExclusions = [];
  if (raw.impactExclusions !== undefined && !Array.isArray(raw.impactExclusions)) {
    errors.push('impactExclusions must be an array');
  } else {
    for (const [index, entry] of (raw.impactExclusions || []).entries()) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push('impactExclusions[' + index + '] must be an object');
        continue;
      }
      if (typeof entry.id !== 'string' || !entry.id.trim()) {
        errors.push('impactExclusions[' + index + '].id must be nonempty');
        continue;
      }
      if (typeof entry.reason !== 'string' || !entry.reason.trim()) {
        errors.push('impactExclusions[' + index + '].reason must be nonempty');
        continue;
      }
      impactExclusions.push({ id: entry.id.trim(), reason: entry.reason.trim() });
    }
  }

  const exclusionIds = impactExclusions.map(item => item.id);
  if (new Set(exclusionIds).size !== exclusionIds.length) {
    errors.push('impactExclusions must not contain duplicate ids');
  }
  for (const id of impactChecks) {
    if (exclusionIds.includes(id)) {
      errors.push('impact id cannot be both checked and excluded: ' + id);
    }
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    plan: {
      ...core.plan,
      impactChecks,
      impactExclusions,
    },
  };
}

function deriveRequiredImpacts(changedPaths) {
  const requirements = new Map();
  const coveredPaths = new Set();

  for (const filePath of [...new Set(changedPaths)].sort()) {
    for (const rule of IMPACT_RULES) {
      if (!rule.paths.some(pattern => matches(pattern, filePath))) continue;
      coveredPaths.add(filePath);
      for (const impact of rule.impacts) {
        if (!requirements.has(impact.id)) {
          requirements.set(impact.id, {
            id: impact.id,
            description: impact.description,
            rules: new Set(),
            paths: new Set(),
          });
        }
        const current = requirements.get(impact.id);
        current.rules.add(rule.id);
        current.paths.add(filePath);
      }
    }
  }

  return {
    requirements: [...requirements.values()]
      .map(item => ({
        ...item,
        rules: [...item.rules].sort(),
        paths: [...item.paths].sort(),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    coveredPaths: [...coveredPaths].sort(),
    uncoveredPaths: [...new Set(changedPaths)]
      .filter(filePath => !coveredPaths.has(filePath))
      .sort(),
  };
}

function evaluateImpact(plan, changedPaths) {
  const derived = deriveRequiredImpacts(changedPaths);
  const checks = new Set(plan.impactChecks || []);
  const exclusions = new Map((plan.impactExclusions || []).map(item => [item.id, item.reason]));
  const results = [];

  for (const required of derived.requirements) {
    if (checks.has(required.id)) {
      results.push({
        status: 'PASS',
        check: 'impact.declared',
        impact: required.id,
        description: required.description,
        paths: required.paths,
        rules: required.rules,
        detail: 'impact is declared in impactChecks',
      });
    } else if (exclusions.has(required.id)) {
      results.push({
        status: 'N/A',
        check: 'impact.excluded',
        impact: required.id,
        description: required.description,
        paths: required.paths,
        rules: required.rules,
        detail: exclusions.get(required.id),
      });
    } else {
      results.push({
        status: 'FAIL',
        check: 'impact.missing',
        impact: required.id,
        description: required.description,
        paths: required.paths,
        rules: required.rules,
        detail: 'declare this impact in impactChecks or exclude it with a reason',
      });
    }
  }

  const known = new Set(allImpactDefinitions().map(item => item.id));
  for (const id of checks) {
    if (!known.has(id)) {
      results.push({
        status: 'WARNING',
        check: 'impact.unknown-declaration',
        impact: id,
        description: null,
        paths: [],
        rules: [],
        detail: 'custom or unknown impact id; it does not satisfy any registered rule',
      });
    }
  }
  for (const [id, reason] of exclusions) {
    if (!known.has(id)) {
      results.push({
        status: 'WARNING',
        check: 'impact.unknown-exclusion',
        impact: id,
        description: null,
        paths: [],
        rules: [],
        detail: reason,
      });
    }
  }

  for (const filePath of derived.uncoveredPaths) {
    results.push({
      status: 'INFO',
      check: 'impact.no-rule',
      impact: null,
      description: null,
      paths: [filePath],
      rules: [],
      detail: 'no v0.1 Impact Rule is registered for this path',
    });
  }

  const exitCode = results.some(item => item.status === 'FAIL') ? 1 : 0;
  return {
    changedPaths: [...new Set(changedPaths)].sort(),
    coveredPaths: derived.coveredPaths,
    uncoveredPaths: derived.uncoveredPaths,
    requiredImpacts: derived.requirements,
    results,
    impactOk: exitCode === 0,
    exitCode,
  };
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    plan: null,
    head: null,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--root' || arg === '--plan' || arg === '--head') {
      const value = argv[++i];
      if (!value) throw new Error(arg + ' requires a value');
      if (arg === '--root') options.root = value;
      if (arg === '--plan') options.plan = value;
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
    '  node tools/change-impact-check.cjs --plan <plan.json|-> [--root <repo>] [--head <ref>] [--json]',
    '',
    'Derives required impact acknowledgements from changed paths.',
    'Each registered impact must be present in impactChecks or impactExclusions with a reason.',
    'Paths without a v0.1 rule are reported as INFO and do not fail the check.',
  ].join('\n');
}

function formatHuman(report) {
  const lines = [];
  lines.push('YUMANIWA IMPACT CHECK v0.1');
  lines.push('Change: ' + report.change);
  lines.push('Base:   ' + report.baseSha);
  lines.push('Target: ' + report.target + ' (' + report.headSha + ')');
  lines.push('Changed paths: ' + report.changedPaths.length);
  lines.push('Rule-covered paths: ' + report.coveredPaths.length);
  lines.push('');
  for (const item of report.results) {
    const impact = item.impact ? ' ' + item.impact : '';
    const files = item.paths && item.paths.length ? ' [' + item.paths.join(', ') + ']' : '';
    lines.push(item.status + ' ' + item.check + impact + files + ' — ' + item.detail);
  }
  lines.push('');
  lines.push('Impact: ' + (report.impactOk ? 'PASS' : 'STOP'));
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
    const raw = readJsonPlan(options.plan);
    const normalized = normalizeImpactPlan(raw);
    if (!normalized.ok) {
      throw new Error('invalid change plan:\n- ' + normalized.errors.join('\n- '));
    }
    const plan = normalized.plan;
    const diff = collectChangedPaths(options.root, plan.baseSha, options.head);
    const evaluated = evaluateImpact(plan, diff.paths);
    const report = {
      schema: 'yumaniwa-impact-check-report/0.1',
      change: plan.change,
      planLevel: plan.planLevel,
      classes: plan.classes,
      baseSha: plan.baseSha,
      target: diff.target,
      headSha: diff.headSha,
      changedPaths: evaluated.changedPaths,
      coveredPaths: evaluated.coveredPaths,
      uncoveredPaths: evaluated.uncoveredPaths,
      requiredImpacts: evaluated.requiredImpacts,
      results: evaluated.results,
      impactOk: evaluated.impactOk,
      exitCode: evaluated.exitCode,
    };
    process.stdout.write((options.json ? JSON.stringify(report, null, 2) : formatHuman(report)) + '\n');
    return evaluated.exitCode;
  } catch (error) {
    process.stderr.write('Impact Check error: ' + error.message + '\n');
    if (options && options.help !== true) process.stderr.write(usage() + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  normalizeImpactPlan,
  deriveRequiredImpacts,
  evaluateImpact,
  runCli,
};
