import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const [saves,output,only]=process.argv.slice(2);assert(saves&&output);mkdirSync(output,{recursive:true});
const expected=JSON.parse(readFileSync(new URL('../reputation-dedup-research/capacity-results.json',import.meta.url))).rows;
const hash=x=>createHash('sha256').update(x).digest('hex'),root=resolve(import.meta.dirname,'../../..');
const runner=new URL('./browser-safe-timing.mjs',import.meta.url),runnerFingerprint=hash(readFileSync(runner));
const base='74924b2729565531dcc3a499dcb7e24bcc0dced8';
const files=['index.html','shop-app.mjs','cask-serials.mjs','partner-orders.mjs','placement-save.mjs','save-codec.mjs'];
const fingerprint=mode=>hash(files.map(p=>mode==='before'?execFileSync('git',['show',base+':works/ambertime/'+p],{cwd:root,encoding:'utf8',maxBuffer:8e6}):readFileSync(new URL('../'+p,import.meta.url),'utf8')).join('\n'));
const fingerprints=Object.fromEntries(['before','separated'].map(mode=>[mode,fingerprint(mode)])),results=[];
const valid=(r,mode,source)=>r.status==='complete'&&!r.error&&r.errors?.length===0&&r.mode===mode&&r.baseSha===base&&r.inputSha256===source&&r.runnerFingerprint===runnerFingerprint&&r.codeFingerprint===fingerprints[mode]&&r.firstFormalCheck?.checkpointLength===r.firstFormalCheck?.operations&&Number.isInteger(r.firstFormalCheck?.operations);
for(const month of [1200,360,720,1080])for(const id of ['local','wide','mixed']){
 if(only&&only!==`${id}-${month}`)continue;
 const input=resolve(saves,`${id}-${month}.json`),source=hash(readFileSync(input));assert.equal(source,expected.find(r=>r.id===id&&r.month===month).sourceHash);
 const pair=[];
 for(const mode of ['before','separated']){
  const destination=resolve(output,`${id}-${month}-${mode}.json`);let result=existsSync(destination)?JSON.parse(readFileSync(destination)):null;
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
writeFileSync(resolve(output,only?`${only}-pair.json`:'results.json'),JSON.stringify({status:'complete',results},null,2));
