import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {hostname,release,arch,cpus} from 'node:os';
const [saves,output,only]=process.argv.slice(2);assert(saves&&output);mkdirSync(output,{recursive:true});
const expected=JSON.parse(readFileSync(new URL('../reputation-dedup-research/capacity-results.json',import.meta.url))).rows;
const hash=x=>createHash('sha256').update(x).digest('hex'),root=resolve(import.meta.dirname,'../../..');
const runner=new URL('./browser-safe-timing.mjs',import.meta.url),runnerFingerprint=hash(readFileSync(runner));
const binary=statSync('/tmp/h1-b1-browser/runtime/chromium');
const environmentFingerprint=hash(JSON.stringify([hostname(),release(),arch(),cpus()[0]?.model,process.version,binary.size,binary.mtimeMs]));
const environmentFile=resolve(output,'environment.json'),reuseScratch=existsSync(environmentFile);
if(reuseScratch)assert.equal(JSON.parse(readFileSync(environmentFile)).environmentFingerprint,environmentFingerprint,'Use a fresh output directory on a different benchmark host');
else writeFileSync(environmentFile,JSON.stringify({environmentFingerprint,node:process.version,platform:process.platform,arch:arch()},null,2));
const base='74924b2729565531dcc3a499dcb7e24bcc0dced8';
const files=['index.html','shop-app.mjs','cask-serials.mjs','partner-orders.mjs','placement-save.mjs','save-codec.mjs'];
const fingerprint=mode=>hash(files.map(p=>mode==='before'?execFileSync('git',['show',base+':works/ambertime/'+p],{cwd:root,encoding:'utf8',maxBuffer:8e6}):readFileSync(new URL('../'+p,import.meta.url),'utf8')).join('\n'));
const fingerprints=Object.fromEntries(['before','separated'].map(mode=>[mode,fingerprint(mode)])),results=[];
const isSha=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const valid=(r,mode,source)=>isSha(r.wireSha256)&&isSha(r.gameSha256)&&isSha(r.servedAppSha256)&&typeof r.browser==='string'&&r.browser.length>0&&r.status==='complete'&&!r.error&&r.errors?.length===0&&r.mode===mode&&r.baseSha===base&&r.inputSha256===source&&r.runnerFingerprint===runnerFingerprint&&r.codeFingerprint===fingerprints[mode]&&r.firstFormalCheck?.checkpointLength===r.firstFormalCheck?.operations&&Number.isInteger(r.firstFormalCheck?.operations);
for(const month of [1200,360,720,1080])for(const id of ['local','wide','mixed']){
 if(only&&only!==`${id}-${month}`)continue;
 const input=resolve(saves,`${id}-${month}.json`),source=hash(readFileSync(input));assert.equal(source,expected.find(r=>r.id===id&&r.month===month).sourceHash);
 // A whole completed pair can be reused as historical evidence. Do not
 // combine only one side from a stored report with a new environment.
 const recorded=new URL(`./${id}-${month/12}-final-pair.json`,import.meta.url);
 if(existsSync(recorded)){
  const prior=JSON.parse(readFileSync(recorded));const [before,after]=prior.results??[];
  if(prior.status==='complete'&&before&&after&&valid(before,'before',source)&&valid(after,'separated',source)&&['wireSha256','gameSha256','browser'].every(field=>before[field]===after[field])){
   results.push({...before,id,month},{...after,id,month});
   console.log(JSON.stringify({id,month,status:'reused-complete-pair'}));
   continue;
  }
 }
 const pair=[];
 for(const mode of ['before','separated']){
  const destination=resolve(output,`${id}-${month}-${mode}.json`);let result=reuseScratch&&existsSync(destination)?JSON.parse(readFileSync(destination)):null;
  if(!result||!valid(result,mode,source)){
   console.log(JSON.stringify({id,month,mode,status:'starting'}));
   const child=spawn(process.execPath,[runner.pathname,input,mode,destination],{stdio:'inherit'});assert.equal(await new Promise(r=>child.once('exit',r)),0);
   result=JSON.parse(readFileSync(destination));assert(valid(result,mode,source));
  }else console.log(JSON.stringify({id,month,mode,status:'reused'}));
  pair.push(result);results.push({...result,id,month});writeFileSync(resolve(output,'progress.json'),JSON.stringify({status:'incomplete',completed:results.length,results},null,2));
 }
 for(const field of ['wireSha256','gameSha256','browser'])assert.equal(pair[0][field],pair[1][field],`${id}-${month}: ${field}`);
}
assert.equal(results.length,only?2:24);
for(const mode of Object.keys(fingerprints))assert.equal(fingerprint(mode),fingerprints[mode]);assert.equal(hash(readFileSync(runner)),runnerFingerprint);
writeFileSync(resolve(output,only?`${only}-pair.json`:'results.json'),JSON.stringify({status:'complete',runEnvironmentFingerprint:environmentFingerprint,results},null,2));
