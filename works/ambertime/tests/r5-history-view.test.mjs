import {beforeA1} from './a1-source-baseline.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {ledgerProfile,caskTimeline,recordTimeline,recordText} from '../ledger-history-view.mjs';
import {ageLabel,monthLabel} from '../model.mjs?v=stage4-r2';import {shortChange} from '../tasting-view.mjs?v=stage4-r2';
import {flavorTypeView as sourceFlavorTypeView} from '../flavor-types.mjs?v=stage4-r2';import {FLAVOR_AXES as sourceFlavorAxes,flavorMeter as sourceFlavorMeter} from '../flavor-view.mjs?v=formal-copy-r1';import {uiText} from '../ui-text.mjs?v=stage4-r2&rooms=stage3-r1&aging=1';
import * as D from '../partner-orders.mjs';import {buildCaskLedger} from '../cask-ledger.mjs';
import {HISTORY_IMPORT,extractFunction,sourceConst,inlineHistory} from './r5-history-source.mjs';
const BASE='a94ceadafd5920c0a447f7b392e7db983c910575',read=n=>fs.readFileSync(new URL('../'+n,import.meta.url),'utf8'),before=execFileSync('git',['show',BASE+':works/ambertime/shop-app.mjs'],{encoding:'utf8',maxBuffer:4e6}),module=read('ledger-history-view.mjs');
const ctx={ageLabel,monthLabel,shortChange,sourceFlavorAxes,sourceFlavorTypeView,sourceFlavorMeter,uiText};vm.createContext(ctx);
vm.runInContext(['FLAVOR_AXES','flavorTypeView','flavorMeter','esc','known','knownProfile','recordText'].map(n=>sourceConst(before,n)).join('\n')+'\n'+['ledgerProfile','caskTimeline','recordTimeline'].map(n=>extractFunction(before,n)).join('\n')+'\nglobalThis.oracle={ledgerProfile,caskTimeline,recordTimeline,recordText};',ctx);
const oracle=ctx.oracle;
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
const fill=s=>{s=D.beginCollection(D.startRangeDistillation(s));while(s.still.distillation.progress<35)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),'refill');};
function states(){const empty=D.newMarketRulesDistillery(42),one=fill(empty);let multi=fill(D.tickDistillery(one));const id=multi.core.casks[0].id,tasted=D.sampleDistillery(multi,id),previous=D.sampleDistillery(D.tickDistillery(D.endTasting(tasted)),id),partial=D.bottleBranded(D.endTasting(previous),id,{name:'History <&"\''},1),full=D.bottleBranded(partial,id,{brandId:1});let aged=one;for(let i=0;i<60&&!aged.decisions.length;i++)aged=D.tickDistillery(aged);const legacy=D.restoreDistillery(fs.readFileSync(new URL('./fixtures/v08-legal-funds-tasted.json',import.meta.url),'utf8'));return {empty,one,multi,tasted,previous,partial,full,aged,legacy};}
const projections=[];
const outcome=call=>{try{return {html:call()};}catch(error){return {error:error.name,message:error.message};}};
function compare(c){const raw=JSON.stringify(c);freeze(c);assert.equal(caskTimeline(c),oracle.caskTimeline(c));assert.equal(caskTimeline(c),caskTimeline(c));assert.deepEqual(outcome(()=>recordTimeline(c.samples,c.observations,c.choices)),outcome(()=>oracle.recordTimeline(c.samples,c.observations,c.choices)));assert.deepEqual(outcome(()=>recordTimeline(c.samples,c.observations,c.choices,true)),outcome(()=>oracle.recordTimeline(c.samples,c.observations,c.choices,true)));for(let i=0;i<(c.samples??[]).length;i++)assert.equal(ledgerProfile(c.samples[i].profile,i?c.samples[i-1].profile:null),oracle.ledgerProfile(c.samples[i].profile,i?c.samples[i-1].profile:null));assert.equal(JSON.stringify(c),raw);}
test('R5 moved function/formatter bytes and root after exact reviewed A1 reversal match immutable R4 main',()=>{
 for(const n of ['ledgerProfile','caskTimeline','recordTimeline'])assert.equal(extractFunction(module,n),extractFunction(before,n),n);
 for(const n of ['FLAVOR_AXES','flavorTypeView','flavorMeter','esc','known','knownProfile','recordText'])assert.equal(sourceConst(module,n),sourceConst(before,n),n);
 assert.equal(inlineHistory(beforeA1(read('shop-app.mjs'))),before);assert.equal(beforeA1(read('index.html'),'index.html').replace('&amp;history=r5-1',''),execFileSync('git',['show',BASE+':works/ambertime/index.html'],{encoding:'utf8'}));
 assert(!/\b(?:game|modal|document|window|localStorage|Worker|setTimeout|Math\.random)\s*[.(=]/.test(module));assert.equal(module.match(/^export /gm).length,4);
});
test('R5 lawful empty/one/multi/taste/previous/partial/full/long-aged/legacy projections preserve original markup and formal/replay bytes',()=>{
 for(const [name,state] of Object.entries(states())){const raw=D.serializeDistillery(state);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw,name);const facts=D.nearbyComparisonFacts(state,{caskIds:[...state.core.casks,...state.core.archive,...state.records].map(c=>c.caskId??c.id),includeManualSources:true});const projection=buildCaskLedger(state,{facts,replay:observer=>D.replayDistilleryOperations(state,observer)});for(const c of projection.casks){compare(c);projections.push({name,cask:c.caskId,markupSHA256:createHash('sha256').update(caskTimeline(c)).digest('hex')});}assert.equal(D.serializeDistillery(state),raw,name);}
 assert(projections.length>8);
});
test('R5 missing histories/profile, unknown ages and long special prose preserve escaping, deduplication, order, reading markup and input',()=>{
 const profile={roughness:.8,character:.5,wood:.2,litres:30},special='<script>&"\' '+('原文・長い記録。'.repeat(160));
 for(const c of [{},{samples:[],history:[],observations:[],choices:[],volumeHistory:[]},{filledMonth:0,samples:[{age:12,profile,text:[special]},{age:24,profile:{...profile,wood:.5},text:['二回目']}],history:[{age:12,text:special},{month:3,text:'原文'}],observations:[{age:null,title:special,text:'別文'}],choices:[{age:24,key:'cool',text:'冷暗所'}],volumeHistory:[{age:24,month:24,litres:29.5},{age:24,month:24,litres:29.5},{age:null,month:null,litres:null}]}])compare(c);
 for(const text of [null,undefined,12,'','  ',special]){assert.equal(recordText(text),oracle.recordText(text));if(typeof text==='string'&&text.includes('<'))assert(!recordText(text).includes('<script>'));}
 for(const p of [null,{},profile,{roughness:NaN,character:null,wood:.2}])assert.equal(ledgerProfile(p),oracle.ledgerProfile(p));
});
test('R5 saved release sample/observation/choice timelines preserve empty defaults and both withChanges paths without sorting or changing inputs',()=>{
 assert.equal(recordTimeline(),oracle.recordTimeline());for(const state of Object.values(states()))for(const record of state.records){const copy=freeze(structuredClone(record)),raw=JSON.stringify(copy);for(const changes of [false,true]){assert.equal(recordTimeline(copy.samples,copy.observations,copy.choices,changes),oracle.recordTimeline(copy.samples,copy.observations,copy.choices,changes));}assert.equal(JSON.stringify(copy),raw);}
});
