import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeCaskSlots,reconcileCaskSlots,assertCaskSlots,caskSlotMap} from '../cask-slots.mjs';
import {serializeSession,readSession,isCompactSession,isCurrentSession,writeCandidate} from '../placement-save.mjs';
import {compactFormalGame} from '../save-codec.mjs';
import * as D from '../partner-orders.mjs';
import {PARALLEL_PARAMETERS as P} from '../economy-parameters.mjs';
const state=ids=>({core:{casks:ids.map(id=>({id,filledMonth:id}))}});
const options={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs};
const raw=JSON.parse(readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
const fixture=()=>D.restoreDistillery(raw),ui={userPaused:true,elapsed:200};
test('four slots keep surviving positions, reuse lowest gap and reset only after emptying',()=>{
 let slots=initializeCaskSlots(state([]));assert.deepEqual(slots,[null,null,null,null]);
 for(let id=1;id<=4;id++){slots=reconcileCaskSlots(state(Array.from({length:id},(_,i)=>i+1)),slots);assert.equal(slots[id-1],id);}
 const before=slots;slots=reconcileCaskSlots(state([1,3,4]),slots);assert.deepEqual(before,[1,2,3,4]);assert.deepEqual(slots,[1,null,3,4]);
 slots=reconcileCaskSlots(state([1,3,4,37]),slots);assert.deepEqual(slots,[1,37,3,4]);assert.equal(caskSlotMap(slots).get(37),2);
 slots=reconcileCaskSlots(state([]),slots);assert.deepEqual(slots,[null,null,null,null]);assert.deepEqual(reconcileCaskSlots(state([42]),slots),[42,null,null,null]);
});
test('migration sorts only current casks by fixed fill month and ID',()=>{
 const game={core:{casks:[{id:42,filledMonth:12},{id:37,filledMonth:10},{id:39,filledMonth:10}]}};
 assert.deepEqual(initializeCaskSlots(game),[37,39,42,null]);assert.deepEqual(game.core.casks.map(c=>c.id),[42,37,39]);
 const slots=[42,null,37,39];assert.deepEqual(reconcileCaskSlots(game,slots),slots);
});
test('automatic removal and replacement use IDs, never recycled position as identity',()=>{
 const slots=[37,42,50,null],next=reconcileCaskSlots(state([37,50,80]),slots);
 assert.deepEqual(next,[37,80,50,null]);assert.equal(caskSlotMap(next).has(42),false);assert.equal(caskSlotMap(next).get(80),2);
 const release={caskId:42},recipe={source:{caskId:42}};assert.equal(release.caskId,42);assert.equal(recipe.source.caskId,42);
});
test('rejects fifth cask, duplicate live identity and invalid persisted assignments',()=>{
 assert.throws(()=>initializeCaskSlots(state([1,2,3,4,5])));assert.throws(()=>initializeCaskSlots(state([1,1])));
 for(const slots of [null,[],[1,null,null],[1,1,null,null],[1,9,null,null],[null,null,null,null],[0,null,null,null],['1',null,null,null],new Array(4)])assert.throws(()=>assertCaskSlots(state([1]),slots));
 assert.throws(()=>reconcileCaskSlots(state([1]),[1,1,null,null]));
});
test('v2 and v3 read without source writes; v4 retains exact slots and exact formal game',()=>{
 const game=fixture(),gameRaw=D.serializeDistillery(game),initial=initializeCaskSlots(game);
 for(const version of [2,3]){
  const text=JSON.stringify({version,game:version===2?game:compactFormalGame(gameRaw),...ui}),before=text;
  const read=readSession(text,options);assert.equal(JSON.stringify(read.game),gameRaw);assert.deepEqual(read.caskSlots,initial);assert.equal(text,before);assert(!isCurrentSession(text));
 }
 const slots=initial.slice().reverse(),text=serializeSession(game,{...ui,caskSlots:slots},options),envelope=JSON.parse(text);
 assert.equal(envelope.version,4);assert.deepEqual(Object.keys(envelope),['version','game','userPaused','elapsed','caskSlots']);assert(isCompactSession(text));assert(isCurrentSession(text));
 const loaded=readSession(text,options);assert.deepEqual(loaded.caskSlots,slots);assert.equal(JSON.stringify(loaded.game),gameRaw);assert.equal(JSON.stringify(game),gameRaw);
 assert.equal(serializeSession(loaded.game,loaded,options),text);
});
test('v4 rejects corrupt slots, unknown schema and noncanonical bytes',()=>{
 const text=serializeSession(fixture(),ui,options);
 for(const change of [s=>s.version=5,s=>delete s.caskSlots,s=>s.extra=true,s=>s.caskSlots=[999999,null,null,null],s=>s.caskSlots=[1,1,null,null],s=>s.caskSlots=[],s=>s.version=3]){
  const value=JSON.parse(text);change(value);assert.throws(()=>readSession(JSON.stringify(value),options));
 }
 assert.throws(()=>readSession(text+'\n',options));assert.throws(()=>readSession(text.replace('"version":4','"version":4,"version":4'),options));
});
test('single candidate write keeps slot and game envelope together on quota or stale writer',()=>{
 const old=serializeSession(fixture(),ui,options),next=serializeSession(fixture(),{...ui,elapsed:300},options);let saved=old;
 const storage={getItem:()=>saved,setItem:()=>{throw Error('quota');}};
 assert.throws(()=>writeCandidate(storage,'formal',old,next),/quota/);assert.equal(saved,old);assert.deepEqual(readSession(saved,options).caskSlots,JSON.parse(old).caskSlots);
 saved='other tab';assert.throws(()=>writeCandidate(storage,'formal',old,next),/別の画面/);assert.equal(saved,'other tab');
});
test('future month has identical formal state regardless of UI slot ordering',()=>{
 const game=fixture(),slots=initializeCaskSlots(game).reverse(),text=serializeSession(game,{...ui,caskSlots:slots},options),loaded=readSession(text,options);
 assert.equal(JSON.stringify(D.tickDistillery(loaded.game)),JSON.stringify(D.tickDistillery(game)));
});

import {fill,advance} from './brands-helpers.mjs';
function paired(initial,{session=true}={}){
 let reference=initial,game=D.restoreDistillery(D.serializeDistillery(initial)),slots=initializeCaskSlots(game);
 return {get game(){return game;},get slots(){return slots;},step(operation){
  reference=operation(reference);const next=operation(game),candidateSlots=reconcileCaskSlots(next,slots);
  if(session){const loaded=readSession(serializeSession(next,{...ui,caskSlots:candidateSlots},options),options);game=loaded.game;slots=loaded.caskSlots;}
  else{game=D.restoreDistillery(D.serializeDistillery(next));slots=candidateSlots;}
  assert.equal(JSON.stringify(game),JSON.stringify(reference));assert.equal(game.core.rngState,reference.core.rngState);assertCaskSlots(game,slots);return game;
 }};
}
function fillCurrent(s){
 s=D.startRangeDistillation(s);while(s.still.distillation.progress<24)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<36)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),'refill');
}
test('formal four-cask capacity rejects a fifth without changing state',()=>{
 const p=paired(D.newMarketRulesDistillery(42));
 for(let i=0;i<4;i++){p.step(s=>fillCurrent(s));if(i<3)p.step(s=>advance(s,1));}
 assert.deepEqual(p.slots,p.game.core.casks.map(c=>c.id));assert.equal(D.canStart(p.game).ok,false);
 const before=JSON.stringify(p.game);assert.throws(()=>D.startDistillation(p.game));assert.equal(JSON.stringify(p.game),before);
});
test('formal partial bottling, removal and reused slot preserve release identity, state and RNG',()=>{
 const p=paired(D.newMarketRulesDistillery(42));
 p.step(fillCurrent);p.step(s=>advance(s,1));p.step(fillCurrent);
 const ids=p.game.core.casks.map(c=>c.id),removed=ids[0];
 p.step(s=>D.bottleBranded(s,removed,{},1));assert.deepEqual(p.slots,[...ids,null,null]);assert(p.game.core.casks.some(c=>c.id===removed));
 p.step(s=>D.bottleBranded(s,removed,{},D.quote(s,removed).count));assert.deepEqual(p.slots,[null,ids[1],null,null]);
 const oldReleases=structuredClone(p.game.releases.filter(r=>r.caskId===removed));assert.equal(oldReleases.length,2);
 p.step(s=>advance(s,1));p.step(fillCurrent);const replacement=p.game.core.casks.at(-1).id;assert.notEqual(replacement,removed);
 assert.deepEqual(p.slots,[replacement,ids[1],null,null]);assert.deepEqual(p.game.releases.filter(r=>r.caskId===removed),oldReleases);
 p.step(s=>advance(s,1));assert.equal(p.slots[0],replacement);
});
test('actual automatic monthly bottling frees its slot while formal economics and RNG stay equal',()=>{
 let initial=fill(D.newMonthlyTimingDistillery(42),{progress:65}),id=initial.core.casks[0].id;
 initial=D.bottleBranded(initial,id,{},1);initial=D.hireBottlingStaff(initial);
 initial=D.bottleBranded(initial,id,{},D.quote(initial,id).count-8);
 initial=D.reserveBottling(initial,id,{mode:'stock',threshold:5,count:10});
 const p=paired(initial,{session:false});assert.equal(p.slots[0],id);p.step(s=>advance(s,1));
 assert.equal(p.game.automation.lastBottlings.length,1);assert.equal(p.game.automation.lastBottlings[0].count,8);
 assert.equal(p.game.core.casks.length,0);assert.deepEqual(p.slots,[null,null,null,null]);assert(p.game.core.archive.some(c=>c.id===id));
 p.step(s=>fill(s));assert.equal(p.slots[0],p.game.core.casks[0].id);assert.notEqual(p.slots[0],id);
});
