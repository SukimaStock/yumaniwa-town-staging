import * as D from '../../partner-orders.mjs';
import {ageCask} from '../../model.mjs';
import {fill} from '../../tests/brands-helpers.mjs';
const seeds=[1,42,99,12345,20261014,20261018,987654321,4294967295],rows=[];
import {flavorType} from '../../flavor-types.mjs';
function classify(c){return flavorType(c).id;}
for(const seed of seeds)for(let stop=30;stop<=99;stop++)for(const type of ['refill','bourbon']){let s=fill(D.newStaffDistillery(seed),{progress:stop,type}),c=s.core.casks.at(-1);for(let age=0;age<=120;age++){rows.push({seed,stop,type,age,r:c.roughness,a:c.character,w:c.wood,flavor:classify(c),association:flavorType(c).association});c=ageCask(c);}}
const counts={},byType={},byAge={},examples={},trajectories=[];let associations=0;for(const c of rows){counts[c.flavor]=(counts[c.flavor]||0)+1;byType[c.type]??={};byType[c.type][c.flavor]=(byType[c.type][c.flavor]||0)+1;byAge[c.age]??={};byAge[c.age][c.flavor]=(byAge[c.age][c.flavor]||0)+1;examples[c.flavor]??=c;if(c.association)associations++;}
let shortFlips=[];for(let start=0;start<rows.length;start+=121){let runs=[];for(const c of rows.slice(start,start+121)){if(runs.at(-1)?.flavor===c.flavor)runs.at(-1).end=c.age;else runs.push({flavor:c.flavor,start:c.age,end:c.age});}if(runs.some((r,i)=>i>0&&i<runs.length-1&&r.end-r.start<2))shortFlips.push({seed:rows[start].seed,stop:rows[start].stop,type:rows[start].type,runs});trajectories.push(runs.length);}
const ranges={};for(const k of ['r','a','w'])ranges[k]=rows.reduce((v,r)=>[Math.min(v[0],r[k]),Math.max(v[1],r[k])],[Infinity,-Infinity]);
console.log(JSON.stringify({n:rows.length,ranges,counts,associations,byType,byAge,examples,trajectoryRunRange:[Math.min(...trajectories),Math.max(...trajectories)],shortFlips:shortFlips.slice(0,10),shortFlipTrajectories:shortFlips.length},null,2));
