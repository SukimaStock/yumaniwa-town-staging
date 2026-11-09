import test from 'node:test';import assert from 'node:assert/strict';
import * as D from '../partner-orders.mjs';import {scopedNotices,automaticEvents} from '../event-notices.mjs';import {createDialogueProjection} from '../shop-dialogue.mjs';
import {initializeRecall,advanceRecall} from '../recall/collector.mjs';import {initializeHistoryRecord,advanceHistoryRecord} from '../history-record.mjs';
test('32 years of visible/occluded notices leave formal state, RNG, history and recall identical',{timeout:180000},async()=>{
 let control=D.newShopDialogueDistillery(42),observed=D.newShopDialogueDistillery(42),cr=initializeRecall(control),or=initializeRecall(observed),ch=initializeHistoryRecord(control),oh=initializeHistoryRecord(observed);
 let room='sales',safe=true,time=0,serial=0;const timers=new Map();const lane=scopedNotices({room:()=>room,safe:()=>safe,now:()=>time,show:()=>{},hide:()=>{},setTimer:(fn,ms)=>{timers.set(++serial,{fn,at:time+ms});return serial;},clearTimer:id=>timers.delete(id)}),projection=createDialogueProjection();
 let generated=0;
 function act(fn){const a=control,b=observed;control=fn(control);observed=fn(observed);cr=advanceRecall(a,control,cr);or=advanceRecall(b,observed,or);ch=advanceHistoryRecord(a,control,ch);oh=advanceHistoryRecord(b,observed,oh);const events=automaticEvents(b,observed);generated+=events.length;lane.push(events);}
 function brew(){act(D.startRangeDistillation);for(let j=0;j<24;j++)act(D.distillStep);act(D.beginCollection);for(let j=0;j<40;j++)act(D.distillStep);act(D.stopDistillation);act(s=>D.fillBarrel(s,'refill'));}

 for(let i=0;i<384;i++){
  while(control.decisions.length){const d=control.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');assert(o);act(s=>D.chooseDistillery(s,d.caskId,o.id));}
  if(control.trade.offer)act(D.declineOffer);
  if(D.generationStatus(control)?.phase==='review')act(s=>D.handoverGeneration(s,D.generationStatus(s).id));
  if(i%60===0&&D.canStart(control).ok)brew();
  const b=observed;act(D.tickDistillery);assert.equal(observed.core.month,b.core.month+1);
  if(i%60===11&&control.core.casks.length){act(s=>D.bottleBranded(s,s.core.casks[0].id,{}));act(s=>D.listBottles(s,s.result.productId));}

  room=['sales','warehouse','distill'][i%3];safe=i%5===0;lane.update();
  const events=automaticEvents(b,observed);generated+=events.length;lane.push(events);const entry=projection.read(observed);if(entry?.month>b.core.month)lane.push([{id:'shop:'+entry.id,kind:'shop',entry}]);
  // Include sustained stress when actual world events are sparse; UI only.
  lane.push([{id:'town:stress:'+i,kind:'message',text:'研究用の町の知らせ'},{id:'daily:stress:'+i,kind:'ambient',text:'研究用の日常'}]);
  time+=i%2?1000:500;for(const [id,t] of [...timers])if(t.at<=time){timers.delete(id);t.fn();}
  assert(lane.inspect().pending.length<=5);assert(lane.inspect().seen<=256);
  assert.deepEqual(observed,control);assert.deepEqual(or,cr);assert.deepEqual(oh,ch);
 }
 assert(control.generations.completed.length>=1);
 const encoded=D.serializeDistillery(observed);assert.equal(encoded,D.serializeDistillery(control));assert.deepEqual(D.restoreDistillery(encoded),observed);
 console.log(JSON.stringify({months:384,generated,lane:lane.inspect(),formalBytes:encoded.length}));
});
