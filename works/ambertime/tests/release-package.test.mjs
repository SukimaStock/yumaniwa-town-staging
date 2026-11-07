import test from 'node:test';
import assert from 'node:assert/strict';
import {PACKAGE_PALETTE,packageFamily,packageArt,releasePackageArt,packageLayer} from '../release-package.mjs';
import {glassColor} from '../flavor-color.mjs';
import {codeaBottle} from '../codea-object-art.mjs';
import {IDENTITY_BOTTLES,IDENTITY_LABELS} from '../brand-identity.mjs';
import {firstBottleCompletion,firstBottleBareBottle,firstBottleLabelLayer} from '../first-bottle-view.mjs';
import * as D from '../partner-orders.mjs';
const snapshot=(family='fruit')=>({flavor:{version:1,primary:'smoke',profile:{fruit:.1,grain:.1,smoke:.1,body:.1,rough:.2,spice:.2,wood:.2,vanilla:.2,...(family==='mixed'?{fruit:.92,grain:1}:{[family]:.9})}}});
const contents=svg=>svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>'));
const front=svg=>svg.match(/<g class="package-bottle" transform="translate\(-2 0\) scale\(2\)">([\s\S]*)<\/g><\/svg>/)?.[1];

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
  assert.match(svg,/<rect x="12" y="4" width="11" height="19"/);
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
 const brand={name:'AmberTime',bottle:'fancy',label:'dark'},input=snapshot('body');
 const bare=packageLayer(firstBottleBareBottle(brand,'high'),input),label=packageLayer(firstBottleLabelLayer(brand),input,{box:false});
 assert.equal(front(bare),contents(firstBottleBareBottle(brand,'high')));
 assert.equal(front(label),contents(firstBottleLabelLayer(brand)));
 assert.doesNotMatch(label,/class="package-box"/);
 const html=firstBottleCompletion(brand,7,'high',{esc:String},true,input);
 assert.ok(html.includes(bare));assert.ok(html.includes(label));
 assert.equal((html.match(/class="package-box"/g)??[]).length,1);
 assert.equal((html.match(/transform="translate\(-2 0\) scale\(2\)"/g)??[]).length,2);
 assert.match(html,/data-static="true"/);assert.equal((html.match(/<button /g)??[]).length,1);
});
