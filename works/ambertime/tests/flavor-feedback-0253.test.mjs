import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createFeedbackComments,commentExcerpt,caskFeedback,warehouseFeedback} from '../flavor-feedback-view.mjs';
import {customerComments} from '../player-news.mjs';
import {layoutScene} from '../canvas-layout.mjs';
import * as D from '../partner-orders.mjs';
const results=JSON.parse(fs.readFileSync(new URL('./stage4-results.json',import.meta.url))).runs;
const view=()=>({seed:20261021,core:{month:360,casks:[]},notesById:{},brands:[{id:7,name:'AmberTime'}],releases:[{...structuredClone(results[0].release),id:1,brandId:7},{...structuredClone(results[1].release),id:2,brandId:7}],labConnection:{version:1,town:{releases:[{id:1,externalId:1},{id:2,externalId:2}],events:[],shipments:[]}}});
const cask=(id=1)=>({id,filledMonth:0,age:36,roughness:.3,wood:.1,character:.8,flavor:{label:'名前',history:[{months:0,label:'名前'}]}});
const state=c=>({core:{month:36,casks:[c]},notesById:{[c.id]:{samples:[],observations:[]}}});
test('existing comments retain exact release identity for distinct flavors in one brand; no fabricated drinking',()=>{
 const s=view();s.labConnection.town.shipments=Array.from({length:360},(_,i)=>({id:'retail:'+(i+1)+':3',month:i+1,count:1,parts:[{releaseId:i%2+1,count:1}]}));
 const before=JSON.stringify(s),rows=createFeedbackComments().read(s);assert.deepEqual(rows,customerComments(s));assert(rows.length>2);assert.deepEqual(new Set(rows.map(r=>r.releaseId)),new Set([1,2]));
 for(const r of rows){assert(commentExcerpt(s,r).startsWith('お客さん「'));assert(r.text.includes('第'+r.releaseId+'回'));}assert.equal(JSON.stringify(s),before);
 for(const receipt of s.labConnection.town.shipments)receipt.id=receipt.id.replace('retail:','shop:');assert.deepEqual(createFeedbackComments().read(s),[]);
 s.labConnection.town.events=[{type:'arrival',to:'overseas',releaseId:1}];assert.deepEqual(createFeedbackComments().read(s),[]);
 s.labConnection.town.shipments=[];assert.deepEqual(createFeedbackComments().read(s),[]);
});
test('monthly cache survives repeated cloned extraction renders and invalidates on facts, brand changes, reset',()=>{
 const s=view();let calls=0;const cache=createFeedbackComments(g=>{calls++;return customerComments(g);});cache.read(s);
 for(let i=0;i<100;i++){const next=structuredClone(s);next.still={progress:i};cache.read(next);}assert.equal(calls,1);
 s.core.month++;cache.read(s);s.brands[0].name='別名';cache.read(s);s.releases.push({id:3});cache.read(s);s.labConnection.town.shipments.push({id:'shop:new'});cache.read(s);assert.equal(calls,5);cache.reset();cache.read(s);assert.equal(calls,6);
});
test('confirmed name history only, initial/pending name is not a change; sampled facts are no longer cues',()=>{
 const c=cask(),s=state(c);c.flavor.pending={label:'まだ候補'};assert.equal(caskFeedback(s,c),null);
 c.flavor.history.push({months:35,label:'丸み'});let f=caskFeedback(s,c);assert.equal(f.kind,'name');assert.equal(f.month,35);
 s.notesById[1].samples=[{age:36,profile:{character:.8,wood:.1,roughness:.3}}];assert.equal(caskFeedback(s,c),null);
});
test('observations preserve meaning without pretending rough is rounded; current barrels only, at most one',()=>{
 const c=cask(),s=state(c);s.notesById[1].observations=[{age:35,month:35,eventId:'rough',title:'若い原酒のまま、少し先へ'},{age:30,month:30,eventId:'manual-cool',title:'移した'}];
 assert.equal(caskFeedback(s,c).text,'若い原酒');const b=cask(2);s.core.casks.push(b);s.notesById[2]={observations:[{age:36,month:36,eventId:'wood',title:'原酒の色が深くなってきた'}]};assert.equal(warehouseFeedback(s).caskId,2);assert.equal(typeof warehouseFeedback(s),'object');
 s.core.casks=[];assert.equal(warehouseFeedback(s),null);
});
test('existing previous-taste thresholds: small delta quiet, meaningful change visible, no previous taste safe',()=>{
 const c=cask(),s=state(c);assert.equal(caskFeedback(s,c),null);s.notesById[1].samples=[{age:30,profile:{character:.81,wood:.09,roughness:.31}}];assert.equal(caskFeedback(s,c),null);
 s.notesById[1].samples[0].profile={character:.9,wood:.01,roughness:.4};s.notesById[1].observations=[{age:35,month:35,eventId:'wood',title:'原酒の色が深くなってきた'}];const f=caskFeedback(s,c);assert.equal(f.kind,'sample');assert(f.text.includes('香りが落ち着いた'));assert(f.text.includes('シゲキがやわらいだ'));
 const before=JSON.stringify(s);warehouseFeedback(s);assert.equal(JSON.stringify(s),before);
});
test('feedback geometry is optional, one room control, clear of room and management navigation',()=>{
 for(const room of ['sales','warehouse']){assert(!layoutScene({room}).controls.some(c=>c.key==='room-feedback'));const list=layoutScene({room,feedback:{text:'記録'}}).controls.filter(c=>c.key==='room-feedback');assert.equal(list.length,1);assert(list[0].y+list[0].h<=520);assert(list[0].x+list[0].w<=360);}
});
test('legal saves and calculation sources stay identical; no view timers/validation/clones and617 helper untouched',()=>{
 // formal-copy.test covers the approved order presentation changes; all calculation guards remain exact.
 // 0.27 authorizes native opt-in opcodes; the ordinary contract remains exact base behavior.
 const legacy027=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-legacy-main.json',import.meta.url)));assert.equal(legacy027.source,'8ec6e12f79d02322561ebf284c90fc3605412942');const old027=D.restoreDistillery(legacy027.before);assert.equal(D.serializeDistillery(old027),legacy027.before);const next027=D.tickDistillery(old027);assert.deepEqual(next027,JSON.parse(legacy027.after));assert.equal(D.serializeDistillery(next027),legacy027.after);

 const s=D.newConnectedDistillery(42),raw=D.serializeDistillery(s);createFeedbackComments().read(s);warehouseFeedback(s);assert.equal(D.serializeDistillery(s),raw);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);
 const base='1d5c2dbeaddfb10fecf8e8241d00e293910b798a';for(const f of ['monthly.mjs','tasting-view.mjs','character.mjs','lab-flavor.mjs','shop-demand.mjs','shop-model.mjs','runtime-clock.mjs','room-motion.mjs','town-connection.mjs','model.mjs'])assert.equal(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),execFileSync('git',['show',base+':works/ambertime/'+f],{encoding:'utf8',maxBuffer:4e6}));
 const source=fs.readFileSync(new URL('../flavor-feedback-view.mjs',import.meta.url),'utf8');assert(!/structuredClone\(|validate\w*\(|setTimeout\(|requestAnimationFrame\(|localStorage/.test(source));
});
test('incomplete old fields remain unknown and four live slots still select only one factual cue',()=>{
 const c=cask(),s=state(c);c.flavor.history.push({label:'月の記録なし'});assert.equal(caskFeedback(s,c),null);c.flavor.history.push({months:35,label:'記録済み'});c.filledMonth=undefined;assert.equal(caskFeedback(s,c),null);c.filledMonth=0;
 s.core.casks=Array.from({length:4},(_,i)=>({...c,id:i+1}));const fact=warehouseFeedback(s);assert.equal(fact.caskId,1);assert.equal(Array.isArray(fact),false);
});
