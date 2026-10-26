import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {soldOutLabel,LIVE_MESSAGE} from '../message-view.mjs';
import {automaticEvents,noticeText,transientNotices} from '../event-notices.mjs';

const fixture=()=>({freeAging:{version:1},core:{month:6,casks:[],products:[{id:9,stock:2},{id:15,stock:3}]},brands:[{id:1,name:'麦'},{id:2,name:'煙'}],releases:[{id:1,productId:3,brandId:1,bottledMonth:0},{id:8,productId:9,brandId:1,bottledMonth:2},{id:12,productId:15,brandId:2,bottledMonth:2}],productsById:{9:{listed:true},15:{listed:true}}});
test('sold-out leads with exact brand; multiple releases use stable recorded IDs, not month or stock order',()=>{
 const s=fixture(),raw=JSON.stringify(s);
 assert.equal(soldOutLabel(s,9),'麦・発売 #8');assert.equal(soldOutLabel(s,15),'煙');
 s.core.products.reverse();s.releases.reverse();assert.equal(soldOutLabel(s,9),'麦・発売 #8');
 s.releases.reverse();s.core.products.reverse();assert.equal(JSON.stringify(s),raw);
});
test('old same-name brands, sparse releases, missing/pruned products and unknown identities stay distinct',()=>{
 const s=fixture();s.brands[1].name='麦';assert.equal(soldOutLabel(s,9),'麦（ブランド #1）・発売 #8');assert.equal(soldOutLabel(s,15),'麦（ブランド #2）');
 const after=structuredClone(s);after.core.products=[];assert.equal(soldOutLabel(after,9,s),soldOutLabel(s,9));
 after.releases=[];after.brands=[];assert.equal(soldOutLabel(after,9,s),soldOutLabel(s,9));
 assert.equal(soldOutLabel({releases:[{id:77,productId:31}]} ,31),'ウイスキー（発売 #77）');
 assert.equal(soldOutLabel({records:[{productId:31,name:'保存された味の文章'}]},31),'ウイスキー（商品 #31）');
 assert.equal(soldOutLabel({records:[{productId:31,releaseId:77,name:'麦'}]},31),'ウイスキー（発売 #77）');
 assert.equal(soldOutLabel({},32),'ウイスキー（商品 #32）');
});
test('player names remain verbatim; newer exact-ID facts win over before-state display data',()=>{
 const s=fixture(),a=structuredClone(s);a.brands[0].name='<麦> & 「2026年7月」';
 assert.equal(soldOutLabel(a,9,s),'<麦> & 「2026年7月」・発売 #8');assert.equal(s.brands[0].name,'麦');
});
test('saved transition membership, count, IDs and dedup timing are unchanged by label projection',()=>{
 const b=fixture(),a=structuredClone(b);a.core.products=[];a.releases.forEach(r=>r.status='sold-out');
 const raw=JSON.stringify([b,a]),old=automaticEvents(b,a,()=>'',()=> '2026年7月'),events=automaticEvents(b,a,()=>'',id=>soldOutLabel(a,id,b));
 const facts=es=>es.map(({releaseLabel,...e})=>e);assert.deepEqual(facts(events),facts(old));assert.equal(events.length,2);
 assert.equal(noticeText(events),'麦・発売 #8 完売 / 煙 完売');assert.equal(JSON.stringify([b,a]),raw);assert.deepEqual(automaticEvents(a,a),[]);
 let calls=0,delay;const ui=transientNotices({show:()=>calls++,hide:()=>{},setTimer:(fn,ms)=>{delay=ms;return 1;},clearTimer:()=>{}});ui.push(events);ui.push(events);assert.equal(calls,1);assert.equal(delay,3500);
});
test('fixed live messages use approved format; application adapters preserve error and operation boundaries',()=>{
 assert.deepEqual([LIVE_MESSAGE.reservationCancelled,LIVE_MESSAGE.reservationPaused,LIVE_MESSAGE.reservationResumed],['予約取消','予約停止','予約再開']);
 assert.equal(LIVE_MESSAGE.unchanged,'変更なし');assert.equal(LIVE_MESSAGE.salesLoading,'販売記録を読んでいます…');assert.equal(LIVE_MESSAGE.shopGreeting,'これからよろしくお願いします。');
 const app=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 assert.match(app,/if\(next===game\)return \{ok:true,changed:false,text:LIVE_MESSAGE.unchanged\}/);
 assert.match(app,/text:LIVE_MESSAGE.shopGreeting/);assert.match(app,/deliveryNotice='「'\+LIVE_MESSAGE.shopGreeting\+'」'/);
 assert.match(app,/保存できません。元の記録を残して停止しています。/);assert.match(app,/別の画面で保存が変わりました。再読み込みしてください。/);
 assert(!app.includes('引継ぎ'));assert(app.includes('次の代へ引き継ぐ'));assert(app.includes('へ引き継ぎました。'));
});
