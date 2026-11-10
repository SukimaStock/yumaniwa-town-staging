// Browser-compatible synthetic workload; never invokes formal runtime or saves.
import * as legacy from '../model.mjs';
import * as incremental from './model.mjs';
import {createCheckpoint,appendTail,restore,POLICY} from './persistence.mjs';
const size=x=>new TextEncoder().encode(JSON.stringify(x)).length;
export function makeCommands({months=12,seed=1,pattern='focused'}={}){
 if(!Number.isSafeInteger(months)||months<1||!['focused','distributed','gap'].includes(pattern))throw Error('Invalid scenario');
 let randomState=seed,seq=0;const random=()=>((randomState=(Math.imul(randomState,1664525)+1013904223)>>>0)/4294967296),commands=[];
 const push=(type,...args)=>commands.push({type,args});
 const shops=['town','supermarket','bar','department'];for(const shop of shops)push('setContract',shop,'house',0);
 for(let month=0;month<months;month++){
  if(pattern==='gap'&&month%120>=12&&month!==months-1)continue;
  const id=`release:${month}`,bottles=54;push('registerRelease',{id,productId:`product:${month}`,brandId:'house',caskId:`cask:${month%4}`,generation:1+Math.floor(month/360),bottledMonth:month,bottles,age:12+Math.floor(random()*180),price:20+Math.floor(random()*50),profile:{smoke:Math.floor(random()*6),wood:Math.floor(random()*6)},appearance:{bottle:month%2?'round':'square',label:'amber'}});
  const targets=pattern==='distributed'?shops:[pattern==='focused'?'town':shops[Math.floor(random()*4)]];
  let remaining=bottles;
  for(let i=0;i<targets.length;i++){
   const shopId=targets[i],count=i===targets.length-1?remaining:Math.floor(bottles/targets.length);remaining-=count;
   const kind=shopId==='department'?'paid-procurement':'store-sell-through';if(kind==='store-sell-through')push('assignStock',id,shopId,count);
   push('applyTransaction',{seq:++seq,month,releaseId:id,shopId,count,revenueCents:count*1200,kind,status:'completed'});
  }
  push('compactRelease',id);
 }
 return commands;
}
export async function runScenario(options={}){
 const commands=makeCommands(options);let old=legacy.createModel(),model=incremental.createModel(),oldMs=0,newMs=0,legacyCopiedModelBytes=0,cachedBytes=size(old);
 incremental.resetMetrics();
 // Byte accounting is deliberately outside every timed mutation interval.
 // Serialization here affects wall time/GC, so these are comparative process
 // samples, not uncontaminated engine microbenchmarks or iPhone guarantees.
 for(const command of commands){
  legacyCopiedModelBytes+=cachedBytes;
  let start=performance.now();old=legacy[command.type](old,...command.args);oldMs+=performance.now()-start;
  cachedBytes=size(old);
  start=performance.now();model=incremental.applyCommand(model,command);newMs+=performance.now()-start;
 }
 const counters=incremental.getMetrics();if(legacy.canonical(old)!==incremental.canonical(model))throw Error('Model parity mismatch');
 const binding={revision:commands.length,sourceFingerprint:'a'.repeat(64),policyVersion:POLICY};
 let start=performance.now();const checkpoint=await createCheckpoint(model,binding);const checkpointMs=performance.now()-start;
 start=performance.now();const restored=await restore(JSON.parse(JSON.stringify(checkpoint)),binding);const restoreMs=performance.now()-start;
 if(incremental.canonical(restored.model)!==incremental.canonical(model))throw Error('Restore parity mismatch');
 return {model,result:{...options,commands:commands.length,transactions:model.cursor.seq,oldMs,newMs,speedup:oldMs/newMs,legacyCopiedModelBytes,incremental:counters,jsonBytes:size(model),legacyJsonBytes:size(old),checkpointBytes:size(checkpoint),checkpointMs,restoreMs,exactModelParity:true,exactRestoreParity:true,releaseCount:Object.keys(model.identities).length,descriptorCount:Object.keys(model.wines).length,storeCount:Object.keys(model.stores).length}};
}

export async function runTailScenario(options={months:12,seed:42,pattern:'focused'}){
 const commands=makeCommands(options),fingerprint='b'.repeat(64);
 const checkpoint=await createCheckpoint(incremental.createModel(),{revision:0,sourceFingerprint:fingerprint});
 let start=performance.now();const bundle=await appendTail(checkpoint,{revision:1,sourceFingerprint:fingerprint,commands});const appendMs=performance.now()-start;
 start=performance.now();const restored=await restore(JSON.parse(JSON.stringify(bundle)),{revision:1,sourceFingerprint:fingerprint,policyVersion:POLICY});const restoreMs=performance.now()-start;
 let expected=incremental.createModel();for(const command of commands)expected=incremental.applyCommand(expected,command);
 if(incremental.canonical(restored.model)!==incremental.canonical(expected))throw Error('Tail restore parity mismatch');
 return {...options,commands:commands.length,tailEntries:bundle.tail.length,appendMs,restoreMs,bundleBytes:size(bundle),checkpointBytes:size(checkpoint),exactRestoreParity:true};
}
