import test from 'node:test';
import assert from 'node:assert/strict';
import * as native from '../partner-orders.mjs';
import {createObservedModel} from '../recall/operations.mjs';

test('live outer calls preserve native results and observe both same-month UI operations',()=>{
 const seen=[],D=createObservedModel(native,event=>seen.push(event));
 let game=D.newMarketRulesDistillery(141),reference=native.newMarketRulesDistillery(141);
 assert.equal(seen.length,0);
 const initial=game.operations.length;
 const step=(name,...args)=>{const before=game,snapshot=JSON.stringify(before);game=D[name](game,...args);reference=native[name](reference,...args);assert.deepEqual(game,reference);assert.equal(JSON.stringify(before),snapshot);};
 step('selectFlavorCards',{malt:'plain',ferment:'short'});step('startRangeDistillation');
 assert.deepEqual(seen.map(x=>x.operation.key),['flavor-cards','start']);
 assert.deepEqual(seen.map(x=>x.index),[initial,initial+1]);
 assert.equal(seen[0].after,seen[1].before);
 assert.deepEqual(seen[1].operation.value,{collectionVersion:2});
 for(let i=0;i<24;i++)step('distillStep');
 assert.equal(seen.length,2);
 step('beginCollection');for(let i=0;i<12;i++)step('distillStep');
 step('stopDistillation');step('fillBarrel','bourbon');step('tickDistillery');
 const id=game.core.casks[0].id;step('bottleBranded',id,{},native.quote(game,id).count);
 const beforeQueries=seen.length;
 assert.deepEqual(D.quote(game,id),native.quote(game,id));
 assert.equal(D.endTasting(game),game);
 assert.equal(seen.length,beforeQueries);
 const raw=D.serializeDistillery(game);assert.deepEqual(D.restoreDistillery(raw),game);
 assert.equal(seen.length,beforeQueries);
 assert.deepEqual(seen.map(x=>x.operation.key),['flavor-cards','start','collect-start','stop','fill','month','bottle-counted-branded']);
});

test('temporary nested native actions are not reported as durable operations',()=>{
 const seen=[],nativeModel={constant:42,outer(before){
  const after=structuredClone(before);after.operations.push({key:'temporary'});after.operations.pop();after.operations.push({key:'month'});after.core.month++;return after;
 }},D=createObservedModel(nativeModel,event=>seen.push(event));
 const before={seed:1,version:20,core:{month:0},operations:[{key:'initial'}]},after=D.outer(before);
 assert.equal(D.constant,42);assert.equal(seen.length,1);assert.equal(seen[0].operation.key,'month');assert.equal(seen[0].after,after);
});

test('skipped operations, truncation, changed append boundary and wrong game are rejected',()=>{
 const before={seed:1,version:20,core:{month:0},operations:[{key:'initial'}]};let observations=0;
 for(const mutate of [
  after=>after.operations.push({key:'one'},{key:'two'}),
  after=>after.operations.pop(),
  after=>{after.operations[0]={key:'changed'};after.operations.push({key:'one'});},
  after=>{after.seed++;after.operations.push({key:'one'});},
  after=>after.operations.push({bad:'entry'})
 ]){
  const D=createObservedModel({run(s){const after=structuredClone(s);mutate(after);return after;}},()=>observations++);
  assert.throws(()=>D.run(before),/正式操作境界/);
 }
 assert.equal(observations,0);assert.deepEqual(before.operations,[{key:'initial'}]);
});

test('native and observation failures propagate; model calls are never retried',()=>{
 let calls=0,observations=0;
 const D=createObservedModel({run(before){calls++;if(before.fail)throw Error('native failure');const after=structuredClone(before);after.operations.push({key:'month'});return after;}},()=>{observations++;throw Error('observer failure');});
 const game={seed:1,version:20,core:{month:0},operations:[]};
 assert.throws(()=>D.run({...game,fail:true}),/native failure/);assert.equal(calls,1);assert.equal(observations,0);
 assert.throws(()=>D.run(game),/observer failure/);assert.equal(calls,2);assert.equal(observations,1);assert.equal(game.operations.length,0);
});

test('historical export projections are queries, not live transitions',()=>{
 const D=createObservedModel(native,()=>assert.fail('historical export must not be observed'));
 const game=native.newMarketRulesDistillery(142);
 for(const name of ['preMarketRulesState','preStoreMarketState','preStage4State']){
  assert.equal(D[name],native[name]);assert.deepEqual(D[name](game),native[name](game));
 }
});
