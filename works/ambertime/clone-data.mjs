// Private validation replay metadata only. All actual data uses native detached
// structuredClone, including aliases and checkpoint snapshots. No cache is saved.
let privateReplay=0;
const prefixes=new WeakMap();
const appendOnly=['events','arrivals','attempts'];
export function withPrivateReplay(run){privateReplay++;try{return run();}finally{privateReplay--;}}
export function isPrivateReplay(){return privateReplay>0;}
export function reactionPrefix(array){return privateReplay?Math.min(prefixes.get(array)??0,array.length):0;}
export function rememberReactionPrefix(array,length){if(privateReplay)prefixes.set(array,length);}
export function cloneReplayState(value){
 const detached=structuredClone(value);
 if(privateReplay&&value?.labConnection?.town&&detached?.labConnection?.town){
  for(const key of appendOnly){const before=value.labConnection.town[key],after=detached.labConnection.town[key];
   if(Array.isArray(before)&&Array.isArray(after)&&prefixes.has(before))prefixes.set(after,Math.min(prefixes.get(before),after.length));
  }
 }
 return detached;
}
