'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'change-pr-gate.yml');
const source = fs.readFileSync(workflowPath, 'utf8');
const verificationWorkflowPath = path.join(__dirname, '..', '.github', 'workflows', 'change-verification.yml');
const verificationSource = fs.readFileSync(verificationWorkflowPath, 'utf8');

test('trusted PR gate reruns on edited pull request events',()=>{
  assert.match(source,/types:\s*\[opened, synchronize, reopened, edited\]/);
});

test('Plan Lock path is constrained to the changeId slug shape',()=>{
  assert.ok(source.includes("grep -E '^\\.change-plans/[a-z0-9][a-z0-9-]{2,80}/r[0-9]+\\.lock\\.json$'"));
});

test('candidate-controlled lock path is parsed as JSON data, not required as code',()=>{
  assert.equal(source.includes("require('./$LOCK_FILE')"),false);
  assert.ok(source.includes("const lockPath = process.argv[2];"));
  assert.ok(source.includes("JSON.parse(fs.readFileSync(lockPath, 'utf8'))"));
});

test('Plan Lock first commit permits only the selected lock file',()=>{
  assert.ok(source.includes('if [ "$changed" != "$LOCK_FILE" ]; then'));
  assert.equal(source.includes('.change-plans/*) ;;'),false);
});


test('trusted verification evidence workflow is base-owned and does not declare final VERIFIED',()=>{
  assert.match(verificationSource,/pull_request_target:/);
  assert.match(verificationSource,/types:\s*\[opened, synchronize, reopened, edited\]/);
  assert.ok(verificationSource.includes('ref: ${{ github.event.pull_request.base.sha }}'));
  assert.ok(verificationSource.includes('ref: ${{ github.event.pull_request.head.sha }}'));
  assert.ok(verificationSource.includes('path: trusted'));
  assert.ok(verificationSource.includes('path: candidate'));
  assert.ok(verificationSource.includes('persist-credentials: false'));
  assert.ok(verificationSource.includes('$GITHUB_WORKSPACE/trusted/tools/change-scope-guard.cjs'));
  assert.ok(verificationSource.includes('$GITHUB_WORKSPACE/trusted/tools/change-risk-check.cjs'));
  assert.ok(verificationSource.includes('$GITHUB_WORKSPACE/trusted/tools/change-impact-check.cjs'));
  assert.ok(verificationSource.includes("verificationState:'UNVERIFIED'"));
  assert.ok(verificationSource.includes('trusted-mechanical-evidence'));
});
