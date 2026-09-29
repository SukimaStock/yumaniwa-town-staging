'use strict';

const REGISTRY_SCHEMA = 'yumaniwa-trusted-static-check-registry/0.1';
const REGISTRY_VERSION = '2026-09-29.1';

const CHECKS = Object.freeze({
  'change-operations-regression': Object.freeze({
    id: 'change-operations-regression',
    definitionVersion: '1',
    kind: 'text-contract',
    candidateExecution: false,
    description: 'Validate base-owned Change OS trust-boundary invariants by reading candidate Git blobs as text only.',
    requirements: Object.freeze([
      Object.freeze({
        path: '.github/workflows/change-pr-gate.yml',
        contains: Object.freeze([
          'pull_request_target:',
          'ref: ${{ github.event.pull_request.base.sha }}',
          'ref: ${{ github.event.pull_request.head.sha }}',
          '$GITHUB_WORKSPACE/trusted/tools/change-plan-lock.cjs',
          '$GITHUB_WORKSPACE/trusted/tools/change-scope-guard.cjs',
          '$GITHUB_WORKSPACE/trusted/tools/change-risk-check.cjs',
          '$GITHUB_WORKSPACE/trusted/tools/change-impact-check.cjs',
        ]),
      }),
      Object.freeze({
        path: '.github/workflows/change-verification.yml',
        contains: Object.freeze([
          'pull_request_target:',
          'ref: ${{ github.event.pull_request.base.sha }}',
          'ref: ${{ github.event.pull_request.head.sha }}',
          '$GITHUB_WORKSPACE/trusted/tools/change-scope-guard.cjs',
          '$GITHUB_WORKSPACE/trusted/tools/change-risk-check.cjs',
          '$GITHUB_WORKSPACE/trusted/tools/change-impact-check.cjs',
          '$GITHUB_WORKSPACE/trusted/tools/change-static-check.cjs',
          "verificationState:'UNVERIFIED'",
          'trusted-static-evidence-${{ github.run_id }}-attempt-${{ github.run_attempt }}',
        ]),
      }),
      Object.freeze({
        path: 'tools/change-risk-policy.cjs',
        contains: Object.freeze([
          "requiredStaticChecks: ['change-operations-regression', 'node-syntax']",
        ]),
      }),
    ]),
  }),
  'node-syntax': Object.freeze({
    id: 'node-syntax',
    definitionVersion: '1',
    kind: 'node-syntax',
    candidateExecution: false,
    description: 'Parse changed candidate JavaScript Git blobs with node --check over stdin; never execute candidate modules.',
    extensions: Object.freeze(['.js', '.cjs', '.mjs']),
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
