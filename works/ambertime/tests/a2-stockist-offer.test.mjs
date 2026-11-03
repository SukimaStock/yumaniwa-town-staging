import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import * as D from '../partner-orders.mjs';
import {extract} from './r0-distill-host.mjs';
const source=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
function display({shelf=true,market=true,demand=true,placement=true,greeting=true}={}){
 const context={D:{storeMarketMode:()=>shelf,marketRulesMode:()=>market,shopDemandMode:()=>demand},SHOPS:D.SHOPS,placementEnabled:placement,game:{brands:[{id:2,name:'川霧 <風> & 水'}]},modal:{greeting,shopId:'supermarket',startedBrandId:2},shopTerms:()=> 'legacy terms',shopName:id=>D.SHOPS.find(s=>s.id===id).name,esc:s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')};
 vm.createContext(context);vm.runInContext(['shopOfferTerms','shopOfferNext','shopStartedText','shopStartedMarkup'].map(extract).join('\n'),context);return context;
}
test('A2 current shelf conditions use one bottle and supermarket age; legacy caps are not market-rule conditions',()=>{
 const c=display();assert.equal(c.shopOfferTerms('town-liquor'),'1本から');assert.equal(c.shopOfferTerms('supermarket'),'12か月以上／1本から');
 assert.equal(display({market:false}).shopOfferTerms('supermarket'),'12か月以上／1本から／月20本まで');assert.equal(display({shelf:false}).shopOfferTerms('supermarket'),'legacy terms');
});
test('A2 next action follows actual placement and automatic-shipping modes',()=>{
 assert.equal(display().shopOfferNext('supermarket'),'手元の瓶を店に置くと、翌月から販売されます。');
 assert.equal(display({shelf:false}).shopOfferNext('supermarket'),'取扱開始後は毎月自動で発送');
 assert.equal(display({shelf:false}).shopOfferNext('town-liquor'),'販売室から商品を届けられます。');
 assert.equal(display({shelf:false,placement:false}).shopOfferNext('town-liquor'),'取扱開始後は毎月自動で発送');
 assert.equal(display({shelf:false,demand:false}).shopOfferNext('supermarket'),'販売室から商品を届けられます。');
});
test('A2 start fact identifies exact store and brand, escapes markup, and is not repeated on ordinary reopening',()=>{
 const c=display();assert.equal(c.shopStartedText('supermarket',2),'町のスーパーで「川霧 <風> & 水」の取扱いが始まりました。');
 assert.match(c.shopStartedMarkup(),/川霧 &lt;風&gt; &amp; 水/);assert.match(c.shopStartedMarkup(),/role="status"/);assert.equal(display({greeting:false}).shopStartedMarkup(),'');assert(!/売れました|納品しました/.test(c.shopStartedMarkup()));
});
test('A2 retains spoken words and one decision, with department special handling separate',()=>{
 const offer=source.slice(source.indexOf("}else if(kind==='shop-offer')"),source.indexOf("}else if(kind==='decision')"));
 for(const text of ['の名前を聞きました。','こちらでも扱ってみたいのですが','この銘柄の取扱いを始めますか？',"button('取扱いを始める','shop-accept'","button('あとで','shop-later'","button('断る','shop-decline'","department?'デパートの申し出'","department?'<p>特選ウイスキー · 限定5本</p>'+departmentOfferInventory(offer)"])assert(offer.includes(text),text);
 assert.equal((offer.match(/button\('取扱いを始める'/g)??[]).length,1);assert(!offer.includes("button('契約"));
});

test('A2 reviewed inverse rejects edited or duplicated display hunks while preserving original L1 protection',async()=>{
 const {beforeA2,beforeA1}=await import('./a1-source-baseline.mjs');
 assert(beforeA2(source).includes("button('受ける','shop-accept'"));
 assert.throws(()=>beforeA2(source.replace('この銘柄の取扱いを始めますか？','unreviewed choice')),/exact reviewed A2 hunk/);
 assert.throws(()=>beforeA2(source+'\n'+source),/exact reviewed A2 hunk/);
 assert.throws(()=>beforeA1(source+'\n// unrelated change'),/immutable L1/);
});
