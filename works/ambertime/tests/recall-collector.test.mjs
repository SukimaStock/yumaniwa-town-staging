import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
import {initializeRecall,advanceRecall,prepareRecall,assertRecall,readCompletedRecalls} from '../recall/collector.mjs';
import {NODES} from '../town-connection.mjs';
const clone=structuredClone;
function nativeRig(){let game=D.newMarketRulesDistillery(42),recall=initializeRecall(game),history=initializeHistoryRecord(game);return {get game(){return game;},get recall(){return recall;},get history(){return history;},step(fn){const before=game,next=fn(game),prior=JSON.stringify(recall);const updated=advanceRecall(before,next,recall);assert.equal(JSON.stringify(recall),prior);history=advanceHistoryRecord(before,next,history);game=next;recall=updated;assertRecall(game,recall,history);}};}
function fill(r){r.step(D.startRangeDistillation);while(r.game.still.distillation.progress<24)r.step(D.distillStep);r.step(D.beginCollection);while(r.game.still.distillation.progress<36)r.step(D.distillStep);r.step(D.stopDistillation);r.step(s=>D.fillBarrel(s,'bourbon'));}
const place=NODES.find(n=>n.level==='全国').id;
function townRig(){
 let game={seed:42,origin:null,operations:[],core:{month:0,casks:[]},brands:[],releases:[],shop:{relations:[],deliveries:[]},generations:{active:{id:1,startedMonth:0,phase:'working'},completed:[]},labConnection:{town:{events:[],shipments:[],releases:[]}}},c=initializeRecall(game);
 const step=(key,fn,value)=>{const before=game;game=clone(game);fn(game);game.operations.push({key,...(value?{value}:{})});c=advanceRecall(before,game,c);assertRecall(game,c);};
 return {get game(){return game;},get c(){return c;},step,add(type,month,sourceId=null){const id='e'+(game.labConnection.town.events.length+1);step('month',g=>{g.core.month=month;g.labConnection.town.events.push({id,type,month,sourceId,releaseId:1,to:place,from:place,channel:'rumor'});});return id;},review(){step('month',g=>g.generations.active.phase='review');},handover(prepared){const before=game,next=clone(game);next.generations.completed.push({id:1,startedMonth:0,endedMonth:game.core.month});next.generations.active={id:2,startedMonth:game.core.month,phase:'working'};next.operations.push({key:'generation-handover',value:{id:1}});const candidate=advanceRecall(before,next,c,{prepared});game=next;c=candidate;assertRecall(game,c);},resume(){c=JSON.parse(JSON.stringify(c));assertRecall(game,c);}};
}
test('fresh-only initialization, immutable increments and explicit compound boundary',()=>{
 const r=nativeRig(),started=D.startRangeDistillation(r.game);assert.throws(()=>initializeRecall(started));
 const skipped=D.beginCollection(D.distillStep(D.startRangeDistillation(r.game)));assert.throws(()=>advanceRecall(r.game,skipped,r.recall),/separately/);
 r.step(D.startRangeDistillation);const corrupt=clone(r.recall);corrupt.observer.index--;assert.throws(()=>assertRecall(r.game,corrupt));
});
test('batch start, fill and distinct releases reuse formal provenance and S4',()=>{
 const r=nativeRig();fill(r);const id=r.game.core.casks[0].id;r.step(s=>D.bottleBranded(s,id,{},1));r.step(s=>D.bottleBranded(s,id,{},D.quote(s,id).count));
 assert.equal(Object.values(r.recall.facts).filter(e=>e.kind==='bottling').length,2);
 for(const e of Object.values(r.recall.facts).filter(e=>e.kind==='bottling')){assert.equal(e.originReference,true);assert.equal(e.scene,undefined);assert.equal(e.label,undefined);assert(r.game.releases.some(r=>r.id===e.ids.releaseId));}
 const bad=clone(r.recall);Object.values(bad.facts).find(e=>e.kind==='bottling').ids.releaseId=999;assert.throws(()=>assertRecall(r.game,bad,r.history));
});
test('pruned causal source reconstructs from native positions, then remains pinned',()=>{
 const r=townRig(),root=r.add('release',0),first=r.add('arrival',1,root),middle=r.add('arrival',2,root);r.add('arrival',3,root);assert.equal(r.c.facts['arrival:'+middle],undefined);r.resume();
 const visit=r.add('visit',4,middle);assert.equal(r.c.recovered,1);r.add('arrival',5,root);r.add('arrival',6,root);assert(r.c.active['arrival:'+middle]);r.review();
 const before=JSON.stringify(r.game),prepared=prepareRecall(r.c,r.game);assert.equal(JSON.stringify(r.game),before);assert.equal(r.game.generations.active.id,1);
 assert(prepared.scenes.some(s=>s.eventId==='visit:'+visit&&s.links.some(l=>l.causal&&l.role==='主場面間')));assert(prepared.scenes.some(s=>s.eventId==='arrival:'+middle));
 const broken=clone(prepared);broken.scenes[0].sentence='tampered';assert.throws(()=>r.handover(broken),/checksum/);assert.equal(r.game.generations.active.id,1);
 r.handover(prepared);const fixed=JSON.stringify(readCompletedRecalls(r.c));r.add('visit',400,first);assert.equal(JSON.stringify(readCompletedRecalls(r.c)),fixed);r.resume();
 const output=readCompletedRecalls(r.c,1);output.scenes.length=0;assert.notEqual(readCompletedRecalls(r.c,1).scenes.length,0);
});
test('same region without source path has no causal link; stale preparation rejected',()=>{
 const r=townRig(),root=r.add('release',0);r.add('arrival',1,root);const visit=r.add('visit',200,root);r.review();const p=prepareRecall(r.c,r.game);
 assert(!p.scenes.find(s=>s.eventId==='visit:'+visit).links.some(l=>l.causal));
 r.step('generation-notice',()=>{}, {id:1});assert.throws(()=>r.handover(p),/Stale/);assert.equal(r.c.completed.length,0);
});
test('reader rejects missing and corrupt causal positions, counts and pin references',()=>{
 const r=townRig(),root=r.add('release',0),arrival=r.add('arrival',1,root);r.add('visit',2,arrival);
 for(const mutate of [c=>c.observer.positionBlocks[1].first++,c=>c.observer.counts.town++,c=>c.proofs[Object.keys(c.proofs)[0]].chain[0].sourceId='e3',c=>c.pins[Object.keys(c.pins)[0]]++]){const bad=clone(r.c);mutate(bad);assert.throws(()=>assertRecall(r.game,bad));}
 const game=clone(r.game);game.labConnection.town.events[0].sourceId='e3';assert.throws(()=>assertRecall(game,r.c),/Cyclic|Future/);
});
