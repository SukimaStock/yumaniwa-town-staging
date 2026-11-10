import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 BREATH_PERIOD_MS,BREATH_REPLY_DELAY_MS,BREATH_MAX_SCALE,BREATH_PATTERNS,
 shopBreathRoles,authoredSpriteBounds,authoredShopPixelIsVisible,
 alphaMaskShopCrop,breathParticipants
} from './breath-view.mjs';
import {SCENARIOS,fixtureState} from './fixtures.mjs';
import {shopRelationshipEvidence} from './relationship-view.mjs';

const shopBounds={
 'town-liquor':[86,44,16,16],supermarket:[98,92,16,16],bar:[28,112,16,16]
};
const visible=['town-liquor','bar'];
const relation=id=>{
 const state=fixtureState(SCENARIOS.find(s=>s.id===id));
 return shopRelationshipEvidence(state,'bar',{
  visibleShopIds:state.shop.relations.map(r=>r.shopId),
  mapShopIds:Object.keys(shopBounds)
 });
};

test('A, B and C share one breathing period and have distinct roles',()=>{
 assert.deepEqual(BREATH_PATTERNS.map(p=>p.id),['together','reply','partner']);
 assert.equal(BREATH_PERIOD_MS,2200);
 assert.equal(BREATH_REPLY_DELAY_MS,320);
 assert.equal(BREATH_MAX_SCALE,1.28);
 assert.deepEqual(shopBreathRoles('together'),{source:true,target:true,sourceDelay:0,targetDelay:0});
 assert.deepEqual(shopBreathRoles('reply'),{source:true,target:true,sourceDelay:0,targetDelay:320});
 assert.deepEqual(shopBreathRoles('partner'),{source:true,target:false,sourceDelay:0,targetDelay:0});
 assert.equal(shopBreathRoles('invalid'),null);
});
test('only two existing authored stage-3 shop sprites may be cut out',()=>{
 assert.deepEqual(authoredSpriteBounds('town-liquor',shopBounds),{x:86,y:44,w:16,h:16});
 assert.deepEqual(authoredSpriteBounds('supermarket',shopBounds),{x:98,y:92,w:16,h:16});
 assert.equal(authoredSpriteBounds('bar',shopBounds),null);
 assert.equal(authoredSpriteBounds('department',shopBounds),null);
 assert.equal(authoredSpriteBounds('town-liquor',{'town-liquor':[86,46,16,16]}),null);
});
test('8-cell authored sprite mask omits empty terrain above the roof',()=>{
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  const expected=y<2?x>=4&&x<12:y<6?x>=2&&x<14:true;
  assert.equal(authoredShopPixelIsVisible(x,y),expected,JSON.stringify({x,y}));
 }
 for(const p of [[-1,0],[0,-1],[16,0],[0,16],[.5,5]])
  assert.equal(authoredShopPixelIsVisible(...p),false);
});
test('pixel mask clears only the temporary RGBA cutout, not the source data',()=>{
 const source=new Uint8ClampedArray(16*16*4).fill(255);
 const snapshot=source.slice(),masked=alphaMaskShopCrop(snapshot);
 assert.equal(source.every(x=>x===255),true);
 assert.equal(masked[(0*16+0)*4+3],0);
 assert.equal(masked[(0*16+6)*4+3],255);
 assert.equal(masked[(15*16+15)*4+3],255);
 for(let y=0;y<16;y++)for(let x=0;x<16;x++)
  assert.equal(masked[(y*16+x)*4+3],authoredShopPixelIsVisible(x,y)?255:0);
 assert.throws(()=>alphaMaskShopCrop(new Uint8ClampedArray(12)),TypeError);
});
test('A animates two, B staggers only destination, C animates only partner',()=>{
 const proof=relation('after');
 assert.equal(proof?.eventId,'e4');
 assert.deepEqual(breathParticipants(proof,'together',visible),[
  {id:'town-liquor',role:'source',delayMs:0},{id:'bar',role:'target',delayMs:0}
 ]);
 assert.deepEqual(breathParticipants(proof,'reply',visible),[
  {id:'town-liquor',role:'source',delayMs:0},{id:'bar',role:'target',delayMs:320}
 ]);
 assert.deepEqual(breathParticipants(proof,'partner',visible),[{id:'town-liquor',role:'source',delayMs:0}]);
});
test('no arrivals, uncontracted partner and unverified geometry never breathe',()=>{
 for(const name of ['before','missing'])assert.equal(relation(name),null);
 for(const name of ['before','missing'])
  assert.deepEqual(breathParticipants(relation(name),'reply',visible),[]);
 const proof=relation('after');
 assert.deepEqual(breathParticipants({...proof,canDrawLink:false},'together',visible),[]);
 assert.deepEqual(breathParticipants(proof,'together',['town-liquor']),[]);
 assert.deepEqual(breathParticipants(proof,'unknown',visible),[]);
 assert.deepEqual(breathParticipants({...proof,selectedShopId:'town-liquor'},'reply',visible),[]);
});
test('relationship evidence and viewer do not mutate factual fixture state',()=>{
 const s=fixtureState(SCENARIOS.find(v=>v.id==='after')),serialized=JSON.stringify(s);
 const e=shopRelationshipEvidence(s,'bar',{mapShopIds:visible});
 breathParticipants(e,'reply',visible);
 assert.equal(JSON.stringify(s),serialized);
});
test('active HTML/CSS and script contain no old focus overlay, animation ticker or click interception',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
 assert.match(html,/id="breath-layer"/);
 for(const id of BREATH_PATTERNS.map(p=>p.id))assert.match(html,new RegExp('data-style="'+id+'"'));
 assert.doesNotMatch(html,/focus-mask|pixel-layer|line-layer|id="replay"/);
 assert.match(app,/alphaMaskShopCrop/);
 assert.match(app,/breathParticipants/);
 assert.doesNotMatch(app,/applyFocus|paintTownContrast|focusViewport|setInterval|stroke-dasharray/);
 assert.match(css,/animation:shop-breathe/);
 assert.match(css,/steps\(8,end\)/);
 assert.match(css,/animation-play-state:paused/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.breath-layer\{pointer-events:none\}/);
});
