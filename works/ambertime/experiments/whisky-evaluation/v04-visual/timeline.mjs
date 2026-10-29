import * as M from '../v03/model.mjs';
import {SCENARIOS} from '../v03/scenarios.mjs';

// Checkpoints are actual immutable v03 states. No extra month or sale is invented
// for presentation: final action history is exactly the canonical v03 scenario.
export function visualTrace({seed=20261029,shopId='bar',scenario='A',policy='support'}={}){
 const definition=SCENARIOS.find(x=>x.id===scenario);
 if(!definition||!M.SHOPS.some(x=>x.id===shopId))throw Error('比較する経過と店を選んでください。');
 let session=M.create({seed,policy});const frames=[];
 session=M.transact(session,{type:'advance',months:1});
 definition.steps.forEach((spec,index)=>{
  session=M.transact(session,{type:'next',...spec});const productId=session.sales.selectedId;
  session=M.transact(session,{type:'place',shopId,portion:'all'});
  session=M.transact(session,{type:'confirm'});
  frames.push({phase:'delivery',release:index+1,productId,month:session.sales.month,session});
  session=M.transact(session,{type:'advance',months:6});
  frames.push({phase:'sales',release:index+1,productId,month:session.sales.month,session});
  const count=session.sales.products.find(p=>p.id===productId).shops[shopId];
  if(count)session=M.transact(session,{type:'recall',productId,shopId,count});
 });
 return {scenario,shopId,seed,policy,frames,state:session};
}
