// Sequential, fresh-process benchmark. Run only after checkpoint generation completes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {size,structure} from './measure.mjs';
const [directory,output]=process.argv.slice(2);assert.ok(directory&&output,'run.mjs <save-directory> <output-directory>');
mkdirSync(output,{recursive:true});
const report=readFileSync(new URL('../chronicle-lab/H24.md',import.meta.url),'utf8');
const hashes=[...report.matchAll(/\| (地元密着|広域展開|混合) \| (30|60|90|100) \| (\d+) \|.*?`([a-f0-9]{64})`/g)];
assert.equal(hashes.length,12);
const labels={local:'地元密着',wide:'広域展開',mixed:'混合'};
const fingerprint=createHash('sha256').update(['run.mjs','measure.mjs','ledger-measure.mjs'].map(p=>readFileSync(new URL(p,import.meta.url),'utf8')).join('\n')).digest('hex');
const results=[];
const {prepareRecallArchive,readRecallArchive}=await import('../chronicle-lab/research-h25.mjs');
function child(script,args){
 const run=spawnSync(process.execPath,['--expose-gc',new URL(script,import.meta.url).pathname,...args],{encoding:'utf8',maxBuffer:64*1024*1024});
 assert.equal(run.status,0,run.stderr);return JSON.parse(run.stdout);
}
for(const id of ['local','wide','mixed'])for(const month of [360,720,1080,1200]){
 const resultFile=resolve(output,`${id}-${month}.json`);
 const file=resolve(directory,`${id}-${month}.json`),raw=readFileSync(file,'utf8'),state=JSON.parse(raw),hash=createHash('sha256').update(raw).digest('hex');
 if(existsSync(resultFile)){const previous=JSON.parse(readFileSync(resultFile));assert.equal(previous.hash,hash);assert.equal(previous.fingerprint,fingerprint,'Benchmark script changed; use new output dir');results.push(previous);continue;}
 const expected=hashes.find(r=>r[1]===labels[id]&&Number(r[2])*12===month);
 assert.equal(hash,expected[4],'Must reproduce H2-4 exact save');assert.equal(Buffer.byteLength(raw),Number(expected[3]));
 const runs=[];
 for(let repeat=0;repeat<3;repeat++){
  const sample=child('./measure.mjs',[file,'official']);runs.push(sample);
  console.error(JSON.stringify({id,month,repeat,restoreMs:sample.restoreMs}));
 }
 const instrumented=child('./measure.mjs',[file,'instrumented']);
 const facts=child('../chronicle-lab/research-h25-generate.mjs',[file,id]);
 const t=performance.now();
 const archive=prepareRecallArchive(facts.record),archiveMs=performance.now()-t;
 const edits=[];
 for(let i=0;i<4;i++){const begin=performance.now();const edit=readRecallArchive(archive);edits.push({ms:performance.now()-begin,selectedIds:edit.result.audit.selectedIds,seed:edit.result.audit.seed});}
 const ledger=child('./measure.mjs',[file,'ledger']);
 const town=state.labConnection.town,byId=new Map(town.events.map(e=>[e.id,e]));
 const duplicates={arrivals:town.arrivals.length,identicalArrivals:town.arrivals.filter(a=>JSON.stringify(a)===JSON.stringify(byId.get(a.id))).length};
 const result={id,month,hash,fingerprint,ledger,duplicates,...size(state),limitCodeUnits:6016384,limitRatio:raw.length/6016384,operations:state.operations.length,rows:structure(state),runs,instrumented,facts:{...facts.metrics,rawEvents:facts.record.events.length,rawBytes:size(facts.record).bytes,archiveBytes:size(archive).bytes,archiveEvents:archive.events.length,archiveMs,edits}};
 writeFileSync(resultFile,JSON.stringify(result,null,2)+'\n');results.push(result);
 writeFileSync(resolve(output,'results.json'),JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,policy:'sequential fresh processes; first complete official run discarded for host/cache priming, two measured cold-process runs; instrumented separate; extraction once; edits first discarded',results},null,2)+'\n');
 console.error(JSON.stringify({done:id,month}));
}
