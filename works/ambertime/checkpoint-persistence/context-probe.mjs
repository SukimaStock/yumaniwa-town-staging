// Isolated replay-context phase probe, separate from integrated restore timings.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {decodeContext,hash} from '../checkpoint-research/prototype.mjs';
const [mode,input,output]=process.argv.slice(2);
if(mode==='worker'){
 const begin=performance.now(),text=readFileSync(input,'utf8'),readMs=performance.now()-begin;
 const parse=performance.now(),envelope=JSON.parse(text),parseMs=performance.now()-parse;
 const verify=performance.now(),{integrity,...payload}=envelope;assert.equal(hash(payload),integrity);const integrityMs=performance.now()-verify;
 const hydrate=performance.now(),context=decodeContext(payload.checkpoint.context),decodeMs=performance.now()-hydrate;
 console.log(JSON.stringify({sourceHash:hash(text),readMs,parseMs,integrityMs,decodeMs,mapSizes:Object.fromEntries(['manualSources','nearbyProducts','nearbyCasks'].map(k=>[k,context[k].size])),peakRssBytes:process.resourceUsage().maxRSS*1024}));
}else{
 assert.equal(mode,'all');const rows=[];
 for(const id of ['local','wide','mixed'])for(const policy of ['generation','annual','operations64','operations128','workload64MiB']){
  const dir=resolve(input,'long-final',id,policy),manifest=JSON.parse(readFileSync(resolve(dir,'commit.json'),'utf8')),path=resolve(dir,manifest.checkpoint);
  const run=spawnSync(process.execPath,[new URL(import.meta.url).pathname,'worker',path],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);rows.push({id,policy,...JSON.parse(run.stdout)});
 }
 writeFileSync(output,JSON.stringify({schema:'ambertime-context-probe/1',status:'complete',codeFingerprint:hash(readFileSync(new URL(import.meta.url),'utf8')),note:'Fresh Node, one isolated decodeContext trial. Not a partition to add to integrated localVerifyMs, which already includes decode. No forced GC; OS cache uncontrolled.',rows},null,2)+'\n');
}
