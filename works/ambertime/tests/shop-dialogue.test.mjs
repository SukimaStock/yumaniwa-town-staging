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

const withBar=(month=1200)=>{
 const s=fixture(month);s.alleyBar={version:1,boundaryMonth:60};s.shop.relations.push({shopId:'bar',brandId:1,startedMonth:60});
 s.shop.deliveries.push({...s.shop.deliveries[0],id:2,shopId:'bar',month:62});return s;
};
test('bar manuscript preserves all nine author lines independently of town',()=>{
 assert.deepEqual(Object.values(SHOP_DIALOGUE_TEXT.bar.daily),['……面白い香りですね。','悪くないですね。','アーモンドに合うウイスキーはありますか。','もう少しスモーキーでもいいかも。','今度は長く寝かせてみてもいいのでは？']);
 assert.deepEqual(Object.values(SHOP_DIALOGUE_TEXT.bar.memory),['あの青い箱、今も作ってますか？','前の一本、よかったですね。','あれはよく覚えてますよ。','このお酒、久しぶりですね。']);assert(Object.isFrozen(SHOP_DIALOGUE_TEXT.bar.memory));
});
test('bar requires migration and actual relation, not offer, allocation or arrival',()=>{
 const s=withBar(63);s.shop.relations=s.shop.relations.filter(r=>r.shopId!=='bar');s.shop.offer={shopId:'bar'};s.storeMarket={byShop:{bar:{3:50}}};
 assert.deepEqual(dialogueCandidates(s,63,'bar'),{daily:[],memory:[]});
 s.shop.relations.push({shopId:'bar',brandId:1,startedMonth:60});delete s.alleyBar;assert.deepEqual(dialogueCandidates(s,63,'bar'),{daily:[],memory:[]});
 s.alleyBar={version:1,boundaryMonth:63};assert.deepEqual(dialogueCandidates(s,63,'bar'),{daily:[],memory:[]});
 s.alleyBar.boundaryMonth=60;s.shop.deliveries=s.shop.deliveries.filter(d=>d.shopId!=='bar');assert.deepEqual(dialogueCandidates(s,63,'bar').daily.map(x=>x.key),['almond','smoke','aging']);assert.equal(dialogueCandidates(s,120,'bar').memory.length,0);
});
test('bar memory needs its own past sale and exact original release; blue and return are factual',()=>{
 const s=withBar(86);let candidates=dialogueCandidates(s,86,'bar');assert(candidates.memory.some(x=>x.key==='blue'));assert(!candidates.memory.some(x=>x.key==='return'));
 for(const field of ['releaseId','productId','brandId']){const bad=structuredClone(s);bad.shop.deliveries[1][field]=999;assert.equal(dialogueCandidates(bad,86,'bar').memory.length,0);}
 s.shop.deliveries.push({...s.shop.deliveries[1],id:3,month:85});assert(dialogueCandidates(s,86,'bar').memory.some(x=>x.key==='return'));
 s.releases[0].profile=profile(0);assert(!dialogueCandidates(s,86,'bar').memory.some(x=>x.key==='blue'));
});
test('bar packages and headings retain exact historical store and release after live stock disappears',()=>{
 const s=withBar(),entry={...dialogueCandidates(s,1200,'bar').memory.find(x=>x.key==='blue'),id:'bar-memory',shopId:'bar',kind:'memory',text:SHOP_DIALOGUE_TEXT.bar.memory.blue};
 const html=dialogueMarkup(entry,s,{heading:true});assert.match(html,/路地裏のバー/);assert.doesNotMatch(html,/町の酒店/);assert.match(html,/data-package-family="smoke"/);assert.match(html,/#354c62/);
 s.core.products=[];s.productsById={3:{selectedPrice:'high'}};assert.equal(dialogueMarkup(entry,s,{heading:true}),html);
 assert.doesNotMatch(dialogueMarkup({...entry,kind:'daily'},s),/<svg/);
});
test('legacy dialogue history is byte-identical and a later bar never rewrites its prefix',async()=>{
 const {createHash}=await import('node:crypto');const legacy=shopDialogueHistory(fixture(1200));
 assert.equal(createHash('sha256').update(JSON.stringify(legacy)).digest('hex'),'3ab78a27ed39fcde7dd53022c5ff7182ce958b97c35d18e2a2a7eac391092cc1');
 const s=withBar();assert.deepEqual(shopDialogueHistory(s).filter(x=>x.month<=60),legacy.filter(x=>x.month<=60));
 const at=withBar(86),prefix=shopDialogueHistory(at);at.core.month=1200;at.shop.deliveries.push({...at.shop.deliveries[1],id:3,month:87});assert.deepEqual(shopDialogueHistory(at).filter(x=>x.month<=86),prefix);
});
test('one global opportunity stays bounded; bar is quieter across early and late relationships',()=>{
 const totals={early:{bar:0,town:0},late:{bar:0,town:0}};
 for(let seed=1;seed<=80;seed++){
  const s=withBar();s.seed=seed;const history=shopDialogueHistory(s);
  for(let i=1;i<history.length;i++)assert(history[i].month-history[i-1].month>=DIALOGUE_POLICY.minGap);
  const lastText=new Map();for(const entry of history){assert.equal(entry.text,SHOP_DIALOGUE_TEXT[entry.shopId][entry.kind][entry.key]);const k=entry.shopId+':'+entry.key;if(lastText.has(k))assert(entry.month-lastText.get(k)>=DIALOGUE_POLICY.sameTextGap);lastText.set(k,entry.month);if(entry.month>60)totals[entry.month<=600?'early':'late'][entry.shopId==='bar'?'bar':'town']++;}
  assert(history.length<=Math.ceil(1200/DIALOGUE_POLICY.minGap));
 }
 for(const range of Object.values(totals)){assert(range.bar>0);assert(range.bar<range.town);assert(range.bar/(range.bar+range.town)<.4);}
});
test('projection distinguishes latest global notice from each store, with no state changes',()=>{
 const s=freeze(withBar()),raw=JSON.stringify(s),history=shopDialogueHistory(s),cache=createDialogueProjection();
 assert.deepEqual(cache.read(s),history.at(-1));for(const shopId of ['bar','town-liquor']){const expected=history.filter(x=>x.shopId===shopId).at(-1);assert.deepEqual(latestShopDialogue(s,shopId),expected);assert.deepEqual(cache.read(s,shopId),expected);}
 assert.equal(cache.read(s,'supermarket'),null);assert.equal(JSON.stringify(s),raw);assert.deepEqual(shopDialogueHistory(JSON.parse(raw)),history);
});
