import test from 'node:test';
import assert from 'node:assert/strict';
import {createDialogueNotice} from '../shop-dialogue-view.mjs';
import {scopedNotices} from '../event-notices.mjs';
import {recentCustomerFeedback} from '../flavor-feedback-view.mjs';
function clock(){let time=0,id=0;const jobs=new Map();return {setTimer:(fn,delay)=>{jobs.set(++id,{fn,at:time+delay});return id;},clearTimer:id=>jobs.delete(id),advance(ms){const end=time+ms;for(;;){const next=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;time=next[1].at;jobs.delete(next[0]);next[1].fn();}time=end;}};}
test('sales dialogue retains only unseen latest, leaving consumes shown, reload does not replay',()=>{
 const c=clock(),shown=[];let room='distill',visible=false;
 const n=createDialogueNotice({...c,inRoom:()=>room==='sales',safe:()=>true,show:e=>{shown.push(e.month);visible=true;},hide:()=>visible=false});
 const commit=m=>n.commit({core:{month:m-1}},{core:{month:m}},{month:m,text:'一言'});
 commit(12);c.advance(1000);commit(24);c.advance(1000);assert.deepEqual(shown,[]);
 room='sales';n.update();assert.deepEqual(shown,[24]);room='warehouse';n.update();assert.equal(visible,false);room='sales';n.update();c.advance(7000);assert.deepEqual(shown,[24]);
 commit(36);c.advance(0);n.dismiss();n.update();assert.deepEqual(shown,[24,36]);n.reset();n.update();assert.equal(visible,false);
});
test('room changes retain the active result; latest world fact follows once for 6.5 seconds',()=>{
 const c=clock(),shown=[];let room='distill',safe=true,visible='';
 const n=scopedNotices({...c,room:()=>room,safe:()=>safe,show:t=>{visible=t;shown.push(t)},hide:()=>visible=''});
 n.push([{id:'bottle:1',kind:'bottled',count:3},{id:'town:1',kind:'message',text:'町へ届いた'}]);assert.equal(visible,'ビン詰め完了 3本');
 n.push([{id:'town:2',kind:'message',text:'海外へ届いた'}]);room='sales';n.update();assert.equal(visible,'ビン詰め完了 3本');assert(!shown.includes('町へ届いた'));
 c.advance(3499);assert.equal(visible,'ビン詰め完了 3本');c.advance(1);assert.equal(visible,'海外へ届いた');assert.equal(shown.filter(t=>t==='ビン詰め完了 3本').length,1);
 c.advance(6499);assert.equal(visible,'海外へ届いた');c.advance(1);assert.equal(visible,'');room='warehouse';n.update();room='sales';n.update();assert.equal(visible,'');
 n.push([{id:'result:1',kind:'message',text:'配置できません'}]);n.clear();n.push([{id:'result:1',kind:'message',text:'配置できません'}]);assert.equal(visible,'');
 n.push([{id:'result:2',kind:'message',text:'結果'}]);safe=false;n.update();assert.equal(visible,'');safe=true;n.update();assert.equal(visible,'結果');
});
test('world waits behind result then displays once; reset drops pending, result expires in 3.5s',()=>{
 const c=clock();let text='',room='sales';const n=scopedNotices({...c,room:()=>room,safe:()=>true,show:t=>text=t,hide:()=>text=''});
 n.push([{id:'bottle:1',kind:'bottled',count:2},{id:'town:1',kind:'message',text:'便り'}]);assert.equal(text,'ビン詰め完了 2本');c.advance(3500);assert.equal(text,'便り');c.advance(6500);assert.equal(text,'');room='distill';n.push([{id:'town:2',kind:'message',text:'過去'}]);n.reset();room='sales';n.update();assert.equal(text,'');
});
test('customer preview uses recorded three-month age without mutating archive',()=>{
 const rows=[{month:12,text:'元の感想',releaseId:1}],before=JSON.stringify(rows);
 for(const month of [12,13,14])assert.equal(recentCustomerFeedback({core:{month}},rows),rows[0]);
 for(const month of [11,15,120])assert.equal(recentCustomerFeedback({core:{month}},rows),null);
 assert.equal(JSON.stringify(rows),before);
});
test('shown dialogue interrupted by a modal is not revived after leaving sales',()=>{
 const c=clock(),shown=[];let inRoom=true,safe=true;
 const n=createDialogueNotice({...c,inRoom:()=>inRoom,safe:()=>safe,show:e=>shown.push(e.month),hide:()=>{}});
 n.commit({core:{month:11}},{core:{month:12}},{month:12,text:'一言'});c.advance(0);safe=false;n.update();inRoom=false;n.update();safe=true;inRoom=true;n.update();c.advance(7000);assert.deepEqual(shown,[12]);
});
test('manual dismissal releases the one pending world fact while paused',()=>{
 const c=clock();let text='';const n=scopedNotices({...c,room:()=>'sales',safe:()=>true,show:t=>text=t,hide:()=>text=''});
 n.push([{id:'bottle:1',kind:'bottled',count:2},{id:'town:1',kind:'message',text:'町からの便り'}]);n.clear();assert.equal(text,'町からの便り');c.advance(6500);assert.equal(text,'');
});
