// Independent source-gated formal replay experiment. No production imports.
import {createOwnedTownJournal} from '../town-v11/journal.mjs';
// Independent source review: these four operations do not read/write town.
// fill is excluded: automatic assignment can call partner action -> syncTown.
const safeKeys=new Set(['start','stop','price','list']);
let variant=process.env.AMBERTIME_REPLAY_VARIANT??'A',hooks={},session=null,active=null;
let metrics={};
export function configureLab(options={}) {
 if(session)throw Error('Cannot reconfigure active replay');
 variant=options.variant??variant;if(!['A','B','C'].includes(variant))throw Error('Unknown variant');hooks=options.hooks??{};metrics={variant,sessions:0,safeOperations:0,nativeOperations:0,omittedTownCopies:0,journalSegments:0,townMaterializations:0,keys:{}};
}
configureLab();
export const getLabMetrics=()=>structuredClone(metrics);
export function phase(name,detail){hooks[name]?.(detail);}
function replaceTown(s,town) {return {...s,labConnection:Object.fromEntries(Object.keys(s.labConnection).map(k=>[k,k==='town'?town:s.labConnection[k]]))};}
function projectClone(s,town) {
 const lab=s.labConnection,rest={...s,labConnection:Object.fromEntries(Object.entries(lab).filter(([k])=>k!=='town'))};
 const j=structuredClone(rest);j.labConnection=Object.fromEntries(Object.keys(lab).map(k=>[k,k==='town'?town:j.labConnection[k]]));return j;
}
function nodes(v,set=new Set()) {if(!v||typeof v!=='object'||set.has(v))return set;if(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype)throw Error('Non-plain game graph unsupported');set.add(v);for(const key of Reflect.ownKeys(v)){const d=Object.getOwnPropertyDescriptor(v,key);if(typeof key!=='string'||!('value'in d))throw Error('Special graph property unsupported');nodes(d.value,set);}return set;}
function certify(s) {
 const townNodes=nodes(s.labConnection.town),restNodes=nodes({...s,labConnection:Object.fromEntries(Object.entries(s.labConnection).filter(([k])=>k!=='town'))});
 if(restNodes.has(s.labConnection))throw Error('Cross-root connection alias unsupported');for(const node of townNodes)if(restNodes.has(node))throw Error('Town/current cross-boundary alias unsupported');
}
function materialize(s) {
 if(!session.journal)return s;
 if(s.labConnection?.town!==session.view)throw Error('Unexpected journal branch');
 const snapshot=session.journal.snapshot();hooks.afterSnapshot?.();const j=replaceTown(s,snapshot);session.journal=null;session.view=null;metrics.townMaterializations++;return j;
}
export function runPrivateReplay(run) {
 // Native enable-stage4 can validate recursively. Each replay owns an isolated
 // session; never reuse the parent journal, certification or clone interception.
 const parentSession=session,parentActive=active;metrics.sessions++;
 session={journal:null,view:null,certified:false};active=null;
 try {const result=run();const output=materialize(result);hooks.beforeReplayPublish?.();return output;}
 catch(error){hooks.abort?.();throw error;} finally {active=parentActive;session=parentSession;}
}
export function scopedApply(native,s,o,context,index) {
 if(!session)return native(s,o,context,index);
 hooks.onApplyBefore?.({index,key:o.key});
 const result=applyInner(native,s,o,context,index);
 hooks.onApplyAfter?.({index,key:o.key});return result;
}
function applyInner(native,s,o,context,index) {
 if(!session||variant==='A')return native(s,o,context,index);
 if(!safeKeys.has(o.key)||!s.labConnection?.town) {
  s=materialize(s);session.certified=false;metrics.nativeOperations++;return native(s,o,context,index);
 }
 if(!session.certified){certify(s);session.certified=true;}
 metrics.safeOperations++;metrics.keys[o.key]=(metrics.keys[o.key]??0)+1;
 const invoke=state=>{active={town:state.labConnection.town};try {const j=native(state,o,context,index);hooks.afterSafeOperation?.({index,key:o.key});return j;}finally{active=null;}};
 if(variant==='B')return invoke(s);
 if(!session.journal){session.journal=createOwnedTownJournal(s.labConnection.town);metrics.journalSegments++;}
 let result;
 session.journal.execute(view=>{session.view=view;result=invoke(replaceTown(s,view));if(result.labConnection?.town!==view)throw Error('Audited safe operation replaced town');},{afterWrite:hooks.afterTownWrite,beforeCommit:hooks.beforeTownCommit,afterCommit:hooks.afterTownCommit});
 return result;
}
export function tryOwnedClone(s) {
 if(!active||!s?.core||s.labConnection?.town!==active.town)return null;
 metrics.omittedTownCopies++;return {value:projectClone(s,active.town)};
}
