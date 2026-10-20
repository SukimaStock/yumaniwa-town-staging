import * as D from './partner-orders.mjs?v=0.43-staff-unlocks';
import {caskCreationIds} from './trade.mjs?v=0.38-cask-serials';
// This index is a disposable projection, never part of game state or a save.
export class CaskSerialIndex {
 constructor(ids=[]){this.numbers=new Map();for(const id of ids)this.add(id);}
 add(id){if(!Number.isInteger(id)||id<1||this.numbers.has(id))throw Error('たるの作成履歴が重複しています。');this.numbers.set(id,this.numbers.size+1);}
 observe(before,after){const previous=new Set(before?.core.casks.map(c=>c.id)??[]);for(const c of after.core.casks)if(!previous.has(c.id))this.add(c.id);}
}
export function createCaskSerials(){
 let lastState=null,token=null,index=new CaskSerialIndex();
 return state=>{
  if(state===lastState)return index.numbers;
  D.validateDistillery(state);
  const result=D.createProjectionReplay(state,({index:operationIndex,before,after})=>{
   if(operationIndex===-1){index=new CaskSerialIndex(state.origin?caskCreationIds(state.origin):[]);return;}
   index.observe(before,after);
  },token);
  token=result.token;lastState=state;return index.numbers;
 };
}
