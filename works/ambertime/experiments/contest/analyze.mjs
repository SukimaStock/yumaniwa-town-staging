import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as L from './model.mjs';
const seeds=[20261020,42,7181],stops=[30,50,66,99],types=['bourbon','refill'],ages=[0,6,12,24,36,48,72,96,120];
const summary=c=>({seed:c.recipe.seed,stop:c.recipe.stop,type:c.type,age:c.age,roughness:c.roughness,character:c.character,wood:c.wood,litres:c.litres,bottles:L.bottles(c),...L.judge(c)});
const population=[];
for(const seed of seeds)for(const stop of stops)for(const type of types)for(const months of ages)population.push(summary(L.generateCask({seed,stop,type,months})));
const ranked=key=>[...population].sort((a,b)=>key(b)-key(a));
const winners=L.JUDGES.map((j,i)=>({judge:j.id,top:ranked(c=>c.judges[i].score).slice(0,3)}));
const strategies=L.STRATEGIES.map(({id,name})=>{const s=L.createSession({strategy:id});return {id,name,interpretation:'Unequal prepared-age snapshots; coverage only, not a fair economic contest.',casks:s.casks.map(summary),totalBottles:s.casks.reduce((n,c)=>n+L.bottles(c),0),bestOverall:Math.max(...s.casks.map(c=>L.judge(c).total)),judgeCoverage:L.JUDGES.map((j,i)=>({judge:j.id,score:Math.max(...s.casks.map(c=>L.judge(c).judges[i].score))}))};});
const trajectories=[];
for(const stop of [30,66,99])for(const type of types)trajectories.push({stop,type,points:ages.map(months=>summary(L.generateCask({stop,type,months})))});
const losses=[];
for(const evaporation of Object.keys(L.CONDITIONS.evaporation))for(const consumption of Object.keys(L.CONDITIONS.consumption)){
 let s=L.createSession({strategy:'repeat',consumption,evaporation});const before=summary(s.casks[0]);
 for(let n=0;n<10;n++)s=L.submit(s,1);
 const afterSample=summary(s.casks[0]);s=L.advance(s,24);
 losses.push({evaporation,consumption,submissions:10,before,afterSample,after24:summary(s.casks[0]),consumed:s.history.reduce((n,r)=>n+r.consumed,0)});
}
const reference=L.judge(L.rival()),wins=population.filter(c=>c.total>reference.total);
const overall=ranked(c=>c.total);
const recipeCounts={};for(const c of overall.slice(0,12)){const k=c.stop+'/'+c.type;recipeCounts[k]=(recipeCounts[k]??0)+1;}
const results={version:'ambertime-contest/0.1',seed:L.DEFAULT_SEED,baseline:'10f05d83abbreviated-see-REPORT',grid:{seeds,stops,types,ages,count:population.length,warning:'Finite diagnostic grid, not proof over every recipe/seed.'},judging:'Equal arithmetic mean; independent experimental scores, no age/price/reputation term.',winners,overallTop:overall.slice(0,12),top12RecipeCounts:recipeCounts,reference,winCount:wins.length,strategies,trajectories,losses,limits:['Unequal preset age/capital; do not infer economic superiority.','No rewards: reason to enter and subjective enjoyment unverified.','Fixed judges/mean can produce a repeatable aggregate optimum despite individual diversity.','Same initial barrel can be resubmitted while liquid remains; consumption does not spend the whole hand.','Evaporation environment affects volume only; not a real maturation environment model.'],population};
results.baseline=JSON.parse(fs.readFileSync(new URL('../../../../.change-plans/ambertime-contest-lab/r0.lock.json',import.meta.url),'utf8')).plan.baseSha;
fs.writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({count:population.length,winners:winners.map(w=>({judge:w.judge,best:w.top.map(c=>({stop:c.stop,type:c.type,age:c.age,score:c.judges.find(j=>j.id===w.judge).score}))})),overallTop:overall.slice(0,5).map(c=>({stop:c.stop,type:c.type,age:c.age,total:c.total})),recipeCounts,reference:reference.total,winCount:wins.length,strategies:strategies.map(s=>({id:s.id,best:s.bestOverall,coverage:s.judgeCoverage}))},null,2));
