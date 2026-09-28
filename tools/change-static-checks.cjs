'use strict';

const STATIC_CHECKS_SCHEMA = 'yumaniwa-static-check-registry/0.3';

const STATIC_CHECKS = Object.freeze({
  'node-syntax': Object.freeze({
    id: 'node-syntax',
    mode: 'node-syntax-diff',
    description: 'Run node --check for changed JavaScript-family files.',
  }),
  'change-operations-regression': Object.freeze({
    id: 'change-operations-regression',
    mode: 'trusted-change-regression',
    description: 'Run trusted base Change Operations tests against candidate Change OS tools.',
  }),
  'trusted-evidence-regression': Object.freeze({
    id: 'trusted-evidence-regression',
    mode: 'trusted-evidence-regression',
    description: 'Run trusted evidence/provenance verification regression tests.',
  }),
});

function getStaticCheck(id) {
  return STATIC_CHECKS[id] || null;
}

function allStaticChecks() {
  return Object.values(STATIC_CHECKS).map(item => ({ ...item }));
}

module.exports = {
  STATIC_CHECKS_SCHEMA,
  STATIC_CHECKS,
  getStaticCheck,
  allStaticChecks,
};
