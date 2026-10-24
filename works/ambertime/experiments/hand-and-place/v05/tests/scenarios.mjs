import * as M from '../../v04/model.mjs';
import {changesFrom} from '../view.mjs';
import {writeFileSync} from 'node:fs';
const cases=[];
for(const scenario of ['standard','scarce'])for(const kind of ['first-reorder','different-periods']){
 const results=[];
 for(const mode of ['A','B','C']){
  const s=M.create({seed:42,scenario});
  const act=a=>{const start=s.events.length;M.dispatch(s,a);changesFrom(s.events.slice(start));};
  const send=(orderId,lotId)=>[{type:'select-order',orderId},{type:'select-card',lotId},{type:'deliver'}].forEach(act);
  send(1,kind==='first-reorder'?1:2);if(kind==='different-periods')send(2,3);
  act({type:'step'});act({type:'step'});const log=M.exportLog(s);M.replay(log);
  results.push({mode,checksum:log.checksum,validation:M.validate(s)});
  if(mode==='B'){writeFileSync(new URL(`seed42-${scenario}-${kind}.json`,import.meta.url),JSON.stringify(log)+'\n');}
 }
 if(new Set(results.map(r=>r.checksum)).size!==1)throw Error('View changed game');
 cases.push({seed:42,scenario,kind,results});
}
writeFileSync(new URL('comparison.json',import.meta.url),JSON.stringify(cases,null,2)+'\n');console.log(JSON.stringify({ok:true,cases:cases.length,modes:3}));
