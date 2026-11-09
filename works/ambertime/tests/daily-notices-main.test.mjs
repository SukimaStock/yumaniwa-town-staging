import test from 'node:test';
import assert from 'node:assert/strict';
import {scopedNotices} from '../event-notices.mjs';

function harness(initialRoom='distill'){
 let room=initialRoom,safe=true,now=0,seq=0;const timers=new Map(),shown=[];
 const setTimer=(fn,delay)=>{const id=++seq;timers.set(id,{time:now+delay,fn});return id;};
 const clearTimer=id=>timers.delete(id);
 const advance=ms=>{
  const limit=now+ms;
  while(true){let found=null;
   for(const [id,t] of timers)if(t.time<=limit&&(!found||t.time<found.value.time))found={id,value:t};
   if(!found)break;
   timers.delete(found.id);now=found.value.time;found.value.fn();
  }
  now=limit;
 };
 const board=scopedNotices({room:()=>room,safe:()=>safe,
  show:text=>shown.push({at:now,text}),hide:()=>{},setTimer,clearTimer});
 return {board,shown,advance,setRoom:value=>{room=value;board.update();},setSafe:value=>{safe=value;board.update();}};
}
const daily={id:'daily:10:E086',kind:'ambient',eventId:'E086',month:10,text:'隣の店主がおまんじゅうをくれました。'};

test('result wins and competing daily is discarded without a backlog',()=>{
 const h=harness();h.board.push([{id:'sales:10',kind:'sales',count:2,revenue:20},daily]);
 assert.equal(h.shown.length,1);assert.match(h.shown[0].text,/販売 2本/);
 h.advance(3500);assert.equal(h.shown.length,1);
 h.advance(6000);assert.equal(h.shown.length,1);
});
test('world news precedes daily in sales room',()=>{
 const h=harness('sales');h.board.push([{id:'town:e17',kind:'message',text:'世界の便り',priority:5},daily]);
 assert.equal(h.shown.length,1);assert.equal(h.shown[0].text,'世界の便り');
 h.advance(6500);assert.equal(h.shown.length,1);
});
test('room change, unsafe modal, explicit dismiss discard ambient',()=>{
 for(const kind of ['room','unsafe','dismiss']){
  const h=harness();h.board.push([{id:'sales:10',kind:'sales',count:1,revenue:10},daily]);
  if(kind==='room')h.setRoom('sales');
  if(kind==='unsafe')h.setSafe(false);
  if(kind==='dismiss')h.board.clear();
  h.advance(10000);assert.equal(h.shown.length,1,kind);
 }
});
test('duplicate monthly display ID cannot replay',()=>{
 const h=harness();h.board.push([daily]);h.board.push([daily]);h.advance(6000);
 assert.equal(h.shown.length,1);
});
