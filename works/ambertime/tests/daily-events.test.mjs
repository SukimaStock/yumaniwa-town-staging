import test from 'node:test';
import assert from 'node:assert/strict';
import {DAILY_EVENT_TEXT} from '../daily-event-text.mjs';
import {DAILY_FREQUENCY,dailyEventForMonth,addDailyEvent} from '../daily-events.mjs';

const ids=DAILY_EVENT_TEXT.map(e=>e.id);
test('curated 170 texts and stable original IDs',()=>{
 assert.equal(DAILY_EVENT_TEXT.length,170);
 assert.equal(new Set(ids).size,170);
 for(const id of ['E009','E016','E024','E029','E033','E035','E054','E080','E130','E144'])assert(!ids.includes(id));
 assert.equal(DAILY_EVENT_TEXT.find(e=>e.id==='E023').text,'まだ昼なのに夕方のような暗さです。');
 assert.equal(DAILY_EVENT_TEXT.find(e=>e.id==='E027').text,'雨が上がったようです。');
 for(const e of DAILY_EVENT_TEXT)assert.match(e.id,/^E\d{3}$/);
});
test('quiet frequency and deterministic, seasonally consistent candidates',()=>{
 assert.equal(DAILY_FREQUENCY,6);
 const seed=20261015,events=[];
 for(let m=1;m<=1200;m++){
   const candidate=dailyEventForMonth(seed,m);
   assert.deepEqual(candidate,dailyEventForMonth(seed,m));
   if(candidate){events.push(candidate);const expected=DAILY_EVENT_TEXT.find(x=>x.id===candidate.eventId);
    assert.equal(candidate.text,expected.text);
    const cal=m%12+1,season=cal>=3&&cal<=5?'春':cal>=6&&cal<=8?'夏':cal>=9&&cal<=11?'秋':'冬';
    assert(['いつでも','雨','晴',season].includes(expected.season));
   }
 }
 assert(events.length>100 && events.length<300,`unexpected frequency: ${events.length}`);
 for(let i=1;i<events.length;i++)if(events[i].month-events[i-1].month<=24)assert.notEqual(events[i].eventId,events[i-1].eventId);
});
test('no new game operation, no mutation, only completed month',()=>{
 const before=Object.freeze({seed:12,core:Object.freeze({month:99})});
 const after=Object.freeze({seed:12,core:Object.freeze({month:100})});
 const base=Object.freeze([{id:'sales:100',kind:'sales',count:2}]);
 assert.equal(addDailyEvent(base,before,after,{allow:false}),base);
 assert.equal(addDailyEvent(base,before,before),base);
 assert.equal(addDailyEvent(base,before,{...after,seed:20}),base);
 const added=addDailyEvent(base,before,after);
 assert.equal(added.length,base.length+(dailyEventForMonth(12,100)?1:0));
 assert.deepEqual(base,[{id:'sales:100',kind:'sales',count:2}]);
});
test('invalid or initial month yields nothing',()=>{
 assert.equal(dailyEventForMonth(42,0),null);
 assert.equal(dailyEventForMonth(0,5),null);
 assert.equal(dailyEventForMonth(42,-1),null);
});
