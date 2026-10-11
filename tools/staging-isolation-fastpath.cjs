#!/usr/bin/env node
'use strict';

// Staging-only, read-only proof. This tool DOES NOT authorize a PR or skip any gate.
// To avoid executing untrusted work code, it reads only Git diff/tree/blob metadata.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const decoder = new TextDecoder('utf-8', { fatal: true });
const SHA = /^[a-f0-9]{40}$/i;
const WORK_ID = /^[a-z][a-z0-9-]{2,48}$/;
const PART = /^[a-zA-Z0-9_.-]+$/;
const MAX_FILES = 128;
const MAX_BLOB = 32 * 1024 * 1024;
const MAX_TOTAL = 96 * 1024 * 1024;

function git(root, args) {
  const proc = spawnSync('git', ['-C', root, ...args], {
    shell: false, maxBuffer: 8 * 1024 * 1024,
  });
  if (proc.error || proc.status !== 0) {
    throw new Error('GIT_COMMAND_FAILED');
  }
  return proc.stdout;
}

function readZ(buffer) {
  const out = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] !== 0) continue;
    out.push(decoder.decode(buffer.subarray(start, i)));
    start = i + 1;
  }
  if (start !== buffer.length) throw new Error('UNTERMINATED_GIT_RECORD');
  return out;
}

function treeEntries(root, sha, selector) {
  const output = readZ(git(root, ['ls-tree', '-rz', '--full-tree', sha, '--', selector]));
  const items = new Map();
  for (const record of output) {
    const tab = record.indexOf('\t');
    if (tab < 0) throw new Error('BAD_TREE_RECORD');
    const match = /^(100644|100755|120000|160000) (blob|commit) ([0-9a-f]{40})$/.exec(record.slice(0, tab));
    if (!match) throw new Error('BAD_TREE_MODE');
    const p = record.slice(tab + 1);
    if (items.has(p)) throw new Error('DUPLICATE_TREE_PATH');
    items.set(p, { mode: match[1], type: match[2], oid: match[3] });
  }
  return items;
}

function validRelative(relative) {
  const parts = relative.split('/');
  return parts.every(part =>
    part !== '.' && part !== '..' && !part.startsWith('.') && PART.test(part)
  );
}

function classify({ root, baseSha, headSha }) {
  const deny = reason => ({ eligible: false, reason });
  try {
    if (typeof root !== 'string' || !root || !fs.statSync(root).isDirectory()) return deny('INVALID_ROOT');
    if (!SHA.test(baseSha || '') || !SHA.test(headSha || '') || baseSha === headSha) return deny('INVALID_SHA');
    const base = git(root, ['rev-parse', '--verify', baseSha + '^{commit}']).toString('ascii').trim();
    const head = git(root, ['rev-parse', '--verify', headSha + '^{commit}']).toString('ascii').trim();
    if (base !== baseSha.toLowerCase() || head !== headSha.toLowerCase()) return deny('SHA_MISMATCH');
    const ancestor = spawnSync('git', ['-C', root, 'merge-base', '--is-ancestor', base, head], {shell:false});
    if (ancestor.status !== 0) return deny('BASE_NOT_ANCESTOR');

    const records = readZ(git(root, ['diff', '--name-status', '-z', '--no-renames', base, head, '--']));
    if (records.length < 2 || records.length % 2 !== 0) return deny('EMPTY_OR_MALFORMED_DIFF');
    if (records.length / 2 > MAX_FILES) return deny('TOO_MANY_FILES');
    let id = null;
    const added = new Set();
    for (let i = 0; i < records.length; i += 2) {
      const status = records[i];
      const file = records[i + 1];
      if (status !== 'A') return deny('NOT_ADDITIONS_ONLY');
      const match = /^works\/([^/]+)\/(.+)$/.exec(file);
      if (!match || !WORK_ID.test(match[1]) || !validRelative(match[2])) return deny('OUTSIDE_NEW_WORK');
      if (id && match[1] !== id) return deny('MULTIPLE_WORKS');
      if (added.has(file)) return deny('DUPLICATE_DIFF_PATH');
      id = match[1];
      added.add(file);
    }
    if (!id) return deny('OUTSIDE_NEW_WORK');
    const selector = 'works/' + id;
    if (treeEntries(root, base, selector).size > 0) return deny('WORK_ALREADY_EXISTS');
    if (!added.has('works/' + id + '/index.html')) return deny('MISSING_ENTRY');
    const files = treeEntries(root, head, selector);
    if (files.size !== added.size) return deny('TREE_DIFF_MISMATCH');
    let bytes = 0;
    for (const file of added) {
      const item = files.get(file);
      if (!item) return deny('MISSING_TREE_ENTRY');
      if (item.mode !== '100644' || item.type !== 'blob') return deny('NON_REGULAR_WORK_FILE');
      const amountText = git(root, ['cat-file', '-s', item.oid]).toString('ascii').trim();
      const amount = Number(amountText);
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_BLOB) return deny('BLOB_TOO_LARGE');
      bytes += amount;
      if (bytes > MAX_TOTAL) return deny('WORK_TOO_LARGE');
    }
    return { eligible: true, reason: 'ISOLATED_ADDITION', workId: id, files: added.size, totalBytes: bytes };
  } catch (_) {
    return deny('GIT_OR_INPUT_ERROR');
  }
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    if (!['--root','--base','--head'].includes(key) || !argv[i + 1] || args[key]) {
      process.stderr.write('Usage: staging-isolation-fastpath --root DIR --base FULL_SHA --head FULL_SHA\n');
      return 2;
    }
    args[key] = argv[i + 1];
  }
  if (!args['--root'] || !args['--base'] || !args['--head']) return 2;
  const result = classify({ root: path.resolve(args['--root']), baseSha: args['--base'], headSha: args['--head'] });
  process.stdout.write(JSON.stringify(result) + '\n');
  return result.eligible ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { classify, validRelative, main };
