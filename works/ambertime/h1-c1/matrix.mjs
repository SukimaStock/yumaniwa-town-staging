import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const [saves,output]=process.argv.slice(2);mkdirSync(output,{recursive:true});
const expected=JSON.parse(readFileSync(new URL('../reputation-dedup-research/capacity-results.json',import.meta.url))).rows;
const hash=x=>createHash('sha256').update(x).digest('hex');
const results=[];
for(const month of [1200,360,720,1080])for(const id of ['local','wide','mixed'])for(const mode of ['before','shared']){
 const input=resolve(saves,`${id}-${month}.json`),source=hash(readFileSync(input));assert.equal(source,expected.find(r=>r.id===id&&r.month===month).sourceHash);
 const destination=resolve(output,`${id}-${month}-${mode}.json`);
 if(existsSync(destination)){const old=JSON.parse(readFileSync(destination));const runner=hash(readFileSync(new URL('./browser-timing.mjs',import.meta.url)));if(old.status==='complete'&&old.inputSha256===source&&old.runnerFingerprint===runner&&old.codeFingerprint===hash(['shop-app.mjs','cask-serials.mjs','partner-orders.mjs','placement-save.mjs','save-codec.mjs'].map(p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')).join('\n'))&&old.mode===mode){results.push({...old,id,month});console.log(JSON.stringify({id,month,mode,status:'reused'}));continue;}}
 console.log(JSON.stringify({id,month,mode,status:'starting'}));
 const child=spawn(process.execPath,[new URL('./browser-timing.mjs',import.meta.url).pathname,input,mode,destination],{stdio:'inherit'});const code=await new Promise(r=>child.once('exit',r));assert.equal(code,0);
 const result=JSON.parse(readFileSync(destination));assert.equal(result.status,'complete');assert.equal(result.inputSha256,source);results.push({...result,id,month});writeFileSync(resolve(output,'progress.json'),JSON.stringify({status:'incomplete',completed:results.length,results},null,2));
 console.log(JSON.stringify({id,month,mode,status:'complete',ms:result.observationCompleteMs}));
}
writeFileSync(resolve(output,'results.json'),JSON.stringify({status:'complete',results},null,2));
