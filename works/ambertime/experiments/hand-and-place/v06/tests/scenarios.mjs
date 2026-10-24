import * as M from '../model.mjs';import {writeFileSync} from 'node:fs';
const results=[];
const act=(s,type,args={})=>M.dispatch(s,{type,...args});
function step(s,n){for(let i=0;i<n;i++)act(s,'step');}
function send(s,shopId,lotId,count){const o=s.orders.find(o=>o.shopId===shopId&&o.status==='open');if(s.mode==='A'){act(s,'select-order',{orderId:o.id});act(s,'select-card',{lotId});return act(s,'deliver');}return act(s,'deliver',{shopId,lotId,count,orderId:o?.id??null});}
function save(s,name){const log=M.exportLog(s);M.replay(log);if(!M.validate(s).ok)throw Error(JSON.stringify(M.validate(s)));writeFileSync(new URL(name+'.json',import.meta.url),JSON.stringify(log)+'\n');return {mode:s.mode,scenario:s.initialScenario,month:s.month,actions:s.actions.length,decisions:s.actions.filter(a=>['deliver','allocate','reclaim','rebrew','bottle'].includes(a.type)).length,hand:s.lots.map(l=>({id:l.id,stock:l.stock,retail:l.retail??0,sold:l.retailSold??0})),deliveries:s.deliveries.map(d=>({id:d.id,lotId:d.lotId,shopId:d.shopId,count:d.count,orderId:d.orderId})),openWishes:s.orders.filter(o=>o.status==='open'),validation:M.validate(s)};}
for(const scenario of ['standard','scarce'])for(const mode of ['A','B','C']){
 const s=M.create({seed:42,scenario,mode});if(mode!=='A')act(s,'allocate',{lotId:2,count:Math.min(3,s.lots[1].stock)});
 send(s,'restaurant',1,Math.min(2,s.lots[0].stock));send(s,'liquor',3,Math.min(2,s.lots[2].stock));step(s,2);
 if(mode==='C'&&s.lots[1].retail>0){act(s,'reclaim',{lotId:2,count:1});send(s,'restaurant',2,1);}
 act(s,'rebrew',{lotId:1});const jobId=s.jobs.at(-1).id;step(s,25);act(s,'bottle',{jobId});
 if(mode!=='A')act(s,'allocate',{lotId:s.lots.at(-1).id,count:1});
 results.push(save(s,`seed42-${scenario}-${mode}`));
}
const c=M.create();act(c,'allocate',{lotId:1,count:6});step(c,1);act(c,'reclaim',{lotId:1,count:3});send(c,'liquor',1,3);step(c,4);results.push(save(c,'seed42-reassign-C'));
writeFileSync(new URL('comparison.json',import.meta.url),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({ok:true,cases:results.length}));
