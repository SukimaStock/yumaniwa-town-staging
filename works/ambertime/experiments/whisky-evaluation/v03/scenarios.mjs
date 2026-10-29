import * as M from './model.mjs';
const bottle=(sample,years)=>({sample,years,tier:'standard'});
export const SCENARIOS=[
 {id:'A',label:'同じ味を続ける',steps:Array.from({length:5},()=>bottle('smoke',20))},
 {id:'B',label:'少しずつ変える',steps:[20,15,10,8,6].map(y=>bottle('smoke',y))},
 {id:'C',label:'大きく方向転換する',steps:[bottle('smoke',20),bottle('smoke',20),bottle('balanced',3),bottle('balanced',3),bottle('balanced',3)]},
 {id:'D',label:'以前の味に戻す',steps:[bottle('smoke',20),bottle('smoke',20),bottle('balanced',3),bottle('balanced',3),bottle('smoke',20)]}
];
export function traceScenario({seed=20261029,shopId='specialist',scenario='A',policy='support'}={}){
 const definition=SCENARIOS.find(x=>x.id===scenario);if(!definition||!M.SHOPS.some(x=>x.id===shopId))throw Error('比較する経過と店を選んでください。');
 return traceSteps({seed,shopId,policy,steps:definition.steps,scenario});
}
export function traceSteps({seed=20261029,shopId='specialist',policy='support',steps,scenario='custom'}={}){
 if(!Array.isArray(steps)||!steps.length||steps.length>10)throw Error('試作の経過を確認してください。');
 let state=M.create({seed,policy});const observations=[];
 state=M.transact(state,{type:'advance',months:1});
 for(const spec of steps){
  state=M.transact(state,{type:'next',...spec});const id=state.sales.selectedId;
  state=M.transact(state,{type:'place',shopId,portion:'all'});state=M.transact(state,{type:'confirm'});
  state=M.transact(state,{type:'advance',months:6});
  observations.push({productId:id,month:state.sales.month,spec,view:M.shopView(state,shopId,id),summary:M.productSummary(state,id),checkpoint:state});
  const count=state.sales.products.find(p=>p.id===id).shops[shopId];if(count)state=M.transact(state,{type:'recall',productId:id,shopId,count});
 }
 return {scenario,shopId,seed,policy,state,observations};
}
export const playScenario=options=>traceScenario(options).state;
export const compareScenarios=options=>SCENARIOS.map(x=>traceScenario({...options,scenario:x.id}));
