// H1-A5 research only: read-only source fixtures; fresh process per condition.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
import {Worker} from 'node:worker_threads';
import {fileURLToPath,pathToFileURL} from 'node:url';
const sha=x=>createHash('sha256').update(x).digest('hex');
const mem=()=>({...process.memoryUsage(),processMaxRssBytes:process.resourceUsage().maxRSS*1024});
export const wrapRaw=(raw,userPaused=false,elapsed=0)=>'{"version":2,"game":'+raw+',"userPaused":'+JSON.stringify(userPaused)+',"elapsed":'+JSON.stringify(elapsed)+'}';
export async function measure(raw){
 globalThis.gc?.();const baseline=mem(),phases=[];let state,clone,text,wrapped,parsed;
 const phase=(name,fn)=>{const before=mem(),t=performance.now();const value=fn();phases.push({name,ms:performance.now()-t,before,after:mem()});return value;};
 state=phase('JSON.parse',()=>JSON.parse(raw));
 text=phase('JSON.stringify',()=>JSON.stringify(state));assert.equal(text,raw);
 clone=phase('structuredClone',()=>structuredClone(state));assert.deepEqual(clone,state);
 phase('SHA256-text',()=>sha(raw));
 wrapped=phase('A-wrapper-parse-stringify',()=>JSON.stringify({version:2,game:JSON.parse(text),userPaused:false,elapsed:0}));
 const efficient=phase('B-wrapper-reuse-text-lazy',()=>wrapRaw(text));phase('B-force-text-materialization-SHA256',()=>assert.equal(sha(efficient),sha(wrapped)));assert.equal(efficient,wrapped);
 await new Promise(setImmediate);parsed=phase('C-yield-before-wrapper-parse',()=>JSON.parse(text));await new Promise(setImmediate);
 const staged=phase('C-yield-before-wrapper-stringify',()=>JSON.stringify({version:2,game:parsed,userPaused:false,elapsed:0}));assert.equal(staged,wrapped);
 const held=mem();state=null;clone=null;text=null;wrapped=null;parsed=null;globalThis.gc?.();
 return {baseline,phases,held,afterGc:mem(),observedProcessMaxRssBytes:mem().processMaxRssBytes};
}
async function transfer(raw,mode){
 const before=mem(),worker=new Worker(new URL('./memory-worker.mjs',import.meta.url));await new Promise((ok,no)=>{worker.once('online',ok);worker.once('error',no);});
 let maxTickDelayMs=0,last=performance.now(),ticks=0;const timer=setInterval(()=>{const now=performance.now();maxTickDelayMs=Math.max(maxTickDelayMs,now-last-5);last=now;ticks++;},5);
 const start=performance.now();const result=await new Promise((ok,no)=>{worker.once('error',no);worker.once('message',ok);if(mode==='clone')worker.postMessage({mode,state:JSON.parse(raw)});else{const bytes=new TextEncoder().encode(raw);worker.postMessage({mode,buffer:bytes.buffer},[bytes.buffer]);assert.equal(bytes.byteLength,0);}});assert.equal(result.digest,sha(raw));assert.equal(result.codeUnits,raw.length);const ms=performance.now()-start;clearInterval(timer);await worker.terminate();return {mode,ms,maxTickDelayMs,ticks,before,after:mem(),worker:result};
}
async function main(){
 const [mode,arg,output]=process.argv.slice(2);
 if(mode==='child'){console.log(JSON.stringify(await measure(readFileSync(arg,'utf8'))));return;}
 if(mode==='transfer'){const raw=readFileSync(arg,'utf8');console.log(JSON.stringify(await transfer(raw,output)));return;}
 assert(mode==='run'&&arg&&output,'memory-run.mjs run <save-dir> <output.json>');
 const source=readFileSync(new URL('../chronicle-lab/H24.md',import.meta.url),'utf8');const expected=[...source.matchAll(/\| (地元密着|広域展開|混合) \| (30|60|90|100) \| (\d+) \|.*?`([a-f0-9]{64})`/g)];assert.equal(expected.length,12);
 const labels={local:'地元密着',wide:'広域展開',mixed:'混合'},results=[];
 for(const id of Object.keys(labels))for(const month of [360,720,1080,1200]){const file=arg+'/'+id+'-'+month+'.json',raw=readFileSync(file,'utf8'),e=expected.find(r=>r[1]===labels[id]&&+r[2]*12===month);assert.equal(sha(raw),e[4]);assert.equal(Buffer.byteLength(raw),+e[3]);const child=spawnSync(process.execPath,['--expose-gc',fileURLToPath(import.meta.url),'child',file],{encoding:'utf8',maxBuffer:10e6});assert.equal(child.status,0,child.stderr);results.push({id,month,inputSha256:sha(raw),utf8Bytes:Buffer.byteLength(raw),utf16CodeUnits:raw.length,...JSON.parse(child.stdout)});}
 const transfers=[];for(const mode of ['clone','transfer']){const r=spawnSync(process.execPath,['--expose-gc',fileURLToPath(import.meta.url),'transfer',arg+'/wide-1200.json',mode],{encoding:'utf8',maxBuffer:10e6});assert.equal(r.status,0,r.stderr);transfers.push(JSON.parse(r.stdout));}
 const files=['memory-run.mjs','memory-worker.mjs'];const result={schema:'ambertime-h1-a5-node-memory/1',node:process.version,platform:process.platform,arch:process.arch,codeFingerprint:sha(files.map(f=>readFileSync(new URL(f,import.meta.url))).join('\n')),policy:'Fresh child per input, phases within child intentionally retain prior outputs until held sample. Single sample, no repeated statistics. Worker tests use separate child per mode. No formal validation is skipped in product; JSON-only prototypes start from existing verified text.',limitations:['Before/after heap is observed occupancy, not exact synchronous peak. maxRSS is OS process high-water mark, includes Node runtime and worker threads, not Chromium JS heap or iPhone RAM.','B lazy string construction alone omits rope flattening; separate SHA phase forces contents and includes two hashes, so is not a direct storage latency comparison.',
'C yields only between indivisible synchronous phases; no within-parse/stringify improvement.','Worker sends back hash/count receipt, not restored state: round-trip full object reception remains unmeasured.','Worker timers measure this short synthetic Node workload; not browser frame time or Safari performance.'],results,transfers};writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({results:results.length,transfers:transfers.length,output}));
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await main();
