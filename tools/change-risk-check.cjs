'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  PLAN_LEVEL_RANK,
  collectRiskRequirements,
} = require('./change-risk-policy.cjs');
const {
  validatePlan,
  collectChangedPaths,
} = require('./change-scope-guard.cjs');

function normalizeAuthority(value) {
  if (Array.isArray(value)) return value.map(x => String(x).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function evaluateRiskPlan(plan, changedPaths, options = {}) {
  const results = [];
  const profiles = collectRiskRequirements(changedPaths, options);
  const classes = new Set(Array.isArray(plan.classes) ? plan.classes : []);
  const authority = new Set(normalizeAuthority(plan.authority));
  const impactChecks = new Set(Array.isArray(plan.impactChecks) ? plan.impactChecks : []);
  const exclusions = new Set(Array.isArray(plan.impactExclusions) ? plan.impactExclusions.map(x => x && x.id).filter(Boolean) : []);
  const staticChecks = new Set(Array.isArray(plan.staticChecks) ? plan.staticChecks : []);

  for (const item of profiles) {
    const risk = item.profile;
    const paths = item.paths.slice().sort();

    if ((PLAN_LEVEL_RANK[plan.planLevel] ?? -1) < (PLAN_LEVEL_RANK[risk.minPlanLevel] ?? 99)) {
      results.push({status:'FAIL',check:'risk.plan-level',profile:risk.id,paths,detail:risk.id + ' requires ' + risk.minPlanLevel + ' plan'});
    } else {
      results.push({status:'PASS',check:'risk.plan-level',profile:risk.id,paths,detail:'planLevel ' + plan.planLevel + ' satisfies ' + risk.minPlanLevel});
    }

    for (const requiredClass of risk.requiredClasses) {
      results.push(classes.has(requiredClass)
        ? {status:'PASS',check:'risk.class',profile:risk.id,paths,detail:'required class ' + requiredClass + ' declared'}
        : {status:'FAIL',check:'risk.class',profile:risk.id,paths,detail:'missing required class ' + requiredClass});
    }

    for (const requiredAuthority of risk.requiredAuthority) {
      results.push(authority.has(requiredAuthority)
        ? {status:'PASS',check:'risk.authority',profile:risk.id,paths,detail:'required authority ' + requiredAuthority + ' declared'}
        : {status:'FAIL',check:'risk.authority',profile:risk.id,paths,detail:'missing required authority ' + requiredAuthority});
    }

    for (const impactId of risk.requiredImpacts) {
      if (risk.coreImpacts.includes(impactId) && exclusions.has(impactId)) {
        results.push({status:'FAIL',check:'risk.core-impact-excluded',profile:risk.id,paths,impact:impactId,detail:'core impact cannot be excluded'});
      } else if (impactChecks.has(impactId)) {
        results.push({status:'PASS',check:'risk.impact',profile:risk.id,paths,impact:impactId,detail:'required impact is declared for checking'});
      } else if (exclusions.has(impactId)) {
        results.push({status:'N/A',check:'risk.impact-excluded',profile:risk.id,paths,impact:impactId,detail:'non-core impact excluded by Plan'});
      } else {
        results.push({status:'FAIL',check:'risk.impact-missing',profile:risk.id,paths,impact:impactId,detail:'required risk impact is neither checked nor explicitly excluded'});
      }
    }

    for (const staticId of risk.requiredStaticChecks) {
      results.push(staticChecks.has(staticId)
        ? {status:'PASS',check:'risk.static-check',profile:risk.id,paths,detail:'required static check ' + staticId + ' declared'}
        : {status:'FAIL',check:'risk.static-check',profile:risk.id,paths,detail:'missing required static check ' + staticId});
    }

    if (risk.requiredImpacts.length && risk.requiredImpacts.every(id => exclusions.has(id))) {
      results.push({status:'FAIL',check:'risk.all-impacts-excluded',profile:risk.id,paths,detail:'all impacts required by this risk profile were excluded'});
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

function isExecutableAtRef(root, ref, filePath) {
  const output=runGit(root,['ls-tree',ref,'--',filePath]);
  if (!output) return false;
  return output.split(/\r?\n/).some(line=>line.startsWith('100755 '));
}

function collectExecutablePaths(root, baseSha, headSha, changedPaths) {
  const executable=[];
  for (const filePath of [...new Set(changedPaths || [])]) {
    if (!filePath) continue;
    if (isExecutableAtRef(root,baseSha,filePath) || isExecutableAtRef(root,headSha,filePath)) {
      executable.push(filePath);
    }
  }
  return executable.sort();
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
    return {ok:false,expected:expectedRepository,actual:actual.repository,remote:actual.remote};
  }
  return {ok:true,expected:expectedRepository,actual:actual.repository,remote:actual.remote};
}

function readPlan(planPath) {
  if (!planPath) throw new Error('--plan is required');
  const raw=JSON.parse(fs.readFileSync(path.resolve(planPath),'utf8'));
  const checked=validatePlan(raw,{allowLegacy:false});
  if(!checked.ok) throw new Error('invalid v0.2 plan:\n- '+checked.errors.join('\n- '));
  return checked.plan;
}

function parseArgs(argv) {
  const options={root:process.cwd(),plan:null,head:null,json:false};
  for(let i=0;i<argv.length;i+=1){
    const arg=argv[i];
    if(arg==='--json') options.json=true;
    else if(arg==='--root'||arg==='--plan'||arg==='--head'){
      const value=argv[++i];
      if(!value) throw new Error(arg+' requires a value');
      options[arg.slice(2)]=value;
    } else if(arg==='--help'||arg==='-h') options.help=true;
    else throw new Error('unknown argument: '+arg);
  }
  return options;
}

function usage(){
  return [
    'Usage:',
    '  node tools/change-risk-check.cjs --plan <plan.json> [--root <repo>] [--head <ref>] [--json]',
    '',
    'Checks repository identity and derives minimum class/plan/authority/impact requirements from changed paths.'
  ].join('\n');
}

function runCli(argv=process.argv.slice(2)){
  let options;
  try{
    options=parseArgs(argv);
    if(options.help){process.stdout.write(usage()+'\n');return 0;}
    const plan=readPlan(options.plan);
    const repoCheck=verifyRepositoryIdentity(options.root,plan.repository);
    const diff=collectChangedPaths(options.root,plan.baseSha,options.head);
    const executablePaths=collectExecutablePaths(options.root,plan.baseSha,diff.headSha,diff.paths);
    const evaluated=evaluateRiskPlan(plan,diff.paths,{executablePaths});
    const results=[
      {
        status:repoCheck.ok?'PASS':'FAIL',
        check:'risk.repository',
        profile:'repository',
        paths:[],
        detail:repoCheck.ok ? 'repository identity matches '+repoCheck.actual : 'expected '+repoCheck.expected+' but found '+repoCheck.actual,
      },
      ...evaluated.results
    ];
    const riskOk=results.every(x=>x.status!=='FAIL');
    const report={
      schema:'yumaniwa-risk-check-report/0.2',
      change:plan.change,
      repository:repoCheck.actual,
      expectedRepository:plan.repository,
      baseSha:plan.baseSha,
      target:diff.target,
      headSha:diff.headSha,
      changedPaths:[...new Set(diff.paths)].sort(),
      executablePaths,
      profiles:evaluated.profiles,
      results,
      riskOk,
      exitCode:riskOk?0:1,
    };
    if(options.json) process.stdout.write(JSON.stringify(report,null,2)+'\n');
    else{
      process.stdout.write('YUMANIWA RISK CHECK v0.2\n');
      for(const item of results) process.stdout.write(item.status+' '+item.check+' '+item.detail+'\n');
      process.stdout.write('\nRisk: '+(riskOk?'PASS':'STOP')+'\n');
    }
    return report.exitCode;
  }catch(error){
    process.stderr.write('Risk Check error: '+error.message+'\n');
    if(options && !options.help) process.stderr.write(usage()+'\n');
    return 2;
  }
}

if(require.main===module) process.exitCode=runCli();

module.exports={
  normalizeAuthority,
  evaluateRiskPlan,
  parseGitHubRepo,
  getRepositoryIdentity,
  verifyRepositoryIdentity,
  isExecutableAtRef,
  collectExecutablePaths,
  runCli,
};
