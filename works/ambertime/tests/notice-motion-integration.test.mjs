import test from 'node:test';
import assert from 'node:assert/strict';
import {scopedNotices} from '../event-notices.mjs';
import {noticePresentation} from '../notice-motion.mjs';

function harness(){
 let room='distill',isSafe=true,now=0,serial=0;
 const timers=new Map(),shown=[];
 const setTimer=(fn,ms)=>{const id=++serial;timers.set(id,{at:now+ms,fn});return id;};
 const clearTimer=id=>timers.delete(id);
 const advance=ms=>{const end=now+ms;while(true){
  const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
  if(!next)break;timers.delete(next[0]);now=next[1].at;next[1].fn();
 }now=end;};
 const h=scopedNotices({room:()=>room,safe:()=>isSafe,
  show:(text,events,duration)=>shown.push({text,view:noticePresentation(events),duration}),
  hide:()=>{},setTimer,clearTimer});
 return {h,shown,advance,setRoom:value=>{room=value;h.update();},setSafe:value=>{isSafe=value;h.update();}};
}
const daily={id:'daily:10:E086',kind:'ambient',month:10,eventId:'E086',sourceLabel:'初代のひとこと',text:'隣の店主がおまんじゅうをくれました。'};
test('operation remains first; ambient is rendered with speaker label after it',()=>{
 const {h,shown,advance}=harness();
 h.push([{id:'sales:10',kind:'sales',count:2,revenue:20},daily]);
 assert.equal(shown.length,1);assert.equal(shown[0].view.motion,'operation');
 advance(3500);
 assert.equal(shown.length,2);assert.deepEqual(shown[1].view,{motion:'ambient',heading:'初代のひとこと'});
 assert.equal(shown[1].duration,6000);assert.equal(shown[1].text,daily.text);
});
test('world news arrives later from a single genuine town event',()=>{
 const v=harness();v.setRoom('sales');
 v.h.push([{id:'town:e8',kind:'message',priority:4,text:'町から連絡が届きました。'}]);
 assert.equal(v.shown[0].view.motion,'news');
 assert.equal(v.shown[0].view.heading,'町の知らせ');
 assert.equal(v.shown[0].duration,6500);
});
test('room change and unsafe modal discard ambient instead of queueing it',()=>{
 for(const reason of ['room','modal']){
  const v=harness();v.h.push([{id:'sales:10',kind:'sales',count:1,revenue:10},daily]);
  if(reason==='room')v.setRoom('warehouse');else v.setSafe(false);
  v.advance(12000);assert.equal(v.shown.length,1,reason);
 }
});
