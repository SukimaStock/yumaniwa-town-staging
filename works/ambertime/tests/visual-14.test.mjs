import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {soldOutLabel} from '../message-view.mjs';
const read=n=>fs.readFileSync(new URL('../'+n,import.meta.url),'utf8');
test('complete native release history uses per-brand sequence, sparse legacy retains factual IDs and same-name identity',()=>{
 const s={brands:[{id:1,name:'AmberTime'},{id:2,name:'AmberTime'}],releases:[{id:1,brandId:1,productId:11},{id:2,brandId:2,productId:22},{id:3,brandId:1,productId:33},{id:4,brandId:1,productId:44}]};const raw=JSON.stringify(s);
 assert.equal(soldOutLabel(s,44),'AmberTime（ブランド #1） 第3回');assert.equal(soldOutLabel(s,22),'AmberTime（ブランド #2） 第1回');s.releases.reverse();assert.equal(soldOutLabel(s,44),'AmberTime（ブランド #1） 第3回');s.releases.reverse();assert.equal(JSON.stringify(s),raw);
 const sparse=structuredClone(s);sparse.releases.splice(1,1);assert.equal(soldOutLabel(sparse,44),'AmberTime（ブランド #1）・発売 #4');assert.equal(soldOutLabel({records:[{productId:44,releaseId:4,brandId:1}],brands:s.brands},44),'AmberTime（ブランド #1）・発売 #4');
});
test('only requested Canvas baselines, count offset and finite countdown shadow change',()=>{
 const c=read('canvas-scene.mjs');assert(c.includes("['start-distill','stop-distill','open-fill','go-distill'].includes(a.key)"));assert(c.includes('countX=mid-24+4/v.scale'));assert(c.includes("180+dot,228+dot,48,'center',shadow"));assert(!c.includes('shadowBlur'));assert(c.includes('this.textMetrics(48).pixels/8/this.textMetrics(48).unit'));
});
test('price remains visible before controls and receipt follows buttons, accessible/focus-safe',()=>{
 const app=read('shop-app.mjs'),ui=read('placement-ui.mjs');assert(app.includes('placement-current-price'));assert(app.includes('unit(prices[meta.selectedPrice])'));assert(app.includes("button('やり直す','brand-edit')"));assert.match(ui,/actions:button\('これで決める'[\s\S]*?button\('戻る','close'\)\+'<p id="placement-receipt"/);assert(ui.includes('aria-live="polite"'));assert(ui.includes('focus({preventScroll:true})'));assert(ui.includes("[data-action=\"placement-redistribute\"]').disabled=a.retail===0&&a.shop===0"));
});
test('bottling policy copy describes actual listed stock and held output without promising automatic retail',()=>{
 const app=read('shop-app.mjs');assert(app.includes('販売登録済みのビンが'));assert(app.includes('販売登録済みのビン全体'));assert(app.includes("'熟成'+r.age+'か月以上で一度"));assert(app.includes('か月以上になったら'));assert(app.includes('本以下になったら'));assert(app.includes('ふつうの価格でビン詰め。行き先はあとで配分'));assert(!app.includes('ふつうの価格で販売開始'));assert(read('room-scene.css').includes('.objects::after{content:none}'));
});

test('redistribute disables exact no-op, re-disables after undo/clear, but preserves existing retail-only recovery',async()=>{
 const {createPlacementUI}=await import('../placement-ui.mjs');globalThis.matchMedia=()=>({matches:false,addEventListener(){}});globalThis.window={addEventListener(){}};
 for(const retail of [0,6]){
  const nodes=new Map();const el=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',dataset:{},classList:{toggle(){}},closest(){return this},setAttribute(){}});return nodes.get(id)};
  const doc={getElementById:el,querySelectorAll:()=>[],querySelector:selector=>el(selector),addEventListener(){}};
  const state={shop:{relations:[]},releases:[{id:1,productId:1,brandId:1}],core:{products:[{id:1,age:12}]}},ui=createPlacementUI({document:doc,model:{placementInventory:()=>({available:6,retail}),placementQuote:()=>({ok:false,reason:'',maxCount:0})},state:()=>state,art:()=>'',icon:'',commit(){},render(){}});
  const action=(kind,id)=>ui.handle({target:{closest:()=>({dataset:{action:'placement-'+kind,id},disabled:false})}}),disabled=()=>el('[data-action="placement-redistribute"]').disabled;
  ui.markup(1);ui.update();assert.equal(disabled(),retail===0);
  if(!retail){action('place','retail');assert.equal(disabled(),false);action('undo');assert.equal(disabled(),true);action('place','retail');}
  action('redistribute');assert.equal(disabled(),true);assert.equal(ui.diagnostics().draft.allocation.retail,0);
 }
});
