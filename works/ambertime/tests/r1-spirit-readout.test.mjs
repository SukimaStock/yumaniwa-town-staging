import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import * as D from '../partner-orders.mjs';
import {distillationReadout} from '../spirit-view.mjs';
import {spiritReadoutView} from '../spirit-readout-view.mjs';
import {uiText} from '../ui-text.mjs';
import {extract,source} from './r0-distill-host.mjs';

// Exact original function from main5c04a4fd17e8cac954acf798485085721f261d8b.
// This test oracle is intentionally not generated from the changed implementation.
const previous=String.raw`function renderSpirit(){
 const panel=$('spirit-readout');if(!panel)return;
 const view=distillationReadout(game);
 // During a cut the bar and symbolic receiver convey selection, not litres.
 const cutInProgress=game?.still.phase==='distilling'&&!!game.still.distillation?.labChoice;
 panel.hidden=!view||cutInProgress||modal?.kind==='fill';if(panel.hidden)return;
 const gathering=view.phase==='estimate';
 $('spirit-kind').textContent=gathering?'ここまで':view.phase==='forecast'?(game.still.distillation?.collectionVersion===2?'ここまで':'抽出見込み'):view.phase==='filled'?'たる詰め済み':'原酒';
 $('spirit-phrase').textContent=gathering?'':uiText(view.phrase);
 $('spirit-gauges').hidden=gathering;
 $('spirit-volume').textContent=view.litres.toFixed(1)+' L';
 for(const axis of view.axes??[]){const meter=$('spirit-'+axis.id);meter.setAttribute('aria-valuenow',String(axis.value));meter.setAttribute('aria-valuetext',axis.value.toFixed(2)+' / '+axis.maximum+' · 特徴の強さ');meter.style.setProperty('--flavor-fill',axis.ratio);}
}`;
assert.equal(createHash('sha256').update(previous).digest('hex'),'af2ee0ed6872dcdef17fcae014c109a665026ccb504f48ad35d18876c80b2c61','original main renderer oracle remains pinned');
const current=extract('renderSpirit');
const canvasLine=source.split('\n').find(line=>line.startsWith(" const spirit=$('spirit-readout').hidden?null:"));
assert(canvasLine,'existing Canvas bridge remains present');
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
const step=(s,n)=>{while(s.still.distillation.progress<n)s=D.distillStep(s);return s;};
function dom(){
 const trace=[],nodes=new Map();
 for(const id of ['spirit-readout','spirit-kind','spirit-phrase','spirit-gauges','spirit-volume','spirit-roughness','spirit-character']){
  const attributes=new Map(),properties=new Map([['--flavor-fill','0.375']]),node={
   setAttribute(name,value){attributes.set(name,String(value));trace.push([id,'attribute',name,String(value)]);},
   style:{setProperty(name,value){properties.set(name,String(value));trace.push([id,'style',name,String(value)]);},getPropertyValue:name=>properties.get(name)??''}
  };
  let text='previous:'+id,hidden=false;
  Object.defineProperty(node,'textContent',{get:()=>text,set:value=>{text=String(value);trace.push([id,'textContent',text]);}});
  Object.defineProperty(node,'hidden',{get:()=>hidden,set:value=>{hidden=Boolean(value);trace.push([id,'hidden',hidden]);}});
  nodes.set(id,node);
 }
 return {trace,nodes,$:id=>nodes.get(id)??null};
}
function render(fn,state,modal=null,read=distillationReadout){
 const d=dom(),ctx={game:state,modal,uiText,spiritReadoutView,distillationReadout:read,$:d.$};vm.createContext(ctx);vm.runInContext(fn+';renderSpirit();',ctx);
 vm.runInContext(`const phase=game?.still?.phase;${canvasLine}globalThis.bridge=spirit;`,ctx);
 return {trace:d.trace,bridge:JSON.parse(JSON.stringify(ctx.bridge)),nodes:d.nodes};
}
function fixtures(){
 const fresh=D.newMarketRulesDistillery(42),range=D.startRangeDistillation(fresh),collect=D.beginCollection(step(range,24)),finish=D.stopDistillation(step(collect,52));
 const legacy=D.startDistillation(D.newUsualDistillery(42));
 const future=structuredClone(collect);future.still.distillation.collectStart=60;
 return [
  ['missing game',null],['empty ready',{still:{phase:'ready'}}],['fresh',fresh],['range before collection',range],['range collecting',collect],['current confirmed',finish],
  ['legacy before minimum',step(legacy,12)],['legacy after minimum',step(legacy,65)],['legacy confirmed',D.stopDistillation(step(legacy,65))],
  ['filled idle',D.fillBarrel(finish,'refill')],['future collection',future],
  ['bad extraction progress',{still:{phase:'distilling',distillation:{progress:100}}}],
  ['missing extraction data',{still:{phase:'distilling'}}],
  ['invalid confirmed profile',{still:{phase:'filling'},core:{spirit:{roughness:-1,character:.5,litres:3}}}]
 ];
}

test('formatter keeps historical/dormant labels, units, meter values and missing-readout hiding',()=>{
 assert.deepEqual(spiritReadoutView(null),{hidden:true});assert.deepEqual(spiritReadoutView(undefined),{hidden:true});
 const axes=[{id:'roughness',value:.123456,maximum:1,ratio:.123456},{id:'character',value:.6,maximum:1.35,ratio:.6/1.35}];
 const base=freeze({phase:'filled',litres:12.345,phrase:'原酒の香り',axes});
 assert.deepEqual(spiritReadoutView(base),{hidden:false,kind:'たる詰め済み',phrase:uiText('原酒の香り'),gaugesHidden:false,volume:'12.3 L',axes:[{id:'roughness',value:'0.123456',valueText:'0.12 / 1 · 特徴の強さ',ratio:.123456},{id:'character',value:'0.6',valueText:'0.60 / 1.35 · 特徴の強さ',ratio:.6/1.35}]});
 assert.equal(spiritReadoutView({...base,phase:'estimate'}).kind,'ここまで');assert.equal(spiritReadoutView({...base,phase:'estimate'}).phrase,'');assert.equal(spiritReadoutView({...base,phase:'estimate'}).gaugesHidden,true);
 assert.equal(spiritReadoutView({...base,phase:'forecast'},{collectionVersion:2}).kind,'ここまで');assert.equal(spiritReadoutView({...base,phase:'forecast'},{collectionVersion:1}).kind,'抽出見込み');assert.equal(spiritReadoutView({...base,phase:'filled'}).kind,'たる詰め済み');
 for(const options of [{cutInProgress:true},{modalKind:'fill'}])assert.deepEqual(spiritReadoutView(base,freeze(options)),{hidden:true});
 assert.deepEqual(spiritReadoutView({...base,axes:undefined}).axes,[]);
 // Like the existing formatter, this consumes an actual readout projection;
 // it does not repair forged projections with missing numeric values.
 assert.deepEqual(spiritReadoutView({...base,phase:'confirmed'}),{hidden:true});
 assert.throws(()=>spiritReadoutView({phase:'forecast',axes:[]}));
 assert.throws(()=>spiritReadoutView({...base,axes:[{id:'roughness'}]}));
});
test('non-completed states retain the old DOM/Canvas contract; completed results are modal-only',()=>{
 for(const [name,state] of fixtures())for(const modal of [null,{kind:'fill'},{kind:'inspect'}]){
  freeze(state);freeze(modal);const before=JSON.stringify(state),old=render(previous,state,modal),now=render(current,state,modal);
  if(distillationReadout(state)?.phase==='confirmed'){assert.deepEqual(now.trace,[['spirit-readout','hidden',true]],name+' completed result belongs to the modal');assert.equal(now.bridge,null);}else{assert.deepEqual(now.trace,old.trace,name+' ordered DOM writes');assert.deepEqual(now.bridge,old.bridge,name+' Canvas readback');}assert.equal(JSON.stringify(state),before,name+' frozen state');
 }
});
test('dormant forecast/filled and missing axes preserve actual DOM writes without changing the Canvas reader',()=>{
 const state=freeze({still:{phase:'ready',distillation:{collectionVersion:2}}});
 for(const phase of ['estimate','forecast','confirmed','filled'])for(const axes of [undefined,[],[{id:'roughness',value:.25,maximum:1,ratio:.25},{id:'character',value:.75,maximum:1,ratio:.75}]]){
  const readout=freeze({phase,litres:10.25,phrase:'原酒の香り',axes}),read=()=>readout;
  if(phase==='confirmed'){assert.deepEqual(render(current,state,null,read).trace,[['spirit-readout','hidden',true]]);assert.equal(render(current,state,null,read).bridge,null);}else{
  assert.deepEqual(render(current,state,null,read).trace,render(previous,state,null,read).trace,phase);
  assert.deepEqual(render(current,state,null,read).bridge,render(previous,state,null,read).bridge,phase+' stale/missing axes');}
 }
});
test('missing panel returns before readout and hidden panels retain their prior content without extra writes',()=>{
 for(const fn of [previous,current]){
  const ctx={$:()=>null,distillationReadout(){assert.fail('readout must not run without its panel');}};vm.createContext(ctx);vm.runInContext(fn+';renderSpirit();',ctx);
  const result=render(fn,null);assert.deepEqual(result.trace,[['spirit-readout','hidden',true]]);assert.equal(result.nodes.get('spirit-kind').textContent,'previous:spirit-kind');
 }
});
test('repeated frozen projections leave exact formal serialization and subsequent outcomes unchanged',()=>{
 for(const [,state] of fixtures().filter(([name,s])=>s?.operations&&name!=='future collection')){
  const before=D.serializeDistillery(state),readout=distillationReadout(state);freeze(state);freeze(readout);
  for(let n=0;n<10;n++)spiritReadoutView(readout,{cutInProgress:state.still.phase==='distilling'&&!!state.still.distillation?.labChoice});
  assert.equal(D.serializeDistillery(state),before);const restored=D.restoreDistillery(before);assert.equal(D.serializeDistillery(restored),before);
  if(state.still.phase==='distilling')assert.equal(D.serializeDistillery(D.distillStep(state)),D.serializeDistillery(D.distillStep(restored)));
 }
});

test('actual restored old save and automatic staff readouts preserve the same DOM and formal bytes',async()=>{
 const fs=await import('node:fs'),{formalTraces}=await import('./r0-formal-trace.mjs');
 const legacy=JSON.parse(fs.readFileSync(new URL('./fixtures/bottling-policy-legacy.json',import.meta.url),'utf8')).before.raw;
 const staff=formalTraces().find(t=>t.name==='staff-monthly-seed42');
 const automatic=staff.raws.find(raw=>JSON.parse(raw).usual?.reservation?.status==='active');assert(automatic,'real public-operation automatic distillation exists');
 for(const raw of [legacy,automatic]){
  const state=D.restoreDistillery(raw);assert.equal(D.serializeDistillery(state),raw);freeze(state);
  for(const modal of [null,{kind:'fill'}]){const old=render(previous,state,modal),now=render(current,state,modal);if(distillationReadout(state)?.phase==='confirmed'){assert.deepEqual(now.trace,[['spirit-readout','hidden',true]]);assert.equal(now.bridge,null);}else{assert.deepEqual(now.trace,old.trace);assert.deepEqual(now.bridge,old.bridge);}}
  assert.equal(D.serializeDistillery(state),raw);
 }
});
