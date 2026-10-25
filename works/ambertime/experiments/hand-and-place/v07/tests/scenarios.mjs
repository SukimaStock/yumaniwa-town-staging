import * as M from '../model.mjs';import * as Old from '../../v06/model.mjs';import {writeFileSync} from 'node:fs';
const results=[];
for(const scenario of ['standard','scarce']){
 const s=M.create({seed:42,scenario}),count=Math.min(3,s.game.lots[0].stock);M.dispatch(s,{type:'allocate',lotId:1,count});
 if(count>1)M.dispatch(s,{type:'step'});
 const common=structuredClone(s),n=Math.min(2,s.game.lots[0].retail);
 if(n){const old=structuredClone(common.game);Old.dispatch(old,{type:'reclaim',lotId:1,count:n});Old.dispatch(old,{type:'deliver',lotId:1,shopId:'liquor',count:n,orderId:2});M.dispatch(s,{type:'retail-deliver',lotId:1,shopId:'liquor',count:n,orderId:2});if(JSON.stringify(old)!==JSON.stringify(s.game))throw Error('direct differs');}
 M.dispatch(s,{type:'bottle',jobId:1});const born=s.game.lots.at(-1),log=M.exportLog(s);M.replay(log);writeFileSync(new URL(`seed42-${scenario}.json`,import.meta.url),JSON.stringify(log)+'\n');results.push({scenario,seed:42,month:s.game.month,commands:s.commands,nativeValidation:M.validate(s),nativeEqualsOldPath:true,release:{id:born.id,sourceId:born.sourceId,ageMonths:born.ageMonths,hand:born.stock,retail:born.retail}});
}
writeFileSync(new URL('comparison.json',import.meta.url),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({ok:true,cases:results.length}));
