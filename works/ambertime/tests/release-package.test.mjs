import test from 'node:test';
import assert from 'node:assert/strict';
import {PACKAGE_PALETTE,packageFamily,packageBox,packageArt,releasePackageArt,packageLayer} from '../release-package.mjs';
import {glassColor} from '../flavor-color.mjs';
import {bottles,codeaBottle} from '../codea-object-art.mjs';
import {IDENTITY_BOTTLES,IDENTITY_LABELS} from '../brand-identity.mjs';
import {firstBottleCompletion,firstBottleBareBottle,firstBottleLabelLayer} from '../first-bottle-view.mjs';
import * as D from '../partner-orders.mjs';
const snapshot=(family='fruit')=>({flavor:{version:1,primary:'smoke',profile:{fruit:.1,grain:.1,smoke:.1,body:.1,rough:.2,spice:.2,wood:.2,vanilla:.2,...(family==='mixed'?{fruit:.92,grain:1}:{[family]:.9})}}});
const contents=svg=>svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>'));
const front=svg=>svg.match(/<g class="package-bottle" transform="translate\(-2 \d+\) scale\(2\)">([\s\S]*)<\/g><\/svg>/)?.[1];

test('five classic colors reuse glass display family, independently of original primary',()=>{
 for(const family of Object.keys(PACKAGE_PALETTE)){
  const input=snapshot(family),svg=packageArt(input);
  assert.equal(packageFamily(input),family);
  assert.equal(packageFamily(input),glassColor(input.flavor.profile).family);
  assert.match(svg,new RegExp('data-package-family="'+family+'"'));
  assert.ok(svg.includes('fill="'+PACKAGE_PALETTE[family]+'"'));
 }
});

test('legacy, incomplete and invalid eight-axis records retain the exact native bottle',()=>{
 const invalid=[null,{}, {roughness:.1,character:.9,wood:.1}, {flavor:{...snapshot().flavor,version:2}}];
 for(const key of Object.keys(snapshot().flavor.profile))for(const value of [undefined,NaN,Infinity,-.1,1.1,'0.5']){
  const input=snapshot();input.flavor.profile[key]=value;invalid.push(input);
 }
 const brand={bottle:'fancy',label:'dark'},native=codeaBottle('fancy',{label:'dark',priceTier:'high'});
 for(const input of invalid){assert.equal(packageFamily(input),null);assert.equal(packageArt(input,brand,'high'),native);}
});

test('all 24 bottle, label and cap combinations preserve native cells behind exact C1-L geometry',()=>{
 for(const bottle of IDENTITY_BOTTLES)for(const label of IDENTITY_LABELS)for(const tier of ['low','standard','high']){
  const brand={bottle:bottle.id,label:label.id},svg=packageArt(snapshot(),brand,tier);
  assert.equal(front(svg),contents(codeaBottle(bottle.shape,{label:label.id,priceTier:tier})));
  assert.match(svg,/viewBox="0 0 24 24"/);
  assert.match(svg,/shape-rendering="crispEdges"/);
  assert.match(svg,/<rect x="12" y="5" width="10" height="18"/);
  assert.ok(svg.indexOf('class="package-box"')<svg.indexOf('class="package-bottle"'));
  assert.doesNotMatch(svg,/gradient|filter|blur/i);
 }
});

test('release resolver is pure, prioritizes bottled release and survives absent inventory',()=>{
 const state={brands:[{id:1,bottle:'square',label:'dark'}],releases:[{productId:7,brandId:1,profile:snapshot('grain')}],records:[{productId:7,profile:snapshot('smoke')}],productsById:{7:{selectedPrice:'high'}},core:{products:[],casks:[{flavor:snapshot('body').flavor}]},rng:123};
 const before=structuredClone(state),expected=packageArt(snapshot('grain'),state.brands[0],'high');
 for(let i=0;i<3;i++)assert.equal(releasePackageArt(state,7,{snapshot:snapshot('fruit')}),expected);
 assert.deepEqual(state,before);
 assert.equal(releasePackageArt(JSON.parse(JSON.stringify(state)),7),expected);
 assert.equal(packageFamily({flavor:snapshot('grain').flavor}),'grain');
 assert.doesNotMatch(releasePackageArt({...state,releases:[{profile:snapshot('fruit')}]},null),/data-package-family/);
 const recordsOnly={...state,releases:[],records:[{productId:7,brandId:1,profile:snapshot('smoke')}]};
 assert.equal(releasePackageArt(recordsOnly,7),packageArt(snapshot('smoke'),state.brands[0],'high'));
});

test('actual bottling, source aging and serialization retain identical package without state or RNG writes',()=>{
 let s=D.newConnectedDistillery(42);
 s=D.selectFlavorCards(s,{malt:'plain',ferment:'long'});s=D.startDistillation(s);
 while(s.still.distillation.progress<40)s=D.distillStep(s);
 s=D.beginCollection(s);while(s.still.distillation.progress<58)s=D.distillStep(s);
 s=D.fillBarrel(D.stopDistillation(s),'refill');const caskId=s.core.casks.at(-1).id;
 s=D.bottleBranded(s,caskId,{},3);const productId=s.result.productId,initial=D.serializeDistillery(s),art=releasePackageArt(s,productId),profile=structuredClone(s.releases[0].profile);
 assert.match(art,/data-package-family/);assert.equal(D.serializeDistillery(s),initial);
 assert.equal(releasePackageArt(D.restoreDistillery(initial),productId),art);
 for(let n=0;n<6;n++){const month=s.core.month;s=D.tickDistillery(s);assert.equal(s.core.month,month+1);}
 assert.notDeepEqual(s.core.casks.find(c=>c.id===caskId).flavor.profile,profile.flavor.profile);
 assert.deepEqual(s.releases[0].profile,profile);
 const aged=D.serializeDistillery(s);assert.equal(releasePackageArt(s,productId),art);assert.equal(D.serializeDistillery(s),aged);
 assert.equal(releasePackageArt(D.restoreDistillery(aged),productId),art);
});

test('first-bottle label and base use identical package transform while only the base adds a box',()=>{
 for(const bottle of IDENTITY_BOTTLES)for(const labelChoice of IDENTITY_LABELS){
 const brand={name:'AmberTime',bottle:bottle.id,label:labelChoice.id},input=snapshot('body'),shape=bottle.shape;
 const bare=packageLayer(firstBottleBareBottle(brand,'high'),input,{shape}),label=packageLayer(firstBottleLabelLayer(brand),input,{box:false,shape});
 assert.equal(front(bare),contents(firstBottleBareBottle(brand,'high')));
 assert.equal(front(label),contents(firstBottleLabelLayer(brand)));
 assert.doesNotMatch(label,/class="package-box"/);
 const html=firstBottleCompletion(brand,7,'high',{esc:String},true,input);
 assert.ok(html.includes(bare));assert.ok(html.includes(label));
 assert.equal((html.match(/class="package-box"/g)??[]).length,1);
 assert.equal((html.match(/transform="translate\(-2 \d+\) scale\(2\)"/g)??[]).length,2);
 const baseTransform=bare.match(/transform="([^"]+)"/)[1];
 assert.equal(label.match(/transform="([^"]+)"/)[1],baseTransform);
 assert.match(html,/data-static="true"/);assert.equal((html.match(/<button /g)??[]).length,1);
 }
});

// Regression: compare visible pixel bounds, not the SVG viewport bottom.
test('every bottle silhouette sits on the box baseline without changing cells or scale',()=>{
 for(const bottle of IDENTITY_BOTTLES){
  const svg=packageArt(snapshot(),{bottle:bottle.id});
  const offset=Number(svg.match(/translate\(-2 (\d+)\)/)[1]);
  const rows=bottles[bottle.shape];
  const bottom=rows.reduce((last,row,y)=>row.some(Boolean)?y+1:last,0);
  assert.equal(bottom*2+offset,23);
  assert.equal(offset,bottle.id==='square'?3:1);
  assert.equal(front(svg),contents(codeaBottle(bottle.shape,{label:'cream',priceTier:'standard'})));
 }
});

// The box shares the bottle cells' pitch AND phase, not merely crisp edges.
test('box borders and decoration share the bottle two-unit pixel grid in all five colors',()=>{
 for(const family of Object.keys(PACKAGE_PALETTE)){
  const box=packageBox(snapshot(family));
  const cells=[...box.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)].map(m=>m.slice(1).map(Number));
  assert.equal(cells.length,5);
  for(const [x,y,w,h] of cells){
   assert.equal(x%2,0);assert.equal(y%2,1);
   assert.equal(w%2,0);assert.equal(h%2,0);
   assert.ok(x>=12&&x+w<=22&&y>=5&&y+h<=23);
  }
  assert.deepEqual(cells[0],[12,5,10,18]);
 }
});
test('completion omits visible tap copy while preserving native button and accessible action',()=>{
 for(const staticDone of [false,true])for(const input of [null,snapshot()]){
  const html=firstBottleCompletion({name:'AmberTime',bottle:'square',label:'cream'},7,'standard',{esc:String},staticDone,input);
  assert.doesNotMatch(html,/first-bottle-tap-hint|>ビンをタップ</);
  assert.match(html,/<button type="button"[^>]*data-action="first-bottle-proceed"[^>]*data-id="7"/);
  assert.match(html,/aria-label="AmberTime。完成したビンをタップして販売室へ進む"/);
  assert.match(html,/first-bottle-label/);
 }
});
