import test from 'node:test';import assert from 'node:assert/strict';import {automaticEvents,noticeText,transientNotices} from '../event-notices.mjs';
const before=()=>({usual:{reservation:{status:'active'}},core:{month:2,casks:[{id:1}]}});
test('saved transition collects automatic fill, actual bottle count, and combined monthly revenue once',()=>{const a=before(),b={core:{month:3,casks:[{id:1},{id:2}],lastMonth:{bottles:13,revenue:99.5}},automation:{lastBottlings:[{month:3,productId:7,count:4}]}};const raw=JSON.stringify([a,b]),events=automaticEvents(a,b);assert.deepEqual(events.map(e=>e.kind),['filled','bottled','sales']);assert.equal(events[1].count,4);assert.equal(events[2].count,13);assert.equal(events[2].revenue,99.5);assert.equal(JSON.stringify([a,b]),raw);assert.equal(automaticEvents(b,b).length,0);});
test('no sales popup for zero sales; old monthly receipts do not replay',()=>{const a=before();assert.deepEqual(automaticEvents(a,{core:{month:2,casks:a.core.casks,lastMonth:{bottles:1,revenue:2}},automation:{lastBottlings:[{month:1,count:3}]}}),[]);});
test('one timer coalesces events and deduplicates, timer only hides without state or repeated display',()=>{let text='',shows=0,hides=0,serial=0;const timers=new Map(),news=transientNotices({show:t=>{text=t;shows++;},hide:()=>{text='';hides++;},setTimer:fn=>{timers.set(++serial,fn);return serial;},clearTimer:id=>timers.delete(id)}),sale={id:'sales:3',kind:'sales',count:4,revenue:20};news.push([sale]);news.push([sale]);assert.equal(shows,1);news.push([{id:'bottle:9',kind:'bottled',count:10}]);assert.equal(timers.size,1);assert.match(text,/販売 4本/);assert.match(text,/ビン詰め 10本/);const expire=[...timers.values()][0];expire();assert.equal(text,'');assert.equal(hides,1);news.push([sale]);assert.equal(shows,2);});
test('coalesced monthly sales add amounts without conflating stockist and retail as separate events',()=>{assert.equal(noticeText([{kind:'sales',count:4,revenue:20},{kind:'sales',count:6,revenue:30}]),'販売 10本 · 入金 £50');});

test('room/visibility clear preserves seen IDs, explicit newgame reset permits same month and product IDs',()=>{let shows=0;const news=transientNotices({show:()=>shows++,hide:()=>{},setTimer:()=>1,clearTimer:()=>{}}),event={id:'bottle:1',kind:'bottled',count:10};news.push([event]);news.clear();news.push([event]);assert.equal(shows,1);news.reset();news.push([event]);assert.equal(shows,2);});

test('duplicate IDs within the same collected batch are counted once',()=>{let text='';const news=transientNotices({show:t=>text=t,hide:()=>{},setTimer:()=>1,clearTimer:()=>{}}),event={id:'sales:4',kind:'sales',count:3,revenue:12};news.push([event,event]);assert.equal(text,'販売 3本 · 入金 £12');});

test('major town news beats minor reactions and keeps priority across coalesced months',()=>{
 const base={core:{month:1,casks:[]},brands:[{id:1,name:'AmberTime'}],releases:[{id:1,brandId:1}],labConnection:{version:1,town:{releases:[{id:1,externalId:1}],events:[]}}},after=structuredClone(base);
 after.labConnection.town.events=[{id:'e1',type:'interest',mainReleaseId:1,to:'town',month:1,reason:'関心を持たれました。'}];
 assert.deepEqual(automaticEvents(base,after),[]);
 after.labConnection.town.events.push({id:'e2',type:'arrival',channel:'road',mainReleaseId:1,to:'diner',month:1},{id:'e3',type:'inquiry',mainReleaseId:1,to:'overseas-food',month:1});
 const events=automaticEvents(base,after);assert.equal(events.length,1);assert.match(events[0].text,/AmberTime/);assert.match(events[0].text,/問い合わせ/);
 assert.match(noticeText([...events,{kind:'message',priority:1,text:'食堂へ届きました。'}]),/問い合わせ/);
});
