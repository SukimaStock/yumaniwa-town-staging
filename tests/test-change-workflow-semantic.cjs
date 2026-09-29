'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  parseWorkflowYaml,
  workflowSemanticDigest,
  verifyWorkflowSemanticDigest,
} = require('../tools/change-workflow-semantic.cjs');

const ROOT = path.join(__dirname, '..');

function fixture() {
  return [
    'name: Gate',
    '',
    'on:',
    '  pull_request_target:',
    '    types: [opened, synchronize]',
    '',
    'permissions:',
    '  contents: read',
    '',
    'jobs:',
    '  gate:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: Checkout trusted base',
    '        uses: actions/checkout@1111111111111111111111111111111111111111 # pinned',
    '        with:',
    '          ref: ${{ github.event.pull_request.base.sha }}',
    '          persist-credentials: false',
    '      - name: Verify',
    '        shell: bash',
    '        run: |',
    '          set -euo pipefail',
    '          node trusted/tool.cjs',
    '',
  ].join('\n');
}

test('current Change OS workflows parse under the trusted subset', () => {
  for (const file of [
    '.github/workflows/change-pr-gate.yml',
    '.github/workflows/change-verification.yml',
  ]) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const parsed = parseWorkflowYaml(source);
    assert.equal(typeof parsed, 'object');
    assert.equal(parsed.on.pull_request_target.types[0], 'opened');
    assert.equal(parsed.permissions.contents, 'read');
    assert.match(workflowSemanticDigest(source), /^[0-9a-f]{64}$/);
  }
});

test('ordinary YAML comments and mapping key order do not change semantics', () => {
  const a = [
    'name: Example',
    'permissions:',
    '  contents: read',
    'on:',
    '  pull_request_target:',
    '    types: [opened, edited]',
    '',
  ].join('\n');
  const b = [
    '# harmless comment',
    'on:',
    '  # event comment',
    '  pull_request_target:',
    '    types: [opened, edited] # inline comment',
    'permissions:',
    '  contents: read',
    'name: Example # trailing comment',
    '',
  ].join('\n');
  assert.equal(workflowSemanticDigest(a), workflowSemanticDigest(b));
});

test('moving an active checkout ref into a YAML comment cannot preserve digest', () => {
  const good = fixture();
  const bad = good.replace(
    '          ref: ${{ github.event.pull_request.base.sha }}',
    '          # ref: ${{ github.event.pull_request.base.sha }}'
  );
  assert.notEqual(workflowSemanticDigest(good), workflowSemanticDigest(bad));
});

test('moving a required value into an unrelated live scalar changes digest', () => {
  const good = fixture();
  const bad = good
    .replace('          ref: ${{ github.event.pull_request.base.sha }}\n', '')
    .replace(
      '      - name: Verify',
      '      - name: Verify\n        env:\n          DECOY: ${{ github.event.pull_request.base.sha }}'
    );
  assert.notEqual(workflowSemanticDigest(good), workflowSemanticDigest(bad));
});

test('replacing a run command with a shell comment changes semantic digest', () => {
  const good = fixture();
  const bad = good.replace(
    '          node trusted/tool.cjs',
    '          # node trusted/tool.cjs'
  );
  assert.notEqual(workflowSemanticDigest(good), workflowSemanticDigest(bad));
});

test('adding an extra candidate-execution step changes semantic digest', () => {
  const good = fixture();
  const bad = good.replace(
    '      - name: Verify',
    [
      '      - name: Execute candidate',
      '        shell: bash',
      '        run: |',
      '          node candidate/evil.js',
      '      - name: Verify',
    ].join('\n')
  );
  assert.notEqual(workflowSemanticDigest(good), workflowSemanticDigest(bad));
});

test('changing trusted checkout ref to candidate SHA changes semantic digest', () => {
  const good = fixture();
  const bad = good.replace(
    '${{ github.event.pull_request.base.sha }}',
    '${{ github.event.pull_request.head.sha }}'
  );
  assert.notEqual(workflowSemanticDigest(good), workflowSemanticDigest(bad));
});

test('literal run block is semantic content, including shell comments', () => {
  const parsed = parseWorkflowYaml(fixture());
  const run = parsed.jobs.gate.steps[1].run;
  assert.equal(run, 'set -euo pipefail\nnode trusted/tool.cjs\n');

  const commented = fixture().replace(
    '          node trusted/tool.cjs',
    '          # node trusted/tool.cjs'
  );
  const parsedCommented = parseWorkflowYaml(commented);
  assert.equal(parsedCommented.jobs.gate.steps[1].run, 'set -euo pipefail\n# node trusted/tool.cjs\n');
});

test('literal block clip chomping ignores trailing blank lines but keeps internal blank lines', () => {
  const a = [
    'name: Gate',
    'run: |',
    '  one',
    '  ',
    '  two',
    '',
  ].join('\n');
  const b = [
    'name: Gate',
    'run: |',
    '  one',
    '  ',
    '  two',
    '',
    '',
    '',
  ].join('\n');
  assert.equal(parseWorkflowYaml(a).run, 'one\n\ntwo\n');
  assert.equal(workflowSemanticDigest(a), workflowSemanticDigest(b));
});

test('literal block strip chomping removes the final newline', () => {
  const source = [
    'name: Gate',
    'run: |-',
    '  one',
    '  two',
    '',
  ].join('\n');
  assert.equal(parseWorkflowYaml(source).run, 'one\ntwo');
});

test('duplicate mapping keys fail closed', () => {
  const source = [
    'name: A',
    'name: B',
    'on:',
    '  pull_request_target:',
    '    types: [opened]',
  ].join('\n');
  assert.throws(() => parseWorkflowYaml(source), /duplicate mapping key/);
});

test('anchors aliases tags flow maps and folded blocks fail closed', () => {
  for (const source of [
    'name: &n Gate\non:\n  pull_request_target:\n    types: [opened]\n',
    'name: *n\non:\n  pull_request_target:\n    types: [opened]\n',
    'name: !str Gate\non:\n  pull_request_target:\n    types: [opened]\n',
    'name: Gate\nenv: {A: B}\n',
    'name: Gate\ndescription: >\n  folded\n',
  ]) {
    assert.throws(() => parseWorkflowYaml(source));
  }
});

test('tabs in indentation fail closed', () => {
  assert.throws(() => parseWorkflowYaml('name: Gate\n\tpull_request_target: true\n'), /tabs in indentation/);
});

test('semantic verifier reports exact digest equality only', () => {
  const source = fixture();
  const digest = workflowSemanticDigest(source);
  const pass = verifyWorkflowSemanticDigest(source, digest);
  assert.equal(pass.ok, true);
  assert.equal(pass.actualDigest, digest);

  const fail = verifyWorkflowSemanticDigest(
    source.replace('contents: read', 'contents: write'),
    digest
  );
  assert.equal(fail.ok, false);
  assert.notEqual(fail.actualDigest, digest);
});
