import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../model.mjs';
import * as D from '../../../partner-orders.mjs';
import {ageCask} from '../../../model.mjs';
import {PARAMETERS as P} from '../../../parameters.mjs';

test('authentic aroma-a batch and seeded aging equal current production operations',()=>{
 for(const seed of [20261020,42])for(const stop of [30,66,99])for(const type of ['bourbon','refill']){
  let s=D.startDistillation(D.newStaffDistillery(seed));while(s.still.distillation.progress<stop)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),type);let c=s.core.casks[0];for(let n=0;n<24;n++)c=ageCask(c);
  const actual=L.generateCask({seed,stop,type,months:24});for(const key of ['roughness','character','wood','litres','variation','cut','age'])assert.deepEqual(actual[key],c[key]);
 }
});
test('same input reproduces scores, disjoint judge winners, no direct age bonus',()=>{
 const fixtures=[[99,'bourbon',6],[66,'refill',24],[50,'bourbon',36]].map(([stop,type,months])=>L.generateCask({stop,type,months}));
 const winners=L.JUDGES.map((j,i)=>fixtures.map(L.judge).map(e=>e.judges[i].score).indexOf(Math.max(...fixtures.map(c=>L.judge(c).judges[i].score))));assert.equal(new Set(winners).size,3);
 for(const c of fixtures){assert.deepEqual(L.judge(c),L.judge(structuredClone(c)));assert.deepEqual(L.judge(c),L.judge({...c,age:999}));}
 const strong=fixtures[0];assert(L.judge(strong).judges[2].score>L.judge({...strong,roughness:1}).judges[2].score);
 const oak=fixtures[2];assert(L.judge(oak).judges[0].score>L.judge({...oak,wood:1.35}).judges[0].score);
});
test('aging can improve one judge then worsen, overwood naturally loses aroma and bottles',()=>{
 const at=n=>L.generateCask({stop:66,type:'bourbon',months:n});const a=at(0),b=at(36),c=at(120);
 assert(L.judge(b).judges[0].score>L.judge(a).judges[0].score);assert(L.judge(c).judges[0].score<L.judge(b).judges[0].score);assert(c.character<b.character);assert(L.bottles(c)<L.bottles(a));
});
test('condition reset is identical; evaporation alters only volumes, including initial ages',()=>{
 const base=L.createSession(),copy=structuredClone(base);assert.deepEqual(L.createSession(),base);
 for(const evaporation of ['current','strong','cool','warm']){const s=L.createSession({evaporation});for(let i=0;i<4;i++){for(const key of ['roughness','character','wood','age'])assert.equal(s.casks[i][key],base.casks[i][key]);const c=s.casks[i],rate=P.casks[c.type].evaporation*c.variation.evaporation;assert(Math.abs(c.litres-c.initialLitres*(1-rate*L.CONDITIONS.evaporation[evaporation])**c.age)<1e-10);}const aged=L.advance(s,6);for(let i=0;i<4;i++)for(const key of ['roughness','character','wood'])assert.equal(aged.casks[i][key],L.advance(base,6).casks[i][key]);}
 assert.deepEqual(base,copy);
});
test('sample loss is exact; future evaporation applies to remaining liquid, old result frozen',()=>{
 for(const consumption of ['none','small','large'])for(const evaporation of ['current','strong']){
  const initial=L.createSession({consumption,evaporation}),before=structuredClone(initial),s=L.submit(initial,2),used=L.CONDITIONS.consumption[consumption];assert.equal(s.casks[1].litres,initial.casks[1].litres-used);assert.equal(s.history[0].profile.litres,initial.casks[1].litres);
  const aged=L.advance(s,12),rate=P.casks[s.casks[1].type].evaporation*s.casks[1].variation.evaporation*L.CONDITIONS.evaporation[evaporation];assert(Math.abs(aged.casks[1].litres-s.casks[1].litres*(1-rate)**12)<1e-10);assert.deepEqual(initial,before);assert.deepEqual(aged.history,s.history);
 }
});
test('exhausted liquid refuses sampling with no mutation; zero-cost cannot submit empty cask',()=>{
 const s=L.createSession({consumption:'large'});s.casks[0].litres=.1;const raw=JSON.stringify(s);assert.throws(()=>L.submit(s,1));assert.equal(JSON.stringify(s),raw);s.consumption='none';s.casks[0].litres=0;assert.throws(()=>L.submit(s,1));
});
test('four-slot sell/replace retires barrel, preserves other barrels, records real bottles',()=>{
 const s=L.submit(L.createSession(),1),old=structuredClone(s),next=L.replace(s,1,{stop:30,type:'bourbon'});assert.equal(next.casks.length,4);assert.equal(next.casks[0].id,5);assert.equal(next.casks[0].age,0);assert.equal(next.sold[0].bottles,L.bottles(s.casks[0]));assert.deepEqual(next.casks.slice(1),s.casks.slice(1));assert.deepEqual(s,old);assert.throws(()=>L.submit(next,1));assert.deepEqual(next.history,s.history);
});
test('all strategies have four real barrels; repeated batch identical; bounded invalid input',()=>{
 for(const {id} of L.STRATEGIES)assert.equal(L.createSession({strategy:id}).casks.length,4);
 const r=L.createSession({strategy:'repeat'});assert.equal(new Set(r.casks.map(c=>JSON.stringify([c.roughness,c.character,c.wood,c.litres]))).size,1);
 assert.throws(()=>L.generateCask({stop:100}));assert.throws(()=>L.generateCask({type:'sherry'}));assert.throws(()=>L.createSession({seed:0}));assert.throws(()=>L.advance(L.createSession(),121));assert.throws(()=>L.advance(L.createSession(),60));
});
