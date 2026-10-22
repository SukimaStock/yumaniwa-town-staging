import assert from "node:assert/strict";
import {distill,mature,expression,initial,fill,advance,bottle,validateState} from "./model.mjs";
const cuts=[[.12,.40],[.22,.54],[.30,.65],[.42,.78],[.58,.94],[.12,.75],[.28,.92],[.10,.90],[.38,.61],[.63,.89]];
const all=[];
for(const malt of ["plain","peat"])for(const ferment of ["short","long"])for(const cask of ["refill","first"])for(const [start,end] of cuts)all.push({malt,ferment,cask,start,end});
assert.equal(all.length,80);
assert.throws(()=>distill({...all[0],start:.6,end:.65}),/範囲/);
assert.notDeepEqual(distill(all[0]),distill({...all[0],malt:"peat"}));
assert.notDeepEqual(distill(all[0]),distill({...all[0],ferment:"long"}));
assert.notDeepEqual(distill(all[0]),distill({...all[0],start:.42,end:.78}));
let s=initial();
for(let i=0;i<4;i++)s=fill(s,all[i]);
assert.throws(()=>fill(s,all[4]),/4つ/);
assert.equal(validateState(s),true);
assert.deepEqual(advance(s,120),advance(s,120));
const aged=advance(s,120);
assert.ok(aged.barrels.every(b=>b.months===120));
for(const b of aged.barrels){assert.equal(b.label,expression(mature(b.spirit,b.months/12,b.choice.cask),b.spirit));}
const done=bottle(aged,aged.barrels[0].id);
assert.equal(done.barrels.length,3);
assert.deepEqual(advance(done,24).bottles,done.bottles);
const labels=new Set(),paths=new Set();let unchanged=0;
for(const c of all){
 let t=fill(initial(),c),seen=[t.barrels[0].label];
 for(let i=0;i<15;i++){t=advance(t,12);seen.push(t.barrels[0].label);labels.add(t.barrels[0].label)}
 paths.add(seen.join("|"));if(new Set(seen).size===1)unchanged++;
}
assert.ok(labels.size>=12);
assert.ok(paths.size>=20);
assert.ok(unchanged>0);
console.log(JSON.stringify({recipes:all.length,labels:labels.size,growthPaths:paths.size,unchanged},null,2));
