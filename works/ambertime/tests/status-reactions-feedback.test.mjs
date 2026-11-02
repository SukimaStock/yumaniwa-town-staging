import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {caskFeedback,warehouseFeedback,warehouseFeedbackPreview,FEEDBACK_MONTHS} from '../flavor-feedback-view.mjs';
import {shortChange} from '../tasting-view.mjs';
import {uiText} from '../ui-text.mjs';
import {warehouseFixtures} from './flavor-feedback-0254-fixtures.mjs';
const titles={wood:['原酒の色が深くなってきた','色が深くなった'],fading:['香りの移り変わり','かおりが弱くなった'],rough:['若い原酒のまま、少し先へ','シゲキが残る'],fruit:['原酒の香りが広がる頃','かおりが強い'],rounded:['口当たりが変わる頃','口当たりがやわらかい'],loss:['少しずつ、減っていく','蒸発で量が減った']};
function projection(eventId='loss',title=titles.loss[0]){const c={id:1,filledMonth:0,age:12,character:.7,wood:.2,roughness:.3,flavor:{history:[{months:0,label:'はじめ'}]}},s={core:{month:12,casks:[c]},notesById:{1:{samples:[],observations:[{age:12,month:12,eventId,title}]}}};return{s,c};}
function cold(raw){const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:raw,encoding:'utf8',maxBuffer:8e6}),raw);}

test('only exact known event and original title pairs get factual live copy; unknown titles and saved records stay unchanged',()=>{
 for(const[eventId,[title,expected]]of Object.entries(titles)){
  const{s,c}=projection(eventId,title),raw=JSON.stringify(s);assert.equal(caskFeedback(s,c).text,expected);assert.equal(warehouseFeedback(s).text,expected);assert.equal(JSON.stringify(s),raw);
  for(const unknown of ['作者の記録 '+title,title+'を見た','色が深い','知らない文']){s.notesById[1].observations[0].title=unknown;assert.equal(caskFeedback(s,c).text,uiText(unknown));}
 }
 const{s,c}=projection('rough',titles.loss[0]);assert.equal(caskFeedback(s,c).text,titles.loss[0],'same wording under a different event is not rewritten');
 s.notesById[1].observations[0].eventId='manual-cool';assert.equal(caskFeedback(s,c),null,'no new kinds become eligible');
});
test('confirmed saved flavor name is quoted using the existing detail spelling; initial and pending labels remain quiet',()=>{
 const{s,c}=projection();s.notesById[1].observations=[];c.flavor.pending={label:'候補'};assert.equal(caskFeedback(s,c),null);
 c.flavor.history.push({months:12,label:'樽香と刺激'});const raw=JSON.stringify(s),fact=caskFeedback(s,c);assert.equal(fact.kind,'name');assert.equal(fact.text,'「'+uiText(c.flavor.history.at(-1).label)+'」に変化');assert.equal(fact.text,'「たる香とシゲキ」に変化');assert.equal(warehouseFeedbackPreview('たる No.1',fact),'No.1 · '+fact.text);assert.equal(JSON.stringify(s),raw);
 c.flavor.history[1].label=c.flavor.history[0].label;assert.equal(caskFeedback(s,c),null);
});
test('existing previous-sample deltas change only known feedback wording, keeping tasting copy, anchor and priority',()=>{
 const{s,c}=projection('wood',titles.wood[0]);s.notesById[1].samples=[{age:5,profile:{character:.9,wood:.1,roughness:.4}}];
 const original=shortChange({profile:c},s.notesById[1].samples[0]);assert(original.includes('香りが落ち着いた'));
 const raw=JSON.stringify(s),fact=caskFeedback(s,c);assert.equal(fact.kind,'sample');assert.equal(fact.month,12);assert.equal(fact.age,12);assert.equal(fact.text,'前回から：かおりが弱くなった · 木の余韻が増した · シゲキがやわらいだ');assert.equal(warehouseFeedbackPreview('たる No.1',fact),'No.1 · かおりが弱くなった · 木の余韻が増した · シゲキがやわらいだ');assert.equal(shortChange({profile:c},s.notesById[1].samples[0]),original);assert.equal(JSON.stringify(s),raw);
 s.notesById[1].samples[0].profile.character=.5;assert(caskFeedback(s,c).text.includes('かおりが強くなった'));assert(shortChange({profile:c},s.notesById[1].samples[0]).includes('香りがふくらんだ'));
 c.flavor.history.push({months:12,label:'確認した名前'});assert.equal(caskFeedback(s,c).kind,'name','same-month name still wins');
});
test('three-game-month expiry, sampled facts and stable one-cask selection remain unchanged',()=>{
 const{s,c}=projection();assert.equal(FEEDBACK_MONTHS,3);for(const month of[12,13,14]){s.core.month=month;c.age=month;assert.equal(caskFeedback(s,c).month,12);}s.core.month=15;c.age=15;assert.equal(caskFeedback(s,c),null);
 s.core.month=12;c.age=12;s.notesById[1].samples=[{age:12,profile:{character:.7,wood:.2,roughness:.3}}];assert.equal(caskFeedback(s,c),null);
 s.notesById[1].samples=[];const second={...c,id:2};s.core.casks.push(second);s.notesById[2]={samples:[],observations:[{age:12,month:12,eventId:'loss',title:titles.loss[0]}]};assert.equal(warehouseFeedback(s).caskId,1);s.core.casks=[];assert.equal(warehouseFeedback(s),null);
});
test('lawful stored name, evaporation and aroma observations keep byte-identical saves and strict cold restoration',()=>{
 const fixtures=warehouseFixtures();
 for(const[key,expected]of [['fresh','かおりが強い'],['next','蒸発で量が減った'],['named','「穏やかな果実香」に変化']]){
  const s=D.restoreDistillery(fixtures[key]),raw=D.serializeDistillery(s),fact=warehouseFeedback(s);assert.equal(fact.text,expected);assert.equal(D.serializeDistillery(s),raw);assert.equal(raw,fixtures[key]);cold(raw);
  if(key==='next'){const c=s.core.casks[0],n=s.notesById[c.id];assert.equal(n.observations.at(-1).title,titles.loss[0]);assert((c.litres+(n.withdrawnLitres??0))/c.initialLitres<=.90);assert(c.wood<.62);}
  if(key==='named')assert.equal(fact.text,'「'+uiText(s.core.casks[0].flavor.history.at(-1).label)+'」に変化');
 }
 const s=D.restoreDistillery(fixtures.fresh),id=s.core.casks[0].id;let compared=D.endTasting(D.sampleDistillery(s,id));while(compared.core.month<49)compared=D.tickDistillery(compared);const raw=D.serializeDistillery(compared),fact=warehouseFeedback(compared);assert.equal(fact.kind,'sample');assert(fact.text.includes('かおりが弱くなった'));assert.equal(D.serializeDistillery(compared),raw);cold(raw);
});
