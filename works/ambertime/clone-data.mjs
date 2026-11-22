// All data copies remain native structuredClone with full detachment and aliases.
// Private synchronous replay tracks only quantized append-only prefix lengths.
let privateReplay=0;
const prefixes=new WeakMap();
const appendOnly=['events','arrivals','attempts'];
export function withPrivateReplay(run){privateReplay++;try{return run();}finally{privateReplay--;}}
export function isPrivateReplay(){return privateReplay>0;}
export function reactionPrefix(array){return privateReplay?Math.min(prefixes.get(array)??0,array.length):0;}
export function rememberReactionPrefix(array,length){if(privateReplay)prefixes.set(array,length);}
export function cloneReplayState(value){
 const detached=structuredClone(value);
 const connection=privateReplay&&value&&typeof value==='object'?Object.getOwnPropertyDescriptor(value,'labConnection')?.value:null;
 const town=connection&&typeof connection==='object'?Object.getOwnPropertyDescriptor(connection,'town')?.value:null;
 if(town&&detached?.labConnection?.town){
  for(const key of appendOnly){const before=Object.getOwnPropertyDescriptor(town,key)?.value,after=detached.labConnection.town[key];
   if(Array.isArray(before)&&Array.isArray(after)&&prefixes.has(before))prefixes.set(after,Math.min(prefixes.get(before),after.length));
  }
 }
 return detached;
}
