import test from 'node:test';
import assert from 'node:assert/strict';
import {createCollector,advanceCollector,prepareRecall,commitRecall} from './collector.mjs';
import {NODES} from '../town-connection.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const place=NODES.find(n=>n.level==='全国')?.id??NODES[0].id;
function rig(){
 let game={seed:42,core:{month:0,casks:[]},brands:[],releases:[],shop:{relations:[],deliveries:[]},generations:{active:{id:1,phase:'working'},completed:[]},labConnection:{town:{events:[],shipments:[],releases:[]}}};
 let c=createCollector('small');advanceCollector(c,{index:-1,operation:null,before:null,after:game});
 const add=(type,month,sourceId=null)=>{const before=clone(game);game.core.month=month;const id='e'+(game.labConnection.town.events.length+1);game.labConnection.town.events.push({id,type,month,sourceId,releaseId:1,to:place,from:place,channel:'rumor'});advanceCollector(c,{index:c.observer.index+1,operation:{key:'month'},before,after:game});return id;};
 return {add,get game(){return game;},get c(){return c;},resume(){c=clone(c);}};
}
test('pruned exact arrival recovers from native state and stays eligible after later arrivals',()=>{
 const r=rig(),root=r.add('release',0),first=r.add('arrival',1,root),middle=r.add('arrival',2,root);r.add('arrival',3,root);
 assert(!r.c.active['arrival:'+middle]);assert(!r.c.facts['arrival:'+middle]);r.resume();
 const visit=r.add('visit',4,middle);assert(r.c.active['arrival:'+middle]);assert.equal(r.c.recovered,1);
 r.add('arrival',5,root);r.add('arrival',6,root);assert(r.c.active['arrival:'+middle]);
 assert.equal(r.c.proofs['visit:'+visit].sourceId,'arrival:'+middle);
 r.game.generations.active.phase='review';const untouched=JSON.stringify(r.game),prepared=prepareRecall(r.c,r.game,r.c.observer.index+1);
 assert.equal(JSON.stringify(r.game),untouched);assert.equal(r.game.generations.active.id,1);
 assert(prepared.scenes.some(s=>s.eventId==='arrival:'+middle));assert(prepared.scenes.some(s=>s.eventId==='visit:'+visit&&s.links.some(l=>l.causal&&l.role==='主場面間')));
 const before=clone(r.game);r.game.generations.completed.push({id:1,endedMonth:6});r.game.generations.active={id:2,phase:'working'};
 advanceCollector(r.c,{index:r.c.observer.index+1,operation:{key:'generation-handover'},before,after:r.game});
 const bad=clone(prepared);bad.boundary.month=999;assert.throws(()=>commitRecall(r.c,bad,r.game),/checksum/);
 commitRecall(r.c,prepared,r.game);const frozen=JSON.stringify(r.c.completed);r.add('visit',400,first);assert.equal(JSON.stringify(r.c.completed),frozen);
 assert.equal(r.c.completed[0].scenes.some(s=>s.month>6),false);
});
test('same-region response without a source arrival is not causal; no padding empty recall',()=>{
 const r=rig();r.game.generations.active.phase='review';assert.equal(prepareRecall(r.c,r.game,0).scenes.length,0);
 const root=r.add('release',0);r.add('arrival',1,root);const visit=r.add('visit',200,root);
 const recall=prepareRecall(r.c,r.game,r.c.observer.index+1);const scene=recall.scenes.find(s=>s.eventId==='visit:'+visit);
 assert(scene);assert(!scene.links.some(l=>l.causal));assert(scene.links.some(l=>l.type==='再登場'));
 const again=prepareRecall(clone(r.c),clone(r.game),r.c.observer.index+1);assert.deepEqual(again,recall);
});
