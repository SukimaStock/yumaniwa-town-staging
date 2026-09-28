'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'change-pr-gate.yml');
const source = fs.readFileSync(workflowPath, 'utf8');

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
