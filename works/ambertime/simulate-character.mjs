import {newJourney,tick,choose,currentCask,serializeJourney,restoreJourney} from './journey.mjs';
export function simulateCharacter(seed,policy){
 let j=newJourney(seed),guard=0;
 while(j.phase!=='finished'&&guard++<100){
  if(j.phase==='choice'){const key=policy==='early'?'bottle':policy==='cool'&&j.pending.options.some(o=>o.id==='cool')?'cool':j.pending.options.some(o=>o.id==='wait')?'wait':'last';j=choose(j,key);}
  else j=tick(j);
 }
 if(j.phase!=='finished')throw Error(`unfinished ${seed}/${policy}`);
 if(JSON.stringify(restoreJourney(serializeJourney(j)))!==JSON.stringify(j))throw Error('roundtrip mismatch');
 return {seed,policy,type:j.result.type,cut:j.result.cut,age:j.result.age,litres:j.result.litres,bottles:j.result.bottles,cash:j.result.cash,upkeep:j.result.upkeep,evaporated:j.result.evaporated,profile:j.result.profile,events:j.choices.map(c=>c.event)};
}
export function simulateAll(){
 const rows=[];for(let seed=1;seed<=100;seed++)for(const policy of ['early','wait','cool'])rows.push(simulateCharacter(seed,policy));
 const average=(rows,key)=>rows.reduce((n,r)=>n+r[key],0)/rows.length;
 return {runs:rows.length,summary:['early','wait','cool'].map(policy=>{const a=rows.filter(r=>r.policy===policy);return {policy,age:average(a,'age'),litres:average(a,'litres'),bottles:average(a,'bottles'),cash:average(a,'cash'),minCash:Math.min(...a.map(r=>r.cash)),minAge:Math.min(...a.map(r=>r.age)),maxAge:Math.max(...a.map(r=>r.age)),paths:[...new Set(a.map(r=>r.events.join('/')))]};}),rows};
}
if(import.meta.url===`file://${process.argv[1]}`)console.log(JSON.stringify(simulateAll(),null,2));
