import {buildDistilleryHistory} from './distillery-history.mjs?v=stage4-r2';
// One ephemeral projection. The operation prefix and migration origin are exact;
// a partial extraction changes no history event until an operation records it.
let cachedKey=null,cachedHistory=null;
self.onmessage=({data})=>{
 const {requestId,state}=data;
 try{
  const key=JSON.stringify([state.seed,state.origin,state.operations]);
  if(key!==cachedKey){const history=buildDistilleryHistory(state);cachedKey=key;cachedHistory=history;}
  self.postMessage({requestId,history:cachedHistory});
 }catch{self.postMessage({requestId,error:true});}
};
