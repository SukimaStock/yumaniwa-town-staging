import assert from 'node:assert/strict';
import {levels,simulate,snapshot,dailyLevel,FRAMES} from '../core.mjs';
const solutions=[];
for(let ix=0;ix<levels.length;ix++){
 const l=levels[ix];let ghosts=[],seq=[];
 for(let n=0;n<3;n++){
 let best=null,score=-1;
 const oldHit=ghosts.at(-1)?.hit||l.targets.map(()=>false),oldOpen=ghosts.at(-1)?.open||l.keys.map(()=>false);
 for(let degrees=-178;degrees<=-2;degrees+=2)for(let speed=220;speed<=500;speed+=35){
 const shot={angle:degrees*Math.PI/180,speed},run=simulate(l,ghosts,shot);
 const timing=l.keys.reduce((sum,k)=>{const f=run.path.findIndex(p=>Math.hypot(p.x-k.x,p.y-k.y)<24);return sum+(f<0?0:2*(1-f/FRAMES));},0); const value=run.hit.filter(Boolean).length*10+run.open.filter(Boolean).length*8+timing;
 if(value>score){score=value;best=run;}
 if(run.hit.every(Boolean))break;
 }
 if(!best)break;
 assert(best.path.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=27&&p.x<=333&&p.y>=31&&p.y<=473));
 assert.equal(best.path.length,FRAMES);
 ghosts.push(snapshot(best));seq.push(best.shot);
 if(best.hit.every(Boolean))break;
 }
 const won=ghosts.at(-1).hit.every(Boolean);
 solutions.push({level:ix+1,won,shots:seq,hit:ghosts.at(-1).hit,open:ghosts.at(-1).open});
 console.log(JSON.stringify(solutions.at(-1)));
}
await import('node:fs/promises').then(fs=>fs.writeFile(new URL('./solutions.json',import.meta.url),JSON.stringify(solutions,null,2)));
assert(solutions.every(s=>s.won),'Every table must be solvable in three shots');
for(let seed=1;seed<31;seed++){const l=dailyLevel(seed);assert(l.targets.length>=3);assert.deepEqual(l,dailyLevel(seed));}
// A replay must reproduce the identical physical trajectory and retain past target hits.
const first=simulate(levels[2],[],solutions[2].shots[0]);
const again=simulate(levels[2],[],solutions[2].shots[0]);assert.deepEqual(first.path,again.path);
const prior=snapshot(first),before=JSON.stringify(prior);
const second=simulate(levels[2],[prior],solutions[2].shots[1]);
assert.equal(JSON.stringify(prior),before);
assert(first.open.every(v=>!v),'Current ball cannot open memory shutters');
assert(second.open[0],'Previous ball opens its shutter');
assert.equal(solutions[4].shots.length,3);
assert.equal(solutions[5].shots.length,3);
assert(first.hit.every((v,i)=>!v||second.hit[i]));
console.log('PASS: six tables, 30 generated boards, deterministic replay, immutable recorded paths, bounded coordinates and frame count.');
