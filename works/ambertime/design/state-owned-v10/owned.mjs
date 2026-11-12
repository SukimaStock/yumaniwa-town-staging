// Lab-only economic stage. No object from the owner enters this private set.
const allowed=new WeakSet();
export function ownedStage(state,fn){allowed.add(state);try{return fn();}finally{allowed.delete(state);}}
export function copyCurrent(state){
 if(!allowed.has(state))throw Error('owned economic stage requires private boundary');
 const {labConnection,...current}=state,copy=structuredClone(current);
 // Archive is private, never a caller state and never returned without full detach.
 return Object.fromEntries(Object.keys(state).map(k=>[k,k==='labConnection'?labConnection:copy[k]]));
}
