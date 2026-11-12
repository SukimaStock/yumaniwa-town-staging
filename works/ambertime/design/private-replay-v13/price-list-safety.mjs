// Dynamic coverage for the two less frequent readonly-town allowlist operations.
// Build with unchanged native public model APIs; run B/C in separate fresh processes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url)),sha=s=>createHash('sha256').update(s).digest('hex');
const [mode,...args]=process.argv.slice(2);
if(mode==='worker'){
 const [variant,fixture,out]=args;
 const {configureLab,getLabMetrics}=await import('./adapter.mjs');
 configureLab({variant});const D=await import('../../partner-orders.mjs?price-list-worker');
 const text=fs.readFileSync(fixture,'utf8'),state=D.restoreDistillery(text);
 assert.equal(JSON.stringify(state),text);assert.equal(D.serializeDistillery(state),text);
 const metrics=getLabMetrics();assert(metrics.keys.price>=1);assert(metrics.keys.list>=1);assert(metrics.omittedTownCopies>=2);
 const other=D.restoreDistillery(text);state.core.cash--;state.labConnection.town.events[0].priceListFault=1;
 assert.equal(JSON.stringify(other),text);assert.equal(JSON.stringify(D.restoreDistillery(text)),text);
 fs.writeFileSync(out,JSON.stringify({completed:true,variant,fixtureSHA256:sha(text),formalRestoreExact:true,canonicalExact:true,returnedMutationIsolation:true,metrics},null,2));
 console.log('PASS price/list',variant);process.exit(0);
}
assert.equal(mode,'build-and-test','Usage: build-and-test source.expected.json outputDirectory');
const [source,outdir]=args;fs.mkdirSync(outdir,{recursive:true});
const D=await import('../../partner-orders.mjs?price-list-native');
const raw=fs.readFileSync(source,'utf8'),original=JSON.parse(raw).game,originalText=JSON.stringify(original);
D.validateDistillery(original);
const cask=original.core.casks.find(c=>c.age>=1);assert(cask,'Native source needs a legal mature cask');
let state=D.bottleBranded(original,cask.id,{brandId:1},1);
const productId=state.result.productId;
assert.equal(state.productsById[productId].listed,false);
state=D.setSalePrice(state,'standard',productId);
assert.equal(state.operations.at(-1).key,'price');
state=D.listBottles(state,productId);
assert.equal(state.operations.at(-1).key,'list');
assert.equal(state.productsById[productId].listed,true);
assert.equal(JSON.stringify(original),originalText);
const text=D.serializeDistillery(state);assert.equal(JSON.stringify(D.restoreDistillery(text)),text);
const fixture=path.join(outdir,'price-list.native-game.json');fs.writeFileSync(fixture,text);
const result={completed:false,sourceSHA256:sha(raw),fixtureSHA256:sha(text),nativeFormalAccepted:true,sourceInputUnchanged:true,sourceMonth:original.core.month,productId,caskId:cask.id,appendedOperations:state.operations.slice(original.operations.length),variants:[],limitations:['Uses existing legal five-year local career plus three native public operations, not a fresh 100-year strategy','No private operation mutation injected; these two town paths remain read-only','Does not claim journal town-write coverage or persistent storage fault coverage']};
for(const variant of ['B','C']){
 const outfile=path.join(outdir,`price-list-${variant}.json`),run=spawnSync(process.execPath,['--experimental-loader',path.join(here,'loader.mjs'),fileURLToPath(import.meta.url),'worker',variant,fixture,outfile],{encoding:'utf8'});
 fs.writeFileSync(path.join(outdir,`price-list-${variant}.log`),run.stdout+'\n'+run.stderr);assert.equal(run.status,0,run.stderr||run.error?.message);result.variants.push(JSON.parse(fs.readFileSync(outfile)));
}
result.completed=true;fs.writeFileSync(path.join(outdir,'price-list-summary.json'),JSON.stringify(result,null,2));console.log('PASS native builder + formal B/C price/list');
