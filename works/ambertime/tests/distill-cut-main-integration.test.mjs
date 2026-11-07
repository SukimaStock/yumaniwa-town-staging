import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as D from '../partner-orders.mjs';
import {manualCompletedRuns} from '../distill-learning.mjs';
import {lateRelease,finishExtraction} from './generation-helpers.mjs';
import {host} from './r0-distill-host.mjs';
import {readSession} from '../placement-save.mjs';
import {PARALLEL_PARAMETERS as SESSION_TIME} from '../economy-parameters.mjs';
const resumed=text=>readSession(text,{enabled:true,restore:D.restoreDistillery,monthMs:SESSION_TIME.monthMs,stepMs:SESSION_TIME.distillStepMs}).game;
const baselineBytes=fs.readFileSync(new URL('../design/cut-main/model-baseline.json',import.meta.url));
const baseline=JSON.parse(baselineBytes);
const digest=raw=>createHash('sha256').update(raw).digest('hex');
const step=(s,p)=>{while(s.still.distillation.progress<p)s=D.distillStep(s);return s;};
// The historical artifact included old UI/app/test sources as well as formal
// modules. Only the explicit formal model closure stays byte-pinned: UI now has
// behavior/geometry/DOM/cache tests and may be reorganized without hash churn.
const protectedFormalSources=new Set([
 "works/ambertime-flavor-lab-v02/bridge.mjs",
 "works/ambertime-flavor-lab-v02/model.mjs",
 "works/ambertime/aroma-extraction.mjs",
 "works/ambertime/bottle-storage.mjs",
 "works/ambertime/brand-identity.mjs",
 "works/ambertime/brand-reputation.mjs",
 "works/ambertime/character.mjs",
 "works/ambertime/department-projects.mjs",
 "works/ambertime/distiller.mjs",
 "works/ambertime/distillery-parameters.mjs",
 "works/ambertime/distillery.mjs",
 "works/ambertime/economy-parameters.mjs",
 "works/ambertime/economy.mjs",
 "works/ambertime/experiments/reputation/v03/model.mjs",
 "works/ambertime/experiments/reputation/v05/core.mjs",
 "works/ambertime/experiments/reputation/v05/model.mjs",
 "works/ambertime/experiments/town-simulation/v01/model.mjs",
 "works/ambertime/generations.mjs",
 "works/ambertime/lab-flavor.mjs",
 "works/ambertime/market-sales.mjs",
 "works/ambertime/model.mjs",
 "works/ambertime/monthly.mjs",
 "works/ambertime/parallel-parameters.mjs",
 "works/ambertime/parameters.mjs",
 "works/ambertime/partial-bottling.mjs",
 "works/ambertime/partner-orders.mjs",
 "works/ambertime/partner-parameters.mjs",
 "works/ambertime/placement-mode.mjs",
 "works/ambertime/recipe-book.mjs",
 "works/ambertime/shop-demand.mjs",
 "works/ambertime/shop-model.mjs",
 "works/ambertime/store-market.mjs",
 "works/ambertime/town-connection.mjs",
 "works/ambertime/trade-parameters.mjs",
 "works/ambertime/trade.mjs",
 "works/ambertime/wholesale-parameters.mjs",
 "works/ambertime/wholesale-v08.mjs",
 "works/ambertime/wholesale.mjs"
]);
// Alley bar v0.1 is an authorized future-only model extension. Keep original
// fixture bytes and legacy replay assertions; pin only its explicitly changed sources.
const barSourcePins={"works/ambertime/market-sales.mjs":"cbf883ec68598f232928b5a1874abb7442cea825f678284f718fe2c7d0772514","works/ambertime/partner-orders.mjs":"432840c91babe8d8f1010f043641a2b482fdfc81ff6fec8a4fc33ffced622fa0","works/ambertime/placement-mode.mjs":"07ffacdcf1c7dd109b95d2354bb1fe4ae7f7e4d14e7d4536613a3deb3a34d604","works/ambertime/shop-demand.mjs":"ee9cac7e0f321bea6b7beb5b6627f976e40a9d1522f48bdd16c4ca304e7b4edc","works/ambertime/shop-model.mjs":"b14aaeabce8a55e98dff504d912c72a5b8314dfcd72c82afa36e89f4f89178d3","works/ambertime/store-market.mjs":"fd350f05389d85c4888aff4eb1d2e01f5eb0786063115821299ef6177ce6d624"};
const withoutImportQueries=s=>s.replace(/((?:from|import)\s*['"])([^'"]+)\?[^'"]+(['"])/g,'$1$2$3');
test('historical baseline is immutable and its 38 formal dependencies stay protected',()=>{
 assert.equal(digest(baselineBytes),'9bdd784a50879b74e4a25c7c54b565122d0be22419075104c5f5046789120261');
 assert.equal(baseline.base,'c927acf16128e0bd4b8096596221c70f9ed69355');assert.equal(baseline.formalSources.length,146);
 const formal=baseline.formalSources.filter(r=>protectedFormalSources.has(r.path));assert.equal(formal.length,38);
 for(const r of formal){
  // Approved merged 3323b4eb changed staff/bottling rules after the old cut
  // snapshot. Its current formal bytes are fixed separately; old20 states below
  // still compare against the original, unmodified raw/hash expectations.
  const expected=r.path==='works/ambertime/partner-orders.mjs'?'ea8f40410bacebcfb8a1c16ec921af095511de6db3732ee3d6f4cf2e9e32346b':r.sha256;
  const current=fs.readFileSync(new URL('../../../'+r.path,import.meta.url),'utf8');
  if(barSourcePins[r.path])assert.equal(digest(current),barSourcePins[r.path],r.path);
  else{
   const beforeBar=execFileSync('git',['show','34c537c17e5a17085fc7a47fdfa6912b5fb1824b:'+r.path],{encoding:'utf8',maxBuffer:4e6});
   assert.equal(digest(beforeBar),expected,r.path+' historical pin');
   assert.equal(withoutImportQueries(current),withoutImportQueries(beforeBar),r.path+' only import cache queries may change');
  }
 }
});
test('four same native cut sequences retain all twenty old state and cold-save bytes',()=>{
 assert.equal(baseline.cases.length,20);
 for(const {start,end,malt} of baseline.cases.filter(x=>x.tag==='before')){
  const rows=baseline.cases.filter(x=>x.start===start&&x.end===end&&x.malt===malt),match=(s,tag)=>{const row=rows.find(x=>x.tag===tag),raw=D.serializeDistillery(s);assert.equal(digest(raw),row.sha256,`${start}→${end} ${tag}`);assert.equal(raw,row.raw);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);};
  let s=D.selectFlavorCards(D.newMarketRulesDistillery(42),{malt,ferment:'short'});s=D.startRangeDistillation(s);match(s,'before');s=D.beginCollection(step(s,start));match(s,'collect-start');s=D.stopDistillation(step(s,end));match(s,'finished');s=D.fillBarrel(s,'refill');match(s,'filled');s=D.bottleBranded(s,s.core.casks.at(-1).id,{});match(s,'bottled');
 }
});
test('actual lever and glass handlers count formal stop, not countdown/start/collection, then open integrated result and fill',()=>{
 const {api,persisted,writes}=host();assert.equal(manualCompletedRuns(api.game()),0);assert(api.tools().leverEnabled);
 const initial=persisted();api.startFromLever();assert.equal(persisted(),initial);assert.equal(writes(),0);assert.equal(api.game().still.phase,'ready');assert(api.tools().leverDown);
 api.runCountdown();assert.equal(api.game().still.phase,'distilling');assert.equal(manualCompletedRuns(api.game()),0);
 api.finishDistillation();assert.equal(api.game().still.distillation.collectStart,0);assert.equal(manualCompletedRuns(api.game()),0);
 api.stepTo(11);const partial=D.serializeDistillery(api.game());api.finishDistillation();assert.equal(D.serializeDistillery(api.game()),partial,'minimum collection window is enforced');
 api.stepTo(12);api.finishDistillation();assert.equal(api.game().still.phase,'filling');assert.equal(manualCompletedRuns(api.game()),1);assert.equal(api.modal().kind,'fill');assert.equal(api.node('dialog-title').textContent,'蒸留結果');assert.match(api.node('dialog-body').innerHTML,/たるを選ぶ/);assert.match(api.node('dialog-actions').innerHTML,/data-action="fill"/);
 const done=D.serializeDistillery(api.game());api.finishDistillation();assert.equal(D.serializeDistillery(api.game()),done);assert.equal(manualCompletedRuns(api.game()),1);
 api.fill('refill');assert.equal(api.room(),'warehouse');assert.equal(api.modal(),null);assert.equal(api.game().core.casks.length,1);assert.equal(api.game().still.phase,'ready');assert.equal(D.serializeDistillery(resumed(persisted())),D.serializeDistillery(api.game()));
});
test('cancelling countdown performs no formal operation or save',()=>{
 const h=host(),before=D.serializeDistillery(h.api.game()),stored=h.persisted();h.api.startFromLever();h.api.cancelCountdown();h.api.runCountdown();assert.equal(D.serializeDistillery(h.api.game()),before);assert.equal(h.persisted(),stored);assert.equal(h.writes(),0);assert.equal(manualCompletedRuns(h.api.game()),0);
});
test('actual save failure preserves persisted start/stop bytes and disables input; failed journal operations roll back to the committed state',()=>{
 const start=host(),initial=start.persisted();start.api.startFromLever();start.failWrites();start.api.runCountdown();assert.equal(start.persisted(),initial);assert.equal(start.api.canSave(),false);assert.equal(manualCompletedRuns(start.api.game()),0);assert.equal(start.api.tools().glassEnabled,false);
 const stop=host();stop.api.startFromLever();stop.api.runCountdown();stop.api.finishDistillation();stop.api.stepTo(12);const stored=stop.persisted();stop.failWrites();stop.api.finishDistillation();assert.equal(stop.persisted(),stored);assert.equal(stop.api.canSave(),false);assert.equal(stop.api.modal(),null);assert.equal(manualCompletedRuns(stop.api.game()),0,'H1-B2 never publishes the failed stop operation');assert.equal(manualCompletedRuns(resumed(stored)),0,'the durable journal did not gain a stop');assert.equal(stop.api.tools().glassEnabled,false);
});
test('fill commits only after conditional storage succeeds, with the unfinished spirit retained on failure',()=>{
 for(const failure of ['denied','conflict']){const h=host();h.api.startFromLever();h.api.runCountdown();h.api.finishDistillation();h.api.stepTo(12);h.api.finishDistillation();const before=D.serializeDistillery(h.api.game()),stored=h.persisted();if(failure==='denied')h.failWrites();else h.conflict();h.api.fill('refill');assert.equal(D.serializeDistillery(h.api.game()),before);assert.equal(h.api.game().still.phase,'filling');assert.equal(h.api.modal(),null,'recovery controls are reachable while unfinished spirit is retained');assert.equal(h.api.canSave(),false);assert.equal(h.persisted(),failure==='conflict'?'external-save':stored);}
});
test('preview has real manual journal/guide/result/fill semantics but no storage reads or writes',()=>{
 const h=host({preview:true}),stored=h.persisted();h.api.startFromLever();h.api.runCountdown();h.api.finishDistillation();h.api.stepTo(12);h.api.finishDistillation();assert.equal(manualCompletedRuns(h.api.game()),1);assert.equal(h.api.modal().kind,'fill');h.api.fill('refill');assert.equal(h.api.room(),'warehouse');assert.equal(h.persisted(),stored);assert.equal(h.reads(),0);assert.equal(h.writes(),0);assert.equal(h.api.node('save-status').textContent,'試遊中 · 保存しません');
});
test('guidance follows each formal game through runs one to three and reload, with no presentation mutations',()=>{
 let s=D.newMarketRulesDistillery(42);for(let n=0;n<=3;n++){const h=host({state:s,restored:true});const raw=D.serializeDistillery(s);assert.equal(manualCompletedRuns(h.api.game()),n);const tools=h.api.tools();assert.equal(tools.showLeverArrow,n<3);assert.equal(tools.guideDistance,n===0?9:n<3?6:0);for(let i=0;i<5;i++)h.api.tools();assert.equal(D.serializeDistillery(h.api.game()),raw);assert.equal(Object.hasOwn(h.api.game(),'completedRuns'),false);if(n<3){s=D.startRangeDistillation(s);s=D.stopDistillation(step(D.beginCollection(s),12));s=D.tickDistillery(D.fillBarrel(s,'refill'));s=D.restoreDistillery(D.serializeDistillery(s));}}
 assert.equal(manualCompletedRuns(D.newMarketRulesDistillery(42)),0);
});
test('automatic queued/cancelled/completed batches never count; generation handover never resets guidance',()=>{
 let s=D.fillBarrel(D.stopDistillation(step(D.startDistillation(D.newUsualDistillery(42)),65)),'refill');s=D.tickDistillery(s);const count=manualCompletedRuns(s),queued=D.reserveUsual(s);assert.equal(manualCompletedRuns(queued),count);assert.equal(manualCompletedRuns(D.cancelUsual(queued)),count);s=D.beginUsual(queued);const h=host({state:s});assert.equal(h.api.tools().leverEnabled,false);const before=D.serializeDistillery(h.api.game());h.api.startFromLever();h.api.runCountdown();assert.equal(D.serializeDistillery(h.api.game()),before);while(s.usual.reservation)s=D.distillStep(s);assert.equal(s.operations.at(-1).key,'complete-usual');assert.equal(manualCompletedRuns(D.restoreDistillery(D.serializeDistillery(s))),count);
 let generation=finishExtraction(D.startDistillation(lateRelease()));assert.equal(D.generationStatus(generation).phase,'review');generation=D.handoverGeneration(generation,1);assert.equal(D.generationStatus(generation).id,2);assert.equal(manualCompletedRuns(generation),3);assert.equal(host({state:generation}).api.tools().showLeverArrow,false);
});

// Each historical row starts a separate process: no previous row can supply a
// warm projection checkpoint. Keep original raw fixture bytes unchanged.
test('all twenty immutable cut saves replay in twenty independent cold processes',()=>{
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};process.stdout.write(D.serializeDistillery(D.restoreDistillery(fs.readFileSync(0,'utf8'))));`;
 assert.equal(baseline.cases.length,20);for(const row of baseline.cases){assert.equal(digest(row.raw),row.sha256);assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{input:row.raw,encoding:'utf8',maxBuffer:8e6}),row.raw,`${row.start}→${row.end}/${row.tag} cold`);}
});
