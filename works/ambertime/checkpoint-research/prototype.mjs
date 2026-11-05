// H1-A2 offline research only. No product reader, storage key or model source is changed.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export const bytes=value=>Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value));
const clone=value=>structuredClone(value);
const MODEL_SOURCE_SHA='ea8f40410bacebcfb8a1c16ec921af095511de6db3732ee3d6f4cf2e9e32346b';
let instance=0;
const mapKeys=['manualSources','nearbyProducts','nearbyCasks'];
export function encodeContext(context){return {manualSources:[...context.manualSources],nearbyProducts:[...context.nearbyProducts],nearbyCasks:[...context.nearbyCasks],manualFills:context.manualFills,manualBottles:context.manualBottles};}
export function decodeContext(encoded){
 assert.deepEqual(Object.keys(encoded).sort(),[...mapKeys,'manualFills','manualBottles'].sort(),'Unknown replay context');
 const context=clone(encoded);
 for(const key of mapKeys){assert(Array.isArray(context[key]),'Missing context Map '+key);for(const entry of context[key])assert(Array.isArray(entry)&&entry.length===2,'Invalid Map entry');const map=new Map(context[key]);assert.equal(map.size,context[key].length,'Duplicate context Map key');context[key]=map;}
 for(const key of ['manualFills','manualBottles'])assert(Number.isSafeInteger(context[key])&&context[key]>=0,'Invalid context counter');
 return context;
}
function modelSources(url,seen=new Map()){
 const path=fileURLToPath(url);if(seen.has(path))return seen;
 const source=readFileSync(path,'utf8');seen.set(path,source);
 for(const match of source.matchAll(/(?:from\s*|import\s*)['"]([.][^'"]+)['"]/gu)){
  const child=new URL(match[1],url);child.search='';child.hash='';if(child.pathname.endsWith('.mjs'))modelSources(child,seen);
 }
 return seen;
}
export async function loadAdapter(){
 const url=new URL('../partner-orders.mjs',import.meta.url),original=readFileSync(url,'utf8');
 assert.equal(hash(original),MODEL_SOURCE_SHA,'Pinned replay model source changed; review research seams');
 for(const seam of ['function apply(s,o,context,index){','const emptyReplayContext=()=>','function upgraded(input){','export function validateDistillery(s,{repairMissingBrandDesign=false}={}){'])assert.equal(original.split(seam).length,2,'Replay seam changed: '+seam);
 const sources=modelSources(url),root=new URL('../../../',import.meta.url).pathname;
 const fingerprint=hash([...sources].map(([path,source])=>[path.startsWith(root)?path.slice(root.length):path,hash(source)]).sort((a,b)=>a[0].localeCompare(b[0])));
 let source=original.replace(/from '([.][^']+)'/gu,(_,path)=>'from '+JSON.stringify(new URL(path,url).href));
 source+=`\n// Research-only private seams; instance ${++instance}\nexport const research={emptyContext:emptyReplayContext,apply,initial:s=>s.origin===null?newDistillery(s.seed):upgraded(s.origin),finalize:(state,target)=>{let j=E.endTasting(state);if(target.still?.phase==='distilling')j=progress(j,target.still.distillation.progress);if(target.tastingId!==null)j=sampleDistillery(j,target.tastingId);return j;}};\n`;
 const model=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 return {...model,fingerprint,sourceSha:hash(original),sourceCount:sources.size};
}
const targetFrom=raw=>{assert.equal(typeof raw,'string');const target=JSON.parse(raw);assert(Array.isArray(target?.operations),'Expected native current save');return target;};
const projectionSnapshot=state=>{const {operations,origin,...facts}=state;return clone(facts);};
export function fullReplay(adapter,sourceRaw,{onStep,observer,compare=true}={}){
 const target=targetFrom(sourceRaw),context=adapter.research.emptyContext();
 let state=adapter.research.initial(target);const start=performance.now();
 observer?.({index:-1,operation:null,before:null,after:projectionSnapshot(state)});
 onStep?.({state,context,index:-1,nextIndex:0,operation:null});
 for(let index=0;index<target.operations.length;index++){
  const before=observer?projectionSnapshot(state):null;
  state=adapter.research.apply(state,target.operations[index],context,index);
  observer?.({index,operation:clone(target.operations[index]),before,after:projectionSnapshot(state)});
  onStep?.({state,context,index,nextIndex:index+1,operation:target.operations[index]});
 }
 const replayMs=performance.now()-start;state=adapter.research.finalize(state,target);
 if(compare)assert.equal(JSON.stringify(state),sourceRaw,'Independent full replay differs from native source');
 return {state,context,replayed:target.operations.length,replayMs};
}
export function createCheckpoint(adapter,{state,context,sourceRaw}){
 const target=targetFrom(sourceRaw),prefix=state.operations.length;
 assert.equal(JSON.stringify(state.operations),JSON.stringify(target.operations.slice(0,prefix)),'Checkpoint boundary is not source prefix');
 assert.equal(state.seed,target.seed);assert.equal(JSON.stringify(state.origin),JSON.stringify(target.origin));
 const payload={format:'ambertime-research-checkpoint/1',method:'private-apply-operation-boundary-v1',modelFingerprint:adapter.fingerprint,sourceHash:hash(sourceRaw),targetOperationsHash:hash(target.operations),originHash:hash(target.origin),seed:target.seed,month:state.core.month,nextIndex:prefix,generationId:state.generations?.active.id??null,rules:state.rules,modelVersion:state.version,prefixHash:hash(state.operations),state:clone(state),context:clone(encodeContext(context)),coverage:{prefixOperations:prefix,sourceOperations:target.operations.length,fullReplayChecked:false}};
 return {...payload,integrity:hash(payload)};
}
export function verifyCheckpoint(adapter,checkpoint,sourceRaw,{binding='exact-source'}={}){
 const checkStart=performance.now(),target=targetFrom(sourceRaw),{integrity,...payload}=checkpoint;
 assert.equal(hash(payload),integrity,'Checkpoint integrity mismatch');
 assert.equal(payload.format,'ambertime-research-checkpoint/1');assert.equal(payload.method,'private-apply-operation-boundary-v1');
 assert.equal(payload.modelFingerprint,adapter.fingerprint,'Checkpoint model/rules fingerprint expired');
 assert(['exact-source','prefix-branch'].includes(binding),'Unknown source binding');
 if(binding==='exact-source'){assert.equal(payload.sourceHash,hash(sourceRaw),'Checkpoint source binding mismatch');assert.equal(payload.targetOperationsHash,hash(target.operations),'Tail missing or changed');}
 assert.equal(payload.seed,target.seed,'Checkpoint seed mismatch');assert.equal(payload.originHash,hash(target.origin),'Checkpoint origin mismatch');
 assert(Number.isSafeInteger(payload.nextIndex)&&payload.nextIndex>=0&&payload.nextIndex<=target.operations.length,'Checkpoint index beyond source');
 assert.equal(payload.state.operations.length,payload.nextIndex,'Checkpoint global operation index mismatch');
 assert.equal(hash(payload.state.operations),payload.prefixHash,'Checkpoint prefix corrupted');
 assert.equal(hash(target.operations.slice(0,payload.nextIndex)),payload.prefixHash,'Different operation branch before checkpoint');
 assert.equal(payload.state.seed,target.seed);assert.equal(hash(payload.state.origin),payload.originHash);
 assert.equal(payload.month,payload.state.core.month);assert.equal(payload.generationId,payload.state.generations?.active.id??null);assert.equal(payload.rules,payload.state.rules);assert.equal(payload.modelVersion,payload.state.version);
 const context=decodeContext(payload.context);
 return {target,state:clone(payload.state),context,verifyMs:performance.now()-checkStart,binding,guarantee:'local integrity and source/prefix binding only; no authenticated prefix correctness proof'};
}
export function replayTail(adapter,checkpoint,sourceRaw,{observer,onStep,binding='exact-source',compare=true}={}){
 const begin=performance.now(),loaded=verifyCheckpoint(adapter,checkpoint,sourceRaw,{binding}),{target,context}=loaded;
 let state=loaded.state;const start=performance.now();
 onStep?.({state,context,index:checkpoint.nextIndex-1,nextIndex:checkpoint.nextIndex,operation:null});
 for(let index=checkpoint.nextIndex;index<target.operations.length;index++){
  const before=observer?projectionSnapshot(state):null,operation=target.operations[index];state=adapter.research.apply(state,operation,context,index);
  observer?.({index,operation:clone(operation),before,after:projectionSnapshot(state)});
  onStep?.({state,context,index,nextIndex:index+1,operation});
 }
 const tailMs=performance.now()-start,finalizeStart=performance.now();state=adapter.research.finalize(state,target);const finalizeMs=performance.now()-finalizeStart;
 const compareStart=performance.now();if(compare)assert.equal(JSON.stringify(state),sourceRaw,'Checkpoint tail differs from native source');const compareMs=performance.now()-compareStart;
 return {state,context,replayed:target.operations.length-checkpoint.nextIndex,verifyMs:loaded.verifyMs,tailMs,finalizeMs,compareMs,totalMs:performance.now()-begin,binding,guarantee:loaded.guarantee};
}
