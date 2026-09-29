'use strict';

const REGISTRY_SCHEMA = 'yumaniwa-trusted-static-check-registry/0.1';
const REGISTRY_VERSION = '2026-09-29.1';

function freezeRequirement(path, contains) {
  return Object.freeze({
    path,
    contains: Object.freeze([...contains]),
  });
}

const CHECKS = Object.freeze({
  'change-operations-regression': Object.freeze({
    id: 'change-operations-regression',
    definitionVersion: '1',
    executor: 'text-contract',
    selector: 'always',
    candidateExecution: false,
    description: 'Validate durable Change OS trust-boundary invariants by reading exact candidate Git blobs as text.',
    requirements: Object.freeze([
      freezeRequirement('.github/workflows/change-pr-gate.yml', [
        'pull_request_target:',
        'ref: ${{ github.event.pull_request.base.sha }}',
        'ref: ${{ github.event.pull_request.head.sha }}',
        '$GITHUB_WORKSPACE/trusted/tools/change-plan-lock.cjs',
        '$GITHUB_WORKSPACE/trusted/tools/change-scope-guard.cjs',
        '$GITHUB_WORKSPACE/trusted/tools/change-risk-check.cjs',
        '$GITHUB_WORKSPACE/trusted/tools/change-impact-check.cjs',
      ]),
      freezeRequirement('.github/workflows/change-verification.yml', [
        'pull_request_target:',
        'ref: ${{ github.event.pull_request.base.sha }}',
        'ref: ${{ github.event.pull_request.head.sha }}',
        '$GITHUB_WORKSPACE/trusted/tools/change-scope-guard.cjs',
        '$GITHUB_WORKSPACE/trusted/tools/change-risk-check.cjs',
        '$GITHUB_WORKSPACE/trusted/tools/change-impact-check.cjs',
        '$GITHUB_WORKSPACE/trusted/tools/change-static-check.cjs',
        'git ls-tree "$BASE_SHA" -- tools/change-static-check-registry.cjs',
        'git ls-tree "$BASE_SHA" -- tools/change-static-check.cjs',
        'git ls-tree "$BASE_SHA" -- tools/change-risk-policy.cjs',
        'name: trusted-static-evidence-${{ github.run_id }}-attempt-${{ github.run_attempt }}',
        "verificationState:'UNVERIFIED'",
      ]),
      freezeRequirement('tools/change-risk-policy.cjs', [
        "staticCheckRequirement('change-operations-regression')",
        "staticCheckRequirement('node-syntax', {",
        "applicability: { kind: 'extensions', extensions: ['.js', '.cjs', '.mjs'] }",
      ]),
      freezeRequirement('tools/change-risk-check.cjs', [
        "check:'risk.static-check-not-applicable'",
        'staticCheckApplicablePaths(requirement, paths)',
      ]),
    ]),
  }),
  'node-syntax': Object.freeze({
    id: 'node-syntax',
    definitionVersion: '1',
    executor: 'node-syntax',
    selector: 'changed-node-source',
    candidateExecution: false,
    description: 'Parse changed .js/.cjs/.mjs candidate Git blobs with a fixed trusted Node syntax parser; never execute candidate code.',
  }),
});

function getStaticCheckDefinition(id) {
  return typeof id === 'string' && Object.hasOwn(CHECKS, id) ? CHECKS[id] : null;
}

function listStaticCheckDefinitions() {
  return Object.keys(CHECKS).sort().map(id => CHECKS[id]);
}

module.exports = {
  REGISTRY_SCHEMA,
  REGISTRY_VERSION,
  CHECKS,
  getStaticCheckDefinition,
  listStaticCheckDefinitions,
};
