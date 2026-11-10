// Derive checkpoints and the official v8 envelope from the unchanged PR907 game.
// Metadata reconstruction is intentionally measured separately from boot.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as D from '../../partner-orders.mjs';
import {sessionFor} from '../../tests/regional-delivery-helpers.mjs';
import {serializeSession} from '../../development-save.mjs';
import {PARALLEL_PARAMETERS as P} from '../../economy-parameters.mjs';
const source=process.argv[2]??new URL('./fixtures/pr907-1386.json',import.meta.url);
const destination=process.argv[3];
if(!destination)throw Error('Usage: node derive-fixtures.mjs RAW_JSON OUTPUT_DIRECTORY');
fs.mkdirSync(destination,{recursive:true});
const raw=fs.readFileSync(source,'utf8'),game=JSON.parse(raw);
if(createHash('sha256').update(raw).digest('hex')!=='fe6a66973f57ad7ed9758ddfab12cd88e87e8461885ce8f91c8cb7e13feb7d24')throw Error('Expected exact PR907 fixture');
const start=performance.now(),metadata=sessionFor(game),metadataMilliseconds=performance.now()-start;
const t=performance.now(),formal=serializeSession(game,metadata,{enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs});
const formalGenerationMilliseconds=performance.now()-t;
fs.writeFileSync(path.join(destination,'formal-v8.json'),formal);
const measurements={metadataMilliseconds,formalGenerationMilliseconds,formalBytes:Buffer.byteLength(formal),formalCodeUnits:formal.length,prefixes:[]};
const found=new Set(),tradeIndex=game.operations.findLastIndex(o=>o.key==='regional-assign');
D.replayDistilleryOperations(game,({index,before,after})=>{
 if(index===tradeIndex){
  if(Object.keys(before).some(key=>!Object.hasOwn(game,key)))throw Error('Unexpected trade prefix key');
  const state=Object.fromEntries(Object.keys(game).filter(key=>key==='operations'||key==='origin'||Object.hasOwn(before,key)).map(key=>[key,key==='operations'?game.operations.slice(0,index):key==='origin'?game.origin:before[key]]));
  fs.writeFileSync(path.join(destination,'trade-ready.json'),JSON.stringify(state));
  measurements.tradePrefix={month:before.core.month,operations:index};
 }
 const month=after.core.month;
 if(![12,120,360,1200].includes(month)||found.has(month))return;
 found.add(month);
 if(Object.keys(after).some(key=>!Object.hasOwn(game,key)))throw Error("Prefix contains fields absent from final game");
 // Preserve canonical property order, not the projection's omitted-field order.
 const state=Object.fromEntries(Object.keys(game).filter(key=>key==='operations'||key==='origin'||Object.hasOwn(after,key)).map(key=>[key,key==='operations'?game.operations.slice(0,index+1):key==='origin'?game.origin:after[key]]));
 const text=JSON.stringify(state);fs.writeFileSync(path.join(destination,`prefix-${month}.json`),text);
 measurements.prefixes.push({month,operations:index+1,sha256:createHash('sha256').update(text).digest('hex')});
});
if(found.size!==4)throw Error('Missing requested prefix months');
fs.writeFileSync(path.join(destination,'derivation.json'),JSON.stringify(measurements,null,2)+'\n');
console.log(JSON.stringify(measurements));
