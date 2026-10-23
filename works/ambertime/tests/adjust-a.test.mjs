import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as D from '../partner-orders.mjs';
import {productTitle,playerMilestones,selectedTownEvents,customerComments} from '../player-news.mjs';

const samples=JSON.parse(readFileSync(new URL('./stage4-results.json',import.meta.url),'utf8')).runs;
const copy=structuredClone;
function fixture(sample=samples[0]){
 const release={...copy(sample.release),id:1,brandId:7,flavorName:sample.release.name};
 return {seed:20261021,brands:[{id:7,name:'AmberTime'}],releases:[release],labConnection:{version:1,town:{releases:[{id:1,externalId:1}],events:[],shipments:[]}}};
}
function arrival(id,month,to='near-local',extra={}){
 return {id:'e'+id,type:'arrival',month,releaseId:1,mainReleaseId:1,productId:3,to,channel:'road',reason:'「果実香が強い」(#1)の口コミ',...extra};
}
function retailHistory(game,count=24){
 game.labConnection.town.shipments=Array.from({length:count},(_,i)=>({id:'retail:'+(i+1)+':3',month:i+1,to:'town',count:1,parts:[{releaseId:1,count:1}]}));
 return game;
}

test('five frozen bottles keep stable brand/release identity as character and age differ',()=>{
 assert.equal(samples.length,5);
 for(const sample of samples){
  const game=fixture(sample),raw=JSON.stringify(game);
  assert.equal(productTitle(game,1),'AmberTime・第1回');
  assert.equal(productTitle(game,game.releases[0]),'AmberTime・第1回');
  game.labConnection.town.events.push(arrival(1,100));
  const view=playerMilestones(game);
  assert.equal(view.length,1);assert.match(view[0].text,/AmberTime・第1回/);
  assert.doesNotMatch(view[0].text,/果実香|どっしり|厚み|煙の香り/);
  game.labConnection.town.events=[];assert.equal(JSON.stringify(game),raw);
 }
});

test('milestones ignore individual reactions and deduplicate same brand/place across releases',()=>{
 const game=fixture(),town=game.labConnection.town;
 game.releases.push({...copy(game.releases[0]),id:2,productId:4});town.releases.push({id:2,externalId:2});
 town.events=[arrival(1,1,'town',{channel:'direct'}),arrival(2,2,'diner',{type:'interest'}),arrival(3,3),arrival(4,4,'near-local',{releaseId:2,mainReleaseId:2,productId:4}),arrival(5,5,'near-local',{type:'inquiry'}),arrival(6,6,'near-local',{type:'inquiry',releaseId:2,mainReleaseId:2}),arrival(7,7,'town',{type:'inquiry'})];
 const raw=JSON.stringify(game),view=playerMilestones(game);
 assert.deepEqual(view.map(e=>e.id),['town:e3','town:e5']);
 assert.match(view[0].text,/口コミが届きました/);assert.match(view[1].text,/取扱いについて問い合わせ/);
 assert.deepEqual(selectedTownEvents({...game,labConnection:{version:1,town:{...town,events:[]}}},game).map(e=>e.id),['town:e5']);
 assert.deepEqual(selectedTownEvents(game,game),[]);assert.equal(JSON.stringify(game),raw);
});

test('arrival keeps distant introduction cause without presenting a rumor as established trade',()=>{
 const game=fixture(),town=game.labConnection.town;
 town.events=[{id:'e1',type:'rumor',actor:'旅行者',releaseId:1,to:'overseas-food',reason:'saved original reason'},arrival(2,4,'overseas-food',{sourceId:'e1',channel:'chance'}),arrival(3,5,'national-food')];
 const raw=JSON.stringify(town),view=playerMilestones(game);
 assert.match(view[0].text,/海外の飲食文化圏へ/);assert.match(view[0].text,/旅行者からの紹介です/);
 assert.doesNotMatch(view[0].text,/取扱いが始まり/);assert.equal(JSON.stringify(town),raw);
});

test('saved prose and descriptor poisoning never changes identity or flavor-based comment choice',()=>{
 const original=retailHistory(fixture()),poisoned=copy(original);
 original.labConnection.town.events.push(arrival(1,2));poisoned.labConnection.town.events.push(arrival(1,2));
 poisoned.releases[0].name='煙';poisoned.releases[0].flavorName='煙';poisoned.releases[0].profile.flavor.label='煙';poisoned.labConnection.town.events[0].reason='煙という商品が大人気';
 const raw=JSON.stringify(poisoned);
 assert.deepEqual(playerMilestones(poisoned),playerMilestones(original));
 assert.deepEqual(customerComments(poisoned),customerComments(original));assert.equal(JSON.stringify(poisoned),raw);
});

test('rare factual retail comments reflect five frozen profiles, keep spacing and survive JSON reload',()=>{
 for(const [i,sample] of samples.entries()){
  const game=retailHistory(fixture(sample)),raw=JSON.stringify(game),comments=customerComments(game);
  assert(comments.length>0&&comments.length<6,'few display comments from24 actual retail receipts');
  for(let j=0;j<comments.length;j++){
   assert.equal(comments[j].releaseId,1);assert.match(comments[j].text,/AmberTime・第1回のお客さん/);
   assert.match(comments[j].text,i===1?/飲みごたえ|厚み/:i===2?/スモーキー|煙の香り/:/果実の香り/);
   if(j){assert(comments[j].month-comments[j-1].month>=12);assert.notEqual(comments[j].text,comments[j-1].text);}
  }
  assert.deepEqual(customerComments(JSON.parse(raw)),comments);assert.equal(JSON.stringify(game),raw);
 }
});

test('comments require actual retail sales and can express a supported preference mismatch',()=>{
 const game=retailHistory(fixture());
 game.releases[0].profile={roughness:.05,character:.1,wood:1};
 const comments=customerComments(game);assert(comments.length>0);assert(comments.every(c=>/もう少し刺激|穏やかすぎる|刺激が控えめ|穏やかな飲み口/.test(c.text)));assert(comments.every(c=>!/好きです|好みです/.test(c.text)));
 const unreceived=fixture();assert.deepEqual(customerComments(unreceived),[]);
 for(const receipt of game.labConnection.town.shipments)receipt.id=receipt.id.replace('retail:','shop:');
 assert.deepEqual(customerComments(game),[]);
 assert.deepEqual(customerComments({}),[]);assert.deepEqual(playerMilestones({}),[]);assert.equal(productTitle({},null),'ウイスキー');
});

test('real current and legacy save bytes, inventory, finances and raw town logs stay exact through views',()=>{
 let game=D.newConnectedDistillery(20261021);
 game=D.selectFlavorCards(game,{malt:'plain',ferment:'long'});game=D.startDistillation(game);
 while(game.still.distillation.progress<40)game=D.distillStep(game);
 game=D.beginCollection(game);while(game.still.distillation.progress<58)game=D.distillStep(game);
 game=D.fillBarrel(D.stopDistillation(game),'refill');game=D.bottleBranded(game,game.core.casks[0].id,{},10);
 game=D.listBottles(D.setSalePrice(game,'low',game.result.productId),game.result.productId);game=D.tickDistillery(game);
 for(const state of [game,D.newBrandIdentityDistillery(42)]){
  const raw=D.serializeDistillery(state),town=JSON.stringify(state.labConnection?.town);
  productTitle(state,state.releases[0]);playerMilestones(state);customerComments(state);selectedTownEvents(state,state);
  assert.equal(D.serializeDistillery(state),raw);assert.equal(JSON.stringify(state.labConnection?.town),town);
  const restored=D.restoreDistillery(raw);assert.equal(D.serializeDistillery(restored),raw);assert.deepEqual(customerComments(restored),customerComments(state));
 }
 assert.equal(game.labConnection.town.shipments.length,1);assert(game.releases[0].sold>0);
});
