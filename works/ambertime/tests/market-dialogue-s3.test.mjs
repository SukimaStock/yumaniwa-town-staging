// Synthetic UI facts only: no test stores enter native game state or saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import {marketShopOrder,compactReleaseDate} from '../market-ui.mjs';
import {dialogueCandidates,shopDialogueHistory,createDialogueProjection,DIALOGUE_POLICY} from '../shop-dialogue.mjs';
import {dialogueMarkup} from '../shop-dialogue-view.mjs';
const ids=['town-liquor','supermarket','bar','department'];
function fixture(month=1200){
 const releases=Array.from({length:20},(_,i)=>({id:i+1,brandId:1,productId:i+1,bottledMonth:1+i*12,profile:{flavor:{version:1,profile:{fruit:1,grain:0,smoke:0,body:0,rough:0,spice:0,wood:0,vanilla:0}}}}));
 const deliveries=releases.flatMap(r=>ids.map((shopId,i)=>({id:(r.id-1)*4+i+1,shopId,month:r.bottledMonth+1,brandId:1,releaseId:r.id,productId:r.productId,count:shopId==='department'?5:1,...(shopId==='department'?{selectionId:'s'+r.id,projectId:'p'+r.id,sourceReleaseId:r.id}:{})})));
 return {seed:42,core:{month,products:[]},storeMarket:{version:1,startedMonth:0},alleyBar:{version:1,boundaryMonth:0},operations:[{key:'enable-shop-dialogue',value:{version:2,boundaryMonth:0,progress:null,tastingId:null}}],releases,brands:[{id:1,bottle:'round',label:'cream'}],shop:{relations:ids.map(shopId=>({shopId,brandId:1,startedMonth:0})),deliveries},department:{adoptions:deliveries.filter(d=>d.shopId==='department').map(({productId,shopId,id,...d})=>({...d,deliveryId:id}))}};
}
test('3/5/10 stores retain never-sold and century-dormant rows; a proven new sale revives a store',()=>{
 for(const n of [3,5,10]){
  const shops=[{id:'retail'},...Array.from({length:n},(_,i)=>({id:'s'+i}))];
  const s={core:{month:1200},storeMarket:{startedMonth:20},shop:{deliveries:[{shopId:'s0',month:21,count:1},{shopId:'s1',month:1199,count:1}]}};
  assert.deepEqual(marketShopOrder(s,shops).map(x=>x.id),['retail','s1','s0',...shops.slice(3).map(x=>x.id)]);
  s.storeMarket.byShop={s0:{1:999}};assert.equal(marketShopOrder(s,shops)[1].id,'s1');
  s.shop.deliveries.push({shopId:'s0',month:1200,count:1});assert.equal(marketShopOrder(s,shops)[1].id,'s0');
  s.shop.deliveries.push({shopId:'s2',month:1200,count:1});const expected=marketShopOrder(s,shops);for(let i=0;i<20;i++)assert.deepEqual(marketShopOrder(s,shops),expected);assert.equal(expected.length,n+1);assert.deepEqual(expected.slice(1,3).map(x=>x.id),['s0','s2']);
 }
});
test('legacy or uncertain dates never outrank real shelf sales',()=>{
 const shops=[{id:'retail'},{id:'a'},{id:'b'},{id:'c'}];
 const s={core:{month:1200},storeMarket:{startedMonth:100},shop:{deliveries:[{shopId:'a',month:100,count:999},{shopId:'a',count:999},{shopId:'a',month:1201,count:1},{shopId:'a',month:1199,count:0},{shopId:'c',month:101,count:1}]}};
 assert.deepEqual(marketShopOrder(s,shops).map(x=>x.id),['retail','c','a','b']);delete s.storeMarket;assert.deepEqual(marketShopOrder(s,shops),shops);
});
test('100-year histories keep four voices, exact cooldowns, old packages and restored projection',()=>{
 const s=fixture(),raw=JSON.stringify(s),history=shopDialogueHistory(s);assert.deepEqual(new Set(history.map(x=>x.shopId)),new Set(ids));
 let memory=-Infinity;const last=new Map();for(let i=0;i<history.length;i++){
  const e=history[i];if(i)assert(e.month-history[i-1].month>=DIALOGUE_POLICY.minGap);const k=e.shopId+':'+e.key;assert(e.month-(last.get(k)??-Infinity)>=DIALOGUE_POLICY.sameTextGap);last.set(k,e.month);
  if(e.kind==='memory'){assert(e.month-memory>=DIALOGUE_POLICY.memoryGap);memory=e.month;assert(dialogueMarkup(e,s).includes('package-box'));}else assert(!dialogueMarkup(e,s).includes('<svg'));
 }
 assert.deepEqual(shopDialogueHistory(JSON.parse(raw)),history);assert.equal(JSON.stringify(s),raw);
 for(const month of [120,360])assert.deepEqual(shopDialogueHistory({...s,core:{...s.core,month}}),history.filter(x=>x.month<=month));
 const c=dialogueCandidates(s,1200,'supermarket');assert(c.daily.some(x=>x.key==='gap'));assert(c.memory.some(x=>x.releaseId===1));
 s.shop.deliveries.push({...s.shop.deliveries[1],id:1000,month:1200});s.core.month=1201;assert(dialogueCandidates(s,1201,'supermarket').memory.some(x=>x.key==='return'&&x.releaseId===1));assert.deepEqual(shopDialogueHistory(s).filter(x=>x.month<=1200),history);
});
test('same immutable game is projected once across all store readbacks; reset permits recomputation',()=>{
 const s=fixture();let reads=0;const receipts=s.shop.deliveries;Object.defineProperty(s.shop,'deliveries',{get(){reads++;return receipts;}});
 const p=createDialogueProjection();p.read(s);const first=reads;assert(first>0);for(let i=0;i<100;i++)for(const id of ids)p.read(s,id);assert.equal(reads,first);
 p.read({...s,core:{...s.core,month:1201}});assert(reads>first);const next=reads;p.reset();p.read(s);assert(reads>next);
});
test('century-colliding bottle dates retain the full year',()=>{
 const s={core:{products:[{id:1},{id:2}]},releases:[{productId:1,bottledMonth:1},{productId:2,bottledMonth:1201}]};assert.notEqual(compactReleaseDate(s,1),compactReleaseDate(s,2));assert.match(compactReleaseDate(s,1),/^\d{4}\//);assert.match(compactReleaseDate(s,2),/^\d{4}\//);
});

test('public model: an old bottle sells again after three dormant years, with conserved stock and return-memory evidence',async()=>{
 const fs=await import('node:fs');const D=await import('../partner-orders.mjs');const {advance}=await import('./brands-helpers.mjs');
 const raw=JSON.parse(fs.readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url))).raw;
 let s=D.enableShopDialogue(D.enableAlleyBar(D.enableMarketRules(D.enableStoreMarket(D.restoreDistillery(raw)))));
 for(let i=0;i<24&&s.shop.offer?.shopId!=='bar';i++)s=advance(s,1);assert.equal(s.shop.offer?.shopId,'bar');s=D.acceptShop(s,'bar',s.shop.offer.id);
 const productId=s.result.productId,releaseId=s.releases.find(r=>r.productId===productId).id;
 const sales=g=>g.shop.deliveries.filter(d=>d.shopId==='bar'&&d.productId===productId&&d.month>g.storeMarket.startedMonth);
 const place=g=>D.assignStoreProduct(g,{productId,shopId:'bar',count:1});
 const firstBefore=s; s=place(s);assert.equal(s.core.cash,firstBefore.core.cash);assert.deepEqual(s.shop.deliveries,firstBefore.shop.deliveries);
 for(let i=0;i<24&&!sales(s).length;i++)s=advance(s,1);assert.equal(sales(s).length,1);const first=sales(s)[0].month;
 s=advance(s,36);assert(s.core.month-first>=36);assert.equal(sales(s).length,1);assert(marketShopOrder(s).some(x=>x.id==='bar'));
 const before=s,stock=s.core.products.find(p=>p.id===productId).stock;s=place(s);assert.equal(s.core.cash,before.core.cash);assert.deepEqual(s.shop.deliveries,before.shop.deliveries);
 for(let i=0;i<24&&sales(s).length===1;i++)s=advance(s,1);assert.equal(sales(s).length,2);assert(sales(s)[1].month-first>=36);assert.equal(s.core.products.find(p=>p.id===productId).stock,stock-1);
 assert.equal(marketShopOrder(s)[1].id,'bar');s=advance(s,1);assert(dialogueCandidates(s,s.core.month,'bar').memory.some(x=>x.key==='return'&&x.releaseId===releaseId));
 const saved=D.serializeDistillery(s);assert.equal(D.serializeDistillery(D.restoreDistillery(saved)),saved);
});
