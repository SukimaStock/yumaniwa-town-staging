'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { TextDecoder } = require('node:util');
const { escapeHumanText } = require('./change-scope-guard.cjs');

const CONTRACT_SCHEMA = 'yumaniwa-change-os-contract/0.1';
const CONTRACT_PATH = path.join(__dirname, 'change-os-contract.json');
const SELF_PATHS = Object.freeze([
  'tools/change-os-contract.cjs',
  'tools/change-os-contract.json',
]);
const UTF8 = new TextDecoder('utf-8', { fatal: true });
const SHA_RE = /^[0-9a-f]{40}$/;

function runGit(root, args) {
  const r = spawnSync('git', ['-C', root, ...args], {
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error('git command failed');
  return r.stdout || Buffer.alloc(0);
}

function requireSha(value, label) {
  if (typeof value !== 'string' || !SHA_RE.test(value)) {
    throw new Error(label + ' must be a full lowercase Git SHA-1');
  }
  return value;
}

function decodeUtf8(buffer, label) {
  try {
    return UTF8.decode(buffer);
  } catch {
    throw new Error(label + ' is not valid UTF-8');
  }
}

function readContract() {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  } catch {
    throw new Error('Change OS contract JSON parse failed');
  }
  if (!parsed || parsed.schema !== CONTRACT_SCHEMA) throw new Error('Change OS contract schema mismatch');
  if (typeof parsed.version !== 'string' || !parsed.version.trim()) throw new Error('Change OS contract version is required');
  if (parsed.policy !== 'frozen-preapproved-git-blobs') throw new Error('Change OS contract policy mismatch');
  if (!parsed.protectedFiles || typeof parsed.protectedFiles !== 'object' || Array.isArray(parsed.protectedFiles)) {
    throw new Error('Change OS contract protectedFiles must be an object');
  }

  for (const [filePath, rule] of Object.entries(parsed.protectedFiles)) {
    if (typeof filePath !== 'string' || !filePath || filePath.includes('\0')) {
      throw new Error('Change OS contract contains invalid protected path');
    }
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
      throw new Error('Change OS contract rule must be an object');
    }
    if (!['required', 'sticky-optional'].includes(rule.presence)) {
      throw new Error('Change OS contract contains invalid presence policy');
    }
    if (!Array.isArray(rule.allowedBlobs) || rule.allowedBlobs.length === 0) {
      throw new Error('Change OS contract allowedBlobs must be nonempty');
    }
    const normalized = rule.allowedBlobs.map(blob => requireSha(blob, 'allowed blob'));
    if (new Set(normalized).size !== normalized.length) {
      throw new Error('Change OS contract contains duplicate allowed blob');
    }
  }
  return parsed;
}

function collectTree(root, commitSha) {
  const sha = requireSha(commitSha, 'commit SHA');
  const resolved = decodeUtf8(runGit(root, ['rev-parse', '--verify', sha + '^{commit}']), 'resolved commit').trim();
  if (resolved !== sha) throw new Error('resolved commit differs from requested exact SHA');

  const out = runGit(root, ['ls-tree', '-r', '-z', '--full-tree', sha]);
  const tree = new Map();
  let start = 0;
  for (let i = 0; i <= out.length; i += 1) {
    if (i !== out.length && out[i] !== 0) continue;
    if (i === start) {
      start = i + 1;
      continue;
    }
    const record = out.subarray(start, i);
    start = i + 1;
    const tab = record.indexOf(9);
    if (tab < 0) throw new Error('git ls-tree returned malformed record');
    const meta = record.subarray(0, tab).toString('ascii');
    const match = /^(\d+) ([a-z]+) ([0-9a-f]{40})$/.exec(meta);
    if (!match) throw new Error('git ls-tree returned malformed metadata');
    const filePath = decodeUtf8(record.subarray(tab + 1), 'Git path');
    if (tree.has(filePath)) throw new Error('duplicate Git path');
    tree.set(filePath, { mode: match[1], type: match[2], oid: match[3] });
  }
  return tree;
}

function regularBlob(entry) {
  return Boolean(entry && entry.mode === '100644' && entry.type === 'blob' && SHA_RE.test(entry.oid));
}

function evaluateProtectedEntry(filePath, rule, baseEntry, targetEntry) {
  if (rule.presence === 'required' && !targetEntry) {
    return { status: 'FAIL', reason: 'REQUIRED_PATH_MISSING', path: filePath };
  }
  if (rule.presence === 'sticky-optional' && baseEntry && !targetEntry) {
    return { status: 'FAIL', reason: 'STICKY_PATH_DELETED', path: filePath, baseBlob: baseEntry.oid || null };
  }
  if (!targetEntry) {
    return { status: 'N/A', reason: 'OPTIONAL_PATH_ABSENT', path: filePath, baseBlob: baseEntry ? baseEntry.oid : null };
  }
  if (!regularBlob(targetEntry)) {
    return {
      status: 'FAIL',
      reason: 'TARGET_NOT_REGULAR_NONEXECUTABLE_BLOB',
      path: filePath,
      targetMode: targetEntry.mode || null,
      targetType: targetEntry.type || null,
    };
  }
  if (baseEntry && !regularBlob(baseEntry)) {
    return {
      status: 'FAIL',
      reason: 'BASE_NOT_REGULAR_NONEXECUTABLE_BLOB',
      path: filePath,
      baseMode: baseEntry.mode || null,
      baseType: baseEntry.type || null,
    };
  }
  if (baseEntry && !rule.allowedBlobs.includes(baseEntry.oid)) {
    return { status: 'FAIL', reason: 'BASE_BLOB_NOT_APPROVED', path: filePath, baseBlob: baseEntry.oid };
  }
  if (!rule.allowedBlobs.includes(targetEntry.oid)) {
    return {
      status: 'FAIL',
      reason: 'TARGET_BLOB_NOT_PREAPPROVED',
      path: filePath,
      baseBlob: baseEntry ? baseEntry.oid : null,
      targetBlob: targetEntry.oid,
    };
  }
  return {
    status: 'PASS',
    reason: baseEntry && baseEntry.oid === targetEntry.oid ? 'UNCHANGED_APPROVED_BLOB' : 'PREAPPROVED_TARGET_BLOB',
    path: filePath,
    baseBlob: baseEntry ? baseEntry.oid : null,
    targetBlob: targetEntry.oid,
  };
}

function evaluateSelfPath(filePath, baseEntry, targetEntry) {
  if (!regularBlob(baseEntry)) {
    return { status: 'FAIL', reason: 'SELF_BASE_INVALID', path: filePath };
  }
  if (!regularBlob(targetEntry)) {
    return { status: 'FAIL', reason: 'SELF_TARGET_INVALID', path: filePath };
  }
  if (baseEntry.oid !== targetEntry.oid) {
    return {
      status: 'FAIL',
      reason: 'SELF_MODIFICATION_FORBIDDEN',
      path: filePath,
      baseBlob: baseEntry.oid,
      targetBlob: targetEntry.oid,
    };
  }
  return {
    status: 'PASS',
    reason: 'SELF_BLOB_MATCHES_BASE',
    path: filePath,
    baseBlob: baseEntry.oid,
    targetBlob: targetEntry.oid,
  };
}

function evaluateChangeOsContract(options) {
  const root = path.resolve(options.root || process.cwd());
  const baseSha = requireSha(options.baseSha, 'base SHA');
  const targetSha = requireSha(options.targetSha, 'target SHA');
  const contract = readContract();
  const baseTree = collectTree(root, baseSha);
  const targetTree = collectTree(root, targetSha);
  const files = [];

  for (const selfPath of SELF_PATHS) {
    files.push(evaluateSelfPath(selfPath, baseTree.get(selfPath), targetTree.get(selfPath)));
  }
  for (const [filePath, rule] of Object.entries(contract.protectedFiles).sort(([a], [b]) => a.localeCompare(b))) {
    files.push(evaluateProtectedEntry(filePath, rule, baseTree.get(filePath), targetTree.get(filePath)));
  }

  const ok = files.every(item => item.status !== 'FAIL');
  return {
    schema: 'yumaniwa-change-os-contract-report/0.1',
    contractSchema: contract.schema,
    contractVersion: contract.version,
    contractPolicy: contract.policy,
    baseSha,
    targetSha,
    files,
    ok,
    exitCode: ok ? 0 : 1,
  };
}

function parseArgs(argv) {
  const options = { root: process.cwd(), baseSha: null, targetSha: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (['--root', '--base', '--head'].includes(arg)) {
      const value = argv[++i];
      if (!value) throw new Error(arg + ' requires a value');
      if (arg === '--root') options.root = value;
      if (arg === '--base') options.baseSha = value;
      if (arg === '--head') options.targetSha = value;
    } else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error('unknown argument');
  }
  return options;
}

function usage() {
  return [
    'Usage:',
    '  node tools/change-os-contract.cjs --root <candidate-repo> --base <sha> --head <sha> [--json]',
    '',
    'Checks literal Git path mode/type/blob identity against the frozen base-owned Change OS contract.',
    'Candidate source is never executed or interpreted as code.',
  ].join('\n');
}

function formatHuman(report) {
  const lines = [
    'YUMANIWA CHANGE OS CONTRACT v0.1',
    'Base:   ' + report.baseSha,
    'Target: ' + report.targetSha,
    'Contract: ' + escapeHumanText(report.contractVersion),
    '',
  ];
  for (const item of report.files) {
    lines.push(item.status + ' ' + escapeHumanText(item.path) + ' — ' + item.reason);
  }
  lines.push('');
  lines.push('Change OS contract: ' + (report.ok ? 'PASS' : 'STOP'));
  return lines.join('\n');
}

function runCli(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(usage() + '\n');
      return 0;
    }
    const report = evaluateChangeOsContract({
      root: options.root,
      baseSha: options.baseSha,
      targetSha: options.targetSha,
    });
    process.stdout.write((options.json ? JSON.stringify(report, null, 2) : formatHuman(report)) + '\n');
    return report.exitCode;
  } catch (error) {
    process.stderr.write('Change OS Contract error: ' + escapeHumanText(error.message) + '\n');
    if (!options || options.help !== true) process.stderr.write(usage() + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  CONTRACT_SCHEMA,
  SELF_PATHS,
  readContract,
  collectTree,
  regularBlob,
  evaluateProtectedEntry,
  evaluateSelfPath,
  evaluateChangeOsContract,
  formatHuman,
  runCli,
};
