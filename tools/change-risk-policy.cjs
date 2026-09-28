'use strict';

const PLAN_LEVEL_RANK = Object.freeze({ lite: 0, standard: 1, full: 2 });

const KNOWN_DOMAIN_DATA = new Set([
  'data/ghost-dialogue.js',
  'data/notes.js',
  'data/places.js',
  'data/station-plaza-props.js',
  'data/station-plaza.js',
  'data/town-maps.js',
  'data/town-seeds.js',
  'data/updates.js',
  'data/work-search-meta.js',
  'data/works.js',
  'data/world-objects.js',
]);

const SHARED_RUNTIME = new Set([
  'main.js',
  'town-memory.js',
  'town-ghost-npc.js',
  'town-prop-preload.js',
  'town-scene-validation.js',
  'town-interaction-flow.js',
  'town-analytics.js',
  'developer-access.js',
]);

function normalizeRiskPath(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function profile(id, options = {}) {
  return Object.freeze({
    id,
    minPlanLevel: options.minPlanLevel || 'full',
    requiredClasses: Object.freeze([...(options.requiredClasses || ['SYSTEM'])]),
    requiredAuthority: Object.freeze([...(options.requiredAuthority || ['HQ Review'])]),
    requiredImpacts: Object.freeze([...(options.requiredImpacts || [])]),
    coreImpacts: Object.freeze([...(options.coreImpacts || [])]),
    requiredStaticChecks: Object.freeze([...(options.requiredStaticChecks || [])]),
    reason: options.reason || '',
  });
}

const PROFILES = Object.freeze({
  os: profile('os', {
    requiredImpacts: ['os.previous-gate', 'os.regression', 'os.provenance'],
    coreImpacts: ['os.regression', 'os.provenance'],
    requiredStaticChecks: ['change-operations-regression', 'node-syntax'],
    reason: 'Change OS and workflow files can weaken the gate that evaluates later changes.',
  }),
  sharedRuntime: profile('shared-runtime', {
    requiredImpacts: ['runtime.shared', 'runtime.regression', 'runtime.rollback'],
    coreImpacts: ['runtime.shared', 'runtime.regression'],
    requiredStaticChecks: ['node-syntax'],
    reason: 'Shared runtime affects multiple scenes or works.',
  }),
  sharedSurface: profile('shared-surface', {
    requiredImpacts: ['surface.shared', 'runtime.regression'],
    coreImpacts: ['runtime.regression'],
    reason: 'Root HTML/CSS/manifest/service-worker changes are shared delivery or UI changes.',
  }),
  workRuntime: profile('work-runtime', {
    minPlanLevel: 'standard',
    requiredClasses: ['WORK'],
    requiredAuthority: [],
    requiredImpacts: ['work.runtime', 'work.regression'],
    coreImpacts: ['work.runtime'],
    reason: 'Work-local runtime can change a work without changing the town shared runtime.',
  }),
  asset: profile('asset', {
    minPlanLevel: 'standard',
    requiredClasses: ['ASSET'],
    requiredAuthority: [],
    requiredImpacts: ['asset.file', 'asset.rendering', 'asset.cache'],
    coreImpacts: ['asset.file'],
    reason: 'Canonical asset changes require asset/render/cache consideration.',
  }),
  unknownCode: profile('unknown-code', {
    requiredImpacts: ['risk.high-risk-review', 'runtime.regression'],
    coreImpacts: ['risk.high-risk-review'],
    reason: 'Unregistered executable/shared surface path must not close as INFO only.',
  }),
});

function isChangeOsPath(p) {
  return (
    p.startsWith('tools/change-') ||
    p.startsWith('tests/test-change-') ||
    p.startsWith('.github/workflows/') ||
    /^CHANGE-(PLAN|VERIFICATION|OPERATIONS)\.md$/.test(p) ||
    p === 'AGENTS.md' ||
    p === 'OPERATIONS.md' ||
    p === 'RELEASE-WORKFLOW.md'
  );
}

function isSharedSurfacePath(p) {
  if (p === 'index.html' || p === 'style.css' || p === 'layout-fix.css') return true;
  if (/^(service-worker|sw)\.(js|mjs)$/.test(p)) return true;
  if (/^(manifest|site)\.(webmanifest|json)$/.test(p)) return true;
  return false;
}

function isExecutableLike(p) {
  if (/\.(?:js|cjs|mjs|jsx|ts|tsx|py|sh|bash|zsh|fish|ps1|rb|pl|php|lua|html|css|webmanifest)$/i.test(p)) {
    return true;
  }
  if (/^(?:Makefile|Dockerfile)$/i.test(p)) return true;
  if (/^(?:bin|scripts|\.github\/scripts)\//.test(p)) return true;
  if (/^tools\/[^/.]+$/.test(p)) return true;
  return false;
}

function classifyRiskPath(value) {
  const p = normalizeRiskPath(value);
  if (!p) return null;

  if (isChangeOsPath(p)) return PROFILES.os;
  if (KNOWN_DOMAIN_DATA.has(p)) return null;
  if (SHARED_RUNTIME.has(p)) return PROFILES.sharedRuntime;
  if (isSharedSurfacePath(p)) return PROFILES.sharedSurface;
  if (p.startsWith('works/')) {
    if (isExecutableLike(p)) return PROFILES.workRuntime;
    return null;
  }
  if (p.startsWith('assets/')) return PROFILES.asset;

  if (isExecutableLike(p)) return PROFILES.unknownCode;
  return null;
}

function collectRiskRequirements(paths) {
  const byProfile = new Map();
  for (const raw of [...new Set(paths || [])]) {
    const p = normalizeRiskPath(raw);
    const risk = classifyRiskPath(p);
    if (!risk) continue;
    if (!byProfile.has(risk.id)) {
      byProfile.set(risk.id, { profile: risk, paths: [] });
    }
    byProfile.get(risk.id).paths.push(p);
  }
  return [...byProfile.values()].sort((a, b) => a.profile.id.localeCompare(b.profile.id));
}

function riskImpactDefinitions() {
  const map = new Map();
  for (const risk of Object.values(PROFILES)) {
    for (const id of risk.requiredImpacts) {
      if (!map.has(id)) {
        map.set(id, {
          id,
          description: 'Required by high-risk profile ' + risk.id,
          profiles: [risk.id],
          core: risk.coreImpacts.includes(id),
        });
      } else {
        const current = map.get(id);
        current.profiles.push(risk.id);
        current.core = current.core || risk.coreImpacts.includes(id);
      }
    }
  }
  return [...map.values()];
}

module.exports = {
  PLAN_LEVEL_RANK,
  KNOWN_DOMAIN_DATA,
  PROFILES,
  normalizeRiskPath,
  classifyRiskPath,
  collectRiskRequirements,
  riskImpactDefinitions,
};
