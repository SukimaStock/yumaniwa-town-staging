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


test('trusted verification preserves failing gate evidence before failing the job',()=>{
  assert.ok(verificationSource.includes('id: scope'));
  assert.ok(verificationSource.includes('id: risk'));
  assert.ok(verificationSource.includes('id: impact'));
  assert.ok(verificationSource.includes('echo "exit_code=$STATUS" >> "$GITHUB_OUTPUT"'));
  assert.ok(verificationSource.includes("schema:'yumaniwa-gate-error/0.1'"));
  assert.ok(verificationSource.includes('gateExitCodes:{'));
  const uploadIndex=verificationSource.indexOf('- name: Upload trusted mechanical evidence');
  const failIndex=verificationSource.indexOf('- name: Fail after preserving trusted evidence');
  assert.ok(uploadIndex >= 0);
  assert.ok(failIndex > uploadIndex);
  assert.ok(verificationSource.includes('One or more trusted gates failed: scope=$SCOPE_EXIT risk=$RISK_EXIT impact=$IMPACT_EXIT'));
});


test('trusted verification reads Plan Lock from an immutable regular Git blob',()=>{
  assert.ok(verificationSource.includes('LOCK_ENTRY="$(git ls-tree "$LOCK_COMMIT" -- "$LOCK_FILE")"'));
  assert.ok(verificationSource.includes('[ "$LOCK_MODE" = "100644" ]'));
  assert.ok(verificationSource.includes('[ "$LOCK_TYPE" = "blob" ]'));
  assert.ok(verificationSource.includes('git cat-file blob "$LOCK_OID" > "$IMMUTABLE_LOCK"'));
  assert.ok(verificationSource.includes('node "$GITHUB_WORKSPACE/trusted/tools/change-plan-lock.cjs" verify \\'));
  assert.ok(verificationSource.includes('--lock "$IMMUTABLE_LOCK"'));
  assert.equal(verificationSource.includes('--lock "$GITHUB_WORKSPACE/candidate/$LOCK_FILE"'),false);
  assert.ok(verificationSource.includes('blob:process.env.LOCK_BLOB'));
});


test('trusted verification requires every branch commit to descend from the Plan Lock',()=>{
  assert.ok(verificationSource.includes('git rev-list "$EVENT_BASE_SHA..HEAD"'));
  assert.ok(verificationSource.includes('git merge-base --is-ancestor "$LOCK_COMMIT" "$commit"'));
  assert.ok(verificationSource.includes('is not descended from the Plan Lock commit'));
});


test('trusted PR gate requires every branch commit to descend from the Plan Lock',()=>{
  assert.ok(source.includes('git rev-list "$EVENT_BASE_SHA..HEAD"'));
  assert.ok(source.includes('git merge-base --is-ancestor "$LOCK_COMMIT" "$commit"'));
  assert.ok(source.includes('is not descended from the Plan Lock commit'));
});

test('trusted PR gate reads and verifies Plan Lock from immutable regular Git blob',()=>{
  assert.ok(source.includes('LOCK_ENTRY="$(git ls-tree "$LOCK_COMMIT" -- "$LOCK_FILE")"'));
  assert.ok(source.includes('[ "$LOCK_MODE" = "100644" ]'));
  assert.ok(source.includes('[ "$LOCK_TYPE" = "blob" ]'));
  assert.ok(source.includes('git cat-file blob "$LOCK_OID" > "$IMMUTABLE_LOCK"'));
  assert.ok(source.includes('--lock "$IMMUTABLE_LOCK"'));
  assert.ok(source.includes('node - "$IMMUTABLE_LOCK" "$RUNNER_TEMP/yumaniwa-plan.json"'));
  assert.equal(source.includes('--lock "$GITHUB_WORKSPACE/candidate/$LOCK_FILE"'),false);
  assert.ok(source.includes('echo "lock_blob=$LOCK_OID" >> "$GITHUB_OUTPUT"'));
});


test('trusted verification records rerun initiator alongside original actor',()=>{
  assert.ok(verificationSource.includes('TRIGGERING_ACTOR: ${{ github.triggering_actor }}'));
  assert.ok(verificationSource.includes('actor:process.env.ACTOR'));
  assert.ok(verificationSource.includes('triggeringActor:process.env.TRIGGERING_ACTOR'));
  assert.ok(verificationSource.includes('runAttempt:process.env.RUN_ATTEMPT'));
});
