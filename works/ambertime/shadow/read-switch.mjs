// Staging diagnostic only. Native results remain the compatibility oracle.
import {compactRemark,releaseLedgerAggregate,storeLedgerAggregate} from './read-contract.mjs?consignment=night-stage4-v01';
import {canonical} from '../../ambertime-strategy-lab/internal/model.mjs';
export const READ_FEATURES=Object.freeze(['remarks','releaseLedger','storeLedger','oldWineDialogue']);
const pick=(row,keys)=>Object.fromEntries(keys.map(k=>[k,row[k]]));
const releaseKeys=['releaseId','productId','stock','retail','deliveries'];
const storeKeys=['count','revenue','firstMonth','lastMonth','startedMonth'];
const ready=result=>{if(result?.status!=='ready')throw Error(result?.reason??'missing-read-information');return result.value;};
function project(feature,state,args,legacy){
 if(feature==='remarks')return compactRemark(state,args);
 if(feature==='releaseLedger')return {...legacy,entries:legacy.entries.map(row=>{
  if(row.kind!=='release')return row;
  const value=ready(releaseLedgerAggregate(state,row.releaseId));
  return {...row,...pick(value,releaseKeys)};
 })};
 if(feature==='storeLedger')return legacy.map(row=>({...row,...pick(ready(storeLedgerAggregate(state,row.id)),storeKeys)}));
 if(feature==='oldWineDialogue'){
  if(!legacy)return null;
  const chosen=state.reader.chosen.find(x=>x.id===legacy.id);
  if(!chosen)throw Error('chosen-dialogue-not-observed');
  return structuredClone(chosen);
 }
 throw Error('unsupported-read-feature');
}
function comparable(feature,value){
 if(feature==='remarks')return pick(value,['key','text']);
 if(feature==='releaseLedger')return value.entries.filter(r=>r.kind==='release').map(r=>pick(r,releaseKeys));
 if(feature==='storeLedger')return value.map(r=>pick(r,['id',...storeKeys]));
 return value;
}
export function createReadSwitch({features={},snapshot,clock=()=>performance.now(),projectRead=project}={}){
 const enabled=Object.fromEntries(READ_FEATURES.map(f=>[f,features[f]===true]));
 const counters=Object.fromEntries(READ_FEATURES.map(f=>[f,{compact:0,fallback:0}]));
 const events=[];let totalMs=0,reads=0;
 function record(feature,source,reason,ms){counters[feature][source==='compact'?'compact':'fallback']++;reads++;totalMs+=ms;events.push({feature,source,reason,milliseconds:ms});if(events.length>32)events.shift();}
 return {
  read(feature,native,legacy,args={}){
   if(!enabled[feature])return legacy;
   const begin=clock();
   try{
    const {state,status,last,error}=snapshot();
    if(status!=='active'||!state)throw Error(error??'shadow-'+status);
    if(last!==native)throw Error('unconfirmed-or-unsynchronized-state');
    const candidate=projectRead(feature,state,args,legacy);
    if(canonical(comparable(feature,candidate))!==canonical(comparable(feature,legacy)))throw Error('read-result-mismatch');
    record(feature,'compact',null,clock()-begin);return candidate;
   }catch(error){record(feature,'native',String(error?.message??error),clock()-begin);return legacy;}
  },
  report(){return {enabled:{...enabled},counters:structuredClone(counters),events:structuredClone(events),reads,totalMs};}
 };
}
