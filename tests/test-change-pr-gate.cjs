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
  assert.ok(verificationSource.includes('$GITHUB_WORKSPACE/trusted/tools/change-static-check.cjs'));
  assert.ok(verificationSource.includes("verificationState:'UNVERIFIED'"));
  assert.ok(verificationSource.includes('trusted-mechanical-evidence'));
  assert.ok(verificationSource.includes('trusted-static-evidence'));
});


test('trusted verification preserves failing gate evidence before failing the job',()=>{
  assert.ok(verificationSource.includes('id: scope'));
  assert.ok(verificationSource.includes('id: risk'));
  assert.ok(verificationSource.includes('id: impact'));
  assert.ok(verificationSource.includes('id: static'));
  assert.ok(verificationSource.includes('echo "exit_code=$STATUS" >> "$GITHUB_OUTPUT"'));
  assert.ok(verificationSource.includes("schema:'yumaniwa-gate-error/0.1'"));
  assert.ok(verificationSource.includes('gateExitCodes:{'));
  const uploadIndex=verificationSource.indexOf('- name: Upload trusted mechanical evidence');
  const failIndex=verificationSource.indexOf('- name: Fail after preserving trusted evidence');
  assert.ok(uploadIndex >= 0);
  assert.ok(failIndex > uploadIndex);
  assert.ok(verificationSource.includes('One or more trusted gates failed: scope=$SCOPE_EXIT risk=$RISK_EXIT impact=$IMPACT_EXIT static=$STATIC_EXIT'));
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
  assert.ok(verificationSource.includes('BASE_SHA: ${{ github.event.pull_request.base.sha }}'));
  assert.ok(verificationSource.includes('HEAD_SHA: ${{ github.event.pull_request.head.sha }}'));
  assert.ok(verificationSource.includes('RUN_ID: ${{ github.run_id }}'));
  assert.ok(verificationSource.includes('RUN_ATTEMPT: ${{ github.run_attempt }}'));
  assert.ok(verificationSource.includes('WORKFLOW_REF: ${{ github.workflow_ref }}'));
  assert.ok(verificationSource.includes('WORKFLOW_SHA: ${{ github.workflow_sha }}'));
  assert.ok(verificationSource.includes('ACTOR: ${{ github.actor }}'));
  assert.ok(verificationSource.includes('TRIGGERING_ACTOR: ${{ github.triggering_actor }}'));

  assert.ok(verificationSource.includes('baseSha:process.env.BASE_SHA'));
  assert.ok(verificationSource.includes('targetSha:process.env.HEAD_SHA'));
  assert.ok(verificationSource.includes('actor:process.env.ACTOR'));
  assert.ok(verificationSource.includes('triggeringActor:process.env.TRIGGERING_ACTOR'));
  assert.ok(verificationSource.includes('runId:process.env.RUN_ID'));
  assert.ok(verificationSource.includes('runAttempt:process.env.RUN_ATTEMPT'));
  assert.ok(verificationSource.includes('workflowRef:process.env.WORKFLOW_REF'));
  assert.ok(verificationSource.includes('workflowSha:process.env.WORKFLOW_SHA'));
});


test('trusted workflows pin external Actions to full commit SHAs',()=>{
  const checkout='actions/checkout@11d5960a326750d5838078e36cf38b85af677262';
  const upload='actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02';
  assert.ok(source.includes(checkout));
  assert.ok(verificationSource.includes(checkout));
  assert.ok(verificationSource.includes(upload));
  assert.equal(source.includes('actions/checkout@v4'),false);
  assert.equal(verificationSource.includes('actions/checkout@v4'),false);
  assert.equal(verificationSource.includes('actions/upload-artifact@v4'),false);
});

test('trusted evidence artifact names are unique per run attempt',()=>{
  assert.ok(verificationSource.includes(
    'name: trusted-mechanical-evidence-${{ github.run_id }}-attempt-${{ github.run_attempt }}'
  ));
  assert.ok(verificationSource.includes(
    'name: trusted-static-evidence-${{ github.run_id }}-attempt-${{ github.run_attempt }}'
  ));
});


test('trusted verification does not print raw machine evidence JSON to operator logs',()=>{
  for (const file of ['scope.json','risk.json','impact.json','static.json']) {
    assert.equal(
      verificationSource.includes('cat "$RUNNER_TEMP/' + file + '"'),
      false,
      file + ' must not be printed raw'
    );
    assert.ok(
      verificationSource.includes('> "$RUNNER_TEMP/' + file + '"'),
      file + ' must still be written'
    );
  }
  assert.ok(verificationSource.includes(
    'node - "$RUNNER_TEMP/scope.json" "$RUNNER_TEMP/risk.json" "$RUNNER_TEMP/impact.json" "$RUNNER_TEMP/trusted-evidence.json"'
  ));
  assert.ok(verificationSource.includes('Trusted Scope JSON evidence captured.'));
  assert.ok(verificationSource.includes('Trusted Risk JSON evidence captured.'));
  assert.ok(verificationSource.includes('Trusted Impact JSON evidence captured.'));
});


test('trusted workflows omit raw candidate values on failure paths',()=>{
  for (const workflow of [source,verificationSource]) {
    assert.equal(workflow.includes('unexpected path: $changed'),false);
    assert.ok(workflow.includes('value omitted from trusted log'));
  }
  assert.equal(source.includes('echo "locked: $LOCK_BASE"'),false);
  assert.ok(source.includes('Locked Plan baseSha differs from current PR base; candidate value omitted from trusted log.'));
  assert.ok(source.includes("console.error('Plan Lock JSON parse failed.');"));
  assert.ok(verificationSource.includes("console.error('Plan Lock JSON parse failed.');"));
});


test('trusted static executor is base-owned, exact-SHA bound, and registry-driven',()=>{
  assert.ok(verificationSource.includes('working-directory: trusted'));
  assert.ok(verificationSource.includes('git ls-tree "$BASE_SHA" -- tools/change-static-check-registry.cjs'));
  assert.ok(verificationSource.includes('$GITHUB_WORKSPACE/trusted/tools/change-static-check.cjs'));
  assert.ok(verificationSource.includes('--root "$GITHUB_WORKSPACE/candidate"'));
  assert.ok(verificationSource.includes('--base "$BASE_SHA"'));
  assert.ok(verificationSource.includes('--head "$HEAD_SHA"'));
  assert.ok(verificationSource.includes('--registry-blob "$REGISTRY_BLOB"'));
  assert.equal(verificationSource.includes('$GITHUB_WORKSPACE/candidate/tools/change-static-check.cjs'),false);
});

test('trusted static evidence preserves provenance and remains UNVERIFIED',()=>{
  assert.ok(verificationSource.includes("schema:'yumaniwa-trusted-static-evidence/0.1'"));
  assert.ok(verificationSource.includes('staticExitCode:Number(process.env.STATIC_EXIT)'));
  assert.ok(verificationSource.includes('registry:staticChecks.registry || null'));
  assert.ok(verificationSource.includes("verificationState:'UNVERIFIED'"));
  const uploadIndex=verificationSource.indexOf('- name: Upload trusted static evidence');
  const failIndex=verificationSource.indexOf('- name: Fail after preserving trusted evidence');
  assert.ok(uploadIndex >= 0);
  assert.ok(failIndex > uploadIndex);
});

test('trusted static machine JSON is not printed to operator logs',()=>{
  assert.equal(verificationSource.includes('cat "$RUNNER_TEMP/static.json"'),false);
  assert.equal(verificationSource.includes('cat "$RUNNER_TEMP/static.stderr"'),false);
  assert.ok(verificationSource.includes('Trusted Static JSON evidence captured.'));
});
