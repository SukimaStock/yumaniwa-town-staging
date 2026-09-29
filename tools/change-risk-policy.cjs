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
  return value;
}

function staticCheckRequirement(id, options = {}) {
  const applicability = options.applicability || { kind: 'always' };
  return Object.freeze({
    id,
    applicability: Object.freeze({
      kind: applicability.kind || 'always',
      extensions: Object.freeze([...(applicability.extensions || [])]),
    }),
  });
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
    requiredStaticChecks: [
      staticCheckRequirement('change-operations-regression'),
      staticCheckRequirement('node-syntax', {
        applicability: { kind: 'extensions', extensions: ['.js', '.cjs', '.mjs'] },
      }),
    ],
    reason: 'Change OS and workflow files can weaken the gate that evaluates later changes.',
  }),
  sharedRuntime: profile('shared-runtime', {
    requiredImpacts: ['runtime.shared', 'runtime.regression', 'runtime.rollback'],
    coreImpacts: ['runtime.shared', 'runtime.regression'],
    requiredStaticChecks: [
      staticCheckRequirement('node-syntax', {
        applicability: { kind: 'extensions', extensions: ['.js', '.cjs', '.mjs'] },
      }),
    ],
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
    p.startsWith('.github/actions/') ||
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

function isPlanLockPath(p) {
  return /^\.change-plans\/[a-z0-9][a-z0-9-]{2,80}\/r[0-9]+\.lock\.json$/.test(p);
}

function isExecutableLike(p) {
  if (/\.(?:js|cjs|mjs|jsx|ts|tsx|py|sh|bash|zsh|fish|ps1|rb|pl|php|lua|go|rs|java|kt|kts|swift|c|cc|cpp|cxx|h|hh|hpp|hxx|cs|fs|fsx|scala|clj|cljs|cljc|ex|exs|erl|hrl|dart|r|html|css|webmanifest)$/i.test(p)) {
    return true;
  }
  if (/(?:^|\/)(?:Makefile|Dockerfile)$/i.test(p)) return true;
  if (/^(?:bin|scripts|\.github\/scripts)\//.test(p)) return true;
  if (/^tools\/[^/.]+$/.test(p)) return true;
  return false;
}

const LOW_RISK_CONTENT_EXTENSIONS = new Set([
  '.md', '.txt', '.rst', '.adoc', '.csv', '.tsv',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico',
  '.wav', '.mp3', '.ogg', '.m4a', '.mp4', '.webm',
  '.woff', '.woff2', '.ttf', '.otf',
]);

function isKnownLowRiskContentPath(p) {
  const lower = p.toLowerCase();
  const base = lower.split('/').pop() || '';
  if (['license', 'notice', 'copying', 'robots.txt', 'sitemap.xml'].includes(base)) return true;
  const dot = base.lastIndexOf('.');
  const ext = dot >= 0 ? base.slice(dot) : '';
  return LOW_RISK_CONTENT_EXTENSIONS.has(ext);
}

function classifyRiskPath(value, options = {}) {
  const p = normalizeRiskPath(value);
  if (!p) return null;
  const executable = options.executable === true;

  if (isPlanLockPath(p) && !executable) return null;
  if (isChangeOsPath(p)) return PROFILES.os;
  if (SHARED_RUNTIME.has(p)) return PROFILES.sharedRuntime;
  if (isSharedSurfacePath(p)) return PROFILES.sharedSurface;

  if (p.startsWith('works/')) {
    if (executable || isExecutableLike(p) || !isKnownLowRiskContentPath(p)) return PROFILES.workRuntime;
    return null;
  }

  if (executable) return PROFILES.unknownCode;
  if (KNOWN_DOMAIN_DATA.has(p)) return null;

  if (p.startsWith('assets/')) {
    if (isKnownLowRiskContentPath(p)) return PROFILES.asset;
    return PROFILES.unknownCode;
  }

  if (isExecutableLike(p)) return PROFILES.unknownCode;
  if (isKnownLowRiskContentPath(p)) return null;

  // Unknown formats are high-risk by default. This avoids a permanent
  // extension allowlist race when new executable/source/config formats appear.
  return PROFILES.unknownCode;
}

function collectRiskRequirements(paths, options = {}) {
  const byProfile = new Map();
  const executablePaths = new Set((options.executablePaths || []).map(normalizeRiskPath));
  for (const raw of [...new Set(paths || [])]) {
    const p = normalizeRiskPath(raw);
    const risk = classifyRiskPath(p, { executable: executablePaths.has(p) });
    if (!risk) continue;
    if (!byProfile.has(risk.id)) {
      byProfile.set(risk.id, { profile: risk, paths: [] });
    }
    byProfile.get(risk.id).paths.push(p);
  }
  return [...byProfile.values()].sort((a, b) => a.profile.id.localeCompare(b.profile.id));
}

function staticCheckApplicablePaths(requirement, paths) {
  if (!requirement || typeof requirement.id !== 'string' || !requirement.id) {
    throw new Error('invalid static check requirement');
  }
  const applicability = requirement.applicability || { kind: 'always', extensions: [] };
  const uniquePaths = [...new Set((paths || []).map(normalizeRiskPath).filter(Boolean))].sort();

  if (applicability.kind === 'always') return uniquePaths;

  if (applicability.kind === 'extensions') {
    const extensions = new Set((applicability.extensions || []).map(value => String(value).toLowerCase()));
    return uniquePaths.filter(filePath => {
      const lower = filePath.toLowerCase();
      return [...extensions].some(extension => lower.endsWith(extension));
    });
  }

  throw new Error('unknown static check applicability kind: ' + applicability.kind);
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
  staticCheckRequirement,
  staticCheckApplicablePaths,
  classifyRiskPath,
  collectRiskRequirements,
  riskImpactDefinitions,
};
