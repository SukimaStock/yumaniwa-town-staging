import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {shopRelationshipLabel,latestShopOrder,shopOrderMarkup} from '../shop-order-view.mjs';
import * as D from '../partner-orders.mjs';
import {monthLabel} from '../model.mjs';
import {SHOPS} from '../shop-model.mjs';
import {planShopFulfillment} from '../shop-demand.mjs';
import {buildShopLedger} from '../shop-ledger.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/shop-demand-legacy.json',import.meta.url),'utf8'));
const audit=JSON.parse(fs.readFileSync(new URL('../design/gameplay-audit-20261023/delivery-results.json',import.meta.url),'utf8'));
const view=(s,id='supermarket')=>shopOrderMarkup(s,id,{monthLabel,minQuantity:SHOPS.find(x=>x.id===id)?.minQuantity});
const row=(reason='fulfilled',requested=10,shipped=10,unmet=0)=>({shopId:'supermarket',month:17,reason,requested,shipped,unmet,profileProductId:999});
const state=rows=>({core:{month:17,products:[]},shopDemand:{lastOrders:rows},shop:{relations:[{shopId:'supermarket',brandId:1,startedMonth:16}]}});
test('ordinary relationship labels ignore inventory and manual-delivery eligibility',()=>{
 const s=state([]);assert.equal(shopRelationshipLabel(s,'supermarket'),'取扱中');s.core.products=[{stock:0}];assert.equal(shopRelationshipLabel(s,'supermarket'),'取扱中');
 s.shop.offer={shopId:'town-liquor'};assert.equal(shopRelationshipLabel(s,'town-liquor'),'申し出あり');s.shop.offer=null;s.shop.pendingOffers=[{shopId:'town-liquor'}];assert.equal(shopRelationshipLabel(s,'town-liquor'),'申し出あり');s.shop.pendingOffers=[];assert.equal(shopRelationshipLabel(s,'town-liquor'),'取扱前');s.shop.relations.push({brandId:1});assert.equal(shopRelationshipLabel(s,'town-liquor'),'取扱中');assert.equal(shopRelationshipLabel(s,'department'),null);assert.equal(view(s,'department'),'');
});
test('missing records differ from a recorded zero; use actual recorded absolute month',()=>{
 const s=state([]);assert.match(view(s),/注文記録はありません/);assert.doesNotMatch(view(s),/注文なし/);
 s.shopDemand.lastOrders=[row('zero-demand',0,0,0)];s.core.month=30;const html=view(s);assert.match(html,/注文なし/);assert(html.includes(monthLabel(17)+'の発送結果'));assert(!html.includes(monthLabel(30)+'の発送結果'));assert(!html.includes('先月'));s.shopDemand.lastOrders=[{...row(),month:31}];assert.equal(latestShopOrder(s,'supermarket'),null);
 const other=state([{...row(),shopId:'town-liquor'}]);assert.equal(latestShopOrder(other,'supermarket'),null);assert.match(view(other),/注文記録はありません/);
});
test('recorded reason codes distinguish partial minimums, shortage, combined limits and ledger full',()=>{
 for(const [reason,text]of [['insufficient-stock',/在庫が足りません/],['minimum-lot',/未発送分.*発売回ごとの最低10本/],['stock-or-capacity',/在庫または月の受入上限/],['delivery-ledger-full',/納品記録の上限/],['future-reason',/詳しい理由は表示できません/]]){
  const s=state([row(reason,20,10,10)]),before=JSON.stringify(s),html=view(s);assert.match(html,/注文 20本/);assert.match(html,/10本発送・10本未発送/);assert.match(html,text);assert.equal(JSON.stringify(s),before);assert(!html.includes('999'));
 }
 const noEligible=view(state([row('no-eligible-release',0,0,0)]));assert.match(noEligible,/注文なし/);assert.match(noEligible,/発送条件に合う発売回がありません/);
 assert.match(view(state([row('fulfilled',6,6,0)])),/6本発送しました/);assert.doesNotMatch(view(state([row('fulfilled',6,6,0)])),/在庫が足りません/);
});
test('formatter output is escaped; unknown/malformed receipt is not invented',()=>{
 assert.match(shopOrderMarkup(state([row()]),'supermarket',{monthLabel:()=>'<img onerror="bad">',minQuantity:10}),/&lt;img/);assert.doesNotMatch(shopOrderMarkup(state([row()]),'supermarket',{monthLabel:()=>'<img>'}),/<img>/);
 const s=state([{...row(),requested:undefined}]);assert.equal(latestShopOrder(s,'supermarket'),null);assert.match(view(s),/注文記録はありません/);
});
test('all1776 audit shop-month rows retain exact quantities and do not name demand-reference products',()=>{
 const lines=fs.readFileSync(new URL('../design/gameplay-audit-20261023/delivery-monthly.csv',import.meta.url),'utf8').trimEnd().split('\n'),header=lines.shift().split(',');let count=0;
 // The archived audit writes every data cell quoted; preserve embedded JSON commas.
 for(const line of lines){const cells=[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replaceAll('""','"'));assert.equal(cells.length,header.length);const data=Object.fromEntries(header.map((h,i)=>[h,cells[i]]));const r={shopId:data.shopId,month:+data.month,requested:+data.requested,shipped:+data.shipped,unmet:+data.unmet,reason:data.reason},s=state([r]);s.core.month=r.month;const before=JSON.stringify(s),html=view(s,r.shopId);assert.equal(JSON.stringify(s),before);assert.equal(r.requested,r.shipped+r.unmet);
  if(r.requested===0)assert.match(html,/注文なし/);else {assert(html.includes('注文 '+r.requested+'本'));assert(html.includes(r.unmet?(r.shipped?r.shipped+'本発送':'発送なし')+'・'+r.unmet+'本未発送':r.shipped+'本発送しました。'));}count++;
 }
 assert.equal(count,1776);
});
test('audit stock9/10, split5+5 and held-five edges match unchanged fulfillment projection',()=>{
 for(const e of audit.edges){const s=JSON.parse(fixture.before),p=s.core.products.at(-1),r=s.releases.at(-1);s.shop.relations.push({shopId:'supermarket',brandId:1,startedMonth:16});p.age=r.age=12;p.stock=e.stocks[0];r.profile.roughness=p.roughness=.2;
  for(let i=1;i<e.stocks.length;i++){s.core.products.push({...p,id:99+i,stock:e.stocks[i]});s.releases.push({...structuredClone(r),id:99+i,productId:99+i});s.productsById[99+i]={...s.productsById[p.id]};}
  const plan=planShopFulfillment(s,17,{shopId:'supermarket',month:17,count:e.requested},{heldCounts:e.held?{[p.id]:e.held}:{}});assert.equal(plan.planned,e.planned);assert.equal(plan.unmet,e.unmet);assert.equal(plan.reason,e.reason);const display=state([{...row(plan.reason,e.requested,plan.planned,plan.unmet)}]),html=view(display);assert(!html.includes('現在は納品不可'));assert.equal(latestShopOrder(display,'supermarket').shipped,e.planned);
 }
});
test('lawful old save: manual quote rejects auto mode, relationship stays active, real next-month receipt agrees with ledger',()=>{
 const before=D.enableShopDemand(D.restoreDistillery(fixture.before));assert.equal(D.shopQuote(before,8,'town-liquor').ok,false);assert.equal(shopRelationshipLabel(before,'town-liquor'),'取扱中');assert.equal(latestShopOrder(before,'town-liquor'),null);
 const s=D.tickDistillery(before),raw=D.serializeDistillery(s),o=latestShopOrder(s,'town-liquor');assert.equal(o.shipped,2);assert.equal(o.month,s.core.month);const ledger=buildShopLedger(s);assert(ledger);const deliveries=s.shop.deliveries.filter(d=>d.shopId==='town-liquor'&&d.month===o.month);assert.equal(deliveries.reduce((n,d)=>n+d.count,0),o.shipped);for(let i=0;i<10;i++){assert.match(view(s,'town-liquor'),/2本発送しました/);shopRelationshipLabel(s,'town-liquor');}assert.equal(D.serializeDistillery(s),raw);assert.equal(D.serializeDistillery(D.restoreDistillery(raw)),raw);
});
test('calculation/save sources and clock/animation/progress paths remain identical to616',()=>{
 const base='4a36600d6230042cdeb60cc3bf1034b40e1e0807';
 for(const f of ['partner-orders.mjs','shop-demand.mjs','shop-model.mjs','shop-ledger.mjs','model.mjs','economy.mjs','monthly.mjs','lab-flavor.mjs','town-connection.mjs','runtime-clock.mjs','room-motion.mjs'])assert.equal(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),execFileSync('git',['show',base+':works/ambertime/'+f],{encoding:'utf8',maxBuffer:4e6}));
 const previousCanvas=execFileSync('git',['show',base+':works/ambertime/canvas-scene.mjs'],{encoding:'utf8'}),canvas=fs.readFileSync(new URL('../canvas-scene.mjs',import.meta.url),'utf8');
 for(const [a,b]of [[' updateProgress(progress){',' drawTimeBar(){'],[' drawTimeBar(){',' draw(){'],[' stopDrawing(){',' controls(){'],[' drawWorld(){',' lines(']])assert.equal(canvas.slice(canvas.indexOf(a),canvas.indexOf(b)),previousCanvas.slice(previousCanvas.indexOf(a),previousCanvas.indexOf(b)));
 const old=execFileSync('git',['show',base+':works/ambertime/shop-app.mjs'],{encoding:'utf8',maxBuffer:4e6}),now=fs.readFileSync(new URL('../shop-app.mjs',import.meta.url),'utf8');
 for(const [a,b]of [['function schedule(','function act('],['function renderProgress(){','function render(){'],['function staffDisplayStatus(){','function renderProgress(){'],['function displayCaskSerials(){','const FLAVOR_AXES']])assert.equal(now.slice(now.indexOf(a),now.indexOf(b)),old.slice(old.indexOf(a),old.indexOf(b)));
});

test('simultaneous ordinary-store rows and retail-first audit examples keep store-specific facts',()=>{
 const lines=fs.readFileSync(new URL('../design/gameplay-audit-20261023/delivery-monthly.csv',import.meta.url),'utf8').trimEnd().split('\n'),header=lines.shift().split(','),groups=new Map();
 for(const line of lines){const cells=[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replaceAll('""','"')),d=Object.fromEntries(header.map((h,i)=>[h,cells[i]])),key=[d.scope,d.scenario,d.seed,d.month].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(d);}
 const pair=[...groups.values()].find(g=>g.length===2&&g.every(x=>+x.requested>0));assert(pair);const rows=pair.map(d=>({shopId:d.shopId,month:+d.month,requested:+d.requested,shipped:+d.shipped,unmet:+d.unmet,reason:d.reason})),s=state(rows);s.core.month=rows[0].month;
 for(const r of rows){const {shopId,...facts}=r;assert.deepEqual(latestShopOrder(s,shopId),facts);assert(view(s,r.shopId).includes('注文 '+r.requested+'本'));}
 const retail=audit.examples.retailCompetition.find(r=>r.retailSold>0&&r.unmet>0);assert(retail);const r={shopId:retail.shopId,month:retail.month,requested:retail.requested,shipped:retail.shipped,unmet:retail.unmet,reason:retail.reason},rs=state([r]);rs.core.month=r.month;const html=view(rs,r.shopId);assert(html.includes(r.unmet+'本未発送'));assert(!html.includes('自家販売のため'));
});
