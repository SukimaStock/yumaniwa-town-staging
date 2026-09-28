'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  validatePlan,
  collectChangedPaths,
  matches,
  escapeHumanText,
} = require('./change-scope-guard.cjs');
const {
  IMPACT_RULES,
  allImpactDefinitions,
} = require('./change-impact-rules.cjs');
const {
  collectRiskRequirements,
  riskImpactDefinitions,
} = require('./change-risk-policy.cjs');
const {
  collectExecutablePaths,
} = require('./change-risk-check.cjs');

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

function normalizeImpactPlan(raw, options = {}) {
  const core = validatePlan(raw, options);
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
    legacy: core.legacy,
    plan: {
      ...core.plan,
      impactChecks,
      impactExclusions,
    },
  };
}

function addRequirement(requirements, impact, filePath, sourceType, sourceId, core = false) {
  if (!requirements.has(impact.id)) {
    requirements.set(impact.id, {
      id: impact.id,
      description: impact.description || '',
      descriptions: new Set(),
      rules: new Set(),
      profiles: new Set(),
      paths: new Set(),
      core: Boolean(core),
    });
  }
  const current = requirements.get(impact.id);
  if (impact.description) current.descriptions.add(impact.description);
  if (sourceType === 'rule') current.rules.add(sourceId);
  if (sourceType === 'profile') current.profiles.add(sourceId);
  current.paths.add(filePath);
  current.core = Boolean(current.core || core);
}

function deriveRequiredImpacts(changedPaths, options = {}) {
  const requirements = new Map();
  const executablePaths = new Set(options.executablePaths || []);
  const coveredPaths = new Set();
  const uniquePaths = [...new Set(changedPaths || [])].sort();

  for (const filePath of uniquePaths) {
    let covered = false;

    for (const rule of IMPACT_RULES) {
      if (!rule.paths.some(pattern => matches(pattern, filePath))) continue;
      covered = true;
      for (const impact of rule.impacts) {
        addRequirement(requirements, impact, filePath, 'rule', rule.id, false);
      }
    }

    const riskItems = collectRiskRequirements([filePath], {
      executablePaths: executablePaths.has(filePath) ? [filePath] : [],
    });
    for (const item of riskItems) {
      covered = true;
      const risk = item.profile;
      for (const impactId of risk.requiredImpacts) {
        addRequirement(
          requirements,
          {
            id: impactId,
            description: 'Required by high-risk profile ' + risk.id,
          },
          filePath,
          'profile',
          risk.id,
          risk.coreImpacts.includes(impactId)
        );
      }
    }

    if (covered) coveredPaths.add(filePath);
  }

  return {
    requirements: [...requirements.values()]
      .map(item => ({
        id: item.id,
        description: item.description,
        descriptions: [...item.descriptions].sort(),
        rules: [...item.rules].sort(),
        profiles: [...item.profiles].sort(),
        paths: [...item.paths].sort(),
        core: item.core,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    coveredPaths: [...coveredPaths].sort(),
    uncoveredPaths: uniquePaths.filter(filePath => !coveredPaths.has(filePath)),
  };
}

function evaluateImpact(plan, changedPaths, options = {}) {
  const derived = deriveRequiredImpacts(changedPaths, options);
  const checks = new Set(plan.impactChecks || []);
  const exclusions = new Map((plan.impactExclusions || []).map(item => [item.id, item.reason]));
  const results = [];

  for (const required of derived.requirements) {
    if (required.core && exclusions.has(required.id)) {
      results.push({
        status: 'FAIL',
        check: 'impact.core-exclusion',
        impact: required.id,
        description: required.description,
        descriptions: required.descriptions,
        paths: required.paths,
        rules: required.rules,
        profiles: required.profiles,
        detail: 'core impact cannot be excluded',
      });
    } else if (checks.has(required.id)) {
      results.push({
        status: 'PASS',
        check: 'impact.declared',
        impact: required.id,
        description: required.description,
        descriptions: required.descriptions,
        paths: required.paths,
        rules: required.rules,
        profiles: required.profiles,
        detail: 'impact is declared in impactChecks',
      });
    } else if (exclusions.has(required.id)) {
      results.push({
        status: 'N/A',
        check: 'impact.excluded',
        impact: required.id,
        description: required.description,
        descriptions: required.descriptions,
        paths: required.paths,
        rules: required.rules,
        profiles: required.profiles,
        detail: exclusions.get(required.id),
      });
    } else {
      results.push({
        status: 'FAIL',
        check: 'impact.missing',
        impact: required.id,
        description: required.description,
        descriptions: required.descriptions,
        paths: required.paths,
        rules: required.rules,
        profiles: required.profiles,
        detail: 'declare this impact in impactChecks or exclude it with a reason',
      });
    }
  }

  const definitions = allImpactDefinitions();
  const known = new Set(definitions.map(item => item.id));
  for (const id of checks) {
    if (!known.has(id)) {
      results.push({
        status: 'WARNING',
        check: 'impact.unknown-declaration',
        impact: id,
        description: null,
        paths: [],
        rules: [],
        profiles: [],
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
        profiles: [],
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
      profiles: [],
      detail: 'no v0.2 explicit or high-risk Impact Rule is registered for this path',
    });
  }

  const exitCode = results.some(item => item.status === 'FAIL') ? 1 : 0;
  return {
    changedPaths: [...new Set(changedPaths || [])].sort(),
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
    'Derives required impact acknowledgements from explicit rules and high-risk path fallback.',
    'Core impacts cannot be excluded.',
    'Paths with neither explicit nor high-risk rules remain INFO.',
  ].join('\n');
}

function formatHuman(report) {
  const lines = [];
  lines.push('YUMANIWA IMPACT CHECK v0.2');
  lines.push('Change: ' + report.change);
  lines.push('Base:   ' + report.baseSha);
  lines.push('Target: ' + report.target + ' (' + report.headSha + ')');
  lines.push('Changed paths: ' + report.changedPaths.length);
  lines.push('Rule-covered paths: ' + report.coveredPaths.length);
  lines.push('');
  for (const item of report.results) {
    const impact = item.impact ? ' ' + item.impact : '';
    const files = item.paths && item.paths.length ? ' [' + item.paths.map(escapeHumanText).join(', ') + ']' : '';
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
    const executablePaths = collectExecutablePaths(
      options.root,
      plan.baseSha,
      diff.headSha,
      diff.paths,
      { includeWorktree: diff.target === 'worktree' }
    );
    const evaluated = evaluateImpact(plan, diff.paths, { executablePaths });
    const report = {
      schema: 'yumaniwa-impact-check-report/0.2',
      change: plan.change,
      planLevel: plan.planLevel,
      classes: plan.classes,
      baseSha: plan.baseSha,
      target: diff.target,
      headSha: diff.headSha,
      changedPaths: evaluated.changedPaths,
      executablePaths,
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
  formatHuman,
  runCli,
};
