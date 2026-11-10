// Research-only source-copy instrumentation. Never imported by the application.
import fs from 'node:fs';
import path from 'node:path';

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw Error(`Instrumentation anchor is not unique: ${before}`);
  return source.replace(before, after);
}
function wrap(source, name, label, dynamic = false) {
  const declaration = new RegExp(`(^|\\n)(export )?function ${name}\\(`);
  const match = source.match(declaration);
  if (!match) throw Error(`Missing instrumented function: ${name}`);
  const original = `__stage7_original_${name}`;
  source = replaceOnce(source, `${match[2] ?? ''}function ${name}(`, `function ${original}(`);
  const key = dynamic ? `${JSON.stringify(label)} + String(args[1]?.key)` : JSON.stringify(label);
  return source + `\n${match[2] ?? ''}function ${name}(...args) { return globalThis.__amberStage7Measure(${key}, () => ${original}(...args)); }\n`;
}
export function instrumentCopy(root, destination) {
  // Preserve relative imports and query strings. Only executable/data source is
  // needed; images, sound, screenshots and git objects are not copied.
  fs.cpSync(path.join(root, 'works'), path.join(destination, 'works'), {
    recursive: true,
    filter: p => fs.statSync(p).isDirectory() || /\.(mjs|js|json)$/.test(p),
  });
  const touched = [];
  function edit(relative, transform) {
    const filename = path.join(destination, relative);
    fs.writeFileSync(filename, transform(fs.readFileSync(filename, 'utf8')));
    touched.push(relative);
  }
  const base = 'works/ambertime/';
  edit(base + 'partner-orders.mjs', source => {
    for (const name of ['restoreDistillery', 'validateDistillery', 'serializeDistillery', 'progress', 'syncTown', 'manualReplayContext', 'createProjectionReplay']) source = wrap(source, name, `model.${name}`);
    source = wrap(source, 'apply', 'replay.opcode.', true);
    source = replaceOnce(source,
      'const matchingPrefix=(cached,s,originText)=>cached&&cached.originText===originText&&cached.seed===s.seed&&s.operations.length>=cached.length&&JSON.stringify(s.operations.slice(0,cached.length))===cached.operations;',
      'const matchingPrefix=(cached,s,originText)=>globalThis.__amberStage7Measure("model.matchingPrefix",()=>cached&&cached.originText===originText&&cached.seed===s.seed&&s.operations.length>=cached.length&&JSON.stringify(s.operations.slice(0,cached.length))===cached.operations);');
    source = replaceOnce(source, 'M.restore(M.serialize(s.core));', 'globalThis.__amberStage7Measure("model.coreValidation",()=>M.restore(M.serialize(s.core)));');
    source = replaceOnce(source, 'try{s=JSON.parse(text);}catch', 'try{s=globalThis.__amberStage7Measure("model.restoreJsonParse",()=>JSON.parse(text));}catch');
    source = replaceOnce(source, 'assert(JSON.stringify(s)===JSON.stringify(j),', 'assert(globalThis.__amberStage7Measure("model.fullStateEquality",()=>JSON.stringify(s)===JSON.stringify(j)),');
    return source;
  });
  edit(base + 'economy.mjs', source => {
    for (const name of ['distillStep', 'economicMonthly']) source = wrap(source, name, `economy.${name}`);
    return source;
  });
  edit(base + 'experiments/town-simulation/v01/model.mjs', source => {
    for (const name of ['advanceExternal', 'registerExternalRelease', 'receiveExternal', 'quantizeReaction']) source = wrap(source, name, `town.${name}`);
    return source;
  });
  edit(base + 'save-codec.mjs', source => {
    for (const name of ['compactFormalGame', 'expandFormalGame']) source = wrap(source, name, `codec.${name}`);
    return source;
  });
  edit(base + 'development-save.mjs', source => {
    source = replaceOnce(source, 'try{session=JSON.parse(text);}catch', 'try{session=globalThis.__amberStage7Measure("session.jsonParse",()=>JSON.parse(text));}catch');
    for (const name of ['readSession', 'serializeSession']) source = wrap(source, name, `session.${name}`);
    return source;
  });
  for (const [file, name] of [['cask-slots.mjs','assertCaskSlots'], ['recent-ledger.mjs','assertRecentLedger'], ['history-record.mjs','assertHistoryRecord'], ['recall/collector.mjs','assertRecall']]) {
    edit(base + file, source => wrap(source, name, `metadata.${name}`));
  }
  return touched;
}

export function installTimers() {
  const counters = new Map();
  const stack = [];
  function measure(label, action) {
    const frame = {start: performance.now(), children: 0};
    stack.push(frame);
    try { return action(); }
    finally {
      const milliseconds = performance.now() - frame.start;
      stack.pop();
      if (stack.length) stack.at(-1).children += milliseconds;
      const row = counters.get(label) ?? {calls: 0, inclusiveMilliseconds: 0, exclusiveMilliseconds: 0};
      row.calls++;
      row.inclusiveMilliseconds += milliseconds;
      row.exclusiveMilliseconds += milliseconds - frame.children;
      counters.set(label, row);
    }
  }
  globalThis.__amberStage7Measure = measure;
  const originalClone = globalThis.structuredClone;
  globalThis.structuredClone = (...args) => measure('global.structuredClone', () => originalClone(...args));
  return {
    reset() { if (stack.length) throw Error('Cannot reset active timers'); counters.clear(); },
    snapshot() { return Object.fromEntries([...counters].map(([key, value]) => [key, {...value}])); },
    dispose() { globalThis.structuredClone = originalClone; delete globalThis.__amberStage7Measure; },
  };
}
