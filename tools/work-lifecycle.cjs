'use strict';
// Read-only lifecycle / promotion gates. User-decision references are review
// evidence, not credentials or a substitute for repository access controls.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const FILE = 'data/work-lifecycle.json';
const SCHEMA = 'sukimastock-work-lifecycle/1';
const STATES = ['active', 'frozen', 'candidate', 'released'];
const ID = /^[a-z0-9][a-z0-9-]*$/;
const HEADINGS = ['What we explored', 'Initial hypothesis', 'What we tried',
  'What we learned', 'Why we stopped', 'What still feels interesting',
  'Related prototypes', 'Playable staging URL'];
const nonempty = value => typeof value === 'string' && !!value.trim();

function validateRegistry(registry) {
  if (!registry || registry.schema !== SCHEMA ||
      registry.defaults?.status !== 'active' || registry.defaults?.environment !== 'staging' ||
      !Array.isArray(registry.works)) throw new Error('invalid lifecycle schema/defaults');
  const ids = new Set(), paths = new Set();
  for (const work of registry.works) {
    if (!work || !ID.test(work.id || '') || ids.has(work.id) ||
        !/^works\/(?:_[a-z0-9-]+|[a-z0-9][a-z0-9-]*)$/.test(work.path || '') ||
        paths.has(work.path) || !STATES.includes(work.status) || !nonempty(work.title)) {
      throw new Error('invalid or duplicate lifecycle work: ' + (work?.id || '?'));
    }
    ids.add(work.id); paths.add(work.path);
    if (work.status === 'frozen' && (work.archive !== work.path + '/ARCHIVE.md' ||
        !nonempty(work.theme) || !nonempty(work.freezeDecision))) throw new Error(work.id + ': frozen requires archive/theme/freezeDecision');
    if (work.status === 'candidate' && !nonempty(work.candidateDecision)) throw new Error(work.id + ': candidate requires explicit candidateDecision');
    if (work.status === 'released' && !nonempty(work.releaseEvidence)) throw new Error(work.id + ': released requires releaseEvidence');
  }
  return registry;
}

function readRegistry(root, { allowMissing = false } = {}) {
  const file = path.join(root, FILE);
  if (allowMissing && !fs.existsSync(file)) return { schema: SCHEMA, defaults: { status: 'active', environment: 'staging' }, works: [] };
  return validateRegistry(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function statusFor(registry, id) {
  return registry.works.find(work => work.id === id)?.status || 'active';
}

function assertPromotion(registry, ids, instruction) {
  if (!Array.isArray(ids) || !ids.length || ids.some(id => !ID.test(id)) || new Set(ids).size !== ids.length) throw new Error('promotion requires explicit unique work IDs');
  if (!nonempty(instruction)) throw new Error('production requires a separate explicit user production instruction reference');
  for (const id of ids) {
    if (statusFor(registry, id) !== 'candidate') throw new Error(id + ': only candidate may be promoted (current ' + statusFor(registry, id) + ')');
    if (registry.works.find(work => work.id === id).candidateDecision.trim() === instruction.trim()) throw new Error(id + ': candidate decision cannot be reused as the separate production instruction');
  }
}

function assertPublication(registry, published, promote = [], instruction = '') {
  if (!Array.isArray(published) || !published.length || published.some(id => !ID.test(id)) || new Set(published).size !== published.length) throw new Error('explicit unique publication set required');
  if (promote.length) assertPromotion(registry, promote, instruction);
  for (const id of promote) if (!published.includes(id)) throw new Error(id + ': promoted ID must be in publication set');
  for (const id of published) {
    const status = statusFor(registry, id);
    if (status === 'released') continue; // retained existing release; never a new promotion
    if (status !== 'candidate' || !promote.includes(id)) throw new Error(id + ': publication requires candidate, --promote and separate production instruction; current ' + status);
  }
}

function assertProductionSnapshot(root, registry, published) {
  if (fs.existsSync(path.join(root, 'lab'))) throw new Error('LAB is staging-only; exclude it from production snapshot');
  const directory = path.join(root, 'works');
  if (!fs.existsSync(directory)) return; // metadata-only fixtures; launch checks validate actual entries
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const workPath = 'works/' + entry.name;
    if (entry.name === '_template') continue; // existing shared player template, not a release
    const work = registry.works.find(item => item.path === workPath);
    if (!work || !published.includes(work.id) || !['candidate', 'released'].includes(work.status)) throw new Error(workPath + ': staging-only or unselected work directory in production snapshot');
    if (fs.existsSync(path.join(root, workPath, 'ARCHIVE.md'))) throw new Error(workPath + ': exclude exploration ARCHIVE.md from production snapshot');
  }
}

function git(root, args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }); }
function checkDiff(root, base) {
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('--base must be an exact commit SHA');
  const entry = git(root, ['ls-tree', base, '--', FILE]);
  if (!entry.trim()) return; // one-time bootstrap; base has no lifecycle registry
  const previous = validateRegistry(JSON.parse(git(root, ['show', base + ':' + FILE])));
  const current = readRegistry(root);
  // --no-renames ensures moves/deletions cannot conceal frozen paths.
  const changed = git(root, ['diff', '--no-renames', '--name-only', '-z', base, 'HEAD']).split('\0').filter(Boolean);
  for (const before of previous.works) {
    const after = current.works.find(work => work.id === before.id);
    if (!after || after.path !== before.path) throw new Error(before.id + ': preserve registered identity/path');
    const resumed = before.status === 'frozen' && after.status === 'active' && nonempty(after.resumeDecision) && after.resumeDecision !== before.resumeDecision;
    if (before.status === 'frozen' && !resumed) {
      if (after.status !== 'frozen') throw new Error(before.id + ': frozen can only resume to active with new explicit resumeDecision');
      if (changed.some(file => file.startsWith(before.path + '/') && file !== before.archive)) throw new Error(before.id + ': frozen runtime/artifacts must not change');
    }
    if (before.status !== after.status) {
      const transition = before.status + '->' + after.status;
      if (!['active->frozen', 'active->candidate', 'candidate->released', 'frozen->active'].includes(transition)) throw new Error(before.id + ': invalid transition ' + transition);
      if (after.status === 'candidate' && (!nonempty(after.candidateDecision) || after.candidateDecision === before.candidateDecision)) throw new Error(before.id + ': new explicit candidateDecision required');
      if (after.status === 'released' && (!nonempty(after.productionInstruction) || after.productionInstruction === before.productionInstruction || after.productionInstruction === before.candidateDecision || !nonempty(after.releaseEvidence))) throw new Error(before.id + ': separate productionInstruction and releaseEvidence required');
    }
  }
  for (const work of current.works) {
    if (!previous.works.some(old => old.id === work.id) && !['active', 'frozen', 'candidate'].includes(work.status)) throw new Error(work.id + ': new works cannot start released');
  }
}

const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function archiveSections(root, work) {
  const source = fs.readFileSync(path.join(root, work.archive), 'utf8');
  return HEADINGS.map(heading => {
    const content = source.split('## ' + heading + '\n')[1]?.split('\n## ')[0]?.trim();
    if (!content) throw new Error(work.id + ': missing archive section ' + heading);
    return { heading, content };
  });
}
function renderLab(root, registry) {
  const frozen = registry.works.filter(work => work.status === 'frozen');
  const cards = frozen.map(work => {
    if (!fs.existsSync(path.join(root, work.path, 'index.html'))) throw new Error(work.id + ': frozen playable entry missing');
    const sections = archiveSections(root, work);
    const related = frozen.filter(other => other.family && other.family === work.family && other.id !== work.id);
    return `<article id="${work.id}">
  <p class="state">${esc(work.family || 'EXPERIMENT')} · frozen</p>
  <h2>${esc(work.title)}</h2><p>${esc(work.theme)}</p>
  <p class="actions"><a href="../${work.path}/">試作に触れる</a><a href="../${work.archive}">ARCHIVE.md</a></p>
  <details><summary>探索の記録</summary>${sections.filter(s => !['Related prototypes', 'Playable staging URL'].includes(s.heading)).map(s => `<h3>${s.heading}</h3><p>${esc(s.content)}</p>`).join('')}
  <h3>Related prototypes</h3><ul>${related.map(other => `<li><a href="#${other.id}">${esc(other.title)}</a></li>`).join('')}</ul>
  <h3>Playable staging URL</h3><p><a href="../${work.path}/">${esc('https://sukimastock.github.io/yumaniwa-town-staging/' + work.path + '/')}</a></p></details>
</article>`;
  }).join('\n');
  return `<!doctype html>
<!-- Generated by tools/work-lifecycle.cjs --write-lab. Sources: data/work-lifecycle.json and each ARCHIVE.md. -->
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>LAB — SukimaStock</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#161714;color:#ede9df;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif;line-height:1.8}main{max-width:780px;margin:auto;padding:32px 20px 60px}a{color:#d8c390;overflow-wrap:anywhere}a:focus-visible,summary:focus-visible{outline:2px solid #d8c390;outline-offset:4px}nav a,.actions a{display:inline-block;padding:10px 8px;min-height:44px}h1{letter-spacing:.15em;margin-bottom:8px}h2{font-size:1.25rem;margin:8px 0}h3{font-size:1rem;margin-bottom:4px}.intro,.state{color:#b8b5aa}.state{font-size:.8rem;letter-spacing:.04em}article{border-top:1px solid #49483d;padding:24px 0}p{margin:8px 0}summary{cursor:pointer;min-height:44px;padding:8px 0}details p{white-space:pre-line}details{padding-bottom:8px}</style></head>
<body><main><nav><a href="../?dev=1">← 湯間庭町へ</a></nav><h1>LAB</h1><p class="intro">完成しなかった実験も、触って振り返れる場所。</p><p class="intro">探索はここでひと休み。作ったものと、今も残る核を置いておきます。</p>
${cards || '<p>探索記録はまだありません。</p>'}
</main></body></html>
`;
}

function listWorks(root, registry) {
  const works = [...registry.works];
  for (const name of fs.readdirSync(path.join(root, 'works'), { withFileTypes: true })) {
    const workPath = 'works/' + name.name;
    if (name.isDirectory() && ID.test(name.name) && !works.some(work => work.path === workPath)) works.push({ id: name.name, path: workPath, title: name.name, status: 'active', environment: 'staging', implicitDefault: true });
  }
  return works;
}
function run(argv = process.argv.slice(2)) {
  let base = '', ids = [], instruction = '', mode = 'check';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--base') base = argv[++i];
    else if (arg === '--ids') ids = String(argv[++i] || '').split(',');
    else if (arg === '--production-instruction') instruction = argv[++i];
    else if (['--check', '--write-lab', '--list', '--promotion-check'].includes(arg)) mode = arg.slice(2);
    else throw new Error('unknown lifecycle option: ' + arg);
  }
  const root = process.cwd(), registry = readRegistry(root);
  if (mode === 'promotion-check') { assertPromotion(registry, ids, instruction); console.log('Promotion eligibility PASS; read-only, no production write authorized by tool.'); return; }
  if (mode === 'list') { console.log(JSON.stringify(listWorks(root, registry), null, 2)); return; }
  const expected = renderLab(root, registry), file = path.join(root, 'lab/index.html');
  if (mode === 'write-lab') { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, expected); }
  else if (fs.readFileSync(file, 'utf8') !== expected) throw new Error('LAB out of date; run --write-lab');
  if (base) checkDiff(root, base);
  console.log('Lifecycle / frozen archives / LAB PASS; default active, staging-only.');
}
if (require.main === module) { try { run(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { FILE, SCHEMA, HEADINGS, validateRegistry, readRegistry, statusFor, assertPromotion, assertPublication, assertProductionSnapshot, checkDiff, renderLab, listWorks, run };
