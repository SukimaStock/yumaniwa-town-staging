import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as D from '../partner-orders.mjs';
import {SHOP_DIALOGUE_TEXT} from '../shop-dialogue-text.mjs';
import {dialogueCandidates,shopDialogueHistory,latestShopDialogue,DIALOGUE_POLICY,createDialogueProjection} from '../shop-dialogue.mjs';
import {dialogueMarkup} from '../shop-dialogue-view.mjs';
const profile=(smoke=1)=>({flavor:{version:1,profile:{fruit:0,grain:0,smoke,body:0,rough:0,spice:0,wood:0,vanilla:0}}});
// Synthetic immutable projections below are not claimed as lawful saved games.
const fixture=(month=120)=>({seed:42,core:{month},shop:{relations:[{shopId:'town-liquor',brandId:1,startedMonth:0}],deliveries:[{id:1,shopId:'town-liquor',brandId:1,releaseId:1,productId:3,month:2,count:1}]},releases:[{id:1,brandId:1,productId:3,bottledMonth:1,profile:profile()}],brands:[{id:1,bottle:'round',label:'cream'}]});
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
test('all nine author lines are exact, separate and immutable',()=>{
 assert.deepEqual(Object.values(SHOP_DIALOGUE_TEXT['town-liquor'].daily),['新しいお酒ですか？ちょっと置いてみましょうか。','この間のお酒、良い感じで売れてますよ！','うちのお客さん、ハイボール好きが多いんですよ。','今度はもう少し軽くてもいいかもですね。','ご無沙汰です！お元気ですか？']);
 assert.deepEqual(Object.values(SHOP_DIALOGUE_TEXT['town-liquor'].memory),['あの青い箱、また欲しいって人がいたんですよ！','そういえば、前に置いたあのお酒、覚えてますか？','何年か前のあれ、今でも好きだって人がいるんですよ。','おお、久しぶりに見ましたね、この箱。']);assert(Object.isFrozen(SHOP_DIALOGUE_TEXT['town-liquor'].memory));
});
test('allocations and offers are not sales; absent shop is silent',()=>{
 const s=fixture(10);s.shop.deliveries=[];s.storeMarket={byShop:{'town-liquor':{3:99}}};assert(!dialogueCandidates(s).daily.some(x=>x.key==='sold'));assert.equal(dialogueCandidates(s).memory.length,0);s.shop.relations=[];assert.deepEqual(dialogueCandidates(s),{daily:[],memory:[]});
});
test('recent sale, no same-month leakage, factual gap; one old sale survives inactivity',()=>{
 const s=fixture(3);assert(dialogueCandidates(s).daily.some(x=>x.key==='sold'));assert.equal(dialogueCandidates(s).memory.length,0);s.core.month=2;assert(!dialogueCandidates(s).daily.some(x=>x.key==='sold'));s.core.month=26;const c=dialogueCandidates(s);assert(c.daily.some(x=>x.key==='gap'));assert(c.memory.some(x=>x.key==='remember'));assert(!c.memory.some(x=>x.key==='return'));s.shop.relations=[];assert(dialogueCandidates(s).memory.length>0);
});
test('exact shop/release/product/brand and original profile required; blue means smoke box',()=>{
 for(const mutate of [s=>s.shop.deliveries[0].shopId='supermarket',s=>s.shop.deliveries[0].productId=999,s=>s.shop.deliveries[0].brandId=999,s=>s.releases=[],s=>s.releases[0].profile={},s=>s.shop.deliveries[0].count=0]){const s=fixture();mutate(s);assert.equal(dialogueCandidates(s).memory.length,0);}
 const s=fixture();assert(dialogueCandidates(s).memory.some(x=>x.key==='blue'));s.releases[0].profile.flavor.profile={fruit:1,grain:0,smoke:0,body:0,rough:0,spice:0,wood:0,vanilla:0};assert(!dialogueCandidates(s).memory.some(x=>x.key==='blue'));
});
test('return requires actual reappearance after a real gap, not inactivity alone',()=>{
 const s=fixture(40);assert(!dialogueCandidates(s).memory.some(x=>x.key==='return'));s.shop.deliveries.push({...s.shop.deliveries[0],id:2,month:39});assert(dialogueCandidates(s).memory.some(x=>x.key==='return'));s.shop.deliveries.push({...s.shop.deliveries[0],id:3,month:38});assert(!dialogueCandidates(s).memory.some(x=>x.key==='return'));
});
test('deterministic history, latest-only and cooldowns; no RNG or save mutation',()=>{
 const s=freeze(fixture(1200)),raw=JSON.stringify(s),a=shopDialogueHistory(s);assert(a.length>0);assert(a.some(x=>x.kind==='memory'));assert(a.filter(x=>x.kind==='daily').length>a.filter(x=>x.kind==='memory').length);
 for(let i=1;i<a.length;i++)assert(a[i].month-a[i-1].month>=DIALOGUE_POLICY.minGap);
 for(const entry of a){const prior=a.filter(x=>x.month<entry.month&&x.key===entry.key).at(-1);if(prior)assert(entry.month-prior.month>=DIALOGUE_POLICY.sameTextGap);}
 assert.deepEqual(latestShopDialogue(s),a.at(-1));assert.equal(latestShopDialogue(s,'supermarket'),null);assert.deepEqual(shopDialogueHistory(JSON.parse(raw)),a);assert.equal(JSON.stringify(s),raw);
});
test('future releases/deliveries do not rewrite old conversation; same month is sealed',()=>{
 const s=fixture(100);const history=shopDialogueHistory(s);s.shop.deliveries.push({...s.shop.deliveries[0],id:2,month:100});s.releases.push({...s.releases[0],id:2,productId:4,bottledMonth:100});assert.deepEqual(shopDialogueHistory(s),history);s.core.month=180;assert.deepEqual(shopDialogueHistory(s).filter(x=>x.month<=100),history);
});
test('package uses immutable release color and original standard cap, not current inventory or tier',()=>{
 const s=fixture();const memory={...dialogueCandidates(s).memory.find(x=>x.key==='blue'),id:'test',kind:'memory',text:SHOP_DIALOGUE_TEXT['town-liquor'].memory.blue};const a=dialogueMarkup(memory,s);s.productsById={3:{selectedPrice:'high'}};s.core.products=[];assert.equal(dialogueMarkup(memory,s),a);assert.match(a,/data-package-family="smoke"/);assert.match(a,/package-box/);assert(!dialogueMarkup({id:'daily',kind:'daily',text:'hello'},s).includes('<svg'));assert(!a.includes('<button'));
});
test('actual lawful saved fixture: projection preserves formal bytes and restored latest, reset isolates saves',()=>{
 const input=JSON.parse(readFileSync(new URL('./fixtures/placement-established-six.json',import.meta.url),'utf8'));const raw=typeof input==='string'?input:input.raw??input.distillery??input.game??input.state;assert.equal(typeof raw,'string');const s=D.restoreDistillery(raw),before=D.serializeDistillery(s),cache=createDialogueProjection();const a=cache.read(s);assert.equal(D.serializeDistillery(s),before);assert.deepEqual(latestShopDialogue(D.restoreDistillery(before)),a);cache.reset();assert.equal(cache.read({core:{month:0}}),null);
});
