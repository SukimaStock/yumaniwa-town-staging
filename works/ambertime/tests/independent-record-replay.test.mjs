import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,readdirSync,symlinkSync,linkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as D from '../partner-orders.mjs';
import {readSession,serializeSession} from '../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
import {createReference,filledReference,cadencePair,options} from '../design/independent-record-replay/reference.mjs';
import {allowedInput,replay,assess} from '../design/independent-record-replay/replay.mjs';
const pair=cadencePair(),clone=x=>structuredClone(x),hash=s=>createHash('sha256').update(s).digest('hex');
const allEqual=wire=>{const r=assess(wire);for(const [key,x] of Object.entries(r.comparison))assert.equal(x.equal,true,key+': '+JSON.stringify(x.firstDifference));return r;};
const raw=()=>JSON.parse(pair.per.wire);
function rejectWire(edit){const x=raw();edit(x);assert.throws(()=>readSession(JSON.stringify(x),options));}
test('actual current initializer, nonempty records, and exact independent game/records',()=>{
 const r=allEqual(pair.per.wire);assert.deepEqual(r.input.operations.slice(0,D.newShopDialogueDistillery(141).operations.length),D.newShopDialogueDistillery(141).operations);
 assert.ok(r.session.historyRecord.events.length>=3);assert.ok(Object.keys(r.session.recallRecord.facts).length>0);assert.equal(r.session.recallRecord.completed.length,0);
 assert.deepEqual(Object.keys(r.input),['sessionVersion','modelVersion','initializer','collectorVersions','seed','origin','operations','auxiliary']);
});
test('same allowed inputs and formal game, two accepted v8 histories due save cadence',()=>{
 const a=assess(pair.per.wire),b=assess(pair.batch.wire);
 assert.deepEqual(a.input,b.input);assert.equal(JSON.stringify(a.session.game),JSON.stringify(b.session.game));
 assert.equal(a.comparison.historyRecord.equal,true);assert.equal(b.comparison.historyRecord.equal,false);
 assert.equal(b.comparison.historyRecord.firstDifference.path,'historyRecord.events.2.operationIndex');
 assert.deepEqual([a.session.historyRecord.events[2].operationIndex,b.session.historyRecord.events[2].operationIndex],[33,34]);
 for(const k of ['game','recentLedger','recallRecord'])assert.equal(b.comparison[k].equal,true);
 // The different history is not rewritten and is not classified as corrupt.
 assert.equal(serializeSession(b.session.game,b.session,options),pair.batch.wire);
});
test('repeated candidate creation without operation is byte-stable',()=>{
 const app=createReference({wire:pair.per.wire});for(let i=0;i<3;i++)assert.equal(app.save(),pair.per.wire);allEqual(app.wire);
});
test('save, formal reload, then public continuation preserves independent records',()=>{
 const direct=createReference({wire:pair.per.wire}),reloaded=createReference({wire:pair.per.wire});reloaded.reload();
 const id=direct.game.core.products[0].id;for(const a of [direct,reloaded]){a.apply('listBottles',[id]);a.apply('tickDistillery');}
 assert.equal(direct.wire,reloaded.wire);allEqual(reloaded.wire);
});
test('partial extraction is explicit constrained input, no appended operation',()=>{
 const app=createReference();app.apply('startRangeDistillation');const n=app.game.operations.length;
 for(let i=0;i<7;i++)app.apply('distillStep',[],{save:false});app.save();assert.equal(app.game.operations.length,n);
 const r=allEqual(app.wire);assert.equal(r.input.auxiliary.progress,7);
 const noProgress=clone(r.input);noProgress.auxiliary.progress=null;assert.throws(()=>replay(noProgress));
});
test('recorded tasting and endTasting are valid auxiliary boundary states',()=>{
 const app=createReference({wire:pair.filled.wire}),id=app.game.core.casks[0].id;app.apply('sampleDistillery',[id]);allEqual(app.wire);
 const n=app.game.operations.length;app.apply('endTasting');assert.equal(app.game.operations.length,n);allEqual(app.wire);
});
test('valid pause, clock and cask layout differences are not economic replay corruption',()=>{
 const s=readSession(pair.filled.wire,options),slots=[null,s.caskSlots[0],null,null];
 const altered=serializeSession(s.game,{...s,userPaused:true,elapsed:P.distillStepMs,caskSlots:slots},options);const r=allEqual(altered);
 assert.equal(r.session.userPaused,true);assert.equal(r.session.elapsed,P.distillStepMs);assert.deepEqual(r.session.caskSlots,slots);
});
for(const [name,edit] of [
 ['model',x=>x.modelVersion=999],['session',x=>x.sessionVersion=7],['origin',x=>x.origin={version:5}],['initializer',x=>x.initializer='hint-from-candidate'],
 ['ledger-version',x=>x.collectorVersions.recentLedger=99],['history-version',x=>x.collectorVersions.historyRecord=99],['recall-version',x=>x.collectorVersions.recallRecord='recall/999']
])test('unsupported input: '+name,()=>{const x=allowedInput(pair.per.state);edit(x);assert.throws(()=>replay(x),{code:'unsupported'});});
for(const [name,edit] of [
 ['final-game',x=>x.game=pair.per.game],['final-RNG',x=>x.finalRng=123],['collector',x=>x.historyRecord=pair.per.state.historyRecord],['cursor',x=>x.initializationCursor=0],['schedule',x=>x.saveBoundaries=[33,35]],['known-hash',x=>x.sha=hash(pair.per.wire)]
])test('forbidden replay hint: '+name,()=>{const x=allowedInput(pair.per.state);edit(x);assert.throws(()=>replay(x),{code:'invalid-input'});});
for(const [name,edit] of [
 ['operation',x=>x.game.operations.at(-1).value.tier='invalid'],['final-game',x=>x.game.core.cash+=1],
 ['history-missing',x=>x.historyRecord.events.pop()],['history-duplicate',x=>x.historyRecord.events.push(clone(x.historyRecord.events[2]))],
 ['history-reference',x=>x.historyRecord.events[2].releaseId=987],['history-cursor',x=>x.historyRecord.operationCount--],
 ['ledger-cursor',x=>x.recentLedger.operationCount--],['recall-cursor',x=>x.recallRecord.observer.index--],
 ['recall-missing',x=>delete x.recallRecord.facts[Object.keys(x.recallRecord.facts)[0]]],
 ['pause-type',x=>x.userPaused=1],['clock-range',x=>x.elapsed=P.monthMs],['slots-duplicate',x=>x.caskSlots=[1,1,null,null]]
])test('unchanged formal reader rejects mutation: '+name,()=>rejectWire(edit));
test('formally admitted changed derived text is seen by independent content comparison',()=>{
 const x=raw();x.historyRecord.events[2].brandName+=' altered';const r=assess(JSON.stringify(x));assert.equal(r.comparison.game.equal,true);assert.equal(r.comparison.historyRecord.equal,false);
 assert.equal(r.comparison.historyRecord.firstDifference.path,'historyRecord.events.2.brandName');
});
for(const [name,edit] of [
 ['extra-final-state',x=>x.auxiliary.game={}],['unrecorded-tasting',x=>x.auxiliary.tastingId=999],['progress-without-distilling',x=>x.auxiliary.progress=12],['fractional-progress',x=>x.auxiliary.progress=1.5]
])test('invalid auxiliary: '+name,()=>{const x=allowedInput(pair.per.state);edit(x);assert.throws(()=>replay(x));});
test('original bytes survive rejected/truncated candidates and missing-original safe stop',()=>{
 const original=pair.per.wire,before=hash(original);for(const text of [original.slice(0,-1),'',JSON.stringify({...raw(),version:99})])assert.throws(()=>readSession(text,options));
 assert.equal(hash(original),before);assert.equal(JSON.stringify(readSession(original,options).game),JSON.stringify(pair.per.game));
 assert.throws(()=>assess('')); // No missing original is reported as restored.
});
const oldPath=process.env.AMBERTIME_NORMAL_V8??fileURLToPath(new URL('../design/independent-record-replay/evidence/reused-24-month-v8.json',import.meta.url));
test('existing verified 24-month v8 bytes are never silently replaced',()=>{
 const bytes=readFileSync(oldPath),sha=hash(bytes);assert.equal(sha,'48751764f194f0e9909abd1186db79fa9d50b832ecbb14a776b5b8eb94198693');
 const r=allEqual(bytes.toString('utf8'));assert.equal(r.session.game.core.month,24);assert.equal(hash(readFileSync(oldPath)),sha);
});

const runner=fileURLToPath(new URL('../design/independent-record-replay/run.mjs',import.meta.url));
for(const kind of ['same-path','symlink','hardlink'])test('runner rejects output/original collision before writing: '+kind,()=>{
 const dir=mkdtempSync(join(tmpdir(),'record-replay-protect-')),destination=join(dir,'cadence-per-operation-v8.json'),original=kind==='same-path'?destination:join(dir,'original-v8.json');
 const bytes=readFileSync(oldPath);writeFileSync(original,bytes);if(kind==='symlink')symlinkSync(original,destination);if(kind==='hardlink')linkSync(original,destination);
 const result=spawnSync(process.execPath,[runner,dir],{env:{...process.env,AMBERTIME_NORMAL_V8:original},encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/output-exists/);assert.equal(hash(readFileSync(original)),hash(bytes));assert.equal(readdirSync(dir).includes('cadence-batched-v8.json'),false);
});
test('missing original fails before any result or fallback is claimed',()=>{
 const dir=mkdtempSync(join(tmpdir(),'record-replay-missing-'));const result=spawnSync(process.execPath,[runner,dir],{env:{...process.env,AMBERTIME_NORMAL_V8:join(dir,'not-present.json')},encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/ENOENT/);assert.deepEqual(readdirSync(dir),[]);
});
