'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const {
  PLAN_LEVEL_RANK,
  collectRiskRequirements,
} = require('./change-risk-policy.cjs');

function normalizeAuthority(value) {
  if (Array.isArray(value)) return value.map(x => String(x).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function evaluateRiskPlan(plan, changedPaths) {
  const results = [];
  const profiles = collectRiskRequirements(changedPaths);
  const classes = new Set(Array.isArray(plan.classes) ? plan.classes : []);
  const authority = new Set(normalizeAuthority(plan.authority));
  const impactChecks = new Set(Array.isArray(plan.impactChecks) ? plan.impactChecks : []);
  const exclusions = new Set(Array.isArray(plan.impactExclusions) ? plan.impactExclusions.map(x => x && x.id).filter(Boolean) : []);
  const staticChecks = new Set(Array.isArray(plan.staticChecks) ? plan.staticChecks : []);

  for (const item of profiles) {
    const risk = item.profile;
    const paths = item.paths.slice().sort();

    if ((PLAN_LEVEL_RANK[plan.planLevel] ?? -1) < (PLAN_LEVEL_RANK[risk.minPlanLevel] ?? 99)) {
      results.push({
        status:'FAIL',
        check:'risk.plan-level',
        profile:risk.id,
        paths,
        detail:risk.id + ' requires ' + risk.minPlanLevel + ' plan',
      });
    } else {
      results.push({
        status:'PASS',
        check:'risk.plan-level',
        profile:risk.id,
        paths,
        detail:'planLevel ' + plan.planLevel + ' satisfies ' + risk.minPlanLevel,
      });
    }

    for (const requiredClass of risk.requiredClasses) {
      if (!classes.has(requiredClass)) {
        results.push({
          status:'FAIL',
          check:'risk.class',
          profile:risk.id,
          paths,
          detail:'missing required class ' + requiredClass,
        });
      } else {
        results.push({
          status:'PASS',
          check:'risk.class',
          profile:risk.id,
          paths,
          detail:'required class ' + requiredClass + ' declared',
        });
      }
    }

    for (const requiredAuthority of risk.requiredAuthority) {
      if (!authority.has(requiredAuthority)) {
        results.push({
          status:'FAIL',
          check:'risk.authority',
          profile:risk.id,
          paths,
          detail:'missing required authority ' + requiredAuthority,
        });
      } else {
        results.push({
          status:'PASS',
          check:'risk.authority',
          profile:risk.id,
          paths,
          detail:'required authority ' + requiredAuthority + ' declared',
        });
      }
    }

    for (const impactId of risk.requiredImpacts) {
      if (risk.coreImpacts.includes(impactId) && exclusions.has(impactId)) {
        results.push({
          status:'FAIL',
          check:'risk.core-impact-excluded',
          profile:risk.id,
          paths,
          impact:impactId,
          detail:'core impact cannot be excluded',
        });
      } else if (impactChecks.has(impactId)) {
        results.push({
          status:'PASS',
          check:'risk.impact',
          profile:risk.id,
          paths,
          impact:impactId,
          detail:'required impact is declared for checking',
        });
      } else if (exclusions.has(impactId)) {
        results.push({
          status:'N/A',
          check:'risk.impact-excluded',
          profile:risk.id,
          paths,
          impact:impactId,
          detail:'non-core impact excluded by Plan',
        });
      } else {
        results.push({
          status:'FAIL',
          check:'risk.impact-missing',
          profile:risk.id,
          paths,
          impact:impactId,
          detail:'required risk impact is neither checked nor explicitly excluded',
        });
      }
    }

    for (const staticId of risk.requiredStaticChecks) {
      if (!staticChecks.has(staticId)) {
        results.push({
          status:'FAIL',
          check:'risk.static-check',
          profile:risk.id,
          paths,
          detail:'missing required static check ' + staticId,
        });
      } else {
        results.push({
          status:'PASS',
          check:'risk.static-check',
          profile:risk.id,
          paths,
          detail:'required static check ' + staticId + ' declared',
        });
      }
    }

    const required = risk.requiredImpacts;
    if (required.length && required.every(id => exclusions.has(id))) {
      results.push({
        status:'FAIL',
        check:'risk.all-impacts-excluded',
        profile:risk.id,
        paths,
        detail:'all impacts required by this risk profile were excluded',
      });
    }
  }

  const blocking = results.some(x => x.status === 'FAIL');
  return {
    profiles:profiles.map(x => ({id:x.profile.id, paths:x.paths.slice().sort(), reason:x.profile.reason})),
    results,
    riskOk:!blocking,
    exitCode:blocking ? 1 : 0,
  };
}

function runGit(root, args) {
  const r=spawnSync('git',['-C',root,...args],{encoding:'utf8'});
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'git failed').trim());
  return r.stdout.trim();
}

function parseGitHubRepo(remote) {
  const s=String(remote || '').trim();
  const m=s.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (!m) return null;
  return m[1] + '/' + m[2].replace(/\.git$/i,'');
}

function getRepositoryIdentity(root) {
  const repoRoot=path.resolve(root || process.cwd());
  const remote=runGit(repoRoot,['remote','get-url','origin']);
  const repository=parseGitHubRepo(remote);
  if (!repository) throw new Error('origin is not a recognizable GitHub repository URL');
  return {repository, remote};
}

function verifyRepositoryIdentity(root, expectedRepository) {
  const actual=getRepositoryIdentity(root);
  if (actual.repository !== expectedRepository) {
    return {
      ok:false,
      expected:expectedRepository,
      actual:actual.repository,
      remote:actual.remote,
    };
  }
  return {
    ok:true,
    expected:expectedRepository,
    actual:actual.repository,
    remote:actual.remote,
  };
}

module.exports = {
  normalizeAuthority,
  evaluateRiskPlan,
  parseGitHubRepo,
  getRepositoryIdentity,
  verifyRepositoryIdentity,
};
