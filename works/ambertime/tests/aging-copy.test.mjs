import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';import {agingEventText,previousAgingSample,uiText} from '../ui-text.mjs';import {caskFeedback,warehouseFeedback,warehouseFeedbackPreview} from '../flavor-feedback-view.mjs';import {warehouseFixtures} from './flavor-feedback-0254-fixtures.mjs';
const profile={character:.7,wood:.4,roughness:.25},cask=()=>({id:1,filledMonth:0,age:12,...profile,flavor:{history:[{months:0,label:'初め'}]}}),sample=(age,patch={})=>({age,profile:{...profile,...patch}}),event=id=>({id,title:{wood:'原酒の色が深くなってきた',rounded:'口当たりが変わる頃',rough:'若い原酒のまま、少し先へ',fading:'香りの移り変わり'}[id],text:'保存された本文'});
function state(c=cask(),observed='wood'){return {core:{month:12,casks:[c]},notesById:{1:{samples:[],observations:[{age:12,month:12,eventId:observed,title:event(observed).title}]}}};}
function cold(raw){const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:8e6}),raw);}

test('threshold-only wood and rounded cues describe state, and old pending changes require real earlier sample deltas',()=>{
 const c=cask();for(const samples of [[],[sample(12,{wood:0,roughness:.8})],[{age:11,profile:{wood:0}}],[sample(13,{wood:0})],[sample(11,{wood:NaN})],[sample(11,{roughness:2})],[sample(-1)]]){
  assert.deepEqual(agingEventText(event('wood'),c,{samples}),{title:'色が濃い',text:''});assert.deepEqual(agingEventText(event('rounded'),c,{samples}),{title:'口当たりが丸い',text:''});
 }
 const notes={samples:[sample(4,{wood:.1,roughness:.6}),sample(9,{wood:.2,roughness:.4})]},raw=JSON.stringify(notes);
 assert.deepEqual(agingEventText(event('wood'),c,notes),{title:'色が濃くなった',text:''});assert.deepEqual(agingEventText(event('rounded'),c,notes),{title:'口当たりが丸くなった',text:''});assert.equal(JSON.stringify(notes),raw);
 for(const id of ['wood','rounded'])assert.equal(agingEventText(event(id),c,{samples:[sample(11)]}).title,id==='wood'?'色が濃い':'口当たりが丸い');
 assert.deepEqual(agingEventText(event('rough'),c),{title:'まだシゲキが残る',text:''});
 const s=state(c);assert.equal(caskFeedback(s,c).text,'色が濃い');s.notesById[1].observations[0]={age:12,month:12,eventId:'rounded',title:event('rounded').title};assert.equal(caskFeedback(s,c).text,'口当たりが丸い');
});
test('comparison chooses greatest valid strictly older age without mutation, retaining current-age cue acknowledgement',()=>{
 const c=cask(),a=sample(3,{wood:.1}),b=sample(10,{wood:.39,roughness:.24}),current=sample(12,{wood:0}),notes={samples:[b,{age:11,profile:null},a,current]},raw=JSON.stringify(notes);
 assert.equal(previousAgingSample(c,notes),b);assert.equal(agingEventText(event('wood'),c,notes).title,'色が濃い','the latest actual earlier sample proves no wood delta, despite older large difference');assert.equal(JSON.stringify(notes),raw);
 const s=state(c);s.notesById[1].samples=[a,current];assert.equal(caskFeedback(s,c),null,'sampling at the current age does not resurrect an acknowledged cue');
 s.notesById[1].samples=[sample(3,{wood:.1}),sample(10,{wood:.2})];const fact=caskFeedback(s,c);assert.equal(fact.kind,'sample');assert.equal(fact.text,'前回の試飲から：木の余韻が増した');assert.equal(warehouseFeedbackPreview('たる No.1',fact),'No.1 · '+fact.text.replace(/^前回の試飲から：/,'前回から：'));
});
test('fading retains actual recorded comparison and unknown event/title pairs retain their existing presentation',()=>{
 const c=cask();assert.equal(agingEventText(event('fading'),c).title,'かおりが弱くなった');assert.equal(agingEventText(event('fading'),c,{samples:[sample(5,{character:.9})]}).text,'前に試したときよりかおりが弱い');
 for(const e of [{id:'wood',title:'作者の色の記録',text:'原文'}, {id:'unrecognized',title:event('wood').title,text:'原文'},{id:'rounded',title:event('wood').title,text:'原文'}]){const raw=JSON.stringify(e);assert.deepEqual(agingEventText(e,c,{samples:[sample(5,{wood:0})]}),{title:uiText(e.title),text:uiText(e.text)});assert.equal(JSON.stringify(e),raw);}
});
test('only nonempty ascending confirmed history after an initial record can claim a name change',()=>{
 const bad=[[],[{months:0,label:''},{months:12,label:'新名'}],[{months:0,label:'  '},{months:12,label:'新名'}],[{months:0,label:'初め'},{months:12,label:' '}],[{months:0,label:'初め'},{months:0,label:'新名'}],[{months:2,label:'初め'},{months:12,label:'新名'}],[{months:0,label:'初め'},{months:13,label:'未来'},{months:12,label:'新名'}],[{months:0,label:'初め'},{months:10,label:'二番目'},{months:9,label:'逆順'},{months:12,label:'新名'}]];
 for(const history of bad){const c=cask(),s=state(c);s.notesById[1].observations=[];c.flavor.history=history;const raw=JSON.stringify(s);assert.equal(caskFeedback(s,c),null);assert.equal(JSON.stringify(s),raw);}
 const c=cask(),s=state(c);s.notesById[1].observations=[];c.flavor.pending={label:'候補'};assert.equal(caskFeedback(s,c),null);c.flavor.history.push({months:12,label:'初め'});assert.equal(caskFeedback(s,c),null);c.flavor.history.push({months:13,label:'新名'});assert.equal(caskFeedback(s,c),null);
 c.flavor.history=[{months:0,label:'初め'},{months:12,label:'穏やかな果実香'}];assert.equal(caskFeedback(s,c).text,'「穏やかな果実香」に変化');
});
test('valid comparison keeps the original recorded anchor and three-month expiry across repeated rendering',()=>{
 const c=cask(),s=state(c);s.notesById[1].samples=[sample(5,{wood:.1,character:.9,roughness:.4})];const first=caskFeedback(s,c),raw=JSON.stringify(s);for(let i=0;i<10;i++)assert.deepEqual(caskFeedback(s,c),first);assert.equal(JSON.stringify(s),raw);assert.equal(first.month,12);assert(first.text.startsWith('前回の試飲から：'));
 s.core.month=14;c.age=14;assert.equal(caskFeedback(s,c).month,12);s.core.month=15;c.age=15;assert.equal(caskFeedback(s,c),null);assert.equal(s.notesById[1].observations.length,1);
});
test('actual lawful observations, confirmed names and comparison retain identical saves and cold restoration',()=>{
 const fixtures=warehouseFixtures();for(const key of ['fresh','next','named','expired','sampled']){const s=D.restoreDistillery(fixtures[key]),raw=D.serializeDistillery(s);warehouseFeedback(s);assert.equal(D.serializeDistillery(s),raw);assert.equal(raw,fixtures[key]);cold(raw);}
 let s=D.restoreDistillery(fixtures.fresh);s=D.endTasting(D.sampleDistillery(s,s.core.casks[0].id));while(s.core.month<49)s=D.tickDistillery(s);const raw=D.serializeDistillery(s),fact=warehouseFeedback(s);assert.equal(fact.kind,'sample');assert(fact.text.startsWith('前回の試飲から：'));assert.equal(warehouseFeedbackPreview('たる No.1',fact),'No.1 · '+fact.text.replace(/^前回の試飲から：/,'前回から：'));assert.equal(D.serializeDistillery(s),raw);cold(raw);
});

test('existing connected and pre-flavor saved fixtures retain supported history origins and all stored bytes',()=>{
 for(const name of ['placement-established-six','placement-first-six','placement-legacy-main','bottling-policy-legacy','staff-progression-v20','v08-legal-funds']){
  const data=JSON.parse(fs.readFileSync(new URL('./fixtures/'+name+'.json',import.meta.url))),texts=data.core?[JSON.stringify(data)]:[data.raw,data.before,data.after].filter(text=>typeof text==='string');
  for(const text of texts){const s=D.restoreDistillery(text),raw=D.serializeDistillery(s);for(const c of s.core.casks){const h=c.flavor?.history;if(h){assert.equal(h[0].months,0,name);assert(h.every((entry,i)=>typeof entry.label==='string'&&entry.label.trim().length&&Number.isInteger(entry.months)&&entry.months<=c.age&&(i===0||entry.months>h[i-1].months)),name);}caskFeedback(s,c);}assert.equal(D.serializeDistillery(s),raw,name);cold(raw);}
 }
 const c={...cask(),initialLitres:100,litres:60},e={id:'loss',title:'少しずつ、減っていく',text:'保存本文'};
 assert.deepEqual(agingEventText(e,c,{withdrawnLitres:30}),{title:'量が減った',text:'たる詰めから40％減った'},'legacy percentage remains total loss, without relabeling it evaporation');
});
