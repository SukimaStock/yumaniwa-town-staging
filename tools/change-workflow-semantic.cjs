'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { escapeHumanText } = require('./change-scope-guard.cjs');

const REPORT_SCHEMA = 'yumaniwa-workflow-semantic-report/0.1';
const SIMPLE_KEY = /^[A-Za-z0-9_.-]+$/;

function fail(message, lineNumber = null) {
  const error = new Error(lineNumber === null ? message : message + ' at line ' + lineNumber);
  error.code = 'UNSUPPORTED_WORKFLOW_YAML';
  throw error;
}

function indentOf(line, lineNumber) {
  let count = 0;
  while (count < line.length && line[count] === ' ') count += 1;
  if (line.slice(0, count + 1).includes('\t')) fail('tabs in indentation are not supported', lineNumber);
  if (line[count] === '\t') fail('tabs in indentation are not supported', lineNumber);
  return count;
}

function isIgnorable(line) {
  const trimmed = line.trim();
  return trimmed === '' || trimmed.startsWith('#');
}

function stripInlineComment(value) {
  let single = false;
  let double = false;
  let bracket = 0;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (double) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === '"') double = false;
      continue;
    }
    if (single) {
      if (ch === "'" && value[i + 1] === "'") {
        i += 1;
        continue;
      }
      if (ch === "'") single = false;
      continue;
    }
    if (ch === '"') {
      double = true;
      continue;
    }
    if (ch === "'") {
      single = true;
      continue;
    }
    if (ch === '[') {
      bracket += 1;
      continue;
    }
    if (ch === ']') {
      bracket -= 1;
      if (bracket < 0) throw new Error('unbalanced inline array');
      continue;
    }
    if (ch === '#' && bracket === 0 && (i === 0 || /\s/.test(value[i - 1]))) {
      return value.slice(0, i).trimEnd();
    }
  }
  if (single || double || bracket !== 0) throw new Error('unterminated quoted scalar or inline array');
  return value.trimEnd();
}

function splitKeyValue(text, lineNumber) {
  let single = false;
  let double = false;
  let bracket = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (double) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === '"') double = false;
      continue;
    }
    if (single) {
      if (ch === "'" && text[i + 1] === "'") {
        i += 1;
        continue;
      }
      if (ch === "'") single = false;
      continue;
    }
    if (ch === '"') {
      double = true;
      continue;
    }
    if (ch === "'") {
      single = true;
      continue;
    }
    if (ch === '[') {
      bracket += 1;
      continue;
    }
    if (ch === ']') {
      bracket -= 1;
      if (bracket < 0) fail('unbalanced inline array', lineNumber);
      continue;
    }
    if (ch === ':' && bracket === 0 && (i + 1 === text.length || /\s/.test(text[i + 1]))) {
      const key = text.slice(0, i).trim();
      const value = text.slice(i + 1).trimStart();
      if (!SIMPLE_KEY.test(key)) fail('only simple mapping keys are supported', lineNumber);
      return { key, value };
    }
  }
  fail('expected mapping key and colon', lineNumber);
}

function parseSingleQuoted(value, lineNumber) {
  if (!value.endsWith("'")) fail('unterminated single-quoted scalar', lineNumber);
  return value.slice(1, -1).replace(/''/g, "'");
}

function splitInlineArray(inner, lineNumber) {
  const items = [];
  let current = '';
  let single = false;
  let double = false;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (double) {
      current += ch;
      if (ch === '\\' && i + 1 < inner.length) {
        current += inner[++i];
      } else if (ch === '"') {
        double = false;
      }
      continue;
    }
    if (single) {
      current += ch;
      if (ch === "'" && inner[i + 1] === "'") {
        current += inner[++i];
      } else if (ch === "'") {
        single = false;
      }
      continue;
    }
    if (ch === '"') {
      double = true;
      current += ch;
      continue;
    }
    if (ch === "'") {
      single = true;
      current += ch;
      continue;
    }
    if (ch === '[' || ch === ']' || ch === '{' || ch === '}') {
      fail('nested flow collections are not supported', lineNumber);
    }
    if (ch === ',') {
      if (!current.trim()) fail('empty inline array item', lineNumber);
      items.push(parseScalar(current.trim(), lineNumber));
      current = '';
      continue;
    }
    current += ch;
  }
  if (single || double) fail('unterminated inline array quote', lineNumber);
  if (current.trim()) items.push(parseScalar(current.trim(), lineNumber));
  return items;
}

function parseScalar(rawValue, lineNumber) {
  let value;
  try {
    value = stripInlineComment(rawValue).trim();
  } catch {
    fail('malformed scalar', lineNumber);
  }
  if (value === '') return '';
  if (value.startsWith('&') || value.startsWith('*') || value.startsWith('!')) {
    fail('YAML anchors, aliases, and tags are not supported', lineNumber);
  }
  if (value.startsWith('{') || value.startsWith('}')) {
    fail('flow mappings are not supported', lineNumber);
  }
  if (value.startsWith('>')) fail('folded block scalars are not supported', lineNumber);
  if (value.startsWith('[')) {
    if (!value.endsWith(']')) fail('unterminated inline array', lineNumber);
    return splitInlineArray(value.slice(1, -1), lineNumber);
  }
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      fail('invalid double-quoted scalar', lineNumber);
    }
  }
  if (value.startsWith("'")) return parseSingleQuoted(value, lineNumber);
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (/^-?(?:0|[1-9][0-9]*)$/.test(value)) return Number(value);
  return value;
}

function nextSignificant(lines, index) {
  let i = index;
  while (i < lines.length && isIgnorable(lines[i])) i += 1;
  return i;
}

function parseLiteralBlock(lines, index, parentIndent, style, lineNumber) {
  if (style !== '|' && style !== '|-') fail('only literal | and |- block scalars are supported', lineNumber);
  let i = index;
  let blockIndent = null;
  const body = [];
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      body.push('');
      i += 1;
      continue;
    }
    const indent = indentOf(line, i + 1);
    if (indent <= parentIndent) break;
    if (blockIndent === null) blockIndent = indent;
    if (indent < blockIndent) fail('inconsistent literal block indentation', i + 1);
    body.push(line.slice(blockIndent));
    i += 1;
  }
  if (blockIndent === null) return { value: '', next: i };
  while (body.length && body[body.length - 1] === '') body.pop();
  const joined = body.join('\n');
  return { value: style === '|' ? joined + '\n' : joined, next: i };
}

function parseMapping(lines, index, indent) {
  const out = {};
  let i = index;
  while (true) {
    i = nextSignificant(lines, i);
    if (i >= lines.length) break;
    const line = lines[i];
    const currentIndent = indentOf(line, i + 1);
    if (currentIndent < indent) break;
    if (currentIndent > indent) fail('unexpected mapping indentation', i + 1);
    const text = line.slice(indent);
    if (text.startsWith('-')) break;

    const pair = splitKeyValue(text, i + 1);
    if (Object.hasOwn(out, pair.key)) fail('duplicate mapping key', i + 1);

    const uncommented = stripInlineComment(pair.value).trim();
    if (uncommented === '|' || uncommented === '|-') {
      const block = parseLiteralBlock(lines, i + 1, indent, uncommented, i + 1);
      out[pair.key] = block.value;
      i = block.next;
      continue;
    }
    if (uncommented === '') {
      const next = nextSignificant(lines, i + 1);
      if (next >= lines.length) {
        out[pair.key] = null;
        i += 1;
        continue;
      }
      const nextIndent = indentOf(lines[next], next + 1);
      if (nextIndent <= indent) {
        out[pair.key] = null;
        i += 1;
        continue;
      }
      const nested = parseBlock(lines, next, nextIndent);
      out[pair.key] = nested.value;
      i = nested.next;
      continue;
    }
    out[pair.key] = parseScalar(pair.value, i + 1);
    i += 1;
  }
  return { value: out, next: i };
}

function parseSequence(lines, index, indent) {
  const out = [];
  let i = index;
  while (true) {
    i = nextSignificant(lines, i);
    if (i >= lines.length) break;
    const line = lines[i];
    const currentIndent = indentOf(line, i + 1);
    if (currentIndent < indent) break;
    if (currentIndent > indent) fail('unexpected sequence indentation', i + 1);
    const text = line.slice(indent);
    if (!(text === '-' || text.startsWith('- '))) break;

    const rest = text === '-' ? '' : text.slice(2);
    if (!rest.trim()) {
      const next = nextSignificant(lines, i + 1);
      if (next >= lines.length || indentOf(lines[next], next + 1) <= indent) {
        fail('empty sequence item must contain a nested block', i + 1);
      }
      const nestedIndent = indentOf(lines[next], next + 1);
      const nested = parseBlock(lines, next, nestedIndent);
      out.push(nested.value);
      i = nested.next;
      continue;
    }

    let pair = null;
    try {
      pair = splitKeyValue(rest, i + 1);
    } catch {
      pair = null;
    }

    if (!pair) {
      out.push(parseScalar(rest, i + 1));
      i += 1;
      continue;
    }

    const item = {};
    if (Object.hasOwn(item, pair.key)) fail('duplicate sequence mapping key', i + 1);
    const firstValue = stripInlineComment(pair.value).trim();
    if (firstValue === '' || firstValue === '|' || firstValue === '|-') {
      fail('sequence mapping first field must be a scalar in the trusted subset', i + 1);
    }
    item[pair.key] = parseScalar(pair.value, i + 1);
    i += 1;

    const next = nextSignificant(lines, i);
    if (next < lines.length) {
      const nextIndent = indentOf(lines[next], next + 1);
      if (nextIndent > indent) {
        const extra = parseMapping(lines, next, nextIndent);
        for (const [key, value] of Object.entries(extra.value)) {
          if (Object.hasOwn(item, key)) fail('duplicate sequence mapping key', next + 1);
          item[key] = value;
        }
        i = extra.next;
      }
    }
    out.push(item);
  }
  return { value: out, next: i };
}

function parseBlock(lines, index, indent) {
  const first = nextSignificant(lines, index);
  if (first >= lines.length) return { value: {}, next: first };
  const actualIndent = indentOf(lines[first], first + 1);
  if (actualIndent !== indent) fail('unexpected block indentation', first + 1);
  const text = lines[first].slice(indent);
  return text === '-' || text.startsWith('- ')
    ? parseSequence(lines, first, indent)
    : parseMapping(lines, first, indent);
}

function parseWorkflowYaml(source) {
  if (typeof source !== 'string') throw new Error('workflow source must be a string');
  let normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (normalized.includes('\0')) throw new Error('workflow source contains NUL');
  const lines = normalized.split('\n');
  const first = nextSignificant(lines, 0);
  if (first >= lines.length) throw new Error('workflow source is empty');
  const firstIndent = indentOf(lines[first], first + 1);
  if (firstIndent !== 0) fail('top-level workflow mapping must start at column 1', first + 1);
  const parsed = parseMapping(lines, first, 0);
  const trailing = nextSignificant(lines, parsed.next);
  if (trailing < lines.length) fail('unexpected trailing workflow content', trailing + 1);
  return parsed.value;
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = sortDeep(value[key]);
  return out;
}

function canonicalWorkflowJson(source) {
  return JSON.stringify(sortDeep(parseWorkflowYaml(source)));
}

function workflowSemanticDigest(source) {
  return crypto.createHash('sha256').update(canonicalWorkflowJson(source), 'utf8').digest('hex');
}

function verifyWorkflowSemanticDigest(source, expectedDigest) {
  if (typeof expectedDigest !== 'string' || !/^[0-9a-f]{64}$/i.test(expectedDigest)) {
    throw new Error('expected digest must be sha256 hex');
  }
  const actualDigest = workflowSemanticDigest(source);
  return {
    schema: REPORT_SCHEMA,
    expectedDigest: expectedDigest.toLowerCase(),
    actualDigest,
    ok: actualDigest === expectedDigest.toLowerCase(),
  };
}

function parseArgs(argv) {
  const options = { file: null, expected: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--file' || arg === '--expected') {
      const value = argv[++i];
      if (!value) throw new Error(arg + ' requires a value');
      options[arg.slice(2)] = value;
    } else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error('unknown argument');
  }
  return options;
}

function usage() {
  return [
    'Usage:',
    '  node tools/change-workflow-semantic.cjs --file <workflow.yml> [--expected <sha256>] [--json]',
    '',
    'Parses the trusted GitHub-workflow YAML subset, canonicalizes semantic structure,',
    'and optionally verifies an expected semantic SHA-256 digest.',
  ].join('\n');
}

function runCli(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(usage() + '\n');
      return 0;
    }
    if (!options.file) throw new Error('--file is required');
    const source = fs.readFileSync(path.resolve(options.file), 'utf8');
    if (!options.expected) {
      const digest = workflowSemanticDigest(source);
      process.stdout.write((options.json
        ? JSON.stringify({ schema: REPORT_SCHEMA, actualDigest: digest }, null, 2)
        : digest) + '\n');
      return 0;
    }
    const report = verifyWorkflowSemanticDigest(source, options.expected);
    process.stdout.write((options.json ? JSON.stringify(report, null, 2) : (report.ok ? 'PASS ' : 'FAIL ') + report.actualDigest) + '\n');
    return report.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write('Workflow Semantic error: ' + escapeHumanText(error.message) + '\n');
    if (!options || options.help !== true) process.stderr.write(usage() + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  REPORT_SCHEMA,
  parseWorkflowYaml,
  canonicalWorkflowJson,
  workflowSemanticDigest,
  verifyWorkflowSemanticDigest,
  sortDeep,
  runCli,
};
