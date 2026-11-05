// H1-A5 offline public-operation timings. No storage access or fixture mutation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as D from '../partner-orders.mjs';
import {mapProgress,mapIntroduction} from '../world-map-view.mjs';
import {buildShopLedger} from '../shop-ledger.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const root=path.resolve(new URL('../../../',import.meta.url).pathname);
const directory=process.argv[2]??'/tmp/amber-h1-a1/saves';
const previous=JSON.parse(fs.readFileSync(new URL('../save-audit/results.json',import.meta.url)));
const deps=new Set();
function walk(relative){if(deps.has(relative))return;deps.add(relative);const source=fs.readFileSync(path.join(root,relative),'utf8');for(const m of source.matchAll(/(?:from\s*|import\s*)['"]([.][^'"]+)['"]/gu)){const file=new URL(m[1],new URL(relative,'file://'+root+'/'));file.search='';if(file.pathname.endsWith('.mjs'))walk(path.relative(root,file.pathname));}}
for(const p of ['works/ambertime/partner-orders.mjs','works/ambertime/save-audit/measure.mjs','works/ambertime/save-audit/ledger-measure.mjs'])walk(p);
const manifest=[...deps].sort().map(p=>{const now=fs.readFileSync(path.join(root,p));const old=execFileSync('git',['show','0f22b025:'+p],{cwd:root,maxBuffer:5e6});assert.deepEqual(now,old,'Prior evidence dependency changed '+p);return {path:p,sha256:sha(now)};});
const timing=(fn)=>{const t=performance.now(),value=fn();return {ms:performance.now()-t,value};};
const rows=[];
for(const id of ['local','wide','mixed'])for(const month of [360,720,1080,1200]){
 const raw=fs.readFileSync(path.join(directory,id+'-'+month+'.json'),'utf8'),hash=sha(raw),prior=previous.results.find(r=>r.id===id&&r.month===month);assert.equal(hash,prior.hash);
 const state=JSON.parse(raw);const monthSamples=[];
 for(let n=0;n<3;n++){const result=timing(()=>D.tickDistillery(state));assert.equal(JSON.stringify(state),raw,'Public month mutated source');monthSamples.push({ms:result.ms,advanced:result.value.core.month-state.core.month,operationsAdded:result.value.operations.length-state.operations.length,sha256:sha(JSON.stringify(result.value))});}
 assert(monthSamples.every(r=>r.sha256===monthSamples[0].sha256),'Month must be reproducible');
 const mapSamples=[],shopSamples=[];for(let n=0;n<5;n++){mapSamples.push(timing(()=>({progress:mapProgress(state),introductions:[1,2,3,4,5,6].map(s=>mapIntroduction(state,s))})).ms);shopSamples.push(timing(()=>buildShopLedger(state)).ms);}
 const extra={};
 if(month===1200){
  const ready=D.canStart(state);extra.canStart=ready;
  if(ready.ok){const start=timing(()=>D.startRangeDistillation(state));extra.distillStartMs=start.ms;const step=timing(()=>D.distillStep(start.value));extra.distillStepMs=step.ms;extra.distillProgress=step.value.still.distillation?.progress;}
  extra.caskIds=state.core.casks.map(c=>c.id);extra.delivery='not-run: must choose a valid allocation/stock path per fixture';extra.bottle='not-run: fixture-specific bottling preconditions not established';extra.generation='not-run: no generation boundary at sampled state';
 }
 assert.equal(JSON.stringify(state),raw);assert.equal(sha(fs.readFileSync(path.join(directory,id+'-'+month+'.json'))),hash);
 rows.push({id,month,inputSha256:hash,monthSamples,mapProgressAndSixIntroductionsMs:mapSamples,shopLedgerProjectionMs:shopSamples,extra,reused:{source:'../save-audit/results.json',coldRestoreRuns:prior.runs.map(r=>({sourceHash:r.sourceHash,restoreMs:r.restoreMs,resaveMs:r.resaveMs})),warmSerializeMs:prior.runs.map(r=>r.resaveMs),ledger:{timingsMs:prior.ledger.timingsMs,sources:prior.ledger.sources}}});
 console.error(id,month,monthSamples.map(s=>s.ms.toFixed(1)).join(','));
}
const result={schema:'ambertime-h1-a5-play/1',node:process.version,platform:process.platform,baseSha:'306524e1e7df3a5b2e2ba27310fb269d6e15aa4a',codeSha256:sha(fs.readFileSync(new URL(import.meta.url))),priorEvidence:{commit:'0f22b025',resultsSha256:sha(fs.readFileSync(new URL('../save-audit/results.json',import.meta.url))),dependencies:manifest},method:'Fresh measurement of public tick/map/shop projections on exact previously validated parsed fixtures; not cold validation. Three deterministic ticks independently from same source, five projections. Existing completed cold restore/warm serialize/ledger runs reused only after exact transitive static dependency byte comparisons to A1 merge.',rows,limitations:['Node operation timings do not measure browser frames, DOM paint, worker data transfer, iPhone responsiveness or one-hour real play.','Month samples do not include autosave; warm serialization and browser storage must be composed only as separately measured phases, not end-to-end latency.','Map timing generates progress and introductions only, not Canvas draw.','Bottling, delivery and generation transitions are unmeasured at these fixtures.','Unchanged static dependency closure is checked; any future dynamic dependency requires a fresh audit.']};
fs.writeFileSync(new URL('./play-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
