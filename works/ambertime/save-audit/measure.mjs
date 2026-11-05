// Offline H1-A1 only. Never imports this module into the game or writes source saves.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

export const size = value => {const text=JSON.stringify(value);return {bytes:Buffer.byteLength(text),codeUnits:text.length};};
export function structure(state) {
 const rows=[],totalBytes=size(state).bytes;
 function visit(value,path,depth=0) {
  const measure=size(value),count=Array.isArray(value)?value.length:value&&typeof value==='object'?Object.keys(value).length:1;
  rows.push({path: path||'$',...measure,count,averageBytes:count?measure.bytes/count:null,share:measure.bytes/totalBytes});
  // Parent/child measurements are inclusive, reported as separate levels, never summed.
  if(depth<3 && value && typeof value==='object' && !Array.isArray(value))for(const [key,child] of Object.entries(value))visit(child,path?path+'.'+key:key,depth+1);
 }
 visit(state,'');return rows.sort((a,b)=>b.bytes-a.bytes);
}
export async function instrumentedModel() {
 const url=new URL('../partner-orders.mjs',import.meta.url);
 let source=readFileSync(url,'utf8');
 const edits=[
 ["export function validateDistillery(s,{repairMissingBrandDesign=false}={}){", "export function validateDistillery(s,{repairMissingBrandDesign=false}={}){__depth++;try{"],
 ["M.restore(M.serialize(s.core));","{const t=performance.now();M.restore(M.serialize(s.core));if(__depth===1)__metrics.coreValidationMs+=performance.now()-t;}"],
 [" const j=applyOperation(s,o,context);"," const __a=performance.now();const j=applyOperation(s,o,context);if(__depth===1)__metrics.applyOperationMs+=performance.now()-__a;const __d=performance.now();"],
 [" return j;\n}\nconst matchingPrefix="," if(__depth===1){__metrics.derivedMs+=performance.now()-__d;__metrics.replayed++;}return j;\n}\nconst matchingPrefix="],
 [" assert(JSON.stringify(s)===JSON.stringify(j),'蒸留所の状態と操作の帳面が一致しません。');checkpoint="," const __c=performance.now();assert(JSON.stringify(s)===JSON.stringify(j),'蒸留所の状態と操作の帳面が一致しません。');if(__depth===1)__metrics.equalityMs+=performance.now()-__c;const __k=performance.now();checkpoint="],
 ["return true;\n}\n// Only the exact validated state", "if(__depth===1)__metrics.checkpointMs+=performance.now()-__k;return true;}finally{__depth--;}\n}\n// Only the exact validated state"],
 ];
 for(const [from,to] of edits){assert.equal(source.split(from).length,2,'Instrumentation seam changed: '+from);source=source.replace(from,to);}
 source=source.replace(/from '([.][^']+)'/gu,(_,p)=>'from '+JSON.stringify(new URL(p,url).href));
 source+='\nlet __depth=0;export const __metrics={coreValidationMs:0,applyOperationMs:0,derivedMs:0,equalityMs:0,checkpointMs:0,replayed:0};';
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}

async function worker(file,kind) {
 const raw=readFileSync(file,'utf8'),sourceHash=createHash('sha256').update(raw).digest('hex');
 if(kind==='ledger'){const {measureLedger}=await import('./ledger-measure.mjs');const state=JSON.parse(raw);const result=await measureLedger(state);assert.equal(JSON.stringify(state),raw,'Ledger must not mutate formal state');assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),sourceHash);console.log(JSON.stringify(result));return;}
 const model=kind==='instrumented'?await instrumentedModel():await import('../partner-orders.mjs');
 globalThis.gc?.();const before=process.memoryUsage();
 let t=performance.now();const parsed=JSON.parse(raw);const parseMs=performance.now()-t;
 const originalClone=globalThis.structuredClone;let cloneMs=0,cloneCalls=0;
 if(kind==='instrumented')globalThis.structuredClone=(...args)=>{const begin=performance.now();try{return originalClone(...args);}finally{cloneMs+=performance.now()-begin;cloneCalls++;}};
 t=performance.now();let restored;try{restored=model.restoreDistillery(raw);}finally{globalThis.structuredClone=originalClone;}const restoreMs=performance.now()-t;
 const detail=model.__metrics?{...model.__metrics,cloneMs,cloneCalls}:null;
 t=performance.now();const saved=model.serializeDistillery(restored);const resaveMs=performance.now()-t;
 assert.equal(saved,raw,'Full formal round trip must remain byte-identical');
 assert.deepEqual(restored,parsed);
 const after=process.memoryUsage();
 console.log(JSON.stringify({kind,sourceHash,parseMs,restoreMs,resaveMs,detail,before,after,peakRssBytes:process.resourceUsage().maxRSS*1024}));
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await worker(...process.argv.slice(2));
