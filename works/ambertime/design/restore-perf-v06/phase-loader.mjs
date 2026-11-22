export async function load(url,context,nextLoad){
 const result=await nextLoad(url,context);if(!url.startsWith('file:')||result.format!=='module')return result;
 let s=String(result.source),changed=false;
 const replace=(from,to)=>{if(!s.includes(from))throw Error('profiling source marker absent '+new URL(url).pathname+': '+from.slice(0,60));s=s.replace(from,to);changed=true;};
 const p=new URL(url).pathname;
 if(p.endsWith('/works/ambertime/development-save.mjs')){
  replace('session=JSON.parse(text);',"session=globalThis.__amberMeasure('sessionJSONParse',()=>JSON.parse(text));");
  replace("session=JSON.parse(decodeExactJSON(JSON.stringify(session.data),'session'));", "session=globalThis.__amberMeasure('sessionLosslessDecode',()=>JSON.parse(decodeExactJSON(JSON.stringify(session.data),'session')));");
  replace('const game=restore(lossless?expandLosslessGame(session.game):expandFormalGame(session.game));',"const expanded=globalThis.__amberMeasure('gameExpansion',()=>lossless?expandLosslessGame(session.game):expandFormalGame(session.game));const game=globalThis.__amberMeasure('officialNativeReader',()=>restore(expanded));");
  for(const [name,from] of [['slots','assertCaskSlots(game,session.caskSlots).slice()'],['ledger','assertRecentLedger(game,session.recentLedger)'],['history','assertHistoryRecord(game,session.historyRecord)'],['recall','assertRecall(game,session.recallRecord,historyRecord)']])replace('='+from+';','='+`globalThis.__amberMeasure('sidecar.${name}',()=>${from});`);
 }
 if(p.endsWith('/works/ambertime/partner-orders.mjs')){
  replace('s=JSON.parse(text);',"s=globalThis.__amberMeasure('nativeJSONParse',()=>JSON.parse(text));");
  replace("validateDistillery(s,{repairMissingBrandDesign:!placementMode(s)});return s;", "globalThis.__amberMeasure('officialNativeValidation',()=>validateDistillery(s,{repairMissingBrandDesign:!placementMode(s)}));return s;");
  const normal='for(let i=prefix?checkpoint.length:0;i<s.operations.length;i++)j=apply(j,s.operations[i],context,i);';
  const optimized='for(let i=prefix?checkpoint.length:0;i<s.operations.length;i++)j=withPrivateReplay(()=>apply(j,s.operations[i],context,i));';
  const loop=s.includes(optimized)?optimized:normal;replace(loop,`globalThis.__amberMeasure('operationReplay',()=>{globalThis.__amberOperation(s.operations.length-(prefix?checkpoint.length:0));${loop}});`);
  replace('j=E.endTasting(j);cache=clone(j);',"j=E.endTasting(j);cache=globalThis.__amberMeasure('checkpointCapture',()=>clone(j));");
  replace("assert(JSON.stringify(s)===JSON.stringify(j),'蒸留所の状態と操作の帳面が一致しません。');", "globalThis.__amberMeasure('finalStateEquality',()=>assert(JSON.stringify(s)===JSON.stringify(j),'蒸留所の状態と操作の帳面が一致しません。'));");
 }
 if(p.endsWith('/works/ambertime/clone-data.mjs')){
  replace('export function cloneReplayState(value){','function measuredCloneReplayState(value){');
  s+=`\nexport function cloneReplayState(value){return globalThis.__amberCopy('cloneReplayState',value,()=>measuredCloneReplayState(value));}\n`;
 }
 return changed?{...result,source:s}:result;
}

