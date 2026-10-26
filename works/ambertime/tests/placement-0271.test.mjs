import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlacementUI} from '../placement-ui.mjs';
function harness(relations=[],result={ok:true,changed:true,text:'自家販売へ1本回しました。'},{age=12,available=6,retail=0}={}){
 globalThis.matchMedia=()=>({matches:false,addEventListener(){}});globalThis.window={addEventListener(){}};
 const elements=new Map(),animations=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{_text:'',get textContent(){return this._text},set textContent(value){this._text=String(value)},hidden:false,dataset:{},classList:{toggle(){}},closest(){return this},setAttribute(){},animate(){const a={cancel(){this.oncancel?.()}};animations.push(a);return a;}});return elements.get(id)};
 const doc={getElementById:element,addEventListener(){},querySelectorAll:()=>[],querySelector:()=>element('undo')};
 let state={shop:{relations},core:{products:[{id:1,age}]},releases:[{id:2,productId:1,brandId:3}]};
 let answer=result;
 const model={placementInventory:()=>({available,retail}),placementQuote:()=>({ok:false,reason:'今月は納品できません',maxCount:0}),placementWish:()=>null};
 let ui;ui=createPlacementUI({document:doc,model,state:()=>state,art:()=>'',icon:'',commit:()=>answer,render:()=>{ui.markup(1);ui.update()}});
 const action=(kind,id)=>ui.handle({target:{closest:()=>({dataset:{action:'placement-'+kind,id},disabled:false})}});
 const confirm=()=>action('confirm');
 return {ui,element,animations,confirm,action,setAnswer:x=>answer=x};
}
test('shop visibility uses release brand and actual town relation, reasons only for related brand',()=>{
 for(const relations of [[],[{brandId:9,shopId:'town-liquor'}],[{brandId:3,shopId:'supermarket'}]]){
  const h=harness(relations),m=h.ui.markup(1).body;h.ui.update();assert.doesNotMatch(m,/data-id="shop"/);assert.equal(h.element('placement-reason').textContent,'');
 }
 const h=harness([{brandId:3,shopId:'town-liquor'}]);assert.match(h.ui.markup(1).body,/data-id="shop"/);h.ui.update();assert.equal(h.element('placement-reason').textContent,'今月は納品できません');assert.equal(h.element('placement-shop').disabled,true);
});
test('saved changed feedback is transient; failure clears prior success and cancels motion; noop stays neutral',()=>{
 const h=harness();h.ui.markup(1);h.confirm();assert.equal(h.element('placement-receipt').textContent,'自家販売へ1本回しました。');assert.equal(h.animations.length,1);
 h.setAnswer({ok:false});h.confirm();assert.equal(h.element('placement-receipt').textContent,'');assert.equal(h.ui.diagnostics().motions,0);
 h.setAnswer({ok:true,changed:false,text:'配分は変わっていません。'});h.confirm();assert.equal(h.element('placement-receipt').dataset.changed,'false');assert.equal(h.animations.length,1);assert.equal(h.ui.diagnostics().motions,0);
});
test('details, separate pricing, and live receipt stay outside the allocation explanation',()=>{
 const h=harness(),m=h.ui.markup(1,{details:'<b>味</b>',prices:'<aside>価格</aside>',other:'<nav>申し出</nav>'});assert.match(m.body,/<b>味<\/b><\/details><aside>価格<\/aside><nav>申し出<\/nav>/);assert.doesNotMatch(m.body,/従来|自動発送|取扱いのあと/);assert.match(m.actions,/role="status" aria-live="polite" aria-atomic="true"/);
});

test('0.27.2 age/count wording and only two draft controls, including long age',()=>{
 const h=harness([],undefined,{age:2,available:11}),m=h.ui.markup(1).body;
 assert.match(m,/>2か月・11本<\/p>/);assert.match(m,/手元 <output/);assert.doesNotMatch(m,/使える|残す|元の配分|placement-reset/);
 const labels=[...m.matchAll(/data-action="placement-(undo|redistribute)"[^>]*>([^<]+)/g)].map(x=>x[2]);assert.deepEqual(labels,['ひとつ戻す','全部分け直す']);
 h.ui.update();assert.equal(h.element('undo').disabled,true);assert.equal(h.element('placement-hand').textContent,'11');
 assert.match(harness([],undefined,{age:14}).ui.markup(1).body,/>1年2か月・6本<\/p>/);
 assert.match(harness([],undefined,{age:24}).ui.markup(1).body,/>2年・6本<\/p>/);
});
test('0.27.2 existing undo removes one tap and restores redistribution of unsold retail',()=>{
 const h=harness([],undefined,{age:2,available:11});h.ui.markup(1);h.action('place','retail');assert.equal(h.element('placement-hand').textContent,'10');h.action('undo');assert.equal(h.element('placement-hand').textContent,'11');
 h.action('portion','2');h.action('place','retail');h.action('place','retail');assert.equal(h.element('placement-retail').textContent,'4本');h.action('undo');assert.equal(h.element('placement-retail').textContent,'2本');assert.equal(h.element('placement-hand').textContent,'9');
 const r=harness([],undefined,{available:11,retail:3});r.ui.markup(1);r.action('place','retail');const before=r.ui.diagnostics().draft.allocation;r.action('redistribute');assert.equal(r.element('placement-hand').textContent,'11');assert.equal(r.element('placement-retail').textContent,'0本');r.action('undo');assert.deepEqual(r.ui.diagnostics().draft.allocation,before);assert.equal(r.element('placement-hand').textContent,'7');
});
