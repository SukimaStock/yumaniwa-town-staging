// Read-only bridge from verified H1-A3 scratch artifacts; no simulation reruns.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {hash} from '../checkpoint-research/prototype.mjs';
import * as D from '../partner-orders.mjs';
import {fill,advance} from '../tests/recipe-helpers.mjs';
const [root,output]=process.argv.slice(2);assert(root&&output);
const prior=JSON.parse(readFileSync(new URL('../checkpoint-persistence/results.json',import.meta.url),'utf8'));
const cases=[];
for(const id of ['local','wide','mixed']){
 const bundle=JSON.parse(readFileSync(resolve(root,'materials',id+'-annual-material.checkpoint.json'),'utf8'));
 const boundaries=JSON.parse(readFileSync(resolve(root,'materials',id+'-boundary-progress.json'),'utf8')).boundaries;
 const verified=prior.materials.find(x=>x.id===id);assert.equal(bundle.sourceHash,verified.sourceHash);assert.equal(boundaries.length,3);
 const sourcePath=resolve(root,'../h1-a3/saves',id+'-1200.json'),raw=readFileSync(sourcePath,'utf8'),state=JSON.parse(raw);assert.equal(hash(raw),bundle.sourceHash);
 const cp=bundle.checkpoint;
 const history=boundaries.map(b=>{assert.equal(hash(b.material),verified.boundaries.find(v=>v.handoverId===b.handoverId).materialDigest);return {id:id+':'+b.handoverId,payload:b.material};});
 const input={sourceHash:bundle.sourceHash,modelFingerprint:bundle.modelFingerprint,boundary:{branch:id,seed:cp.seed,originHash:cp.originHash,nextIndex:cp.nextIndex},checkpoint:cp,context:cp.context,tail:{startIndex:cp.nextIndex,endIndex:state.operations.length,operations:state.operations.slice(cp.nextIndex)},collector:bundle.projection,history,verification:{state:'independent-full-replay-match',evidenceFingerprint:bundle.codeFingerprint,oracleDigest:verified.viewDigest}};
 cases.push({id,input,sourceBytes:Buffer.byteLength(raw),expectedHistory:history.map(h=>({id:h.id,hash:hash(h.payload)})),baselineProjectionDigest:verified.viewDigest});
}
const shortRaw=D.serializeDistillery(advance(fill(D.newRecipeDistillery(909),{progress:65}),2));
writeFileSync(output,JSON.stringify({shortRaw,schema:'ambertime-h1-a4-browser-fixtures/1',cases,source:'H1-A3 verified independent replay, no product migration'}));console.log(JSON.stringify({cases:cases.length,boundaries:9,bytes:Buffer.byteLength(JSON.stringify(cases))}));
